'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatBookingWhen } from '@/lib/booking/time';
import { spaceKindLabel, type BookingRow, type LocationRow, type SpaceRow } from '@/lib/booking/types';
import { supabase } from '@/lib/supabase/client';

type BookingDetailDialogProps = {
  booking: BookingRow | null;
  space: SpaceRow | null;
  location: LocationRow | null;
  userId: string;
  canChange: boolean;
  onClose: () => void;
  onRequestEdit: (booking: BookingRow) => void;
  onRequestCancel: (booking: BookingRow) => void;
};

export default function BookingDetailDialog({
  booking,
  space,
  location,
  userId,
  canChange,
  onClose,
  onRequestEdit,
  onRequestCancel,
}: BookingDetailDialogProps) {
  const [note, setNote] = useState<string | null>(null);
  const isOwn = booking?.booked_by === userId;
  const canSeePrivate = canChange;

  useEffect(() => {
    if (!booking || !canSeePrivate) {
      setNote(null);
      return;
    }
    let cancelled = false;
    supabase
      .from('bookings')
      .select('note')
      .eq('id', booking.id)
      .maybeSingle()
      .then((noteResult) => {
        if (cancelled) return;
        setNote(noteResult.data?.note ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [booking, canSeePrivate]);

  return (
    <Dialog open={booking !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{booking?.title ?? 'Reservering'}</DialogTitle>
        </DialogHeader>
        {booking ? (
          <div className="space-y-3 text-sm text-slate-700">
            <p>
              {formatBookingWhen(new Date(booking.starts_at), new Date(booking.ends_at))}
            </p>
            <p>
              <span className="text-slate-500">{space ? spaceKindLabel(space.kind) : 'Ruimte'}: </span>
              {space?.name ?? 'Onbekend'}
              {location ? ` · ${location.name}` : ''}
            </p>
            <p>
              <span className="text-slate-500">Gereserveerd door: </span>
              {booking.booker_name}
              {isOwn ? ' (jij)' : ''}
            </p>
            {canSeePrivate && note ? (
              <p className="rounded-lg bg-slate-50 px-3 py-2">
                <span className="text-slate-500">Notitie: </span>
                {note}
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Sluiten
          </Button>
          {canChange && booking ? (
            <Button type="button" variant="outline" onClick={() => onRequestEdit(booking)}>
              Wijzigen
            </Button>
          ) : null}
          {canChange && booking ? (
            <Button type="button" variant="destructive" onClick={() => onRequestCancel(booking)}>
              Annuleren
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
