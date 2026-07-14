import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { runStructuredFileExtraction } from '../runStructuredExtraction';

describe('runStructuredFileExtraction', () => {
  it('calls responses.create with strict json_schema and deletes uploaded file', async () => {
    const deletedIds: string[] = [];
    const createPayloads: unknown[] = [];

    const openai = {
      files: {
        create: mock.fn(async () => ({ id: 'file-123' })),
        delete: mock.fn(async (id: string) => {
          deletedIds.push(id);
        }),
      },
      responses: {
        create: mock.fn(async (payload: unknown) => {
          createPayloads.push(payload);
          return { output_text: '{"current_job":"Supervisor"}' };
        }),
      },
    };

    const result = await runStructuredFileExtraction({
      openai: openai as never,
      buffer: Buffer.from('pdf'),
      storagePath: 'docs/test.pdf',
      instructions: 'Extract fields',
      userMessage: 'Analyze',
      schemaName: 'employee_extraction',
      schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      parse: (raw) => raw as Record<string, unknown>,
      model: 'gpt-test',
    });

    assert.deepEqual(result, { current_job: 'Supervisor' });
    assert.equal(createPayloads.length, 1);

    const payload = createPayloads[0] as {
      model: string;
      text: { format: { type: string; strict: boolean; name: string } };
    };
    assert.equal(payload.model, 'gpt-test');
    assert.equal(payload.text.format.type, 'json_schema');
    assert.equal(payload.text.format.strict, true);
    assert.equal(payload.text.format.name, 'employee_extraction');
    assert.deepEqual(deletedIds, ['file-123']);
  });
});
