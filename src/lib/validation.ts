import { z } from 'zod';
import React from 'react';

// Common validation patterns
export const commonValidators = {
  email: z.string().email('Ongeldig e-mailadres'),
  phone: z.string().regex(/^[\+]?[1-9][\d]{0,15}$/, 'Ongeldig telefoonnummer'),
  uuid: z.string().uuid('Ongeldig ID formaat'),
  required: (message: string = 'Dit veld is verplicht') => z.string().min(1, message),
  minLength: (min: number, message?: string) => 
    z.string().min(min, message || `Minimaal ${min} karakters vereist`),
  maxLength: (max: number, message?: string) => 
    z.string().max(max, message || `Maximaal ${max} karakters toegestaan`),
  positiveNumber: (message: string = 'Moet een positief getal zijn') => 
    z.number().positive(message),
  url: z.string().url('Ongeldig URL formaat'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Ongeldige datum'),
  dutchPostalCode: z.string().regex(/^[1-9][0-9]{3}\s?[A-Z]{2}$/i, 'Ongeldige Nederlandse postcode'),
  dutchBSN: z.string().regex(/^[0-9]{9}$/, 'Ongeldig BSN (9 cijfers)'),
};

// Employee validation schemas
const employeeBasicSchema = z.object({
  first_name: commonValidators.required('Voornaam is verplicht')
    .and(commonValidators.maxLength(50, 'Voornaam mag maximaal 50 karakters zijn')),
  last_name: commonValidators.required('Achternaam is verplicht')
    .and(commonValidators.maxLength(50, 'Achternaam mag maximaal 50 karakters zijn')),
  email: commonValidators.email,
  client_id: commonValidators.uuid,
});

const employeeDetailsSchema = z.object({
  current_job: z.string().optional(),
  work_experience: z.string().optional(),
  education_level: z.string().optional(),
  computer_skills: z.string().optional(),
  drivers_license: z.boolean().optional(),
  transport_type: z.array(z.string()).optional(),
  contract_hours: z.number()
    .min(0, 'Contracturen mogen niet negatief zijn')
    .max(40, 'Contracturen mogen niet meer dan 40 zijn')
    .optional(),
  dutch_speaking: z.string().optional(),
  dutch_writing: z.string().optional(),
  dutch_reading: z.string().optional(),
});

export const employeeValidation = {
  basic: employeeBasicSchema,
  details: employeeDetailsSchema,
  complete: z.object({
    ...employeeBasicSchema.shape,
    ...employeeDetailsSchema.shape,
  }),
};

// Client validation
export const clientValidation = z.object({
  name: commonValidators.required('Bedrijfsnaam is verplicht')
    .and(commonValidators.maxLength(100, 'Bedrijfsnaam mag maximaal 100 karakters zijn')),
});

// User validation
const userBasicSchema = z.object({
  email: commonValidators.email,
  first_name: commonValidators.required('Voornaam is verplicht')
    .and(commonValidators.maxLength(50, 'Voornaam mag maximaal 50 karakters zijn')),
  last_name: commonValidators.required('Achternaam is verplicht')
    .and(commonValidators.maxLength(50, 'Achternaam mag maximaal 50 karakters zijn')),
  role: z.enum(['admin', 'standard'], {
    errorMap: () => ({ message: 'Rol moet admin of standard zijn' })
  }),
});

export const userValidation = {
  basic: userBasicSchema,

  withPassword: z.object({
    ...userBasicSchema.shape,
    password: commonValidators.minLength(8, 'Wachtwoord moet minimaal 8 karakters zijn'),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  }),
};

// Strong password validation
export const passwordValidation = {
  strong: z.string()
    .min(8, 'Wachtwoord moet minimaal 8 karakters bevatten')
    .regex(/[A-Z]/, 'Wachtwoord moet minimaal één hoofdletter bevatten')
    .regex(/[a-z]/, 'Wachtwoord moet minimaal één kleine letter bevatten')
    .regex(/[0-9]/, 'Wachtwoord moet minimaal één cijfer bevatten')
    .regex(/[^A-Za-z0-9]/, 'Wachtwoord moet minimaal één speciaal teken bevatten'),
  
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Huidig wachtwoord is verplicht'),
    newPassword: z.string()
      .min(8, 'Wachtwoord moet minimaal 8 karakters bevatten')
      .regex(/[A-Z]/, 'Wachtwoord moet minimaal één hoofdletter bevatten')
      .regex(/[a-z]/, 'Wachtwoord moet minimaal één kleine letter bevatten')
      .regex(/[0-9]/, 'Wachtwoord moet minimaal één cijfer bevatten')
      .regex(/[^A-Za-z0-9]/, 'Wachtwoord moet minimaal één speciaal teken bevatten'),
    confirmPassword: z.string()
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  }),

  resetPassword: z.object({
    newPassword: z.string()
      .min(8, 'Wachtwoord moet minimaal 8 karakters bevatten')
      .regex(/[A-Z]/, 'Wachtwoord moet minimaal één hoofdletter bevatten')
      .regex(/[a-z]/, 'Wachtwoord moet minimaal één kleine letter bevatten')
      .regex(/[0-9]/, 'Wachtwoord moet minimaal één cijfer bevatten')
      .regex(/[^A-Za-z0-9]/, 'Wachtwoord moet minimaal één speciaal teken bevatten'),
    confirmPassword: z.string()
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  })
};

// Authentication validation
export const authValidation = {
  login: z.object({
    email: commonValidators.email,
    password: commonValidators.minLength(6, 'Wachtwoord moet minimaal 6 karakters zijn'),
  }),

  signup: z.object({
    email: commonValidators.email,
    password: passwordValidation.strong,
    confirmPassword: z.string(),
    first_name: commonValidators.required('Voornaam is verplicht')
      .and(commonValidators.maxLength(50, 'Voornaam mag maximaal 50 karakters zijn')),
    last_name: commonValidators.required('Achternaam is verplicht')
      .and(commonValidators.maxLength(50, 'Achternaam mag maximaal 50 karakters zijn')),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Wachtwoorden komen niet overeen",
    path: ["confirmPassword"],
  }),

  forgotPassword: z.object({
    email: commonValidators.email,
  }),
};

// Document validation
export const documentValidation = z.object({
  file: z.instanceof(File, { message: 'Bestand is verplicht' })
    .refine((file) => file.size <= 10 * 1024 * 1024, 'Bestand mag maximaal 10MB zijn')
    .refine(
      (file) => ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type),
      'Alleen PDF en Word documenten zijn toegestaan'
    ),
  employee_id: commonValidators.uuid,
  type: commonValidators.required('Documenttype is verplicht'),
  name: commonValidators.required('Bestandsnaam is verplicht'),
});

// Search and filter validation
export const searchValidation = z.object({
  query: z.string().optional(),
  page: z.number().min(1, 'Pagina moet minimaal 1 zijn').optional(),
  limit: z.number().min(1, 'Limiet moet minimaal 1 zijn').max(100, 'Limiet mag maximaal 100 zijn').optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

// Validation helper functions
export function validateField<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  field?: string
): { success: boolean; error?: string; data?: T } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldError = field 
        ? error.errors.find(e => e.path[0] === field)
        : error.errors[0];
      
      return { 
        success: false, 
        error: fieldError?.message || 'Validatiefout' 
      };
    }
    return { success: false, error: 'Onbekende validatiefout' };
  }
}

export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: boolean; errors?: Record<string, string>; data?: T } {
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Record<string, string> = {};
      error.errors.forEach(err => {
        const field = err.path[0] as string;
        if (field) {
          errors[field] = err.message;
        }
      });
      return { success: false, errors };
    }
    return { success: false, errors: { general: 'Onbekende validatiefout' } };
  }
}

// Real-time validation hook
export function useFieldValidation<T>(
  schema: z.ZodSchema<T>,
  field: string,
  debounceMs: number = 300
) {
  const [error, setError] = React.useState<string | undefined>();
  const [isValidating, setIsValidating] = React.useState(false);

  const validate = React.useCallback(
    debounce((value: unknown) => {
      setIsValidating(true);
      const result = validateField(schema, value, field);
      setError(result.error);
      setIsValidating(false);
    }, debounceMs),
    [schema, field, debounceMs]
  );

  return { error, isValidating, validate };
}

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Type exports
export type EmployeeFormData = z.infer<typeof employeeValidation.complete>;
export type ClientFormData = z.infer<typeof clientValidation>;
export type UserFormData = z.infer<typeof userValidation.basic>;
export type UserWithPasswordFormData = z.infer<typeof userValidation.withPassword>;
export type LoginFormData = z.infer<typeof authValidation.login>;
export type SignupFormData = z.infer<typeof authValidation.signup>;
export type ForgotPasswordFormData = z.infer<typeof authValidation.forgotPassword>;
export type ChangePasswordFormData = z.infer<typeof passwordValidation.changePassword>;
export type ResetPasswordFormData = z.infer<typeof passwordValidation.resetPassword>;
export type DocumentFormData = z.infer<typeof documentValidation>;
export type SearchFormData = z.infer<typeof searchValidation>;
