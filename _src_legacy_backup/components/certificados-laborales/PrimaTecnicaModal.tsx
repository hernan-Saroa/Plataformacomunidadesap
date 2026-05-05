import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  PencilLine,
  Percent,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { certificadosService } from '../../services/api/certificados.service';
import { PaginationPremium } from '../shared/PaginationPremium';

type PrimaTecnicaCategoria = 'DIRECTIVOS' | 'COORDINADORES';

type PrimaTecnicaCandidato = {
  requestId: string;
  fullName: string;
  idNumber: string;
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

const CATEGORY_META: Record<
  PrimaTecnicaCategoria,
  { label: string; description: string; icon: typeof Building2 }
> = {
  DIRECTIVOS: {
    label: 'Directivos',
    description: 'Gestion de porcentajes para directivos.',
    icon: Building2,
  },
  COORDINADORES: {
    label: 'Coordinadores',
    description: 'Gestion de porcentajes para coordinadores.',
    icon: Users,
  },
};

const INITIAL_CATEGORY_STATE: EstadoCategoria = {
  DIRECTIVOS: { selected: null, percentage: '' },
  COORDINADORES: { selected: null, percentage: '' },
};

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

const MODAL_ITEMS_PER_PAGE = 20;
const BULK_PREVIEW_ITEMS_LIMIT = 20;
const BULK_NAME_ALLOWED_REGEX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'.-]+$/;
const BULK_ID_NUMBER_REGEX = /^\d+$/;
const BULK_PERCENTAGE_REGEX = /^\d+(?:[.,]\d{1,2})?$/;

const categoryContentMotion = {
  initial: { opacity: 0, y: 14 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: 'easeOut' },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: 0.16, ease: 'easeIn' },
  },
};

const findExistingRecordByIdNumber = (
  recordsByCategory: Record<PrimaTecnicaCategoria, PrimaTecnicaRegistro[]>,
  idNumber: string,
): PrimaTecnicaRegistro | null => {
  if (!idNumber) return null;
  const categories: PrimaTecnicaCategoria[] = ['DIRECTIVOS', 'COORDINADORES'];
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
  >({
    DIRECTIVOS: [],
    COORDINADORES: [],
  });
  const [searchPage, setSearchPage] = React.useState(1);
  const [recordsPageByCategory, setRecordsPageByCategory] = React.useState<
    Record<PrimaTecnicaCategoria, number>
  >({
    DIRECTIVOS: 1,
    COORDINADORES: 1,
  });
  const [categoryState, setCategoryState] =
    React.useState<EstadoCategoria>(INITIAL_CATEGORY_STATE);
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

  const fetchRecords = React.useCallback(async (category?: PrimaTecnicaCategoria) => {
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

      const [directivos, coordinadores] = await Promise.all([
        certificadosService.laborales.listarPrimaTecnica('DIRECTIVOS'),
        certificadosService.laborales.listarPrimaTecnica('COORDINADORES'),
      ]);

      setRecordsByCategory({
        DIRECTIVOS: Array.isArray(directivos) ? directivos : [],
        COORDINADORES: Array.isArray(coordinadores) ? coordinadores : [],
      });
    } catch (error: any) {
      const message = String(error?.message || 'No se pudo cargar la informacion de Prima Tecnica.');
      toast.error(message);
    } finally {
      setIsLoadingRecords(false);
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
      setCategoryState(INITIAL_CATEGORY_STATE);
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
      setRecordsPageByCategory({
        DIRECTIVOS: 1,
        COORDINADORES: 1,
      });
      setActiveCategory('DIRECTIVOS');
      return;
    }

    void fetchRecords();
  }, [isOpen, fetchRecords]);

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
        setSearchError(String(error?.message || 'No se pudo realizar la busqueda.'));
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

  const activeCategoryState = categoryState[activeCategory];
  const selectedCandidate = activeCategoryState.selected;
  const percentageInput = activeCategoryState.percentage;
  const parsedPercentage = Number(String(percentageInput || '').replace(',', '.'));
  const isValidPercentage =
    Number.isFinite(parsedPercentage) && parsedPercentage > 0 && parsedPercentage <= 100;

  const categoryMeta = CATEGORY_META[activeCategory];
  const activeRecords = recordsByCategory[activeCategory] || [];
  const currentRecordsPage = recordsPageByCategory[activeCategory] || 1;

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
          errors.push('El nombre no puede contener numeros.');
        }
        if (!BULK_NAME_ALLOWED_REGEX.test(fullName)) {
          errors.push('El nombre contiene caracteres no permitidos.');
        }
      }

      if (!idNumber) {
        errors.push('El numero de documento es obligatorio.');
      } else if (!BULK_ID_NUMBER_REGEX.test(idNumber)) {
        errors.push('El documento solo permite numeros (sin puntos, guiones ni espacios).');
      }

      let normalizedPercentage: number | null = null;
      if (!percentage) {
        errors.push('El porcentaje es obligatorio.');
      } else if (percentageHasSymbol) {
        errors.push('El porcentaje no debe incluir simbolos como %. Escribe solo el numero.');
      } else if (!BULK_PERCENTAGE_REGEX.test(percentage)) {
        errors.push('El porcentaje solo permite numeros (hasta 2 decimales).');
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

  const handleSelectCandidate = (candidate: PrimaTecnicaCandidato) => {
    const normalizedCandidateId = normalizeIdNumber(candidate.idNumber);
    const existingRecord = findExistingRecordByIdNumber(
      recordsByCategory,
      normalizedCandidateId,
    );

    if (existingRecord) {
      const existingCategory = existingRecord.category;
      const categoryLabel = CATEGORY_META[existingCategory].label;
      toast.error(
        `${candidate.fullName} ya tiene Prima Tecnica registrada en ${categoryLabel}.`,
      );

      setCategoryState((prev) => ({
        ...prev,
        DIRECTIVOS: { selected: null, percentage: '' },
        COORDINADORES: { selected: null, percentage: '' },
      }));
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
        ...prev[activeCategory],
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
        ...prev[activeCategory],
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
      toast.error('Ingresa un porcentaje valido entre 0 y 100.');
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
        error?.message || 'No se pudo actualizar el porcentaje de Prima Tecnica.',
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
        error?.message || 'No se pudo eliminar el registro de Prima Tecnica.',
      );
      setSaveError(message);
      toast.error(message);
    } finally {
      setDeletingRecordId(null);
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
        throw new Error('Selecciona un archivo Excel valido (.xlsx o .xls).');
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
        `Archivo listo: ${rows.length} fila(s) detectadas. Revisa la validacion en la vista previa.`,
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
        'No hay filas validas para cargar. Corrige los errores de la vista previa.',
      );
      return;
    }

    setIsBulkUploading(true);
    setBulkParseError(null);
    setSaveError(null);

    try {
      if (invalidBulkRows.length > 0) {
        toast.warning(
          `Se omitiran ${invalidBulkRows.length} fila(s) con errores. Solo se enviaran ${validBulkRows.length} fila(s) validas.`,
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
        error?.message || 'No se pudo procesar la carga masiva de Prima Tecnica.',
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
      toast.error('Ingresa un porcentaje valido entre 0 y 100.');
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
        error?.message || 'No se pudo guardar el registro de Prima Tecnica.',
      );
      setSaveError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasRecordMutationInProgress = Boolean(updatingRecordId || deletingRecordId);

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
                  Prima Tecnica
                </h2>
                <p className="text-blue-100 text-sm sm:text-[15px] mt-1">
                  Configura porcentajes para Directivos y Coordinadores con busqueda por nombre o identificacion.
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

          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
            <div className="flex min-h-full flex-col gap-5">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(CATEGORY_META) as PrimaTecnicaCategoria[]).map((category) => {
                  const meta = CATEGORY_META[category];
                  const Icon = meta.icon;
                  const active = category === activeCategory;

                  return (
                    <motion.button
                      key={category}
                      onClick={() => {
                        setActiveCategory(category);
                        setSearchQuery('');
                        setSearchResults([]);
                        setSearchPage(1);
                        setSearchError(null);
                        setSaveError(null);
                        setEditingRecordState(null);
                        setPendingDeleteId(null);
                      }}
                      className={`text-left rounded-lg px-3 py-3 sm:px-4 border transition-all ${
                        active
                          ? 'bg-white border-blue-300 shadow-sm'
                          : 'bg-transparent border-transparent hover:bg-white/70'
                      }`}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.995 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                    >
                      <div className="flex items-center gap-3">
                        <motion.span
                          className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            active ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                          }`}
                          animate={active ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                          transition={{ duration: 0.22 }}
                        >
                          <Icon className="w-5 h-5" />
                        </motion.span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm sm:text-base">
                            {meta.label}
                          </p>
                          <p className="text-xs sm:text-sm text-slate-600 truncate">
                            {meta.description}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
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
            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-700" />
                <h3 className="text-slate-900 font-semibold">
                  Buscar en solicitudes ({categoryMeta.label})
                </h3>
              </div>

              <div className="flex w-full flex-col gap-3 md:flex-row md:items-stretch">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Escribe nombre o numero de identificacion..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="w-full border-2 border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm sm:text-[15px] outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <motion.button
                  type="button"
                  onClick={(event) => openBulkModal(event)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100 md:flex-shrink-0"
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Upload className="w-4 h-4" />
                  <span>Carga masiva</span>
                </motion.button>
              </div>

              {searchError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{searchError}</span>
                </div>
              )}

              {searchQuery.trim().length > 0 && searchQuery.trim().length < 2 && (
                <p className="text-xs sm:text-sm text-slate-500">
                  Ingresa al menos 2 caracteres para buscar.
                </p>
              )}

              {searchLoading && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Buscando coincidencias...</span>
                </div>
              )}

              {!searchLoading &&
                searchQuery.trim().length >= 2 &&
                !searchError &&
                searchResults.length === 0 && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                    No se encontraron coincidencias en certificate_requests.
                  </div>
                )}

              {!searchLoading && searchResults.length > 0 && (
                <div className="space-y-3">
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                    {paginatedSearchResults.map((item) => (
                      <motion.button
                        key={`${item.requestId}-${item.idNumber}`}
                        onClick={() => handleSelectCandidate(item)}
                        className="w-full text-left px-3 sm:px-4 py-3 hover:bg-blue-50 transition-colors"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.18, ease: 'easeOut' }}
                      >
                        <p className="text-sm sm:text-[15px] font-semibold text-slate-900">
                          {item.fullName}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 mt-1">
                          CC {normalizeIdNumber(item.idNumber)}
                        </p>
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
              <section className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 sm:p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-white border border-blue-200 flex items-center justify-center text-blue-700 flex-shrink-0">
                    <UserRound className="w-5 h-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{selectedCandidate.fullName}</p>
                    <p className="text-sm text-slate-600">
                      CC {normalizeIdNumber(selectedCandidate.idNumber)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      Porcentaje de Prima Tecnica
                    </label>
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        inputMode="decimal"
                        placeholder="Ejemplo: 20"
                        value={percentageInput}
                        onChange={(event) => handlePercentageChange(event.target.value)}
                        className="w-full border-2 border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm sm:text-[15px] outline-none transition-all focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Valor permitido: mayor a 0 y menor o igual a 100.
                    </p>
                  </div>

                  <motion.button
                    onClick={handleSave}
                    disabled={isSaving || !isValidPercentage}
                    className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      background:
                        'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
                      boxShadow: '0 8px 18px rgba(30, 64, 175, 0.2)',
                    }}
                    whileHover={isSaving || !isValidPercentage ? {} : { y: -1, scale: 1.01 }}
                    whileTap={isSaving || !isValidPercentage ? {} : { scale: 0.985 }}
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
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{saveError}</span>
                  </div>
                )}
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4 flex min-h-[280px] flex-1 flex-col">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-slate-900 font-semibold">
                  Registros guardados ({categoryMeta.label})
                </h3>
                <span className="text-xs sm:text-sm text-slate-500">
                  {activeRecords.length} registro{activeRecords.length !== 1 ? 's' : ''}
                </span>
              </div>

              {isLoadingRecords ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-600 flex items-center gap-2 flex-1">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Cargando registros...</span>
                </div>
              ) : activeRecords.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-5 text-sm text-slate-600 flex-1">
                  Todavia no hay registros para esta categoria.
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
                        className={`rounded-lg border px-3 sm:px-4 py-3 ${
                          isHighlighted ? 'border-emerald-300 bg-emerald-50/70' : 'border-slate-200'
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
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 truncate">{item.full_name}</p>
                            <p className="text-xs sm:text-sm text-slate-600">
                              CC {normalizeIdNumber(item.id_number)}
                            </p>
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
                                  <p className="text-sm font-semibold text-blue-700">
                                    {formatPercentage(Number(item.percentage || 0))}
                                  </p>
                                  <p className="text-xs text-slate-500">
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
                                Esta accion eliminara el registro de forma permanente.
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
              Gestiona y actualiza los porcentajes de Prima Tecnica por categoria.
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
              backgroundColor: 'rgba(15, 23, 42, 0.24)',
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
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
              className="w-full max-w-none max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-[0_28px_72px_rgba(15,23,42,0.32)] flex flex-col"
              style={{
                width: 'min(94vw, 1040px)',
              }}
            >
              <div
                className="px-5 sm:px-6 py-4 border-b"
                style={{
                  borderBottomColor: 'rgba(29, 78, 216, 0.35)',
                  background: 'linear-gradient(135deg, #0B4CB6 0%, #1E40AF 52%, #2563EB 100%)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-white text-lg sm:text-xl font-bold">
                      Carga masiva de Prima Tecnica ({categoryMeta.label})
                    </h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Carga registros desde Excel. La validacion se realiza por numero de
                      documento y se reporta fila por fila.
                    </p>
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

              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50">
                <input
                  ref={bulkFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleBulkFileChange}
                />

                <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-start gap-3">
                    <span className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center flex-shrink-0">
                      <FileSpreadsheet className="w-5 h-5" />
                    </span>
                    <div className="text-sm text-slate-700">
                      <p className="font-semibold text-slate-900">
                        Plantilla esperada (.xlsx)
                      </p>
                      <p className="mt-1">
                        Columnas: <code>nombre_completo</code>,{' '}
                        <code>numero_documento</code>, <code>numero_primaTecnica</code>.
                      </p>
                      <p className="mt-1 text-slate-600">
                        El nombre y el porcentaje se validan fila por fila. El numero de
                        documento se usa como identificador principal para la carga.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <motion.button
                      type="button"
                      onClick={handleDownloadBulkTemplate}
                      disabled={isBulkTemplateLoading}
                      className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60 disabled:cursor-not-allowed"
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
                      className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
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
                      className="min-h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
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

                  {bulkFileName && (
                    <p className="text-xs sm:text-sm text-slate-600 break-all">
                      Archivo seleccionado: <span className="font-semibold">{bulkFileName}</span>{' '}
                      ({validatedBulkRows.length} fila(s): {validBulkRows.length} valida(s),{' '}
                      {invalidBulkRows.length} con error)
                    </p>
                  )}

                  {bulkParseError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{bulkParseError}</span>
                    </div>
                  )}
                </section>

                {validatedBulkRows.length > 0 && (
                  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="font-semibold text-slate-900">
                        Vista previa y validacion del archivo
                      </h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          Validas: {validBulkRows.length}
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
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs sm:text-sm text-amber-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>
                          Se detectaron {invalidBulkRows.length} fila(s) con errores. Esas filas no
                          se enviaran al cargar.
                        </span>
                      </div>
                    )}

                    <div className="rounded-lg border border-slate-200 overflow-hidden">
                      <div className="max-h-80 overflow-auto">
                        <table className="min-w-[980px] w-full text-xs sm:text-sm">
                          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200 text-slate-600">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">Fila</th>
                              <th className="px-3 py-2 text-left font-semibold">Nombre</th>
                              <th className="px-3 py-2 text-left font-semibold">Documento</th>
                              <th className="px-3 py-2 text-left font-semibold">Porcentaje</th>
                              <th className="px-3 py-2 text-left font-semibold">Validacion</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {previewBulkRows.map((row) => (
                              <tr
                                key={`bulk-preview-${row.rowNumber}-${row.idNumber || ''}`}
                                className={row.isValid ? 'bg-white' : 'bg-red-50/40'}
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
                  <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <h4 className="font-semibold text-slate-900">
                      Resultado de la carga masiva
                    </h4>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs sm:text-sm text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>
                        Archivo: <strong>{validatedBulkRows.length}</strong> fila(s)
                      </span>
                      <span>
                        Enviadas: <strong>{validBulkRows.length}</strong>
                      </span>
                      <span>
                        Omitidas por validacion: <strong>{invalidBulkRows.length}</strong>
                      </span>
                      <span>
                        Procesadas por servidor: <strong>{bulkResult.summary.total}</strong>
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-500">Procesadas</p>
                        <p className="text-sm font-semibold text-slate-800">{bulkResult.summary.total}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                        <p className="text-xs text-emerald-600">Exitosas</p>
                        <p className="text-sm font-semibold text-emerald-700">{bulkResult.summary.success}</p>
                      </div>
                      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                        <p className="text-xs text-red-600">Fallidas</p>
                        <p className="text-sm font-semibold text-red-700">{bulkResult.summary.failed}</p>
                      </div>
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
                        <p className="text-xs text-blue-600">Creadas</p>
                        <p className="text-sm font-semibold text-blue-700">{bulkResult.summary.created}</p>
                      </div>
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2">
                        <p className="text-xs text-indigo-600">Actualizadas</p>
                        <p className="text-sm font-semibold text-indigo-700">{bulkResult.summary.updated}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 max-h-72 overflow-y-auto">
                      <div className="divide-y divide-slate-100">
                        {bulkResult.results.map((item) => (
                          <div
                            key={`bulk-result-${item.rowNumber}-${item.id_number || item.message}`}
                            className={`px-3 py-2.5 text-xs sm:text-sm ${
                              item.status === 'success'
                                ? 'bg-emerald-50/45'
                                : 'bg-red-50/45'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
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
                              {item.id_number && (
                                <span className="text-slate-600">CC {item.id_number}</span>
                              )}
                            </div>
                            <p className="text-slate-700 mt-1">
                              {formatBulkServerMessage(item.message)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>

              <div className="border-t border-slate-200 bg-white px-4 sm:px-6 py-3 flex justify-end">
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
