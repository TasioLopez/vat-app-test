"use client";

import "@mdxeditor/editor/style.css";

import type { ForwardedRef } from "react";
import { useMemo } from "react";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  headingsPlugin,
  imagePlugin,
  InsertImage,
  InsertThematicBreak,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
  quotePlugin,
  Separator,
  thematicBreakPlugin,
  toolbarPlugin,
  UndoRedo,
} from "@mdxeditor/editor";
import { fetchKbMediaSignedUrl } from "@/lib/help/kb-media-signed-url";

export type KbArticleBodyEditorInnerProps = Omit<
  MDXEditorProps,
  "markdown" | "onChange" | "plugins" | "suppressHtmlProcessing"
> & {
  editorRef: ForwardedRef<MDXEditorMethods> | null;
  markdown: string;
  onMarkdownChange: (markdown: string) => void;
  uploadKbMediaImage: (file: File) => Promise<string>;
};

export default function KbArticleBodyEditorInner({
  editorRef,
  markdown,
  onMarkdownChange,
  uploadKbMediaImage,
  className,
  contentEditableClassName,
  placeholder,
  readOnly,
  ...rest
}: KbArticleBodyEditorInnerProps) {
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      imagePlugin({
        imageUploadHandler: (file) => uploadKbMediaImage(file),
        imagePreviewHandler: async (imageSource) => {
          const src = imageSource.trim();
          if (src.startsWith("http://") || src.startsWith("https://")) return src;
          const signed = await fetchKbMediaSignedUrl(src);
          return signed ?? src;
        },
      }),
      toolbarPlugin({
        toolbarContents: () => (
          <>
            <UndoRedo />
            <Separator />
            <BoldItalicUnderlineToggles />
            <Separator />
            <ListsToggle />
            <Separator />
            <BlockTypeSelect />
            <Separator />
            <CreateLink />
            <InsertImage />
            <Separator />
            <InsertThematicBreak />
          </>
        ),
        toolbarClassName: "rounded-t-xl border border-b-0 border-purple-200 bg-purple-50/80",
      }),
    ],
    [uploadKbMediaImage],
  );

  return (
    <MDXEditor
      ref={editorRef}
      markdown={markdown}
      onChange={(md) => onMarkdownChange(md)}
      plugins={plugins}
      suppressHtmlProcessing
      className={`rounded-xl border border-purple-200 bg-white ${className ?? ""}`}
      contentEditableClassName={`prose prose-sm max-w-none min-h-[280px] px-3 py-2 ${contentEditableClassName ?? ""}`}
      placeholder={placeholder}
      readOnly={readOnly}
      {...rest}
    />
  );
}
