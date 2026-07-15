/** User-facing Dutch messages and detection for Gotenberg conversion failures. */

const GOTENBERG_ERROR_PREFIX = 'Intake DOCX conversion failed';

export function isGotenbergConversionError(message: string): boolean {
  return (
    message.includes(GOTENBERG_ERROR_PREFIX) ||
    message.includes('GOTENBERG_URL is not configured') ||
    message.includes('Gotenberg returned') ||
    message.includes('Gotenberg request timed out')
  );
}

export function isGotenbergConfigError(message: string): boolean {
  return message.includes('GOTENBERG_URL is not configured');
}

export function gotenbergErrorToUserMessage(message: string): string {
  if (isGotenbergConfigError(message)) {
    return 'DOCX-conversie is niet geconfigureerd. Neem contact op met beheer.';
  }
  if (isGotenbergConversionError(message)) {
    return 'Documentconverter tijdelijk niet beschikbaar. Probeer opnieuw of upload een PDF.';
  }
  return message;
}

export class GotenbergConversionError extends Error {
  readonly userMessage: string;

  constructor(message: string) {
    super(message);
    this.name = 'GotenbergConversionError';
    this.userMessage = gotenbergErrorToUserMessage(message);
  }
}

export { GOTENBERG_ERROR_PREFIX };
