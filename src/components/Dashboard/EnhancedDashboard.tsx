import React, { useState } from 'react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { Permissions } from '../../types/auth';
import { AlertTriangle, Battery, Navigation, Plus, Eye, Radio } from 'lucide-react';
import { Drone } from '../../types/domain';
import toast from 'react-hot-toast';

interface EnhancedDashboardProps {
  onDroneSelect?: (drone: Drone) => void;
}

const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({ onDroneSelect }) => {
  const {
    drones,
    hubs,
    createIncident,
    createMultiDroneMission,
    weather,
    setWeather,
    statistics,
    autoDispatch,
    setAutoDispatch,
  } = useAppStore();

  const { hasPermission, user } = useAuthStore();
  const [showScenarios, setShowScenarios] = useState(false);

  const handleCreateIncident = (type: 'ACCIDENT' | 'FIRE' | 'MEDICAL' | 'SECURITY', severity: 'LOW' | 'MEDIUM' | 'HIGH') => {
    if (!hasPermission(Permissions.CREATE_INCIDENT)) {
      toast.error('No permission to create incidents');
      return;
    }

    const position: [number, number] = [
      24.7136 + (Math.random() - 0.5) * 0.3,
      46.6753 + (Math.random() - 0.5) * 0.3
    ];

    createIncident(type, position, severity, user?.email || 'system');
    setShowScenarios(false);
    toast.success(`${severity} ${type} incident created`);
  };

  const handleCreateMultiDroneIncident = () => {
    if (!hasPermission(Permissions.CREATE_INCIDENT) || !hasPermission(Permissions.DISPATCH_DRONE)) {
      toast.error('No permission to create incidents or dispatch drones');
      return;
    }

    // Create a large-scale incident
    const position: [number, number] = [
      24.7136 + (Math.random() - 0.5) * 0.3,
      46.6753 + (Math.random() - 0.5) * 0.3
    ];

    const incident = createIncident('FIRE', position, 'HIGH', user?.email || 'system');

    // Find 3 nearest available hubs
    const availableHubs = hubs
      .filter(h => h.isOnline && h.state === 'READY')
      .map(h => {
        const dx = h.position[0] - position[0];
        const dy = h.position[1] - position[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        return { hub: h, distance };
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map(item => item.hub);

    if (availableHubs.length < 3) {
      toast.error('Not enough available hubs for multi-drone deployment');
      return;
    }

    // Create missions for 3 drones
    const hubDronePairs = availableHubs.map(h => ({
      hubId: h.id,
      droneId: h.droneId,
    }));

    const missions = createMultiDroneMission(incident.id, hubDronePairs, user?.email || 'system');

    setShowScenarios(false);
    toast.success(`Large-scale incident created! ${missions.length} drones assigned`, {
      icon: '🚨',
      duration: 5000,
    });
  };

  const getDroneStatusColor = (state: string) => {
    if (state === 'DOCKED') return 'bg-gray-600';
    if (state.includes('ENROUTE') || state.includes('ON_SCENE')) return 'bg-green-600';
    if (state.includes('RETURNING')) return 'bg-yellow-600';
    if (state.includes('FAULT')) return 'bg-red-600';
    return 'bg-blue-600';
  };

  const getDroneStatusText = (state: string) => {
    return state.replace(/_/g, ' ');
  };

  return (
    <div className="flex flex-col h-full p-4 space-y-3 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl font-bold tracking-wider leading-none">SKY EYE</h1>
          <span className="text-[10px] text-gray-400 font-mono tracking-widest">COMMAND CENTER</span>
        </div>
        {hasPermission(Permissions.CREATE_INCIDENT) && (
          <button
            onClick={() => setShowScenarios(!showScenarios)}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            title="Create Scenario"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Scenario Generator */}
      {showScenarios && (
        <div className="bg-gray-800 p-3 rounded-lg border border-blue-500 space-y-2">
          <div className="text-xs font-bold text-blue-400 uppercase">Generate Scenario</div>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => handleCreateIncident('ACCIDENT', 'HIGH')} className="text-xs bg-yellow-600 hover:bg-yellow-700 p-2 rounded">
              Major Accident
            </button>
            <button onClick={() => handleCreateIncident('FIRE', 'HIGH')} className="text-xs bg-orange-600 hover:bg-orange-700 p-2 rounded">
              Building Fire
            </button>
            <button onClick={() => handleCreateIncident('MEDICAL', 'HIGH')} className="text-xs bg-red-600 hover:bg-red-700 p-2 rounded">
              Medical Emergency
            </button>
            <button onClick={() => handleCreateIncident('SECURITY', 'MEDIUM')} className="text-xs bg-purple-600 hover:bg-purple-700 p-2 rounded">
              Security Alert
            </button>
          </div>
          <div className="pt-2 border-t border-gray-700">
            <button
              onClick={handleCreateMultiDroneIncident}
              className="w-full text-xs bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 p-3 rounded font-bold text-white shadow-lg"
            >
              🚨 LARGE INCIDENT (3 DRONES)
            </button>
            <div className="text-[9px] text-gray-400 mt-1 text-center">
              Deploys 3 drones simultaneously
            </div>
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
          <div className="text-lg font-bold text-yellow-400">{statistics.activeIncidents}</div>
          <div className="text-[9px] text-gray-500 font-mono">ACTIVE</div>
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-800 p-2 rounded border border-gray-700">
          <div className="text-[10px] text-gray-500 font-mono">WEATHER</div>
          <button
            onClick={() => {
              const conditions: Array<'CLEAR' | 'RAIN' | 'STORM'> = ['CLEAR', 'RAIN', 'STORM'];
              const current = conditions.indexOf(weather.condition as 'CLEAR' | 'RAIN' | 'STORM');
              const nextIndex = current === -1 ? 0 : (current + 1) % conditions.length;
              setWeather(conditions[nextIndex]);
            }}
            className="text-sm font-bold text-white flex items-center w-full hover:bg-gray-700 rounded transition-colors"
          >
            <span className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
              weather.condition === 'CLEAR' ? 'bg-green-500' : weather.condition === 'RAIN' ? 'bg-yellow-500' : 'bg-red-500'
            }`}></span>
            {weather.condition}
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

      {/* Fleet Status */}
      <div className="border-t border-gray-700 pt-3 flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-400 uppercase">Drone Fleet ({drones.length})</h2>
          <span className="text-xs text-gray-500">
            {drones.filter(d => d.state === 'DOCKED').length} Ready
          </span>
        </div>
        <div className="space-y-2 overflow-y-auto flex-1">
          {drones.map(drone => {
            const hub = hubs.find(h => h.id === drone.hubId);
            return (
              <div key={drone.id} className="bg-gray-700/50 p-2 rounded hover:bg-gray-700 transition-colors group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <Navigation className={`w-4 h-4 ${
                      drone.state === 'DOCKED' ? 'text-gray-400' : 'text-green-400'
                    }`} />
                    <div>
                      <span className="text-sm font-semibold">{drone.id}</span>
                      <div className="text-[9px] text-gray-400">{hub?.name || 'Unknown Hub'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onDroneSelect && onDroneSelect(drone)}
                    className="opacity-0 group-hover:opacity-100 bg-blue-600 hover:bg-blue-700 p-1.5 rounded transition-all flex items-center space-x-1"
                    title="View Live Feed"
                  >
                    <Eye className="w-3 h-3" />
                    <span className="text-[10px] font-semibold">VIEW</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${getDroneStatusColor(drone.state)}`}>
                    {getDroneStatusText(drone.state)}
                  </span>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-gray-300">
                      <Battery className={`w-3 h-3 ${
                        drone.health.battery < 30 ? 'text-red-400' : drone.health.battery < 60 ? 'text-yellow-400' : 'text-green-400'
                      }`} />
                      <span className="text-[10px]">{Math.round(drone.health.battery)}%</span>
                    </div>
                    <div className="flex items-center space-x-1 text-gray-300">
                      <Radio className={`w-3 h-3 ${
                        drone.health.linkQuality < 50 ? 'text-red-400' : drone.health.linkQuality < 80 ? 'text-yellow-400' : 'text-green-400'
                      }`} />
                      <span className="text-[10px]">{Math.round(drone.health.linkQuality)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hub Summary */}
      <div className="border-t border-gray-700 pt-2">
        <div className="text-xs text-gray-500 text-center">
          {hubs.filter(h => h.isOnline).length} of {hubs.length} hubs online
        </div>
      </div>
    </div>
  );
};

export default EnhancedDashboard;
