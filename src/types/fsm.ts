/**
 * Finite State Machine (FSM) definitions for Drone and Hub
 */

// ============================================================================
// DRONE STATE MACHINE
// ============================================================================

export const DroneStates = {
  DOCKED: 'DOCKED',
  PREFLIGHT: 'PREFLIGHT',
  LAUNCHING: 'LAUNCHING',
  ENROUTE: 'ENROUTE',
  ON_SCENE: 'ON_SCENE',
  ORBIT: 'ORBIT',
  RETURNING: 'RETURNING',
  LANDING: 'LANDING',
  POSTFLIGHT: 'POSTFLIGHT',
  CHARGING: 'CHARGING',
  FAULT: 'FAULT',
} as const;

export type DroneState = (typeof DroneStates)[keyof typeof DroneStates];

export const DroneEvents = {
  PREFLIGHT_CHECK: 'PREFLIGHT_CHECK',
  LAUNCH: 'LAUNCH',
  TAKEOFF_COMPLETE: 'TAKEOFF_COMPLETE',
  ARRIVE_AT_SCENE: 'ARRIVE_AT_SCENE',
  START_ORBIT: 'START_ORBIT',
  RETURN_TO_BASE: 'RETURN_TO_BASE',
  LANDING_INITIATED: 'LANDING_INITIATED',
  LANDING_COMPLETE: 'LANDING_COMPLETE',
  POSTFLIGHT_COMPLETE: 'POSTFLIGHT_COMPLETE',
  CHARGING_COMPLETE: 'CHARGING_COMPLETE',
  FAULT_DETECTED: 'FAULT_DETECTED',
  FAULT_CLEARED: 'FAULT_CLEARED',
} as const;

export type DroneEvent = (typeof DroneEvents)[keyof typeof DroneEvents];

export interface DroneTransition {
  from: DroneState;
  event: DroneEvent;
  to: DroneState;
  guard?: (context: any) => boolean;
}

export const droneTransitions: DroneTransition[] = [
  { from: DroneStates.DOCKED, event: DroneEvents.PREFLIGHT_CHECK, to: DroneStates.PREFLIGHT },
  { from: DroneStates.PREFLIGHT, event: DroneEvents.LAUNCH, to: DroneStates.LAUNCHING },
  { from: DroneStates.LAUNCHING, event: DroneEvents.TAKEOFF_COMPLETE, to: DroneStates.ENROUTE },
  { from: DroneStates.ENROUTE, event: DroneEvents.ARRIVE_AT_SCENE, to: DroneStates.ON_SCENE },
  { from: DroneStates.ON_SCENE, event: DroneEvents.START_ORBIT, to: DroneStates.ORBIT },
  { from: DroneStates.ORBIT, event: DroneEvents.RETURN_TO_BASE, to: DroneStates.RETURNING },
  { from: DroneStates.ON_SCENE, event: DroneEvents.RETURN_TO_BASE, to: DroneStates.RETURNING },
  { from: DroneStates.ENROUTE, event: DroneEvents.RETURN_TO_BASE, to: DroneStates.RETURNING },
  { from: DroneStates.RETURNING, event: DroneEvents.LANDING_INITIATED, to: DroneStates.LANDING },
  { from: DroneStates.LANDING, event: DroneEvents.LANDING_COMPLETE, to: DroneStates.POSTFLIGHT },
  { from: DroneStates.POSTFLIGHT, event: DroneEvents.POSTFLIGHT_COMPLETE, to: DroneStates.CHARGING },
  { from: DroneStates.CHARGING, event: DroneEvents.CHARGING_COMPLETE, to: DroneStates.DOCKED },

  // Fault handling from any operational state
  { from: DroneStates.ENROUTE, event: DroneEvents.FAULT_DETECTED, to: DroneStates.FAULT },
  { from: DroneStates.ON_SCENE, event: DroneEvents.FAULT_DETECTED, to: DroneStates.FAULT },
  { from: DroneStates.ORBIT, event: DroneEvents.FAULT_DETECTED, to: DroneStates.FAULT },
  { from: DroneStates.RETURNING, event: DroneEvents.FAULT_DETECTED, to: DroneStates.FAULT },
  { from: DroneStates.FAULT, event: DroneEvents.FAULT_CLEARED, to: DroneStates.DOCKED },
];

// ============================================================================
// HUB STATE MACHINE
// ============================================================================

export const HubStates = {
  READY: 'READY',
  CHARGING_DRONE: 'CHARGING_DRONE',
  DOOR_OPENING: 'DOOR_OPENING',
  DOOR_OPEN: 'DOOR_OPEN',
  LAUNCHING_DRONE: 'LAUNCHING_DRONE',
  DOOR_CLOSING: 'DOOR_CLOSING',
  RECEIVING_DRONE: 'RECEIVING_DRONE',
  WEATHER_LOCK: 'WEATHER_LOCK',
  SECURITY_LOCK: 'SECURITY_LOCK',
  MAINTENANCE: 'MAINTENANCE',
  FAULT: 'FAULT',
} as const;

export type HubState = (typeof HubStates)[keyof typeof HubStates];

export const HubEvents = {
  START_CHARGING: 'START_CHARGING',
  CHARGING_COMPLETE: 'CHARGING_COMPLETE',
  PREPARE_LAUNCH: 'PREPARE_LAUNCH',
  DOOR_OPENED: 'DOOR_OPENED',
  LAUNCH_DRONE: 'LAUNCH_DRONE',
  LAUNCH_COMPLETE: 'LAUNCH_COMPLETE',
  DRONE_APPROACHING: 'DRONE_APPROACHING',
  DRONE_LANDED: 'DRONE_LANDED',
  DOOR_CLOSED: 'DOOR_CLOSED',
  WEATHER_ALERT: 'WEATHER_ALERT',
  WEATHER_CLEAR: 'WEATHER_CLEAR',
  SECURITY_ALERT: 'SECURITY_ALERT',
  SECURITY_CLEAR: 'SECURITY_CLEAR',
  MAINTENANCE_REQUIRED: 'MAINTENANCE_REQUIRED',
  MAINTENANCE_COMPLETE: 'MAINTENANCE_COMPLETE',
  FAULT_DETECTED: 'FAULT_DETECTED',
  FAULT_CLEARED: 'FAULT_CLEARED',
} as const;

export type HubEvent = (typeof HubEvents)[keyof typeof HubEvents];

export interface HubTransition {
  from: HubState;
  event: HubEvent;
  to: HubState;
  guard?: (context: any) => boolean;
}

export const hubTransitions: HubTransition[] = [
  // Normal operations
  { from: HubStates.READY, event: HubEvents.START_CHARGING, to: HubStates.CHARGING_DRONE },
  { from: HubStates.CHARGING_DRONE, event: HubEvents.CHARGING_COMPLETE, to: HubStates.READY },
  { from: HubStates.READY, event: HubEvents.PREPARE_LAUNCH, to: HubStates.DOOR_OPENING },
  { from: HubStates.DOOR_OPENING, event: HubEvents.DOOR_OPENED, to: HubStates.DOOR_OPEN },
  { from: HubStates.DOOR_OPEN, event: HubEvents.LAUNCH_DRONE, to: HubStates.LAUNCHING_DRONE },
  { from: HubStates.LAUNCHING_DRONE, event: HubEvents.LAUNCH_COMPLETE, to: HubStates.DOOR_CLOSING },
  { from: HubStates.DOOR_CLOSING, event: HubEvents.DOOR_CLOSED, to: HubStates.READY },

  // Receiving drone
  { from: HubStates.READY, event: HubEvents.DRONE_APPROACHING, to: HubStates.DOOR_OPENING },
  { from: HubStates.DOOR_OPEN, event: HubEvents.DRONE_LANDED, to: HubStates.RECEIVING_DRONE },
  { from: HubStates.RECEIVING_DRONE, event: HubEvents.DOOR_CLOSED, to: HubStates.CHARGING_DRONE },

  // Weather/Security locks
  { from: HubStates.READY, event: HubEvents.WEATHER_ALERT, to: HubStates.WEATHER_LOCK },
  { from: HubStates.WEATHER_LOCK, event: HubEvents.WEATHER_CLEAR, to: HubStates.READY },
  { from: HubStates.READY, event: HubEvents.SECURITY_ALERT, to: HubStates.SECURITY_LOCK },
  { from: HubStates.SECURITY_LOCK, event: HubEvents.SECURITY_CLEAR, to: HubStates.READY },

  // Maintenance
  { from: HubStates.READY, event: HubEvents.MAINTENANCE_REQUIRED, to: HubStates.MAINTENANCE },
  { from: HubStates.MAINTENANCE, event: HubEvents.MAINTENANCE_COMPLETE, to: HubStates.READY },

  // Fault handling
  { from: HubStates.READY, event: HubEvents.FAULT_DETECTED, to: HubStates.FAULT },
  { from: HubStates.CHARGING_DRONE, event: HubEvents.FAULT_DETECTED, to: HubStates.FAULT },
  { from: HubStates.FAULT, event: HubEvents.FAULT_CLEARED, to: HubStates.READY },
];

// ============================================================================
// FSM UTILITIES
// ============================================================================

export function canTransition<S, E>(
  currentState: S,
  event: E,
  transitions: Array<{ from: S; event: E; to: S; guard?: (context: any) => boolean }>,
  context?: any
): boolean {
  const transition = transitions.find(
    (t) => t.from === currentState && t.event === event
  );
  if (!transition) return false;
  if (transition.guard && !transition.guard(context)) return false;
  return true;
}

export function getNextState<S, E>(
  currentState: S,
  event: E,
  transitions: Array<{ from: S; event: E; to: S; guard?: (context: any) => boolean }>,
  context?: any
): S | null {
  const transition = transitions.find(
    (t) => t.from === currentState && t.event === event
  );
  if (!transition) return null;
  if (transition.guard && !transition.guard(context)) return null;
  return transition.to;
}
