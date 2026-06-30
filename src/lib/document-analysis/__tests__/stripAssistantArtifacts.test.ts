import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripAssistantArtifacts,
  stripAssistantArtifactsFromRecord,
} from '@/lib/document-analysis/stripAssistantArtifacts';

describe('stripAssistantArtifacts', () => {
  it('removes OpenAI file_search citation markers', () => {
    assert.equal(
      stripAssistantArtifacts('Operator productie II【4:0†source】'),
      'Operator productie II'
    );
  });

  it('removes bracket page references', () => {
    assert.equal(stripAssistantArtifacts('tekst [4:13/filename.pdf] meer'), 'tekst meer');
  });
});

describe('stripAssistantArtifactsFromRecord', () => {
  it('cleans string and nested values', () => {
    const result = stripAssistantArtifactsFromRecord({
      work_experience: 'Bakker【1:0†source】',
      transport_type: ['Auto【2:0†source】'],
      referent: { phone: '06-123【3:0†source】' },
    });
    assert.equal(result.work_experience, 'Bakker');
    assert.deepEqual(result.transport_type, ['Auto']);
    assert.deepEqual(result.referent, { phone: '06-123' });
  });
});
