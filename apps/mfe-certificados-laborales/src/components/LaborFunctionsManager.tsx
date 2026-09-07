import React from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  FileCheck2,
  FileSpreadsheet,
  Info,
  Layers3,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  certificadosService,
  type LaborFunctionProfileApi,
  type LaborFunctionProfilePayloadApi,
} from '../../services/api/certificados.service';

type EditorState = {
  id?: string;
  positionCode: string;
  gradeCode: string;
  combinedCode: string;
  hierarchicalLevel: string;
  positionName: string;
  departmentName: string;
  internalGroup: string;
  costCenter: string;
  functions: string;
};

type EditorField = Exclude<keyof EditorState, 'id'>;
type EditorErrors = Partial<Record<EditorField, string>>;
type BulkError = { rowNumber: number; field?: EditorField | 'row'; message: string; source?: 'client' | 'server' };
type BulkStage = 'select' | 'review' | 'result';
type BulkFileError = { fileName: string; message: string };
type OperationSuccessNotice = { title: string; message: string };
type BulkValidationRow = {
  rowNumber: number;
  status: 'valid' | 'error';
  action?: 'created' | 'updated' | null;
  combined_code?: string;
  function_count?: number;
  message: string;
};
type BulkValidationResponse = {
  summary: { total: number; valid: number; invalid: number; toCreate: number; toUpdate: number };
  results: BulkValidationRow[];
};
type BulkImportResponse = {
  summary: { total: number; success: number; failed: number; created: number; updated: number };
  results: Array<{
    rowNumber: number;
    status: 'success' | 'error';
    action?: 'created' | 'updated';
    combined_code?: string;
    function_count?: number;
    message: string;
  }>;
};

const BULK_PAGE_SIZE = 50;
// Mantiene cada bloque por debajo del límite HTTP predeterminado incluso antes
// de que una instancia desplegada adopte la configuración ampliada del backend.
const BULK_REQUEST_MAX_BYTES = 80 * 1024;

type PaginationItem =
  | { type: 'page'; value: number }
  | { type: 'ellipsis'; key: string };

const buildPaginationItems = (currentPage: number, totalPages: number): PaginationItem[] => {
  if (totalPages <= 1) return [{ type: 'page', value: 1 }];

  const visiblePages = new Set<number>([1, totalPages]);
  for (let value = currentPage - 2; value <= currentPage + 2; value += 1) {
    if (value > 1 && value < totalPages) visiblePages.add(value);
  }

  if (currentPage <= 4) {
    for (let value = 2; value <= Math.min(5, totalPages - 1); value += 1) visiblePages.add(value);
  }
  if (currentPage >= totalPages - 3) {
    for (let value = Math.max(2, totalPages - 4); value < totalPages; value += 1) visiblePages.add(value);
  }

  const sortedPages = [...visiblePages].sort((a, b) => a - b);
  const items: PaginationItem[] = [];
  sortedPages.forEach((value, index) => {
    const previous = sortedPages[index - 1];
    if (previous && value - previous > 1) {
      items.push({ type: 'ellipsis', key: `ellipsis-${previous}-${value}` });
    }
    items.push({ type: 'page', value });
  });
  return items;
};
const FIELD_LABELS: Partial<Record<EditorField | 'row', string>> = {
  positionCode: 'Código',
  gradeCode: 'Grado',
  combinedCode: 'cod_cargo',
  hierarchicalLevel: 'Nivel jerárquico',
  positionName: 'Denominación',
  departmentName: 'Dependencia/Área',
  internalGroup: 'Grupo interno',
  costCenter: 'Centro de costo',
  functions: 'Funciones',
  row: 'Fila',
};

const EMPTY_EDITOR: EditorState = {
  positionCode: '',
  gradeCode: '',
  combinedCode: '',
  hierarchicalLevel: '',
  positionName: '',
  departmentName: '',
  internalGroup: '',
  costCenter: '',
  functions: '',
};

const HIERARCHICAL_LEVELS = [
  'Directivo',
  'Asesor',
  'Profesional',
  'Técnico',
  'Asistencial',
  'Docente',
];

const normalizeHeader = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const OFFICIAL_SHEET_NAME = 'Matriz Funciones ESAP';
const OFFICIAL_TEMPLATE_MARKER = normalizeHeader(
  'PLANTILLA OFICIAL DE CARGA - No cambie el nombre de esta hoja',
);
const OFFICIAL_TEMPLATE_HEADERS = [
  'Código',
  'Grado',
  'cod_cargo',
  'Nivel Jerárquico',
  'Denominación del empleo',
  'Dependencia/Área',
  'Grupo Interno',
  'CentroCosto',
  'FUNCIONES',
];
const NORMALIZED_OFFICIAL_TEMPLATE_HEADERS = OFFICIAL_TEMPLATE_HEADERS.map(normalizeHeader);

const normalizeMatchText = (value: unknown) => normalizeHeader(value);

const findHeader = (headers: string[], aliases: string[]) =>
  headers.findIndex((header) => aliases.includes(header));

const normalizeGrade = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D+/g, '');
  if (!digits) return '';
  const normalized = digits.replace(/^0+(?=\d)/, '');
  return normalized.padStart(2, '0');
};

const normalizePositionCode = (value: unknown) => {
  const digits = String(value ?? '').replace(/\D+/g, '');
  return digits ? digits.padStart(4, '0') : '';
};

const expectedCombinedCode = (positionCode: unknown, gradeCode: unknown) => {
  const base = normalizePositionCode(positionCode);
  const grade = normalizeGrade(gradeCode);
  return base ? `${base}${grade}` : '';
};

const extractFunctionItems = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.flatMap(extractFunctionItems);
  }
  const text = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  if (!text) return [];
  const marker = /(?:^|[\s;])(?:funci[oó]n\s*)?(\d{1,3})\s*[.)-]\s*/gi;
  const matches = Array.from(text.matchAll(marker));
  const rawItems = matches.length
    ? matches.map((match, index) => {
        const start = (match.index || 0) + match[0].length;
        const end = index + 1 < matches.length ? matches[index + 1].index : text.length;
        return text.slice(start, end);
      })
    : text.split(/\n+|\s*[•]\s*|\s*;\s*(?=[A-ZÁÉÍÓÚÑ])/);
  return rawItems
    .map((item) => item.replace(/^\s*\d{1,3}\s*[.)-]\s*/, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
};

const splitFunctions = (value: unknown): string[] => {
  const seen = new Set<string>();
  return extractFunctionItems(value).filter((item) => {
    const key = normalizeMatchText(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

type DuplicateFunctionDetail = {
  duplicateOrdinal: number;
  originalOrdinal: number;
  description: string;
};

const findDuplicateFunctions = (value: unknown): DuplicateFunctionDetail[] => {
  const seen = new Map<string, number>();
  const duplicates: DuplicateFunctionDetail[] = [];

  extractFunctionItems(value).forEach((description, index) => {
    const key = normalizeMatchText(description);
    if (!key) return;

    const originalOrdinal = seen.get(key);
    if (originalOrdinal !== undefined) {
      duplicates.push({
        duplicateOrdinal: index + 1,
        originalOrdinal,
        description,
      });
      return;
    }

    seen.set(key, index + 1);
  });

  return duplicates;
};

const duplicateFunctionsMessage = (duplicates: DuplicateFunctionDetail[]): string => {
  const visibleDuplicates = duplicates.slice(0, 5);
  const details = visibleDuplicates.map(({ duplicateOrdinal, originalOrdinal, description }) => {
    const preview = description.length > 120 ? `${description.slice(0, 117).trimEnd()}...` : description;
    return `la función ${duplicateOrdinal} repite la función ${originalOrdinal}: «${preview}»`;
  });
  const hiddenCount = duplicates.length - visibleDuplicates.length;
  const hiddenDetail = hiddenCount > 0
    ? ` Además, hay ${hiddenCount} repetición${hiddenCount === 1 ? '' : 'es'} más.`
    : '';

  return `Hay funciones duplicadas: ${details.join('; ')}.${hiddenDetail} Elimina las repetidas antes de guardar.`;
};

const functionPreviewCount = (value: unknown) => extractFunctionItems(value).length;

const splitBulkRequestRows = (
  rows: LaborFunctionProfilePayloadApi[],
): LaborFunctionProfilePayloadApi[][] => {
  const chunks: LaborFunctionProfilePayloadApi[][] = [];
  let current: LaborFunctionProfilePayloadApi[] = [];
  let currentBytes = 0;
  rows.forEach((row) => {
    const rowBytes = new TextEncoder().encode(JSON.stringify(row)).length + 1;
    if (current.length && currentBytes + rowBytes > BULK_REQUEST_MAX_BYTES) {
      chunks.push(current);
      current = [];
      currentBytes = 0;
    }
    current.push(row);
    currentBytes += rowBytes;
  });
  if (current.length) chunks.push(current);
  return chunks;
};

const readableBulkRequestError = (error: any) => {
  const message = String(error?.message || '').trim();
  if (/request entity too large|payload too large|status\s*413/i.test(message)) {
    return 'El bloque de información superó el tamaño permitido por el servidor.';
  }
  return message || 'No fue posible validar este bloque de filas.';
};

const validateCodes = (
  positionCode: unknown,
  gradeCode: unknown,
  combinedCode: unknown,
): Pick<EditorErrors, 'positionCode' | 'gradeCode' | 'combinedCode'> => {
  const errors: Pick<EditorErrors, 'positionCode' | 'gradeCode' | 'combinedCode'> = {};
  const position = String(positionCode ?? '').trim();
  const grade = String(gradeCode ?? '').trim();
  const combined = String(combinedCode ?? '').trim();

  if (!position) {
    errors.positionCode = 'El código base del cargo es obligatorio.';
  } else if (!/^\d{1,4}$/.test(position)) {
    errors.positionCode = 'Usa únicamente números y máximo 4 dígitos; se conservan ceros iniciales.';
  }
  if (grade && !/^\d{1,3}$/.test(grade)) {
    errors.gradeCode = 'El grado debe contener entre 1 y 3 dígitos.';
  }
  if (combined && !/^\d{1,20}$/.test(combined)) {
    errors.combinedCode = 'cod_cargo solo puede contener números.';
  }

  if (!errors.positionCode && !errors.gradeCode && !errors.combinedCode && combined) {
    const expected = expectedCombinedCode(position, grade);
    if (combined !== expected) {
      errors.combinedCode = `Debe coincidir con Código + Grado: ${expected}.`;
    }
  }
  return errors;
};

const validateEditor = (value: EditorState): EditorErrors => {
  const errors: EditorErrors = { ...validateCodes(value.positionCode, value.gradeCode, value.combinedCode) };
  const level = value.hierarchicalLevel.trim();
  const positionName = value.positionName.trim();
  const department = value.departmentName.trim();
  const functions = splitFunctions(value.functions);
  const duplicateFunctions = findDuplicateFunctions(value.functions);

  if (!level) errors.hierarchicalLevel = 'Selecciona o escribe el nivel jerárquico.';
  else if (level.length > 100) errors.hierarchicalLevel = 'Máximo 100 caracteres.';
  if (positionName.length < 3) errors.positionName = 'Ingresa la denominación institucional exacta (mínimo 3 caracteres).';
  else if (positionName.length > 255) errors.positionName = 'Máximo 255 caracteres.';
  if (department.length < 3) errors.departmentName = 'La dependencia o área es obligatoria.';
  else if (department.length > 500) errors.departmentName = 'Máximo 500 caracteres.';
  if (value.internalGroup.trim().length > 500) errors.internalGroup = 'Máximo 500 caracteres.';
  if (value.costCenter.trim().length > 255) errors.costCenter = 'Máximo 255 caracteres.';
  if (!functions.length) errors.functions = 'Agrega al menos una función numerada o una función por línea.';
  else if (duplicateFunctions.length) errors.functions = duplicateFunctionsMessage(duplicateFunctions);
  else if (functions.length > 500) errors.functions = 'Se permiten máximo 500 funciones por perfil.';
  else if (functions.some((item) => item.length < 8)) errors.functions = 'Cada función debe tener al menos 8 caracteres.';
  else if (functions.some((item) => item.length > 5000)) errors.functions = 'Cada función debe tener máximo 5.000 caracteres.';
  return errors;
};

const validateBulkRows = (rows: LaborFunctionProfilePayloadApi[]): BulkError[] => {
  const errors: BulkError[] = [];
  const matchKeys = new Map<string, { rowNumber: number; functionSignature: string }>();
  rows.forEach((row, index) => {
    const rowNumber = Number(row.rowNumber) || index + 1;
    const editorValue: EditorState = {
      positionCode: String(row.positionCode || ''),
      gradeCode: String(row.gradeCode || ''),
      combinedCode: String(row.combinedCode || ''),
      hierarchicalLevel: String(row.hierarchicalLevel || ''),
      positionName: String(row.positionName || ''),
      departmentName: String(row.departmentName || ''),
      internalGroup: String(row.internalGroup || ''),
      costCenter: String(row.costCenter || ''),
      functions: Array.isArray(row.functions) ? row.functions.join('\n') : String(row.functions || ''),
    };
    const rowErrors = validateEditor(editorValue);
    Object.entries(rowErrors).forEach(([field, message]) => {
      if (message) errors.push({ rowNumber, field: field as EditorField, message, source: 'client' });
    });

    if (!Object.keys(rowErrors).length) {
      const combined = row.combinedCode || expectedCombinedCode(row.positionCode, row.gradeCode);
      const matchKey = [
        combined,
        row.hierarchicalLevel,
        row.positionName,
        row.departmentName,
        row.internalGroup,
        row.costCenter,
      ].map(normalizeMatchText).join('|');
      const functionSignature = splitFunctions(row.functions).map(normalizeMatchText).join('|');
      const previous = matchKeys.get(matchKey);
      if (previous) {
        const exactDuplicate = previous.functionSignature === functionSignature;
        errors.push({
          rowNumber,
          field: 'row',
          message: exactDuplicate
            ? `Esta fila es idéntica a la fila ${previous.rowNumber}: repite el mismo cargo, ubicación y funciones. Se omitirá para evitar guardar el perfil dos veces.`
            : `Esta fila repite el mismo cargo y ubicación de la fila ${previous.rowNumber}, pero contiene funciones diferentes. Unifica todas las funciones en una sola fila o completa el grupo o centro de costo que las diferencia.`,
          source: 'client',
        });
      } else {
        matchKeys.set(matchKey, { rowNumber, functionSignature });
      }
    }
  });
  return errors;
};

type ModalShellProps = {
  open: boolean;
  titleId: string;
  children: React.ReactNode;
  onClose: () => void;
  busy?: boolean;
  widthClass?: string;
};

function ModalShell({ open, titleId, children, onClose, busy = false, widthClass = 'max-w-5xl' }: ModalShellProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10000] flex items-center justify-center overflow-y-auto p-3 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onMouseDown={() => { if (!busy) onClose(); }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 26, scale: 0.965 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.975 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className={`relative flex max-h-[95vh] w-full flex-col overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl ${widthClass}`}
          >
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

type PaginationNavigatorProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showJump?: boolean;
};

function PaginationNavigator({ page, totalPages, onPageChange, showJump = false }: PaginationNavigatorProps) {
  const [pageInput, setPageInput] = React.useState(String(page));
  const jumpInputId = React.useId();
  const items = React.useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages]);

  React.useEffect(() => setPageInput(String(page)), [page]);

  const goToInputPage = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestedPage = Number.parseInt(pageInput, 10);
    const targetPage = Number.isFinite(requestedPage)
      ? Math.min(totalPages, Math.max(1, requestedPage))
      : page;
    setPageInput(String(targetPage));
    onPageChange(targetPage);
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <nav aria-label="Páginas disponibles" className="flex items-center gap-1">
        {items.map((item) => item.type === 'ellipsis' ? (
          <span key={item.key} aria-hidden="true" className="inline-flex h-9 min-w-6 items-center justify-center text-slate-400">…</span>
        ) : (
          <button
            key={item.value}
            type="button"
            aria-label={`Ir a la página ${item.value}`}
            aria-current={item.value === page ? 'page' : undefined}
            onClick={() => onPageChange(item.value)}
            className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-bold transition ${
              item.value === page
                ? 'bg-[#003DA5] text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-[#003DA5]'
            }`}
          >
            {item.value}
          </button>
        ))}
      </nav>

      {showJump && totalPages > 7 && (
        <form onSubmit={goToInputPage} className="ml-1 flex items-center gap-1.5 border-l border-slate-200 pl-3">
          <label htmlFor={jumpInputId} className="whitespace-nowrap text-xs font-medium text-slate-500">Ir a</label>
          <input
            id={jumpInputId}
            type="number"
            min={1}
            max={totalPages}
            inputMode="numeric"
            value={pageInput}
            onChange={(event) => setPageInput(event.target.value)}
            className="h-9 w-16 rounded-lg border border-slate-300 bg-white px-2 text-center text-sm font-semibold text-slate-800 outline-none transition focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100"
            aria-label={`Número de página, entre 1 y ${totalPages}`}
          />
          <button type="submit" className="h-9 rounded-lg border border-blue-200 bg-white px-3 text-xs font-bold text-[#003DA5] transition hover:bg-blue-50">Ir</button>
        </form>
      )}
    </div>
  );
}

export function LaborFunctionsManager() {
  const [items, setItems] = React.useState<LaborFunctionProfileApi[]>([]);
  const [stats, setStats] = React.useState({ profiles: 0, functions: 0, associatedRequests: 0 });
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [totalItems, setTotalItems] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [editor, setEditor] = React.useState<EditorState | null>(null);
  const [editorTouched, setEditorTouched] = React.useState<Set<EditorField>>(new Set());
  const [editorAttempted, setEditorAttempted] = React.useState(false);
  const [editorSubmissionError, setEditorSubmissionError] = React.useState('');
  const [operationSuccessNotice, setOperationSuccessNotice] = React.useState<OperationSuccessNotice | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [bulkOpen, setBulkOpen] = React.useState(false);
  const [bulkRows, setBulkRows] = React.useState<LaborFunctionProfilePayloadApi[]>([]);
  const [bulkFileName, setBulkFileName] = React.useState('');
  const [bulkFileSize, setBulkFileSize] = React.useState(0);
  const [bulkReading, setBulkReading] = React.useState(false);
  const [bulkValidating, setBulkValidating] = React.useState(false);
  const [bulkValidationProgress, setBulkValidationProgress] = React.useState({ processed: 0, total: 0 });
  const [bulkLoading, setBulkLoading] = React.useState(false);
  const [bulkImportProgress, setBulkImportProgress] = React.useState({ processed: 0, total: 0 });
  const [bulkStage, setBulkStage] = React.useState<BulkStage>('select');
  const [bulkValidation, setBulkValidation] = React.useState<BulkValidationResponse | null>(null);
  const [bulkValidationFailure, setBulkValidationFailure] = React.useState('');
  const [bulkFileError, setBulkFileError] = React.useState<BulkFileError | null>(null);
  const [bulkImportResult, setBulkImportResult] = React.useState<BulkImportResponse | null>(null);
  const [bulkFilter, setBulkFilter] = React.useState<'all' | 'valid' | 'error'>('all');
  const [bulkPreviewPage, setBulkPreviewPage] = React.useState(1);
  const [dragActive, setDragActive] = React.useState(false);
  const [selectedProfiles, setSelectedProfiles] = React.useState<Map<string, LaborFunctionProfileApi>>(new Map());
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);
  const [bulkDeleteSubmissionError, setBulkDeleteSubmissionError] = React.useState('');
  const [deletingSelected, setDeletingSelected] = React.useState(false);
  const [profileToDelete, setProfileToDelete] = React.useState<LaborFunctionProfileApi | null>(null);
  const [deleteSubmissionError, setDeleteSubmissionError] = React.useState('');
  const [deleting, setDeleting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const selectPageCheckboxRef = React.useRef<HTMLInputElement | null>(null);
  const operationSuccessNoticeRef = React.useRef<HTMLDivElement | null>(null);

  const editorErrors = React.useMemo(() => editor ? validateEditor(editor) : {}, [editor]);
  const editorFunctionCount = React.useMemo(() => extractFunctionItems(editor?.functions).length, [editor?.functions]);
  const selectedProfilesList = React.useMemo(() => Array.from(selectedProfiles.values()), [selectedProfiles]);
  const selectedCount = selectedProfiles.size;
  const selectedFunctionCount = React.useMemo(
    () => selectedProfilesList.reduce((total, profile) => total + profile.function_count, 0),
    [selectedProfilesList],
  );
  const selectedAssociationCount = React.useMemo(
    () => selectedProfilesList.reduce((total, profile) => total + profile.association_count, 0),
    [selectedProfilesList],
  );
  const currentPageSelectedCount = React.useMemo(
    () => items.reduce((total, profile) => total + (selectedProfiles.has(profile.id) ? 1 : 0), 0),
    [items, selectedProfiles],
  );
  const allCurrentPageSelected = items.length > 0 && currentPageSelectedCount === items.length;
  const combinedPreview = editor
    ? expectedCombinedCode(editor.positionCode, editor.gradeCode) || '—'
    : '—';
  const bulkClientErrors = React.useMemo(() => validateBulkRows(bulkRows), [bulkRows]);
  const bulkServerErrors = React.useMemo<BulkError[]>(() =>
    (bulkValidation?.results || [])
      .filter((item) => item.status === 'error')
      .map((item) => ({ rowNumber: item.rowNumber, field: 'row', message: item.message, source: 'server' })),
  [bulkValidation]);
  const bulkErrors = React.useMemo(() => {
    const seen = new Set<string>();
    return [...bulkClientErrors, ...bulkServerErrors].filter((error) => {
      const key = `${error.rowNumber}|${normalizeMatchText(error.message)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [bulkClientErrors, bulkServerErrors]);
  const bulkErrorsByRow = React.useMemo(() => {
    const grouped = new Map<number, BulkError[]>();
    bulkErrors.forEach((error) => grouped.set(error.rowNumber, [...(grouped.get(error.rowNumber) || []), error]));
    return grouped;
  }, [bulkErrors]);
  const bulkValidationByRow = React.useMemo(() => new Map(
    (bulkValidation?.results || []).map((item) => [item.rowNumber, item]),
  ), [bulkValidation]);
  const bulkImportableRows = React.useMemo(() => bulkRows.filter((row, index) => {
    const rowNumber = Number(row.rowNumber) || index + 1;
    return !bulkErrorsByRow.has(rowNumber) && bulkValidationByRow.get(rowNumber)?.status === 'valid';
  }), [bulkRows, bulkErrorsByRow, bulkValidationByRow]);
  const bulkDisplayRows = React.useMemo(() => bulkRows.filter((row, index) => {
    const rowNumber = Number(row.rowNumber) || index + 1;
    const invalid = bulkErrorsByRow.has(rowNumber);
    const valid = !invalid && bulkValidationByRow.get(rowNumber)?.status === 'valid';
    return bulkFilter === 'all' || (bulkFilter === 'error' ? invalid : valid);
  }), [bulkRows, bulkErrorsByRow, bulkValidationByRow, bulkFilter]);
  const bulkPreviewPages = Math.max(1, Math.ceil(bulkDisplayRows.length / BULK_PAGE_SIZE));
  const bulkVisibleRows = React.useMemo(() => {
    const start = (bulkPreviewPage - 1) * BULK_PAGE_SIZE;
    return bulkDisplayRows.slice(start, start + BULK_PAGE_SIZE);
  }, [bulkDisplayRows, bulkPreviewPage]);
  const bulkFunctionCount = React.useMemo(
    () => bulkRows.reduce((sum, row) => sum + functionPreviewCount(row.functions), 0),
    [bulkRows],
  );
  const bulkInvalidRowCount = React.useMemo(
    () => new Set(bulkErrors.map((error) => error.rowNumber)).size,
    [bulkErrors],
  );
  const load = React.useCallback(async (
    showRefresh = false,
    overrides?: { page?: number; search?: string },
  ) => {
    const requestedPage = overrides?.page ?? page;
    const requestedSearch = overrides?.search ?? search;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await certificadosService.laborales.listarFuncionesLaborales({
        search: requestedSearch.trim() || undefined,
        page: requestedPage,
        limit: 15,
      });
      const resolvedTotalPages = Math.max(1, response.totalPages || 1);
      const resolvedPage = Math.min(resolvedTotalPages, Math.max(1, response.page || requestedPage));
      setItems(response.items || []);
      setSelectedProfiles((current) => {
        if (!current.size) return current;
        const next = new Map(current);
        let changed = false;
        (response.items || []).forEach((profile) => {
          if (!next.has(profile.id)) return;
          next.set(profile.id, profile);
          changed = true;
        });
        return changed ? next : current;
      });
      setTotalItems(response.total || 0);
      setTotalPages(resolvedTotalPages);
      if (resolvedPage !== page) setPage(resolvedPage);
      setStats(response.stats || { profiles: 0, functions: 0, associatedRequests: 0 });
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo cargar la matriz de funciones.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, search]);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  React.useEffect(() => setPage(1), [search]);
  React.useEffect(() => setBulkPreviewPage(1), [bulkFilter, bulkRows]);
  React.useEffect(() => {
    if (selectPageCheckboxRef.current) {
      selectPageCheckboxRef.current.indeterminate =
        currentPageSelectedCount > 0 && !allCurrentPageSelected;
    }
  }, [allCurrentPageSelected, currentPageSelectedCount]);
  React.useEffect(() => {
    if (!operationSuccessNotice) return undefined;
    const frame = window.requestAnimationFrame(() => {
      operationSuccessNoticeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      operationSuccessNoticeRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [operationSuccessNotice]);

  const anyModalOpen = Boolean(editor || bulkOpen || bulkDeleteOpen || profileToDelete);
  React.useEffect(() => {
    if (!anyModalOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving || bulkLoading || bulkReading || bulkValidating || deleting || deletingSelected) return;
      setEditor(null);
      setBulkOpen(false);
      setBulkDeleteOpen(false);
      setProfileToDelete(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [anyModalOpen, saving, bulkLoading, bulkReading, bulkValidating, deleting, deletingSelected]);

  const openCreate = () => {
    setOperationSuccessNotice(null);
    setEditorSubmissionError('');
    setEditor({ ...EMPTY_EDITOR });
    setEditorTouched(new Set());
    setEditorAttempted(false);
  };

  const openEdit = (profile: LaborFunctionProfileApi) => {
    setOperationSuccessNotice(null);
    setEditorSubmissionError('');
    setEditor({
      id: profile.id,
      positionCode: profile.position_code || '',
      gradeCode: profile.grade_code || '',
      combinedCode: expectedCombinedCode(profile.position_code, profile.grade_code),
      hierarchicalLevel: profile.hierarchical_level || '',
      positionName: profile.position_name || '',
      departmentName: profile.department_name || '',
      internalGroup: profile.internal_group || '',
      costCenter: profile.cost_center || '',
      functions: (profile.functions || [])
        .slice()
        .sort((a, b) => a.ordinal - b.ordinal)
        .map((item, index) => `${index + 1}. ${item.description}`)
        .join('\n'),
    });
    setEditorTouched(new Set());
    setEditorAttempted(false);
  };

  const openDelete = (profile: LaborFunctionProfileApi) => {
    setOperationSuccessNotice(null);
    setDeleteSubmissionError('');
    setProfileToDelete(profile);
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteSubmissionError('');
    setProfileToDelete(null);
  };

  const toggleProfileSelection = (profile: LaborFunctionProfileApi) => {
    setSelectedProfiles((current) => {
      const next = new Map(current);
      if (next.has(profile.id)) next.delete(profile.id);
      else next.set(profile.id, profile);
      return next;
    });
  };

  const toggleCurrentPageSelection = () => {
    setSelectedProfiles((current) => {
      const next = new Map(current);
      if (allCurrentPageSelected) items.forEach((profile) => next.delete(profile.id));
      else items.forEach((profile) => next.set(profile.id, profile));
      return next;
    });
  };

  const clearSelectedProfiles = () => setSelectedProfiles(new Map());

  const openBulkDelete = () => {
    if (!selectedCount) {
      toast.error('Selecciona al menos un registro para eliminar.');
      return;
    }
    setOperationSuccessNotice(null);
    setBulkDeleteSubmissionError('');
    setBulkDeleteOpen(true);
  };

  const closeBulkDelete = () => {
    if (deletingSelected) return;
    setBulkDeleteSubmissionError('');
    setBulkDeleteOpen(false);
  };

  const updateEditor = (field: EditorField, value: string) => {
    setEditorSubmissionError('');
    setEditor((current) => {
      if (!current) return current;
      const next = { ...current, [field]: value };
      if (field === 'positionCode' || field === 'gradeCode') {
        next.combinedCode = expectedCombinedCode(next.positionCode, next.gradeCode);
      }
      return next;
    });
  };

  const touchEditorField = (field: EditorField) => {
    setEditorTouched((current) => new Set(current).add(field));
  };

  const showEditorError = (field: EditorField) =>
    Boolean(editorErrors[field] && (editorAttempted || editorTouched.has(field)));

  const payloadFromEditor = (value: EditorState): LaborFunctionProfilePayloadApi => ({
    positionCode: value.positionCode.trim(),
    gradeCode: value.gradeCode.trim(),
    combinedCode: value.combinedCode.trim() || expectedCombinedCode(value.positionCode, value.gradeCode),
    hierarchicalLevel: value.hierarchicalLevel.trim(),
    positionName: value.positionName.trim(),
    departmentName: value.departmentName.trim(),
    internalGroup: value.internalGroup.trim(),
    costCenter: value.costCenter.trim(),
    sourceSheet: 'Registro individual',
    functions: value.functions,
  });

  const saveEditor = async () => {
    if (!editor) return;
    setEditorAttempted(true);
    setEditorSubmissionError('');
    if (Object.keys(editorErrors).length) {
      toast.error('No se guardó el registro', {
        description: 'Revisa los campos marcados e inténtalo nuevamente.',
      });
      return;
    }
    setSaving(true);
    try {
      const isEditing = Boolean(editor.id);
      const payload = payloadFromEditor(editor);
      let savedProfile: LaborFunctionProfileApi;
      if (editor.id) {
        savedProfile = await certificadosService.laborales.actualizarFuncionesLaborales(editor.id, payload);
        toast.success('Funciones actualizadas correctamente.');
      } else {
        savedProfile = await certificadosService.laborales.crearFuncionesLaborales(payload);
        toast.success('Perfil y funciones asociados correctamente.');
      }
      const functionCount = savedProfile.function_count || editorFunctionCount;
      setSelectedProfiles((current) => {
        if (!current.has(savedProfile.id)) return current;
        const next = new Map(current);
        next.set(savedProfile.id, savedProfile);
        return next;
      });
      setOperationSuccessNotice({
        title: isEditing ? 'Registro actualizado correctamente' : 'Registro creado correctamente',
        message: `${savedProfile.combined_code} · ${savedProfile.position_name}. Se ${isEditing ? 'actualizaron' : 'crearon'} ${functionCount} ${functionCount === 1 ? 'función laboral' : 'funciones laborales'}.`,
      });
      setEditor(null);
      if (isEditing) {
        await load(true);
      } else {
        setSearch('');
        setPage(1);
        await load(true, { page: 1, search: '' });
      }
    } catch (error: any) {
      const message = String(error?.message || 'No se pudo guardar el registro. Verifica los datos e inténtalo nuevamente.');
      setEditorSubmissionError(message);
      toast.error('No se pudo guardar el registro', { description: message });
    } finally {
      setSaving(false);
    }
  };

  const removeProfile = async () => {
    if (!profileToDelete) return;
    const profile = profileToDelete;
    setDeleteSubmissionError('');
    setDeleting(true);
    try {
      await certificadosService.laborales.eliminarFuncionesLaborales(profile.id);
      toast.success('Perfil de funciones eliminado.');
      setOperationSuccessNotice({
        title: 'Registro eliminado correctamente',
        message: profile.function_count === 1
          ? `Se eliminó 1 función laboral del perfil ${profile.combined_code} · ${profile.position_name}.`
          : `Se eliminaron ${profile.function_count} funciones laborales del perfil ${profile.combined_code} · ${profile.position_name}.`,
      });
      setSelectedProfiles((current) => {
        if (!current.has(profile.id)) return current;
        const next = new Map(current);
        next.delete(profile.id);
        return next;
      });
      setProfileToDelete(null);
      await load(true);
    } catch (error: any) {
      const message = String(error?.message || 'No se pudo eliminar el registro. Inténtalo nuevamente.');
      setDeleteSubmissionError(message);
      toast.error('No se pudo eliminar el registro', { description: message });
    } finally {
      setDeleting(false);
    }
  };

  const removeSelectedProfiles = async () => {
    const profiles = Array.from(selectedProfiles.values());
    if (!profiles.length) {
      setBulkDeleteOpen(false);
      return;
    }
    setBulkDeleteSubmissionError('');
    setDeletingSelected(true);
    try {
      const result = await certificadosService.laborales.eliminarFuncionesLaboralesMasivas(
        profiles.map((profile) => profile.id),
      );
      clearSelectedProfiles();
      setBulkDeleteOpen(false);
      setOperationSuccessNotice({
        title: result.deletedCount === 1
          ? 'Registro eliminado correctamente'
          : `${result.deletedCount} registros eliminados correctamente`,
        message: result.deletedCount === 1
          ? `Se eliminó 1 perfil y ${result.functionCount} ${result.functionCount === 1 ? 'función laboral' : 'funciones laborales'}.`
          : `Se eliminaron ${result.deletedCount} perfiles y ${result.functionCount} ${result.functionCount === 1 ? 'función laboral' : 'funciones laborales'}.`,
      });
      toast.success(
        result.deletedCount === 1
          ? 'Registro eliminado correctamente.'
          : `${result.deletedCount} registros eliminados correctamente.`,
      );
      await load(true);
    } catch (error: any) {
      const message = String(error?.message || 'No se pudieron eliminar los registros seleccionados. Inténtalo nuevamente.');
      setBulkDeleteSubmissionError(message);
      toast.error('No se completó la eliminación múltiple', { description: message });
    } finally {
      setDeletingSelected(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const workbook = XLSX.utils.book_new();
      const headers = OFFICIAL_TEMPLATE_HEADERS;
      const dataSheet = XLSX.utils.aoa_to_sheet([
        ['PLANTILLA OFICIAL DE CARGA - No cambie el nombre de esta hoja'],
        ['Pegue los datos desde la fila 4. Los códigos deben conservar los ceros a la izquierda.'],
        headers,
      ]);
      dataSheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
      ];
      dataSheet['!cols'] = [
        { wch: 14 }, { wch: 10 }, { wch: 16 }, { wch: 22 }, { wch: 34 },
        { wch: 42 }, { wch: 30 }, { wch: 20 }, { wch: 100 },
      ];
      XLSX.utils.book_append_sheet(workbook, dataSheet, OFFICIAL_SHEET_NAME);

      const examplesSheet = XLSX.utils.aoa_to_sheet([
        headers,
        ['2028', '24', '202824', 'Profesional', 'PROFESIONAL ESPECIALIZADO', 'DIRECCIÓN DE EJEMPLO', 'N/A', 'N/A', '1. Formular planes del área. 2. Ejecutar las actividades asignadas. 3. Presentar informes de gestión.'],
        ['4064', '09', '406409', 'Asistencial', 'AUXILIAR DE SERVICIOS GENERALES', 'DIRECCIÓN TERRITORIAL', 'N/A', 'N/A', '1. Apoyar la prestación de los servicios generales. 2. Mantener organizados los elementos asignados.'],
        ['0015', '', '0015', 'Directivo', 'DENOMINACIÓN DE EJEMPLO', 'DEPENDENCIA DE EJEMPLO', 'GRUPO DE EJEMPLO', 'CC-001', '1. Dirigir la dependencia.\n2. Hacer seguimiento a sus resultados.'],
      ]);
      examplesSheet['!cols'] = dataSheet['!cols'];
      XLSX.utils.book_append_sheet(workbook, examplesSheet, 'Ejemplos - No importar');

      const instructions = XLSX.utils.aoa_to_sheet([
        ['CAMPO', 'INDICACIÓN'],
        ['Código', 'Código base del cargo. Escriba 0015, 0095, etc. como texto para conservar ceros.'],
        ['Grado', 'Grado del cargo. Conserva sus dos dígitos (por ejemplo, 09). Puede quedar vacío cuando no aplique.'],
        ['cod_cargo', 'Código compuesto. Ejemplo: Código 2028 + Grado 24 = 202824.'],
        ['Nivel Jerárquico', 'Debe coincidir con el nivel registrado para la persona.'],
        ['Denominación del empleo', 'Debe coincidir exactamente con la denominación registrada en el contrato o vinculación laboral. No use abreviaturas ni un cargo aproximado.'],
        ['Dependencia/Área', 'Debe coincidir con la dependencia laboral; evita asociaciones incorrectas.'],
        ['Grupo Interno / CentroCosto', 'Complete estos campos cuando apliquen; también se validarán exactamente.'],
        ['FUNCIONES', 'Puede escribir 1. ... 2. ... 3. ... en una celda o una función por línea.'],
        ['IMPORTANTE', 'Cargue la hoja Matriz Funciones ESAP. Las hojas de instrucciones y ejemplos no se importan.'],
      ]);
      instructions['!cols'] = [{ wch: 28 }, { wch: 110 }];
      XLSX.utils.book_append_sheet(workbook, instructions, 'Instrucciones');

      const workbookBytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const downloadUrl = URL.createObjectURL(new Blob([workbookBytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }));
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = 'Plantilla_Matriz_Funciones_ESAP.xlsx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1_000);
      toast.success('Plantilla descargada con ejemplos e instrucciones.');
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo crear la plantilla Excel.');
    }
  };

  const parseExcel = async (file: File) => {
    if (!/\.xlsx?$/.test(file.name.toLowerCase())) {
      throw new Error('Selecciona un archivo Excel con extensión .xlsx o .xls.');
    }
    if (!file.size) {
      throw new Error('El archivo está vacío. Descarga la plantilla oficial y vuelve a intentarlo.');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('El archivo supera el tamaño máximo permitido de 10 MB.');
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    } catch {
      throw new Error('Excel no pudo abrir el archivo. Puede estar dañado, protegido con contraseña o no ser un libro de Excel válido.');
    }

    const sheetName = workbook.SheetNames.find(
      (name) => name.trim() === OFFICIAL_SHEET_NAME,
    );
    if (!sheetName) {
      throw new Error(`El archivo no corresponde a la plantilla oficial: falta la hoja “${OFFICIAL_SHEET_NAME}”. No cambies el nombre de esa hoja.`);
    }
    const sheet = workbook.Sheets[sheetName];
    const matrix = XLSX.utils.sheet_to_json<Array<unknown>>(sheet, { header: 1, defval: '', raw: true });
    if (!matrix.length) {
      throw new Error(`La hoja “${OFFICIAL_SHEET_NAME}” está vacía.`);
    }

    const marker = normalizeHeader(matrix[0]?.[0]);
    if (marker !== OFFICIAL_TEMPLATE_MARKER) {
      throw new Error('El archivo no tiene la identificación de la plantilla oficial. Descarga una plantilla nueva y pega allí la información sin modificar sus primeras tres filas.');
    }

    const headerRow = 2;
    const headers = (matrix[headerRow] || []).map(normalizeHeader);
    const invalidHeaderIndexes = NORMALIZED_OFFICIAL_TEMPLATE_HEADERS
      .map((expected, index) => headers[index] === expected ? -1 : index)
      .filter((index) => index >= 0);
    const unexpectedHeaders = headers
      .slice(NORMALIZED_OFFICIAL_TEMPLATE_HEADERS.length)
      .filter(Boolean);
    const hasUnexpectedData = matrix.some((row) =>
      (row || [])
        .slice(NORMALIZED_OFFICIAL_TEMPLATE_HEADERS.length)
        .some((cell) => String(cell ?? '').trim()),
    );
    if (invalidHeaderIndexes.length || unexpectedHeaders.length || hasUnexpectedData) {
      const incorrectColumns = invalidHeaderIndexes
        .map((index) => OFFICIAL_TEMPLATE_HEADERS[index])
        .join(', ');
      const detail = incorrectColumns
        ? ` Revisa estas columnas o su posición: ${incorrectColumns}.`
        : '';
      throw new Error(`Los encabezados no coinciden con la plantilla oficial.${detail} Deben conservarse las 9 columnas originales y en el mismo orden.`);
    }

    const indexes = {
      positionCode: findHeader(headers, ['codigo', 'codigo cargo base']),
      gradeCode: findHeader(headers, ['grado']),
      combinedCode: findHeader(headers, ['cod cargo', 'codigo cargo']),
      hierarchicalLevel: findHeader(headers, ['nivel jerarquico', 'nivel']),
      positionName: findHeader(headers, ['denominacion del empleo', 'denominacion empleo', 'cargo']),
      departmentName: findHeader(headers, ['dependencia area', 'dependencia', 'area']),
      internalGroup: findHeader(headers, ['grupo interno', 'grupo interno de trabajo']),
      costCenter: findHeader(headers, ['centrocosto', 'centro costo']),
      functions: findHeader(headers, ['funciones', 'funcion']),
    };
    if (Object.values(indexes).some((index) => index < 0)) {
      throw new Error('La plantilla está incompleta. No elimines ni cambies los nombres de las columnas originales.');
    }

    const displayValue = (rowIndex: number, columnIndex: number) => {
      if (columnIndex < 0) return '';
      const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex })] as { v?: unknown; w?: unknown } | undefined;
      return String(cell?.w ?? cell?.v ?? matrix[rowIndex]?.[columnIndex] ?? '').trim();
    };
    const value = (row: unknown[], index: number) => index >= 0 ? String(row[index] ?? '').trim() : '';
    const parsed: LaborFunctionProfilePayloadApi[] = [];
    for (let rowIndex = headerRow + 1; rowIndex < matrix.length; rowIndex += 1) {
      const row = matrix[rowIndex] || [];
      if (!row.some((cell) => String(cell ?? '').trim())) continue;
      parsed.push({
        rowNumber: rowIndex + 1,
        positionCode: displayValue(rowIndex, indexes.positionCode),
        gradeCode: displayValue(rowIndex, indexes.gradeCode),
        combinedCode: displayValue(rowIndex, indexes.combinedCode),
        hierarchicalLevel: value(row, indexes.hierarchicalLevel),
        positionName: value(row, indexes.positionName),
        departmentName: value(row, indexes.departmentName),
        internalGroup: value(row, indexes.internalGroup),
        costCenter: value(row, indexes.costCenter),
        sourceSheet: sheetName,
        functions: value(row, indexes.functions),
      });
      if (parsed.length > 5_000) {
        throw new Error('El archivo supera el máximo de 5.000 perfiles por carga.');
      }
    }
    if (!parsed.length) throw new Error('La hoja no contiene filas de datos debajo de los encabezados.');
    return parsed;
  };

  const readBulkFile = async (file: File) => {
    setBulkReading(true);
    setBulkFileError(null);
    setBulkValidation(null);
    setBulkValidationFailure('');
    setBulkImportResult(null);
    setBulkValidationProgress({ processed: 0, total: 0 });
    setBulkImportProgress({ processed: 0, total: 0 });
    setBulkStage('select');
    let rows: LaborFunctionProfilePayloadApi[];
    try {
      rows = await parseExcel(file);
    } catch (error: any) {
      const message = error?.message || 'No se pudo leer el archivo.';
      setBulkRows([]);
      setBulkFileName('');
      setBulkFileSize(0);
      setBulkFileError({ fileName: file.name, message });
      toast.error('Archivo rechazado', {
        description: message,
        duration: 10_000,
      });
      setBulkReading(false);
      return;
    }

    setBulkRows(rows);
    setBulkFileName(file.name);
    setBulkFileSize(file.size);
    setBulkStage('review');
    setBulkReading(false);
    setBulkValidating(true);
    try {
      const clientErrors = validateBulkRows(rows);
      const clientInvalidRows = new Set(clientErrors.map((error) => error.rowNumber));
      const candidates = rows.filter((row, index) => {
        const rowNumber = Number(row.rowNumber) || index + 1;
        return !clientInvalidRows.has(rowNumber);
      });
      const chunks = splitBulkRequestRows(candidates);
      const validationResults: BulkValidationRow[] = [];
      const blockFailures: string[] = [];
      let processed = 0;
      setBulkValidationProgress({ processed: 0, total: candidates.length });

      for (const chunk of chunks) {
        try {
          const response = await certificadosService.laborales.validarFuncionesLaboralesMasivas({
            rows: chunk,
            sourceSheet: 'Matriz Funciones ESAP',
          });
          validationResults.push(...response.results);
        } catch (error: any) {
          const reason = readableBulkRequestError(error);
          blockFailures.push(reason);
          validationResults.push(...chunk.map((row, index) => ({
            rowNumber: Number(row.rowNumber) || processed + index + 1,
            status: 'error' as const,
            action: null,
            message: `${reason} Esta fila no se procesará hasta completar su validación.`,
          })));
        } finally {
          processed += chunk.length;
          setBulkValidationProgress({ processed, total: candidates.length });
        }
      }

      const serverValid = validationResults.filter((item) => item.status === 'valid');
      const validation: BulkValidationResponse = {
        summary: {
          total: rows.length,
          valid: serverValid.length,
          invalid: rows.length - serverValid.length,
          toCreate: serverValid.filter((item) => item.action === 'created').length,
          toUpdate: serverValid.filter((item) => item.action === 'updated').length,
        },
        results: validationResults,
      };
      setBulkValidation(validation);
      if (blockFailures.length) {
        setBulkValidationFailure(
          `${blockFailures.length} ${blockFailures.length === 1 ? 'bloque no pudo validarse' : 'bloques no pudieron validarse'}. Las demás filas sí quedaron revisadas y pueden procesarse normalmente.`,
        );
      }
      const invalidRows = new Set([
        ...clientErrors.map((error) => error.rowNumber),
        ...validation.results.filter((item) => item.status === 'error').map((item) => item.rowNumber),
      ]);
      const valid = rows.length - invalidRows.size;
      if (invalidRows.size) {
        toast.warning(`${valid} ${valid === 1 ? 'fila válida' : 'filas válidas'} y ${invalidRows.size} ${invalidRows.size === 1 ? 'fila con observaciones' : 'filas con observaciones'}.`);
      } else {
        toast.success(`${rows.length} ${rows.length === 1 ? 'fila verificada y lista' : 'filas verificadas y listas'} para procesar.`);
      }
    } catch (error: any) {
      setBulkValidationFailure(readableBulkRequestError(error));
      toast.error('No fue posible completar la validación del archivo.');
    } finally {
      setBulkValidating(false);
    }
  };

  const onFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await readBulkFile(file);
    event.target.value = '';
  };

  const clearBulkFile = () => {
    setBulkRows([]);
    setBulkFileName('');
    setBulkFileSize(0);
    setBulkValidation(null);
    setBulkValidationFailure('');
    setBulkFileError(null);
    setBulkImportResult(null);
    setBulkValidationProgress({ processed: 0, total: 0 });
    setBulkImportProgress({ processed: 0, total: 0 });
    setBulkStage('select');
    setBulkFilter('all');
    setBulkPreviewPage(1);
  };

  const openBulkModal = () => {
    clearBulkFile();
    setBulkOpen(true);
  };

  const closeBulkModal = () => {
    if (bulkLoading || bulkReading || bulkValidating) return;
    setBulkOpen(false);
    clearBulkFile();
  };

  const importBulk = async () => {
    if (!bulkImportableRows.length || !bulkValidation) {
      toast.error('No hay filas completamente válidas para procesar.');
      return;
    }
    setBulkLoading(true);
    setBulkImportProgress({ processed: 0, total: bulkImportableRows.length });
    try {
      const chunks = splitBulkRequestRows(bulkImportableRows);
      const results: BulkImportResponse['results'] = [];
      let processed = 0;
      for (const chunk of chunks) {
        try {
          const response = await certificadosService.laborales.cargarFuncionesLaboralesMasivas({
            rows: chunk,
            sourceSheet: 'Matriz Funciones ESAP',
          });
          results.push(...response.results);
        } catch (error: any) {
          const reason = readableBulkRequestError(error);
          results.push(...chunk.map((row, index) => ({
            rowNumber: Number(row.rowNumber) || processed + index + 1,
            status: 'error' as const,
            message: `${reason} La fila no fue creada.`,
          })));
        } finally {
          processed += chunk.length;
          setBulkImportProgress({ processed, total: bulkImportableRows.length });
        }
      }
      const failed = results.filter((item) => item.status === 'error').length;
      const response: BulkImportResponse = {
        summary: {
          total: results.length,
          success: results.length - failed,
          failed,
          created: results.filter((item) => item.status === 'success' && item.action === 'created').length,
          updated: 0,
        },
        results,
      };
      setBulkImportResult(response);
      setBulkStage('result');
      if (response.summary.failed) {
        toast.warning(`${response.summary.success} filas procesadas y ${response.summary.failed} fallidas.`);
      } else {
        toast.success(`${response.summary.created} filas creadas correctamente.`);
      }
      await load(true);
    } catch (error: any) {
      toast.error(error?.message || 'No se pudo completar la carga masiva.');
    } finally {
      setBulkLoading(false);
    }
  };

  const fieldClass = (field: EditorField, readOnly = false) => `h-11 w-full rounded-xl border px-3.5 text-sm outline-none transition ${
    readOnly
      ? 'cursor-not-allowed border-blue-100 bg-blue-50 font-mono font-bold text-[#003DA5]'
      : showEditorError(field)
        ? 'border-red-400 bg-white text-slate-900 ring-4 ring-red-50 placeholder:text-slate-400 focus:border-red-500'
        : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:border-[#003DA5] focus:ring-4 focus:ring-blue-50'
  }`;

  const inputFields: Array<{
    field: EditorField;
    label: string;
    placeholder: string;
    required?: boolean;
    helper?: string;
    list?: string;
    layout: string;
    inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
    maxLength?: number;
    readOnly?: boolean;
  }> = [
    { field: 'positionCode', label: 'Código', placeholder: 'Ej. 2028 o 0015', required: true, helper: 'Código base, máximo 4 dígitos.', layout: 'lg:col-span-3', inputMode: 'numeric', maxLength: 4 },
    { field: 'gradeCode', label: 'Grado', placeholder: 'Ej. 24', helper: 'Opcional cuando no aplique.', layout: 'lg:col-span-3', inputMode: 'numeric', maxLength: 3 },
    { field: 'combinedCode', label: 'cod_cargo calculado', placeholder: 'Código + grado', helper: combinedPreview === '—' ? 'Completa el código para calcularlo.' : 'Se actualiza automáticamente.', layout: 'lg:col-span-6', readOnly: true },
    { field: 'hierarchicalLevel', label: 'Nivel jerárquico', placeholder: 'Ej. Profesional', required: true, list: 'labor-function-levels', layout: 'lg:col-span-4' },
    { field: 'positionName', label: 'Denominación exacta del empleo', placeholder: 'Tal como figura en el contrato', required: true, helper: 'Debe coincidir exactamente con la vinculación laboral.', layout: 'lg:col-span-4', maxLength: 255 },
    { field: 'departmentName', label: 'Dependencia / Área', placeholder: 'Dependencia exacta', required: true, layout: 'lg:col-span-4', maxLength: 500 },
    { field: 'internalGroup', label: 'Grupo interno', placeholder: 'Si aplica', helper: 'Debe coincidir cuando la matriz lo informe.', layout: 'lg:col-span-6', maxLength: 500 },
    { field: 'costCenter', label: 'Centro de costo', placeholder: 'Si aplica', helper: 'No inventes el dato si no existe.', layout: 'lg:col-span-6', maxLength: 255 },
  ];

  return (
    <div className="min-h-[85vh] w-full space-y-5 pb-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-r from-white via-blue-50/60 to-indigo-50/70 p-5 shadow-sm sm:p-6"
      >
        <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#003DA5] text-white shadow-lg shadow-blue-900/15">
              <BookOpenCheck className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-950">Matriz de funciones laborales</h1>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-emerald-700">Asociación validada</span>
              </div>
              <p className="max-w-3xl text-sm leading-6 text-slate-600">
                Administra las funciones normalizadas por código, grado, cargo y estructura organizacional. Solo una coincidencia exacta podrá incluirse en el certificado.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap xl:justify-end">
            <button onClick={downloadTemplate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 text-sm font-semibold text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md active:translate-y-0">
              <Download className="h-4 w-4" /> Plantilla con ejemplos
            </button>
            <button onClick={openBulkModal} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 text-sm font-semibold text-[#003DA5] shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-md active:translate-y-0">
              <Upload className="h-4 w-4" /> Carga masiva
            </button>
            <button onClick={openCreate} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#003DA5] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:-translate-y-0.5 hover:bg-[#002873] hover:shadow-xl active:translate-y-0">
              <Plus className="h-4 w-4" /> Agregar individual
            </button>
          </div>
        </div>
      </motion.section>

      <AnimatePresence initial={false}>
        {operationSuccessNotice && (
          <motion.div
            ref={operationSuccessNoticeRef}
            role="status"
            aria-live="polite"
            tabIndex={-1}
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            className="overflow-hidden rounded-2xl border border-emerald-300 bg-emerald-50 shadow-sm outline-none focus:ring-4 focus:ring-emerald-100"
          >
            <div className="flex items-start gap-3 p-4 sm:p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white"><CheckCircle2 className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-emerald-950">{operationSuccessNotice.title}</p>
                <p className="mt-1 text-sm leading-5 text-emerald-800">{operationSuccessNotice.message}</p>
                <p className="mt-1 text-xs text-emerald-700">La operación fue confirmada por el servidor y la matriz ya se actualizó.</p>
              </div>
              <button type="button" onClick={() => setOperationSuccessNotice(null)} aria-label="Cerrar confirmación" className="rounded-lg p-1.5 text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-950"><X className="h-4 w-4" /></button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'Perfiles de cargo', value: stats.profiles, detail: 'Combinaciones institucionales', icon: Layers3, tone: 'blue' },
          { label: 'Funciones normalizadas', value: stats.functions, detail: 'Funciones individuales y ordenadas', icon: CheckCircle2, tone: 'emerald' },
          { label: 'Contratos asociados', value: stats.associatedRequests, detail: 'Coincidencias exactas disponibles', icon: Users, tone: 'violet' },
        ].map((stat, index) => {
          const tone = stat.tone === 'emerald'
            ? 'bg-emerald-50 text-emerald-700 ring-emerald-100'
            : stat.tone === 'violet'
              ? 'bg-violet-50 text-violet-700 ring-violet-100'
              : 'bg-blue-50 text-[#003DA5] ring-blue-100';
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * index }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center gap-4">
                <span className={`flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${tone}`}><stat.icon className="h-5 w-5" /></span>
                <div className="min-w-0"><p className="text-sm font-medium text-slate-500">{stat.label}</p><p className="text-3xl font-bold leading-tight text-slate-950">{stat.value.toLocaleString('es-CO')}</p><p className="truncate text-xs text-slate-400">{stat.detail}</p></div>
              </div>
            </motion.div>
          );
        })}
      </section>

      <section className="flex min-h-[500px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, cargo, dependencia, grupo o centro de costo…" className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 text-sm outline-none transition focus:border-[#003DA5] focus:ring-4 focus:ring-blue-50" />
            {search && <button onClick={() => setSearch('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X className="h-4 w-4" /></button>}
          </div>
          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-[#003DA5] sm:inline-flex">Más recientes primero</span>
            <span className="text-xs font-medium text-slate-500">{totalItems} {totalItems === 1 ? 'perfil encontrado' : 'perfiles encontrados'}</span>
            <button onClick={() => void load(true)} disabled={refreshing} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-[#003DA5] disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Actualizar
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {selectedCount > 0 && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-b border-blue-200 bg-blue-50/80"
            >
              <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-[#003DA5] px-2.5 text-sm font-bold text-white shadow-sm">{selectedCount}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-blue-950">{selectedCount === 1 ? '1 registro seleccionado' : `${selectedCount} registros seleccionados`}</p>
                    <p className="text-xs text-blue-700">{currentPageSelectedCount} en esta página · La selección se conserva al navegar o buscar.</p>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={clearSelectedProfiles} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3.5 text-xs font-semibold text-[#003DA5] transition hover:bg-blue-100"><X className="h-3.5 w-3.5" /> Desmarcar todos</button>
                  <button type="button" onClick={openBulkDelete} className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-red-600 px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-red-700"><Trash2 className="h-3.5 w-3.5" /> Eliminar seleccionados</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-1 items-center justify-center p-10">
            <div className="text-center"><Loader2 className="mx-auto h-8 w-8 animate-spin text-[#003DA5]" /><p className="mt-3 text-sm font-medium text-slate-500">Consultando la matriz…</p></div>
          </div>
        ) : items.length ? (
          <div className="flex-1 overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="sticky top-0 z-[1] bg-slate-50 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-16 px-4 py-3.5 text-center">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-lg p-1.5 transition hover:bg-blue-100" title={allCurrentPageSelected ? 'Desmarcar esta página' : 'Seleccionar esta página'}>
                      <input ref={selectPageCheckboxRef} type="checkbox" checked={allCurrentPageSelected} onChange={toggleCurrentPageSelection} aria-label={allCurrentPageSelected ? 'Desmarcar todos los registros de esta página' : 'Seleccionar todos los registros de esta página'} className="h-5 w-5 cursor-pointer rounded-md border-slate-300 accent-[#003DA5]" />
                    </label>
                  </th>
                  <th className="px-5 py-3.5">Código / grado</th><th className="px-5 py-3.5">Denominación</th><th className="px-5 py-3.5">Dependencia / grupo</th><th className="px-5 py-3.5 text-center">Funciones</th><th className="px-5 py-3.5 text-center">Asociados</th><th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((profile, index) => {
                  const selected = selectedProfiles.has(profile.id);
                  return (
                  <motion.tr key={profile.id} aria-selected={selected} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(index * 0.025, 0.2) }} className={`group transition ${selected ? 'bg-blue-50/80 hover:bg-blue-100/70' : 'hover:bg-blue-50/35'}`}>
                    <td className="px-4 py-4 text-center">
                      <label className={`inline-flex cursor-pointer items-center justify-center rounded-xl border p-2 shadow-sm transition ${selected ? 'border-blue-300 bg-[#003DA5] text-white' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'}`}>
                        <input type="checkbox" checked={selected} onChange={() => toggleProfileSelection(profile)} aria-label={`${selected ? 'Desmarcar' : 'Seleccionar'} ${profile.combined_code} · ${profile.position_name}`} className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-[#003DA5]" />
                      </label>
                    </td>
                    <td className="px-5 py-4"><p className="font-mono text-base font-bold text-[#003DA5]">{profile.combined_code}</p><p className="mt-0.5 text-xs text-slate-500">Base {profile.position_code}{profile.grade_code ? ` · Grado ${profile.grade_code}` : ' · Sin grado'}</p></td>
                    <td className="px-5 py-4"><p className="font-semibold text-slate-900">{profile.position_name}</p><p className="mt-0.5 text-xs text-slate-500">{profile.hierarchical_level || 'Nivel no informado'}</p></td>
                    <td className="max-w-xl px-5 py-4"><p className="truncate font-medium text-slate-700">{profile.department_name || 'Sin dependencia específica'}</p><p className="mt-0.5 truncate text-xs text-slate-500">{[profile.internal_group, profile.cost_center].filter(Boolean).join(' · ') || 'Sin grupo ni centro de costo'}</p></td>
                    <td className="px-5 py-4 text-center"><span className="inline-flex min-w-9 justify-center rounded-full bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700 ring-1 ring-emerald-100">{profile.function_count}</span></td>
                    <td className="px-5 py-4 text-center"><span className="inline-flex min-w-9 justify-center rounded-full bg-blue-50 px-3 py-1.5 font-bold text-[#003DA5] ring-1 ring-blue-100">{profile.association_count}</span></td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2"><button onClick={() => openEdit(profile)} aria-label={`Editar ${profile.position_name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-blue-700 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50"><Pencil className="h-4 w-4" /></button><button onClick={() => openDelete(profile)} aria-label={`Eliminar ${profile.position_name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-red-600 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button></div></td>
                  </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center px-6 py-16 text-center">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg">
              <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-50 text-[#003DA5] ring-1 ring-blue-100"><BookOpenCheck className="h-10 w-10" /></span>
              <h2 className="mt-5 text-xl font-bold text-slate-900">{search ? 'No encontramos coincidencias' : 'La matriz todavía está vacía'}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{search ? 'Prueba con otro código, denominación o dependencia.' : 'Carga el Excel institucional o crea el primer perfil de manera individual. El sistema validará cada combinación antes de asociarla.'}</p>
            </motion.div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-sm lg:flex-row">
            <button disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="h-4 w-4" /> Anterior</button>
            <div className="flex flex-col items-center gap-1.5">
              <PaginationNavigator page={page} totalPages={totalPages} onPageChange={setPage} showJump />
              <span className="text-xs font-medium text-slate-500">Página <strong className="text-slate-800">{page}</strong> de {totalPages}</span>
            </div>
            <button disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">Siguiente <ChevronRight className="h-4 w-4" /></button>
          </div>
        )}
      </section>

      <ModalShell open={Boolean(editor)} titleId="labor-functions-editor-title" onClose={() => setEditor(null)} busy={saving} widthClass="max-w-6xl">
        {editor && (
          <>
            <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/70 px-5 py-4 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#003DA5] text-white shadow-md shadow-blue-900/15"><FileCheck2 className="h-5 w-5" /></span>
                <div><p className="text-[11px] font-bold uppercase tracking-widest text-[#003DA5]">Registro institucional</p><h2 id="labor-functions-editor-title" className="mt-0.5 text-xl font-bold text-slate-950">{editor.id ? 'Editar perfil y funciones' : 'Agregar funciones individualmente'}</h2><p className="mt-1 text-sm text-slate-500">Código, denominación y ubicación deben coincidir con la vinculación laboral.</p></div>
              </div>
              <button disabled={saving} onClick={() => setEditor(null)} aria-label="Cerrar" className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-40"><X className="h-5 w-5" /></button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="border-b border-blue-100 bg-blue-50/60 px-5 py-3 sm:px-7">
                <div className="flex flex-col gap-2 text-xs text-blue-900 sm:flex-row sm:items-center sm:justify-between">
                  <span className="inline-flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-[#003DA5]" /> Código, denominación y estructura deben coincidir exactamente.</span>
                  <span className="font-mono font-bold text-[#003DA5]">cod_cargo: {combinedPreview}</span>
                </div>
              </div>

              {editorAttempted && Object.keys(editorErrors).length > 0 && (
                <motion.div role="alert" aria-live="assertive" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mx-5 mt-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 sm:mx-7">
                  <p className="flex items-center gap-2 font-bold"><AlertCircle className="h-4 w-4" /> Hay {Object.keys(editorErrors).length} campos que requieren revisión.</p>
                  <p className="mt-1 text-xs text-red-700">No se guardó ningún dato. Corrige los mensajes señalados e inténtalo nuevamente.</p>
                </motion.div>
              )}

              {editorSubmissionError && (
                <motion.div role="alert" aria-live="assertive" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mx-5 mt-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 shadow-sm sm:mx-7">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"><AlertCircle className="h-5 w-5" /></span>
                    <div className="min-w-0">
                      <p className="font-bold text-red-900">No se pudo guardar el registro</p>
                      <p className="mt-1 break-words text-xs leading-5">{editorSubmissionError}</p>
                      <p className="mt-1 text-xs text-red-700">Tus datos permanecen en el formulario para que puedas corregirlos y volver a intentar.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-12">
                {inputFields.map(({ field, label, placeholder, required, helper, list, layout, inputMode, maxLength, readOnly }) => (
                  <label key={field} className={`min-w-0 space-y-1.5 ${layout}`}>
                    <span className="flex items-center justify-between gap-2 text-xs font-bold text-slate-700"><span>{label}{required && <span className="ml-1 text-red-500">*</span>}</span></span>
                    <input value={field === 'combinedCode' && combinedPreview === '—' ? '' : editor[field]} onChange={(event) => updateEditor(field, event.target.value)} onBlur={() => touchEditorField(field)} placeholder={placeholder} list={list} inputMode={inputMode} maxLength={maxLength} readOnly={readOnly} aria-readonly={readOnly || undefined} aria-invalid={showEditorError(field)} aria-describedby={`${field}-message`} className={fieldClass(field, readOnly)} />
                    <span id={`${field}-message`} className={`block min-h-4 text-[11px] leading-4 ${showEditorError(field) ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{showEditorError(field) ? editorErrors[field] : helper || ' '}</span>
                  </label>
                ))}
                <datalist id="labor-function-levels">{HIERARCHICAL_LEVELS.map((level) => <option value={level} key={level} />)}</datalist>
              </div>

              <div className="px-5 pb-6 sm:px-7">
                <label className="space-y-1.5">
                  <span className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700"><span>Funciones <span className="text-red-500">*</span></span><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${editorFunctionCount ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{editorFunctionCount} {editorFunctionCount === 1 ? 'función detectada' : 'funciones detectadas'}</span></span>
                  <textarea value={editor.functions} onChange={(event) => updateEditor('functions', event.target.value)} onBlur={() => touchEditorField('functions')} rows={7} placeholder={'1. Primera función institucional\n2. Segunda función institucional\n3. Tercera función institucional'} aria-invalid={showEditorError('functions')} aria-describedby="functions-message" className={`min-h-48 max-h-[50vh] w-full resize-y rounded-2xl border bg-white p-4 text-sm leading-7 outline-none transition placeholder:text-slate-400 ${showEditorError('functions') ? 'border-red-400 ring-4 ring-red-50' : 'border-slate-300 focus:border-[#003DA5] focus:ring-4 focus:ring-blue-50'}`} />
                  <span id="functions-message" className={`flex items-start gap-1.5 text-xs ${showEditorError('functions') ? 'font-semibold text-red-600' : 'text-slate-500'}`}>{showEditorError('functions') ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />}{showEditorError('functions') ? editorErrors.functions : 'Usa numeración 1. 2. 3. o una función por línea. Se guardará una fila normalizada por función.'}</span>
                </label>
              </div>
            </div>

            <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <p className={`text-xs sm:flex sm:items-center sm:gap-1.5 ${saving ? 'flex font-semibold text-blue-700' : 'hidden text-slate-500'}`}>{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-emerald-600" />}{saving ? 'Validando y guardando en el servidor…' : 'Los datos se normalizarán sin alterar el texto de cada función.'}</p>
              <div className="flex justify-end gap-2"><button disabled={saving} onClick={() => setEditor(null)} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancelar</button><button disabled={saving} onClick={() => void saveEditor()} className="inline-flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-[#003DA5] px-5 text-sm font-semibold text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#002873] disabled:cursor-not-allowed disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saving ? 'Guardando…' : 'Guardar funciones'}</button></div>
            </footer>
          </>
        )}
      </ModalShell>

      <ModalShell open={bulkOpen} titleId="labor-functions-bulk-title" onClose={closeBulkModal} busy={bulkLoading || bulkReading || bulkValidating} widthClass="max-w-[1400px]">
        <header className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/70 px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md ${bulkStage === 'result' ? 'bg-emerald-600' : 'bg-[#003DA5]'}`}>
              {bulkStage === 'result' ? <CheckCircle2 className="h-5 w-5" /> : <Database className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#003DA5]">Importación controlada</p>
              <h2 id="labor-functions-bulk-title" className="mt-0.5 text-xl font-bold text-slate-950">{bulkStage === 'result' ? 'Resultado de la carga masiva' : 'Carga masiva · Matriz Funciones ESAP'}</h2>
              <p className="mt-1 text-sm text-slate-500">{bulkStage === 'result' ? 'Consulta el resultado de cada fila procesada antes de regresar.' : 'El archivo se valida completamente antes de crear registros nuevos.'}</p>
            </div>
          </div>
          <button disabled={bulkLoading || bulkReading || bulkValidating} onClick={closeBulkModal} aria-label="Cerrar" className="rounded-xl p-2 text-slate-500 transition hover:bg-white hover:text-slate-900 disabled:opacity-40"><X className="h-5 w-5" /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="grid gap-3 md:grid-cols-4">
            {[
              { number: '1', title: 'Seleccionar', description: 'Carga la matriz oficial.', done: Boolean(bulkRows.length) },
              { number: '2', title: 'Validar', description: 'Revisa todas las filas.', done: Boolean(bulkValidation) },
              { number: '3', title: 'Confirmar', description: 'Crea solo las válidas.', done: bulkStage === 'result' },
              { number: '4', title: 'Resultado', description: 'Presenta el cierre final.', done: bulkStage === 'result' },
            ].map((step) => (
              <div key={step.number} className={`rounded-2xl border p-4 ${step.done ? 'border-emerald-200 bg-emerald-50/70' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex items-start gap-3"><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${step.done ? 'bg-emerald-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}>{step.done ? <Check className="h-4 w-4" /> : step.number}</span><div><p className="font-bold text-slate-800">{step.title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{step.description}</p></div></div>
              </div>
            ))}
          </div>

          {bulkStage === 'result' && bulkImportResult ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5 space-y-5">
              <div className={`rounded-2xl border p-5 ${bulkImportResult.summary.failed ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
                <div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bulkImportResult.summary.failed ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{bulkImportResult.summary.failed ? <AlertCircle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}</span><div><h3 className="font-bold text-slate-900">{bulkImportResult.summary.failed ? 'Carga completada con observaciones' : 'Carga completada correctamente'}</h3><p className="mt-1 text-sm text-slate-600">Se {bulkImportResult.summary.success === 1 ? 'procesó 1 fila válida' : `procesaron ${bulkImportResult.summary.success} filas válidas`}. {bulkRows.length - bulkImportableRows.length === 1 ? 'La fila inválida fue omitida' : `Las ${bulkRows.length - bulkImportableRows.length} filas inválidas fueron omitidas`} y no {bulkRows.length - bulkImportableRows.length === 1 ? 'modificó' : 'modificaron'} la base de datos.</p></div></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                {[
                  { label: 'Analizadas', value: bulkRows.length, tone: 'text-slate-900' },
                  { label: 'Creadas', value: bulkImportResult.summary.created, tone: 'text-emerald-700' },
                  { label: 'Omitidas', value: bulkRows.length - bulkImportableRows.length, tone: 'text-amber-700' },
                  { label: 'Fallidas', value: bulkImportResult.summary.failed, tone: 'text-red-700' },
                ].map((item) => <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm"><p className={`text-2xl font-bold ${item.tone}`}>{item.value}</p><p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p></div>)}
              </div>
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b bg-slate-50 px-4 py-3"><h3 className="font-bold text-slate-800">Detalle final por fila procesada</h3><p className="text-xs text-slate-500">Cada resultado corresponde a una operación confirmada en el servidor.</p></div>
                <div className="max-h-[400px] overflow-auto"><table className="w-full min-w-[800px] text-left text-xs"><thead className="sticky top-0 bg-white text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-sm"><tr><th className="p-3">Fila</th><th className="p-3">Código</th><th className="p-3">Operación</th><th className="p-3 text-center">Funciones</th><th className="p-3">Resultado</th></tr></thead><tbody className="divide-y divide-slate-100">{bulkImportResult.results.map((item) => <tr key={item.rowNumber} className={item.status === 'success' ? 'bg-emerald-50/30' : 'bg-red-50/60'}><td className="p-3 font-mono font-bold">{item.rowNumber}</td><td className="p-3 font-mono font-bold text-[#003DA5]">{item.combined_code || '—'}</td><td className="p-3"><span className={`rounded-full px-2 py-1 font-bold ${item.action === 'created' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{item.action === 'created' ? 'Creada' : 'Sin operación'}</span></td><td className="p-3 text-center font-bold">{item.function_count ?? '—'}</td><td className={`p-3 font-medium ${item.status === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>{item.message}</td></tr>)}</tbody></table></div>
              </div>
            </motion.div>
          ) : (
            <div className="mt-5 grid gap-5 xl:grid-cols-3">
              <aside className="space-y-4 xl:col-span-1">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-sm text-blue-950"><p className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-[#003DA5]" /> Validación integral</p><ul className="mt-2 space-y-1.5 pl-6 text-xs leading-5 text-blue-800"><li className="list-disc">Se revisan todas las filas y todas las columnas.</li><li className="list-disc">Máximo 10 MB y 5.000 perfiles por carga.</li><li className="list-disc">Código, nivel, denominación, dependencia y funciones son obligatorios.</li><li className="list-disc">Se detectan códigos inconsistentes, duplicados y longitudes inválidas.</li><li className="list-disc">Una combinación ya creada se rechaza; nunca se duplica ni se sobrescribe.</li><li className="list-disc">La denominación debe coincidir con la vinculación laboral.</li></ul></div>
                <button onClick={downloadTemplate} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"><Download className="h-4 w-4" /> Descargar plantilla con ejemplos</button>
                <div onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }} onDragOver={(event) => { event.preventDefault(); setDragActive(true); }} onDragLeave={(event) => { event.preventDefault(); if (event.currentTarget === event.target) setDragActive(false); }} onDrop={(event) => { event.preventDefault(); setDragActive(false); const file = event.dataTransfer.files?.[0]; if (file) void readBulkFile(file); }} className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${dragActive ? 'border-[#0057B8] bg-blue-50 ring-4 ring-blue-50' : bulkFileError ? 'border-red-300 bg-red-50/60' : bulkFileName ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-300 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40'}`}>
                  {bulkReading ? <><Loader2 className="mx-auto h-9 w-9 animate-spin text-[#003DA5]" /><p className="mt-3 text-sm font-bold text-slate-800">Leyendo todas las filas…</p></> : bulkFileName ? <><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><FileCheck2 className="h-6 w-6" /></span><p className="mt-3 break-all text-sm font-bold text-slate-900">{bulkFileName}</p><p className="mt-1 text-xs text-slate-500">{(bulkFileSize / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 })} KB</p><div className="mt-4 flex justify-center gap-2"><button disabled={bulkValidating} onClick={() => fileInputRef.current?.click()} className="rounded-lg border bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Cambiar</button><button disabled={bulkValidating} onClick={clearBulkFile} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">Quitar</button></div></> : <><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#003DA5]"><FileSpreadsheet className="h-6 w-6" /></span><p className="mt-3 text-sm font-bold text-slate-900">Arrastra aquí el archivo Excel</p><p className="mt-1 text-xs text-slate-500">o selecciónalo desde tu equipo</p><button onClick={() => fileInputRef.current?.click()} className="mt-4 rounded-xl bg-[#003DA5] px-4 py-2.5 text-sm font-semibold text-white">Seleccionar Excel</button></>}
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={onFile} className="hidden" />
                </div>
                {bulkFileError && (
                  <div role="alert" aria-live="assertive" className="rounded-2xl border border-red-300 bg-red-50 p-4 text-red-800 shadow-sm">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"><AlertCircle className="h-5 w-5" /></span>
                      <div className="min-w-0">
                        <p className="font-bold">Archivo rechazado</p>
                        <p className="mt-1 break-all text-xs font-semibold">{bulkFileError.fileName}</p>
                        <p className="mt-2 text-xs leading-5">{bulkFileError.message}</p>
                      </div>
                    </div>
                  </div>
                )}
                {bulkRows.length > 0 && <div className="grid grid-cols-2 gap-2"><div className="rounded-xl border border-slate-200 p-3 text-center"><p className="text-xl font-bold text-slate-900">{bulkRows.length}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Filas</p></div><div className="rounded-xl border border-slate-200 p-3 text-center"><p className="text-xl font-bold text-slate-900">{bulkFunctionCount}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Funciones</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center"><p className="text-xl font-bold text-emerald-700">{bulkImportableRows.length}</p><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">Válidas</p></div><div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center"><p className="text-xl font-bold text-red-700">{bulkInvalidRowCount}</p><p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Con errores</p></div></div>}
              </aside>

              <section className="min-w-0 space-y-4 xl:col-span-2">
                {!bulkRows.length ? bulkFileError ? (
                  <motion.div
                    role="alert"
                    aria-live="assertive"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex min-h-80 items-center justify-center rounded-2xl border-2 border-red-300 bg-red-50 p-8 text-center"
                  >
                    <div className="max-w-xl">
                      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700"><AlertCircle className="h-7 w-7" /></span>
                      <p className="mt-4 text-lg font-bold text-red-900">El archivo no se puede procesar</p>
                      <p className="mt-2 break-all text-sm font-semibold text-red-800">{bulkFileError.fileName}</p>
                      <p className="mt-3 text-sm leading-6 text-red-700">{bulkFileError.message}</p>
                      <p className="mt-3 text-xs leading-5 text-red-600">No se creó ni se modificó ningún registro.</p>
                      <button onClick={() => fileInputRef.current?.click()} className="mt-5 rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-800">Seleccionar otro archivo</button>
                    </div>
                  </motion.div>
                ) : <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/60 p-8 text-center"><div><FileSpreadsheet className="mx-auto h-12 w-12 text-slate-300" /><p className="mt-3 font-bold text-slate-700">El informe de validación aparecerá aquí</p><p className="mt-1 text-sm text-slate-500">Selecciona un archivo para revisar cada fila y columna antes de guardar.</p></div></div> : <>
                  {bulkValidating && <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><Loader2 className="h-5 w-5 animate-spin" /><div><p className="font-bold">Validando el archivo por bloques…</p><p className="text-xs">{bulkValidationProgress.total ? `${bulkValidationProgress.processed} de ${bulkValidationProgress.total} filas candidatas revisadas. ` : ''}Todavía no se ha guardado ningún registro.</p></div></div>}
                  {bulkValidationFailure && <div className={`rounded-2xl border p-4 text-sm ${bulkImportableRows.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}><p className="font-bold">{bulkImportableRows.length ? 'La validación terminó con observaciones.' : 'No se pudo completar la validación del servidor.'}</p><p className="mt-1 text-xs">{bulkValidationFailure}</p></div>}
                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="flex flex-col gap-3 border-b bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-800">Informe completo por fila</h3><p className="text-xs text-slate-500">{bulkDisplayRows.length} de {bulkRows.length} filas visibles.</p></div><div className="flex flex-wrap gap-2">{([['all', `Todas (${bulkRows.length})`], ['valid', `Válidas (${bulkImportableRows.length})`], ['error', `Con errores (${bulkInvalidRowCount})`]] as const).map(([value, label]) => <button key={value} onClick={() => setBulkFilter(value)} className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${bulkFilter === value ? 'bg-[#003DA5] text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'}`}>{label}</button>)}</div></div>
                    <div className="max-h-[400px] overflow-auto"><table className="w-full min-w-[1200px] text-left text-xs"><thead className="sticky top-0 z-[1] bg-white text-[10px] font-bold uppercase tracking-wide text-slate-500 shadow-sm"><tr><th className="p-3">Fila</th><th className="p-3">Código / grado</th><th className="p-3">Denominación / nivel</th><th className="p-3">Estructura organizacional</th><th className="p-3 text-center">Funciones</th><th className="p-3">Operación</th><th className="p-3">Estado y motivos</th></tr></thead><tbody className="divide-y divide-slate-100">{bulkVisibleRows.map((row, index) => { const rowNumber = Number(row.rowNumber) || index + 1; const rowErrors = bulkErrorsByRow.get(rowNumber) || []; const validation = bulkValidationByRow.get(rowNumber); const rowHasError = rowErrors.length > 0; return <tr key={rowNumber} className={rowHasError ? 'bg-red-50/60 align-top' : validation?.status === 'valid' ? 'bg-emerald-50/20 align-top' : 'bg-white align-top'}><td className="p-3 font-mono font-bold text-slate-600">{rowNumber}</td><td className="p-3"><p className="font-mono font-bold text-[#003DA5]">{row.combinedCode || expectedCombinedCode(row.positionCode, row.gradeCode) || '—'}</p><p className="text-[10px] text-slate-500">Código {row.positionCode || '—'} · Grado {row.gradeCode || 'N/A'}</p></td><td className="max-w-xs p-3"><p className="font-semibold text-slate-800">{row.positionName || '—'}</p><p className="text-[10px] text-slate-500">{row.hierarchicalLevel || 'Sin nivel'}</p></td><td className="max-w-xs p-3"><p className="truncate text-slate-700">{row.departmentName || '—'}</p><p className="truncate text-[10px] text-slate-500">{[row.internalGroup, row.costCenter].filter(Boolean).join(' · ') || 'Sin grupo/centro'}</p></td><td className="p-3 text-center font-bold text-slate-700">{functionPreviewCount(row.functions)}</td><td className="p-3">{validation?.status === 'valid' ? <span className="rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-700">Crear</span> : <span className="rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-500">Sin operación</span>}</td><td className="max-w-sm p-3">{rowHasError ? <div><span className="inline-flex rounded-full bg-red-100 px-2 py-1 font-bold text-red-700">No se procesará</span><ul className="mt-2 space-y-1">{rowErrors.map((error, errorIndex) => <li key={`${error.source}-${errorIndex}`} className="text-red-700"><strong>{FIELD_LABELS[error.field || 'row'] || 'Fila'}:</strong> {error.message}</li>)}</ul></div> : bulkValidating && !validation ? <span className="inline-flex items-center gap-1.5 text-blue-700"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Validando…</span> : validation?.status === 'valid' ? <div><span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 font-bold text-emerald-700">Lista para crear</span><p className="mt-1 text-[10px] text-emerald-700">{validation.message}</p></div> : <span className="inline-flex rounded-full bg-slate-100 px-2 py-1 font-bold text-slate-600">Pendiente de validación</span>}</td></tr>; })}</tbody></table></div>
                    {bulkPreviewPages > 1 && <div className="flex flex-col items-center justify-between gap-3 border-t bg-slate-50 px-4 py-3 text-xs lg:flex-row"><span className="text-slate-500">Página {bulkPreviewPage} de {bulkPreviewPages} · máximo {BULK_PAGE_SIZE} filas por página</span><PaginationNavigator page={bulkPreviewPage} totalPages={bulkPreviewPages} onPageChange={setBulkPreviewPage} showJump /><div className="flex gap-2"><button disabled={bulkPreviewPage <= 1} onClick={() => setBulkPreviewPage((value) => Math.max(1, value - 1))} className="rounded-lg border bg-white px-3 py-1.5 font-semibold disabled:opacity-40">Anterior</button><button disabled={bulkPreviewPage >= bulkPreviewPages} onClick={() => setBulkPreviewPage((value) => Math.min(bulkPreviewPages, value + 1))} className="rounded-lg border bg-white px-3 py-1.5 font-semibold disabled:opacity-40">Siguiente</button></div></div>}
                  </div>
                  {bulkInvalidRowCount > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800"><strong>Importante:</strong> las filas con errores permanecerán fuera de la operación. Puedes cancelar, corregir el Excel y volver a cargarlo, o procesar únicamente {bulkImportableRows.length === 1 ? 'la fila válida' : `las ${bulkImportableRows.length} filas válidas`}.</div>}
                </>}
              </section>
            </div>
          )}
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          {bulkStage === 'result' && bulkImportResult ? <><p className="text-xs text-slate-500">Proceso terminado: {bulkImportResult.summary.created} {bulkImportResult.summary.created === 1 ? 'creada' : 'creadas'} y {bulkImportResult.summary.failed} {bulkImportResult.summary.failed === 1 ? 'fallida' : 'fallidas'}.</p><div className="flex justify-end gap-2"><button onClick={clearBulkFile} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cargar otro archivo</button><button onClick={closeBulkModal} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#003DA5] px-5 text-sm font-semibold text-white shadow-lg"><CheckCircle2 className="h-4 w-4" /> Volver a funciones</button></div></> : <><p className={`text-xs ${bulkFileError ? 'font-semibold text-red-700' : 'text-slate-500'}`}>{bulkFileError ? 'Archivo rechazado: corrige el formato o selecciona la plantilla oficial para continuar.' : 'Las filas con errores se omiten. Solo se crearán las que hayan superado todas las validaciones.'}</p><div className="flex justify-end gap-2"><button disabled={bulkLoading || bulkReading || bulkValidating} onClick={closeBulkModal} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button><button disabled={!bulkValidation || !bulkImportableRows.length || bulkLoading || bulkReading || bulkValidating} onClick={() => void importBulk()} className="inline-flex h-11 min-w-44 items-center justify-center gap-2 rounded-xl bg-[#003DA5] px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-[#002873] disabled:cursor-not-allowed disabled:opacity-45">{bulkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{bulkLoading ? `Creando ${bulkImportProgress.processed} de ${bulkImportProgress.total}…` : bulkImportableRows.length === 1 ? 'Crear 1 fila válida' : `Crear ${bulkImportableRows.length || ''} filas válidas`}</button></div></>}
        </footer>
      </ModalShell>

      <ModalShell open={bulkDeleteOpen} titleId="labor-functions-bulk-delete-title" onClose={closeBulkDelete} busy={deletingSelected} widthClass="max-w-2xl">
        {bulkDeleteOpen && (
          <div className="p-6 sm:p-7">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100"><Trash2 className="h-6 w-6" /></span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-red-600">Eliminación múltiple</p>
                <h2 id="labor-functions-bulk-delete-title" className="mt-1 text-xl font-bold text-slate-950">¿Eliminar {selectedCount} {selectedCount === 1 ? 'registro seleccionado' : 'registros seleccionados'}?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">La selección incluye registros de todas las páginas recorridas. Los certificados ya emitidos conservarán su información histórica.</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center"><p className="text-xl font-bold text-slate-950">{selectedCount}</p><p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Perfiles</p></div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center"><p className="text-xl font-bold text-red-700">{selectedFunctionCount}</p><p className="text-[10px] font-bold uppercase tracking-wide text-red-600">Funciones</p></div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center"><p className="text-xl font-bold text-amber-700">{selectedAssociationCount}</p><p className="text-[10px] font-bold uppercase tracking-wide text-amber-600">Asociados</p></div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700">Vista previa de la selección</div>
              <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
                {selectedProfilesList.slice(0, 8).map((profile) => (
                  <li key={profile.id} className="flex items-start justify-between gap-3 px-4 py-2.5 text-xs">
                    <span className="min-w-0"><strong className="font-mono text-[#003DA5]">{profile.combined_code}</strong><span className="ml-2 text-slate-700">{profile.position_name}</span></span>
                    <span className="shrink-0 font-semibold text-slate-500">{profile.function_count} {profile.function_count === 1 ? 'función' : 'funciones'}</span>
                  </li>
                ))}
              </ul>
              {selectedCount > 8 && <p className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-500">Y {selectedCount - 8} {selectedCount - 8 === 1 ? 'registro adicional' : 'registros adicionales'} seleccionados en otras filas o páginas.</p>}
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><strong>Validación segura:</strong> el servidor comprobará todos los identificadores antes de borrar. Si falta o es inválido uno de ellos, no se eliminará ningún registro.</div>
            {bulkDeleteSubmissionError && (
              <div role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800">
                <p className="flex items-center gap-2 font-bold text-red-900"><AlertCircle className="h-4 w-4 shrink-0" /> No se completó la eliminación</p>
                <p className="mt-1 break-words text-xs leading-5">{bulkDeleteSubmissionError}</p>
                <p className="mt-1 text-xs text-red-700">La selección se conserva para que puedas revisar, actualizar o volver a intentar.</p>
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button disabled={deletingSelected} onClick={closeBulkDelete} className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button>
              <button disabled={deletingSelected || !selectedCount} onClick={() => void removeSelectedProfiles()} className="inline-flex h-11 min-w-52 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-lg shadow-red-900/10 transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{deletingSelected ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{deletingSelected ? 'Validando y eliminando…' : `Eliminar ${selectedCount} ${selectedCount === 1 ? 'registro' : 'registros'}`}</button>
            </div>
          </div>
        )}
      </ModalShell>

      <ModalShell open={Boolean(profileToDelete)} titleId="labor-functions-delete-title" onClose={closeDelete} busy={deleting} widthClass="max-w-lg">
        {profileToDelete && <div className="p-6 sm:p-7"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100"><Trash2 className="h-6 w-6" /></span><h2 id="labor-functions-delete-title" className="mt-5 text-xl font-bold text-slate-950">¿Eliminar este perfil de funciones?</h2><p className="mt-2 text-sm leading-6 text-slate-600">Se eliminarán <strong>{profileToDelete.function_count} funciones</strong> asociadas a <strong>{profileToDelete.combined_code} · {profileToDelete.position_name}</strong>. Los certificados ya emitidos conservarán su snapshot histórico.</p><div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><strong>Importante:</strong> las nuevas solicitudes dejarán de encontrar estas funciones.</div>{deleteSubmissionError && <div role="alert" aria-live="assertive" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-800"><p className="flex items-center gap-2 font-bold text-red-900"><AlertCircle className="h-4 w-4 shrink-0" /> No se pudo eliminar el registro</p><p className="mt-1 break-words text-xs leading-5">{deleteSubmissionError}</p><p className="mt-1 text-xs text-red-700">El registro permanece en la matriz y puedes volver a intentarlo.</p></div>}<div className="mt-6 flex justify-end gap-2"><button disabled={deleting} onClick={closeDelete} className="h-11 rounded-xl border border-slate-300 px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Cancelar</button><button disabled={deleting} onClick={() => void removeProfile()} className="inline-flex h-11 min-w-36 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-semibold text-white shadow-lg shadow-red-900/10 hover:bg-red-700 disabled:opacity-60">{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{deleting ? 'Eliminando…' : 'Sí, eliminar'}</button></div></div>}
      </ModalShell>
    </div>
  );
}
