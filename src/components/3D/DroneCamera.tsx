import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

export type CameraMode = 'third-person' | 'fpv';

interface DroneCameraProps {
  droneRef: React.RefObject<THREE.Group>;
  mode?: CameraMode;
  onFrameCapture?: (dataUrl: string) => void;
}

const DroneCamera = ({ droneRef, mode = 'third-person', onFrameCapture }: DroneCameraProps) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { gl, scene } = useThree();
  const frameCounter = useRef(0);

  useEffect(() => {
    // Set up render target for camera feed capture
    const renderTarget = new THREE.WebGLRenderTarget(512, 512);

    const captureInterval = setInterval(() => {
      if (!cameraRef.current || !onFrameCapture) return;

      try {
        // Render to our render target
        const originalRenderTarget = gl.getRenderTarget();
        gl.setRenderTarget(renderTarget);
        gl.render(scene, cameraRef.current);
        gl.setRenderTarget(originalRenderTarget);

        // Read pixels from render target
        const pixels = new Uint8Array(512 * 512 * 4);
        gl.readRenderTargetPixels(renderTarget, 0, 0, 512, 512, pixels);

        // Convert to data URL
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.createImageData(512, 512);
          imageData.data.set(pixels);
          ctx.putImageData(imageData, 0, 0);

          // Flip vertically (WebGL renders upside down)
          ctx.translate(0, 512);
          ctx.scale(1, -1);
          ctx.drawImage(canvas, 0, 0);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          onFrameCapture(dataUrl);
        }
      } catch (error) {
        console.error('Error capturing camera frame:', error);
      }
    }, 500); // Capture every 500ms (2 FPS) to reduce load

    return () => {
      clearInterval(captureInterval);
      renderTarget.dispose();
    };
  }, [gl, scene, onFrameCapture]);

  useFrame(() => {
    if (!cameraRef.current || !droneRef.current) return;

    const drone = droneRef.current;

    if (mode === 'fpv') {
      // First-person view - camera attached to drone
      const cameraOffset = new THREE.Vector3(0, 0.3, 0.3); // Slightly forward and up
      const worldOffset = cameraOffset.applyQuaternion(drone.quaternion);
      const targetPos = drone.position.clone().add(worldOffset);

      cameraRef.current.position.lerp(targetPos, 0.1);

      // Look in the direction the drone is facing
      const lookDirection = new THREE.Vector3(0, -0.2, -1)
        .applyQuaternion(drone.quaternion)
        .add(drone.position);
      cameraRef.current.lookAt(lookDirection);
    } else {
      // Third-person view - camera follows behind drone
      const cameraDistance = 8;
      const cameraHeight = 4;
      const offset = new THREE.Vector3(0, cameraHeight, cameraDistance)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), drone.rotation.y);
      const targetPos = drone.position.clone().add(offset);

      cameraRef.current.position.lerp(targetPos, 0.05);

      // Look at drone
      const lookTarget = drone.position.clone();
      lookTarget.y += 0.5;
      cameraRef.current.lookAt(lookTarget);
    }

    frameCounter.current++;
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 8, 12]} fov={mode === 'fpv' ? 90 : 70} />;
};

export default DroneCamera;
