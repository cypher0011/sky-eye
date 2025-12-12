import { useRef, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import DroneModel from './DroneModel';
import DroneCamera, { CameraMode } from './DroneCamera';

// Riyadh coordinates - Updated to specific location
const RIYADH_CENTER = {
  lat: 24.836869691774403,
  lng: 46.74255175016113
};

// Convert lat/lng to tile coordinates
const latLngToTile = (lat: number, lng: number, zoom: number) => {
  const x = Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
  const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
  return { x, y, zoom };
};

// Single terrain tile component
const TerrainTile = ({
  tileX,
  tileY,
  zoom,
  offsetX,
  offsetZ,
  mapboxToken
}: {
  tileX: number;
  tileY: number;
  zoom: number;
  offsetX: number;
  offsetZ: number;
  mapboxToken: string;
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [heightMap, setHeightMap] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    const textureLoader = new THREE.TextureLoader();

    // Load satellite texture (NO LABELS - pure satellite) - standard resolution for reliability
    const tileUrl = `https://api.mapbox.com/v4/mapbox.satellite/${zoom}/${tileX}/${tileY}.jpg?access_token=${mapboxToken}`;

    console.log('Loading tile:', tileUrl);

    textureLoader.load(
      tileUrl,
      (loadedTexture) => {
        loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
        loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.magFilter = THREE.LinearFilter;
        loadedTexture.anisotropy = 16;
        setTexture(loadedTexture);
        console.log('Tile loaded successfully:', tileX, tileY);
      },
      undefined,
      (error) => {
        console.error('Error loading tile texture:', tileX, tileY, error);
        console.error('URL:', tileUrl);
      }
    );

    // Load terrain elevation - standard resolution
    const terrainUrl = `https://api.mapbox.com/v4/mapbox.terrain-rgb/${zoom}/${tileX}/${tileY}.png?access_token=${mapboxToken}`;

    textureLoader.load(
      terrainUrl,
      (loadedHeightMap) => {
        loadedHeightMap.wrapS = THREE.ClampToEdgeWrapping;
        loadedHeightMap.wrapT = THREE.ClampToEdgeWrapping;
        setHeightMap(loadedHeightMap);
      },
      undefined,
      () => console.warn('Terrain elevation not available for tile:', tileX, tileY)
    );
  }, [tileX, tileY, zoom, mapboxToken]);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[offsetX, 0, offsetZ]} receiveShadow castShadow>
      <planeGeometry args={[200, 200, 200, 200]} /> {/* Good resolution */}
      {texture ? (
        <meshStandardMaterial
          map={texture}
          displacementMap={heightMap}
          displacementScale={25} // Balanced terrain
          roughness={0.9}
          metalness={0.0}
          normalScale={[1, 1]}
        />
      ) : (
        <meshStandardMaterial color="#8B7355" roughness={0.9} />
      )}
    </mesh>
  );
};

// Enhanced 3D Satellite Terrain with multiple tiles
const SatelliteTerrain = () => {
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';
  const zoom = 16; // Balanced zoom level
  const centerTile = latLngToTile(RIYADH_CENTER.lat, RIYADH_CENTER.lng, zoom);

  // Create 3x3 grid of tiles
  const tiles = [];
  const tileSize = 200; // Standard tile size

  for (let dx = -1; dx <= 1; dx++) {
    for (let dz = -1; dz <= 1; dz++) {
      tiles.push({
        tileX: centerTile.x + dx,
        tileY: centerTile.y + dz,
        offsetX: dx * tileSize,
        offsetZ: dz * tileSize,
        key: `${dx}-${dz}`
      });
    }
  }

  return (
    <group>
      {tiles.map(tile => (
        <TerrainTile
          key={tile.key}
          tileX={tile.tileX}
          tileY={tile.tileY}
          zoom={zoom}
          offsetX={tile.offsetX}
          offsetZ={tile.offsetZ}
          mapboxToken={mapboxToken}
        />
      ))}
    </group>
  );
};

// Drone controller with flight physics
const DroneController = ({
  droneRef,
  onPositionUpdate,
  onVelocityUpdate,
  onHeadingUpdate,
}: {
  droneRef: React.RefObject<THREE.Group>;
  onPositionUpdate?: (position: [number, number, number]) => void;
  onVelocityUpdate?: (velocity: number) => void;
  onHeadingUpdate?: (heading: number) => void;
}) => {
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const rotationVelocity = useRef(0);
  const tilt = useRef({ x: 0, z: 0 });
  const keys = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (e.code === 'Space') e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => (keys.current[e.code] = false);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    if (!droneRef.current) return;

    // FAST Flight physics - manual control only!
    const acceleration = 30 * delta; // Fast acceleration!
    const rotAcceleration = 3 * delta;
    const maxSpeed = .5; // Fast max speed!
    const maxRotSpeed = 0.08; // Faster rotation

    // Manual controls ONLY - no autonomous movement
    if (keys.current['KeyW']) velocity.current.z = Math.max(velocity.current.z - acceleration, -maxSpeed);
    if (keys.current['KeyS']) velocity.current.z = Math.min(velocity.current.z + acceleration, maxSpeed);
    if (keys.current['KeyA']) rotationVelocity.current = Math.min(rotationVelocity.current + rotAcceleration, maxRotSpeed);
    if (keys.current['KeyD']) rotationVelocity.current = Math.max(rotationVelocity.current - rotAcceleration, -maxRotSpeed);
    if (keys.current['Space']) velocity.current.y = Math.min(velocity.current.y + acceleration, maxSpeed);
    if (keys.current['ShiftLeft']) velocity.current.y = Math.max(velocity.current.y - acceleration, -maxSpeed);
    if (keys.current['KeyQ']) velocity.current.x = Math.max(velocity.current.x - acceleration, -maxSpeed * 0.5);
    if (keys.current['KeyE']) velocity.current.x = Math.min(velocity.current.x + acceleration, maxSpeed * 0.5);

    // Dampening
    velocity.current.multiplyScalar(0.96);
    rotationVelocity.current *= 0.9;

    // Apply rotation
    droneRef.current.rotation.y += rotationVelocity.current;

    // Apply movement
    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneRef.current.rotation.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneRef.current.rotation.y);

    droneRef.current.position.add(forward.multiplyScalar(velocity.current.z));
    droneRef.current.position.add(right.multiplyScalar(velocity.current.x));
    droneRef.current.position.y += velocity.current.y;

    // Keep above ground (higher minimum for better terrain view)
    droneRef.current.position.y = Math.max(droneRef.current.position.y, 10);

    // Tilt for realism
    const targetTiltX = velocity.current.z * 0.3;
    const targetTiltZ = -velocity.current.x * 0.3;
    tilt.current.x += (targetTiltX - tilt.current.x) * 0.1;
    tilt.current.z += (targetTiltZ - tilt.current.z) * 0.1;
    droneRef.current.rotation.x = tilt.current.x;
    droneRef.current.rotation.z = tilt.current.z;

    // Update position
    if (onPositionUpdate) {
      onPositionUpdate([
        droneRef.current.position.x,
        droneRef.current.position.y,
        droneRef.current.position.z,
      ]);
    }

    // Update velocity (speed in m/s)
    if (onVelocityUpdate) {
      const speed = velocity.current.length() * 60; // Convert to m/s
      onVelocityUpdate(speed);
    }

    // Update heading (0-360 degrees)
    if (onHeadingUpdate) {
      let heading = (droneRef.current.rotation.y * 180 / Math.PI) % 360;
      if (heading < 0) heading += 360;
      onHeadingUpdate(heading);
    }
  });

  return null;
};

// Mini-map overlay (2D top-down view)
const MiniMap = ({ dronePosition }: { dronePosition: [number, number, number] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, 150, 150);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 150; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 150);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(150, i);
      ctx.stroke();
    }

    // Draw drone position
    const scale = 0.75;
    const centerX = 75 + dronePosition[0] * scale;
    const centerY = 75 + dronePosition[2] * scale;

    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fill();

    // Draw center marker
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, 75);
    ctx.lineTo(80, 75);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(75, 70);
    ctx.lineTo(75, 80);
    ctx.stroke();
  }, [dronePosition]);

  return (
    <canvas
      ref={canvasRef}
      width={150}
      height={150}
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        border: '2px solid rgba(59, 130, 246, 0.5)',
        borderRadius: '8px',
        zIndex: 10
      }}
    />
  );
};

// Main Satellite Scene Component
const SatelliteScene = ({
  thermalMode = false,
  cameraMode = 'third-person',
}: {
  thermalMode?: boolean;
  cameraMode?: CameraMode;
}) => {
  const droneRef = useRef<THREE.Group>(null);
  const [dronePosition, setDronePosition] = useState<[number, number, number]>([0, 40, 0]);
  const [velocity, setVelocity] = useState(0);
  const [heading, setHeading] = useState(0);

  // Calculate dynamic lat/lng based on drone position
  // Scale: ~111km per degree latitude, ~96km per degree longitude at Riyadh's latitude
  const metersPerDegreeLat = 111000;
  const metersPerDegreeLng = 96000;

  const currentLat = RIYADH_CENTER.lat + (dronePosition[2] / metersPerDegreeLat);
  const currentLng = RIYADH_CENTER.lng + (dronePosition[0] / metersPerDegreeLng);

  // Convert heading to cardinal direction
  const getCardinalDirection = (deg: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(deg / 45) % 8;
    return directions[index];
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas shadows camera={{ fov: 60 }} gl={{ antialias: true, alpha: false }}>
        {/* Sky with gradient */}
        <color attach="background" args={[thermalMode ? '#1a3a2a' : '#135C9E']} />
        <fog attach="fog" args={[thermalMode ? '#2a4a3a' : '#a8c8e0', 100, 600]} />

        {/* Enhanced Lighting for realism */}
        <ambientLight intensity={0.5} color="#ffffff" />

        {/* Main sun - strong directional light */}
        <directionalLight
          position={[100, 80, 50]}
          intensity={1.8}
          color="#fffaf0"
          castShadow
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-camera-far={500}
          shadow-camera-left={-200}
          shadow-camera-right={200}
          shadow-camera-top={200}
          shadow-camera-bottom={-200}
          shadow-bias={-0.0001}
        />

        {/* Fill light - softer from opposite side */}
        <directionalLight position={[-50, 40, -30]} intensity={0.4} color="#e8f4ff" />

        {/* Sky/ground hemisphere light for atmospheric effect */}
        <hemisphereLight args={['#87CEEB', '#d4a574', 0.6]} />

        {/* Subtle rim light for depth */}
        <directionalLight position={[0, 20, -100]} intensity={0.3} color="#ffeedd" />

        {/* Satellite Terrain */}
        <SatelliteTerrain />

        {/* Atmospheric Effects - REMOVED clouds, sun, birds */}

        {/* Drone Model - start higher for better view */}
        <DroneModel ref={droneRef} position={[0, 40, 0]} />

        {/* Drone Controller */}
        <DroneController
          droneRef={droneRef}
          onPositionUpdate={setDronePosition}
          onVelocityUpdate={setVelocity}
          onHeadingUpdate={setHeading}
        />

        {/* Camera System - No frame capture */}
        <DroneCamera droneRef={droneRef} mode={cameraMode} />
      </Canvas>

      {/* Mini-map overlay */}
      <MiniMap dronePosition={dronePosition} />

      {/* Enhanced Telemetry overlay with dynamic coordinates */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.85)',
        padding: '16px',
        borderRadius: '12px',
        border: '2px solid rgba(0, 255, 0, 0.3)',
        color: '#00ff00',
        fontFamily: 'monospace',
        fontSize: '13px',
        zIndex: 10,
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', color: '#00ff88' }}>
          ⬡ FLIGHT TELEMETRY
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '6px' }}>
          <div style={{ color: '#888' }}>LAT:</div>
          <div>{currentLat.toFixed(6)}°</div>

          <div style={{ color: '#888' }}>LNG:</div>
          <div>{currentLng.toFixed(6)}°</div>

          <div style={{ color: '#888' }}>ALT:</div>
          <div>{dronePosition[1].toFixed(1)}m AGL</div>

          <div style={{ color: '#888' }}>SPEED:</div>
          <div>{velocity.toFixed(1)} m/s</div>

          <div style={{ color: '#888' }}>HEADING:</div>
          <div>{heading.toFixed(0)}° {getCardinalDirection(heading)}</div>

          <div style={{ color: '#888' }}>LOCATION:</div>
          <div>RIYADH, SA</div>
        </div>
      </div>

      {/* Compass HUD */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '220px',
        background: 'rgba(0, 0, 0, 0.85)',
        padding: '12px',
        borderRadius: '50%',
        border: '2px solid rgba(0, 255, 0, 0.3)',
        width: '80px',
        height: '80px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#00ff88',
          fontFamily: 'monospace',
        }}>
          {getCardinalDirection(heading)}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#888',
          fontFamily: 'monospace',
          marginTop: '4px',
        }}>
          {heading.toFixed(0)}°
        </div>
      </div>

      {/* Speed Indicator */}
      <div style={{
        position: 'absolute',
        top: '110px',
        right: '220px',
        background: 'rgba(0, 0, 0, 0.85)',
        padding: '12px 16px',
        borderRadius: '12px',
        border: '2px solid rgba(0, 255, 0, 0.3)',
        zIndex: 10,
        boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{
          fontSize: '11px',
          color: '#888',
          fontFamily: 'monospace',
          marginBottom: '4px',
        }}>
          GROUND SPEED
        </div>
        <div style={{
          fontSize: '20px',
          fontWeight: 'bold',
          color: velocity > 15 ? '#ff8800' : '#00ff88',
          fontFamily: 'monospace',
        }}>
          {velocity.toFixed(1)}
        </div>
        <div style={{
          fontSize: '11px',
          color: '#888',
          fontFamily: 'monospace',
        }}>
          m/s
        </div>
      </div>

      {/* GPS Status Indicator */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(16, 185, 129, 0.9)',
        padding: '8px 20px',
        borderRadius: '20px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
        fontWeight: 'bold',
        zIndex: 10,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#00ff00',
          animation: 'pulse 2s infinite',
          boxShadow: '0 0 8px #00ff00',
        }} />
        GPS LOCKED • 12 SATELLITES
      </div>

      {/* Controls info */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.7)',
        padding: '10px',
        borderRadius: '8px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '11px',
        zIndex: 10
      }}>
        <div>CONTROLS:</div>
        <div>W/S - Forward/Back</div>
        <div>A/D - Rotate</div>
        <div>Q/E - Strafe</div>
        <div>Space/Shift - Up/Down</div>
      </div>
    </div>
  );
};

export default SatelliteScene;
