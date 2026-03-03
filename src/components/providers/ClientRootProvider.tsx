"use client";

import { SemanticProvider } from "@minamorl/root-ui";
import type React from "react";

export function ClientRootProvider({ children }: { children: React.ReactNode }) {
  return <SemanticProvider theme="light">{children}</SemanticProvider>;
}

