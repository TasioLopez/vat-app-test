'use client';

import { Pencil, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OrgUserSelect } from '@/components/users/OrgUserSelect';
import { supabase } from '@/lib/supabase/client';
import { CARD_CLASS, CARD_TITLE_CLASS } from '@/components/employee/detail/shared';

const NO_REFERENT = '__none__';

/** Reads as plain text until hovered or focused, like a property panel. */
const PROPERTY_SELECT_CLASS =
  'h-8 border border-transparent bg-transparent px-2 py-0 text-sm text-gray-900 shadow-none hover:border-gray-200 hover:bg-gray-50 focus-visible:border-purple-400 focus-visible:ring-2 focus-visible:ring-purple-500/30 focus-visible:shadow-none data-[state=open]:border-gray-200 data-[state=open]:bg-gray-50';

const ICON_BUTTON_CLASS =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/40 disabled:pointer-events-none disabled:opacity-40';

const LABEL_CLASS = 'text-[13px] text-gray-500';

export type DossierReferent = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  referent_function: string | null;
};

type Props = {
  clients: Array<{ id: string; name: string }>;
  clientId: string;
  onClientChange: (clientId: string) => void;
  referents: DossierReferent[];
  referentId: string | null | undefined;
  onReferentChange: (referentId: string | null) => void;
  onEditReferent: () => void;
  onNewReferent: () => void;
  ownerId: string | null | undefined;
  currentUserId: string | null;
  onOwnerChange: (ownerId: string | null) => void;
  /** Contact person found in a source document by AI autofill. */
  suggestedReferentName: string | null;
  suggestedReferentExists: boolean;
  onApplySuggestedReferent: () => void;
  busy: boolean;
};

function referentLabel(referent: DossierReferent): string {
  const name = [referent.first_name, referent.last_name].filter(Boolean).join(' ').trim() || 'Naamloos';
  return referent.referent_function ? `${name} (${referent.referent_function})` : name;
}

export function DossierCard({
  clients,
  clientId,
  onClientChange,
  referents,
  referentId,
  onReferentChange,
  onEditReferent,
  onNewReferent,
  ownerId,
  currentUserId,
  onOwnerChange,
  suggestedReferentName,
  suggestedReferentExists,
  onApplySuggestedReferent,
  busy,
}: Props) {
  return (
    <section aria-labelledby="employee-dossier-title" className={CARD_CLASS}>
      <h2 id="employee-dossier-title" className={`${CARD_TITLE_CLASS} px-4 pb-1.5 pt-3`}>
        Dossier
      </h2>

      <div className="grid grid-cols-[6.25rem_minmax(0,1fr)] items-center gap-y-0.5 pb-2.5 pl-4 pr-2">
        <span id="dossier-client-label" className={LABEL_CLASS}>
          Werkgever
        </span>
        <Select value={clientId || undefined} onValueChange={onClientChange}>
          <SelectTrigger aria-labelledby="dossier-client-label" className={PROPERTY_SELECT_CLASS}>
            <SelectValue placeholder="Selecteer werkgever" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {clientId ? (
          <>
            <span id="dossier-referent-label" className={LABEL_CLASS}>
              Contact
            </span>
            <div className="flex min-w-0 items-center gap-0.5">
              <Select
                value={referentId ?? NO_REFERENT}
                onValueChange={(value) => onReferentChange(value === NO_REFERENT ? null : value)}
              >
                <SelectTrigger
                  aria-labelledby="dossier-referent-label"
                  className={`${PROPERTY_SELECT_CLASS} min-w-0 flex-1`}
                >
                  <SelectValue placeholder="Standaard" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REFERENT}>Standaard contactpersoon</SelectItem>
                  {referents.map((referent) => (
                    <SelectItem key={referent.id} value={referent.id}>
                      {referentLabel(referent)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                type="button"
                className={ICON_BUTTON_CLASS}
                disabled={!referentId}
                title="Contactpersoon bewerken"
                aria-label="Contactpersoon bewerken"
                onClick={onEditReferent}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                className={ICON_BUTTON_CLASS}
                title="Nieuwe contactpersoon"
                aria-label="Nieuwe contactpersoon"
                onClick={onNewReferent}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </>
        ) : null}

        <span id="dossier-owner-label" className={LABEL_CLASS}>
          Eigenaar
        </span>
        <OrgUserSelect
          supabase={supabase}
          value={ownerId}
          currentUserId={currentUserId}
          allowNone
          noneLabel="Geen eigenaar"
          placeholder="Selecteer eigenaar"
          className={PROPERTY_SELECT_CLASS}
          onChange={(nextOwnerId) => onOwnerChange(nextOwnerId)}
        />
      </div>

      {suggestedReferentName && clientId ? (
        <div className="rounded-b-xl border-t border-amber-200 bg-amber-50/70 px-4 py-2.5 text-[13px] leading-5 text-gray-700">
          Contactpersoon uit document: <span className="font-medium text-gray-900">{suggestedReferentName}</span>
          <button
            type="button"
            onClick={onApplySuggestedReferent}
            disabled={busy}
            className="ml-1.5 rounded-sm font-medium text-purple-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 disabled:opacity-50"
          >
            {suggestedReferentExists ? 'Koppelen' : 'Aanmaken en koppelen'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
