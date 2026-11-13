'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { GesprekFooter } from '@/components/employee/gesprek/GesprekFooter';
import { GesprekHeader, type GesprekPane } from '@/components/employee/gesprek/GesprekHeader';
import { TranscriptPane } from '@/components/employee/gesprek/TranscriptPane';
import { VerslagPane } from '@/components/employee/gesprek/VerslagPane';
import {
  MEETING_AUDIO_MAX_BYTES,
  documentTypeForPurpose,
  meetingAudioExtension,
  normalizeMeetingPurpose,
  publishLabelForPurpose,
  type MeetingCapture,
  type MeetingPurpose,
  type NotesOrigin,
  type TranscriptSource,
} from '@/lib/meetings/audio';
import {
  looksLikeTranscript,
  parseSpeakerTurns,
  serializeSpeakerTurns,
} from '@/lib/meetings/transcript';
import { acceptedStatusLabel } from '@/components/employee/gesprek/labels';
import { cn } from '@/lib/utils';

type Props = {
  employeeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDocumentsChanged: () => void;
  /** Document types already present for this employee (used for replace warnings). */
  publishedDocumentTypes?: string[];
};

type ConfirmRequest = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
};

const SIDE_BY_SIDE_KEY = 'gesprek.sideBySide';

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

function readSideBySide(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(SIDE_BY_SIDE_KEY) === '1';
  } catch {
    return false;
  }
}

export default function GesprekPanel({
  employeeId,
  open,
  onOpenChange,
  onDocumentsChanged,
  publishedDocumentTypes = [],
}: Props) {
  const [captures, setCaptures] = useState<MeetingCapture[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [purpose, setPurpose] = useState<MeetingPurpose>('intake');
  const [transcript, setTranscript] = useState('');
  const [savedTranscript, setSavedTranscript] = useState('');
  const [originalTranscript, setOriginalTranscript] = useState('');
  const [transcriptSource, setTranscriptSource] = useState<TranscriptSource | null>(null);
  const [notes, setNotes] = useState('');
  const [savedNotes, setSavedNotes] = useState('');
  const [notesOrigin, setNotesOrigin] = useState<NotesOrigin | null>(null);
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsReplace, setNeedsReplace] = useState(false);
  const [needsGenerateReplace, setNeedsGenerateReplace] = useState(false);
  const [forcePlain, setForcePlain] = useState(false);
  const [pane, setPane] = useState<GesprekPane>('transcript');
  const [sideBySide, setSideBySide] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [forceTranscriptEditor, setForceTranscriptEditor] = useState(false);
  const [writingVerslag, setWritingVerslag] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const captureIdRef = useRef<string | null>(null);
  const activeCaptureRef = useRef<MeetingCapture | null>(null);
  const mimeRef = useRef('');
  const replaceTranscriptRef = useRef(false);
  const recordingStartedAtRef = useRef<number | null>(null);

  const dirty = transcript !== savedTranscript || notes !== savedNotes;
  const turns = useMemo(
    () => (forcePlain ? null : parseSpeakerTurns(transcript)),
    [forcePlain, transcript]
  );
  const canParseTurns = Boolean(parseSpeakerTurns(transcript));
  const canRestore =
    Boolean(originalTranscript.trim()) && originalTranscript.trim() !== transcript.trim();
  const notesLookLikeTranscript = useMemo(() => looksLikeTranscript(notes), [notes]);
  const hasTranscript = Boolean(transcript.trim() || savedTranscript.trim());
  const hasVerslag = Boolean(notes.trim() || savedNotes.trim());

  const askConfirm = useCallback((request: ConfirmRequest) => {
    setConfirm(request);
  }, []);

  const applyCapture = useCallback((capture: MeetingCapture, switchPane = true) => {
    const nextTranscript = capture.transcript_text ?? '';
    const nextNotes = capture.notes_text ?? '';
    captureIdRef.current = capture.id;
    activeCaptureRef.current = capture;
    setActiveId(capture.id);
    setPurpose(normalizeMeetingPurpose(capture.purpose));
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
    setEditingTranscript(false);
    setForceTranscriptEditor(false);
    setWritingVerslag(false);
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
    setSideBySide(readSideBySide());
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

  useEffect(() => {
    if (!recording) {
      setRecordingSeconds(0);
      recordingStartedAtRef.current = null;
      return;
    }
    recordingStartedAtRef.current = Date.now();
    setRecordingSeconds(0);
    const timer = window.setInterval(() => {
      const started = recordingStartedAtRef.current;
      if (!started) return;
      setRecordingSeconds(Math.floor((Date.now() - started) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  function changeSideBySide(value: boolean) {
    setSideBySide(value);
    try {
      localStorage.setItem(SIDE_BY_SIDE_KEY, value ? '1' : '0');
    } catch {
      /* ignore */
    }
  }

  function guardDirty(onProceed: () => void) {
    if (!dirty) {
      onProceed();
      return;
    }
    askConfirm({
      title: 'Niet-opgeslagen wijzigingen',
      description: 'Er zijn niet-opgeslagen wijzigingen. Toch doorgaan?',
      confirmLabel: 'Doorgaan',
      cancelLabel: 'Blijven',
      variant: 'destructive',
      onConfirm: onProceed,
    });
  }

  function storeCapture(capture: MeetingCapture) {
    captureIdRef.current = capture.id;
    activeCaptureRef.current = capture;
    setActiveId(capture.id);
    setPurpose(normalizeMeetingPurpose(capture.purpose));
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
    setForceTranscriptEditor(false);
  }

  function adoptNotes(capture: MeetingCapture) {
    storeCapture(capture);
    const next = capture.notes_text ?? '';
    setNotes(next);
    setSavedNotes(next);
    setNotesOrigin(capture.notes_origin);
    setNeedsReplace(false);
    setNeedsGenerateReplace(false);
    setWritingVerslag(false);
  }

  async function persistTranscript(next: string, source?: TranscriptSource): Promise<MeetingCapture> {
    const text = next.trim();
    if (!text) throw new Error('Het transcript is leeg.');
    const payload: Record<string, unknown> = {
      employeeId,
      transcriptText: text,
      consent,
      purpose,
    };
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
      body: JSON.stringify({
        employeeId,
        notesText: text,
        notesOrigin: origin,
        consent,
        purpose,
      }),
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

  async function runUploadTranscript(file: File) {
    setBusy('Transcript lezen…');
    setError(null);
    try {
      const text = await importFile(file);
      setTranscript(text);
      setForcePlain(false);
      setEditingTranscript(false);
      setForceTranscriptEditor(false);
      await persistTranscript(text, 'upload');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload mislukt');
    } finally {
      setBusy(null);
    }
  }

  function uploadTranscriptFile(file: File | null) {
    if (!file) return;
    if (transcript.trim()) {
      askConfirm({
        title: 'Transcript vervangen?',
        description: 'Het huidige transcript wordt vervangen. Het origineel blijft bewaard.',
        confirmLabel: 'Vervangen',
        variant: 'destructive',
        onConfirm: () => void runUploadTranscript(file),
      });
      return;
    }
    void runUploadTranscript(file);
  }

  async function runUploadNotes(file: File) {
    setBusy('Verslag lezen…');
    setError(null);
    try {
      const text = await importFile(file);
      setNotes(text);
      setNotesOrigin('uploaded');
      setWritingVerslag(false);
      setPane('verslag');
      await persistNotes(text, 'uploaded');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload mislukt');
    } finally {
      setBusy(null);
    }
  }

  function uploadNotesFile(file: File | null) {
    if (!file) return;
    if (notes.trim()) {
      askConfirm({
        title: 'Verslag vervangen?',
        description: 'Het huidige verslag wordt vervangen.',
        confirmLabel: 'Vervangen',
        variant: 'destructive',
        onConfirm: () => void runUploadNotes(file),
      });
      return;
    }
    void runUploadNotes(file);
  }

  async function saveDraft() {
    setBusy('Concept opslaan…');
    setError(null);
    try {
      if (transcript !== savedTranscript) {
        if (!transcript.trim()) throw new Error('Het transcript is leeg.');
        await persistTranscript(transcript, transcriptSource ? undefined : 'paste');
      }
      if (notes !== savedNotes) {
        if (!notes.trim()) throw new Error('Het verslag is leeg.');
        await persistNotes(notes, notesOrigin ?? 'pasted');
      }
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
      setEditingTranscript(false);
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
      setEditingTranscript(false);
      setForceTranscriptEditor(false);
      setPane('transcript');
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

    const begin = async () => {
      replaceTranscriptRef.current = Boolean(transcript.trim() || savedTranscript.trim());
      try {
        let capture = activeCaptureRef.current;
        if (transcript.trim()) {
          capture = await persistTranscript(transcript, transcriptSource ? undefined : 'paste');
        } else if (!captureIdRef.current) {
          const res = await fetch('/api/meetings/captures', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ employeeId, consent: true, purpose }),
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
        setPane('transcript');
      } catch (e) {
        streamRef.current?.getTracks().forEach((track) => track.stop());
        setError(e instanceof Error ? e.message : 'Opname starten mislukt');
      }
    };

    const hasTranscript = Boolean(transcript.trim() || savedTranscript.trim());
    if (hasTranscript) {
      askConfirm({
        title: 'Transcript vervangen door opname?',
        description: 'De opname vervangt het huidige transcript. Het origineel blijft bewaard.',
        confirmLabel: 'Opnemen',
        variant: 'destructive',
        onConfirm: () => void begin(),
      });
      return;
    }
    void begin();
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  async function generateNotes(replace = false) {
    const handWritten = (notesOrigin === 'pasted' || notesOrigin === 'uploaded') && Boolean(notes.trim());
    const run = async () => {
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
    };

    if (handWritten && !replace) {
      askConfirm({
        title: 'Verslag vervangen?',
        description: 'Dit verslag is zelf aangeleverd. Het wordt vervangen door een verslag uit het transcript.',
        confirmLabel: 'Vervangen',
        variant: 'destructive',
        onConfirm: () => void run(),
      });
      return;
    }
    void run();
  }

  async function acceptNotes(replace: boolean) {
    setBusy(replace ? 'Bron vervangen…' : 'Bron opslaan…');
    setError(null);
    try {
      if (!documentTypeForPurpose(purpose)) {
        throw new Error('Overig publiceert geen bron. Bewaar als concept.');
      }
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
          purpose,
          replace,
        }),
      });
      const json = await readJson(res);
      if (res.status === 409 && json.needsReplace === true) {
        setNeedsReplace(true);
        setError(String(json.error || 'Er staat al een bron voor dit doel.'));
        return;
      }
      if (!res.ok) throw new Error(String(json.error || 'Opslaan mislukt'));
      const capture = json.capture as MeetingCapture;
      const acceptedPurpose = normalizeMeetingPurpose(capture.purpose);
      setCaptures((prev) =>
        prev.map((item) => {
          if (item.id === capture.id) return capture;
          if (
            item.status === 'accepted' &&
            normalizeMeetingPurpose(item.purpose) === acceptedPurpose
          ) {
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

  function publishAsSource() {
    const run = () => void acceptNotes(false);
    if (notesLookLikeTranscript) {
      askConfirm({
        title: 'Dit lijkt een transcript',
        description:
          'De bron verwacht een samenvatting. Wil je dit toch als bron gebruiken?',
        confirmLabel: 'Toch gebruiken',
        cancelLabel: 'Annuleren',
        variant: 'destructive',
        onConfirm: run,
      });
      return;
    }
    run();
  }

  async function changePurpose(next: MeetingPurpose) {
    if (next === purpose) return;
    const captureId = captureIdRef.current;
    const applyLocal = () => setPurpose(next);

    if (!captureId) {
      applyLocal();
      return;
    }

    const run = async () => {
      setBusy('Doel bijwerken…');
      setError(null);
      try {
        const res = await fetch(`/api/meetings/captures/${captureId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employeeId, purpose: next }),
        });
        const json = await readJson(res);
        if (!res.ok) throw new Error(String(json.error || 'Doel opslaan mislukt'));
        const capture = json.capture as MeetingCapture;
        storeCapture(capture);
        setNeedsReplace(false);
        if (activeCaptureRef.current?.status === 'accepted' || capture.status === 'notes_draft') {
          onDocumentsChanged();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Doel opslaan mislukt');
      } finally {
        setBusy(null);
      }
    };

    if (activeCaptureRef.current?.status === 'accepted') {
      askConfirm({
        title: 'Doel wijzigen?',
        description:
          'Dit gesprek is al een bron. Bij wijzigen van het doel wordt die bronstatus opgeheven.',
        confirmLabel: 'Doel wijzigen',
        variant: 'destructive',
        onConfirm: () => void run(),
      });
      return;
    }
    void run();
  }

  async function removeCapture() {
    const captureId = captureIdRef.current;
    if (!captureId) return;
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
      setPurpose('intake');
      setTranscript('');
      setSavedTranscript('');
      setOriginalTranscript('');
      setTranscriptSource(null);
      setNotes('');
      setSavedNotes('');
      setNotesOrigin(null);
      setConsent(false);
      setEditingTranscript(false);
      setForceTranscriptEditor(false);
      setWritingVerslag(false);
      const list = await load();
      if (list[0]) applyCapture(list[0]);
      else setPane('transcript');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verwijderen mislukt');
    } finally {
      setBusy(null);
    }
  }

  function startNew() {
    if (recording || busy) return;
    guardDirty(() => {
      captureIdRef.current = null;
      activeCaptureRef.current = null;
      setActiveId(null);
      setPurpose('intake');
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
      setEditingTranscript(false);
      setForceTranscriptEditor(false);
      setWritingVerslag(false);
      setPane('transcript');
      setError(null);
    });
  }

  function selectCapture(capture: MeetingCapture) {
    if (recording || busy) return;
    if (capture.id === activeId) return;
    guardDirty(() => applyCapture(capture));
  }

  function updateTurn(index: number, text: string) {
    if (!turns) return;
    const next = turns.map((turn, turnIndex) => (turnIndex === index ? { ...turn, text } : turn));
    setTranscript(serializeSpeakerTurns(next));
  }

  const activeCapture = captures.find((item) => item.id === activeId) ?? null;
  const otherPublishedSamePurpose = captures.some(
    (item) =>
      item.status === 'accepted' &&
      item.id !== activeId &&
      normalizeMeetingPurpose(item.purpose) === purpose
  );
  const publishedDocType = documentTypeForPurpose(purpose);
  const hasPublishedDocForPurpose = Boolean(
    publishedDocType &&
      publishedDocumentTypes.some(
        (type) => type.toLowerCase().trim() === publishedDocType
      )
  );
  const isAccepted = activeCapture?.status === 'accepted';
  const publishLabel = publishLabelForPurpose(purpose);
  const acceptedLabel = acceptedStatusLabel(purpose);

  let statusLine = 'Concept';
  let statusTone: 'neutral' | 'success' | 'warning' = 'neutral';
  if (dirty) {
    statusLine = 'Wijzigingen nog niet bewaard';
    statusTone = 'warning';
  } else if (isAccepted) {
    statusLine = acceptedLabel;
    statusTone = 'success';
  } else if (purpose === 'overig') {
    statusLine = 'Concept · geen bron';
    statusTone = 'neutral';
  } else if (hasPublishedDocForPurpose || otherPublishedSamePurpose) {
    statusLine = 'Concept · bestaande bron wordt vervangen';
    statusTone = 'warning';
  }

  const showTranscript = sideBySide || pane === 'transcript';
  const showVerslag = sideBySide || pane === 'verslag';

  const body = (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <DialogTitle className="sr-only">Gesprek</DialogTitle>

      <GesprekHeader
        captures={captures}
        activeId={activeId}
        activeCapture={activeCapture}
        purpose={purpose}
        pane={pane}
        sideBySide={sideBySide}
        hasTranscript={hasTranscript}
        hasVerslag={hasVerslag}
        isAccepted={Boolean(isAccepted)}
        busy={Boolean(busy)}
        recording={recording}
        onSelectCapture={selectCapture}
        onNew={startNew}
        onDelete={() =>
          askConfirm({
            title: 'Gesprek verwijderen?',
            description: 'Dit gesprek, de opname en het transcript worden verwijderd.',
            confirmLabel: 'Verwijderen',
            variant: 'destructive',
            onConfirm: () => void removeCapture(),
          })
        }
        onPurposeChange={(next) => void changePurpose(next)}
        onPaneChange={setPane}
        onSideBySideChange={changeSideBySide}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {busy ? (
        <p className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {busy}
        </p>
      ) : null}

      <div
        className={cn(
          'grid min-h-0 flex-1 gap-3',
          sideBySide ? 'lg:grid-cols-2' : 'grid-cols-1'
        )}
      >
        {showTranscript ? (
          <TranscriptPane
            transcript={transcript}
            turns={turns}
            transcriptSource={transcriptSource}
            consent={consent}
            recording={recording}
            recordingSeconds={recordingSeconds}
            editing={editingTranscript || forceTranscriptEditor}
            forceEditor={forceTranscriptEditor}
            forcePlain={forcePlain}
            canRestore={canRestore}
            canParseTurns={canParseTurns}
            busy={Boolean(busy)}
            onConsentChange={setConsent}
            onTranscriptChange={setTranscript}
            onTurnChange={updateTurn}
            onStartRecording={() => void startRecording()}
            onStopRecording={stopRecording}
            onUploadFile={uploadTranscriptFile}
            onStartPaste={() => {
              setForceTranscriptEditor(true);
              setEditingTranscript(true);
              setForcePlain(true);
            }}
            onEditingChange={(value) => {
              setEditingTranscript(value);
              if (!value) setForceTranscriptEditor(false);
            }}
            onForcePlainChange={setForcePlain}
            onRestore={() => void restoreOriginal()}
            onRequestNewRecording={() => void startRecording()}
          />
        ) : null}

        {showVerslag ? (
          <VerslagPane
            notes={notes}
            notesOrigin={notesOrigin}
            hasTranscript={hasTranscript}
            looksLikeTranscript={notesLookLikeTranscript}
            activeId={activeId}
            busy={Boolean(busy)}
            recording={recording}
            needsGenerateReplace={needsGenerateReplace}
            writing={writingVerslag}
            onNotesChange={setNotes}
            onGenerate={(replace) => void generateNotes(Boolean(replace))}
            onUploadFile={uploadNotesFile}
            onStartWriting={() => {
              setWritingVerslag(true);
              setPane('verslag');
            }}
          />
        ) : null}
      </div>

      <GesprekFooter
        statusLine={statusLine}
        statusTone={statusTone}
        dirty={dirty}
        isAccepted={Boolean(isAccepted)}
        canPublish={Boolean(notes.trim())}
        publishLabel={publishLabel}
        acceptedLabel={acceptedLabel}
        busy={Boolean(busy)}
        recording={recording}
        needsReplace={needsReplace}
        onSaveDraft={() => void saveDraft()}
        onPublish={publishAsSource}
        onForceReplace={() => void acceptNotes(true)}
      />
    </div>
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) {
            guardDirty(() => onOpenChange(false));
            return;
          }
          onOpenChange(next);
        }}
      >
        <DialogContent className="flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden sm:max-w-[1400px]">
          {body}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(next) => {
          if (!next && !confirmLoading) setConfirm(null);
        }}
        title={confirm?.title ?? ''}
        description={confirm?.description}
        confirmLabel={confirm?.confirmLabel}
        cancelLabel={confirm?.cancelLabel}
        variant={confirm?.variant}
        loading={confirmLoading}
        onConfirm={async () => {
          if (!confirm) return;
          setConfirmLoading(true);
          try {
            await confirm.onConfirm();
            setConfirm(null);
          } finally {
            setConfirmLoading(false);
          }
        }}
      />
    </>
  );
}
