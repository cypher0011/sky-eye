import React, { useState, useEffect, Suspense } from 'react';
import { Thermometer, Wind, Zap, X, Volume2, Lightbulb, Camera, Gamepad2, Mic } from 'lucide-react';
import OptimizedCityScene from '../3D/OptimizedCityScene';
import toast from 'react-hot-toast';

// Loading component for 3D scene
const SceneLoader = () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <div className="text-xs text-gray-400 font-mono">INITIALIZING 3D VIEW...</div>
        </div>
    </div>
);

interface LiveFeedProps {
    drone: {
        id: string;
        position: [number, number];
        battery: number;
    };
    incident: {
        id: string;
        type: string;
        position: [number, number];
        severity: string;
        aiAnalysis?: {
            peopleCount: number;
            injuredCount: number;
            vehicleCount: number;
            threatLevel: number;
            hazards: string[];
        };
    };
    availableDrones?: Array<{
        id: string;
        position: [number, number];
        battery: number;
    }>;
    onDroneSwitch?: (droneId: string) => void;
    onClose: () => void;
}

const BROADCAST_MESSAGES = [
    "Help is on the way. Please stay calm.",
    "Emergency services have been notified.",
    "Please move to a safe location.",
    "Do not touch any injured persons.",
    "Clear the area immediately.",
    "Police are en route. Stay where you are.",
    "Medical team dispatched. Do not move injured.",
    "Fire department notified. Evacuate the area."
];

const LiveFeed: React.FC<LiveFeedProps> = ({ drone, incident, availableDrones, onDroneSwitch, onClose }) => {
    const [thermalMode, setThermalMode] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [lightsOn, setLightsOn] = useState(false);
    const [showBroadcastMenu, setShowBroadcastMenu] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isPushToTalking, setIsPushToTalking] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [showDroneSelector, setShowDroneSelector] = useState(false);

    const hasMultipleDrones = availableDrones && availableDrones.length > 1;

    useEffect(() => {
        const interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const handleBroadcast = (message: string) => {
        toast.success(`Broadcasting: "${message}"`);
        setShowBroadcastMenu(false);
    };

    const handlePushToTalk = (action: 'start' | 'stop') => {
        if (action === 'start') {
            setIsPushToTalking(true);
            setIsRecording(true);
            toast('🎤 Push-to-Talk ACTIVE', { duration: 1000 });
        } else {
            setIsPushToTalking(false);
            setIsRecording(false);
            toast.success('Message broadcasted');
        }
    };

    const handleResolveIncident = () => {
        toast.success('Incident marked as resolved');
        setTimeout(() => onClose(), 1000);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Simulated telemetry
    const altitude = 120 + Math.sin(Date.now() / 1000) * 2;
    const speed = 0; // Hovering

    // Keyboard handler for push-to-talk (hold spacebar)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'KeyT' && !isPushToTalking) {
                handlePushToTalk('start');
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'KeyT' && isPushToTalking) {
                handlePushToTalk('stop');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isPushToTalking]);

    return (
        <div className={`fixed z-[1000] bg-black border-2 border-drone-blue rounded-lg overflow-hidden shadow-2xl transition-all duration-300 ${isFullScreen ? 'inset-0 w-full h-full' : 'top-4 right-4 w-96'
            }`}>
            {/* Header */}
            <div className="bg-gray-900 p-2 flex justify-between items-center border-b border-gray-800 z-10 relative">
                <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-red-500 font-mono text-xs font-bold">LIVE FEED</span>
                    <div className="relative">
                        <button
                            onClick={() => hasMultipleDrones && setShowDroneSelector(!showDroneSelector)}
                            className={`text-gray-400 font-mono text-xs flex items-center gap-1 ${hasMultipleDrones ? 'hover:text-white cursor-pointer' : ''}`}
                        >
                            DRONE-{drone.id}
                            {hasMultipleDrones && (
                                <span className="text-[10px] text-blue-400">({availableDrones.length} total)</span>
                            )}
                        </button>
                        {/* Drone Selector Dropdown */}
                        {showDroneSelector && hasMultipleDrones && (
                            <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-blue-500 rounded shadow-lg min-w-[200px] z-50">
                                <div className="p-2 border-b border-gray-700 text-[10px] text-blue-400 font-bold">
                                    SWITCH DRONE CONTROL
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                    {availableDrones.map((d) => (
                                        <button
                                            key={d.id}
                                            onClick={() => {
                                                if (onDroneSwitch && d.id !== drone.id) {
                                                    onDroneSwitch(d.id);
                                                    toast.success(`Switched to DRONE-${d.id}`);
                                                }
                                                setShowDroneSelector(false);
                                            }}
                                            className={`w-full text-left p-2 text-xs transition-colors ${
                                                d.id === drone.id
                                                    ? 'bg-blue-600 text-white'
                                                    : 'hover:bg-gray-700 text-gray-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-mono">DRONE-{d.id}</span>
                                                <span className={`text-[10px] ${
                                                    d.battery >= 60 ? 'text-green-400' :
                                                    d.battery >= 30 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                    {Math.round(d.battery)}%
                                                </span>
                                            </div>
                                            {d.id === drone.id && (
                                                <div className="text-[9px] text-blue-300 mt-1">● ACTIVE</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-gray-400 hover:text-white">
                        {isFullScreen ? '−' : '□'}
                    </button>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Video Area (3D Scene) */}
            <div className={`relative bg-gray-800 overflow-hidden group ${isFullScreen ? 'h-[calc(100vh-100px)]' : 'h-64'}`}>
                <div className={`w-full h-full ${thermalMode ? 'brightness-150 contrast-125 hue-rotate-180 invert' : ''}`}>
                    <Suspense fallback={<SceneLoader />}>
                        <OptimizedCityScene thermalMode={thermalMode} />
                    </Suspense>
                </div>

                {/* Scanning Effect Overlay (Thermal Mode) */}
                {thermalMode && (
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_0%,rgba(0,255,0,0.2)_50%,transparent_100%)] bg-[length:100%_200%] animate-scan"></div>
                )}

                {/* Telemetry Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-xs font-mono text-green-400 pointer-events-none">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                                <Zap className="w-3 h-3" />
                                <span>BAT: {Math.round(drone.battery)}%</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Wind className="w-3 h-3" />
                                <span>ALT: {altitude.toFixed(1)}m</span>
                            </div>
                            <div>SPD: {speed} km/h</div>
                            <div className="text-gray-400">ID: {drone.id}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-white font-bold text-lg">{formatTime(recordingTime)}</div>
                            <div className="text-red-500 animate-pulse font-bold">{incident.type} DETECTED</div>
                            <div>LAT: {incident.position[0].toFixed(4)}</div>
                            <div>LNG: {incident.position[1].toFixed(4)}</div>
                            <div className="text-gray-400 mt-1">AI ANALYSIS: <span className="text-white">THREAT LEVEL {incident.severity}</span></div>
                        </div>
                    </div>
                    {isFullScreen && (
                        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white/30 text-xl font-bold border border-white/30 px-4 py-1 rounded">
                            MANUAL OVERRIDE ACTIVE
                        </div>
                    )}
                    <div className="mt-2 text-center text-white/50 text-[10px]">
                        CONTROLS: W/A/S/D to Move | SPACE/SHIFT to Ascend/Descend | T for Push-to-Talk
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-gray-900 p-3 space-y-2">
                <div className="grid grid-cols-4 gap-1">
                    <button
                        onClick={() => setThermalMode(!thermalMode)}
                        className={`flex flex-col items-center justify-center p-2 rounded text-[10px] font-bold transition-colors ${thermalMode ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        title="Thermal Vision"
                    >
                        <Thermometer className="w-4 h-4 mb-1" />
                        THERMAL
                    </button>
                    <button
                        onClick={() => setLightsOn(!lightsOn)}
                        className={`flex flex-col items-center justify-center p-2 rounded text-[10px] font-bold transition-colors ${lightsOn ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        title="Toggle Lights"
                    >
                        <Lightbulb className="w-4 h-4 mb-1" />
                        LIGHTS
                    </button>
                    <button
                        onClick={() => setShowBroadcastMenu(!showBroadcastMenu)}
                        className={`flex flex-col items-center justify-center p-2 rounded text-[10px] font-bold transition-colors ${showBroadcastMenu ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                        title="Broadcast Message"
                    >
                        <Volume2 className="w-4 h-4 mb-1" />
                        SPEAK
                    </button>
                    <button
                        onClick={() => toast.success('Snapshot captured!')}
                        className="flex flex-col items-center justify-center p-2 rounded text-[10px] font-bold bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
                        title="Take Screenshot"
                    >
                        <Camera className="w-4 h-4 mb-1" />
                        CAPTURE
                    </button>
                </div>

                {/* Broadcast Menu */}
                {showBroadcastMenu && (
                    <div className="bg-gray-800 p-2 rounded border border-purple-500 space-y-1 max-h-48 overflow-y-auto">
                        <div className="text-[10px] text-purple-400 font-bold mb-2">SELECT MESSAGE TO BROADCAST:</div>
                        {BROADCAST_MESSAGES.map((msg, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleBroadcast(msg)}
                                className="w-full text-left text-[10px] p-1.5 bg-gray-700 hover:bg-purple-600 rounded transition-colors"
                            >
                                {msg}
                            </button>
                        ))}
                        <div className="border-t border-gray-600 pt-2 mt-2">
                            <div className="text-[10px] text-purple-400 font-bold mb-2">PUSH-TO-TALK:</div>
                            <button
                                onMouseDown={() => handlePushToTalk('start')}
                                onMouseUp={() => handlePushToTalk('stop')}
                                onMouseLeave={() => isPushToTalking && handlePushToTalk('stop')}
                                className={`w-full p-3 rounded font-bold text-sm transition-all ${
                                    isPushToTalking
                                        ? 'bg-red-600 text-white scale-105'
                                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-center space-x-2">
                                    <Mic className={`w-5 h-5 ${isPushToTalking ? 'animate-pulse' : ''}`} />
                                    <span>
                                        {isPushToTalking ? 'BROADCASTING...' : 'HOLD TO TALK'}
                                    </span>
                                </div>
                                {!isPushToTalking && (
                                    <div className="text-[9px] text-gray-500 mt-1">
                                        Press 'T' key or hold this button
                                    </div>
                                )}
                                {isRecording && (
                                    <div className="flex items-center justify-center space-x-1 mt-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                        <span className="text-xs">RECORDING</span>
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* AI Analysis Panel */}
                {incident.aiAnalysis && (
                    <div className="bg-gray-800 p-2 rounded border border-blue-500">
                        <div className="text-[10px] text-blue-400 font-bold mb-2">AI THREAT ANALYSIS</div>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                                <span className="text-gray-500">People:</span>
                                <span className="ml-1 text-white">{incident.aiAnalysis.peopleCount}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Injured:</span>
                                <span className="ml-1 text-red-400">{incident.aiAnalysis.injuredCount}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Vehicles:</span>
                                <span className="ml-1 text-white">{incident.aiAnalysis.vehicleCount}</span>
                            </div>
                            <div>
                                <span className="text-gray-500">Threat:</span>
                                <span className={`ml-1 ${incident.aiAnalysis.threatLevel > 7 ? 'text-red-400' :
                                    incident.aiAnalysis.threatLevel > 4 ? 'text-yellow-400' : 'text-green-400'
                                    }`}>{incident.aiAnalysis.threatLevel}/10</span>
                            </div>
                        </div>
                        <div className="mt-2 text-[9px] text-yellow-500">
                            Hazards: {incident.aiAnalysis.hazards.join(' • ')}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={handleResolveIncident}
                        className="bg-green-600 hover:bg-green-700 text-white py-2 rounded text-xs font-bold transition-colors"
                    >
                        MARK RESOLVED
                    </button>
                    <button
                        onClick={() => setShowControls(!showControls)}
                        className={`py-2 rounded text-xs font-bold transition-colors flex items-center justify-center gap-1 ${showControls ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-cyan-600 text-white'
                            }`}
                    >
                        <Gamepad2 className="w-4 h-4" />
                        TAKE CONTROL
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LiveFeed;
