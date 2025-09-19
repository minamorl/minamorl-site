import { a, useSpring } from "@react-spring/web";
import type React from "react";
import { useCallback } from "react";

const HeroSection: React.FC = () => {
  const headingSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(-140px,0,0) scaleX(0.8)" },
    to: { opacity: 1, transform: "translate3d(0px,0,0) scaleX(1)" },
    config: { tension: 140, friction: 18 },
  });

  const subheadingSpring = useSpring({
    from: { opacity: 0, transform: "translate3d(-120px,0,0)" },
    to: { opacity: 1, transform: "translate3d(0px,0,0)" },
    config: { tension: 160, friction: 20 },
    delay: 200,
  });

  const [ctaSpring, ctaApi] = useSpring(() => ({
    from: {
      opacity: 0,
      transform: "translate3d(-120px,0,0) scale(0.96)",
    },
    to: {
      opacity: 1,
      transform: "translate3d(0px,0,0) scale(1)",
    },
    config: { tension: 180, friction: 18 },
    delay: 360,
  }));

  const handleCtaClick = useCallback(() => {
    ctaApi.start({
      to: [
        {
          transform: "translate3d(0px,0,0) scale(0.9)",
          config: { tension: 500, friction: 12 },
        },
        {
          transform: "translate3d(0px,0,0) scale(1.05)",
          config: { tension: 420, friction: 10 },
        },
        {
          transform: "translate3d(0px,0,0) scale(1)",
          config: { tension: 360, friction: 16 },
        },
      ],
    });
  }, [ctaApi]);

  return (
    <section className="flex min-h-[60vh] flex-col items-start justify-center py-24">
      <a.h1
        style={headingSpring}
        className="text-left text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl"
      >
        Hi! I&apos;m <span className="text-pink-500">minamorl</span>
      </a.h1>
      <a.p
        style={subheadingSpring}
        className="mt-6 max-w-2xl text-lg text-gray-700 sm:text-xl"
      >
        Tokyo-based software engineer crafting humane products with playful
        interactions, well-tested systems, and delightful art direction.
      </a.p>
      <a.button
        style={ctaSpring}
        type="button"
        className="mt-10 inline-flex items-center gap-3 rounded-full bg-pink-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-pink-500/30 transition-all duration-300 ease-out hover:bg-pink-600 hover:scale-105 hover:shadow-xl hover:shadow-pink-500/40 active:scale-95 active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 group"
        onClick={() => {
          handleCtaClick();
          document
            .getElementById("about")
            ?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        Let&apos;s work together
        <span
          aria-hidden
          className="transition-transform duration-300 ease-out group-hover:translate-x-1"
        >
          {">"}
        </span>
      </a.button>
    </section>
  );
};

export default HeroSection;
