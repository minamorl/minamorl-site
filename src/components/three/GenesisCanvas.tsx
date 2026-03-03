"use client";

import { Suspense, useRef, useCallback, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Noise,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import GenesisScene from "./GenesisScene";

interface GenesisCanvasProps {
  progress: React.MutableRefObject<number>;
}

export default function GenesisCanvas({ progress }: GenesisCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 12], fov: 75 }}
        dpr={[1, 2]}
        gl={{
          antialias: false,
          alpha: false,
          powerPreference: "high-performance",
        }}
        style={{ background: "#000000" }}
      >
        <Suspense fallback={null}>
          <color attach="background" args={["#000000"]} />
          <GenesisScene progress={progress} text="minamorl" />
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.1}
              luminanceSmoothing={0.9}
              intensity={1.8}
              mipmapBlur
            />
            <Noise
              blendFunction={BlendFunction.SOFT_LIGHT}
              opacity={0.08}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
