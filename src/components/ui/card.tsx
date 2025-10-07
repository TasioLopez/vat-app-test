'use client';

import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export function Card({ 
  children, 
  className, 
  hover = false, 
  clickable = false,
  onClick 
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm',
        hover && 'hover:shadow-md transition-shadow',
        clickable && 'cursor-pointer hover:border-gray-300 dark:hover:border-gray-600',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn('text-lg font-semibold text-gray-900 dark:text-white', className)}>
      {children}
    </h3>
  );
}

interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className }: CardDescriptionProps) {
  return (
    <p className={cn('text-sm text-gray-600 dark:text-gray-400 mt-1', className)}>
      {children}
    </p>
  );
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('px-6 py-4', className)}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-200 dark:border-gray-700', className)}>
      {children}
    </div>
  );
}

// Stat Card for dashboard
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
    positive: boolean;
  };
  className?: string;
}

export function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend, 
  className 
}: StatCardProps) {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-white">
            {value}
          </p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span
                className={cn(
                  'text-sm font-medium',
                  trend.positive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                {trend.label}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="w-8 h-8 text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Feature Card
interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function FeatureCard({ 
  title, 
  description, 
  icon, 
  action, 
  className 
}: FeatureCardProps) {
  return (
    <Card className={cn('p-6 text-center', className)}>
      <div className="flex justify-center mb-4">
        <div className="w-12 h-12 text-blue-600 dark:text-blue-400">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {description}
      </p>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </Card>
  );
}