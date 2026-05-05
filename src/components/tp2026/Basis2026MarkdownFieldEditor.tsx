'use client';

import '@mdxeditor/editor/style.css';

import { useMemo } from 'react';
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  headingsPlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  ListsToggle,
  markdownShortcutPlugin,
  MDXEditor,
  quotePlugin,
  Separator,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';

type Props = {
  markdown: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
};

/**
 * Rich markdown editor for TP 2026 basis fields (no image upload; matches preview semantics).
 */
export function Basis2026MarkdownFieldEditor({
  markdown,
  onChange,
  placeholder,
  minHeightClassName = 'min-h-[220px]',
}: Props) {
  const plugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      markdownShortcutPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
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
          </>
        ),
        toolbarClassName: 'rounded-t-md border border-b-0 border-[#b8985c]/60 bg-[#f5efe6]',
      }),
    ],
    []
  );

  return (
    <MDXEditor
      markdown={markdown}
      onChange={(md) => onChange(md)}
      plugins={plugins}
      suppressHtmlProcessing
      className="rounded-md border border-[#b8985c] bg-white"
      contentEditableClassName={`prose prose-sm max-w-none px-3 py-2 text-neutral-900 ${minHeightClassName}`}
      placeholder={placeholder}
    />
  );
}
