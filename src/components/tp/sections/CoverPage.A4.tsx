// src/components/tp/sections/CoverPage.A4.tsx
import Image from "next/image";
import Cover from "@/assets/images/valentinez-cover.jpg";
import { TPData } from "@/lib/tp/load";

type Props = { data: TPData };

export default function CoverPageA4({ data }: Props) {
  console.log('🎨 CoverPageA4 received data:', {
    employee_name: data.employee_name,
    employer_name: data.employer_name,
    client_name: data.client_name,
    first_name: data.first_name,
    last_name: data.last_name,
    tp_creation_date: data.tp_creation_date,
    fullData: data
  });

  // Helper function to get employee name from various possible sources
  const getEmployeeName = (): string => {
    // First try the combined employee_name from context
    if (data.employee_name) {
      console.log('✅ Using employee_name:', data.employee_name);
      return data.employee_name;
    }
    
    // Then try first_name + last_name from database
    if (data.first_name && data.last_name) {
      const fullName = `${data.first_name} ${data.last_name}`;
      console.log('✅ Using first_name + last_name:', fullName);
      return fullName;
    }
    
    // Fallback to individual fields if only one exists
    if (data.first_name) {
      console.log('⚠️ Using only first_name:', data.first_name);
      return data.first_name;
    }
    if (data.last_name) {
      console.log('⚠️ Using only last_name:', data.last_name);
      return data.last_name;
    }
    
    console.log('❌ No employee name found, returning em dash');
    return "—";
  };

  // Helper function to get employer name from various possible sources
  const getEmployerName = (): string => {
    // Try client_name first (from database join)
    if (data.client_name) {
      console.log('✅ Using client_name:', data.client_name);
      return data.client_name;
    }
    
    // Then try employer_name (from context)
    if (data.employer_name) {
      console.log('✅ Using employer_name:', data.employer_name);
      return data.employer_name;
    }
    
    console.log('❌ No employer name found, returning em dash');
    return "—";
  };

  return (
    <div className="relative aspect-[210/297] h-full w-full bg-white shadow border border-gray-300 overflow-hidden print:shadow-none">
      {/* Top Banner */}
      <div className="flex h-[20%] z-20">
        <div className="w-full bg-gray-700 flex items-center pl-6 z-20 mt-10">
          <h1 className="text-white text-[28px] uppercase tracking-wider font-medium">
            TRAJECTPLAN 2e SPOOR
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <p className="text-xl font-semibold mt-6">
          {getEmployeeName()}
        </p>
        <p className="text-lg text-gray-700 mt-4">
          Rapportage datum: {formatDutchDate(data.tp_creation_date)}
        </p>
      </div>

      {/* Image */}
      <div className="w-full absolute bottom-[20%] right-0 z-10 flex justify-end">
        <Image
          src={Cover}
          alt="Valentinez Cover"
          className="w-4/5 h-auto"
          width={800}
          height={600}
          priority
        />
      </div>

      {/* Bottom-right employer block */}
      <div className="absolute bottom-0 right-0 w-[33%] h-full bg-[#660066] flex items-end justify-center z-0">
        <p className="text-white font-semibold text-[24px] mb-10">
          {getEmployerName()}
        </p>
      </div>
    </div>
  );
}

function formatDutchDate(dateStr?: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}