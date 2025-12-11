import React from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useSimulation } from '../../context/SimulationContext';
import * as L from 'leaflet';
import droneIconImg from '../../img/drone_test.png';
import stationIconImg from '../../img/dock_hub.png';

// Custom Icons
const droneIcon = new L.Icon({
    iconUrl: droneIconImg,
    iconSize: [40, 40], // Adjust size as needed
    iconAnchor: [20, 20],
    popupAnchor: [0, -20]
});

const stationIcon = new L.Icon({
    iconUrl: stationIconImg,
    iconSize: [50, 50], // Adjust size as needed
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
});

// Fix for default marker icon in React Leaflet (still good to keep for incidents if they don't have custom icons yet)
const fixLeafletIcon = () => {
    // @ts-ignore
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });
};

fixLeafletIcon();

const GameMap: React.FC = () => {
    const { stations, incidents, drones, calculateETA } = useSimulation();

    return (
        <MapContainer
            center={[24.7136, 46.6753]}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {/* Stations */}
            {stations.map(station => (
                <React.Fragment key={station.id}>
                    {/* Radar Effect */}
                    <Circle
                        center={station.position}
                        radius={station.coverageRadius}
                        pathOptions={{ color: 'transparent', fillColor: 'rgba(59, 130, 246, 0.2)', className: 'radar-effect' }}
                    />
                    {/* Coverage Area */}
                    <Circle
                        center={station.position}
                        radius={station.coverageRadius}
                        pathOptions={{ color: 'rgba(59, 130, 246, 0.5)', fillColor: 'rgba(59, 130, 246, 0.05)', weight: 1, dashArray: '4, 4' }}
                    />
                    <Marker position={station.position} icon={stationIcon}>
                        <Popup>{station.name}</Popup>
                    </Marker>
                </React.Fragment>
            ))}

            {/* Incidents */}
            {incidents.map(incident => (
                <Marker
                    key={incident.id}
                    position={incident.position}
                    icon={new L.DivIcon({
                        className: 'bg-transparent',
                        html: `<div class="relative flex items-center justify-center w-6 h-6">
                                 <div class="absolute w-full h-full bg-red-500 rounded-full animate-ping opacity-75"></div>
                                 <div class="relative w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-lg"></div>
                               </div>`,
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    })}
                >
                    <Popup>
                        <div className="text-center">
                            <strong className="text-red-600 uppercase">{incident.type}</strong><br />
                            <span className="text-xs text-gray-500">Severity: {incident.severity}</span>
                        </div>
                    </Popup>
                </Marker>
            ))}

            {/* Drones & Flight Paths */}
            {drones.map(drone => {
                const targetIncident = incidents.find(i => i.id === drone.targetIncidentId);
                const eta = targetIncident && drone.status === 'MOVING_TO_INCIDENT'
                    ? calculateETA(drone.position, targetIncident.position)
                    : null;

                return (
                    <React.Fragment key={drone.id}>
                        {/* Flight Path Line */}
                        {drone.status === 'MOVING_TO_INCIDENT' && targetIncident && (
                            <Polyline
                                positions={[drone.position, targetIncident.position]}
                                pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '5, 10', opacity: 0.6 }}
                            />
                        )}
                        {/* Return Path Line */}
                        {drone.status === 'RETURNING' && (
                            <Polyline
                                positions={[drone.position, stations.find(s => s.id === drone.stationId)?.position || [0, 0]]}
                                pathOptions={{ color: '#6b7280', weight: 2, dashArray: '5, 5', opacity: 0.4 }}
                            />
                        )}

                        <Marker position={drone.position} icon={droneIcon} opacity={0.9}>
                            {/* Show ETA tooltip for moving drones */}
                            {eta !== null && (
                                <Tooltip permanent direction="top" offset={[0, -20]} className="!bg-blue-600 !border-blue-700 !text-white !font-mono !text-xs !px-2 !py-1">
                                    ETA: {eta}s
                                </Tooltip>
                            )}
                            <Popup>
                                <div className="text-xs font-mono">
                                    <strong>DRONE ID:</strong> {drone.id}<br />
                                    <strong>BATTERY:</strong> {Math.round(drone.battery)}%<br />
                                    <strong>STATUS:</strong> {drone.status}
                                    {eta !== null && <><br /><strong>ETA:</strong> {eta}s</>}
                                </div>
                            </Popup>
                        </Marker>
                    </React.Fragment>
                );
            })}

        </MapContainer>
    );
};

export default GameMap;
