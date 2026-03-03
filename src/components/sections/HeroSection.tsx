"use client";

import type React from "react";
import { useCallback } from "react";
import { Button } from "@minamorl/root-ui";

const HeroSection: React.FC = () => {
  const handleCtaClick = useCallback(() => {
    // Keep behavior (scroll) but animation is CSS-driven now.
    document.getElementById("about")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <section className="flex min-h-[60vh] flex-col items-start justify-center py-24">
      <h1 className="hero-heading-in text-left text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
        Hi! I&apos;m <span className="text-pink-500">minamorl</span>
      </h1>
      <p className="hero-subheading-in mt-6 max-w-2xl text-lg text-gray-700 sm:text-xl">
        Tokyo-based software engineer crafting humane products with playful
        interactions, well-tested systems, and delightful art direction.
      </p>
      <Button
        variant="primary"
        className="hero-cta-in mt-10 inline-flex items-center gap-3 rounded-full bg-pink-500 transition-all duration-300 ease-out hover:bg-pink-600 hover:scale-105 hover:shadow-xl hover:shadow-pink-500/40 active:scale-95 active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 group border-none"
        style={{
          backgroundColor: "#ec4899",
          color: "white",
          padding: "1.25rem 2.5rem",
          fontSize: "1.25rem",
          fontWeight: "700",
          borderRadius: "9999px",
          border: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.75rem",
          boxShadow: "0 10px 15px -3px rgba(236, 72, 153, 0.3)",
        }}
        onClick={() => {
          handleCtaClick();
        }}
      >
        <span>Let&apos;s work together</span>
        <span
          aria-hidden
          className="transition-transform duration-300 ease-out group-hover:translate-x-1"
        >
          {">"}
        </span>
      </Button>
    </section>
  );
};

export default HeroSection;
