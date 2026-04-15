"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import AboutSection3D from "@/components/sections/AboutSection3D";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const GenesisCanvas = dynamic(
  () => import("@/components/three/GenesisCanvas"),
  { ssr: false }
);

export default function HomePage() {
  const progress = useRef(0);
  const [phase, setPhase] = useState<"genesis" | "site" | "ending">("genesis");
  const heroRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const subtextRef = useRef<HTMLDivElement>(null);
  const [showSubtext, setShowSubtext] = useState(false);

  // Genesis animation timeline
  // Total: 2 seconds — everything happens FAST
  // Phase map (progress → time):
  //   0.000–0.075  Cut 1: Wide establishing (0.15s)
  //   0.075–0.175  Cut 2: Diagonal hard cut (0.20s)
  //   0.175–0.575  Cut 3: Convergence rush (1.15s)
  //   0.575–0.675  Cut 4: Pull-back reveal (0.20s)
  //   0.675–0.720  Cut 5: Float + subtitle (0.30s)
  //   0.720–1.000  Cut 6: Collapse (scroll-driven)
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0 });

    // Cut 1: Wide establishing shot (0.15s)
    tl.to(progress, {
      current: 0.075,
      duration: 0.15,
      ease: "power1.inOut",
    });

    // Cut 2: Diagonal slash hard cut (0.20s)
    tl.to(progress, {
      current: 0.175,
      duration: 0.20,
      ease: "power1.inOut",
    });

    // Cut 3: Convergence rush — x² easing, camera dives into text (1.15s)
    tl.to(progress, {
      current: 0.575,
      duration: 1.15,
      ease: "power2.in",
    });

    // Cut 4: Pull-back reveal (0.20s)
    tl.to(progress, {
      current: 0.675,
      duration: 0.20,
      ease: "power2.out",
    });

    // Show subtext at start of pull-back
    tl.call(() => setShowSubtext(true), [], "-=0.15");

    // Cut 5: Float / breathe (0.15s)
    tl.to(progress, {
      current: 0.72,
      duration: 0.15,
      ease: "sine.inOut",
    });

    return () => {
      tl.kill();
    };
  }, []);

  // Subtext fade-in
  useEffect(() => {
    if (showSubtext && subtextRef.current) {
      gsap.fromTo(
        subtextRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" }
      );
    }
  }, [showSubtext]);

  // Scroll-driven collapse: 0.60 → 1.0
  useEffect(() => {
    if (!endRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: endRef.current,
        start: "top 80%",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
          // Map scroll progress to collapse phase (0.72 → 1.0)
          progress.current = 0.72 + self.progress * 0.28;
        },
      });
    });

    return () => ctx.revert();
  }, []);

  return (
    <main className="bg-black text-white min-h-screen w-full overflow-x-hidden">
      {/* ===== HERO: Genesis sequence ===== */}
      <section
        ref={heroRef}
        className="relative w-full h-screen overflow-hidden"
        style={{ zIndex: 0, position: 'relative' }}
      >
        <GenesisCanvas progress={progress} />

        {/* Subtext overlay — appears after logo forms */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-32 z-[2] pointer-events-none">
          <div ref={subtextRef} className="opacity-0 text-center px-4">
            <p className="text-lg md:text-xl tracking-[0.3em] uppercase text-white/40 font-light">
              Software Engineer
            </p>
            <p className="text-sm md:text-base tracking-[0.2em] text-white/25 mt-2 font-light">
              Tokyo, Japan
            </p>
          </div>
        </div>

        {/* Scroll hint */}
        {showSubtext && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] animate-pulse">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] tracking-[0.3em] uppercase text-white/20">
                Scroll
              </span>
              <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
            </div>
          </div>
        )}
      </section>

      {/* ===== CONTENT ===== */}
      <AboutSection3D />

      {/* ===== ENDING: Collapse to BLACK ===== */}
      <section
        ref={endRef}
        className="relative h-[60vh]"
        style={{ zIndex: 2, position: 'relative' }}
        aria-hidden="true"
      >
        {/* This empty space triggers the scroll-driven collapse.
            The genesis canvas is fixed-position, so it's still visible.
            As the user scrolls through here, the mesh collapses to singularity
            and fades to black. The background IS black, so it's seamless. */}
      </section>
    </main>
  );
}
