import { z } from 'zod';

// Validation Schemas
export const employeeSchema = z.object({
  first_name: z.string().min(1, 'Voornaam is verplicht').max(50, 'Voornaam mag maximaal 50 karakters zijn'),
  last_name: z.string().min(1, 'Achternaam is verplicht').max(50, 'Achternaam mag maximaal 50 karakters zijn'),
  email: z.string().email('Ongeldig e-mailadres'),
  client_id: z.string().uuid('Ongeldig client ID'),
  current_job: z.string().optional(),
  work_experience: z.string().optional(),
  education_level: z.string().optional(),
  computer_skills: z.string().optional(),
  drivers_license: z.boolean().optional(),
  has_transport: z.boolean().optional(),
  contract_hours: z.number().min(0).max(40).optional(),
  dutch_speaking: z.string().optional(),
  dutch_writing: z.string().optional(),
  dutch_reading: z.string().optional(),
});

export const clientSchema = z.object({
  name: z.string().min(1, 'Bedrijfsnaam is verplicht').max(100, 'Bedrijfsnaam mag maximaal 100 karakters zijn'),
});

export const userSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  first_name: z.string().min(1, 'Voornaam is verplicht').max(50, 'Voornaam mag maximaal 50 karakters zijn'),
  last_name: z.string().min(1, 'Achternaam is verplicht').max(50, 'Achternaam mag maximaal 50 karakters zijn'),
  role: z.enum(['admin', 'standard'], {
    errorMap: () => ({ message: 'Rol moet admin of standard zijn' })
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(6, 'Wachtwoord moet minimaal 6 karakters zijn'),
});

export const signupSchema = z.object({
  email: z.string().email('Ongeldig e-mailadres'),
  password: z.string().min(8, 'Wachtwoord moet minimaal 8 karakters zijn'),
  confirmPassword: z.string(),
  first_name: z.string().min(1, 'Voornaam is verplicht').max(50, 'Voornaam mag maximaal 50 karakters zijn'),
  last_name: z.string().min(1, 'Achternaam is verplicht').max(50, 'Achternaam mag maximaal 50 karakters zijn'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Wachtwoorden komen niet overeen",
  path: ["confirmPassword"],
});

export const documentUploadSchema = z.object({
  file: z.instanceof(File, 'Bestand is verplicht'),
  employee_id: z.string().uuid('Ongeldig werknemer ID'),
  type: z.string().min(1, 'Documenttype is verplicht'),
  name: z.string().min(1, 'Bestandsnaam is verplicht'),
});

// Form State Types
export interface FormState<T> {
  data: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
}

export interface FormFieldState {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

// Form Hook Types
export interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface UseFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  isDirty: boolean;
  isValid: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setError: (field: keyof T, error: string) => void;
  clearError: (field: keyof T) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  reset: () => void;
  validate: () => boolean;
}

// Field Types
export type EmployeeFormData = z.infer<typeof employeeSchema>;
export type ClientFormData = z.infer<typeof clientSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type SignupFormData = z.infer<typeof signupSchema>;
export type DocumentUploadData = z.infer<typeof documentUploadSchema>;
