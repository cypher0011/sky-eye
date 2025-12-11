/**
 * Main Application Store - Manages drones, hubs, incidents, and missions
 */

import { create } from 'zustand';
import { Drone, Hub, Incident, Mission, Position, MissionEvent, Snapshot, Statistics } from '../types/domain';
import { DroneState, HubState, DroneStates, HubStates } from '../types/fsm';
import { WeatherConditions } from '../types/safety';
import { missionOrchestrator } from '../services/MissionOrchestrator';
import { safetyPolicyEngine } from '../services/SafetyPolicyEngine';
import { geofenceManager } from '../services/GeofenceManager';
import { auditLogger } from '../services/AuditLogger';
import { AuditActions } from '../types/auth';
import { nanoid } from 'nanoid';

// Initial data for Riyadh - FULL CITY COVERAGE
const RIYADH_CENTER: Position = [24.7136, 46.6753];

// Initialize hubs and drones - Spread across entire Riyadh metropolitan area
const createInitialHubs = (): Hub[] => {
  const positions: Position[] = [
    // Northern Riyadh
    [24.9500, 46.7000], // Al Yasmin
    [24.9200, 46.6000], // Al Nakheel
    [24.9200, 46.8200], // Hittin

    // Central North
    [24.8200, 46.6500], // King Fahd District
    [24.8200, 46.7500], // Olaya

    // City Center
    [24.7136, 46.6753], // Downtown
    [24.7400, 46.7800], // Al Malqa
    [24.7000, 46.5800], // Al Shifa

    // Eastern Riyadh
    [24.7500, 46.8500], // Al Nadhim
    [24.7000, 46.9000], // Al Naseem

    // Western Riyadh
    [24.7500, 46.5200], // Al Suwaidi
    [24.6800, 46.5500], // Al Shamsiyah
    [24.2000, 46.7200],
    // Southern Riyadh
    [24.6000, 46.7200], // Al Uraija
    [24.5500, 46.6500], // Al Aziziyah
    [24.5800, 46.8000], // Al Arid

    // Far South
    [24.5000, 46.7000], // Southern Industrial

    // Airport Area
    [24.9300, 46.7200], // Near Airport

    // Northwestern expansion
    [24.8500, 46.5500], // Al Hamra
    [24.1500, 46.3500], // Al Hamra
  ];

  const hubNames = [
    'Al Yasmin Hub', 'Al Nakheel Hub', 'Hittin Hub', 'King Fahd Hub', 'Olaya Hub',
    'Downtown Hub', 'Al Malqa Hub', 'Al Shifa Hub', 'Al Nadhim Hub', 'Al Naseem Hub',
    'Al Suwaidi Hub', 'Al Shamsiyah Hub', 'Al Uraija Hub', 'Al Aziziyah Hub', 'Al Arid Hub',
    'South Industrial Hub', 'Airport Hub', 'Al Hamra Hub'
  ];

  return positions.map((position, i) => ({
    id: `hub-${i + 1}`,
    name: hubNames[i] || `Hub ${i + 1}`,
    position,
    state: HubStates.READY as HubState,
    coverageRadius: 7000, // Increased coverage radius
    droneId: `drone-${i + 1}`,
    health: {
      doorStatus: 'CLOSED' as const,
      chargerStatus: 'AVAILABLE' as const,
      temperature: 25 + Math.random() * 5,
      humidity: 40 + Math.random() * 20,
      batteryBackup: 85 + Math.random() * 15,
      lastMaintenance: Date.now() - 86400000 * Math.random() * 30,
      nextMaintenanceDue: Date.now() + 86400000 * (30 + Math.random() * 30),
    },
    isOnline: true,
    createdAt: Date.now() - 86400000 * 90,
    updatedAt: Date.now(),
  }));
};

const createInitialDrones = (hubs: Hub[]): Drone[] => {
  return hubs.map(hub => ({
    id: hub.droneId,
    hubId: hub.id,
    position: hub.position,
    altitude: 0,
    heading: 0,
    speed: 0,
    state: DroneStates.DOCKED as DroneState,
    health: {
      battery: 95 + Math.random() * 5,
      batteryHealth: 90 + Math.random() * 10,
      motorStatus: ['OK', 'OK', 'OK', 'OK'] as ('OK' | 'WARNING' | 'FAULT')[],
      gpsStatus: 'OK' as const,
      linkQuality: 90 + Math.random() * 10,
      temperature: 30 + Math.random() * 10,
      flightHours: Math.random() * 500,
      lastMaintenance: Date.now() - 86400000 * Math.random() * 60,
    },
    capabilities: {
      maxSpeed: 20, // m/s
      maxAltitude: 120, // meters
      maxFlightTime: 25, // minutes
      hasRGBCamera: true,
      hasThermalCamera: true,
      hasSpotlight: true,
      hasSpeaker: true,
      hasPayloadDrop: false,
    },
    isOnline: true,
    createdAt: Date.now() - 86400000 * 90,
    updatedAt: Date.now(),
  }));
};

interface AppState {
  hubs: Hub[];
  drones: Drone[];
  incidents: Incident[];
  missions: Mission[];
  snapshots: Snapshot[];
  weather: WeatherConditions;
  autoDispatch: boolean;
  statistics: Statistics;

  // Actions
  setWeather: (condition: WeatherConditions['condition']) => void;
  setAutoDispatch: (enabled: boolean) => void;
  createIncident: (type: Incident['type'], position: Position, severity: Incident['severity'], reportedBy: string) => Incident;
  createMission: (incidentId: string, hubId: string, droneId: string, createdBy: string) => Mission | null;
  createMultiDroneMission: (incidentId: string, hubDronePairs: { hubId: string; droneId: string }[], createdBy: string) => Mission[];
  launchMission: (missionId: string, launchedBy: string) => void;
  completeMission: (missionId: string, completedBy: string) => void;
  cancelMission: (missionId: string, cancelledBy: string, reason: string) => void;
  updateDrone: (droneId: string, updates: Partial<Drone>) => void;
  updateHub: (hubId: string, updates: Partial<Hub>) => void;
  captureSnapshot: (missionId: string, position: Position, altitude: number, heading: number, isThermal: boolean, capturedBy: string) => Snapshot;
  getMissionById: (missionId: string) => Mission | undefined;
  getMissionsByIncident: (incidentId: string) => Mission[];
  getIncidentById: (incidentId: string) => Incident | undefined;
  getDroneById: (droneId: string) => Drone | undefined;
  getHubById: (hubId: string) => Hub | undefined;
}

const hubs = createInitialHubs();
const drones = createInitialDrones(hubs);

export const useAppStore = create<AppState>((set, get) => ({
  hubs,
  drones,
  incidents: [],
  missions: [],
  snapshots: [],
  weather: safetyPolicyEngine.getWeatherConditions(),
  autoDispatch: false,
  statistics: {
    totalIncidents: 0,
    resolvedIncidents: 0,
    activeIncidents: 0,
    avgResponseTime: 0,
    incidentsByType: {} as Record<string, number>,
    missionSuccessRate: 0,
    totalFlightHours: drones.reduce((sum, d) => sum + d.health.flightHours, 0),
    dronesActive: 0,
    dronesAvailable: drones.length,
    hubsOnline: hubs.filter(h => h.isOnline).length,
  },

  setWeather: (condition) => {
    const windSpeeds = { CLEAR: 2, RAIN: 8, STORM: 18, FOG: 5, SNOW: 10 };
    const weather: WeatherConditions = {
      condition,
      windSpeed: windSpeeds[condition] || 0,
      windDirection: Math.random() * 360,
      temperature: 25,
      visibility: condition === 'FOG' ? 500 : condition === 'STORM' ? 1000 : 10000,
      precipitation: condition === 'RAIN' ? 5 : condition === 'STORM' ? 20 : 0,
      isSafeForFlight: condition === 'CLEAR' || condition === 'RAIN',
      timestamp: Date.now(),
    };
    safetyPolicyEngine.setWeatherConditions(weather);
    set({ weather });
  },

  setAutoDispatch: (enabled) => set({ autoDispatch: enabled }),

  createIncident: (type, position, severity, reportedBy) => {
    const incident: Incident = {
      id: `incident-${nanoid()}`,
      type,
      position,
      severity,
      status: 'REPORTED',
      timestamp: Date.now(),
      reportedBy,
      aiAnalysis: {
        peopleCount: Math.floor(Math.random() * 10) + 1,
        injuredCount: severity === 'HIGH' ? Math.floor(Math.random() * 5) : 0,
        vehicleCount: type === 'ACCIDENT' ? Math.floor(Math.random() * 3) + 1 : 0,
        threatLevel: severity === 'HIGH' ? 8 : severity === 'MEDIUM' ? 5 : 2,
        hazards: ['Active situation', 'Emergency response required'],
        confidence: 0.85,
        processedAt: Date.now(),
      },
    };

    set(state => ({
      incidents: [...state.incidents, incident],
      statistics: {
        ...state.statistics,
        totalIncidents: state.statistics.totalIncidents + 1,
        activeIncidents: state.statistics.activeIncidents + 1,
        incidentsByType: {
          ...state.statistics.incidentsByType,
          [type]: (state.statistics.incidentsByType[type] || 0) + 1,
        },
      },
    }));

    // Audit log
    auditLogger.log(reportedBy, 'System', 'OPERATOR', AuditActions.INCIDENT_CREATED, {
      incidentId: incident.id,
      type,
      severity,
    }, { entityType: 'INCIDENT', entityId: incident.id });

    return incident;
  },

  createMission: (incidentId, hubId, droneId, createdBy) => {
    const incident = get().getIncidentById(incidentId);
    const hub = get().getHubById(hubId);
    const drone = get().getDroneById(droneId);

    if (!incident || !hub || !drone) return null;

    // Safety check
    const violations = geofenceManager.checkRouteViolations([hub.position, incident.position]);
    const safetyCheck = safetyPolicyEngine.checkLaunchSafety(drone, hub, violations);

    if (!safetyCheck.passed) {
      console.warn('Safety check failed:', safetyCheck.failureReasons);
      return null;
    }

    // Create mission
    const mission = missionOrchestrator.createMission(incident, hub, drone, createdBy);

    // Plan route
    const safeRoute = geofenceManager.findSafeRoute(hub.position, incident.position);
    missionOrchestrator.planRoute(mission.id, hub.position, incident.position, violations);
    missionOrchestrator.markReady(mission.id);

    set(state => ({
      missions: [...state.missions, mission],
      incidents: state.incidents.map(i =>
        i.id === incidentId ? { ...i, status: 'ASSIGNED' as const, assignedMissionId: mission.id } : i
      ),
    }));

    // Audit log
    auditLogger.log(createdBy, 'Operator', 'OPERATOR', AuditActions.MISSION_CREATED, {
      missionId: mission.id,
      incidentId,
    }, { entityType: 'MISSION', entityId: mission.id });

    return mission;
  },

  launchMission: (missionId, launchedBy) => {
    missionOrchestrator.launchMission(missionId, launchedBy);
    const mission = missionOrchestrator.getMission(missionId);
    if (mission) {
      set(state => ({
        missions: state.missions.map(m => m.id === missionId ? mission : m),
      }));

      // Audit log
      auditLogger.log(launchedBy, 'Operator', 'OPERATOR', AuditActions.MISSION_LAUNCHED, {
        missionId,
      }, { entityType: 'MISSION', entityId: missionId });
    }
  },

  completeMission: (missionId, completedBy) => {
    missionOrchestrator.completeMission(missionId, completedBy);
    const mission = missionOrchestrator.getMission(missionId);
    if (mission) {
      set(state => ({
        missions: state.missions.map(m => m.id === missionId ? mission : m),
        statistics: {
          ...state.statistics,
          resolvedIncidents: state.statistics.resolvedIncidents + 1,
          activeIncidents: Math.max(0, state.statistics.activeIncidents - 1),
        },
      }));

      // Audit log
      auditLogger.log(completedBy, 'Operator', 'OPERATOR', AuditActions.MISSION_COMPLETED, {
        missionId,
      }, { entityType: 'MISSION', entityId: missionId });
    }
  },

  cancelMission: (missionId, cancelledBy, reason) => {
    missionOrchestrator.cancelMission(missionId, cancelledBy, reason);
    const mission = missionOrchestrator.getMission(missionId);
    if (mission) {
      set(state => ({
        missions: state.missions.map(m => m.id === missionId ? mission : m),
      }));
    }
  },

  updateDrone: (droneId, updates) => {
    set(state => ({
      drones: state.drones.map(d => d.id === droneId ? { ...d, ...updates, updatedAt: Date.now() } : d),
    }));
  },

  updateHub: (hubId, updates) => {
    set(state => ({
      hubs: state.hubs.map(h => h.id === hubId ? { ...h, ...updates, updatedAt: Date.now() } : h),
    }));
  },

  captureSnapshot: (missionId, position, altitude, heading, isThermal, capturedBy) => {
    const snapshot: Snapshot = {
      id: `snapshot-${nanoid()}`,
      missionId,
      timestamp: Date.now(),
      position,
      altitude,
      heading,
      isThermal,
      metadata: {
        detections: [],
        annotations: [],
      },
      capturedBy,
    };

    set(state => ({
      snapshots: [...state.snapshots, snapshot],
    }));

    missionOrchestrator.captureSnapshot(missionId, snapshot.id, position, isThermal, capturedBy);

    // Audit log
    auditLogger.log(capturedBy, 'Operator', 'OPERATOR', AuditActions.SNAPSHOT_CAPTURED, {
      snapshotId: snapshot.id,
      missionId,
      isThermal,
    }, { entityType: 'SNAPSHOT', entityId: snapshot.id });

    return snapshot;
  },

  createMultiDroneMission: (incidentId, hubDronePairs, createdBy) => {
    const missions: Mission[] = [];

    for (const { hubId, droneId } of hubDronePairs) {
      const mission = get().createMission(incidentId, hubId, droneId, createdBy);
      if (mission) {
        missions.push(mission);
      }
    }

    // Update incident to track all missions
    if (missions.length > 0) {
      set(state => ({
        incidents: state.incidents.map(i =>
          i.id === incidentId
            ? {
                ...i,
                metadata: {
                  ...i.metadata,
                  missionIds: missions.map(m => m.id)
                }
              }
            : i
        ),
      }));
    }

    return missions;
  },

  getMissionById: (missionId) => get().missions.find(m => m.id === missionId),
  getMissionsByIncident: (incidentId) => get().missions.filter(m => m.incidentId === incidentId),
  getIncidentById: (incidentId) => get().incidents.find(i => i.id === incidentId),
  getDroneById: (droneId) => get().drones.find(d => d.id === droneId),
  getHubById: (hubId) => get().hubs.find(h => h.id === hubId),
}));
