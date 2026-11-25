import type { VgrDossierDocType } from './types';

/**
 * Map app `documents.type` / filename hints → pack DocumentType.
 * Coarse types stay; email/motivatiebrief/werkboek/test gain first-class pack labels (G3 lite).
 */
export function mapEmployeeDocTypeToDossier(
  appType: string | null | undefined,
  filename = '',
): VgrDossierDocType {
  const t = String(appType || '').toLowerCase().trim();
  const name = filename.toLowerCase();

  if (t === 'ad_rapportage' || /\bad[\s_-]?rapport/.test(name)) return 'AD';
  if (t === 'fml_izp' || /\bfml\b/.test(name)) return 'FML';
  if (/\bizp\b/.test(name)) return 'IZP';
  if (/\blab\b/.test(name) && /belast/.test(name)) return 'LAB';
  if (t === 'spreek_reportage' || /spreekuur|bedrijfsarts|ba[\s_-]?consult/.test(name)) return 'BA_CONSULT';
  if (t === 'cv' || /\bcv\b|curriculum/.test(name)) return 'CV';
  if (t === 'intakeformulier' || t === 'aanmeldformulier') return 'OVERIG';
  if (t === 'gespreksverslag' || t === 'gespreksverslag_vgr' || /gesprek/.test(name)) {
    return 'GESPREKSAANTEKENINGEN';
  }
  if (t === 'tp' || /^tp_/.test(t)) return 'TP';
  if (t === 'vgr') return 'VGR';

  // Filename / "extra" heuristics for pack-fine types
  if (/motivatiebrief|motivatie[\s_-]?brief/.test(name)) return 'MOTIVATIEBRIEF';
  if (/\b(e-?mail|outlook|mail)\b/.test(name) || name.endsWith('.eml') || name.endsWith('.msg')) return 'EMAIL';
  if (/werkboek|dagstructuur/.test(name)) return 'WERKBOEK';
  if (/sollicitatie(bewijs)?|bewijs[\s_-]?sollicitatie/.test(name)) return 'SOLLICITATIEBEWIJS';
  if (/persoonlijkheidstest|beroepskeuze|competentie|drijfveren|testresultaat|testrapport/.test(name)) {
    return 'TEST';
  }
  if (/actueel[\s_-]?oordeel/.test(name)) return 'ACTUEEL_OORDEEL';

  if (t === 'extra' || t === 'overig') return 'OVERIG';
  return 'ONBEKEND';
}

/** Preferred medical lead types for benutbare mogelijkheden (G4). */
export function isMedicalLeadDocType(docType: VgrDossierDocType): boolean {
  return docType === 'BA_CONSULT' || docType === 'FML' || docType === 'IZP' || docType === 'LAB' || docType === 'ACTUEEL_OORDEEL';
}
