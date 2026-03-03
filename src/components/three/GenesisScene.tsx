"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GenesisScene: The dimension-genesis sequence
 *
 * BLACK → dot → 2 dots → SNAP triangle → mesh proliferation (dripping liquid)
 * → floating network → logo morph → float/breathe → collapse → BLACK
 *
 * Architecture: Target + Spring physics system
 * Every particle has currentPos, targetPos, velocity.
 * Each frame: compute target from progress, apply spring forces.
 * Result: C¹-continuous motion everywhere except the deliberate triangle SNAP.
 */

interface GenesisSceneProps {
  progress: React.MutableRefObject<number>;
  text?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_PARTICLES = 9000;
const MAX_TRIANGLES = 200;
const MAX_LINE_VERTS = MAX_TRIANGLES * 6; // 3 edges × 2 endpoints

// Spring presets
const SPRING_DEFAULT = { stiffness: 4.0, damping: 0.85 };
const SPRING_SNAP = { stiffness: 50.0, damping: 0.7 };
const SPRING_SOFT = { stiffness: 1.5, damping: 0.92 };
const SPRING_COLLAPSE = { stiffness: 3.0, damping: 0.80 };

// Phase boundaries (progress 0→1)
const P = {
  BLACK_START: 0.0,
  DOT_ONE_START: 0.05,
  DOT_TWO_START: 0.15,
  TRIANGLE_SNAP: 0.25,
  MESH_GROW_END: 0.55,
  LOGO_MORPH_END: 0.72,
  FLOAT_END: 0.85,
  BLACK_END: 1.0,
};

// ─── Utility functions ──────────────────────────────────────────────────────

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

// Seeded pseudo-random for deterministic mesh generation
function createRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

// ─── Text position generation via Canvas 2D ─────────────────────────────────

function generateTextPositions(
  text: string,
  count: number,
  canvasW: number,
  canvasH: number
): Float32Array {
  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${Math.floor(canvasH * 0.38)}px "Inter", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvasW / 2, canvasH / 2);

  const imageData = ctx.getImageData(0, 0, canvasW, canvasH);
  const pixels = imageData.data;

  // Collect white pixel coordinates
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
  const scale = 10;

  if (whitePixels.length === 0) return positions;

  for (let i = 0; i < count; i++) {
    const [px, py] = whitePixels[Math.floor(Math.random() * whitePixels.length)];
    positions[i * 3] =
      (px / canvasW - 0.5) * scale * aspect + (Math.random() - 0.5) * 0.05;
    positions[i * 3 + 1] =
      -(py / canvasH - 0.5) * scale + (Math.random() - 0.5) * 0.05;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.6;
  }

  return positions;
}

// ─── Mesh topology generation ───────────────────────────────────────────────
// Grows triangles outward from a seed triangle, with a "dripping" downward bias

function generateMeshTopology(maxTriangles: number, seed: number = 42) {
  const vertices: [number, number, number][] = [];
  const triangles: [number, number, number][] = [];
  const rand = createRng(seed);

  // Seed triangle (equilateral, with z-depth)
  const r0 = 1.2;
  vertices.push([0, r0, 0.5]);
  vertices.push([-r0 * 0.866, -r0 * 0.5, -0.3]);
  vertices.push([r0 * 0.866, -r0 * 0.5, -0.2]);
  triangles.push([0, 1, 2]);

  for (let i = 1; i < maxTriangles; i++) {
    // Pick a random edge from existing triangles
    const triIdx = Math.floor(rand() * triangles.length);
    const tri = triangles[triIdx];
    const edgeStart = Math.floor(rand() * 3);
    const a = tri[edgeStart];
    const b = tri[(edgeStart + 1) % 3];

    const mx = (vertices[a][0] + vertices[b][0]) / 2;
    const my = (vertices[a][1] + vertices[b][1]) / 2;
    const mz = (vertices[a][2] + vertices[b][2]) / 2;

    const dx = vertices[b][0] - vertices[a][0];
    const dy = vertices[b][1] - vertices[a][1];
    const len = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const nx = -dy / len;
    const ny = dx / len;

    const push = 0.6 + rand() * 1.2;
    const zSpread = (rand() - 0.5) * 2.5; // ±2.5 in z for real 3D depth
    const drip = -rand() * 0.5; // gravity still pulls down

    const newVert: [number, number, number] = [
      mx + nx * push + (rand() - 0.5) * 0.5,
      my + ny * push + (rand() - 0.5) * 0.5,
      mz + zSpread + drip,
    ];

    vertices.push(newVert);
    triangles.push([a, b, vertices.length - 1]);
  }

  return { vertices, triangles };
}

// ─── Bezier interpolation ───────────────────────────────────────────────────

function bezierPoint(points: THREE.Vector3[], t: number): THREE.Vector3 {
  if (points.length === 1) return points[0].clone();
  const newPoints: THREE.Vector3[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    newPoints.push(new THREE.Vector3().lerpVectors(points[i], points[i + 1], t));
  }
  return bezierPoint(newPoints, t);
}

// ─── CameraRig ──────────────────────────────────────────────────────────────

function CameraRig({ progress }: { progress: React.MutableRefObject<number> }) {
  const { camera } = useThree();

  // Spring state refs (mutable, no re-render)
  const currentCamPos = useRef(new THREE.Vector3(0, 0, 30));
  const currentCamTarget = useRef(new THREE.Vector3(0, 0, 0));
  const currentFov = useRef(45);
  const currentRoll = useRef(0);

  const velPos = useRef(new THREE.Vector3(0, 0, 0));
  const velTarget = useRef(new THREE.Vector3(0, 0, 0));
  const velFov = useRef(0);
  const velRoll = useRef(0);

  const prevProgressRef = useRef(0);

  // Pre-allocate flight path control points
  const flightPath = useMemo(
    () => [
      new THREE.Vector3(3, -2, 8),
      new THREE.Vector3(6, 1, 5),
      new THREE.Vector3(2, 4, 3),
      new THREE.Vector3(-3, 2, 6),
      new THREE.Vector3(-1, 0, 8),
    ],
    []
  );

  // Seeded shake RNG
  const shakeRng = useMemo(() => createRng(7777), []);

  useFrame((state, delta) => {
    const p = progress.current;
    const dt = Math.min(delta, 0.05);
    const time = state.clock.elapsedTime;

    const prevP = prevProgressRef.current;
    prevProgressRef.current = p;

    // ── Compute target camera state based on progress ─────────────────────

    let targetPos = new THREE.Vector3(0, 0, 30);
    let targetLookAt = new THREE.Vector3(0, 0, 0);
    let targetFov = 45;
    let targetRoll = 0;
    let stiffness = 3.0;
    let damping = 0.88;

    if (p < P.DOT_ONE_START) {
      // Phase 1: BLACK → DOT — far away in darkness
      targetPos.set(0, 0, 30);
      targetFov = 45;
      stiffness = 2.0;
      damping = 0.92;
    } else if (p < P.DOT_TWO_START) {
      // Phase 2: DOT ONE — camera pulls in
      const t = smoothstep(P.DOT_ONE_START, P.DOT_TWO_START, p);
      targetPos.set(0, 0, THREE.MathUtils.lerp(18, 14, t));
      targetFov = THREE.MathUtils.lerp(50, 60, t);
      stiffness = 3.0;
      damping = 0.88;
    } else if (p < P.TRIANGLE_SNAP) {
      // Phase 3: DOT TWO → TRIANGLE SNAP — camera swoops down and to side
      const t = smoothstep(P.DOT_TWO_START, P.TRIANGLE_SNAP, p);
      targetPos.set(
        THREE.MathUtils.lerp(0, 2, t),
        THREE.MathUtils.lerp(0, -1, t),
        THREE.MathUtils.lerp(14, 10, t)
      );
      targetFov = THREE.MathUtils.lerp(60, 65, t);
      stiffness = 3.5;
      damping = 0.86;
    } else if (p < P.MESH_GROW_END) {
      // Phase 4: MESH GROWTH — fly-through 3D space (KEY PHASE)
      const meshT = smoothstep(P.TRIANGLE_SNAP, P.MESH_GROW_END, p);

      // At the very start of this phase (snap moment), use high stiffness
      if (p < P.TRIANGLE_SNAP + 0.02) {
        stiffness = 40.0;
        damping = 0.7;
      } else {
        stiffness = 2.5;
        damping = 0.90;
      }

      // Fly-through along bezier path
      const pathPos = bezierPoint(flightPath, meshT);
      targetPos.copy(pathPos);

      // FOV widens dramatically for strong perspective
      targetFov = THREE.MathUtils.lerp(70, 88, Math.sin(meshT * Math.PI));

      // Camera roll for immersion: subtle oscillation
      targetRoll = Math.sin(meshT * Math.PI * 2.5) * 0.06;

      // LookAt leads slightly ahead of the flight path
      const lookAheadT = Math.min(1, meshT + 0.08);
      const lookAheadPos = bezierPoint(flightPath, lookAheadT);
      // Blend between origin and look-ahead direction
      const lookBlend = smoothstep(0, 0.15, meshT) * (1 - smoothstep(0.85, 1.0, meshT));
      targetLookAt.set(
        THREE.MathUtils.lerp(0, lookAheadPos.x * 0.3, lookBlend),
        THREE.MathUtils.lerp(0, lookAheadPos.y * 0.3, lookBlend),
        THREE.MathUtils.lerp(0, lookAheadPos.z * 0.2, lookBlend)
      );

      // Subtle camera shake during mesh growth
      const shakeIntensity = 0.04 * Math.sin(meshT * Math.PI); // peaks in middle
      targetPos.x += Math.sin(time * 17.3) * shakeIntensity;
      targetPos.y += Math.cos(time * 13.7) * shakeIntensity;
      targetPos.z += Math.sin(time * 11.1) * shakeIntensity * 0.5;
    } else if (p < P.LOGO_MORPH_END) {
      // Phase 5: LOGO MORPH — pull back to front-facing
      const t = smoothstep(P.MESH_GROW_END, P.LOGO_MORPH_END, p);
      const tEased = easeOutExpo(t);

      // Smoothly return from last flight path point to front view
      const lastFlightPos = flightPath[flightPath.length - 1];
      targetPos.set(
        THREE.MathUtils.lerp(lastFlightPos.x, 0, tEased),
        THREE.MathUtils.lerp(lastFlightPos.y, 0, tEased),
        THREE.MathUtils.lerp(lastFlightPos.z, 12, tEased)
      );
      targetFov = THREE.MathUtils.lerp(80, 75, tEased);
      targetRoll = THREE.MathUtils.lerp(0.04, 0, tEased); // return roll to 0
      targetLookAt.set(0, 0, 0);
      stiffness = 3.0;
      damping = 0.88;
    } else if (p < P.FLOAT_END) {
      // Phase 6: FLOAT — gentle breathing oscillation
      const breatheT = smoothstep(P.LOGO_MORPH_END, P.FLOAT_END, p);
      targetPos.set(
        Math.sin(time * 0.25) * 0.15,
        Math.cos(time * 0.18) * 0.1,
        12 + Math.sin(time * 0.3) * 0.08
      );
      targetFov = 75;
      targetLookAt.set(0, 0, 0);
      stiffness = 1.5;
      damping = 0.93;
    } else {
      // Phase 7: COLLAPSE → BLACK — dolly into singularity
      const t = smoothstep(P.FLOAT_END, P.BLACK_END - 0.03, p);
      const tEased = easeInQuad(t);
      targetPos.set(0, 0, THREE.MathUtils.lerp(12, 2, tEased));
      targetFov = THREE.MathUtils.lerp(75, 120, tEased); // vertigo dolly-zoom
      targetLookAt.set(0, 0, THREE.MathUtils.lerp(0, -5, tEased));
      stiffness = 3.0;
      damping = 0.85;
    }

    // ── Apply spring physics to camera position ───────────────────────────

    const forcePos = new THREE.Vector3(
      (targetPos.x - currentCamPos.current.x) * stiffness,
      (targetPos.y - currentCamPos.current.y) * stiffness,
      (targetPos.z - currentCamPos.current.z) * stiffness
    );
    velPos.current.multiplyScalar(damping).add(forcePos.multiplyScalar(dt));
    currentCamPos.current.add(velPos.current.clone().multiplyScalar(dt));

    // Spring physics for lookAt target
    const forceLook = new THREE.Vector3(
      (targetLookAt.x - currentCamTarget.current.x) * stiffness,
      (targetLookAt.y - currentCamTarget.current.y) * stiffness,
      (targetLookAt.z - currentCamTarget.current.z) * stiffness
    );
    velTarget.current.multiplyScalar(damping).add(forceLook.multiplyScalar(dt));
    currentCamTarget.current.add(velTarget.current.clone().multiplyScalar(dt));

    // Spring physics for FOV
    const forceFov = (targetFov - currentFov.current) * stiffness;
    velFov.current = velFov.current * damping + forceFov * dt;
    currentFov.current += velFov.current * dt;

    // Spring physics for roll
    const forceRoll = (targetRoll - currentRoll.current) * stiffness;
    velRoll.current = velRoll.current * damping + forceRoll * dt;
    currentRoll.current += velRoll.current * dt;

    // ── Handle triangle snap — teleport camera for instant feel ───────────

    if (prevP < P.TRIANGLE_SNAP && p >= P.TRIANGLE_SNAP) {
      currentCamPos.current.set(3, -2, 8);
      velPos.current.set(0, 0, 0);
      currentCamTarget.current.set(0, 0, 0);
      velTarget.current.set(0, 0, 0);
      currentFov.current = 70;
      velFov.current = 0;
      currentRoll.current = 0;
      velRoll.current = 0;
    }

    // ── Apply to THREE.js camera ──────────────────────────────────────────

    camera.position.copy(currentCamPos.current);
    camera.lookAt(currentCamTarget.current);

    // Apply roll (rotation around the camera's local z-axis, AFTER lookAt)
    if (Math.abs(currentRoll.current) > 0.0001) {
      camera.rotateZ(currentRoll.current);
    }

    // Apply FOV
    const perspCam = camera as THREE.PerspectiveCamera;
    if (Math.abs(perspCam.fov - currentFov.current) > 0.01) {
      perspCam.fov = currentFov.current;
      perspCam.updateProjectionMatrix();
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
  const linesRef = useRef<THREE.LineSegments>(null);
  const { viewport } = useThree();

  // ── Pre-computed data (stable across frames) ──────────────────────────────

  const meshData = useMemo(() => generateMeshTopology(MAX_TRIANGLES), []);

  const textPositions = useMemo(() => {
    if (typeof document === "undefined") return new Float32Array(MAX_PARTICLES * 3);
    return generateTextPositions(text, MAX_PARTICLES, 512, 128);
  }, [text]);

  // Per-particle random attributes (deterministic per particle index)
  const particleRandom = useMemo(() => {
    const rng = createRng(12345);
    const phaseOffset = new Float32Array(MAX_PARTICLES);
    const speed = new Float32Array(MAX_PARTICLES);
    const meshVertexIdx = new Int32Array(MAX_PARTICLES); // which mesh vertex this particle orbits
    const orbitRadius = new Float32Array(MAX_PARTICLES);
    const orbitPhase = new Float32Array(MAX_PARTICLES);
    const fadeInDelay = new Float32Array(MAX_PARTICLES); // stagger fade-in

    for (let i = 0; i < MAX_PARTICLES; i++) {
      phaseOffset[i] = rng() * Math.PI * 2;
      speed[i] = 0.3 + rng() * 0.7;
      meshVertexIdx[i] = Math.floor(rng() * meshData.vertices.length);
      orbitRadius[i] = 0.01 + rng() * 0.12;
      orbitPhase[i] = rng() * Math.PI * 2;
      fadeInDelay[i] = rng() * 0.5; // 0 to 0.5 delay
    }
    return { phaseOffset, speed, meshVertexIdx, orbitRadius, orbitPhase, fadeInDelay };
  }, [meshData]);

  // ── Simulation state (mutable refs, NOT re-allocated per frame) ───────────

  // Particle spring state
  const currentPos = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const targetPos = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const velocityArr = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const alphaTarget = useMemo(() => new Float32Array(MAX_PARTICLES), []);
  const alphaCurrent = useMemo(() => new Float32Array(MAX_PARTICLES), []);

  // Line spring state: line endpoints animated
  const lineCurrentPos = useMemo(() => new Float32Array(MAX_LINE_VERTS * 3), []);
  const lineTargetPos = useMemo(() => new Float32Array(MAX_LINE_VERTS * 3), []);
  const lineVelocity = useMemo(() => new Float32Array(MAX_LINE_VERTS * 3), []);
  const lineAlphaTarget = useMemo(() => new Float32Array(MAX_LINE_VERTS), []);
  const lineAlphaCurrent = useMemo(() => new Float32Array(MAX_LINE_VERTS), []);

  // Output buffers (written to GPU each frame)
  const positionBuffer = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const colorBuffer = useMemo(() => new Float32Array(MAX_PARTICLES * 3), []);
  const sizeBuffer = useMemo(() => new Float32Array(MAX_PARTICLES), []);
  const linePositionBuffer = useMemo(() => new Float32Array(MAX_LINE_VERTS * 3), []);
  const lineColorBuffer = useMemo(() => new Float32Array(MAX_LINE_VERTS * 3), []);

  // Track previous progress to detect the triangle snap discontinuity
  const prevProgressRef = useRef(0);

  // ── Main animation loop ───────────────────────────────────────────────────

  useFrame((state, delta) => {
    if (!pointsRef.current || !linesRef.current) return;

    const time = state.clock.elapsedTime;
    const p = progress.current;
    const dt = Math.min(delta, 0.05); // cap delta to prevent explosion on tab-switch

    const prevP = prevProgressRef.current;
    prevProgressRef.current = p;

    // ── Phase sub-progresses (all smooth 0→1) ─────────────────────────────

    // Fade in from black
    const fadeIn = smoothstep(P.BLACK_START, P.DOT_ONE_START + 0.03, p);
    // Dot one presence
    const dotOne = smoothstep(P.BLACK_START + 0.03, P.DOT_ONE_START + 0.02, p);
    // Dot two presence
    const dotTwo = smoothstep(P.DOT_ONE_START, P.DOT_TWO_START, p);
    // Triangle snap: binary, instant
    const triSnap = p >= P.TRIANGLE_SNAP ? 1.0 : 0.0;
    // Mesh growth: 0 at snap, 1 at end of mesh phase
    const meshGrowth = smoothstep(P.TRIANGLE_SNAP, P.MESH_GROW_END, p);
    // Logo morph: 0 at mesh end, 1 at logo end
    const logoMorph = smoothstep(P.MESH_GROW_END, P.LOGO_MORPH_END, p);
    const logoMorphEased = easeOutExpo(logoMorph);
    // Float/breathe amplitude
    const floatAmp = smoothstep(P.LOGO_MORPH_END - 0.05, P.FLOAT_END, p);
    // Collapse: 0 at float end, 1 at black end
    const collapse = smoothstep(P.FLOAT_END, P.BLACK_END - 0.03, p);
    const collapseEased = easeInQuad(collapse);
    // Fade out to black
    const fadeOut = smoothstep(P.FLOAT_END + 0.05, P.BLACK_END, p);

    // Global alpha envelope
    const globalAlpha = fadeIn * (1.0 - fadeOut);

    // Detect triangle snap crossing
    const justSnapped = prevP < P.TRIANGLE_SNAP && p >= P.TRIANGLE_SNAP;

    // Choose spring constants based on current phase
    let spring = SPRING_DEFAULT;
    if (justSnapped || (p >= P.TRIANGLE_SNAP && p < P.TRIANGLE_SNAP + 0.01)) {
      spring = SPRING_SNAP;
    } else if (floatAmp > 0.5 && collapse < 0.1) {
      spring = SPRING_SOFT;
    } else if (collapse > 0.1) {
      spring = SPRING_COLLAPSE;
    }

    // ── Number of active mesh structures ────────────────────────────────────

    const activeTriCount = triSnap > 0
      ? Math.max(1, Math.floor(meshGrowth * MAX_TRIANGLES))
      : 0;

    // Compute max vertex index referenced by active triangles
    let maxVertIdx = 0;
    if (activeTriCount > 0) {
      for (let t = 0; t < activeTriCount; t++) {
        const tri = meshData.triangles[t];
        if (tri[0] > maxVertIdx) maxVertIdx = tri[0];
        if (tri[1] > maxVertIdx) maxVertIdx = tri[1];
        if (tri[2] > maxVertIdx) maxVertIdx = tri[2];
      }
      maxVertIdx += 1; // count
    }

    // ── Compute targets for all particles ───────────────────────────────────

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const phi = particleRandom.phaseOffset[i];
      const spd = particleRandom.speed[i];
      const orbR = particleRandom.orbitRadius[i];
      const orbP = particleRandom.orbitPhase[i];
      const fadeDelay = particleRandom.fadeInDelay[i];
      const rawVIdx = particleRandom.meshVertexIdx[i];
      const vIdx = maxVertIdx > 0 ? rawVIdx % maxVertIdx : 0;

      let tx = 0, ty = 0, tz = 0;
      let tAlpha = 0;

      // ── Layer 1: Pre-triangle phases (dot one, dot two) ─────────────

      if (p < P.TRIANGLE_SNAP) {
        // Before triangle snap: particles cluster at center / two dots

        if (dotTwo > 0.01) {
          // Two-dot phase: split left/right
          const side = i % 2 === 0 ? -1.0 : 1.0;
          const spread = dotTwo * 2.5;

          if (i < 200) {
            // Cluster particles on the two dots
            tx = side * spread;
            ty = 0;
            tz = 0;
            // Tiny orbit around dot position
            tx += Math.sin(time * 1.5 * spd + phi) * 0.04;
            ty += Math.cos(time * 1.2 * spd + phi) * 0.04;
            const staggeredFadeIn = smoothstep(
              P.BLACK_START + fadeDelay * 0.5,
              P.DOT_ONE_START + 0.02 + fadeDelay * 0.3,
              p
            );
            tAlpha = staggeredFadeIn * globalAlpha;
          } else if (i < 240) {
            // Line particles connecting the two dots
            const lineT = (i - 200) / 40.0;
            tx = THREE.MathUtils.lerp(-spread, spread, lineT);
            ty = Math.sin(time * 3 + lineT * 8) * 0.015;
            tz = 0;
            tAlpha = dotTwo * 0.3 * globalAlpha;
          }
          // All other particles: tx=ty=tz=0, tAlpha=0 (stay hidden at origin)
        } else if (dotOne > 0.01) {
          // Single dot phase
          if (i < 200) {
            tx = Math.sin(phi) * 0.02;
            ty = Math.cos(phi) * 0.02;
            tz = 0;
            const staggeredFadeIn = smoothstep(
              P.BLACK_START + fadeDelay * 0.5,
              P.DOT_ONE_START + 0.02 + fadeDelay * 0.3,
              p
            );
            tAlpha = staggeredFadeIn * globalAlpha;
          }
        }
      }

      // ── Layer 2: Post-triangle: mesh growth phase ─────────────────

      else if (logoMorph < 0.01) {
        // Pure mesh phase: particles orbit their assigned mesh vertex
        if (vIdx < maxVertIdx && maxVertIdx > 0) {
          const vert = meshData.vertices[vIdx];

          // "Dripping liquid" effect: new vertices start above and fall
          // The vertex activation progress: how "new" this vertex is
          // Vertices activated later get a falling entrance
          const vertActivation = clamp01(
            (meshGrowth * meshData.vertices.length - vIdx) / 3.0
          );

          // Gravity drip: starts high, settles to final position
          const dripHeight = (1 - vertActivation) * 2.5;

          tx = vert[0] + Math.sin(time * spd + orbP) * orbR;
          ty = vert[1] + dripHeight + Math.cos(time * spd * 0.8 + orbP) * orbR;
          tz = vert[2] + Math.sin(time * 0.5 + phi) * orbR * 0.5;

          // Global breathing (subtle, always on)
          tx += Math.sin(time * 0.4 + phi) * 0.06;
          ty += Math.cos(time * 0.3 + phi * 1.3) * 0.04;

          // Staggered fade-in: particles for later vertices appear later
          const particleFadeIn = smoothstep(0, 0.7, vertActivation);
          // Limit how many particles per vertex are shown during early growth
          const particlesPerVert = Math.floor(MAX_PARTICLES / Math.max(1, meshData.vertices.length));
          const localIdx = Math.floor(i / Math.max(1, maxVertIdx));
          const localFade = localIdx < particlesPerVert * clamp01(vertActivation * 1.5) ? 1.0 : 0.0;

          tAlpha = particleFadeIn * localFade * globalAlpha;
        }
      }

      // ── Layer 3: Logo morph phase ─────────────────────────────────

      else if (collapse < 0.01) {
        // Blend from mesh vertex position to text position
        const vert = vIdx < meshData.vertices.length ? meshData.vertices[vIdx] : [0, 0, 0];
        const textX = textPositions[i3];
        const textY = textPositions[i3 + 1];
        const textZ = textPositions[i3 + 2];

        const m = logoMorphEased;

        tx = THREE.MathUtils.lerp(vert[0], textX, m);
        ty = THREE.MathUtils.lerp(vert[1], textY, m);
        tz = THREE.MathUtils.lerp(vert[2] || 0, textZ, m);

        // Breathing increases as we enter float phase
        const breatheScale = 0.08 * floatAmp;
        tx += Math.sin(time * 0.35 + phi) * breatheScale;
        ty += Math.cos(time * 0.28 + phi * 1.2) * breatheScale * 0.7;
        tz += Math.sin(time * 0.22 + phi * 0.8) * breatheScale * 0.3;

        // Multi-frequency breathing for organic feel
        tx += Math.sin(time * 0.13 + phi * 2.1) * breatheScale * 0.4;
        ty += Math.cos(time * 0.17 + phi * 1.7) * breatheScale * 0.3;

        // Particles without valid text positions fade out
        const hasTextPos = !(textX === 0 && textY === 0 && textZ === 0);
        tAlpha = globalAlpha * (hasTextPos || i < 500 ? 1.0 : clamp01(1.0 - m));
      }

      // ── Layer 4: Collapse to singularity ──────────────────────────

      else {
        const textX = textPositions[i3];
        const textY = textPositions[i3 + 1];
        const textZ = textPositions[i3 + 2];

        const c = collapseEased;

        // Spiral parameters
        const spiralAngle = c * Math.PI * 6 + phi;
        const spiralRadius = (1 - c) * 3.0;

        // Converge toward origin (singularity)
        tx = THREE.MathUtils.lerp(textX, 0, c) + Math.cos(spiralAngle) * spiralRadius * 0.25;
        ty = THREE.MathUtils.lerp(textY, 0, c) + Math.sin(spiralAngle) * spiralRadius * 0.25;
        tz = THREE.MathUtils.lerp(textZ, -c * 15, c);

        tAlpha = globalAlpha * (1 - fadeOut);
      }

      targetPos[i3] = tx;
      targetPos[i3 + 1] = ty;
      targetPos[i3 + 2] = tz;
      alphaTarget[i] = tAlpha;
    }

    // ── Apply spring physics to particles ───────────────────────────────────

    const stiffness = spring.stiffness;
    const damping = spring.damping;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;

      // Spring force: F = (target - current) * stiffness
      // Velocity update: v = v * damping + F * dt
      // Position update: p += v * dt

      for (let axis = 0; axis < 3; axis++) {
        const idx = i3 + axis;
        const force = (targetPos[idx] - currentPos[idx]) * stiffness;
        velocityArr[idx] = velocityArr[idx] * damping + force * dt;
        currentPos[idx] += velocityArr[idx] * dt;
      }

      // Alpha uses simple exponential smoothing (no spring overshoot wanted)
      const alphaSmooth = 0.08; // lower = smoother
      alphaCurrent[i] += (alphaTarget[i] - alphaCurrent[i]) * alphaSmooth;
    }

    // If we just crossed the triangle snap, teleport all particles
    if (justSnapped) {
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const i3 = i * 3;
        // Force current = target for instant snap feel
        currentPos[i3] = targetPos[i3];
        currentPos[i3 + 1] = targetPos[i3 + 1];
        currentPos[i3 + 2] = targetPos[i3 + 2];
        velocityArr[i3] = 0;
        velocityArr[i3 + 1] = 0;
        velocityArr[i3 + 2] = 0;
      }
    }

    // ── Write particle output buffers ───────────────────────────────────────

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const a = Math.max(0, alphaCurrent[i]);

      positionBuffer[i3] = currentPos[i3];
      positionBuffer[i3 + 1] = currentPos[i3 + 1];
      positionBuffer[i3 + 2] = currentPos[i3 + 2];

      // White with slight blue tint
      colorBuffer[i3] = a * 0.88;
      colorBuffer[i3 + 1] = a * 0.92;
      colorBuffer[i3 + 2] = a * 1.0;

      sizeBuffer[i] = a * (1.2 + Math.sin(time * 1.5 + particleRandom.phaseOffset[i]) * 0.25);
    }

    // ── Update point geometry ───────────────────────────────────────────────

    const pointGeo = pointsRef.current.geometry;
    const posAttr = pointGeo.getAttribute("position") as THREE.BufferAttribute;
    const colAttr = pointGeo.getAttribute("color") as THREE.BufferAttribute;
    const sizeAttr = pointGeo.getAttribute("size") as THREE.BufferAttribute;

    posAttr.set(positionBuffer);
    posAttr.needsUpdate = true;
    colAttr.set(colorBuffer);
    colAttr.needsUpdate = true;
    sizeAttr.set(sizeBuffer);
    sizeAttr.needsUpdate = true;
    pointGeo.setDrawRange(0, MAX_PARTICLES);

    // ── Compute line targets (wireframe edges) ──────────────────────────────

    // Reset line targets
    lineTargetPos.fill(0);
    lineAlphaTarget.fill(0);

    let lineVertCount = 0;

    if (triSnap > 0) {
      // Wireframe alpha fades out as logo morph progresses
      const wireAlphaEnvelope = globalAlpha * clamp01(1.0 - logoMorph * 1.8) * 0.5;

      for (let t = 0; t < activeTriCount && t < meshData.triangles.length; t++) {
        const tri = meshData.triangles[t];

        // How "grown in" is this triangle? Smooth fade
        const triFraction = activeTriCount > 1
          ? clamp01((activeTriCount - t) / Math.max(1, activeTriCount * 0.15))
          : 1.0;

        for (let e = 0; e < 3; e++) {
          const aIdx = tri[e];
          const bIdx = tri[(e + 1) % 3];
          if (aIdx >= meshData.vertices.length || bIdx >= meshData.vertices.length) continue;

          const va = meshData.vertices[aIdx];
          const vb = meshData.vertices[bIdx];

          const li = lineVertCount * 3;

          // Edge grows from midpoint outward (0 length → full length)
          const mx = (va[0] + vb[0]) * 0.5;
          const my = (va[1] + vb[1]) * 0.5;
          const mz = (va[2] + vb[2]) * 0.5;

          // Interpolate endpoints from midpoint to actual vertex positions
          const edgeGrow = clamp01(triFraction);

          lineTargetPos[li] = THREE.MathUtils.lerp(mx, va[0], edgeGrow);
          lineTargetPos[li + 1] = THREE.MathUtils.lerp(my, va[1], edgeGrow);
          lineTargetPos[li + 2] = THREE.MathUtils.lerp(mz, va[2], edgeGrow);
          lineTargetPos[li + 3] = THREE.MathUtils.lerp(mx, vb[0], edgeGrow);
          lineTargetPos[li + 4] = THREE.MathUtils.lerp(my, vb[1], edgeGrow);
          lineTargetPos[li + 5] = THREE.MathUtils.lerp(mz, vb[2], edgeGrow);

          // Edge alpha: newer edges are brighter
          const edgeBrightness = 0.3 + 0.7 * (t / Math.max(1, activeTriCount));
          const edgeAlpha = wireAlphaEnvelope * edgeBrightness * edgeGrow;

          lineAlphaTarget[lineVertCount] = edgeAlpha;
          lineAlphaTarget[lineVertCount + 1] = edgeAlpha;

          lineVertCount += 2;
          if (lineVertCount >= MAX_LINE_VERTS) break;
        }
        if (lineVertCount >= MAX_LINE_VERTS) break;
      }
    }

    // ── Apply spring physics to lines ───────────────────────────────────────

    // Use the same spring as particles but slightly stiffer for geometry
    const lineStiffness = spring.stiffness * 1.2;
    const lineDamping = spring.damping;

    for (let i = 0; i < MAX_LINE_VERTS; i++) {
      const i3 = i * 3;
      for (let axis = 0; axis < 3; axis++) {
        const idx = i3 + axis;
        const force = (lineTargetPos[idx] - lineCurrentPos[idx]) * lineStiffness;
        lineVelocity[idx] = lineVelocity[idx] * lineDamping + force * dt;
        lineCurrentPos[idx] += lineVelocity[idx] * dt;
      }
      // Smooth alpha for lines (both active and fading-out)
      lineAlphaCurrent[i] += (lineAlphaTarget[i] - lineAlphaCurrent[i]) * 0.1;
    }

    // If triangle just snapped, teleport line positions too
    if (justSnapped) {
      for (let i = 0; i < lineVertCount; i++) {
        const i3 = i * 3;
        lineCurrentPos[i3] = lineTargetPos[i3];
        lineCurrentPos[i3 + 1] = lineTargetPos[i3 + 1];
        lineCurrentPos[i3 + 2] = lineTargetPos[i3 + 2];
        lineVelocity[i3] = 0;
        lineVelocity[i3 + 1] = 0;
        lineVelocity[i3 + 2] = 0;
        lineAlphaCurrent[i] = lineAlphaTarget[i];
      }
    }

    // ── Write line output buffers ───────────────────────────────────────────

    for (let i = 0; i < MAX_LINE_VERTS; i++) {
      const i3 = i * 3;
      const a = Math.max(0, lineAlphaCurrent[i]);

      linePositionBuffer[i3] = lineCurrentPos[i3];
      linePositionBuffer[i3 + 1] = lineCurrentPos[i3 + 1];
      linePositionBuffer[i3 + 2] = lineCurrentPos[i3 + 2];

      lineColorBuffer[i3] = a * 0.85;
      lineColorBuffer[i3 + 1] = a * 0.90;
      lineColorBuffer[i3 + 2] = a * 1.0;
    }

    // ── Update line geometry ────────────────────────────────────────────────

    const lineGeo = linesRef.current.geometry;
    const linePosAttr = lineGeo.getAttribute("position") as THREE.BufferAttribute;
    const lineColAttr = lineGeo.getAttribute("color") as THREE.BufferAttribute;

    linePosAttr.set(linePositionBuffer);
    linePosAttr.needsUpdate = true;
    lineColAttr.set(lineColorBuffer);
    lineColAttr.needsUpdate = true;
    lineGeo.setDrawRange(0, MAX_LINE_VERTS);
  });

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <group>
      {/* Camera animation rig */}
      <CameraRig progress={progress} />

      {/* Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positionBuffer, 3]}
            count={MAX_PARTICLES}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colorBuffer, 3]}
            count={MAX_PARTICLES}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[sizeBuffer, 1]}
            count={MAX_PARTICLES}
          />
        </bufferGeometry>
        <pointsMaterial
          vertexColors
          sizeAttenuation
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          size={0.06}
        />
      </points>

      {/* Triangle wireframe lines */}
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositionBuffer, 3]}
            count={MAX_LINE_VERTS}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[lineColorBuffer, 3]}
            count={MAX_LINE_VERTS}
          />
        </bufferGeometry>
        <lineBasicMaterial
          vertexColors
          transparent
          opacity={0.6}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
