/**
 * Maps GoTrue / supabase-js PKCE failures to a clear Dutch user message.
 */
export function humanizeAuthCallbackError(raw: string | null | undefined): string {
  const message = (raw ?? "").trim();
  const lower = message.toLowerCase();

  if (
    lower.includes("both auth code and code verifier") ||
    lower.includes("code verifier") ||
    lower.includes("pkce")
  ) {
    return (
      "Deze resetlink kan niet worden voltooid in deze browser (ontbrekende beveiligingscode). " +
      "Vraag een nieuwe resetlink aan en open die in dezelfde browser waarin je ‘Wachtwoord vergeten’ hebt gebruikt. " +
      "Gebruik bij voorkeur https://www.vat-app.nl (met www)."
    );
  }

  if (
    lower.includes("expired") ||
    lower.includes("otp_expired") ||
    lower.includes("flow state")
  ) {
    return "Ongeldige of verlopen link. Vraag een nieuwe uitnodiging of resetlink aan.";
  }

  if (message) return message;
  return "Sessie kon niet worden gestart.";
}
