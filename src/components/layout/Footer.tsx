import type React from "react";
import { PageFooter } from "@minamorl/root-ui";

const Footer: React.FC = () => {
  // biome-ignore lint/suspicious/noExplicitAny: library types are unions of FC and function
  const FooterComp = PageFooter as any;

  return (
    <FooterComp className="text-center text-gray-500 text-sm py-4">
      <p>© 2025 minamorl</p>
    </FooterComp>
  );
};

export default Footer;
