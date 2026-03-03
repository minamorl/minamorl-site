"use client";

import { useRef, useMemo, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * GenesisScene: The dimension-genesis sequence
 * 
 * BLACK → dot → 2 dots → SNAP triangle → mesh proliferation (dripping liquid)
 * → floating network → singularity convergence → BLACK
 * 
 * All driven by a single `progress` ref (0..1)
 */

interface GenesisSceneProps {
  progress: React.MutableRefObject<number>;
  text?: string;
}

// Phase thresholds
const PHASE = {
  BLACK_IN: 0,         // 0.00 - 0.05: pure black
  DOT_ONE: 0.05,       // 0.05 - 0.12: single dot fades in
  DOT_TWO: 0.12,       // 0.12 - 0.20: second dot appears, line flickers
  TRIANGLE: 0.20,      // 0.20 - 0.22: SNAP - triangle forms (instant)
  MESH_GROW: 0.22,     // 0.22 - 0.50: mesh proliferates, dripping liquid
  LOGO_FORM: 0.50,     // 0.50 - 0.65: mesh converges into logo at vanishing point
  FLOAT: 0.65,         // 0.65 - 0.85: floating state, gentle breathing
  COLLAPSE: 0.85,      // 0.85 - 0.95: collapse to singularity
  BLACK_OUT: 0.95,     // 0.95 - 1.00: fade to black
};

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Generate text positions using canvas
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
  ctx.font = `bold ${Math.floor(height * 0.4)}px "Inter", system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

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
  const scale = 10;

  for (let i = 0; i < count; i++) {
    if (whitePixels.length > 0) {
      const [px, py] =
        whitePixels[Math.floor(Math.random() * whitePixels.length)];
      positions[i * 3] =
        (px / width - 0.5) * scale * aspect +
        (Math.random() - 0.5) * 0.06;
      positions[i * 3 + 1] =
        -(py / height - 0.5) * scale + (Math.random() - 0.5) * 0.06;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
  }

  return positions;
}

// Delaunay-like triangle mesh generation
// Generates triangles that grow outward from a seed point
function generateMeshTopology(maxTriangles: number, seed: number = 42) {
  const vertices: [number, number, number][] = [];
  const triangles: [number, number, number][] = [];

  // Seed triangle
  const r0 = 1.2;
  vertices.push([0, r0, 0]);
  vertices.push([-r0 * 0.866, -r0 * 0.5, 0]);
  vertices.push([r0 * 0.866, -r0 * 0.5, 0]);
  triangles.push([0, 1, 2]);

  // Grow outward
  let rng = seed;
  const pseudoRandom = () => {
    rng = (rng * 16807 + 0) % 2147483647;
    return rng / 2147483647;
  };

  for (let i = 0; i < maxTriangles - 1; i++) {
    // Pick a random edge from existing triangles
    const triIdx = Math.floor(pseudoRandom() * triangles.length);
    const tri = triangles[triIdx];
    const edgeStart = Math.floor(pseudoRandom() * 3);
    const a = tri[edgeStart];
    const b = tri[(edgeStart + 1) % 3];

    // Create new vertex away from the edge
    const mx = (vertices[a][0] + vertices[b][0]) / 2;
    const my = (vertices[a][1] + vertices[b][1]) / 2;
    const mz = (vertices[a][2] + vertices[b][2]) / 2;

    const dx = vertices[b][0] - vertices[a][0];
    const dy = vertices[b][1] - vertices[a][1];

    // Normal direction + outward push + z variation (dripping)
    const len = Math.sqrt(dx * dx + dy * dy) || 0.01;
    const nx = -dy / len;
    const ny = dx / len;
    const push = 0.4 + pseudoRandom() * 0.8;
    const drip = -pseudoRandom() * 0.3; // gravity-like z drip

    const newVert: [number, number, number] = [
      mx + nx * push + (pseudoRandom() - 0.5) * 0.3,
      my + ny * push + (pseudoRandom() - 0.5) * 0.3,
      mz + drip,
    ];

    const newIdx = vertices.length;
    vertices.push(newVert);
    triangles.push([a, b, newIdx]);
  }

  return { vertices, triangles };
}

const MAX_PARTICLES = 10000;
const MAX_TRIANGLES = 200;

export default function GenesisScene({
  progress,
  text = "minamorl",
}: GenesisSceneProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  const { viewport } = useThree();

  // Generate mesh topology once
  const meshData = useMemo(
    () => generateMeshTopology(MAX_TRIANGLES),
    []
  );

  // Text target positions
  const textPositions = useMemo(() => {
    if (typeof document === "undefined") return new Float32Array(MAX_PARTICLES * 3);
    return generateTextPositions(text, MAX_PARTICLES, 512, 128);
  }, [text]);

  // Per-particle random data
  const particleData = useMemo(() => {
    const phases = new Float32Array(MAX_PARTICLES);
    const speeds = new Float32Array(MAX_PARTICLES);
    const meshAssignment = new Float32Array(MAX_PARTICLES); // which vertex
    for (let i = 0; i < MAX_PARTICLES; i++) {
      phases[i] = Math.random() * Math.PI * 2;
      speeds[i] = 0.3 + Math.random() * 0.7;
      meshAssignment[i] = Math.floor(
        Math.random() * meshData.vertices.length
      );
    }
    return { phases, speeds, meshAssignment };
  }, [meshData]);

  // Singularity point (vanishing point with perspective)
  const singularity = useMemo(() => new THREE.Vector3(0, 0, -25), []);

  // Buffers
  const positionBuffer = useMemo(
    () => new Float32Array(MAX_PARTICLES * 3),
    []
  );
  const colorBuffer = useMemo(
    () => new Float32Array(MAX_PARTICLES * 3),
    []
  );
  const sizeBuffer = useMemo(
    () => new Float32Array(MAX_PARTICLES),
    []
  );

  // Line buffer for triangle edges
  const linePositionBuffer = useMemo(
    () => new Float32Array(MAX_TRIANGLES * 3 * 6),
    [] // 3 edges * 2 vertices * 3 coords
  );
  const lineColorBuffer = useMemo(
    () => new Float32Array(MAX_TRIANGLES * 3 * 6),
    []
  );

  useFrame((state) => {
    if (!pointsRef.current || !linesRef.current) return;

    const time = state.clock.elapsedTime;
    const p = progress.current;

    // --- Compute sub-progresses for each phase ---
    const dotOneAlpha = smoothstep(PHASE.BLACK_IN, PHASE.DOT_ONE + 0.03, p);
    const dotTwoAlpha = smoothstep(PHASE.DOT_ONE, PHASE.DOT_TWO, p);
    const triangleSnap = p >= PHASE.TRIANGLE ? 1 : 0; // instant
    const meshGrowth = smoothstep(PHASE.TRIANGLE, PHASE.MESH_GROW, p);
    const logoMorph = smoothstep(PHASE.MESH_GROW, PHASE.LOGO_FORM, p);
    const floatPhase = smoothstep(PHASE.LOGO_FORM, PHASE.FLOAT, p);
    const collapsePhase = smoothstep(PHASE.FLOAT + 0.1, PHASE.COLLAPSE, p);
    const blackOut = smoothstep(PHASE.COLLAPSE, PHASE.BLACK_OUT, p);

    // Global opacity (fade in from black, fade out to black)
    const globalAlpha =
      smoothstep(PHASE.BLACK_IN, PHASE.DOT_ONE, p) *
      (1 - smoothstep(PHASE.COLLAPSE + 0.05, PHASE.BLACK_OUT, p));

    // Number of active mesh triangles
    const activeTriangles = Math.floor(
      meshGrowth * MAX_TRIANGLES * triangleSnap
    );

    // Number of active mesh vertices
    const activeVertexCount = Math.min(
      meshData.vertices.length,
      activeTriangles > 0
        ? Math.max(
            3,
            ...meshData.triangles
              .slice(0, activeTriangles)
              .flat()
              .map((v) => v + 1)
          )
        : triangleSnap * 3
    );

    // --- Update particles ---
    let visibleCount = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const i3 = i * 3;
      const phase = particleData.phases[i];
      const speed = particleData.speeds[i];
      const vertIdx = particleData.meshAssignment[i] % Math.max(1, activeVertexCount);

      let x = 0,
        y = 0,
        z = 0;
      let alpha = 0;
      let size = 0;

      if (p < PHASE.DOT_ONE + 0.03) {
        // Phase: single dot (converge all particles to center)
        if (i < 100) {
          const jitter = (1 - dotOneAlpha) * 5;
          x = (Math.sin(phase) * jitter) * 0.01;
          y = (Math.cos(phase) * jitter) * 0.01;
          z = 0;
          alpha = dotOneAlpha;
          size = 2.0 + Math.sin(time * 3 + phase) * 0.5;
        }
      } else if (p < PHASE.TRIANGLE) {
        // Phase: two dots
        if (i < 100) {
          const side = i < 50 ? -1 : 1;
          const spread = dotTwoAlpha * 2.5;
          x = side * spread + Math.sin(time * 2 + phase) * 0.05;
          y = Math.cos(time * 1.5 + phase) * 0.05;
          z = 0;
          alpha = 1;
          size = 2.0;
        } else if (i < 120) {
          // Faint line particles between the two dots
          const t = (i - 100) / 20;
          x = THREE.MathUtils.lerp(-dotTwoAlpha * 2.5, dotTwoAlpha * 2.5, t);
          y = Math.sin(time * 4 + t * 10) * 0.02;
          z = 0;
          alpha = dotTwoAlpha * 0.3;
          size = 1.0;
        }
      } else if (logoMorph < 0.1) {
        // Phase: triangle + mesh growth
        if (vertIdx < activeVertexCount && i < activeVertexCount * 40) {
          const vert = meshData.vertices[vertIdx];
          const jitter = Math.max(0, 1 - meshGrowth * 1.5);

          // Dripping liquid effect: particles fall slightly then snap
          const dripOffset =
            Math.sin(time * 2 + phase) * 0.1 * (1 - meshGrowth);
          const liquidStretch =
            Math.abs(Math.sin(time * 0.5 + vertIdx)) * 0.3 * meshGrowth;

          x = vert[0] + Math.sin(phase) * jitter * 0.3;
          y =
            vert[1] +
            Math.cos(phase) * jitter * 0.3 -
            dripOffset -
            liquidStretch;
          z = vert[2] + Math.sin(time + phase) * 0.15;
          alpha = globalAlpha;
          size = 1.5 + Math.sin(time * 2 + phase) * 0.3;

          // Floating / breathing
          x += Math.sin(time * 0.4 + phase) * 0.08;
          y += Math.cos(time * 0.3 + phase * 1.3) * 0.06;
        }
      } else if (collapsePhase < 0.05) {
        // Phase: morph to logo text
        const meshVert =
          vertIdx < meshData.vertices.length
            ? meshData.vertices[vertIdx]
            : [0, 0, 0];
        const textX = textPositions[i3];
        const textY = textPositions[i3 + 1];
        const textZ = textPositions[i3 + 2];

        const m = easeOutExpo(logoMorph);

        // From mesh position to text position
        x = THREE.MathUtils.lerp(meshVert[0], textX, m);
        y = THREE.MathUtils.lerp(meshVert[1], textY, m);
        z = THREE.MathUtils.lerp(meshVert[2] || 0, textZ, m);

        // Floating breathing in logo state
        const breathe = floatPhase * 0.5;
        x += Math.sin(time * 0.3 + phase) * breathe * 0.15;
        y += Math.cos(time * 0.25 + phase * 1.2) * breathe * 0.1;

        alpha = globalAlpha;
        size = 1.2 + Math.sin(time * 1.5 + phase) * 0.2;

        if (textX === 0 && textY === 0 && textZ === 0 && i > 500) {
          alpha = 0; // hide particles that didn't get text positions
        }
      } else {
        // Phase: collapse to singularity
        const textX = textPositions[i3];
        const textY = textPositions[i3 + 1];
        const textZ = textPositions[i3 + 2];

        const c = easeOutExpo(collapsePhase);

        x = THREE.MathUtils.lerp(textX, singularity.x, c);
        y = THREE.MathUtils.lerp(textY, singularity.y, c);
        z = THREE.MathUtils.lerp(textZ, singularity.z, c);

        // Spiral into singularity
        const spiralAngle = c * Math.PI * 4 + phase;
        const spiralRadius = (1 - c) * 2;
        x += Math.cos(spiralAngle) * spiralRadius * 0.3;
        y += Math.sin(spiralAngle) * spiralRadius * 0.3;

        alpha = globalAlpha * (1 - blackOut);
        size = (1 - c) * 1.5;
      }

      positionBuffer[i3] = x;
      positionBuffer[i3 + 1] = y;
      positionBuffer[i3 + 2] = z;

      // White with slight blue tint, fading with alpha
      const brightness = alpha * globalAlpha;
      colorBuffer[i3] = brightness * 0.9;
      colorBuffer[i3 + 1] = brightness * 0.93;
      colorBuffer[i3 + 2] = brightness * 1.0;

      sizeBuffer[i] = size * alpha;

      if (alpha > 0.01) visibleCount = i + 1;
    }

    // Update point geometry
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
    pointGeo.setDrawRange(0, visibleCount);

    // --- Update triangle wireframe lines ---
    let lineIdx = 0;
    const lineAlpha =
      triangleSnap *
      globalAlpha *
      Math.max(0, 1 - logoMorph * 1.5) *
      0.4;

    for (let t = 0; t < activeTriangles && t < meshData.triangles.length; t++) {
      const tri = meshData.triangles[t];
      for (let e = 0; e < 3; e++) {
        const a = tri[e];
        const b = tri[(e + 1) % 3];
        if (a < meshData.vertices.length && b < meshData.vertices.length) {
          const va = meshData.vertices[a];
          const vb = meshData.vertices[b];
          const li = lineIdx * 3;

          linePositionBuffer[li] = va[0];
          linePositionBuffer[li + 1] = va[1];
          linePositionBuffer[li + 2] = va[2];
          linePositionBuffer[li + 3] = vb[0];
          linePositionBuffer[li + 4] = vb[1];
          linePositionBuffer[li + 5] = vb[2];

          // Edge brightness: newer triangles are brighter (liquid front)
          const edgeBrightness =
            lineAlpha * (0.3 + 0.7 * (t / Math.max(1, activeTriangles)));
          for (let c = 0; c < 6; c++) {
            lineColorBuffer[lineIdx * 3 + c] = edgeBrightness * (c % 3 === 2 ? 1 : 0.85);
          }
          lineIdx += 2;
        }
      }
    }

    const lineGeo = linesRef.current.geometry;
    const linePosAttr = lineGeo.getAttribute("position") as THREE.BufferAttribute;
    const lineColAttr = lineGeo.getAttribute("color") as THREE.BufferAttribute;
    linePosAttr.set(linePositionBuffer);
    linePosAttr.needsUpdate = true;
    lineColAttr.set(lineColorBuffer);
    lineColAttr.needsUpdate = true;
    lineGeo.setDrawRange(0, lineIdx);
  });

  return (
    <group>
      {/* Particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={MAX_PARTICLES}
            array={positionBuffer}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={MAX_PARTICLES}
            array={colorBuffer}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            count={MAX_PARTICLES}
            array={sizeBuffer}
            itemSize={1}
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
            count={MAX_TRIANGLES * 6}
            array={linePositionBuffer}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            count={MAX_TRIANGLES * 6}
            array={lineColorBuffer}
            itemSize={3}
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
