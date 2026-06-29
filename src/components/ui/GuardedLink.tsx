'use client';

import Link, { type LinkProps } from 'next/link';
import { forwardRef, type AnchorHTMLAttributes, type ReactNode } from 'react';
import { useUnsavedChangesGuard } from '@/context/UnsavedChangesGuardContext';

type GuardedLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  LinkProps & {
    children: ReactNode;
  };

function hrefToString(href: LinkProps['href']): string {
  if (typeof href === 'string') return href;
  if (typeof href === 'object' && href !== null) {
    const pathname = href.pathname ?? '/';
    const search = href.search ?? '';
    return `${pathname}${search}`;
  }
  return '/';
}

const GuardedLink = forwardRef<HTMLAnchorElement, GuardedLinkProps>(function GuardedLink(
  { href, onClick, children, ...rest },
  ref
) {
  const { attemptNavigate } = useUnsavedChangesGuard();
  const hrefString = hrefToString(href);

  return (
    <Link
      ref={ref}
      href={href}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();
        attemptNavigate(hrefString);
      }}
    >
      {children}
    </Link>
  );
});

export default GuardedLink;
