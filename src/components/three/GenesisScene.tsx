"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GenesisScene — Minimal particle text reveal
 *
 * Particles scatter from random positions and converge into "minamorl".
 * No bloom, no additive blending, muted colors for readability.
 * Mobile-first: text scales to fit viewport width.
 */

interface GenesisSceneProps {
  progress: React.MutableRefObject<number>;
  text?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 18000;

const P = {
  SCATTER_END: 0.175,
  CONVERGE_END: 0.575,
  FLOAT_END: 0.72,
  BLACK_END: 1.0,
};

const SPREAD_X = 60;
const SPREAD_Y = 30;
const SPREAD_Z = 15;

// ─── Utility ────────────────────────────────────────────────────────────────

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function easeInQuad(t: number): number {
  return t * t;
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ─── Text positions via Canvas 2D ───────────────────────────────────────────

function generateTextPositions(
  text: string,
  count: number,
  canvasW: number,
  canvasH: number,
  scale: number,
): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.floor(canvasH * 0.42)}px "Inter", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvasW / 2, canvasH / 2);

  const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
  const pixels = imageData.data;

  const whitePixels: [number, number][] = [];
  for (let y = 0; y < canvasH; y++) {
    for (let x = 0; x < canvasW; x++) {
      const idx = (y * canvasW + x) * 4;
      if (pixels[idx] > 128) whitePixels.push([x, y]);
    }
  }

  const positions = new Float32Array(count * 3);
  const aspect = canvasW / canvasH;

  if (whitePixels.length === 0) return positions;

  const rng = createRng(9999);
  for (let i = 0; i < count; i++) {
    const [px, py] = whitePixels[Math.floor(rng() * whitePixels.length)];
    positions[i * 3]     = (px / canvasW - 0.5) * scale * aspect + (rng() - 0.5) * 0.04;
    positions[i * 3 + 1] = -(py / canvasH - 0.5) * scale + (rng() - 0.5) * 0.04;
    positions[i * 3 + 2] = (rng() - 0.5) * 0.3;
  }

  return positions;
}

// ─── Particle data ──────────────────────────────────────────────────────────

interface ParticleAttribs {
  scatterPos: Float32Array;
  baseColor: Float32Array;
  baseSize: Float32Array;
  phase: Float32Array;
  speed: Float32Array;
}

function buildParticleAttribs(count: number): ParticleAttribs {
  const scatter = new Float32Array(count * 3);
  const color   = new Float32Array(count * 3);
  const size    = new Float32Array(count);
  const phase   = new Float32Array(count);
  const speed   = new Float32Array(count);

  const rng = createRng(42);

  // Muted palette — designed for NormalBlending on black bg, NO bloom
  // These are intentionally dim so particles don't white-out when dense
  const palette = [
    [0.0, 0.45, 0.55],   // teal
    [0.50, 0.0, 0.45],   // purple
    [0.15, 0.15, 0.55],  // deep blue
    [0.35, 0.35, 0.45],  // grey-blue
  ];

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;

    // Random scatter position
    scatter[i3]     = (rng() - 0.5) * SPREAD_X;
    scatter[i3 + 1] = (rng() - 0.5) * SPREAD_Y;
    scatter[i3 + 2] = (rng() - 0.5) * SPREAD_Z;

    // Pick random color from palette
    const col = palette[Math.floor(rng() * palette.length)];
    const v = 0.7 + rng() * 0.3;
    color[i3]     = col[0] * v;
    color[i3 + 1] = col[1] * v;
    color[i3 + 2] = col[2] * v;

    size[i]  = 0.03 + rng() * 0.06;
    phase[i] = rng() * Math.PI * 2;
    speed[i] = 0.3 + rng() * 0.7;
  }

  return { scatterPos: scatter, baseColor: color, baseSize: size, phase, speed };
}

// ─── CameraRig ──────────────────────────────────────────────────────────────

function CameraRig({ progress }: { progress: React.MutableRefObject<number> }) {
  const { camera, size } = useThree();
  const isMobile = size.width < 768;
  const revealZ = isMobile ? 8 : 12;
  const revealFov = isMobile ? 55 : 50;

  const curPos    = useRef(new THREE.Vector3(0, 0, 60));
  const curTarget = useRef(new THREE.Vector3(0, 0, 0));
  const curFov    = useRef(65);

  useFrame((state) => {
    const p    = progress.current;
    const time = state.clock.elapsedTime;

    let goalPos: THREE.Vector3;
    let goalLook: THREE.Vector3;
    let goalFov: number;

    if (p < 0.175) {
      // Scatter — wide view
      goalPos = new THREE.Vector3(
        Math.sin(time * 0.1) * 2,
        Math.cos(time * 0.08) * 1,
        60 - smoothstep(0, 0.175, p) * 25,
      );
      goalLook = new THREE.Vector3(0, 0, 0);
      goalFov = 60;
    } else if (p < 0.575) {
      // Convergence — zoom in
      const t = easeOutExpo(smoothstep(0.175, 0.575, p));
      const startPos = new THREE.Vector3(15, 10, 35);
      const endPos = new THREE.Vector3(0, 0.2, revealZ + 2);
      goalPos = new THREE.Vector3().lerpVectors(startPos, endPos, t);
      goalLook = new THREE.Vector3(0, 0, 0);
      goalFov = THREE.MathUtils.lerp(55, revealFov, t);
    } else if (p < 0.72) {
      // Reveal — float gently
      goalPos = new THREE.Vector3(
        Math.sin(time * 0.3) * 0.2,
        Math.cos(time * 0.25) * 0.15 + 0.2,
        revealZ,
      );
      goalLook = new THREE.Vector3(0, 0, 0);
      goalFov = revealFov;
    } else {
      // Collapse
      const t = easeInQuad(smoothstep(0.72, 0.97, p));
      goalPos = new THREE.Vector3(0, 0, THREE.MathUtils.lerp(revealZ, 2, t));
      goalLook = new THREE.Vector3(0, 0, THREE.MathUtils.lerp(0, -5, t));
      goalFov = THREE.MathUtils.lerp(revealFov, 120, t);
    }

    curPos.current.lerp(goalPos, 0.15);
    curTarget.current.lerp(goalLook, 0.15);
    curFov.current += (goalFov - curFov.current) * 0.15;

    camera.position.copy(curPos.current);
    camera.lookAt(curTarget.current);

    const pc = camera as THREE.PerspectiveCamera;
    if (Math.abs(pc.fov - curFov.current) > 0.01) {
      pc.fov = curFov.current;
      pc.updateProjectionMatrix();
    }
  });

  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function GenesisScene({
  progress,
  text = "minamorl",
}: GenesisSceneProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const attribs = useMemo(() => buildParticleAttribs(PARTICLE_COUNT), []);

  const textPositions = useMemo(() => {
    if (typeof document === "undefined") return new Float32Array(PARTICLE_COUNT * 3);
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    // Aggressive mobile scaling to prevent text overflow
    let baseScale: number;
    if (w < 380) {
      baseScale = 1.8;
    } else if (w < 500) {
      baseScale = 2.5;
    } else if (w < 768) {
      baseScale = 3.5;
    } else {
      baseScale = 8;
    }
    return generateTextPositions(text, PARTICLE_COUNT, 640, 128, baseScale);
  }, [text]);

  // Mutable simulation state
  const currentPos  = useMemo(() => {
    const buf = new Float32Array(PARTICLE_COUNT * 3);
    buf.set(attribs.scatterPos);
    return buf;
  }, [attribs]);
  const targetPos   = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const velocity    = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const alphaCur    = useMemo(() => new Float32Array(PARTICLE_COUNT), []);
  const alphaTgt    = useMemo(() => new Float32Array(PARTICLE_COUNT), []);

  // GPU buffers
  const posBuf   = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const colorBuf = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const sizeBuf  = useMemo(() => new Float32Array(PARTICLE_COUNT), []);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const time = state.clock.elapsedTime;
    const p    = progress.current;
    const dt   = Math.min(delta, 0.05);

    const converge     = smoothstep(P.SCATTER_END, P.CONVERGE_END, p);
    const convergeEased = easeInQuad(converge);
    const floatAmp     = smoothstep(P.CONVERGE_END, P.FLOAT_END, p);
    const collapse     = smoothstep(P.FLOAT_END, P.BLACK_END - 0.03, p);
    const collapseEased = easeInQuad(collapse);

    const fadeIn  = smoothstep(0.0, 0.05, p);
    const fadeOut = smoothstep(P.FLOAT_END + 0.05, P.BLACK_END, p);
    const globalAlpha = fadeIn * (1 - fadeOut);

    const stiffness = collapse > 0.05 ? 8.0 : converge > 0.01 ? 10.0 : 2.0;
    const damping   = collapse > 0.05 ? 0.70 : converge > 0.01 ? 0.75 : 0.90;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3  = i * 3;
      const phi = attribs.phase[i];

      const sx = attribs.scatterPos[i3];
      const sy = attribs.scatterPos[i3 + 1];
      const sz = attribs.scatterPos[i3 + 2];

      const tx = textPositions[i3];
      const ty = textPositions[i3 + 1];
      const tz = textPositions[i3 + 2];

      let fx: number, fy: number, fz: number;
      let fa: number;

      if (collapse > 0.01) {
        const c = collapseEased;
        fx = THREE.MathUtils.lerp(tx, 0, c);
        fy = THREE.MathUtils.lerp(ty, 0, c);
        fz = THREE.MathUtils.lerp(tz, -c * 10, c);
        fa = globalAlpha * (1 - fadeOut);
      } else if (converge > 0.01) {
        const m = convergeEased;
        const dist = Math.sqrt(sx * sx + sy * sy + sz * sz);
        const stagger = clamp01(dist / 50) * 0.25;
        const pm = easeInQuad(clamp01((m - stagger) / (1 - stagger)));

        fx = THREE.MathUtils.lerp(sx, tx, pm);
        fy = THREE.MathUtils.lerp(sy, ty, pm);
        fz = THREE.MathUtils.lerp(sz, tz, pm);

        // Subtle breathing
        const breathe = floatAmp * 0.05;
        fx += Math.sin(time * 0.35 + phi) * breathe;
        fy += Math.cos(time * 0.28 + phi * 1.2) * breathe * 0.7;

        fa = globalAlpha;
      } else {
        // Scatter with gentle drift
        fx = sx + Math.sin(time * 0.15 + phi) * 0.5;
        fy = sy + Math.cos(time * 0.12 + phi * 1.3) * 0.5;
        fz = sz;
        fa = globalAlpha;
      }

      targetPos[i3]     = fx;
      targetPos[i3 + 1] = fy;
      targetPos[i3 + 2] = fz;
      alphaTgt[i]       = fa;
    }

    // Spring integration
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      for (let a = 0; a < 3; a++) {
        const idx = i3 + a;
        const force = (targetPos[idx] - currentPos[idx]) * stiffness;
        velocity[idx] = velocity[idx] * damping + force * dt;
        currentPos[idx] += velocity[idx] * dt;
      }
      alphaCur[i] += (alphaTgt[i] - alphaCur[i]) * 0.4;
    }

    // Write GPU buffers
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const alpha = Math.max(0, alphaCur[i]);

      posBuf[i3]     = currentPos[i3];
      posBuf[i3 + 1] = currentPos[i3 + 1];
      posBuf[i3 + 2] = currentPos[i3 + 2];

      colorBuf[i3]     = attribs.baseColor[i3]     * alpha;
      colorBuf[i3 + 1] = attribs.baseColor[i3 + 1] * alpha;
      colorBuf[i3 + 2] = attribs.baseColor[i3 + 2] * alpha;

      const pulse = 1 + Math.sin(time * 1.0 + attribs.phase[i]) * 0.15;
      sizeBuf[i] = attribs.baseSize[i] * alpha * pulse;
    }

    // Upload
    const geo = pointsRef.current.geometry;
    const posAttr  = geo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr  = geo.getAttribute("color")    as THREE.BufferAttribute;
    const sizeAttr = geo.getAttribute("size")     as THREE.BufferAttribute;

    posAttr.set(posBuf);
    posAttr.needsUpdate = true;
    colAttr.set(colorBuf);
    colAttr.needsUpdate = true;
    sizeAttr.set(sizeBuf);
    sizeAttr.needsUpdate = true;
    geo.setDrawRange(0, PARTICLE_COUNT);
  });

  return (
    <group>
      <CameraRig progress={progress} />

      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[posBuf, 3]}
            count={PARTICLE_COUNT}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colorBuf, 3]}
            count={PARTICLE_COUNT}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizeBuf, 1]}
            count={PARTICLE_COUNT}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.NormalBlending}
          size={0.06}
        />
      </points>
    </group>
  );
}
