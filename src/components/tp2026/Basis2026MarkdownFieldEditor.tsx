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
  /** Gold matches the trajectplan fields. Neutral is for surfaces outside that document. */
  appearance?: 'gold' | 'neutral';
  /** Debounce before onChange. 0 syncs on the next layout so callers see edits immediately. */
  delay?: number;
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
  appearance = 'gold',
  delay = 200,
}: Props) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const lastEmitted = useRef(markdown);
  const { value: draft, setDraft } = useDebouncedSync({
    external: markdown,
    onSync: onChange,
    delay,
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
        toolbarClassName:
          appearance === 'neutral'
            ? 'rounded-t-md border border-b-0 border-gray-200 bg-gray-50'
            : 'rounded-t-md border border-b-0 border-[#b8985c]/60 bg-[#f5efe6]',
      }),
    ],
    [appearance]
  );

  const frameClass =
    appearance === 'neutral'
      ? 'overflow-hidden rounded-md border border-gray-200 bg-white'
      : 'overflow-hidden rounded-md border border-[#b8985c] bg-white';

  return (
    <div className={frameClass}>
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
