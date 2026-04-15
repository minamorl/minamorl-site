"use client";

import { useRef, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SocialLinks from "../ui/SocialLinks";
import JobHistory from "../JobHistory";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function AboutSection3D() {
  const sectionRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const bioRef = useRef<HTMLDivElement>(null);
  const jobRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sectionRef.current) return;

    const ctx = gsap.context(() => {
      // Heading animation — no x offset to prevent mobile clipping
      if (headingRef.current) {
        gsap.fromTo(
          headingRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: headingRef.current,
              start: "top 90%",
              end: "top 50%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Bio cards stagger
      if (bioRef.current) {
        const cards = bioRef.current.querySelectorAll(".bio-card");
        gsap.fromTo(
          cards,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.15,
            ease: "power2.out",
            scrollTrigger: {
              trigger: bioRef.current,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }

      // Job history
      if (jobRef.current) {
        gsap.fromTo(
          jobRef.current,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power2.out",
            scrollTrigger: {
              trigger: jobRef.current,
              start: "top 90%",
              toggleActions: "play none none reverse",
            },
          }
        );
      }
    }, sectionRef);

    // Fallback: if ScrollTrigger hasn't fired after 2s, force all visible
    const fallbackTimer = setTimeout(() => {
      if (headingRef.current) {
        headingRef.current.style.opacity = "1";
        headingRef.current.style.transform = "none";
      }
      if (bioRef.current) {
        bioRef.current.querySelectorAll(".bio-card").forEach((el) => {
          (el as HTMLElement).style.opacity = "1";
          (el as HTMLElement).style.transform = "none";
        });
      }
      if (jobRef.current) {
        jobRef.current.style.opacity = "1";
        jobRef.current.style.transform = "none";
      }
    }, 2000);

    return () => {
      clearTimeout(fallbackTimer);
      ctx.revert();
    };
  }, []);

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative min-h-screen py-16 px-5 md:py-24 md:px-8 overflow-hidden"
      style={{
        zIndex: 10,
        position: 'relative',
        backgroundColor: '#000000',
        isolation: 'isolate',
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Section heading */}
        <h2
          ref={headingRef}
          className="text-3xl md:text-6xl font-bold mb-10 md:mb-16 tracking-tight text-left"
        >
          <span className="bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            About
          </span>
        </h2>

        {/* Bio cards */}
        <div ref={bioRef} className="space-y-4 md:space-y-6 mb-12 md:mb-20">
          <div className="bio-card group p-4 md:p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-white/[0.12] transition-all duration-500">
            <p className="text-gray-300 text-base md:text-lg leading-relaxed break-words">
              Tokyo-based software engineer focused on building{" "}
              <span className="text-white font-medium">developer tools</span>,{" "}
              <span className="text-white font-medium">infrastructure</span>, and{" "}
              <span className="text-white font-medium">web platforms</span>.
            </p>
          </div>

          <div className="bio-card group p-4 md:p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm hover:border-white/[0.12] transition-all duration-500">
            <p className="text-gray-300 text-base md:text-lg leading-relaxed break-words">
              Passionate about functional programming, type systems, and making complex systems simple.
              I believe in the power of abstraction and composability.
            </p>
          </div>

          <div className="bio-card p-4 md:p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm">
            <SocialLinks />
          </div>
        </div>

        {/* Experience */}
        <div ref={jobRef}>
          <h3 className="text-2xl md:text-3xl font-semibold mb-10 tracking-tight text-gray-200">
            Experience
          </h3>
          <JobHistory />
        </div>
      </div>
    </section>
  );
}
