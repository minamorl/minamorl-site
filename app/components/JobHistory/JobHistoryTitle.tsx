import React from 'react';

const JobHistoryTitle: React.FC<React.PropsWithChildren> = ({children}) => (
  <h3 className="text-xl font-semibold text-gray-800">
    {children}
  </h3>
);

export default JobHistoryTitle;
