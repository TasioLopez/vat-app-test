import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isCanonicalMeetingAudioPath,
  meetingAudioStoragePath,
} from '@/lib/meetings/audio';

const employeeId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const captureId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('isCanonicalMeetingAudioPath', () => {
  it('accepts webm/m4a/mp4 canonical paths', () => {
    assert.equal(
      isCanonicalMeetingAudioPath(
        employeeId,
        captureId,
        meetingAudioStoragePath(employeeId, captureId, 'webm')
      ),
      true
    );
    assert.equal(
      isCanonicalMeetingAudioPath(
        employeeId,
        captureId,
        meetingAudioStoragePath(employeeId, captureId, 'm4a')
      ),
      true
    );
    assert.equal(
      isCanonicalMeetingAudioPath(
        employeeId,
        captureId,
        meetingAudioStoragePath(employeeId, captureId, 'mp4')
      ),
      true
    );
  });

  it('rejects foreign employee or capture paths', () => {
    assert.equal(
      isCanonicalMeetingAudioPath(
        employeeId,
        captureId,
        'cccccccc-cccc-cccc-cccc-cccccccccccc/meeting-audio/' + captureId + '.webm'
      ),
      false
    );
    assert.equal(
      isCanonicalMeetingAudioPath(
        employeeId,
        captureId,
        employeeId + '/meeting-audio/dddddddd-dddd-dddd-dddd-dddddddddddd.webm'
      ),
      false
    );
    assert.equal(isCanonicalMeetingAudioPath(employeeId, captureId, null), false);
    assert.equal(
      isCanonicalMeetingAudioPath(employeeId, captureId, employeeId + '/docs/x.webm'),
      false
    );
  });
});
