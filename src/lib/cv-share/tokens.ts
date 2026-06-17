import { createHash, randomBytes } from 'node:crypto';

/** Generate a URL-safe opaque share token (raw, not stored). */
export function generateShareToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 hash of raw token for database storage. */
export function hashShareToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
