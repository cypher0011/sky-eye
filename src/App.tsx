import { useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';
import LoginScreen from './components/Auth/LoginScreen';
import GameMap from './components/Map/GameMap';
import EnhancedDashboard from './components/Dashboard/EnhancedDashboard';
import LiveFeed from './components/UI/LiveFeed';
import MissionTimeline from './components/Dashboard/MissionTimeline';
import { LogOut, User, Download, Activity } from 'lucide-react';
import { evidenceExporter } from './services/EvidenceExporter';
import { Permissions } from './types/auth';
import { Drone } from './types/domain';
import { Drone as OldDrone, Incident as OldIncident } from './context/SimulationContext';

const AppContent = () => {
  const { user, logout, hasPermission } = useAuthStore();
  const { incidents, snapshots, getMissionById, getMissionsByIncident, getIncidentById, getDroneById } = useAppStore();
  const [selectedDrone, setSelectedDrone] = useState<Drone | null>(null);
  const [showTimeline, setShowTimeline] = useState(false);

  // Derive mission and incident from selected drone
  const selectedMission = selectedDrone?.activeMissionId ? getMissionById(selectedDrone.activeMissionId) : null;
  const selectedIncident = selectedMission ? getIncidentById(selectedMission.incidentId) : null;

  // Get all missions/drones for the selected incident (multi-drone support)
  const incidentMissions = selectedIncident ? getMissionsByIncident(selectedIncident.id) : [];
  const incidentDrones = incidentMissions.map(m => getDroneById(m.droneId)).filter(Boolean) as Drone[];

  // Convert new Drone/Incident to old format for LiveFeed
  const oldDrone: OldDrone | null = selectedDrone ? {
    id: selectedDrone.id,
    stationId: selectedDrone.hubId,
    position: selectedDrone.position,
    status: 'AT_INCIDENT' as any,
    battery: selectedDrone.health.battery,
    targetIncidentId: selectedDrone.activeMissionId,
  } : null;

  const oldIncident: OldIncident | null = selectedDrone?.activeMissionId
    ? (() => {
        const mission = getMissionById(selectedDrone.activeMissionId);
        const incident = mission ? getIncidentById(mission.incidentId) : null;
        return incident ? {
          id: incident.id,
          type: incident.type as 'FIRE' | 'ACCIDENT' | 'MEDICAL' | 'SECURITY',
          position: incident.position,
          severity: incident.severity as 'LOW' | 'MEDIUM' | 'HIGH',
          timestamp: incident.timestamp,
          status: 'ACTIVE' as any,
          aiAnalysis: incident.aiAnalysis,
        } : null;
      })()
    : null;

  // Convert all incident drones to old format (for multi-drone support)
  const oldAvailableDrones: OldDrone[] = incidentDrones.map(d => ({
    id: d.id,
    stationId: d.hubId,
    position: d.position,
    status: 'AT_INCIDENT' as any,
    battery: d.health.battery,
    targetIncidentId: d.activeMissionId,
  }));

  // Handle switching between drones
  const handleDroneSwitch = (droneId: string) => {
    const drone = getDroneById(droneId);
    if (drone) {
      setSelectedDrone(drone);
    }
  };

  // Welcome toast
  useEffect(() => {
    toast.success(`Welcome back, ${user?.name}!`, {
      icon: '👋',
      duration: 3000,
    });
  }, [user]);

  // Monitor new incidents
  useEffect(() => {
    if (incidents.length > 0) {
      const latestIncident = incidents[incidents.length - 1];
      if (Date.now() - latestIncident.timestamp < 2000) {
        toast.error(`New ${latestIncident.severity} ${latestIncident.type} incident!`, {
          duration: 5000,
          icon: '🚨',
        });
      }
    }
  }, [incidents.length]);

  const handleExportReport = () => {
    if (!selectedMission || !selectedIncident) {
      toast.error('No mission selected');
      return;
    }

    if (!hasPermission(Permissions.EXPORT_REPORT)) {
      toast.error('No permission to export reports');
      return;
    }

    try {
      const missionSnapshots = snapshots.filter(s => s.missionId === selectedMission.id);
      evidenceExporter.downloadPDF(
        selectedMission,
        selectedIncident,
        selectedMission.timeline,
        missionSnapshots
      );
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to export report');
    }
  };

  return (
    <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden">
      {/* Top bar */}
      <div className="absolute top-0 right-0 z-50 p-4 flex items-center space-x-4">
        <div className="bg-gray-800 rounded-lg px-4 py-2 flex items-center space-x-3 border border-gray-700">
          <User className="w-4 h-4 text-blue-400" />
          <div>
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.role}</p>
          </div>
        </div>

        {selectedMission && (
          <>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="bg-gray-800 hover:bg-gray-700 rounded-lg px-4 py-2 flex items-center space-x-2 border border-gray-700 transition-colors"
            >
              <Activity className="w-4 h-4" />
              <span className="text-sm">Timeline</span>
            </button>

            {hasPermission(Permissions.EXPORT_REPORT) && (
              <button
                onClick={handleExportReport}
                className="bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 flex items-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm">Export PDF</span>
              </button>
            )}
          </>
        )}

        <button
          onClick={logout}
          className="bg-red-600 hover:bg-red-700 rounded-lg px-4 py-2 flex items-center space-x-2 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm">Logout</span>
        </button>
      </div>

      {/* Sidebar / Dashboard */}
      <div className="w-80 h-full z-10 shadow-xl bg-gray-800 border-r border-gray-700 flex flex-col">
        <EnhancedDashboard onDroneSelect={setSelectedDrone} />
      </div>

      {/* Map Area */}
      <div className="flex-1 relative h-full">
        <GameMap />

        {/* Live Feed */}
        {oldDrone && oldIncident && (
          <LiveFeed
            drone={oldDrone}
            incident={oldIncident}
            availableDrones={oldAvailableDrones.length > 0 ? oldAvailableDrones : undefined}
            onDroneSwitch={handleDroneSwitch}
            onClose={() => setSelectedDrone(null)}
          />
        )}
      </div>

      {/* Mission Timeline Sidebar */}
      {showTimeline && selectedMission && (
        <div className="w-96 h-full bg-gray-800 border-l border-gray-700 shadow-xl z-20 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">Mission Timeline</h2>
              <p className="text-xs text-gray-400">Mission ID: {selectedMission.id}</p>
            </div>
            <button
              onClick={() => setShowTimeline(false)}
              className="text-gray-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <MissionTimeline events={selectedMission.timeline} />
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          className: 'bg-gray-800 text-white border border-gray-700',
          duration: 4000,
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
};

function App() {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return <AppContent />;
}

export default App;
