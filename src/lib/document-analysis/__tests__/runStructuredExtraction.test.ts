import { describe, it, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  runStructuredFileExtraction,
  runMultiPassExtraction,
  runDocumentTextExtraction,
  runStructuredMultiFileExtraction,
} from '../runStructuredExtraction';

function mockOpenAIFiles() {
  return {
    create: mock.fn(async () => ({ id: 'file-123', status: 'processed' })),
    retrieve: mock.fn(async () => ({ id: 'file-123', status: 'processed' })),
    delete: mock.fn(async () => {}),
  };
}

describe('runStructuredFileExtraction', () => {
  it('calls responses.create with strict json_schema, detail high for PDF vision, and deletes uploaded file', async () => {
    const deletedIds: string[] = [];
    const createPayloads: unknown[] = [];
    const uploadPurposes: string[] = [];
    const files = mockOpenAIFiles();
    files.delete = mock.fn(async (id: string) => {
      deletedIds.push(id);
    });
    files.create = mock.fn(async (opts: { purpose: string }) => {
      uploadPurposes.push(opts.purpose);
      return { id: 'file-123', status: 'processed' };
    });

    const openai = {
      files,
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
      pdfBuffer: Buffer.from('%PDF'),
      analysisFilename: 'test.pdf',
      usePdfVision: true,
    });

    assert.deepEqual(result, { current_job: 'Supervisor' });
    assert.equal(createPayloads.length, 1);
    assert.deepEqual(uploadPurposes, ['user_data']);

    const payload = createPayloads[0] as {
      model: string;
      input: { role: string; content: { type: string; detail?: string; file_id?: string }[] }[];
      text: { format: { type: string; strict: boolean; name: string } };
    };
    assert.equal(payload.model, 'gpt-test');
    assert.equal(payload.text.format.type, 'json_schema');
    const fileContent = payload.input[0].content.find((c) => c.type === 'input_file');
    assert.equal(fileContent?.detail, 'high');
    assert.deepEqual(deletedIds, ['file-123']);
  });

  it('deletes uploaded file only after responses.create completes', async () => {
    const events: string[] = [];
    const files = mockOpenAIFiles();
    files.create = mock.fn(async () => {
      events.push('upload');
      return { id: 'file-123', status: 'processed' };
    });
    files.delete = mock.fn(async () => {
      events.push('delete');
    });

    const openai = {
      files,
      responses: {
        create: mock.fn(async () => {
          events.push('responses.start');
          await new Promise((resolve) => setTimeout(resolve, 25));
          events.push('responses.end');
          return { output_text: '{"current_job":"Supervisor"}' };
        }),
      },
    };

    await runStructuredFileExtraction({
      openai: openai as never,
      buffer: Buffer.from('pdf'),
      storagePath: 'docs/test.pdf',
      instructions: 'Extract fields',
      userMessage: 'Analyze',
      schemaName: 'employee_extraction',
      schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      parse: (raw) => raw as Record<string, unknown>,
      pdfBuffer: Buffer.from('%PDF'),
      analysisFilename: 'test.pdf',
      usePdfVision: true,
    });

    assert.deepEqual(events, ['upload', 'responses.start', 'responses.end', 'delete']);
  });

  it('retries when validation fails then succeeds', async () => {
    let call = 0;
    const openai = {
      files: mockOpenAIFiles(),
      responses: {
        create: mock.fn(async () => {
          call++;
          return {
            output_text:
              call === 1
                ? '{"education_level":"VCA","transport_type":["Auto"],"dutch_speaking":"Goed","computer_skills":"2"}'
                : '{"education_level":"HBO","transport_type":["Auto"],"dutch_speaking":"Goed","computer_skills":"2"}',
          };
        }),
      },
    };

    const result = await runStructuredFileExtraction({
      openai: openai as never,
      buffer: Buffer.from('pdf'),
      storagePath: 'docs/test.pdf',
      instructions: 'Extract',
      userMessage: 'Analyze',
      schemaName: 'test',
      schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      parse: (raw) => raw as Record<string, unknown>,
      pdfBuffer: Buffer.from('%PDF'),
      analysisFilename: 'test.pdf',
      usePdfVision: true,
      validate: (r) => {
        const level = r.education_level;
        if (level === 'VCA') {
          return { ok: false, errors: ['education_level VCA is certificaat'] };
        }
        return { ok: true, errors: [] };
      },
      maxRetries: 2,
    });

    assert.equal(result.education_level, 'HBO');
    assert.equal(call, 2);
  });
});

describe('runMultiPassExtraction', () => {
  it('runs multiple passes on single upload', async () => {
    let uploads = 0;
    let apiCalls = 0;

    const openai = {
      files: {
        ...mockOpenAIFiles(),
        create: mock.fn(async () => {
          uploads++;
          return { id: 'file-multi', status: 'processed' };
        }),
      },
      responses: {
        create: mock.fn(async () => {
          apiCalls++;
          return {
            output_text:
              apiCalls === 1
                ? '{"current_job":"Supervisor"}'
                : '{"education_level":"HBO","transport_type":["Auto"],"dutch_speaking":"Goed","computer_skills":"2"}',
          };
        }),
      },
    };

    const merged = await runMultiPassExtraction({
      openai: openai as never,
      pdfBuffer: Buffer.from('%PDF'),
      analysisFilename: 'intake.pdf',
      passes: [
        {
          instructions: 'core',
          userMessage: 'core',
          schemaName: 'core',
          schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
          parse: (raw) => raw as Record<string, unknown>,
        },
        {
          instructions: 's17',
          userMessage: 's17',
          schemaName: 's17',
          schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
          parse: (raw) => raw as Record<string, unknown>,
        },
      ],
    });

    assert.equal(uploads, 1);
    assert.equal(apiCalls, 2);
    assert.equal(merged.current_job, 'Supervisor');
    assert.equal(merged.education_level, 'HBO');
  });
});

describe('runDocumentTextExtraction', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.GOTENBERG_URL;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.GOTENBERG_URL;
    } else {
      process.env.GOTENBERG_URL = originalEnv;
    }
  });

  it('normalizes DOCX via Gotenberg before OpenAI upload', async () => {
    process.env.GOTENBERG_URL = 'https://gotenberg.example.com';
    globalThis.fetch = mock.fn(async () => ({
      ok: true,
      arrayBuffer: async () => Buffer.from('%PDF-from-docx').buffer,
    })) as typeof fetch;

    let uploadedName = '';
    const openai = {
      files: {
        ...mockOpenAIFiles(),
        create: mock.fn(async (opts: { file: { name: string } }) => {
          uploadedName = opts.file.name;
          return { id: 'file-text', status: 'processed' };
        }),
      },
      responses: {
        create: mock.fn(async () => ({ output_text: 'Samenvatting intake' })),
      },
    };

    const text = await runDocumentTextExtraction({
      openai: openai as never,
      buffer: Buffer.from('PK'),
      storagePath: 'docs/intake.docx',
      fallbackName: 'intake.docx',
      instructions: 'Summarize',
      userMessage: 'Analyze',
      model: 'gpt-test',
    });

    assert.equal(text, 'Samenvatting intake');
    assert.equal(uploadedName, 'intake.pdf');
    assert.equal((globalThis.fetch as ReturnType<typeof mock.fn>).mock.calls.length, 1);
  });
});

describe('runStructuredMultiFileExtraction', () => {
  it('uploads all PDFs and sends N input_file contents in one responses.create', async () => {
    const deletedIds: string[] = [];
    let uploadCount = 0;
    const createPayloads: unknown[] = [];

    const openai = {
      files: {
        create: mock.fn(async () => {
          uploadCount++;
          return { id: `file-${uploadCount}`, status: 'processed' };
        }),
        retrieve: mock.fn(async (id: string) => ({ id, status: 'processed' })),
        delete: mock.fn(async (id: string) => {
          deletedIds.push(id);
        }),
      },
      responses: {
        create: mock.fn(async (payload: unknown) => {
          createPayloads.push(payload);
          return {
            output_text: JSON.stringify({
              current_job: 'Logistiek Coördinator',
              transport_type: ['Auto'],
              dutch_speaking: 'Goed',
              computer_skills: '4',
            }),
          };
        }),
      },
    };

    const result = await runStructuredMultiFileExtraction({
      openai: openai as never,
      files: [
        { pdfBuffer: Buffer.from('%PDF-1'), analysisFilename: 'intake.pdf', label: 'intakeformulier' },
        { pdfBuffer: Buffer.from('%PDF-2'), analysisFilename: 'ad.pdf', label: 'ad_rapportage' },
        {
          pdfBuffer: Buffer.from('%PDF-3'),
          analysisFilename: 'spreek.pdf',
          label: 'spreek_reportage',
        },
      ],
      instructions: 'Extract',
      userMessage: 'Analyze all',
      schemaName: 'employee_extraction_chatlike',
      schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      parse: (raw) => raw as Record<string, unknown>,
      model: 'gpt-test',
      usePdfVision: true,
      maxRetries: 0,
    });

    assert.equal(uploadCount, 3);
    assert.equal(createPayloads.length, 1);
    const payload = createPayloads[0] as {
      input: { content: { type: string; file_id?: string; detail?: string }[] }[];
    };
    const fileContents = payload.input[0].content.filter((c) => c.type === 'input_file');
    assert.equal(fileContents.length, 3);
    assert.deepEqual(
      fileContents.map((c) => c.file_id),
      ['file-1', 'file-2', 'file-3']
    );
    assert.equal(fileContents[0]?.detail, 'high');
    assert.deepEqual(result.transport_type, ['Auto']);
    assert.equal(result.dutch_speaking, 'Goed');
    assert.deepEqual(deletedIds.sort(), ['file-1', 'file-2', 'file-3']);
  });

  it('keeps best-effort answer when soft validate fails (maxRetries 0)', async () => {
    const openai = {
      files: mockOpenAIFiles(),
      responses: {
        create: mock.fn(async () => ({
          output_text: '{"transport_type":[],"dutch_speaking":"Goed"}',
        })),
      },
    };

    const result = await runStructuredMultiFileExtraction({
      openai: openai as never,
      files: [{ pdfBuffer: Buffer.from('%PDF'), analysisFilename: 'a.pdf' }],
      instructions: 'Extract',
      userMessage: 'Analyze',
      schemaName: 'test',
      schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
      parse: (raw) => raw as Record<string, unknown>,
      validate: (r) =>
        Array.isArray(r.transport_type) && r.transport_type.length === 0
          ? { ok: false, errors: ['empty transport'] }
          : { ok: true, errors: [] },
      maxRetries: 0,
    });

    assert.equal(result.dutch_speaking, 'Goed');
    assert.deepEqual(result.transport_type, []);
  });
});
