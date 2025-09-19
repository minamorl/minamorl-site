import type { MetaFunction } from "@remix-run/node";
import type React from "react";
import { useCallback } from "react";
import { a, useSpring } from "@react-spring/web";
import JobHistory from "~/components/JobHistory";

export const meta: MetaFunction = () => {
  return [
    { title: "minamorl" },
    { name: "description", content: "minamorl's portoflio site" },
  ];
};

const GitHubLink = () => <img src="logos/github.png" alt="GitHub" width="70" />;
const LinkedinLink = () => <img src="/svg/linkedin.svg" alt="LinkedIn Icon" width="70" />;


export default function Index() {
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
    <div className="flex flex-col min-h-screen bg-gray-100 relative w-full">
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-pink-500 text-white px-4 py-2 rounded-md z-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      {/* Background Sketch Images */}
      <div className="absolute top-0 left-0 w-full h-full">
        <img
          src="background.png"
          alt="Background"
          className="w-full h-full object-cover opacity-50"
        />
      </div>

      {/* Main Content */}
      <div id="main-content" className="relative z-10 w-full max-w-screen-xl mx-auto px-4 text-left">
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
          <a.a
            style={ctaSpring}
            href="#about"
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-pink-500 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-pink-500/30 transition-all duration-300 ease-out hover:bg-pink-600 hover:scale-105 hover:shadow-xl hover:shadow-pink-500/40 active:scale-95 active:duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 group"
            onClick={handleCtaClick}
          >
            Let&apos;s work together
            <span 
              aria-hidden 
              className="transition-transform duration-300 ease-out group-hover:translate-x-1"
            >
              {">"}
            </span>
          </a.a>
        </section>

        <h2 
          id="about" 
          className="text-left text-2xl lg:text-4xl font-bold text-gray-600 transition-colors duration-300 ease-out hover:text-gray-800"
        >
          Who are you?
        </h2>

        <div className="mt-6 space-y-4 text-left">
          <Chat>
            <p>
              Hi! I&apos;m Shuji Iwata, also known as @minamorl.
            </p>
          </Chat>
          <Chat>
            <p>I&apos;m a software engineer based in Tokyo, Japan.</p>
            <p>
              I <strong>love</strong> coding, reading, and drawing.
            </p>
          </Chat>
          <Chat>
            <p>Here&apos;s some links for my socials:</p>
                <div className="my-1">
                  <a href="https://github.com/minamorl" className="m-4">
                    <GitHubLink />
                  </a>
                </div>
                <div className="my-1">
                  <a href="https://www.linkedin.com/in/shuji-iwata-3110b235a/">
                  <LinkedinLink />
                </a>
              </div>
          </Chat>
          <JobHistory />
        </div>
      </div>
      <footer>
        <div className="text-center text-gray-500 text-sm py-4">
          <p>© 2025 minamorl</p>
        </div>
      </footer>
    </div>
  );
}

const Chat: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="border-2 flex items-center space-x-4 rounded-xl bg-white px-4 py-8 ">
    <img src="avatar.png" alt="Avatar" className="w-8 h-8 rounded-full" />
    <div className="text-lg font-medium text-gray-700">{children}</div>
  </div>
);
