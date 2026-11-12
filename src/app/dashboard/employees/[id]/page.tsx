'use client';

import { useState, useEffect, use, useMemo, useRef, useCallback } from 'react';
import { useGuardedRouter } from '@/hooks/useGuardedRouter';
import EmployeeUnsavedGuard from '@/components/employee/EmployeeUnsavedGuard';
import { supabase } from '@/lib/supabase/client';
import {
    Save,
    ArrowLeft,
    Briefcase,
    GraduationCap,
    Car,
    Languages,
    Computer,
    Clock,
    Building2,
    Eye,
    Pencil,
    Trash2,
    FolderOpen,
    Files,
    FileText,
    Map,
    Compass,
    IdCard,
    CheckCircle2,
    CircleDashed,
} from 'lucide-react';
import DocumentModal from '@/components/DocumentModal';
import { DocumentPreviewDialog } from '@/components/DocumentPreviewDialog';
import { useToastHelpers } from '@/components/ui/Toast';
import { parseWorkExperience, cn, isAbsentText, normalizePersonName } from '@/lib/utils';
import { INPUT_CLASS, SELECT_CLASS } from '@/lib/select-class';
import { normalizePhoneForStorage } from '@/lib/phone/format-dutch-display';
import {
    COMPUTER_SKILLS_OPTIONS,
    getComputerSkillsDefaultDescription,
    nextComputerSkillsDescriptionOnLevelChange,
} from '@/lib/tp2026/gegevens-field-options';
import { normalizeWorkExperienceTitles } from '@/lib/tp2026/intake-algemene-info';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { trackAccess } from '@/lib/tracking';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OrgUserSelect } from '@/components/users/OrgUserSelect';
import { ReferentEditDialog } from '@/components/employee/ReferentEditDialog';
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
import { saveWorkerFacts, type SkippedValidatedField } from '@/lib/employee/save-worker-facts';
import { ValidatedFactsDialog } from '@/components/employee/ValidatedFactsDialog';
import {
    isIncompleteContractHoursInput,
    parseContractHours,
} from '@/lib/employee/contract-hours';
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
    DUTCH_LANGUAGE_OPTIONS,
    EDUCATION_LEVEL_CUSTOM_SELECT_VALUE,
    EDUCATION_LEVEL_OPTIONS,
    TRANSPORT_TYPE_OPTIONS,
    addCustomTransportType,
    coerceEducationLevelInput,
    getCustomEducationLevelLabel,
    normalizeEducationLevel,
    removeTransportType,
    repairEmployeeEducationFields,
    splitTransportTypes,
} from '@/lib/tp2026/gegevens-field-options';
import GesprekPanel from '@/components/employee/GesprekPanel';
import { fetchOrgDirectory, formatOrgUserDisplayName, type OrgDirectoryUser } from '@/lib/users/org-directory';
import { FieldValidateButton } from '@/components/employee/FieldValidateButton';
import { ValidatableField } from '@/components/employee/ValidatableField';
import { WorkerProfileSummary } from '@/components/employee/WorkerProfileSummary';
import { buildWorkerProfileView } from '@/lib/employee/worker-profile-summary';
import {
    EMPLOYEE_DOC_LABELS,
    visibleEmployeeDocTypes,
} from '@/lib/documents/employee-doc-types';

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
    const [profileMode, setProfileMode] = useState<'summary' | 'edit'>('summary');
    const [orgUsers, setOrgUsers] = useState<OrgDirectoryUser[]>([]);
    const [contractHoursText, setContractHoursText] = useState<string | null>(null);
    const [sourcesModalOpen, setSourcesModalOpen] = useState(false);
    const [sourcesView, setSourcesView] = useState<'list' | 'gesprek'>('list');
    const [docsModalOpen, setDocsModalOpen] = useState(false);
    const gesprekDirtyRef = useRef(false);
    const onGesprekDirty = useCallback((dirty: boolean) => {
        gesprekDirtyRef.current = dirty;
    }, []);
    const [referentDialogOpen, setReferentDialogOpen] = useState(false);
    const [referentDialogMode, setReferentDialogMode] = useState<'edit' | 'create'>('edit');
    const [tpOpening, setTpOpening] = useState(false);
    const [vgrOpening, setVgrOpening] = useState(false);
    const [intakeOpening, setIntakeOpening] = useState(false);
    const [customTransportDraft, setCustomTransportDraft] = useState('');
    const [customEducationDraft, setCustomEducationDraft] = useState('');
    const [educationAndereOpen, setEducationAndereOpen] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{
        title: string;
        url: string;
    } | null>(null);

    const docTypes = useMemo(() => visibleEmployeeDocTypes(), []);

    const uploadedSourcesCount = useMemo(
        () =>
            docTypes.filter((type) =>
                documents.some((d) => d.type?.toLowerCase().trim() === type)
            ).length,
        [docTypes, documents]
    );

    useEffect(() => {
        let cancelled = false;
        void fetchOrgDirectory(supabase).then((users) => {
            if (!cancelled) setOrgUsers(users);
        });
        return () => {
            cancelled = true;
        };
    }, []);

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

        const mapped = mapEmployeeRow(data);
        setEmployee(mapped);
        setSavedEmployeeSnapshot(toEditableEmployeePayload(mapped));
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
            setSavedDetailsSnapshot(null);
        }
    };

    const fetchClients = async () => {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('name');

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
        }
    };

    const deleteSourceDocument = async (doc: Document) => {
        if (!confirm('Weet je zeker dat je dit document wilt verwijderen?')) return;
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

    const getFieldStatusClass = (status: 'empty' | 'review' | 'validated') => {
        if (status === 'review') return 'border-amber-300';
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
        cn(INPUT_CLASS, getFieldStatusClass(getFieldDisplayStatus(field)));

    const selectFieldClass = (field: EmployeeDetailFieldKey) =>
        cn(SELECT_CLASS, getFieldStatusClass(getFieldDisplayStatus(field)));

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

            setDocsModalOpen(false);
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
            setDocsModalOpen(false);
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
            setDocsModalOpen(false);
            guardedRouter.push(`/dashboard/intake/${employeeId}`);
        } catch (error) {
            console.error(error);
            showError('Fout', 'Kon Intake bouwer niet openen.');
        } finally {
            setIntakeOpening(false);
        }
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

    const cancelProfileEdit = () => {
        if (savedEmployeeSnapshot) {
            setEmployee((prev) => (prev ? { ...prev, ...savedEmployeeSnapshot } : prev));
            if (savedEmployeeSnapshot.client_id) {
                void fetchClient(savedEmployeeSnapshot.client_id);
                void fetchReferents(savedEmployeeSnapshot.client_id);
            } else {
                setClientName('');
                setReferents([]);
            }
        }
        setEmployeeDetails(savedDetailsSnapshot);
        setContractHoursText(null);
        setCustomTransportDraft('');
        setCustomEducationDraft('');
        setEducationAndereOpen(false);
        setProfileMode('summary');
    };

    const confirmProfileEdit = async () => {
        try {
            await saveUnified({ silent: !hasUnsavedChanges });
            setProfileMode('summary');
        } catch {
            // saveUnified already reports the error and keeps the form open.
        }
    };

    const profileView = useMemo(() => {
        if (!employee) return buildWorkerProfileView({});
        const referent = referents.find((item) => item.id === employee.referent_id);
        const owner = orgUsers.find((user) => user.id === employee.owner_id);
        return buildWorkerProfileView({
            firstName: employee.first_name,
            lastName: employee.last_name,
            email: employee.email,
            phone: employeeDetails?.phone,
            gender: employeeDetails?.gender,
            dateOfBirth: employeeDetails?.date_of_birth,
            currentJob: employeeDetails?.current_job,
            workExperience: employeeDetails?.work_experience,
            contractHours: employeeDetails?.contract_hours,
            otherEmployers: employeeDetails?.other_employers,
            isExWerknemer: employeeDetails?.is_ex_werknemer,
            educationLevel: employeeDetails?.education_level,
            educationName: employeeDetails?.education_name,
            driversLicense: employeeDetails?.drivers_license,
            driversLicenseType: employeeDetails?.drivers_license_type,
            transportType: employeeDetails?.transport_type,
            dutchSpeaking: employeeDetails?.dutch_speaking,
            dutchWriting: employeeDetails?.dutch_writing,
            dutchReading: employeeDetails?.dutch_reading,
            hasComputer: employeeDetails?.has_computer,
            computerSkills: employeeDetails?.computer_skills,
            computerSkillsDescription: employeeDetails?.computer_skills_description,
            clientName,
            referentName: [referent?.first_name, referent?.last_name].filter(Boolean).join(' ').trim(),
            ownerName: owner ? formatOrgUserDisplayName(owner) : '',
        });
    }, [employee, employeeDetails, clientName, referents, orgUsers]);

    return (
        <div className="p-4 space-y-6">
            <EmployeeUnsavedGuard
                isDirty={hasUnsavedChanges}
                onSave={() => saveUnified({ silent: true })}
            />
            <ValidatedFactsDialog
                conflicts={pendingFacts?.conflicts ?? null}
                onDismiss={() => setPendingFacts(null)}
                onAccept={() => void acceptValidatedFacts()}
            />
            <div className="flex items-start gap-2">
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5 h-8 w-8 shrink-0 text-gray-600"
                    aria-label="Terug naar werknemers"
                    onClick={() => guardedRouter.push('/dashboard/employees')}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                    <div className="min-w-0">
                        <h1 className="truncate text-xl font-semibold text-gray-900">{profileView.name}</h1>
                        {profileView.subtitle ? (
                            <p className="mt-0.5 text-sm text-gray-700">{profileView.subtitle}</p>
                        ) : null}
                    </div>
                    {employee ? (
                        <div className="flex shrink-0 items-center gap-3">
                            {profileMode === 'summary' ? (
                                <>
                                    {pendingValidationFields.length > 0 ? (
                                        <span className="text-sm text-gray-500">
                                            {pendingValidationFields.length} te controleren
                                        </span>
                                    ) : null}
                                    <Button type="button" variant="outline" size="sm" onClick={() => setProfileMode('edit')}>
                                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                        Bewerken
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button type="button" variant="outline" size="sm" onClick={cancelProfileEdit} disabled={updating}>
                                        Annuleren
                                    </Button>
                                    <Button type="button" size="sm" onClick={() => void confirmProfileEdit()} disabled={updating}>
                                        <Save className="mr-1.5 h-3.5 w-3.5" />
                                        {updating ? 'Opslaan...' : 'Opslaan'}
                                    </Button>
                                </>
                            )}
                        </div>
                    ) : null}
                </div>
            </div>

            {employee && (
                <div className="flex flex-col items-start gap-4 lg:flex-row">
                    {(profileMode === 'edit' || profileView.groups.length > 0 || profileView.isEmpty) && (
                    <div className={profileMode === 'summary'
                        ? 'w-full shrink-0 rounded-lg border border-gray-200 bg-white p-4 lg:w-[360px]'
                        : 'min-w-0 w-full flex-1 rounded-lg border border-gray-200 bg-white p-4'
                    }>
                        {profileMode === 'summary' ? (
                            <WorkerProfileSummary profile={profileView} />
                        ) : (
                        <>
                        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
                            <Button
                                type="button"
                                onClick={autofillWithAI}
                                disabled={aiLoading}
                                variant="outline"
                                size="sm"
                            >
                                {aiLoading ? 'AI uitvoeren...' : 'Invullen met AI'}
                            </Button>
                            <Button
                                type="button"
                                onClick={validateAllPendingFields}
                                disabled={aiLoading || pendingValidationFields.length === 0 || updating}
                                variant="outline"
                                size="sm"
                            >
                                Valideer alles
                            </Button>
                        </div>
                        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Persoon</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2 items-start">
                            <input
                                className={INPUT_CLASS}
                                placeholder="Voornaam"
                                value={employee.first_name || ''}
                                onChange={(e) => setEmployee({ ...employee, first_name: e.target.value })}
                            />
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

                            <input
                                className={INPUT_CLASS}
                                placeholder="Achternaam"
                                value={employee.last_name || ''}
                                onChange={(e) => setEmployee({ ...employee, last_name: e.target.value })}
                            />
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

                            <input
                                className={INPUT_CLASS}
                                placeholder="E-mail"
                                value={employee.email || ''}
                                onChange={(e) => setEmployee({ ...employee, email: e.target.value })}
                            />
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
                        </>
                        )}

                        {profileMode === 'edit' ? (
                        <>
                        <div className="space-y-3 border-t border-gray-100 pt-4">
                            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Toewijzing</p>
                            <div
                                className={cn(
                                    'grid gap-2 min-w-0',
                                    employee.client_id ? 'grid-cols-2' : 'grid-cols-1'
                                )}
                            >
                                <div className="space-y-1 min-w-0">
                                    <label className="text-sm text-gray-600">Dossier-eigenaar</label>
                                    <OrgUserSelect
                                        supabase={supabase}
                                        value={employee.owner_id}
                                        currentUserId={currentUserId}
                                        allowNone
                                        noneLabel="— Geen eigenaar —"
                                        placeholder="Selecteer eigenaar"
                                        onChange={async (ownerId) => {
                                            setEmployee((prev) => (prev ? { ...prev, owner_id: ownerId } : null));
                                            const { error } = await supabase
                                                .from('employees')
                                                .update({ owner_id: ownerId })
                                                .eq('id', employeeId);
                                            if (error) showError('Fout', 'Kon dossier-eigenaar niet bijwerken.');
                                            else showSuccess('Dossier-eigenaar bijgewerkt.');
                                        }}
                                    />
                                </div>
                                {employee.client_id ? (
                                    <div className="space-y-1 min-w-0">
                                        <label className="text-sm text-gray-600">Contactpersoon</label>
                                        <div className="flex flex-wrap items-center gap-2">
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
                                                <SelectTrigger className={cn(SELECT_CLASS, 'min-w-0 flex-1')}>
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
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0"
                                                disabled={!employee.referent_id}
                                                title="Contactpersoon bewerken"
                                                onClick={() => {
                                                    setReferentDialogMode('edit');
                                                    setReferentDialogOpen(true);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="shrink-0"
                                                title="Nieuwe contactpersoon"
                                                onClick={() => {
                                                    setReferentDialogMode('create');
                                                    setReferentDialogOpen(true);
                                                }}
                                            >
                                                Nieuw
                                            </Button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            <div className="space-y-1 min-w-0">
                                <label className="text-sm text-gray-600">Werkgever</label>
                                <Select
                                    value={employee.client_id || undefined}
                                    onValueChange={(v) => {
                                        setEmployee({ ...employee, client_id: v, referent_id: v ? employee.referent_id : null });
                                        fetchClient(v);
                                        if (v) fetchReferents(v);
                                        else setReferents([]);
                                    }}
                                >
                                    <SelectTrigger className={SELECT_CLASS}>
                                        <SelectValue placeholder="Selecteer werkgever" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((client) => (
                                            <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-6 border-t border-gray-100 pt-4">
                {aiLoading && autofillProgress ? (
                    <AutofillProgressOverlay
                        progress={autofillProgress}
                        title="Invullen met AI"
                        onCancel={cancelAiAutofill}
                        cancelling={aiCancelling}
                    />
                ) : null}
                {suggestedReferent && employee?.client_id ? (
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
                ) : null}
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Werk</p>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                            type="text"
                            inputMode="decimal"
                            placeholder="Bijv. 36.5"
                            value={
                                contractHoursText !== null
                                    ? contractHoursText
                                    : employeeDetails?.contract_hours != null
                                      ? String(employeeDetails.contract_hours)
                                      : ''
                            }
                            onFocus={() => {
                                setContractHoursText(
                                    employeeDetails?.contract_hours != null
                                        ? String(employeeDetails.contract_hours)
                                        : ''
                                );
                            }}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw !== '' && !/^[\d.,]*$/.test(raw)) return;
                                setContractHoursText(raw);
                                if (raw.trim() === '') {
                                    handleDetailChange('contract_hours', null);
                                    return;
                                }
                                if (isIncompleteContractHoursInput(raw)) return;
                                const parsed = parseContractHours(raw);
                                if (parsed != null) {
                                    handleDetailChange('contract_hours', parsed);
                                }
                            }}
                            onBlur={() => {
                                const raw = contractHoursText;
                                setContractHoursText(null);
                                if (raw == null) return;
                                if (raw.trim() === '') {
                                    handleDetailChange('contract_hours', null);
                                    return;
                                }
                                const parsed = parseContractHours(raw);
                                handleDetailChange('contract_hours', parsed);
                            }}
                        />
                    </ValidatableField>
                </div>
                
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
                            className={cn(fieldClass('work_experience'), 'h-auto min-h-[60px] pr-10')}
                            placeholder="Functietitels, komma-gescheiden (bijv. Magazijnmedewerker, Teamleider)"
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
                            {(() => {
                                const storedCustom = getCustomEducationLevelLabel(
                                    employeeDetails?.education_level
                                );
                                const showAndere = educationAndereOpen || !!storedCustom;
                                const selectValue = showAndere
                                    ? EDUCATION_LEVEL_CUSTOM_SELECT_VALUE
                                    : normalizeEducationLevel(employeeDetails?.education_level) ??
                                      undefined;
                                const draftValue =
                                    educationAndereOpen || customEducationDraft
                                        ? customEducationDraft
                                        : storedCustom;
                                const commitCustomEducation = () => {
                                    const next = coerceEducationLevelInput(draftValue);
                                    if (!next) return;
                                    handleDetailChange('education_level', next);
                                    setEducationAndereOpen(false);
                                    setCustomEducationDraft('');
                                };
                                return (
                                    <div className="space-y-2">
                                        <Select
                                            value={selectValue}
                                            onValueChange={(v) => {
                                                if (v === EDUCATION_LEVEL_CUSTOM_SELECT_VALUE) {
                                                    setEducationAndereOpen(true);
                                                    setCustomEducationDraft(storedCustom);
                                                    return;
                                                }
                                                setEducationAndereOpen(false);
                                                setCustomEducationDraft('');
                                                handleDetailChange('education_level', v);
                                            }}
                                        >
                                            <SelectTrigger
                                                className={cn(
                                                    selectFieldClass('education_level'),
                                                    'pr-10'
                                                )}
                                            >
                                                <SelectValue placeholder="Selecteer opleidingsniveau" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {EDUCATION_LEVEL_OPTIONS.map((level) => (
                                                    <SelectItem key={level} value={level}>
                                                        {level}
                                                    </SelectItem>
                                                ))}
                                                <SelectItem value={EDUCATION_LEVEL_CUSTOM_SELECT_VALUE}>
                                                    Andere
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {showAndere && (
                                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                                <Input
                                                    value={draftValue}
                                                    onChange={(e) => {
                                                        setEducationAndereOpen(true);
                                                        setCustomEducationDraft(e.target.value);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            commitCustomEducation();
                                                        }
                                                    }}
                                                    placeholder="Bijv. Buitenlands diploma"
                                                    className="h-9 bg-white"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="shrink-0 border-purple-300 text-purple-700 hover:bg-purple-50"
                                                    onClick={commitCustomEducation}
                                                >
                                                    Toevoegen
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
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

                {/* Checkboxes for drivers_license, has_computer, is_ex_werknemer */}
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {([
                        { key: 'drivers_license', label: 'Rijbewijs' },
                        { key: 'has_computer', label: 'Heeft PC' },
                        { key: 'is_ex_werknemer', label: 'Ex-werknemer' },
                    ] as const).map(({ key, label }) => (
                        <label 
                            key={key} 
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <input 
                                type="checkbox" 
                                checked={Boolean(employeeDetails?.[key as keyof EmployeeDetails])} 
                                onChange={e => handleDetailChange(key as keyof EmployeeDetails, e.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-gray-900"
                            />
                            <span className="text-sm text-gray-700">{label}</span>
                            <FieldValidateButton
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    validateField(key as EmployeeDetailFieldKey);
                                }}
                                disabled={!canValidateField(key as EmployeeDetailFieldKey)}
                                label={`Valideer ${label}`}
                                className="ml-1"
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
                    {(() => {
                        const current = Array.isArray(employeeDetails?.transport_type)
                            ? employeeDetails.transport_type
                            : [];
                        const { custom } = splitTransportTypes(current);
                        const commitCustom = () => {
                            const next = addCustomTransportType(current, customTransportDraft);
                            if (next === current) {
                                setCustomTransportDraft('');
                                return;
                            }
                            handleDetailChange('transport_type', next);
                            setCustomTransportDraft('');
                        };
                        return (
                            <div className="mt-3 space-y-2">
                                {custom.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {custom.map((label) => (
                                            <span
                                                key={label}
                                                className="inline-flex items-center gap-1.5 rounded-full border border-purple-300 bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800"
                                            >
                                                {label}
                                                <button
                                                    type="button"
                                                    aria-label={`Verwijder ${label}`}
                                                    className="rounded-full px-1 text-purple-600 hover:bg-purple-200 hover:text-purple-900"
                                                    onClick={() =>
                                                        handleDetailChange(
                                                            'transport_type',
                                                            removeTransportType(current, label)
                                                        )
                                                    }
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <span className="text-xs font-medium text-gray-600 shrink-0">Andere</span>
                                    <Input
                                        value={customTransportDraft}
                                        onChange={(e) => setCustomTransportDraft(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                commitCustom();
                                            }
                                        }}
                                        placeholder="Bijv. Scootmobiel"
                                        className="h-9 bg-white sm:max-w-xs"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="shrink-0 border-purple-300 text-purple-700 hover:bg-purple-50"
                                        onClick={commitCustom}
                                    >
                                        Toevoegen
                                    </Button>
                                </div>
                            </div>
                        );
                    })()}
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
                                        {DUTCH_LANGUAGE_OPTIONS.map((level) => (
                                            <SelectItem key={level} value={level}>{level}</SelectItem>
                                        ))}
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
                                        {DUTCH_LANGUAGE_OPTIONS.map((level) => (
                                            <SelectItem key={level} value={level}>{level}</SelectItem>
                                        ))}
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
                                        {DUTCH_LANGUAGE_OPTIONS.map((level) => (
                                            <SelectItem key={level} value={level}>{level}</SelectItem>
                                        ))}
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
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <Select
                                value={employeeDetails?.computer_skills || undefined}
                                onValueChange={(v) => handleDetailChange('computer_skills', v)}
                            >
                                <SelectTrigger className={cn(selectFieldClass('computer_skills'), 'pr-10 sm:w-44')}>
                                    <SelectValue placeholder="Niveau" />
                                </SelectTrigger>
                                <SelectContent>
                                    {COMPUTER_SKILLS_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.value} - {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {employeeDetails?.computer_skills &&
                            employeeDetails.computer_skills !== '1' ? (
                                <div className="flex min-w-0 flex-1 items-center gap-1 text-sm text-gray-700">
                                    <span className="shrink-0 text-muted-foreground">(</span>
                                    <Input
                                        className={cn(
                                            selectFieldClass('computer_skills_description'),
                                            'min-w-0 flex-1'
                                        )}
                                        value={
                                            employeeDetails.computer_skills_description ??
                                            getComputerSkillsDefaultDescription(
                                                employeeDetails.computer_skills
                                            )
                                        }
                                        onChange={(e) =>
                                            handleDetailChange(
                                                'computer_skills_description',
                                                e.target.value
                                            )
                                        }
                                        placeholder={getComputerSkillsDefaultDescription(
                                            employeeDetails.computer_skills
                                        )}
                                    />
                                    <span className="shrink-0 text-muted-foreground">)</span>
                                </div>
                            ) : null}
                        </div>
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
                            className={cn(fieldClass('other_employers'), 'h-auto min-h-[100px] pr-10')}
                            placeholder="Vul hier andere huidige werkgevers in (bij meerdere banen), niet de hoofdwerkgever..."
                            value={isAbsentText(employeeDetails?.other_employers) ? 'Geen' : (employeeDetails?.other_employers || 'Geen')}
                            onChange={e => handleDetailChange('other_employers', e.target.value)}
                        />
                    </ValidatableField>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <span className="text-purple-500">ℹ️</span>
                        Vul hier alleen andere huidige werkgevers in (bij meerdere banen), niet de hoofdwerkgever ({clientName})
                    </p>
                </div>

                        </div>
                        </>
                        ) : null}
                    </div>
                    )}

                    <div className="w-full shrink-0 rounded-lg border border-gray-200 bg-white lg:w-[360px]">
                        <div className="flex flex-col gap-2 border-b border-gray-100 p-3">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 justify-start"
                                onClick={() => {
                                    setSourcesView('list');
                                    setSourcesModalOpen(true);
                                }}
                            >
                                <FolderOpen className="mr-2 h-4 w-4" />
                                Bronnen beheren
                                <span className="ml-auto text-xs font-normal text-gray-500">
                                    {uploadedSourcesCount} van {docTypes.length}
                                </span>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                className="h-9 justify-start"
                                onClick={() => setDocsModalOpen(true)}
                            >
                                <Files className="mr-2 h-4 w-4" />
                                Documenten maken
                            </Button>
                        </div>
                        <ul>
                            {docTypes.map((type) => {
                                const doc = documents.find((item) => item.type?.toLowerCase().trim() === type);
                                return (
                                    <li key={type} className="flex h-9 items-center gap-2 border-b border-gray-100 px-3 last:border-b-0">
                                        <FileText className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                                        <button
                                            type="button"
                                            className="min-w-0 flex-1 truncate text-left text-sm text-gray-900"
                                            onClick={() => {
                                                if (type === 'gespreksverslag') {
                                                    setSourcesView('gesprek');
                                                    setSourcesModalOpen(true);
                                                    return;
                                                }
                                                setActiveDocType(type);
                                            }}
                                        >
                                            {DOC_LABELS[type]}
                                        </button>
                                        <span className="shrink-0 text-xs text-gray-500">
                                            {doc ? 'geüpload' : 'ontbreekt'}
                                        </span>
                                    </li>
                                );
                            })}
                        </ul>
                        <Dialog
                            open={sourcesModalOpen}
                            onOpenChange={(open) => {
                                if (!open && sourcesView === 'gesprek' && gesprekDirtyRef.current) {
                                    if (!window.confirm('Er zijn niet-opgeslagen wijzigingen. Toch sluiten?')) return;
                                }
                                setSourcesModalOpen(open);
                                if (!open) setSourcesView('list');
                            }}
                        >
                            <DialogContent
                                className={
                                    sourcesView === 'gesprek'
                                        ? 'flex h-[92vh] max-h-[92vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden sm:max-w-[1400px]'
                                        : 'max-w-md sm:max-w-lg'
                                }
                                onOpenAutoFocus={(e) => e.preventDefault()}
                            >
                                {sourcesView === 'gesprek' ? (
                                    <GesprekPanel
                                        embedded
                                        employeeId={employeeId}
                                        open={sourcesModalOpen}
                                        onOpenChange={setSourcesModalOpen}
                                        onBack={() => setSourcesView('list')}
                                        hasPublishedVerslag={documents.some(
                                            (d) => d.type?.toLowerCase().trim() === 'gespreksverslag'
                                        )}
                                        onDirtyChange={onGesprekDirty}
                                        onDocumentsChanged={() => {
                                            void fetchDocuments();
                                        }}
                                    />
                                ) : (
                                    <>
                                        <DialogHeader>
                                            <DialogTitle className="flex items-center gap-2 text-gray-900">
                                                <FolderOpen className="h-5 w-5 text-gray-500" />
                                                Bronnen
                                            </DialogTitle>
                                            <p className="text-sm text-gray-600">
                                                {uploadedSourcesCount} van {docTypes.length} binnen
                                            </p>
                                        </DialogHeader>
                                        <div className="grid grid-cols-2 gap-2 pt-1">
                                            {docTypes.map((type) => {
                                                const doc = documents.find((item) => item.type?.toLowerCase().trim() === type);
                                                return (
                                                    <div key={type} className="rounded-lg border border-gray-200 p-3">
                                                        <button
                                                            type="button"
                                                            className="w-full text-left"
                                                            onClick={() => {
                                                                if (type === 'gespreksverslag') {
                                                                    setSourcesView('gesprek');
                                                                    return;
                                                                }
                                                                setSourcesModalOpen(false);
                                                                setActiveDocType(type);
                                                            }}
                                                        >
                                                            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-900">
                                                                {doc ? (
                                                                    <CheckCircle2 className="h-4 w-4 shrink-0 text-gray-500" />
                                                                ) : (
                                                                    <CircleDashed className="h-4 w-4 shrink-0 text-gray-400" />
                                                                )}
                                                                {DOC_LABELS[type]}
                                                            </span>
                                                            <span className="mt-1 block text-xs text-gray-500">
                                                                {type === 'gespreksverslag'
                                                                    ? doc ? 'Notities bewaard' : 'Transcript en notities'
                                                                    : doc ? 'geüpload' : 'ontbreekt'}
                                                            </span>
                                                        </button>
                                                        {doc && type !== 'gespreksverslag' ? (
                                                            <div className="mt-2 flex gap-1">
                                                                <button
                                                                    type="button"
                                                                    title="Bekijken"
                                                                    aria-label="Bekijken"
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                                                    onClick={() => {
                                                                        setSourcesModalOpen(false);
                                                                        setPreviewDoc({
                                                                            title: doc.name || DOC_LABELS[type],
                                                                            url: doc.url,
                                                                        });
                                                                    }}
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    title="Verwijderen"
                                                                    aria-label="Verwijderen"
                                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-600"
                                                                    onClick={() => void deleteSourceDocument(doc)}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </DialogContent>
                        </Dialog>
                        <Dialog open={docsModalOpen} onOpenChange={setDocsModalOpen}>
                            <DialogContent className="max-w-md sm:max-w-lg">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2 text-gray-900">
                                        <Files className="h-5 w-5 text-gray-500" />
                                        Documenten maken
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col gap-2 pt-1">
                                    <Button type="button" variant="outline" className="justify-start" onClick={() => void openIntakeBuilder()} disabled={intakeOpening}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        {intakeOpening ? 'Intake openen…' : 'Intake'}
                                    </Button>
                                    <Button type="button" variant="outline" className="justify-start" onClick={() => void openTpBuilder()} disabled={tpOpening}>
                                        <Map className="mr-2 h-4 w-4" />
                                        {tpOpening ? 'Trajectplan openen…' : 'Trajectplan'}
                                    </Button>
                                    <Button type="button" variant="outline" className="justify-start" onClick={() => void openVgrBuilder()} disabled={vgrOpening}>
                                        <Compass className="mr-2 h-4 w-4" />
                                        {vgrOpening ? 'VGR openen…' : 'VGR'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="justify-start"
                                        onClick={() => {
                                            setDocsModalOpen(false);
                                            guardedRouter.push(`/dashboard/cv/${employeeId}`);
                                        }}
                                    >
                                        <IdCard className="mr-2 h-4 w-4" />
                                        CV
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            )}

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