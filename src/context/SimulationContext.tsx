import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export type Position = [number, number]; // [lat, lng]

export interface Drone {
    id: string;
    stationId: string;
    position: Position;
    status: 'IDLE' | 'MOVING_TO_INCIDENT' | 'AT_INCIDENT' | 'RETURNING';
    battery: number; // 0-100
    targetIncidentId?: string;
}

export interface Station {
    id: string;
    name: string;
    position: Position;
    coverageRadius: number; // in meters
    droneIds: string[];
}

export interface Incident {
    id: string;
    type: 'ACCIDENT' | 'FIRE' | 'MEDICAL' | 'SECURITY';
    position: Position;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    timestamp: number;
    status: 'ACTIVE' | 'RESOLVED';
    assignedDroneId?: string;
    responseTime?: number; // Time in seconds from creation to drone arrival
    resolvedAt?: number;
    aiAnalysis?: {
        peopleCount: number;
        injuredCount: number;
        vehicleCount: number;
        threatLevel: number; // 1-10
        hazards: string[];
    };
}

export interface Statistics {
    totalIncidents: number;
    resolvedIncidents: number;
    avgResponseTime: number;
    incidentsByType: Record<string, number>;
    dronesDispatched: number;
}

interface SimulationContextType {
    stations: Station[];
    drones: Drone[];
    incidents: Incident[];
    statistics: Statistics;
    dispatchDrone: (droneId: string, incidentId: string) => void;
    recallDrone: (droneId: string) => void;
    resolveIncident: (incidentId: string) => void;
    createIncident: (type: Incident['type'], position: Position, severity: Incident['severity']) => void;
    broadcastMessage: (droneId: string, message: string) => void;
    autoDispatch: boolean;
    setAutoDispatch: (value: boolean) => void;
    weather: 'CLEAR' | 'RAIN' | 'STORM';
    setWeather: (value: 'CLEAR' | 'RAIN' | 'STORM') => void;
    calculateETA: (dronePosition: Position, targetPosition: Position) => number;
    activityLog: LogEntry[];
}

export interface LogEntry {
    id: string;
    timestamp: number;
    type: 'DISPATCH' | 'ARRIVAL' | 'RESOLVED' | 'ALERT' | 'BROADCAST' | 'SYSTEM';
    message: string;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const useSimulation = () => {
    const context = useContext(SimulationContext);
    if (!context) {
        throw new Error('useSimulation must be used within a SimulationProvider');
    }
    return context;
};

// Initial Data (Riyadh) - Extended coverage with more hubs
const INITIAL_STATIONS: Station[] = [
    // Central stations
    { id: 's1', name: 'Station North', position: [24.8200, 46.6500], coverageRadius: 5000, droneIds: ['d1'] },
    { id: 's2', name: 'Station Center', position: [24.7136, 46.6753], coverageRadius: 5000, droneIds: ['d2'] },
    { id: 's3', name: 'Station West', position: [24.7000, 46.5500], coverageRadius: 5000, droneIds: ['d3'] },
    { id: 's4', name: 'Station East', position: [24.7000, 46.8000], coverageRadius: 5000, droneIds: ['d4'] },
    { id: 's5', name: 'Station South', position: [24.6000, 46.7000], coverageRadius: 5000, droneIds: ['d5'] },
    // Extended coverage stations
    { id: 's6', name: 'Station Northwest', position: [24.8500, 46.5800], coverageRadius: 5000, droneIds: ['d6'] },
    { id: 's7', name: 'Station Northeast', position: [24.8500, 46.7700], coverageRadius: 5000, droneIds: ['d7'] },
    { id: 's8', name: 'Station Southwest', position: [24.6200, 46.5800], coverageRadius: 5000, droneIds: ['d8'] },
    { id: 's9', name: 'Station Southeast', position: [24.6200, 46.8200], coverageRadius: 5000, droneIds: ['d9'] },
    { id: 's10', name: 'Station Far North', position: [24.9000, 46.6753], coverageRadius: 5000, droneIds: ['d10'] },
    { id: 's11', name: 'Station Far South', position: [24.5500, 46.6753], coverageRadius: 5000, droneIds: ['d11'] },
    { id: 's12', name: 'Station Far West', position: [24.7136, 46.4800], coverageRadius: 5000, droneIds: ['d12'] },
];

const INITIAL_DRONES: Drone[] = INITIAL_STATIONS.map(s => ({
    id: s.droneIds[0],
    stationId: s.id,
    position: s.position,
    status: 'IDLE',
    battery: 100,
}));

// Helper function to generate AI analysis
const generateAIAnalysis = (type: Incident['type'], severity: Incident['severity']) => {
    const severityMultiplier = severity === 'HIGH' ? 3 : severity === 'MEDIUM' ? 2 : 1;
    const hazards: string[] = [];

    if (type === 'FIRE') hazards.push('Active flames', 'Smoke inhalation risk');
    if (type === 'ACCIDENT') hazards.push('Vehicle damage', 'Road obstruction');
    if (type === 'MEDICAL') hazards.push('Medical emergency');
    if (type === 'SECURITY') hazards.push('Potential threat', 'Area not secure');
    if (severity === 'HIGH') hazards.push('Immediate intervention required');

    return {
        peopleCount: Math.floor(Math.random() * 5 * severityMultiplier) + 1,
        injuredCount: Math.floor(Math.random() * 2 * severityMultiplier),
        vehicleCount: type === 'ACCIDENT' ? Math.floor(Math.random() * 3) + 1 : 0,
        threatLevel: Math.min(10, Math.floor(Math.random() * 4) + severityMultiplier * 2),
        hazards
    };
};

export const SimulationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [stations] = useState<Station[]>(INITIAL_STATIONS);
    const [drones, setDrones] = useState<Drone[]>(INITIAL_DRONES);
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activityLog, setActivityLog] = useState<LogEntry[]>([
        { id: '1', timestamp: Date.now(), type: 'SYSTEM', message: 'Sky Eye Command Center initialized' },
        { id: '2', timestamp: Date.now(), type: 'SYSTEM', message: 'All 12 drone stations online - Full city coverage active' }
    ]);
    const [statistics, setStatistics] = useState<Statistics>({
        totalIncidents: 0,
        resolvedIncidents: 0,
        avgResponseTime: 0,
        incidentsByType: {},
        dronesDispatched: 0
    });
    const [weather, setWeather] = useState<'CLEAR' | 'RAIN' | 'STORM'>('CLEAR');
    const [autoDispatch, setAutoDispatch] = useState(false);

    const addLogEntry = (type: LogEntry['type'], message: string) => {
        setActivityLog(prev => [...prev.slice(-50), {
            id: Date.now().toString(),
            timestamp: Date.now(),
            type,
            message
        }]);
    };

    // Calculate ETA in seconds based on distance
    const calculateETA = (dronePosition: Position, targetPosition: Position): number => {
        const dx = targetPosition[0] - dronePosition[0];
        const dy = targetPosition[1] - dronePosition[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        // Approximate: 0.01 degrees ≈ 1.1km, drone speed ~100km/h = ~1.67km/min
        const distanceKm = distance * 111; // rough conversion
        const timeMinutes = distanceKm / 1.67;
        return Math.round(timeMinutes * 60);
    };

    // Simulation Loop
    useEffect(() => {
        const interval = setInterval(() => {
            setDrones(prevDrones => prevDrones.map(drone => {
                // 1. Handle IDLE / Charging
                if (drone.status === 'IDLE') {
                    // Find home station
                    const station = stations.find(s => s.id === drone.stationId);
                    if (station && drone.position[0] === station.position[0] && drone.position[1] === station.position[1]) {
                        return { ...drone, battery: Math.min(drone.battery + 0.5, 100) };
                    }
                    return drone;
                }

                // 2. Handle Movement
                let targetPos: Position | undefined;

                if (drone.status === 'MOVING_TO_INCIDENT' && drone.targetIncidentId) {
                    const incident = incidents.find(i => i.id === drone.targetIncidentId);
                    if (incident) targetPos = incident.position;
                    else {
                        // Incident resolved or gone, return home
                        return { ...drone, status: 'RETURNING', targetIncidentId: undefined };
                    }
                } else if (drone.status === 'RETURNING') {
                    const station = stations.find(s => s.id === drone.stationId);
                    if (station) targetPos = station.position;
                }

                if (targetPos) {
                    const [lat, lng] = drone.position;
                    const [targetLat, targetLng] = targetPos;

                    const dx = targetLat - lat;
                    const dy = targetLng - lng;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Weather affects speed and battery consumption
                    let speed = 0.0005; // Degrees per tick (approx speed)
                    let batteryDrain = 0.05;

                    if (weather === 'RAIN') {
                        speed = 0.0004; // 20% slower
                        batteryDrain = 0.07; // 40% more drain
                    } else if (weather === 'STORM') {
                        speed = 0.0003; // 40% slower
                        batteryDrain = 0.1; // 100% more drain
                    }

                    if (distance < speed) {
                        // Arrived
                        if (drone.status === 'MOVING_TO_INCIDENT') {
                            // Update incident with response time
                            setIncidents(prevIncidents => prevIncidents.map(inc => {
                                if (inc.id === drone.targetIncidentId && !inc.responseTime) {
                                    const responseTime = Math.round((Date.now() - inc.timestamp) / 1000);
                                    addLogEntry('ARRIVAL', `Drone ${drone.id} arrived at ${inc.type} incident in ${responseTime}s`);
                                    return { ...inc, responseTime, assignedDroneId: drone.id };
                                }
                                return inc;
                            }));
                            return { ...drone, position: targetPos, status: 'AT_INCIDENT' };
                        } else if (drone.status === 'RETURNING') {
                            addLogEntry('SYSTEM', `Drone ${drone.id} returned to station`);
                            return { ...drone, position: targetPos, status: 'IDLE' };
                        }
                    } else {
                        // Move
                        const ratio = speed / distance;
                        return {
                            ...drone,
                            position: [lat + dx * ratio, lng + dy * ratio],
                            battery: Math.max(drone.battery - batteryDrain, 0)
                        };
                    }
                }

                // 3. Handle AT_INCIDENT (Hovering)
                if (drone.status === 'AT_INCIDENT') {
                    // Drain battery slower while hovering
                    const newBattery = Math.max(drone.battery - 0.02, 0);
                    // Return if low battery
                    if (newBattery < 20) {
                        return { ...drone, battery: newBattery, status: 'RETURNING' };
                    }
                    return { ...drone, battery: newBattery };
                }

                return drone;
            }));
        }, 100); // 10 ticks per second for smoother animation

        return () => clearInterval(interval);
    }, [incidents, stations, weather]);

    // Create incident function
    const createIncident = (type: Incident['type'], position: Position, severity: Incident['severity']) => {
        const newIncident: Incident = {
            id: Date.now().toString(),
            type,
            position,
            severity,
            timestamp: Date.now(),
            status: 'ACTIVE',
            aiAnalysis: generateAIAnalysis(type, severity)
        };
        setIncidents(prev => [...prev, newIncident]);
        setStatistics(prev => ({
            ...prev,
            totalIncidents: prev.totalIncidents + 1,
            incidentsByType: {
                ...prev.incidentsByType,
                [type]: (prev.incidentsByType[type] || 0) + 1
            }
        }));
        addLogEntry('ALERT', `NEW ${severity} ${type} incident reported at ${position[0].toFixed(3)}, ${position[1].toFixed(3)}`);
    };

    // Incident Generator
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.7 && incidents.filter(i => i.status === 'ACTIVE').length < 5) {
                const types: Incident['type'][] = ['ACCIDENT', 'FIRE', 'MEDICAL', 'SECURITY'];
                const severities: Incident['severity'][] = ['LOW', 'MEDIUM', 'HIGH'];
                const type = types[Math.floor(Math.random() * types.length)];
                const severity = severities[Math.floor(Math.random() * severities.length)];
                const position: Position = [
                    24.7136 + (Math.random() - 0.5) * 0.15,
                    46.6753 + (Math.random() - 0.5) * 0.15
                ];
                createIncident(type, position, severity);
            }
        }, 8000);
        return () => clearInterval(interval);
    }, [incidents]);

    // Auto Dispatch Logic with priority
    useEffect(() => {
        if (!autoDispatch) return;

        const interval = setInterval(() => {
            // Sort incidents by severity (HIGH first, then MEDIUM, then LOW)
            const severityOrder = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2 };
            const sortedIncidents = [...incidents]
                .filter(i => i.status === 'ACTIVE')
                .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

            sortedIncidents.forEach(incident => {
                // Check if already assigned
                const isAssigned = drones.some(d => d.targetIncidentId === incident.id);
                if (isAssigned) return;

                // Find best drone (considers distance and battery)
                const availableDrones = drones.filter(d => d.status === 'IDLE' && d.battery > 30);
                if (availableDrones.length === 0) return;

                let bestDrone = availableDrones[0];
                let bestScore = Infinity;

                availableDrones.forEach(drone => {
                    const dx = drone.position[0] - incident.position[0];
                    const dy = drone.position[1] - incident.position[1];
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    // Score = distance - battery bonus (higher battery = lower score = better)
                    const score = distance - (drone.battery / 1000);
                    if (score < bestScore) {
                        bestScore = score;
                        bestDrone = drone;
                    }
                });

                if (bestDrone) {
                    dispatchDrone(bestDrone.id, incident.id);
                }
            });
        }, 2000); // Check every 2 seconds

        return () => clearInterval(interval);
    }, [autoDispatch, incidents, drones]);

    const dispatchDrone = (droneId: string, incidentId: string) => {
        const incident = incidents.find(i => i.id === incidentId);
        setDrones(prev => prev.map(d => {
            if (d.id === droneId) {
                return { ...d, status: 'MOVING_TO_INCIDENT', targetIncidentId: incidentId };
            }
            return d;
        }));
        setStatistics(prev => ({ ...prev, dronesDispatched: prev.dronesDispatched + 1 }));
        if (incident) {
            addLogEntry('DISPATCH', `Drone ${droneId} dispatched to ${incident.type} incident`);
        }
    };

    const recallDrone = (droneId: string) => {
        setDrones(prev => prev.map(d => {
            if (d.id === droneId) {
                return { ...d, status: 'RETURNING', targetIncidentId: undefined };
            }
            return d;
        }));
        addLogEntry('SYSTEM', `Drone ${droneId} recalled to station`);
    };

    const resolveIncident = (incidentId: string) => {
        const incident = incidents.find(i => i.id === incidentId);
        if (!incident) return;

        // Recall the assigned drone
        if (incident.assignedDroneId) {
            recallDrone(incident.assignedDroneId);
        }

        setIncidents(prev => prev.map(i => {
            if (i.id === incidentId) {
                return { ...i, status: 'RESOLVED', resolvedAt: Date.now() };
            }
            return i;
        }));

        // Update statistics
        setStatistics(prev => {
            const resolvedIncidents = prev.resolvedIncidents + 1;
            const totalResponseTime = prev.avgResponseTime * prev.resolvedIncidents + (incident.responseTime || 0);
            return {
                ...prev,
                resolvedIncidents,
                avgResponseTime: resolvedIncidents > 0 ? totalResponseTime / resolvedIncidents : 0
            };
        });

        addLogEntry('RESOLVED', `${incident.type} incident resolved after ${incident.responseTime || 0}s response time`);

        // Remove resolved incidents after a delay
        setTimeout(() => {
            setIncidents(prev => prev.filter(i => i.id !== incidentId));
        }, 3000);
    };

    const broadcastMessage = (droneId: string, message: string) => {
        addLogEntry('BROADCAST', `Drone ${droneId} broadcasting: "${message}"`);
    };

    return (
        <SimulationContext.Provider value={{
            stations,
            drones,
            incidents,
            statistics,
            dispatchDrone,
            recallDrone,
            resolveIncident,
            createIncident,
            broadcastMessage,
            autoDispatch,
            setAutoDispatch,
            weather,
            setWeather,
            calculateETA,
            activityLog
        }}>
            {children}
        </SimulationContext.Provider>
    );
};
