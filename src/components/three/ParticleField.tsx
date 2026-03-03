"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface ParticleFieldProps {
  count?: number;
  text?: string;
  color1?: string;
  color2?: string;
  color3?: string;
  mousePosition: React.MutableRefObject<{ x: number; y: number }>;
  morphProgress: React.MutableRefObject<number>;
}

// Simple text-to-positions generator using canvas
function generateTextPositions(
  text: string,
  count: number,
  width: number,
  height: number
): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.floor(height * 0.35)}px "Inter", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Collect all white pixel positions
  const whitePixels: [number, number][] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i] > 128) {
        whitePixels.push([x, y]);
      }
    }
  }

  const positions = new Float32Array(count * 3);
  const aspect = width / height;
  const scale = 12;

  for (let i = 0; i < count; i++) {
    if (whitePixels.length > 0) {
      const [px, py] = whitePixels[Math.floor(Math.random() * whitePixels.length)];
      // Add slight jitter for organic feel
      positions[i * 3] = ((px / width - 0.5) * scale * aspect) + (Math.random() - 0.5) * 0.08;
      positions[i * 3 + 1] = (-(py / height - 0.5) * scale) + (Math.random() - 0.5) * 0.08;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
  }

  return positions;
}

export default function ParticleField({
  count = 15000,
  text = "minamorl",
  color1 = "#ff6b9d",
  color2 = "#c084fc",
  color3 = "#22d3ee",
  mousePosition,
  morphProgress,
}: ParticleFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();

  // Generate random scatter positions
  const scatterPositions = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 4 + Math.random() * 12;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) - 5;
    }
    return positions;
  }, [count]);

  // Generate text target positions
  const textPositions = useMemo(() => {
    if (typeof document === "undefined") return new Float32Array(count * 3);
    return generateTextPositions(text, count, 512, 128);
  }, [text, count]);

  // Per-particle data: velocities, phases, sizes
  const particleData = useMemo(() => {
    const velocities = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);
    const colorIndices = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
      phases[i] = Math.random() * Math.PI * 2;
      sizes[i] = 0.015 + Math.random() * 0.025;
      colorIndices[i] = Math.random();
    }
    return { velocities, phases, sizes, colorIndices };
  }, [count]);

  // Current positions (mutable)
  const currentPositions = useRef(new Float32Array(count * 3));

  // Initialize positions
  useEffect(() => {
    currentPositions.current.set(scatterPositions);
  }, [scatterPositions]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const colorObj = useMemo(() => new THREE.Color(), []);
  const c1 = useMemo(() => new THREE.Color(color1), [color1]);
  const c2 = useMemo(() => new THREE.Color(color2), [color2]);
  const c3 = useMemo(() => new THREE.Color(color3), [color3]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const progress = morphProgress.current;
    const mx = mousePosition.current.x;
    const my = mousePosition.current.y;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const phase = particleData.phases[i];

      // Lerp between scatter and text positions
      const tx = scatterPositions[i3] * (1 - progress) + textPositions[i3] * progress;
      const ty = scatterPositions[i3 + 1] * (1 - progress) + textPositions[i3 + 1] * progress;
      const tz = scatterPositions[i3 + 2] * (1 - progress) + textPositions[i3 + 2] * progress;

      // Add organic floating motion
      const floatX = Math.sin(time * 0.3 + phase) * (1 - progress * 0.7) * 0.5;
      const floatY = Math.cos(time * 0.2 + phase * 1.3) * (1 - progress * 0.7) * 0.3;
      const floatZ = Math.sin(time * 0.15 + phase * 0.7) * (1 - progress * 0.5) * 0.4;

      // Mouse repulsion
      const dx = tx + floatX - mx * viewport.width * 0.5;
      const dy = ty + floatY - my * viewport.height * 0.5;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const repulsion = Math.max(0, 1 - dist / 3) * 1.5 * (1 - progress * 0.5);
      const repX = dist > 0.01 ? (dx / dist) * repulsion : 0;
      const repY = dist > 0.01 ? (dy / dist) * repulsion : 0;

      // Final position
      const fx = tx + floatX + repX;
      const fy = ty + floatY + repY;
      const fz = tz + floatZ;

      // Smooth towards target
      currentPositions.current[i3] += (fx - currentPositions.current[i3]) * 0.08;
      currentPositions.current[i3 + 1] += (fy - currentPositions.current[i3 + 1]) * 0.08;
      currentPositions.current[i3 + 2] += (fz - currentPositions.current[i3 + 2]) * 0.08;

      dummy.position.set(
        currentPositions.current[i3],
        currentPositions.current[i3 + 1],
        currentPositions.current[i3 + 2]
      );

      // Pulse size
      const pulse = 1 + Math.sin(time * 2 + phase) * 0.3;
      const s = particleData.sizes[i] * pulse;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Color based on index
      const ci = particleData.colorIndices[i];
      if (ci < 0.33) {
        colorObj.copy(c1).lerp(c2, ci / 0.33);
      } else if (ci < 0.66) {
        colorObj.copy(c2).lerp(c3, (ci - 0.33) / 0.33);
      } else {
        colorObj.copy(c3).lerp(c1, (ci - 0.66) / 0.34);
      }
      // Brightness varies with z-depth
      const brightness = 0.6 + Math.abs(currentPositions.current[i3 + 2]) * 0.05;
      colorObj.multiplyScalar(brightness);
      meshRef.current.setColorAt(i, colorObj);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial transparent opacity={0.85} toneMapped={false} />
    </instancedMesh>
  );
}
