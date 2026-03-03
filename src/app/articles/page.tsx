"use client";

import { PrefetchLink } from "@/components/PrefetchLink";
import { listArticles } from "@/lib/articles";
import {
  Page,
  PageContent,
  PageHeader,
  FormTitle,
  Button,
} from "@minamorl/root-ui";

export default function ArticlesPage() {
  const articles = listArticles();

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
          Articles
        </Title>
      </Header>
      <Content className="mt-6">
        <ul className="space-y-2">
          {articles.map((a) => (
            <li key={a.slug}>
              <Button
                variant="primary"
                as={PrefetchLink}
                className="underline"
                href={`/articles/${a.slug}`}
              >
                {a.title}
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <Button
            variant="primary"
            as={PrefetchLink}
            className="underline"
            href="/"
          >
            Back
          </Button>
        </div>
      </Content>
    </Page>
  );
}
