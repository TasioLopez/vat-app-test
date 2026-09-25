'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  createReferentForClient,
  normalizeReferentWritePayload,
  referentPayloadHasContact,
  updateReferentById,
  type ReferentWritePayload,
} from '@/lib/referents';
import { SELECT_CLASS } from '@/lib/select-class';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type ReferentEditInitial = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  referent_function: string | null;
  gender: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'edit' | 'create';
  clientId: string;
  initial?: ReferentEditInitial | null;
  onSaved: (referentId: string) => void | Promise<void>;
  onError: (message: string) => void;
};

const emptyDraft = (): ReferentWritePayload => ({
  first_name: null,
  last_name: null,
  phone: null,
  email: null,
  referent_function: null,
  gender: null,
});

export function ReferentEditDialog({
  open,
  onOpenChange,
  mode,
  clientId,
  initial,
  onSaved,
  onError,
}: Props) {
  const [draft, setDraft] = useState<ReferentWritePayload>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initial) {
      setDraft({
        first_name: initial.first_name,
        last_name: initial.last_name,
        phone: initial.phone,
        email: initial.email,
        referent_function: initial.referent_function,
        gender: initial.gender,
      });
    } else {
      setDraft(emptyDraft());
    }
  }, [open, mode, initial]);

  const setField = (key: keyof ReferentWritePayload, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const payload = normalizeReferentWritePayload(draft);
    if (!referentPayloadHasContact(payload)) {
      onError('Vul minimaal een naam, telefoon of e-mail in.');
      return;
    }
    if (!clientId) {
      onError('Geen werkgever gekoppeld.');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'edit') {
        if (!initial?.id) {
          onError('Geen contactpersoon geselecteerd.');
          return;
        }
        const result = await updateReferentById(supabase, initial.id, payload);
        if (result.error) {
          onError('Kon contactpersoon niet bijwerken.');
          return;
        }
        await onSaved(initial.id);
      } else {
        const result = await createReferentForClient(supabase, clientId, payload);
        if (result.error || !result.referentId) {
          onError('Kon contactpersoon niet aanmaken.');
          return;
        }
        await onSaved(result.referentId);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-gray-900">
            {mode === 'edit' ? 'Contactpersoon bewerken' : 'Nieuwe contactpersoon'}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Voornaam</label>
            <Input
              value={draft.first_name ?? ''}
              onChange={(e) => setField('first_name', e.target.value)}
              placeholder="Voornaam"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Achternaam</label>
            <Input
              value={draft.last_name ?? ''}
              onChange={(e) => setField('last_name', e.target.value)}
              placeholder="Achternaam"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Telefoon</label>
            <Input
              value={draft.phone ?? ''}
              onChange={(e) => setField('phone', e.target.value)}
              placeholder="Telefoon"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">E-mail</label>
            <Input
              type="email"
              value={draft.email ?? ''}
              onChange={(e) => setField('email', e.target.value)}
              placeholder="E-mail"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Functie</label>
            <Input
              value={draft.referent_function ?? ''}
              onChange={(e) => setField('referent_function', e.target.value)}
              placeholder="Functie"
              disabled={saving}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Geslacht</label>
            <Select
              value={draft.gender || undefined}
              onValueChange={(v) => setField('gender', v)}
              disabled={saving}
            >
              <SelectTrigger className={SELECT_CLASS}>
                <SelectValue placeholder="Geslacht" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Man">Man</SelectItem>
                <SelectItem value="Vrouw">Vrouw</SelectItem>
                <SelectItem value="Anders">Anders</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Annuleren
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Opslaan…' : 'Opslaan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
