export type AutosaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export type DebouncedAutosaveOptions = {
  delay?: number;
  onStatusChange?: (status: AutosaveStatus) => void;
  onSaved?: (savedAt: Date) => void;
};

/**
 * Testable debounced autosave scheduler (no React dependency).
 */
export class DebouncedAutosaveController {
  private delay: number;
  private onStatusChange: (status: AutosaveStatus) => void;
  private onSaved: (savedAt: Date) => void;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private status: AutosaveStatus = 'idle';
  private saveFn: (() => Promise<void>) | null = null;
  private inFlight: Promise<void> | null = null;
  private cancelled = false;

  constructor(options: DebouncedAutosaveOptions = {}) {
    this.delay = options.delay ?? 2000;
    this.onStatusChange = options.onStatusChange ?? (() => {});
    this.onSaved = options.onSaved ?? (() => {});
  }

  getStatus(): AutosaveStatus {
    return this.status;
  }

  setSaveFn(fn: (() => Promise<void>) | null) {
    this.saveFn = fn;
  }

  private setStatus(next: AutosaveStatus) {
    if (this.status === next) return;
    this.status = next;
    this.onStatusChange(next);
  }

  notifyDirty(isDirty: boolean) {
    if (this.cancelled) return;

    if (!isDirty) {
      this.clearTimer();
      if (this.status === 'dirty') {
        this.setStatus('saved');
      } else if (this.status !== 'saving' && this.status !== 'error') {
        this.setStatus('idle');
      }
      return;
    }

    this.setStatus('dirty');
    this.scheduleSave();
  }

  private clearTimer() {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleSave() {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runSave().catch(() => {});
    }, this.delay);
  }

  async runSave(): Promise<void> {
    if (this.cancelled || !this.saveFn) return;
    if (this.inFlight) return this.inFlight;

    this.setStatus('saving');
    const promise = (async () => {
      try {
        await this.saveFn!();
        if (this.cancelled) return;
        this.setStatus('saved');
        this.onSaved(new Date());
      } catch {
        if (this.cancelled) return;
        this.setStatus('error');
        throw new Error('Autosave failed');
      } finally {
        this.inFlight = null;
      }
    })();

    this.inFlight = promise;
    return promise;
  }

  async retrySave(): Promise<void> {
    return this.runSave();
  }

  cancel() {
    this.cancelled = true;
    this.clearTimer();
    this.saveFn = null;
    this.inFlight = null;
  }
}
