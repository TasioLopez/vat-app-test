'use client';

import { useCV } from '@/context/CVContext';
import ModernProfessional from '@/components/cv/templates/ModernProfessional';
import CreativeBold from '@/components/cv/templates/CreativeBold';
import CorporateMinimal from '@/components/cv/templates/CorporateMinimal';

export default function CVPreview() {
  const { templateKey } = useCV();
  if (templateKey === 'creative_bold') {
    return <CreativeBold />;
  }
  if (templateKey === 'corporate_minimal') {
    return <CorporateMinimal />;
  }
  return <ModernProfessional />;
}
