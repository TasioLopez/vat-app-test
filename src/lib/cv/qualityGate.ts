import type { CvModel } from '@/types/cv';
import type { CvFacts } from '@/lib/cv/facts';

export type CvQualityReport = {
  pass: boolean;
  deficits: string[];
  metrics: {
    profileLength: number;
    experienceCount: number;
    educationCount: number;
    skillsCount: number;
    interestsCount: number;
    experienceDescriptionsLongEnough: number;
    sparseSections: number;
  };
};

function hasUsefulEvidence(facts: CvFacts): boolean {
  return (
    facts.experienceFacts.length > 0 ||
    facts.educationFacts.length > 0 ||
    facts.skills.length > 0 ||
    facts.interestsHints.length > 0 ||
    facts.profileHints.length > 0
  );
}

export function evaluateCvQuality(cv: CvModel, facts: CvFacts): CvQualityReport {
  const deficits: string[] = [];
  const profileLength = cv.profile.trim().length;
  const experienceCount = cv.experience.length;
  const educationCount = cv.education.length;
  const skillsCount = cv.skills.filter((s) => s.text.trim().length > 0).length;
  const interestsCount = cv.interests.filter((i) => i.text.trim().length > 0).length;
  const experienceDescriptionsLongEnough = cv.experience.filter(
    (e) => (e.description || '').trim().length >= 80
  ).length;

  const sectionsSparse = [
    profileLength < 220,
    experienceCount === 0,
    educationCount === 0,
    skillsCount < 5,
    interestsCount < 3 && facts.interestsHints.length > 0,
  ].filter(Boolean).length;

  if (profileLength < 220) {
    deficits.push('Profiel is te kort; maak dit inhoudelijker (minimaal ongeveer 4 zinnen).');
  }

  const minExperience = facts.experienceFacts.length >= 2 ? 2 : facts.experienceFacts.length >= 1 ? 1 : 0;
  if (experienceCount < minExperience) {
    deficits.push(
      `Werkervaring bevat te weinig items (${experienceCount}/${minExperience}); gebruik beschikbare feiten beter.`
    );
  }
  if (experienceCount > 0 && experienceDescriptionsLongEnough < Math.min(experienceCount, 2)) {
    deficits.push('Werkervaring-beschrijvingen zijn te dun; voeg concrete taken/context/resultaat toe.');
  }

  const minEducation = facts.educationFacts.length > 0 ? 1 : 0;
  if (educationCount < minEducation) {
    deficits.push('Opleiding mist ondanks aanwezige opleidingsfeiten.');
  }

  if (skillsCount < 5 && hasUsefulEvidence(facts)) {
    deficits.push('Vaardighedenlijst is te kort; vul met relevante, concrete vaardigheden.');
  }

  if (facts.interestsHints.length > 0 && interestsCount < 3) {
    deficits.push('Interesses zijn onvoldoende ingevuld terwijl er aanwijzingen in documenten staan.');
  }

  if (cv.extra.trim().length < 50 && (facts.mobility.driversLicense || facts.mobility.contractHours)) {
    deficits.push('Overig is te kort; verwerk inzetbaarheid, rijbewijs/vervoer en contracturen compacter.');
  }

  if (sectionsSparse >= 3 && hasUsefulEvidence(facts)) {
    deficits.push('Te veel secties zijn nog te leeg voor een overtuigend CV.');
  }

  return {
    pass: deficits.length === 0,
    deficits,
    metrics: {
      profileLength,
      experienceCount,
      educationCount,
      skillsCount,
      interestsCount,
      experienceDescriptionsLongEnough,
      sparseSections: sectionsSparse,
    },
  };
}
