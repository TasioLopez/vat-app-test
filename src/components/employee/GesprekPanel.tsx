'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, FileUp, Loader2, Mic, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  MEETING_AUDIO_MAX_BYTES,
  meetingAudioExtension,
  type MeetingCapture,
  type MeetingCaptureStatus,
} from '@/lib/meetings/audio';

type Props = {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentsChanged: () => void;
  /** Render inside the Bronnen dialog instead of a second window. */
  embedded?: boolean;
  onBack?: () => void;
};

const STATUS_LABEL: Record<MeetingCaptureStatus, string> = {
  recorded: 'Opname',
  transcribed: 'Transcript',
  notes_draft: 'Conceptverslag',
  accepted: 'Opgeslagen als bron',
};

function pickRecorderMime(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) ?? '';
}

async function readJson(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text };
  }
}

export default function GesprekPanel({
  employeeId,
  open,
  onOpenChange,
  onDocumentsChanged,
  embedded = false,
  onBack,
}: Props) {
  const [captures, setCaptures] = useState<MeetingCapture[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState('');
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsReplace, setNeedsReplace] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const captureIdRef = useRef<string | null>(null);
  const mimeRef = useRef('');

  const applyCapture = useCallback((capture: MeetingCapture) => {
    captureIdRef.current = capture.id;
    setActiveId(capture.id);
    setTranscript(capture.transcript_text ?? '');
    setNotes(capture.notes_text ?? '');
    setConsent(Boolean(capture.consent_at));
    setNeedsReplace(false);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/meetings/captures?employeeId=${encodeURIComponent(employeeId)}`);
    const json = await readJson(res);
    if (!res.ok) throw new Error(String(json.error || 'Gesprekken laden mislukt'));
    const list = Array.isArray(json.captures) ? (json.captures as MeetingCapture[]) : [];
    setCaptures(list);
    return list;
  }, [employeeId]);

  useEffect(() => {
    if (!open) return;
    setError(null);
    void load()
      .then((list) => {
        if (!captureIdRef.current && list[0]) applyCapture(list[0]);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Gesprekken laden mislukt');
      });
  }, [open, load, applyCapture]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function ensureCaptureId(): Promise<string> {
    if (captureIdRef.current) {
      const current = captures.find((item) => item.id === captureIdRef.current);
      if (consent && current && !current.consent_at) {
        const res = await fetch(`/api/meetings/captures/${current.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, consent: true }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(String(json.error || 'Toestemming opslaan mislukt'));
        const capture = json.capture as MeetingCapture;
        setCaptures((prev) => prev.map((item) => (item.id === capture.id ? capture : item)));
        setConsent(true);
      }
      return captureIdRef.current;
    }

    const res = await fetch('/api/meetings/captures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId,
        consent: true,
        transcriptText: transcript.trim() || undefined,
      }),
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(String(json.error || 'Gesprek aanmaken mislukt'));
    const capture = json.capture as MeetingCapture;
    setCaptures((prev) => [capture, ...prev]);
    applyCapture(capture);
    return capture.id;
  }

  async function saveTranscript() {
    setBusy('Transcript opslaan…');
    setError(null);
    try {
      if (!transcript.trim()) throw new Error('Het transcript is leeg.');
      if (captureIdRef.current) {
        const res = await fetch(`/api/meetings/captures/${captureIdRef.current}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, transcriptText: transcript }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(String(json.error || 'Opslaan mislukt'));
        const capture = json.capture as MeetingCapture;
        setCaptures((prev) => prev.map((item) => (item.id === capture.id ? capture : item)));
        applyCapture(capture);
      } else {
        const res = await fetch('/api/meetings/captures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, transcriptText: transcript, consent }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(String(json.error || 'Opslaan mislukt'));
        const capture = json.capture as MeetingCapture;
        setCaptures((prev) => [capture, ...prev]);
        applyCapture(capture);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function finishRecording(mimeType: string) {
    const chunks = chunksRef.current;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setRecording(false);
    if (!chunks.length) return;

    const type = mimeType || 'audio/webm';
    const blob = new Blob(chunks, { type });
    if (blob.size > MEETING_AUDIO_MAX_BYTES) {
      setError('Opname is te groot (max 25 MB).');
      return;
    }

    setBusy('Opname versturen en transcriberen…');
    setError(null);
    try {
      const captureId = captureIdRef.current;
      if (!captureId) throw new Error('Geen gesprek voor deze opname.');
      const extension = meetingAudioExtension(type);
      const signRes = await fetch('/api/meetings/sign-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          captureId,
          extension,
          sizeBytes: blob.size,
        }),
      });
      const signJson = await readJson(signRes);
      if (!signRes.ok || typeof signJson.signedUrl !== 'string') {
        throw new Error(String(signJson.error || 'Upload voorbereiden mislukt'));
      }
      const putRes = await fetch(signJson.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type':
            typeof signJson.contentType === 'string' ? signJson.contentType : 'audio/webm',
        },
        body: blob,
      });
      if (!putRes.ok) throw new Error('Upload van de opname mislukt.');

      const transcribeRes = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, captureId }),
      });
      const transcribeJson = await readJson(transcribeRes);
      if (!transcribeRes.ok) {
        throw new Error(String(transcribeJson.error || 'Transcriberen mislukt'));
      }
      const capture = transcribeJson.capture as MeetingCapture;
      setCaptures((prev) => prev.map((item) => (item.id === capture.id ? capture : item)));
      applyCapture(capture);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transcriberen mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function startRecording() {
    setError(null);
    if (!consent) {
      setError('Bevestig toestemming voordat je opneemt.');
      return;
    }
    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError('Deze browser kan geen microfoon opnemen. Plak het transcript.');
      return;
    }
    try {
      await ensureCaptureId();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = pickRecorderMime();
      mimeRef.current = mime;
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        void finishRecording(recorder.mimeType || mimeRef.current);
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      setError(e instanceof Error ? e.message : 'Opname starten mislukt');
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  async function generateNotes() {
    setBusy('Gespreksverslag maken…');
    setError(null);
    setNeedsReplace(false);
    try {
      if (!transcript.trim()) throw new Error('Er is nog geen transcript.');
      let captureId = captureIdRef.current;
      if (!captureId) {
        const created = await fetch('/api/meetings/captures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, transcriptText: transcript, consent }),
        });
        const createdJson = await readJson(created);
        if (!created.ok) throw new Error(String(createdJson.error || 'Transcript opslaan mislukt'));
        const createdCapture = createdJson.capture as MeetingCapture;
        setCaptures((prev) => [createdCapture, ...prev.filter((item) => item.id !== createdCapture.id)]);
        applyCapture(createdCapture);
        captureId = createdCapture.id;
      } else {
        const saved = await fetch(`/api/meetings/captures/${captureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, transcriptText: transcript }),
        });
        const savedJson = await readJson(saved);
        if (!saved.ok) throw new Error(String(savedJson.error || 'Transcript opslaan mislukt'));
        const savedCapture = savedJson.capture as MeetingCapture;
        setCaptures((prev) => prev.map((item) => (item.id === savedCapture.id ? savedCapture : item)));
      }
      const res = await fetch('/api/meetings/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, captureId }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(String(json.error || 'Verslag maken mislukt'));
      const capture = json.capture as MeetingCapture;
      setCaptures((prev) => prev.map((item) => (item.id === capture.id ? capture : item)));
      applyCapture(capture);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verslag maken mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function acceptNotes(replace: boolean) {
    setBusy(replace ? 'Gespreksverslag vervangen…' : 'Gespreksverslag opslaan…');
    setError(null);
    try {
      const captureId = captureIdRef.current;
      if (!captureId) throw new Error('Sla eerst het gesprek op.');
      if (!notes.trim()) throw new Error('Het verslag is leeg.');
      const res = await fetch('/api/meetings/accept-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, captureId, notesText: notes, replace }),
      });
      const json = await readJson(res);
      if (res.status === 409 && json.needsReplace === true) {
        setNeedsReplace(true);
        setError(String(json.error || 'Er staat al een gespreksverslag.'));
        return;
      }
      if (!res.ok) throw new Error(String(json.error || 'Opslaan mislukt'));
      const capture = json.capture as MeetingCapture;
      setCaptures((prev) => prev.map((item) => (item.id === capture.id ? capture : item)));
      applyCapture(capture);
      setNeedsReplace(false);
      onDocumentsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function removeCapture() {
    const captureId = captureIdRef.current;
    if (!captureId) return;
    if (!confirm('Dit gesprek, de opname en het transcript verwijderen?')) return;
    setBusy('Verwijderen…');
    setError(null);
    try {
      const res = await fetch(
        `/api/meetings/captures/${captureId}?employeeId=${encodeURIComponent(employeeId)}`,
        { method: 'DELETE' }
      );
      const json = await readJson(res);
      if (!res.ok) throw new Error(String(json.error || 'Verwijderen mislukt'));
      captureIdRef.current = null;
      setActiveId(null);
      setTranscript('');
      setNotes('');
      setConsent(false);
      const list = await load();
      if (list[0]) applyCapture(list[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verwijderen mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function uploadTranscriptFile(file: File | null) {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.txt') && !name.endsWith('.md')) {
      setError('Upload een tekstbestand (.txt).');
      return;
    }
    setError(null);
    const text = (await file.text()).trim();
    if (!text) {
      setError('Het bestand is leeg.');
      return;
    }
    setTranscript(text);
  }

  function startNew() {
    captureIdRef.current = null;
    setActiveId(null);
    setTranscript('');
    setNotes('');
    setConsent(false);
    setNeedsReplace(false);
    setError(null);
  }

  const body = (
    <div className="space-y-5">
      <div className="flex items-start gap-2">
        {embedded && onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Terug naar bronnen"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div>
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Mic className="h-4 w-4 text-emerald-600" />
            Gesprek
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Zet het transcript klaar, maak daarna de notities die de intake gebruikt.
          </p>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/70 p-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Transcript</h4>
          <p className="text-xs text-gray-600">Upload een tekstbestand of start een opname.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border-2 border-purple-200 bg-white px-3 text-sm font-medium text-purple-700 hover:bg-purple-50">
            <FileUp className="mr-2 h-4 w-4" />
            Upload transcript
            <input
              type="file"
              accept=".txt,.md,text/plain"
              className="sr-only"
              disabled={recording || Boolean(busy)}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = '';
                void uploadTranscriptFile(file);
              }}
            />
          </label>
          {recording ? (
            <Button type="button" variant="destructive" onClick={stopRecording}>
              <Square className="mr-2 h-4 w-4" />
              Stop opname
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => void startRecording()} disabled={Boolean(busy)}>
              <Mic className="mr-2 h-4 w-4" />
              Start opname
            </Button>
          )}
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-1"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            disabled={recording || Boolean(busy)}
          />
          <span>De werknemer weet dat dit gesprek wordt opgenomen.</span>
        </label>
        <Textarea
          id="gesprek-transcript"
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          className="min-h-32 bg-white"
          placeholder="Het transcript verschijnt hier. Je kunt het ook plakken."
          disabled={recording}
          aria-label="Transcript"
        />
        <Button type="button" variant="outline" size="sm" onClick={() => void saveTranscript()} disabled={Boolean(busy) || recording || !transcript.trim()}>
          Transcript bewaren
        </Button>
      </section>

      <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Notities</h4>
          <p className="text-xs text-gray-600">Dit verslag wordt gebruikt bij het invullen van de intake.</p>
        </div>
        <Button type="button" onClick={() => void generateNotes()} disabled={Boolean(busy) || recording || !transcript.trim()}>
          Maak notities uit transcript
        </Button>
        <Textarea
          id="gesprek-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="min-h-40 bg-white"
          placeholder="Notities verschijnen hier. Pas ze aan voordat je ze bewaart."
          disabled={recording}
          aria-label="Notities"
        />
        {needsReplace ? (
          <Button type="button" variant="destructive" onClick={() => void acceptNotes(true)} disabled={Boolean(busy)}>
            Vervang de bestaande notities
          </Button>
        ) : (
          <Button type="button" onClick={() => void acceptNotes(false)} disabled={Boolean(busy) || recording || !notes.trim()}>
            Notities bewaren
          </Button>
        )}
      </section>

      {captures.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Eerdere gesprekken</span>
          <button
            type="button"
            onClick={startNew}
            disabled={Boolean(busy) || recording}
            className={`rounded-full border px-3 py-1 text-xs ${
              activeId ? 'border-gray-200 text-gray-600' : 'border-emerald-500 bg-emerald-50 text-emerald-800'
            }`}
          >
            Nieuw
          </button>
          {captures.map((capture) => (
            <button
              key={capture.id}
              type="button"
              onClick={() => applyCapture(capture)}
              className={`rounded-full border px-3 py-1 text-xs ${
                capture.id === activeId
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-gray-200 text-gray-600'
              }`}
            >
              {new Date(capture.created_at).toLocaleString('nl-NL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              · {STATUS_LABEL[capture.status]}
            </button>
          ))}
          {activeId ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void removeCapture()} disabled={Boolean(busy) || recording}>
              <Trash2 className="mr-2 h-4 w-4" />
              Verwijder
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {busy ? (
        <p className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {busy}
        </p>
      ) : null}
    </div>
  );

  if (embedded) return body;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-xl">{body}</DialogContent>
    </Dialog>
  );
}
