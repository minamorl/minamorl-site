import type React from "react";
import JobHistory from "@/components/JobHistory";
import Chat from "@/components/ui/Chat";
import SocialLinks from "@/components/ui/SocialLinks";
import { FormTitle } from "@minamorl/root-ui";

const AboutSection: React.FC = () => {
  // biome-ignore lint/suspicious/noExplicitAny: library types are unions of FC and function
  const Title = FormTitle as any;

  return (
    <>
      <Title
        id="about"
        as="h2"
        className="text-left text-2xl lg:text-4xl font-bold text-gray-600 transition-colors duration-300 ease-out hover:text-gray-800"
      >
        Who are you?
      </Title>

      <div className="mt-6 space-y-4 text-left">
        <Chat>
          <p>Hi! I&apos;m Shuji Iwata, also known as @minamorl.</p>
        </Chat>
        <Chat>
          <p>I&apos;m a software engineer based in Tokyo, Japan.</p>
          <p>
            I <strong>love</strong> coding, reading, and drawing.
          </p>
        </Chat>
        <Chat>
          <p>Here&apos;s some links for my socials:</p>
          <SocialLinks />
        </Chat>
        <JobHistory />
      </div>
    </>
  );
};

export default AboutSection;
