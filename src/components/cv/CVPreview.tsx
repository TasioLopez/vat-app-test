'use client';

import { useCV } from '@/context/CVContext';
import ModernProfessional from '@/components/cv/templates/ModernProfessional';
import CreativeBold from '@/components/cv/templates/CreativeBold';

export default function CVPreview() {
  const { templateKey } = useCV();
  if (templateKey === 'creative_bold') {
    return <CreativeBold />;
  }
  return <ModernProfessional />;
}
