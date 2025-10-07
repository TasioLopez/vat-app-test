'use client';

import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';
import { Input } from './input';
import { Button } from './button';

export interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  searchable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  searchable = true,
  sortable = true,
  pagination,
  onRowClick,
  className,
  emptyMessage = 'Geen gegevens gevonden',
  searchPlaceholder = 'Zoeken...',
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm && searchable) {
      const searchableColumns = columns.filter(col => col.searchable !== false);
      filtered = data.filter(item =>
        searchableColumns.some(col => {
          const value = item[col.key];
          return value?.toString().toLowerCase().includes(searchTerm.toLowerCase());
        })
      );
    }

    // Apply sorting
    if (sortField && sortable) {
      filtered = [...filtered].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        
        if (aValue === bValue) return 0;
        
        const comparison = aValue < bValue ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, searchTerm, sortField, sortDirection, columns, searchable, sortable]);

  const handleSort = (field: keyof T) => {
    if (!sortable) return;
    
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof T) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Gegevens laden..." />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search */}
      {searchable && (
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider',
                    column.width && `w-${column.width}`,
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    sortable && column.sortable !== false && 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {sortable && column.sortable !== false && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {processedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              processedData.map((item, index) => (
                <tr
                  key={index}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render(item[column.key], item)
                        : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Pagina {pagination.page} van {totalPages} ({pagination.total} totaal)
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Vorige
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
            >
              Volgende
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
