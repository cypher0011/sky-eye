import { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import DroneModel from './DroneModel';

// Animated moving cars
const MovingCars = () => {
    const carsRef = useRef<THREE.Group>(null);

    const cars = useMemo(() => {
        const carArray = [];
        const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#ffffff', '#1a1a1a'];

        for (let i = 0; i < 30; i++) {
            const isVertical = Math.random() > 0.5;
            const streetIndex = Math.floor(Math.random() * 5) - 2;
            const pos = (Math.random() - 0.5) * 80;
            const speed = 0.02 + Math.random() * 0.03;
            const direction = Math.random() > 0.5 ? 1 : -1;

            carArray.push({
                position: isVertical
                    ? new THREE.Vector3(streetIndex * 20 + (direction > 0 ? 1 : -1), 0.3, pos)
                    : new THREE.Vector3(pos, 0.3, streetIndex * 20 + (direction > 0 ? 1 : -1)),
                rotation: isVertical ? (direction > 0 ? 0 : Math.PI) : (direction > 0 ? Math.PI / 2 : -Math.PI / 2),
                color: colors[Math.floor(Math.random() * colors.length)],
                speed: speed * direction,
                isVertical,
                hasHeadlights: Math.random() > 0.3
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
                if (carGroup.position.z > 50) carGroup.position.z = -50;
                if (carGroup.position.z < -50) carGroup.position.z = 50;
            } else {
                carGroup.position.x += car.speed;
                if (carGroup.position.x > 50) carGroup.position.x = -50;
                if (carGroup.position.x < -50) carGroup.position.x = 50;
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
                    {/* Headlights */}
                    {car.hasHeadlights && (
                        <>
                            <pointLight position={[0.5, 0.2, 1.5]} intensity={0.5} distance={8} color="#ffffcc" />
                            <pointLight position={[-0.5, 0.2, 1.5]} intensity={0.5} distance={8} color="#ffffcc" />
                            {/* Tail lights */}
                            <pointLight position={[0.5, 0.2, -1.5]} intensity={0.3} distance={3} color="#ff0000" />
                            <pointLight position={[-0.5, 0.2, -1.5]} intensity={0.3} distance={3} color="#ff0000" />
                        </>
                    )}
                </group>
            ))}
        </group>
    );
};

// Street lights
const StreetLights = () => {
    const lights = useMemo(() => {
        const lightArray = [];
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                lightArray.push({
                    position: [x * 20 + 3, 4, z * 20 + 3],
                    flickerSpeed: 0.5 + Math.random() * 2
                });
                lightArray.push({
                    position: [x * 20 - 3, 4, z * 20 - 3],
                    flickerSpeed: 0.5 + Math.random() * 2
                });
            }
        }
        return lightArray;
    }, []);

    return (
        <group>
            {lights.map((light, i) => (
                <group key={i} position={light.position as [number, number, number]}>
                    {/* Pole */}
                    <mesh position={[0, -2, 0]}>
                        <cylinderGeometry args={[0.05, 0.05, 4, 8]} />
                        <meshStandardMaterial color="#333333" />
                    </mesh>
                    {/* Light fixture */}
                    <mesh>
                        <sphereGeometry args={[0.15, 8, 8]} />
                        <meshBasicMaterial color="#ffaa44" />
                    </mesh>
                    <pointLight intensity={0.8} distance={15} color="#ffaa44" decay={2} />
                </group>
            ))}
        </group>
    );
};

// Incident Marker - Pulsing red sphere at ground level
const IncidentMarker = () => {
    const meshRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    useFrame(({ clock }) => {
        if (meshRef.current) {
            const scale = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.3;
            meshRef.current.scale.setScalar(scale);
        }
        if (ringRef.current) {
            ringRef.current.rotation.z += 0.02;
            const scale = 1 + Math.sin(clock.getElapsedTime() * 2) * 0.5;
            ringRef.current.scale.setScalar(scale);
        }
    });

    return (
        <group position={[0, 0.5, 0]}>
            {/* Pulsing sphere */}
            <mesh ref={meshRef}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
            </mesh>
            {/* Expanding ring */}
            <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1, 1.2, 32]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
            {/* Vertical beam */}
            <mesh position={[0, 10, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 20, 8]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.3} />
            </mesh>
        </group>
    );
};

// Building with animated windows
const BuildingWithWindows = ({ position, size, color }: { position: [number, number, number]; size: [number, number, number]; color: string }) => {
    const windowsRef = useRef<THREE.Group>(null);
    const [windowStates] = useState(() => {
        // Generate random window states for flickering
        const states: boolean[] = [];
        const windowCount = Math.floor(size[1] / 2) * 4;
        for (let i = 0; i < windowCount; i++) {
            states.push(Math.random() > 0.4);
        }
        return states;
    });

    useFrame(({ clock }) => {
        if (!windowsRef.current) return;
        // Randomly flicker some windows
        windowsRef.current.children.forEach((window, i) => {
            const material = (window as THREE.Mesh).material as THREE.MeshBasicMaterial;
            if (windowStates[i]) {
                const flicker = Math.sin(clock.getElapsedTime() * (0.5 + i * 0.1) + i) > 0.9;
                material.opacity = flicker ? 0.3 : 0.8;
            }
        });
    });

    const windows = useMemo(() => {
        const windowArray = [];
        const floors = Math.floor(size[1] / 2);
        for (let floor = 0; floor < floors; floor++) {
            for (let side = 0; side < 4; side++) {
                const y = position[1] - size[1] / 2 + floor * 2 + 1.5;
                let wx = position[0];
                let wz = position[2];
                let rx = 0, ry = 0;

                if (side === 0) { wz += size[2] / 2 + 0.01; }
                else if (side === 1) { wz -= size[2] / 2 + 0.01; ry = Math.PI; }
                else if (side === 2) { wx += size[0] / 2 + 0.01; ry = Math.PI / 2; }
                else { wx -= size[0] / 2 + 0.01; ry = -Math.PI / 2; }

                windowArray.push({ position: [wx, y, wz], rotation: [rx, ry, 0] });
            }
        }
        return windowArray;
    }, [position, size]);

    return (
        <group>
            <mesh position={position} castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color={color} />
            </mesh>
            <group ref={windowsRef}>
                {windows.map((win, i) => (
                    <mesh key={i} position={win.position as [number, number, number]} rotation={win.rotation as [number, number, number]}>
                        <planeGeometry args={[0.8, 1]} />
                        <meshBasicMaterial
                            color={windowStates[i] ? "#ffeeaa" : "#111111"}
                            transparent
                            opacity={windowStates[i] ? 0.8 : 0.3}
                        />
                    </mesh>
                ))}
            </group>
        </group>
    );
};

// Procedural Buildings with windows
const Buildings = () => {
    const buildings = useMemo(() => {
        const buildingArray = [];

        // Create city blocks
        for (let blockX = -2; blockX <= 2; blockX++) {
            for (let blockZ = -2; blockZ <= 2; blockZ++) {
                // Skip center block for incident
                if (blockX === 0 && blockZ === 0) continue;

                // Buildings per block
                for (let i = 0; i < 4; i++) {
                    const height = 5 + Math.random() * 25;
                    const width = 3 + Math.random() * 3;
                    const depth = 3 + Math.random() * 3;

                    const offsetX = (i % 2) * 8 - 4;
                    const offsetZ = Math.floor(i / 2) * 8 - 4;

                    const x = blockX * 20 + offsetX;
                    const z = blockZ * 20 + offsetZ;

                    const colors = ['#f5f5f5', '#e8e8e8', '#d4a574', '#c9b896', '#b8a07a', '#f0e6d3'];
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
                <BuildingWithWindows
                    key={i}
                    position={building.position}
                    size={building.size}
                    color={building.color}
                />
            ))}
        </group>
    );
};

// Streets grid
const Streets = () => {
    return (
        <group>
            {/* Main streets */}
            {[-2, -1, 0, 1, 2].map(i => (
                <group key={`street-${i}`}>
                    {/* Vertical street */}
                    <mesh position={[i * 20, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[6, 100]} />
                        <meshStandardMaterial color="#1a1a1a" />
                    </mesh>
                    {/* Horizontal street */}
                    <mesh position={[0, 0.01, i * 20]} rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[100, 6]} />
                        <meshStandardMaterial color="#1a1a1a" />
                    </mesh>
                </group>
            ))}
            {/* Street markings */}
            {[-2, -1, 0, 1, 2].map(i => (
                <mesh key={`marking-${i}`} position={[i * 20, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[0.2, 100]} />
                    <meshStandardMaterial color="#ffff00" />
                </mesh>
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
            // Prevent space from scrolling page
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

        // Smoother flight physics
        const acceleration = 15 * delta;
        const rotAcceleration = 3 * delta;
        const maxSpeed = 0.5;
        const maxRotSpeed = 0.05;

        // Acceleration-based movement
        if (keys.current['KeyW']) velocity.current.z = Math.max(velocity.current.z - acceleration, -maxSpeed);
        if (keys.current['KeyS']) velocity.current.z = Math.min(velocity.current.z + acceleration, maxSpeed);
        if (keys.current['KeyA']) rotationVelocity.current = Math.min(rotationVelocity.current + rotAcceleration, maxRotSpeed);
        if (keys.current['KeyD']) rotationVelocity.current = Math.max(rotationVelocity.current - rotAcceleration, -maxRotSpeed);
        if (keys.current['Space']) velocity.current.y = Math.min(velocity.current.y + acceleration, maxSpeed);
        if (keys.current['ShiftLeft']) velocity.current.y = Math.max(velocity.current.y - acceleration, -maxSpeed);
        // Strafe controls
        if (keys.current['KeyQ']) velocity.current.x = Math.max(velocity.current.x - acceleration, -maxSpeed * 0.5);
        if (keys.current['KeyE']) velocity.current.x = Math.min(velocity.current.x + acceleration, maxSpeed * 0.5);

        // Smooth dampening
        velocity.current.multiplyScalar(0.92);
        rotationVelocity.current *= 0.9;

        // Apply rotation
        droneRef.current.rotation.y += rotationVelocity.current;

        // Apply velocity relative to rotation
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneRef.current.rotation.y);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneRef.current.rotation.y);

        droneRef.current.position.add(forward.multiplyScalar(velocity.current.z));
        droneRef.current.position.add(right.multiplyScalar(velocity.current.x));
        droneRef.current.position.y += velocity.current.y;

        // Keep above ground
        droneRef.current.position.y = Math.max(droneRef.current.position.y, 1);

        // Smooth tilt based on velocity for realistic feel
        const targetTiltX = velocity.current.z * 0.3;
        const targetTiltZ = -velocity.current.x * 0.3;
        tilt.current.x += (targetTiltX - tilt.current.x) * 0.1;
        tilt.current.z += (targetTiltZ - tilt.current.z) * 0.1;
        droneRef.current.rotation.x = tilt.current.x;
        droneRef.current.rotation.z = tilt.current.z;

        // Smooth camera follow
        if (cameraRef.current) {
            const cameraDistance = 6;
            const cameraHeight = 3;
            const offset = new THREE.Vector3(0, cameraHeight, cameraDistance).applyAxisAngle(new THREE.Vector3(0, 1, 0), droneRef.current.rotation.y);
            const targetPos = droneRef.current.position.clone().add(offset);
            cameraRef.current.position.lerp(targetPos, 0.05);

            // Look slightly ahead of drone
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

const CityScene = ({ thermalMode }: { thermalMode: boolean }) => {
    return (
        <Canvas shadows camera={{ fov: 60 }}>
            {/* Morning sky gradient */}
            <color attach="background" args={[thermalMode ? '#1a3a2a' : '#87CEEB']} />
            <fog attach="fog" args={[thermalMode ? '#2a4a3a' : '#b0d4e8', 50, 200]} />

            {/* Morning ambient - soft warm light */}
            <ambientLight intensity={0.6} color="#fff5e6" />

            {/* Sun - warm morning light from east */}
            <directionalLight
                position={[80, 40, 30]}
                intensity={1.2}
                color="#ffedd5"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
            />

            {/* Secondary fill light */}
            <directionalLight
                position={[-30, 20, -30]}
                intensity={0.3}
                color="#e6f0ff"
            />

            {/* Hemisphere light for sky/ground color */}
            <hemisphereLight args={['#87CEEB', '#8B7355', 0.4]} />

            {/* Environment */}
            <group>
                {/* Ground - morning grass/earth tone */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                    <planeGeometry args={[200, 200]} />
                    <meshStandardMaterial color="#4a5a3a" />
                </mesh>

                {/* City elements */}
                <Streets />
                <Buildings />
                <StreetLights />
                <MovingCars />
                <IncidentMarker />
            </group>

            {/* Drone controller */}
            <FlightController />
        </Canvas>
    );
};

export default CityScene;
