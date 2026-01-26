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
      <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-purple-50/20">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-3 pb-3 border-b border-purple-200/50 bg-white/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Trajectplan Bouwer</h1>
              <span className="text-sm text-gray-500">•</span>
              <p className="text-sm text-gray-600">Stap {currentStep} van {totalSteps}</p>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex gap-1.5 mt-2">
            {Array.from({ length: totalSteps }).map((_, index) => {
              const step = index + 1;
              const isActive = step === currentStep;
              const isCompleted = step < currentStep;
              return (
                <div
                  key={step}
                  className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-purple-700 shadow-sm shadow-purple-500/20'
                      : isCompleted
                      ? 'bg-purple-400'
                      : 'bg-gray-200'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Content Area - takes remaining space */}
        <div className="flex-1 overflow-hidden min-h-0">
          <div className="h-full overflow-y-auto p-6">
            <SectionComponent employeeId={employeeId} />
          </div>
        </div>

        {/* Footer with buttons - fixed at bottom */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-purple-200/50 bg-white/80 backdrop-blur-sm flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            size="lg"
          >
            Terug
          </Button>
          <Button
            onClick={() => setCurrentStep((s) => Math.min(totalSteps, s + 1))}
            disabled={currentStep === totalSteps}
            size="lg"
          >
            Volgende
          </Button>
        </div>
      </div>
    </TPProvider>
  );
}
