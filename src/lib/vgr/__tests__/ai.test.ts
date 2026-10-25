import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectVgrSourceConflicts } from '@/lib/vgr/ai/collect-context';
import { sanitizeGeneratedText } from '@/lib/vgr/ai/sections';
import { ensureVGRShape } from '@/lib/vgr/mapping';

describe('sanitizeGeneratedText', () => {
  it('strips template placeholders but keeps real square-bracket citations', () => {
    assert.equal(sanitizeGeneratedText('Werknemer werkt [datum] 8 uur.'), 'Werknemer werkt 8 uur.');
    assert.equal(sanitizeGeneratedText('Citaat [naam] van de bedrijfsarts.'), 'Citaat van de bedrijfsarts.');
    assert.match(sanitizeGeneratedText('Zie FML [20 maart 2026].'), /FML \[20 maart 2026\]/);
  });
});

describe('detectVgrSourceConflicts', () => {
  it('flags FML=EZD, weekly applications without log, and activation vs solliciteren', () => {
    const data = ensureVGRShape({
      first_sick_day: '2025-01-01',
      fml_izp_lab_date: '2025-01-01',
      body: {
        doelstelling_traject: { huidige: 'activering' },
        interventies_activatie: { selected: ['wekelijks_solliciteren'] },
        pow: { huidige_trede: 4, werkzame_uren: '' },
      },
      applications: [],
    });
    const conflicts = detectVgrSourceConflicts(data, null);
    assert.ok(conflicts.some((c) => /eerste ziektedag/.test(c)));
    assert.ok(conflicts.some((c) => /geen sollicitaties/.test(c)));
    assert.ok(conflicts.some((c) => /activering/.test(c)));
    assert.ok(conflicts.some((c) => /trede 4/.test(c)));
  });
});
