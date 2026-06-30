import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDocKind, mergeFactsByPriority } from '@/lib/cv/docAnalysis';
import type { CvFacts } from '@/lib/cv/facts';

type FactsChunk = Omit<CvFacts, 'evidence'>;

function makeFacts(partial: Partial<FactsChunk>): FactsChunk {
  return {
    personal: {},
    profileHints: [],
    experienceFacts: [],
    educationFacts: [],
    skills: [],
    languages: [],
    interestsHints: [],
    extraHints: [],
    mobility: {},
    ...partial,
  };
}

describe('classifyDocKind', () => {
  it('classifies cv employee document type', () => {
    assert.equal(classifyDocKind('cv'), 'cv');
    assert.equal(classifyDocKind('curriculum_vitae'), 'cv');
  });

  it('does not classify spreek reportage as cv', () => {
    assert.equal(classifyDocKind('spreek_reportage'), 'other');
  });
});

describe('mergeFactsByPriority', () => {
  it('prefers cv experience over intake and ad', () => {
    const merged = mergeFactsByPriority([
      {
        kind: 'intake',
        facts: makeFacts({
          experienceFacts: [{ role: 'Intake functie', organization: 'Werkgever A' }],
        }),
      },
      {
        kind: 'ad',
        facts: makeFacts({
          experienceFacts: [{ role: 'AD functie', organization: 'Werkgever B' }],
        }),
      },
      {
        kind: 'cv',
        facts: makeFacts({
          experienceFacts: [{ role: 'CV functie', organization: 'Werkgever C' }],
        }),
      },
    ]);

    assert.equal(merged.experienceFacts[0]?.role, 'CV functie');
    assert.ok(merged.experienceFacts.some((item) => item.role === 'Intake functie'));
    assert.ok(merged.experienceFacts.some((item) => item.role === 'AD functie'));
  });

  it('prefers cv education and skills', () => {
    const merged = mergeFactsByPriority([
      {
        kind: 'intake',
        facts: makeFacts({
          educationFacts: [{ institution: 'Intake school', diploma: 'VMBO' }],
          skills: ['Intake skill'],
        }),
      },
      {
        kind: 'cv',
        facts: makeFacts({
          educationFacts: [{ institution: 'CV school', diploma: 'MBO' }],
          skills: ['CV skill'],
        }),
      },
    ]);

    assert.equal(merged.educationFacts[0]?.institution, 'CV school');
    assert.equal(merged.skills[0], 'CV skill');
  });
});
