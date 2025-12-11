/**
 * Safety Policy Engine - Enforces safety rules and flight restrictions
 */

import {
  SafetyPolicy,
  SafetyCheckResult,
  WeatherConditions,
  defaultSafetyPolicy,
} from '../types/safety';
import { Hub, Drone } from '../types/domain';
import { HubStates, DroneStates } from '../types/fsm';

export class SafetyPolicyEngine {
  private policy: SafetyPolicy = defaultSafetyPolicy;
  private weatherConditions: WeatherConditions = {
    condition: 'CLEAR',
    windSpeed: 0,
    windDirection: 0,
    temperature: 25,
    visibility: 10000,
    precipitation: 0,
    isSafeForFlight: true,
    timestamp: Date.now(),
  };

  /**
   * Update safety policy
   */
  setPolicy(policy: SafetyPolicy): void {
    this.policy = policy;
  }

  getPolicy(): SafetyPolicy {
    return this.policy;
  }

  /**
   * Update weather conditions
   */
  setWeatherConditions(weather: WeatherConditions): void {
    this.weatherConditions = weather;
  }

  getWeatherConditions(): WeatherConditions {
    return this.weatherConditions;
  }

  /**
   * Comprehensive safety check for launch
   */
  checkLaunchSafety(drone: Drone, hub: Hub, geofenceViolations: string[] = []): SafetyCheckResult {
    const failureReasons: string[] = [];
    const warnings: string[] = [];

    // Battery check
    const batteryPassed = drone.health.battery >= this.policy.minBatteryForLaunch;
    if (!batteryPassed) {
      failureReasons.push(
        `Battery too low: ${drone.health.battery}% (minimum: ${this.policy.minBatteryForLaunch}%)`
      );
    } else if (drone.health.battery < this.policy.minBatteryForLaunch + 10) {
      warnings.push('Battery is close to minimum launch threshold');
    }

    // Link quality check
    const linkPassed = drone.health.linkQuality >= this.policy.minLinkQuality;
    if (!linkPassed) {
      failureReasons.push(
        `Link quality too low: ${drone.health.linkQuality}% (minimum: ${this.policy.minLinkQuality}%)`
      );
    }

    // GPS check
    const gpsPassed =
      drone.health.gpsStatus === 'OK' &&
      (this.policy.requirePreflightCheck ? true : true); // In real system, would check satellite count
    if (!gpsPassed || drone.health.gpsStatus !== 'OK') {
      failureReasons.push(`GPS status: ${drone.health.gpsStatus}`);
    }

    // Weather check
    const weatherPassed =
      this.weatherConditions.isSafeForFlight &&
      (this.weatherConditions.windSpeed || 0) <= this.policy.maxWindSpeed;
    if (!weatherPassed) {
      if (!this.weatherConditions.isSafeForFlight) {
        failureReasons.push(`Weather condition not safe: ${this.weatherConditions.condition}`);
      }
      if ((this.weatherConditions.windSpeed || 0) > this.policy.maxWindSpeed) {
        failureReasons.push(
          `Wind speed too high: ${this.weatherConditions.windSpeed}m/s (max: ${this.policy.maxWindSpeed}m/s)`
        );
      }
    }

    // Geofence check
    const geofencePassed = !this.policy.enableGeofenceCheck || geofenceViolations.length === 0;
    if (!geofencePassed) {
      failureReasons.push(`Route violates ${geofenceViolations.length} geofence(s)`);
    }

    // Hub check
    const hubPassed = hub.isOnline && hub.state === HubStates.READY;
    let hubReason: string | undefined;
    if (!hub.isOnline) {
      hubReason = 'Hub is offline';
      failureReasons.push(hubReason);
    } else if (hub.state !== HubStates.READY) {
      hubReason = `Hub not ready (state: ${hub.state})`;
      failureReasons.push(hubReason);
    }

    // Drone check
    const dronePassed = drone.isOnline && drone.state === DroneStates.DOCKED;
    let droneReason: string | undefined;
    if (!drone.isOnline) {
      droneReason = 'Drone is offline';
      failureReasons.push(droneReason);
    } else if (drone.state !== DroneStates.DOCKED) {
      droneReason = `Drone not docked (state: ${drone.state})`;
      failureReasons.push(droneReason);
    }

    // Temperature check
    if (drone.health.temperature > this.policy.maxTemperature) {
      warnings.push(`Drone temperature high: ${drone.health.temperature}°C`);
    }

    const passed =
      batteryPassed &&
      linkPassed &&
      gpsPassed &&
      weatherPassed &&
      geofencePassed &&
      hubPassed &&
      dronePassed;

    return {
      passed,
      timestamp: Date.now(),
      checks: {
        battery: {
          passed: batteryPassed,
          value: drone.health.battery,
          threshold: this.policy.minBatteryForLaunch,
        },
        linkQuality: {
          passed: linkPassed,
          value: drone.health.linkQuality,
          threshold: this.policy.minLinkQuality,
        },
        gps: {
          passed: gpsPassed,
          satellites: 0, // Would get from telemetry in real system
          threshold: this.policy.minGpsSatellites,
        },
        weather: {
          passed: weatherPassed,
          windSpeed: this.weatherConditions.windSpeed,
          threshold: this.policy.maxWindSpeed,
        },
        geofence: {
          passed: geofencePassed,
          violations: geofenceViolations,
        },
        hub: {
          passed: hubPassed,
          reason: hubReason,
        },
        drone: {
          passed: dronePassed,
          reason: droneReason,
        },
      },
      failureReasons,
      warnings,
    };
  }

  /**
   * Check if drone should auto-return
   */
  shouldAutoReturn(drone: Drone): { should: boolean; reason?: string } {
    // Low battery check
    if (this.policy.autoReturnOnLowBattery && drone.health.battery <= this.policy.minBatteryForReturn) {
      return {
        should: true,
        reason: `Low battery: ${drone.health.battery}%`,
      };
    }

    // Critical battery check
    if (drone.health.battery <= this.policy.criticalBatteryLevel) {
      return {
        should: true,
        reason: `Critical battery: ${drone.health.battery}%`,
      };
    }

    // Link quality check
    if (drone.health.linkQuality < this.policy.minLinkQuality) {
      return {
        should: true,
        reason: `Poor link quality: ${drone.health.linkQuality}%`,
      };
    }

    // GPS loss check
    if (drone.health.gpsStatus === 'LOST') {
      return {
        should: true,
        reason: 'GPS signal lost',
      };
    }

    // Temperature check
    if (drone.health.temperature > this.policy.maxTemperature) {
      return {
        should: true,
        reason: `High temperature: ${drone.health.temperature}°C`,
      };
    }

    return { should: false };
  }

  /**
   * Get link loss behavior action
   */
  getLinkLossBehavior(): 'HOVER' | 'RETURN' | 'LAND' {
    return this.policy.linkLossBehavior;
  }

  /**
   * Get return altitude
   */
  getReturnAltitude(): number {
    return this.policy.returnAltitude;
  }

  /**
   * Check if mission can continue
   */
  canContinueMission(drone: Drone): { can: boolean; reason?: string } {
    // Check critical battery
    if (drone.health.battery <= this.policy.criticalBatteryLevel) {
      return {
        can: false,
        reason: `Critical battery: ${drone.health.battery}%`,
      };
    }

    // Check if any motors are in fault
    if (drone.health.motorStatus.some(status => status === 'FAULT')) {
      return {
        can: false,
        reason: 'Motor fault detected',
      };
    }

    // Check GPS
    if (drone.health.gpsStatus === 'LOST') {
      return {
        can: false,
        reason: 'GPS signal lost',
      };
    }

    return { can: true };
  }

  /**
   * Validate if enough battery to reach destination
   */
  hasEnoughBatteryForDistance(currentBattery: number, distanceMeters: number): boolean {
    // Simple estimation: 1% battery per 500 meters + 20% reserve
    const batteryNeeded = (distanceMeters / 500) + 20;
    return currentBattery >= batteryNeeded;
  }
}

// Export singleton instance
export const safetyPolicyEngine = new SafetyPolicyEngine();
