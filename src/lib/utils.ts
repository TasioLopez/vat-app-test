import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats employee name as "Title Initial. LastName (FirstName)"
 * e.g., "Mevrouw K. Baaijens (Kim)"
 * 
 * @param firstName - Employee's first name
 * @param lastName - Employee's last name
 * @param gender - Employee's gender ("Male" or "Female")
 * @returns Formatted name string
 */
export function formatEmployeeName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  gender: string | null | undefined
): string {
  // Return em dash if both names are missing
  if (!firstName && !lastName) {
    return "—";
  }

  // Return whatever we have if either name is missing
  if (!firstName || !lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }

  // If we have gender, format with title and initial
  // Support both Dutch (Man/Vrouw) and English (Male/Female) values
  const isFemale = gender === 'Female' || gender === 'Vrouw' || gender?.toLowerCase() === 'vrouw';
  const isMale = gender === 'Male' || gender === 'Man' || gender?.toLowerCase() === 'man';
  
  if (isFemale || isMale) {
    const title = isFemale ? 'Mevrouw' : 'Meneer';
    const initial = firstName.charAt(0).toUpperCase();
    return `${title} ${initial}. ${lastName} (${firstName})`;
  }

  // Fallback to simple format if gender not specified
  return `${firstName} ${lastName}`;
}

/**
 * Formats employee name without title prefix: "Initial. LastName (FirstName)"
 * e.g., "K. Baaijens (Kim)"
 * Used in EmployeeInfo section (Step 2) where title is not needed
 * 
 * @param firstName - Employee's first name
 * @param lastName - Employee's last name
 * @param gender - Employee's gender ("Male" or "Female")
 * @returns Formatted name string without title
 */
export function formatEmployeeNameWithoutPrefix(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  gender: string | null | undefined
): string {
  // Return em dash if both names are missing
  if (!firstName && !lastName) {
    return "—";
  }

  // Return whatever we have if either name is missing
  if (!firstName || !lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }

  // If we have gender, format with initial (no title)
  // Support both Dutch (Man/Vrouw) and English (Male/Female) values
  const isFemale = gender === 'Female' || gender === 'Vrouw' || gender?.toLowerCase() === 'vrouw';
  const isMale = gender === 'Male' || gender === 'Man' || gender?.toLowerCase() === 'man';
  
  if (isFemale || isMale) {
    const initial = firstName.charAt(0).toUpperCase();
    return `${initial}. ${lastName} (${firstName})`;
  }

  // Fallback to simple format if gender not specified
  return `${firstName} ${lastName}`;
}

/**
 * Formats work experience to extract only job titles/functions
 * Removes dates, years, and connecting words
 * 
 * @param text - Work experience text
 * @param onlyFunctions - If true, extract only job titles (default: true)
 * @returns Formatted work experience
 */
export function formatWorkExperience(
  text: string | null | undefined,
  onlyFunctions: boolean = true
): string {
  if (!text) return "—";

  if (!onlyFunctions) return text;

  // Remove common date patterns
  let cleaned = text
    // Remove "Sinds YYYY" patterns
    .replace(/sinds\s+\d{4}/gi, '')
    // Remove year ranges like "1995-2020" or "1995 - 2020"
    .replace(/\d{4}\s*-\s*\d{4}/g, '')
    // Remove standalone years
    .replace(/\b\d{4}\b/g, '')
    // Remove "vanaf" patterns
    .replace(/vanaf\s+\w+/gi, '')
    // Clean up "werkzaam bij [company] als"
    .replace(/werkzaam\s+bij\s+[\w\s]+\s+als/gi, '')
    // Remove "bij [company]"
    .replace(/bij\s+[\w\s]+(?=\s+als|\s*$)/gi, '')
    // Remove standalone "als"
    .replace(/\bals\b/gi, '')
    // Remove extra whitespace and punctuation
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim();

  return cleaned || "—";
}

/**
 * Formats education level with optional education name
 * 
 * @param level - Education level
 * @param name - Optional education/course name
 * @returns Formatted education string
 */
export function formatEducationLevel(
  level: string | null | undefined,
  name?: string | null | undefined
): string {
  if (!level) return name || "—";
  if (!name) return level;
  return `${level} (${name})`;
}

/**
 * Formats driver's license information
 * 
 * @param hasLicense - Boolean indicating if person has license
 * @param licenseType - Type of license (e.g., "B", "C")
 * @returns Formatted license string
 */
export function formatDriversLicense(
  hasLicense: boolean | null | undefined,
  licenseType?: string | null | undefined
): string {
  if (!hasLicense) return "Nee";
  const type = licenseType || "B";
  return `Ja (${type})`;
}

/**
 * Formats transportation/vehicle information
 * 
 * @param hasTransport - Boolean indicating if person has transport (deprecated, derive from transportType)
 * @param transportType - Array of transport types (e.g., ["Auto", "Fiets", "OV"])
 * @returns Formatted transport string
 */
export function formatTransportation(
  hasTransport: boolean | null | undefined,
  transportType?: string[] | string | null | undefined
): string {
  // Handle array (new format)
  if (Array.isArray(transportType)) {
    if (transportType.length === 0) return "Nee";
    return `Ja (${transportType.join(', ')})`;
  }
  
  // Handle string (legacy format - for backward compatibility)
  if (typeof transportType === 'string' && transportType.length > 0) {
    return `Ja (${transportType})`;
  }
  
  // Fallback to hasTransport boolean (legacy)
  if (hasTransport) {
    return "Ja (Auto)";
  }
  
  return "Nee";
}

/**
 * Formats computer skills level to descriptive text
 * 
 * @param skillLevel - Skill level (1-5 or string)
 * @returns Formatted skill description
 */
export function formatComputerSkills(
  skillLevel: string | number | null | undefined
): string {
  if (!skillLevel) return "—";
  
  const level = String(skillLevel);
  const skillMap: Record<string, string> = {
    '1': '1 - Geen',
    '2': '2 - Basis (e-mail, browsen)',
    '3': '3 - Gemiddeld (Word, Excel)',
    '4': '4 - Geavanceerd (meerdere programma\'s)',
    '5': '5 - Expert (IT-gerelateerde vaardigheden)'
  };

  return skillMap[level] || level;
}

/**
 * Filters out current employer from other employers list
 * 
 * @param otherEmployersText - Text containing list of other employers
 * @param currentEmployerName - Name of current employer to filter out
 * @returns Filtered list of other employers
 */
export function filterOtherEmployers(
  otherEmployersText: string | null | undefined,
  currentEmployerName: string | null | undefined
): string {
  if (!otherEmployersText) return "—";
  if (!currentEmployerName) return otherEmployersText;

  // Split by common delimiters
  const employers = otherEmployersText
    .split(/[,;\n]+/)
    .map(e => e.trim())
    .filter(e => e.length > 0);

  // Filter out current employer (case-insensitive)
  const filtered = employers.filter(
    employer => employer.toLowerCase() !== currentEmployerName.toLowerCase()
  );

  // Return filtered list or em dash if empty
  return filtered.length > 0 ? filtered.join(', ') : "—";
}
