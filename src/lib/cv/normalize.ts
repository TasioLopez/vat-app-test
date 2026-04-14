import type { CvModel } from '@/types/cv';
import { emptyCvModel } from '@/types/cv';

/** Client/server safe normalization for JSON from DB */
export function normalizeCvPayload(raw: unknown): CvModel {
  if (!raw || typeof raw !== 'object') {
    return emptyCvModel();
  }
  const o = raw as Record<string, unknown>;
  const personal = o.personal && typeof o.personal === 'object' ? (o.personal as CvModel['personal']) : undefined;
  return {
    personal: {
      fullName: personal?.fullName ?? '',
      title: personal?.title ?? '',
      email: personal?.email ?? '',
      phone: personal?.phone ?? '',
      location: personal?.location ?? '',
      dateOfBirth: personal?.dateOfBirth,
      photoUrl: personal?.photoUrl,
    },
    profile: typeof o.profile === 'string' ? o.profile : '',
    experience: Array.isArray(o.experience) ? (o.experience as CvModel['experience']) : [],
    education: Array.isArray(o.education) ? (o.education as CvModel['education']) : [],
    skills: Array.isArray(o.skills) ? (o.skills as CvModel['skills']) : [],
    languages: Array.isArray(o.languages) ? (o.languages as CvModel['languages']) : [],
    interests: Array.isArray(o.interests) ? (o.interests as CvModel['interests']) : [],
    extra: typeof o.extra === 'string' ? o.extra : '',
  };
}
