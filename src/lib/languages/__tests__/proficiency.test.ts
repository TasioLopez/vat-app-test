import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  languageProficiencySentences,
  mergeLanguageProficiencyLists,
  normalizeLanguageProficiencyList,
  parseOtherLanguagesFreeText,
} from '../proficiency';
import { ensureIntakeShape } from '@/lib/intake/schema';

describe('parseOtherLanguagesFreeText', () => {
  it('parses semicolon-separated name+level chunks', () => {
    assert.deepEqual(parseOtherLanguagesFreeText('Berbers goed; Turks matig'), [
      { language: 'Berbers', level: 'Goed' },
      { language: 'Turks', level: 'Matig' },
    ]);
  });

  it('keeps free-text levels that do not map to the 4-level scale', () => {
    assert.deepEqual(
      parseOtherLanguagesFreeText('Engels verstaanbaar, schriftelijk minder goed'),
      [{ language: 'Engels', level: 'verstaanbaar, schriftelijk minder goed' }]
    );
  });

  it('maps numeric niveau to the Dutch scale', () => {
    assert.deepEqual(parseOtherLanguagesFreeText('Turks 3'), [
      { language: 'Turks', level: 'Voldoende' },
    ]);
  });
});

describe('ensureIntakeShape languages migration', () => {
  it('migrates legacy other_languages into languages[]', () => {
    const shaped = ensureIntakeShape({
      s17: { other_languages: 'Turks voldoende; Engels goed' },
    });
    assert.deepEqual(shaped.s17.languages, [
      { language: 'Turks', level: 'Voldoende' },
      { language: 'Engels', level: 'Goed' },
    ]);
  });

  it('prefers structured languages over legacy string', () => {
    const shaped = ensureIntakeShape({
      s17: {
        languages: [{ language: 'Turks', level: 'Goed' }],
        other_languages: 'Engels matig',
      },
    });
    assert.deepEqual(shaped.s17.languages, [{ language: 'Turks', level: 'Goed' }]);
  });
});

describe('mergeLanguageProficiencyLists', () => {
  it('does not overwrite existing rows', () => {
    const merged = mergeLanguageProficiencyLists(
      [{ language: 'Turks', level: 'Goed' }],
      [
        { language: 'Turks', level: 'Matig' },
        { language: 'Engels', level: 'Voldoende' },
      ]
    );
    assert.deepEqual(merged, [
      { language: 'Turks', level: 'Goed' },
      { language: 'Engels', level: 'Voldoende' },
    ]);
  });
});

describe('languageProficiencySentences', () => {
  it('builds TP sentences from structured rows', () => {
    assert.deepEqual(
      languageProficiencySentences([{ language: 'Turks', level: 'Voldoende' }]),
      ['De Turkse taal beheerst werknemer voldoende.']
    );
  });
});

describe('normalizeLanguageProficiencyList', () => {
  it('drops Dutch and Geen rows', () => {
    assert.deepEqual(
      normalizeLanguageProficiencyList([
        { language: 'Nederlands', level: 'Goed' },
        { language: 'Turks', level: 'Geen' },
        { language: 'Engels', level: 'Goed' },
      ]),
      [{ language: 'Engels', level: 'Goed' }]
    );
  });
});
