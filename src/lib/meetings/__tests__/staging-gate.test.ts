import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import { acceptNotesDecision, meetingAudioExtension } from '@/lib/meetings/audio';

describe('acceptNotesDecision', () => {
  it('asks to replace an existing gespreksverslag and allows an empty slot', () => {
    assert.equal(acceptNotesDecision(true, false), 'needs-replace');
    assert.equal(acceptNotesDecision(true, true), 'ok');
    assert.equal(acceptNotesDecision(false, false), 'ok');
  });
});

describe('meetingAudioExtension', () => {
  it('uses webm for opus and m4a for Safari mp4', () => {
    assert.equal(meetingAudioExtension('audio/webm;codecs=opus'), 'webm');
    assert.equal(meetingAudioExtension('audio/mp4'), 'm4a');
  });
});

describe('meeting routes staging gate', () => {
  const prev = process.env.NEXT_PUBLIC_APP_ENV;

  it('returns 404 outside staging', async () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    try {
    const captures = await import('@/app/api/meetings/captures/route');
    const captureId = await import('@/app/api/meetings/captures/[id]/route');
    const signAudio = await import('@/app/api/meetings/sign-audio/route');
    const transcribe = await import('@/app/api/meetings/transcribe/route');
    const generateNotes = await import('@/app/api/meetings/generate-notes/route');
    const acceptNotes = await import('@/app/api/meetings/accept-notes/route');

    const post = (path: string) =>
      new NextRequest(`http://localhost${path}`, {
        method: 'POST',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      });

    const responses = await Promise.all([
      captures.GET(new NextRequest('http://localhost/api/meetings/captures')),
      captures.POST(post('/api/meetings/captures')),
      captureId.PATCH(post('/api/meetings/captures/x'), {
        params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }),
      }),
      captureId.DELETE(new NextRequest('http://localhost/api/meetings/captures/x'), {
        params: Promise.resolve({ id: '00000000-0000-4000-8000-000000000001' }),
      }),
      signAudio.POST(post('/api/meetings/sign-audio')),
      transcribe.POST(post('/api/meetings/transcribe')),
      generateNotes.POST(post('/api/meetings/generate-notes')),
      acceptNotes.POST(post('/api/meetings/accept-notes')),
    ]);

    for (const res of responses) {
      assert.equal(res.status, 404);
    }
    } finally {
      process.env.NEXT_PUBLIC_APP_ENV = prev;
    }
  });
});
