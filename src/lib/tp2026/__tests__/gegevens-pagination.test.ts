import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gegevensPageCountForLegendaSpill } from '@/lib/tp2026/gegevens-pagination';
import {
  GEGEVENS_PAGE_COUNT,
  GEGEVENS_PAGE_COUNT_WITH_LEGENDA_SPILL,
} from '@/lib/tp2026/page-numbering';

describe('gegevensPageCountForLegendaSpill', () => {
  it('keeps default 2 pages when Legenda fits', () => {
    assert.equal(gegevensPageCountForLegendaSpill(false), GEGEVENS_PAGE_COUNT);
    assert.equal(gegevensPageCountForLegendaSpill(false), 2);
  });

  it('uses 3 pages when Legenda spills', () => {
    assert.equal(
      gegevensPageCountForLegendaSpill(true),
      GEGEVENS_PAGE_COUNT_WITH_LEGENDA_SPILL
    );
    assert.equal(gegevensPageCountForLegendaSpill(true), 3);
  });
});
