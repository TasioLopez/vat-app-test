import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getActiveCvModel, normalizeCvPayload } from '../normalize';

describe('normalizeCvPayload', () => {
  it('returns v2 payload for null', () => {
    const p = normalizeCvPayload(null);
    assert.equal(p.schemaVersion, 2);
    assert.equal(getActiveCvModel(p).personal.fullName, '');
    assert.equal(getActiveCvModel(p).profile, '');
    assert.deepEqual(getActiveCvModel(p).experience, []);
    assert.ok(Array.isArray(p.layout));
  });

  it('migrates v1 flat model to v2', () => {
    const p = normalizeCvPayload({
      personal: { fullName: 'A B', email: 'a@b.nl' },
      profile: 'Hello',
      experience: [{ id: '1', role: 'X' }],
    });
    assert.equal(p.schemaVersion, 2);
    const m = getActiveCvModel(p);
    assert.equal(m.personal.fullName, 'A B');
    assert.equal(m.personal.email, 'a@b.nl');
    assert.equal(m.profile, 'Hello');
    assert.equal(m.experience[0].role, 'X');
  });

  it('coerces numeric skill bullet on migrate', () => {
    const p = normalizeCvPayload({ skills: [{ id: '1', text: '3' }] });
    const m = getActiveCvModel(p);
    assert.match(m.digitalSkills ?? '', /Gemiddeld/);
    assert.equal(m.skills.length, 0);
  });

  it('preserves layoutOptions.sidebarPosition right', () => {
    const p = normalizeCvPayload({
      schemaVersion: 2,
      activeLocale: 'nl',
      content: { nl: { personal: { fullName: 'A' } } },
      layout: [],
      layoutOptions: { sidebarPosition: 'right' },
    });
    assert.equal(p.layoutOptions?.sidebarPosition, 'right');
  });

  it('defaults invalid sidebarPosition to left', () => {
    const p = normalizeCvPayload({
      schemaVersion: 2,
      activeLocale: 'nl',
      content: { nl: { personal: { fullName: 'A' } } },
      layout: [],
      layoutOptions: { sidebarPosition: 'invalid' },
    });
    assert.equal(p.layoutOptions?.sidebarPosition, 'left');
  });

  it('omits layoutOptions when absent from payload', () => {
    const p = normalizeCvPayload({
      schemaVersion: 2,
      activeLocale: 'nl',
      content: { nl: { personal: { fullName: 'A' } } },
      layout: [],
    });
    assert.equal(p.layoutOptions, undefined);
  });
});
