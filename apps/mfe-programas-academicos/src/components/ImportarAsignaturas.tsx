import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, AlertTriangle, Loader2,
  ArrowLeft, Download, FileSpreadsheet,
  CheckCircle2, Info, AlertCircle,
  Check, ArrowRight, Shield, Sparkles,
  BookOpen, Layers, Database, Building,
  Search, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { useImportAsignaturas, ImportResult } from '../hooks/useImportAsignaturas';

interface ImportarAsignaturasProps {
  onBack: () => void;
  initialPeriodo?: string;
}

type WizardStep = 'upload' | 'validate' | 'importing';

export function ImportarAsignaturas({ onBack, initialPeriodo }: ImportarAsignaturasProps) {
  const { uploadCatalog, getPeriodos, checkEstructuraStatus, loading, result, error } = useImportAsignaturas();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [periodo, setPeriodo] = useState(initialPeriodo || '2025-2');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [periodoActivo, setPeriodoActivo] = useState<any | null>(null);

  // Prerequisite
  const [isEstructuraReady, setIsEstructuraReady] = useState<boolean | null>(null);
  const [checkingEstructura, setCheckingEstructura] = useState(false);

  // Master-Detail State
  const [selectedProgramaCode, setSelectedProgramaCode] = useState<string | null>(null);
  const [searchPrograma, setSearchPrograma] = useState('');
  const [activeTab, setActiveTab] = useState<'asignaturas' | 'cetaps'>('asignaturas');

  // Derive wizard step
  const currentStep: WizardStep =
    loading ? 'importing' :
    (result && !error) ? 'validate' :
    'upload';

  const steps = [
    { id: 'upload', label: 'Subir archivo', icon: Upload },
    { id: 'validate', label: 'Validar datos', icon: Shield },
    { id: 'importing', label: 'Importar', icon: Sparkles },
  ];

  // ─── Load initial data ───
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingPeriodos(true);
        setCheckingEstructura(true);

        const [data, statusRes] = await Promise.all([
          getPeriodos(),
          checkEstructuraStatus().catch(() => ({ data: { isReady: false } }))
        ]);

        if (statusRes?.data) {
          setIsEstructuraReady(statusRes.data.isReady);
        }

        if (data && Array.isArray(data)) {
          const activo = data.find((p: any) => p.estado === 'en_curso');
          if (activo) {
            setPeriodoActivo(activo);
            setPeriodo(activo.codigo);
          } else if (data.length > 0) {
            setPeriodoActivo(data[0]);
            setPeriodo(data[0].codigo);
          }
        }
      } catch (e) {
        console.error('Error cargando datos iniciales:', e);
      } finally {
        setLoadingPeriodos(false);
        setCheckingEstructura(false);
      }
    };
    loadInitialData();
  }, []);

  // ─── Handlers ───
  const handleDrag = (e: React.DragEvent) => {
    if (isEstructuraReady === false) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isEstructuraReady === false) return;
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
        setFile(f); handleImportar(true, f);
      } else { toast.error('Archivo no soportado. Use .xlsx, .xls o .csv'); }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEstructuraReady === false) return;
    if (e.target.files?.[0]) {
      const f = e.target.files[0];
      setFile(f); handleImportar(true, f);
    }
  };

  const handleImportar = async (dryRun = true, fileToImport?: File, skipInvalid = false) => {
    const currentFile = fileToImport || file;
    if (!currentFile) return;
    try {
      await uploadCatalog(currentFile, dryRun, periodo, skipInvalid);
      if (!dryRun) {
        toast.success('Catálogo cargado exitosamente', {
          description: 'El nuevo catálogo está disponible para armar los PTAs.',
        });
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al procesar el archivo.');
    }
  };

  const resetState = () => {
    setFile(null);
    // Reset hook state by triggering a re-render
    window.location.reload();
  };

  const handleDownloadTemplate = () => {
    toast.info('Descargando plantilla...', { description: 'La plantilla Excel se está descargando.' });
    // TODO: implement actual template download
  };

  // ─── Computed ───
  const carga = result?.carga;
  const totalProgramas = carga?.programas?.creados || 0;
  const totalNucleos = carga?.nucleos_tematicos?.creados || 0;
  const totalCetaps = carga?.cetaps?.creados || 0;
  const totalAsignaturas = carga?.asignaturas?.creados || 0;
  const totalOfertas = carga?.ofertas_cetap_programa?.creados || 0;
  const hasErrors = result?.errores && result.errores.length > 0;

  // ─── Filter Logic for Master-Detail ───
  const relaciones = result?.relaciones_cruzadas || [];
  const filteredProgramas = relaciones.filter((p: any) =>
    p.nombre_programa?.toLowerCase().includes(searchPrograma.toLowerCase()) ||
    p.codigo_programa?.toLowerCase().includes(searchPrograma.toLowerCase())
  );

  const activePrograma = selectedProgramaCode
    ? relaciones.find((p: any) => p.codigo_programa === selectedProgramaCode)
    : null;

  const visibleAsignaturas = activePrograma
    ? activePrograma.asignaturas
    : relaciones.flatMap((p: any) => p.asignaturas.map((a: any) => ({ ...a, _progCode: p.codigo_programa })));

  const visibleCetaps = activePrograma
    ? activePrograma.cetaps
    : relaciones.flatMap((p: any) => p.cetaps.map((c: any) => ({ ...c, _progCode: p.codigo_programa })));

  // ═══════════════════════════════ RENDER ═══════════════════════════════
  return (
    <div className="space-y-0">
      {/* ══════ WIZARD HEADER ══════ */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm mb-5 overflow-hidden">
        {/* Stepper */}
        <div className="px-6 py-3 bg-gray-50/50 flex items-center justify-center gap-0 relative">
          <button
            onClick={onBack}
            className="absolute left-6 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-all bg-white shadow-sm border border-gray-200"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4 text-gray-500" />
          </button>
          {steps.map((step, idx) => {
            const stepOrder = ['upload', 'validate', 'importing'];
            const currentIdx = stepOrder.indexOf(currentStep);
            const stepIdx = idx;
            const isActive = currentStep === step.id;
            const isComplete = stepIdx < currentIdx;
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
            {/* Prerequisite warning */}
            {isEstructuraReady === false && (
              <div className="bg-white border border-red-200 rounded-2xl shadow-sm overflow-hidden mb-5">
                <div className="px-6 py-4 flex items-center gap-3 bg-red-50/30 border-b border-red-100">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 text-sm">Prerrequisito no cumplido</h4>
                    <p className="text-[11px] text-gray-500">Debe importar la Estructura Geográfica antes del Catálogo de Asignaturas.</p>
                  </div>
                </div>
              </div>
            )}

            <div className={`bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden ${isEstructuraReady === false ? 'opacity-50 pointer-events-none' : ''}`}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                {/* Left: Drop Zone */}
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
                          onClick={(e) => { e.stopPropagation(); setFile(null); }}
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
                        { n: '1', t: 'Descargue la plantilla Excel', s: 'Contiene el formato requerido con las hojas: Programas, Asignaturas y Matriz Oferta.' },
                        { n: '2', t: 'Complete los datos', s: 'Llene las hojas con los códigos, nombres, créditos y modalidades de cada asignatura.' },
                        { n: '3', t: 'Suba el archivo', s: 'Arrastre o seleccione — se valida automáticamente con las reglas de negocio.' },
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
              <div className="p-6 text-xs text-red-800 font-mono bg-red-50/30">{error}</div>
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
          >
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col mb-10">
              {/* Status banner */}
              {result?.dry_run === false ? (
                <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap bg-emerald-50/30 border-b border-emerald-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Importación Completada</h3>
                      <p className="text-xs text-gray-500 mt-0.5">El catálogo ha sido cargado exitosamente en la plataforma.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onBack}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                      Terminar
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (result as any).blocked_reason === 'ALL_IDENTICAL' ? (
                <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap bg-blue-50/40 border-b border-blue-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Info className="w-5 h-5 text-[#003DA5]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Archivo sin cambios nuevos</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Todos los registros del archivo (programas, asignaturas, etc.) ya existen en la plataforma y tienen exactamente la misma información. <strong>No se detectó ningún dato nuevo ni ninguna diferencia para actualizar.</strong>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={resetState} className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all">
                      Cambiar archivo
                    </button>
                    <button
                      onClick={onBack}
                      className="px-5 py-2.5 text-xs font-bold text-white bg-[#003DA5] hover:bg-blue-800 rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                      Terminar
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : result?.success && !hasErrors ? (
                <div className="px-8 py-5 flex items-center justify-between gap-4 flex-wrap bg-emerald-50/30 border-b border-emerald-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">Validación exitosa</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Listos para procesar: <strong>{totalProgramas}</strong> programas nuevos ({carga?.programas?.actualizados || 0} a actualizar) y <strong>{totalAsignaturas}</strong> asignaturas nuevas ({carga?.asignaturas?.actualizados || 0} a actualizar).
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
              ) : hasErrors ? (
                <div className="px-6 py-4 bg-amber-50/30 border-b border-amber-100 space-y-3">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-sm">Validación parcial</h3>
                        <p className="text-[11px] text-gray-500">{result?.errores?.length} error(es) encontrados · {result?.advertencias?.length || 0} advertencia(s)</p>
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
                        Importar válidos ({totalAsignaturas})
                      </button>
                    </div>
                  </div>
                  {result?.errores && result.errores.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {result.errores.map((err: string, idx: number) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-semibold border border-red-100">
                          <AlertCircle className="w-3 h-3" /> {err}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Metrics row */}
              <div className="px-8 py-5 grid grid-cols-5 gap-6 border-b border-gray-100">
                {[
                  { label: 'Programas', value: totalProgramas, icon: BookOpen, color: 'text-[#003DA5]', bg: 'bg-blue-50' },
                  { label: 'Núcleos', value: totalNucleos, icon: Layers, color: 'text-purple-600', bg: 'bg-purple-50' },
                  { label: 'Asignaturas', value: totalAsignaturas, icon: Database, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'CETAPs Vinculados', value: totalCetaps, icon: Building, color: 'text-gray-600', bg: 'bg-gray-50' },
                  { label: 'Ofertas', value: totalOfertas, icon: CheckCircle2, color: 'text-amber-600', bg: 'bg-amber-50' },
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

              {/* Warnings/Advertencias */}
              {result?.advertencias && result.advertencias.length > 0 && (
                <div className="px-6 py-3 bg-amber-50/20 border-b border-amber-100">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[11px] font-semibold text-gray-600">{result.advertencias.length} advertencia(s)</span>
                  </div>
                  <div className="space-y-1">
                    {result.advertencias.map((adv: string, idx: number) => (
                      <p key={idx} className="text-[10px] text-amber-700 leading-relaxed">⚠ {adv}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* Detail summary table */}
              <div className="flex-1 flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-800">Resumen del Catálogo</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Detalle de la carga por categoría para el periodo {periodoActivo?.codigo || periodo}</p>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 sticky top-0 border-b border-gray-100 z-10">
                    <tr>
                      <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Categoría</th>
                      <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider text-center">Creados</th>
                      <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider text-center">Actualizados</th>
                      <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider text-center">Omitidos</th>
                      <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      { name: 'Programas Académicos', icon: BookOpen, data: carga?.programas },
                      { name: 'Núcleos Temáticos', icon: Layers, data: carga?.nucleos_tematicos },
                      { name: 'Asignaturas', icon: Database, data: carga?.asignaturas },
                      { name: 'Ofertas CETAP-Programa', icon: CheckCircle2, data: carga?.ofertas_cetap_programa },
                    ].map(({ name, icon: Icon, data }) => {
                      const creados = data?.creados || 0;
                      const actualizados = data?.actualizados || 0;
                      const omitidos = data?.omitidos || 0;
                      const hasIssue = omitidos > 0;
                      return (
                        <tr key={name} className="hover:bg-blue-50/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2.5">
                              <Icon className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-800">{name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="text-emerald-600 font-bold">{creados}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="text-blue-600 font-bold">{actualizados}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`font-bold ${hasIssue ? 'text-red-500' : 'text-gray-300'}`}>{omitidos}</span>
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              hasIssue
                                ? 'text-amber-600 bg-amber-50'
                                : 'text-emerald-600 bg-emerald-50'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${hasIssue ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                              {hasIssue ? 'Parcial' : 'OK'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* PTA Indicators */}
                {result?.indicadores_pta && (
                  <div className="px-6 py-4 border-t border-gray-100">
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Indicadores PTA</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <span className="text-lg font-bold text-gray-900">{result.indicadores_pta.asignaturas_modalidad_sin_definir}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-semibold uppercase">Sin Modalidad</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <span className="text-lg font-bold text-gray-900">{result.indicadores_pta.asignaturas_con_excepcion}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-semibold uppercase">Con Excepción</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <span className="text-lg font-bold text-gray-900">{result.indicadores_pta.horas_pta_calculadas_promedio}</span>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-semibold uppercase">Hrs PTA Promedio</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Master-Detail inside the card */}
                <div className="flex-1 min-h-[500px] border-t border-gray-100" style={{ display: 'grid', gridTemplateColumns: '260px 1fr' }}>
                  {/* Navigator */}
                  <div className="border-r border-gray-100 flex flex-col">
                    <div className="p-4 border-b border-gray-100">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input type="text" placeholder="Buscar programa..." value={searchPrograma} onChange={(e) => setSearchPrograma(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#003DA5]/15 focus:border-[#003DA5]/30 transition-all placeholder:text-gray-300"
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[500px] p-2">
                      <button onClick={() => setSelectedProgramaCode(null)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center justify-between mb-1 ${
                          !selectedProgramaCode ? 'bg-[#003DA5] text-white shadow-sm shadow-[#003DA5]/15' : 'hover:bg-gray-50 text-gray-600'
                        }`}>
                        <div className="flex items-center gap-2.5">
                          <Globe className={`w-3.5 h-3.5 ${!selectedProgramaCode ? 'text-white/80' : 'text-gray-400'}`} />
                          <span className="text-xs font-semibold">Todos</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${!selectedProgramaCode ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{totalProgramas}</span>
                      </button>
                      <div className="h-px bg-gray-100 my-1 mx-2" />
                      {filteredProgramas.map((p: any, idx: number) => {
                        const isSelected = selectedProgramaCode === p.codigo_programa;
                        const asigCount = p.asignaturas?.length || 0;
                        const cetapCount = p.cetaps?.length || 0;
                        return (
                          <button key={idx} onClick={() => setSelectedProgramaCode(p.codigo_programa)}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-all flex flex-col gap-1 ${
                              isSelected ? 'bg-blue-50/80' : 'hover:bg-gray-50/80'
                            }`}>
                            <div className="flex items-start justify-between w-full">
                              <span className={`text-xs font-semibold leading-tight pr-2 ${isSelected ? 'text-[#003DA5]' : 'text-gray-700'}`}>{p.nombre_programa}</span>
                            </div>
                            <div className="flex items-center justify-between w-full mt-1">
                              <span className="text-[10px] font-mono text-gray-400">{p.codigo_programa}</span>
                              <div className="flex items-center gap-1">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-[#003DA5]/10 text-[#003DA5]' : 'bg-gray-100 text-gray-500'}`}>{asigCount} Asig</span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isSelected ? 'bg-[#003DA5]/10 text-[#003DA5]' : 'bg-gray-100 text-gray-500'}`}>{cetapCount} CETAPs</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {filteredProgramas.length === 0 && <div className="text-center py-6 text-[11px] text-gray-400">Sin resultados</div>}
                    </div>
                  </div>

                  {/* Asignaturas and CETAPs Tabs */}
                  <div className="flex flex-col overflow-hidden bg-white">
                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-gray-800">{activePrograma ? activePrograma.nombre_programa : 'Todos los programas'}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{activePrograma ? activePrograma.codigo_programa + ' · ' : ''}Detalle de programa</p>
                      </div>
                      {activePrograma && (
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider ${activePrograma.valido ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                          {activePrograma.valido ? 'Válido' : 'Con Errores'}
                        </span>
                      )}
                    </div>
                    
                    {/* Tabs */}
                    <div className="flex items-center border-b border-gray-100 px-4">
                      <button
                        onClick={() => setActiveTab('asignaturas')}
                        className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
                          activeTab === 'asignaturas' ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                        }`}
                      >
                        Asignaturas ({visibleAsignaturas.length})
                      </button>
                      <button
                        onClick={() => setActiveTab('cetaps')}
                        className={`px-4 py-3 text-xs font-bold transition-all border-b-2 ${
                          activeTab === 'cetaps' ? 'border-[#003DA5] text-[#003DA5]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                        }`}
                      >
                        CETAPs Ofertados ({visibleCetaps.length})
                      </button>
                    </div>

                    <div className="overflow-y-auto max-h-[500px] flex-1">
                      {activeTab === 'asignaturas' ? (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50/80 sticky top-0 border-b border-gray-100 z-10">
                            <tr>
                              <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Código</th>
                              <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Nombre</th>
                              {!activePrograma && <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Programa</th>}
                              <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Créditos</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {visibleAsignaturas.map((a: any, idx: number) => (
                              <tr key={idx} className="hover:bg-blue-50/20 transition-colors group">
                                <td className="px-5 py-3 font-mono text-[11px] text-gray-400 group-hover:text-[#003DA5] transition-colors">{a.codigo}</td>
                                <td className="px-5 py-3 font-medium text-gray-800 text-xs">{a.nombre}</td>
                                {!activePrograma && <td className="px-5 py-3 font-mono text-[11px] text-gray-400">{a._progCode}</td>}
                                <td className="px-5 py-3">
                                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded">{a.creditos} CRÉDITOS</span>
                                </td>
                              </tr>
                            ))}
                            {visibleAsignaturas.length === 0 && (
                              <tr><td colSpan={!activePrograma ? 4 : 3} className="px-5 py-14 text-center">
                                <div className="flex flex-col items-center gap-2 text-gray-300">
                                  <Database className="w-5 h-5" />
                                  <p className="text-[11px] font-medium">Sin asignaturas para esta selección</p>
                                </div>
                              </td></tr>
                            )}
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50/80 sticky top-0 border-b border-gray-100 z-10">
                            <tr>
                              <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Código CETAP</th>
                              <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Nombre CETAP</th>
                              {!activePrograma && <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Programa</th>}
                              <th className="px-5 py-3 font-semibold text-gray-400 uppercase text-[10px] tracking-wider">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {visibleCetaps.map((c: any, idx: number) => (
                              <tr key={idx} className="hover:bg-blue-50/20 transition-colors group">
                                <td className="px-5 py-3 font-mono text-[11px] text-gray-400 group-hover:text-[#003DA5] transition-colors">{c.codigo}</td>
                                <td className="px-5 py-3 font-medium text-gray-800 text-xs">{c.nombre_dt}</td>
                                {!activePrograma && <td className="px-5 py-3 font-mono text-[11px] text-gray-400">{c._progCode}</td>}
                                <td className="px-5 py-3">
                                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${c.valido ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                                    {c.valido ? 'Válido' : 'Inválido'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                            {visibleCetaps.length === 0 && (
                              <tr><td colSpan={!activePrograma ? 4 : 3} className="px-5 py-14 text-center">
                                <div className="flex flex-col items-center gap-2 text-gray-300">
                                  <Building className="w-5 h-5" />
                                  <p className="text-[11px] font-medium">Sin CETAPs ofertados para esta selección</p>
                                </div>
                              </td></tr>
                            )}
                          </tbody>
                        </table>
                      )}
                    </div>
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
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex items-center justify-center py-20">
              <div className="text-center space-y-4">
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-gray-100" />
                  <Loader2 className="w-16 h-16 animate-spin text-[#003DA5]" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Procesando catálogo...</p>
                  <p className="text-[11px] text-gray-400 mt-1">Validando y cargando datos del periodo {periodoActivo?.codigo || periodo}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
