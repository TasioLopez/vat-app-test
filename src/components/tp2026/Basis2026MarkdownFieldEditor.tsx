'use client';

import '@mdxeditor/editor/style.css';

import { useEffect, useMemo, useRef } from 'react';
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
  type MDXEditorMethods,
  quotePlugin,
  Separator,
  toolbarPlugin,
  UndoRedo,
} from '@mdxeditor/editor';
import { useDebouncedSync } from '@/hooks/useDebouncedSync';

type Props = {
  markdown: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
};

/**
 * Rich markdown editor for TP 2026 basis fields (no image upload; matches preview semantics).
 * Local Lexical state updates immediately; parent sync is debounced.
 */
export function Basis2026MarkdownFieldEditor({
  markdown,
  onChange,
  placeholder,
  minHeightClassName = 'min-h-[220px]',
}: Props) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const lastEmitted = useRef(markdown);
  const { value: draft, setDraft } = useDebouncedSync({
    external: markdown,
    onSync: onChange,
  });

  useEffect(() => {
    if (draft !== lastEmitted.current) {
      editorRef.current?.setMarkdown(draft);
      lastEmitted.current = draft;
    }
  }, [draft]);

  const handleChange = (md: string) => {
    lastEmitted.current = md;
    setDraft(md);
  };

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
    <div className="overflow-hidden rounded-md border border-[#b8985c] bg-white">
      <MDXEditor
        ref={editorRef}
        markdown={draft}
        onChange={handleChange}
        plugins={plugins}
        suppressHtmlProcessing
        className="bg-white"
        contentEditableClassName={`prose prose-sm max-w-none px-3 py-2 text-neutral-900 ${minHeightClassName}`}
        placeholder={placeholder}
      />
    </div>
  );
}
