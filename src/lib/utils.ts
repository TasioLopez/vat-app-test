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
  if (gender === 'Male' || gender === 'Female') {
    const title = gender === 'Female' ? 'Mevrouw' : 'Meneer';
    const initial = firstName.charAt(0).toUpperCase();
    return `${title} ${initial}. ${lastName} (${firstName})`;
  }

  // Fallback to simple format if gender not specified
  return `${firstName} ${lastName}`;
}
