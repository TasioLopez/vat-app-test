// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  timestamp: string;
}

export interface APIErrorResponse {
  success: false;
  error: string;
  code?: string;
  timestamp: string;
}

// Employee Types
export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  client_id: string;
  created_at: string;
  updated_at: string;
}

export interface EmployeeDetails {
  employee_id: string;
  current_job?: string;
  work_experience?: string;
  education_level?: string;
  education_name?: string;
  computer_skills?: string;
  drivers_license?: boolean;
  drivers_license_type?: string;
  has_transport?: boolean;
  transport_type?: string;
  contract_hours?: number;
  dutch_speaking?: string;
  dutch_writing?: string;
  dutch_reading?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'standard';
  status: 'pending' | 'confirmed';
  created_at: string;
  updated_at: string;
}

// TP (Trajectplan) Types
export interface TPMeta {
  employee_id: string;
  tp_creation_date?: string;
  sociale_achtergrond?: string;
  visie_werknemer?: string;
  prognose_bedrijfsarts?: string;
  persoonlijk_profiel?: string;
  zoekprofiel?: string;
  advies_ad_passende_arbeid?: string;
  praktische_belemmeringen?: string;
  bijlage_fases?: Fase[];
  created_at: string;
  updated_at: string;
}

export interface Fase {
  title: string;
  periode: {
    from: string;
    to: string;
  };
  activiteiten: Activiteit[];
}

export interface Activiteit {
  name: string;
  status: 'P' | 'A' | 'C'; // Pending, Active, Completed
}

export interface TPActivity {
  id: string;
  name: string;
  description?: string;
  category?: string;
}

// Document Types
export interface Document {
  id: string;
  employee_id: string;
  type: string;
  name: string;
  url: string;
  uploaded_at: string;
  created_at: string;
}

// Form Types
export interface EmployeeFormData {
  first_name: string;
  last_name: string;
  email: string;
  client_id: string;
  current_job?: string;
  work_experience?: string;
  education_level?: string;
  education_name?: string;
  computer_skills?: string;
  drivers_license?: boolean;
  drivers_license_type?: string;
  has_transport?: boolean;
  transport_type?: string;
  contract_hours?: number;
  dutch_speaking?: string;
  dutch_writing?: string;
  dutch_reading?: string;
}

export interface ClientFormData {
  name: string;
}

export interface UserFormData {
  email: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'standard';
}

// Search and Filter Types
export interface SearchParams {
  query?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Component Props Types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
}

export interface TableProps<T> extends BaseComponentProps {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  onRowClick?: (item: T) => void;
  pagination?: PaginatedResponse<T>['pagination'];
  onPageChange?: (page: number) => void;
}

// Form Types
export interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio';
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  options?: { value: string; label: string }[];
  value?: any;
  onChange?: (value: any) => void;
}

// Navigation Types
export interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  children?: NavItem[];
}

// Theme Types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
    };
    fontWeight: {
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}
