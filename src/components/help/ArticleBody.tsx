"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Components } from "react-markdown";
import { KbMediaImg } from "@/lib/help/kb-media-image";

const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img || []), "src", "srcSet", "sizes", "alt", "title"],
    video: ["src", "controls", "poster", "width", "height"],
    source: ["src", "type"],
  },
  tagNames: [...(defaultSchema.tagNames || []), "video", "source"],
};

type Props = {
  markdown: string;
};

export function ArticleBody({ markdown }: Props) {
  const components: Components = {
    a: ({ href, children, ...rest }) => {
      const h = href || "";
      if (h.startsWith("/dashboard/")) {
        return (
          <a href={h} className="text-purple-700 underline font-medium" {...rest}>
            {children}
          </a>
        );
      }
      if (h.startsWith("http://") || h.startsWith("https://")) {
        return (
          <a
            href={h}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-700 underline"
            {...rest}
          >
            {children}
          </a>
        );
      }
      return (
        <a href={h} className="text-purple-700 underline" {...rest}>
          {children}
        </a>
      );
    },
    img: ({ src, alt }) => {
      if (!src || typeof src !== "string") return null;
      if (src.startsWith("http://") || src.startsWith("https://")) {
        // eslint-disable-next-line @next/next/no-img-element
        return (
          <img src={src} alt={alt || ""} className="rounded-lg max-w-full h-auto my-4 border border-purple-100" />
        );
      }
      return <KbMediaImg path={src} alt={alt || ""} />;
    },
  };

  return (
    <div className="max-w-none text-gray-800 space-y-4 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_code]:bg-purple-50 [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-4 [&_blockquote]:border-purple-200 [&_blockquote]:bg-purple-50/60 [&_blockquote]:pl-4 [&_blockquote]:py-3 [&_blockquote]:pr-3 [&_blockquote]:rounded-r-lg [&_blockquote]:text-gray-700 [&_blockquote]:not-italic [&_hr]:my-8 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-purple-100">
      <ReactMarkdown rehypePlugins={[[rehypeSanitize, schema]]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
