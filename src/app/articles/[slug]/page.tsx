"use client";

import { MarkdownAstView } from "@/components/MarkdownAst";
import { PrefetchLink } from "@/components/PrefetchLink";
import { getArticleBySlug } from "@/lib/articles";
import { markdownToAst } from "@/lib/markdown-ast";
import { notFound } from "next/navigation";
import { use } from "react";
import {
  Page,
  PageContent,
  PageHeader,
  FormTitle,
  Button,
} from "@minamorl/root-ui";

export default function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const ast = markdownToAst(article.bodyMarkdown);

  // biome-ignore lint/suspicious/noExplicitAny: library types are unions of FC and function
  const Header = PageHeader as any;
  // biome-ignore lint/suspicious/noExplicitAny: library types are unions of FC and function
  const Content = PageContent as any;
  // biome-ignore lint/suspicious/noExplicitAny: library types are unions of FC and function
  const Title = FormTitle as any;

  return (
    <Page variant="default" className="min-h-screen max-w-3xl mx-auto p-6">
      <Header>
        <Title as="h1" className="text-2xl font-semibold">
          {article.title}
        </Title>
      </Header>

      <Content className="mt-6">
        <MarkdownAstView ast={ast} />

        <div className="mt-8 flex gap-4">
          <Button
            variant="primary"
            as={PrefetchLink}
            className="underline"
            href="/articles"
          >
            Back to list
          </Button>
          <Button
            variant="primary"
            as={PrefetchLink}
            className="underline"
            href="/preview"
          >
            Preview
          </Button>
        </div>
      </Content>
    </Page>
  );
}


