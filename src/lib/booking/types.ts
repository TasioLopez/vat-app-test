export type SpaceKind = 'room' | 'parking';

export type CalendarDay = {
  year: number;
  month: number;
  day: number;
};

export type LocationRow = {
  id: string;
  name: string;
  address: string | null;
  active: boolean;
  created_at: string;
};

export type SpaceRow = {
  id: string;
  location_id: string;
  kind: SpaceKind;
  name: string;
  capacity: number | null;
  notes: string | null;
  active: boolean;
  created_at: string;
};

export type BookingRow = {
  id: string;
  space_id: string;
  booked_by: string | null;
  booker_name: string;
  title: string;
  starts_at: string;
  ends_at: string;
  note: string | null;
  created_at: string;
};

export function spaceKindLabel(kind: SpaceKind): string {
  return kind === 'room' ? 'Ruimte' : 'Parkeerplaats';
}

export function spaceKindPlural(kind: SpaceKind): string {
  return kind === 'room' ? 'Ruimtes' : 'Parkeerplaatsen';
}

export function isSpaceKind(value: string): value is SpaceKind {
  return value === 'room' || value === 'parking';
}
