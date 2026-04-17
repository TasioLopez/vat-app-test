'use client';

import { useCV } from '@/context/CVContext';
import ModernProfessional from '@/components/cv/templates/ModernProfessional';
import CreativeBold from '@/components/cv/templates/CreativeBold';
import CorporateMinimal from '@/components/cv/templates/CorporateMinimal';
import LinearTimeline from '@/components/cv/templates/LinearTimeline';
import BalancedSplit from '@/components/cv/templates/BalancedSplit';

export default function CVPreview() {
  const { templateKey } = useCV();
  if (templateKey === 'creative_bold') {
    return <CreativeBold />;
  }
  if (templateKey === 'corporate_minimal') {
    return <CorporateMinimal />;
  }
  if (templateKey === 'linear_timeline') {
    return <LinearTimeline />;
  }
  if (templateKey === 'balanced_split') {
    return <BalancedSplit />;
  }
  return <ModernProfessional />;
}
