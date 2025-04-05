import type { MetaFunction } from "@remix-run/node";
import { Link } from "@remix-run/react";
import type React from "react";
import { useState } from "react";
import Greeting from "~/components/Greeting";

export const meta: MetaFunction = () => {
  return [
    { title: "minamorl" },
    { name: "description", content: "minamorl's portoflio site" },
  ];
};

const GitHubLink = () => <img src="logos/github.png" alt="GitHub" width="50" />;

const JobHistoryUnit: React.FC<React.PropsWithChildren> = ({ children }) => (
      <div className="border-2 flex flex-col space-y-2 rounded-xl bg-white px-4 py-4">
        {children}
      </div>
    )

const JobHistoryList: React.FC<React.PropsWithChildren> = ({children}) =>(
        <ul className="list-disc ml-8 text-gray-700">
        {children}
        </ul>
)
const JobHistoryTitle: React.FC<React.PropsWithChildren> = ({children}) => (
  <h3 className="text-xl font-semibold text-gray-800">
    {children}
  </h3>
)
const JobHistory = () => (
  <div className="relative z-10 text-left w-full max-w-screen-xl mx-auto px-4 my-8">
    <h2 className="text-2xl lg:text-4xl font-bold text-gray-600">Professional Experience</h2>
    <div className="mt-6 space-y-4">
      <JobHistoryUnit>
        <JobHistoryTitle><Link to={'https://axianext.io/'}>axianext</Link></JobHistoryTitle>
        <p className="text-gray-700">
          <strong>Role:</strong> Tech Lead / Organizer<br />
          <strong>Duration:</strong> May 2025 - <br />
          <strong>Key Achievements:</strong>
        </p>
        <JobHistoryList>
          <li>Led the development of the global team axianext</li>
          <li>Designed all workflows, including schedule managiment, an issue tracker, etc.</li>
          <li>Making a crawler system</li>
        </JobHistoryList>
      </JobHistoryUnit>
      <JobHistoryUnit>
        <JobHistoryTitle>合同会社Trishula</JobHistoryTitle>
        <p className="text-gray-700">
          <strong>Role:</strong> CTO<br />
          <strong>Duration:</strong> September 2021 - January 2023<br />
          <strong>Key Achievements:</strong>
        </p>
        <JobHistoryList>
          <li>Led the development of a Reddit-like meta-internet platform.</li>
          <li>Designed workflows and operated systems across all domains.</li>
          <li>Implemented backend with TypeScript, Next.js, and Rust.</li>
        </JobHistoryList>
      </JobHistoryUnit>
      <JobHistoryUnit>
        <JobHistoryTitle>株式会社クラスドゥ</JobHistoryTitle>
        <p className="text-gray-700">
          <strong>Role:</strong> Full-stack Engineer &amp; Data Scientist<br />
          <strong>Duration:</strong> September 2020 - September 2021<br />
          <strong>Key Achievements:</strong>
        </p>
        <JobHistoryList>
          <li>Enhanced canvas rendering and stroke prediction in the frontend.</li>
          <li>Improved PDF export processes for better efficiency.</li>
        </JobHistoryList>
      </JobHistoryUnit>
    </div>
  </div>
);

export default function Index() {
  const [open] = useState(true);
  return (
    <div className="flex flex-col min-h-screen bg-gray-100 relative w-full">
      {/* Background Sketch Images */}
      <div className="absolute top-0 left-0 w-full h-full">
        <img
          src="background.png"
          alt="Background"
          className="w-full h-full object-cover opacity-50"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center w-full max-w-screen-xl mx-auto px-4">
        <Greeting
          open={open}
          textParts={["Hi!", "I'm", "minamorl"]}
          className="text-gray-800"
        />
        <h2 className="text-left text-2xl lg:text-4xl font-bold text-gray-600">
          Who are you?
        </h2>

        <div className="mt-6 space-y-4 text-left">
          <Chat>
            <p>
              Hi! I&apos;m Shuji Iwata, also known as @minamorl.
            </p>
          </Chat>
          <Chat>
            <p>I'm a software engineer based in Tokyo, Japan.</p>
            <p>
              I <strong>love</strong> coding, reading, and drawing.
            </p>
          </Chat>
          <Chat>
            <p>Here's some links for my socials:</p>
            <ul className="py-4 align-baseline	">
              <li className="m-2 h-4">
                <a href="https://github.com/minamorl">
                  <GitHubLink />
                </a>
              </li>
            </ul>
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
