import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyWorkerFacts,
  applyWorkerFactsToDocument,
  computeWorkerFactsHash,
  planWorkerFactWrites,
  stripWorkerFacts,
  type WorkerFactsSnapshot,
} from '../save-worker-facts';
import { computeEmployeeFieldHash } from '../field-review';

function snapshot(values: Record<string, unknown>, extras?: Partial<WorkerFactsSnapshot>): WorkerFactsSnapshot {
  return {
    values,
    profileReview: {},
    profileHash: {},
    caseReview: {},
    caseHash: {},
    ...extras,
  };
}

describe('planWorkerFactWrites', () => {
  it('does not let an empty autofill value clear a filled field', () => {
    const current = snapshot({ education_level: 'MBO 2', drivers_license: true });
    const planned = planWorkerFactWrites(
      current,
      { education_level: null, drivers_license_type: [] },
      'autofill'
    );
    assert.deepEqual(planned.written, []);
    assert.equal(planned.values.education_level, 'MBO 2');
    assert.equal(planned.values.drivers_license, true);
  });

  it('clears orphan license types when autofill proposes no license', () => {
    const current = snapshot({
      drivers_license: false,
      drivers_license_type: ['C1'],
    });
    const planned = planWorkerFactWrites(
      current,
      { drivers_license: false, drivers_license_type: [] },
      'autofill'
    );
    assert.ok(planned.written.includes('drivers_license_type'));
    // Empty license types normalize to null in the worker store.
    assert.equal(planned.values.drivers_license_type, null);
    assert.equal(planned.values.drivers_license, false);
  });

  it('does not overwrite a known non-empty value during autofill', () => {
    const current = snapshot({ dutch_speaking: 'Goed', education_level: 'MBO 2' });
    const planned = planWorkerFactWrites(
      current,
      { dutch_speaking: 'Geen', education_level: 'HBO' },
      'autofill'
    );
    assert.deepEqual(planned.written, []);
    assert.equal(planned.values.dutch_speaking, 'Goed');
    assert.equal(planned.values.education_level, 'MBO 2');
  });

  it('lets autofill replace weak Geen with a real Dutch level', () => {
    const current = snapshot({ dutch_speaking: 'Geen' });
    const planned = planWorkerFactWrites(current, { dutch_speaking: 'Goed' }, 'autofill');
    assert.deepEqual(planned.written, ['dutch_speaking']);
    assert.equal(planned.values.dutch_speaking, 'Goed');
  });

  it('lets autofill replace false no-license when types are found', () => {
    const current = snapshot({ drivers_license: false, drivers_license_type: null });
    const planned = planWorkerFactWrites(
      current,
      { drivers_license: true, drivers_license_type: ['B'] },
      'autofill'
    );
    assert.ok(planned.written.includes('drivers_license'));
    assert.ok(planned.written.includes('drivers_license_type'));
    assert.equal(planned.values.drivers_license, true);
    assert.deepEqual(planned.values.drivers_license_type, ['B']);
  });

  it('promote locks filled shared keys as validated', () => {
    const current = snapshot({ dutch_speaking: 'Goed', phone: null });
    const planned = planWorkerFactWrites(
      current,
      { dutch_speaking: 'Goed', phone: null, drivers_license: false, drivers_license_type: [] },
      'promote'
    );
    assert.equal(planned.profileReview.dutch_speaking, 'validated');
    assert.ok(planned.profileHash.dutch_speaking);
    assert.equal(planned.profileReview.phone, undefined);
    assert.equal(planned.values.drivers_license, false);
    assert.equal(planned.values.drivers_license_type ?? null, null);
    assert.equal(planned.profileReview.drivers_license, 'validated');
    assert.equal(planned.profileReview.drivers_license_type, 'validated');
  });

  it('skips a validated field and reports it', () => {
    const hash = computeEmployeeFieldHash('education_level', { education_level: 'HBO' });
    const current = snapshot(
      { education_level: 'HBO' },
      { profileReview: { education_level: 'validated' }, profileHash: { education_level: hash } }
    );
    const planned = planWorkerFactWrites(current, { education_level: 'MBO 4' }, 'autofill');
    assert.deepEqual(planned.written, []);
    assert.equal(planned.values.education_level, 'HBO');
    assert.equal(planned.skippedValidated.length, 1);
    assert.equal(planned.skippedValidated[0].key, 'education_level');
    assert.equal(planned.skippedValidated[0].proposed, 'MBO 4');
  });

  it('does not reset an untouched validated field on a human edit of another field', () => {
    const hash = computeEmployeeFieldHash('education_level', { education_level: 'HBO' });
    const current = snapshot(
      { education_level: 'HBO', phone: '0611111111' },
      { profileReview: { education_level: 'validated' }, profileHash: { education_level: hash } }
    );
    const planned = planWorkerFactWrites(current, { education_level: 'HBO', phone: '0622222222' }, 'human');
    assert.deepEqual(planned.written, ['phone']);
    assert.equal(planned.profileReview.education_level, 'validated');
    assert.equal(planned.profileHash.education_level, hash);
    assert.equal(planned.profileReview.phone, 'review');
  });

  it('lets a boolean false fill a null value during autofill', () => {
    const current = snapshot({ drivers_license: null });
    const planned = planWorkerFactWrites(current, { drivers_license: false }, 'autofill');
    assert.deepEqual(planned.written, ['drivers_license']);
    assert.equal(planned.values.drivers_license, false);
  });

  it('does not materialize false over null on a human save', () => {
    const current = snapshot({ drivers_license: null });
    const planned = planWorkerFactWrites(current, { drivers_license: false }, 'human');
    assert.deepEqual(planned.written, []);
    assert.equal(planned.values.drivers_license, null);
  });

  it('confirm replaces a validated field', () => {
    const hash = computeEmployeeFieldHash('education_level', { education_level: 'HBO' });
    const current = snapshot(
      { education_level: 'HBO' },
      { profileReview: { education_level: 'validated' }, profileHash: { education_level: hash } }
    );
    const planned = planWorkerFactWrites(current, { education_level: 'MBO 4' }, 'confirm', {
      confirmKeys: ['education_level'],
    });
    assert.deepEqual(planned.written, ['education_level']);
    assert.equal(planned.values.education_level, 'MBO 4');
    assert.equal(planned.profileReview.education_level, 'review');
    assert.equal(planned.skippedValidated.length, 0);
  });

  it('lets intake autofill overwrite unvalidated create-form email', () => {
    const current = snapshot({ email: 'tulayguduk@hotmail.nl' });
    const planned = planWorkerFactWrites(
      current,
      { email: 'tulayguduk@hotmail.com' },
      'autofill',
      { overwriteUnvalidatedKeys: ['email'] }
    );
    assert.deepEqual(planned.written, ['email']);
    assert.equal(planned.values.email, 'tulayguduk@hotmail.com');
  });

  it('still skips validated email even with overwriteUnvalidatedKeys', () => {
    const hash = computeEmployeeFieldHash('email', { email: 'locked@example.test' });
    const current = snapshot(
      { email: 'locked@example.test' },
      { profileReview: { email: 'validated' }, profileHash: { email: hash } }
    );
    const planned = planWorkerFactWrites(
      current,
      { email: 'tulayguduk@hotmail.com' },
      'autofill',
      { overwriteUnvalidatedKeys: ['email'] }
    );
    assert.deepEqual(planned.written, []);
    assert.equal(planned.values.email, 'locked@example.test');
    assert.equal(planned.skippedValidated[0]?.key, 'email');
  });
});

describe('applyWorkerFacts and stripWorkerFacts', () => {
  it('overwrites a stale document value and strip removes shared keys', () => {
    const overlaid = applyWorkerFacts(
      { education_level: 'oud', zoekprofiel: 'blijft', document_employer_name: 'Doc' },
      { education_level: 'MBO 2', email: 'a@b.c' }
    );
    assert.equal(overlaid.education_level, 'MBO 2');
    assert.equal(overlaid.email, 'a@b.c');
    assert.equal(overlaid.zoekprofiel, 'blijft');

    const stripped = stripWorkerFacts(overlaid);
    assert.equal('education_level' in stripped, false);
    assert.equal('email' in stripped, false);
    assert.equal(stripped.zoekprofiel, 'blijft');
    assert.equal(stripped.document_employer_name, 'Doc');
  });

  it('marks filled basis sections for review when the worker record changed', () => {
    const previous = { education_level: 'VMBO' };
    const nextFacts = { education_level: 'HBO' };
    const document = applyWorkerFactsToDocument(
      {
        worker_facts_hash: computeWorkerFactsHash(previous),
        persoonlijk_profiel: 'Bestaande tekst.',
        inleiding: '',
      },
      nextFacts
    );
    assert.equal(document.education_level, 'HBO');
    assert.equal(
      (document.basis_section_review as { persoonlijk_profiel?: string }).persoonlijk_profiel,
      'review'
    );
    assert.equal(
      (document.basis_section_review as { inleiding?: string }).inleiding,
      undefined
    );
    assert.equal(document.worker_facts_hash, computeWorkerFactsHash(nextFacts));
  });

  it('does not mark basis sections on the first open', () => {
    const document = applyWorkerFactsToDocument(
      { persoonlijk_profiel: 'Bestaande tekst.' },
      { education_level: 'HBO' }
    );
    assert.equal(document.basis_section_review, undefined);
    assert.equal(document.education_level, 'HBO');
  });

  it('freezes overlaid values into an export snapshot', () => {
    const draft = { education_level: 'oud', inleiding: 'tekst' };
    const snapshot = applyWorkerFacts(draft, { education_level: 'HBO', email: 'a@b.c' });
    const later = applyWorkerFacts(draft, { education_level: 'MBO' });
    assert.equal(snapshot.education_level, 'HBO');
    assert.equal(snapshot.email, 'a@b.c');
    assert.equal(snapshot.inleiding, 'tekst');
    assert.equal(later.education_level, 'MBO');
    assert.equal(draft.education_level, 'oud');
  });
});
