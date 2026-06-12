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
import {
  addLayoutSection,
  removeLayoutSection,
  reorderLayoutSections,
  reorderSectionsById,
  resolveAddParentId,
  updateLayoutSection,
} from '@/lib/cv/layout-utils';
import { applyTemplateLayout } from '@/lib/cv/layout-presets';
import { getActiveCvModel } from '@/lib/cv/normalize';
import type {
  CvDocumentPayload,
  CvLayoutSection,
  CvLocale,
  CvModel,
  CvSectionLayout,
  CvSectionType,
  CvTemplateKey,
} from '@/types/cv';
import { emptyCvModel, newCvId } from '@/types/cv';
import { updateCvDocument } from '@/lib/cv/service';

export type CVContextValue = {
  employeeId: string;
  cvId: string;
  title: string;
  setTitle: (t: string) => void;
  templateKey: CvTemplateKey;
  setTemplateKey: (k: CvTemplateKey, options?: { resetLayout?: boolean }) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  payload: CvDocumentPayload;
  activeLocale: CvLocale;
  setActiveLocale: (locale: CvLocale) => void;
  cvData: CvModel;
  layout: CvLayoutSection[];
  updatePersonal: (patch: Partial<CvModel['personal']>) => void;
  setProfile: (v: string) => void;
  setExtra: (v: string) => void;
  setDigitalSkills: (v: string) => void;
  addExperience: () => void;
  updateExperience: (id: string, patch: Partial<CvModel['experience'][0]>) => void;
  removeExperience: (id: string) => void;
  reorderExperience: (fromIndex: number, toIndex: number) => void;
  addEducation: () => void;
  updateEducation: (id: string, patch: Partial<CvModel['education'][0]>) => void;
  removeEducation: (id: string) => void;
  reorderEducation: (fromIndex: number, toIndex: number) => void;
  addSkill: () => void;
  updateSkill: (id: string, text: string) => void;
  removeSkill: (id: string) => void;
  reorderSkills: (fromIndex: number, toIndex: number) => void;
  addLanguage: () => void;
  updateLanguage: (id: string, patch: Partial<CvModel['languages'][0]>) => void;
  removeLanguage: (id: string) => void;
  reorderLanguages: (fromIndex: number, toIndex: number) => void;
  addInterest: () => void;
  updateInterest: (id: string, text: string) => void;
  removeInterest: (id: string) => void;
  reorderInterests: (fromIndex: number, toIndex: number) => void;
  applyAiPayload: (partial: Partial<CvModel>, locale?: CvLocale) => void;
  setEnContent: (model: CvModel) => void;
  reorderLayoutSections: (parentId: string | null, fromIndex: number, toIndex: number) => void;
  reorderSectionsById: (activeId: string, overId: string) => void;
  addLayoutSection: (
    type: CvSectionType,
    sectionLayout: CvSectionLayout,
    parentId?: string | null
  ) => boolean;
  removeLayoutSection: (sectionId: string) => void;
  updateLayoutSection: (sectionId: string, patch: Partial<CvLayoutSection>) => void;
  photoDisplayUrl: string | null;
  updateOptions: (patch: Partial<NonNullable<CvModel['options']>>) => void;
  isDirty: boolean;
  markSaved: () => void;
  save: (options?: { version?: boolean }) => Promise<void>;
  saving: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  readOnly: boolean;
};

const Ctx = createContext<CVContextValue | undefined>(undefined);

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

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
  readOnly = false,
  printLocale,
}: {
  children: ReactNode;
  employeeId: string;
  cvId: string;
  initialTitle: string;
  initialTemplateKey: CvTemplateKey;
  initialAccentColor: string;
  initialPayload: CvDocumentPayload;
  initialUpdatedAt?: string | null;
  initialPhotoSignedUrl?: string | null;
  readOnly?: boolean;
  printLocale?: CvLocale;
}) {
  const [title, setTitleState] = useState(initialTitle);
  const [templateKey, setTemplateKeyState] = useState<CvTemplateKey>(initialTemplateKey);
  const [accentColor, setAccentColorState] = useState(initialAccentColor);
  const [payload, setPayloadInternal] = useState<CvDocumentPayload>(initialPayload);
  const [photoDisplayUrl, setPhotoDisplayUrl] = useState<string | null>(initialPhotoSignedUrl ?? null);
  const [isDirty, setIsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(initialUpdatedAt ?? null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeLocale = printLocale ?? payload.activeLocale;
  const cvData = useMemo(() => {
    if (printLocale === 'en' && payload.content.en) {
      return getActiveCvModel({ ...payload, activeLocale: 'en' });
    }
    if (printLocale === 'nl') {
      return getActiveCvModel({ ...payload, activeLocale: 'nl' });
    }
    return getActiveCvModel(payload);
  }, [payload, printLocale]);

  useEffect(() => {
    setTitleState(initialTitle);
    setTemplateKeyState(initialTemplateKey);
    setAccentColorState(initialAccentColor);
    setPayloadInternal(initialPayload);
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

  const updatePayload = useCallback(
    (up: (prev: CvDocumentPayload) => CvDocumentPayload) => {
      setPayloadInternal((prev) => {
        const next = up(prev);
        return next;
      });
      markDirty();
    },
    [markDirty]
  );

  const updateActiveModel = useCallback(
    (up: (prev: CvModel) => CvModel) => {
      updatePayload((prev) => {
        const locale = prev.activeLocale;
        const current = locale === 'en' && prev.content.en ? prev.content.en : prev.content.nl;
        const updated = up(current);
        if (locale === 'en') {
          return { ...prev, content: { ...prev.content, en: updated } };
        }
        return { ...prev, content: { ...prev.content, nl: updated } };
      });
    },
    [updatePayload]
  );

  const setTitle = useCallback(
    (t: string) => {
      setTitleState(t);
      markDirty();
    },
    [markDirty]
  );

  const setTemplateKey = useCallback(
    (k: CvTemplateKey, options?: { resetLayout?: boolean }) => {
      setTemplateKeyState(k);
      if (options?.resetLayout) {
        updatePayload((prev) => ({
          ...prev,
          layout: applyTemplateLayout(k, prev.layout),
        }));
      }
      markDirty();
    },
    [markDirty, updatePayload]
  );

  const setAccentColor = useCallback(
    (c: string) => {
      setAccentColorState(c);
      markDirty();
    },
    [markDirty]
  );

  const setActiveLocale = useCallback(
    (locale: CvLocale) => {
      updatePayload((prev) => {
        const next = { ...prev, activeLocale: locale };
        if (locale === 'en' && !prev.content.en) {
          next.content = { ...prev.content, en: emptyCvModel() };
        }
        return next;
      });
    },
    [updatePayload]
  );

  const updatePersonal = useCallback(
    (patch: Partial<CvModel['personal']>) => {
      updateActiveModel((prev) => ({ ...prev, personal: { ...prev.personal, ...patch } }));
    },
    [updateActiveModel]
  );

  const updateOptions = useCallback(
    (patch: Partial<NonNullable<CvModel['options']>>) => {
      updateActiveModel((prev) => ({
        ...prev,
        options: { ...(prev.options ?? {}), ...patch },
      }));
    },
    [updateActiveModel]
  );

  const setProfile = useCallback(
    (v: string) => updateActiveModel((prev) => ({ ...prev, profile: v })),
    [updateActiveModel]
  );

  const setExtra = useCallback(
    (v: string) => updateActiveModel((prev) => ({ ...prev, extra: v })),
    [updateActiveModel]
  );

  const setDigitalSkills = useCallback(
    (v: string) => updateActiveModel((prev) => ({ ...prev, digitalSkills: v })),
    [updateActiveModel]
  );

  const addExperience = useCallback(() => {
    updateActiveModel((prev) => ({
      ...prev,
      experience: [...prev.experience, { id: newCvId(), role: '', description: '' }],
    }));
  }, [updateActiveModel]);

  const updateExperience = useCallback(
    (id: string, patch: Partial<CvModel['experience'][0]>) => {
      updateActiveModel((prev) => ({
        ...prev,
        experience: prev.experience.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    [updateActiveModel]
  );

  const removeExperience = useCallback(
    (id: string) => {
      updateActiveModel((prev) => ({
        ...prev,
        experience: prev.experience.filter((x) => x.id !== id),
      }));
    },
    [updateActiveModel]
  );

  const reorderExperience = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateActiveModel((prev) => ({
        ...prev,
        experience: arrayMove(prev.experience, fromIndex, toIndex),
      }));
    },
    [updateActiveModel]
  );

  const addEducation = useCallback(() => {
    updateActiveModel((prev) => ({
      ...prev,
      education: [...prev.education, { id: newCvId(), institution: '' }],
    }));
  }, [updateActiveModel]);

  const updateEducation = useCallback(
    (id: string, patch: Partial<CvModel['education'][0]>) => {
      updateActiveModel((prev) => ({
        ...prev,
        education: prev.education.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    [updateActiveModel]
  );

  const removeEducation = useCallback(
    (id: string) => {
      updateActiveModel((prev) => ({
        ...prev,
        education: prev.education.filter((x) => x.id !== id),
      }));
    },
    [updateActiveModel]
  );

  const reorderEducation = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateActiveModel((prev) => ({
        ...prev,
        education: arrayMove(prev.education, fromIndex, toIndex),
      }));
    },
    [updateActiveModel]
  );

  const addSkill = useCallback(() => {
    updateActiveModel((prev) => ({
      ...prev,
      skills: [...prev.skills, { id: newCvId(), text: '' }],
    }));
  }, [updateActiveModel]);

  const updateSkill = useCallback(
    (id: string, text: string) => {
      updateActiveModel((prev) => ({
        ...prev,
        skills: prev.skills.map((x) => (x.id === id ? { ...x, text } : x)),
      }));
    },
    [updateActiveModel]
  );

  const removeSkill = useCallback(
    (id: string) => {
      updateActiveModel((prev) => ({
        ...prev,
        skills: prev.skills.filter((x) => x.id !== id),
      }));
    },
    [updateActiveModel]
  );

  const reorderSkills = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateActiveModel((prev) => ({
        ...prev,
        skills: arrayMove(prev.skills, fromIndex, toIndex),
      }));
    },
    [updateActiveModel]
  );

  const addLanguage = useCallback(() => {
    updateActiveModel((prev) => ({
      ...prev,
      languages: [...prev.languages, { id: newCvId(), language: '' }],
    }));
  }, [updateActiveModel]);

  const updateLanguage = useCallback(
    (id: string, patch: Partial<CvModel['languages'][0]>) => {
      updateActiveModel((prev) => ({
        ...prev,
        languages: prev.languages.map((x) => (x.id === id ? { ...x, ...patch } : x)),
      }));
    },
    [updateActiveModel]
  );

  const removeLanguage = useCallback(
    (id: string) => {
      updateActiveModel((prev) => ({
        ...prev,
        languages: prev.languages.filter((x) => x.id !== id),
      }));
    },
    [updateActiveModel]
  );

  const reorderLanguages = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateActiveModel((prev) => ({
        ...prev,
        languages: arrayMove(prev.languages, fromIndex, toIndex),
      }));
    },
    [updateActiveModel]
  );

  const addInterest = useCallback(() => {
    updateActiveModel((prev) => ({
      ...prev,
      interests: [...prev.interests, { id: newCvId(), text: '' }],
    }));
  }, [updateActiveModel]);

  const updateInterest = useCallback(
    (id: string, text: string) => {
      updateActiveModel((prev) => ({
        ...prev,
        interests: prev.interests.map((x) => (x.id === id ? { ...x, text } : x)),
      }));
    },
    [updateActiveModel]
  );

  const removeInterest = useCallback(
    (id: string) => {
      updateActiveModel((prev) => ({
        ...prev,
        interests: prev.interests.filter((x) => x.id !== id),
      }));
    },
    [updateActiveModel]
  );

  const reorderInterests = useCallback(
    (fromIndex: number, toIndex: number) => {
      updateActiveModel((prev) => ({
        ...prev,
        interests: arrayMove(prev.interests, fromIndex, toIndex),
      }));
    },
    [updateActiveModel]
  );

  const applyAiPayload = useCallback(
    (partial: Partial<CvModel>, locale?: CvLocale) => {
      updatePayload((prev) => {
        const loc = locale ?? prev.activeLocale;
        const current = loc === 'en' && prev.content.en ? prev.content.en : prev.content.nl;
        const merged: CvModel = {
          ...current,
          ...partial,
          personal: partial.personal ? { ...current.personal, ...partial.personal } : current.personal,
          options: partial.options ? { ...(current.options ?? {}), ...partial.options } : current.options,
          experience: partial.experience ?? current.experience,
          education: partial.education ?? current.education,
          skills: partial.skills ?? current.skills,
          languages: partial.languages ?? current.languages,
          interests: partial.interests ?? current.interests,
        };
        if (loc === 'en') {
          return { ...prev, content: { ...prev.content, en: merged } };
        }
        return { ...prev, content: { ...prev.content, nl: merged } };
      });
    },
    [updatePayload]
  );

  const setEnContent = useCallback(
    (model: CvModel) => {
      updatePayload((prev) => ({ ...prev, content: { ...prev.content, en: model } }));
    },
    [updatePayload]
  );

  const handleReorderLayoutSections = useCallback(
    (parentId: string | null, fromIndex: number, toIndex: number) => {
      updatePayload((prev) => ({
        ...prev,
        layout: reorderLayoutSections(prev.layout, parentId, fromIndex, toIndex),
      }));
    },
    [updatePayload]
  );

  const handleReorderSectionsById = useCallback(
    (activeId: string, overId: string) => {
      updatePayload((prev) => ({
        ...prev,
        layout: reorderSectionsById(prev.layout, activeId, overId),
      }));
    },
    [updatePayload]
  );

  const handleAddLayoutSection = useCallback(
    (type: CvSectionType, sectionLayout: CvSectionLayout, parentId?: string | null): boolean => {
      let success = false;
      updatePayload((prev) => {
        const targetParent =
          parentId === undefined ? resolveAddParentId(prev.layout, sectionLayout) : parentId;
        const storedLayout: CvSectionLayout =
          sectionLayout === 'sidebar' || sectionLayout === 'main' ? 'full' : sectionLayout;
        const result = addLayoutSection(prev.layout, targetParent, type, storedLayout);
        if (!result.ok) {
          return prev;
        }
        success = true;
        return { ...prev, layout: result.layout };
      });
      return success;
    },
    [updatePayload]
  );

  const handleRemoveLayoutSection = useCallback(
    (sectionId: string) => {
      updatePayload((prev) => ({
        ...prev,
        layout: removeLayoutSection(prev.layout, sectionId),
      }));
    },
    [updatePayload]
  );

  const handleUpdateLayoutSection = useCallback(
    (sectionId: string, patch: Partial<CvLayoutSection>) => {
      updatePayload((prev) => ({
        ...prev,
        layout: updateLayoutSection(prev.layout, sectionId, patch),
      }));
    },
    [updatePayload]
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
          payload_json: payload,
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
    [cvId, employeeId, title, templateKey, accentColor, payload, markSaved]
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
      payload,
      activeLocale,
      setActiveLocale,
      cvData,
      layout: payload.layout,
      updatePersonal,
      setProfile,
      setExtra,
      setDigitalSkills,
      addExperience,
      updateExperience,
      removeExperience,
      reorderExperience,
      addEducation,
      updateEducation,
      removeEducation,
      reorderEducation,
      addSkill,
      updateSkill,
      removeSkill,
      reorderSkills,
      addLanguage,
      updateLanguage,
      removeLanguage,
      reorderLanguages,
      addInterest,
      updateInterest,
      removeInterest,
      reorderInterests,
      applyAiPayload,
      setEnContent,
      reorderLayoutSections: handleReorderLayoutSections,
      reorderSectionsById: handleReorderSectionsById,
      addLayoutSection: handleAddLayoutSection,
      removeLayoutSection: handleRemoveLayoutSection,
      updateLayoutSection: handleUpdateLayoutSection,
      photoDisplayUrl,
      updateOptions,
      isDirty,
      markSaved,
      save,
      saving,
      lastSavedAt,
      saveError,
      readOnly,
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
      payload,
      activeLocale,
      setActiveLocale,
      cvData,
      updatePersonal,
      setProfile,
      setExtra,
      setDigitalSkills,
      addExperience,
      updateExperience,
      removeExperience,
      reorderExperience,
      addEducation,
      updateEducation,
      removeEducation,
      reorderEducation,
      addSkill,
      updateSkill,
      removeSkill,
      reorderSkills,
      addLanguage,
      updateLanguage,
      removeLanguage,
      reorderLanguages,
      addInterest,
      updateInterest,
      removeInterest,
      reorderInterests,
      applyAiPayload,
      setEnContent,
      handleReorderLayoutSections,
      handleReorderSectionsById,
      handleAddLayoutSection,
      handleRemoveLayoutSection,
      handleUpdateLayoutSection,
      photoDisplayUrl,
      updateOptions,
      isDirty,
      markSaved,
      save,
      saving,
      lastSavedAt,
      saveError,
      readOnly,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCV() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCV must be used within CVProvider');
  return v;
}
