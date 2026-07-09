import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, AlertTriangle, Loader2,
  ArrowLeft, Download, FileSpreadsheet, MapPin, CheckCircle2,
  Search, ChevronRight, ChevronDown, Edit3, RefreshCw, Info, AlertCircle,
  Check, Globe, Building2, ArrowRight, Shield, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { bulkUploadBancoDocentes } from '../../../services/api/ptaApi';
import { downloadBancoDocentesTemplate } from '../../../utils/bancoDocentesExcel';
import * as XLSX from 'xlsx';

interface BancoDocentesBulkUploadProps {
  onBack: () => void;
  onSuccess: () => void;
  periodos?: any[];
  periodoSeleccionado?: string;
  onPeriodoChange?: (periodo: string) => void;
}

type WizardStep = 'upload' | 'validate' | 'importing';

export function BancoDocentesBulkUpload({ onBack, onSuccess, periodos = [], periodoSeleccionado, onPeriodoChange }: BancoDocentesBulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);
  
  const [selectedDtCode, setSelectedDtCode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [showCorrectionPanel, setShowCorrectionPanel] = useState(false);
  const [isErrorPanelExpanded, setIsErrorPanelExpanded] = useState(false);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Derive wizard step ───
  const currentStep: WizardStep = 
    loading ? 'importing' :
    (result && !error) ? 'validate' :
    'upload';

  const steps = [
    { id: 'upload', label: 'Subir archivo', icon: Upload },
    { id: 'validate', label: 'Validar datos', icon: Shield },
    { id: 'importing', label: 'Importar', icon: Sparkles },
  ];

  // ─── Handlers ───
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const analyzeFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        workbookRef.current = XLSX.read(data, { type: 'array' });
      } catch (e) { console.warn('No se pudo parsear el workbook:', e); }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
        setFile(f); analyzeFile(f); handleImportar(true, f);
      } else { toast.error('Archivo no soportado. Use .xlsx, .xls o .csv'); }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setFile(f); analyzeFile(f); handleImportar(true, f);
    }
  };

  const handleDownloadTemplate = () => {
    downloadBancoDocentesTemplate();
  };

  const handleImportar = async (dryRun = true, fileToImport?: File, skipInvalid = false) => {
    const currentFile = fileToImport || file;
    if (!currentFile) return;
    
    setLoading(true); setError(null); setValidationErrors([]);
    if (!dryRun) setResult(null);

    try {
      const response = await bulkUploadBancoDocentes(currentFile, dryRun, skipInvalid, periodoSeleccionado);
      
      if (response.success === false) {
        throw new Error(response.error || response.message || 'Error al validar el archivo');
      }
      
      const stats = response.data || {};
      
      setResult({
        success: stats.errors === 0,
        has_blocking_errors: stats.errors > 0,
        errores: stats.errorDetails || [],
        data: stats,
      });

      setIsSimulated(dryRun);
      if (!dryRun) {
        const omitidos = stats.errors || 0;
        toast.success(omitidos > 0 ? `Importación parcial: ${omitidos} fila(s) omitidas por error.` : 'Datos de docentes cargados exitosamente');
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Error al procesar el archivo.';
      setError(msg);
      if (err.response?.data?.errores) setValidationErrors(err.response.data.errores);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  const resetState = () => {
    setFile(null); setResult(null); setError(null); setValidationErrors([]);
    setIsSimulated(false); setSelectedDtCode(null); setSearchTerm('');
    setCorrections({}); setShowCorrectionPanel(false); workbookRef.current = null;
  };

  const handleCorrectionChange = useCallback((key: string, value: string) => {
    setCorrections(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleRevalidateWithCorrections = useCallback(async () => {
    const wb = workbookRef.current;
    if (!wb) { toast.error('No se pudo acceder al archivo original.'); return; }
    const wbData = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const newWb = XLSX.read(wbData, { type: 'array' });

    for (const [key, newValue] of Object.entries(corrections)) {
      if (!newValue && newValue !== '0') continue;
      const [sheetName, rowStr, colName] = key.split('::');
      const rowNum = parseInt(rowStr, 10);
      const ws = newWb.Sheets[sheetName] || newWb.Sheets[newWb.SheetNames[0]];
      if (!ws) continue;
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      let colIdx = -1;
      const maxHeaderRow = Math.min(range.e.r, range.s.r + 10);
      for (let r = range.s.r; r <= maxHeaderRow && colIdx === -1; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[cellAddr];
          if (cell && String(cell.v).toLowerCase().trim() === colName.toLowerCase().trim()) { colIdx = c; break; }
        }
      }
      if (colIdx === -1) continue;
      const cellAddr = XLSX.utils.encode_cell({ r: Math.max(rowNum - 1, 0), c: colIdx });
      if (!ws[cellAddr]) ws[cellAddr] = { t: 's', v: newValue };
      else { ws[cellAddr].v = newValue; ws[cellAddr].t = 's'; }
    }

    const correctedData = XLSX.write(newWb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([correctedData], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const correctedFile = new File([blob], file?.name || 'estructura_corregida.xlsx', { type: blob.type });
    workbookRef.current = newWb; setFile(correctedFile);
    setCorrections({}); setShowCorrectionPanel(false);
    toast.info('Correcciones aplicadas. Re-validando...');
    await handleImportar(true, correctedFile);
  }, [corrections, file]);

  // ─── Computed ───
  const totalDts = 0; // Not used anymore
  const totalCetaps = result?.data?.total || 0;
  const newDts = 0; // Not used
  const updatedDts = 0; // Not used
  const newCetaps = result?.data?.created || 0;
  const updatedCetaps = result?.data?.updated || 0;
  const identicalDts = 0; // Not used
  const identicalCetaps = result?.data?.unchanged || 0;

  const isAllIdentical = totalCetaps > 0 && identicalCetaps === totalCetaps && newCetaps === 0 && updatedCetaps === 0;
  const allDuplicates = totalCetaps > 0 && identicalCetaps === totalCetaps && newCetaps === 0 && updatedCetaps === 0;

  const hasValidToImport = (totalCetaps > 0) && (newCetaps > 0 || updatedCetaps > 0);
  const resultErrors = Array.isArray(result?.errores) ? result.errores : [];
  const duplicateDocumentErrors = resultErrors.filter((err: any) =>
    err && typeof err === 'object' && (err.tipo === 'DUPLICADO_DOCUMENTO' || err.duplicado === true || err.columna === 'DOCUMENTO_IDENTIDAD' && /duplicad|ya existe/i.test(String(err.mensaje || err.message || '')))
  );
  const duplicateDocumentSummaries = Array.from(
    duplicateDocumentErrors.reduce((acc: Map<string, any>, err: any) => {
      const documentNumber = String(err.documentoIdentidad || err.datoErrado || err.documentNumber || 'Sin documento');
      const current = acc.get(documentNumber) || { documentNumber, filas: new Set<number>(), mensajes: [] as string[] };
      const fila = Number(err.fila || err.row);
      if (fila) current.filas.add(fila);
      for (const filaDuplicada of err.filasDuplicadas || []) current.filas.add(Number(filaDuplicada));
      const message = String(err.mensaje || err.message || 'Documento duplicado.');
      if (!current.mensajes.includes(message)) current.mensajes.push(message);
      acc.set(documentNumber, current);
      return acc;
    }, new Map<string, any>()).values()
  ).map((item: any) => ({
    ...item,
    filas: Array.from(item.filas).filter(Boolean).sort((a: any, b: any) => Number(a) - Number(b)),
  }));
  const hasDocumentDuplicateErrors = duplicateDocumentErrors.length > 0;

  // Vista previa de docentes válidos ("correctos") que devuelve el backend en la validación.
  // El backend ya entrega result.data.results con cada registro procesado correctamente.
  const previewValidos = Array.isArray(result?.data?.results) ? result.data.results : [];

  // ═══════════════════════════════ RENDER ═══════════════════════════════
  return (
    <div className="space-y-0">
      {/* ══════ WIZARD HEADER ══════ */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-5 overflow-hidden">
        {/* Title bar */}
        <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-50">
          <button
            onClick={onBack}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Carga Masiva: Banco de Docentes</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Importación de docentes al Banco Institucional</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-5 overflow-hidden">
        {/* Stepper */}
        <div className="px-6 py-3 bg-gray-50/50 flex items-center justify-center gap-0">
          {steps.map((step, idx) => {
            const stepOrder = ['upload', 'validate', 'importing'];
            const currentIdx = stepOrder.indexOf(currentStep);
            const stepIdx = idx;
            const isActive = currentStep === step.id;
            const isComplete = stepIdx < currentIdx;
            const isFuture = stepIdx > currentIdx;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <div className={`w-12 h-px mx-1 transition-all duration-500 ${isComplete ? 'bg-emerald-400' : 'bg-gray-200'}`} />
                )}
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
                  isActive ? 'bg-[#003DA5]/10' : ''
                }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isComplete ? 'bg-emerald-500 text-white' :
                    isActive ? 'bg-[#003DA5] text-white shadow-md shadow-[#003DA5]/20' :
                    'bg-gray-200 text-gray-400'
                  }`}>
                    {isComplete ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className={`text-xs font-semibold transition-colors hidden sm:inline ${
                    isActive ? 'text-[#003DA5]' :
                    isComplete ? 'text-emerald-600' :
                    'text-gray-400'
                  }`}>{step.label}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ══════ STEP CONTENT ══════ */}
      <AnimatePresence mode="wait">

        {/* ━━━━━ STEP 1: UPLOAD ━━━━━ */}
        {currentStep === 'upload' && !error && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {/* Left: Drop Zone & Form */}
                <div className="p-8 flex flex-col items-center justify-center border-r border-gray-50">
                  
                  
                  <div
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full max-w-sm border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 group ${
                      dragActive
                        ? 'border-[#003DA5] bg-blue-50/60 scale-[0.98]'
                        : file
                        ? 'border-emerald-300 bg-emerald-50/30'
                        : 'border-gray-200 hover:border-[#003DA5]/40 hover:bg-gray-50/50'
                    }`}
                  >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls,.csv" className="hidden" />
                    {file ? (
                      <>
                        <div className="w-14 h-14 mx-auto mb-3 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-200/60">
                          <FileSpreadsheet className="w-7 h-7" />
                        </div>
                        <p className="font-semibold text-gray-900 text-sm truncate max-w-[200px] mx-auto">{file.name}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); resetState(); }}
                          className="mt-3 text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium"
                        >
                          Cambiar archivo
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 mx-auto mb-3 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center border border-gray-200/60 group-hover:text-[#003DA5] group-hover:bg-blue-50 group-hover:border-[#003DA5]/20 transition-all">
                          <Upload className="w-7 h-7" />
                        </div>
                        <p className="font-semibold text-gray-700 text-sm">Arrastra tu archivo aquí</p>
                        <p className="text-[11px] text-gray-400 mt-1">o haz clic para seleccionar</p>
                        <p className="text-[10px] text-gray-300 mt-2">.xlsx · .xls · .csv</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Right: Instructions + Template */}
                <div className="p-8 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                      <Info className="w-3.5 h-3.5" />
                      Instrucciones
                    </h3>
                    <div className="space-y-4">
                      {[
                        { n: '1', t: 'Descargue la plantilla Excel', s: 'Contiene el formato requerido con las dos hojas: Banco de Docentes.' },
                        { n: '2', t: 'Complete los datos', s: 'Llene las hojas con los códigos, nombres y estados de cada docente y sede.' },
                        { n: '3', t: 'Suba el archivo', s: 'Arrastre o seleccione — se valida automáticamente con las reglas G1-G7.' },
                        { n: '4', t: 'Confirme la importación', s: 'Revise el preview y confirme. Puede corregir errores directamente.' },
                      ].map(({ n, t, s }) => (
                        <div key={n} className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-lg bg-[#003DA5]/8 text-[#003DA5] flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">{n}</span>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{t}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{s}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="mt-6 flex items-center justify-center gap-2 px-5 py-3 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-xl text-xs font-bold transition-all shadow-sm w-full"
                  >
                    <Download className="w-4 h-4" />
                    Descargar Plantilla Excel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ━━━━━ STEP 1b: Error state ━━━━━ */}
        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-red-100 bg-red-50/30 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-sm">Error de validación</h4>
                  <p className="text-[11px] text-gray-500">Corrija los errores e intente nuevamente</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={resetState} className="px-3 py-1.5 text-[11px] font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all">
                    Cargar otro
                  </button>
                  <button onClick={onBack} className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                    Volver
                  </button>
                </div>
              </div>
              {validationErrors.length > 0 ? (
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setIsErrorPanelExpanded(!isErrorPanelExpanded)}
                    className="w-full px-6 py-3 flex items-center justify-between text-xs font-semibold text-gray-700 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      Ver errores detallados ({validationErrors.length})
                    </span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isErrorPanelExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isErrorPanelExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="overflow-x-auto max-h-60 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                              <tr>
                                <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Ubicación</th>
                                <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Campo</th>
                                <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Actual</th>
                                <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Esperado</th>
                                <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Detalle</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {validationErrors.map((err, idx) =>
                                typeof err === 'string' ? (
                                  <tr key={idx}><td colSpan={5} className="px-4 py-2 text-red-700">{err}</td></tr>
                                ) : (
                                  <tr key={idx} className="hover:bg-red-50/30">
                                    <td className="px-4 py-2 text-[10px] font-mono text-gray-400">{err.hoja || 'Archivo'}{err.fila ? ` · F${err.fila}` : ''}</td>
                                    <td className="px-4 py-2 font-mono text-gray-600">{err.columna || '-'}</td>
                                    <td className="px-4 py-2">{err.datoErrado ? <span className="text-red-500 line-through font-medium">{err.datoErrado}</span> : <span className="text-gray-300">—</span>}</td>
                                    <td className="px-4 py-2">{err.valorEsperado ? <span className="text-emerald-600 font-medium">{err.valorEsperado}</span> : <span className="text-gray-300">—</span>}</td>
                                    <td className="px-4 py-2 text-gray-500 max-w-[180px] whitespace-normal">{err.mensaje}</td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="p-6 text-xs text-red-800 font-mono bg-red-50/30">{error}</div>
              )}
            </div>
          </motion.div>
        )}

        {/* ━━━━━ STEP 2: VALIDATE & PREVIEW ━━━━━ */}
        {currentStep === 'validate' && (
          <motion.div
            key="validate"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className=""
          >
            {/* Status + Action Bar */}
            {/* La tarjeta se ajusta a su contenido; las tablas internas (vista previa y
                errores) tienen su propio scroll acotado, así no queda espacio en blanco. */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
              {/* Status banner */}
              {isAllIdentical ? (
                <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap bg-blue-50/40 border-b border-blue-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Info className="w-5 h-5 text-[#003DA5]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Datos ya cargados — Todos los registros están duplicados</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Los {totalDts} registros de Direcciones Docentes y {totalCetaps} Docentes del archivo ya existen en la plataforma con información idéntica. No hay datos nuevos ni actualizaciones por procesar.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={resetState} className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                      Cambiar archivo
                    </button>
                    <button
                      disabled
                      className="px-5 py-2.5 text-xs font-bold text-white bg-gray-300 rounded-xl cursor-not-allowed flex items-center gap-2"
                      title="No hay datos nuevos para importar"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Importar ahora
                    </button>
                  </div>
                </div>
              ) : result.success && (!result.errores || result.errores.length === 0) ? (
                <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap bg-emerald-50/30 border-b border-emerald-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">
                        {allDuplicates ? 'Datos ya existentes' : 'Validación exitosa'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {allDuplicates
                          ? `${identicalCetaps} registros ya existen — sin cambios`
                          : `${newCetaps} nuevos + ${updatedCetaps} actualizados + ${identicalCetaps} sin cambios`
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={resetState} className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                      Cambiar archivo
                    </button>
                    <button
                      onClick={() => handleImportar(false)}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Importar ahora
                    </button>
                  </div>
                </div>
              ) : result.errores && result.errores.length > 0 && !result.has_blocking_errors ? (
                <div className="px-6 py-4 bg-amber-50/30 border-b border-amber-100 space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Validación parcial</h3>
                        <p className="text-[11px] text-gray-500">{result.errores.length} error(es) encontrados</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={resetState} className="px-3 py-1.5 text-[11px] font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                        Reintentar
                      </button>
                      <button
                        onClick={() => handleImportar(false, undefined, true)}
                        disabled={!hasValidToImport}
                        className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-all shadow-sm ${
                          hasValidToImport ? 'bg-amber-500 hover:bg-amber-600' : 'bg-gray-300 cursor-not-allowed'
                        }`}
                      >
                        Importar válidos ({newCetaps + updatedCetaps})
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                      <Check className="w-3 h-3" /> {newCetaps + updatedCetaps} docentes válidos
                    </span>
                    {(result?.data?.errors || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-semibold border border-red-100">
                        {result.data.errors} docentes con error
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col border-b border-red-100">
                  <div className="px-6 py-4 bg-red-50/30 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">
                          {hasDocumentDuplicateErrors ? 'Documentos duplicados detectados' : 'Errores bloqueantes'}
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          {hasDocumentDuplicateErrors
                            ? 'No se importará ningún registro mientras existan documentos repetidos o ya registrados.'
                            : 'No es posible importar. Corrija los datos en el archivo.'}
                        </p>
                      </div>
                    </div>
                    <button onClick={resetState} className="px-3 py-1.5 text-[11px] font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all">
                      Cargar otro
                    </button>
                  </div>

                  {hasDocumentDuplicateErrors && (
                    <div className="px-6 py-4 bg-red-50/40 border-t border-red-100/60">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4 text-red-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-red-900">Validación de unicidad por documento</h4>
                          <p className="text-[11px] text-red-700 mt-0.5">
                            Cada docente debe tener un único número de documento. El archivo queda bloqueado hasta corregir estos registros.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 mt-3">
                            {duplicateDocumentSummaries.slice(0, 6).map((item: any) => (
                              <div key={item.documentNumber} className="rounded-lg border border-red-100 bg-white px-3 py-2 shadow-sm">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-500">Documento</span>
                                  <span className="text-[10px] font-mono text-gray-400">
                                    {item.filas.length ? `Fila ${item.filas.join(', ')}` : 'Archivo'}
                                  </span>
                                </div>
                                <p className="text-sm font-black text-gray-900 mt-1 truncate">{item.documentNumber}</p>
                                <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{item.mensajes[0]}</p>
                              </div>
                            ))}
                          </div>
                          {duplicateDocumentSummaries.length > 6 && (
                            <p className="text-[11px] text-red-700 mt-2 font-medium">
                              + {duplicateDocumentSummaries.length - 6} documento(s) duplicado(s) adicional(es). Revise la tabla de errores.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {result?.errores && result.errores.length > 0 ? (
                    <div className="border-t border-red-100/50">
                      <button
                        onClick={() => setIsErrorPanelExpanded(!isErrorPanelExpanded)}
                        className="w-full px-6 py-3 flex items-center justify-between text-xs font-semibold text-red-700 bg-red-50/10 hover:bg-red-50/50 transition-colors"
                      >
                        <span className="flex items-center gap-2">
                          Ver errores detallados ({result.errores.length})
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isErrorPanelExpanded ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isErrorPanelExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="overflow-x-auto max-h-[50vh] min-h-[300px] overflow-y-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-red-50/50 sticky top-0 z-10 border-b border-red-100/50">
                                  <tr>
                                    <th className="px-6 py-2.5 font-semibold text-red-700 uppercase text-[10px] tracking-wider">Ubicación</th>
                                    <th className="px-6 py-2.5 font-semibold text-red-700 uppercase text-[10px] tracking-wider">Campo</th>
                                    <th className="px-6 py-2.5 font-semibold text-red-700 uppercase text-[10px] tracking-wider">Detalle del Error</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                  {result.errores.map((err: any, idx: number) => {
                                    const fila = err.fila || err.row;
                                    const mensaje = err.mensaje || err.message;
                                    
                                    return typeof err === 'string' ? (
                                      <tr key={idx}><td colSpan={3} className="px-6 py-3 text-gray-700">{err}</td></tr>
                                    ) : (
                                      <tr key={idx} className="hover:bg-red-50/20">
                                        <td className="px-6 py-3 text-[10px] font-mono text-gray-400">{err.hoja || 'Archivo'}{fila ? ` · F${fila}` : ''}</td>
                                        <td className="px-6 py-3 font-mono text-gray-600">{err.columna || '-'}</td>
                                        <td className="px-6 py-3 text-gray-600">{mensaje}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : error ? (
                    <div className="p-6 text-xs text-red-800 font-mono bg-red-50/30 border-t border-red-100/50">
                      {error}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Duplicate warning banner */}
              {allDuplicates && (
                <div className="px-6 py-3 bg-amber-50/30 border-b border-amber-100 flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-[11px] text-amber-700 font-medium">
                    <strong>Todos los registros ya existen en la base de datos.</strong> Si importa, se actualizarán los datos existentes con los valores del archivo. No se crearán duplicados.
                  </p>
                </div>
              )}

              {/* Metrics row inside the card */}
              <div className="px-8 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 border-b border-gray-100">
                {[
                  { label: 'Total Registros', value: totalCetaps, icon: Building2, color: 'text-[#003DA5]', bg: 'bg-blue-50' },
                  { label: 'Nuevos', value: newCetaps, icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Actualizados', value: updatedCetaps, icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Sin Cambios', value: identicalCetaps, icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-100' },
                  { label: 'Errores', value: result?.data?.errors || 0, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div>
                      <span className="text-xl font-bold text-gray-900 leading-none">{value}</span>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista previa de docentes válidos ("correctos") */}
              {previewValidos.length > 0 && (
                <div className="border-b border-gray-50 flex flex-col min-h-0">
                  <div className="px-6 py-2.5 flex items-center justify-between bg-emerald-50/30">
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {previewValidos.length} docente(s) válido(s) — vista previa
                    </span>
                  </div>
                  <div className="overflow-x-auto overflow-y-auto max-h-[55vh] min-h-[200px]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-100">
                        <tr>
                          <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Fila</th>
                          <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Nombre</th>
                          <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Documento</th>
                          <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {previewValidos.map((r: any, idx: number) => {
                          const estado = r.action === 'insert'
                            ? { label: 'Nuevo', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' }
                            : r.action === 'update'
                            ? { label: 'Actualizado', cls: 'bg-blue-50 text-blue-700 border-blue-100' }
                            : { label: 'Sin cambios', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
                          return (
                            <tr key={idx} className="hover:bg-emerald-50/20">
                              <td className="px-4 py-2 text-[10px] font-mono text-gray-400">{r.sourceRowNumber ? `F${r.sourceRowNumber}` : idx + 1}</td>
                              <td className="px-4 py-2 text-gray-700 font-medium">{r.fullName || '—'}</td>
                              <td className="px-4 py-2 font-mono text-gray-600">{r.documentNumber || '—'}</td>
                              <td className="px-4 py-2">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${estado.cls}`}>{estado.label}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Error correction panel (inside the card, collapsed by default) */}
              {result.errores && result.errores.length > 0 && (
                <div className="border-b border-gray-50">
                  <div className="px-6 py-2.5 flex items-center justify-between bg-gray-50/30">
                    <span className="text-[11px] font-semibold text-gray-500 flex items-center gap-1.5">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      {result.errores.length} error(es) de calidad
                    </span>
                    {result.errores.some((e: any) => e.fila) && workbookRef.current && (
                      <button
                        onClick={() => setShowCorrectionPanel(!showCorrectionPanel)}
                        className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                          showCorrectionPanel ? 'bg-gray-200 text-gray-600' : 'bg-[#003DA5] text-white hover:bg-[#002d7a]'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        {showCorrectionPanel ? 'Ver errores' : 'Corregir inline'}
                      </button>
                    )}
                  </div>

                  {!showCorrectionPanel && (
                    <div className="overflow-x-auto max-h-[50vh] min-h-[300px] overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50/80 sticky top-0 z-10 border-b border-gray-100">
                          <tr>
                            <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Ubicación</th>
                            <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Campo</th>
                            <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Actual</th>
                            <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Esperado</th>
                            <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Error</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {result.errores.map((err: any, idx: number) => {
                            const fila = err.fila || err.row;
                            const mensaje = err.mensaje || err.message;
                            
                            return typeof err === 'string' ? (
                              <tr key={idx}><td colSpan={5} className="px-4 py-2 text-gray-700">{err}</td></tr>
                            ) : (
                              <tr key={idx} className="hover:bg-amber-50/30">
                                <td className="px-4 py-2 text-[10px] font-mono text-gray-400">{err.hoja || 'Archivo'}{fila ? ` · F${fila}` : ''}</td>
                                <td className="px-4 py-2 font-mono text-gray-600">{err.columna || '-'}</td>
                                <td className="px-4 py-2">{err.datoErrado ? <span className="text-red-500 line-through font-medium">{err.datoErrado}</span> : <span className="text-gray-300">—</span>}</td>
                                <td className="px-4 py-2">{err.valorEsperado ? <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {err.valorEsperado}</span> : <span className="text-gray-300">—</span>}</td>
                                <td className="px-4 py-2 text-gray-500 max-w-[160px] whitespace-normal">{mensaje}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {showCorrectionPanel && (
                    <div className="p-4 space-y-3">
                      <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 text-[#003DA5] shrink-0 mt-0.5" />
                        <p className="text-[10px] text-gray-600">Corrija los valores y haga clic en <strong className="text-[#003DA5]">Re-validar</strong>.</p>
                      </div>
                      <div className="overflow-x-auto border border-gray-100 rounded-lg max-h-[50vh] min-h-[300px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50/80 border-b border-gray-100 sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 font-semibold text-gray-400 uppercase text-[10px]">Hoja</th>
                              <th className="px-3 py-2 font-semibold text-gray-400 uppercase text-[10px]">Fila</th>
                              <th className="px-3 py-2 font-semibold text-gray-400 uppercase text-[10px]">Campo</th>
                              <th className="px-3 py-2 font-semibold text-red-400 uppercase text-[10px]">Actual</th>
                              <th className="px-3 py-2 font-semibold text-emerald-500 uppercase text-[10px]">Corrección</th>
                              <th className="px-3 py-2 font-semibold text-gray-400 uppercase text-[10px]">Error</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {result.errores.filter((e: any) => (e.fila || e.row)).map((err: any, idx: number) => {
                              const fila = err.fila || err.row;
                              const mensaje = err.mensaje || err.message;
                              const corrKey = `${err.hoja || 'Archivo'}::${fila}::${err.columna || '-'}`;
                              const hasCorrected = corrections[corrKey] !== undefined && corrections[corrKey] !== '';
                              return (
                                <tr key={idx} className={hasCorrected ? 'bg-emerald-50/30' : 'bg-red-50/20'}>
                                  <td className="px-3 py-2 text-[10px] font-mono text-gray-400">{err.hoja || 'Archivo'}</td>
                                  <td className="px-3 py-2 font-mono text-gray-500">{fila}</td>
                                  <td className="px-3 py-2 font-mono text-gray-600 font-medium">{err.columna || '-'}</td>
                                  <td className="px-3 py-2"><span className="text-red-500 font-medium line-through text-[11px]">{err.datoErrado || '(vacío)'}</span></td>
                                  <td className="px-3 py-2">
                                    <input type="text" placeholder={err.valorEsperado || 'Nuevo valor...'} value={corrections[corrKey] || ''}
                                      onChange={(e) => handleCorrectionChange(corrKey, e.target.value)}
                                      className={`w-full px-2 py-1 border rounded text-xs font-medium transition-all focus:outline-none focus:ring-1 ${
                                        hasCorrected ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-200' : 'border-gray-200 bg-white text-gray-700 focus:ring-[#003DA5]/20'
                                      }`}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-[10px] text-gray-400 max-w-[140px] whitespace-normal">{mensaje}</td>
                                </tr>
                              );
                            })}
                            {result.errores.filter((e: any) => !e.fila || !e.columna).map((err: any, idx: number) => (
                              <tr key={`g-${idx}`} className="bg-yellow-50/20">
                                <td colSpan={3} className="px-3 py-2 text-[10px] text-gray-400">{err.hoja || 'Global'}</td>
                                <td colSpan={3} className="px-3 py-2 text-[10px] text-amber-600">⚠️ {err.mensaje}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-gray-400">{Object.values(corrections).filter(v => v !== '').length} / {result.errores.filter((e: any) => e.fila && e.columna).length} corregido(s)</span>
                        <div className="flex gap-2">
                          <button onClick={() => { setCorrections({}); setShowCorrectionPanel(false); }} className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">Cancelar</button>
                          <button onClick={handleRevalidateWithCorrections}
                            disabled={Object.values(corrections).filter(v => v !== '').length === 0}
                            className={`px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1 ${Object.values(corrections).filter(v => v !== '').length > 0 ? 'bg-[#003DA5] text-white hover:bg-[#002d7a]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                            <RefreshCw className="w-3 h-3" /> Re-validar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ━━━━━ STEP 3: IMPORTING ━━━━━ */}
        {currentStep === 'importing' && (
          <motion.div
            key="importing"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col items-center justify-center py-20 gap-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-gray-100" />
                <Loader2 className="w-16 h-16 animate-spin text-[#003DA5] absolute inset-0" style={{ strokeWidth: 1.5 }} />
              </div>
              <div className="text-center">
                <h3 className="font-bold text-gray-900 text-sm">
                  {isSimulated ? 'Validando estructura...' : 'Procesando importación...'}
                </h3>
                <p className="text-[11px] text-gray-400 mt-1">
                  {isSimulated ? 'Ejecutando reglas de validación G1-G7' : 'Sincronizando en base de datos'}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
