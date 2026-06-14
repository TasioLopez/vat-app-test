import {
  TP2026_PROFIEL_PREVIEW_META,
  TP2026_PROFIEL_WERKNEMER_FIELD_ORDER,
  type TP2026ProfielWerknemerFieldKey,
} from '@/lib/tp2026/basis-profiel-field-order';
import { TP_SPOOR2_SECTION_TITLE } from '@/lib/tp2026/basis-spoor2-begeleiding';

export type BasisEditorSectionKind = 'markdown' | 'spoor2';

export type BasisEditorSectionId = 'inleiding' | TP2026ProfielWerknemerFieldKey | 'tp3_activities';

export type BasisEditorSectionDef = {
  id: BasisEditorSectionId;
  label: string;
  kind: BasisEditorSectionKind;
};

export const BASIS_EDITOR_SECTIONS: BasisEditorSectionDef[] = [
  { id: 'inleiding', label: 'Inleiding', kind: 'markdown' },
  ...TP2026_PROFIEL_WERKNEMER_FIELD_ORDER.map((key) => ({
    id: key,
    label: TP2026_PROFIEL_PREVIEW_META[key].editorLabel,
    kind: 'markdown' as const,
  })),
  { id: 'tp3_activities', label: TP_SPOOR2_SECTION_TITLE, kind: 'spoor2' },
];

export const BASIS_EDITOR_SECTION_IDS: BasisEditorSectionId[] = BASIS_EDITOR_SECTIONS.map((s) => s.id);

const BASIS_EDITOR_SECTION_ID_SET = new Set<string>(BASIS_EDITOR_SECTION_IDS);

export function isBasisEditorSectionId(id: string): id is BasisEditorSectionId {
  return BASIS_EDITOR_SECTION_ID_SET.has(id);
}

export function isBasisEditorSectionField(field: string): field is BasisEditorSectionId {
  return isBasisEditorSectionId(field);
}

export function getBasisEditorSection(id: BasisEditorSectionId): BasisEditorSectionDef {
  const section = BASIS_EDITOR_SECTIONS.find((s) => s.id === id);
  if (!section) throw new Error(`Unknown basis editor section: ${id}`);
  return section;
}
