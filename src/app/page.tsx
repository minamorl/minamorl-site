"use client";

import HeroSection3D from "@/components/sections/HeroSection3D";
import AboutSection3D from "@/components/sections/AboutSection3D";

export default function HomePage() {
  return (
    <main className="bg-[#0a0a0a] text-white min-h-screen w-full overflow-x-hidden">
      <HeroSection3D />
      <AboutSection3D />

      {/* Footer */}
      <footer className="relative py-12 text-center border-t border-white/[0.06]">
        <p className="text-gray-500 text-sm tracking-wider">
          &copy; {new Date().getFullYear()} minamorl
        </p>
      </footer>
    </main>
  );
}
