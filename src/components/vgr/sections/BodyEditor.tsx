'use client';

import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNLDateForDoc } from '@/lib/tp/date-line-breaks';
import {
  CheckboxRow,
  DebouncedInput,
  DebouncedTextarea,
  EditorCard,
  FieldLabel,
  Instructie,
  JaNeeControl,
  QuoteEditor,
  StringListEditor,
} from '@/components/vgr/editor-controls';
import {
  VGR_ACTIVATIE_OPTIONS,
  VGR_BIJSTELLING_INSTRUCTIE,
  VGR_CHAPTERS,
  VGR_DOELSTELLING_INSTRUCTIE,
  VGR_INZET_INSTRUCTIE,
  VGR_KWALITEITEN_OPTIONS,
  VGR_MOTIVATIE_OPTIONS,
  VGR_PERSONALITY_TRAITS,
  VGR_PERSOONLIJK_PROFIEL_INSTRUCTIE,
  VGR_POW_INSTRUCTIE,
  VGR_PRAKTISCHE_INSTRUCTIE,
  VGR_SCHOLING_INSTRUCTIE,
  VGR_SCHOLING_OPTIONS,
  VGR_SOLLICITATIE_OPTIONS,
  VGR_WIJZIGING_DOEL_INSTRUCTIE,
  VGR_ZOEKPROFIEL_INSTRUCTIE,
  leernavigatorLabelWithUren,
  type VGRInterventionOption,
} from '@/lib/vgr/content';
import {
  VGR_FML_RUBRIEKEN,
  VGR_KANSEN_OPTIONS,
  newVgrId,
  type VGRBelastbaarheidKind,
  type VGRBody,
  type VGRData,
  type VGRFmlRubriek,
  type VGRInterventionSection,
  type VGRPowTrede,
} from '@/lib/vgr/schema';

export type BodyEditorProps = {
  data: VGRData;
  updateBody: <K extends keyof VGRBody>(section: K, patch: Partial<VGRBody[K]>) => void;
  setBodySection: <K extends keyof VGRBody>(section: K, value: VGRBody[K]) => void;
  /** Slot for AI proposal controls per section (M3). */
  renderAi?: (sectionId: keyof VGRBody) => React.ReactNode;
  /** Slot for the test-report summarizer in "Kwaliteiten en vaardigheden onderzoek". */
  renderTestSummary?: () => React.ReactNode;
};

const chapterColor = (id: (typeof VGR_CHAPTERS)[number]['id']) => VGR_CHAPTERS.find((c) => c.id === id)!.color;

const KIND_OPTIONS: { value: Exclude<VGRBelastbaarheidKind, ''>; label: string }[] = [
  { value: 'fml', label: 'FML' },
  { value: 'izp', label: 'IZP' },
  { value: 'lab', label: 'LAB' },
];

const TREDES: VGRPowTrede[] = [1, 2, 3, 4, 5, 6];

/* ------------------------------------------------------------------ */
/* Shared: rubrieken + intervention sections                           */
/* ------------------------------------------------------------------ */

function RubriekenPicker({ value, onChange }: { value: VGRFmlRubriek[]; onChange: (next: VGRFmlRubriek[]) => void }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
      {VGR_FML_RUBRIEKEN.map((r) => (
        <CheckboxRow
          key={r}
          checked={value.includes(r)}
          label={r}
          onChange={(c) => onChange(c ? [...value, r] : value.filter((x) => x !== r))}
        />
      ))}
    </div>
  );
}

function InterventionSectionEditor({
  section,
  options,
  onChange,
  withVervolg = false,
  extraForOption,
}: {
  section: VGRInterventionSection;
  options: VGRInterventionOption[];
  onChange: (next: VGRInterventionSection) => void;
  withVervolg?: boolean;
  extraForOption?: (opt: VGRInterventionOption) => React.ReactNode;
}) {
  const toggle = (id: string, checked: boolean) => {
    const selected = checked ? [...section.selected.filter((s) => s !== id), id] : section.selected.filter((s) => s !== id);
    // keep template order
    const ordered = options.map((o) => o.id).filter((o) => selected.includes(o));
    onChange({ ...section, selected: ordered });
  };
  const block = (id: string) => section.blocks[id] ?? { toelichting: '', items: [], standaardtekst: true };
  const setBlock = (id: string, patch: Partial<VGRInterventionSection['blocks'][string]>) =>
    onChange({ ...section, blocks: { ...section.blocks, [id]: { ...block(id), ...patch } } });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {options.map((o) => (
          <CheckboxRow key={o.id} checked={section.selected.includes(o.id)} label={o.label} onChange={(c) => toggle(o.id, c)} />
        ))}
      </div>

      {withVervolg ? (
        <div className="space-y-2 rounded-md border border-dashed border-border p-3">
          <FieldLabel hint="optioneel — alleen afgedrukt als ingevuld">Activiteiten voor de volgende fase</FieldLabel>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" className="h-8 text-sm" value={section.vervolg_periode_van} onChange={(e) => onChange({ ...section, vervolg_periode_van: e.target.value })} />
            <Input type="date" className="h-8 text-sm" value={section.vervolg_periode_tot} onChange={(e) => onChange({ ...section, vervolg_periode_tot: e.target.value })} />
          </div>
          <DebouncedTextarea
            rows={3}
            value={section.vervolg_activiteiten}
            placeholder="Neem hier de activiteiten op die in de vorige fase niet zijn uitgevoerd of niet zijn afgerond."
            onChange={(v) => onChange({ ...section, vervolg_activiteiten: v })}
          />
        </div>
      ) : null}

      {section.selected.map((id) => {
        const opt = options.find((o) => o.id === id);
        if (!opt) return null;
        const b = block(id);
        const items = b.items.length ? b.items : b.standaardtekst ? opt.defaultItems ?? [] : [];
        return (
          <div key={id} className="space-y-3 rounded-md border border-[#6d2a96]/25 bg-[#6d2a96]/[0.03] p-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-semibold text-foreground">{opt.heading}</h4>
              {opt.standardText?.length ? (
                <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" className="h-3.5 w-3.5" checked={b.standaardtekst} onChange={(e) => setBlock(id, { standaardtekst: e.target.checked })} />
                  Standaardtekst opnemen
                </label>
              ) : null}
            </div>
            {b.standaardtekst && opt.standardText?.length ? (
              <div className="space-y-1 rounded border border-border/60 bg-white px-3 py-2 text-xs leading-relaxed text-neutral-700">
                {opt.standardText.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : null}
            {extraForOption?.(opt)}
            {opt.defaultItems !== undefined || b.items.length ? (
              <div>
                <FieldLabel hint={opt.itemsLead ? opt.itemsLead : undefined}>Opsomming</FieldLabel>
                <StringListEditor items={items} onChange={(next) => setBlock(id, { items: next })} />
              </div>
            ) : null}
            <div>
              <FieldLabel>Persoonlijke toelichting</FieldLabel>
              <Instructie>{opt.instruction}</Instructie>
              <DebouncedTextarea className="mt-2" rows={4} value={b.toelichting} onChange={(v) => setBlock(id, { toelichting: v })} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function BodyEditor({ data, updateBody, setBodySection, renderAi, renderTestSummary }: BodyEditorProps) {
  const b = data.body;
  const [newRevKind, setNewRevKind] = useState<VGRBelastbaarheidKind>(b.belastbaarheidsprofiel.kind);
  const [newPowDate, setNewPowDate] = useState(data.vgr_meta.report_date);

  const ai = (id: keyof VGRBody) => renderAi?.(id) ?? null;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------ */}
      <ChapterHeading chapter="profiel" />

      <EditorCard id="periode" title="Rapportageperiode (tekst)" chapterColor={chapterColor('profiel')}>
        <p className="text-xs text-muted-foreground">
          Standaard: periode uit Stap 1. Vul alleen een eigen tekst in als de standaardzin niet volstaat.
        </p>
        <DebouncedInput value={b.periode_tekst_override} placeholder="bijv. 1 maart 2026 tot en met 31 mei 2026" onChange={(v) => setBodySection('periode_tekst_override', v)} />
      </EditorCard>

      <EditorCard id="benutbare_mogelijkheden" title="Benutbare mogelijkheden" chapterColor={chapterColor('profiel')} actions={ai('benutbare_mogelijkheden')}>
        <div>
          <FieldLabel>Beschikt werknemer op dit moment over benutbare mogelijkheden?</FieldLabel>
          <JaNeeControl name="bm-heeft" value={b.benutbare_mogelijkheden.heeft} onChange={(v) => updateBody('benutbare_mogelijkheden', { heeft: v })} />
        </div>
        <Instructie>
          Neem hier de prognose uit het trajectplan op en, indien bekend, de meest recente prognose uit de consultrapportage.
          Citaten letterlijk overnemen uit bedrijfsarts-/AD-documenten; nooit zelf formuleren.
        </Instructie>
        <div>
          <FieldLabel>Prognose</FieldLabel>
          <QuoteEditor value={b.benutbare_mogelijkheden.prognose} onChange={(q) => updateBody('benutbare_mogelijkheden', { prognose: q })} />
        </div>
        {b.benutbare_mogelijkheden.eerdere_prognose ? (
          <div>
            <FieldLabel hint="uit vorige rapportage">Eerdere prognose</FieldLabel>
            <DebouncedTextarea rows={2} value={b.benutbare_mogelijkheden.eerdere_prognose} onChange={(v) => updateBody('benutbare_mogelijkheden', { eerdere_prognose: v })} />
          </div>
        ) : null}
        <div>
          <FieldLabel>Conclusie</FieldLabel>
          <QuoteEditor value={b.benutbare_mogelijkheden.conclusie} onChange={(q) => updateBody('benutbare_mogelijkheden', { conclusie: q })} />
        </div>
        <div>
          <FieldLabel>Advies</FieldLabel>
          <QuoteEditor value={b.benutbare_mogelijkheden.advies} onChange={(q) => updateBody('benutbare_mogelijkheden', { advies: q })} />
        </div>
      </EditorCard>

      <EditorCard id="praktische_belemmeringen" title="Praktische belemmeringen" chapterColor={chapterColor('profiel')} actions={ai('praktische_belemmeringen')}>
        <div>
          <FieldLabel>Zijn er praktische belemmeringen bekend die van invloed kunnen zijn op het spoor 2 traject?</FieldLabel>
          <JaNeeControl name="pb-aanwezig" value={b.praktische_belemmeringen.aanwezig} onChange={(v) => updateBody('praktische_belemmeringen', { aanwezig: v })} />
        </div>
        <Instructie>{VGR_PRAKTISCHE_INSTRUCTIE}</Instructie>
        <DebouncedTextarea value={b.praktische_belemmeringen.toelichting} onChange={(v) => updateBody('praktische_belemmeringen', { toelichting: v })} />
      </EditorCard>

      <EditorCard id="doelstelling_traject" title="Doelstelling traject" chapterColor={chapterColor('profiel')} actions={ai('doelstelling_traject')}>
        <p className="text-xs text-muted-foreground">
          Doelstelling bij intake en wijzigingen registreert u in Stap 1. Huidige doelstelling:{' '}
          <span className="font-medium text-foreground">{b.doelstelling_traject.huidige || '—'}</span>
        </p>
        <Instructie>{VGR_DOELSTELLING_INSTRUCTIE}</Instructie>
        <DebouncedTextarea rows={6} value={b.doelstelling_traject.toelichting} onChange={(v) => updateBody('doelstelling_traject', { toelichting: v })} />
        {b.doelstelling_traject.history.length ? (
          <div className="space-y-2">
            <FieldLabel>Toelichting per doelstellingsdatum</FieldLabel>
            {b.doelstelling_traject.history.map((h) => (
              <div key={h.id} className="rounded-md border p-2">
                <div className="mb-1 text-xs text-muted-foreground">{formatNLDateForDoc(h.date)}</div>
                <DebouncedTextarea
                  rows={2}
                  value={h.toelichting}
                  onChange={(v) =>
                    updateBody('doelstelling_traject', {
                      history: b.doelstelling_traject.history.map((x) => (x.id === h.id ? { ...x, toelichting: v } : x)),
                    })
                  }
                />
              </div>
            ))}
          </div>
        ) : null}
      </EditorCard>

      <EditorCard id="persoonlijk_profiel" title="Persoonlijk profiel werknemer" chapterColor={chapterColor('profiel')} actions={ai('persoonlijk_profiel')}>
        <Instructie>{VGR_PERSOONLIJK_PROFIEL_INSTRUCTIE} Werk de tekst bij op basis van de voortgang in deze periode.</Instructie>
        <DebouncedTextarea rows={8} value={b.persoonlijk_profiel.tekst} onChange={(v) => updateBody('persoonlijk_profiel', { tekst: v })} />
      </EditorCard>

      <EditorCard id="belastbaarheidsprofiel" title="Belastbaarheidsprofiel werknemer" chapterColor={chapterColor('profiel')} actions={ai('belastbaarheidsprofiel')}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <FieldLabel>Type</FieldLabel>
            <Select value={b.belastbaarheidsprofiel.kind || undefined} onValueChange={(v) => updateBody('belastbaarheidsprofiel', { kind: v as VGRBelastbaarheidKind })}>
              <SelectTrigger className="w-full"><SelectValue placeholder="FML / IZP / LAB" /></SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>Datum</FieldLabel>
            <Input type="date" value={b.belastbaarheidsprofiel.datum} onChange={(e) => updateBody('belastbaarheidsprofiel', { datum: e.target.value })} />
            {b.belastbaarheidsprofiel.datum && b.belastbaarheidsprofiel.datum === data.first_sick_day ? (
              <p className="mt-1 text-xs text-amber-700">Gelijk aan eerste ziektedag — controleer.</p>
            ) : null}
          </div>
          <div>
            <FieldLabel>Opgesteld door</FieldLabel>
            <DebouncedInput value={b.belastbaarheidsprofiel.auteur} placeholder="naam bedrijfsarts" onChange={(v) => updateBody('belastbaarheidsprofiel', { auteur: v })} />
          </div>
        </div>
        <div>
          <FieldLabel>Beperkingen in rubrieken</FieldLabel>
          <RubriekenPicker value={b.belastbaarheidsprofiel.rubrieken} onChange={(r) => updateBody('belastbaarheidsprofiel', { rubrieken: r })} />
        </div>
        <div>
          <FieldLabel hint="optioneel">Toelichting</FieldLabel>
          <DebouncedTextarea rows={5} value={b.belastbaarheidsprofiel.toelichting} onChange={(v) => updateBody('belastbaarheidsprofiel', { toelichting: v })} />
        </div>
      </EditorCard>

      <EditorCard id="bijstellingen_belastbaarheid" title="Bijstellingen van het belastbaarheidsprofiel" chapterColor={chapterColor('profiel')} actions={ai('bijstellingen_belastbaarheid')}>
        <div>
          <FieldLabel>Zijn er tussentijds bijstellingen van het belastbaarheidsprofiel vastgesteld?</FieldLabel>
          <JaNeeControl name="bb-aanwezig" value={b.bijstellingen_belastbaarheid.aanwezig} onChange={(v) => updateBody('bijstellingen_belastbaarheid', { aanwezig: v })} />
        </div>
        <Instructie>{VGR_BIJSTELLING_INSTRUCTIE}</Instructie>
        {b.bijstellingen_belastbaarheid.aanwezig ? (
          <div className="space-y-3">
            {b.bijstellingen_belastbaarheid.revisions.map((rev) => (
              <div key={rev.id} className="space-y-3 rounded-md border border-[#6d2a96]/25 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Bijstelling {formatNLDateForDoc(rev.date)}</span>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      updateBody('bijstellingen_belastbaarheid', {
                        revisions: b.bijstellingen_belastbaarheid.revisions.filter((r) => r.id !== rev.id),
                      })
                    }
                  >
                    Verwijderen
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Select
                    value={rev.kind || undefined}
                    onValueChange={(v) =>
                      updateBody('bijstellingen_belastbaarheid', {
                        revisions: b.bijstellingen_belastbaarheid.revisions.map((r) => (r.id === rev.id ? { ...r, kind: v as VGRBelastbaarheidKind } : r)),
                      })
                    }
                  >
                    <SelectTrigger className="w-full"><SelectValue placeholder="FML / IZP / LAB" /></SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="date"
                    value={rev.date}
                    onChange={(e) =>
                      updateBody('bijstellingen_belastbaarheid', {
                        revisions: b.bijstellingen_belastbaarheid.revisions.map((r) => (r.id === rev.id ? { ...r, date: e.target.value } : r)),
                      })
                    }
                  />
                  <DebouncedInput
                    value={rev.auteur}
                    placeholder="naam bedrijfsarts"
                    onChange={(v) =>
                      updateBody('bijstellingen_belastbaarheid', {
                        revisions: b.bijstellingen_belastbaarheid.revisions.map((r) => (r.id === rev.id ? { ...r, auteur: v } : r)),
                      })
                    }
                  />
                </div>
                <RubriekenPicker
                  value={rev.rubrieken}
                  onChange={(rub) =>
                    updateBody('bijstellingen_belastbaarheid', {
                      revisions: b.bijstellingen_belastbaarheid.revisions.map((r) => (r.id === rev.id ? { ...r, rubrieken: rub } : r)),
                    })
                  }
                />
                <DebouncedTextarea
                  rows={4}
                  placeholder="Benoem per rubriek wat er veranderd is."
                  value={rev.toelichting}
                  onChange={(v) =>
                    updateBody('bijstellingen_belastbaarheid', {
                      revisions: b.bijstellingen_belastbaarheid.revisions.map((r) => (r.id === rev.id ? { ...r, toelichting: v } : r)),
                    })
                  }
                />
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={newRevKind || undefined} onValueChange={(v) => setNewRevKind(v as VGRBelastbaarheidKind)}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  {KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() =>
                  updateBody('bijstellingen_belastbaarheid', {
                    revisions: [
                      { id: newVgrId('rev'), date: data.vgr_meta.report_date, auteur: b.belastbaarheidsprofiel.auteur, kind: newRevKind, rubrieken: [], toelichting: '' },
                      ...b.bijstellingen_belastbaarheid.revisions,
                    ],
                  })
                }
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Bijstelling toevoegen
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <FieldLabel>Toelichting (geen bijstelling)</FieldLabel>
            <DebouncedTextarea
              rows={3}
              placeholder="bijv. Gedurende deze periode is er geen bijstelling bekend bij de loopbaanadviseur … De vastgestelde FML van [datum] blijft ongewijzigd van kracht."
              value={b.bijstellingen_belastbaarheid.toelichting_geen}
              onChange={(v) => updateBody('bijstellingen_belastbaarheid', { toelichting_geen: v })}
            />
          </div>
        )}
      </EditorCard>

      <EditorCard id="wijzigingen_doelstelling" title="Wijzigingen doelstelling" chapterColor={chapterColor('profiel')}>
        <div>
          <FieldLabel>Zijn er wijzigingen ten aanzien van de laatst geformuleerde doelstelling?</FieldLabel>
          <JaNeeControl name="wd-aanwezig" value={b.wijzigingen_doelstelling.aanwezig} onChange={(v) => updateBody('wijzigingen_doelstelling', { aanwezig: v })} />
        </div>
        {b.wijzigingen_doelstelling.aanwezig ? (
          <>
            <Instructie>{VGR_WIJZIGING_DOEL_INSTRUCTIE}</Instructie>
            <DebouncedTextarea value={b.wijzigingen_doelstelling.toelichting} onChange={(v) => updateBody('wijzigingen_doelstelling', { toelichting: v })} />
          </>
        ) : null}
      </EditorCard>

      <EditorCard id="zoekprofiel" title="Zoekprofiel" chapterColor={chapterColor('profiel')} actions={ai('zoekprofiel')}>
        <Instructie>{VGR_ZOEKPROFIEL_INSTRUCTIE}</Instructie>
        <DebouncedTextarea rows={8} value={b.zoekprofiel.tekst} onChange={(v) => updateBody('zoekprofiel', { tekst: v })} />
      </EditorCard>

      {/* ------------------------------------------------------------ */}
      <ChapterHeading chapter="motivatie" />

      <EditorCard id="inzet_houding" title="Inzet en houding werknemer" chapterColor={chapterColor('motivatie')} actions={ai('inzet_houding')}>
        <div>
          <FieldLabel>Werkt werknemer mee aan het spoor 2 traject?</FieldLabel>
          <JaNeeControl name="ih-werkt-mee" value={b.inzet_houding.werkt_mee} onChange={(v) => updateBody('inzet_houding', { werkt_mee: v })} />
        </div>
        <Instructie>{VGR_INZET_INSTRUCTIE}</Instructie>
        <DebouncedTextarea rows={6} value={b.inzet_houding.toelichting} onChange={(v) => updateBody('inzet_houding', { toelichting: v })} />
      </EditorCard>

      <EditorCard id="interventies_motivatie" title="Interventies gericht op motivatie" chapterColor={chapterColor('motivatie')} actions={ai('interventies_motivatie')}>
        <InterventionSectionEditor section={b.interventies_motivatie} options={VGR_MOTIVATIE_OPTIONS} onChange={(s) => setBodySection('interventies_motivatie', s)} />
      </EditorCard>

      {/* ------------------------------------------------------------ */}
      <ChapterHeading chapter="orientatie" />

      <EditorCard id="kwaliteiten_onderzoek" title="Kwaliteiten en vaardigheden onderzoek" chapterColor={chapterColor('orientatie')} actions={ai('kwaliteiten_onderzoek')}>
        <Instructie>
          Vul testresultaten alleen in op basis van daadwerkelijk aangeleverde testrapporten. Gebruik de AI-samenvatting
          (indien beschikbaar) als voorstel en controleer percentages en beroepen tegen het rapport.
        </Instructie>
        {renderTestSummary?.()}
        <InterventionSectionEditor
          section={b.kwaliteiten_onderzoek}
          options={VGR_KWALITEITEN_OPTIONS}
          onChange={(s) => setBodySection('kwaliteiten_onderzoek', { ...b.kwaliteiten_onderzoek, ...s })}
          extraForOption={(opt) => {
            if (opt.id === 'persoonlijkheidstest') {
              return (
                <div className="space-y-2">
                  <FieldLabel hint="percentages + beschrijving per kenmerk">Scores persoonlijkheidstest</FieldLabel>
                  {VGR_PERSONALITY_TRAITS.map((t) => (
                    <div key={t.key} className="grid grid-cols-[150px_70px_1fr] items-start gap-2">
                      <span className="pt-2 text-sm">{t.label}</span>
                      <DebouncedInput
                        className="h-9 text-sm"
                        placeholder="%"
                        value={b.kwaliteiten_onderzoek.persoonlijkheid_scores[t.key]}
                        onChange={(v) =>
                          updateBody('kwaliteiten_onderzoek', {
                            persoonlijkheid_scores: { ...b.kwaliteiten_onderzoek.persoonlijkheid_scores, [t.key]: v.replace('%', '').trim() },
                          })
                        }
                      />
                      <DebouncedTextarea
                        rows={2}
                        className="min-h-[40px]"
                        placeholder="Beschrijving uit testresultaat (positieve punten, aandachtspunten, voorbeeldberoepen)"
                        value={b.kwaliteiten_onderzoek.persoonlijkheid_teksten[t.key]}
                        onChange={(v) =>
                          updateBody('kwaliteiten_onderzoek', {
                            persoonlijkheid_teksten: { ...b.kwaliteiten_onderzoek.persoonlijkheid_teksten, [t.key]: v },
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
              );
            }
            if (opt.id === 'beroepen_arbeidsmarkt') {
              return (
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Beroepen uit de testen</FieldLabel>
                    <StringListEditor items={b.kwaliteiten_onderzoek.beroepen} onChange={(next) => updateBody('kwaliteiten_onderzoek', { beroepen: next })} addLabel="Beroep toevoegen" />
                  </div>
                  <div>
                    <FieldLabel>Conclusie</FieldLabel>
                    <Instructie>Hier onderbouwen waarom bovenstaande beroepen al dan niet passend zijn.</Instructie>
                    <DebouncedTextarea className="mt-2" rows={4} value={b.kwaliteiten_onderzoek.beroepen_conclusie} onChange={(v) => updateBody('kwaliteiten_onderzoek', { beroepen_conclusie: v })} />
                  </div>
                </div>
              );
            }
            return null;
          }}
        />
      </EditorCard>

      <EditorCard id="scholing" title="Scholingsmogelijkheden" chapterColor={chapterColor('orientatie')} actions={ai('scholing')}>
        <Instructie>{VGR_SCHOLING_INSTRUCTIE}</Instructie>
        <InterventionSectionEditor section={b.scholing} options={VGR_SCHOLING_OPTIONS} onChange={(s) => setBodySection('scholing', s)} />
      </EditorCard>

      <EditorCard id="sollicitatie_vaardigheden" title="Sollicitatie vaardigheden" chapterColor={chapterColor('orientatie')} actions={ai('sollicitatie_vaardigheden')}>
        <InterventionSectionEditor section={b.sollicitatie_vaardigheden} options={VGR_SOLLICITATIE_OPTIONS} onChange={(s) => setBodySection('sollicitatie_vaardigheden', s)} withVervolg />
      </EditorCard>

      {/* ------------------------------------------------------------ */}
      <ChapterHeading chapter="activatie" />

      <EditorCard id="interventies_activatie" title="Interventies activatie en arbeidsbemiddeling" chapterColor={chapterColor('activatie')} actions={ai('interventies_activatie')}>
        <InterventionSectionEditor section={b.interventies_activatie} options={VGR_ACTIVATIE_OPTIONS} onChange={(s) => setBodySection('interventies_activatie', s)} withVervolg />
      </EditorCard>

      <EditorCard id="pow" title="Perspectief op werk — PoW-meter™" chapterColor={chapterColor('activatie')} actions={ai('pow')}>
        <Instructie>{VGR_POW_INSTRUCTIE}</Instructie>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <TredeSelect label="Trede bij intake" value={b.pow.intake_trede} onChange={(t) => updateBody('pow', { intake_trede: t })} />
          <TredeSelect label="Huidige trede" value={b.pow.huidige_trede} onChange={(t) => updateBody('pow', { huidige_trede: t, confirmed: true })} />
          <div>
            <TredeSelect label="Doel aankomende periode" value={b.pow.doel_trede} onChange={(t) => updateBody('pow', { doel_trede: t, doel_onbekend: false })} disabled={b.pow.doel_onbekend} />
            <label className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" className="h-3.5 w-3.5" checked={b.pow.doel_onbekend} onChange={(e) => updateBody('pow', { doel_onbekend: e.target.checked })} />
              Nog niet vast te stellen
            </label>
          </div>
        </div>
        {b.pow.huidige_trede && b.pow.doel_trede && b.pow.doel_trede > b.pow.huidige_trede + 1 ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Doeltrede ligt meer dan één trede boven de huidige trede. Onderbouw dit expliciet in de toelichting.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_1fr]">
          <div>
            <FieldLabel>Werkzame uren</FieldLabel>
            <DebouncedInput value={b.pow.werkzame_uren} placeholder="bijv. 8" onChange={(v) => updateBody('pow', { werkzame_uren: v })} />
          </div>
          <div>
            <FieldLabel hint="optioneel">Context werkzame uren</FieldLabel>
            <DebouncedInput value={b.pow.werkzame_uren_context} placeholder="bijv. 2 x 4 uur aangepast werk bij eigen werkgever (spoor 1)" onChange={(v) => updateBody('pow', { werkzame_uren_context: v })} />
          </div>
        </div>
        <div className="space-y-2">
          <FieldLabel hint="meest recente bovenaan">Toelichting onderbouwing PoW-meter™</FieldLabel>
          {b.pow.history.map((m) => (
            <div key={m.id} className="rounded-md border p-2">
              <div className="mb-1 flex items-center justify-between gap-2">
                <Input
                  type="date"
                  className="h-8 w-[170px] text-xs"
                  value={m.date}
                  onChange={(e) => updateBody('pow', { history: b.pow.history.map((x) => (x.id === m.id ? { ...x, date: e.target.value } : x)) })}
                />
                <button type="button" className="rounded p-1 text-muted-foreground hover:text-rose-700" aria-label="Verwijderen" onClick={() => updateBody('pow', { history: b.pow.history.filter((x) => x.id !== m.id) })}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <DebouncedTextarea rows={5} value={m.toelichting} onChange={(v) => updateBody('pow', { history: b.pow.history.map((x) => (x.id === m.id ? { ...x, toelichting: v } : x)) })} />
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" className="h-8 w-[170px] text-xs" value={newPowDate} onChange={(e) => setNewPowDate(e.target.value)} />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1"
              onClick={() => updateBody('pow', { history: [{ id: newVgrId('pow'), date: newPowDate, toelichting: '' }, ...b.pow.history] })}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Nieuwe meting
            </Button>
          </div>
        </div>
      </EditorCard>

      <EditorCard id="visie_plaatsbaarheid" title="Visie op plaatsbaarheid" chapterColor={chapterColor('activatie')} actions={ai('visie_plaatsbaarheid')}>
        <div>
          <FieldLabel>Advies arbeidsdeskundige over passende arbeid</FieldLabel>
          <QuoteEditor value={b.visie_plaatsbaarheid.ad} naamLabel="Naam arbeidsdeskundige" bronTypePlaceholder="AD-rapport" onChange={(q) => updateBody('visie_plaatsbaarheid', { ad: q })} />
        </div>
        <div>
          <FieldLabel>Kansen op de vrije arbeidsmarkt</FieldLabel>
          <Select value={b.visie_plaatsbaarheid.kansen || undefined} onValueChange={(v) => updateBody('visie_plaatsbaarheid', { kansen: v as VGRBody['visie_plaatsbaarheid']['kansen'] })}>
            <SelectTrigger className="w-full sm:w-[320px]"><SelectValue placeholder="Selecteer" /></SelectTrigger>
            <SelectContent>
              {VGR_KANSEN_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <FieldLabel hint="alleen onder voorwaarden passend">Mogelijk passende functies volgens loopbaanadviseur</FieldLabel>
          <StringListEditor items={b.visie_plaatsbaarheid.functies} onChange={(next) => updateBody('visie_plaatsbaarheid', { functies: next })} addLabel="Functie toevoegen" />
        </div>
        <div>
          <FieldLabel>Conclusie</FieldLabel>
          <Instructie>Hier de conclusie vermelden en onderbouwen waarom bovenstaande beroepen uit het onderzoek passend zijn of toch niet.</Instructie>
          <DebouncedTextarea className="mt-2" rows={6} value={b.visie_plaatsbaarheid.conclusie} onChange={(v) => updateBody('visie_plaatsbaarheid', { conclusie: v })} />
        </div>
      </EditorCard>

      <EditorCard id="leernavigator" title="Leernavigator" chapterColor={chapterColor('activatie')} actions={ai('leernavigator')}>
        <p className="text-xs text-muted-foreground">Cumulatief over het traject: vinkjes uit eerdere rapportages blijven staan.</p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Basisinterventies ontwikkeling</h4>
            {b.leernavigator.basis.map((item) => (
              <CheckboxRow
                key={item.id}
                checked={item.checked}
                label={item.label}
                onChange={(c) => updateBody('leernavigator', { basis: b.leernavigator.basis.map((x) => (x.id === item.id ? { ...x, checked: c } : x)) })}
              />
            ))}
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Activeringsinterventies</h4>
            {b.leernavigator.activering.map((item) => (
              <div key={item.id} className="space-y-1">
                <CheckboxRow
                  checked={item.checked}
                  label={leernavigatorLabelWithUren(item)}
                  onChange={(c) => updateBody('leernavigator', { activering: b.leernavigator.activering.map((x) => (x.id === item.id ? { ...x, checked: c } : x)) })}
                />
                {item.checked && item.label.includes('…') ? (
                  <div className="flex items-center gap-2 pl-7">
                    <span className="text-xs text-muted-foreground">Uren per week</span>
                    <DebouncedInput
                      className="h-7 w-[90px] text-xs"
                      value={item.uren}
                      onChange={(v) => updateBody('leernavigator', { activering: b.leernavigator.activering.map((x) => (x.id === item.id ? { ...x, uren: v } : x)) })}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </EditorCard>
    </div>
  );
}

function ChapterHeading({ chapter }: { chapter: (typeof VGR_CHAPTERS)[number]['id'] }) {
  const def = VGR_CHAPTERS.find((c) => c.id === chapter)!;
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="h-5 w-1.5 rounded-sm" style={{ backgroundColor: def.color }} />
      <h2 className="text-base font-bold" style={{ color: def.color }}>
        {def.title}
      </h2>
    </div>
  );
}

function TredeSelect({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: VGRPowTrede;
  onChange: (t: VGRPowTrede) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Select value={value ? String(value) : undefined} onValueChange={(v) => onChange(Number(v) as VGRPowTrede)} disabled={disabled}>
        <SelectTrigger className="w-full"><SelectValue placeholder="Trede" /></SelectTrigger>
        <SelectContent>
          {TREDES.map((t) => (
            <SelectItem key={String(t)} value={String(t)}>Trede {t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
