'use client';

import { useState, useCallback, useEffect } from 'react';
import { z } from 'zod';
import { useToastHelpers } from '@/components/ui/Toast';

interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: z.ZodSchema<T>;
  onSubmit: (data: T) => Promise<void> | void;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  showToastOnError?: boolean;
}

interface UseFormReturn<T> {
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
  validateField: (field: keyof T) => boolean;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
  validateOnChange = true,
  validateOnBlur = true,
  showToastOnError = true,
}: UseFormOptions<T>): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});

  const { showError } = useToastHelpers();

  const validateField = useCallback((field: keyof T): boolean => {
    if (!validationSchema) return true;

    try {
      const fieldSchema = validationSchema.shape?.[field as string];
      if (fieldSchema) {
        fieldSchema.parse(values[field]);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
        return true;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(e => e.path[0] === field);
        if (fieldError) {
          setErrors(prev => ({
            ...prev,
            [field]: fieldError.message,
          }));
          return false;
        }
      }
    }
    return true;
  }, [validationSchema, values]);

  const validate = useCallback((): boolean => {
    if (!validationSchema) return true;

    try {
      validationSchema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof T, string>> = {};
        error.errors.forEach(err => {
          const field = err.path[0] as keyof T;
          if (field) {
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
        return false;
      }
    }
    return true;
  }, [validationSchema, values]);

  const setValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);

    if (validateOnChange) {
      // Debounce validation
      setTimeout(() => validateField(field), 300);
    }
  }, [validateOnChange, validateField]);

  const setError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  }, []);

  const clearError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!validate()) {
      if (showToastOnError) {
        showError('Validatiefout', 'Controleer de ingevulde gegevens');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } catch (error) {
      console.error('Form submission error:', error);
      if (showToastOnError) {
        showError('Fout', 'Er is een fout opgetreden bij het opslaan');
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [validate, onSubmit, values, showToastOnError, showError]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsDirty(false);
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    if (validateOnBlur) {
      validateField(field);
    }
  }, [validateOnBlur, validateField]);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    isSubmitting,
    isDirty,
    isValid,
    setValue,
    setError,
    clearError,
    handleSubmit,
    reset,
    validate,
    validateField,
  };
}

// Field hook for individual form fields
export function useFormField<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  field: keyof T
) {
  const value = form.values[field];
  const error = form.errors[field];
  const touched = form.isDirty; // Simplified for now

  const setValue = useCallback((newValue: T[keyof T]) => {
    form.setValue(field, newValue);
  }, [form, field]);

  const handleBlur = useCallback(() => {
    form.validateField(field);
  }, [form, field]);

  return {
    value,
    error,
    touched,
    setValue,
    handleBlur,
  };
}
