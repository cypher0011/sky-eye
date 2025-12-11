import { useState, useEffect } from 'react';
import { SimulationProvider, useSimulation, Drone } from './context/SimulationContext';
import GameMap from './components/Map/GameMap';
import Dashboard from './components/UI/Dashboard';
import LiveFeed from './components/UI/LiveFeed';

const GameOverlay = () => {
  const { drones, incidents } = useSimulation();
  const [viewingDrone, setViewingDrone] = useState<Drone | null>(null);

  // Auto-open feed when a drone arrives at incident
  useEffect(() => {
    const arrivedDrone = drones.find(d => d.status === 'AT_INCIDENT');
    if (arrivedDrone && !viewingDrone) {
      setViewingDrone(arrivedDrone);
    }
  }, [drones, viewingDrone]);

  const handleCloseFeed = () => {
    setViewingDrone(null);
  };

  const activeIncident = viewingDrone?.targetIncidentId
    ? incidents.find(i => i.id === viewingDrone.targetIncidentId)
    : null;

  return (
    <>
      {viewingDrone && activeIncident && (
        <LiveFeed
          drone={viewingDrone}
          incident={activeIncident}
          onClose={handleCloseFeed}
        />
      )}
    </>
  );
};

const WeatherOverlay = () => {
  const { weather } = useSimulation();

  if (weather === 'CLEAR') return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[500] bg-blue-900/10 mix-blend-overlay">
      {/* Simple CSS rain effect could go here, for now just a color tint */}
      <div className="absolute inset-0 bg-[url('https://cdn.pixabay.com/animation/2023/06/25/21/55/21-55-24-323_512.gif')] opacity-20 bg-cover"></div>
    </div>
  );
};

function App() {
  return (
    <SimulationProvider>
      <div className="flex h-screen w-screen bg-gray-900 text-white overflow-hidden">
        {/* Sidebar / Dashboard */}
        <div className="w-80 h-full z-10 shadow-xl bg-gray-800 border-r border-gray-700 flex flex-col">
          <Dashboard />
        </div>

        {/* Map Area */}
        <div className="flex-1 relative h-full">
          <GameMap />
          <GameOverlay />
          <WeatherOverlay />
        </div>
      </div>
    </SimulationProvider>
  );
}

export default App;
