/**
 * EXTRACT_SOURCE_ASSERTIONS (Phase 2 lite): heuristic extract from text snippets
 * without inventing status transitions. AI-backed extract can enrich later.
 */
import { verifyQuoteInSource } from './quote-verify';
import type { VgrActivity, VgrAssertion, VgrSourceDocument } from './types';

export type ExtractResult = {
  assertions: VgrAssertion[];
  activities: VgrActivity[];
};

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Extract claim/activity candidates from a classified source + optional plain text.
 * Status honesty: motivatiebrief without send proof → letter_work / draft (not sent).
 * Planned-only language → planned (not completed).
 */
export function extractAssertionsFromSource(params: {
  source: VgrSourceDocument;
  text?: string;
}): ExtractResult {
  const { source } = params;
  const text = String(params.text || '').trim();
  const assertions: VgrAssertion[] = [];
  const activities: VgrActivity[] = [];

  if (source.quarantined || !source.readable) {
    return { assertions, activities };
  }

  const evidenceBase = {
    source_id: source.source_id,
    source_anchor: 'document',
    evidence_excerpt: text.slice(0, 240),
    quote_verification: (text ? verifyQuoteInSource(text.slice(0, 80), text) : 'not_a_quote') as const,
  };

  if (source.doc_type === 'MOTIVATIEBRIEF') {
    const sent = /\bverzonden\b/i.test(text) && /\bverzend(bewijs|mail|bevestiging)\b/i.test(text);
    activities.push({
      activity_id: newId('act'),
      activity_type: 'letter_work',
      activity_status: sent ? 'completed' : 'partially_completed',
      activity_date: source.document_date,
      application_status: sent ? 'sent' : 'draft',
      result: sent ? 'Motivatiebrief verzonden (met bewijs).' : 'Motivatiebrief opgesteld; verzending niet bevestigd.',
      next_action: sent ? null : 'Verzendbewijs toevoegen of status handmatig bevestigen.',
      track: 'spoor2',
      claim_ids: [],
      evidence: [{ ...evidenceBase, quote_verification: 'not_a_quote' }],
    });
  }

  if (source.doc_type === 'EMAIL') {
    const sent = /\b(verzonden|sent)\b/i.test(text);
    activities.push({
      activity_id: newId('act'),
      activity_type: 'employer_contact',
      activity_status: sent ? 'completed' : 'in_progress',
      activity_date: source.document_date,
      application_status: sent ? 'sent' : 'draft',
      result: null,
      next_action: null,
      track: 'spoor2',
      claim_ids: [],
      evidence: [{ ...evidenceBase, quote_verification: 'not_a_quote' }],
    });
  }

  if (source.doc_type === 'TEST') {
    activities.push({
      activity_id: newId('act'),
      activity_type: 'test',
      activity_status: 'completed',
      activity_date: source.document_date,
      application_status: 'none',
      result: 'Testrapport aanwezig.',
      next_action: null,
      track: 'spoor2',
      claim_ids: [],
      evidence: [{ ...evidenceBase, quote_verification: 'not_a_quote' }],
    });
  }

  if (source.doc_type === 'AD' || source.doc_type === 'BA_CONSULT' || source.doc_type === 'FML') {
    // Capture a short verbatim window if quotes appear in «…» or "…"
    const quoteMatch = text.match(/[«"]([^»"]{20,400})[»"]/);
    if (quoteMatch) {
      const citaat = quoteMatch[1];
      const verification = verifyQuoteInSource(citaat, text);
      assertions.push({
        claim_id: newId('claim'),
        field_key:
          source.doc_type === 'AD'
            ? 'visie_plaatsbaarheid.ad_citaat'
            : 'benutbare_mogelijkheden.quote',
        value: citaat,
        status: verification === 'exact_verified' ? 'known' : 'unknown',
        basis: 'explicit_source',
        asserted_by: 'professional',
        source_date: source.document_date,
        effective_from: source.document_date,
        evidence: [
          {
            source_id: source.source_id,
            source_anchor: 'quoted_passage',
            evidence_excerpt: citaat,
            quote_verification: verification,
          },
        ],
        approval: verification === 'exact_verified' ? 'proposed' : 'review_required',
      });
    }
  }

  if (/\bgepland\b/i.test(text) && /\b(volgende fase|later|toekomst)\b/i.test(text)) {
    activities.push({
      activity_id: newId('act'),
      activity_type: 'other',
      activity_status: 'planned',
      activity_date: null,
      application_status: 'none',
      result: null,
      next_action: 'Alleen in planning; niet als uitgevoerd rapporteren.',
      track: 'spoor2',
      claim_ids: [],
      evidence: [{ ...evidenceBase, quote_verification: 'not_a_quote' }],
    });
  }

  return { assertions, activities };
}
