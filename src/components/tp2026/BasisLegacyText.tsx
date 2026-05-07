'use client';

import React from 'react';

/** Inline **bold**, *italic*, ***both***, and "quoted" segments (legacy TP preview semantics). */
export function formatInlineText(text: string, opts?: { noQuoteWrap?: boolean }): React.ReactNode {
  if (!text) return text;
  const noQuoteWrap = opts?.noQuoteWrap ?? false;

  const parts: React.ReactNode[] = [];
  let currentIdx = 0;
  const quoteRegex = /"([^"]+)"/g;
  const markdownRegex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const allMatches: Array<{ index: number; length: number; type: 'quote' | 'markdown'; content: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = quoteRegex.exec(text)) !== null) {
    allMatches.push({ index: match.index, length: match[0].length, type: 'quote', content: match[1] });
  }
  while ((match = markdownRegex.exec(text)) !== null) {
    allMatches.push({ index: match.index, length: match[0].length, type: 'markdown', content: match[0] });
  }
  allMatches.sort((a, b) => a.index - b.index);

  for (const m of allMatches) {
    if (m.index > currentIdx) parts.push(text.slice(currentIdx, m.index));
    if (m.type === 'quote') {
      parts.push(
        <span key={m.index}>
          <em>&quot;{m.content}&quot;</em>
        </span>
      );
    } else if (m.type === 'markdown') {
      const content = m.content;
      if (content.startsWith('***') && content.endsWith('***')) {
        parts.push(
          <strong key={m.index}>
            <em>{content.slice(3, -3)}</em>
          </strong>
        );
      } else if (content.startsWith('**') && content.endsWith('**')) {
        parts.push(<strong key={m.index}>{content.slice(2, -2)}</strong>);
      } else if (content.startsWith('*') && content.endsWith('*')) {
        parts.push(
          <span key={m.index}>
            {noQuoteWrap ? <em>{content.slice(1, -1)}</em> : <>&quot;<em>{content.slice(1, -1)}</em>&quot;</>}
          </span>
        );
      }
    }
    currentIdx = m.index + m.length;
  }
  if (currentIdx < text.length) parts.push(text.slice(currentIdx));
  return parts.length > 0 ? parts : text;
}

/** Render narrative with ValentineZ logo bullets where lines use • / - / checkmarks (matches legacy Section 3). */
export function renderTextWithLogoBullets(
  text: string,
  isPlaatsbaarheid = false,
  eagerLoading = false
): React.ReactNode {
  if (!text) return text;

  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((para, paraIdx) => {
    const trimmedPara = para.trim();

    if (isPlaatsbaarheid && trimmedPara.startsWith('Dit is geen limitatieve opsomming')) {
      return (
        <p key={paraIdx} className="mt-4 text-[#6d2a96] italic">
          {formatInlineText(trimmedPara)}
        </p>
      );
    }

    const lines = trimmedPara.split('\n');

    const hasBullets = lines.some((l) => {
      const t = l.trim();
      return t.startsWith('•') || t.startsWith('☑') || t.startsWith('✓') || t.startsWith('- ');
    });

    if (hasBullets) {
      return (
        <div key={paraIdx} className="mb-4">
          {lines.map((line, idx) => {
            const t = line.trim();
            const isBullet = t.startsWith('•') || t.startsWith('☑') || t.startsWith('✓') || t.startsWith('- ');

            if (isBullet) {
              const content = t.replace(/^[•☑✓\-]\s*/, '');

              if (isPlaatsbaarheid) {
                const colonIndex = content.indexOf(':');
                if (colonIndex > 0) {
                  const jobTitle = content.substring(0, colonIndex).trim();
                  const description = content.substring(colonIndex + 1).trim();
                  return (
                    <div key={idx} className="ml-4 mt-1 flex items-start gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/val-logo.jpg"
                        alt=""
                        width={14}
                        height={14}
                        style={{ marginTop: '3px', flexShrink: 0 }}
                        loading={eagerLoading ? 'eager' : undefined}
                      />
                      <span>
                        <strong>{jobTitle}:</strong> {formatInlineText(description)}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={idx} className="ml-4 mt-1 flex items-start gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/val-logo.jpg"
                      alt=""
                      width={14}
                      height={14}
                      style={{ marginTop: '3px', flexShrink: 0 }}
                      loading={eagerLoading ? 'eager' : undefined}
                    />
                    <span>
                      <strong>{formatInlineText(content)}</strong>
                    </span>
                  </div>
                );
              }

              return (
                <div key={idx} className="ml-4 mt-1 flex items-start gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/val-logo.jpg"
                    alt=""
                    width={14}
                    height={14}
                    style={{ marginTop: '3px', flexShrink: 0 }}
                    loading={eagerLoading ? 'eager' : undefined}
                  />
                  <span>{formatInlineText(content)}</span>
                </div>
              );
            }

            return (
              <p key={idx} className={idx > 0 ? 'mt-2' : ''}>
                {formatInlineText(t)}
              </p>
            );
          })}
        </div>
      );
    }

    return (
      <p key={paraIdx} className={paraIdx > 0 ? 'mt-4' : ''}>
        {lines.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {lineIdx > 0 && <br />}
            {formatInlineText(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}
