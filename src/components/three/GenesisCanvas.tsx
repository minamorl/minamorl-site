"use client";

import { Suspense, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import GenesisScene from "./GenesisScene";

interface GenesisCanvasProps {
  progress: React.MutableRefObject<number>;
}

export default function GenesisCanvas({ progress }: GenesisCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <Canvas
        camera={{ position: [0, 0, 30], fov: 45 }}
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
        </Suspense>
      </Canvas>
    </div>
  );
}
