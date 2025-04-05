
import { Link } from "@remix-run/react";
import type React from "react";
export const JobHistoryUnit: React.FC<React.PropsWithChildren> = ({ children }) => (
      <div className="border-2 flex flex-col space-y-2 rounded-xl bg-white px-4 py-4">
        {children}
      </div>
    )

export const JobHistoryList: React.FC<React.PropsWithChildren> = ({children}) =>(
        <ul className="list-disc ml-8 text-gray-700">
        {children}
        </ul>
)
export const JobHistoryTitle: React.FC<React.PropsWithChildren> = ({children}) => (
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

export default JobHistory;
