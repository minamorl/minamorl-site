"use client";

import { Suspense, useRef, useEffect, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom, ChromaticAberration, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import ParticleField from "./ParticleField";

interface Scene3DProps {
  morphProgress: React.MutableRefObject<number>;
}

export default function Scene3D({ morphProgress }: Scene3DProps) {
  const mousePosition = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mousePosition.current.x = (e.clientX / window.innerWidth) * 2 - 1;
    mousePosition.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        dpr={[1, 2]}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.5} />
          <ParticleField
            count={12000}
            text="minamorl"
            mousePosition={mousePosition}
            morphProgress={morphProgress}
          />
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.2}
              luminanceSmoothing={0.9}
              intensity={1.5}
              mipmapBlur
            />
            <ChromaticAberration
              blendFunction={BlendFunction.NORMAL}
              offset={[0.0008, 0.0008] as any}
            />
            <Noise
              blendFunction={BlendFunction.SOFT_LIGHT}
              opacity={0.15}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
