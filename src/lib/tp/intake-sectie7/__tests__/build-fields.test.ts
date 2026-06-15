import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFunctiesFromIntakeCategories,
  hasIntakeAdviesQuote,
  hasIntakeFunctieCategories,
} from '../build-fields';
import type { IntakeSectie7Content } from '../schema';

const CALVIN_ADVIES =
  'Er is nu geen perspectief op volledige hervatting in werk bij de voormalige eigen werkgever waardoor een 2e spoor traject dient te worden opgestart. Uitgangspunt hierbij is dat werknemer arbeidsmogelijkheden heeft, maar hij is nog niet direct (volledig) inzetbaar. Nadruk op: activering en opbouw inzetbaarheid (bijv. WEP of activeringstraject), met als doel (partiële) werkhervatting in eigen of ander (beter) passend werk.';

const CALVIN_CATEGORIES = [
  {
    naam: 'Computergericht/Administratief',
    toelichting:
      'gegevensverwerking, documentcontrole, digitalisering en archivering, e-learning modules beheren.',
  },
  {
    naam: 'Facilitair',
    toelichting: 'materiaalbeheer, lichte logistiek zonder tijdsdruk, gebouwencontrole.',
  },
  {
    naam: 'En vergelijkbaar',
    toelichting:
      'middels arbeidsmarktonderzoek moet gezocht worden naar meer passende taken/functies en de omstandigheden waarbinnen passend werk kan worden uitgevoerd.',
  },
];

describe('buildFunctiesFromIntakeCategories', () => {
  it('pads Calvin categories to four entries with En soortgelijk', () => {
    const functies = buildFunctiesFromIntakeCategories(CALVIN_CATEGORIES);
    assert.equal(functies.length, 4);
    assert.equal(functies[0].naam, 'Computergericht/Administratief');
    assert.match(functies[0].toelichting, /gegevensverwerking/);
    assert.equal(functies[1].naam, 'Facilitair');
    assert.equal(functies[2].naam, 'En vergelijkbaar');
    assert.equal(functies[3].naam, 'En soortgelijk');
    assert.equal(functies[3].toelichting, '');
  });

  it('pads two categories to four with En soortgelijk fillers', () => {
    const functies = buildFunctiesFromIntakeCategories(CALVIN_CATEGORIES.slice(0, 2));
    assert.equal(functies.length, 4);
    assert.equal(functies[2].naam, 'En soortgelijk');
    assert.equal(functies[3].naam, 'En soortgelijk');
  });
});

describe('hasIntakeAdviesQuote / hasIntakeFunctieCategories', () => {
  it('detects Calvin content flags', () => {
    const content: IntakeSectie7Content = {
      ad_auteur: 'Bea Delhaes',
      ad_datum_iso: '2026-02-02',
      quote_advies_spoor2: CALVIN_ADVIES,
      functie_categorien: CALVIN_CATEGORIES,
    };
    assert.ok(hasIntakeAdviesQuote(content));
    assert.ok(hasIntakeFunctieCategories(content));
    assert.doesNotMatch(CALVIN_ADVIES, /Computergericht/);
  });
});
