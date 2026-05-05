'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import type { Components } from 'react-markdown';

const basisSanitizeSchema = defaultSchema;

const components: Components = {
  p: ({ children }) => (
    <p className="mb-3 whitespace-pre-line text-[12px] leading-relaxed text-neutral-900 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-bold text-neutral-900">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => (
    <h1 className="mb-2 text-[14px] font-bold leading-tight text-[#6d2a96] first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-3 text-[13px] font-bold leading-tight text-[#6d2a96] first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1.5 mt-2 text-[12px] font-bold leading-tight text-green-800 first:mt-0">{children}</h3>
  ),
  ul: ({ children }) => <ul className="my-2 list-disc pl-5 text-[12px] text-neutral-900">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal pl-5 text-[12px] text-neutral-900">{children}</ol>,
  li: ({ children }) => <li className="my-0.5 leading-relaxed">{children}</li>,
  a: ({ href, children, ...rest }) =>
    href ? (
      <a
        href={href}
        className="text-[#6d2a96] underline underline-offset-2"
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    ) : (
      <span className="text-[#6d2a96] underline underline-offset-2">{children}</span>
    ),
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-[#b8985c] pl-3 text-neutral-800">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-0 border-t border-[#b8985c]/60" />,
  br: () => <br />,
  code: ({ children }) => (
    <code className="rounded bg-white/80 px-1 py-0.5 font-sans text-[11px] text-neutral-800">{children}</code>
  ),
};

export function Basis2026MarkdownBody({ markdown }: { markdown: string }) {
  return (
    <div className="max-w-none text-neutral-900">
      <ReactMarkdown rehypePlugins={[[rehypeSanitize, basisSanitizeSchema]]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
