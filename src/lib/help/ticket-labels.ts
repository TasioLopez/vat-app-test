const TICKET_STATUS_NL: Record<string, string> = {
  open: "Open",
  in_progress: "In behandeling",
  waiting_customer: "Wacht op reactie klant",
  resolved: "Opgelost",
  closed: "Gesloten",
};

const TICKET_PRIORITY_NL: Record<string, string> = {
  low: "Laag",
  normal: "Normaal",
  high: "Hoog",
  urgent: "Urgent",
};

export function ticketStatusLabelNl(status: string): string {
  return TICKET_STATUS_NL[status] ?? status;
}

export function ticketPriorityLabelNl(priority: string): string {
  return TICKET_PRIORITY_NL[priority] ?? priority;
}

export const TICKET_STATUS_VALUES = [
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
] as const;

export const TICKET_PRIORITY_VALUES = ["low", "normal", "high", "urgent"] as const;
