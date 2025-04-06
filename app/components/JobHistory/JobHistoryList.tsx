import React from 'react';

const JobHistoryList: React.FC<React.PropsWithChildren> = ({children}) =>(
        <ul className="list-disc ml-8 text-gray-700">
        {children}
        </ul>
);

export default JobHistoryList;
