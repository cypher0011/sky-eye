import React, { useState } from 'react';
import { useSimulation, Position } from '../../context/SimulationContext';
import { AlertTriangle, Battery, Navigation, ShieldCheck, CheckCircle, Clock, Flame, Car, HeartPulse, Shield, Plus } from 'lucide-react';

const Dashboard: React.FC = () => {
    const {
        incidents,
        drones,
        dispatchDrone,
        resolveIncident,
        createIncident,
        autoDispatch,
        setAutoDispatch,
        weather,
        setWeather,
        statistics,
        activityLog,
        calculateETA
    } = useSimulation();

    const [showScenarios, setShowScenarios] = useState(false);

    const getIncidentIcon = (type: string) => {
        switch (type) {
            case 'FIRE': return <Flame className="w-4 h-4 text-orange-500" />;
            case 'ACCIDENT': return <Car className="w-4 h-4 text-yellow-500" />;
            case 'MEDICAL': return <HeartPulse className="w-4 h-4 text-red-500" />;
            case 'SECURITY': return <Shield className="w-4 h-4 text-purple-500" />;
            default: return <AlertTriangle className="w-4 h-4 text-red-500" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'HIGH': return 'bg-red-900 text-red-200 border-red-500';
            case 'MEDIUM': return 'bg-yellow-900 text-yellow-200 border-yellow-500';
            case 'LOW': return 'bg-green-900 text-green-200 border-green-500';
            default: return 'bg-gray-900 text-gray-200';
        }
    };

    const handleDispatch = (incidentId: string) => {
        const incident = incidents.find(i => i.id === incidentId);
        if (!incident) return;

        // Find nearest available drone
        const availableDrones = drones.filter(d => d.status === 'IDLE');
        if (availableDrones.length === 0) {
            alert('No available drones!');
            return;
        }

        let nearestDrone = availableDrones[0];
        let minDistance = Infinity;

        availableDrones.forEach(drone => {
            const dx = drone.position[0] - incident.position[0];
            const dy = drone.position[1] - incident.position[1];
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance < minDistance) {
                minDistance = distance;
                nearestDrone = drone;
            }
        });

        if (nearestDrone) {
            dispatchDrone(nearestDrone.id, incidentId);
        }
    };

    // Scenario generators
    const generateScenario = (type: 'ACCIDENT' | 'FIRE' | 'MEDICAL' | 'SECURITY', severity: 'LOW' | 'MEDIUM' | 'HIGH') => {
        const position: Position = [
            24.7136 + (Math.random() - 0.5) * 0.12,
            46.6753 + (Math.random() - 0.5) * 0.12
        ];
        createIncident(type, position, severity);
        setShowScenarios(false);
    };

    return (
        <div className="flex flex-col h-full p-4 space-y-3 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                    {/* <ShieldCheck className="text-blue-500 w-8 h-8" /> */}
                    <div>
                        <h1 className="text-xl font-bold tracking-wider leading-none">SKY EYE</h1>
                        <span className="text-[10px] text-gray-400 font-mono tracking-widest">COMMAND CENTER</span>
                    </div>
                </div>
                <button
                    onClick={() => setShowScenarios(!showScenarios)}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                    title="Create Scenario"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Scenario Generator Modal */}
            {showScenarios && (
                <div className="bg-gray-800 p-3 rounded-lg border border-blue-500 space-y-2">
                    <div className="text-xs font-bold text-blue-400 uppercase">Generate Scenario</div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => generateScenario('ACCIDENT', 'HIGH')} className="text-xs bg-yellow-600 hover:bg-yellow-700 p-2 rounded">
                            🚗 Major Accident
                        </button>
                        <button onClick={() => generateScenario('FIRE', 'HIGH')} className="text-xs bg-orange-600 hover:bg-orange-700 p-2 rounded">
                            🔥 Building Fire
                        </button>
                        <button onClick={() => generateScenario('MEDICAL', 'HIGH')} className="text-xs bg-red-600 hover:bg-red-700 p-2 rounded">
                            🏥 Medical Emergency
                        </button>
                        <button onClick={() => generateScenario('SECURITY', 'MEDIUM')} className="text-xs bg-purple-600 hover:bg-purple-700 p-2 rounded">
                            🔒 Security Alert
                        </button>
                    </div>
                </div>
            )}

            {/* Statistics Panel */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-800 p-2 rounded border border-gray-700 text-center">
                    <div className="text-lg font-bold text-blue-400">{statistics.totalIncidents}</div>
                    <div className="text-[9px] text-gray-500 font-mono">TOTAL</div>
                </div>
                <div className="bg-gray-800 p-2 rounded border border-gray-700 text-center">
                    <div className="text-lg font-bold text-green-400">{statistics.resolvedIncidents}</div>
                    <div className="text-[9px] text-gray-500 font-mono">RESOLVED</div>
                </div>
                <div className="bg-gray-800 p-2 rounded border border-gray-700 text-center">
                    <div className="text-lg font-bold text-yellow-400">{Math.round(statistics.avgResponseTime)}s</div>
                    <div className="text-[9px] text-gray-500 font-mono">AVG TIME</div>
                </div>
            </div>

            {/* System Status */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                    <div className="text-[10px] text-gray-500 font-mono">WEATHER</div>
                    <button
                        onClick={() => setWeather(weather === 'CLEAR' ? 'RAIN' : weather === 'RAIN' ? 'STORM' : 'CLEAR')}
                        className="text-sm font-bold text-white flex items-center w-full hover:bg-gray-700 rounded transition-colors"
                    >
                        <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                            weather === 'CLEAR' ? 'bg-green-500' : weather === 'RAIN' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></span>
                        {weather}
                    </button>
                </div>
                <div className="bg-gray-800 p-2 rounded border border-gray-700">
                    <div className="text-[10px] text-gray-500 font-mono">AI DISPATCH</div>
                    <button
                        onClick={() => setAutoDispatch(!autoDispatch)}
                        className={`text-xs font-bold px-2 py-0.5 rounded transition-colors w-full mt-1 ${
                            autoDispatch ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
                        }`}
                    >
                        {autoDispatch ? 'AUTO ON' : 'MANUAL'}
                    </button>
                </div>
            </div>

            {/* Active Incidents */}
            <div className="flex-1 overflow-y-auto min-h-0">
                <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">
                    Active Alerts ({incidents.filter(i => i.status === 'ACTIVE').length})
                </h2>
                <div className="space-y-2">
                    {incidents.filter(i => i.status === 'ACTIVE').length === 0 && (
                        <p className="text-gray-500 text-sm italic">No active incidents.</p>
                    )}
                    {incidents.filter(i => i.status === 'ACTIVE').map(incident => {
                        const assignedDrone = drones.find(d => d.targetIncidentId === incident.id);
                        const eta = assignedDrone && assignedDrone.status === 'MOVING_TO_INCIDENT'
                            ? calculateETA(assignedDrone.position, incident.position)
                            : null;

                        return (
                            <div key={incident.id} className={`bg-gray-700 p-3 rounded-lg border-l-4 ${getSeverityColor(incident.severity)} ${incident.severity === 'HIGH' ? 'animate-pulse' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center space-x-2">
                                        {getIncidentIcon(incident.type)}
                                        <span className="font-bold text-sm">{incident.type}</span>
                                    </div>
                                    <span className="text-xs text-gray-400">{new Date(incident.timestamp).toLocaleTimeString()}</span>
                                </div>

                                {/* AI Analysis */}
                                {incident.aiAnalysis && (
                                    <div className="mt-2 text-[10px] text-gray-400 space-y-1">
                                        <div className="flex gap-3">
                                            <span>👥 {incident.aiAnalysis.peopleCount} people</span>
                                            {incident.aiAnalysis.injuredCount > 0 && (
                                                <span className="text-red-400">🚑 {incident.aiAnalysis.injuredCount} injured</span>
                                            )}
                                        </div>
                                        <div className="text-[9px] text-yellow-500">
                                            ⚠️ {incident.aiAnalysis.hazards.slice(0, 2).join(' • ')}
                                        </div>
                                    </div>
                                )}

                                {/* ETA Display */}
                                {eta !== null && (
                                    <div className="mt-2 flex items-center space-x-1 text-blue-400 text-xs">
                                        <Clock className="w-3 h-3" />
                                        <span>ETA: {eta}s</span>
                                    </div>
                                )}

                                {/* Response time if drone arrived */}
                                {incident.responseTime && (
                                    <div className="mt-1 text-[10px] text-green-400">
                                        ✓ Drone on scene ({incident.responseTime}s response)
                                    </div>
                                )}

                                <div className="mt-2 flex justify-between items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(incident.severity)}`}>
                                        {incident.severity}
                                    </span>
                                    <div className="flex gap-1">
                                        {!assignedDrone && (
                                            <button
                                                onClick={() => handleDispatch(incident.id)}
                                                className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
                                            >
                                                DISPATCH
                                            </button>
                                        )}
                                        {incident.responseTime && (
                                            <button
                                                onClick={() => resolveIncident(incident.id)}
                                                className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded transition-colors flex items-center gap-1"
                                            >
                                                <CheckCircle className="w-3 h-3" />
                                                RESOLVE
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Drone Status */}
            <div className="border-t border-gray-700 pt-4 flex-1 flex flex-col min-h-0">
                <h2 className="text-sm font-semibold text-gray-400 uppercase mb-2">Drone Fleet</h2>
                <div className="space-y-2 overflow-y-auto mb-4 flex-shrink-0 max-h-40">
                    {drones.map(drone => (
                        <div key={drone.id} className="bg-gray-700/50 p-2 rounded flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                                <Navigation className={`w-4 h-4 ${drone.status === 'IDLE' ? 'text-gray-400' : 'text-drone-green'}`} />
                                <span>{drone.id}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <span className={`text-xs px-1.5 py-0.5 rounded ${drone.status === 'IDLE' ? 'bg-gray-600' : 'bg-drone-blue'
                                    }`}>{drone.status}</span>
                                <div className="flex items-center space-x-1 text-gray-300">
                                    <Battery className="w-3 h-3" />
                                    <span className="text-xs">{Math.round(drone.battery)}%</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Activity Log */}
                <div className="border-t border-gray-700 pt-2 flex-1 flex flex-col min-h-0">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase mb-2">Activity Log</h2>
                    <div className="flex-1 overflow-y-auto bg-black/30 p-2 rounded font-mono text-[10px] space-y-1 max-h-32">
                        {activityLog.slice(-20).reverse().map(entry => {
                            const colorClass = {
                                'DISPATCH': 'text-blue-400',
                                'ARRIVAL': 'text-green-400',
                                'RESOLVED': 'text-emerald-400',
                                'ALERT': 'text-red-400',
                                'BROADCAST': 'text-purple-400',
                                'SYSTEM': 'text-gray-400'
                            }[entry.type] || 'text-gray-400';

                            return (
                                <div key={entry.id} className={colorClass}>
                                    [{new Date(entry.timestamp).toLocaleTimeString()}] {entry.message}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
