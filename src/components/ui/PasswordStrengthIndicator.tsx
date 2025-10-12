"use client";

import React from 'react';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

interface PasswordStrengthIndicatorProps {
  password: string;
  show?: boolean;
}

export default function PasswordStrengthIndicator({ password, show = true }: PasswordStrengthIndicatorProps) {
  if (!show || !password) return null;

  const requirements: PasswordRequirement[] = [
    {
      label: 'Minimaal 8 karakters',
      met: password.length >= 8
    },
    {
      label: 'Minimaal één hoofdletter (A-Z)',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'Minimaal één kleine letter (a-z)',
      met: /[a-z]/.test(password)
    },
    {
      label: 'Minimaal één cijfer (0-9)',
      met: /[0-9]/.test(password)
    },
    {
      label: 'Minimaal één speciaal teken (!@#$%^&*)',
      met: /[^A-Za-z0-9]/.test(password)
    }
  ];

  const metCount = requirements.filter(req => req.met).length;
  const strengthLevel = metCount === 0 ? 'none' : 
                       metCount <= 2 ? 'weak' : 
                       metCount <= 3 ? 'medium' : 
                       metCount <= 4 ? 'strong' : 'very-strong';

  const getStrengthColor = (level: string) => {
    switch (level) {
      case 'weak': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'strong': return 'text-blue-600';
      case 'very-strong': return 'text-green-600';
      default: return 'text-gray-400';
    }
  };

  const getStrengthText = (level: string) => {
    switch (level) {
      case 'weak': return 'Zwak';
      case 'medium': return 'Matig';
      case 'strong': return 'Sterk';
      case 'very-strong': return 'Zeer sterk';
      default: return '';
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {/* Strength indicator */}
      {password.length > 0 && (
        <div className="flex items-center space-x-2">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                strengthLevel === 'weak' ? 'bg-red-500 w-1/5' :
                strengthLevel === 'medium' ? 'bg-yellow-500 w-2/5' :
                strengthLevel === 'strong' ? 'bg-blue-500 w-3/5' :
                strengthLevel === 'very-strong' ? 'bg-green-500 w-full' :
                'bg-gray-300 w-0'
              }`}
            />
          </div>
          {strengthLevel !== 'none' && (
            <span className={`text-sm font-medium ${getStrengthColor(strengthLevel)}`}>
              {getStrengthText(strengthLevel)}
            </span>
          )}
        </div>
      )}

      {/* Requirements checklist */}
      <div className="space-y-1">
        {requirements.map((requirement, index) => (
          <div key={index} className="flex items-center space-x-2 text-sm">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
              requirement.met ? 'bg-green-500' : 'bg-gray-300'
            }`}>
              {requirement.met && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={requirement.met ? 'text-green-700' : 'text-gray-500'}>
              {requirement.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
