import React from 'react';

const JobHistoryUnit: React.FC<React.PropsWithChildren> = ({ children }) => (
      <div className="border-2 flex flex-col space-y-2 rounded-xl bg-white px-4 py-4">
        {children}
      </div>
    );

export default JobHistoryUnit;
