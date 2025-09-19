import type React from "react";

const JobHistoryUnit: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="border-2 flex flex-col space-y-2 rounded-xl bg-white px-4 py-4 transition-all duration-300 ease-out hover:shadow-md hover:border-gray-300 hover:-translate-y-1">
    {children}
  </div>
);

export default JobHistoryUnit;
