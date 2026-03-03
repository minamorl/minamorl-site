import type { MetaFunction } from "@remix-run/node";
import BackgroundImage from "~/components/layout/BackgroundImage";
import Footer from "~/components/layout/Footer";
import SkipToContent from "~/components/layout/SkipToContent";
import AboutSection from "~/components/sections/AboutSection";
import HeroSection from "~/components/sections/HeroSection";

export const meta: MetaFunction = () => {
  return [
    { title: "minamorl" },
    { name: "description", content: "minamorl's portoflio site" },
  ];
};

export default function Index() {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 relative w-full">
      <SkipToContent />
      <BackgroundImage />

      {/* Main Content */}
      <div
        id="main-content"
        className="relative z-10 w-full max-w-screen-xl mx-auto px-4 text-left"
      >
        <HeroSection />
        <AboutSection />
      </div>
      <Footer />
    </div>
  );
}
