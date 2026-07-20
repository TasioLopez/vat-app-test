'use client';

import { useState, useEffect, use, useMemo, useRef, useCallback } from 'react';
import { useGuardedRouter } from '@/hooks/useGuardedRouter';
import EmployeeUnsavedGuard from '@/components/employee/EmployeeUnsavedGuard';
import { createBrowserClient } from '@/lib/supabase/client';
import {
    Map,
    Compass,
    Sparkles,
    Save,
    ArrowLeft,
    Briefcase,
    GraduationCap,
    Car,
    Languages,
    Computer,
    Clock,
    Building2,
    FileText,
    FolderOpen,
    Files,
    IdCard,
    CheckCircle2,
    CircleDashed,
} from 'lucide-react';
import DocumentModal from '@/components/DocumentModal';
import { useToastHelpers } from '@/components/ui/Toast';
import { parseWorkExperience, cn, isAbsentText, normalizePersonName } from '@/lib/utils';
import { SELECT_CLASS } from '@/lib/select-class';
import { normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trackAccess } from '@/lib/tracking';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    AutofillProgressOverlay,
    type AutofillProgressState,
} from '@/components/ui/AutofillProgressOverlay';
import { buildEmployeeAutofillSteps } from '@/lib/autofill-progress';
import { getAutofillDetailsPayload, readAutofillResponse } from '@/lib/autofill-response';
import { isAutofillAbortError } from '@/lib/tp2026/autofill-runner';
import {
    applyEmployeeAutofillDetails,
    listAutofilledEmployeeDetailKeys,
    normalizeEmployeeDetailsPayload,
    processEmployeeAutofillRawDetails,
} from '@/lib/employee/autofill-persist';
import {
  EMPLOYEE_DETAIL_FIELD_KEYS,
  computeEmployeeFieldHash,
  getEmployeeFieldDisplayStatus,
  normalizeEmployeeFieldContentHash,
  normalizeEmployeeFieldReviewStatus,
  type EmployeeDetailFieldKey,
  type EmployeeFieldReviewStatus,
} from '@/lib/employee/field-review';
import {
    EDUCATION_LEVEL_OPTIONS,
    TRANSPORT_TYPE_OPTIONS,
    normalizeEducationLevel,
    repairEmployeeEducationFields,
} from '@/lib/tp2026/gegevens-field-options';
import { FieldValidateButton } from '@/components/employee/FieldValidateButton';
import { ValidatableField } from '@/components/employee/ValidatableField';
import {
    EMPLOYEE_DOC_TYPES,
    EMPLOYEE_DOC_LABELS,
    type EmployeeDocType,
} from '@/lib/documents/employee-doc-types';

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    client_id: string;
    referent_id?: string | null;
};

type EditableEmployeePayload = Pick<Employee, 'first_name' | 'last_name' | 'email' | 'client_id' | 'referent_id'>;

type Referent = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    referent_function: string | null;
    phone?: string | null;
    email?: string | null;
    gender?: string | null;
};

type EmployeeDetails = {
    employee_id: string;
    gender?: string;
    phone?: string;
    date_of_birth?: string;
    current_job?: string;
    work_experience?: string;
    education_level?: string;
    education_name?: string;
    drivers_license?: boolean;
    drivers_license_type?: string[] | null;
    transport_type?: string[] | null;
    dutch_speaking?: string;
    dutch_writing?: string;
    dutch_reading?: string;
    has_computer?: boolean;
    computer_skills?: string;
    contract_hours?: number;
    other_employers?: string;
    autofilled_fields?: string[];
    field_review_status?: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>> | null;
    field_content_hash?: Partial<Record<EmployeeDetailFieldKey, string>> | null;
};

type Client = {
    id: string;
    name: string;
};

type Document = {
    employee_id: string | null;
    id: string;
    layout_key: string | null;
    name: string | null;
    type: string | null;
    tp_export_id: string | null;
    tp_instance_id: string | null;
    vgr_export_id: string | null;
    vgr_instance_id: string | null;
    uploaded_at: string | null;
    url: string;
};

const DOC_TYPES = [...EMPLOYEE_DOC_TYPES] as EmployeeDocType[];
const DOC_LABELS = EMPLOYEE_DOC_LABELS;

const EMPLOYEE_DETAILS_FIELD_KEYS: (keyof EmployeeDetails)[] = [
    'gender',
    'phone',
    'date_of_birth',
    'current_job',
    'work_experience',
    'education_level',
    'education_name',
    'drivers_license',
    'drivers_license_type',
    'transport_type',
    'dutch_speaking',
    'dutch_writing',
    'dutch_reading',
    'has_computer',
    'computer_skills',
    'contract_hours',
    'other_employers',
    'autofilled_fields',
  'field_review_status',
  'field_content_hash',
];

const EDITABLE_EMPLOYEE_FIELD_KEYS: (keyof EditableEmployeePayload)[] = [
    'first_name',
    'last_name',
    'email',
    'client_id',
    'referent_id',
];

function normalizeStringArray(value: unknown): string[] | null {
    if (!value) return null;
    if (Array.isArray(value)) {
        const clean = value
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim());
        return clean.length > 0 ? [...clean].sort() : null;
    }
    if (typeof value === 'string' && value.trim()) {
        return [value.trim()];
    }
    return null;
}

function toEditableEmployeePayload(employee: Employee): EditableEmployeePayload {
    const filtered = Object.fromEntries(
        EDITABLE_EMPLOYEE_FIELD_KEYS.map((key) => [key, employee[key] ?? null])
    ) as EditableEmployeePayload;
    return {
        ...filtered,
        first_name: normalizePersonName(filtered.first_name) ?? '',
        last_name: normalizePersonName(filtered.last_name) ?? '',
    };
}

function toEmployeeDetailsPayload(
    details: Partial<EmployeeDetails> | null | undefined,
    employeeId: string
): EmployeeDetails {
    const filtered = Object.fromEntries(
        EMPLOYEE_DETAILS_FIELD_KEYS
            .map((key) => [key, details?.[key]])
            .filter(([, value]) => value !== undefined)
    ) as Partial<EmployeeDetails>;

    return {
        employee_id: employeeId,
        ...filtered,
    };
}

function toNormalizedDetailsPayload(
    details: Partial<EmployeeDetails> | null | undefined,
    employeeId: string
): EmployeeDetails {
    const normalizedWorkExperience = details?.work_experience
        ? parseWorkExperience(details.work_experience)
        : details?.work_experience;

    const normalizedDetails: Partial<EmployeeDetails> = {
        ...details,
        phone: normalizePhoneForStorage(details?.phone) ?? details?.phone,
        work_experience: normalizedWorkExperience,
        transport_type: normalizeStringArray(details?.transport_type),
        drivers_license_type: normalizeStringArray(details?.drivers_license_type),
    };

    return toEmployeeDetailsPayload(normalizedDetails, employeeId);
}

function arePayloadsEqual<T>(left: T | null, right: T | null): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: employeeId } = use(params);
    const guardedRouter = useGuardedRouter();
    const { showSuccess, showError, showInfo } = useToastHelpers();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [clientName, setClientName] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('');
    const [updating, setUpdating] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiCancelling, setAiCancelling] = useState(false);
    const aiCancelRef = useRef(false);
    const aiAbortRef = useRef<AbortController | null>(null);
    const [autofillProgress, setAutofillProgress] = useState<AutofillProgressState | null>(null);
    const [autofilledFields, setAutofilledFields] = useState<Set<string>>(new Set());
    const [documents, setDocuments] = useState<Document[]>([]);
    const [activeDocType, setActiveDocType] = useState<string | null>(null);
    const [referents, setReferents] = useState<Referent[]>([]);
    const [suggestedReferent, setSuggestedReferent] = useState<{ first_name: string; last_name: string; referent_function?: string; phone?: string; email?: string; gender?: string } | null>(null);
    const [referentExists, setReferentExists] = useState(false);
    const [existingReferentId, setExistingReferentId] = useState<string | null>(null);
    const [savedEmployeeSnapshot, setSavedEmployeeSnapshot] = useState<EditableEmployeePayload | null>(null);
    const [savedDetailsSnapshot, setSavedDetailsSnapshot] = useState<EmployeeDetails | null>(null);
    const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
    const [docsModalOpen, setDocsModalOpen] = useState(false);
    const [tpVariantModalOpen, setTpVariantModalOpen] = useState(false);
    const [tpOpening, setTpOpening] = useState<null | 'tp_legacy' | 'tp_2026'>(null);
    const [vgrOpening, setVgrOpening] = useState(false);

    const uploadedSourcesCount = useMemo(
        () =>
            DOC_TYPES.filter((type) =>
                documents.some((d) => d.type?.toLowerCase().trim() === type)
            ).length,
        [documents]
    );

    useEffect(() => {
        if (!aiLoading) {
            setAutofillProgress(null);
            return;
        }

        const steps = buildEmployeeAutofillSteps(documents);
        let idx = 0;
        setAutofillProgress({
            currentIndex: 1,
            total: steps.length,
            currentLabel: steps[0] ?? 'Documenten analyseren…',
        });

        const interval = setInterval(() => {
            idx = Math.min(idx + 1, Math.max(steps.length - 2, 0));
            setAutofillProgress({
                currentIndex: idx + 1,
                total: steps.length,
                currentLabel: steps[idx] ?? 'Documenten analyseren…',
            });
        }, 3500);

        return () => clearInterval(interval);
    }, [aiLoading, documents]);

    useEffect(() => {
        fetchEmployee();
        fetchEmployeeDetails();
        fetchClients();
        fetchUserRole();
        fetchDocuments();
        // Track when employee page is opened
        if (employeeId) {
            trackAccess('employee', employeeId, false);
        }
    }, [employeeId]);

    const fetchEmployee = async () => {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('id', employeeId)
            .single();

        if (error) {
            console.error('Error fetching employee:', error);
            return;
        }

        setEmployee({
            ...data,
            first_name: normalizePersonName(data.first_name) ?? data.first_name,
            last_name: normalizePersonName(data.last_name) ?? data.last_name,
        });
        setSavedEmployeeSnapshot(toEditableEmployeePayload(data));
        if (data.client_id) {
            fetchClient(data.client_id);
            fetchReferents(data.client_id);
        } else {
            setReferents([]);
        }
    };

    const fetchReferents = async (clientId: string) => {
        const { data, error } = await supabase
            .from('referents' as any)
            .select('id, first_name, last_name, referent_function, phone, email, gender')
            .eq('client_id', clientId)
            .order('display_order', { ascending: true, nullsFirst: false });

        if (error) {
            console.error('Error fetching referents:', error);
            setReferents([]);
            return;
        }
        setReferents(data || []);
    };

    const fetchEmployeeDetails = async () => {
        const { data, error } = await supabase
            .from('employee_details')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching employee details:', error);
            return;
        }

        if (data) {
            // Parse work_experience if it's a JSON array string
            // Parse drivers_license_type if it's a JSON array string
            let parsedLicenseType = data.drivers_license_type;
            if (parsedLicenseType && typeof parsedLicenseType === 'string') {
                try {
                    const parsed = JSON.parse(parsedLicenseType);
                    if (Array.isArray(parsed)) {
                        parsedLicenseType = parsed;
                    }
                } catch {
                    // Not a JSON string, keep as is (might be a single string value)
                    parsedLicenseType = parsedLicenseType ? [parsedLicenseType] : null;
                }
            }
            
            const parsedData = {
                ...data,
                phone: normalizePhoneForStorage(data.phone) ?? data.phone,
                work_experience: data.work_experience ? parseWorkExperience(data.work_experience) : data.work_experience,
                drivers_license_type: parsedLicenseType,
                field_review_status: undefined as any,
                field_content_hash: undefined as any,
            };

            const normalizedReviewStatus = normalizeEmployeeFieldReviewStatus((data as any).field_review_status);
            const normalizedContentHash = normalizeEmployeeFieldContentHash((data as any).field_content_hash);

            // Backward compatibility: if the employee row has legacy `autofilled_fields` but no review metadata yet,
            // treat those fields as "review" so the UI can show yellow until the user validates.
            const hasReviewMetadata = Object.keys(normalizedReviewStatus).length > 0;
            const legacyAutofillFields = Array.isArray((data as any).autofilled_fields) ? (data as any).autofilled_fields : [];
            const legacyReviewStatus: Partial<Record<EmployeeDetailFieldKey, EmployeeFieldReviewStatus>> = {};
            if (!hasReviewMetadata && legacyAutofillFields.length > 0) {
                const keySet = new Set<string>(EMPLOYEE_DETAIL_FIELD_KEYS);
                for (const key of legacyAutofillFields) {
                    if (!keySet.has(key)) continue;
                    legacyReviewStatus[key as EmployeeDetailFieldKey] = 'review';
                }
            }

            parsedData.field_review_status = hasReviewMetadata ? normalizedReviewStatus : legacyReviewStatus;
            parsedData.field_content_hash = normalizedContentHash;
            const repairedEducation = repairEmployeeEducationFields(
                parsedData.education_level,
                parsedData.education_name
            );
            if (repairedEducation.education_level !== undefined) {
                parsedData.education_level = repairedEducation.education_level;
            }
            if (repairedEducation.education_name !== undefined) {
                parsedData.education_name = repairedEducation.education_name;
            }
            setEmployeeDetails(parsedData);
            setSavedDetailsSnapshot(toNormalizedDetailsPayload(parsedData, employeeId));
            if (data.autofilled_fields) {
                setAutofilledFields(new Set(data.autofilled_fields));
            }
        } else {
            setSavedDetailsSnapshot(null);
        }
    };

    const fetchClients = async () => {
        const { data, error } = await supabase
            .from('clients')
            .select('*');

        if (error) {
            console.error('Error fetching clients:', error);
            return;
        }

        setClients(data || []);
    };

    const fetchClient = async (clientId: string) => {
        const { data, error } = await supabase
            .from('clients')
            .select('name')
            .eq('id', clientId)
            .single();

        if (error) {
            console.error('Error fetching client:', error);
            return;
        }

        setClientName(data?.name || '');
    };

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data, error } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

            if (error) {
                console.error('Error fetching user role:', error);
                return;
            }

            setUserRole(data?.role || '');
        }
    };

    const fetchDocuments = async () => {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('employee_id', employeeId);

            if (error) {
                console.error('Fout bij ophalen documenten:', error);
                return;
            }

            setDocuments(data || []);
        } catch (err) {
            console.error('Fout bij ophalen documenten:', err);
        }
    };

    const handleDetailChange = (field: keyof EmployeeDetails, value: any) => {
        setEmployeeDetails((prev) => {
            if (!prev) return prev;

            const next: EmployeeDetails = {
                ...prev,
                [field]: value,
                employee_id: employeeId,
            };

            // Only apply validation lifecycle for actual validate-able fields.
            if (!EMPLOYEE_DETAIL_FIELD_KEYS.includes(field as EmployeeDetailFieldKey)) {
                return next;
            }

            const reviewMap = prev.field_review_status || {};
            const contentHashMap = prev.field_content_hash || {};
            const typedField = field as EmployeeDetailFieldKey;

            // If the user clears the field, remove any review metadata so it returns to normal.
            const cleared =
                value === null ||
                value === undefined ||
                (typeof value === 'string' && value.trim().length === 0);
            if (cleared) {
                if (!reviewMap[typedField] && !contentHashMap[typedField]) return next;
                const { [typedField]: _removed1, ...restReview } = reviewMap;
                const { [typedField]: _removed2, ...restHash } = contentHashMap;
                return {
                    ...next,
                    field_review_status: restReview,
                    field_content_hash: restHash,
                };
            }

            // If the field was validated but content changed, downgrade to review.
            if (reviewMap[typedField] === 'validated') {
                const nextHash = computeEmployeeFieldHash(typedField, next as any);
                const storedHash = contentHashMap[typedField];
                if (storedHash !== nextHash) {
                    return {
                        ...next,
                        field_review_status: {
                            ...reviewMap,
                            [typedField]: 'review',
                        },
                        field_content_hash: Object.fromEntries(
                            Object.entries(contentHashMap).filter(([k]) => k !== typedField)
                        ) as Partial<Record<EmployeeDetailFieldKey, string>>,
                    };
                }
            }

            return next;
        });
    };

    const pendingValidationFields = useMemo(() => {
        if (!employeeDetails) return [] as EmployeeDetailFieldKey[];
        const reviewMap = employeeDetails.field_review_status || {};
        const hashMap = employeeDetails.field_content_hash || {};
        return EMPLOYEE_DETAIL_FIELD_KEYS.filter((field) => {
            return getEmployeeFieldDisplayStatus(field, employeeDetails as any, reviewMap, hashMap) === 'review';
        });
    }, [employeeDetails]);

    const validateField = (field: EmployeeDetailFieldKey) => {
        if (!employeeDetails) return;
        const nextHash = computeEmployeeFieldHash(field, employeeDetails as any);

        setEmployeeDetails((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                field_review_status: {
                    ...(prev.field_review_status || {}),
                    [field]: 'validated',
                },
                field_content_hash: {
                    ...(prev.field_content_hash || {}),
                    [field]: nextHash,
                },
            };
        });
    };

    const validateAllPendingFields = () => {
        if (!employeeDetails) return;
        if (pendingValidationFields.length === 0) return;

        setEmployeeDetails((prev) => {
            if (!prev) return prev;
            const reviewMap = { ...(prev.field_review_status || {}) };
            const hashMap = { ...(prev.field_content_hash || {}) };

            for (const field of pendingValidationFields) {
                reviewMap[field] = 'validated';
                hashMap[field] = computeEmployeeFieldHash(field, prev as any);
            }

            return {
                ...prev,
                field_review_status: reviewMap,
                field_content_hash: hashMap,
            };
        });
    };

    const currentEmployeePayload = useMemo(
        () => (employee ? toEditableEmployeePayload(employee) : null),
        [employee]
    );
    const currentDetailsPayload = useMemo(
        () => (employeeDetails ? toNormalizedDetailsPayload(employeeDetails, employeeId) : null),
        [employeeDetails, employeeId]
    );

    const isEmployeeDirty = useMemo(() => {
        if (!currentEmployeePayload || !savedEmployeeSnapshot) return false;
        return !arePayloadsEqual(currentEmployeePayload, savedEmployeeSnapshot);
    }, [currentEmployeePayload, savedEmployeeSnapshot]);

    const isDetailsDirty = useMemo(() => {
        if (!savedDetailsSnapshot && !currentDetailsPayload) return false;
        return !arePayloadsEqual(currentDetailsPayload, savedDetailsSnapshot);
    }, [currentDetailsPayload, savedDetailsSnapshot]);

    const hasUnsavedChanges = isEmployeeDirty || isDetailsDirty;

    const saveUnified = useCallback(async (options?: { silent?: boolean }) => {
        if (!employee) return;

        const shouldSaveEmployee = isEmployeeDirty && currentEmployeePayload;
        const shouldSaveDetails = isDetailsDirty && currentDetailsPayload;

        if (!shouldSaveEmployee && !shouldSaveDetails) {
            if (!options?.silent) {
                showSuccess('Geen wijzigingen om op te slaan.');
            }
            return;
        }

        setUpdating(true);
        try {
            const operations: Promise<{ type: 'employee' | 'details'; error: any }>[] = [];

            if (shouldSaveEmployee) {
                operations.push(
                    (async () => {
                        const { error } = await supabase
                            .from('employees')
                            .update(currentEmployeePayload)
                            .eq('id', employeeId);
                        return { type: 'employee' as const, error };
                    })()
                );
            }

            if (shouldSaveDetails) {
                operations.push(
                    (async () => {
                        const { error } = await supabase
                            .from('employee_details')
                            .upsert([currentDetailsPayload], { onConflict: 'employee_id' });
                        return { type: 'details' as const, error };
                    })()
                );
            }

            const results = await Promise.all(operations);
            const employeeResult = results.find((result) => result.type === 'employee');
            const detailsResult = results.find((result) => result.type === 'details');

            const employeeSaved = Boolean(employeeResult && !employeeResult.error);
            const detailsSaved = Boolean(detailsResult && !detailsResult.error);

            if (employeeSaved && currentEmployeePayload) {
                setSavedEmployeeSnapshot(currentEmployeePayload);
            }

            if (detailsSaved && currentDetailsPayload) {
                setSavedDetailsSnapshot(currentDetailsPayload);
                await trackAccess('employee', employeeId, true);
            }

            const employeeFailed = shouldSaveEmployee && !employeeSaved;
            const detailsFailed = shouldSaveDetails && !detailsSaved;

            if (employeeFailed || detailsFailed) {
                const errorMessage =
                    employeeResult?.error?.message ||
                    detailsResult?.error?.message ||
                    'Er is een fout opgetreden bij het opslaan.';
                throw new Error(errorMessage);
            }

            if (!options?.silent) {
                if (employeeSaved && detailsSaved) {
                    showSuccess('Werknemer en profiel opgeslagen!');
                } else if (employeeSaved) {
                    showSuccess('Werknemer informatie opgeslagen!');
                } else if (detailsSaved) {
                    showSuccess('Profiel opgeslagen!');
                }
            }
        } catch (err) {
            console.error('Error saving unified data:', err);
            if (!options?.silent) {
                showError(
                    'Fout bij opslaan',
                    err instanceof Error ? err.message : 'Er is een onverwachte fout opgetreden bij het opslaan.'
                );
            }
            throw err;
        } finally {
            setUpdating(false);
        }
    }, [
        employee,
        isEmployeeDirty,
        isDetailsDirty,
        currentEmployeePayload,
        currentDetailsPayload,
        employeeId,
        supabase,
        showSuccess,
        showError,
    ]);

    const cancelAiAutofill = useCallback(() => {
        aiCancelRef.current = true;
        aiAbortRef.current?.abort();
        setAiCancelling(true);
    }, []);

    const autofillWithAI = async () => {
        const snapshot = {
            employeeDetails: employeeDetails ? { ...employeeDetails } : null,
            autofilledFields: new Set(autofilledFields),
            suggestedReferent: suggestedReferent ? { ...suggestedReferent } : null,
            referentExists,
            existingReferentId,
        };

        aiCancelRef.current = false;
        setAiCancelling(false);
        const abortController = new AbortController();
        aiAbortRef.current = abortController;

        setAiLoading(true);
        try {
            const useChatlikePipeline =
                typeof window !== 'undefined' &&
                new URLSearchParams(window.location.search).get('pipeline') === 'chatlike';
            const autofillApi = useChatlikePipeline
                ? `/api/autofill-employee-info-chatlike?employeeId=${employeeId}`
                : `/api/autofill-employee-info-working?employeeId=${employeeId}`;
            if (useChatlikePipeline) {
                showInfo('Chatlike pipeline', 'Autofill gebruikt alle documenten in één extractie (test).');
            }
            const res = await fetch(autofillApi, {
                signal: abortController.signal,
            });

            if (abortController.signal.aborted || aiCancelRef.current) {
                setEmployeeDetails(snapshot.employeeDetails);
                setAutofilledFields(snapshot.autofilledFields);
                setSuggestedReferent(snapshot.suggestedReferent);
                setReferentExists(snapshot.referentExists);
                setExistingReferentId(snapshot.existingReferentId);
                showInfo('Autofill geannuleerd', 'Geen wijzigingen opgeslagen.');
                return;
            }

            const parsed = await readAutofillResponse(res);
            if (!parsed.ok) {
                throw new Error(parsed.error);
            }
            const json = parsed.json;

            if (abortController.signal.aborted || aiCancelRef.current) {
                setEmployeeDetails(snapshot.employeeDetails);
                setAutofilledFields(snapshot.autofilledFields);
                setSuggestedReferent(snapshot.suggestedReferent);
                setReferentExists(snapshot.referentExists);
                setExistingReferentId(snapshot.existingReferentId);
                showInfo('Autofill geannuleerd', 'Geen wijzigingen opgeslagen.');
                return;
            }

            const { details, data } = getAutofillDetailsPayload(json);
            if (details && Object.keys(details).length > 0) {
                const processedDetails = processEmployeeAutofillRawDetails(details);
                const fields = listAutofilledEmployeeDetailKeys(processedDetails);

                const suggested = data.suggested_referent as
                    | {
                          first_name?: string;
                          last_name?: string;
                          referent_function?: string;
                          phone?: string;
                          email?: string;
                          gender?: string;
                      }
                    | undefined;
                if (suggested && (suggested.first_name || suggested.last_name)) {
                    setSuggestedReferent({
                        first_name: suggested.first_name || '',
                        last_name: suggested.last_name || '',
                        referent_function: suggested.referent_function,
                        phone: suggested.phone,
                        email: suggested.email,
                        gender: suggested.gender,
                    });
                    setReferentExists(Boolean(data.referent_exists));
                    setExistingReferentId(
                        typeof data.existing_referent_id === 'string'
                            ? data.existing_referent_id
                            : null
                    );
                } else {
                    setSuggestedReferent(null);
                    setReferentExists(false);
                    setExistingReferentId(null);
                }

                const persistResult = await applyEmployeeAutofillDetails(
                    supabase,
                    employeeId,
                    employeeDetails,
                    processedDetails,
                    {
                        autofill_incomplete: Boolean(data.autofill_incomplete),
                        autofill_warnings: Array.isArray(data.autofill_warnings)
                            ? (data.autofill_warnings as { message?: string }[])
                            : undefined,
                    }
                );

                if (abortController.signal.aborted || aiCancelRef.current) {
                    setEmployeeDetails(snapshot.employeeDetails);
                    setAutofilledFields(snapshot.autofilledFields);
                    setSuggestedReferent(snapshot.suggestedReferent);
                    setReferentExists(snapshot.referentExists);
                    setExistingReferentId(snapshot.existingReferentId);
                    showInfo('Autofill geannuleerd', 'Geen wijzigingen opgeslagen.');
                    return;
                }

                if (persistResult.error) {
                    console.error('Error persisting autofilled details:', persistResult.error);
                    showError('Autofill deels mislukt', 'AI velden zijn gevonden, maar opslaan in het profiel is mislukt.');
                    return;
                }

                setEmployeeDetails(persistResult.updatedDetails);
                setAutofilledFields(new Set(persistResult.autofilledFields));
                setSavedDetailsSnapshot(
                    normalizeEmployeeDetailsPayload(persistResult.updatedDetails, employeeId)
                );

                if (
                    persistResult.autofillIncomplete &&
                    Array.isArray(persistResult.autofillWarnings) &&
                    persistResult.autofillWarnings.length > 0
                ) {
                    const warningText = persistResult.autofillWarnings
                        .map((w) => w.message)
                        .filter(Boolean)
                        .join(' ');
                    showError(
                        'Autofill onvolledig',
                        warningText || 'Controleer vervoer, talen en computervaardigheden handmatig.'
                    );
                } else {
                    showSuccess('AI autofill succesvol uitgevoerd!');
                }
            } else {
                showError('Geen documenten gevonden', 'Er zijn geen documenten gevonden of geen bruikbare informatie gevonden in de documenten.');
            }
        } catch (err) {
            if (isAutofillAbortError(err) || aiCancelRef.current) {
                setEmployeeDetails(snapshot.employeeDetails);
                setAutofilledFields(snapshot.autofilledFields);
                setSuggestedReferent(snapshot.suggestedReferent);
                setReferentExists(snapshot.referentExists);
                setExistingReferentId(snapshot.existingReferentId);
                showInfo('Autofill geannuleerd', 'Geen wijzigingen opgeslagen.');
                return;
            }
            console.error('Autofill mislukt:', err);
            const errorMessage = err instanceof Error ? err.message : 'Onbekende fout opgetreden';
            showError('Autofill mislukt', errorMessage);
        } finally {
            aiAbortRef.current = null;
            setAiCancelling(false);
            setAiLoading(false);
        }
    };

    const applySuggestedReferentCreate = async () => {
        if (!suggestedReferent || !employee?.client_id) return;
        setUpdating(true);
        try {
            const { data: existingList } = await supabase.from('referents' as any).select('id').eq('client_id', employee.client_id);
            const isFirst = !existingList || existingList.length === 0;
            const { data: newRef, error: insertErr } = await supabase
                .from('referents' as any)
                .insert({
                    client_id: employee.client_id,
                    first_name: normalizePersonName(suggestedReferent.first_name),
                    last_name: normalizePersonName(suggestedReferent.last_name),
                    referent_function: suggestedReferent.referent_function ?? null,
                    phone: normalizePhoneForStorage(suggestedReferent.phone),
                    email: suggestedReferent.email ?? null,
                    gender: suggestedReferent.gender ?? null,
                    is_default: isFirst,
                })
                .select('id')
                .single();
            if (insertErr) {
                showError('Fout', 'Kon contactpersoon niet aanmaken.');
                return;
            }
            const { error: updateErr } = await supabase.from('employees').update({ referent_id: newRef.id }).eq('id', employeeId);
            if (updateErr) {
                showError('Fout', 'Kon werknemer niet koppelen aan contactpersoon.');
                return;
            }
            setEmployee(prev => prev ? { ...prev, referent_id: newRef.id } : null);
            setSavedEmployeeSnapshot((prev) => (prev ? { ...prev, referent_id: newRef.id } : prev));
            setSuggestedReferent(null);
            setReferentExists(false);
            setExistingReferentId(null);
            await fetchReferents(employee.client_id);
            showSuccess('Contactpersoon aangemaakt en gekoppeld.');
        } catch (e) {
            console.error(e);
            showError('Fout', 'Er is iets misgegaan.');
        } finally {
            setUpdating(false);
        }
    };

    const applySuggestedReferentSet = async () => {
        if (!existingReferentId || !employee) return;
        setUpdating(true);
        try {
            const { error } = await supabase.from('employees').update({ referent_id: existingReferentId }).eq('id', employeeId);
            if (error) {
                showError('Fout', 'Kon contactpersoon niet koppelen.');
                return;
            }
            setEmployee(prev => prev ? { ...prev, referent_id: existingReferentId } : null);
            setSavedEmployeeSnapshot((prev) => (prev ? { ...prev, referent_id: existingReferentId } : prev));
            setSuggestedReferent(null);
            setReferentExists(false);
            setExistingReferentId(null);
            if (employee.client_id) await fetchReferents(employee.client_id);
            showSuccess('Contactpersoon gekoppeld.');
        } catch (e) {
            console.error(e);
            showError('Fout', 'Er is iets misgegaan.');
        } finally {
            setUpdating(false);
        }
    };

    const getFieldStatusClass = (status: 'empty' | 'review' | 'validated') => {
        if (status === 'validated') return 'border-green-500 bg-green-50/30';
        if (status === 'review') return 'border-yellow-400 bg-yellow-50/30';
        return '';
    };

    const getFieldDisplayStatus = (field: EmployeeDetailFieldKey) =>
        getEmployeeFieldDisplayStatus(
            field,
            employeeDetails as any,
            employeeDetails?.field_review_status,
            employeeDetails?.field_content_hash
        );

    const canValidateField = (field: EmployeeDetailFieldKey) =>
        getFieldDisplayStatus(field) === 'review';

    const fieldClass = (field: EmployeeDetailFieldKey) =>
        `w-full border-2 border-purple-200 p-3 rounded-lg bg-white transition-all duration-200 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 hover:border-purple-300 ${getFieldStatusClass(
            getFieldDisplayStatus(field)
        )}`;

    const selectFieldClass = (field: EmployeeDetailFieldKey) =>
        cn(SELECT_CLASS, getFieldStatusClass(getFieldDisplayStatus(field)));

    const openTpBuilder = async (layoutKey: 'tp_legacy' | 'tp_2026') => {
        setTpOpening(layoutKey);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            const { data: existing, error: findError } = await (supabase as any)
                .from('tp_instances')
                .select('id')
                .eq('employee_id', employeeId)
                .eq('layout_key', layoutKey)
                .eq('status', 'draft')
                .maybeSingle();

            if (findError && findError.code !== 'PGRST116') {
                showError('Fout', 'Kon bestaande TP draft niet ophalen.');
                return;
            }

            let tpInstanceId = existing?.id as string | undefined;
            if (!tpInstanceId) {
                const title = layoutKey === 'tp_2026' ? 'TP 2026' : 'Trajectplan';
                const { data: inserted, error: insertError } = await (supabase as any)
                    .from('tp_instances')
                    .insert({
                        employee_id: employeeId,
                        layout_key: layoutKey,
                        title,
                        status: 'draft',
                        data_json: {},
                        created_by: user?.id ?? null,
                        updated_by: user?.id ?? null,
                    })
                    .select('id')
                    .single();

                if (insertError || !inserted?.id) {
                    showError('Fout', 'Kon geen TP draft aanmaken.');
                    return;
                }
                tpInstanceId = inserted.id;
            }

            setTpVariantModalOpen(false);
            setDocsModalOpen(false);
            guardedRouter.push(`/dashboard/tp/${employeeId}/${tpInstanceId}`);
        } catch (error) {
            console.error(error);
            showError('Fout', 'Kon TP bouwer niet openen.');
        } finally {
            setTpOpening(null);
        }
    };

    const openVgrBuilder = async () => {
        setVgrOpening(true);
        try {
            setDocsModalOpen(false);
            guardedRouter.push(`/dashboard/vgr/${employeeId}`);
        } catch (error) {
            console.error(error);
            showError('Fout', 'Kon VGR bouwer niet openen.');
        } finally {
            setVgrOpening(false);
        }
    };

    return (
        <div className="p-4 space-y-6">
            <EmployeeUnsavedGuard
                isDirty={hasUnsavedChanges}
                onSave={() => saveUnified({ silent: true })}
            />
            <div>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mb-2 gap-1 text-gray-600"
                    onClick={() => guardedRouter.push('/dashboard/employees')}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Terug naar werknemers
                </Button>
                <h1 className="text-xl font-bold">Werknemer Details</h1>
            </div>

            {employee && (
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-col bg-white p-4 rounded shadow flex-1 space-y-4 w-2/5">
                        <h2 className="text-lg font-semibold mb-4">Gegevens werknemer</h2>
                        <div className="flex justify-between">
                            <div className="flex-col space-y-2 w-3/5 pr-2">
                                <input className="w-full border border-gray-500/30 p-2 rounded" placeholder="Voornaam" value={employee.first_name || ''} onChange={(e) => setEmployee({ ...employee, first_name: e.target.value })} />
                                <input className="w-full border border-gray-500/30 p-2 rounded" placeholder="Achternaam" value={employee.last_name || ''} onChange={(e) => setEmployee({ ...employee, last_name: e.target.value })} />
                                <input className="w-full border border-gray-500/30 p-2 rounded" placeholder="E-mail" value={employee.email || ''} onChange={(e) => setEmployee({ ...employee, email: e.target.value })} />
                                <Select value={employee.client_id || undefined} onValueChange={(v) => { setEmployee({ ...employee, client_id: v, referent_id: v ? employee.referent_id : null }); fetchClient(v); if (v) fetchReferents(v); else setReferents([]); }}>
                                    <SelectTrigger className={SELECT_CLASS}>
                                        <SelectValue placeholder="Selecteer werkgever" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {employee.client_id ? (
                                    <div className="space-y-1">
                                        <label className="text-sm text-gray-600">Contactpersoon</label>
                                        <Select
                                            value={employee.referent_id ?? '__none__'}
                                            onValueChange={async (v) => {
                                                const refId = v === '__none__' ? null : v;
                                                setEmployee(prev => prev ? { ...prev, referent_id: refId } : null);
                                                const { error } = await supabase.from('employees').update({ referent_id: refId }).eq('id', employeeId);
                                                if (error) showError('Fout', 'Kon contactpersoon niet bijwerken.');
                                                else {
                                                    setSavedEmployeeSnapshot((prev) => (prev ? { ...prev, referent_id: refId } : prev));
                                                    showSuccess('Contactpersoon bijgewerkt.');
                                                }
                                            }}
                                        >
                                            <SelectTrigger className={SELECT_CLASS}>
                                                <SelectValue placeholder="— Geen / Default —" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">— Geen / Default —</SelectItem>
                                                {referents.map((r) => (
                                                    <SelectItem key={r.id} value={r.id}>
                                                        {[r.first_name, r.last_name].filter(Boolean).join(' ').trim() || 'Naamloos'}
                                                        {r.referent_function ? ` (${r.referent_function})` : ''}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : null}
                            </div>

                            <div className="flex flex-col gap-3 w-2/5">
                                <ValidatableField
                                    onValidate={() => validateField('gender')}
                                    canValidate={canValidateField('gender')}
                                    validateLabel="Valideer geslacht"
                                >
                                    <Select
                                        value={employeeDetails?.gender || undefined}
                                        onValueChange={(v) => handleDetailChange('gender', v)}
                                    >
                                        <SelectTrigger className={cn(selectFieldClass('gender'), 'pr-10')}>
                                            <SelectValue placeholder="Geslacht selecteren" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Man">Man</SelectItem>
                                            <SelectItem value="Vrouw">Vrouw</SelectItem>
                                            <SelectItem value="Anders">Anders</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </ValidatableField>
                                <ValidatableField
                                    onValidate={() => validateField('phone')}
                                    canValidate={canValidateField('phone')}
                                    validateLabel="Valideer telefoon"
                                >
                                    <input
                                        className={cn(fieldClass('phone'), 'pr-10')}
                                        placeholder="Telefoon"
                                        value={employeeDetails?.phone || ''}
                                        onChange={(e) => handleDetailChange('phone', e.target.value)}
                                    />
                                </ValidatableField>
                                <ValidatableField
                                    onValidate={() => validateField('date_of_birth')}
                                    canValidate={canValidateField('date_of_birth')}
                                    validateLabel="Valideer geboortedatum"
                                >
                                    <input
                                        className={cn(fieldClass('date_of_birth'), 'pr-10')}
                                        type="date"
                                        value={employeeDetails?.date_of_birth || ''}
                                        onChange={(e) => handleDetailChange('date_of_birth', e.target.value)}
                                    />
                                </ValidatableField>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-lg shadow border border-purple-100/80 w-full lg:w-[400px] space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            Documenten
                        </h2>
                        <div className="flex flex-col gap-3">
                            <Dialog open={sourcesModalOpen} onOpenChange={setSourcesModalOpen}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-auto justify-start gap-3 border-2 border-emerald-200 bg-gradient-to-r from-emerald-50/80 to-white py-4 px-4 text-left hover:border-emerald-400 hover:bg-emerald-50/50"
                                    onClick={() => setSourcesModalOpen(true)}
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                        <FolderOpen className="h-5 w-5" />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span className="font-semibold text-gray-900">Bronnen beheren</span>
                                        <span className="text-xs font-normal text-gray-600">
                                            Uploads per type: intake, AD, FML/IZP, CV, Spreekuurrapportage, overig
                                        </span>
                                        <span className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            {uploadedSourcesCount}/{DOC_TYPES.length} geüpload
                                        </span>
                                    </span>
                                </Button>
                                <DialogContent className="max-w-md sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                                            <FolderOpen className="h-5 w-5 text-emerald-600" />
                                            Bronnen & uploads
                                        </DialogTitle>
                                        <p className="text-sm text-gray-600">
                                            Kies een documenttype om te uploaden of te vervangen.
                                        </p>
                                    </DialogHeader>
                                    <div className="grid grid-cols-2 gap-2 pt-1">
                                        {DOC_TYPES.map((type) => {
                                            const doc = documents.find((d) => d.type?.toLowerCase().trim() === type);
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => {
                                                        setSourcesModalOpen(false);
                                                        setActiveDocType(type);
                                                    }}
                                                    className={cn(
                                                        'rounded-xl p-4 text-left text-sm transition-colors',
                                                        'border-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2',
                                                        doc
                                                            ? 'border-emerald-500 bg-emerald-50/60 hover:bg-emerald-50'
                                                            : 'border-gray-200 bg-gray-50/80 hover:bg-gray-100'
                                                    )}
                                                >
                                                    <p className="mb-1 flex items-center gap-1.5 font-semibold text-gray-900">
                                                        {doc ? (
                                                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                                        ) : (
                                                            <CircleDashed className="h-4 w-4 shrink-0 text-gray-400" />
                                                        )}
                                                        {DOC_LABELS[type]}
                                                    </p>
                                                    {doc ? (
                                                        <p className="text-xs text-emerald-700">Geüpload</p>
                                                    ) : (
                                                        <p className="text-xs text-gray-500">Niet geüpload</p>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={docsModalOpen} onOpenChange={setDocsModalOpen}>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-auto justify-start gap-3 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/80 to-white py-4 px-4 text-left hover:border-indigo-400 hover:bg-indigo-50/50"
                                    onClick={() => setDocsModalOpen(true)}
                                >
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                                        <Files className="h-5 w-5" />
                                    </span>
                                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                        <span className="font-semibold text-gray-900">Documenten maken</span>
                                        <span className="text-xs font-normal text-gray-600">
                                            Trajectplan, VGR of CV openen
                                        </span>
                                    </span>
                                </Button>
                                <DialogContent className="max-w-md sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                                            <Files className="h-5 w-5 text-indigo-600" />
                                            Welk document wil je maken?
                                        </DialogTitle>
                                        <p className="text-sm text-gray-600">
                                            Ga naar de editor of placeholder-pagina voor dit dossier.
                                        </p>
                                    </DialogHeader>
                                    <div className="flex flex-col gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDocsModalOpen(false);
                                                setTpVariantModalOpen(true);
                                            }}
                                            className="group flex w-full items-center gap-4 rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-white p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2"
                                        >
                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200">
                                                <Map className="h-6 w-6" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-semibold text-gray-900">Trajectplan</span>
                                                <span className="text-sm text-gray-600">TP-editor voor deze werknemer</span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => void openVgrBuilder()}
                                            disabled={vgrOpening}
                                            className="group flex w-full items-center gap-4 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50/90 to-white p-4 text-left transition-colors hover:border-purple-400 hover:bg-purple-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:opacity-60"
                                        >
                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-200">
                                                <Compass className="h-6 w-6" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-semibold text-gray-900">VGR</span>
                                                <span className="text-sm text-gray-600">
                                                    {vgrOpening ? 'Openen…' : 'Voortgangsrapportage-editor'}
                                                </span>
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDocsModalOpen(false);
                                                guardedRouter.push(`/dashboard/cv/${employeeId}`);
                                            }}
                                            className="group flex w-full items-center gap-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50/90 to-white p-4 text-left transition-colors hover:border-amber-400 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2"
                                        >
                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 group-hover:bg-amber-200">
                                                <IdCard className="h-6 w-6" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-semibold text-gray-900">CV</span>
                                                <span className="text-sm text-gray-600">Meerdere CV&apos;s per werknemer</span>
                                            </span>
                                        </button>
                                    </div>
                                </DialogContent>
                            </Dialog>

                            <Dialog open={tpVariantModalOpen} onOpenChange={setTpVariantModalOpen}>
                                <DialogContent className="max-w-md sm:max-w-lg">
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2 text-gray-900">
                                            <Map className="h-5 w-5 text-indigo-600" />
                                            Kies Trajectplan variant
                                        </DialogTitle>
                                        <p className="text-sm text-gray-600">
                                            Huidige TP blijft standaard. Je kunt ook TP 2026 starten.
                                        </p>
                                    </DialogHeader>

                                    <div className="flex flex-col gap-3 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => openTpBuilder('tp_legacy')}
                                            disabled={tpOpening !== null}
                                            className="group flex w-full items-center gap-4 rounded-xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 to-white p-4 text-left transition-colors hover:border-indigo-400 hover:bg-indigo-50 disabled:opacity-60"
                                        >
                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 group-hover:bg-indigo-200">
                                                <Map className="h-6 w-6" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-semibold text-gray-900">TP (huidig)</span>
                                                <span className="text-sm text-gray-600">
                                                    {tpOpening === 'tp_legacy' ? 'Openen…' : 'Standaard trajectplan'}
                                                </span>
                                            </span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => openTpBuilder('tp_2026')}
                                            disabled={tpOpening !== null}
                                            className="group flex w-full items-center gap-4 rounded-xl border-2 border-purple-200 bg-gradient-to-r from-purple-50/90 to-white p-4 text-left transition-colors hover:border-purple-400 hover:bg-purple-50 disabled:opacity-60"
                                        >
                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700 group-hover:bg-purple-200">
                                                <Map className="h-6 w-6" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block font-semibold text-gray-900">TP 2026</span>
                                                <span className="text-sm text-gray-600">
                                                    {tpOpening === 'tp_2026' ? 'Openen…' : 'Nieuwe layout 2026'}
                                                </span>
                                            </span>
                                        </button>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </div>
            )}

            {/* Worker Profile Section */}
            <div className="relative bg-white p-6 rounded-lg shadow-md space-y-6 border border-purple-100">
                {aiLoading && autofillProgress ? (
                    <AutofillProgressOverlay
                        progress={autofillProgress}
                        title="Invullen met AI"
                        onCancel={cancelAiAutofill}
                        cancelling={aiCancelling}
                    />
                ) : null}
                <div className="flex justify-between items-center pb-4 border-b border-purple-200">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-600" />
                        Werknemersprofiel
                    </h2>
                    <div className="flex items-center gap-3">
                        <Button
                            onClick={autofillWithAI}
                            disabled={aiLoading}
                            variant="secondary"
                            className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                        >
                            <Sparkles className={`w-4 h-4 mr-2 ${aiLoading ? 'animate-pulse' : ''}`} />
                            {aiLoading ? 'AI uitvoeren...' : 'Invullen met AI'}
                        </Button>
                        <Button
                            type="button"
                            onClick={validateAllPendingFields}
                            disabled={aiLoading || pendingValidationFields.length === 0 || updating}
                            variant="outline"
                            className="h-10 border-green-200 text-green-700 hover:border-green-300 bg-white"
                        >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            Valideer alles
                        </Button>
                    </div>
                </div>

                {suggestedReferent && (employee?.client_id) && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 flex flex-wrap items-center gap-2">
                        <span className="text-sm text-gray-700">
                            Contactpersoon uit document: <strong>{[suggestedReferent.first_name, suggestedReferent.last_name].filter(Boolean).join(' ').trim() || '—'}</strong>
                            {referentExists ? (
                                <Button type="button" variant="secondary" size="sm" className="ml-2" onClick={applySuggestedReferentSet} disabled={updating}>
                                    Als contactpersoon koppelen
                                </Button>
                            ) : (
                                <Button type="button" variant="secondary" size="sm" className="ml-2" onClick={applySuggestedReferentCreate} disabled={updating}>
                                    Aanmaken en koppelen als contactpersoon
                                </Button>
                            )}
                        </span>
                    </div>
                )}

                {/* Current Job */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-purple-600" />
                        Huidig werk
                    </label>
                    <ValidatableField
                        onValidate={() => validateField('current_job')}
                        canValidate={canValidateField('current_job')}
                        validateLabel="Valideer huidig werk"
                    >
                        <Input
                            className={cn(fieldClass('current_job'), 'pr-10')}
                            placeholder="Bijv. Jobcoach/stagebegeleider"
                            value={employeeDetails?.current_job || ''}
                            onChange={e => handleDetailChange('current_job', e.target.value)}
                        />
                    </ValidatableField>
                </div>

                {/* Work Experience */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-purple-600" />
                        Werkervaring
                    </label>
                    <ValidatableField
                        onValidate={() => validateField('work_experience')}
                        canValidate={canValidateField('work_experience')}
                        validateLabel="Valideer werkervaring"
                        placement="textarea-top"
                    >
                        <Textarea
                            className={cn(fieldClass('work_experience'), 'min-h-[100px] pr-10')}
                            placeholder="Beschrijf de werkervaring..."
                            value={employeeDetails?.work_experience || ''}
                            onChange={e => handleDetailChange('work_experience', e.target.value)}
                        />
                    </ValidatableField>
                </div>
                
                {/* Education */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 group">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-purple-600" />
                            Opleidingsniveau
                        </label>
                        <ValidatableField
                            onValidate={() => validateField('education_level')}
                            canValidate={canValidateField('education_level')}
                            validateLabel="Valideer opleidingsniveau"
                        >
                            <Select
                                value={normalizeEducationLevel(employeeDetails?.education_level) ?? undefined}
                                onValueChange={(v) => handleDetailChange('education_level', v)}
                            >
                                <SelectTrigger className={cn(selectFieldClass('education_level'), 'pr-10')}>
                                    <SelectValue placeholder="Selecteer opleidingsniveau" />
                                </SelectTrigger>
                                <SelectContent>
                                    {EDUCATION_LEVEL_OPTIONS.map(level => (
                                        <SelectItem key={level} value={level}>{level}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </ValidatableField>
                    </div>
                    <div className="space-y-2 group">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-purple-600" />
                            Specialisatie
                        </label>
                        <ValidatableField
                            onValidate={() => validateField('education_name')}
                            canValidate={canValidateField('education_name')}
                            validateLabel="Valideer specialisatie"
                        >
                            <Input
                                className={cn(fieldClass('education_name'), 'pr-10')}
                                placeholder="Bijv. Kappersopleiding"
                                value={employeeDetails?.education_name || ''}
                                onChange={e => handleDetailChange('education_name', e.target.value)}
                            />
                        </ValidatableField>
                    </div>
                </div>

                {/* Checkboxes for drivers_license and has_computer */}
                <div className='flex gap-6 p-4 bg-purple-50/50 rounded-lg border border-purple-100'>
                    {([
                        { key: 'drivers_license', label: 'Rijbewijs', Icon: Car },
                        { key: 'has_computer', label: 'Heeft PC', Icon: Computer }
                    ] as const).map(({ key, label, Icon }) => (
                        <label 
                            key={key} 
                            className="flex items-center space-x-3 cursor-pointer group/checkbox p-3 rounded-lg hover:bg-white transition-colors duration-200 flex-1"
                        >
                            <input 
                                type="checkbox" 
                                checked={Boolean(employeeDetails?.[key as keyof EmployeeDetails])} 
                                onChange={e => handleDetailChange(key as keyof EmployeeDetails, e.target.checked)}
                                className="w-5 h-5 rounded border-2 border-purple-300 text-purple-600 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 cursor-pointer transition-all checked:bg-purple-600 checked:border-purple-600"
                            />
                            <div className="flex items-center gap-2">
                                <Icon
                                    className={`w-4 h-4 ${
                                        getFieldDisplayStatus(key as EmployeeDetailFieldKey) === 'validated'
                                            ? 'text-green-600'
                                            : getFieldDisplayStatus(key as EmployeeDetailFieldKey) === 'review'
                                              ? 'text-yellow-600'
                                              : 'text-purple-600'
                                    }`}
                                />
                                <span
                                    className={`font-medium ${
                                        getFieldDisplayStatus(key as EmployeeDetailFieldKey) === 'validated'
                                            ? 'text-green-700'
                                            : getFieldDisplayStatus(key as EmployeeDetailFieldKey) === 'review'
                                              ? 'text-yellow-600'
                                              : 'text-gray-700'
                                    }`}
                                >
                                    {label}
                                </span>
                            </div>
                            <FieldValidateButton
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    validateField(key as EmployeeDetailFieldKey);
                                }}
                                disabled={!canValidateField(key as EmployeeDetailFieldKey)}
                                label={`Valideer ${label}`}
                                className="ml-auto"
                            />
                        </label>
                    ))}
                </div>

                {/* Multi-select driver's license types */}
                {employeeDetails?.drivers_license && (
                    <div className="relative p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                        <FieldValidateButton
                            onClick={() => validateField('drivers_license_type')}
                            disabled={!canValidateField('drivers_license_type')}
                            label="Valideer rijbewijstype"
                            className="absolute right-3 top-3 z-10"
                        />
                        <label className="mb-3 block pr-10 text-sm font-semibold flex items-center gap-2 text-gray-700">
                            <Car className="w-4 h-4 text-purple-600" />
                            Rijbewijstype
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                            {[
                                { value: 'B', label: 'B (Auto)' },
                                { value: 'C', label: 'C (Vrachtwagen)' },
                                { value: 'C1', label: 'C1 (Middelgrote vrachtwagen)' },
                                { value: 'D', label: 'D (Bus)' },
                                { value: 'D1', label: 'D1 (Kleine bus)' },
                                { value: 'E', label: 'E (Aanhangwagen)' },
                                { value: 'A', label: 'A (Motor)' },
                                { value: 'AM', label: 'AM (Bromfiets)' },
                                { value: 'A1', label: 'A1 (Motor beperkt)' },
                                { value: 'A2', label: 'A2 (Motor beperkt)' },
                                { value: 'BE', label: 'BE (Auto + Aanhangwagen)' },
                                { value: 'CE', label: 'CE (Vrachtwagen + Aanhangwagen)' },
                                { value: 'DE', label: 'DE (Bus + Aanhangwagen)' },
                                { value: 'T', label: 'T (Trekker)' },
                            ].map((option) => {
                                const selected = Array.isArray(employeeDetails?.drivers_license_type) 
                                    ? employeeDetails.drivers_license_type.includes(option.value)
                                    : false;
                                return (
                                    <label 
                                        key={option.value} 
                                        className={`flex items-center space-x-2 cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
                                            selected 
                                                ? 'border-purple-500 bg-purple-100 shadow-md' 
                                                : 'border-purple-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selected}
                                            onChange={(e) => {
                                                const currentTypes = Array.isArray(employeeDetails?.drivers_license_type) 
                                                    ? employeeDetails.drivers_license_type 
                                                    : [];
                                                if (e.target.checked) {
                                                    handleDetailChange('drivers_license_type', [...currentTypes, option.value]);
                                                } else {
                                                    handleDetailChange('drivers_license_type', currentTypes.filter(t => t !== option.value));
                                                }
                                            }}
                                            className="sr-only"
                                        />
                                        <span className={`text-sm font-medium ${selected ? 'text-purple-700' : 'text-gray-700'}`}>
                                            {option.label}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Multi-select transport */}
                <div className="relative p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                    <FieldValidateButton
                        onClick={() => validateField('transport_type')}
                        disabled={!canValidateField('transport_type')}
                        label="Valideer eigen vervoer"
                        className="absolute right-3 top-3 z-10"
                    />
                    <label className="mb-3 block pr-10 text-sm font-semibold flex items-center gap-2 text-gray-700">
                        <Car className="w-4 h-4 text-purple-600" />
                        Eigen vervoer
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {TRANSPORT_TYPE_OPTIONS.map((option) => {
                            const selected = Array.isArray(employeeDetails?.transport_type) 
                                ? employeeDetails.transport_type.includes(option)
                                : false;
                            return (
                                <label 
                                    key={option} 
                                    className={`flex items-center space-x-2 cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
                                        selected 
                                            ? 'border-purple-500 bg-purple-100 shadow-md' 
                                            : 'border-purple-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                                    }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={(e) => {
                                            const current = Array.isArray(employeeDetails?.transport_type) 
                                                ? employeeDetails.transport_type 
                                                : (typeof employeeDetails?.transport_type === 'string' && employeeDetails.transport_type 
                                                    ? [employeeDetails.transport_type] 
                                                    : []);
                                            if (e.target.checked) {
                                                handleDetailChange('transport_type', [...current, option]);
                                            } else {
                                                handleDetailChange('transport_type', current.filter(v => v !== option));
                                            }
                                        }}
                                        className="rounded border-border text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                                    />
                                    <span
                                        className={`text-sm font-medium ${
                                            selected ? 'text-purple-700' : 'text-gray-600'
                                        } ${
                                            getFieldDisplayStatus('transport_type') === 'review'
                                                ? 'text-yellow-600'
                                                : getFieldDisplayStatus('transport_type') === 'validated'
                                                  ? 'text-green-700'
                                                  : ''
                                        }`}
                                    >
                                        {option}
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </div>

                {/* Language proficiency dropdowns - Side by side */}
                <div className="space-y-3">
                    <label className="block text-sm font-semibold flex items-center gap-2 text-gray-700">
                        <Languages className="w-4 h-4 text-purple-600" />
                        Nederlandse taalvaardigheid
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 group">
                            <label className="text-xs text-gray-500 font-medium">Spreekvaardigheid</label>
                            <ValidatableField
                                onValidate={() => validateField('dutch_speaking')}
                                canValidate={canValidateField('dutch_speaking')}
                                validateLabel="Valideer spreekvaardigheid"
                                buttonSize="sm"
                            >
                                <Select value={employeeDetails?.dutch_speaking || undefined} onValueChange={(v) => handleDetailChange('dutch_speaking', v || null)}>
                                    <SelectTrigger className={cn(selectFieldClass('dutch_speaking'), 'pr-9')}>
                                        <SelectValue placeholder="Selecteer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Niet goed">Niet goed</SelectItem>
                                        <SelectItem value="Gemiddeld">Gemiddeld</SelectItem>
                                        <SelectItem value="Goed">Goed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </ValidatableField>
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs text-gray-500 font-medium">Schrijfvaardigheid</label>
                            <ValidatableField
                                onValidate={() => validateField('dutch_writing')}
                                canValidate={canValidateField('dutch_writing')}
                                validateLabel="Valideer schrijfvaardigheid"
                                buttonSize="sm"
                            >
                                <Select value={employeeDetails?.dutch_writing || undefined} onValueChange={(v) => handleDetailChange('dutch_writing', v || null)}>
                                    <SelectTrigger className={cn(selectFieldClass('dutch_writing'), 'pr-9')}>
                                        <SelectValue placeholder="Selecteer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Niet goed">Niet goed</SelectItem>
                                        <SelectItem value="Gemiddeld">Gemiddeld</SelectItem>
                                        <SelectItem value="Goed">Goed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </ValidatableField>
                        </div>
                        <div className="space-y-2 group">
                            <label className="text-xs text-gray-500 font-medium">Leesvaardigheid</label>
                            <ValidatableField
                                onValidate={() => validateField('dutch_reading')}
                                canValidate={canValidateField('dutch_reading')}
                                validateLabel="Valideer leesvaardigheid"
                                buttonSize="sm"
                            >
                                <Select value={employeeDetails?.dutch_reading || undefined} onValueChange={(v) => handleDetailChange('dutch_reading', v || null)}>
                                    <SelectTrigger className={cn(selectFieldClass('dutch_reading'), 'pr-9')}>
                                        <SelectValue placeholder="Selecteer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Niet goed">Niet goed</SelectItem>
                                        <SelectItem value="Gemiddeld">Gemiddeld</SelectItem>
                                        <SelectItem value="Goed">Goed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </ValidatableField>
                        </div>
                    </div>
                </div>

                {/* Computer Skills */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Computer className="w-4 h-4 text-purple-600" />
                        Computervaardigheden
                    </label>
                    <ValidatableField
                        onValidate={() => validateField('computer_skills')}
                        canValidate={canValidateField('computer_skills')}
                        validateLabel="Valideer computervaardigheden"
                    >
                        <Select value={employeeDetails?.computer_skills || undefined} onValueChange={(v) => handleDetailChange('computer_skills', v)}>
                            <SelectTrigger className={cn(selectFieldClass('computer_skills'), 'pr-10')}>
                                <SelectValue placeholder="Selecteer computervaardigheden" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1">1 - Geen</SelectItem>
                                <SelectItem value="2">2 - Basis (e-mail, browsen)</SelectItem>
                                <SelectItem value="3">3 - Gemiddeld (Word, Excel)</SelectItem>
                                <SelectItem value="4">4 - Geavanceerd (meerdere programma's)</SelectItem>
                                <SelectItem value="5">5 - Expert (IT-gerelateerde vaardigheden)</SelectItem>
                            </SelectContent>
                        </Select>
                    </ValidatableField>
                </div>

                {/* Contract Hours */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        Contracturen
                    </label>
                    <ValidatableField
                        onValidate={() => validateField('contract_hours')}
                        canValidate={canValidateField('contract_hours')}
                        validateLabel="Valideer contracturen"
                    >
                        <Input
                            className={cn(fieldClass('contract_hours'), 'pr-10')}
                            type="number"
                            placeholder="Bijv. 40"
                            value={employeeDetails?.contract_hours || ''}
                            onChange={e => handleDetailChange('contract_hours', Number(e.target.value))}
                        />
                    </ValidatableField>
                </div>
                
                {/* Other Employers */}
                <div className="space-y-2 group">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-purple-600" />
                        Andere werkgevers
                    </label>
                    <ValidatableField
                        onValidate={() => validateField('other_employers')}
                        canValidate={canValidateField('other_employers')}
                        validateLabel="Valideer andere werkgevers"
                        placement="textarea-top"
                    >
                        <Textarea
                            className={cn(fieldClass('other_employers'), 'min-h-[100px] pr-10')}
                            placeholder="Vul hier andere huidige werkgevers in (bij meerdere banen), niet de hoofdwerkgever..."
                            value={isAbsentText(employeeDetails?.other_employers) ? '' : (employeeDetails?.other_employers || '')}
                            onChange={e => handleDetailChange('other_employers', e.target.value)}
                        />
                    </ValidatableField>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span className="text-purple-500">ℹ️</span>
                        Vul hier alleen andere huidige werkgevers in (bij meerdere banen), niet de hoofdwerkgever ({clientName})
                    </p>
                </div>

            </div>

            <Button
                onClick={() => void saveUnified()}
                disabled={updating}
                variant="default"
                aria-label="Opslaan werknemer en profiel"
                aria-busy={updating}
                className={cn(
                    'fixed bottom-6 right-6 z-50 h-12 rounded-full px-5 shadow-xl',
                    'cursor-pointer disabled:cursor-not-allowed',
                    'text-white border border-white/15',
                    'transition-all duration-200 ease-out',
                    'opacity-60 hover:opacity-100 focus-visible:opacity-100',
                    'active:scale-[0.97] active:duration-100',
                    'disabled:active:scale-100',
                    updating && 'animate-pulse',
                    hasUnsavedChanges &&
                        'opacity-75 ring-2 ring-purple-300/35 ring-offset-2 ring-offset-transparent hover:opacity-100'
                )}
            >
                <Save className="w-4 h-4 mr-2" />
                {updating ? 'Opslaan...' : hasUnsavedChanges ? 'Alles opslaan' : 'Alles opgeslagen'}
            </Button>

            {activeDocType && (
                <DocumentModal
                    type={activeDocType}
                    employeeId={employeeId}
                    existingDoc={documents.find(d => d.type?.toLowerCase().trim() === activeDocType) || null}
                    onClose={() => setActiveDocType(null)}
                    onUploaded={fetchDocuments}
                    onDeleted={() => {
                        fetchDocuments();
                        setActiveDocType(null);
                    }}
                />
            )}
        </div>
    );
}