"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrefetchLink } from "@/components/PrefetchLink";

import * as RootCore from "@minamorl/root-core";
import * as Lay from "@minamorl/lay";
import * as Cray from "@minamorl/cray";
import * as RootUi from "@minamorl/root-ui";
import * as React from "react";

const { Page, PageHeader, PageContent, FormTitle, Button } = RootUi as any;

function keys(mod: Record<string, unknown>) {
  return Object.keys(mod).sort();
}

function pickComponent(mod: Record<string, unknown>) {
  const preferred = [
    "Button",
    "Link",
    "Text",
    "Box",
    "Stack",
    "Card",
    "ThemeProvider",
    "RootProvider",
    "Provider",
  ];

  for (const k of preferred) {
    const v = mod[k];
    if (typeof v === "function") return { name: k, Comp: v as any };
  }

  // fallback: first PascalCase export that looks like a component
  for (const k of keys(mod)) {
    if (!/^[A-Z]/.test(k)) continue;
    const v = mod[k];
    if (typeof v === "function") return { name: k, Comp: v as any };
  }

  return null;
}

export default function PreviewPage() {
  const picked = pickComponent(RootUi as any);

  const rendered = React.useMemo(() => {
    if (!picked) return null;
    const C = picked.Comp as any;
    if (picked.name.toLowerCase().includes("button")) {
      return React.createElement(C, null, "Hello @minamorl/root-ui");
    }
    if (picked.name.toLowerCase().includes("link")) {
      return React.createElement(C, { href: "/" }, "Home");
    }
    return React.createElement(C);
  }, [picked]);

  return (
    <Page className="min-h-screen max-w-3xl mx-auto p-6">
      <PageHeader>
        <FormTitle as="h1" className="text-2xl font-semibold">
          Preview
        </FormTitle>
        <p className="mt-2 text-sm text-gray-600">
          Import check for private packages (rendered as exported keys).
        </p>
      </PageHeader>

      <PageContent className="mt-6 space-y-4">
        <section>
          <FormTitle as="h2" className="font-semibold">
            @minamorl/root-ui
          </FormTitle>
          <div className="mt-2 rounded bg-white p-3 border">
            {picked ? (
              <>
                <p className="text-xs text-gray-600">
                  Rendered from export: <code>{picked.name}</code>
                </p>
                <div className="mt-3">{rendered}</div>
              </>
            ) : (
              <p className="text-xs text-gray-600">
                No known React component export detected; showing keys only.
              </p>
            )}
          </div>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-xs border">
            {JSON.stringify(keys(RootUi as any), null, 2)}
          </pre>
        </section>
        <section>
          <FormTitle as="h2" className="font-semibold">
            @minamorl/root-core
          </FormTitle>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-xs border">
            {JSON.stringify(keys(RootCore as any), null, 2)}
          </pre>
        </section>
        <section>
          <FormTitle as="h2" className="font-semibold">
            @minamorl/lay
          </FormTitle>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-xs border">
            {JSON.stringify(keys(Lay as any), null, 2)}
          </pre>
        </section>
        <section>
          <FormTitle as="h2" className="font-semibold">
            @minamorl/cray
          </FormTitle>
          <pre className="mt-2 whitespace-pre-wrap rounded bg-white p-3 text-xs border">
            {JSON.stringify(keys(Cray as any), null, 2)}
          </pre>
        </section>
      </PageContent>

      <div className="mt-8 flex gap-4">
        <Button as={PrefetchLink} className="underline" href="/">
          Home
        </Button>
        <Button as={PrefetchLink} className="underline" href="/articles">
          Articles
        </Button>
      </div>
    </Page>
  );
}


