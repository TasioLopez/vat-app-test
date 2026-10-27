import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createEmptyIntakeData } from '@/lib/intake/schema';
import {
  intakePraktischeBelemmeringen,
  intakeTextForInleiding,
  intakeTextForPersoonlijkProfiel,
  intakeTextForPowMeter,
  intakeTextForSociale,
  intakeTextForVisieLoopbaanadviseur,
  intakeTextForVisieWerknemer,
  intakeTextForZoekprofiel,
  intakeToSectie3Content,
  intakeToSectie5Content,
  intakeToSectie7Content,
  omitIntakePdfDocs,
} from '@/lib/intake/tp-source';

describe('validated intake TP source', () => {
  it('returns no text for an empty intake', () => {
    const data = createEmptyIntakeData();
    assert.equal(intakeTextForInleiding(data), '');
    assert.equal(intakeTextForSociale(data), '');
    assert.equal(intakeTextForVisieWerknemer(data), '');
    assert.equal(intakeTextForPersoonlijkProfiel(data), '');
    assert.equal(intakeTextForPowMeter(data), '');
    assert.equal(intakeTextForVisieLoopbaanadviseur(data), '');
    assert.equal(intakeTextForZoekprofiel(data), '');
    assert.equal(intakePraktischeBelemmeringen(data), '');
    assert.equal(intakeToSectie3Content(data), null);
    assert.equal(intakeToSectie5Content(data), null);
    assert.equal(intakeToSectie7Content(data), null);
  });

  it('keeps inleiding source fields in their own sections', () => {
    const data = createEmptyIntakeData();
    data.s3.korte_beschrijving_werkzaamheden = 'Als docent LB is werknemer verantwoordelijk voor lessen.';
    data.s7.quote_advies_spoor2 = 'Wanneer er bij de eigen organisatie geen vacatures zijn.';
    data.s4.extra_referent_name = 'P. Jansen';

    const text = intakeTextForInleiding(data);
    assert.match(text, /Sectie 3 Functiebeschrijving/);
    assert.match(text, /Als docent LB is werknemer verantwoordelijk voor lessen/);
    assert.match(text, /Sectie 7 Advies arbeidsdeskundige/);
    assert.match(text, /Wanneer er bij de eigen organisatie geen vacatures zijn/);
    assert.match(text, /P\. Jansen/);
    assert.doesNotMatch(text, /Sectie 8 Woonsituatie/);

    const sectie3 = intakeToSectie3Content(data);
    assert.equal(
      sectie3?.korte_beschrijving_werkzaamheden,
      'Als docent LB is werknemer verantwoordelijk voor lessen.'
    );
  });

  it('limits sociale achtergrond to social sections plus transport and language', () => {
    const data = createEmptyIntakeData();
    data.s8.woonsituatie = 'Woont samen met partner.';
    data.s11.energie_belastbaarheid = 'Energetische beperking.';
    data.s13.wens_terugkeer = 'Wil terug in eigen werk.';
    data.s17.transport_types = ['fiets'];
    data.s17.dutch_speaking = 'G';

    const text = intakeTextForSociale(data);
    assert.match(text, /Woont samen met partner/);
    assert.match(text, /Energetische beperking/);
    assert.match(text, /fiets/);
    assert.match(text, /Nederlands spreken: G/);
    assert.doesNotMatch(text, /Wil terug in eigen werk/);
  });

  it('builds visie werknemer from re-integratie and visie sections', () => {
    const data = createEmptyIntakeData();
    data.s6.actief_spoor1 = 'Ja, 8 uur';
    data.s6.ervaart_belastbaarheid = 'Beperkt belastbaar.';
    data.s14.houding_spoor2 = 'Staat open voor spoor 2.';
    data.s8.woonplaats = 'Utrecht';

    const text = intakeTextForVisieWerknemer(data);
    assert.match(text, /Ja, 8 uur/);
    assert.match(text, /Beperkt belastbaar/);
    assert.match(text, /Staat open voor spoor 2/);
    assert.doesNotMatch(text, /Utrecht/);
  });

  it('builds persoonlijk profiel from job and section 17 profile facts', () => {
    const data = createEmptyIntakeData();
    data.s2.current_job = 'Docent LB';
    data.s17.education_level = 'HBO';
    data.s17.opleidingen = [{ opleiding: 'Pabo', afgerond: 'ja' }];
    data.s17.has_pc = true;
    data.s12.hobbies = 'Lezen';

    const text = intakeTextForPersoonlijkProfiel(data);
    assert.match(text, /Docent LB/);
    assert.match(text, /HBO/);
    assert.match(text, /Pabo — afgerond/);
    assert.match(text, /PC: ja/);
    assert.doesNotMatch(text, /Lezen/);
  });

  it('includes hours and daily activity for the POW-meter', () => {
    const data = createEmptyIntakeData();
    data.s6.uren_werkzaam = '12 uur';
    data.s11.gemiddelde_dag = 'Ochtend rust, middag afspraken.';
    data.s14.houding_spoor2 = 'Wil meewerken.';

    const text = intakeTextForPowMeter(data);
    assert.match(text, /12 uur/);
    assert.match(text, /Ochtend rust/);
    assert.match(text, /Wil meewerken/);
  });

  it('gives zoekprofiel and visie loopbaanadviseur the opleiding and work slices they read', () => {
    const data = createEmptyIntakeData();
    data.s2.current_job = 'Operator';
    data.s17.work_experience = 'Productie en logistiek.';
    data.s16.interesses_voorkeuren = 'Administratief werk.';
    data.s12.hobbies = 'Tuinieren';

    const zoek = intakeTextForZoekprofiel(data);
    assert.match(zoek, /Operator/);
    assert.match(zoek, /Productie en logistiek/);
    assert.doesNotMatch(zoek, /Administratief werk/);
    assert.doesNotMatch(zoek, /Tuinieren/);

    const visie = intakeTextForVisieLoopbaanadviseur(data);
    assert.match(visie, /Operator/);
    assert.match(visie, /Productie en logistiek/);
    assert.match(visie, /Administratief werk/);
    assert.doesNotMatch(visie, /Tuinieren/);
  });

  it('maps sectie 5 quote and checked rubrieken', () => {
    const data = createEmptyIntakeData();
    data.s5.quote_prognose_advies_belastbaarheid = 'Belastbaarheid blijft beperkt.';
    data.s5.fml_beperkingen.werktijden = true;
    data.s5.fml_beperkingen.persoonlijk_functioneren = true;

    const content = intakeToSectie5Content(data);
    assert.equal(content?.quote_prognose_advies_belastbaarheid, 'Belastbaarheid blijft beperkt.');
    assert.deepEqual(content?.rubrieken, ['Persoonlijk functioneren', 'Werktijden']);
  });

  it('maps sectie 7 into the AD advies content shape', () => {
    const data = createEmptyIntakeData();
    data.s6.ad_report_date = '2026-03-01';
    data.s6.occupational_doctor_ad_name = 'R. Teegelaar';
    data.s7.quote_advies_spoor2 = 'Spoor 2 is geïndiceerd.';
    data.s7.quote_passende_functies = 'Passend: administratief werk.';
    data.s7.functie_categorien = [{ naam: 'Administratief', toelichting: 'Zoals: receptionist' }];

    const content = intakeToSectie7Content(data);
    assert.equal(content?.ad_auteur, 'R. Teegelaar');
    assert.equal(content?.ad_datum_iso, '2026-03-01');
    assert.equal(content?.quote_advies_spoor2, 'Spoor 2 is geïndiceerd.');
    assert.equal(content?.quote_passende_functies, 'Passend: administratief werk.');
    assert.deepEqual(content?.functie_categorien, [
      { naam: 'Administratief', toelichting: 'Zoals: receptionist' },
    ]);
  });

  it('prefers the sectie 7 author over the sectie 6 AD name', () => {
    const data = createEmptyIntakeData();
    data.s6.occupational_doctor_ad_name = 'R. Teegelaar';
    data.s7.ad_auteur = 'I. Beewen';
    const content = intakeToSectie7Content(data);
    assert.equal(content?.ad_auteur, 'I. Beewen');
  });

  it('returns practical barriers verbatim', () => {
    const data = createEmptyIntakeData();
    data.s17.praktische_belemmeringen = 'Geen rijbewijs en beperkt ov.';
    assert.equal(intakePraktischeBelemmeringen(data), 'Geen rijbewijs en beperkt ov.');
  });

  it('drops intake PDFs and keeps AD and FML documents', () => {
    const docs = omitIntakePdfDocs([
      { type: 'intakeformulier', url: 'a' },
      { type: 'ad_rapport', url: 'b' },
      { type: 'fml', url: 'c' },
    ]);
    assert.deepEqual(
      docs.map((doc) => doc.type),
      ['ad_rapport', 'fml']
    );
  });
});
