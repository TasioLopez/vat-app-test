import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  applyTranscriptWrite,
  generateNotesDecision,
  restoreTranscriptText,
  transcribeReplaceDecision,
} from '@/lib/meetings/audio';
import {
  looksLikeTranscript,
  meetingImportKind,
  parseSpeakerTurns,
  serializeSpeakerTurns,
} from '@/lib/meetings/transcript';

describe('parseSpeakerTurns', () => {
  it('splits speaker and spreker lines and keeps continuations', () => {
    const turns = parseSpeakerTurns('Speaker 1: Hallo\n\nSpreker 2: Hoi\nvervolg');
    assert.deepEqual(turns, [
      { speaker: 'Speaker 1', text: 'Hallo' },
      { speaker: 'Spreker 2', text: 'Hoi\nvervolg' },
    ]);
  });

  it('skips a leading Transcript label before the first speaker', () => {
    const turns = parseSpeakerTurns('Transcript:\nSpeaker 1: Hallo\n\nSpeaker 2: Hoi');
    assert.deepEqual(turns, [
      { speaker: 'Speaker 1', text: 'Hallo' },
      { speaker: 'Speaker 2', text: 'Hoi' },
    ]);
  });

  it('returns null for prose, a preamble, or a single turn', () => {
    assert.equal(parseSpeakerTurns('Gewoon een verslag zonder sprekers.'), null);
    assert.equal(parseSpeakerTurns('Notitie\nSpeaker 1: Hallo\n\nSpeaker 2: Hoi'), null);
    assert.equal(parseSpeakerTurns('Speaker 1: Alleen ik.'), null);
  });

  it('round-trips a dialogue', () => {
    const source = 'Speaker 1: Hallo\n\nSpeaker 2: Hoi\nvervolg';
    const turns = parseSpeakerTurns(source);
    assert.ok(turns);
    assert.equal(serializeSpeakerTurns(turns), source);
    assert.deepEqual(parseSpeakerTurns(serializeSpeakerTurns(turns)), turns);
  });
});

describe('looksLikeTranscript', () => {
  it('detects text that is mostly speaker lines', () => {
    assert.equal(
      looksLikeTranscript(
        'Transcript:\nSpeaker 1: a\nSpeaker 2: b\nSpeaker 1: c\nSpeaker 2: d'
      ),
      true
    );
    assert.equal(
      looksLikeTranscript('Speaker 1: a\nSpeaker 2: b\nSpeaker 1: c'),
      false
    );
    assert.equal(
      looksLikeTranscript('## Aanleiding\nDe werknemer werkt bij Ihub.\n\n## Wensen\nLogistiek.'),
      false
    );
  });
});

describe('applyTranscriptWrite', () => {
  it('stores the original once and leaves it in place on later edits', () => {
    const first = applyTranscriptWrite({
      existingOriginal: null,
      nextText: '  eerste versie  ',
      source: 'upload',
    });
    assert.equal(first.transcript_text, 'eerste versie');
    assert.equal(first.transcript_original_text, 'eerste versie');
    assert.equal(first.transcript_source, 'upload');

    const edited = applyTranscriptWrite({
      existingOriginal: first.transcript_original_text ?? null,
      nextText: 'bewerkt',
    });
    assert.equal(edited.transcript_text, 'bewerkt');
    assert.equal(edited.transcript_original_text, undefined);
    assert.equal(edited.transcript_source, undefined);
  });

  it('does not invent an original for an empty write', () => {
    const empty = applyTranscriptWrite({ existingOriginal: null, nextText: '   ' });
    assert.equal(empty.transcript_text, '');
    assert.equal(empty.transcript_original_text, undefined);
  });
});

describe('restoreTranscriptText', () => {
  it('restores a stored original and rejects a missing one', () => {
    assert.deepEqual(restoreTranscriptText('  origineel  '), { ok: true, transcript_text: 'origineel' });
    assert.deepEqual(restoreTranscriptText('  '), { ok: false });
    assert.deepEqual(restoreTranscriptText(null), { ok: false });
  });
});

describe('generateNotesDecision', () => {
  it('asks before replacing a non-empty hand-written verslag', () => {
    assert.equal(generateNotesDecision('uploaded', 'Eigen notities', false), 'needs-replace');
    assert.equal(generateNotesDecision('pasted', 'Eigen notities', false), 'needs-replace');
    assert.equal(generateNotesDecision('uploaded', 'Eigen notities', true), 'ok');
    assert.equal(generateNotesDecision('generated', 'Al gemaakt', false), 'ok');
    assert.equal(generateNotesDecision('uploaded', '   ', false), 'ok');
    assert.equal(generateNotesDecision(null, 'Iets', false), 'ok');
  });
});

describe('transcribeReplaceDecision', () => {
  it('asks before a new transcription replaces stored text', () => {
    assert.equal(transcribeReplaceDecision('al een transcript', false), 'needs-replace');
    assert.equal(transcribeReplaceDecision('al een transcript', true), 'ok');
    assert.equal(transcribeReplaceDecision('  ', false), 'ok');
  });
});

describe('meetingImportKind', () => {
  it('accepts text and docx names only', () => {
    assert.equal(meetingImportKind('Verslag.DOCX'), 'docx');
    assert.equal(meetingImportKind('notities.md'), 'text');
    assert.equal(meetingImportKind('gesprek.txt'), 'text');
    assert.equal(meetingImportKind('scan.pdf'), null);
  });
});
