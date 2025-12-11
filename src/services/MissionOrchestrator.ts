/**
 * Mission Orchestrator - Central service for mission lifecycle management
 * Implements event sourcing pattern
 */

import {
  Mission,
  MissionStatus,
  MissionEvent,
  MissionEventTypes,
  Incident,
  Hub,
  Drone,
  RoutePlan,
  Position,
} from '../types/domain';
import { DroneStates, HubStates, DroneEvents, HubEvents } from '../types/fsm';
import { nanoid } from 'nanoid';

export class MissionOrchestrator {
  private missions: Map<string, Mission> = new Map();
  private eventListeners: Map<string, ((event: MissionEvent) => void)[]> = new Map();

  /**
   * Create a new mission from an incident
   */
  createMission(
    incident: Incident,
    hub: Hub,
    drone: Drone,
    createdBy: string
  ): Mission {
    const mission: Mission = {
      id: `mission-${nanoid()}`,
      incidentId: incident.id,
      hubId: hub.id,
      droneId: drone.id,
      status: MissionStatus.CREATED,
      createdAt: Date.now(),
      createdBy,
      timeline: [],
      metadata: {},
    };

    this.missions.set(mission.id, mission);

    // Emit creation event
    this.addEvent(mission.id, MissionEventTypes.MISSION_CREATED, createdBy, {
      incident: {
        id: incident.id,
        type: incident.type,
        severity: incident.severity,
        position: incident.position,
      },
      hub: { id: hub.id, name: hub.name },
      drone: { id: drone.id },
    }, `Mission created for ${incident.type} incident`);

    return mission;
  }

  /**
   * Plan route for mission, avoiding geofences
   */
  planRoute(
    missionId: string,
    startPosition: Position,
    endPosition: Position,
    avoidedGeofenceIds: string[]
  ): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    // Simple route planning (in production, would use A* or similar)
    const waypoints: Position[] = [startPosition, endPosition];
    const distance = this.calculateDistance(startPosition, endPosition);
    const estimatedDuration = Math.round((distance / 100) * 60); // Assume 100 km/h avg speed

    const routePlan: RoutePlan = {
      waypoints,
      totalDistance: distance,
      estimatedDuration,
      avoidedGeofences: avoidedGeofenceIds,
      createdAt: Date.now(),
    };

    mission.routePlan = routePlan;
    mission.status = MissionStatus.PLANNING;

    this.addEvent(missionId, MissionEventTypes.ROUTE_PLANNED, 'SYSTEM', {
      waypoints: waypoints.length,
      distance,
      estimatedDuration,
      avoidedGeofences: avoidedGeofenceIds,
    }, `Route planned: ${distance.toFixed(2)}m, ETA ${estimatedDuration}s`);
  }

  /**
   * Mark mission ready for launch (after safety checks)
   */
  markReady(missionId: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.status = MissionStatus.READY;
    this.addEvent(missionId, MissionEventTypes.SAFETY_CHECK_PASSED, 'SYSTEM', {}, 'Mission ready for launch');
  }

  /**
   * Launch mission
   */
  launchMission(missionId: string, launchedBy: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.status = MissionStatus.LAUNCHING;
    mission.launchedAt = Date.now();

    this.addEvent(missionId, MissionEventTypes.DRONE_LAUNCHED, launchedBy, {
      launchedAt: mission.launchedAt,
    }, 'Drone launched');
  }

  /**
   * Update mission status to in-flight
   */
  markInFlight(missionId: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.status = MissionStatus.IN_FLIGHT;
    this.addEvent(missionId, MissionEventTypes.TAKEOFF_COMPLETE, 'SYSTEM', {}, 'Drone in flight');
  }

  /**
   * Mark drone arrived at scene
   */
  markArrived(missionId: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.status = MissionStatus.ON_SCENE;
    mission.arrivedAt = Date.now();

    const responseTime = mission.arrivedAt - mission.createdAt;

    this.addEvent(missionId, MissionEventTypes.ARRIVED_AT_SCENE, 'SYSTEM', {
      arrivedAt: mission.arrivedAt,
      responseTime,
    }, `Arrived at scene (${Math.round(responseTime / 1000)}s response time)`);
  }

  /**
   * Start orbit pattern
   */
  startOrbit(missionId: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    this.addEvent(missionId, MissionEventTypes.ORBIT_STARTED, 'SYSTEM', {}, 'Orbit pattern started');
  }

  /**
   * Capture snapshot during mission
   */
  captureSnapshot(
    missionId: string,
    snapshotId: string,
    position: Position,
    isThermal: boolean,
    capturedBy: string
  ): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    this.addEvent(missionId, MissionEventTypes.SNAPSHOT_CAPTURED, capturedBy, {
      snapshotId,
      position,
      isThermal,
    }, `Snapshot captured (${isThermal ? 'thermal' : 'RGB'})`);
  }

  /**
   * Detect hotspot (thermal event)
   */
  detectHotspot(
    missionId: string,
    position: Position,
    temperature: number,
    confidence: number
  ): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    this.addEvent(missionId, MissionEventTypes.HOTSPOT_DETECTED, 'SYSTEM', {
      position,
      temperature,
      confidence,
    }, `Hotspot detected: ${temperature}°C (${Math.round(confidence * 100)}% confidence)`);
  }

  /**
   * Broadcast message
   */
  broadcastMessage(missionId: string, message: string, broadcastedBy: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    this.addEvent(missionId, MissionEventTypes.MESSAGE_BROADCAST, broadcastedBy, {
      message,
    }, `Broadcast: "${message}"`);
  }

  /**
   * Initiate return to base
   */
  initiateReturn(missionId: string, reason: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.status = MissionStatus.RETURNING;

    this.addEvent(missionId, MissionEventTypes.RETURN_INITIATED, 'SYSTEM', {
      reason,
    }, `Return initiated: ${reason}`);
  }

  /**
   * Complete mission
   */
  completeMission(missionId: string, completedBy: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.status = MissionStatus.COMPLETED;
    mission.completedAt = Date.now();

    const duration = mission.completedAt - mission.createdAt;

    this.addEvent(missionId, MissionEventTypes.MISSION_COMPLETED, completedBy, {
      completedAt: mission.completedAt,
      duration,
    }, `Mission completed (${Math.round(duration / 1000)}s total)`);
  }

  /**
   * Fail mission
   */
  failMission(missionId: string, reason: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.status = MissionStatus.FAILED;
    mission.completedAt = Date.now();

    this.addEvent(missionId, MissionEventTypes.MISSION_FAILED, 'SYSTEM', {
      reason,
    }, `Mission failed: ${reason}`);
  }

  /**
   * Cancel mission
   */
  cancelMission(missionId: string, cancelledBy: string, reason: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    mission.status = MissionStatus.CANCELLED;
    mission.completedAt = Date.now();

    this.addEvent(missionId, MissionEventTypes.MISSION_CANCELLED, cancelledBy, {
      reason,
    }, `Mission cancelled: ${reason}`);
  }

  /**
   * Record fault
   */
  recordFault(missionId: string, faultType: string, description: string): void {
    const mission = this.getMission(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    this.addEvent(missionId, MissionEventTypes.FAULT_DETECTED, 'SYSTEM', {
      faultType,
      description,
    }, `Fault detected: ${description}`);
  }

  // ============================================================================
  // EVENT SOURCING
  // ============================================================================

  private addEvent(
    missionId: string,
    type: string,
    actor: string,
    payload: Record<string, any>,
    description: string
  ): void {
    const mission = this.getMission(missionId);
    if (!mission) return;

    const event: MissionEvent = {
      id: `event-${nanoid()}`,
      missionId,
      type,
      timestamp: Date.now(),
      actor,
      payload,
      description,
    };

    mission.timeline.push(event);

    // Notify listeners
    this.emitEvent(missionId, event);
  }

  /**
   * Subscribe to mission events
   */
  onEvent(missionId: string, callback: (event: MissionEvent) => void): () => void {
    if (!this.eventListeners.has(missionId)) {
      this.eventListeners.set(missionId, []);
    }
    this.eventListeners.get(missionId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.eventListeners.get(missionId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private emitEvent(missionId: string, event: MissionEvent): void {
    const listeners = this.eventListeners.get(missionId);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  // ============================================================================
  // QUERIES
  // ============================================================================

  getMission(missionId: string): Mission | undefined {
    return this.missions.get(missionId);
  }

  getAllMissions(): Mission[] {
    return Array.from(this.missions.values());
  }

  getActiveMissions(): Mission[] {
    return this.getAllMissions().filter(
      m => ![MissionStatus.COMPLETED, MissionStatus.FAILED, MissionStatus.CANCELLED].includes(m.status as any)
    );
  }

  getMissionTimeline(missionId: string): MissionEvent[] {
    const mission = this.getMission(missionId);
    return mission ? mission.timeline : [];
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private calculateDistance(pos1: Position, pos2: Position): number {
    const [lat1, lon1] = pos1;
    const [lat2, lon2] = pos2;

    const R = 6371000; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}

// Export singleton instance
export const missionOrchestrator = new MissionOrchestrator();
