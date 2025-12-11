/**
 * Authentication and authorization types
 */

import { z } from 'zod';

// ============================================================================
// USER ROLES
// ============================================================================

export const UserRoles = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];

// ============================================================================
// PERMISSIONS
// ============================================================================

export const Permissions = {
  // Incident Management
  CREATE_INCIDENT: 'CREATE_INCIDENT',
  VIEW_INCIDENT: 'VIEW_INCIDENT',
  UPDATE_INCIDENT: 'UPDATE_INCIDENT',
  DELETE_INCIDENT: 'DELETE_INCIDENT',

  // Mission Management
  CREATE_MISSION: 'CREATE_MISSION',
  VIEW_MISSION: 'VIEW_MISSION',
  CANCEL_MISSION: 'CANCEL_MISSION',
  MANUAL_CONTROL: 'MANUAL_CONTROL',

  // Drone Operations
  DISPATCH_DRONE: 'DISPATCH_DRONE',
  RECALL_DRONE: 'RECALL_DRONE',
  CONTROL_DRONE: 'CONTROL_DRONE',
  VIEW_TELEMETRY: 'VIEW_TELEMETRY',

  // Hub Operations
  CONTROL_HUB: 'CONTROL_HUB',
  VIEW_HUB_STATUS: 'VIEW_HUB_STATUS',

  // Evidence & Reports
  CAPTURE_SNAPSHOT: 'CAPTURE_SNAPSHOT',
  EXPORT_EVIDENCE: 'EXPORT_EVIDENCE',
  EXPORT_REPORT: 'EXPORT_REPORT',

  // System Administration
  MANAGE_USERS: 'MANAGE_USERS',
  MANAGE_GEOFENCES: 'MANAGE_GEOFENCES',
  MANAGE_POLICIES: 'MANAGE_POLICIES',
  VIEW_AUDIT_LOG: 'VIEW_AUDIT_LOG',

  // Broadcasting
  BROADCAST_MESSAGE: 'BROADCAST_MESSAGE',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

// ============================================================================
// ROLE PERMISSIONS MAPPING
// ============================================================================

export const RolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: Object.values(Permissions), // All permissions
  OPERATOR: [
    Permissions.CREATE_INCIDENT,
    Permissions.VIEW_INCIDENT,
    Permissions.UPDATE_INCIDENT,
    Permissions.CREATE_MISSION,
    Permissions.VIEW_MISSION,
    Permissions.CANCEL_MISSION,
    Permissions.MANUAL_CONTROL,
    Permissions.DISPATCH_DRONE,
    Permissions.RECALL_DRONE,
    Permissions.CONTROL_DRONE,
    Permissions.VIEW_TELEMETRY,
    Permissions.VIEW_HUB_STATUS,
    Permissions.CAPTURE_SNAPSHOT,
    Permissions.EXPORT_EVIDENCE,
    Permissions.EXPORT_REPORT,
    Permissions.BROADCAST_MESSAGE,
  ],
  VIEWER: [
    Permissions.VIEW_INCIDENT,
    Permissions.VIEW_MISSION,
    Permissions.VIEW_TELEMETRY,
    Permissions.VIEW_HUB_STATUS,
  ],
};

// ============================================================================
// USER
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: number;
  lastLoginAt?: number;
}

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']),
  isActive: z.boolean(),
  createdAt: z.number(),
  lastLoginAt: z.number().optional(),
});

// ============================================================================
// AUTH TOKEN
// ============================================================================

export interface AuthToken {
  token: string;
  user: User;
  expiresAt: number;
}

export const AuthTokenSchema = z.object({
  token: z.string(),
  user: UserSchema,
  expiresAt: z.number(),
});

// ============================================================================
// AUDIT LOG ENTRY
// ============================================================================

export const AuditActions = {
  // User actions
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',

  // Incident actions
  INCIDENT_CREATED: 'INCIDENT_CREATED',
  INCIDENT_UPDATED: 'INCIDENT_UPDATED',
  INCIDENT_RESOLVED: 'INCIDENT_RESOLVED',
  INCIDENT_CANCELLED: 'INCIDENT_CANCELLED',

  // Mission actions
  MISSION_CREATED: 'MISSION_CREATED',
  MISSION_LAUNCHED: 'MISSION_LAUNCHED',
  MISSION_COMPLETED: 'MISSION_COMPLETED',
  MISSION_FAILED: 'MISSION_FAILED',
  MISSION_CANCELLED: 'MISSION_CANCELLED',

  // Drone actions
  DRONE_DISPATCHED: 'DRONE_DISPATCHED',
  DRONE_RECALLED: 'DRONE_RECALLED',
  DRONE_MANUAL_CONTROL: 'DRONE_MANUAL_CONTROL',

  // Evidence actions
  SNAPSHOT_CAPTURED: 'SNAPSHOT_CAPTURED',
  EVIDENCE_EXPORTED: 'EVIDENCE_EXPORTED',
  REPORT_EXPORTED: 'REPORT_EXPORTED',

  // Safety actions
  GEOFENCE_CREATED: 'GEOFENCE_CREATED',
  GEOFENCE_UPDATED: 'GEOFENCE_UPDATED',
  GEOFENCE_DELETED: 'GEOFENCE_DELETED',
  SAFETY_POLICY_UPDATED: 'SAFETY_POLICY_UPDATED',
  SAFETY_OVERRIDE: 'SAFETY_OVERRIDE',

  // System actions
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  CONFIGURATION_CHANGED: 'CONFIGURATION_CHANGED',
} as const;

export type AuditAction = (typeof AuditActions)[keyof typeof AuditActions];

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  entityType?: string; // 'INCIDENT', 'MISSION', 'DRONE', etc.
  entityId?: string;
  details: Record<string, any>;
  ipAddress?: string;
  success: boolean;
  errorMessage?: string;
}

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  userId: z.string(),
  userName: z.string(),
  userRole: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']),
  action: z.string(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  details: z.record(z.string(), z.any()),
  ipAddress: z.string().optional(),
  success: z.boolean(),
  errorMessage: z.string().optional(),
});
