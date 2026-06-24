export type VGRBijlageChecklistRow = {
  label: string;
  checked: boolean;
};

export type VGRBijlage2PowTrede = {
  trede: number;
  criteria: VGRBijlageChecklistRow[];
};

export type VGRBijlage2Model = {
  willen: VGRBijlageChecklistRow[];
  weten: VGRBijlageChecklistRow[];
  kunnen: VGRBijlageChecklistRow[];
  doen: VGRBijlageChecklistRow[];
  powTredes: VGRBijlage2PowTrede[];
};

export type VGRBijlage3Decision = {
  id: string;
  question: string;
  questionSubtitle?: string;
  hint?: string;
  neeTredeNum: number;
  neeTredeLabel: string;
  neeTredeBody: string;
  doelUren: string;
  werkboeken: string[];
  yesOutcome: string;
  noOutcome: string;
  reached?: 'yes' | 'no' | null;
  doelJa?: boolean;
  doelNee?: boolean;
};

export type VGRBijlage3Page2 = {
  doelJa: boolean;
  doelNee: boolean;
};

export type VGRData = {
  first_name?: string;
  last_name?: string;
  date_of_birth?: string;
  bijlage2_model?: VGRBijlage2Model;
  bijlage3_decisions?: VGRBijlage3Decision[];
  bijlage3_page2?: VGRBijlage3Page2;
};

export function formatNLDate(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(String(input));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}
