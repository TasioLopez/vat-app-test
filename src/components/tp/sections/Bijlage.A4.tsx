// SERVER/DATA-DRIVEN — Bijlage.A4.tsx
// Pure render from { data }. No hooks, no context, no "use client".

import Image from "next/image";
import Logo2 from "@/assets/images/logo-2.png";
import { TPData } from "@/lib/tp/load";

const page =
  "bg-white w-[794px] h-[1123px] shadow border p-10 text-[12px] font-sans mx-auto mb-6 print:shadow-none";
const heading = "text-lg font-semibold text-center mb-6";
const blockTitle = "font-bold bg-gray-100 px-2 py-1";
const paperText = "p-2 whitespace-pre-wrap leading-relaxed";
const subtle = "bg-gray-50 px-3 py-1 whitespace-pre-wrap leading-relaxed italic";
const avoidBreak = "mb-3 [break-inside:avoid] print:[break-inside:avoid]";

type Aktiviteit = { name: string; status: string }; // 'G' | 'P' | 'N' | string
type Periode = { from?: string; to?: string };
type Fase = { title?: string; periode?: Periode; activiteiten: Aktiviteit[] };

function LogoBar() {
  return (
    <div className="w-full flex justify-end mb-6">
      <Image src={Logo2} alt="Valentinez Logo" width={120} height={60} />
    </div>
  );
}

function formatDutchDate(dateISO?: string) {
  if (!dateISO) return "...";
  const d = new Date(dateISO);
  if (isNaN(+d)) return "...";
  return d.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BijlageA4({ data }: { data: TPData }) {
  const fases: Fase[] = (data.bijlage_fases as Fase[] | undefined) ?? [];

  return (
    <section className="print-page">
      <div className={page}>
        <LogoBar />
        <h1 className={heading}>Bijlage – Voortgang en planning</h1>

        {/* Fases */}
        {(!fases || fases.length === 0) && (
          <div className={`${avoidBreak} ${subtle}`}>
            Er zijn nog geen fasen toegevoegd.
          </div>
        )}

        {fases?.map((fase, idx) => {
          const title = `Fase ${idx + 1}: ${fase.title || "(geen doel)"} — Periode: ${formatDutchDate(
            fase.periode?.from
          )} - ${formatDutchDate(fase.periode?.to)}`;
          return (
            <div key={`fase-${idx}`} className={avoidBreak}>
              <div className={blockTitle}>{title}</div>
              <div className={paperText}>
                <div className="space-y-0.5">
                  {fase.activiteiten?.length ? (
                    fase.activiteiten.map((a, i) => (
                      <div
                        key={`${a.name}-${i}`}
                        className="flex justify-between gap-2 px-2 py-0.5"
                      >
                        <span className="flex-1">{a.name}</span>
                        <span className="text-right min-w-[20px]">
                          {a.status || "—"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="px-2 py-0.5 text-gray-500 italic">
                      Geen activiteiten
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Legenda */}
        <div className={avoidBreak}>
          <div className={blockTitle}>Legenda</div>
          <div className={`${paperText} text-[10px]`}>
            <div className="flex gap-6">
              <p>
                <strong>G</strong> = gedaan / succesvol uitgevoerd
              </p>
              <p>
                <strong>P</strong> = nog in planning
              </p>
              <p>
                <strong>N</strong> = niet gedaan / geen succes
              </p>
            </div>
          </div>
        </div>

        {/* Note */}
        <div className={`${avoidBreak} ${subtle}`}>
          *Het solliciteren geschiedt conform planning, aanvang sollicitatiefase
          wordt vervroegd indien werknemer daar eerder klaar voor is.
        </div>
      </div>
    </section>
  );
}
