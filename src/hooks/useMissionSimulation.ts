import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useAuthStore } from '../store/authStore';
import { Drone, Hub, Incident, Mission, MissionStatus, Position } from '../types/domain';
import { DroneStates, HubStates } from '../types/fsm';
import { missionOrchestrator } from '../services/MissionOrchestrator';
import { safetyPolicyEngine } from '../services/SafetyPolicyEngine';

type DroneUpdate = Omit<Partial<Drone>, 'health'> & { health?: Partial<Drone['health']> };

const TICK_MS = 1000;
const CRUISE_SPEED_MS = 220; // m/s - push the demo drone to move fast to incidents
const STEP_DISTANCE_M = (CRUISE_SPEED_MS * TICK_MS) / 1000;
const ARRIVAL_DISTANCE_M = 120;
const CRITICAL_BATTERY_RETURN = 10;

const toRad = (deg: number) => (deg * Math.PI) / 180;

const distanceMeters = (a: Position, b: Position) => {
  const [lat1, lon1] = a;
  const [lat2, lon2] = b;

  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const haversine =
    sinLat * sinLat +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return R * c;
};

const headingBetween = (from: Position, to: Position) => {
  const fromLat = toRad(from[0]);
  const fromLng = toRad(from[1]);
  const toLat = toRad(to[0]);
  const toLng = toRad(to[1]);

  const y = Math.sin(toLng - fromLng) * Math.cos(toLat);
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(toLng - fromLng);
  const bearing = Math.atan2(y, x);
  return ((bearing * 180) / Math.PI + 360) % 360;
};

const stepTowards = (current: Position, target: Position, maxStepMeters: number) => {
  const dist = distanceMeters(current, target);
  if (dist === 0) {
    return { position: target, distanceMoved: 0 };
  }

  const step = Math.min(dist, maxStepMeters);
  const ratio = step / dist;

  return {
    position: [
      current[0] + (target[0] - current[0]) * ratio,
      current[1] + (target[1] - current[1]) * ratio,
    ] as Position,
    distanceMoved: step,
  };
};

const cloneMission = (mission?: Mission): Mission | undefined => {
  if (!mission) return undefined;
  return {
    ...mission,
    routePlan: mission.routePlan
      ? { ...mission.routePlan, waypoints: [...mission.routePlan.waypoints] }
      : undefined,
    timeline: [...mission.timeline],
    metadata: { ...mission.metadata },
  };
};

export const useMissionSimulation = () => {
  const actor = useAuthStore(state => state.user?.email || 'AutoDispatch');

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useAppStore.getState();
      const now = Date.now();

      const droneUpdates: Record<string, DroneUpdate> = {};
      const incidentUpdates: Record<string, Partial<Incident>> = {};
      const hubUpdates: Record<string, Partial<Hub>> = {};
      const missionUpdates: Record<string, Mission> = {};

      const markMissionUpdated = (missionId: string) => {
        const latest = cloneMission(missionOrchestrator.getMission(missionId));
        if (latest) {
          missionUpdates[missionId] = latest;
        }
      };

      // Auto-dispatch new incidents to the nearest available drone
      if (state.autoDispatch) {
        const pending = state.incidents.filter(i => i.status === 'REPORTED');
        const available: Drone[] = state.drones.filter(
          d => d.state === DroneStates.DOCKED && !d.activeMissionId && d.isOnline
        );

        pending.forEach(incident => {
          if (!available.length) return;

          let closestIndex = 0;
          let bestDistance = distanceMeters(available[0].position, incident.position);

          for (let i = 1; i < available.length; i++) {
            const dist = distanceMeters(available[i].position, incident.position);
            if (dist < bestDistance) {
              bestDistance = dist;
              closestIndex = i;
            }
          }

          const drone = available.splice(closestIndex, 1)[0];
          const mission = state.createMission(incident.id, drone.hubId, drone.id, actor);

          if (mission) {
            state.launchMission(mission.id, actor);
            missionOrchestrator.markInFlight(mission.id);
            markMissionUpdated(mission.id);

            droneUpdates[drone.id] = {
              activeMissionId: mission.id,
              state: DroneStates.ENROUTE,
              speed: CRUISE_SPEED_MS,
              altitude: 80,
              heading: headingBetween(drone.position, incident.position),
            };

            incidentUpdates[incident.id] = {
              status: 'IN_PROGRESS',
              assignedMissionId: mission.id,
            };

            hubUpdates[drone.hubId] = { state: HubStates.DOOR_OPEN };
          }
        });
      }

      // Ensure any READY missions actually start flying (covers multi-drone scenarios)
      state.missions.forEach(mission => {
        if (
          mission.status === MissionStatus.IN_FLIGHT ||
          mission.status === MissionStatus.ON_SCENE ||
          mission.status === MissionStatus.RETURNING ||
          mission.status === MissionStatus.COMPLETED
        ) {
          return;
        }

        const drone = state.getDroneById(mission.droneId);
        const incident = state.getIncidentById(mission.incidentId);
        if (!drone || !incident) return;
        if (drone.activeMissionId && drone.activeMissionId !== mission.id) return;

        missionOrchestrator.markInFlight(mission.id);
        markMissionUpdated(mission.id);

        droneUpdates[drone.id] = {
          ...droneUpdates[drone.id],
          activeMissionId: mission.id,
          state: DroneStates.ENROUTE,
          speed: CRUISE_SPEED_MS,
          altitude: Math.max(drone.altitude, 80),
          heading: headingBetween(drone.position, incident.position),
        };

        incidentUpdates[mission.incidentId] = {
          status: 'IN_PROGRESS',
          assignedMissionId: mission.id,
        };

        hubUpdates[drone.hubId] = { state: HubStates.DOOR_OPEN };
      });

      // Progress active missions
      state.drones.forEach(drone => {
        const missionId = droneUpdates[drone.id]?.activeMissionId ?? drone.activeMissionId;
        if (!missionId) return;

        const mission = missionUpdates[missionId] ?? state.getMissionById(missionId);
        const incident = mission ? state.getIncidentById(mission.incidentId) : undefined;
        const hub = state.getHubById(drone.hubId);
        if (!mission || !incident || !hub) return;
        if (mission.status === MissionStatus.COMPLETED) return;

        const currentState = droneUpdates[drone.id]?.state ?? drone.state;
        const currentPosition = droneUpdates[drone.id]?.position ?? drone.position;
        const currentBattery = droneUpdates[drone.id]?.health?.battery ?? drone.health.battery;

        if (currentState === DroneStates.ENROUTE) {
          const autoReturn = safetyPolicyEngine.shouldAutoReturn({
            ...drone,
            health: { ...drone.health, battery: currentBattery },
          });

          if (autoReturn.should) {
            missionOrchestrator.initiateReturn(missionId, autoReturn.reason || 'Auto return');
            markMissionUpdated(missionId);
            droneUpdates[drone.id] = {
              ...droneUpdates[drone.id],
              state: DroneStates.RETURNING,
            };
            return;
          }

          const step = stepTowards(currentPosition, incident.position, STEP_DISTANCE_M);
          const remaining = distanceMeters(step.position, incident.position);

          droneUpdates[drone.id] = {
            ...droneUpdates[drone.id],
            position: step.position,
            heading: headingBetween(step.position, incident.position),
            speed: CRUISE_SPEED_MS,
            altitude: 80,
            health: {
              ...droneUpdates[drone.id]?.health,
              battery: Math.max(0, currentBattery - step.distanceMoved / 800),
            },
          };

          if (remaining <= ARRIVAL_DISTANCE_M) {
            missionOrchestrator.markArrived(missionId);
            missionOrchestrator.startOrbit(missionId);

            const updated = cloneMission(missionOrchestrator.getMission(missionId));
            if (updated) missionUpdates[missionId] = updated;

            incidentUpdates[incident.id] = {
              status: 'IN_PROGRESS',
              assignedMissionId: missionId,
            };

            droneUpdates[drone.id] = {
              ...droneUpdates[drone.id],
              position: incident.position,
              state: DroneStates.ON_SCENE,
              speed: 0,
              altitude: 60,
            };
          }
        } else if (currentState === DroneStates.ON_SCENE) {
          const returnRequested =
            missionUpdates[missionId]?.metadata?.returnRequested ??
            (mission.metadata?.returnRequested as boolean | undefined);
          const shouldReturn = !!returnRequested || currentBattery <= CRITICAL_BATTERY_RETURN;

          droneUpdates[drone.id] = {
            ...droneUpdates[drone.id],
            health: {
              ...droneUpdates[drone.id]?.health,
              battery: Math.max(0, currentBattery - 0.05),
            },
            speed: 0,
            altitude: 60,
            state: shouldReturn ? DroneStates.RETURNING : DroneStates.ON_SCENE,
          };

          if (shouldReturn) {
            missionOrchestrator.initiateReturn(
              missionId,
              currentBattery <= 25 ? 'Low battery' : 'On-scene complete'
            );
            markMissionUpdated(missionId);
          }
        }

        const latestState = droneUpdates[drone.id]?.state ?? drone.state;
        if (latestState === DroneStates.RETURNING) {
          const step = stepTowards(
            droneUpdates[drone.id]?.position ?? drone.position,
            hub.position,
            STEP_DISTANCE_M
          );
          const remaining = distanceMeters(step.position, hub.position);

          droneUpdates[drone.id] = {
            ...droneUpdates[drone.id],
            position: step.position,
            heading: headingBetween(step.position, hub.position),
            speed: CRUISE_SPEED_MS,
            altitude: 50,
            health: {
              ...droneUpdates[drone.id]?.health,
              battery: Math.max(
                0,
                (droneUpdates[drone.id]?.health?.battery ?? currentBattery) - step.distanceMoved / 1000
              ),
            },
          };

          if (remaining <= ARRIVAL_DISTANCE_M) {
            const orchestratorMission = missionOrchestrator.getMission(missionId);
            if (orchestratorMission && orchestratorMission.status !== MissionStatus.COMPLETED) {
              state.completeMission(missionId, actor);
              markMissionUpdated(missionId);
            }

            incidentUpdates[incident.id] = {
              status: 'RESOLVED',
              resolvedAt: now,
            };

            droneUpdates[drone.id] = {
              ...droneUpdates[drone.id],
              position: hub.position,
              state: DroneStates.DOCKED,
              speed: 0,
              altitude: 0,
              activeMissionId: undefined,
            };

            hubUpdates[hub.id] = { state: HubStates.CHARGING_DRONE };
          }
        }
      });

      const hasUpdates =
        Object.keys(droneUpdates).length ||
        Object.keys(incidentUpdates).length ||
        Object.keys(hubUpdates).length ||
        Object.keys(missionUpdates).length;

      if (!hasUpdates) return;

      useAppStore.setState(current => {
        const updatedDrones = current.drones.map(drone => {
          const update = droneUpdates[drone.id];
          if (!update) return drone;

          const { health, ...rest } = update;
          return {
            ...drone,
            ...rest,
            health: health ? { ...drone.health, ...health } : drone.health,
            updatedAt: now,
          };
        });

        const updatedIncidents = current.incidents.map(incident => {
          const update = incidentUpdates[incident.id];
          return update ? { ...incident, ...update } : incident;
        });

        const updatedHubs = current.hubs.map(hub => {
          const update = hubUpdates[hub.id];
          return update ? { ...hub, ...update, updatedAt: now } : hub;
        });

        const updatedMissions = current.missions.map(m => missionUpdates[m.id] ?? m);

        const dronesActive = updatedDrones.filter(d => !!d.activeMissionId).length;
        const dronesAvailable = updatedDrones.filter(d => d.state === DroneStates.DOCKED).length;

        return {
          drones: updatedDrones,
          incidents: updatedIncidents,
          hubs: updatedHubs,
          missions: updatedMissions,
          statistics: {
            ...current.statistics,
            dronesActive,
            dronesAvailable,
            hubsOnline: updatedHubs.filter(h => h.isOnline).length,
          },
        };
      });
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [actor]);
};
