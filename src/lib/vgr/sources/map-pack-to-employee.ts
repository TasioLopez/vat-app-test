import type { VgrDossierDocType } from '@/lib/vgr/dossier/types';
import type { EmployeeDocType } from '@/lib/documents/employee-doc-types';

/**
 * Map pack DocumentType → app `documents.type` slot for storage / Bronnen UI.
 * Fine pack types without a dedicated slot land in `extra`.
 */
export function mapPackDocTypeToEmployee(docType: VgrDossierDocType): EmployeeDocType {
  switch (docType) {
    case 'AD':
      return 'ad_rapportage';
    case 'FML':
    case 'IZP':
    case 'LAB':
      return 'fml_izp';
    case 'BA_CONSULT':
    case 'ACTUEEL_OORDEEL':
      return 'spreek_reportage';
    case 'CV':
      return 'cv';
    case 'GESPREKSAANTEKENINGEN':
      return 'gespreksverslag_vgr';
    case 'TP':
    case 'VGR':
    case 'VGR_BIJLAGE_1':
    case 'VGR_BIJLAGE_2':
    case 'TEST':
    case 'WERKBOEK':
    case 'EMAIL':
    case 'MOTIVATIEBRIEF':
    case 'SOLLICITATIEBEWIJS':
    case 'OVERIG':
    case 'ONBEKEND':
    default:
      return 'extra';
  }
}
