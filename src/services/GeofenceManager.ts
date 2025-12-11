/**
 * Geofence Manager - Manages no-fly zones and restricted areas
 */

import { Geofence, GeofenceTypes } from '../types/safety';
import { Position } from '../types/domain';
import { nanoid } from 'nanoid';

export class GeofenceManager {
  private geofences: Map<string, Geofence> = new Map();

  /**
   * Add a new geofence
   */
  addGeofence(geofence: Omit<Geofence, 'id'>): Geofence {
    const id = `geofence-${nanoid()}`;
    const newGeofence: Geofence = { ...geofence, id };
    this.geofences.set(id, newGeofence);
    return newGeofence;
  }

  /**
   * Remove a geofence
   */
  removeGeofence(id: string): boolean {
    return this.geofences.delete(id);
  }

  /**
   * Update a geofence
   */
  updateGeofence(id: string, updates: Partial<Geofence>): Geofence | null {
    const geofence = this.geofences.get(id);
    if (!geofence) return null;

    const updated = { ...geofence, ...updates };
    this.geofences.set(id, updated);
    return updated;
  }

  /**
   * Get all geofences
   */
  getAllGeofences(): Geofence[] {
    return Array.from(this.geofences.values());
  }

  /**
   * Get active geofences
   */
  getActiveGeofences(): Geofence[] {
    const now = Date.now();
    return this.getAllGeofences().filter(
      g => g.isActive && (!g.expiresAt || g.expiresAt > now)
    );
  }

  /**
   * Check if a point is inside a geofence polygon
   * Uses ray-casting algorithm
   */
  isPointInGeofence(point: Position, geofence: Geofence): boolean {
    const [lat, lng] = point;
    const polygon = geofence.polygon;

    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [lati, lngi] = polygon[i];
      const [latj, lngj] = polygon[j];

      const intersect =
        lngi > lng !== lngj > lng &&
        lat < ((latj - lati) * (lng - lngi)) / (lngj - lngi) + lati;

      if (intersect) inside = !inside;
    }

    return inside;
  }

  /**
   * Check if a route violates any geofences
   */
  checkRouteViolations(waypoints: Position[], altitude?: number): string[] {
    const violations: string[] = [];
    const activeGeofences = this.getActiveGeofences();

    for (const geofence of activeGeofences) {
      // Skip non-blocking geofences (CAUTION zones don't block, just warn)
      if (geofence.type === GeofenceTypes.CAUTION) continue;

      // Check altitude constraints
      if (altitude !== undefined) {
        if (geofence.minAltitude && altitude < geofence.minAltitude) continue;
        if (geofence.maxAltitude && altitude > geofence.maxAltitude) continue;
      }

      // Check if any waypoint is inside this geofence
      for (const waypoint of waypoints) {
        if (this.isPointInGeofence(waypoint, geofence)) {
          violations.push(geofence.id);
          break; // No need to check other waypoints for this geofence
        }
      }
    }

    return violations;
  }

  /**
   * Get warnings for a route (for CAUTION zones)
   */
  getRouteWarnings(waypoints: Position[], altitude?: number): string[] {
    const warnings: string[] = [];
    const activeGeofences = this.getActiveGeofences().filter(
      g => g.type === GeofenceTypes.CAUTION
    );

    for (const geofence of activeGeofences) {
      // Check altitude constraints
      if (altitude !== undefined) {
        if (geofence.minAltitude && altitude < geofence.minAltitude) continue;
        if (geofence.maxAltitude && altitude > geofence.maxAltitude) continue;
      }

      // Check if any waypoint is inside this caution zone
      for (const waypoint of waypoints) {
        if (this.isPointInGeofence(waypoint, geofence)) {
          warnings.push(geofence.id);
          break;
        }
      }
    }

    return warnings;
  }

  /**
   * Find safe alternate waypoints that avoid geofences
   * Simple implementation - in production would use path planning algorithms
   */
  findSafeRoute(start: Position, end: Position): Position[] {
    const violations = this.checkRouteViolations([start, end]);

    if (violations.length === 0) {
      // Direct route is safe
      return [start, end];
    }

    // Simple approach: add a midpoint offset to go around
    const [lat1, lng1] = start;
    const [lat2, lng2] = end;
    const midLat = (lat1 + lat2) / 2;
    const midLng = (lng1 + lng2) / 2;

    // Offset perpendicular to the line
    const offset = 0.01; // ~1km
    const midpoint1: Position = [midLat + offset, midLng];
    const midpoint2: Position = [midLat - offset, midLng];

    // Try both offsets
    const route1 = [start, midpoint1, end];
    const route2 = [start, midpoint2, end];

    const violations1 = this.checkRouteViolations(route1);
    const violations2 = this.checkRouteViolations(route2);

    if (violations1.length === 0) return route1;
    if (violations2.length === 0) return route2;

    // If both fail, return direct route (would be blocked in real system)
    console.warn('Could not find safe route avoiding geofences');
    return [start, end];
  }

  /**
   * Get geofences that contain a specific point
   */
  getGeofencesAtPoint(point: Position): Geofence[] {
    return this.getActiveGeofences().filter(g => this.isPointInGeofence(point, g));
  }

  /**
   * Initialize with some default geofences for Riyadh
   */
  initializeDefaultGeofences(): void {
    // Airport no-fly zone
    this.addGeofence({
      name: 'King Khalid International Airport',
      type: GeofenceTypes.NO_FLY,
      polygon: [
        [24.957, 46.698],
        [24.957, 46.72],
        [24.937, 46.72],
        [24.937, 46.698],
      ],
      isActive: true,
      createdBy: 'SYSTEM',
      createdAt: Date.now(),
      description: 'Airport restricted airspace',
    });

    // Royal palace restricted zone
    this.addGeofence({
      name: 'Royal District',
      type: GeofenceTypes.PRIVACY,
      polygon: [
        [24.65, 46.71],
        [24.65, 46.74],
        [24.63, 46.74],
        [24.63, 46.71],
      ],
      isActive: true,
      createdBy: 'SYSTEM',
      createdAt: Date.now(),
      description: 'Privacy-protected area',
    });

    // Military base
    this.addGeofence({
      name: 'Military Zone',
      type: GeofenceTypes.RESTRICTED,
      polygon: [
        [24.8, 46.55],
        [24.8, 46.57],
        [24.78, 46.57],
        [24.78, 46.55],
      ],
      isActive: true,
      createdBy: 'SYSTEM',
      createdAt: Date.now(),
      description: 'Military restricted airspace',
    });

    // Caution zone for dense residential area
    this.addGeofence({
      name: 'Al Olaya District',
      type: GeofenceTypes.CAUTION,
      polygon: [
        [24.7, 46.67],
        [24.7, 46.69],
        [24.68, 46.69],
        [24.68, 46.67],
      ],
      isActive: true,
      createdBy: 'SYSTEM',
      createdAt: Date.now(),
      description: 'High-density residential area - caution required',
    });
  }
}

// Export singleton instance
export const geofenceManager = new GeofenceManager();

// Initialize default geofences
geofenceManager.initializeDefaultGeofences();
