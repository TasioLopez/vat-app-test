import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getBasisToelichtingLabel,
  normalizeWkMarkdown,
  TP_WK_INTRO_LINE,
} from '@/lib/tp2026/basis-document-layout';

describe('basis-document-layout', () => {
  it('returns WK intro line for wk key', () => {
    assert.equal(getBasisToelichtingLabel('wk'), TP_WK_INTRO_LINE);
    assert.equal(getBasisToelichtingLabel('ad'), null);
  });

  it('strips stored WK intro line from markdown body', () => {
    const body = normalizeWkMarkdown(
      `${TP_WK_INTRO_LINE}\n• Eerste punt;\n• Tweede punt;`
    );
    assert.match(body, /^• Eerste punt;/);
    assert.doesNotMatch(body, /Werknemer heeft uitleg en informatie/);
  });
});
