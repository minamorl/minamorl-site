"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GenesisScene — Data-Visualization Scatter → "minamorl" Convergence
 *
 * 30 000+ particles are spread across an enormous area as overlapping data
 * visualisation patterns (sine waves, grids, scatter noise, concentric circles,
 * bar-chart columns). They rush inward and converge into the text "minamorl",
 * then breathe gently, and finally collapse to a singularity.
 *
 * Architecture: Target + Spring physics (same as predecessor).
 * Every particle owns currentPos / targetPos / velocity.
 * Each frame the target is computed from `progress`, then springs integrate.
 *
 * Phase map (progress 0 → 1, auto-play completes in 2 seconds):
 *   0.000 – 0.175  Scatter + diagonal slash (cuts 1-2, 0.35s)
 *   0.175 – 0.575  Convergence rush → text positions (cut 3, 1.15s)
 *   0.575 – 0.720  Pull-back + float / breathe (cuts 4-5, 0.50s)
 *   0.720 – 1.000  Collapse to singularity → black (scroll-driven) → black
 */

// ─── Interface ──────────────────────────────────────────────────────────────

interface GenesisSceneProps {
  progress: React.MutableRefObject<number>;
  text?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 32000;

// Phase boundaries (compressed to 2-second total)
const P = {
  SCATTER_END: 0.175,
  CONVERGE_END: 0.575,
  FLOAT_END: 0.72,
  BLACK_END: 1.0,
};

// Scatter-plot spread (world units)
const SPREAD_X = 100; // total width  (±50)
const SPREAD_Y = 50;  // total height (±25)
const SPREAD_Z = 20;  // depth

// Pattern group sizes
const GROUP_SINE = 6000;
const GROUP_GRID = 6000;
const GROUP_NOISE = 6000;
const GROUP_CIRCLES = 6000;
const GROUP_BARS = 8000;
// Total = 32 000

// Spring presets (stiff — animation completes in 2s total)
const SPRING_SCATTER   = { stiffness: 2.0,  damping: 0.90 };
const SPRING_CONVERGE  = { stiffness: 12.0, damping: 0.72 };
const SPRING_FLOAT     = { stiffness: 6.0,  damping: 0.80 };
const SPRING_COLLAPSE  = { stiffness: 8.0,  damping: 0.70 };

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
  scale: number = 10,
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
      if (pixels[idx] > 128) {
        whitePixels.push([x, y]);
      }
    }
  }

  const positions = new Float32Array(count * 3);
  const aspect = canvasW / canvasH;

  if (whitePixels.length === 0) return positions;

  const rng = createRng(9999);
  for (let i = 0; i < count; i++) {
    const [px, py] = whitePixels[Math.floor(rng() * whitePixels.length)];
    positions[i * 3]     = (px / canvasW - 0.5) * scale * aspect + (rng() - 0.5) * 0.05;
    positions[i * 3 + 1] = -(py / canvasH - 0.5) * scale + (rng() - 0.5) * 0.05;
    positions[i * 3 + 2] = (rng() - 0.5) * 0.6;
  }

  return positions;
}

// ─── Initial scatter positions ──────────────────────────────────────────────

interface ParticleAttribs {
  /** Initial scatter position */
  scatterPos: Float32Array;
  /** Per-particle base colour (r,g,b) */
  baseColor: Float32Array;
  /** Per-particle base size */
  baseSize: Float32Array;
  /** Per-particle random phase offset */
  phase: Float32Array;
  /** Per-particle speed multiplier */
  speed: Float32Array;
  /** Group index (0-4) for pattern membership */
  group: Uint8Array;
}

function buildParticleAttribs(count: number): ParticleAttribs {
  const scatter = new Float32Array(count * 3);
  const color   = new Float32Array(count * 3);
  const size    = new Float32Array(count);
  const phase   = new Float32Array(count);
  const speed   = new Float32Array(count);
  const group   = new Uint8Array(count);

  const rng = createRng(42);

  // Palette (toned down to avoid bloom white-out)
  const cyan    = [0.0, 0.6, 0.65];
  const magenta = [0.65, 0.0, 0.6];
  const blue    = [0.2, 0.2, 0.7];
  const white   = [0.55, 0.55, 0.6];

  let idx = 0;

  // Helper to push one particle
  const emit = (
    x: number, y: number, z: number,
    col: number[], s: number, g: number,
  ) => {
    if (idx >= count) return;
    const i3 = idx * 3;
    scatter[i3]     = x;
    scatter[i3 + 1] = y;
    scatter[i3 + 2] = z;
    // colour with slight random variation
    const v = 0.85 + rng() * 0.15;
    color[i3]     = col[0] * v;
    color[i3 + 1] = col[1] * v;
    color[i3 + 2] = col[2] * v;
    size[idx]  = s;
    phase[idx] = rng() * Math.PI * 2;
    speed[idx] = 0.3 + rng() * 0.7;
    group[idx] = g;
    idx++;
  };

  // ── Group 0: Sine waves (6 000) ───────────────────────────────────────
  for (let i = 0; i < GROUP_SINE; i++) {
    const t  = (i / GROUP_SINE) * 2 - 1;            // –1 … +1
    const waveIdx = Math.floor(rng() * 4);           // 4 overlapping waves
    const freq = 1.5 + waveIdx * 1.3;
    const amp  = 8 + waveIdx * 4;
    const x = t * SPREAD_X * 0.5;
    const y = Math.sin(t * Math.PI * freq) * amp + (rng() - 0.5) * 1.5;
    const z = (rng() - 0.5) * SPREAD_Z * 0.3;
    const s = 0.03 + rng() * 0.06;
    emit(x, y, z, cyan, s, 0);
  }

  // ── Group 1: Grid / matrix (6 000) ────────────────────────────────────
  {
    const cols = 100;
    const rows = 60;
    for (let i = 0; i < GROUP_GRID; i++) {
      const ci = Math.floor(rng() * cols);
      const ri = Math.floor(rng() * rows);
      const x = (ci / cols - 0.5) * SPREAD_X;
      const y = (ri / rows - 0.5) * SPREAD_Y;
      const z = (rng() - 0.5) * 2;
      const s = 0.02 + rng() * 0.04;
      emit(x, y, z, blue, s, 1);
    }
  }

  // ── Group 2: Random scatter / noise (6 000) ───────────────────────────
  for (let i = 0; i < GROUP_NOISE; i++) {
    const x = (rng() - 0.5) * SPREAD_X * 1.1;
    const y = (rng() - 0.5) * SPREAD_Y * 1.1;
    const z = (rng() - 0.5) * SPREAD_Z;
    const s = 0.02 + rng() * 0.12;
    emit(x, y, z, white, s, 2);
  }

  // ── Group 3: Concentric circles (6 000) ───────────────────────────────
  for (let i = 0; i < GROUP_CIRCLES; i++) {
    const ringIdx = Math.floor(rng() * 8);
    const r = 4 + ringIdx * 4.5;
    const angle = rng() * Math.PI * 2;
    const x = Math.cos(angle) * r + (rng() - 0.5) * 1.0;
    const y = Math.sin(angle) * r + (rng() - 0.5) * 1.0;
    const z = (rng() - 0.5) * 3;
    const s = 0.03 + rng() * 0.07;
    emit(x, y, z, magenta, s, 3);
  }

  // ── Group 4: Bar-chart columns (8 000) ────────────────────────────────
  {
    const barCount = 40;
    for (let i = 0; i < GROUP_BARS; i++) {
      const bi = Math.floor(rng() * barCount);
      const barX = (bi / barCount - 0.5) * SPREAD_X * 0.9;
      const barH = 3 + rng() * (SPREAD_Y * 0.4);  // random height per bar
      const x = barX + (rng() - 0.5) * 0.8;
      const y = -SPREAD_Y * 0.4 + rng() * barH;
      const z = (rng() - 0.5) * 2;
      const col = rng() > 0.5 ? cyan : blue;
      const s = 0.02 + rng() * 0.05;
      emit(x, y, z, col, s, 4);
    }
  }

  return { scatterPos: scatter, baseColor: color, baseSize: size, phase, speed, group };
}

// ─── CameraRig ──────────────────────────────────────────────────────────────

function CameraRig({ progress }: { progress: React.MutableRefObject<number> }) {
  const { camera, size } = useThree();
  const isMobile = size.width < 768;
  // Camera distances tuned to text scale:
  //   Desktop: scale=10 → cam z=12, fov=50
  //   Mobile:  scale=3.0 → cam z=8, fov=55 (closer + wider to fill screen)
  const revealZ = isMobile ? 8 : 12;
  const revealFov = isMobile ? 55 : 50;

  const curPos    = useRef(new THREE.Vector3(0, 0, 80));
  const curTarget = useRef(new THREE.Vector3(0, 0, 0));
  const curFov    = useRef(65);
  const lastCut   = useRef(0);

  // Spring state (only for float phase)
  const velPos    = useRef(new THREE.Vector3());
  const velTarget = useRef(new THREE.Vector3());
  const velFov    = useRef(0);

  useFrame((state, delta) => {
    const p    = progress.current;
    const dt   = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;

    // ── Cut boundaries (2-second total) ──
    // Progress phases:
    //   0.000–0.075  Cut 1: Wide establishing (0.15s)
    //   0.075–0.175  Cut 2: Diagonal slash hard cut (0.20s)
    //   0.175–0.575  Cut 3: Convergence rush + zoom into text (1.15s)
    //   0.575–0.675  Cut 4: Pull-back reveal (0.20s)
    //   0.675–0.720  Cut 5: Float / breathe (0.30s)
    //   0.720–1.000  Cut 6: Collapse (scroll-driven)

    let cut: number;
    if (p < 0.075)      cut = 1;
    else if (p < 0.175) cut = 2;
    else if (p < 0.575) cut = 3;
    else if (p < 0.675) cut = 4;
    else if (p < 0.72)  cut = 5;
    else                 cut = 6;

    // Hard cut detection — reset velocities on cut change
    if (cut !== lastCut.current) {
      velPos.current.set(0, 0, 0);
      velTarget.current.set(0, 0, 0);
      velFov.current = 0;
      lastCut.current = cut;
    }

    if (cut === 1) {
      // Wide establishing shot — quick flash
      const goalPos = new THREE.Vector3(
        Math.sin(time * 0.08) * 3,
        Math.cos(time * 0.05) * 1.5,
        80,
      );
      const goalLook = new THREE.Vector3(0, 0, 0);
      const goalFov = 65;

      curPos.current.lerp(goalPos, 0.12);
      curTarget.current.lerp(goalLook, 0.12);
      curFov.current += (goalFov - curFov.current) * 0.12;

    } else if (cut === 2) {
      // Diagonal slash — HARD CUT to 45° angle
      const t = smoothstep(0.075, 0.175, p);

      const goalPos = new THREE.Vector3(
        28 + Math.sin(time * 0.4) * 1.0,
        18 + Math.cos(time * 0.3) * 0.8,
        38,
      );
      const goalLook = new THREE.Vector3(-2, -1, 0);
      const goalFov = 52;

      // First frame: snap instantly
      if (t < 0.08) {
        curPos.current.copy(goalPos);
        curTarget.current.copy(goalLook);
        curFov.current = goalFov;
      } else {
        curPos.current.lerp(goalPos, 0.20);
        curTarget.current.lerp(goalLook, 0.20);
        curFov.current += (goalFov - curFov.current) * 0.20;
      }

    } else if (cut === 3) {
      // Convergence rush — sweep from diagonal to INSIDE the text
      const t = smoothstep(0.175, 0.575, p);
      const te = easeOutExpo(t);

      // Start: diagonal position, End: inside the text (z=2.5 — even closer)
      const startPos = new THREE.Vector3(28, 18, 38);
      const endPos   = new THREE.Vector3(0.3, 0.1, 2.5);
      const startLook = new THREE.Vector3(-2, -1, 0);
      const endLook   = new THREE.Vector3(0, 0, 0);
      const startFov = 52;
      const endFov   = 32;

      const goalPos = new THREE.Vector3().lerpVectors(startPos, endPos, te);
      const goalLook = new THREE.Vector3().lerpVectors(startLook, endLook, te);
      const goalFov = THREE.MathUtils.lerp(startFov, endFov, te);

      // Camera shake when very close (last 25% of convergence)
      if (te > 0.75) {
        const shakeIntensity = (te - 0.75) / 0.25 * 0.2;
        goalPos.x += Math.sin(time * 30) * shakeIntensity;
        goalPos.y += Math.cos(time * 37) * shakeIntensity * 0.7;
        goalPos.z += Math.sin(time * 23) * shakeIntensity * 0.3;
      }

      // Aggressive lerp for cinematic sweep
      curPos.current.lerp(goalPos, 0.25);
      curTarget.current.lerp(goalLook, 0.25);
      curFov.current += (goalFov - curFov.current) * 0.25;

    } else if (cut === 4) {
      // Pull-back reveal — quick snap out to see the full text
      const t = smoothstep(0.575, 0.675, p);
      const te = easeOutExpo(t);

      const startPos = new THREE.Vector3(0.3, 0.1, 2.5);
      const endPos   = new THREE.Vector3(0, 0.3, revealZ);
      const goalPos  = new THREE.Vector3().lerpVectors(startPos, endPos, te);
      const goalLook = new THREE.Vector3(0, 0, 0);
      const goalFov  = THREE.MathUtils.lerp(32, revealFov, te);

      curPos.current.lerp(goalPos, 0.45);
      curTarget.current.lerp(goalLook, 0.45);
      curFov.current += (goalFov - curFov.current) * 0.45;

    } else if (cut === 5) {
      // Float / breathe — gentle spring-based orbit
      const goalPos = new THREE.Vector3(
        Math.sin(time * 0.5) * 0.3,
        Math.cos(time * 0.4) * 0.2 + 0.3,
        revealZ + Math.sin(time * 0.6) * 0.2,
      );
      const goalLook = new THREE.Vector3(0, 0, 0);
      const goalFov = revealFov;

      const stiffness = 1.5;
      const damping   = 0.93;

      const fP = new THREE.Vector3().subVectors(goalPos, curPos.current).multiplyScalar(stiffness);
      velPos.current.multiplyScalar(damping).add(fP.multiplyScalar(dt));
      curPos.current.add(velPos.current.clone().multiplyScalar(dt));

      const fT = new THREE.Vector3().subVectors(goalLook, curTarget.current).multiplyScalar(stiffness);
      velTarget.current.multiplyScalar(damping).add(fT.multiplyScalar(dt));
      curTarget.current.add(velTarget.current.clone().multiplyScalar(dt));

      const fF = (goalFov - curFov.current) * stiffness;
      velFov.current = velFov.current * damping + fF * dt;
      curFov.current += velFov.current * dt;

    } else {
      // Collapse — spiral into singularity
      const t = smoothstep(0.72, 0.97, p);
      const te = easeInQuad(t);

      const goalPos = new THREE.Vector3(
        Math.sin(t * Math.PI * 2) * (1 - te) * 2,
        Math.cos(t * Math.PI * 2) * (1 - te) * 1.5,
        THREE.MathUtils.lerp(revealZ, 1.5, te),
      );
      const goalLook = new THREE.Vector3(0, 0, THREE.MathUtils.lerp(0, -5, te));
      const goalFov = THREE.MathUtils.lerp(revealFov, 130, te);

      curPos.current.lerp(goalPos, 0.25);
      curTarget.current.lerp(goalLook, 0.25);
      curFov.current += (goalFov - curFov.current) * 0.25;
    }

    // Apply to camera
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

  // ── Pre-computed data ─────────────────────────────────────────────────────

  const attribs = useMemo(() => buildParticleAttribs(PARTICLE_COUNT), []);

  const textPositions = useMemo(() => {
    if (typeof document === "undefined") return new Float32Array(PARTICLE_COUNT * 3);
    const w = typeof window !== "undefined" ? window.innerWidth : 1200;
    // Scale text to fit viewport:
    //   Mobile  (<500px):  scale 3.0  — compact enough to read
    //   Tablet  (<768px):  scale 4.5
    //   Desktop (>=768px): scale 10
    let baseScale: number;
    if (w < 500) {
      baseScale = 3.0;
    } else if (w < 768) {
      baseScale = 4.5;
    } else {
      baseScale = 10;
    }
    // Use wider canvas for mobile to increase font resolution per character
    const canvasW = w < 768 ? 640 : 512;
    const canvasH = w < 768 ? 128 : 128;
    return generateTextPositions(text, PARTICLE_COUNT, canvasW, canvasH, baseScale);
  }, [text]);

  // ── Mutable simulation state (never re-allocated) ────────────────────────

  const currentPos  = useMemo(() => {
    // Initialise current positions to scatter positions
    const buf = new Float32Array(PARTICLE_COUNT * 3);
    buf.set(attribs.scatterPos);
    return buf;
  }, [attribs]);
  const targetPos   = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const velocity    = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const alphaCur    = useMemo(() => new Float32Array(PARTICLE_COUNT), []);
  const alphaTgt    = useMemo(() => new Float32Array(PARTICLE_COUNT), []);

  // Output GPU buffers
  const posBuf   = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const colorBuf = useMemo(() => new Float32Array(PARTICLE_COUNT * 3), []);
  const sizeBuf  = useMemo(() => new Float32Array(PARTICLE_COUNT), []);

  // ── Frame loop ────────────────────────────────────────────────────────────

  useFrame((state, delta) => {
    if (!pointsRef.current) return;

    const time = state.clock.elapsedTime;
    const p    = progress.current;
    const dt   = Math.min(delta, 0.05);

    // ── Sub-progresses ──────────────────────────────────────────────────

    // Scatter alive animation intensity (1 during scatter, fades quickly during converge)
    const scatterAlive = 1 - smoothstep(P.SCATTER_END, P.SCATTER_END + 0.10, p);

    // Convergence 0→1
    const converge     = smoothstep(P.SCATTER_END, P.CONVERGE_END, p);
    const convergeEased = easeInQuad(converge);

    // Float breathing amplitude
    const floatAmp     = smoothstep(P.CONVERGE_END, P.FLOAT_END, p);

    // Collapse 0→1
    const collapse     = smoothstep(P.FLOAT_END, P.BLACK_END - 0.03, p);
    const collapseEased = easeInQuad(collapse);

    // Global fade-in / fade-out
    const fadeIn  = smoothstep(0.0, 0.03, p);
    const fadeOut = smoothstep(P.FLOAT_END + 0.05, P.BLACK_END, p);
    const globalAlpha = fadeIn * (1 - fadeOut);

    // ── Pick spring preset ──────────────────────────────────────────────

    let spring = SPRING_SCATTER;
    if (collapse > 0.05) {
      spring = SPRING_COLLAPSE;
    } else if (converge > 0.01 && converge < 0.98) {
      spring = SPRING_CONVERGE;
    } else if (floatAmp > 0.5) {
      spring = SPRING_FLOAT;
    }

    const stiffness = spring.stiffness;
    const damping   = spring.damping;

    // ── Compute targets per particle ────────────────────────────────────

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3    = i * 3;
      const phi   = attribs.phase[i];
      const spd   = attribs.speed[i];
      const grp   = attribs.group[i];

      // Scatter position (base + alive animation)
      let sx = attribs.scatterPos[i3];
      let sy = attribs.scatterPos[i3 + 1];
      let sz = attribs.scatterPos[i3 + 2];

      // Per-group alive animation during scatter phase
      if (scatterAlive > 0.01) {
        const a = scatterAlive;
        if (grp === 0) {
          // Sine waves: drift along wave
          sx += Math.sin(time * 0.4 * spd + phi) * 1.5 * a;
          sy += Math.cos(time * 0.3 * spd + phi) * 0.8 * a;
        } else if (grp === 1) {
          // Grid: subtle pulse / flicker
          sx += Math.sin(time * 0.6 + phi) * 0.3 * a;
          sy += Math.cos(time * 0.5 + phi * 1.3) * 0.3 * a;
        } else if (grp === 2) {
          // Noise: brownian drift
          sx += Math.sin(time * 0.2 * spd + phi * 3) * 2.0 * a;
          sy += Math.cos(time * 0.15 * spd + phi * 2) * 2.0 * a;
          sz += Math.sin(time * 0.1 + phi) * 1.0 * a;
        } else if (grp === 3) {
          // Circles: rotate along ring
          const angle = Math.atan2(sy, sx);
          const r = Math.sqrt(sx * sx + sy * sy);
          const newAngle = angle + time * 0.12 * spd * a;
          sx = Math.cos(newAngle) * r;
          sy = Math.sin(newAngle) * r;
        } else {
          // Bars: subtle vertical bob
          sy += Math.sin(time * 0.8 * spd + phi) * 0.6 * a;
        }
      }

      // Text target
      const tx = textPositions[i3];
      const ty = textPositions[i3 + 1];
      const tz = textPositions[i3 + 2];

      // ── Compute final target based on phase ───────────────────────

      let fx: number, fy: number, fz: number;
      let fa: number;

      if (collapse > 0.01) {
        // Collapse to singularity (spiral inward)
        const c = collapseEased;
        const spiralAngle = c * Math.PI * 6 + phi;
        const spiralR = (1 - c) * 3.0;

        fx = THREE.MathUtils.lerp(tx, 0, c) + Math.cos(spiralAngle) * spiralR * 0.25;
        fy = THREE.MathUtils.lerp(ty, 0, c) + Math.sin(spiralAngle) * spiralR * 0.25;
        fz = THREE.MathUtils.lerp(tz, -c * 15, c);
        fa = globalAlpha * (1 - fadeOut);
      } else if (converge > 0.01) {
        // Converging from scatter → text
        const m = convergeEased;

        // Per-particle stagger: particles closer to center converge first
        const dist = Math.sqrt(sx * sx + sy * sy + sz * sz);
        const maxDist = 60;
        const normalizedDist = clamp01(dist / maxDist);
        // Stagger factor: centre particles converge earlier (lower delay)
        const stagger = normalizedDist * 0.3; // up to 0.3 delay
        const particleM = clamp01((m - stagger) / (1 - stagger));
        const pm = easeInQuad(particleM);

        fx = THREE.MathUtils.lerp(sx, tx, pm);
        fy = THREE.MathUtils.lerp(sy, ty, pm);
        fz = THREE.MathUtils.lerp(sz, tz, pm);

        // Breathing overlay (grows as text forms)
        const breathe = floatAmp * 0.08;
        fx += Math.sin(time * 0.35 + phi) * breathe;
        fy += Math.cos(time * 0.28 + phi * 1.2) * breathe * 0.7;
        fz += Math.sin(time * 0.22 + phi * 0.8) * breathe * 0.3;

        // Multi-frequency organic motion
        fx += Math.sin(time * 0.13 + phi * 2.1) * breathe * 0.4;
        fy += Math.cos(time * 0.17 + phi * 1.7) * breathe * 0.3;

        fa = globalAlpha;
      } else {
        // Pure scatter phase
        fx = sx;
        fy = sy;
        fz = sz;
        fa = globalAlpha;
      }

      targetPos[i3]     = fx;
      targetPos[i3 + 1] = fy;
      targetPos[i3 + 2] = fz;
      alphaTgt[i]       = fa;
    }

    // ── Spring integration ──────────────────────────────────────────────

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      for (let a = 0; a < 3; a++) {
        const idx = i3 + a;
        const force = (targetPos[idx] - currentPos[idx]) * stiffness;
        velocity[idx] = velocity[idx] * damping + force * dt;
        currentPos[idx] += velocity[idx] * dt;
      }
      // Alpha: exponential smoothing (no overshoot) — fast to keep up with 2s timeline
      alphaCur[i] += (alphaTgt[i] - alphaCur[i]) * 0.5;
    }

    // ── Write GPU buffers ───────────────────────────────────────────────

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const alpha = Math.max(0, alphaCur[i]);

      posBuf[i3]     = currentPos[i3];
      posBuf[i3 + 1] = currentPos[i3 + 1];
      posBuf[i3 + 2] = currentPos[i3 + 2];

      // Base colour modulated by alpha
      colorBuf[i3]     = attribs.baseColor[i3]     * alpha;
      colorBuf[i3 + 1] = attribs.baseColor[i3 + 1] * alpha;
      colorBuf[i3 + 2] = attribs.baseColor[i3 + 2] * alpha;

      // Pulsing size
      const pulse = 1 + Math.sin(time * 1.5 + attribs.phase[i]) * 0.25;
      sizeBuf[i] = attribs.baseSize[i] * alpha * pulse;
    }

    // ── Upload to geometry ──────────────────────────────────────────────

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

  // ── JSX ───────────────────────────────────────────────────────────────────

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
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          size={0.08}
        />
      </points>
    </group>
  );
}
