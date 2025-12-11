/**
 * Telemetry types for real-time drone monitoring
 */

import { z } from 'zod';
import { Position } from './domain';

// ============================================================================
// TELEMETRY FRAMES
// ============================================================================

export interface TelemetryFrame {
  droneId: string;
  timestamp: number;
  position: Position;
  altitude: number;
  heading: number;
  speed: number;
  verticalSpeed: number;
  battery: number;
  batteryVoltage: number;
  batteryCurrent: number;
  batteryTemperature: number;
  linkQuality: number; // 0-100
  signalStrength: number; // dBm
  gpsStatus: 'OK' | 'DEGRADED' | 'LOST';
  gpsSatellites: number;
  gpsAccuracy: number; // meters
  motorRPM: number[];
  motorTemperatures: number[];
  imuData: {
    roll: number;
    pitch: number;
    yaw: number;
    accelerationX: number;
    accelerationY: number;
    accelerationZ: number;
  };
  windSpeed?: number;
  windDirection?: number;
  faults: string[];
  warnings: string[];
}

export const TelemetryFrameSchema = z.object({
  droneId: z.string(),
  timestamp: z.number(),
  position: z.tuple([z.number(), z.number()]),
  altitude: z.number(),
  heading: z.number().min(0).max(360),
  speed: z.number().min(0),
  verticalSpeed: z.number(),
  battery: z.number().min(0).max(100),
  batteryVoltage: z.number(),
  batteryCurrent: z.number(),
  batteryTemperature: z.number(),
  linkQuality: z.number().min(0).max(100),
  signalStrength: z.number(),
  gpsStatus: z.enum(['OK', 'DEGRADED', 'LOST']),
  gpsSatellites: z.number().int().min(0),
  gpsAccuracy: z.number().min(0),
  motorRPM: z.array(z.number()),
  motorTemperatures: z.array(z.number()),
  imuData: z.object({
    roll: z.number(),
    pitch: z.number(),
    yaw: z.number(),
    accelerationX: z.number(),
    accelerationY: z.number(),
    accelerationZ: z.number(),
  }),
  windSpeed: z.number().optional(),
  windDirection: z.number().optional(),
  faults: z.array(z.string()),
  warnings: z.array(z.string()),
});

// ============================================================================
// TELEMETRY SERVICE CONFIGURATION
// ============================================================================

export interface TelemetryServiceConfig {
  reconnectInterval: number; // ms
  maxReconnectAttempts: number;
  heartbeatInterval: number; // ms
  bufferSize: number;
  enableCompression: boolean;
}

export const defaultTelemetryConfig: TelemetryServiceConfig = {
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 5000,
  bufferSize: 100,
  enableCompression: false,
};

// ============================================================================
// TELEMETRY EVENTS
// ============================================================================

export type TelemetryEventType =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'ERROR'
  | 'TELEMETRY_FRAME'
  | 'HEARTBEAT'
  | 'FAULT_ALERT'
  | 'WARNING_ALERT';

export interface TelemetryEvent {
  type: TelemetryEventType;
  timestamp: number;
  payload?: any;
}

// ============================================================================
// CONNECTION STATUS
// ============================================================================

export interface ConnectionStatus {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastConnectedAt?: number;
  lastDisconnectedAt?: number;
  latency?: number; // ms
}
