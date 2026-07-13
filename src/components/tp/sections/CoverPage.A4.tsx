// src/components/tp/sections/CoverPage.A4.tsx
import Image from "next/image";
import Cover from "@/assets/images/valentinez-cover.jpg";
import { TPData } from "@/lib/tp/load";
import { formatEmployeeName } from "@/lib/utils";
import { getWerkgeverName } from "@/lib/tp/resolve-profile-context";

type Props = { data: TPData };

export default function CoverPageA4({ data }: Props) {
  const getEmployeeName = (): string => {
    return formatEmployeeName(
      data.first_name,
      data.last_name,
      data.gender
    );
  };

  const employerName = getWerkgeverName(data) || "—";

  return (
    <div className="relative aspect-[210/297] h-full w-full bg-white shadow border border-border overflow-hidden print:shadow-none">
      {/* Top Banner */}
      <div className="flex h-[20%] z-20">
        <div className="w-full bg-gray-700 flex items-center pl-6 z-20 mt-10">
          <h1 className="text-white text-[28px] uppercase tracking-wider font-medium">
            TRAJECTPLAN 2ᵉ SPOOR
          </h1>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 pt-8">
        <p className="text-xl font-semibold mt-8">
          {getEmployeeName()}
        </p>
        <p className="text-lg text-muted-foreground mt-4">
          Rapportage datum: {formatDutchDate(data.tp_creation_date)}
        </p>
      </div>

      {/* Image */}
      <div className="w-full absolute bottom-[22%] right-0 z-10 flex justify-end">
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
      <div className="absolute bottom-0 right-0 w-[33%] h-full bg-[#660066ff] flex items-end justify-center z-0">
        <p className="text-white font-semibold text-[24px] mb-12">
          {employerName}
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