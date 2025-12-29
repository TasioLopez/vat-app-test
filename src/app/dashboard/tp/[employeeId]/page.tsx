'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import CoverPage from '@/components/tp/sections/CoverPage';
import EmployeeInfo from '@/components/tp/sections/EmployeeInfo';
import Section3 from '@/components/tp/sections/Section3';
import Bijlage from '@/components/tp/sections/Bijlage';
import FinalReview from '@/components/tp/sections/FinalReview';
import { TPProvider } from '@/context/TPContext';
import { Button } from '@/components/ui/button';

const SECTIONS = [
  { id: 1, title: 'Voorblad (Cover Page)', component: CoverPage },
  { id: 2, title: 'Employee Information', component: EmployeeInfo },
  { id: 3, title: 'TP Part 3', component: Section3 },
  { id: 4, title: 'Bijlage 1', component: Bijlage },
  { id: 5, title: 'Final Review', component: FinalReview },
];

export default function TPBuilderPage() {
  const { employeeId } = useParams() as { employeeId: string };
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = SECTIONS.length;
  const SectionComponent = SECTIONS[currentStep - 1].component;

  return (
    <TPProvider>
      <div className="h-[calc(100vh-8rem)] flex flex-col overflow-hidden p-6">
        <div className="mb-4 flex-shrink-0">
          <h1 className="text-3xl font-bold text-foreground mb-2">Trajectplan Bouwer</h1>
          <h2 className="text-md font-semibold text-muted-foreground">Stap {currentStep} van {totalSteps}</h2>
        </div>

        <div className="flex-1 overflow-hidden min-h-0">
          <SectionComponent employeeId={employeeId} />
        </div>

        <div className="flex justify-between pt-6 border-t border-border flex-shrink-0">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
          >
            Terug
          </Button>
          <Button
            onClick={() => setCurrentStep((s) => Math.min(totalSteps, s + 1))}
            disabled={currentStep === totalSteps}
          >
            Volgende
          </Button>
        </div>
      </div>
    </TPProvider>
  );
}
