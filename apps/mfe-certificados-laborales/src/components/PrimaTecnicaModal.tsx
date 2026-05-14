import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  PencilLine,
  Percent,
  Plus,
  RotateCcw,
  Save,
  Search,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  certificadosService,
  type PrimaTecnicaCategoriaConfig,
} from '../../services/api/certificados.service';
import { PaginationPremium } from '../shared/PaginationPremium';

type PrimaTecnicaCategoria = string;

type PrimaTecnicaCandidato = {
  requestId: string;
  fullName: string;
  idNumber: string;
  status?: string;
};

type PrimaTecnicaRegistro = {
  id: string;
  category: PrimaTecnicaCategoria;
  request_id: string | null;
  full_name: string;
  id_number: string;
  percentage: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

type PrimaTecnicaBulkRow = {
  rowNumber: number;
  fullName?: string;
  idNumber?: string;
  percentage?: number | string;
  percentageHasSymbol?: boolean;
};

type PrimaTecnicaBulkValidatedRow = {
  rowNumber: number;
  fullName: string;
  idNumber: string;
  percentage: string;
  normalizedPercentage: number | null;
  errors: string[];
  isValid: boolean;
};

type PrimaTecnicaBulkResult = {
  category: PrimaTecnicaCategoria;
  summary: {
    total: number;
    success: number;
    failed: number;
    created: number;
    updated: number;
  };
  results: Array<{
    rowNumber: number;
    status: 'success' | 'error';
    id_number?: string;
    full_name?: string;
    percentage?: number;
    action?: 'created' | 'updated';
    message: string;
    record?: {
      id: string;
      category: PrimaTecnicaCategoria;
      request_id: string | null;
      full_name: string;
      id_number: string;
      percentage: number;
      created_by?: string | null;
      updated_by?: string | null;
      created_at: string;
      updated_at: string;
      action: 'created' | 'updated';
    };
  }>;
};

type EstadoCategoria = Record<
  PrimaTecnicaCategoria,
  {
    selected: PrimaTecnicaCandidato | null;
    percentage: string;
  }
>;

interface PrimaTecnicaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OLD_CATEGORY_META_DISABLED: Record<
  PrimaTecnicaCategoria,
  { label: string; description: string; icon: typeof Building2 }
> = {
  DIRECTIVOS: {
    label: 'Directivos',
    description: 'Gestión de porcentajes para directivos.',
    icon: Building2,
  },
  COORDINADORES: {
    label: 'Coordinadores',
    description: 'Gestión de porcentajes para coordinadores.',
    icon: Users,
  },
};

const FALLBACK_CATEGORIES: PrimaTecnicaCategoriaConfig[] = [
  {
    id: 'DIRECTIVOS',
    category: 'DIRECTIVOS',
    label: 'Directivos',
    description: 'Gestion de porcentajes para directivos.',
    template_text:
      'Percibe una prima técnica en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
    default_template_text:
      'Percibe una prima técnica en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
    display_order: 10,
    is_system: true,
    is_active: true,
  },
  {
    id: 'COORDINADORES',
    category: 'COORDINADORES',
    label: 'Coordinadores',
    description: 'Gestion de porcentajes para coordinadores.',
    template_text:
      'Percibe una prima de coordinación en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
    default_template_text:
      'Percibe una prima de coordinación en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
    display_order: 20,
    is_system: true,
    is_active: true,
  },
];

const getCategoryIcon = (category: PrimaTecnicaCategoria) => {
  if (category === 'DIRECTIVOS') return Building2;
  if (category === 'COORDINADORES') return Users;
  return FileText;
};

const formatCategoryLabel = (category: PrimaTecnicaCategoria) =>
  String(category || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ') || 'Prima';

const buildCategoryState = (
  categories: PrimaTecnicaCategoriaConfig[],
  previous: EstadoCategoria = {},
): EstadoCategoria =>
  categories.reduce<EstadoCategoria>((acc, item) => {
    acc[item.category] = previous[item.category] || { selected: null, percentage: '' };
    return acc;
  }, {});

const buildCategoryRecordMap = <T,>(
  categories: PrimaTecnicaCategoriaConfig[],
  fallback: T,
): Record<PrimaTecnicaCategoria, T> =>
  categories.reduce<Record<PrimaTecnicaCategoria, T>>((acc, item) => {
    acc[item.category] = fallback;
    return acc;
  }, {});

const normalizeIdNumber = (value?: string | null) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const digits = raw.replace(/\D+/g, '');
  return digits || raw;
};

const formatDateTime = (value?: string) => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
  return parsed.toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPercentage = (value: number) =>
  `${Number(value || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;

const sanitizePercentageInput = (rawValue: string) => {
  const normalized = String(rawValue || '').replace(',', '.').replace(/[^0-9.]/g, '');
  const dots = normalized.match(/\./g) || [];
  if (dots.length > 1) return null;
  return normalized;
};

const formatEditablePercentage = (value: number) => {
  const normalized = Number(value || 0);
  if (!Number.isFinite(normalized)) return '';
  return normalized
    .toFixed(2)
    .replace(/\.00$/, '')
    .replace(/(\.\d*[1-9])0+$/, '$1');
};

const normalizeHeaderText = (value?: string | null) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getHeaderIndex = (headers: string[], aliases: string[]) => {
  const normalizedAliases = aliases.map((alias) => normalizeHeaderText(alias));
  return headers.findIndex((header) => normalizedAliases.includes(normalizeHeaderText(header)));
};

const TEMPLATE_PLACEHOLDER_REGEX = /(\{porcentaje\}|\{valor_letras\}|\{valor_numerico\})/g;

const PLACEHOLDER_COLORS: Record<string, string> = {
  '{porcentaje}':    'bg-amber-100 text-amber-700 border-amber-200',
  '{valor_letras}':  'bg-indigo-100 text-indigo-700 border-indigo-200',
  '{valor_numerico}': 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

function renderTemplateHighlighted(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(TEMPLATE_PLACEHOLDER_REGEX);
  return parts.map((part, index) => {
    const colorClass = PLACEHOLDER_COLORS[part];
    if (colorClass) {
      return (
        <code
          key={index}
          className={`inline rounded px-1 py-0.5 text-xs font-mono border ${colorClass}`}
        >
          {part}
        </code>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

const MODAL_ITEMS_PER_PAGE = 20;

const DEFAULT_BONUS_TEMPLATES: Record<PrimaTecnicaCategoria, string> = {
  DIRECTIVOS: 'Percibe una prima técnica en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
  COORDINADORES: 'Percibe una prima de coordinación en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.',
};
const DEFAULT_DYNAMIC_BONUS_TEMPLATE =
  'Percibe una prima en un porcentaje igual al ({porcentaje}%) sobre la asignación básica mensual de {valor_letras} (${valor_numerico}) pesos m/cte.';
const BULK_PREVIEW_ITEMS_LIMIT = 20;
const BULK_NAME_ALLOWED_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]+$/;
const BULK_ID_NUMBER_REGEX = /^\d+$/;
const BULK_PERCENTAGE_REGEX = /^\d+(?:[.,]\d{1,2})?$/;

const categoryContentMotion = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: 'easeOut' as const },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.16, ease: 'easeIn' as const },
  },
};

const findExistingRecordByIdNumber = (
  recordsByCategory: Record<PrimaTecnicaCategoria, PrimaTecnicaRegistro[]>,
  idNumber: string,
): PrimaTecnicaRegistro | null => {
  if (!idNumber) return null;
  const categories = Object.keys(recordsByCategory);
  for (const category of categories) {
    const match = (recordsByCategory[category] || []).find(
      (item) => normalizeIdNumber(item.id_number) === idNumber,
    );
    if (match) return match;
  }
  return null;
};

const formatBulkServerMessage = (message?: string) => {
  const rawMessage = String(message || '').trim();
  if (!rawMessage) return 'No se pudo procesar la fila.';
  const normalized = rawMessage.toLowerCase();
  if (normalized.includes('certificate_requests')) {
    return 'No se encontro la persona en la base de datos de solicitudes laborales (usuarios con contrato laboral).';
  }
  return rawMessage;
};

export function PrimaTecnicaModal({ isOpen, onClose }: PrimaTecnicaModalProps) {
  const [mounted, setMounted] = React.useState(false);
  const [categories, setCategories] =
    React.useState<PrimaTecnicaCategoriaConfig[]>(FALLBACK_CATEGORIES);
  const [isLoadingCategories, setIsLoadingCategories] = React.useState(false);
  const [activeCategory, setActiveCategory] =
    React.useState<PrimaTecnicaCategoria>('DIRECTIVOS');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<PrimaTecnicaCandidato[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingRecords, setIsLoadingRecords] = React.useState(false);
  const [recordsByCategory, setRecordsByCategory] = React.useState<
    Record<PrimaTecnicaCategoria, PrimaTecnicaRegistro[]>
  >(buildCategoryRecordMap(FALLBACK_CATEGORIES, [] as PrimaTecnicaRegistro[]));
  const [searchPage, setSearchPage] = React.useState(1);
  const [recordsPageByCategory, setRecordsPageByCategory] = React.useState<
    Record<PrimaTecnicaCategoria, number>
  >(buildCategoryRecordMap(FALLBACK_CATEGORIES, 1));
  const [categoryState, setCategoryState] =
    React.useState<EstadoCategoria>(buildCategoryState(FALLBACK_CATEGORIES));
  const [lastSavedRecordId, setLastSavedRecordId] = React.useState<string | null>(null);
  const [isRecentSavePulse, setIsRecentSavePulse] = React.useState(false);
  const [editingRecordState, setEditingRecordState] = React.useState<{
    id: string;
    percentage: string;
  } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);
  const [updatingRecordId, setUpdatingRecordId] = React.useState<string | null>(null);
  const [deletingRecordId, setDeletingRecordId] = React.useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = React.useState(false);
  const [isBulkTemplateLoading, setIsBulkTemplateLoading] = React.useState(false);
  const [isBulkUploading, setIsBulkUploading] = React.useState(false);
  const [bulkFileName, setBulkFileName] = React.useState('');
  const [bulkRows, setBulkRows] = React.useState<PrimaTecnicaBulkRow[]>([]);
  const [bulkParseError, setBulkParseError] = React.useState<string | null>(null);
  const [bulkResult, setBulkResult] = React.useState<PrimaTecnicaBulkResult | null>(null);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = React.useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = React.useState(false);
  const [newCategoryDraft, setNewCategoryDraft] = React.useState({
    label: '',
    description: '',
  });
  const [editingCategoryDraft, setEditingCategoryDraft] = React.useState<{
    category: PrimaTecnicaCategoria;
    label: string;
    description: string;
  } | null>(null);
  const [isUpdatingCategory, setIsUpdatingCategory] = React.useState(false);
  const [pendingDeleteCategory, setPendingDeleteCategory] =
    React.useState<PrimaTecnicaCategoria | null>(null);
  const [deletingCategory, setDeletingCategory] =
    React.useState<PrimaTecnicaCategoria | null>(null);
  const [pendingClearCategory, setPendingClearCategory] =
    React.useState<PrimaTecnicaCategoria | null>(null);
  const [clearingCategory, setClearingCategory] =
    React.useState<PrimaTecnicaCategoria | null>(null);
  const [templateTextByCategory, setTemplateTextByCategory] = React.useState<
    Record<PrimaTecnicaCategoria, string>
  >(buildCategoryRecordMap(FALLBACK_CATEGORIES, ''));
  const [isEditingTemplate, setIsEditingTemplate] = React.useState(false);
  const [templateDraft, setTemplateDraft] = React.useState('');
  const [isSavingTemplate, setIsSavingTemplate] = React.useState(false);
  const [isLoadingTemplate, setIsLoadingTemplate] = React.useState(false);

  const searchRequestRef = React.useRef(0);
  const savePulseTimeoutRef = React.useRef<number | null>(null);
  const saveHighlightTimeoutRef = React.useRef<number | null>(null);
  const bulkFileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
      if (savePulseTimeoutRef.current) {
        window.clearTimeout(savePulseTimeoutRef.current);
      }
      if (saveHighlightTimeoutRef.current) {
        window.clearTimeout(saveHighlightTimeoutRef.current);
      }
    };
  }, []);

  const fetchCategories = React.useCallback(async () => {
    if (!isOpen) return;
    setIsLoadingCategories(true);

    try {
      const response = await certificadosService.laborales.listarCategoriasPrimaTecnica();
      const items = Array.isArray(response) && response.length ? response : FALLBACK_CATEGORIES;
      const activeItems = items.filter((item) => item.is_active !== false);
      const nextCategories = activeItems.length ? activeItems : FALLBACK_CATEGORIES;

      setCategories(nextCategories);
      setCategoryState((prev) => buildCategoryState(nextCategories, prev));
      setRecordsByCategory((prev) => {
        const next = buildCategoryRecordMap<PrimaTecnicaRegistro[]>(nextCategories, []);
        for (const category of Object.keys(next)) {
          next[category] = prev[category] || [];
        }
        return next;
      });
      setRecordsPageByCategory((prev) => {
        const next = buildCategoryRecordMap<number>(nextCategories, 1);
        for (const category of Object.keys(next)) {
          next[category] = prev[category] || 1;
        }
        return next;
      });
      setTemplateTextByCategory((prev) => {
        const next = buildCategoryRecordMap<string>(nextCategories, '');
        for (const category of Object.keys(next)) {
          const categoryConfig = nextCategories.find((item) => item.category === category);
          next[category] = prev[category] || categoryConfig?.template_text || '';
        }
        return next;
      });
      setActiveCategory((prev) =>
        nextCategories.some((item) => item.category === prev)
          ? prev
          : nextCategories[0]?.category || 'DIRECTIVOS',
      );
      return nextCategories;
    } catch (error: any) {
      const message = String(error?.message || 'No se pudo cargar el catalogo de primas.');
      toast.error(message);
      setCategories(FALLBACK_CATEGORIES);
      return FALLBACK_CATEGORIES;
    } finally {
      setIsLoadingCategories(false);
    }
  }, [isOpen]);

  const fetchRecords = React.useCallback(async (
    category?: PrimaTecnicaCategoria,
    categoriesOverride?: PrimaTecnicaCategoriaConfig[],
  ) => {
    if (!isOpen) return;
    setIsLoadingRecords(true);

    try {
      if (category) {
        const items = await certificadosService.laborales.listarPrimaTecnica(category);
        setRecordsByCategory((prev) => ({
          ...prev,
          [category]: Array.isArray(items) ? items : [],
        }));
        return;
      }

      const categoriesToLoad = categoriesOverride?.length
        ? categoriesOverride
        : FALLBACK_CATEGORIES;
      const entries = await Promise.all(
        categoriesToLoad.map(async (item) => {
          const records = await certificadosService.laborales.listarPrimaTecnica(item.category);
          return [item.category, Array.isArray(records) ? records : []] as const;
        }),
      );

      setRecordsByCategory(
        entries.reduce<Record<PrimaTecnicaCategoria, PrimaTecnicaRegistro[]>>(
          (acc, [categoryKey, records]) => {
            acc[categoryKey] = records;
            return acc;
          },
          {},
        ),
      );
    } catch (error: any) {
      const message = String(error?.message || 'No se pudo cargar la información de prima técnica y/o coordinación.');
      toast.error(message);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [isOpen]);

  const fetchTemplate = React.useCallback(async (category: PrimaTecnicaCategoria) => {
    if (!isOpen) return;
    setIsLoadingTemplate(true);
    try {
      const result = await certificadosService.laborales.obtenerPlantillaPrimaTecnica(category);
      setTemplateTextByCategory((prev) => ({ ...prev, [category]: result.template_text }));
    } catch {
      // Si falla, simplemente no se muestra texto precargado
    } finally {
      setIsLoadingTemplate(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      searchRequestRef.current += 1;
      setSearchQuery('');
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError(null);
      setSaveError(null);
      setIsSaving(false);
      setCategories(FALLBACK_CATEGORIES);
      setCategoryState(buildCategoryState(FALLBACK_CATEGORIES));
      setSearchPage(1);
      setLastSavedRecordId(null);
      setIsRecentSavePulse(false);
      setEditingRecordState(null);
      setPendingDeleteId(null);
      setUpdatingRecordId(null);
      setDeletingRecordId(null);
      setIsBulkModalOpen(false);
      setIsBulkTemplateLoading(false);
      setIsBulkUploading(false);
      setBulkFileName('');
      setBulkRows([]);
      setBulkParseError(null);
      setBulkResult(null);
      setIsCreateCategoryOpen(false);
      setIsCreatingCategory(false);
      setEditingCategoryDraft(null);
      setIsUpdatingCategory(false);
      setPendingDeleteCategory(null);
      setDeletingCategory(null);
      setPendingClearCategory(null);
      setClearingCategory(null);
      setNewCategoryDraft({
        label: '',
        description: '',
      });
      setRecordsPageByCategory(buildCategoryRecordMap(FALLBACK_CATEGORIES, 1));
      setActiveCategory('DIRECTIVOS');
      setTemplateTextByCategory(buildCategoryRecordMap(FALLBACK_CATEGORIES, ''));
      setIsEditingTemplate(false);
      setTemplateDraft('');
      return;
    }

    void (async () => {
      const loadedCategories = await fetchCategories();
      if (loadedCategories?.length) {
        await fetchRecords(undefined, loadedCategories);
      }
    })();
  }, [isOpen, fetchCategories, fetchRecords]);

  React.useEffect(() => {
    if (!isOpen) return;
    void fetchTemplate(activeCategory);
    setIsEditingTemplate(false);
    setTemplateDraft('');
  }, [isOpen, activeCategory, fetchTemplate]);

  React.useEffect(() => {
    if (!isOpen) return;

    const trimmed = searchQuery.trim();
    setSearchError(null);

    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearchPage(1);
      setSearchLoading(false);
      return;
    }

    const requestId = ++searchRequestRef.current;
    setSearchLoading(true);

    const timeout = window.setTimeout(async () => {
      try {
        const response = await certificadosService.laborales.buscarCandidatosPrimaTecnica(
          trimmed,
          200,
        );
        if (requestId !== searchRequestRef.current) return;
        setSearchResults(Array.isArray(response) ? response : []);
        setSearchPage(1);
      } catch (error: any) {
        if (requestId !== searchRequestRef.current) return;
        setSearchResults([]);
        setSearchPage(1);
        setSearchError(String(error?.message || 'No se pudo realizar la búsqueda.'));
      } finally {
        if (requestId === searchRequestRef.current) {
          setSearchLoading(false);
        }
      }
    }, 260);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [searchQuery, isOpen]);

  const activeCategoryState =
    categoryState[activeCategory] || { selected: null, percentage: '' };
  const selectedCandidate = activeCategoryState.selected;
  const percentageInput = activeCategoryState.percentage;
  const parsedPercentage = Number(String(percentageInput || '').replace(',', '.'));
  const isValidPercentage =
    Number.isFinite(parsedPercentage) && parsedPercentage > 0 && parsedPercentage <= 100;

  const categoryMeta =
    categories.find((item) => item.category === activeCategory) ||
    FALLBACK_CATEGORIES.find((item) => item.category === activeCategory) || {
      id: activeCategory,
      category: activeCategory,
      label: formatCategoryLabel(activeCategory),
      description: 'Gestion de porcentajes para esta prima.',
      template_text: DEFAULT_DYNAMIC_BONUS_TEMPLATE,
      default_template_text: DEFAULT_DYNAMIC_BONUS_TEMPLATE,
    };
  const getCategoryLabel = React.useCallback(
    (category: PrimaTecnicaCategoria) =>
      categories.find((item) => item.category === category)?.label ||
      FALLBACK_CATEGORIES.find((item) => item.category === category)?.label ||
      formatCategoryLabel(category),
    [categories],
  );
  const activeRecords = recordsByCategory[activeCategory] || [];
  const currentRecordsPage = recordsPageByCategory[activeCategory] || 1;
  const totalAssignedRecords = React.useMemo(
    () =>
      Object.values(recordsByCategory).reduce(
        (total, records) => total + (Array.isArray(records) ? records.length : 0),
        0,
      ),
    [recordsByCategory],
  );

  const totalSearchPages = Math.max(
    1,
    Math.ceil(searchResults.length / MODAL_ITEMS_PER_PAGE),
  );
  const paginatedSearchResults = React.useMemo(() => {
    const start = (searchPage - 1) * MODAL_ITEMS_PER_PAGE;
    return searchResults.slice(start, start + MODAL_ITEMS_PER_PAGE);
  }, [searchResults, searchPage]);

  const totalRecordsPages = Math.max(
    1,
    Math.ceil(activeRecords.length / MODAL_ITEMS_PER_PAGE),
  );
  const paginatedRecords = React.useMemo(() => {
    const start = (currentRecordsPage - 1) * MODAL_ITEMS_PER_PAGE;
    return activeRecords.slice(start, start + MODAL_ITEMS_PER_PAGE);
  }, [activeRecords, currentRecordsPage]);

  const validatedBulkRows = React.useMemo<PrimaTecnicaBulkValidatedRow[]>(() => {
    const seenDocumentRows = new Map<string, number>();

    return bulkRows.map((row) => {
      const errors: string[] = [];
      const fullName = String(row.fullName || '')
        .replace(/\s+/g, ' ')
        .trim();
      const idNumber = String(row.idNumber || '').trim();
      const percentage = String(row.percentage ?? '').trim();
      const percentageHasSymbol = Boolean(row.percentageHasSymbol);

      if (!fullName) {
        errors.push('El nombre es obligatorio.');
      } else {
        if (/\d/.test(fullName)) {
          errors.push('El nombre no puede contener números.');
        }
        if (!BULK_NAME_ALLOWED_REGEX.test(fullName)) {
          errors.push('El nombre contiene caracteres no permitidos.');
        }
      }

      if (!idNumber) {
        errors.push('El número de documento es obligatorio.');
      } else if (!BULK_ID_NUMBER_REGEX.test(idNumber)) {
        errors.push('El documento solo permite números (sin puntos, guiones ni espacios).');
      }

      let normalizedPercentage: number | null = null;
      if (!percentage) {
        errors.push('El porcentaje es obligatorio.');
      } else if (percentageHasSymbol) {
        errors.push('El porcentaje no debe incluir símbolos como %. Escribe solo el número.');
      } else if (!BULK_PERCENTAGE_REGEX.test(percentage)) {
        errors.push('El porcentaje solo permite números (hasta 2 decimales).');
      } else {
        const parsed = Number(percentage.replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
          errors.push('El porcentaje debe ser mayor a 0 y menor o igual a 100.');
        } else {
          normalizedPercentage = Number(parsed.toFixed(2));
        }
      }

      if (idNumber && BULK_ID_NUMBER_REGEX.test(idNumber)) {
        const duplicatedInRow = seenDocumentRows.get(idNumber);
        if (duplicatedInRow) {
          errors.push(
            `Documento repetido en el archivo. Ya aparece en la fila ${duplicatedInRow}.`,
          );
        } else {
          seenDocumentRows.set(idNumber, row.rowNumber);
        }
      }

      return {
        rowNumber: row.rowNumber,
        fullName,
        idNumber,
        percentage,
        normalizedPercentage,
        errors,
        isValid: errors.length === 0,
      };
    });
  }, [bulkRows]);

  const validBulkRows = React.useMemo(
    () => validatedBulkRows.filter((row) => row.isValid),
    [validatedBulkRows],
  );

  const invalidBulkRows = React.useMemo(
    () => validatedBulkRows.filter((row) => !row.isValid),
    [validatedBulkRows],
  );

  const previewBulkRows = React.useMemo(
    () => validatedBulkRows.slice(0, BULK_PREVIEW_ITEMS_LIMIT),
    [validatedBulkRows],
  );

  React.useEffect(() => {
    if (searchPage > totalSearchPages) {
      setSearchPage(totalSearchPages);
    }
  }, [searchPage, totalSearchPages]);

  React.useEffect(() => {
    if (currentRecordsPage > totalRecordsPages) {
      setRecordsPageByCategory((prev) => ({
        ...prev,
        [activeCategory]: totalRecordsPages,
      }));
    }
  }, [activeCategory, currentRecordsPage, totalRecordsPages]);

  React.useEffect(() => {
    if (!editingRecordState) return;
    const stillExists = activeRecords.some((item) => item.id === editingRecordState.id);
    if (!stillExists) {
      setEditingRecordState(null);
    }
  }, [activeRecords, editingRecordState]);

  const handleSelectCategory = React.useCallback((category: PrimaTecnicaCategoria) => {
    setActiveCategory(category);
    setSearchQuery('');
    setSearchResults([]);
    setSearchPage(1);
    setSearchError(null);
    setSaveError(null);
    setEditingRecordState(null);
    setPendingDeleteId(null);
    setPendingClearCategory(null);
  }, []);

  const handleSelectCandidate = (candidate: PrimaTecnicaCandidato) => {
    const normalizedCandidateId = normalizeIdNumber(candidate.idNumber);
    const existingRecord = findExistingRecordByIdNumber(
      recordsByCategory,
      normalizedCandidateId,
    );

    if (existingRecord) {
      const existingCategory = existingRecord.category;
      const categoryLabel = getCategoryLabel(existingCategory);
      toast.error(
        `${candidate.fullName} ya tiene prima técnica y/o coordinación registrada en ${categoryLabel}.`,
      );

      setCategoryState(buildCategoryState(categories));
      setActiveCategory(existingCategory);
      setEditingRecordState(null);
      setPendingDeleteId(null);
      setSearchQuery('');
      setSearchResults([]);
      setSearchPage(1);
      setSearchError(null);
      setSaveError(null);
      setRecordsPageByCategory((prev) => ({
        ...prev,
        [existingCategory]: 1,
      }));
      setRecordsByCategory((prev) => {
        const categoryItems = prev[existingCategory] || [];
        return {
          ...prev,
          [existingCategory]: [
            existingRecord,
            ...categoryItems.filter((item) => item.id !== existingRecord.id),
          ],
        };
      });
      triggerSaveFeedback(existingRecord.id);
      return;
    }

    setCategoryState((prev) => ({
      ...prev,
      [activeCategory]: {
        ...(prev[activeCategory] || { selected: null, percentage: '' }),
        selected: {
          ...candidate,
          idNumber: normalizedCandidateId,
        },
      },
    }));
    setSearchQuery('');
    setSearchResults([]);
    setSearchPage(1);
    setSearchError(null);
    setSaveError(null);
  };

  const handlePercentageChange = (rawValue: string) => {
    const normalized = sanitizePercentageInput(rawValue);
    if (normalized === null) return;

    setCategoryState((prev) => ({
      ...prev,
      [activeCategory]: {
        ...(prev[activeCategory] || { selected: null, percentage: '' }),
        percentage: normalized,
      },
    }));
  };

  const triggerSaveFeedback = React.useCallback((recordId: string | null) => {
    if (savePulseTimeoutRef.current) {
      window.clearTimeout(savePulseTimeoutRef.current);
    }
    if (saveHighlightTimeoutRef.current) {
      window.clearTimeout(saveHighlightTimeoutRef.current);
    }
    setIsRecentSavePulse(true);
    setLastSavedRecordId(recordId);
    savePulseTimeoutRef.current = window.setTimeout(() => {
      setIsRecentSavePulse(false);
    }, 620);
    saveHighlightTimeoutRef.current = window.setTimeout(() => {
      setLastSavedRecordId(null);
    }, 2600);
  }, []);

  const handleStartEditRecord = (record: PrimaTecnicaRegistro) => {
    setPendingDeleteId(null);
    setSaveError(null);
    setEditingRecordState({
      id: record.id,
      percentage: formatEditablePercentage(Number(record.percentage || 0)),
    });
  };

  const handleEditPercentageChange = (rawValue: string) => {
    const normalized = sanitizePercentageInput(rawValue);
    if (normalized === null) return;
    setEditingRecordState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        percentage: normalized,
      };
    });
  };

  const handleCancelEditRecord = () => {
    setEditingRecordState(null);
  };

  const handleToggleDeleteRecord = (recordId: string) => {
    setEditingRecordState((prev) => (prev?.id === recordId ? null : prev));
    setPendingDeleteId((prev) => (prev === recordId ? null : recordId));
    setSaveError(null);
  };

  const handleUpdateRecord = async (record: PrimaTecnicaRegistro) => {
    if (!editingRecordState || editingRecordState.id !== record.id) {
      return;
    }

    const parsed = Number(String(editingRecordState.percentage || '').replace(',', '.'));
    const isValid = Number.isFinite(parsed) && parsed > 0 && parsed <= 100;
    if (!isValid) {
      toast.error('Ingresa un porcentaje válido entre 0 y 100.');
      return;
    }

    const nextPercentage = Number(parsed.toFixed(2));
    const currentPercentage = Number(Number(record.percentage || 0).toFixed(2));
    if (nextPercentage === currentPercentage) {
      setEditingRecordState(null);
      return;
    }

    setUpdatingRecordId(record.id);
    setSaveError(null);
    try {
      const response = await certificadosService.laborales.actualizarPrimaTecnica(record.id, {
        percentage: nextPercentage,
      });
      toast.success('Porcentaje actualizado correctamente.');
      triggerSaveFeedback(response?.id ? String(response.id) : record.id);
      setEditingRecordState(null);
      setPendingDeleteId(null);
      await fetchRecords(activeCategory);
    } catch (error: any) {
      const message = String(
        error?.message || 'No se pudo actualizar el porcentaje de prima técnica y/o coordinación.',
      );
      setSaveError(message);
      toast.error(message);
    } finally {
      setUpdatingRecordId(null);
    }
  };

  const handleDeleteRecord = async (record: PrimaTecnicaRegistro) => {
    setDeletingRecordId(record.id);
    setSaveError(null);
    try {
      await certificadosService.laborales.eliminarPrimaTecnica(record.id);
      toast.success('Registro eliminado correctamente.');
      setPendingDeleteId(null);
      setEditingRecordState((prev) => (prev?.id === record.id ? null : prev));
      setLastSavedRecordId((prev) => (prev === record.id ? null : prev));
      await fetchRecords(activeCategory);
    } catch (error: any) {
      const message = String(
        error?.message || 'No se pudo eliminar el registro de prima técnica y/o coordinación.',
      );
      setSaveError(message);
      toast.error(message);
    } finally {
      setDeletingRecordId(null);
    }
  };

  const handleClearCategoryAssignments = async () => {
    if (!activeRecords.length) {
      toast.info('Esta prima no tiene usuarios asignados.');
      setPendingClearCategory(null);
      return;
    }

    setClearingCategory(activeCategory);
    setSaveError(null);
    try {
      const response =
        await certificadosService.laborales.eliminarUsuariosPrimaTecnicaPorCategoria(
          activeCategory,
        );
      const deletedCount = Number(response?.deleted_count || activeRecords.length || 0);

      setRecordsByCategory((prev) => ({
        ...prev,
        [activeCategory]: [],
      }));
      setRecordsPageByCategory((prev) => ({
        ...prev,
        [activeCategory]: 1,
      }));
      setPendingDeleteId(null);
      setEditingRecordState(null);
      setLastSavedRecordId(null);
      setPendingClearCategory(null);
      await fetchRecords(activeCategory);
      toast.success(
        `${deletedCount} usuario${deletedCount !== 1 ? 's' : ''} eliminado${deletedCount !== 1 ? 's' : ''} de ${categoryMeta.label}.`,
      );
    } catch (error: any) {
      const message = String(
        error?.message || 'No se pudieron eliminar los usuarios de esta prima.',
      );
      setSaveError(message);
      toast.error(message);
    } finally {
      setClearingCategory(null);
    }
  };

  const openBulkModal = (event?: React.MouseEvent<HTMLButtonElement>) => {
    event?.preventDefault();
    event?.stopPropagation();
    setBulkParseError(null);
    setBulkResult(null);
    setBulkRows([]);
    setBulkFileName('');
    if (bulkFileInputRef.current) {
      bulkFileInputRef.current.value = '';
    }
    window.requestAnimationFrame(() => {
      setIsBulkModalOpen(true);
    });
  };

  const handleDownloadBulkTemplate = async () => {
    setIsBulkTemplateLoading(true);
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet([
        ['nombre_completo', 'numero_documento', 'numero_primaTecnica'],
        ['Julian Rojas', '1111111111', 50],
      ]);
      worksheet['!cols'] = [{ wch: 32 }, { wch: 24 }, { wch: 24 }];
      XLSX.utils.book_append_sheet(workbook, worksheet, 'prima_tecnica');
      XLSX.writeFile(workbook, 'Plantilla_Carga_Masiva_Prima_Tecnica.xlsx');
      toast.success('Plantilla descargada correctamente.');
    } catch (error: any) {
      const message = String(error?.message || 'No se pudo descargar la plantilla.');
      setBulkParseError(message);
      toast.error(message);
    } finally {
      setIsBulkTemplateLoading(false);
    }
  };

  const handlePickBulkFile = () => {
    bulkFileInputRef.current?.click();
  };

  const handleBulkFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkParseError(null);
    setBulkResult(null);
    setBulkRows([]);
    setBulkFileName(file.name);

    try {
      const isExcelFile = /\.xlsx?$/.test(file.name.toLowerCase());
      if (!isExcelFile) {
        throw new Error('Selecciona un archivo Excel válido (.xlsx o .xls).');
      }

      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheetName = workbook.SheetNames?.[0];
      if (!sheetName) {
        throw new Error('El archivo no contiene hojas para procesar.');
      }

      const sheet = workbook.Sheets[sheetName];
      const matrix = XLSX.utils.sheet_to_json<Array<string | number>>(sheet, {
        header: 1,
        defval: '',
      });

      if (!Array.isArray(matrix) || matrix.length < 2) {
        throw new Error('La plantilla no contiene filas de datos.');
      }

      const headers = (matrix[0] || []).map((value) => String(value || '').trim());
      const nameIndex = getHeaderIndex(headers, ['nombre_completo', 'nombre']);
      const idIndex = getHeaderIndex(headers, [
        'numero_documento',
        'cedula',
        'identificacion',
        'id_number',
      ]);
      const percentageIndex = getHeaderIndex(headers, [
        'numero_primaTecnica',
        'numero_primatecnica',
        'numero_prima_tecnica',
        'prima_tecnica',
        'porcentaje',
      ]);

      if (idIndex < 0 || percentageIndex < 0) {
        throw new Error(
          'La plantilla debe incluir las columnas numero_documento y numero_primaTecnica.',
        );
      }

      const rows: PrimaTecnicaBulkRow[] = [];
      for (let index = 1; index < matrix.length; index += 1) {
        const row = matrix[index] || [];
        const hasAnyValue = row.some((value) => String(value ?? '').trim() !== '');
        if (!hasAnyValue) continue;

        const rawPercentageValue = String(row[percentageIndex] ?? '').trim();
        const percentageCellAddress = XLSX.utils.encode_cell({ c: percentageIndex, r: index });
        const percentageCell = sheet[percentageCellAddress] as
          | { w?: string | number; z?: string }
          | undefined;
        const percentageCellDisplay = String(percentageCell?.w ?? rawPercentageValue).trim();
        const percentageCellFormat = String(percentageCell?.z ?? '').trim();
        const percentageHasSymbol =
          percentageCellDisplay.includes('%') ||
          percentageCellFormat.includes('%') ||
          rawPercentageValue.includes('%');
        const percentagePreviewValue =
          percentageHasSymbol && percentageCellDisplay ? percentageCellDisplay : rawPercentageValue;

        rows.push({
          rowNumber: index + 1,
          fullName: nameIndex >= 0 ? String(row[nameIndex] ?? '').trim() : '',
          idNumber: String(row[idIndex] ?? '').trim(),
          percentage: percentagePreviewValue,
          percentageHasSymbol,
        });
      }

      if (!rows.length) {
        throw new Error('No se encontraron filas con datos para cargar.');
      }

      if (rows.length > 1000) {
        throw new Error('El archivo supera el limite permitido de 1000 filas.');
      }

      setBulkRows(rows);
      toast.success(
        `Archivo listo: ${rows.length} fila(s) detectadas. Revisa la validación en la vista previa.`,
      );
    } catch (error: any) {
      const message = String(error?.message || 'No se pudo leer el archivo de carga masiva.');
      setBulkParseError(message);
      setBulkRows([]);
      toast.error(message);
    }
  };

  const handleProcessBulkUpload = async () => {
    if (!validatedBulkRows.length) {
      setBulkParseError('Primero selecciona un archivo con filas para cargar.');
      return;
    }

    if (!validBulkRows.length) {
      setBulkParseError(
        'No hay filas válidas para cargar. Corrige los errores de la vista previa.',
      );
      return;
    }

    setIsBulkUploading(true);
    setBulkParseError(null);
    setSaveError(null);

    try {
      if (invalidBulkRows.length > 0) {
        toast.warning(
          `Se omitirán ${invalidBulkRows.length} fila(s) con errores. Solo se enviarán ${validBulkRows.length} fila(s) válidas.`,
        );
      }

      const response = await certificadosService.laborales.cargarPrimaTecnicaMasiva({
        category: activeCategory,
        rows: validBulkRows.map((row) => ({
          rowNumber: row.rowNumber,
          fullName: row.fullName,
          idNumber: row.idNumber,
          percentage: row.normalizedPercentage ?? row.percentage,
        })),
      });

      setBulkResult(response);

      const firstSuccess = response.results.find(
        (item) => item.status === 'success' && item.record?.id,
      );
      if (firstSuccess?.record?.id) {
        triggerSaveFeedback(firstSuccess.record.id);
      }

      if (response.summary.success > 0) {
        setRecordsPageByCategory((prev) => ({
          ...prev,
          [activeCategory]: 1,
        }));
        await fetchRecords(activeCategory);
      }

      if (response.summary.failed === 0) {
        toast.success(
          `Carga masiva completada. ${response.summary.success} fila(s) procesadas correctamente.`,
        );
      } else {
        toast.warning(
          `Carga finalizada con observaciones. Exitosas: ${response.summary.success}, Fallidas: ${response.summary.failed}.`,
        );
      }
    } catch (error: any) {
      const message = String(
        error?.message || 'No se pudo procesar la carga masiva de prima técnica y/o coordinación.',
      );
      setBulkParseError(message);
      toast.error(message);
    } finally {
      setIsBulkUploading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCandidate) {
      toast.error('Selecciona una persona para continuar.');
      return;
    }

    if (!isValidPercentage) {
      toast.error('Ingresa un porcentaje válido entre 0 y 100.');
      return;
    }

    if (selectedCandidate.status && selectedCandidate.status !== 'A') {
      setSaveError('Este usuario no cuenta con contratos activos. No es posible asignarle prima técnica y/o coordinación.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const response = await certificadosService.laborales.guardarPrimaTecnica({
        category: activeCategory,
        requestId: selectedCandidate.requestId,
        idNumber: normalizeIdNumber(selectedCandidate.idNumber),
        fullName: selectedCandidate.fullName,
        percentage: Number(parsedPercentage.toFixed(2)),
      });

      const actionLabel = response?.action === 'updated' ? 'actualizado' : 'creado';
      toast.success(
        `Registro ${actionLabel} para ${categoryMeta.label.toLowerCase()}.`,
      );
      const savedId = response?.id ? String(response.id) : null;
      triggerSaveFeedback(savedId);

      setCategoryState((prev) => ({
        ...prev,
        [activeCategory]: {
          selected: null,
          percentage: '',
        },
      }));
      setSearchQuery('');
      setSearchResults([]);
      setSearchPage(1);
      setRecordsPageByCategory((prev) => ({
        ...prev,
        [activeCategory]: 1,
      }));
      await fetchRecords(activeCategory);
    } catch (error: any) {
      const message = String(
        error?.message || 'No se pudo guardar el registro de prima técnica y/o coordinación.',
      );
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    const trimmed = templateDraft.trim();
    if (!trimmed) return;
    setIsSavingTemplate(true);
    try {
      const result = await certificadosService.laborales.actualizarPlantillaPrimaTecnica(
        activeCategory,
        trimmed,
      );
      setTemplateTextByCategory((prev) => ({ ...prev, [activeCategory]: result.template_text }));
      setIsEditingTemplate(false);
      setTemplateDraft('');
      toast.success('Plantilla de párrafo actualizada correctamente.');
    } catch (error: any) {
      toast.error(
        String(error?.message || 'No se pudo guardar la plantilla.'),
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleResetTemplate = async () => {
    setIsSavingTemplate(true);
    try {
      const defaultText =
        categoryMeta.default_template_text ||
        DEFAULT_BONUS_TEMPLATES[activeCategory] ||
        DEFAULT_DYNAMIC_BONUS_TEMPLATE;
      const result = await certificadosService.laborales.actualizarPlantillaPrimaTecnica(
        activeCategory,
        defaultText,
      );
      setTemplateTextByCategory((prev) => ({ ...prev, [activeCategory]: result.template_text }));
      setIsEditingTemplate(false);
      setTemplateDraft('');
      toast.success('Párrafo restablecido al texto original.');
    } catch (error: any) {
      toast.error(String(error?.message || 'No se pudo restablecer el párrafo.'));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleCreateCategory = async () => {
    const label = newCategoryDraft.label.replace(/\s+/g, ' ').trim();
    const description = newCategoryDraft.description.replace(/\s+/g, ' ').trim();

    if (label.length < 3) {
      toast.error('Escribe un nombre de prima de al menos 3 caracteres.');
      return;
    }

    setIsCreatingCategory(true);
    try {
      const created = await certificadosService.laborales.crearCategoriaPrimaTecnica({
        label,
        description,
      });

      const nextCategories = [...categories, created].sort(
        (a, b) =>
          Number(a.display_order || 0) - Number(b.display_order || 0) ||
          String(a.label || '').localeCompare(String(b.label || ''), 'es'),
      );
      setCategories(nextCategories);
      setCategoryState((prev) => buildCategoryState(nextCategories, prev));
      setRecordsByCategory((prev) => ({
        ...prev,
        [created.category]: [],
      }));
      setRecordsPageByCategory((prev) => ({
        ...prev,
        [created.category]: 1,
      }));
      setTemplateTextByCategory((prev) => ({
        ...prev,
        [created.category]: created.template_text || DEFAULT_DYNAMIC_BONUS_TEMPLATE,
      }));
      setActiveCategory(created.category);
      setIsCreateCategoryOpen(false);
      setEditingCategoryDraft(null);
      setPendingDeleteCategory(null);
      setNewCategoryDraft({
        label: '',
        description: '',
      });
      toast.success(`Prima ${created.label || label} creada correctamente.`);
    } catch (error: any) {
      toast.error(String(error?.message || 'No se pudo crear la prima.'));
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const handleStartEditCategory = (meta: PrimaTecnicaCategoriaConfig) => {
    setEditingCategoryDraft({
      category: meta.category,
      label: meta.label || formatCategoryLabel(meta.category),
      description: meta.description || '',
    });
    setIsCreateCategoryOpen(false);
    setPendingDeleteCategory(null);
    handleSelectCategory(meta.category);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategoryDraft) return;

    const label = editingCategoryDraft.label.replace(/\s+/g, ' ').trim();
    const description = editingCategoryDraft.description.replace(/\s+/g, ' ').trim();

    if (label.length < 3) {
      toast.error('Escribe un nombre de prima de al menos 3 caracteres.');
      return;
    }

    setIsUpdatingCategory(true);
    try {
      const updated = await certificadosService.laborales.actualizarCategoriaPrimaTecnica(
        editingCategoryDraft.category,
        {
          label,
          description,
        },
      );

      const nextCategories = categories
        .map((item) => (item.category === updated.category ? updated : item))
        .sort(
          (a, b) =>
            Number(a.display_order || 0) - Number(b.display_order || 0) ||
            String(a.label || '').localeCompare(String(b.label || ''), 'es'),
        );

      setCategories(nextCategories);
      setTemplateTextByCategory((prev) => ({
        ...prev,
        [updated.category]: updated.template_text || prev[updated.category] || DEFAULT_DYNAMIC_BONUS_TEMPLATE,
      }));
      setEditingCategoryDraft(null);
      toast.success(`Prima ${updated.label || label} actualizada correctamente.`);
    } catch (error: any) {
      toast.error(String(error?.message || 'No se pudo actualizar la prima.'));
    } finally {
      setIsUpdatingCategory(false);
    }
  };

  const handleDeleteCategory = async (meta: PrimaTecnicaCategoriaConfig) => {
    const recordCount = recordsByCategory[meta.category]?.length || 0;

    if (meta.is_system) {
      toast.error('Las primas base no se pueden eliminar.');
      return;
    }

    if (recordCount > 0) {
      toast.error('Primero elimina los usuarios asignados a esta prima.');
      return;
    }

    setDeletingCategory(meta.category);
    try {
      await certificadosService.laborales.eliminarCategoriaPrimaTecnica(meta.category);
      const nextCategories = categories.filter((item) => item.category !== meta.category);
      const nextActiveCategory =
        activeCategory === meta.category
          ? nextCategories[0]?.category || 'DIRECTIVOS'
          : activeCategory;

      setCategories(nextCategories);
      setCategoryState((prev) => {
        const next = { ...prev };
        delete next[meta.category];
        return next;
      });
      setRecordsByCategory((prev) => {
        const next = { ...prev };
        delete next[meta.category];
        return next;
      });
      setRecordsPageByCategory((prev) => {
        const next = { ...prev };
        delete next[meta.category];
        return next;
      });
      setTemplateTextByCategory((prev) => {
        const next = { ...prev };
        delete next[meta.category];
        return next;
      });
      setPendingDeleteCategory(null);
      setEditingCategoryDraft((prev) =>
        prev?.category === meta.category ? null : prev,
      );
      setActiveCategory(nextActiveCategory);
      toast.success(`Prima ${meta.label || formatCategoryLabel(meta.category)} eliminada correctamente.`);
    } catch (error: any) {
      toast.error(String(error?.message || 'No se pudo eliminar la prima.'));
    } finally {
      setDeletingCategory(null);
    }
  };

  const hasRecordMutationInProgress = Boolean(
    updatingRecordId || deletingRecordId || clearingCategory,
  );

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[10000] overflow-hidden"
          style={{ pointerEvents: isBulkModalOpen ? 'none' : 'auto' }}
        >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 transition-opacity"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.56)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
          onClick={onClose}
        />

        <div className="fixed inset-0 flex items-center justify-center p-1 sm:p-2">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 22, scale: 0.97 }}
          transition={{ type: 'spring', damping: 24, stiffness: 270 }}
          className="w-full max-w-none max-h-none overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_rgba(15,23,42,0.35)] flex flex-col"
          style={{
            width: 'min(96vw, 1152px)',
            height: 'min(92vh, 920px)',
          }}
        >
          <div
            className="px-5 sm:px-6 py-4 sm:py-5 border-b border-blue-200"
            style={{
              background:
                'linear-gradient(135deg, rgba(0,61,165,0.98) 0%, rgba(30,64,175,0.98) 52%, rgba(37,99,235,0.96) 100%)',
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-white text-xl sm:text-2xl font-bold tracking-tight">
                  Prima técnica y/o coordinación
                </h2>
                <p className="text-blue-100 text-sm sm:text-[15px] mt-1">
                  Configura porcentajes de prima técnica y/o coordinación con búsqueda por nombre o identificación.
                </p>
              </div>

              <motion.button
                onClick={onClose}
                className="text-blue-100 hover:text-white bg-white/10 hover:bg-white/20 transition-colors rounded-lg p-2"
                aria-label="Cerrar modal"
                whileHover={{ scale: 1.06, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50 p-4 sm:p-6">
            <div className="flex min-h-full flex-col gap-5">
            <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Primas configuradas</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium">
                      {categories.length} prima{categories.length !== 1 ? 's' : ''}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium">
                      {totalAssignedRecords} usuario{totalAssignedRecords !== 1 ? 's' : ''} asignado{totalAssignedRecords !== 1 ? 's' : ''}
                    </span>
                    <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                      Activa: {categoryMeta.label}
                    </span>
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={() => {
                    setIsCreateCategoryOpen((prev) => !prev);
                    setEditingCategoryDraft(null);
                    setPendingDeleteCategory(null);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100 sm:flex-shrink-0"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Nueva prima</span>
                </motion.button>
              </div>

              {isCreateCategoryOpen && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50/40 p-3">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Nombre de la prima
                      </label>
                      <input
                        value={newCategoryDraft.label}
                        onChange={(event) =>
                          setNewCategoryDraft((prev) => ({
                            ...prev,
                            label: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Ejemplo: Asesores"
                        disabled={isCreatingCategory}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Descripcion
                      </label>
                      <input
                        value={newCategoryDraft.description}
                        onChange={(event) =>
                          setNewCategoryDraft((prev) => ({
                            ...prev,
                            description: event.target.value,
                          }))
                        }
                        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        placeholder="Gestion de porcentajes para esta prima."
                        disabled={isCreatingCategory}
                      />
                    </div>
                    <motion.button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={isCreatingCategory || newCategoryDraft.label.trim().length < 3}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      whileHover={
                        isCreatingCategory || newCategoryDraft.label.trim().length < 3
                          ? {}
                          : { y: -1 }
                      }
                      whileTap={
                        isCreatingCategory || newCategoryDraft.label.trim().length < 3
                          ? {}
                          : { scale: 0.98 }
                      }
                    >
                      {isCreatingCategory ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Creando...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          <span>Crear</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </div>
              )}

              {editingCategoryDraft && (
                <div className="mt-3 rounded-xl border border-slate-300 bg-white p-3 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
                  <div className="mb-3 flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        Editar prima
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {editingCategoryDraft.category}
                      </p>
                    </div>
                    <span className="w-fit rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {getCategoryLabel(editingCategoryDraft.category)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Nombre visible
                      </label>
                      <input
                        value={editingCategoryDraft.label}
                        onChange={(event) =>
                          setEditingCategoryDraft((prev) =>
                            prev ? { ...prev, label: event.target.value } : prev,
                          )
                        }
                        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        disabled={isUpdatingCategory}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-700">
                        Descripcion
                      </label>
                      <input
                        value={editingCategoryDraft.description}
                        onChange={(event) =>
                          setEditingCategoryDraft((prev) =>
                            prev ? { ...prev, description: event.target.value } : prev,
                          )
                        }
                        className="w-full rounded-lg border-2 border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                        disabled={isUpdatingCategory}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <motion.button
                      type="button"
                      onClick={handleUpdateCategory}
                      disabled={
                        isUpdatingCategory ||
                        editingCategoryDraft.label.trim().length < 3
                      }
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      whileHover={
                        isUpdatingCategory ||
                        editingCategoryDraft.label.trim().length < 3
                          ? {}
                          : { y: -1 }
                      }
                      whileTap={
                        isUpdatingCategory ||
                        editingCategoryDraft.label.trim().length < 3
                          ? {}
                          : { scale: 0.98 }
                      }
                    >
                      {isUpdatingCategory ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Guardar cambios</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setEditingCategoryDraft(null)}
                      disabled={isUpdatingCategory}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      whileHover={isUpdatingCategory ? {} : { y: -1 }}
                      whileTap={isUpdatingCategory ? {} : { scale: 0.98 }}
                    >
                      <X className="h-4 w-4" />
                      <span>Cancelar</span>
                    </motion.button>
                  </div>
                </div>
              )}

              <div className="mt-3 grid max-h-[260px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((meta, index) => {
                  const category = meta.category;
                  const Icon = getCategoryIcon(category);
                  const active = category === activeCategory;
                  const recordCount = recordsByCategory[category]?.length || 0;
                  const isDeletingThisCategory = deletingCategory === category;
                  const canDeleteCategory = !meta.is_system && recordCount === 0;

                  return (
                    <motion.div
                      key={category}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectCategory(category)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleSelectCategory(category);
                        }
                      }}
                      className={`group relative min-h-[86px] overflow-hidden rounded-xl border px-3 py-3 text-left transition-all ${
                        active
                          ? 'border-blue-400 bg-blue-50/60 shadow-[0_8px_22px_rgba(37,99,235,0.12)] ring-2 ring-blue-100'
                          : 'border-slate-200 bg-slate-50/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-blue-200 hover:bg-white hover:shadow-sm'
                      }`}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.995 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <span
                        className={`absolute inset-y-0 left-0 w-1.5 ${
                          active ? 'bg-blue-600' : 'bg-slate-300 group-hover:bg-blue-300'
                        }`}
                      />
                      <div className="flex min-w-0 items-start gap-3 pl-1.5">
                        <motion.span
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border ${
                            active
                              ? 'border-blue-200 bg-white text-blue-700'
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                          animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                          transition={{ duration: 0.22 }}
                        >
                          <Icon className="w-5 h-5" />
                        </motion.span>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                              {meta.label}
                            </p>
                            <span
                              className={`flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                active
                                  ? 'border-blue-200 bg-white text-blue-700'
                                  : 'border-slate-200 bg-white text-slate-600'
                              }`}
                            >
                              {recordCount}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 truncate">
                            {meta.description || 'Gestion de porcentajes para esta prima.'}
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-medium text-slate-500">
                              Prima {index + 1}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {meta.is_system && (
                                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-semibold text-slate-600">
                                  Base
                                </span>
                              )}
                              {active && (
                                <span className="rounded-full bg-blue-600 px-2 py-0.5 font-semibold text-white">
                                  Seleccionada
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleStartEditCategory(meta);
                                }}
                                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700 transition-colors hover:bg-blue-50"
                                title="Editar prima"
                              >
                                <PencilLine className="h-3.5 w-3.5" />
                              </button>
                              {!meta.is_system && (
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    if (!canDeleteCategory) {
                                      toast.error('Primero elimina los usuarios asignados a esta prima.');
                                      return;
                                    }
                                    setEditingCategoryDraft(null);
                                    setIsCreateCategoryOpen(false);
                                    setPendingDeleteCategory((prev) =>
                                      prev === category ? null : category,
                                    );
                                  }}
                                  disabled={isDeletingThisCategory}
                                  className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                                    canDeleteCategory
                                      ? 'border-red-200 bg-white text-red-700 hover:bg-red-50'
                                      : 'border-slate-200 bg-white text-slate-400'
                                  }`}
                                  title={
                                    canDeleteCategory
                                      ? 'Eliminar prima'
                                      : 'No se puede eliminar con usuarios asignados'
                                  }
                                >
                                  {isDeletingThisCategory ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                          <AnimatePresence initial={false}>
                            {pendingDeleteCategory === category && (
                              <motion.div
                                className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2"
                                initial={{ opacity: 0, height: 0, y: -4 }}
                                animate={{ opacity: 1, height: 'auto', y: 0 }}
                                exit={{ opacity: 0, height: 0, y: -4 }}
                                transition={{ duration: 0.18, ease: 'easeOut' }}
                                onClick={(event) => event.stopPropagation()}
                              >
                                <p className="text-xs font-medium text-red-800">
                                  Eliminar esta prima del catalogo.
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      void handleDeleteCategory(meta);
                                    }}
                                    disabled={isDeletingThisCategory}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    {isDeletingThisCategory ? (
                                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-3.5 w-3.5" />
                                    )}
                                    <span>Confirmar</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      setPendingDeleteCategory(null);
                                    }}
                                    disabled={isDeletingThisCategory}
                                    className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {isLoadingCategories && (
                <div className="mt-2 flex items-center gap-2 px-2 py-1 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Actualizando catalogo de primas...</span>
                </div>
              )}
            </section>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`category-content-${activeCategory}`}
                variants={categoryContentMotion}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex min-h-[320px] flex-1 flex-col gap-5"
              >

            {/* ── Editor de párrafo de prima ── */}
            <section className="overflow-hidden rounded-xl border border-blue-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <div className="flex flex-col gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-700" />
                  <h3 className="text-slate-900 font-semibold text-sm sm:text-base">
                    Párrafo de {categoryMeta.label}
                  </h3>
                </div>
                {!isEditingTemplate && (
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      onClick={handleResetTemplate}
                      disabled={isSavingTemplate}
                      title="Restablecer al texto original"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-800 disabled:opacity-60 disabled:cursor-not-allowed"
                      whileHover={isSavingTemplate ? {} : { y: -1 }}
                      whileTap={isSavingTemplate ? {} : { scale: 0.97 }}
                    >
                      {isSavingTemplate ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RotateCcw className="w-3.5 h-3.5" />
                      )}
                      <span>Restablecer</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => {
                        setTemplateDraft(templateTextByCategory[activeCategory]);
                        setIsEditingTemplate(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <PencilLine className="w-3.5 h-3.5" />
                      <span>Editar párrafo</span>
                    </motion.button>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-4 sm:p-5">
              <p className="text-xs text-slate-500">
                Usa <code className="bg-white border border-slate-200 rounded px-1 py-0.5 font-mono text-indigo-700">{'{porcentaje}'}</code>{' '}
                para el porcentaje,{' '}
                <code className="bg-white border border-slate-200 rounded px-1 py-0.5 font-mono text-indigo-700">{'{valor_letras}'}</code>{' '}
                para el valor en letras y{' '}
                <code className="bg-white border border-slate-200 rounded px-1 py-0.5 font-mono text-indigo-700">{'{valor_numerico}'}</code>{' '}
                para el valor numérico formateado.
              </p>

              {isLoadingTemplate ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cargando...</span>
                </div>
              ) : isEditingTemplate ? (
                <div className="space-y-3">
                  <textarea
                    rows={3}
                    value={templateDraft}
                    onChange={(e) => setTemplateDraft(e.target.value)}
                    className="w-full border-2 border-blue-200 rounded-lg p-3 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100 resize-none bg-white"
                    placeholder="Escribe el párrafo usando los placeholders indicados..."
                    disabled={isSavingTemplate}
                  />
                  <div className="flex flex-wrap gap-2 justify-end">
                    <motion.button
                      type="button"
                      onClick={handleSaveTemplate}
                      disabled={isSavingTemplate || !templateDraft.trim()}
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      whileHover={isSavingTemplate || !templateDraft.trim() ? {} : { y: -1 }}
                      whileTap={isSavingTemplate || !templateDraft.trim() ? {} : { scale: 0.97 }}
                    >
                      {isSavingTemplate ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Guardando...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Guardar párrafo</span>
                        </>
                      )}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() =>
                        setTemplateDraft(
                          categoryMeta.default_template_text ||
                            DEFAULT_BONUS_TEMPLATES[activeCategory] ||
                            DEFAULT_DYNAMIC_BONUS_TEMPLATE,
                        )
                      }
                      disabled={isSavingTemplate}
                      title="Rellenar con el texto original"
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-100 disabled:opacity-60"
                      whileHover={isSavingTemplate ? {} : { y: -1 }}
                      whileTap={isSavingTemplate ? {} : { scale: 0.97 }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restablecer</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => {
                        setIsEditingTemplate(false);
                        setTemplateDraft('');
                      }}
                      disabled={isSavingTemplate}
                      className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 disabled:opacity-60"
                      whileHover={isSavingTemplate ? {} : { y: -1 }}
                      whileTap={isSavingTemplate ? {} : { scale: 0.97 }}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </motion.button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-700 bg-white rounded-lg border border-blue-100 px-3 py-2.5 leading-relaxed">
                  {templateTextByCategory[activeCategory]
                    ? renderTemplateHighlighted(templateTextByCategory[activeCategory])
                    : <span className="text-slate-400 italic">Sin plantilla cargada.</span>
                  }
                </p>
              )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                    <Search className="w-4 h-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                      Buscar en solicitudes
                    </h3>
                    <p className="truncate text-xs text-slate-500">
                      {categoryMeta.label}
                    </p>
                  </div>
                </div>
                <motion.button
                  type="button"
                  onClick={(event) => openBulkModal(event)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100 sm:flex-shrink-0"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload className="w-4 h-4" />
                  <span>Carga masiva</span>
                </motion.button>
              </div>

              <div className="flex w-full flex-col gap-3 md:flex-row md:items-stretch">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Escribe nombre o número de identificación..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="min-h-11 w-full rounded-lg border-2 border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 sm:text-[15px]"
                  />
                </div>
              </div>

              {searchError && (
                <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{searchError}</span>
                </div>
              )}

              {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                <p className="mt-2 text-xs sm:text-sm text-slate-500">
                  Ingresa al menos 2 caracteres para buscar.
                </p>
              )}

              {searchLoading && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Buscando coincidencias...</span>
                </div>
              )}

              {!searchLoading &&
                searchQuery.trim().length >= 2 &&
                !searchError &&
                searchResults.length === 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    No se encontraron usuarios para la busqueda.
                  </div>
                )}

              {!searchLoading && searchResults.length > 0 && (
                <div className="mt-3 space-y-3">
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
                    {paginatedSearchResults.map((item) => (
                      <motion.button
                        key={`${item.requestId}-${item.idNumber}`}
                        onClick={() => handleSelectCandidate(item)}
                        className="w-full text-left px-3 py-3 transition-colors hover:bg-blue-50 sm:px-4"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                      >
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                            <UserRound className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">
                                {item.fullName}
                              </p>
                              {item.status && item.status !== 'A' && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                  Sin contrato activo
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                              CC {normalizeIdNumber(item.idNumber)}
                            </p>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {searchResults.length > MODAL_ITEMS_PER_PAGE && (
                    <PaginationPremium
                      currentPage={searchPage}
                      totalPages={totalSearchPages}
                      onPageChange={setSearchPage}
                      itemsPerPage={MODAL_ITEMS_PER_PAGE}
                      totalItems={searchResults.length}
                    />
                  )}
                </div>
              )}
            </section>

            {selectedCandidate && (
              <section className="rounded-xl border border-blue-300 bg-white p-4 shadow-[0_8px_22px_rgba(37,99,235,0.10)] sm:p-5">
                <div className="mb-4 flex flex-col gap-3 border-b border-blue-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 flex-shrink-0">
                    <UserRound className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                      Usuario seleccionado
                    </p>
                    <p className="truncate font-semibold text-slate-900">{selectedCandidate.fullName}</p>
                    <p className="text-sm text-slate-600">
                      CC {normalizeIdNumber(selectedCandidate.idNumber)}
                    </p>
                  </div>
                </div>
                <span className="inline-flex w-fit items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {categoryMeta.label}
                </span>
                </div>

                {selectedCandidate.status && selectedCandidate.status !== 'A' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-800">
                        Usuario sin contratos activos
                      </p>
                      <p className="text-sm text-amber-700 mt-0.5">
                        Este usuario no cuenta con contratos activos. No es posible asignarle prima técnica y/o coordinación.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Porcentaje de prima técnica y/o coordinación
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ejemplo: 20"
                        value={percentageInput}
                        onChange={(event) => handlePercentageChange(event.target.value)}
                        className="min-h-11 w-full border-2 border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm sm:text-[15px] outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Valor permitido: mayor a 0 y menor o igual a 100.
                    </p>
                  </div>

                  <motion.button
                    onClick={handleSave}
                    disabled={isSaving || !isValidPercentage || (!!selectedCandidate?.status && selectedCandidate.status !== 'A')}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background:
                        'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
                      boxShadow: '0 8px 18px rgba(30, 64, 175, 0.2)',
                    }}
                    whileHover={isSaving || !isValidPercentage || (!!selectedCandidate?.status && selectedCandidate.status !== 'A') ? {} : { y: -1, scale: 1.01 }}
                    whileTap={isSaving || !isValidPercentage || (!!selectedCandidate?.status && selectedCandidate.status !== 'A') ? {} : { scale: 0.985 }}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        <span>Agregar</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {saveError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{saveError}</span>
                  </div>
                )}
              </section>
            )}

            <section className="rounded-xl border border-slate-300 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:p-5 flex min-h-[280px] flex-1 flex-col">
              <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                    <Users className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
                      Registros guardados
                    </h3>
                    <p className="truncate text-xs text-slate-500">
                      {categoryMeta.label}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:text-sm">
                    {activeRecords.length} registro{activeRecords.length !== 1 ? 's' : ''}
                  </span>
                  {activeRecords.length > 0 && (
                    <motion.button
                      type="button"
                      onClick={() =>
                        setPendingClearCategory((prev) =>
                          prev === activeCategory ? null : activeCategory,
                        )
                      }
                      disabled={
                        isLoadingRecords ||
                        isSaving ||
                        hasRecordMutationInProgress ||
                        clearingCategory === activeCategory
                      }
                      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      whileHover={
                        isLoadingRecords ||
                        isSaving ||
                        hasRecordMutationInProgress ||
                        clearingCategory === activeCategory
                          ? {}
                          : { y: -1 }
                      }
                      whileTap={
                        isLoadingRecords ||
                        isSaving ||
                        hasRecordMutationInProgress ||
                        clearingCategory === activeCategory
                          ? {}
                          : { scale: 0.98 }
                      }
                    >
                      {clearingCategory === activeCategory ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                      <span>Vaciar prima</span>
                    </motion.button>
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {pendingClearCategory === activeCategory && activeRecords.length > 0 && (
                  <motion.div
                    className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3"
                    initial={{ opacity: 0, height: 0, y: -4 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -4 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-red-200 bg-white text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-red-900">
                            Eliminar usuarios de {categoryMeta.label}
                          </p>
                          <p className="text-xs text-red-700 sm:text-sm">
                            Se quitaran {activeRecords.length} usuario{activeRecords.length !== 1 ? 's' : ''} asignado{activeRecords.length !== 1 ? 's' : ''}. La prima y su parrafo se conservaran.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
                        <motion.button
                          type="button"
                          onClick={handleClearCategoryAssignments}
                          disabled={clearingCategory === activeCategory}
                          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          whileHover={
                            clearingCategory === activeCategory ? {} : { y: -1 }
                          }
                          whileTap={
                            clearingCategory === activeCategory ? {} : { scale: 0.98 }
                          }
                        >
                          {clearingCategory === activeCategory ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span>Confirmar</span>
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => setPendingClearCategory(null)}
                          disabled={clearingCategory === activeCategory}
                          className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          whileHover={
                            clearingCategory === activeCategory ? {} : { y: -1 }
                          }
                          whileTap={
                            clearingCategory === activeCategory ? {} : { scale: 0.98 }
                          }
                        >
                          Cancelar
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isLoadingRecords ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600 flex items-center gap-2 flex-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cargando registros...</span>
                </div>
              ) : activeRecords.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
                  <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
                    <Users className="h-5 w-5" />
                  </span>
                  <p className="text-sm font-semibold text-slate-800">
                    Sin usuarios asignados
                  </p>
                  <p className="mt-1 max-w-md text-xs text-slate-500 sm:text-sm">
                    Los registros apareceran aqui cuando se agreguen a {categoryMeta.label}.
                  </p>
                </div>
              ) : (
                <div className="flex flex-1 min-h-0 flex-col gap-3">
                  <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1">
                    {paginatedRecords.map((item) => {
                      const isHighlighted = lastSavedRecordId === item.id;
                      const isEditing = editingRecordState?.id === item.id;
                      const editPercentage = isEditing ? editingRecordState?.percentage || '' : '';
                      const editParsedPercentage = Number(String(editPercentage).replace(',', '.'));
                      const isValidEditPercentage =
                        Number.isFinite(editParsedPercentage) &&
                        editParsedPercentage > 0 &&
                        editParsedPercentage <= 100;
                      const isUpdatingThisRecord = updatingRecordId === item.id;
                      const isDeletingThisRecord = deletingRecordId === item.id;
                      const isDeletePending = pendingDeleteId === item.id;
                      const disableRowActions =
                        hasRecordMutationInProgress || isLoadingRecords || isSaving;

                      return (
                      <motion.div
                        key={item.id}
                        className={`rounded-xl border px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-4 ${
                          isHighlighted ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200 bg-white hover:border-blue-200'
                        }`}
                        initial={{ opacity: 0, y: 10, scale: 0.995 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          boxShadow: isHighlighted
                            ? '0 0 0 2px rgba(52, 211, 153, 0.35)'
                            : '0 0 0 0 rgba(52, 211, 153, 0)',
                        }}
                        exit={{ opacity: 0, y: -8, scale: 0.99 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        layout
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500">
                              <UserRound className="h-5 w-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-900">{item.full_name}</p>
                              <p className="text-xs sm:text-sm text-slate-600">
                                CC {normalizeIdNumber(item.id_number)}
                              </p>
                            </div>
                          </div>

                          <div className="w-full lg:w-auto lg:min-w-[320px]">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div className="relative">
                                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={editPercentage}
                                    onChange={(event) =>
                                      handleEditPercentageChange(event.target.value)
                                    }
                                    placeholder="Ejemplo: 20"
                                    className="w-full border-2 border-slate-200 rounded-lg py-2 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                                    disabled={isUpdatingThisRecord || isDeletingThisRecord}
                                  />
                                </div>
                                <p className="text-[11px] text-slate-500">
                                  Solo se puede editar el porcentaje (0 a 100).
                                </p>
                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                  <motion.button
                                    onClick={() => handleUpdateRecord(item)}
                                    disabled={!isValidEditPercentage || disableRowActions}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                    whileHover={!isValidEditPercentage || disableRowActions ? {} : { y: -1 }}
                                    whileTap={!isValidEditPercentage || disableRowActions ? {} : { scale: 0.98 }}
                                  >
                                    {isUpdatingThisRecord ? (
                                      <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Guardando...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Guardar</span>
                                      </>
                                    )}
                                  </motion.button>
                                  <motion.button
                                    onClick={handleCancelEditRecord}
                                    disabled={isUpdatingThisRecord || isDeletingThisRecord}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                    whileHover={isUpdatingThisRecord || isDeletingThisRecord ? {} : { y: -1 }}
                                    whileTap={isUpdatingThisRecord || isDeletingThisRecord ? {} : { scale: 0.98 }}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Cancelar</span>
                                  </motion.button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div className="sm:text-right">
                                  <p className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-sm font-semibold text-blue-700">
                                    {formatPercentage(Number(item.percentage || 0))}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">
                                    Actualizado: {formatDateTime(item.updated_at)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2 lg:justify-end">
                                  <motion.button
                                    onClick={() => handleStartEditRecord(item)}
                                    disabled={disableRowActions}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                    whileHover={disableRowActions ? {} : { y: -1 }}
                                    whileTap={disableRowActions ? {} : { scale: 0.98 }}
                                  >
                                    <PencilLine className="w-3.5 h-3.5" />
                                    <span>Editar %</span>
                                  </motion.button>
                                  <motion.button
                                    onClick={() => handleToggleDeleteRecord(item.id)}
                                    disabled={disableRowActions}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                    whileHover={disableRowActions ? {} : { y: -1 }}
                                    whileTap={disableRowActions ? {} : { scale: 0.98 }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{isDeletePending ? 'Cancelar' : 'Eliminar'}</span>
                                  </motion.button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {isDeletePending && !isEditing && (
                            <motion.div
                              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                              initial={{ opacity: 0, height: 0, y: -4 }}
                              animate={{ opacity: 1, height: 'auto', y: 0 }}
                              exit={{ opacity: 0, height: 0, y: -4 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                            >
                              <p className="text-xs sm:text-sm text-red-800">
                                Esta acción eliminará el registro de forma permanente.
                              </p>
                              <div className="flex items-center gap-2 sm:flex-shrink-0">
                                <motion.button
                                  onClick={() => setPendingDeleteId(null)}
                                  disabled={isDeletingThisRecord || hasRecordMutationInProgress}
                                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed"
                                  whileHover={isDeletingThisRecord || hasRecordMutationInProgress ? {} : { y: -1 }}
                                  whileTap={isDeletingThisRecord || hasRecordMutationInProgress ? {} : { scale: 0.98 }}
                                >
                                  Cancelar
                                </motion.button>
                                <motion.button
                                  onClick={() => handleDeleteRecord(item)}
                                  disabled={hasRecordMutationInProgress && !isDeletingThisRecord}
                                  className="inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                                  whileHover={hasRecordMutationInProgress && !isDeletingThisRecord ? {} : { y: -1 }}
                                  whileTap={hasRecordMutationInProgress && !isDeletingThisRecord ? {} : { scale: 0.98 }}
                                >
                                  {isDeletingThisRecord ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Eliminando...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Confirmar</span>
                                    </>
                                  )}
                                </motion.button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )})}
                  </div>

                  {activeRecords.length > MODAL_ITEMS_PER_PAGE && (
                    <PaginationPremium
                      currentPage={currentRecordsPage}
                      totalPages={totalRecordsPages}
                      onPageChange={(page) =>
                        setRecordsPageByCategory((prev) => ({
                          ...prev,
                          [activeCategory]: page,
                        }))
                      }
                      itemsPerPage={MODAL_ITEMS_PER_PAGE}
                      totalItems={activeRecords.length}
                    />
                  )}
                </div>
              )}
            </section>
              </motion.div>
            </AnimatePresence>
            </div>
          </div>

          <div className="border-t border-slate-200 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 flex items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-600 inline-flex items-center gap-2">
              <motion.span
                animate={isRecentSavePulse ? { scale: [1, 1.35, 1], rotate: [0, -12, 0] } : { scale: 1, rotate: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="inline-flex"
              >
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </motion.span>
              Gestiona y actualiza los porcentajes de prima técnica y/o coordinación por categoría.
            </p>
            <motion.button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              Cerrar
            </motion.button>
          </div>
        </motion.div>
      </div>
      </div>
      )}
    </AnimatePresence>
  );

  const bulkModalContent = (
    <AnimatePresence>
      {isBulkModalOpen && (
        <div
          className="fixed inset-0 z-[12000] overflow-hidden"
          style={{ zIndex: 2147483000 }}
        >
          <motion.div
            className="fixed inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.36)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
            onClick={() => setIsBulkModalOpen(false)}
          />

          <div
            className="fixed inset-0 flex items-center justify-center p-1 sm:p-2"
            style={{ zIndex: 2147483001 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ type: 'spring', damping: 24, stiffness: 260 }}
              className="flex w-full max-w-none max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_28px_72px_rgba(15,23,42,0.32)]"
              style={{
                width: 'min(96vw, 1080px)',
              }}
            >
              <div
                className="border-b px-5 py-4 sm:px-6"
                style={{
                  borderBottomColor: 'rgba(29, 78, 216, 0.35)',
                  background: 'linear-gradient(135deg, #0B4CB6 0%, #1E40AF 52%, #2563EB 100%)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 hidden h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-white sm:flex">
                      <FileSpreadsheet className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                    <h3 className="text-white text-lg sm:text-xl font-bold">
                      Carga masiva de prima técnica y/o coordinación ({categoryMeta.label})
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Carga registros desde Excel. La validación se realiza por número de
                      documento y se reporta fila por fila.
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-white/20 bg-white/15 px-2.5 py-1 font-semibold text-white">
                        Prima: {categoryMeta.label}
                      </span>
                      <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-medium text-blue-50">
                        Excel .xlsx / .xls
                      </span>
                    </div>
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="text-blue-100 hover:text-white rounded-lg p-2 transition-colors"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.18)' }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>

              <div className="flex-1 min-h-0 space-y-5 overflow-y-auto bg-slate-50 p-4 sm:p-6">
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleBulkFileChange}
                />

                <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-col gap-3 rounded-lg border border-blue-100 bg-blue-50/70 p-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-white text-blue-700">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">
                        Plantilla esperada (.xlsx)
                      </p>
                      <p className="mt-1">
                        Columnas: <code>nombre_completo</code>,{' '}
                        <code>numero_documento</code>, <code>numero_primaTecnica</code>.
                      </p>
                      <p className="mt-1 text-slate-600">
                        El nombre y el porcentaje se validan fila por fila. El número de
                        documento se usa como identificador principal para la carga.
                      </p>
                    </div>
                    </div>
                    <span className="w-fit rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-semibold text-blue-700">
                      {categoryMeta.label}
                    </span>
                  </div>

                  <div
                    className={`rounded-xl border px-3 py-3 ${
                      bulkFileName
                        ? invalidBulkRows.length > 0
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-emerald-200 bg-emerald-50'
                        : 'border-dashed border-slate-300 bg-slate-50'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border bg-white ${
                            bulkFileName
                              ? invalidBulkRows.length > 0
                                ? 'border-amber-200 text-amber-700'
                                : 'border-emerald-200 text-emerald-700'
                              : 'border-slate-200 text-slate-500'
                          }`}
                        >
                          {bulkFileName ? (
                            <FileSpreadsheet className="h-5 w-5" />
                          ) : (
                            <Upload className="h-5 w-5" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {bulkFileName || 'Sin archivo seleccionado'}
                          </p>
                          <p className="text-xs text-slate-600 sm:text-sm">
                            {bulkFileName
                              ? `${validatedBulkRows.length} fila(s), ${validBulkRows.length} valida(s), ${invalidBulkRows.length} con error`
                              : 'Selecciona un archivo Excel para ver la validacion antes de cargar.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-700">
                          Total: {validatedBulkRows.length}
                        </span>
                        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 font-semibold text-emerald-700">
                          Validas: {validBulkRows.length}
                        </span>
                        <span className="rounded-full border border-red-200 bg-white px-2.5 py-1 font-semibold text-red-700">
                          Errores: {invalidBulkRows.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    <motion.button
                      type="button"
                      onClick={handleDownloadBulkTemplate}
                      disabled={isBulkTemplateLoading}
                      className="inline-flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                      whileHover={isBulkTemplateLoading ? {} : { y: -1 }}
                      whileTap={isBulkTemplateLoading ? {} : { scale: 0.98 }}
                    >
                      {isBulkTemplateLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Preparando...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>Descargar plantilla</span>
                        </>
                      )}
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={handlePickBulkFile}
                      className="inline-flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Upload className="w-4 h-4" />
                      <span>Seleccionar archivo</span>
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={handleProcessBulkUpload}
                      disabled={isBulkUploading || validBulkRows.length === 0}
                      className="inline-flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl bg-blue-600 px-3 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      whileHover={isBulkUploading || validBulkRows.length === 0 ? {} : { y: -1 }}
                      whileTap={isBulkUploading || validBulkRows.length === 0 ? {} : { scale: 0.98 }}
                    >
                      {isBulkUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          <span>Cargar {validBulkRows.length} registro(s)</span>
                        </>
                      )}
                    </motion.button>
                  </div>

                  {bulkParseError && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                      <span>{bulkParseError}</span>
                    </div>
                  )}
                </section>

                {validatedBulkRows.length > 0 && (
                  <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
                          <FileText className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-900">
                            Vista previa y validacion del archivo
                          </h4>
                          <p className="truncate text-xs text-slate-500">
                            {bulkFileName || 'Archivo cargado'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          Válidas: {validBulkRows.length}
                        </span>
                        <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-semibold text-red-700">
                          Con error: {invalidBulkRows.length}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-600">
                          Mostrando {Math.min(BULK_PREVIEW_ITEMS_LIMIT, validatedBulkRows.length)} de{' '}
                          {validatedBulkRows.length}
                        </span>
                      </div>
                    </div>

                    {invalidBulkRows.length > 0 && (
                      <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-800 sm:text-sm">
                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                        <span>
                          Se detectaron {invalidBulkRows.length} fila(s) con errores. Esas filas no
                          se enviarán al cargar.
                        </span>
                      </div>
                    )}

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <div className="max-h-80 overflow-auto">
                        <table className="w-full min-w-[980px] text-xs sm:text-sm">
                          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-100 text-slate-600">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Fila</th>
                              <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                              <th className="px-3 py-2 text-left font-semibold">Documento</th>
                              <th className="px-3 py-2 text-left font-semibold">Porcentaje</th>
                              <th className="px-3 py-2 text-left font-semibold">Validación</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewBulkRows.map((row) => (
                              <tr
                                key={`bulk-preview-${row.rowNumber}-${row.idNumber || ''}`}
                                className={row.isValid ? 'bg-white hover:bg-slate-50' : 'bg-red-50/50'}
                              >
                                <td className="px-3 py-2 align-top text-slate-700 font-medium">
                                  {row.rowNumber}
                                </td>
                                <td className="px-3 py-2 align-top text-slate-800">
                                  <span className="break-words whitespace-normal">
                                    {row.fullName || '-'}
                                  </span>
                                </td>
                                <td className="px-3 py-2 align-top text-slate-800">
                                  {row.idNumber || '-'}
                                </td>
                                <td className="px-3 py-2 align-top text-slate-800">
                                  {row.percentage || '-'}
                                </td>
                                <td className="px-3 py-2 align-top">
                                  {row.errors.length ? (
                                    <p className="text-red-700 leading-5 whitespace-nowrap">
                                      {row.errors.join(' ')}
                                    </p>
                                  ) : (
                                    <p className="text-emerald-700 leading-5 whitespace-nowrap">
                                      Fila valida para cargar.
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </section>
                )}

                {bulkResult && (
                  <section className="space-y-4 rounded-xl border border-slate-300 bg-white p-4 shadow-[0_10px_28px_rgba(15,23,42,0.08)]">
                    <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border ${
                            bulkResult.summary.failed === 0
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {bulkResult.summary.failed === 0 ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <AlertCircle className="h-4 w-4" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-slate-900">
                            Resultado de la carga masiva
                          </h4>
                          <p className="truncate text-xs text-slate-500">
                            {bulkFileName || 'Archivo procesado'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          bulkResult.summary.failed === 0
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                        }`}
                      >
                        {bulkResult.summary.failed === 0 ? 'Completada' : 'Con observaciones'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 sm:text-sm">
                      <span>
                        Archivo: <strong>{validatedBulkRows.length}</strong> fila(s)
                      </span>
                      <span>
                        Enviadas: <strong>{validBulkRows.length}</strong>
                      </span>
                      <span>
                        Omitidas por validación: <strong>{invalidBulkRows.length}</strong>
                      </span>
                      <span>
                        Procesadas por servidor: <strong>{bulkResult.summary.total}</strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-xs text-slate-500">Procesadas</p>
                        <p className="text-sm font-semibold text-slate-800">{bulkResult.summary.total}</p>
                      </div>
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                        <p className="text-xs text-emerald-600">Exitosas</p>
                        <p className="text-sm font-semibold text-emerald-700">{bulkResult.summary.success}</p>
                      </div>
                      <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                        <p className="text-xs text-red-600">Fallidas</p>
                        <p className="text-sm font-semibold text-red-700">{bulkResult.summary.failed}</p>
                      </div>
                      <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5">
                        <p className="text-xs text-blue-600">Creadas</p>
                        <p className="text-sm font-semibold text-blue-700">{bulkResult.summary.created}</p>
                      </div>
                      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                        <p className="text-xs text-indigo-600">Actualizadas</p>
                        <p className="text-sm font-semibold text-indigo-700">{bulkResult.summary.updated}</p>
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200">
                      <div className="divide-y divide-slate-100">
                        {bulkResult.results.map((item) => (
                          <div
                            key={`bulk-result-${item.rowNumber}-${item.id_number || item.message}`}
                            className={`px-3 py-3 text-xs sm:text-sm ${
                              item.status === 'success'
                                ? 'bg-emerald-50/45 hover:bg-emerald-50'
                                : 'bg-red-50/45 hover:bg-red-50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${
                                    item.status === 'success'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {item.status === 'success' ? (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  ) : (
                                    <AlertCircle className="h-3.5 w-3.5" />
                                  )}
                                </span>
                                <p
                                  className={`font-semibold ${
                                    item.status === 'success'
                                      ? 'text-emerald-700'
                                      : 'text-red-700'
                                  }`}
                                >
                                  Fila {item.rowNumber} -{' '}
                                  {item.status === 'success' ? 'Procesada' : 'Error'}
                                </p>
                              </div>
                              {item.id_number && (
                                <span className="flex-shrink-0 text-slate-600">CC {item.id_number}</span>
                              )}
                            </div>
                            <p className="mt-1 pl-8 text-slate-700">
                              {formatBulkServerMessage(item.message)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="inline-flex items-center gap-2 text-xs text-slate-600 sm:text-sm">
                  {invalidBulkRows.length > 0 ? (
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                  <span>
                    {validatedBulkRows.length > 0
                      ? `${validBulkRows.length} valida(s), ${invalidBulkRows.length} con error`
                      : 'Carga registros desde una plantilla Excel valida.'}
                  </span>
                </p>
                <motion.button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Cerrar
                </motion.button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {createPortal(modalContent, document.body)}
      {createPortal(bulkModalContent, document.body)}
    </>
  );
}
