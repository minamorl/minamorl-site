import * as React from "react";
import { PrefetchLink } from "@/components/PrefetchLink";
import type { MarkdownAst } from "@/lib/markdown-ast";

function isElementNode(
  node: MarkdownAst,
): node is [string, Record<string, unknown> | null, MarkdownAst] {
  return Array.isArray(node) && typeof node[0] === "string" && node.length === 3;
}

function renderChildren(children: MarkdownAst, keyPrefix: string): React.ReactNode {
  if (children == null) return null;
  if (typeof children === "string") return children;
  if (Array.isArray(children) && !isElementNode(children)) {
    return children.map((c, i) => (
      <React.Fragment key={`${keyPrefix}-${i}`}>
        {renderNode(c, `${keyPrefix}-${i}`)}
      </React.Fragment>
    ));
  }
  return renderNode(children, keyPrefix);
}

function renderNode(node: MarkdownAst, key: string): React.ReactNode {
  if (node == null) return null;
  if (typeof node === "string") return node;

  if (Array.isArray(node) && !isElementNode(node)) {
    return node.map((c, i) => (
      <React.Fragment key={`${key}-${i}`}>{renderNode(c, `${key}-${i}`)}</React.Fragment>
    ));
  }

  if (!isElementNode(node)) return null;

  const [tag, attrs, children] = node;

  // Link: internal = Next Link with aggressive prefetch, external = normal anchor
  if (tag === "a") {
    const href = typeof attrs?.href === "string" ? attrs.href : "";
    const content = renderChildren(children, `${key}-a`);
    if (href.startsWith("/")) {
      return (
        <PrefetchLink key={key} href={href} className="underline">
          {content}
        </PrefetchLink>
      );
    }
    return (
      <a key={key} href={href} className="underline">
        {content}
      </a>
    );
  }

  const content = renderChildren(children, `${key}-${tag}`);

  switch (tag) {
    case "h1":
      return (
        <h1 key={key} className="text-3xl font-bold tracking-tight">
          {content}
        </h1>
      );
    case "h2":
      return (
        <h2 key={key} className="text-2xl font-bold tracking-tight mt-6">
          {content}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} className="text-xl font-semibold tracking-tight mt-6">
          {content}
        </h3>
      );
    case "p":
      return (
        <p key={key} className="mt-4 leading-7 text-gray-800">
          {content}
        </p>
      );
    case "ul":
      return (
        <ul key={key} className="mt-4 list-disc pl-6 space-y-1">
          {content}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="mt-4 list-decimal pl-6 space-y-1">
          {content}
        </ol>
      );
    case "li":
      return <li key={key}>{content}</li>;
    case "strong":
      return <strong key={key}>{content}</strong>;
    case "em":
      return <em key={key}>{content}</em>;
    case "code":
      return (
        <code key={key} className="px-1 py-0.5 rounded bg-gray-200 text-sm">
          {content}
        </code>
      );
    case "pre":
      return (
        <pre key={key} className="mt-4 overflow-auto rounded bg-gray-900 text-gray-100 p-4">
          {content}
        </pre>
      );
    case "blockquote":
      return (
        <blockquote key={key} className="mt-4 border-l-4 border-gray-300 pl-4 text-gray-700">
          {content}
        </blockquote>
      );
    case "br":
      return <br key={key} />;
    default:
      // Fallback: render as span to avoid dangerous HTML.
      return (
        <span key={key} data-md-tag={tag}>
          {content}
        </span>
      );
  }
}

export function MarkdownAstView({ ast }: { ast: MarkdownAst }) {
  return <div>{renderNode(ast, "md")}</div>;
}


