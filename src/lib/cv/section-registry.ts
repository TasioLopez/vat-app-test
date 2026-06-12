import type { CvSectionLayout, CvSectionType } from '@/types/cv';

export type SectionRegistryEntry = {
  type: CvSectionType;
  singleton: boolean;
  allowedLayouts: CvSectionLayout[];
  sortableItems: boolean;
};

export const SECTION_REGISTRY: Record<CvSectionType, SectionRegistryEntry> = {
  personal_header: {
    type: 'personal_header',
    singleton: true,
    allowedLayouts: ['full', 'main', 'sidebar', 'half'],
    sortableItems: false,
  },
  contact: {
    type: 'contact',
    singleton: true,
    allowedLayouts: ['full', 'sidebar', 'half', 'main'],
    sortableItems: false,
  },
  photo: {
    type: 'photo',
    singleton: true,
    allowedLayouts: ['full', 'sidebar', 'half', 'main'],
    sortableItems: false,
  },
  profile: {
    type: 'profile',
    singleton: true,
    allowedLayouts: ['full', 'main', 'sidebar', 'half'],
    sortableItems: false,
  },
  experience: {
    type: 'experience',
    singleton: true,
    allowedLayouts: ['full', 'main', 'sidebar', 'half'],
    sortableItems: true,
  },
  education: {
    type: 'education',
    singleton: true,
    allowedLayouts: ['full', 'main', 'sidebar', 'half'],
    sortableItems: true,
  },
  skills: {
    type: 'skills',
    singleton: true,
    allowedLayouts: ['full', 'sidebar', 'half', 'main', 'grid_3'],
    sortableItems: true,
  },
  languages: {
    type: 'languages',
    singleton: true,
    allowedLayouts: ['full', 'sidebar', 'half', 'main', 'grid_3'],
    sortableItems: true,
  },
  interests: {
    type: 'interests',
    singleton: true,
    allowedLayouts: ['full', 'sidebar', 'half', 'main', 'grid_3'],
    sortableItems: true,
  },
  extra: {
    type: 'extra',
    singleton: true,
    allowedLayouts: ['full', 'main', 'sidebar', 'half'],
    sortableItems: false,
  },
  digital_skills: {
    type: 'digital_skills',
    singleton: true,
    allowedLayouts: ['full', 'sidebar', 'half', 'main', 'grid_3'],
    sortableItems: false,
  },
  custom_text: {
    type: 'custom_text',
    singleton: false,
    allowedLayouts: ['full', 'main', 'sidebar', 'half'],
    sortableItems: false,
  },
  custom_list: {
    type: 'custom_list',
    singleton: false,
    allowedLayouts: ['full', 'sidebar', 'half', 'main', 'grid_3'],
    sortableItems: true,
  },
};

export const ADDABLE_SECTION_TYPES: CvSectionType[] = [
  'profile',
  'experience',
  'education',
  'skills',
  'languages',
  'interests',
  'extra',
  'digital_skills',
  'contact',
  'custom_text',
  'custom_list',
];
