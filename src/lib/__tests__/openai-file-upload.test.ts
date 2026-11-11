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

  it('lowercases .PDF and keeps the stem', () => {
    const result = getOpenAIFileParams('De_heer_E_Arthur_-_AD-rapport_DEF.PDF');
    assert.equal(result.filename, 'De_heer_E_Arthur_-_AD-rapport_DEF.pdf');
    assert.equal(result.mimeType, 'application/pdf');
  });

  it('lowercases .PDF on a storage path', () => {
    const result = getOpenAIFileParams(
      'employees/40187/ad_rapportage-De_heer_E_Arthur_-_AD-rapport_DEF.PDF'
    );
    assert.equal(result.filename, 'ad_rapportage-De_heer_E_Arthur_-_AD-rapport_DEF.pdf');
    assert.equal(result.mimeType, 'application/pdf');
  });

  it('lowercases .DOCX and .DOC', () => {
    const docx = getOpenAIFileParams('Report.DOCX');
    assert.equal(docx.filename, 'Report.docx');
    assert.equal(
      docx.mimeType,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );

    const doc = getOpenAIFileParams('Report.DOC');
    assert.equal(doc.filename, 'Report.doc');
    assert.equal(doc.mimeType, 'application/msword');
  });

  it('renames .DOCM to .docx', () => {
    const result = getOpenAIFileParams('Intake.DOCM');
    assert.equal(result.filename, 'Intake.docx');
    assert.equal(
      result.mimeType,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
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
