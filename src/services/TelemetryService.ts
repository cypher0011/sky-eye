/**
 * Telemetry Service - Mock WebSocket-based real-time telemetry
 * In production, this would connect to actual WebSocket server
 * For demo, simulates realistic telemetry data
 */

import {
  TelemetryFrame,
  TelemetryEvent,
  ConnectionStatus,
  TelemetryServiceConfig,
  defaultTelemetryConfig,
} from '../types/telemetry';
import { Position } from '../types/domain';

type TelemetryCallback = (frame: TelemetryFrame) => void;
type EventCallback = (event: TelemetryEvent) => void;

export class TelemetryService {
  private config: TelemetryServiceConfig;
  private connectionStatus: ConnectionStatus = {
    isConnected: false,
    isReconnecting: false,
    reconnectAttempts: 0,
  };

  private telemetryCallbacks: TelemetryCallback[] = [];
  private eventCallbacks: EventCallback[] = [];
  private simulationIntervals: Map<string, NodeJS.Timeout> = new Map();
  private reconnectTimeout?: NodeJS.Timeout;

  constructor(config: Partial<TelemetryServiceConfig> = {}) {
    this.config = { ...defaultTelemetryConfig, ...config };
  }

  /**
   * Connect to telemetry service
   */
  connect(): void {
    if (this.connectionStatus.isConnected) return;

    // Simulate connection delay
    setTimeout(() => {
      this.connectionStatus = {
        isConnected: true,
        isReconnecting: false,
        reconnectAttempts: 0,
        lastConnectedAt: Date.now(),
      };

      this.emitEvent({
        type: 'CONNECTED',
        timestamp: Date.now(),
      });

      console.log('[TelemetryService] Connected');
    }, 100);
  }

  /**
   * Disconnect from telemetry service
   */
  disconnect(): void {
    if (!this.connectionStatus.isConnected) return;

    this.connectionStatus = {
      ...this.connectionStatus,
      isConnected: false,
      lastDisconnectedAt: Date.now(),
    };

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    // Stop all simulations
    this.simulationIntervals.forEach(interval => clearInterval(interval));
    this.simulationIntervals.clear();

    this.emitEvent({
      type: 'DISCONNECTED',
      timestamp: Date.now(),
    });

    console.log('[TelemetryService] Disconnected');
  }

  /**
   * Simulate connection loss and reconnection
   */
  private simulateConnectionLoss(): void {
    this.connectionStatus = {
      ...this.connectionStatus,
      isConnected: false,
      isReconnecting: true,
      lastDisconnectedAt: Date.now(),
    };

    this.emitEvent({
      type: 'DISCONNECTED',
      timestamp: Date.now(),
      payload: { reason: 'Connection lost' },
    });

    this.attemptReconnect();
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(): void {
    if (this.connectionStatus.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.emitEvent({
        type: 'ERROR',
        timestamp: Date.now(),
        payload: { message: 'Max reconnection attempts reached' },
      });
      return;
    }

    const attempt = this.connectionStatus.reconnectAttempts + 1;
    const delay = Math.min(this.config.reconnectInterval * Math.pow(2, attempt - 1), 30000);

    this.emitEvent({
      type: 'RECONNECTING',
      timestamp: Date.now(),
      payload: { attempt, delay },
    });

    this.reconnectTimeout = setTimeout(() => {
      this.connectionStatus.reconnectAttempts = attempt;
      this.connect();
    }, delay);
  }

  /**
   * Start simulating telemetry for a drone
   */
  startSimulation(
    droneId: string,
    getPosition: () => Position,
    getAltitude: () => number,
    getHeading: () => number,
    getSpeed: () => number,
    getBattery: () => number
  ): void {
    if (this.simulationIntervals.has(droneId)) {
      return; // Already simulating
    }

    const interval = setInterval(() => {
      if (!this.connectionStatus.isConnected) return;

      const frame = this.generateTelemetryFrame(
        droneId,
        getPosition(),
        getAltitude(),
        getHeading(),
        getSpeed(),
        getBattery()
      );

      this.emitTelemetry(frame);

      if (Math.random() < 0.001 && this.connectionStatus.isConnected) {
        this.simulateConnectionLoss();
      }

      // Randomly inject faults/warnings for demo
      if (Math.random() < 0.01) {
        // 1% chance
        this.injectRandomFault(frame);
      }
    }, 1000); // 1 Hz telemetry rate

    this.simulationIntervals.set(droneId, interval);
  }

  /**
   * Stop simulating telemetry for a drone
   */
  stopSimulation(droneId: string): void {
    const interval = this.simulationIntervals.get(droneId);
    if (interval) {
      clearInterval(interval);
      this.simulationIntervals.delete(droneId);
    }
  }

  /**
   * Generate realistic telemetry frame
   */
  private generateTelemetryFrame(
    droneId: string,
    position: Position,
    altitude: number,
    heading: number,
    speed: number,
    battery: number
  ): TelemetryFrame {
    // Add GPS drift
    const gpsNoise = 0.00001; // ~1m
    const noisyPosition: Position = [
      position[0] + (Math.random() - 0.5) * gpsNoise,
      position[1] + (Math.random() - 0.5) * gpsNoise,
    ];

    // Simulate battery characteristics
    const batteryVoltage = 22.2 + (battery / 100) * 3.0; // 6S LiPo
    const batteryCurrent = speed > 0 ? 10 + speed * 0.5 : 2; // Amperes
    const batteryTemp = 25 + Math.random() * 10;

    // Link quality (decreases with distance, affected by obstacles)
    const linkQuality = Math.max(50, 100 - Math.random() * 20);

    // GPS status
    const gpsStatus: 'OK' | 'DEGRADED' | 'LOST' =
      Math.random() > 0.95 ? 'DEGRADED' : 'OK';

    // Motor data
    const motorRPM = speed > 0
      ? Array(4).fill(0).map(() => 4000 + Math.random() * 2000)
      : Array(4).fill(0);
    const motorTemperatures = Array(4).fill(0).map(() => 40 + Math.random() * 15);

    // IMU data
    const roll = (Math.random() - 0.5) * 10; // degrees
    const pitch = (Math.random() - 0.5) * 10;
    const yaw = heading;

    // Wind estimation
    const windSpeed = Math.random() * 5; // m/s
    const windDirection = Math.random() * 360;

    const faults: string[] = [];
    const warnings: string[] = [];

    // Generate warnings based on conditions
    if (battery < 25) warnings.push('LOW_BATTERY');
    if (linkQuality < 60) warnings.push('WEAK_SIGNAL');
    if (gpsStatus === 'DEGRADED') warnings.push('GPS_DEGRADED');
    if (Math.max(...motorTemperatures) > 70) warnings.push('HIGH_MOTOR_TEMP');

    return {
      droneId,
      timestamp: Date.now(),
      position: noisyPosition,
      altitude,
      heading,
      speed,
      verticalSpeed: (Math.random() - 0.5) * 2,
      battery,
      batteryVoltage,
      batteryCurrent,
      batteryTemperature: batteryTemp,
      linkQuality,
      signalStrength: -50 - (100 - linkQuality) * 0.5,
      gpsStatus,
      gpsSatellites: gpsStatus === 'OK' ? 12 + Math.floor(Math.random() * 4) : 4,
      gpsAccuracy: gpsStatus === 'OK' ? 1 + Math.random() * 2 : 10,
      motorRPM,
      motorTemperatures,
      imuData: {
        roll,
        pitch,
        yaw,
        accelerationX: (Math.random() - 0.5) * 2,
        accelerationY: (Math.random() - 0.5) * 2,
        accelerationZ: 9.8 + (Math.random() - 0.5) * 1,
      },
      windSpeed,
      windDirection,
      faults,
      warnings,
    };
  }

  /**
   * Inject random faults for demo purposes
   */
  private injectRandomFault(frame: TelemetryFrame): void {
    const faultTypes = [
      'GPS_LOSS',
      'MOTOR_OVERHEAT',
      'LOW_BATTERY',
      'LINK_LOSS',
      'IMU_ERROR',
    ];

    const fault = faultTypes[Math.floor(Math.random() * faultTypes.length)];

    this.emitEvent({
      type: 'FAULT_ALERT',
      timestamp: Date.now(),
      payload: {
        droneId: frame.droneId,
        fault,
        telemetry: frame,
      },
    });
  }

  /**
   * Subscribe to telemetry frames
   */
  onTelemetry(callback: TelemetryCallback): () => void {
    this.telemetryCallbacks.push(callback);
    return () => {
      const index = this.telemetryCallbacks.indexOf(callback);
      if (index > -1) {
        this.telemetryCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to events
   */
  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.push(callback);
    return () => {
      const index = this.eventCallbacks.indexOf(callback);
      if (index > -1) {
        this.eventCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  private emitTelemetry(frame: TelemetryFrame): void {
    this.telemetryCallbacks.forEach(callback => callback(frame));
  }

  private emitEvent(event: TelemetryEvent): void {
    this.eventCallbacks.forEach(callback => callback(event));
  }
}

// Export singleton instance
export const telemetryService = new TelemetryService();
