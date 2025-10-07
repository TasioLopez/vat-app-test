'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Label } from './label';
import { Input } from './input';
import { Textarea } from './textarea';

interface BaseFieldProps {
  label: string;
  name: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  helpText?: string;
}

interface InputFieldProps extends BaseFieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name'> {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search';
}

interface TextareaFieldProps extends BaseFieldProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'name'> {
  rows?: number;
}

interface SelectFieldProps extends BaseFieldProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'name'> {
  options: { value: string; label: string; disabled?: boolean }[];
  placeholder?: string;
}

interface CheckboxFieldProps extends BaseFieldProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'> {
  description?: string;
}

interface RadioGroupFieldProps extends BaseFieldProps {
  options: { value: string; label: string; description?: string }[];
  value?: string;
  onChange?: (value: string) => void;
}

// Input Field
export const InputField = forwardRef<HTMLInputElement, InputFieldProps>(
  ({ label, name, error, required, disabled, className, helpText, ...props }, ref) => {
    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={name} className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
          {label}
        </Label>
        <Input
          ref={ref}
          id={name}
          name={name}
          disabled={disabled}
          className={cn(
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
          )}
          {...props}
        />
        {helpText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
InputField.displayName = 'InputField';

// Textarea Field
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, name, error, required, disabled, className, helpText, rows = 4, ...props }, ref) => {
    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={name} className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
          {label}
        </Label>
        <Textarea
          ref={ref}
          id={name}
          name={name}
          disabled={disabled}
          rows={rows}
          className={cn(
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
          )}
          {...props}
        />
        {helpText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
TextareaField.displayName = 'TextareaField';

// Select Field
export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, name, error, required, disabled, className, helpText, options, placeholder, ...props }, ref) => {
    return (
      <div className={cn('space-y-2', className)}>
        <Label htmlFor={name} className={cn(required && 'after:content-["*"] after:ml-0.5 after:text-red-500')}>
          {label}
        </Label>
        <select
          ref={ref}
          id={name}
          name={name}
          disabled={disabled}
          className={cn(
            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
        {helpText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
SelectField.displayName = 'SelectField';

// Checkbox Field
export const CheckboxField = forwardRef<HTMLInputElement, CheckboxFieldProps>(
  ({ label, name, error, required, disabled, className, helpText, description, ...props }, ref) => {
    return (
      <div className={cn('space-y-2', className)}>
        <div className="flex items-start space-x-3">
          <input
            ref={ref}
            id={name}
            name={name}
            type="checkbox"
            disabled={disabled}
            className={cn(
              'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500',
              error && 'border-red-500 focus:ring-red-500',
              disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
            )}
            {...props}
          />
          <div className="flex-1">
            <Label
              htmlFor={name}
              className={cn(
                'text-sm font-medium leading-5',
                required && 'after:content-["*"] after:ml-0.5 after:text-red-500',
                disabled && 'text-gray-500 cursor-not-allowed'
              )}
            >
              {label}
            </Label>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {description}
              </p>
            )}
          </div>
        </div>
        {helpText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
CheckboxField.displayName = 'CheckboxField';

// Radio Group Field
export const RadioGroupField = forwardRef<HTMLInputElement, RadioGroupFieldProps>(
  ({ label, name, error, required, disabled, className, helpText, options, value, onChange, ...props }, ref) => {
    return (
      <div className={cn('space-y-2', className)}>
        <fieldset>
          <legend className={cn(
            'text-sm font-medium leading-5',
            required && 'after:content-["*"] after:ml-0.5 after:text-red-500',
            disabled && 'text-gray-500 cursor-not-allowed'
          )}>
            {label}
          </legend>
          <div className="mt-2 space-y-2">
            {options.map((option) => (
              <div key={option.value} className="flex items-start space-x-3">
                <input
                  ref={ref}
                  id={`${name}-${option.value}`}
                  name={name}
                  type="radio"
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onChange?.(e.target.value)}
                  disabled={disabled}
                  className={cn(
                    'h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500',
                    error && 'border-red-500 focus:ring-red-500',
                    disabled && 'bg-gray-50 text-gray-500 cursor-not-allowed'
                  )}
                  {...props}
                />
                <div className="flex-1">
                  <Label
                    htmlFor={`${name}-${option.value}`}
                    className={cn(
                      'text-sm font-medium leading-5',
                      disabled && 'text-gray-500 cursor-not-allowed'
                    )}
                  >
                    {option.label}
                  </Label>
                  {option.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {option.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </fieldset>
        {helpText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{helpText}</p>
        )}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }
);
RadioGroupField.displayName = 'RadioGroupField';
