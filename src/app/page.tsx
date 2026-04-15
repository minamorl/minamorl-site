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
  const heroRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const subtextRef = useRef<HTMLDivElement>(null);
  const [showSubtext, setShowSubtext] = useState(false);

  // Genesis animation timeline (2 seconds)
  useEffect(() => {
    const tl = gsap.timeline({ delay: 0 });

    tl.to(progress, {
      current: 0.075,
      duration: 0.15,
      ease: "power1.inOut",
    });

    tl.to(progress, {
      current: 0.175,
      duration: 0.20,
      ease: "power1.inOut",
    });

    tl.to(progress, {
      current: 0.575,
      duration: 1.15,
      ease: "power2.in",
    });

    tl.to(progress, {
      current: 0.675,
      duration: 0.20,
      ease: "power2.out",
    });

    tl.call(() => setShowSubtext(true), [], "-=0.15");

    tl.to(progress, {
      current: 0.72,
      duration: 0.15,
      ease: "sine.inOut",
    });

    return () => { tl.kill(); };
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

  // Scroll-driven collapse
  useEffect(() => {
    if (!endRef.current) return;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: endRef.current,
        start: "top 80%",
        end: "bottom bottom",
        scrub: 1,
        onUpdate: (self) => {
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
        className="relative w-full h-screen"
        style={{
          zIndex: 1,
          position: 'relative',
          overflow: 'hidden',
          contain: 'paint',
        }}
      >
        <GenesisCanvas progress={progress} />

        {/* Subtext overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 md:pb-32 z-[5] pointer-events-none">
          <div ref={subtextRef} className="opacity-0 text-center px-4">
            <p className="text-base md:text-xl tracking-[0.3em] uppercase text-white/40 font-light">
              Software Engineer
            </p>
            <p className="text-xs md:text-base tracking-[0.2em] text-white/25 mt-2 font-light">
              Tokyo, Japan
            </p>
          </div>
        </div>

        {/* Scroll hint */}
        {showSubtext && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[5] animate-pulse">
            <div className="flex flex-col items-center gap-2">
              <span className="text-[10px] tracking-[0.3em] uppercase text-white/20">
                Scroll
              </span>
              <div className="w-px h-6 bg-gradient-to-b from-white/20 to-transparent" />
            </div>
          </div>
        )}
      </section>

      {/* ===== CONTENT ===== */}
      <AboutSection3D />

      {/* ===== ENDING: Collapse trigger ===== */}
      <section
        ref={endRef}
        className="relative h-[60vh]"
        style={{ zIndex: 10, position: 'relative', backgroundColor: '#000000' }}
        aria-hidden="true"
      />
    </main>
  );
}
