'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import CoverPage from '@/components/tp/sections/CoverPage';
import EmployeeInfo from '@/components/tp/sections/EmployeeInfo';
import Section3 from '@/components/tp/sections/Section3';
import Bijlage from '@/components/tp/sections/Bijlage';
import FinalReview from '@/components/tp/sections/FinalReview';
import { TPProvider } from '@/context/TPContext';

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
      <div className="max-h-[70%]] flex flex-col overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold mb-2">Trajectplan Bouwer</h1>
          <h2 className="text-md font-semibold">Stap {currentStep} van {totalSteps}</h2>
        </div>

        <div className="flex-1 overflow-hidden">
          <SectionComponent employeeId={employeeId} />
        </div>

        <div className="flex justify-between pt-6 px-6">
          <button
            onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
            disabled={currentStep === 1}
            className="bg-gray-300 px-4 py-2 rounded disabled:opacity-50 hover:bg-gray-400 hover:cursor-pointer transition"
          >
            Terug
          </button>
          <button
            onClick={() => setCurrentStep((s) => Math.min(totalSteps, s + 1))}
            disabled={currentStep === totalSteps}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50 hover:bg-blue-700 hover:cursor-pointer transition"
          >
            Volgende
          </button>
        </div>
      </div>
    </TPProvider>
  );
}
