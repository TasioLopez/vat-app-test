import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  hasIntakeFunctiebeschrijving,
  sanitizeIntakeSectie3Content,
} from '../build-fields';
import type { IntakeSectie3Content } from '../schema';

const YOUSRA_FUNCTIEBESCHRIJVING =
  'De activiteiten- en welzijnsbegeleider ondersteunt en coacht de teamleider en het multidisciplinaire team bij het bevorderen van het welzijn van onze klanten. Daarnaast levert de activiteiten- en welzijnsbegeleider een grote bijdrage aan de ontwikkeling van het welzijnsplan (waaronder (groeps)activiteiten) van de locatie en draagt bij aan de uitvoering. Het welzijn van klanten wordt bevorderd door in álle onderdelen van de dagelijkse zorgverlening het welzijn centraal te stellen.';

describe('sanitizeIntakeSectie3Content', () => {
  it('strips leaked Korte beschrijving van de werkzaamheden label', () => {
    const content: IntakeSectie3Content = {
      korte_beschrijving_werkzaamheden: `Korte beschrijving van de werkzaamheden: ${YOUSRA_FUNCTIEBESCHRIJVING}`,
    };

    const sanitized = sanitizeIntakeSectie3Content(content);
    assert.equal(sanitized.korte_beschrijving_werkzaamheden, YOUSRA_FUNCTIEBESCHRIJVING);
    assert.doesNotMatch(sanitized.korte_beschrijving_werkzaamheden!, /Korte beschrijving van de werkzaamheden/);
  });

  it('strips label when no space after colon', () => {
    const content: IntakeSectie3Content = {
      korte_beschrijving_werkzaamheden: `Korte beschrijving van de werkzaamheden:${YOUSRA_FUNCTIEBESCHRIJVING}`,
    };

    const sanitized = sanitizeIntakeSectie3Content(content);
    assert.equal(sanitized.korte_beschrijving_werkzaamheden, YOUSRA_FUNCTIEBESCHRIJVING);
  });

  it('preserves Yousra verbatim key phrases', () => {
    const content: IntakeSectie3Content = {
      korte_beschrijving_werkzaamheden: YOUSRA_FUNCTIEBESCHRIJVING,
    };

    const sanitized = sanitizeIntakeSectie3Content(content);
    assert.match(sanitized.korte_beschrijving_werkzaamheden!, /activiteiten- en welzijnsbegeleider/);
    assert.match(sanitized.korte_beschrijving_werkzaamheden!, /welzijnsplan/);
    assert.match(sanitized.korte_beschrijving_werkzaamheden!, /dagelijkse zorgverlening/);
  });
});

describe('hasIntakeFunctiebeschrijving', () => {
  it('returns true when quote present', () => {
    assert.ok(
      hasIntakeFunctiebeschrijving({
        korte_beschrijving_werkzaamheden: YOUSRA_FUNCTIEBESCHRIJVING,
      })
    );
  });

  it('returns false when null or empty', () => {
    assert.ok(!hasIntakeFunctiebeschrijving({ korte_beschrijving_werkzaamheden: null }));
    assert.ok(!hasIntakeFunctiebeschrijving({ korte_beschrijving_werkzaamheden: '   ' }));
  });
});
