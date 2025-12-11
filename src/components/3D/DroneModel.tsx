import { useRef, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group } from 'three';

const DroneModel = forwardRef<Group, any>((props, ref) => {
    const rotor1 = useRef<Mesh>(null);
    const rotor2 = useRef<Mesh>(null);
    const rotor3 = useRef<Mesh>(null);
    const rotor4 = useRef<Mesh>(null);

    useFrame((_, delta) => {
        if (rotor1.current) rotor1.current.rotation.y += delta * 20;
        if (rotor2.current) rotor2.current.rotation.y -= delta * 20;
        if (rotor3.current) rotor3.current.rotation.y += delta * 20;
        if (rotor4.current) rotor4.current.rotation.y -= delta * 20;
    });

    return (
        <group ref={ref} {...props} dispose={null}>
            {/* Body - bright white/silver color */}
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1, 0.2, 0.5]} />
                <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[1, 0.2, 0.5]} />
                <meshStandardMaterial color="#e0e0e0" metalness={0.6} roughness={0.3} />
            </mesh>

            {/* Arms & Rotors */}
            {[
                [0.5, 0, 0.5],
                [-0.5, 0, 0.5],
                [0.5, 0, -0.5],
                [-0.5, 0, -0.5],
            ].map((pos, i) => (
                <group key={i} position={pos as [number, number, number]}>
                    {/* Motor - orange accent */}
                    <mesh position={[0, 0.1, 0]}>
                        <cylinderGeometry args={[0.1, 0.1, 0.2]} />
                        <meshStandardMaterial color="#ff6b35" metalness={0.5} roughness={0.4} />
                    </mesh>
                    {/* Propeller */}
                    <mesh
                        ref={i === 0 ? rotor1 : i === 1 ? rotor2 : i === 2 ? rotor3 : rotor4}
                        position={[0, 0.2, 0]}
                    >
                        <boxGeometry args={[0.8, 0.02, 0.05]} />
                        <meshStandardMaterial color="#ffffff" opacity={0.9} transparent />
                    </mesh>
                </group>
            ))}

            {/* Camera Gimbal - blue accent */}
            <mesh position={[0, -0.2, 0.2]}>
                <sphereGeometry args={[0.15]} />
                <meshStandardMaterial color="#3b82f6" metalness={0.4} roughness={0.3} />
            </mesh>

            {/* Navigation lights */}
            <pointLight position={[0.5, 0, 0.5]} intensity={0.5} distance={3} color="#00ff00" />
            <pointLight position={[-0.5, 0, 0.5]} intensity={0.5} distance={3} color="#ff0000" />
            <pointLight position={[0, -0.2, 0.2]} intensity={0.3} distance={2} color="#3b82f6" />
        </group>
    );
});

DroneModel.displayName = 'DroneModel';

export default DroneModel;
