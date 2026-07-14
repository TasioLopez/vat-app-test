export { isAdDocumentType } from '@/lib/tp/intake-ad-presence';

export function isFmlDocumentType(type: string | null | undefined): boolean {
  const t = (type || '').toLowerCase();
  return t === 'fml' || t === 'izp' || t === 'lab' || t.includes('fml') || t.includes('izp');
}
