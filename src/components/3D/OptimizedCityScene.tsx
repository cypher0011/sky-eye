/**
 * OPTIMIZED City Scene - Reduced lag, better performance
 */
import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import DroneModel from './DroneModel';

// Reduced number of cars for performance
const MovingCars = () => {
  const carsRef = useRef<THREE.Group>(null);

  const cars = useMemo(() => {
    const carArray = [];
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b'];

    // Reduced from 30 to 15 cars
    for (let i = 0; i < 15; i++) {
      const isVertical = Math.random() > 0.5;
      const streetIndex = Math.floor(Math.random() * 3) - 1; // Reduced streets
      const pos = (Math.random() - 0.5) * 60;
      const speed = 0.03 + Math.random() * 0.02;
      const direction = Math.random() > 0.5 ? 1 : -1;

      carArray.push({
        position: isVertical
          ? new THREE.Vector3(streetIndex * 20 + (direction > 0 ? 1 : -1), 0.3, pos)
          : new THREE.Vector3(pos, 0.3, streetIndex * 20 + (direction > 0 ? 1 : -1)),
        rotation: isVertical ? (direction > 0 ? 0 : Math.PI) : (direction > 0 ? Math.PI / 2 : -Math.PI / 2),
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: speed * direction,
        isVertical,
      });
    }
    return carArray;
  }, []);

  useFrame(() => {
    if (!carsRef.current) return;
    carsRef.current.children.forEach((carGroup, i) => {
      const car = cars[i];
      if (car.isVertical) {
        carGroup.position.z += car.speed;
        if (carGroup.position.z > 40) carGroup.position.z = -40;
        if (carGroup.position.z < -40) carGroup.position.z = 40;
      } else {
        carGroup.position.x += car.speed;
        if (carGroup.position.x > 40) carGroup.position.x = -40;
        if (carGroup.position.x < -40) carGroup.position.x = 40;
      }
    });
  });

  return (
    <group ref={carsRef}>
      {cars.map((car, i) => (
        <group key={i} position={car.position} rotation={[0, car.rotation, 0]}>
          <mesh>
            <boxGeometry args={[1.5, 0.5, 3]} />
            <meshStandardMaterial color={car.color} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Reduced street lights
const StreetLights = () => {
  const lights = useMemo(() => {
    const lightArray = [];
    // Reduced from 25 to 9 lights
    for (let x = -1; x <= 1; x++) {
      for (let z = -1; z <= 1; z++) {
        lightArray.push({ position: [x * 20, 4, z * 20] });
      }
    }
    return lightArray;
  }, []);

  return (
    <group>
      {lights.map((light, i) => (
        <group key={i} position={light.position as [number, number, number]}>
          <mesh position={[0, -2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 4, 6]} />
            <meshStandardMaterial color="#333333" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.15, 6, 6]} />
            <meshBasicMaterial color="#ffaa44" />
          </mesh>
          <pointLight intensity={0.6} distance={12} color="#ffaa44" decay={2} />
        </group>
      ))}
    </group>
  );
};

// Simplified incident marker
const IncidentMarker = () => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.2;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={[0, 0.5, 0]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
      </mesh>
      <mesh position={[0, 8, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 16, 6]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

// Simplified building
const SimpleBuilding = ({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) => {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
};

// Reduced buildings
const Buildings = () => {
  const buildings = useMemo(() => {
    const buildingArray = [];

    // Reduced from 40+ to 20 buildings
    for (let blockX = -1; blockX <= 1; blockX++) {
      for (let blockZ = -1; blockZ <= 1; blockZ++) {
        if (blockX === 0 && blockZ === 0) continue;

        for (let i = 0; i < 2; i++) {
          const height = 8 + Math.random() * 15;
          const width = 4 + Math.random() * 2;
          const depth = 4 + Math.random() * 2;

          const offsetX = (i % 2) * 10 - 5;
          const offsetZ = Math.floor(i / 2) * 10 - 5;

          const x = blockX * 20 + offsetX;
          const z = blockZ * 20 + offsetZ;

          const colors = ['#e8e8e8', '#d4a574', '#c9b896'];
          buildingArray.push({
            position: [x, height / 2, z] as [number, number, number],
            size: [width, height, depth] as [number, number, number],
            color: colors[Math.floor(Math.random() * colors.length)]
          });
        }
      }
    }
    return buildingArray;
  }, []);

  return (
    <group>
      {buildings.map((building, i) => (
        <SimpleBuilding
          key={i}
          position={building.position}
          size={building.size}
          color={building.color}
        />
      ))}
    </group>
  );
};

// Simplified streets
const Streets = () => {
  return (
    <group>
      {[-1, 0, 1].map(i => (
        <group key={`street-${i}`}>
          <mesh position={[i * 20, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6, 80]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0, 0.01, i * 20]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[80, 6]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const FlightController = () => {
  const droneRef = useRef<THREE.Group>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
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

    const acceleration = 15 * delta;
    const rotAcceleration = 3 * delta;
    const maxSpeed = 0.5;
    const maxRotSpeed = 0.05;

    // Controls
    if (keys.current['KeyW']) velocity.current.z = Math.max(velocity.current.z - acceleration, -maxSpeed);
    if (keys.current['KeyS']) velocity.current.z = Math.min(velocity.current.z + acceleration, maxSpeed);
    if (keys.current['KeyA']) rotationVelocity.current = Math.min(rotationVelocity.current + rotAcceleration, maxRotSpeed);
    if (keys.current['KeyD']) rotationVelocity.current = Math.max(rotationVelocity.current - rotAcceleration, -maxRotSpeed);
    if (keys.current['Space']) velocity.current.y = Math.min(velocity.current.y + acceleration, maxSpeed);
    if (keys.current['ShiftLeft']) velocity.current.y = Math.max(velocity.current.y - acceleration, -maxSpeed);

    // Dampening
    velocity.current.multiplyScalar(0.92);
    rotationVelocity.current *= 0.9;

    // Apply movement
    droneRef.current.rotation.y += rotationVelocity.current;

    const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneRef.current.rotation.y);
    droneRef.current.position.add(forward.multiplyScalar(velocity.current.z));
    droneRef.current.position.y += velocity.current.y;
    droneRef.current.position.y = Math.max(droneRef.current.position.y, 1);

    // Tilt
    const targetTiltX = velocity.current.z * 0.3;
    tilt.current.x += (targetTiltX - tilt.current.x) * 0.1;
    droneRef.current.rotation.x = tilt.current.x;

    // Camera follow
    if (cameraRef.current) {
      const offset = new THREE.Vector3(0, 3, 6).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneRef.current.rotation.y);
      const targetPos = droneRef.current.position.clone().add(offset);
      cameraRef.current.position.lerp(targetPos, 0.05);

      const lookTarget = droneRef.current.position.clone();
      lookTarget.y += 0.5;
      cameraRef.current.lookAt(lookTarget);
    }
  });

  return (
    <>
      <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 5, 10]} fov={70} />
      <DroneModel ref={droneRef} position={[0, 5, 0]} />
    </>
  );
};

const OptimizedCityScene = ({ thermalMode }: { thermalMode: boolean }) => {
  return (
    <Canvas shadows dpr={[1, 1.5]}> {/* Limit pixel ratio for performance */}
      <color attach="background" args={[thermalMode ? '#1a3a2a' : '#87CEEB']} />
      <fog attach="fog" args={[thermalMode ? '#2a4a3a' : '#b0d4e8', 40, 120]} /> {/* Reduced fog distance */}

      {/* Lighting - simplified */}
      <ambientLight intensity={0.6} color="#fff5e6" />
      <directionalLight
        position={[50, 30, 20]}
        intensity={1.0}
        color="#ffedd5"
        castShadow
        shadow-mapSize-width={1024} // Reduced from 2048
        shadow-mapSize-height={1024}
        shadow-camera-far={100}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
      />

      {/* Environment */}
      <group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[150, 150]} />
          <meshStandardMaterial color="#4a5a3a" />
        </mesh>

        <Streets />
        <Buildings />
        <StreetLights />
        <MovingCars />
        <IncidentMarker />
      </group>

      <FlightController />
    </Canvas>
  );
};

export default OptimizedCityScene;
