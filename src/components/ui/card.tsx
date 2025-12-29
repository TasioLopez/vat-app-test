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
        'rounded-xl border border-purple-200/50 bg-card text-card-foreground shadow-md transition-all duration-200',
        hover && 'hover:shadow-xl hover:shadow-purple-500/10',
        clickable && 'cursor-pointer hover:border-purple-300 hover:scale-[1.02] active:scale-[0.98]',
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
    <div className={cn('px-6 py-4 border-b border-border', className)}>
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
    <h3 className={cn('text-lg font-semibold text-card-foreground', className)}>
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
    <p className={cn('text-sm text-muted-foreground mt-1', className)}>
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
    <div className={cn('px-6 py-4 border-t border-border', className)}>
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
    <Card className={cn('p-6 hover:shadow-xl hover:shadow-purple-500/20 border-purple-200/50 bg-gradient-to-br from-white to-purple-50/30', className)} hover>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground mb-2">
            {title}
          </p>
          <p className="text-3xl font-bold text-purple-700 mt-1">
            {value}
          </p>
          {description && (
            <p className="text-sm text-muted-foreground mt-2">
              {description}
            </p>
          )}
          {trend && (
            <div className="flex items-center mt-3">
              <span
                className={cn(
                  'text-sm font-semibold',
                  trend.positive ? 'text-success-600' : 'text-error-600'
                )}
              >
                {trend.positive ? '+' : ''}{trend.value}%
              </span>
              <span className="text-sm text-muted-foreground ml-2">
                {trend.label}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
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
    <Card className={cn('p-6 text-center hover:shadow-xl hover:shadow-purple-500/20', className)} hover>
      <div className="flex justify-center mb-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
          {icon}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-card-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground mb-4">
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