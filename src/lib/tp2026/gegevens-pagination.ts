import {
  GEGEVENS_PAGE_COUNT,
  GEGEVENS_PAGE_COUNT_WITH_LEGENDA_SPILL,
} from '@/lib/tp2026/page-numbering';

/** Gegevens page count when Legenda spills to its own page. */
export function gegevensPageCountForLegendaSpill(spillLegenda: boolean): number {
  return spillLegenda ? GEGEVENS_PAGE_COUNT_WITH_LEGENDA_SPILL : GEGEVENS_PAGE_COUNT;
}
