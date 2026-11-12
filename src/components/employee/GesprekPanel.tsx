'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, FileUp, Loader2, Mic, RotateCcw, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  MEETING_AUDIO_MAX_BYTES,
  meetingAudioExtension,
  type MeetingCapture,
  type MeetingCaptureStatus,
  type NotesOrigin,
  type TranscriptSource,
} from '@/lib/meetings/audio';
import { parseSpeakerTurns, serializeSpeakerTurns } from '@/lib/meetings/transcript';

const VerslagEditor = dynamic(
  () =>
    import('@/components/tp2026/Basis2026MarkdownFieldEditor').then((mod) => mod.Basis2026MarkdownFieldEditor),
  {
    ssr: false,
    loading: () => <div className="min-h-[280px] rounded-md border border-gray-200 bg-white" />,
  }
);

type Props = {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentsChanged: () => void;
  /** Render inside the Bronnen dialog instead of a second window. */
  embedded?: boolean;
  onBack?: () => void;
  /** A gespreksverslag document already exists for this employee. */
  hasPublishedVerslag?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
};

type Pane = 'transcript' | 'verslag';

const STATUS_LABEL: Record<MeetingCaptureStatus, string> = {
  recorded: 'Opname',
  transcribed: 'Transcript',
  notes_draft: 'Concept',
  accepted: 'Bron voor intake',
};

function sourceLabel(source: TranscriptSource | null): string | null {
  if (source === 'upload') return 'Geüpload';
  if (source === 'paste') return 'Geplakt';
  if (source === 'recording') return 'Opname';
  return null;
}

function originLabel(origin: NotesOrigin | null): string | null {
  if (origin === 'generated') return 'Gemaakt uit transcript';
  if (origin === 'pasted') return 'Zelf geschreven';
  if (origin === 'uploaded') return 'Zelf aangeleverd';
  return null;
}

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
  hasPublishedVerslag = false,
  onDirtyChange,
}: Props) {
  const [captures, setCaptures] = useState<MeetingCapture[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [savedTranscript, setSavedTranscript] = useState('');
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [transcriptSource, setTranscriptSource] = useState<TranscriptSource | null>(null);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [notesOrigin, setNotesOrigin] = useState<NotesOrigin | null>(null);
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsReplace, setNeedsReplace] = useState(false);
  const [needsGenerateReplace, setNeedsGenerateReplace] = useState(false);
  const [forcePlain, setForcePlain] = useState(false);
  const [pane, setPane] = useState<Pane>('transcript');

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const captureIdRef = useRef<string | null>(null);
  const activeCaptureRef = useRef<MeetingCapture | null>(null);
  const mimeRef = useRef('');
  const replaceTranscriptRef = useRef(false);

  const dirty = transcript !== savedTranscript || notes !== savedNotes;
  const turns = useMemo(() => (forcePlain ? null : parseSpeakerTurns(transcript)), [forcePlain, transcript]);
  const transcriptChip = sourceLabel(transcriptSource);
  const verslagChip = originLabel(notesOrigin);
  const canRestore = Boolean(originalTranscript.trim()) && originalTranscript.trim() !== transcript.trim();

  const applyCapture = useCallback((capture: MeetingCapture, switchPane = true) => {
    const nextTranscript = capture.transcript_text ?? '';
    const nextNotes = capture.notes_text ?? '';
    captureIdRef.current = capture.id;
    activeCaptureRef.current = capture;
    setActiveId(capture.id);
    setTranscript(nextTranscript);
    setSavedTranscript(nextTranscript);
    setOriginalTranscript(capture.transcript_original_text ?? '');
    setTranscriptSource(capture.transcript_source);
    setNotes(nextNotes);
    setSavedNotes(nextNotes);
    setNotesOrigin(capture.notes_origin);
    setConsent(Boolean(capture.consent_at));
    setNeedsReplace(false);
    setNeedsGenerateReplace(false);
    if (switchPane) {
      setForcePlain(false);
      setPane(nextNotes.trim() ? 'verslag' : 'transcript');
    }
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
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function guardDirty(): boolean {
    if (transcript === savedTranscript && notes === savedNotes) return true;
    return window.confirm('Er zijn niet-opgeslagen wijzigingen. Toch doorgaan?');
  }

  function storeCapture(capture: MeetingCapture) {
    captureIdRef.current = capture.id;
    activeCaptureRef.current = capture;
    setActiveId(capture.id);
    setCaptures((prev) => {
      const exists = prev.some((item) => item.id === capture.id);
      if (!exists) return [capture, ...prev];
      return prev.map((item) => (item.id === capture.id ? capture : item));
    });
  }

  function adoptTranscript(capture: MeetingCapture) {
    storeCapture(capture);
    const next = capture.transcript_text ?? '';
    setTranscript(next);
    setSavedTranscript(next);
    setOriginalTranscript(capture.transcript_original_text ?? '');
    setTranscriptSource(capture.transcript_source);
    setConsent(Boolean(capture.consent_at));
  }

  function adoptNotes(capture: MeetingCapture) {
    storeCapture(capture);
    const next = capture.notes_text ?? '';
    setNotes(next);
    setSavedNotes(next);
    setNotesOrigin(capture.notes_origin);
    setNeedsReplace(false);
    setNeedsGenerateReplace(false);
  }

  async function persistTranscript(next: string, source?: TranscriptSource): Promise<MeetingCapture> {
    const text = next.trim();
    if (!text) throw new Error('Het transcript is leeg.');
    const payload: Record<string, unknown> = { employeeId, transcriptText: text, consent };
    if (source) payload.transcriptSource = source;
    const captureId = captureIdRef.current;
    const res = await fetch(captureId ? `/api/meetings/captures/${captureId}` : '/api/meetings/captures', {
      method: captureId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(String(json.error || 'Transcript opslaan mislukt'));
    const capture = json.capture as MeetingCapture;
    adoptTranscript(capture);
    return capture;
  }

  async function persistNotes(next: string, origin: NotesOrigin): Promise<MeetingCapture> {
    const text = next.trim();
    if (!text) throw new Error('Het verslag is leeg.');
    const captureId = captureIdRef.current;
    const res = await fetch(captureId ? `/api/meetings/captures/${captureId}` : '/api/meetings/captures', {
      method: captureId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, notesText: text, notesOrigin: origin, consent }),
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(String(json.error || 'Verslag opslaan mislukt'));
    const capture = json.capture as MeetingCapture;
    adoptNotes(capture);
    return capture;
  }

  async function ensureConsent(capture: MeetingCapture): Promise<void> {
    if (!consent || capture.consent_at) return;
    const res = await fetch(`/api/meetings/captures/${capture.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId, consent: true }),
    });
    const json = await readJson(res);
    if (!res.ok) throw new Error(String(json.error || 'Toestemming opslaan mislukt'));
    adoptTranscript(json.capture as MeetingCapture);
  }

  async function importFile(file: File): Promise<string> {
    const body = new FormData();
    body.set('employeeId', employeeId);
    body.set('file', file);
    const res = await fetch('/api/meetings/import-text', { method: 'POST', body });
    const json = await readJson(res);
    if (!res.ok) throw new Error(String(json.error || 'Bestand lezen mislukt'));
    const text = typeof json.text === 'string' ? json.text.trim() : '';
    if (!text) throw new Error('Het bestand is leeg.');
    return text;
  }

  async function uploadTranscriptFile(file: File | null) {
    if (!file) return;
    if (transcript.trim() && !window.confirm('Het huidige transcript wordt vervangen. Het origineel blijft bewaard. Doorgaan?')) {
      return;
    }
    setBusy('Transcript lezen…');
    setError(null);
    try {
      const text = await importFile(file);
      setTranscript(text);
      setForcePlain(false);
      await persistTranscript(text, 'upload');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function uploadNotesFile(file: File | null) {
    if (!file) return;
    if (notes.trim() && !window.confirm('Het huidige verslag wordt vervangen. Doorgaan?')) return;
    setBusy('Verslag lezen…');
    setError(null);
    try {
      const text = await importFile(file);
      setNotes(text);
      setNotesOrigin('uploaded');
      setPane('verslag');
      await persistNotes(text, 'uploaded');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function saveTranscript() {
    setBusy('Transcript opslaan…');
    setError(null);
    try {
      await persistTranscript(transcript, transcriptSource ? undefined : 'paste');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function saveNotesDraft() {
    setBusy('Concept opslaan…');
    setError(null);
    try {
      await persistNotes(notes, notesOrigin ?? 'pasted');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Opslaan mislukt');
    } finally {
      setBusy(null);
    }
  }

  async function restoreOriginal() {
    const captureId = captureIdRef.current;
    if (!captureId) return;
    setBusy('Origineel terugzetten…');
    setError(null);
    try {
      const res = await fetch(`/api/meetings/captures/${captureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, restoreTranscript: true }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(String(json.error || 'Herstellen mislukt'));
      adoptTranscript(json.capture as MeetingCapture);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Herstellen mislukt');
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
          'Content-Type': typeof signJson.contentType === 'string' ? signJson.contentType : 'audio/webm',
        },
        body: blob,
      });
      if (!putRes.ok) throw new Error('Upload van de opname mislukt.');

      const transcribeRes = await fetch('/api/meetings/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          captureId,
          replace: replaceTranscriptRef.current,
        }),
      });
      const transcribeJson = await readJson(transcribeRes);
      if (transcribeRes.status === 409 && transcribeJson.needsReplace === true) {
        setError(String(transcribeJson.error || 'Er staat al een transcript.'));
        return;
      }
      if (!transcribeRes.ok) {
        throw new Error(String(transcribeJson.error || 'Transcriberen mislukt'));
      }
      adoptTranscript(transcribeJson.capture as MeetingCapture);
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
    const hasTranscript = Boolean(transcript.trim() || savedTranscript.trim());
    if (hasTranscript && !window.confirm('De opname vervangt het huidige transcript. Het origineel blijft bewaard. Doorgaan?')) {
      return;
    }
    replaceTranscriptRef.current = hasTranscript;
    try {
      let capture = activeCaptureRef.current;
      if (transcript.trim()) {
        capture = await persistTranscript(transcript, transcriptSource ? undefined : 'paste');
      } else if (!captureIdRef.current) {
        const res = await fetch('/api/meetings/captures', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, consent: true }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(String(json.error || 'Gesprek aanmaken mislukt'));
        capture = json.capture as MeetingCapture;
        storeCapture(capture);
        setConsent(true);
      }
      if (!capture) throw new Error('Geen gesprek voor deze opname.');
      await ensureConsent(capture);

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

  async function generateNotes(replace = false) {
    const handWritten = (notesOrigin === 'pasted' || notesOrigin === 'uploaded') && Boolean(notes.trim());
    if (handWritten && !replace && !window.confirm('Dit verslag is zelf aangeleverd. Het wordt vervangen door een verslag uit het transcript. Doorgaan?')) {
      return;
    }
    setBusy('Gespreksverslag maken…');
    setError(null);
    setNeedsGenerateReplace(false);
    try {
      if (!transcript.trim()) throw new Error('Er is nog geen transcript.');
      const saved = await persistTranscript(transcript, transcriptSource ? undefined : 'paste');
      const res = await fetch('/api/meetings/generate-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          captureId: saved.id,
          replace: replace || handWritten,
        }),
      });
      const json = await readJson(res);
      if (res.status === 409 && json.needsReplace === true) {
        setNeedsGenerateReplace(true);
        setError(String(json.error || 'Dit verslag is zelf aangeleverd.'));
        return;
      }
      if (!res.ok) throw new Error(String(json.error || 'Verslag maken mislukt'));
      adoptNotes(json.capture as MeetingCapture);
      setPane('verslag');
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
      let captureId = captureIdRef.current;
      if (!captureId) {
        const created = await persistNotes(notes, notesOrigin ?? 'pasted');
        captureId = created.id;
      }
      if (!notes.trim()) throw new Error('Het verslag is leeg.');
      const res = await fetch('/api/meetings/accept-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          captureId,
          notesText: notes,
          notesOrigin: notesOrigin ?? 'pasted',
          replace,
        }),
      });
      const json = await readJson(res);
      if (res.status === 409 && json.needsReplace === true) {
        setNeedsReplace(true);
        setError(String(json.error || 'Er staat al een gespreksverslag.'));
        return;
      }
      if (!res.ok) throw new Error(String(json.error || 'Opslaan mislukt'));
      const capture = json.capture as MeetingCapture;
      setCaptures((prev) =>
        prev.map((item) => {
          if (item.id === capture.id) return capture;
          if (item.status === 'accepted') {
            return { ...item, status: 'notes_draft', notes_document_id: null };
          }
          return item;
        })
      );
      adoptNotes(capture);
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
    if (!window.confirm('Dit gesprek, de opname en het transcript verwijderen?')) return;
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
      activeCaptureRef.current = null;
      setActiveId(null);
      setTranscript('');
      setSavedTranscript('');
      setOriginalTranscript('');
      setTranscriptSource(null);
      setNotes('');
      setSavedNotes('');
      setNotesOrigin(null);
      setConsent(false);
      const list = await load();
      if (list[0]) applyCapture(list[0]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verwijderen mislukt');
    } finally {
      setBusy(null);
    }
  }

  function startNew() {
    if (recording || busy) return;
    if (!guardDirty()) return;
    captureIdRef.current = null;
    activeCaptureRef.current = null;
    setActiveId(null);
    setTranscript('');
    setSavedTranscript('');
    setOriginalTranscript('');
    setTranscriptSource(null);
    setNotes('');
    setSavedNotes('');
    setNotesOrigin(null);
    setConsent(false);
    setNeedsReplace(false);
    setNeedsGenerateReplace(false);
    setForcePlain(false);
    setPane('transcript');
    setError(null);
  }

  function selectCapture(capture: MeetingCapture) {
    if (recording || busy) return;
    if (capture.id === activeId) return;
    if (!guardDirty()) return;
    applyCapture(capture);
  }

  function updateTurn(index: number, text: string) {
    if (!turns) return;
    const next = turns.map((turn, turnIndex) => (turnIndex === index ? { ...turn, text } : turn));
    setTranscript(serializeSpeakerTurns(next));
  }

  const activeCapture = captures.find((item) => item.id === activeId) ?? null;
  const otherPublished = captures.some((item) => item.status === 'accepted' && item.id !== activeId);
  let statusLine = 'Concept. De intake gebruikt dit nog niet.';
  if (dirty) statusLine = 'Wijzigingen nog niet bewaard.';
  else if (activeCapture?.status === 'accepted') statusLine = 'Dit is de bron die de intake gebruikt.';
  else if (hasPublishedVerslag || otherPublished) {
    statusLine = 'Concept. Er staat al een bron. Bewaren vervangt die.';
  }

  const captureButtons = (
    <>
      <button
        type="button"
        onClick={startNew}
        disabled={Boolean(busy) || recording}
        className={`rounded-lg border px-3 py-2 text-left text-xs ${
          activeId ? 'border-gray-200 text-gray-600' : 'border-emerald-500 bg-emerald-50 text-emerald-800'
        }`}
      >
        Nieuw gesprek
      </button>
      {captures.map((capture) => {
        const source = sourceLabel(capture.transcript_source);
        return (
          <button
            key={capture.id}
            type="button"
            onClick={() => selectCapture(capture)}
            disabled={Boolean(busy) || recording}
            className={`rounded-lg border px-3 py-2 text-left text-xs ${
              capture.id === activeId
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-gray-200 text-gray-600'
            }`}
          >
            <span className="block font-medium">
              {new Date(capture.created_at).toLocaleString('nl-NL', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="block text-[11px] opacity-80">
              {STATUS_LABEL[capture.status]}
              {source ? ` · ${source}` : ''}
            </span>
          </button>
        );
      })}
      {activeId ? (
        <Button type="button" variant="ghost" size="sm" onClick={() => void removeCapture()} disabled={Boolean(busy) || recording}>
          <Trash2 className="mr-2 h-4 w-4" />
          Verwijder
        </Button>
      ) : null}
    </>
  );

  const body = (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-start gap-2">
        {embedded && onBack ? (
          <button
            type="button"
            onClick={() => {
              if (!guardDirty()) return;
              onBack();
            }}
            className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Terug naar bronnen"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : null}
        <div className="min-w-0">
          <DialogTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Mic className="h-4 w-4 text-emerald-600" />
            Gesprek
          </DialogTitle>
          <p className={`text-sm ${activeCapture?.status === 'accepted' && !dirty ? 'text-emerald-700' : 'text-gray-600'}`}>
            {statusLine}
          </p>
        </div>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {busy ? (
        <p className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {busy}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <aside className="flex shrink-0 gap-2 overflow-x-auto lg:w-56 lg:flex-col lg:overflow-y-auto">{captureButtons}</aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
          <div className="flex gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setPane('transcript')}
              className={`rounded-full border px-3 py-1 text-xs ${
                pane === 'transcript' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600'
              }`}
            >
              Transcript
            </button>
            <button
              type="button"
              onClick={() => setPane('verslag')}
              className={`rounded-full border px-3 py-1 text-xs ${
                pane === 'verslag' ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-600'
              }`}
            >
              Verslag
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
            <section
              className={`min-h-0 flex-col gap-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50/70 p-3 ${
                pane === 'verslag' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Transcript</h4>
                  <p className="text-xs text-gray-600">Wat er is gezegd. De intake leest dit niet.</p>
                </div>
                {transcriptChip ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                    {transcriptChip}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border-2 border-purple-200 bg-white px-3 text-sm font-medium text-purple-700 hover:bg-purple-50">
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload
                  <input
                    type="file"
                    accept=".txt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
                  <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
                    <Square className="mr-2 h-4 w-4" />
                    Stop opname
                  </Button>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => void startRecording()} disabled={Boolean(busy)}>
                    <Mic className="mr-2 h-4 w-4" />
                    Start opname
                  </Button>
                )}
                <label className="flex items-center gap-2 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => setConsent(event.target.checked)}
                    disabled={recording || Boolean(busy)}
                  />
                  <span>De werknemer weet dat dit gesprek wordt opgenomen.</span>
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                {transcript !== savedTranscript ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => void saveTranscript()} disabled={Boolean(busy) || recording}>
                    Bewaar transcript
                  </Button>
                ) : null}
                {canRestore ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => void restoreOriginal()} disabled={Boolean(busy) || recording}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Herstel origineel
                  </Button>
                ) : null}
                {turns ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForcePlain(true)}>
                    Als tekst
                  </Button>
                ) : parseSpeakerTurns(transcript) ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForcePlain(false)}>
                    Als beurten
                  </Button>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {turns ? (
                  <div className="space-y-3">
                    {turns.map((turn, index) => (
                      <div key={`${turn.speaker}-${index}`} className="rounded-lg bg-white p-3 ring-1 ring-gray-200">
                        <p className="mb-1 text-xs font-semibold text-emerald-800">{turn.speaker}</p>
                        <textarea
                          value={turn.text}
                          rows={Math.min(8, Math.max(2, turn.text.split('\n').length))}
                          disabled={recording}
                          aria-label={turn.speaker}
                          onChange={(event) => updateTurn(index, event.target.value)}
                          className="w-full resize-y rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-900"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Textarea
                    id="gesprek-transcript"
                    value={transcript}
                    onChange={(event) => setTranscript(event.target.value)}
                    className="min-h-[320px] bg-white"
                    placeholder="Plak het transcript, of upload een tekstbestand."
                    disabled={recording}
                    aria-label="Transcript"
                  />
                )}
              </div>
            </section>

            <section
              className={`min-h-0 flex-col gap-3 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 ${
                pane === 'transcript' ? 'hidden lg:flex' : 'flex'
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Verslag</h4>
                  <p className="text-xs text-gray-600">Dit wordt de bron voor de intake, nadat je het bewaart.</p>
                </div>
                {verslagChip ? (
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-700 ring-1 ring-gray-200">
                    {verslagChip}
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void generateNotes(false)}
                  disabled={Boolean(busy) || recording || !transcript.trim()}
                >
                  Maak uit transcript
                </Button>
                {needsGenerateReplace ? (
                  <Button type="button" variant="destructive" size="sm" onClick={() => void generateNotes(true)} disabled={Boolean(busy)}>
                    Vervang en maak verslag
                  </Button>
                ) : null}
                <label className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border-2 border-purple-200 bg-white px-3 text-xs font-medium text-purple-700 hover:bg-purple-50">
                  <FileUp className="mr-2 h-4 w-4" />
                  Upload bestaand verslag
                  <input
                    type="file"
                    accept=".txt,.md,.docx,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    className="sr-only"
                    disabled={recording || Boolean(busy)}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      event.target.value = '';
                      void uploadNotesFile(file);
                    }}
                  />
                </label>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto">
                <VerslagEditor
                  key={activeId ?? 'new'}
                  markdown={notes}
                  onChange={setNotes}
                  appearance="neutral"
                  delay={0}
                  minHeightClassName="min-h-[320px]"
                  placeholder="Schrijf het verslag, of maak het uit het transcript."
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {notes !== savedNotes ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void saveNotesDraft()}
                    disabled={Boolean(busy) || recording || !notes.trim()}
                  >
                    Bewaar concept
                  </Button>
                ) : null}
                {needsReplace ? (
                  <Button type="button" variant="destructive" size="sm" onClick={() => void acceptNotes(true)} disabled={Boolean(busy)}>
                    Vervang de bestaande bron
                  </Button>
                ) : (
                  <Button type="button" size="sm" onClick={() => void acceptNotes(false)} disabled={Boolean(busy) || recording || !notes.trim()}>
                    Bewaar als bron
                  </Button>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) return body;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !guardDirty()) return;
        onOpenChange(next);
      }}
    >
      <DialogContent className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden sm:max-w-[1400px]">
        {body}
      </DialogContent>
    </Dialog>
  );
}
