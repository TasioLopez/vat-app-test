/**
 * Phase 3: EDIT_MODULE_WITH_FEEDBACK fact-vs-style gate (T18 / T19).
 * Style-only feedback may rewrite the selected module.
 * Fact-like feedback requires explicit confirmation / evidence — not a silent style edit.
 */

export type VgrFeedbackKind = 'style' | 'fact' | 'mixed' | 'empty';

export type VgrFeedbackGateResult = {
  kind: VgrFeedbackKind;
  requires_fact_review: boolean;
  /** Concrete confirmation question when fact claims are detected. */
  confirmation_question: string | null;
  /** Matched fact-signal phrases (for notes / UI). */
  fact_signals: string[];
};

const FACT_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\b(is\s+)?verstuurd\b/i, label: 'verzending claim' },
  { re: /\bverzonden\b/i, label: 'verzonden' },
  { re: /\bheeft\s+gesolliciteerd\b/i, label: 'sollicitatie uitgevoerd' },
  { re: /\bmeegelopen\b/i, label: 'meeloop' },
  { re: /\bafgewezen\b/i, label: 'afwijzing' },
  { re: /\baangenomen\b|\baangenomen\s+voor\b/i, label: 'aangenomen' },
  { re: /\buren\s*(per\s*week)?\s*(is|zijn|=|:)\s*\d/i, label: 'urenwijziging' },
  { re: /\btrede\s*[1-6]\b/i, label: 'PoW-trede' },
  { re: /\bfml\b|\bizp\b|\bbelastbaar/i, label: 'medische/belastbaarheidsclaim' },
  { re: /\bdatum\b.{0,20}\d{1,2}[-/]\d{1,2}/i, label: 'datumclaim' },
  { re: /\bde\s+brief\s+is\b/i, label: 'briefstatus' },
  { re: /\bniet\s+uitgevoerd\b|\bwél\s+uitgevoerd\b|\bwel\s+uitgevoerd\b/i, label: 'uitvoeringsstatus' },
  { re: /\bvoeg\s+(toe|het\s+feit)\b|\bregistreer\b|\bwijzig\s+het\s+feit\b/i, label: 'feitcorrectie' },
];

const STYLE_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bkorter\b|\bbeknopter\b|\bbing\s+in\b/i, label: 'lengte' },
  { re: /\btoon\b|\bformeler\b|\binformeler\b|\bzakelijker\b/i, label: 'toon' },
  { re: /\bherschrijf\b|\bherformuleer\b|\bformuleer\b/i, label: 'herformulering' },
  { re: /\bduidelijker\b|\bleesbaarder\b|\bstructuur\b/i, label: 'structuur' },
  { re: /\bverleden\s+tijd\b|\btegenwoordige\s+tijd\b/i, label: 'tempus' },
  { re: /\bzonder\s+feiten\s+te\s+schrappen\b/i, label: 'stijl-zonder-feitverlies' },
];

/**
 * Classify coach feedback before AI rewrite (pack EDIT_MODULE_WITH_FEEDBACK).
 */
export function classifyModuleFeedback(instruction: string | null | undefined): VgrFeedbackGateResult {
  const text = String(instruction ?? '').trim();
  if (!text) {
    return { kind: 'empty', requires_fact_review: false, confirmation_question: null, fact_signals: [] };
  }

  const fact_signals = FACT_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);
  const styleHits = STYLE_PATTERNS.filter((p) => p.re.test(text)).map((p) => p.label);

  if (fact_signals.length && styleHits.length) {
    return {
      kind: 'mixed',
      requires_fact_review: true,
      confirmation_question:
        'Deze instructie lijkt feitelijke claims te bevatten. Bevestig het feit met bron/bewijs, of herformuleer als pure stijlaanpassing.',
      fact_signals,
    };
  }
  if (fact_signals.length) {
    return {
      kind: 'fact',
      requires_fact_review: true,
      confirmation_question:
        'Dit lijkt een feitcorrectie (niet alleen stijl). Bevestig expliciet met bron, of voeg bewijs toe — niet als stille stijledit verwerken (T19).',
      fact_signals,
    };
  }
  if (styleHits.length || text.length > 0) {
    return {
      kind: styleHits.length ? 'style' : 'style',
      requires_fact_review: false,
      confirmation_question: null,
      fact_signals: [],
    };
  }
  return { kind: 'empty', requires_fact_review: false, confirmation_question: null, fact_signals: [] };
}
