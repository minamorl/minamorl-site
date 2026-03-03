"use client";

import { useRef, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";

const Scene3D = dynamic(() => import("../three/Scene3D"), { ssr: false });

export default function HeroSection3D() {
  const morphProgress = useRef(0);
  const [showSubtext, setShowSubtext] = useState(false);
  const subtextRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Animate morph: particles scatter → form "minamorl"
    const tl = gsap.timeline({ delay: 0.8 });

    tl.to(morphProgress, {
      current: 1,
      duration: 2.5,
      ease: "power3.inOut",
      onUpdate: () => {
        // morphProgress is updated automatically by gsap
      },
    });

    tl.call(() => setShowSubtext(true), [], "+=0.3");

    return () => {
      tl.kill();
    };
  }, []);

  useEffect(() => {
    if (showSubtext && subtextRef.current && scrollIndicatorRef.current) {
      gsap.fromTo(
        subtextRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
      );
      gsap.fromTo(
        scrollIndicatorRef.current,
        { opacity: 0 },
        { opacity: 0.6, duration: 1, delay: 0.5, ease: "power2.out" }
      );
    }
  }, [showSubtext]);

  return (
    <section className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      {/* 3D Particle Canvas */}
      <Scene3D morphProgress={morphProgress} />

      {/* Overlay gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a] pointer-events-none z-[1]" />

      {/* Subtext overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-[2] pointer-events-none">
        {/* Spacer to push subtext below center where particles form the name */}
        <div className="h-[55vh]" />

        <div ref={subtextRef} className="opacity-0 text-center px-4">
          <p className="text-lg md:text-xl tracking-[0.3em] uppercase text-gray-400 font-light">
            Software Engineer
          </p>
          <p className="text-sm md:text-base tracking-[0.2em] text-gray-500 mt-2 font-light">
            Tokyo, Japan
          </p>
        </div>

        {/* CTA */}
        {showSubtext && (
          <div className="mt-8 pointer-events-auto">
            <a
              href="#about"
              className="group relative inline-flex items-center gap-2 px-8 py-3 text-sm tracking-[0.15em] uppercase text-white/80 border border-white/20 rounded-full overflow-hidden transition-all duration-500 hover:border-white/40 hover:text-white"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative">Explore</span>
              <svg className="relative w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        )}
      </div>

      {/* Scroll indicator */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[2] opacity-0"
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] tracking-[0.3em] uppercase text-gray-500">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-gray-500 to-transparent animate-pulse" />
        </div>
      </div>
    </section>
  );
}
