'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Textarea } from '@/components/ui/textarea';
import { useToastHelpers } from '@/components/ui/Toast';
import { isSpaceKind, spaceKindLabel, spaceKindPlural, type LocationRow, type SpaceKind, type SpaceRow } from '@/lib/booking/types';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

type LocationDraft = {
  id: string | null;
  name: string;
  address: string;
  active: boolean;
};

type SpaceDraft = {
  id: string | null;
  kind: SpaceKind;
  name: string;
  capacity: string;
  notes: string;
  active: boolean;
};

type DeleteTarget =
  | { type: 'location'; id: string; name: string }
  | { type: 'space'; id: string; name: string };

const FUTURE_BOOKING_HINT = 'Verwijderen kan alleen als er geen toekomstige reserveringen zijn. Annuleer die eerst.';

export default function SpaceAdmin() {
  const { showSuccess, showError } = useToastHelpers();
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [locationDraft, setLocationDraft] = useState<LocationDraft | null>(null);
  const [spaceDraft, setSpaceDraft] = useState<SpaceDraft | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [{ data: locationRows, error: locationError }, { data: spaceRows, error: spaceError }] =
      await Promise.all([
        supabase.from('locations').select('id, name, address, active, created_at').order('name'),
        supabase
          .from('spaces')
          .select('id, location_id, kind, name, capacity, notes, active, created_at')
          .order('name'),
      ]);
    if (locationError || spaceError) {
      showError('Laden mislukt', locationError?.message || spaceError?.message);
      setLoading(false);
      return;
    }
    setLocations(locationRows ?? []);
    setSpaces(
      (spaceRows ?? []).flatMap((row) => (isSpaceKind(row.kind) ? [{ ...row, kind: row.kind }] : []))
    );
    setLoading(false);
  }, [showError]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!selectedId && locations.length > 0) {
      setSelectedId(locations[0].id);
    } else if (selectedId && !locations.some((location) => location.id === selectedId)) {
      setSelectedId(locations[0]?.id ?? '');
    }
  }, [locations, selectedId]);

  const selected = locations.find((location) => location.id === selectedId) ?? null;
  const rooms = useMemo(
    () => spaces.filter((space) => space.location_id === selectedId && space.kind === 'room'),
    [spaces, selectedId]
  );
  const parking = useMemo(
    () => spaces.filter((space) => space.location_id === selectedId && space.kind === 'parking'),
    [spaces, selectedId]
  );

  async function saveLocation(event: React.FormEvent) {
    event.preventDefault();
    if (!locationDraft) return;
    const name = locationDraft.name.trim();
    if (!name) {
      showError('Naam ontbreekt', 'Vul een naam voor de locatie in.');
      return;
    }
    setSaving(true);
    const payload = {
      name,
      address: locationDraft.address.trim() || null,
      active: locationDraft.active,
    };
    const result = locationDraft.id
      ? await supabase.from('locations').update(payload).eq('id', locationDraft.id)
      : await supabase.from('locations').insert(payload).select('id').single();
    setSaving(false);
    if (result.error) {
      showError('Opslaan mislukt', result.error.message);
      return;
    }
    if (!locationDraft.id && result.data && 'id' in result.data) {
      setSelectedId(result.data.id);
    }
    setLocationDraft(null);
    showSuccess(locationDraft.id ? 'Locatie bijgewerkt' : 'Locatie toegevoegd');
    await load();
  }

  async function saveSpace(event: React.FormEvent) {
    event.preventDefault();
    if (!spaceDraft || !selectedId) return;
    const name = spaceDraft.name.trim();
    if (!name) {
      showError('Naam ontbreekt', 'Vul een naam in.');
      return;
    }
    let capacity: number | null = null;
    if (spaceDraft.kind === 'room' && spaceDraft.capacity.trim()) {
      capacity = Number(spaceDraft.capacity);
      if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
        showError('Capaciteit', 'Vul een geheel getal tussen 1 en 500 in, of laat het veld leeg.');
        return;
      }
    }
    setSaving(true);
    const payload = {
      location_id: selectedId,
      kind: spaceDraft.kind,
      name,
      capacity,
      notes: spaceDraft.notes.trim() || null,
      active: spaceDraft.active,
    };
    const result = spaceDraft.id
      ? await supabase.from('spaces').update(payload).eq('id', spaceDraft.id)
      : await supabase.from('spaces').insert(payload);
    setSaving(false);
    if (result.error) {
      showError('Opslaan mislukt', result.error.message);
      return;
    }
    setSpaceDraft(null);
    showSuccess(spaceDraft.id ? 'Opgeslagen' : `${spaceKindLabel(spaceDraft.kind)} toegevoegd`);
    await load();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    const result =
      deleteTarget.type === 'location'
        ? await supabase.from('locations').delete().eq('id', deleteTarget.id)
        : await supabase.from('spaces').delete().eq('id', deleteTarget.id);
    setSaving(false);
    if (result.error) {
      const message = result.error.message.includes('toekomstige reserveringen')
        ? result.error.message
        : result.error.message;
      showError('Verwijderen mislukt', message);
      return;
    }
    setDeleteTarget(null);
    showSuccess('Verwijderd');
    await load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner text="Beheer laden…" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-purple-50/50 p-4 md:p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div>
          <Link
            href="/dashboard/reserveren"
            className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-purple-700 hover:text-purple-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Terug naar de agenda
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">Beheer</h1>
          <p className="mt-1 text-sm text-slate-600">
            Locaties, ruimtes en parkeerplaatsen. Inactieve plekken blijven zichtbaar, maar kunnen niet meer worden gereserveerd.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-900">Locaties</h2>
              <Button
                type="button"
                size="sm"
                onClick={() => setLocationDraft({ id: null, name: '', address: '', active: true })}
              >
                <Plus className="mr-1 h-4 w-4" />
                Nieuw
              </Button>
            </div>
            {locations.length === 0 ? (
              <p className="text-sm text-slate-500">Nog geen locaties.</p>
            ) : (
              <ul className="space-y-2">
                {locations.map((location) => (
                  <li key={location.id}>
                    <div
                      className={cn(
                        'rounded-xl border px-3 py-2',
                        location.id === selectedId
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-transparent bg-slate-50'
                      )}
                    >
                      <button
                        type="button"
                        className="w-full cursor-pointer text-left"
                        onClick={() => setSelectedId(location.id)}
                      >
                        <div className="font-medium text-slate-900">{location.name}</div>
                        <div className="text-xs text-slate-500">
                          {location.address || 'Geen adres'}
                          {location.active ? '' : ' · inactief'}
                        </div>
                      </button>
                      <div className="mt-2 flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Bewerk ${location.name}`}
                          onClick={() =>
                            setLocationDraft({
                              id: location.id,
                              name: location.name,
                              address: location.address ?? '',
                              active: location.active,
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Verwijder ${location.name}`}
                          onClick={() => setDeleteTarget({ type: 'location', id: location.id, name: location.name })}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-purple-100 bg-white p-4 shadow-sm md:p-5">
            {selected ? (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{selected.name}</h2>
                  <p className="text-sm text-slate-500">{selected.address || 'Geen adres'}</p>
                </div>
                <SpaceSection
                  title={spaceKindPlural('room')}
                  spaces={rooms}
                  onAdd={() =>
                    setSpaceDraft({ id: null, kind: 'room', name: '', capacity: '', notes: '', active: true })
                  }
                  onEdit={(space) =>
                    setSpaceDraft({
                      id: space.id,
                      kind: 'room',
                      name: space.name,
                      capacity: space.capacity ? String(space.capacity) : '',
                      notes: space.notes ?? '',
                      active: space.active,
                    })
                  }
                  onDelete={(space) => setDeleteTarget({ type: 'space', id: space.id, name: space.name })}
                />
                <SpaceSection
                  title={spaceKindPlural('parking')}
                  spaces={parking}
                  onAdd={() =>
                    setSpaceDraft({ id: null, kind: 'parking', name: '', capacity: '', notes: '', active: true })
                  }
                  onEdit={(space) =>
                    setSpaceDraft({
                      id: space.id,
                      kind: 'parking',
                      name: space.name,
                      capacity: '',
                      notes: space.notes ?? '',
                      active: space.active,
                    })
                  }
                  onDelete={(space) => setDeleteTarget({ type: 'space', id: space.id, name: space.name })}
                />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Kies of maak eerst een locatie.</p>
            )}
          </section>
        </div>
      </div>

      <Dialog open={locationDraft !== null} onOpenChange={(open) => { if (!open) setLocationDraft(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{locationDraft?.id ? 'Locatie bewerken' : 'Locatie toevoegen'}</DialogTitle>
          </DialogHeader>
          {locationDraft ? (
            <form onSubmit={saveLocation} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location-name">Naam</Label>
                <Input
                  id="location-name"
                  value={locationDraft.name}
                  maxLength={80}
                  onChange={(event) => setLocationDraft({ ...locationDraft, name: event.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location-address">Adres</Label>
                <Input
                  id="location-address"
                  value={locationDraft.address}
                  maxLength={200}
                  onChange={(event) => setLocationDraft({ ...locationDraft, address: event.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-purple-700"
                  checked={locationDraft.active}
                  onChange={(event) => setLocationDraft({ ...locationDraft, active: event.target.checked })}
                />
                Actief
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setLocationDraft(null)} disabled={saving}>
                  Sluiten
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Opslaan…' : 'Opslaan'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={spaceDraft !== null} onOpenChange={(open) => { if (!open) setSpaceDraft(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {spaceDraft
                ? `${spaceDraft.id ? 'Bewerk' : 'Nieuwe'} ${spaceKindLabel(spaceDraft.kind).toLowerCase()}`
                : 'Ruimte'}
            </DialogTitle>
          </DialogHeader>
          {spaceDraft ? (
            <form onSubmit={saveSpace} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="space-name">Naam</Label>
                <Input
                  id="space-name"
                  value={spaceDraft.name}
                  maxLength={80}
                  onChange={(event) => setSpaceDraft({ ...spaceDraft, name: event.target.value })}
                  required
                />
              </div>
              {spaceDraft.kind === 'room' ? (
                <div className="space-y-2">
                  <Label htmlFor="space-capacity">Capaciteit</Label>
                  <Input
                    id="space-capacity"
                    type="number"
                    min={1}
                    max={500}
                    value={spaceDraft.capacity}
                    onChange={(event) => setSpaceDraft({ ...spaceDraft, capacity: event.target.value })}
                    placeholder="Aantal personen, optioneel"
                  />
                </div>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="space-notes">Notitie</Label>
                <Textarea
                  id="space-notes"
                  maxLength={500}
                  value={spaceDraft.notes}
                  onChange={(event) => setSpaceDraft({ ...spaceDraft, notes: event.target.value })}
                  className="min-h-20 border-2 border-purple-200 focus-visible:border-purple-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-purple-700"
                  checked={spaceDraft.active}
                  onChange={(event) => setSpaceDraft({ ...spaceDraft, active: event.target.checked })}
                />
                Actief
              </label>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSpaceDraft(null)} disabled={saving}>
                  Sluiten
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Opslaan…' : 'Opslaan'}
                </Button>
              </DialogFooter>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setDeleteTarget(null);
        }}
        title={deleteTarget ? `${deleteTarget.name} verwijderen?` : 'Verwijderen?'}
        description={FUTURE_BOOKING_HINT}
        confirmLabel="Verwijderen"
        cancelLabel="Terug"
        variant="destructive"
        loading={saving}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function SpaceSection({
  title,
  spaces,
  onAdd,
  onEdit,
  onDelete,
}: {
  title: string;
  spaces: SpaceRow[];
  onAdd: () => void;
  onEdit: (space: SpaceRow) => void;
  onDelete: (space: SpaceRow) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}>
          <Plus className="mr-1 h-4 w-4" />
          Toevoegen
        </Button>
      </div>
      {spaces.length === 0 ? (
        <p className="text-sm text-slate-500">Nog niets toegevoegd.</p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {spaces.map((space) => (
            <li key={space.id} className="rounded-xl border border-purple-100 bg-slate-50 px-3 py-3">
              <div className="font-medium text-slate-900">{space.name}</div>
              <div className="mt-1 text-xs text-slate-500">
                {space.kind === 'room' && space.capacity ? `${space.capacity} personen` : null}
                {space.kind === 'room' && space.capacity && !space.active ? ' · ' : null}
                {space.active ? '' : 'inactief'}
              </div>
              {space.notes ? <p className="mt-1 text-sm text-slate-600">{space.notes}</p> : null}
              <div className="mt-2 flex gap-1">
                <Button type="button" size="sm" variant="ghost" aria-label={`Bewerk ${space.name}`} onClick={() => onEdit(space)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button type="button" size="sm" variant="ghost" aria-label={`Verwijder ${space.name}`} onClick={() => onDelete(space)}>
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
