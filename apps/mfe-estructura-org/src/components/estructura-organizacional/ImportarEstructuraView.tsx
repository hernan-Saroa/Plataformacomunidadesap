import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, AlertTriangle, Loader2,
  ArrowLeft, Download, FileSpreadsheet, MapPin, CheckCircle2,
  Search, ChevronRight, Edit3, RefreshCw, Info, AlertCircle,
  Check, Globe, Building2, ArrowRight, Shield, Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { estructuraService } from '../../services/estructuraService';
import * as XLSX from 'xlsx';

interface ImportarEstructuraViewProps {
  onBack: () => void;
  onSuccess: () => void;
  periodos?: any[];
  periodoSeleccionado?: string;
  onPeriodoChange?: (periodo: string) => void;
}

type WizardStep = 'upload' | 'validate' | 'importing' | 'done';

export function ImportarEstructuraView({ onBack, onSuccess, periodos = [], periodoSeleccionado, onPeriodoChange }: ImportarEstructuraViewProps) {
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
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Derive wizard step ───
  // 'done' = importación REAL ya ejecutada (result presente y NO simulado).
  const currentStep: WizardStep =
    loading ? 'importing' :
    (result && !isSimulated && !error) ? 'done' :
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
      if (['xlsx', 'xls'].includes(ext || '')) {
        setFile(f); analyzeFile(f); handleImportar(true, f);
      } else { toast.error('Archivo no soportado. Use .xlsx o .xls'); }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (!['xlsx', 'xls'].includes(ext || '')) {
        toast.error('Archivo no soportado. Use .xlsx o .xls');
        e.target.value = '';
        return;
      }
      setFile(f); analyzeFile(f); handleImportar(true, f);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await estructuraService.descargarPlantillaEstructura();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Plantilla_Estructura_Geografica_ESAP.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Plantilla institucional descargada', {
        description: 'Incluye 17 territoriales y 290 CETAP.',
      });
    } catch (downloadError) {
      console.error('No se pudo descargar la plantilla institucional:', downloadError);
      toast.error('No se pudo descargar la plantilla institucional', {
        description: 'Verifique que el servicio de autenticación esté disponible e inténtelo nuevamente.',
      });
    }
  };

  const handleImportar = async (dryRun = true, fileToImport?: File, skipInvalid = false) => {
    const currentFile = fileToImport || file;
    if (!currentFile) return;
    // El periodo NO es requerido en la carga masiva: alimenta el catálogo maestro
    // y los CETAP quedan disponibles en todos los periodos. La activación por
    // periodo se gestiona aparte en "Activación por Periodo".
    setLoading(true); setError(null); setValidationErrors([]);
    if (!dryRun) setResult(null);

    try {
      const res = await estructuraService.importarEstructura(currentFile, dryRun, skipInvalid, periodoSeleccionado);
      setResult(res.data || res);
      setIsSimulated(dryRun);
      if (!dryRun) {
        const data = res.data || res;
        const r = data?.resumen || {};
        const nuevos = r.nuevos?.length || 0;
        const actualizados = r.actualizados?.length || 0;
        const yaExistian = (r.identicos || 0) + (r.ya_existentes_otro_codigo?.length || 0);
        toast.success(`Importación completada: ${nuevos} nueva(s), ${actualizados} actualizada(s), ${yaExistian} ya existían.`);
        // NO navegamos aquí: se muestra el paso 'done' con el resumen detallado.
        // La navegación + refresco ocurre al pulsar "Finalizar" (onSuccess).
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
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      const ws = newWb.Sheets[sheetName];
      if (!ws) continue;
      const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
      let colIdx = -1;
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r: range.s.r, c });
        const cell = ws[cellAddr];
        if (cell && String(cell.v).toLowerCase().trim() === colName.toLowerCase().trim()) { colIdx = c; break; }
      }
      if (colIdx === -1) continue;
      const cellAddr = XLSX.utils.encode_cell({ r: rowNum, c: colIdx });
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
  const filteredTerritoriales = (result?.preview_territoriales || []).filter((dt: any) =>
    dt.nombre_dt.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dt.codigo_dt.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const activeTerritorial = selectedDtCode
    ? result?.preview_territoriales?.find((dt: any) => dt.codigo_dt === selectedDtCode)
    : null;
  const visibleCetaps = selectedDtCode
    ? (result?.preview_cetaps || []).filter((c: any) => c.codigo_dt === selectedDtCode)
    : (result?.preview_cetaps || []);
  const countActiveCetaps = visibleCetaps.filter((c: any) => c.activo).length;
  const countInactiveCetaps = visibleCetaps.length - countActiveCetaps;
  const totalDts = result?.preview_territoriales?.length || result?.analisis_duplicados?.territoriales?.identicos || 0;
  const totalCetaps = result?.preview_cetaps?.length || result?.analisis_duplicados?.cetaps?.identicos || 0;
  const newDts = result?.carga?.direcciones_territoriales?.creados || 0;
  const updatedDts = result?.carga?.direcciones_territoriales?.actualizados || 0;
  const newCetaps = result?.carga?.cetaps?.creados || 0;
  const updatedCetaps = result?.carga?.cetaps?.actualizados || 0;
  const isAllIdentical = result?.blocked_reason === 'ALL_IDENTICAL';
  const identicalDts = result?.analisis_duplicados?.territoriales?.identicos || (isAllIdentical ? totalDts : 0);
  const identicalCetaps = result?.analisis_duplicados?.cetaps?.identicos || (isAllIdentical ? totalCetaps : 0);
  const allDuplicates = newDts === 0 && newCetaps === 0 && (updatedDts > 0 || updatedCetaps > 0);
  // Conteos por estado desde el preview COMPLETO (suman exactamente totalCetaps).
  const cetapsPreview: any[] = result?.preview_cetaps || [];
  const countByEstado = (e: string) => cetapsPreview.filter((c: any) => c._estado_import === e).length;
  const sedesNuevas = countByEstado('nuevo');
  const sedesActualizar = countByEstado('actualizar');
  const sedesYaExisten = countByEstado('identico') + countByEstado('ya_existe_otro_codigo');
  const sedesError = countByEstado('error');
  const estadoImportInfo = (e: string): { label: string; cls: string; dot: string } => {
    switch (e) {
      case 'nuevo': return { label: 'Nueva', cls: 'text-emerald-700 bg-emerald-50', dot: 'bg-emerald-500' };
      case 'actualizar': return { label: 'Se actualiza', cls: 'text-[#003DA5] bg-blue-50', dot: 'bg-[#003DA5]' };
      case 'ya_existe_otro_codigo': return { label: 'Ya existe (otro código)', cls: 'text-amber-700 bg-amber-50', dot: 'bg-amber-500' };
      case 'error': return { label: 'Error', cls: 'text-red-600 bg-red-50', dot: 'bg-red-500' };
      default: return { label: 'Ya existe', cls: 'text-gray-500 bg-gray-100', dot: 'bg-gray-400' };
    }
  };
  const legacySync = result?.sincronizacion_legacy;
  const legacyUpdates =
    (legacySync?.seccionales?.actualizadas || 0) +
    (legacySync?.sedes?.actualizadas || 0);
  const legacyCreates =
    (legacySync?.seccionales?.creadas || 0) +
    (legacySync?.sedes?.creadas || 0);

  // ─── Resumen post-importación (paso 'done') ───
  const resumen = result?.resumen || {};
  const doneNuevosList: any[] = resumen.nuevos || [];
  const doneActualizadosList: any[] = resumen.actualizados || [];
  // "Ya existían bajo otro código": mismo nombre+territorial pero código distinto.
  // NO es un error: se conserva el existente. Se cuentan como "ya existían".
  const doneYaExistenOtroCodigoList: any[] = resumen.ya_existentes_otro_codigo || [];
  const doneIdenticos = resumen.identicos || 0;
  const doneYaExistian = doneIdenticos + doneYaExistenOtroCodigoList.length;
  const doneConError = resumen.con_error || 0;
  const doneYaExistenMsgs: string[] = (result?.advertencias || [])
    .filter((a: any) => a && a.hoja === 'YA_EXISTE_OTRO_CODIGO')
    .map((a: any) => a.mensaje);

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
            <h1 className="text-base font-bold text-gray-900 tracking-tight">Importar Estructura Geográfica</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Territoriales y CETAPs · Carga masiva desde archivo Excel</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-5 overflow-hidden">
        {/* Stepper */}
        <div className="px-6 py-3 bg-gray-50/50 flex items-center justify-center gap-0">
          {steps.map((step, idx) => {
            const stepOrder = ['upload', 'validate', 'importing'];
            // 'done' se ubica más allá del último paso → todos aparecen completos.
            const currentIdx = currentStep === 'done' ? stepOrder.length : stepOrder.indexOf(currentStep);
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
                  {/* El periodo académico se removió de la carga masiva: alimenta
                      el catálogo maestro y los CETAP quedan disponibles en todos
                      los periodos. La activación por periodo se hace aparte. */}
                  
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
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx,.xls" className="hidden" />
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
                        <p className="text-[10px] text-gray-300 mt-2">.xlsx · .xls</p>
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
                        { n: '1', t: 'Descargue la plantilla Excel', s: 'Contiene el formato requerido con las dos hojas: Territoriales y CETAPs.' },
                        { n: '2', t: 'Complete los datos', s: 'Llene las hojas con los códigos, nombres y estados de cada territorial y sede.' },
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
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 160px)' }}>
              {/* Status banner */}
              {(result as any).blocked_reason === 'ALL_IDENTICAL' ? (
                <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap bg-blue-50/40 border-b border-blue-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Info className="w-5 h-5 text-[#003DA5]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Datos ya cargados — Todos los registros están duplicados</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Los {totalDts} registros de Direcciones Territoriales y {totalCetaps} Sedes (CETAP) del archivo ya existen en la plataforma con información idéntica. No hay datos nuevos ni actualizaciones por procesar.
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
                          ? `${updatedDts} territoriales y ${updatedCetaps} sedes ya están cargadas — se actualizarán`
                          : `${newDts} nuevos + ${updatedDts} existentes (territoriales) · ${newCetaps} nuevos + ${updatedCetaps} existentes (sedes)`
                        }
                        {legacySync && (
                          <> · Sincronización organizacional: {legacyUpdates} actualizaciones y {legacyCreates} creaciones, sin eliminar registros heredados.</>
                        )}
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
                        className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-all shadow-sm"
                      >
                        Importar válidos ({(result.carga?.direcciones_territoriales?.creados || 0) + (result.carga?.cetaps?.creados || 0)})
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                      <Check className="w-3 h-3" /> {result.carga?.direcciones_territoriales?.creados || 0} territoriales OK
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-semibold border border-emerald-100">
                      <Check className="w-3 h-3" /> {result.carga?.cetaps?.creados || 0} sedes OK
                    </span>
                    {(result.carga?.direcciones_territoriales?.omitidos || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-semibold border border-red-100">
                        {result.carga.direcciones_territoriales.omitidos} territorial(es) error
                      </span>
                    )}
                    {(result.carga?.cetaps?.omitidos || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-semibold border border-red-100">
                        {result.carga.cetaps.omitidos} sede(s) error
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="px-6 py-4 bg-red-50/30 border-b border-red-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Errores bloqueantes</h3>
                      <p className="text-[11px] text-gray-500">No es posible importar</p>
                    </div>
                  </div>
                  <button onClick={resetState} className="px-3 py-1.5 text-[11px] font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-all">
                    Cargar otro
                  </button>
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
              <div className="px-8 py-5 grid grid-cols-6 gap-4 border-b border-gray-100">
                {[
                  { label: 'Territoriales', value: totalDts, icon: Building2, color: 'text-[#003DA5]', bg: 'bg-blue-50' },
                  { label: 'Total Sedes', value: totalCetaps, icon: MapPin, color: 'text-gray-600', bg: 'bg-gray-50' },
                  { label: 'Nuevas', value: sedesNuevas, icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Se actualizarán', value: sedesActualizar, icon: RefreshCw, color: 'text-[#003DA5]', bg: 'bg-blue-50' },
                  { label: 'Ya existen', value: sedesYaExisten, icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-50' },
                  { label: 'Con error', value: sedesError, icon: AlertCircle, color: sedesError > 0 ? 'text-red-600' : 'text-gray-300', bg: sedesError > 0 ? 'bg-red-50' : 'bg-gray-50' },
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
                    <div className="overflow-x-auto max-h-48 overflow-y-auto">
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
                          {result.errores.map((err: any, idx: number) =>
                            typeof err === 'string' ? (
                              <tr key={idx}><td colSpan={5} className="px-4 py-2 text-gray-700">{err}</td></tr>
                            ) : (
                              <tr key={idx} className="hover:bg-amber-50/30">
                                <td className="px-4 py-2 text-[10px] font-mono text-gray-400">{err.hoja || 'Archivo'}{err.fila ? ` · F${err.fila}` : ''}</td>
                                <td className="px-4 py-2 font-mono text-gray-600">{err.columna || '-'}</td>
                                <td className="px-4 py-2">{err.datoErrado ? <span className="text-red-500 line-through font-medium">{err.datoErrado}</span> : <span className="text-gray-300">—</span>}</td>
                                <td className="px-4 py-2">{err.valorEsperado ? <span className="text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {err.valorEsperado}</span> : <span className="text-gray-300">—</span>}</td>
                                <td className="px-4 py-2 text-gray-500 max-w-[160px] whitespace-normal">{err.mensaje}</td>
                              </tr>
                            )
                          )}
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
                      <div className="overflow-x-auto border border-gray-100 rounded-lg max-h-48 overflow-y-auto">
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
                            {result.errores.filter((e: any) => e.fila && e.columna).map((err: any, idx: number) => {
                              const corrKey = `${err.hoja}::${err.fila}::${err.columna}`;
                              const hasCorrected = corrections[corrKey] !== undefined && corrections[corrKey] !== '';
                              return (
                                <tr key={idx} className={hasCorrected ? 'bg-emerald-50/30' : 'bg-red-50/20'}>
                                  <td className="px-3 py-2 text-[10px] font-mono text-gray-400">{err.hoja}</td>
                                  <td className="px-3 py-2 font-mono text-gray-500">{err.fila}</td>
                                  <td className="px-3 py-2 font-mono text-gray-600 font-medium">{err.columna}</td>
                                  <td className="px-3 py-2"><span className="text-red-500 font-medium line-through text-[11px]">{err.datoErrado || '(vacío)'}</span></td>
                                  <td className="px-3 py-2">
                                    <input type="text" placeholder={err.valorEsperado || 'Nuevo valor...'} value={corrections[corrKey] || ''}
                                      onChange={(e) => handleCorrectionChange(corrKey, e.target.value)}
                                      className={`w-full px-2 py-1 border rounded text-xs font-medium transition-all focus:outline-none focus:ring-1 ${
                                        hasCorrected ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-200' : 'border-gray-200 bg-white text-gray-700 focus:ring-[#003DA5]/20'
                                      }`}
                                    />
                                  </td>
                                  <td className="px-3 py-2 text-[10px] text-gray-400 max-w-[140px] whitespace-normal">{err.mensaje}</td>
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

              {/* Master-Detail inside the card */}
              <div className="flex-1 min-h-0" style={{ display: 'grid', gridTemplateColumns: '260px 1fr' }}>
                {/* Navigator */}
                <div className="border-r border-gray-100 flex flex-col">
                  <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                      <input type="text" placeholder="Buscar territorial..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#003DA5]/15 focus:border-[#003DA5]/30 transition-all placeholder:text-gray-300"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0 p-2">
                    <button onClick={() => setSelectedDtCode(null)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center justify-between mb-1 ${
                        !selectedDtCode ? 'bg-[#003DA5] text-white shadow-sm shadow-[#003DA5]/15' : 'hover:bg-gray-50 text-gray-600'
                      }`}>
                      <div className="flex items-center gap-2.5">
                        <Globe className={`w-3.5 h-3.5 ${!selectedDtCode ? 'text-white/80' : 'text-gray-400'}`} />
                        <span className="text-xs font-semibold">Todas</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${!selectedDtCode ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{totalCetaps}</span>
                    </button>
                    <div className="h-px bg-gray-100 my-1 mx-2" />
                    {filteredTerritoriales.map((dt: any, idx: number) => {
                      const isSelected = selectedDtCode === dt.codigo_dt;
                      const cetapCount = (result?.preview_cetaps || []).filter((c: any) => c.codigo_dt === dt.codigo_dt).length;
                      return (
                        <button key={idx} onClick={() => setSelectedDtCode(dt.codigo_dt)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all flex items-center justify-between ${
                            isSelected ? 'bg-blue-50/80 text-[#003DA5]' : 'hover:bg-gray-50/80 text-gray-600'
                          }`}>
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className={`text-xs font-semibold truncate ${isSelected ? 'text-[#003DA5]' : 'text-gray-700'}`}>{dt.nombre_dt}</span>
                            <span className="text-[10px] font-mono text-gray-400 mt-0.5">{dt.codigo_dt}</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${isSelected ? 'bg-[#003DA5] text-white' : 'bg-gray-100 text-gray-500'}`}>{cetapCount}</span>
                        </button>
                      );
                    })}
                    {filteredTerritoriales.length === 0 && <div className="text-center py-6 text-[11px] text-gray-400">Sin resultados</div>}
                  </div>
                </div>

                {/* Sedes Table */}
                <div className="flex flex-col overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">{activeTerritorial ? activeTerritorial.nombre_dt : 'Todas las sedes'}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{activeTerritorial ? activeTerritorial.codigo_dt + ' · ' : ''}{visibleCetaps.length} registro(s)</p>
                    </div>
                    {activeTerritorial && (
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${activeTerritorial.activo ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                        {activeTerritorial.activo ? 'Activa' : 'Inactiva'}
                      </span>
                    )}
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 sticky top-0 border-b border-gray-100 z-10">
                        <tr>
                          <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Código</th>
                          <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Nombre</th>
                          {!activeTerritorial && <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Territorial</th>}
                          <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Tipo</th>
                          <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Importación</th>
                          <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {visibleCetaps.map((c: any, idx: number) => {
                          const est = estadoImportInfo(c._estado_import);
                          return (
                          <tr key={idx} className="hover:bg-blue-50/20 transition-colors group">
                            <td className="px-5 py-3 font-mono text-[11px] text-gray-400 group-hover:text-[#003DA5] transition-colors">{c.codigo_cetap}</td>
                            <td className="px-5 py-3 font-medium text-gray-800 text-xs">{c.nombre_cetap}</td>
                            {!activeTerritorial && <td className="px-5 py-3 font-mono text-[11px] text-gray-400">{c.codigo_dt}</td>}
                            <td className="px-5 py-3">
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded">{c.tipo}</span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md ${est.cls}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${est.dot}`} />
                                {est.label}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${c.activo ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-50'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${c.activo ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                {c.activo ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                          </tr>
                          );
                        })}
                        {visibleCetaps.length === 0 && (
                          <tr><td colSpan={!activeTerritorial ? 6 : 5} className="px-5 py-14 text-center">
                            <div className="flex flex-col items-center gap-2 text-gray-300">
                              <MapPin className="w-5 h-5" />
                              <p className="text-[11px] font-medium">Sin sedes para esta selección</p>
                            </div>
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
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

        {/* ━━━━━ STEP 4: DONE — Resumen de la importación ━━━━━ */}
        {currentStep === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)' }}>
              {/* Header */}
              <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap bg-emerald-50/30 border-b border-emerald-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Importación completada</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {doneNuevosList.length} nueva(s) · {doneActualizadosList.length} actualizada(s) · {doneYaExistian} ya existían{doneConError > 0 ? ` · ${doneConError} con error` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={resetState} className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                    Importar otro
                  </button>
                  <button onClick={onSuccess} className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-2">
                    <Check className="w-4 h-4" /> Finalizar
                  </button>
                </div>
              </div>

              {/* Metric row */}
              <div className="px-8 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-gray-100">
                {[
                  { label: 'Nuevas creadas', value: doneNuevosList.length, icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Actualizadas', value: doneActualizadosList.length, icon: RefreshCw, color: 'text-[#003DA5]', bg: 'bg-blue-50' },
                  { label: 'Ya existían', value: doneYaExistian, icon: CheckCircle2, color: 'text-gray-500', bg: 'bg-gray-50' },
                  { label: 'Con error', value: doneConError, icon: AlertTriangle, color: doneConError > 0 ? 'text-red-600' : 'text-gray-300', bg: doneConError > 0 ? 'bg-red-50' : 'bg-gray-50' },
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

              {/* Detail lists */}
              <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
                {/* Nuevos creados */}
                {doneNuevosList.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Registros nuevos creados ({doneNuevosList.length})
                    </h4>
                    <div className="border border-emerald-100 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-emerald-50/60 sticky top-0 border-b border-emerald-100">
                          <tr>
                            <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px]">Tipo</th>
                            <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px]">Código</th>
                            <th className="px-4 py-2 font-semibold text-gray-400 uppercase text-[10px]">Nombre</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {doneNuevosList.map((r: any, i: number) => (
                            <tr key={i} className="hover:bg-emerald-50/30">
                              <td className="px-4 py-2 text-gray-500">{r.tipo}</td>
                              <td className="px-4 py-2 font-mono text-[11px] text-gray-500">{r.codigo}</td>
                              <td className="px-4 py-2 font-medium text-gray-800">{r.nombre}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Ya existían bajo otro código (no es error: se conserva el existente) */}
                {doneYaExistenMsgs.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-[#003DA5] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5" /> Ya existían — no se duplicaron ({doneYaExistenMsgs.length})
                    </h4>
                    <p className="text-[11px] text-gray-400 mb-2">
                      Estos registros del archivo ya estaban en el catálogo (por nombre y territorial), en algunos casos bajo un código distinto. Se conservó el registro existente; no se creó ningún duplicado.
                    </p>
                    <div className="border border-blue-100 rounded-lg divide-y divide-blue-50 max-h-56 overflow-y-auto">
                      {doneYaExistenMsgs.map((m: string, i: number) => (
                        <div key={i} className="px-4 py-2 text-[11px] text-gray-600 flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#003DA5]/50 mt-1.5 shrink-0" />
                          <span>{m}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {doneIdenticos > 0 && (
                  <p className="text-[11px] text-gray-400">
                    {doneIdenticos} registro(s) ya estaban cargados con datos idénticos (sin cambios).
                  </p>
                )}

                {doneConError > 0 && (
                  <p className="text-[11px] text-red-500">
                    {doneConError} fila(s) del archivo se omitieron por errores de validación.
                  </p>
                )}

                {doneNuevosList.length === 0 && doneActualizadosList.length === 0 && doneYaExistenMsgs.length === 0 && (
                  <div className="text-center py-10 text-gray-400">
                    <Info className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-xs">No hubo cambios nuevos: todos los registros del archivo ya existían con los mismos datos.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
