// src/components/tp/sections/CoverPage.A4.tsx
import Image from "next/image";
import Cover from "@/assets/images/valentinez-cover.jpg";
import { TPData } from "@/lib/tp/load";
import { formatEmployeeName } from "@/lib/utils";

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
    // Use formatEmployeeName utility for consistent formatting
    const formattedName = formatEmployeeName(
      data.first_name,
      data.last_name,
      data.gender
    );
    
    console.log('✅ Using formatted name:', formattedName);
    return formattedName;
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
    <div className="relative aspect-[210/297] h-full w-full bg-white shadow border border-border overflow-hidden print:shadow-none">
      {/* Top Banner */}
      <div className="flex h-[20%] z-20">
        <div className="w-full bg-primary flex items-center pl-6 z-20 mt-10">
          <h1 className="text-white text-[28px] uppercase tracking-wider font-medium">
            TRAJECTPLAN 2ᵉ SPOOR
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="p-6">
        <p className="text-xl font-semibold mt-6">
          {getEmployeeName()}
        </p>
        <p className="text-lg text-muted-foreground mt-4">
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
      <div className="absolute bottom-0 right-0 w-[33%] h-full bg-accent flex items-end justify-center z-0">
        <p className="text-white font-semibold text-[24px] mb-16">
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