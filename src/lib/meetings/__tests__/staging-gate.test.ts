import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { NextRequest } from 'next/server';
import {
  acceptNotesDecision,
  meetingAudioExtension,
  visibleMeetingPurposes,
} from '@/lib/meetings/audio';
import { assertMeetingPurposeAllowed } from '@/lib/meetings/access';

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

describe('visibleMeetingPurposes', () => {
  it('hides VGR purpose outside staging', () => {
    const prev = process.env.NEXT_PUBLIC_APP_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    assert.deepEqual(visibleMeetingPurposes(), ['intake', 'overig']);
    process.env.NEXT_PUBLIC_APP_ENV = 'staging';
    assert.deepEqual(visibleMeetingPurposes(), ['intake', 'vgr', 'overig']);
    process.env.NEXT_PUBLIC_APP_ENV = prev;
  });
});

describe('assertMeetingPurposeAllowed', () => {
  it('blocks VGR purpose outside staging', () => {
    const prev = process.env.NEXT_PUBLIC_APP_ENV;
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    assert.equal(assertMeetingPurposeAllowed('intake'), null);
    assert.equal(assertMeetingPurposeAllowed('vgr')?.status, 403);
    process.env.NEXT_PUBLIC_APP_ENV = 'staging';
    assert.equal(assertMeetingPurposeAllowed('vgr'), null);
    process.env.NEXT_PUBLIC_APP_ENV = prev;
  });
});

describe('meeting routes production unlock', () => {
  const prev = process.env.NEXT_PUBLIC_APP_ENV;

  it('no longer returns staging-only 404 on production', async () => {
    process.env.NEXT_PUBLIC_APP_ENV = 'production';
    try {
      const captures = await import('@/app/api/meetings/captures/route');
      const importText = await import('@/app/api/meetings/import-text/route');

      const getRes = await captures.GET(
        new NextRequest('http://localhost/api/meetings/captures?employeeId=')
      );
      // Missing employeeId → 400, not staging 404
      assert.equal(getRes.status, 400);

      const form = new FormData();
      form.set('employeeId', '');
      const importRes = await importText.POST(
        new NextRequest('http://localhost/api/meetings/import-text', {
          method: 'POST',
          body: form,
        })
      );
      assert.equal(importRes.status, 400);
    } finally {
      process.env.NEXT_PUBLIC_APP_ENV = prev;
    }
  });
});
