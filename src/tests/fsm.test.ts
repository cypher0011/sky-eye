import { describe, it, expect } from 'vitest';
import {
  DroneStates,
  DroneEvents,
  DroneState,
  HubStates,
  HubEvents,
  HubState,
  canTransition,
  getNextState,
  droneTransitions,
  hubTransitions,
} from '../types/fsm';

describe('Drone State Machine', () => {
  it('should allow transition from DOCKED to PREFLIGHT', () => {
    const result = canTransition(
      DroneStates.DOCKED,
      DroneEvents.PREFLIGHT_CHECK,
      droneTransitions
    );
    expect(result).toBe(true);
  });

  it('should get correct next state for launch', () => {
    const nextState = getNextState(
      DroneStates.PREFLIGHT,
      DroneEvents.LAUNCH,
      droneTransitions
    );
    expect(nextState).toBe(DroneStates.LAUNCHING);
  });

  it('should reject invalid transitions', () => {
    const result = canTransition(
      DroneStates.DOCKED,
      DroneEvents.ARRIVE_AT_SCENE,
      droneTransitions
    );
    expect(result).toBe(false);
  });

  it('should handle fault detection from operational states', () => {
    const fromEnroute = canTransition(
      DroneStates.ENROUTE,
      DroneEvents.FAULT_DETECTED,
      droneTransitions
    );
    expect(fromEnroute).toBe(true);

    const fromOnScene = canTransition(
      DroneStates.ON_SCENE,
      DroneEvents.FAULT_DETECTED,
      droneTransitions
    );
    expect(fromOnScene).toBe(true);
  });

  it('should complete full mission cycle', () => {
    let state: DroneState = DroneStates.DOCKED;

    state = getNextState(state, DroneEvents.PREFLIGHT_CHECK, droneTransitions)!;
    expect(state).toBe(DroneStates.PREFLIGHT);

    state = getNextState(state, DroneEvents.LAUNCH, droneTransitions)!;
    expect(state).toBe(DroneStates.LAUNCHING);

    state = getNextState(state, DroneEvents.TAKEOFF_COMPLETE, droneTransitions)!;
    expect(state).toBe(DroneStates.ENROUTE);

    state = getNextState(state, DroneEvents.ARRIVE_AT_SCENE, droneTransitions)!;
    expect(state).toBe(DroneStates.ON_SCENE);

    state = getNextState(state, DroneEvents.RETURN_TO_BASE, droneTransitions)!;
    expect(state).toBe(DroneStates.RETURNING);

    state = getNextState(state, DroneEvents.LANDING_INITIATED, droneTransitions)!;
    expect(state).toBe(DroneStates.LANDING);

    state = getNextState(state, DroneEvents.LANDING_COMPLETE, droneTransitions)!;
    expect(state).toBe(DroneStates.POSTFLIGHT);

    state = getNextState(state, DroneEvents.POSTFLIGHT_COMPLETE, droneTransitions)!;
    expect(state).toBe(DroneStates.CHARGING);

    state = getNextState(state, DroneEvents.CHARGING_COMPLETE, droneTransitions)!;
    expect(state).toBe(DroneStates.DOCKED);
  });
});

describe('Hub State Machine', () => {
  it('should allow transition from READY to DOOR_OPENING', () => {
    const result = canTransition(
      HubStates.READY,
      HubEvents.PREPARE_LAUNCH,
      hubTransitions
    );
    expect(result).toBe(true);
  });

  it('should handle launch sequence', () => {
    let state: HubState = HubStates.READY;

    state = getNextState(state, HubEvents.PREPARE_LAUNCH, hubTransitions)!;
    expect(state).toBe(HubStates.DOOR_OPENING);

    state = getNextState(state, HubEvents.DOOR_OPENED, hubTransitions)!;
    expect(state).toBe(HubStates.DOOR_OPEN);

    state = getNextState(state, HubEvents.LAUNCH_DRONE, hubTransitions)!;
    expect(state).toBe(HubStates.LAUNCHING_DRONE);

    state = getNextState(state, HubEvents.LAUNCH_COMPLETE, hubTransitions)!;
    expect(state).toBe(HubStates.DOOR_CLOSING);

    state = getNextState(state, HubEvents.DOOR_CLOSED, hubTransitions)!;
    expect(state).toBe(HubStates.READY);
  });

  it('should handle weather lock', () => {
    const nextState = getNextState(
      HubStates.READY,
      HubEvents.WEATHER_ALERT,
      hubTransitions
    );
    expect(nextState).toBe(HubStates.WEATHER_LOCK);

    const backToReady = getNextState(
      HubStates.WEATHER_LOCK,
      HubEvents.WEATHER_CLEAR,
      hubTransitions
    );
    expect(backToReady).toBe(HubStates.READY);
  });

  it('should reject invalid transitions', () => {
    const result = canTransition(
      HubStates.READY,
      HubEvents.LAUNCH_COMPLETE,
      hubTransitions
    );
    expect(result).toBe(false);
  });
});
