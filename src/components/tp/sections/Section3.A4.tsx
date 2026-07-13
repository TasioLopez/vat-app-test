// SERVER/DATA-DRIVEN — Section3.A4.tsx
// Pure render from { data }. No hooks, no context, no "use client".

import React from "react";
import Image from "next/image";
import Logo2 from "@/assets/images/logo-2.png";
import { loadTP, TPData } from "@/lib/tp/load";
import { WETTELIJKE_KADERS, VISIE_LOOPBAANADVISEUR_BASIS } from "@/lib/tp/static";
import { InleidingSubBlock } from "../InleidingSubBlock";
import { BasisSpoor2Block } from '@/components/tp2026/BasisSpoor2Block';
import { ValentineZLogoBulletRow } from '@/components/tp2026/primitives';
import {
  TP_BASIS_AGREEMENT_INTRO,
  TP_BASIS_AGREEMENT_POINTS,
} from '@/lib/tp2026/basis-document-agreement';

const page =
  "bg-white w-[794px] h-[1123px] shadow border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none print:border-0";
const blockTitle = "font-bold text-[#660066] px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed bg-[#e7e6e6]";
const subtle = "bg-[#e7e6e6] px-3 py-1 whitespace-pre-wrap leading-relaxed italic";
// keep blocks together across page breaks
const avoidBreak = "mb-3 [break-inside:avoid] print:[break-inside:avoid]";

// Helper to format Dutch date
function formatDutchDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Page footer component (for CSS pagination, this will be positioned at bottom)
function PageFooter({ 
  lastName, 
  firstName, 
  dateOfBirth 
}: { 
  lastName?: string | null; 
  firstName?: string | null; 
  dateOfBirth?: string | null; 
}) {
  const nameText = lastName && firstName 
    ? `Naam: ${lastName} (${firstName})` 
    : lastName 
    ? `Naam: ${lastName}` 
    : "";
  const birthText = dateOfBirth ? formatDutchDate(dateOfBirth) : "";

  return (
    <div 
      className="mt-auto pt-4 border-t border-gray-300 flex justify-between items-center text-[10px] text-gray-700 print:fixed print:bottom-0 print:left-0 print:right-0 print:px-10 print:pb-4"
      style={{
        // Hide on first page using CSS
        pageBreakInside: 'avoid',
      }}
    >
      <div>{nameText}</div>
      <div className="text-center flex-1 print:counter-increment page">{
        // Page number will be handled by CSS counter
      }</div>
      <div>{birthText}</div>
    </div>
  );
}

/* ------------ helpers ------------ */
const safe = (v: string | null | undefined, fallback = "—") => v ?? fallback;
const fullName = (full?: string | null, first?: string | null, last?: string | null, fallback = "") =>
  (full && full.trim())
    || `${first ?? ""} ${last ?? ""}`.trim()
    || fallback;

// Helper to format markdown (bold and italic) and quoted text
function formatInlineText(text: string, opts?: { noQuoteWrap?: boolean }): React.ReactNode {
  if (!text) return text;
  const noQuoteWrap = opts?.noQuoteWrap ?? false;

  const parts: React.ReactNode[] = [];
  let currentIdx = 0;
  const quoteRegex = /"([^"]+)"/g;
  const markdownRegex = /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const allMatches: Array<{index: number; length: number; type: 'quote' | 'markdown'; content: string}> = [];
  let match;
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
      parts.push(<span key={m.index}><em>"{m.content}"</em></span>);
    } else if (m.type === 'markdown') {
      const content = m.content;
      if (content.startsWith('***') && content.endsWith('***')) {
        parts.push(<strong key={m.index}><em>{content.slice(3, -3)}</em></strong>);
      } else if (content.startsWith('**') && content.endsWith('**')) {
        parts.push(<strong key={m.index}>{content.slice(2, -2)}</strong>);
      } else if (content.startsWith('*') && content.endsWith('*')) {
        parts.push(<span key={m.index}>{noQuoteWrap ? <em>{content.slice(1, -1)}</em> : <>"<em>{content.slice(1, -1)}</em>"</>}</span>);
      }
    }
    currentIdx = m.index + m.length;
  }
  if (currentIdx < text.length) parts.push(text.slice(currentIdx));
  return parts.length > 0 ? parts : text;
}

// Render text with markdown support for paragraphs
function formatTextWithParagraphs(text: string, opts?: { noQuoteWrap?: boolean }): React.ReactNode {
  if (!text) return text;
  const formatOpts = opts?.noQuoteWrap ? { noQuoteWrap: true } : undefined;
  const paragraphs = text.split(/\n\n+/);
  return paragraphs.map((para, idx) => {
    const lines = para.trim().split('\n');
    return (
      <p key={idx} className={idx > 0 ? "mt-4" : ""}>
        {lines.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {lineIdx > 0 && <br/>}
            {formatInlineText(line, formatOpts)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

// Render text with Z-logo bullets for list items
function renderTextWithLogoBullets(text: string, isPlaatsbaarheid: boolean = false): React.ReactNode {
  if (!text) return text;
  
  const paragraphs = text.split(/\n\n+/);
  
  return paragraphs.map((para, paraIdx) => {
    const trimmedPara = para.trim();
    
    // Check for disclaimer text in plaatsbaarheid (should be purple)
    if (isPlaatsbaarheid && trimmedPara.startsWith('Dit is geen limitatieve opsomming')) {
      return (
        <p key={paraIdx} className="mt-4 text-purple-600 italic">
          {formatInlineText(trimmedPara)}
        </p>
      );
    }
    
    const lines = trimmedPara.split('\n');
    
    // Check if ANY line is a bullet point (not requiring ALL lines to be bullets)
    const hasBullets = lines.some(l => {
      const t = l.trim();
      return t.startsWith('•') || t.startsWith('☑') || t.startsWith('✓') || t.startsWith('- ');
    });
    
    if (hasBullets) {
      // Render mixed content: intro text + bullet list with Z logos
      return (
        <div key={paraIdx} className="mb-4">
          {lines.map((line, idx) => {
            const t = line.trim();
            const isBullet = t.startsWith('•') || t.startsWith('☑') || t.startsWith('✓') || t.startsWith('- ');
            
            if (isBullet) {
              const content = t.replace(/^[•☑✓\-]\s*/, '');
              
              // For plaatsbaarheid sections, format job titles as bold
              if (isPlaatsbaarheid) {
                  const colonIndex = content.indexOf(':');
                  if (colonIndex > 0) {
                      const jobTitle = content.substring(0, colonIndex).trim();
                      const description = content.substring(colonIndex + 1).trim();
                      return (
                          <ValentineZLogoBulletRow key={idx} className="ml-4 mt-1">
                              <strong>{jobTitle}:</strong> {formatInlineText(description)}
                          </ValentineZLogoBulletRow>
                      );
                  } else {
                      // No colon - make entire content bold (e.g., "En soortgelijk")
                      return (
                          <ValentineZLogoBulletRow key={idx} className="ml-4 mt-1">
                              <strong>{formatInlineText(content)}</strong>
                          </ValentineZLogoBulletRow>
                      );
                  }
              }
              
              return (
                <ValentineZLogoBulletRow key={idx} className="ml-4 mt-1">
                  {formatInlineText(content)}
                </ValentineZLogoBulletRow>
              );
            } else {
              // Non-bullet line (intro text)
              return (
                <p key={idx} className={idx > 0 ? "mt-2" : ""}>
                  {formatInlineText(t)}
                </p>
              );
            }
          })}
        </div>
      );
    }
    
    // Regular paragraph with markdown support
    return (
      <p key={paraIdx} className={paraIdx > 0 ? "mt-4" : ""}>
        {lines.map((line, lineIdx) => (
          <React.Fragment key={lineIdx}>
            {lineIdx > 0 && <br/>}
            {formatInlineText(line)}
          </React.Fragment>
        ))}
      </p>
    );
  });
}

// Alias for backward compatibility
function renderVisieLoopbaanadviseurText(text: string): React.ReactNode {
  return renderTextWithLogoBullets(text, false);
}

/* ------------ presentational blocks ------------ */
function LogoBar() {
  return (
    <div className="w-full flex justify-end mb-6">
      <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} loading="eager" />
    </div>
  );
}

function AgreementBlock() {
  return (
    <div className={avoidBreak}>
      <div className={blockTitle}>{TP_BASIS_AGREEMENT_INTRO}</div>
      <div className={paperText}>
        <div className="ml-4 space-y-2">
          {TP_BASIS_AGREEMENT_POINTS.map((t, i) => (
            <ValentineZLogoBulletRow key={i}>
              {t}
            </ValentineZLogoBulletRow>
          ))}
        </div>
      </div>
    </div>
  );
}

function SignatureBlock({
  employeeName,
  advisorName,
  employerContact,
  employerFunctionCompany,
}: {
  employeeName: string;
  advisorName: string;
  employerContact: string;
  employerFunctionCompany?: string;
}) {
  const row = "grid grid-cols-2 gap-6 mt-3";
  const cell = "border rounded p-3 bg-[#e7e6e6]";
  const line = "border-b border-black inline-block min-w-[140px]";
  const label = "text-xs text-muted-foreground font-bold";

  return (
    <div className={avoidBreak}>
      <div className={blockTitle}>Ondertekening</div>
      <div className="p-2 whitespace-pre-wrap leading-relaxed">
        {/* First row: Werknemer and Loopbaanadviseur */}
        <div className={row}>
          {/* Werknemer */}
          <div className={cell}>
            <div className="font-semibold mb-1">Werknemer</div>
            <div className="mb-1">
              <span className={label}>Naam: </span>
              <span className={line}>{employeeName}</span>
            </div>
            <div className="mb-1">
              <span className={label}>Datum: </span>
              <span className={line}></span>
            </div>
            <div className="min-h-[56px] pt-1">
              <span className={label}>Handtekening: </span>
              <span className={line}></span>
            </div>
          </div>

          {/* Loopbaanadviseur */}
          <div className={cell}>
            <div className="font-semibold mb-1">Loopbaanadviseur</div>
            <div className="mb-1">
              <span className={label}>Naam: </span>
              <span className={line}>{advisorName}</span>
            </div>
            <div className="mb-1">
              <span className={label}>Datum: </span>
              <span className={line}></span>
            </div>
            <div className="min-h-[56px] pt-1">
              <span className={label}>Handtekening: </span>
              <span className={line}></span>
            </div>
          </div>
        </div>

        {/* Second row: Opdrachtgever - using same grid to ensure exact same width */}
        <div className={row}>
          <div className={cell}>
            <div className="font-semibold mb-1">Opdrachtgever</div>
            <div className="mb-1">
              <span className={label}>Naam: </span>
              <span className={line}>{employerContact}</span>
            </div>
            {employerFunctionCompany ? (
              <div className="mb-1">
                <span className={label}>Functie, bedrijf: </span>
                <span className={line}>{employerFunctionCompany}</span>
              </div>
            ) : null}
            <div className="mb-1">
              <span className={label}>Datum: </span>
              <span className={line}></span>
            </div>
            <div className="min-h-[56px] pt-1">
              <span className={label}>Handtekening: </span>
              <span className={line}></span>
            </div>
          </div>
          <div></div>
        </div>
      </div>
    </div>
  );
}

function AgreementSignatureBlock({
  employeeName,
  advisorName,
  employerContact,
  employerFunctionCompany,
}: {
  employeeName: string;
  advisorName: string;
  employerContact: string;
  employerFunctionCompany?: string;
}) {
  return (
    <div className={avoidBreak}>
      <AgreementBlock />
      <SignatureBlock
        employeeName={employeeName}
        advisorName={advisorName}
        employerContact={employerContact}
        employerFunctionCompany={employerFunctionCompany}
      />
    </div>
  );
}

/* ------------ main render ------------ */
export default function Section3A4({ data }: { data: TPData }) {
  // inleiding + NB rule
  const inleiding = safe(data.inleiding);
  const inleidingSub = data.inleiding_sub ?? "";

  // names for signature - use simple firstName lastName format
  const employeeName = 
    `${((data as any).first_name ?? "").trim()} ${((data as any).last_name ?? "").trim()}`.trim()
    || "Naam werknemer";
  const advisorName = ((data as any).consultant_name as string) || "Loopbaanadviseur";
  const employerContact = ((data as any).client_referent_name as string) || "Naam opdrachtgever";
  const employerFunctionCompany = [
    (data as any).client_referent_function,
    (data as any).client_name,
  ]
    .filter(Boolean)
    .join(", ") || undefined;

  type Block =
    | { key: string; title?: string; text: string; subText?: string | null; variant: "block" | "subtle" }
    | { key: string; custom: "agreementSignature" | "spoor2" };

  const blocks: Block[] = [
    { key: "inl", title: "Inleiding", text: inleiding, variant: "block" },
    ...(inleidingSub
      ? [{ key: "inl_sub", text: inleidingSub, variant: "block" as const }]
      : []),

    {
      key: "wk",
      title: "Wettelijke kaders en terminologie",
      text: data.wettelijke_kaders || WETTELIJKE_KADERS,
      variant: "block",
    },
    {
      key: "soc",
      title: "Sociale achtergrond & maatschappelijke context",
      text: safe(data.sociale_achtergrond),
      variant: "block",
    },
    {
      key: "visw",
      title: "Visie van werknemer",
      text: safe(data.visie_werknemer),
      variant: "block",
    },
    {
      key: "prof",
      title: "Persoonlijk profiel",
      text: safe(data.persoonlijk_profiel),
      variant: "block",
    },
    {
      key: "prog",
      title: "Belastbaarheidsprofiel",
      text: safe(data.prognose_bedrijfsarts),
      variant: "block",
    },
    {
      key: "blem",
      title: "Praktische belemmeringen",
      text: safe(data.praktische_belemmeringen, "Voor zover bekend zijn er geen praktische belemmeringen die van invloed kunnen zijn op het verloop van het tweede spoortraject."),
      variant: "block",
    },
    {
      key: "ad",
      title:
        "In het arbeidsdeskundigrapport staat het volgende advies over passende arbeid",
      text: safe(data.advies_ad_passende_arbeid, data.has_ad_report === false ? "N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld." : "—"),
      variant: "block",
    },
    {
      key: "pow",
      title: "Perspectief op Werk (PoW-meter)",
      text: safe(data.pow_meter),
      variant: "block",
    },
    {
      key: "vlb",
      title: "Visie van loopbaanadviseur",
      text: data.visie_loopbaanadviseur || VISIE_LOOPBAANADVISEUR_BASIS,
      variant: "block",
    },
    {
      key: "zp",
      title: "Zoekprofiel",
      text: safe(data.zoekprofiel),
      variant: "block",
    },

    { key: "spoor2", custom: "spoor2" },

    { key: "agree-sign", custom: "agreementSignature" },
  ];

  // CSS page-breaks handle splitting; avoidBreak keeps each title with its text.
  // For server-side, we add footer after first block to appear on subsequent pages
  const firstBlock = blocks[0];
  const restBlocks = blocks.slice(1);
  
  return (
    <section className="print-page">
      <div className={page} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <LogoBar />
        {firstBlock && (
          <>
            {("custom" in firstBlock) ? (
              firstBlock.custom === "agreementSignature" ? (
                <AgreementSignatureBlock
                  key={firstBlock.key}
                  employeeName={employeeName}
                  advisorName={advisorName}
                  employerContact={employerContact}
                  employerFunctionCompany={employerFunctionCompany}
                />
              ) : (
                <div key={firstBlock.key} className={avoidBreak}>
                  <BasisSpoor2Block />
                </div>
              )
            ) : (
              <div key={firstBlock.key} className={avoidBreak}>
                {firstBlock.variant === "subtle" ? (
                  <div className={subtle}>{firstBlock.text}</div>
                ) : (
                  <>
                    {firstBlock.title && <div className={blockTitle}>{firstBlock.title}</div>}
                    {firstBlock.key === 'inl_sub' ? (
                      <div className={paperText}><InleidingSubBlock text={firstBlock.text} /></div>
                    ) : firstBlock.key === 'vlb' || firstBlock.key === 'wk' ? (
                      <div className={paperText}>{renderTextWithLogoBullets(firstBlock.text, false)}</div>
                    ) : firstBlock.key === 'plaats' ? (
                      <div className={paperText}>{renderTextWithLogoBullets(firstBlock.text, true)}</div>
                    ) : firstBlock.key === 'ad' && firstBlock.text.startsWith('N.B.') ? (
                      <div className={`${paperText} font-bold text-black`}>{firstBlock.text}</div>
                    ) : firstBlock.key === 'ad' ? (
                      <div className={paperText}>{renderTextWithLogoBullets(firstBlock.text, false)}</div>
                    ) : firstBlock.key === 'pow' ? (
                      <div className={paperText}>
                        {firstBlock.text && firstBlock.text !== '—' && <p className="mb-4">{formatTextWithParagraphs(firstBlock.text)}</p>}
                        <div className="my-4">
                          <img src="/pow-meter.png" alt="PoW-meter" width={700} height={200} className="mx-auto" />
                        </div>
                        <p className="text-purple-600 italic text-[10px] mt-4">
                          * De Perspectief op Werk meter (PoW-meter) zegt niets over het opleidingsniveau of de werkervaring van de werknemer. Het is een momentopname, welke de huidige afstand tot de arbeidsmarkt grafisch weergeeft.
                        </p>
                      </div>
                    ) : firstBlock.key === 'inl' ? (
                      <div className={paperText}>
                        {formatTextWithParagraphs(firstBlock.text)}
                        {data.has_ad_report === false && (
                          <p className="mt-4 font-bold text-black">
                            N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className={paperText}>{formatTextWithParagraphs(firstBlock.text)}</div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
        {restBlocks.map((b) => {
          if ("custom" in b) {
            if (b.custom === "agreementSignature") {
              return (
                <AgreementSignatureBlock
                  key={b.key}
                  employeeName={employeeName}
                  advisorName={advisorName}
                  employerContact={employerContact}
                  employerFunctionCompany={employerFunctionCompany}
                />
              );
            }
            return (
              <div key={b.key} className={avoidBreak}>
                <BasisSpoor2Block />
              </div>
            );
          }
          return (
            <div key={b.key} className={avoidBreak}>
              {b.variant === "subtle" ? (
                <div className={subtle}>{b.text}</div>
              ) : (
                <>
                  {b.title && <div className={blockTitle}>{b.title}</div>}
                  {b.key === 'inl_sub' ? (
                    <div className={paperText}><InleidingSubBlock text={b.text} /></div>
                  ) : b.key === 'vlb' || b.key === 'wk' ? (
                    <div className={paperText}>{renderTextWithLogoBullets(b.text, false)}</div>
                  ) : b.key === 'plaats' ? (
                    <div className={paperText}>{renderTextWithLogoBullets(b.text, true)}</div>
                  ) : b.key === 'ad' && b.text.startsWith('N.B.') ? (
                    <div className={`${paperText} font-bold text-black`}>{b.text}</div>
                  ) : b.key === 'ad' ? (
                    <div className={paperText}>{renderTextWithLogoBullets(b.text, false)}</div>
                  ) : b.key === 'pow' ? (
                    <div className={paperText}>
                      {b.text && b.text !== '—' && <p className="mb-4">{formatTextWithParagraphs(b.text)}</p>}
                      <div className="my-4">
                        <img src="/pow-meter.png" alt="PoW-meter" width={700} height={200} className="mx-auto" />
                      </div>
                      <p className="text-purple-600 italic text-[10px] mt-4">
                        * De Perspectief op Werk meter (PoW-meter) zegt niets over het opleidingsniveau of de werkervaring van de werknemer. Het is een momentopname, welke de huidige afstand tot de arbeidsmarkt grafisch weergeeft.
                      </p>
                    </div>
                  ) : b.key === 'inl' ? (
                    <div className={paperText}>
                      {formatTextWithParagraphs(b.text)}
                      {data.has_ad_report === false && (
                        <p className="mt-4 font-bold text-black">
                          N.B.: Tijdens het opstellen van dit trajectplan is er nog geen AD-rapport opgesteld.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className={paperText}>{formatTextWithParagraphs(b.text)}</div>
                  )}
                </>
              )}
            </div>
          );
        })}
        {/* Footer for subsequent pages - positioned at bottom */}
        <div 
          className="mt-auto pt-4 border-t border-gray-300 flex justify-between items-center text-[10px] text-gray-700"
          style={{ 
            marginTop: 'auto',
            paddingTop: '16px',
            pageBreakInside: 'avoid',
          }}
        >
          <div>{data.last_name && data.first_name ? `Naam: ${data.last_name} (${data.first_name})` : data.last_name ? `Naam: ${data.last_name}` : ""}</div>
          <div className="text-center flex-1"></div>
          <div>{data.date_of_birth ? formatDutchDate(data.date_of_birth) : ""}</div>
        </div>
      </div>
    </section>
  );
}
