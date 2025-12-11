import { describe, it, expect, beforeEach } from 'vitest';
import { SafetyPolicyEngine } from '../services/SafetyPolicyEngine';
import { GeofenceManager } from '../services/GeofenceManager';
import { Drone, Hub } from '../types/domain';
import { DroneStates, HubStates } from '../types/fsm';

describe('Safety Policy Engine', () => {
  let engine: SafetyPolicyEngine;
  let mockDrone: Drone;
  let mockHub: Hub;

  beforeEach(() => {
    engine = new SafetyPolicyEngine();

    mockDrone = {
      id: 'test-drone',
      hubId: 'test-hub',
      position: [24.7136, 46.6753],
      altitude: 0,
      heading: 0,
      speed: 0,
      state: DroneStates.DOCKED,
      health: {
        battery: 100,
        batteryHealth: 95,
        motorStatus: ['OK', 'OK', 'OK', 'OK'],
        gpsStatus: 'OK',
        linkQuality: 95,
        temperature: 35,
        flightHours: 100,
        lastMaintenance: Date.now(),
      },
      capabilities: {
        maxSpeed: 20,
        maxAltitude: 120,
        maxFlightTime: 25,
        hasRGBCamera: true,
        hasThermalCamera: true,
        hasSpotlight: true,
        hasSpeaker: true,
        hasPayloadDrop: false,
      },
      isOnline: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    mockHub = {
      id: 'test-hub',
      name: 'Test Hub',
      position: [24.7136, 46.6753],
      state: HubStates.READY,
      coverageRadius: 5000,
      droneId: 'test-drone',
      health: {
        doorStatus: 'CLOSED',
        chargerStatus: 'AVAILABLE',
        temperature: 25,
        humidity: 50,
        batteryBackup: 90,
        lastMaintenance: Date.now(),
        nextMaintenanceDue: Date.now() + 86400000,
      },
      isOnline: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  it('should pass safety check for healthy drone and hub', () => {
    const result = engine.checkLaunchSafety(mockDrone, mockHub, []);
    expect(result.passed).toBe(true);
    expect(result.failureReasons).toHaveLength(0);
  });

  it('should fail if battery too low', () => {
    mockDrone.health.battery = 20;
    const result = engine.checkLaunchSafety(mockDrone, mockHub, []);
    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes('Battery too low'))).toBe(true);
  });

  it('should fail if link quality too low', () => {
    mockDrone.health.linkQuality = 40;
    const result = engine.checkLaunchSafety(mockDrone, mockHub, []);
    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes('Link quality too low'))).toBe(true);
  });

  it('should fail if hub not ready', () => {
    mockHub.state = HubStates.FAULT;
    const result = engine.checkLaunchSafety(mockDrone, mockHub, []);
    expect(result.passed).toBe(false);
    expect(result.checks.hub.passed).toBe(false);
  });

  it('should fail if geofence violations exist', () => {
    const result = engine.checkLaunchSafety(mockDrone, mockHub, ['geofence-1', 'geofence-2']);
    expect(result.passed).toBe(false);
    expect(result.failureReasons.some(r => r.includes('geofence'))).toBe(true);
  });

  it('should detect auto-return condition for low battery', () => {
    mockDrone.health.battery = 20;
    const result = engine.shouldAutoReturn(mockDrone);
    expect(result.should).toBe(true);
    expect(result.reason).toContain('battery');
  });

  it('should detect auto-return condition for GPS loss', () => {
    mockDrone.health.gpsStatus = 'LOST';
    const result = engine.shouldAutoReturn(mockDrone);
    expect(result.should).toBe(true);
    expect(result.reason).toContain('GPS');
  });

  it('should allow mission to continue if all systems nominal', () => {
    const result = engine.canContinueMission(mockDrone);
    expect(result.can).toBe(true);
  });

  it('should stop mission if critical battery', () => {
    mockDrone.health.battery = 10;
    const result = engine.canContinueMission(mockDrone);
    expect(result.can).toBe(false);
    expect(result.reason).toContain('Critical battery');
  });
});

describe('Geofence Manager', () => {
  let manager: GeofenceManager;

  beforeEach(() => {
    manager = new GeofenceManager();
  });

  it('should detect point inside polygon', () => {
    const geofence = manager.addGeofence({
      name: 'Test Zone',
      type: 'NO_FLY',
      polygon: [
        [24.7, 46.7],
        [24.7, 46.8],
        [24.8, 46.8],
        [24.8, 46.7],
      ],
      isActive: true,
      createdBy: 'test',
      createdAt: Date.now(),
    });

    const insidePoint: [number, number] = [24.75, 46.75];
    const result = manager.isPointInGeofence(insidePoint, geofence);
    expect(result).toBe(true);
  });

  it('should detect point outside polygon', () => {
    const geofence = manager.addGeofence({
      name: 'Test Zone',
      type: 'NO_FLY',
      polygon: [
        [24.7, 46.7],
        [24.7, 46.8],
        [24.8, 46.8],
        [24.8, 46.7],
      ],
      isActive: true,
      createdBy: 'test',
      createdAt: Date.now(),
    });

    const outsidePoint: [number, number] = [24.5, 46.5];
    const result = manager.isPointInGeofence(outsidePoint, geofence);
    expect(result).toBe(false);
  });

  it('should detect route violations', () => {
    manager.addGeofence({
      name: 'No Fly Zone',
      type: 'NO_FLY',
      polygon: [
        [24.7, 46.7],
        [24.7, 46.8],
        [24.8, 46.8],
        [24.8, 46.7],
      ],
      isActive: true,
      createdBy: 'test',
      createdAt: Date.now(),
    });

    const route: [number, number][] = [
      [24.6, 46.6], // outside
      [24.75, 46.75], // inside no-fly zone
      [24.9, 46.9], // outside
    ];

    const violations = manager.checkRouteViolations(route);
    expect(violations.length).toBeGreaterThan(0);
  });

  it('should not flag inactive geofences', () => {
    manager.addGeofence({
      name: 'Inactive Zone',
      type: 'NO_FLY',
      polygon: [
        [24.7, 46.7],
        [24.7, 46.8],
        [24.8, 46.8],
        [24.8, 46.7],
      ],
      isActive: false, // Inactive
      createdBy: 'test',
      createdAt: Date.now(),
    });

    const route: [number, number][] = [[24.75, 46.75]];
    const violations = manager.checkRouteViolations(route);
    expect(violations.length).toBe(0);
  });
});
