import type React from "react";
import { CardHeader } from "@minamorl/root-ui";

const JobHistoryTitle: React.FC<React.PropsWithChildren> = ({ children }) => {
  // biome-ignore lint/suspicious/noExplicitAny: library types are unions of FC and function
  const Header = CardHeader as any;

  return (
    <Header as="h3" className="text-xl font-semibold text-gray-800">
      {children}
    </Header>
  );
};

export default JobHistoryTitle;
