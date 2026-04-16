'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { supabase } from '@/lib/supabase/client';
import type { CvModel, CvTemplateKey } from '@/types/cv';
import { newCvId } from '@/types/cv';
import { updateCvDocument } from '@/lib/cv/service';

export type CVContextValue = {
  employeeId: string;
  cvId: string;
  title: string;
  setTitle: (t: string) => void;
  templateKey: CvTemplateKey;
  setTemplateKey: (k: CvTemplateKey) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  cvData: CvModel;
  setCvData: React.Dispatch<React.SetStateAction<CvModel>>;
  updatePersonal: (patch: Partial<CvModel['personal']>) => void;
  setProfile: (v: string) => void;
  setExtra: (v: string) => void;
  /** List helpers */
  addExperience: () => void;
  updateExperience: (id: string, patch: Partial<CvModel['experience'][0]>) => void;
  removeExperience: (id: string) => void;
  addEducation: () => void;
  updateEducation: (id: string, patch: Partial<CvModel['education'][0]>) => void;
  removeEducation: (id: string) => void;
  addSkill: () => void;
  updateSkill: (id: string, text: string) => void;
  removeSkill: (id: string) => void;
  addLanguage: () => void;
  updateLanguage: (id: string, patch: Partial<CvModel['languages'][0]>) => void;
  removeLanguage: (id: string) => void;
  addInterest: () => void;
  updateInterest: (id: string, text: string) => void;
  removeInterest: (id: string) => void;
  applyAiPayload: (partial: Partial<CvModel>) => void;
  /** Signed read URL for personal.photoStoragePath (editor fetch or print bootstrap) */
  photoDisplayUrl: string | null;
  updateOptions: (patch: Partial<NonNullable<CvModel['options']>>) => void;
  isDirty: boolean;
  markSaved: () => void;
  save: (options?: { version?: boolean }) => Promise<void>;
  saving: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
};

const Ctx = createContext<CVContextValue | undefined>(undefined);

export function CVProvider({
  children,
  employeeId,
  cvId,
  initialTitle,
  initialTemplateKey,
  initialAccentColor,
  initialPayload,
  initialUpdatedAt,
  initialPhotoSignedUrl,
}: {
  children: ReactNode;
  employeeId: string;
  cvId: string;
  initialTitle: string;
  initialTemplateKey: CvTemplateKey;
  initialAccentColor: string;
  initialPayload: CvModel;
  initialUpdatedAt?: string | null;
  /** Server-signed URL for PDF/print; editor leaves undefined */
  initialPhotoSignedUrl?: string | null;
}) {
  const [title, setTitleState] = useState(initialTitle);
  const [templateKey, setTemplateKeyState] = useState<CvTemplateKey>(initialTemplateKey);
  const [accentColor, setAccentColorState] = useState(initialAccentColor);
  const [cvData, setCvDataInternal] = useState<CvModel>(initialPayload);
  const [photoDisplayUrl, setPhotoDisplayUrl] = useState<string | null>(initialPhotoSignedUrl ?? null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialUpdatedAt ?? null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setTitleState(initialTitle);
    setTemplateKeyState(initialTemplateKey);
    setAccentColorState(initialAccentColor);
    setCvDataInternal(initialPayload);
    setPhotoDisplayUrl(initialPhotoSignedUrl ?? null);
    setIsDirty(false);
    setLastSavedAt(initialUpdatedAt ?? null);
  }, [
    cvId,
    initialTitle,
    initialTemplateKey,
    initialAccentColor,
    initialPayload,
    initialUpdatedAt,
    initialPhotoSignedUrl,
  ]);

  useEffect(() => {
    if (initialPhotoSignedUrl) {
      setPhotoDisplayUrl(initialPhotoSignedUrl);
      return;
    }
    const path = cvData.personal.photoStoragePath?.trim();
    if (!path) {
      setPhotoDisplayUrl(null);
      return;
    }
    let cancelled = false;
    fetch(
      `/api/cv-photo/sign?employeeId=${encodeURIComponent(employeeId)}&cvId=${encodeURIComponent(cvId)}&path=${encodeURIComponent(path)}`
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('sign failed'))))
      .then((d: { signedUrl?: string }) => {
        if (!cancelled && d.signedUrl) setPhotoDisplayUrl(d.signedUrl);
      })
      .catch(() => {
        if (!cancelled) setPhotoDisplayUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, cvId, cvData.personal.photoStoragePath, initialPhotoSignedUrl]);

  const markDirty = useCallback(() => setIsDirty(true), []);
  const markSaved = useCallback(() => setIsDirty(false), []);

  const setCvData = useCallback(
    (up: React.SetStateAction<CvModel>) => {
      setCvDataInternal(up);
      markDirty();
    },
    [markDirty]
  );

  const setTitle = useCallback(
    (t: string) => {
      setTitleState(t);
      markDirty();
    },
    [markDirty]
  );

  const setTemplateKey = useCallback(
    (k: CvTemplateKey) => {
      setTemplateKeyState(k);
      markDirty();
    },
    [markDirty]
  );

  const setAccentColor = useCallback(
    (c: string) => {
      setAccentColorState(c);
      markDirty();
    },
    [markDirty]
  );

  const updatePersonal = useCallback(
    (patch: Partial<CvModel['personal']>) => {
      setCvDataInternal((prev) => ({ ...prev, personal: { ...prev.personal, ...patch } }));
      markDirty();
    },
    [markDirty]
  );

  const updateOptions = useCallback(
    (patch: Partial<NonNullable<CvModel['options']>>) => {
      setCvDataInternal((prev) => ({
        ...prev,
        options: { ...(prev.options ?? {}), ...patch },
      }));
      markDirty();
    },
    [markDirty]
  );

  const setProfile = useCallback(
    (v: string) => {
      setCvData((prev) => ({ ...prev, profile: v }));
    },
    [setCvData]
  );

  const setExtra = useCallback(
    (v: string) => {
      setCvData((prev) => ({ ...prev, extra: v }));
    },
    [setCvData]
  );

  const addExperience = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      experience: [...prev.experience, { id: newCvId(), role: '', description: '' }],
    }));
  }, [setCvData]);

  const updateExperience = useCallback(
    (id: string, patch: Partial<CvModel['experience'][0]>) => {
      setCvData((prev) => ({
        ...prev,
        experience: prev.experience.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    [setCvData]
  );

  const removeExperience = useCallback(
    (id: string) => {
      setCvData((prev) => ({ ...prev, experience: prev.experience.filter((x) => x.id !== id) }));
    },
    [setCvData]
  );

  const addEducation = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      education: [...prev.education, { id: newCvId(), institution: '' }],
    }));
  }, [setCvData]);

  const updateEducation = useCallback(
    (id: string, patch: Partial<CvModel['education'][0]>) => {
      setCvData((prev) => ({
        ...prev,
        education: prev.education.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    [setCvData]
  );

  const removeEducation = useCallback(
    (id: string) => {
      setCvData((prev) => ({ ...prev, education: prev.education.filter((x) => x.id !== id) }));
    },
    [setCvData]
  );

  const addSkill = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      skills: [...prev.skills, { id: newCvId(), text: '' }],
    }));
  }, [setCvData]);

  const updateSkill = useCallback(
    (id: string, text: string) => {
      setCvData((prev) => ({
        ...prev,
        skills: prev.skills.map((x) => (x.id === id ? { ...x, text } : x)),
      }));
    },
    [setCvData]
  );

  const removeSkill = useCallback(
    (id: string) => {
      setCvData((prev) => ({ ...prev, skills: prev.skills.filter((x) => x.id !== id) }));
    },
    [setCvData]
  );

  const addLanguage = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      languages: [...prev.languages, { id: newCvId(), language: '' }],
    }));
  }, [setCvData]);

  const updateLanguage = useCallback(
    (id: string, patch: Partial<CvModel['languages'][0]>) => {
      setCvData((prev) => ({
        ...prev,
        languages: prev.languages.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    [setCvData]
  );

  const removeLanguage = useCallback(
    (id: string) => {
      setCvData((prev) => ({ ...prev, languages: prev.languages.filter((x) => x.id !== id) }));
    },
    [setCvData]
  );

  const addInterest = useCallback(() => {
    setCvData((prev) => ({
      ...prev,
      interests: [...prev.interests, { id: newCvId(), text: '' }],
    }));
  }, [setCvData]);

  const updateInterest = useCallback(
    (id: string, text: string) => {
      setCvData((prev) => ({
        ...prev,
        interests: prev.interests.map((x) => (x.id === id ? { ...x, text } : x)),
      }));
    },
    [setCvData]
  );

  const removeInterest = useCallback(
    (id: string) => {
      setCvData((prev) => ({ ...prev, interests: prev.interests.filter((x) => x.id !== id) }));
    },
    [setCvData]
  );

  const applyAiPayload = useCallback(
    (partial: Partial<CvModel>) => {
      setCvData((prev) => ({
        ...prev,
        ...partial,
        personal: partial.personal ? { ...prev.personal, ...partial.personal } : prev.personal,
        options: partial.options ? { ...(prev.options ?? {}), ...partial.options } : prev.options,
        experience: partial.experience ?? prev.experience,
        education: partial.education ?? prev.education,
        skills: partial.skills ?? prev.skills,
        languages: partial.languages ?? prev.languages,
        interests: partial.interests ?? prev.interests,
      }));
    },
    [setCvData]
  );

  const save = useCallback(
    async (options?: { version?: boolean }) => {
      setSaving(true);
      setSaveError(null);
      try {
        const row = await updateCvDocument(supabase, cvId, employeeId, {
          title,
          template_key: templateKey,
          accent_color: accentColor,
          payload_json: cvData,
          saveVersion: options?.version ?? false,
        });
        markSaved();
        if (row?.updated_at) setLastSavedAt(row.updated_at as string);
      } catch (e: unknown) {
        setSaveError(e instanceof Error ? e.message : 'Opslaan mislukt');
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [cvId, employeeId, title, templateKey, accentColor, cvData, markSaved]
  );

  const value = useMemo(
    () => ({
      employeeId,
      cvId,
      title,
      setTitle,
      templateKey,
      setTemplateKey,
      accentColor,
      setAccentColor,
      cvData,
      setCvData,
      updatePersonal,
      setProfile,
      setExtra,
      addExperience,
      updateExperience,
      removeExperience,
      addEducation,
      updateEducation,
      removeEducation,
      addSkill,
      updateSkill,
      removeSkill,
      addLanguage,
      updateLanguage,
      removeLanguage,
      addInterest,
      updateInterest,
      removeInterest,
      applyAiPayload,
      photoDisplayUrl,
      updateOptions,
      isDirty,
      markSaved,
      save,
      saving,
      lastSavedAt,
      saveError,
    }),
    [
      employeeId,
      cvId,
      title,
      setTitle,
      templateKey,
      setTemplateKey,
      accentColor,
      setAccentColor,
      cvData,
      photoDisplayUrl,
      updatePersonal,
      updateOptions,
      setProfile,
      setExtra,
      addExperience,
      updateExperience,
      removeExperience,
      addEducation,
      updateEducation,
      removeEducation,
      addSkill,
      updateSkill,
      removeSkill,
      addLanguage,
      updateLanguage,
      removeLanguage,
      addInterest,
      updateInterest,
      removeInterest,
      applyAiPayload,
      photoDisplayUrl,
      updateOptions,
      isDirty,
      markSaved,
      save,
      saving,
      lastSavedAt,
      saveError,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCV() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCV must be used within CVProvider');
  return v;
}
