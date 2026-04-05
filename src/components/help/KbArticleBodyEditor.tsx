"use client";

import dynamic from "next/dynamic";
import { forwardRef } from "react";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import type { KbArticleBodyEditorInnerProps } from "@/components/help/KbArticleBodyEditorInner";

const Editor = dynamic(() => import("@/components/help/KbArticleBodyEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[320px] rounded-xl border border-purple-200 bg-purple-50/50 animate-pulse text-sm text-purple-700 p-4">
      Editor laden…
    </div>
  ),
});

export type KbArticleBodyEditorProps = Omit<
  KbArticleBodyEditorInnerProps,
  "editorRef"
>;

export const KbArticleBodyEditor = forwardRef<MDXEditorMethods, KbArticleBodyEditorProps>((props, ref) => (
  <Editor {...props} editorRef={ref} />
));

KbArticleBodyEditor.displayName = "KbArticleBodyEditor";
