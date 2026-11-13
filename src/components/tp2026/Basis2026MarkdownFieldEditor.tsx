'use client';

import '@mdxeditor/editor/style.css';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
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
  /** Extra controls after the built-in format toolbar (e.g. AI regenerate). */
  toolbarEnd?: ReactNode;
  /** Extra classes for the editable content area. */
  contentClassName?: string;
  /** Sticky translucent toolbar chrome for denser reading panes. */
  stickyToolbar?: boolean;
};

const ToolbarEndContext = createContext<ReactNode>(null);

function ToolbarEndSlot() {
  const end = useContext(ToolbarEndContext);
  if (!end) return null;
  return (
    <>
      <Separator />
      {end}
    </>
  );
}

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
  toolbarEnd,
  contentClassName,
  stickyToolbar = false,
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
            <ToolbarEndSlot />
          </>
        ),
        toolbarClassName:
          appearance === 'neutral'
            ? [
                'rounded-t-md border border-b-0 border-gray-200 bg-gray-50/90',
                stickyToolbar &&
                  'sticky top-0 z-10 opacity-60 backdrop-blur-sm transition-opacity hover:opacity-100 focus-within:opacity-100',
              ]
                .filter(Boolean)
                .join(' ')
            : 'rounded-t-md border border-b-0 border-[#b8985c]/60 bg-[#f5efe6]',
      }),
    ],
    [appearance, stickyToolbar]
  );

  const frameClass =
    appearance === 'neutral'
      ? 'overflow-hidden rounded-md border border-gray-200 bg-white'
      : 'overflow-hidden rounded-md border border-[#b8985c] bg-white';

  const proseClass =
    appearance === 'neutral'
      ? 'prose prose-sm prose-neutral max-w-none px-4 py-4 text-neutral-900 prose-headings:font-semibold prose-headings:text-neutral-900 prose-p:leading-7 prose-li:leading-7'
      : 'prose prose-sm max-w-none px-3 py-2 text-neutral-900';

  return (
    <ToolbarEndContext.Provider value={toolbarEnd ?? null}>
      <div className={frameClass}>
        <MDXEditor
          ref={editorRef}
          markdown={draft}
          onChange={handleChange}
          plugins={plugins}
          suppressHtmlProcessing
          className="bg-white"
          contentEditableClassName={`${proseClass} ${minHeightClassName}${contentClassName ? ` ${contentClassName}` : ''}`}
          placeholder={placeholder}
        />
      </div>
    </ToolbarEndContext.Provider>
  );
}
