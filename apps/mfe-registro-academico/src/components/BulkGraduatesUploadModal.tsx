import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, RefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@esap-mfe/shared-ui/dialog';
import { Badge } from '@esap-mfe/shared-ui/badge';
import {
  getGraduateFieldErrors,
  GRADUATE_TEMPLATE_COLUMNS,
  NUMERIC_FIELD_RULES,
  normalizeKey,
  uniqueSorted,
} from '../utils/graduateBulkValidation';
import type { FieldKey } from '../utils/graduateBulkValidation';
import { createGraduateImportSession } from '../utils/graduateBulkImportSession';
import type {
  GraduateExportProgress,
  GraduateImportSummary,
  GraduatePreviewFilter,
  GraduatePreviewPage,
  GraduatePreviewRow,
  GraduateValidationProgress,
} from '../utils/graduateBulkWorkbook';
import styles from './BulkGraduatesUploadModal.module.css';
import graduadosService, {
  BulkCreateGraduadosResponse,
  GraduadoData,
} from '../../services/api/graduados.service';

type BulkGraduatesUploadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (graduates: GraduadoData[]) => void;
  createdBy?: string;
  programOptions: string[];
  programsPeriod?: string;
};

const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
// Límite propio del formato XLSX; no representa un tope funcional de la carga.
const XLSX_LAST_ROW = 1_048_576;
// Tamaño de transporte por petición. Todos los lotes se procesan hasta terminar el archivo.
const BULK_REQUEST_BATCH_SIZE = 100;
const DISPLAYED_IMPORT_ERRORS = 8;
type ImportResult = Omit<BulkCreateGraduadosResponse, 'created'>;
type UploadOperation = 'validation' | 'import' | 'export';
const rowCountFormat = new Intl.NumberFormat('es-CO');
const PREVIEW_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'errors', label: 'Con errores' },
  { value: 'ready', label: 'Listos para crear' },
] as const;

const PREVIEW_COLUMNS: Array<{
  key: FieldKey;
  label: string;
  className: string;
  getValue: (row: GraduatePreviewRow) => string;
}> = [
  {
    key: 'identificacion',
    label: 'Identificación',
    className: 'min-w-[8.25rem]',
    getValue: (row) => row.identificacion,
  },
  {
    key: 'estudiante',
    label: 'Estudiante',
    className: 'min-w-[13rem]',
    getValue: (row) => row.estudiante,
  },
  {
    key: 'titulo',
    label: 'Título',
    className: 'min-w-[16rem]',
    getValue: (row) => row.titulo,
  },
  {
    key: 'registro',
    label: 'Registro',
    className: 'min-w-[5.75rem]',
    getValue: (row) => row.registro,
  },
  {
    key: 'acta',
    label: 'Acta / Folio',
    className: 'min-w-[5rem]',
    getValue: (row) => row.acta,
  },
  {
    key: 'libro',
    label: 'Libro',
    className: 'min-w-[5rem]',
    getValue: (row) => row.libro,
  },
  {
    key: 'fechaRegistro',
    label: 'Fecha registro',
    className: 'min-w-[8.5rem]',
    getValue: (row) => row.fechaRegistro,
  },
  {
    key: 'anioGrado',
    label: 'Año grado',
    className: 'min-w-[6.75rem]',
    getValue: (row) => row.anioGrado,
  },
  {
    key: 'correo',
    label: 'Correo',
    className: 'min-w-[14rem]',
    getValue: (row) => row.correo,
  },
  {
    key: 'telefono',
    label: 'Teléfono',
    className: 'min-w-[8rem]',
    getValue: (row) => row.telefono,
  },
  {
    key: 'territorial',
    label: 'Territorial',
    className: 'min-w-[11rem]',
    getValue: (row) => row.territorial,
  },
  {
    key: 'sede',
    label: 'Sede',
    className: 'min-w-[12rem]',
    getValue: (row) => row.sede,
  },
];

const TEMPLATE_RULES = [
  'No se debe diligenciar una columna ID; el sistema genera el identificador interno automáticamente.',
  'Una misma IDENTIFICACION puede aparecer varias veces solo si el TITULO es diferente.',
  'No se permite repetir la combinación IDENTIFICACION + TITULO en el archivo ni en la base de datos.',
  'Diligencie FECHAREGISTRO con el formato dd/mm/yyyy. La fecha no puede ser posterior a la fecha actual.',
  'TITULO debe copiarse del catálogo propio de Graduados en PARAMETROS.',
  'TERRITORIAL y SEDE se diligencian como texto libre del graduado; no se exige una relación de catálogo.',
  'IDENTIFICACION solo debe contener números; graduados no almacena tipo de documento.',
  'REGISTRO, ACTA/FOLIO y LIBRO son obligatorios y numéricos. REGISTRO debe tener entre 1 y 20 dígitos; ACTA/FOLIO y LIBRO entre 1 y 10.',
  'DIPLOMA no se diligencia en la plantilla; el sistema lo asigna automáticamente al crear el graduado.',
  'CORREO es opcional, pero si se diligencia debe tener @ y un punto después del @.',
  'TELEFONO es opcional, pero si se diligencia solo debe contener números, mínimo 7 y máximo 10 dígitos.',
  `El archivo debe ser .xlsx, sin límite fijo de filas y con un tamaño máximo de ${MAX_FILE_SIZE_MB} MB.`,
];

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
};

const createExampleRows = (programOptions: string[]) => {
  const programs = uniqueSorted(programOptions);
  if (!programs.length) {
    return [];
  }
  const firstProgram = programs[0];
  const secondProgram = programs[1] || firstProgram;

  return [
    [
      '900100001',
      'LAURA CAMILA ANDRADE RIVERA',
      firstProgram,
      '123',
      '28',
      '3',
      new Date('2022-07-15'),
      '2022',
      'laura.andrade@example.com',
      '3004567890',
      'Territorial de ejemplo',
      'Sede de ejemplo',
    ],
    [
      '900100002',
      'MATEO ALEJANDRO PARRA LÓPEZ',
      secondProgram,
      '124',
      '55',
      '11',
      new Date('2021-10-22'),
      '2021',
      'mateo.parra@example.com',
      '3109876543',
      'Territorial de ejemplo',
      'Sede de ejemplo',
    ],
  ];
};

const buildParametersRows = (programOptions: string[], programsPeriod?: string) => {
  const programs=uniqueSorted(programOptions);
  const rows: Array<Array<string | number>> = [
    ['PARAMETROS DE CARGA MASIVA DE GRADUADOS'],
    ['Copie TITULO del catálogo propio de Gestión de Graduados.'],
    ['TERRITORIAL y SEDE son texto libre del graduado; no requieren un catálogo de relaciones. Reemplace los datos de ejemplo por los datos reales antes de importar.'],
    [`Fuente de títulos: ${programsPeriod || 'Gestión de Graduados'}.`],
    ['RESUMEN DE CATALOGOS'],
    ['CATALOGO','CANTIDAD','COLUMNA EN GRADUADOS'],
    ['Títulos válidos',programs.length,'TITULO'],
    ['BLOQUE 1 - TITULOS_VALIDOS'],
    ['#','TITULO_VALIDO','COPIAR_EN_COLUMNA'],
  ];
  programs.forEach((program,index)=>rows.push([index+1,program,'TITULO']));
  rows.push([''],['BLOQUE 2 - REGLAS_DE_CARGA'],['#','REGLA']);
  TEMPLATE_RULES.forEach((rule,index)=>rows.push([index+1,rule]));
  return rows;
};

function GraduateUploadProgress({
  title,
  detail,
  percentage,
}: {
  title: string;
  detail: string;
  percentage?: number;
}) {
  return (
    <div className={`${styles.progressCard} rounded-xl border border-blue-100 px-4 py-3`}>
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-[#003DA5]">
          <Loader2 aria-hidden="true" className={`${styles.progressIcon} h-4 w-4`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p role="status" className="text-xs text-slate-600">{detail}</p>
        </div>
        {percentage !== undefined && (
          <span aria-hidden="true" className="rounded-md bg-white px-2 py-1 text-xs font-semibold tabular-nums text-[#003DA5]">
            {percentage}%
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-label={title}
        aria-valuenow={percentage}
        className="h-1.5 overflow-hidden rounded-full bg-blue-100"
      >
        {percentage === undefined ? (
          <div className={`${styles.progressIndeterminate} h-full w-full rounded-full bg-blue-300`} />
        ) : (
          <div
            className={`${styles.progressFill} h-full rounded-full bg-[#003DA5]`}
            style={{ transform: `scaleX(${percentage / 100})` }}
          />
        )}
      </div>
    </div>
  );
}

export function BulkGraduatesUploadModal({
  open,
  onOpenChange,
  onImported,
  createdBy,
  programOptions,
  programsPeriod,
}: BulkGraduatesUploadModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<ReturnType<typeof createGraduateImportSession> | null>(null);
  const operationRef = useRef<UploadOperation | null>(null);
  const loadingPageRef = useRef<number | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [importSummary, setImportSummary] = useState<GraduateImportSummary | null>(null);
  const [loadingPage, setLoadingPage] = useState<number | null>(null);
  const [operation, setOperation] = useState<UploadOperation | null>(null);
  const [exportProgress, setExportProgress] = useState<GraduateExportProgress | null>(null);
  const [validationProgress, setValidationProgress] = useState<GraduateValidationProgress | null>(null);
  const [importProgress, setImportProgress] = useState({ processed: 0, total: 0 });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const isParsing = operation === 'validation';
  const isImporting = operation === 'import';
  const isExporting = operation === 'export';
  const isBusy = operation !== null;
  const totalRows = importSummary?.totalRows ?? 0;
  const validCount = importSummary?.validCount ?? 0;
  const readyToImport = validCount > 0 && !isBusy;
  const catalogsReady = useMemo(
    () => programOptions.some((program) => normalizeKey(program)),
    [programOptions],
  );
  const fileActionsDisabled = isBusy || !catalogsReady;

  const updateOperation = useCallback((next: UploadOperation | null) => {
    operationRef.current = next;
    setOperation(next);
  }, []);

  const disposeSession = useCallback(() => {
    const session = sessionRef.current;
    sessionRef.current = null;
    session?.dispose();
  }, []);

  const clearPreview = useCallback(() => {
    loadingPageRef.current = null;
    setLoadingPage(null);
    setImportSummary(null);
  }, []);

  const resetState = useCallback(() => {
    disposeSession();
    setSelectedFileName('');
    clearPreview();
    setValidationProgress(null);
    setExportProgress(null);
    if (operationRef.current === 'validation' || operationRef.current === 'export') {
      updateOperation(null);
    }
    setImportResult(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }, [clearPreview, disposeSession, updateOperation]);

  useEffect(() => {
    if (!open) resetState();
    return disposeSession;
  }, [open, resetState, disposeSession]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (operationRef.current) return;
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleCancelValidation = () => {
    if (operationRef.current !== 'validation') return;
    resetState();
    toast.info('Validación cancelada', { description: 'Puedes seleccionar otro archivo XLSX.' });
  };

  const handleDownloadTemplate = async () => {
    if (operationRef.current) return;
    if (!catalogsReady) {
      toast.error('No se puede generar la plantilla', {
        description:
          'No hay títulos disponibles en el catálogo propio de Gestión de Graduados.',
      });
      return;
    }

    const fileBaseName = 'Plantilla_Carga_Masiva_Graduados_ESAP';
    const exampleRows = createExampleRows(programOptions);
    const parameterRows = buildParametersRows(programOptions, programsPeriod);
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'ESAP';
    workbook.created = new Date();

    const thinBorder = {
      top: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      left: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      bottom: { style: 'thin', color: { argb: 'FFD9E2F3' } },
      right: { style: 'thin', color: { argb: 'FFD9E2F3' } },
    };
    const applyRowFill = (row: any, color: string, fontColor = 'FFFFFFFF') => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
        cell.font = { bold: true, color: { argb: fontColor } };
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
      });
    };
    const applyTableHeader = (row: any) => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } };
        cell.font = { bold: true, color: { argb: 'FF14532D' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = thinBorder;
      });
    };

    const graduatesSheet = workbook.addWorksheet('GRADUADOS', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    graduatesSheet.columns = [
      { width: 18 },
      { width: 34 },
      { width: 64 },
      { width: 24 },
      { width: 14 },
      { width: 14 },
      { width: 16, style: { numFmt: 'dd"/"mm"/"yyyy' } },
      { width: 12 },
      { width: 28 },
      { width: 14 },
      { width: 30 },
      { width: 36 },
    ];
    graduatesSheet.addRows([GRADUATE_TEMPLATE_COLUMNS.map(([, title]) => title), ...exampleRows]);
    graduatesSheet.autoFilter = {
      from: 'A1',
      to: `L${exampleRows.length + 1}`,
    };
    applyRowFill(graduatesSheet.getRow(1), 'FF003DA5');
    graduatesSheet.eachRow((row: any) => {
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
      });
    });

    const listsSheet = workbook.addWorksheet('CATALOGOS_VALIDACION', {
      state: 'veryHidden',
    });
    const programs = uniqueSorted(programOptions);
    listsSheet.addRow(['TITULOS']);
    programs.forEach(program=>listsSheet.addRow([program]));
    workbook.definedNames.add(
      `CATALOGOS_VALIDACION!$A$2:$A$${programs.length + 1}`,
      'LISTA_TITULOS_GRADUADOS',
    );
    const addListValidation = (
      targetColumn: string,
      listName: string,
      errorTitle: string,
    ) => {
      graduatesSheet.dataValidations.add(`${targetColumn}2:${targetColumn}${XLSX_LAST_ROW}`, {
        type: 'list',
        allowBlank: false,
        formulae: [listName],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle,
        error: 'Seleccione un valor del catálogo dinámico incluido en esta plantilla.',
      });
    };
    addListValidation('C', 'LISTA_TITULOS_GRADUADOS', 'Título no válido');

    const addNumericControlValidation = (
      targetColumn: string,
      rule: (typeof NUMERIC_FIELD_RULES)[keyof typeof NUMERIC_FIELD_RULES],
    ) => {
      const firstCell = `${targetColumn}2`;
      graduatesSheet.getColumn(targetColumn).numFmt = '@';
      graduatesSheet.dataValidations.add(
        `${targetColumn}2:${targetColumn}${XLSX_LAST_ROW}`,
        {
          type: 'custom',
          allowBlank: false,
          formulae: [
            `IFERROR(AND(${firstCell}<>"",LEN(${firstCell})>=${rule.minLength},LEN(${firstCell})<=${rule.maxLength},ISNUMBER(--${firstCell}),--${firstCell}>0,ISERROR(FIND(".",${firstCell}&"")),ISERROR(FIND(",",${firstCell}&"")),ISERROR(FIND("-",${firstCell}&"")),ISERROR(FIND("+",${firstCell}&"")),ISERROR(FIND("E",UPPER(${firstCell}&"")))),FALSE)`,
          ],
          showInputMessage: true,
          promptTitle: `${rule.label} obligatorio`,
          prompt: `Digite entre ${rule.minLength} y ${rule.maxLength} dígitos, solamente números.`,
          showErrorMessage: true,
          errorStyle: 'stop',
          errorTitle: `${rule.label} no válido`,
          error: `${rule.label} es obligatorio y debe contener entre ${rule.minLength} y ${rule.maxLength} dígitos numéricos.`,
        },
      );
    };
    addNumericControlValidation('D', NUMERIC_FIELD_RULES.registro);
    addNumericControlValidation('E', NUMERIC_FIELD_RULES.acta);
    addNumericControlValidation('F', NUMERIC_FIELD_RULES.libro);

    const parametersSheet = workbook.addWorksheet('PARAMETROS', {
      views: [{ state: 'frozen', ySplit: 3 }],
    });
    parametersSheet.addRows(parameterRows);
    parametersSheet.columns = [
      { width: 24 },
      { width: 64 },
      { width: 24 },
      { width: 30 },
      { width: 96 },
    ];
    parameterRows.forEach((sourceRow, index) => {
      const rowNumber = index + 1;
      const row = parametersSheet.getRow(rowNumber);
      const firstCell = String(sourceRow[0] || '');
      row.eachCell({ includeEmpty: true }, (cell: any) => {
        cell.alignment = { vertical: 'middle', wrapText: true };
        cell.border = thinBorder;
      });

      if (sourceRow.length === 1 && firstCell) {
        parametersSheet.mergeCells(rowNumber, 1, rowNumber, 5);
        row.height = firstCell.startsWith('BLOQUE') ? 23 : 24;
        const fillColor = firstCell.startsWith('BLOQUE')
          ? 'FF059669'
          : firstCell === 'RESUMEN DE CATALOGOS'
            ? 'FFFBBF24'
            : 'FF003DA5';
        const fontColor = fillColor === 'FFFBBF24' ? 'FF78350F' : 'FFFFFFFF';
        applyRowFill(row, fillColor, fontColor);
      } else if (firstCell === '#' || firstCell === 'CATALOGO') {
        applyTableHeader(row);
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${fileBaseName}.xlsx`,
    );
    toast.success('Plantilla XLSX descargada', {
      description: 'La plantilla incluye GRADUADOS para diligenciar y PARAMETROS con títulos y reglas propias de Graduados.',
    });
  };

  const parseFile = async (file: File) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`El archivo supera el límite de ${MAX_FILE_SIZE_MB} MB`);
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Formato no permitido', {
        description: 'La carga masiva solo acepta archivos .xlsx.',
      });
      return;
    }

    if (!catalogsReady) {
      toast.error('No se puede validar la plantilla', {
        description:
          'No se cargaron títulos del catálogo de Gestión de Graduados. Intente abrir nuevamente el módulo antes de importar.',
      });
      return;
    }

    disposeSession();
    setSelectedFileName(file.name);
    clearPreview();
    setValidationProgress(null);
    setImportResult(null);
    updateOperation('validation');
    let session: ReturnType<typeof createGraduateImportSession> | undefined;
    try {
      session = createGraduateImportSession(
        (progress) => {
          if (sessionRef.current === session) setValidationProgress(progress);
        },
        (progress) => {
          if (sessionRef.current === session && operationRef.current === 'export') {
            setExportProgress(progress);
          }
        },
      );
      sessionRef.current = session;
      const summary = await session.validate(file, programOptions);
      if (sessionRef.current !== session) return;
      setImportSummary(summary);
      updateOperation(null);
      toast.success('Archivo validado', {
        description: `${summary.totalRows} filas leídas, ${summary.validCount} listas para importar.`,
      });
    } catch (error) {
      if (session && sessionRef.current !== session) return;
      disposeSession();
      setSelectedFileName('');
      setValidationProgress(null);
      updateOperation(null);
      toast.error('No se pudo leer el archivo', {
        description: error instanceof Error ? error.message : 'Verifique que sea un archivo .xlsx válido.',
      });
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (operationRef.current) return;
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Formato no permitido', {
        description: 'Cargue únicamente la plantilla en formato .xlsx.',
      });
      return;
    }
    void parseFile(file);
  };

  const handlePreviewPageChange = useCallback(async (pageNumber: number, filter: GraduatePreviewFilter) => {
    const session = sessionRef.current;
    const currentPage = importSummary?.page;
    if (!session || !currentPage || operationRef.current || loadingPageRef.current !== null) return;
    const filterChanged = currentPage.filter !== filter;
    const maximumPage = filterChanged ? 1 : currentPage.totalPages;
    if (
      !Number.isInteger(pageNumber) || pageNumber < 1 ||
      pageNumber > maximumPage || (!filterChanged && pageNumber === currentPage.number)
    ) return;

    loadingPageRef.current = pageNumber;
    setLoadingPage(pageNumber);
    try {
      const page = await session.getPreviewPage(pageNumber, filter);
      if (sessionRef.current !== session) return;
      setImportSummary((current) => current && { ...current, page });
    } catch (error) {
      if (sessionRef.current === session) {
        toast.error('No se pudo mostrar la página', {
          description: error instanceof Error ? error.message : 'Intente consultar la página de nuevo.',
        });
      }
    } finally {
      if (sessionRef.current === session) {
        loadingPageRef.current = null;
        setLoadingPage(null);
      }
    }
  }, [importSummary?.page]);

  const handleExportPreview = useCallback(async () => {
    const session = sessionRef.current;
    if (!session || !totalRows || operationRef.current || loadingPageRef.current !== null) return;
    setExportProgress(null);
    updateOperation('export');

    try {
      const file = await session.exportValidationReport();
      if (sessionRef.current !== session) return;
      downloadBlob(file, 'Resultado_Validacion_Graduados_ESAP.xlsx');
      toast.success('Excel de validación descargado');
    } catch (error) {
      if (sessionRef.current === session) {
        toast.error('No se pudo exportar la validación', {
          description: error instanceof Error ? error.message : 'Intente descargar el archivo de nuevo.',
        });
      }
    } finally {
      if (sessionRef.current === session) {
        setExportProgress(null);
        updateOperation(null);
      }
    }
  }, [totalRows, updateOperation]);

  const handleImport = async () => {
    const session = sessionRef.current;
    if (!readyToImport || !session || operationRef.current) return;
    setImportProgress({ processed: 0, total: validCount });
    updateOperation('import');
    setImportResult(null);
    const result: ImportResult = {
      total: validCount,
      createdCount: 0,
      failedCount: 0,
      errors: [],
    };
    const created: GraduadoData[] = [];
    let processed = 0;

    try {
      while (processed < validCount) {
        const batch = await session.getBatch(processed, BULK_REQUEST_BATCH_SIZE);
        if (sessionRef.current !== session) break;
        const batchResult = await graduadosService.graduados.crearMasivo(
          batch.map((row) => row.payload),
          createdBy?.trim() || 'bulk_upload',
        );

        created.push(...batchResult.created);
        result.createdCount += batchResult.createdCount;
        result.failedCount += batchResult.failedCount;
        result.errors.push(
          ...batchResult.errors.slice(0, DISPLAYED_IMPORT_ERRORS - result.errors.length).map((error) => ({
            ...error,
            rowNumber: batch[error.rowNumber - 2]?.rowNumber ?? error.rowNumber,
          })),
        );
        processed += batch.length;
        if (sessionRef.current !== session) break;
        setImportProgress({ processed, total: validCount });
      }

      if (sessionRef.current !== session) {
        if (created.length) onImported(created);
        return;
      }
      setImportResult(result);
      if (created.length) onImported(created);
      if (result.failedCount > 0) {
        toast.warning('Carga procesada con observaciones', {
          description: `${result.createdCount} creados, ${result.failedCount} con error.`,
        });
      } else {
        toast.success('Carga masiva completada', {
          description: `${result.createdCount} graduados creados correctamente.`,
        });
      }
    } catch (error: any) {
      const isCurrentSession = sessionRef.current === session;
      if (processed > 0) {
        if (isCurrentSession) setImportResult({ ...result, total: processed });
        if (created.length) onImported(created);
      }
      if (!isCurrentSession) return;
      toast.error('No se pudo completar la carga masiva', {
        description:
          processed > 0
            ? `Se procesaron ${processed} de ${validCount} filas antes de la interrupción. ${error?.response?.data?.message || error?.message || ''}`.trim()
            : error?.response?.data?.message || error?.message,
      });
    } finally {
      updateOperation(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        hideCloseButton={isBusy}
        onEscapeKeyDown={(event) => {
          if (operationRef.current) event.preventDefault();
        }}
        className={`${styles.dialogContent} flex max-h-[92vh] flex-col overflow-hidden`}
      >
        <DialogHeader className={styles.dialogHeader}>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" style={{ color: '#003DA5' }} />
            Carga masiva de graduados
          </DialogTitle>
          <DialogDescription>
            Importe graduados desde Excel. El sistema valida el archivo antes de crear registros y genera el identificador interno automáticamente.
          </DialogDescription>
        </DialogHeader>

        <motion.div
          ref={scrollContainerRef}
          layout
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            opacity: { duration: 0.22, ease: 'easeOut' },
            y: { duration: 0.22, ease: 'easeOut' },
            layout: { duration: 0.32, ease: [0.22, 1, 0.36, 1] },
          }}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1"
        >
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 28rem), 1fr))' }}
          >
            <div className="rounded-lg border p-4" style={{ borderColor: '#DBEAFE', background: '#F8FAFF' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                    Plantilla oficial
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: '#64748B' }}>
                    El archivo de Excel contiene dos hojas: <strong>GRADUADOS</strong> para diligenciar personas y <strong>PARAMETROS</strong> para copiar títulos y consultar las reglas de Graduados. Territorial y sede se diligencian como texto libre.
                  </p>
                </div>
                <FileSpreadsheet className="h-8 w-8 flex-shrink-0" style={{ color: '#047857' }} />
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => void handleDownloadTemplate()}
                  disabled={fileActionsDisabled}
                  className={`${styles.secondaryAction} inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors`}
                >
                  <Download className="h-4 w-4" />
                  Descargar plantilla XLSX
                </button>
              </div>
              <div className="mt-4 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                Catálogo propio de Graduados: {programOptions.length} títulos.
                <br />
                Fuente: <strong>{programsPeriod || 'Gestión de Graduados'}</strong>. Territorial y sede son texto libre.
              </div>
              {!catalogsReady && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  No hay títulos disponibles en Gestión de Graduados. Revise su catálogo de programas antes de importar.
                </div>
              )}
            </div>

            <div className="rounded-lg border p-4" style={{ borderColor: '#E5E7EB', background: '#FFFFFF' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                    Archivo a importar
                  </p>
                  <p className="mt-1 text-xs leading-5" style={{ color: '#64748B' }}>
                    Solo formato .xlsx. Sin límite fijo de filas, hasta {MAX_FILE_SIZE_MB} MB.
                  </p>
                </div>
                <Upload className="h-6 w-6" style={{ color: '#003DA5' }} />
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx"
                className="sr-only"
                onChange={handleFileChange}
                disabled={fileActionsDisabled}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={fileActionsDisabled}
                className={`${styles.secondaryAction} mt-4 flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800 transition-colors`}
              >
                <Upload className="h-4 w-4 flex-shrink-0" />
                <span className="max-w-full truncate">{selectedFileName || 'Seleccionar archivo XLSX'}</span>
              </button>
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                Se lee únicamente la hoja GRADUADOS. PARAMETROS contiene los títulos válidos y las reglas de Graduados. Territorial y sede son texto libre.
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Controles numéricos obligatorios: <strong>REGISTRO de 1 a 20 dígitos</strong> y <strong>ACTA/FOLIO y LIBRO de 1 a 10 dígitos</strong>.
              </p>
            </div>
          </div>

          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 13.5rem), 1fr))' }}
          >
            {[
              { label: 'Filas leídas', value: totalRows, border: '#DBEAFE', bg: '#EFF6FF', color: '#1D4ED8' },
              { label: 'Listas para crear', value: validCount, border: '#BBF7D0', bg: '#F0FDF4', color: '#047857' },
              { label: 'Con errores', value: totalRows - validCount, border: '#FECACA', bg: '#FEF2F2', color: '#B91C1C' },
            ].map((item) => (
              <motion.div
                key={item.label}
                layout
                className="rounded-lg border px-4 py-3"
                style={{ borderColor: item.border, background: item.bg }}
              >
                <p className="text-xs font-semibold uppercase" style={{ color: item.color }}>
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-bold" style={{ color: '#111827' }}>
                  {item.value}
                </p>
              </motion.div>
            ))}
          </div>

          {importSummary && (
            <GraduateImportPreview
              page={importSummary.page}
              totalRows={totalRows}
              validCount={validCount}
              loadingPage={loadingPage}
              isBusy={isBusy}
              isExporting={isExporting}
              exportProgress={exportProgress}
              scrollContainerRef={scrollContainerRef}
              onPageChange={handlePreviewPageChange}
              onExport={handleExportPreview}
            />
          )}

          <AnimatePresence>
            {importResult && (
              <motion.div
                layout
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{
                  opacity: { duration: 0.18, ease: 'easeOut' },
                  y: { duration: 0.22, ease: 'easeOut' },
                  height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                  layout: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                }}
                className="rounded-xl border p-4"
                style={{
                  borderColor: importResult.failedCount ? '#FDE68A' : '#BBF7D0',
                  background: importResult.failedCount ? '#FFFBEB' : '#F0FDF4',
                }}
              >
                <div className="flex items-start gap-3">
                  {importResult.failedCount ? (
                    <AlertCircle className="h-5 w-5 flex-shrink-0" style={{ color: '#B45309' }} />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 flex-shrink-0" style={{ color: '#047857' }} />
                  )}
                  <div>
                    <p className="text-sm font-semibold" style={{ color: '#111827' }}>
                      Resultado de la carga
                    </p>
                    <p className="mt-1 text-sm" style={{ color: '#374151' }}>
                      {importResult.createdCount} graduados creados de {importResult.total} enviados.
                    </p>
                    {importResult.errors.length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs" style={{ color: '#92400E' }}>
                        {importResult.errors.map((error) => (
                          <li key={`${error.rowNumber}-${error.message}`}>
                            Fila {error.rowNumber}: {error.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="shrink-0 space-y-3">
          {isParsing && (
            <GraduateUploadProgress
              title={validationProgress ? 'Validando registros' : 'Leyendo archivo de Excel…'}
              detail={validationProgress
                ? `${rowCountFormat.format(validationProgress.reviewedRows)} ${validationProgress.reviewedRows === 1 ? 'registro revisado' : 'registros revisados'}`
                : 'Preparando la hoja GRADUADOS.'}
              percentage={validationProgress
                ? Math.floor((validationProgress.scannedRows / validationProgress.totalSheetRows) * 100)
                : undefined}
            />
          )}
          {isImporting && (
            <GraduateUploadProgress
              title="Creando graduados"
              detail={`${rowCountFormat.format(importProgress.processed)} de ${rowCountFormat.format(importProgress.total)} registros procesados`}
              percentage={Math.floor((importProgress.processed / importProgress.total) * 100)}
            />
          )}
          <DialogFooter>
            <button
              type="button"
              onClick={isParsing ? handleCancelValidation : () => handleOpenChange(false)}
              disabled={isImporting || isExporting}
              className={`${styles.secondaryAction} rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
            >
              {isParsing ? 'Cancelar validación' : 'Cerrar'}
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!readyToImport}
              className={`${styles.primaryAction} inline-flex items-center justify-center gap-2 rounded-lg bg-[#003DA5] px-4 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2`}
            >
              <Upload className="h-4 w-4" />
              {isImporting ? 'Importando…' : isParsing ? 'Crear graduados' : `Crear ${validCount} graduados`}
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const GraduateImportPreview = memo(function GraduateImportPreview({
  page,
  totalRows,
  validCount,
  loadingPage,
  isBusy,
  isExporting,
  exportProgress,
  scrollContainerRef,
  onPageChange,
  onExport,
}: Pick<GraduateImportSummary, 'page' | 'totalRows' | 'validCount'> & {
  loadingPage: number | null;
  isBusy: boolean;
  isExporting: boolean;
  exportProgress: GraduateExportProgress | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  onPageChange: (pageNumber: number, filter: GraduatePreviewFilter) => void;
  onExport: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const previousPage = useRef({ number: page.number, filter: page.filter });
  const previewDisabled = isBusy || loadingPage !== null;
  const filterCounts = { all: totalRows, errors: totalRows - validCount, ready: validCount };

  useLayoutEffect(() => {
    if (previousPage.current.number === page.number && previousPage.current.filter === page.filter) return;
    previousPage.current = { number: page.number, filter: page.filter };
    const panel = panelRef.current;
    const container = scrollContainerRef.current;
    if (!panel || !container) return;
    const offset = panel.getBoundingClientRect().top - container.getBoundingClientRect().top;
    if (Math.abs(offset) > 1) {
      container.scrollTo({ top: container.scrollTop + offset, behavior: 'instant' });
    }
  }, [page.number, page.filter, scrollContainerRef]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}>
      <div ref={panelRef} className={`${styles.previewPanel} rounded-lg border`} style={{ borderColor: '#E5E7EB' }}>
        <div className={`${styles.previewHeading} border-b bg-slate-50 px-4 py-3`}>
          <p className="text-sm font-semibold text-slate-900">Previsualización y validaciones</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Revise cada columna antes de crear. Las celdas marcadas en rojo indican exactamente qué dato debe corregirse en el archivo.
          </p>
          <div role="group" aria-label="Filtrar registros por estado" className={styles.previewFilters}>
            {PREVIEW_FILTERS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                data-filter={value}
                aria-pressed={page.filter === value}
                disabled={previewDisabled}
                onClick={() => onPageChange(1, value)}
              >
                {label}
                <span aria-hidden="true">{rowCountFormat.format(filterCounts[value])}</span>
              </button>
            ))}
          </div>
          {page.rows.length > 0 && <GraduatePreviewColumnsNavigation viewportRef={viewportRef} />}
        </div>
        <div
          ref={viewportRef}
          role="region"
          aria-label="Vista previa de graduados"
          aria-busy={loadingPage !== null}
          tabIndex={0}
          className={styles.previewViewport}
        >
          {page.rows.length ? (
            <GraduatePreviewTable rows={page.rows} />
          ) : (
            <p role="status" className={styles.previewEmpty}>
              {page.filter === 'errors'
                ? 'No hay registros con errores.'
                : 'No hay registros listos para crear.'}
            </p>
          )}
        </div>
        {page.totalPages > 1 && (
          <div className={styles.previewFooter}>
            <GraduatePreviewPagination
              page={page}
              loadingPage={loadingPage}
              disabled={previewDisabled}
              onPageChange={(pageNumber) => onPageChange(pageNumber, page.filter)}
            />
          </div>
        )}
      </div>
      <section aria-label="Reporte de validación" className={styles.previewExport}>
        <div className={styles.previewExportInfo}>
          <span className={styles.previewExportIcon}>
            <FileSpreadsheet aria-hidden="true" />
          </span>
          <div>
            <p className={styles.previewExportTitle}>Reporte de validación</p>
            <p role="status" className={styles.previewExportDetail}>
              {isExporting
                ? exportProgress && exportProgress.preparedRows < exportProgress.totalRows
                  ? `${rowCountFormat.format(exportProgress.preparedRows)} de ${rowCountFormat.format(exportProgress.totalRows)} registros preparados`
                  : 'Preparando el archivo XLSX completo…'
                : 'Registros válidos y con errores de todo el archivo.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onExport}
          disabled={isBusy || loadingPage !== null}
          aria-busy={isExporting}
          className={styles.previewExportButton}
        >
          {isExporting
            ? <Loader2 aria-hidden="true" className={styles.progressIcon} />
            : <Download aria-hidden="true" />}
          {isExporting ? 'Generando Excel…' : 'Descargar resultados XLSX'}
        </button>
      </section>
    </motion.div>
  );
});

const GraduatePreviewTable = memo(function GraduatePreviewTable({ rows }: { rows: GraduatePreviewRow[] }) {
  return (
    <table className={`${styles.previewTable} divide-y divide-gray-200 text-xs`}>
      <thead className={styles.previewTableHead}>
        <tr>
          <th scope="col" className="min-w-[4rem] px-2 py-2 text-left text-[11px] font-semibold uppercase text-gray-600">Fila</th>
          <th scope="col" className="min-w-[7.5rem] px-2 py-2 text-left text-[11px] font-semibold uppercase text-gray-600">Estado</th>
          {PREVIEW_COLUMNS.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={`${column.className} px-2 py-2 text-left text-[11px] font-semibold uppercase text-gray-600`}
            >
              {column.label}
            </th>
          ))}
          <th scope="col" className="min-w-[18rem] px-2 py-2 text-left text-[11px] font-semibold uppercase text-gray-600">Observaciones</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 bg-white">
        {rows.map((row) => {
          const rowFieldErrors = getGraduateFieldErrors(row.fieldErrors);
          const hasRowErrors = rowFieldErrors.length > 0;
          return (
            <tr key={row.rowNumber} className={hasRowErrors ? 'bg-red-50/40' : ''}>
              <td className="whitespace-nowrap px-2 py-2 text-gray-700">{row.rowNumber}</td>
              <td className="whitespace-nowrap px-2 py-2">
                {!hasRowErrors ? (
                  <Badge className="border border-green-200 bg-green-50 text-green-700">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Se creará
                  </Badge>
                ) : (
                  <Badge className="border border-red-200 bg-red-50 text-red-700">
                    <XCircle className="mr-1 h-3 w-3" />
                    No se crea
                  </Badge>
                )}
              </td>
              {PREVIEW_COLUMNS.map((column) => {
                const fieldError = row.fieldErrors?.[column.key]?.join(' ');
                const hasError = Boolean(fieldError);
                return (
                  <td
                    key={column.key}
                    className={`${column.className} px-2 py-2 align-top ${
                      hasError ? 'bg-red-50 text-red-800' : 'text-gray-700'
                    }`}
                    title={fieldError || undefined}
                  >
                    <span className="block break-words font-medium">
                      {column.getValue(row) || 'N/A'}
                    </span>
                    {hasError && (
                      <span className="mt-1 block text-[11px] leading-4 text-red-700">
                        {fieldError}
                      </span>
                    )}
                  </td>
                );
              })}
              <td className="min-w-[18rem] px-2 py-2 align-top">
                {!hasRowErrors ? (
                  <span className="text-xs font-medium text-green-700">Fila válida para importación.</span>
                ) : (
                  <div className="flex items-start gap-2 text-xs leading-5 text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <ul className="space-y-1">
                      {rowFieldErrors.map((error, index) => (
                        <li key={`${row.rowNumber}-${error.label}-${index}`}>
                          <strong>{error.label}:</strong> {error.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
});

function GraduatePreviewPagination({
  page,
  loadingPage,
  disabled,
  onPageChange,
}: {
  page: GraduatePreviewPage;
  loadingPage: number | null;
  disabled: boolean;
  onPageChange: (pageNumber: number) => void;
}) {
  const [pageInput, setPageInput] = useState(String(page.number));
  useEffect(() => setPageInput(String(page.number)), [page.number]);

  const requestedPage = Number(pageInput);
  const canJump = Number.isInteger(requestedPage) && requestedPage >= 1 &&
    requestedPage <= page.totalPages && requestedPage !== page.number;

  const handleJump = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (canJump && !disabled) onPageChange(requestedPage);
  };

  return (
    <nav aria-label="Paginación de la vista previa" className={styles.previewPagination}>
      <div>
        <p role="status" className={styles.columnNavigationLabel}>
          {loadingPage !== null
            ? `Cargando página ${rowCountFormat.format(loadingPage)}…`
            : `Registros ${rowCountFormat.format(page.startIndex + 1)} a ${rowCountFormat.format(page.startIndex + page.rows.length)} de ${rowCountFormat.format(page.totalRows)}`}
        </p>
        <p className="mt-1 text-xs text-gray-600">La carga incluye todos los registros válidos del archivo.</p>
      </div>
      <div className={styles.previewPaginationControls}>
        <button
          type="button"
          aria-label="Página anterior"
          onClick={() => onPageChange(page.number - 1)}
          disabled={disabled || page.number === 1}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <form onSubmit={handleJump} className={styles.previewPageForm}>
          <label>
            Página
            <input
              type="number"
              aria-label="Número de página"
              min={1}
              max={page.totalPages}
              step={1}
              inputMode="numeric"
              value={pageInput}
              disabled={disabled}
              onChange={(event) => setPageInput(event.currentTarget.value)}
            />
          </label>
          <span>de {rowCountFormat.format(page.totalPages)}</span>
          <button type="submit" aria-label="Ir a la página" disabled={disabled || !canJump}>
            Ir
          </button>
        </form>
        <button
          type="button"
          aria-label="Página siguiente"
          onClick={() => onPageChange(page.number + 1)}
          disabled={disabled || page.number === page.totalPages}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

function GraduatePreviewColumnsNavigation({
  viewportRef,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
}) {
  const [{ canGoBack, canGoForward }, setNavigation] = useState({
    canGoBack: false,
    canGoForward: false,
  });

  const updatePosition = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const maximum = viewport.scrollWidth - viewport.clientWidth;
    const offset = Math.round(viewport.scrollLeft);
    const canGoBack = maximum > 0 && offset > 0;
    const canGoForward = offset < maximum;
    setNavigation((current) =>
      current.canGoBack === canGoBack && current.canGoForward === canGoForward
        ? current
        : { canGoBack, canGoForward },
    );
  }, [viewportRef]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    updatePosition();
    viewport.addEventListener('scroll', updatePosition, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updatePosition) : null;
    if (observer) {
      observer.observe(viewport);
      if (viewport.firstElementChild) observer.observe(viewport.firstElementChild);
    } else {
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      viewport.removeEventListener('scroll', updatePosition);
      observer?.disconnect();
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition, viewportRef]);

  const scrollColumns = (direction: -1 | 1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const maximum = viewport.scrollWidth - viewport.clientWidth;
    const nextOffset = viewport.scrollLeft + direction * viewport.clientWidth * 0.8;
    viewport.scrollLeft = Math.max(0, Math.min(maximum, nextOffset));
    updatePosition();
  };

  if (!canGoBack && !canGoForward) return null;

  return (
    <div className={styles.columnNavigation}>
      <p className={styles.columnNavigationLabel}>
        Desliza la tabla o usa las flechas para ver más columnas.
      </p>
      <div className={styles.columnNavigationControls} role="group" aria-label="Desplazar columnas">
        <button
          type="button"
          aria-label="Ver columnas anteriores"
          onClick={() => scrollColumns(-1)}
          disabled={!canGoBack}
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Ver más columnas"
          onClick={() => scrollColumns(1)}
          disabled={!canGoForward}
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
