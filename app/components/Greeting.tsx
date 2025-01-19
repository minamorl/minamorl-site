import { a, useTrail } from "@react-spring/web";
import type React from "react";

interface GreetingProps {
  open: boolean;
  textParts: string[];
  className?: string;
}

const Greeting: React.FC<GreetingProps> = ({
  open,
  textParts,
  className = "",
}) => {
  const trail = useTrail(textParts.length, {
    config: { mass: 5, tension: 2000, friction: 200 },
    opacity: open ? 1 : 0,
    x: open ? 0 : 20,
    from: { opacity: 0, x: 20 },
  });

  return (
    <h1
      className={`text-left text-6xl lg:text-8xl font-bold ${className} py-20`}
    >
      {trail.map((style, index) =>
        index === 0 ? (
          // add break line after Hi!
          <div key={index}>
            <a.span
              key={index}
              style={{
                ...style,
                transform: style.x.to((x) => `translate3d(0,${x}px,0)`),
                display: "inline-block",
                marginRight: "0.5rem", // Adjust spacing between parts
              }}
            >
              {textParts[index]}
            </a.span>
            <br />
          </div>
        ) : index !== textParts.length - 1 ? (
          <a.span
            key={index}
            style={{
              ...style,
              transform: style.x.to((x) => `translate3d(0,${x}px,0)`),
              display: "inline-block",
              marginRight: "0.5rem", // Adjust spacing between parts
            }}
          >
            {textParts[index]}
          </a.span>
        ) : (
          <a.span
            key={index}
            style={{
              ...style,
              transform: style.x.to((x) => `translate3d(0,${x}px,0)`),
              display: "inline-block",
            }}
            className="text-pink-400 hover:text-pink-600"
          >
            {textParts[index]}
          </a.span>
        ),
      )}
    </h1>
  );
};

export default Greeting;
