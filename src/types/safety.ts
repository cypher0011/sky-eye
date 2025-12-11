/**
 * Safety, geofencing, and policy types
 */

import { z } from 'zod';
import { Position } from './domain';

// ============================================================================
// GEOFENCE
// ============================================================================

export const GeofenceTypes = {
  NO_FLY: 'NO_FLY',
  CAUTION: 'CAUTION',
  PRIVACY: 'PRIVACY',
  RESTRICTED: 'RESTRICTED',
  EMERGENCY_ONLY: 'EMERGENCY_ONLY',
} as const;

export type GeofenceType = (typeof GeofenceTypes)[keyof typeof GeofenceTypes];

export interface Geofence {
  id: string;
  name: string;
  type: GeofenceType;
  polygon: Position[]; // Array of [lat, lng] points
  minAltitude?: number; // meters
  maxAltitude?: number; // meters
  isActive: boolean;
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  description?: string;
}

export const GeofenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['NO_FLY', 'CAUTION', 'PRIVACY', 'RESTRICTED', 'EMERGENCY_ONLY']),
  polygon: z.array(z.tuple([z.number(), z.number()])),
  minAltitude: z.number().optional(),
  maxAltitude: z.number().optional(),
  isActive: z.boolean(),
  createdBy: z.string(),
  createdAt: z.number(),
  expiresAt: z.number().optional(),
  description: z.string().optional(),
});

// ============================================================================
// SAFETY POLICY
// ============================================================================

export interface SafetyPolicy {
  id: string;
  name: string;
  minBatteryForLaunch: number; // percentage
  minBatteryForReturn: number; // percentage
  criticalBatteryLevel: number; // percentage
  maxWindSpeed: number; // m/s
  minLinkQuality: number; // percentage
  minGpsSatellites: number;
  maxTemperature: number; // Celsius
  linkLossBehavior: 'HOVER' | 'RETURN' | 'LAND';
  linkLossTimeout: number; // seconds
  returnAltitude: number; // meters
  enableGeofenceCheck: boolean;
  requirePreflightCheck: boolean;
  autoReturnOnLowBattery: boolean;
  createdAt: number;
  updatedAt: number;
}

export const SafetyPolicySchema = z.object({
  id: z.string(),
  name: z.string(),
  minBatteryForLaunch: z.number().min(0).max(100),
  minBatteryForReturn: z.number().min(0).max(100),
  criticalBatteryLevel: z.number().min(0).max(100),
  maxWindSpeed: z.number().min(0),
  minLinkQuality: z.number().min(0).max(100),
  minGpsSatellites: z.number().int().min(0),
  maxTemperature: z.number(),
  linkLossBehavior: z.enum(['HOVER', 'RETURN', 'LAND']),
  linkLossTimeout: z.number().min(0),
  returnAltitude: z.number().min(0),
  enableGeofenceCheck: z.boolean(),
  requirePreflightCheck: z.boolean(),
  autoReturnOnLowBattery: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const defaultSafetyPolicy: SafetyPolicy = {
  id: 'default',
  name: 'Default Safety Policy',
  minBatteryForLaunch: 30,
  minBatteryForReturn: 25,
  criticalBatteryLevel: 15,
  maxWindSpeed: 15,
  minLinkQuality: 50,
  minGpsSatellites: 6,
  maxTemperature: 60,
  linkLossBehavior: 'RETURN',
  linkLossTimeout: 10,
  returnAltitude: 50,
  enableGeofenceCheck: true,
  requirePreflightCheck: true,
  autoReturnOnLowBattery: true,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// ============================================================================
// SAFETY CHECK RESULT
// ============================================================================

export interface SafetyCheckResult {
  passed: boolean;
  timestamp: number;
  checks: {
    battery: { passed: boolean; value: number; threshold: number };
    linkQuality: { passed: boolean; value: number; threshold: number };
    gps: { passed: boolean; satellites: number; threshold: number };
    weather: { passed: boolean; windSpeed?: number; threshold: number };
    geofence: { passed: boolean; violations: string[] };
    hub: { passed: boolean; reason?: string };
    drone: { passed: boolean; reason?: string };
  };
  failureReasons: string[];
  warnings: string[];
}

// ============================================================================
// SAFE LANDING ZONE
// ============================================================================

export interface SafeLandingZone {
  id: string;
  position: Position;
  radius: number; // meters
  priority: number; // higher = better
  obstacleScore: number; // 0-1, lower = fewer obstacles
  description?: string;
}

export const SafeLandingZoneSchema = z.object({
  id: z.string(),
  position: z.tuple([z.number(), z.number()]),
  radius: z.number().positive(),
  priority: z.number(),
  obstacleScore: z.number().min(0).max(1),
  description: z.string().optional(),
});

// ============================================================================
// WEATHER CONDITIONS
// ============================================================================

export interface WeatherConditions {
  condition: 'CLEAR' | 'RAIN' | 'STORM' | 'FOG' | 'SNOW';
  windSpeed: number; // m/s
  windDirection: number; // degrees
  temperature: number; // Celsius
  visibility: number; // meters
  precipitation: number; // mm/h
  isSafeForFlight: boolean;
  timestamp: number;
}

export const WeatherConditionsSchema = z.object({
  condition: z.enum(['CLEAR', 'RAIN', 'STORM', 'FOG', 'SNOW']),
  windSpeed: z.number().min(0),
  windDirection: z.number().min(0).max(360),
  temperature: z.number(),
  visibility: z.number().min(0),
  precipitation: z.number().min(0),
  isSafeForFlight: z.boolean(),
  timestamp: z.number(),
});
