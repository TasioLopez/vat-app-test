import { verifiedFactsForWrite } from './merge';
import type { VgrDossier } from './types';

/**
 * Compact verified-fact block for WRITE_VGR_MODULE prompts (Phase 2).
 * Prefer this over stuffing every PDF into the model context.
 */
export function formatVerifiedFactsForPrompt(dossier: VgrDossier): string {
  const { facts, activities, quarantinedSourceIds } = verifiedFactsForWrite(dossier);
  const lines: string[] = [
    '## Geverifieerde dossierfeiten (gebruik als primaire bron; PDFs alleen als bewijs)',
  ];

  if (quarantinedSourceIds.length) {
    lines.push(
      `Quarantaine (niet gebruiken): ${quarantinedSourceIds.join(', ')}`,
    );
  }

  if (!facts.length && !activities.length) {
    lines.push('Geen goedgekeurde/geverifieerde claims in het dossierobject. Verzin niets; markeer UNKNOWN waar nodig.');
    return lines.join('\n');
  }

  if (facts.length) {
    lines.push('### Assertions');
    for (const f of facts.slice(0, 80)) {
      const evid = f.evidence
        .map((e) => `${e.source_id}@${e.source_anchor}[${e.quote_verification}]`)
        .join('; ');
      lines.push(
        `- [${f.claim_id}] ${f.field_key} = ${JSON.stringify(f.value)} (${f.status}/${f.basis}; ${evid || 'geen evidence'})`,
      );
    }
  }

  if (activities.length) {
    lines.push('### Activities (status strikt respecteren)');
    for (const a of activities.slice(0, 60)) {
      lines.push(
        `- [${a.activity_id}] ${a.activity_type} status=${a.activity_status} app=${a.application_status}` +
          `${a.activity_date ? ` date=${a.activity_date}` : ''}` +
          `${a.organization ? ` org=${a.organization}` : ''}` +
          `${a.position_or_purpose ? ` purpose=${a.position_or_purpose}` : ''}` +
          `${a.result ? ` result=${a.result}` : ''}`,
      );
    }
  }

  lines.push(
    'Regels: opgesteld≠verzonden; gepland≠uitgevoerd; AD is geen medische lead voor benutbare mogelijkheden; geen citaten zonder exact_verified.',
  );
  return lines.join('\n');
}
