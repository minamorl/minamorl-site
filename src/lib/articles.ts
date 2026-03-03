export type Article = {
  slug: string;
  title: string;
  bodyMarkdown: string;
};

const seed: Article[] = [
  {
    slug: "hello",
    title: "Hello",
    bodyMarkdown:
      "# Hello\n\nThis is **markdown-next** AST render demo.\n\n- item 1\n- item 2\n\n[Back to list](/articles)\n",
  },
  {
    slug: "ui-preview",
    title: "UI Preview",
    bodyMarkdown: "# UI Preview\n\nGo to [/preview](/preview).\n",
  },
  {
    slug: "prefetch-test",
    title: "Prefetch Test",
    bodyMarkdown: `# Prefetch Test Page

This page is designed to test **dynamic prefetching** with PrefetchLink.

## Internal Links (Should Prefetch on Hover)

Try hovering over these links and check the Network tab:

[Hello Article](/articles/hello) - Another article

[UI Preview Article](/articles/ui-preview) - UI preview article

[Articles List](/articles) - Back to list

[Preview Page](/preview) - Preview page

[Home](/) - Home page

## Multiple Links Section

Here's a paragraph with [inline link to hello](/articles/hello) and another [link to preview](/preview) in the same line.

### Navigation Test

[First: Go to Hello](/articles/hello)

[Second: Go to UI Preview](/articles/ui-preview)

[Third: Back to Articles](/articles)

## External Links (Should NOT Prefetch)

[GitHub](https://github.com) - External link

[Google](https://google.com) - External link

## Code Block Test

    // This is a code block
    const prefetch = (url) => {
      router.prefetch(url);
    };

## Blockquote Test

> This is a blockquote.
> It can span multiple lines.

## Mixed Content

Check **bold text**, *italic text*, and \`inline code\`.

---

[← Back to Articles](/articles) | [Home →](/)
`,
  },
  {
    slug: "link-heavy",
    title: "Link Heavy Page",
    bodyMarkdown: `# Link Heavy Page

This page has many links to stress-test prefetching.

## Quick Navigation

[Go Home](/) | [See All Articles](/articles) | [Preview](/preview) | [Hello](/articles/hello) | [Prefetch Test](/articles/prefetch-test)

## Link Grid

[Home](/)

[Articles](/articles)

[Preview](/preview)

[Hello](/articles/hello)

[UI Preview](/articles/ui-preview)

[Prefetch Test](/articles/prefetch-test)

## Inline Links

Here are multiple links in one paragraph: [Home](/), [Articles](/articles), [Preview](/preview), and [Hello Article](/articles/hello).

Another paragraph with [UI Preview](/articles/ui-preview) and [Prefetch Test](/articles/prefetch-test) links.

## Back

[← Back to Articles](/articles) | [Home →](/)
`,
  },
];

export function listArticles(): Article[] {
  return seed;
}

export function getArticleBySlug(slug: string): Article | undefined {
  return seed.find((a) => a.slug === slug);
}


