/* eslint-disable @typescript-eslint/no-explicit-any */
import { Parser, asAST } from "markdown-next";

export type MarkdownAst =
  | string
  | null
  | MarkdownAst[]
  | [tag: string, attrs: Record<string, unknown> | null, children: MarkdownAst];

export function markdownToAst(markdown: string): MarkdownAst {
  const p = new Parser<any>({ export: asAST });
  return p.parse(markdown) as MarkdownAst;
}


