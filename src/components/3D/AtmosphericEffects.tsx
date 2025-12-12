import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Atmospheric haze/particles for realism
export const AtmosphericHaze = () => {
  const particlesRef = useRef<THREE.Points>(null);

  // Create dust particles
  const particleCount = 2000;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 400;
    positions[i * 3 + 1] = Math.random() * 50 + 5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400;

    velocities[i * 3] = (Math.random() - 0.5) * 0.1;
    velocities[i * 3 + 1] = Math.random() * 0.05;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1;
  }

  useFrame(() => {
    if (!particlesRef.current) return;

    const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      // Move particles
      positions[i * 3] += velocities[i * 3];
      positions[i * 3 + 1] += velocities[i * 3 + 1];
      positions[i * 3 + 2] += velocities[i * 3 + 2];

      // Reset if out of bounds
      if (positions[i * 3 + 1] > 100) {
        positions[i * 3 + 1] = 5;
      }
      if (Math.abs(positions[i * 3]) > 200 || Math.abs(positions[i * 3 + 2]) > 200) {
        positions[i * 3] = (Math.random() - 0.5) * 400;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 400;
      }
    }

    particlesRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        color="#ffffff"
        transparent
        opacity={0.2}
        sizeAttenuation={true}
        depthWrite={false}
      />
    </points>
  );
};

// Volumetric clouds
export const VolumetricClouds = () => {
  const cloudRefs = useRef<THREE.Mesh[]>([]);

  const clouds: Array<{
    position: [number, number, number];
    scale: number;
    speed: number;
  }> = [];
  for (let i = 0; i < 20; i++) {
    clouds.push({
      position: [
        (Math.random() - 0.5) * 600,
        60 + Math.random() * 40,
        (Math.random() - 0.5) * 600
      ],
      scale: 20 + Math.random() * 30,
      speed: 0.05 + Math.random() * 0.1
    });
  }

  useFrame((_, delta) => {
    cloudRefs.current.forEach((cloud, i) => {
      if (cloud) {
        cloud.position.x += clouds[i].speed * delta;
        if (cloud.position.x > 300) cloud.position.x = -300;
      }
    });
  });

  return (
    <group>
      {clouds.map((cloud, i) => (
        <mesh
          key={i}
          ref={(ref) => {
            if (ref) cloudRefs.current[i] = ref;
          }}
          position={cloud.position}
          scale={cloud.scale}
        >
          <sphereGeometry args={[1, 8, 8]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.3}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// Heat shimmer effect for realism
export const HeatShimmer = () => {
  return (
    <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[600, 600]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.05}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
};

// God rays / Sun shafts effect
export const GodRays = () => {
  const raysRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (raysRef.current) {
      raysRef.current.rotation.z = clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <group ref={raysRef} position={[100, 80, 50]}>
      {[...Array(8)].map((_, i) => (
        <mesh
          key={i}
          rotation={[0, 0, (i * Math.PI) / 4]}
          position={[0, 0, -50]}
        >
          <planeGeometry args={[1, 200]} />
          <meshBasicMaterial
            color="#fffef0"
            transparent
            opacity={0.15}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
    </group>
  );
};

// Birds flying in formation
export const Birds = () => {
  const birdsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (birdsRef.current) {
      birdsRef.current.position.x = Math.sin(clock.getElapsedTime() * 0.2) * 100;
      birdsRef.current.position.z = -100 + (clock.getElapsedTime() * 5) % 400;
    }
  });

  return (
    <group ref={birdsRef} position={[0, 60, 0]}>
      {[...Array(5)].map((_, i) => (
        <mesh
          key={i}
          position={[i * 3, Math.sin(i) * 2, i * 2]}
        >
          <sphereGeometry args={[0.3, 4, 4]} />
          <meshBasicMaterial color="#333333" />
        </mesh>
      ))}
    </group>
  );
};
