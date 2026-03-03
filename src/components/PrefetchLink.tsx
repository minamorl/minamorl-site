"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

type Props = LinkProps & {
  children: React.ReactNode;
  className?: string;
};

export function PrefetchLink({ children, className, href, ...rest }: Props) {
  const router = useRouter();

  const onMouseEnter = React.useCallback(() => {
    router.prefetch(String(href));
  }, [href, router]);

  return (
    <Link
      href={href}
      prefetch={true}
      onMouseEnter={onMouseEnter}
      className={className}
      {...rest}
    >
      {children}
    </Link>
  );
}


