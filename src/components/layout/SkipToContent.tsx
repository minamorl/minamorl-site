import type React from "react";
import { Button } from "@minamorl/root-ui";

const SkipToContent: React.FC = () => (
  <Button
    variant="primary"
    as="a"
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-pink-500 text-white px-4 py-2 rounded-md z-50 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2"
  >
    Skip to main content
  </Button>
);

export default SkipToContent;
