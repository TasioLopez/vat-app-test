'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { bookingRangeFromInputs, parseDateInput } from '@/lib/booking/validate';
import { formatBookingWhen } from '@/lib/booking/time';
import { spaceKindLabel, type SpaceRow } from '@/lib/booking/types';

export type BookingDraft = {
  space: SpaceRow;
  locationName: string;
  date: string;
  start: string;
  end: string;
  bookingId?: string;
  title?: string;
  note?: string;
};

type BookingFormDialogProps = {
  draft: BookingDraft | null;
  spaceOptions: SpaceRow[];
  onOpenChange: (open: boolean) => void;
  onBooked: (emailWarning: string | null, updated: boolean) => void;
};

export default function BookingFormDialog({ draft, spaceOptions, onOpenChange, onBooked }: BookingFormDialogProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [spaceId, setSpaceId] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(draft?.bookingId);

  useEffect(() => {
    if (!draft) return;
    setTitle(draft.title ?? '');
    setDate(draft.date);
    setStart(draft.start);
    setEnd(draft.end);
    setNote(draft.note ?? '');
    setSpaceId(draft.space.id);
    setFormError(null);
    setSaving(false);
  }, [draft]);

  const selectedSpace = spaceOptions.find((space) => space.id === spaceId) ?? draft?.space ?? null;

  const preview = useMemo(() => {
    const day = parseDateInput(date);
    if (!day) return null;
    const range = bookingRangeFromInputs(day, start, end);
    if ('error' in range) return null;
    return formatBookingWhen(range.startsAt, range.endsAt);
  }, [date, start, end]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft || !selectedSpace) return;
    const day = parseDateInput(date);
    if (!day) {
      setFormError('Ongeldige datum of tijd.');
      return;
    }
    const range = bookingRangeFromInputs(day, start, end);
    if ('error' in range) {
      setFormError(range.error);
      return;
    }
    if (!title.trim()) {
      setFormError('Vul een titel in.');
      return;
    }

    setSaving(true);
    setFormError(null);
    const updated = Boolean(draft.bookingId);
    try {
      const response = await fetch(updated ? `/api/bookings/${draft.bookingId}` : '/api/bookings', {
        method: updated ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: selectedSpace.id,
          title: title.trim(),
          startsAt: range.startsAt.toISOString(),
          endsAt: range.endsAt.toISOString(),
          note: note.trim(),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; emailWarning?: string | null };
      if (!response.ok) {
        setFormError(body.error ?? 'De reservering kon niet worden opgeslagen.');
        setSaving(false);
        return;
      }
      onBooked(body.emailWarning ?? null, updated);
      onOpenChange(false);
    } catch {
      setFormError('De reservering kon niet worden opgeslagen.');
      setSaving(false);
    }
  }

  return (
    <Dialog open={draft !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Reservering wijzigen' : 'Reserveren'}</DialogTitle>
        </DialogHeader>
        {draft && selectedSpace ? (
          <form onSubmit={submit} className="space-y-4">
            {editing && spaceOptions.length > 1 ? (
              <div className="space-y-2">
                <Label htmlFor="booking-space">{spaceKindLabel(selectedSpace.kind)}</Label>
                <Select value={spaceId} onValueChange={setSpaceId}>
                  <SelectTrigger id="booking-space" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {spaceOptions.map((space) => (
                      <SelectItem key={space.id} value={space.id}>
                        {space.name}
                        {space.active ? '' : ' (inactief)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-slate-600">{draft.locationName}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                {spaceKindLabel(selectedSpace.kind)}{' '}
                <span className="font-medium text-slate-900">{selectedSpace.name}</span>
                {' · '}
                {draft.locationName}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="booking-title">Titel</Label>
              <Input
                id="booking-title"
                value={title}
                maxLength={120}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Bijvoorbeeld teamoverleg"
                required
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="booking-date">Datum</Label>
                <Input id="booking-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-start">Start</Label>
                <Input id="booking-start" type="time" value={start} onChange={(event) => setStart(event.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking-end">Einde</Label>
                <Input id="booking-end" type="time" value={end} onChange={(event) => setEnd(event.target.value)} required />
              </div>
            </div>
            {preview ? (
              <p className="rounded-lg bg-purple-50 px-3 py-2 text-sm text-purple-900">{preview}</p>
            ) : (
              <p className="text-sm text-slate-500">Kies een start- en eindtijd. Een reservering duurt maximaal 12 uur.</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="booking-note">Notitie</Label>
              <Textarea
                id="booking-note"
                value={note}
                maxLength={1000}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optioneel"
                className="min-h-20 border-2 border-purple-200 focus-visible:border-purple-500 focus-visible:ring-purple-500/50"
              />
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Sluiten
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Opslaan…' : editing ? 'Opslaan' : 'Reserveren'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
