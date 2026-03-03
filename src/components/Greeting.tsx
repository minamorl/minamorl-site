import type React from "react";
import { FormTitle } from "@minamorl/root-ui";

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
  // biome-ignore lint/suspicious/noExplicitAny: library types are unions of FC and function
  const Title = FormTitle as any;

  return (
    <Title
      as="h1"
      className={`text-left text-6xl lg:text-8xl font-bold ${className} py-20`}
    >
      <span className={open ? "opacity-100" : "opacity-0"}>
        {textParts.map((t, i) => (
          <span
            key={`${t}-${i}`}
            className={[
              "inline-block transition-opacity duration-500",
              i === textParts.length - 1
                ? "text-pink-400 hover:text-pink-600"
                : "",
            ].join(" ")}
          >
            {t}
            {i === 0 ? <br /> : i !== textParts.length - 1 ? " " : null}
          </span>
        ))}
      </span>
    </Title>
  );
};

export default Greeting;
