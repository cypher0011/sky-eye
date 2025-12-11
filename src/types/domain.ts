/**
 * Core domain models for the Remote Drone Operations Platform
 */

import { z } from 'zod';
import { DroneState, HubState } from './fsm';

// ============================================================================
// POSITION & GEOGRAPHY
// ============================================================================

export type Position = [number, number]; // [lat, lng]

export const PositionSchema = z.tuple([z.number(), z.number()]);

export interface Coordinates {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export const CoordinatesSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  altitude: z.number().optional(),
});

// ============================================================================
// INCIDENT
// ============================================================================

export const IncidentTypes = {
  ACCIDENT: 'ACCIDENT',
  FIRE: 'FIRE',
  MEDICAL: 'MEDICAL',
  SECURITY: 'SECURITY',
  SEARCH_RESCUE: 'SEARCH_RESCUE',
  INFRASTRUCTURE: 'INFRASTRUCTURE',
} as const;

export type IncidentType = (typeof IncidentTypes)[keyof typeof IncidentTypes];

export const IncidentSeverity = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export type Severity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];

export const IncidentStatus = {
  REPORTED: 'REPORTED',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CANCELLED: 'CANCELLED',
} as const;

export type IncidentStatusType = (typeof IncidentStatus)[keyof typeof IncidentStatus];

export interface AIAnalysis {
  peopleCount: number;
  injuredCount: number;
  vehicleCount: number;
  threatLevel: number; // 1-10
  hazards: string[];
  confidence: number; // 0-1
  processedAt: number;
}

export const AIAnalysisSchema = z.object({
  peopleCount: z.number().int().min(0),
  injuredCount: z.number().int().min(0),
  vehicleCount: z.number().int().min(0),
  threatLevel: z.number().min(1).max(10),
  hazards: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  processedAt: z.number(),
});

export interface Incident {
  id: string;
  type: IncidentType;
  position: Position;
  severity: Severity;
  status: IncidentStatusType;
  timestamp: number;
  reportedBy: string;
  description?: string;
  aiAnalysis?: AIAnalysis;
  assignedMissionId?: string;
  slaTarget?: number; // Target response time in seconds
  resolvedAt?: number;
  metadata?: Record<string, any>; // For tracking multiple missions, etc.
}

export const IncidentSchema = z.object({
  id: z.string(),
  type: z.enum(['ACCIDENT', 'FIRE', 'MEDICAL', 'SECURITY', 'SEARCH_RESCUE', 'INFRASTRUCTURE']),
  position: PositionSchema,
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  status: z.enum(['REPORTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED']),
  timestamp: z.number(),
  reportedBy: z.string(),
  description: z.string().optional(),
  aiAnalysis: AIAnalysisSchema.optional(),
  assignedMissionId: z.string().optional(),
  slaTarget: z.number().optional(),
  resolvedAt: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// ============================================================================
// HUB (DRONE-IN-A-BOX)
// ============================================================================

export interface HubHealth {
  doorStatus: 'OPEN' | 'CLOSED' | 'OPENING' | 'CLOSING' | 'FAULT';
  chargerStatus: 'AVAILABLE' | 'CHARGING' | 'FAULT';
  temperature: number; // Celsius
  humidity: number; // Percentage
  batteryBackup: number; // Percentage
  lastMaintenance: number; // Timestamp
  nextMaintenanceDue: number; // Timestamp
}

export const HubHealthSchema = z.object({
  doorStatus: z.enum(['OPEN', 'CLOSED', 'OPENING', 'CLOSING', 'FAULT']),
  chargerStatus: z.enum(['AVAILABLE', 'CHARGING', 'FAULT']),
  temperature: z.number(),
  humidity: z.number().min(0).max(100),
  batteryBackup: z.number().min(0).max(100),
  lastMaintenance: z.number(),
  nextMaintenanceDue: z.number(),
});

export interface Hub {
  id: string;
  name: string;
  position: Position;
  state: HubState;
  coverageRadius: number; // meters
  droneId: string; // One drone per hub
  health: HubHealth;
  isOnline: boolean;
  createdAt: number;
  updatedAt: number;
}

export const HubSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: PositionSchema,
  state: z.string(),
  coverageRadius: z.number().positive(),
  droneId: z.string(),
  health: HubHealthSchema,
  isOnline: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// ============================================================================
// DRONE
// ============================================================================

export interface DroneHealth {
  battery: number; // 0-100
  batteryHealth: number; // 0-100, degrades over time
  motorStatus: ('OK' | 'WARNING' | 'FAULT')[];
  gpsStatus: 'OK' | 'DEGRADED' | 'LOST';
  linkQuality: number; // 0-100
  temperature: number; // Celsius
  flightHours: number;
  lastMaintenance: number;
}

export const DroneHealthSchema = z.object({
  battery: z.number().min(0).max(100),
  batteryHealth: z.number().min(0).max(100),
  motorStatus: z.array(z.enum(['OK', 'WARNING', 'FAULT'])),
  gpsStatus: z.enum(['OK', 'DEGRADED', 'LOST']),
  linkQuality: z.number().min(0).max(100),
  temperature: z.number(),
  flightHours: z.number().min(0),
  lastMaintenance: z.number(),
});

export interface DroneCapabilities {
  maxSpeed: number; // m/s
  maxAltitude: number; // meters
  maxFlightTime: number; // minutes
  hasRGBCamera: boolean;
  hasThermalCamera: boolean;
  hasSpotlight: boolean;
  hasSpeaker: boolean;
  hasPayloadDrop: boolean;
}

export const DroneCapabilitiesSchema = z.object({
  maxSpeed: z.number().positive(),
  maxAltitude: z.number().positive(),
  maxFlightTime: z.number().positive(),
  hasRGBCamera: z.boolean(),
  hasThermalCamera: z.boolean(),
  hasSpotlight: z.boolean(),
  hasSpeaker: z.boolean(),
  hasPayloadDrop: z.boolean(),
});

export interface Drone {
  id: string;
  hubId: string;
  position: Position;
  altitude: number; // meters
  heading: number; // degrees 0-360
  speed: number; // m/s
  state: DroneState;
  health: DroneHealth;
  capabilities: DroneCapabilities;
  activeMissionId?: string;
  isOnline: boolean;
  createdAt: number;
  updatedAt: number;
}

export const DroneSchema = z.object({
  id: z.string(),
  hubId: z.string(),
  position: PositionSchema,
  altitude: z.number().min(0),
  heading: z.number().min(0).max(360),
  speed: z.number().min(0),
  state: z.string(),
  health: DroneHealthSchema,
  capabilities: DroneCapabilitiesSchema,
  activeMissionId: z.string().optional(),
  isOnline: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// ============================================================================
// MISSION
// ============================================================================

export const MissionStatus = {
  CREATED: 'CREATED',
  PLANNING: 'PLANNING',
  READY: 'READY',
  LAUNCHING: 'LAUNCHING',
  IN_FLIGHT: 'IN_FLIGHT',
  ON_SCENE: 'ON_SCENE',
  RETURNING: 'RETURNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export type MissionStatusType = (typeof MissionStatus)[keyof typeof MissionStatus];

export interface RoutePlan {
  waypoints: Position[];
  totalDistance: number; // meters
  estimatedDuration: number; // seconds
  avoidedGeofences: string[]; // IDs of geofences avoided
  createdAt: number;
}

export const RoutePlanSchema = z.object({
  waypoints: z.array(PositionSchema),
  totalDistance: z.number().min(0),
  estimatedDuration: z.number().min(0),
  avoidedGeofences: z.array(z.string()),
  createdAt: z.number(),
});

export interface Mission {
  id: string;
  incidentId: string;
  hubId: string;
  droneId: string;
  status: MissionStatusType;
  routePlan?: RoutePlan;
  createdAt: number;
  launchedAt?: number;
  arrivedAt?: number;
  completedAt?: number;
  createdBy: string;
  timeline: MissionEvent[];
  metadata: Record<string, any>;
}

export const MissionSchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  hubId: z.string(),
  droneId: z.string(),
  status: z.enum(['CREATED', 'PLANNING', 'READY', 'LAUNCHING', 'IN_FLIGHT', 'ON_SCENE', 'RETURNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  routePlan: RoutePlanSchema.optional(),
  createdAt: z.number(),
  launchedAt: z.number().optional(),
  arrivedAt: z.number().optional(),
  completedAt: z.number().optional(),
  createdBy: z.string(),
  timeline: z.array(z.any()), // MissionEventSchema
  metadata: z.record(z.string(), z.any()),
});

// ============================================================================
// MISSION EVENTS (Event Sourcing)
// ============================================================================

export const MissionEventTypes = {
  MISSION_CREATED: 'MISSION_CREATED',
  ROUTE_PLANNED: 'ROUTE_PLANNED',
  SAFETY_CHECK_PASSED: 'SAFETY_CHECK_PASSED',
  SAFETY_CHECK_FAILED: 'SAFETY_CHECK_FAILED',
  HUB_DOOR_OPENING: 'HUB_DOOR_OPENING',
  DRONE_LAUNCHED: 'DRONE_LAUNCHED',
  TAKEOFF_COMPLETE: 'TAKEOFF_COMPLETE',
  WAYPOINT_REACHED: 'WAYPOINT_REACHED',
  ARRIVED_AT_SCENE: 'ARRIVED_AT_SCENE',
  ORBIT_STARTED: 'ORBIT_STARTED',
  SNAPSHOT_CAPTURED: 'SNAPSHOT_CAPTURED',
  HOTSPOT_DETECTED: 'HOTSPOT_DETECTED',
  MESSAGE_BROADCAST: 'MESSAGE_BROADCAST',
  RETURN_INITIATED: 'RETURN_INITIATED',
  LANDING_INITIATED: 'LANDING_INITIATED',
  DRONE_LANDED: 'DRONE_LANDED',
  MISSION_COMPLETED: 'MISSION_COMPLETED',
  MISSION_FAILED: 'MISSION_FAILED',
  MISSION_CANCELLED: 'MISSION_CANCELLED',
  FAULT_DETECTED: 'FAULT_DETECTED',
  FAULT_RESOLVED: 'FAULT_RESOLVED',
} as const;

export type MissionEventType = (typeof MissionEventTypes)[keyof typeof MissionEventTypes];

export interface MissionEvent {
  id: string;
  missionId: string;
  type: MissionEventType;
  timestamp: number;
  actor: string; // User ID or 'SYSTEM'
  payload: Record<string, any>;
  description: string;
}

export const MissionEventSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  type: z.string(),
  timestamp: z.number(),
  actor: z.string(),
  payload: z.record(z.string(), z.any()),
  description: z.string(),
});

// ============================================================================
// EVIDENCE & SNAPSHOTS
// ============================================================================

export interface Snapshot {
  id: string;
  missionId: string;
  timestamp: number;
  position: Position;
  altitude: number;
  heading: number;
  imageUrl?: string; // Data URL or path
  isThermal: boolean;
  metadata: {
    cameraSettings?: Record<string, any>;
    detections?: any[];
    annotations?: any[];
  };
  capturedBy: string;
}

export const SnapshotSchema = z.object({
  id: z.string(),
  missionId: z.string(),
  timestamp: z.number(),
  position: PositionSchema,
  altitude: z.number(),
  heading: z.number(),
  imageUrl: z.string().optional(),
  isThermal: z.boolean(),
  metadata: z.object({
    cameraSettings: z.record(z.string(), z.any()).optional(),
    detections: z.array(z.any()).optional(),
    annotations: z.array(z.any()).optional(),
  }),
  capturedBy: z.string(),
});

// ============================================================================
// STATISTICS
// ============================================================================

export interface Statistics {
  totalIncidents: number;
  resolvedIncidents: number;
  activeIncidents: number;
  avgResponseTime: number; // seconds
  incidentsByType: Record<IncidentType, number>;
  missionSuccessRate: number; // 0-1
  totalFlightHours: number;
  dronesActive: number;
  dronesAvailable: number;
  hubsOnline: number;
}

export const StatisticsSchema = z.object({
  totalIncidents: z.number().int().min(0),
  resolvedIncidents: z.number().int().min(0),
  activeIncidents: z.number().int().min(0),
  avgResponseTime: z.number().min(0),
  incidentsByType: z.record(z.string(), z.number()),
  missionSuccessRate: z.number().min(0).max(1),
  totalFlightHours: z.number().min(0),
  dronesActive: z.number().int().min(0),
  dronesAvailable: z.number().int().min(0),
  hubsOnline: z.number().int().min(0),
});
