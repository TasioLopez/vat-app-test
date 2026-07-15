import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GotenbergConversionError,
  gotenbergErrorToUserMessage,
  isGotenbergConfigError,
  isGotenbergConversionError,
} from '../gotenberg-errors';

describe('gotenberg-errors', () => {
  it('detects config errors', () => {
    const msg = 'Intake DOCX conversion failed — GOTENBERG_URL is not configured.';
    assert.equal(isGotenbergConfigError(msg), true);
    assert.equal(isGotenbergConversionError(msg), true);
  });

  it('maps config error to Dutch user message', () => {
    const err = new GotenbergConversionError(
      'Intake DOCX conversion failed — GOTENBERG_URL is not configured.'
    );
    assert.equal(
      err.userMessage,
      'DOCX-conversie is niet geconfigureerd. Neem contact op met beheer.'
    );
    assert.equal(
      gotenbergErrorToUserMessage(err.message),
      'DOCX-conversie is niet geconfigureerd. Neem contact op met beheer.'
    );
  });

  it('maps service errors to retry message', () => {
    const msg = 'Intake DOCX conversion failed — Gotenberg returned 503';
    assert.equal(isGotenbergConfigError(msg), false);
    assert.equal(isGotenbergConversionError(msg), true);
    assert.equal(
      gotenbergErrorToUserMessage(msg),
      'Documentconverter tijdelijk niet beschikbaar. Probeer opnieuw of upload een PDF.'
    );
  });
});
