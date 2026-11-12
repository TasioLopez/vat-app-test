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
import { Textarea } from '@/components/ui/textarea';
import { bookingRangeFromInputs, parseDateInput, parseGuestEmails } from '@/lib/booking/validate';
import { formatBookingWhen } from '@/lib/booking/time';
import { spaceKindLabel, type SpaceRow } from '@/lib/booking/types';
import { X } from 'lucide-react';

export type BookingDraft = {
  space: SpaceRow;
  locationName: string;
  date: string;
  start: string;
  end: string;
};

type BookingFormDialogProps = {
  draft: BookingDraft | null;
  onOpenChange: (open: boolean) => void;
  onBooked: (emailWarning: string | null) => void;
};

export default function BookingFormDialog({ draft, onOpenChange, onBooked }: BookingFormDialogProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [note, setNote] = useState('');
  const [guests, setGuests] = useState<string[]>([]);
  const [guestDraft, setGuestDraft] = useState('');
  const [guestError, setGuestError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!draft) return;
    setTitle('');
    setDate(draft.date);
    setStart(draft.start);
    setEnd(draft.end);
    setNote('');
    setGuests([]);
    setGuestDraft('');
    setGuestError(null);
    setFormError(null);
    setSaving(false);
  }, [draft]);

  const preview = useMemo(() => {
    const day = parseDateInput(date);
    if (!day) return null;
    const range = bookingRangeFromInputs(day, start, end);
    if ('error' in range) return null;
    return formatBookingWhen(range.startsAt, range.endsAt);
  }, [date, start, end]);

  function addGuests(raw: string) {
    const parts = raw.split(/[,;\s]+/).map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) return;
    const parsed = parseGuestEmails([...guests, ...parts]);
    if (parsed.error) {
      setGuestError(parsed.error);
      return;
    }
    setGuests(parsed.emails);
    setGuestDraft('');
    setGuestError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const day = parseDateInput(date);
    if (!day) {
      setFormError('Ongeldige datum of tijd.');
      return;
    }
    const pending = guestDraft.trim() ? [...guests, guestDraft.trim()] : guests;
    const parsedGuests = parseGuestEmails(pending);
    if (parsedGuests.error) {
      setGuestError(parsedGuests.error);
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
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: draft.space.id,
          title: title.trim(),
          startsAt: range.startsAt.toISOString(),
          endsAt: range.endsAt.toISOString(),
          note: note.trim(),
          guestEmails: parsedGuests.emails,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; emailWarning?: string | null };
      if (!response.ok) {
        setFormError(body.error ?? 'De reservering kon niet worden opgeslagen.');
        setSaving(false);
        return;
      }
      onBooked(body.emailWarning ?? null);
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
          <DialogTitle>Reserveren</DialogTitle>
        </DialogHeader>
        {draft ? (
          <form onSubmit={submit} className="space-y-4">
            <p className="text-sm text-slate-600">
              {spaceKindLabel(draft.space.kind)}{' '}
              <span className="font-medium text-slate-900">{draft.space.name}</span>
              {' · '}
              {draft.locationName}
            </p>
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
            <div className="space-y-2">
              <Label htmlFor="booking-guest">Extra genodigden</Label>
              <div className="flex gap-2">
                <Input
                  id="booking-guest"
                  type="email"
                  value={guestDraft}
                  placeholder="naam@bedrijf.nl"
                  onChange={(event) => setGuestDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ',') {
                      event.preventDefault();
                      addGuests(guestDraft);
                    }
                  }}
                  onBlur={() => {
                    if (guestDraft.trim()) addGuests(guestDraft);
                  }}
                />
                <Button type="button" variant="outline" onClick={() => addGuests(guestDraft)}>
                  Toevoegen
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Zij ontvangen dezelfde bevestiging. Scheid adressen met een komma of Enter.
              </p>
              {guests.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {guests.map((email) => (
                    <li key={email} className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-1 text-xs text-purple-900">
                      {email}
                      <button
                        type="button"
                        className="cursor-pointer rounded-full p-0.5 hover:bg-purple-200"
                        aria-label={`Verwijder ${email}`}
                        onClick={() => setGuests((current) => current.filter((item) => item !== email))}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {guestError ? <p className="text-sm text-red-600">{guestError}</p> : null}
            </div>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Sluiten
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Opslaan…' : 'Reserveren'}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
