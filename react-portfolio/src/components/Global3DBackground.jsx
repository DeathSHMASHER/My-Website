import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Float, Environment, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import useIsMobile from '../hooks/useIsMobile';

// Shared global mouse state so all components can read it
const globalMouse = { x: 0, y: 0 };

// Set up once at module level
if (typeof window !== 'undefined') {
    window.addEventListener('mousemove', (e) => {
        globalMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        globalMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
}

const Orb = ({ position, color, speed, scale }) => {
    const ref = useRef();
    useFrame((state) => {
        const t = state.clock.getElapsedTime() * speed;
        ref.current.position.y = position[1] + Math.sin(t) * 1.5;
        ref.current.position.x = position[0] + Math.cos(t) * 1.5;
    });
    return (
        <Sphere args={[1, 64, 64]} position={position} scale={scale} ref={ref}>
            <meshBasicMaterial color={color} transparent opacity={0.33} />
        </Sphere>
    );
};

// Controls the liquid glass shape and makes it follow the cursor
const LiquidGlassShape = () => {
    const mesh = useRef();
    const { viewport } = useThree();

    // Smoothed position to interpolate toward
    const smoothPos = useRef(new THREE.Vector3(0, 0, 0));

    useFrame((state, delta) => {
        if (!mesh.current) return;

        // Rotation animation - gentle continuous spin
        mesh.current.rotation.x += delta * 0.15;
        mesh.current.rotation.y += delta * 0.2;

        // Convert global mouse to world coordinates
        const mx = (globalMouse.x * viewport.width) / 2;
        const my = (globalMouse.y * viewport.height) / 2;

        // Two-stage smooth tracking:
        // 1. Target position updates INSTANTLY to the cursor (no delay on direction)
        // 2. But the mesh LERPS smoothly toward it (buttery smooth, no jank)
        const targetX = mx * 0.29;
        const targetY = my * 0.29;

        // Use delta-based lerp for frame-rate independent smoothing
        const lerpFactor = (1 - Math.pow(0.02, delta)) * 0.29;

        smoothPos.current.x += (targetX - smoothPos.current.x) * lerpFactor;
        smoothPos.current.y += (targetY - smoothPos.current.y) * lerpFactor;

        mesh.current.position.x = smoothPos.current.x;
        mesh.current.position.y = smoothPos.current.y;

        // Also smoothly rotate based on scroll
        const scrollRotation = window.scrollY * 0.0016;
        mesh.current.rotation.z += (scrollRotation - mesh.current.rotation.z) * 0.05 + (Math.sin(state.clock.elapsedTime * 0.5) * 0.03);
    });

    return (
        <Float floatIntensity={1} speed={2} rotationIntensity={0.5}>
            <mesh ref={mesh} scale={2.5}>
                <torusKnotGeometry args={[1, 0.4, 128, 64]} />
                <MeshTransmissionMaterial
                    backside
                    samples={2}
                    resolution={256}
                    thickness={1.5}
                    roughness={0.1}
                    transmission={1}
                    ior={1.5}
                    chromaticAberration={0.1}
                    anisotropy={0.5}
                    distortion={0.5}
                    distortionScale={0.5}
                    temporalDistortion={0.1}
                    color="#ffffff"
                />
            </mesh>
        </Float>
    );
};

const Global3DBackground = () => {
    const isMobile = useIsMobile(768);

    if (isMobile) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none', opacity: 1 }}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                eventSource={document.body}
            >
                <ambientLight intensity={1} />
                <directionalLight position={[10, 10, 10]} intensity={2} />
                <Environment preset="city" />

                {/* Colorful Orbs */}
                <Orb position={[-5, 3, -6]} color="#7B73FF" speed={0.4} scale={5} />
                <Orb position={[5, -3, -8]} color="#00D4FF" speed={0.2} scale={4} />
                <Orb position={[0, -5, -5]} color="#FF6CAB" speed={0.3} scale={6} />
                <Orb position={[4, 4, -7]} color="#7B73FF" speed={0.25} scale={4} />

                {/* Liquid Glass Object */}
                <LiquidGlassShape />
            </Canvas>
        </div>
    );
};

export default Global3DBackground;
