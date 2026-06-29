import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DebouncedAutosaveController } from '@/lib/unsaved/debounced-autosave';

describe('DebouncedAutosaveController', () => {
  let statuses: string[];

  beforeEach(() => {
    statuses = [];
  });

  afterEach(() => {
    // allow pending timers to clear between tests
  });

  function makeController(delay = 50) {
    return new DebouncedAutosaveController({
      delay,
      onStatusChange: (s) => statuses.push(s),
    });
  }

  it('starts idle and becomes dirty when notified', () => {
    const ctrl = makeController();
    assert.equal(ctrl.getStatus(), 'idle');
    ctrl.notifyDirty(true);
    assert.equal(ctrl.getStatus(), 'dirty');
    assert.deepEqual(statuses, ['dirty']);
  });

  it('debounces save until delay elapses', async () => {
    const ctrl = makeController(50);
    let saveCount = 0;
    ctrl.setSaveFn(async () => {
      saveCount++;
    });

    ctrl.notifyDirty(true);
    assert.equal(saveCount, 0);

    await new Promise((r) => setTimeout(r, 80));
    assert.equal(saveCount, 1);
    assert.equal(ctrl.getStatus(), 'saved');
  });

  it('resets debounce timer on repeated dirty notifications', async () => {
    const ctrl = makeController(80);
    let saveCount = 0;
    ctrl.setSaveFn(async () => {
      saveCount++;
    });

    ctrl.notifyDirty(true);
    await new Promise((r) => setTimeout(r, 40));
    ctrl.notifyDirty(true);
    await new Promise((r) => setTimeout(r, 40));
    assert.equal(saveCount, 0);
    await new Promise((r) => setTimeout(r, 60));
    assert.equal(saveCount, 1);
  });

  it('skips concurrent save while in flight', async () => {
    const ctrl = makeController(10);
    let saveCount = 0;
    ctrl.setSaveFn(async () => {
      saveCount++;
      await new Promise((r) => setTimeout(r, 100));
    });

    ctrl.notifyDirty(true);
    await new Promise((r) => setTimeout(r, 20));
    const first = ctrl.runSave();
    const second = ctrl.runSave();
    await Promise.allSettled([first, second]);
    assert.equal(saveCount, 1);
  });

  it('sets error status when save throws', async () => {
    const ctrl = makeController(10);
    ctrl.setSaveFn(async () => {
      throw new Error('fail');
    });

    ctrl.notifyDirty(true);
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(ctrl.getStatus(), 'error');
  });

  it('clears dirty when isDirty becomes false', () => {
    const ctrl = makeController();
    ctrl.notifyDirty(true);
    ctrl.notifyDirty(false);
    assert.equal(ctrl.getStatus(), 'saved');
  });

  it('cancel stops pending saves', async () => {
    const ctrl = makeController(50);
    let saveCount = 0;
    ctrl.setSaveFn(async () => {
      saveCount++;
    });

    ctrl.notifyDirty(true);
    ctrl.cancel();
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(saveCount, 0);
  });
});
