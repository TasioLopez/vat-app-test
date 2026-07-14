import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getOpenAIFileParams, buildOpenAIFile } from '../openai-file-upload';

describe('getOpenAIFileParams', () => {
  it('renames .docm to .docx with DOCX MIME', () => {
    const result = getOpenAIFileParams('intakeformulier.docm');
    assert.equal(result.filename, 'intakeformulier.docx');
    assert.equal(
      result.mimeType,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('keeps .docx unchanged', () => {
    const result = getOpenAIFileParams('form.docx');
    assert.equal(result.filename, 'form.docx');
    assert.equal(
      result.mimeType,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });

  it('handles storage path with docm basename', () => {
    const result = getOpenAIFileParams('employees/40187/intakeformulier.docm');
    assert.equal(result.filename, 'intakeformulier.docx');
  });
});

describe('buildOpenAIFile', () => {
  it('uses docx name for docm buffer', () => {
    const file = buildOpenAIFile(Buffer.from('PK'), 'foo.docm');
    assert.equal(file.name, 'foo.docx');
    assert.equal(
      file.type,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  });
});

describe('buildOpenAIFileFromPdf', () => {
  it('always uses application/pdf', async () => {
    const { buildOpenAIFileFromPdf } = await import('../openai-file-upload');
    const file = buildOpenAIFileFromPdf(Buffer.from('%PDF'), 'intake.docx');
    assert.equal(file.name, 'intake.pdf');
    assert.equal(file.type, 'application/pdf');
  });
});
