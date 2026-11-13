'use client';

import { useState, useEffect, use, useMemo, useRef, useCallback } from 'react';
import { useGuardedRouter } from '@/hooks/useGuardedRouter';
import EmployeeUnsavedGuard from '@/components/employee/EmployeeUnsavedGuard';
import { supabase } from '@/lib/supabase/client';
import DocumentModal from '@/components/DocumentModal';
import { DocumentPreviewDialog } from '@/components/DocumentPreviewDialog';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToastHelpers } from '@/components/ui/Toast';
import { parseWorkExperience, cn, isAbsentText, normalizePersonName } from '@/lib/utils';
import { normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';
import {
    nextComputerSkillsDescriptionOnLevelChange,
    repairEmployeeEducationFields,
} from '@/lib/tp2026/gegevens-field-options';
import { normalizeWorkExperienceTitles } from '@/lib/tp2026/intake-algemene-info';
import { trackAccess } from '@/lib/tracking';
import { ReferentEditDialog } from '@/components/employee/ReferentEditDialog';
import { type AutofillProgressState } from '@/components/ui/AutofillProgressOverlay';
import { buildEmployeeAutofillSteps } from '@/lib/autofill-progress';
import { getAutofillDetailsPayload, readAutofillResponse } from '@/lib/autofill-response';
import { isAutofillAbortError } from '@/lib/tp2026/autofill-runner';
import {
    applyEmployeeAutofillDetails,
    listAutofilledEmployeeDetailKeys,
    normalizeEmployeeDetailsPayload,
    processEmployeeAutofillRawDetails,
} from '@/lib/employee/autofill-persist';
import { saveWorkerFacts, type SkippedValidatedField } from '@/lib/employee/save-worker-facts';
import { ValidatedFactsDialog } from '@/components/employee/ValidatedFactsDialog';
import {
  EMPLOYEE_DETAIL_FIELD_KEYS,
  computeEmployeeFieldHash,
  getEmployeeFieldDisplayStatus,
  normalizeEmployeeFieldContentHash,
  normalizeEmployeeFieldReviewStatus,
  type EmployeeDetailFieldKey,
  type EmployeeFieldReviewStatus,
} from '@/lib/employee/field-review';
import GesprekPanel from '@/components/employee/GesprekPanel';
import {
    EMPLOYEE_DOC_LABELS,
    visibleEmployeeDocTypes,
    type EmployeeDocType,
} from '@/lib/documents/employee-doc-types';
import { buildEmployeeProfileView } from '@/lib/employee/profile-view';
import { useEmployeeDocStatuses } from '@/hooks/useEmployeeDocStatuses';
import type { AutosaveStatus } from '@/hooks/useDebouncedAutosave';
import { EmployeeHeader } from '@/components/employee/detail/EmployeeHeader';
import { ProfileView } from '@/components/employee/detail/ProfileView';
import { ProfileForm } from '@/components/employee/detail/ProfileForm';
import { DocumentsCard } from '@/components/employee/detail/DocumentsCard';
import { SourcesCard } from '@/components/employee/detail/SourcesCard';
import { DossierCard } from '@/components/employee/detail/DossierCard';
import { EditBar } from '@/components/employee/detail/EditBar';
import { EmployeeNotFound, EmployeePageSkeleton } from '@/components/employee/detail/PageStates';

type Employee = {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    client_id: string;
    referent_id?: string | null;
    owner_id?: string | null;
};

type EditableEmployeePayload = Pick<Employee, 'first_name' | 'last_name' | 'email' | 'client_id' | 'referent_id'>;

type Referent = {
    id: string;
    first_name: string | null;
    last_name: string | null;
    referent_function: string | null;
    phone: string | null;
    email: string | null;
    gender: string | null;
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
    computer_skills_description?: string;
    contract_hours?: number | null;
    other_employers?: string;
    is_ex_werknemer?: boolean;
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

type LoadState = 'loading' | 'ready' | 'failed';

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
    'computer_skills_description',
    'contract_hours',
    'other_employers',
    'is_ex_werknemer',
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

function mapEmployeeRow(data: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    client_id: string | null;
    referent_id: string | null;
    owner_id: string | null;
}): Employee {
    return {
        id: data.id,
        first_name: normalizePersonName(data.first_name) ?? '',
        last_name: normalizePersonName(data.last_name) ?? '',
        email: data.email ?? '',
        client_id: data.client_id ?? '',
        referent_id: data.referent_id,
        owner_id: data.owner_id,
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
    const normalizedWorkExperience =
        details?.work_experience != null && String(details.work_experience).trim()
            ? normalizeWorkExperienceTitles(
                  String(details.work_experience),
                  details.current_job != null ? String(details.current_job) : undefined
              ) || undefined
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

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [employeeDetails, setEmployeeDetails] = useState<EmployeeDetails | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
    const [clientName, setClientName] = useState<string>('');
    const [userRole, setUserRole] = useState<string>('');
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [pendingFacts, setPendingFacts] = useState<{
        conflicts: SkippedValidatedField[];
        proposal: Record<string, unknown>;
    } | null>(null);
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
    const [referentDialogOpen, setReferentDialogOpen] = useState(false);
    const [referentDialogMode, setReferentDialogMode] = useState<'edit' | 'create'>('edit');
    const [tpOpening, setTpOpening] = useState(false);
    const [vgrOpening, setVgrOpening] = useState(false);
    const [intakeOpening, setIntakeOpening] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{
        title: string;
        url: string;
    } | null>(null);

    // Page load: the profile renders only once everything it shows has arrived.
    const [employeeLoad, setEmployeeLoad] = useState<LoadState>('loading');
    const [detailsLoad, setDetailsLoad] = useState<LoadState>('loading');
    const [clientsLoaded, setClientsLoaded] = useState(false);
    const [documentsLoaded, setDocumentsLoaded] = useState(false);

    // Read mode is the default; the form only opens through Bewerken.
    const [editing, setEditing] = useState(false);
    const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
    const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>('idle');
    // Bumped to remount the guard: its autosave status only leaves 'error' through its own save run.
    const [guardEpoch, setGuardEpoch] = useState(0);
    const [gesprekOpen, setGesprekOpen] = useState(false);
    const [sourceToDelete, setSourceToDelete] = useState<Document | null>(null);
    const [deletingSource, setDeletingSource] = useState(false);

    const docTypes = useMemo(() => visibleEmployeeDocTypes(), []);
    const docStatuses = useEmployeeDocStatuses(employeeId, documents);

    const uploadedSourcesCount = useMemo(
        () =>
            docTypes.filter((type) =>
                documents.some((d) => d.type?.toLowerCase().trim() === type)
            ).length,
        [docTypes, documents]
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
            setEmployeeLoad('failed');
            return;
        }

        const mapped = mapEmployeeRow(data);
        setEmployee(mapped);
        setSavedEmployeeSnapshot(toEditableEmployeePayload(mapped));
        setEmployeeLoad('ready');
        if (data.client_id) {
            fetchClient(data.client_id);
            fetchReferents(data.client_id);
        } else {
            setReferents([]);
        }
    };

    const fetchReferents = async (clientId: string) => {
        const { data, error } = await supabase
            .from('referents')
            .select('id, first_name, last_name, referent_function, phone, email, gender')
            .eq('client_id', clientId)
            .order('display_order', { ascending: true, nullsFirst: false });

        if (error) {
            console.error('Error fetching referents:', error);
            setReferents([]);
            return;
        }
        setReferents((data as Referent[]) || []);
    };

    const fetchEmployeeDetails = async () => {
        const { data, error } = await supabase
            .from('employee_details')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching employee details:', error);
            // Keep the profile unloaded: starting from an empty form here could overwrite stored values.
            setDetailsLoad('failed');
            return;
        }

        if (data) {
            const repairedEducation = repairEmployeeEducationFields(
                data.education_level,
                data.education_name
            );

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

            const details = toNormalizedDetailsPayload(
                {
                    gender: data.gender ?? undefined,
                    phone: normalizePhoneForStorage(data.phone) ?? data.phone ?? undefined,
                    date_of_birth: data.date_of_birth ?? undefined,
                    current_job: data.current_job ?? undefined,
                    work_experience: data.work_experience
                        ? parseWorkExperience(data.work_experience)
                        : undefined,
                    education_level:
                        repairedEducation.education_level !== undefined
                            ? repairedEducation.education_level
                            : data.education_level ?? undefined,
                    education_name:
                        repairedEducation.education_name !== undefined
                            ? repairedEducation.education_name
                            : data.education_name ?? undefined,
                    drivers_license: data.drivers_license ?? undefined,
                    drivers_license_type: normalizeStringArray(data.drivers_license_type),
                    transport_type: normalizeStringArray(data.transport_type),
                    dutch_speaking: data.dutch_speaking ?? undefined,
                    dutch_writing: data.dutch_writing ?? undefined,
                    dutch_reading: data.dutch_reading ?? undefined,
                    has_computer: data.has_computer ?? undefined,
                    computer_skills: data.computer_skills ?? undefined,
                    computer_skills_description: data.computer_skills_description ?? undefined,
                    contract_hours: data.contract_hours,
                    other_employers: isAbsentText(data.other_employers)
                        ? 'Geen'
                        : data.other_employers ?? undefined,
                    is_ex_werknemer: data.is_ex_werknemer ?? undefined,
                    autofilled_fields: data.autofilled_fields ?? undefined,
                    field_review_status: hasReviewMetadata ? normalizedReviewStatus : legacyReviewStatus,
                    field_content_hash: normalizedContentHash,
                },
                employeeId
            );

            setEmployeeDetails(details);
            setSavedDetailsSnapshot(details);
            if (data.autofilled_fields) {
                setAutofilledFields(new Set(data.autofilled_fields));
            }
        } else {
            // No details row yet: start from an empty profile so the form can be filled in.
            const emptyDetails = toNormalizedDetailsPayload({}, employeeId);
            setEmployeeDetails(emptyDetails);
            setSavedDetailsSnapshot(emptyDetails);
        }
        setDetailsLoad('ready');
    };

    const fetchClients = async () => {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name');

        setClientsLoaded(true);
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
            setCurrentUserId(user.id);
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
        } finally {
            setDocumentsLoaded(true);
        }
    };

    const confirmDeleteSource = async () => {
        const doc = sourceToDelete;
        if (!doc) return;
        setDeletingSource(true);
        try {
            const res = await fetch('/api/documents/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: doc.id, url: doc.url }),
            });
            const result = await res.json();
            if (!res.ok || !result.success) {
                throw new Error(result.error || 'Verwijderen mislukt');
            }
            await fetchDocuments();
            showSuccess('Document verwijderd');
        } catch (err) {
            console.error(err);
            showError(err instanceof Error ? err.message : 'Verwijderen mislukt');
        } finally {
            setDeletingSource(false);
            setSourceToDelete(null);
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

            if (field === 'computer_skills' && typeof value === 'string') {
                next.computer_skills_description = nextComputerSkillsDescriptionOnLevelChange(
                    prev.computer_skills,
                    value,
                    prev.computer_skills_description
                );
            }

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

    /** One profile row can sit on several fields (e.g. the three Dutch language levels). */
    const validateFields = (fields: EmployeeDetailFieldKey[]) => {
        fields.forEach(validateField);
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

            if (shouldSaveEmployee && currentEmployeePayload) {
                operations.push(
                    (async () => {
                        const { error } = await supabase
                            .from('employees')
                            .update({
                                first_name: currentEmployeePayload.first_name,
                                last_name: currentEmployeePayload.last_name,
                                email: currentEmployeePayload.email,
                                client_id: currentEmployeePayload.client_id,
                                referent_id: currentEmployeePayload.referent_id,
                            })
                            .eq('id', employeeId);
                        return { type: 'employee' as const, error };
                    })()
                );
            }

            if ((shouldSaveEmployee || shouldSaveDetails) && currentEmployeePayload && currentDetailsPayload) {
                operations.push(
                    (async () => {
                        const saved = await saveWorkerFacts(
                            supabase,
                            employeeId,
                            {
                                ...currentDetailsPayload,
                                first_name: currentEmployeePayload.first_name,
                                last_name: currentEmployeePayload.last_name,
                                email: currentEmployeePayload.email,
                            },
                            'human',
                            {
                                preserveProfileReview: {
                                    status: currentDetailsPayload.field_review_status,
                                    hash: currentDetailsPayload.field_content_hash,
                                },
                            }
                        );
                        return { type: 'details' as const, error: saved.error ? { message: saved.error } : null };
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
            const useLegacyPipeline =
                typeof window !== 'undefined' &&
                new URLSearchParams(window.location.search).get('pipeline') === 'legacy';
            const autofillApi = useLegacyPipeline
                ? `/api/autofill-employee-info-working?employeeId=${employeeId}`
                : `/api/autofill-employee-info-chatlike?employeeId=${employeeId}`;
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
                if (persistResult.skippedValidated && persistResult.skippedValidated.length > 0) {
                    setPendingFacts({
                        conflicts: persistResult.skippedValidated,
                        proposal: processedDetails,
                    });
                }

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
            const { data: existingList } = await supabase.from('referents').select('id').eq('client_id', employee.client_id);
            const isFirst = !existingList || existingList.length === 0;
            const { data: newRef, error: insertErr } = await supabase
                .from('referents')
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
            if (!newRef?.id) {
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

    const getFieldDisplayStatus = (field: EmployeeDetailFieldKey) =>
        getEmployeeFieldDisplayStatus(
            field,
            employeeDetails as any,
            employeeDetails?.field_review_status,
            employeeDetails?.field_content_hash
        );

    // Dossier card: employer, contact person and owner save on change, outside the edit form.
    const handleClientChange = async (clientId: string) => {
        if (!employee || !clientId || clientId === employee.client_id) return;
        const previous = { client_id: employee.client_id, referent_id: employee.referent_id ?? null };

        // A contact person belongs to one employer, so the link is cleared with the old employer.
        setEmployee((prev) => (prev ? { ...prev, client_id: clientId, referent_id: null } : null));
        const { error } = await supabase
            .from('employees')
            .update({ client_id: clientId, referent_id: null })
            .eq('id', employeeId);
        if (error) {
            setEmployee((prev) => (prev ? { ...prev, ...previous } : null));
            showError('Fout', 'Kon werkgever niet bijwerken.');
            return;
        }

        setSavedEmployeeSnapshot((prev) => (prev ? { ...prev, client_id: clientId, referent_id: null } : prev));
        setSuggestedReferent(null);
        setReferentExists(false);
        setExistingReferentId(null);
        fetchClient(clientId);
        fetchReferents(clientId);
        showSuccess('Werkgever bijgewerkt.');
    };

    const handleReferentChange = async (refId: string | null) => {
        setEmployee(prev => prev ? { ...prev, referent_id: refId } : null);
        const { error } = await supabase.from('employees').update({ referent_id: refId }).eq('id', employeeId);
        if (error) showError('Fout', 'Kon contactpersoon niet bijwerken.');
        else {
            setSavedEmployeeSnapshot((prev) => (prev ? { ...prev, referent_id: refId } : prev));
            showSuccess('Contactpersoon bijgewerkt.');
        }
    };

    const handleOwnerChange = async (ownerId: string | null) => {
        setEmployee((prev) => (prev ? { ...prev, owner_id: ownerId } : null));
        const { error } = await supabase
            .from('employees')
            .update({ owner_id: ownerId })
            .eq('id', employeeId);
        if (error) showError('Fout', 'Kon dossier-eigenaar niet bijwerken.');
        else showSuccess('Dossier-eigenaar bijgewerkt.');
    };

    const openTpBuilder = async () => {
        setTpOpening(true);
        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            const { data: existing, error: findError } = await (supabase as any)
                .from('tp_instances')
                .select('id')
                .eq('employee_id', employeeId)
                .eq('layout_key', 'tp_2026')
                .eq('status', 'draft')
                .maybeSingle();

            if (findError && findError.code !== 'PGRST116') {
                showError('Fout', 'Kon bestaande TP draft niet ophalen.');
                return;
            }

            let tpInstanceId = existing?.id as string | undefined;
            if (!tpInstanceId) {
                const { data: inserted, error: insertError } = await (supabase as any)
                    .from('tp_instances')
                    .insert({
                        employee_id: employeeId,
                        layout_key: 'tp_2026',
                        title: 'Trajectplan',
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

            guardedRouter.push(`/dashboard/tp/${employeeId}/${tpInstanceId}`);
        } catch (error) {
            console.error(error);
            showError('Fout', 'Kon TP bouwer niet openen.');
        } finally {
            setTpOpening(false);
        }
    };

    const openVgrBuilder = async () => {
        setVgrOpening(true);
        try {
            guardedRouter.push(`/dashboard/vgr/${employeeId}`);
        } catch (error) {
            console.error(error);
            showError('Fout', 'Kon VGR bouwer niet openen.');
        } finally {
            setVgrOpening(false);
        }
    };

    const openIntakeBuilder = async () => {
        setIntakeOpening(true);
        try {
            guardedRouter.push(`/dashboard/intake/${employeeId}`);
        } catch (error) {
            console.error(error);
            showError('Fout', 'Kon Intake bouwer niet openen.');
        } finally {
            setIntakeOpening(false);
        }
    };

    const openDocument = (kind: 'intake' | 'tp' | 'vgr' | 'cv') => {
        if (kind === 'intake') void openIntakeBuilder();
        else if (kind === 'tp') void openTpBuilder();
        else if (kind === 'vgr') void openVgrBuilder();
        else guardedRouter.push(`/dashboard/cv/${employeeId}`);
    };

    const acceptValidatedFacts = async () => {
        if (!pendingFacts) return;
        const saved = await saveWorkerFacts(supabase, employeeId, pendingFacts.proposal, 'confirm', {
            confirmKeys: pendingFacts.conflicts.map((conflict) => conflict.key),
        });
        if (saved.error) {
            showError('Opslaan mislukt', saved.error);
            return;
        }
        setEmployeeDetails((prev) => {
            if (!prev) return prev;
            const next = { ...prev, field_review_status: saved.profileReview, field_content_hash: saved.profileHash };
            for (const key of saved.written) {
                if (key === 'email' || key === 'first_name' || key === 'last_name') continue;
                (next as Record<string, unknown>)[key] = saved.values[key];
            }
            return next;
        });
        setEmployee((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                first_name: typeof saved.values.first_name === 'string' ? saved.values.first_name : prev.first_name,
                last_name: typeof saved.values.last_name === 'string' ? saved.values.last_name : prev.last_name,
                email: typeof saved.values.email === 'string' ? saved.values.email : prev.email,
            };
        });
        setPendingFacts(null);
        showSuccess('Gevalideerde velden bijgewerkt.');
    };

    // Edit mode. Autosave is off while the form is open, so Annuleren can discard everything.
    const startEditing = async () => {
        if (editing || aiLoading || detailsLoad !== 'ready') return;
        if (hasUnsavedChanges) {
            // Flush pending read-mode changes (validations) first; cancel must not undo those.
            try {
                await saveUnified({ silent: true });
            } catch {
                showError('Opslaan mislukt', 'Openstaande wijzigingen konden niet worden opgeslagen. Probeer het opnieuw.');
                return;
            }
        }
        setEditing(true);
    };

    const discardEdits = () => {
        if (savedEmployeeSnapshot) {
            setEmployee((prev) => (prev ? { ...prev, ...savedEmployeeSnapshot } : prev));
        }
        setEmployeeDetails(savedDetailsSnapshot);
        setConfirmDiscardOpen(false);
        setEditing(false);
    };

    const cancelEditing = () => {
        if (hasUnsavedChanges) {
            setConfirmDiscardOpen(true);
            return;
        }
        setEditing(false);
    };

    const saveAndCloseEditing = async () => {
        if (!hasUnsavedChanges) {
            setEditing(false);
            return;
        }
        try {
            await saveUnified();
            setEditing(false);
        } catch {
            // saveUnified already reported the error; stay in the form so nothing is lost.
        }
    };

    /** "Opnieuw" after a failed autosave in read mode. */
    const retryFailedSave = async () => {
        try {
            await saveUnified();
            setGuardEpoch((epoch) => epoch + 1);
        } catch {
            // saveUnified already reported the error; the retry link stays visible.
        }
    };

    // The loaded client list answers immediately after an employer change; clientName arrives a request later.
    const employerName = useMemo(
        () => clients.find((client) => client.id === employee?.client_id)?.name ?? clientName,
        [clients, employee?.client_id, clientName]
    );

    const profileView = useMemo(
        () =>
            buildEmployeeProfileView({
                firstName: employee?.first_name,
                lastName: employee?.last_name,
                email: employee?.email,
                clientName: employerName,
                details: currentDetailsPayload,
            }),
        [employee?.first_name, employee?.last_name, employee?.email, employerName, currentDetailsPayload]
    );

    const pageReady =
        employeeLoad === 'ready' && detailsLoad !== 'loading' && clientsLoaded && documentsLoaded;
    const backToEmployees = () => guardedRouter.push('/dashboard/employees');
    const suggestedReferentName = suggestedReferent
        ? [suggestedReferent.first_name, suggestedReferent.last_name].filter(Boolean).join(' ').trim() || '—'
        : null;

    return (
        <div className="flex min-h-full flex-1 flex-col">
            <EmployeeUnsavedGuard
                key={`${editing ? 'edit' : 'read'}-${guardEpoch}`}
                isDirty={hasUnsavedChanges}
                onSave={() => saveUnified({ silent: true })}
                autosave={!editing}
                onAutosaveStatusChange={setAutosaveStatus}
            />
            <ValidatedFactsDialog
                conflicts={pendingFacts?.conflicts ?? null}
                onDismiss={() => setPendingFacts(null)}
                onAccept={() => void acceptValidatedFacts()}
            />

            <div className="@container/page mx-auto w-full max-w-[1280px] space-y-5 px-6 py-5">
                {employeeLoad === 'failed' ? (
                    <EmployeeNotFound onBack={backToEmployees} />
                ) : !pageReady || !employee ? (
                    <EmployeePageSkeleton />
                ) : (
                    <>
                        <EmployeeHeader
                            view={profileView}
                            editing={editing}
                            busy={aiLoading}
                            canEdit={detailsLoad === 'ready'}
                            onBack={backToEmployees}
                            onEdit={() => void startEditing()}
                            onValidate={validateFields}
                        />

                        <div className="grid items-start gap-5 @4xl/page:grid-cols-[minmax(0,1fr)_340px]">
                            <div className="min-w-0">
                                {editing ? (
                                    <ProfileForm
                                        employee={employee}
                                        onEmployeeChange={(patch) =>
                                            setEmployee((prev) => (prev ? { ...prev, ...patch } : prev))
                                        }
                                        details={employeeDetails}
                                        onDetailChange={handleDetailChange}
                                        getStatus={getFieldDisplayStatus}
                                        onValidate={validateField}
                                        clientName={employerName}
                                    />
                                ) : (
                                    <ProfileView
                                        view={profileView}
                                        loadFailed={detailsLoad === 'failed'}
                                        onRetryLoad={() => {
                                            setDetailsLoad('loading');
                                            void fetchEmployeeDetails();
                                        }}
                                        uploadedSourcesCount={uploadedSourcesCount}
                                        aiLoading={aiLoading}
                                        aiCancelling={aiCancelling}
                                        autofillProgress={autofillProgress}
                                        onAutofill={() => void autofillWithAI()}
                                        onCancelAutofill={cancelAiAutofill}
                                        busy={aiLoading}
                                        saveStatus={autosaveStatus}
                                        onRetrySave={() => void retryFailedSave()}
                                        onValidate={validateFields}
                                        onValidateAll={validateAllPendingFields}
                                        onEdit={() => void startEditing()}
                                    />
                                )}
                            </div>

                            <aside
                                aria-label="Documenten, bronnen en dossier"
                                className={cn(
                                    'min-w-0 space-y-5',
                                    // Sticky only when the whole rail fits the viewport; otherwise its last card would be cut off.
                                    !editing &&
                                        '@4xl/page:[@media(min-height:640px)]:sticky @4xl/page:[@media(min-height:640px)]:top-5'
                                )}
                            >
                                <DocumentsCard
                                    statuses={docStatuses}
                                    opening={{ intake: intakeOpening, tp: tpOpening, vgr: vgrOpening }}
                                    onOpen={openDocument}
                                />
                                <SourcesCard
                                    docTypes={docTypes}
                                    documents={documents}
                                    onUpload={(type: EmployeeDocType) => setActiveDocType(type)}
                                    onPreview={(doc, type) =>
                                        setPreviewDoc({ title: doc.name || DOC_LABELS[type], url: doc.url })
                                    }
                                    onDelete={(doc) => setSourceToDelete(doc)}
                                    onOpenGesprek={() => setGesprekOpen(true)}
                                />
                                <DossierCard
                                    clients={clients}
                                    clientId={employee.client_id}
                                    onClientChange={(clientId) => void handleClientChange(clientId)}
                                    referents={referents}
                                    referentId={employee.referent_id}
                                    onReferentChange={(refId) => void handleReferentChange(refId)}
                                    onEditReferent={() => {
                                        setReferentDialogMode('edit');
                                        setReferentDialogOpen(true);
                                    }}
                                    onNewReferent={() => {
                                        setReferentDialogMode('create');
                                        setReferentDialogOpen(true);
                                    }}
                                    ownerId={employee.owner_id}
                                    currentUserId={currentUserId}
                                    onOwnerChange={(ownerId) => void handleOwnerChange(ownerId)}
                                    suggestedReferentName={suggestedReferentName}
                                    suggestedReferentExists={referentExists}
                                    onApplySuggestedReferent={() =>
                                        void (referentExists
                                            ? applySuggestedReferentSet()
                                            : applySuggestedReferentCreate())
                                    }
                                    busy={updating}
                                />
                            </aside>
                        </div>
                    </>
                )}
            </div>

            {editing ? (
                <EditBar
                    dirty={hasUnsavedChanges}
                    saving={updating}
                    onCancel={cancelEditing}
                    onSave={() => void saveAndCloseEditing()}
                />
            ) : null}

            <ConfirmDialog
                open={confirmDiscardOpen}
                onOpenChange={setConfirmDiscardOpen}
                title="Wijzigingen weggooien?"
                description="De wijzigingen in dit formulier worden niet opgeslagen."
                confirmLabel="Weggooien"
                cancelLabel="Verder bewerken"
                variant="destructive"
                onConfirm={discardEdits}
            />

            <ConfirmDialog
                open={!!sourceToDelete}
                onOpenChange={(open) => {
                    if (!open && !deletingSource) setSourceToDelete(null);
                }}
                title="Document verwijderen?"
                description={
                    sourceToDelete
                        ? `${sourceToDelete.name || DOC_LABELS[sourceToDelete.type?.toLowerCase().trim() as EmployeeDocType] || 'Dit document'} wordt verwijderd uit de bronnen van deze werknemer.`
                        : undefined
                }
                confirmLabel="Verwijderen"
                variant="destructive"
                loading={deletingSource}
                onConfirm={confirmDeleteSource}
            />

            {gesprekOpen ? (
                <GesprekPanel
                    employeeId={employeeId}
                    open={gesprekOpen}
                    onOpenChange={setGesprekOpen}
                    hasPublishedVerslag={documents.some(
                        (d) => d.type?.toLowerCase().trim() === 'gespreksverslag'
                    )}
                    onDocumentsChanged={() => {
                        void fetchDocuments();
                    }}
                />
            ) : null}

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

            {employee?.client_id ? (
                <ReferentEditDialog
                    open={referentDialogOpen}
                    onOpenChange={setReferentDialogOpen}
                    mode={referentDialogMode}
                    clientId={employee.client_id}
                    initial={
                        referentDialogMode === 'edit' && employee.referent_id
                            ? referents.find((r) => r.id === employee.referent_id) ?? null
                            : null
                    }
                    onError={(message) => showError('Fout', message)}
                    onSaved={async (referentId) => {
                        await fetchReferents(employee.client_id);
                        if (employee.referent_id === referentId) {
                            showSuccess('Contactpersoon bijgewerkt.');
                            return;
                        }
                        const { error } = await supabase
                            .from('employees')
                            .update({ referent_id: referentId })
                            .eq('id', employeeId);
                        if (error) {
                            showError('Fout', 'Kon werknemer niet koppelen aan contactpersoon.');
                            return;
                        }
                        setEmployee((prev) => (prev ? { ...prev, referent_id: referentId } : null));
                        setSavedEmployeeSnapshot((prev) =>
                            prev ? { ...prev, referent_id: referentId } : prev
                        );
                        showSuccess('Contactpersoon aangemaakt en gekoppeld.');
                    }}
                />
            ) : null}

            <DocumentPreviewDialog
                open={!!previewDoc}
                onOpenChange={(open) => {
                    if (!open) setPreviewDoc(null);
                }}
                title={previewDoc?.title || 'Document'}
                storagePath={previewDoc?.url || null}
            />
        </div>
    );
}
