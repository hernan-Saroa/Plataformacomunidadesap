import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Building,
  BookOpen,
  Layers,
  Info,
  ArrowLeft,
  Database,
  Check,
  AlertCircle,
  ChevronRight,
  ShieldAlert,
  Plus,
  X
} from 'lucide-react';
import { Card, Badge, Container4K, ResponsiveHeader, ConfirmationDialog } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { useImportAsignaturas, ImportResult } from '../hooks/useImportAsignaturas';
import { ValidationTable } from './ValidationTable';

interface ImportarAsignaturasProps {
  onBack: () => void;
  initialPeriodo?: string;
}

export function ImportarAsignaturas({ onBack, initialPeriodo }: ImportarAsignaturasProps) {
  const { uploadCatalog, getLastImport, getPeriodos, createPeriodo, checkEstructuraStatus, loading, progress, result, error } = useImportAsignaturas();
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [periodo, setPeriodo] = useState(initialPeriodo || '2025-2');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [lastImportStats, setLastImportStats] = useState<any>(null);
  const [isSuccessLoad, setIsSuccessLoad] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [periodos, setPeriodos] = useState<any[]>([]);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  
  // Nuevo estado para validación de prerrequisito
  const [isEstructuraReady, setIsEstructuraReady] = useState<boolean | null>(null);
  const [checkingEstructura, setCheckingEstructura] = useState(false);

  // Form states for creating a period
  const [newAnio, setNewAnio] = useState(new Date().getFullYear());
  const [newSemestre, setNewSemestre] = useState(1);
  const [newFechaInicio, setNewFechaInicio] = useState('');
  const [newFechaFin, setNewFechaFin] = useState('');
  const [creatingPeriodo, setCreatingPeriodo] = useState(false);

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
        setPeriodos(data);
        if (data.length > 0) {
          // If the selected period is not in the list, default to the first one
          const codes = data.map((p: any) => p.codigo);
          if (!codes.includes(periodo)) {
            setPeriodo(data[0].codigo);
          }
        }
      }
    } catch (e) {
      console.error('Error cargando datos iniciales:', e);
      toast.error('Error al cargar la configuración inicial');
    } finally {
      setLoadingPeriodos(false);
      setCheckingEstructura(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Cargar estadísticas del último cargue
  const loadLastImportStats = async () => {
    try {
      const stats = await getLastImport(periodo);
      if (stats?.success) {
        setLastImportStats(stats);
      }
    } catch (err) {
      console.error('Error cargando última importación:', err);
    }
  };

  useEffect(() => {
    if (periodo) {
      loadLastImportStats();
    }
  }, [periodo]);

  const handleCreatePeriodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnio || !newSemestre || !newFechaInicio || !newFechaFin) {
      toast.error('Por favor completa todos los campos.');
      return;
    }

    try {
      setCreatingPeriodo(true);
      const res = await createPeriodo({
        anio: newAnio,
        semestre: newSemestre,
        fechaInicio: newFechaInicio,
        fechaFin: newFechaFin,
      });

      if (res) {
        toast.success(`Periodo académico ${res.codigo} creado con éxito.`);
        setShowCreatePeriodModal(false);
        await loadInitialData();
        setPeriodo(res.codigo);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al crear el periodo académico');
    } finally {
      setCreatingPeriodo(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    if (isEstructuraReady === false) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (isEstructuraReady === false) return;
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        droppedFile.name.endsWith('.xlsx')
      ) {
        setFile(droppedFile);
        simulateValidation(droppedFile);
      } else {
        toast.error('Archivo no soportado', {
          description: 'Por favor suba únicamente archivos Excel (.xlsx)',
        });
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEstructuraReady === false) return;
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      simulateValidation(selectedFile);
    }
  };

  const simulateValidation = async (fileToValidate: File) => {
    try {
      toast.promise(uploadCatalog(fileToValidate, true, periodo), {
        loading: 'Validando consistencia del archivo...',
        success: 'Archivo validado con éxito. Revisa el impacto a continuación.',
        error: (err) => err.message || 'Error al validar el archivo.',
      });
    } catch (e) {
      console.error('Error de validación:', e);
    }
  };

  const handleRealUpload = async (omitErrors: boolean = false) => {
    if (!file) return;
    setShowConfirmModal(false);
    try {
      await uploadCatalog(file, false, periodo, omitErrors);
      setIsSuccessLoad(true);
      toast.success('Catálogo cargado exitosamente', {
        description: 'El nuevo catálogo está disponible para armar los PTAs.',
      });
      loadLastImportStats();
    } catch (err: any) {
      toast.error('Error en la carga real del catálogo', {
        description: err.message || 'Error al guardar los datos.',
      });
    }
  };

  const triggerFileSelect = () => {
    if (isEstructuraReady === false) return;
    fileInputRef.current?.click();
  };

  return (
    <Container4K className="space-y-6">
      {/* Header premium */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all mr-2 flex items-center justify-center border border-gray-200 bg-white"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <ResponsiveHeader
          title="Importar Catálogo de Asignaturas"
          description="Cargue el archivo Excel del catálogo de programas y asignaturas para el periodo académico"
          icon={Layers}
        />
      </div>

      {!result && !isSuccessLoad && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Panel de carga */}
          <div className="md:col-span-2 space-y-4">
            
            {/* Prerrequisito No Cumplido */}
            {isEstructuraReady === false && (
              <Card className="border-l-4 border-l-red-500 bg-red-50 p-6 shadow-sm border border-red-200">
                <div className="flex items-start gap-3">
                  <div className="bg-red-100 p-2 rounded-full mt-1 shrink-0">
                    <ShieldAlert className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-black text-red-900 text-sm uppercase tracking-wider">Prerrequisito Incompleto</h4>
                    <p className="text-sm text-red-800 mt-1 font-semibold leading-relaxed">
                      La Estructura Geográfica (Direcciones Territoriales y CETAPs) <strong>no ha sido cargada</strong>.
                    </p>
                    <p className="text-xs text-red-700 mt-2">
                      Debe importar primero la estructura geográfica a través del módulo correspondiente antes de poder subir programas y asignaturas.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            <Card className={`p-6 ${isEstructuraReady === false ? 'opacity-50 pointer-events-none' : ''}`}>
              <h3 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#003DA5]" />
                Subir Archivo Excel (.xlsx)
              </h3>

              <div className="flex items-center gap-4 mb-4 flex-wrap">
                <label className="text-sm font-semibold text-gray-700">Periodo Académico:</label>
                {loadingPeriodos ? (
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin text-[#003DA5]" />
                    Cargando periodos...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <select
                      value={periodo}
                      onChange={(e) => setPeriodo(e.target.value)}
                      className="px-3 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white cursor-pointer font-bold text-sm"
                    >
                      {periodos.map((p) => (
                        <option key={p.id} value={p.codigo}>
                          {p.codigo} {p.codigo === '2025-2' ? '(Periodo Actual)' : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setShowCreatePeriodModal(true)}
                      className="p-2 bg-blue-50 text-[#003DA5] hover:bg-blue-100 rounded-xl border border-blue-150 transition-all flex items-center justify-center shadow-sm"
                      title="Crear Nuevo Periodo Académico"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Drag-and-drop box */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-3 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#003DA5] bg-blue-50/50 scale-[0.99]'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx"
                  className="hidden"
                />
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 text-[#003DA5] rounded-full flex items-center justify-center border border-blue-100 shadow-sm">
                  <Database className="w-8 h-8" />
                </div>
                <p className="font-bold text-gray-800 text-sm">
                  {isEstructuraReady === false ? 'Bloqueado por prerrequisito' : 'Arrastra tu archivo aquí o haz clic para explorar'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Formatos soportados: Excel (.xlsx). Tamaño máximo: 10 MB.
                </p>
              </div>
            </Card>
          </div>

          {/* Historial rápido */}
          <div>
            <Card className="p-6 h-full flex flex-col">
              <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Estado del Periodo {periodo}
              </h3>
              {lastImportStats ? (
                <div className="space-y-4 flex-1">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-800 font-bold uppercase">Catálogo Activo</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">
                      {lastImportStats.counts?.asignaturas.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-emerald-700">Asignaturas cargadas en el sistema</p>
                  </div>

                  <div className="space-y-2.5 text-sm text-gray-700">
                    <div className="flex justify-between border-b pb-1.5 border-gray-100">
                      <span>Programas:</span>
                      <span className="font-bold">{lastImportStats.counts?.programas || 0}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5 border-gray-100">
                      <span>Núcleos Temáticos:</span>
                      <span className="font-bold">{lastImportStats.counts?.nucleos_tematicos || 0}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1.5 border-gray-100">
                      <span>CETAPs ofertados:</span>
                      <span className="font-bold">{lastImportStats.counts?.ofertas_cetap_programa || 0}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div className="text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
                    <p className="text-xs">Consultando base de datos...</p>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Cargando progreso */}
      {loading && (
        <Card className="p-6 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#003DA5]" />
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">
            Procesando Archivo
          </h3>
          <p className="text-sm text-gray-600">
            Leyendo hojas de cálculo y calculando horas según Circular 003... ({progress}%)
          </p>
          <div className="w-64 mx-auto h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-[#003DA5] transition-all" style={{ width: `${progress}%` }} />
          </div>
        </Card>
      )}

      {/* Error de carga bloqueante */}
      {error && !loading && (
        <Card className="border-l-4 border-l-red-600 bg-red-50 p-5 shadow-sm border border-red-200 space-y-2">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <h4 className="font-black text-sm uppercase tracking-wider">Error de validación bloqueante</h4>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            Se encontraron errores graves que impiden cargar la información. Corrija los siguientes puntos en su archivo Excel y vuelva a intentarlo:
          </p>
          <ul className="list-disc pl-5 text-sm text-red-950 space-y-1">
            <li>{error}</li>
          </ul>
          <button
            onClick={() => {
              setFile(null);
              window.location.reload();
            }}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all font-bold text-xs"
          >
            Subir Otro Archivo
          </button>
        </Card>
      )}

      {/* Dry Run Report / Reporte Preliminar */}
      {result && !loading && !isSuccessLoad && (
        <div className="space-y-6">
          {/* Toggles del reporte */}
          <div className="flex items-center justify-between border-b pb-3 border-gray-200">
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200 font-bold px-3 py-1">
                Modo Simulación
              </Badge>
              <span className="text-xs text-gray-500 font-medium">
                Archivo: {file?.name} ({Math.round((file?.size || 0) / 1024)} KB)
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setFile(null)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-bold transition-all"
              >
                Cancelar Carga
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all ${
                  result.errores.length > 0
                    ? 'bg-red-600 hover:bg-red-700 active:scale-95 text-white'
                    : 'bg-[#003DA5] hover:bg-[#002d7a] active:scale-95 text-white'
                }`}
              >
                {result.errores.length > 0 ? 'Gestionar Errores y Cargar' : 'Confirmar y Cargar Catálogo'}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Resumen de Carga */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Programas', value: result.carga.programas.creados, icon: GraduationCapIcon },
                  { label: 'Asignaturas', value: result.carga.asignaturas.creados, icon: BookOpen },
                  { label: 'Núcleos Temáticos', value: result.carga.nucleos_tematicos.creados, icon: Layers },
                  { label: 'Oferta Territorios', value: result.carga.ofertas_cetap_programa.creados, icon: Building },
                ].map((item) => (
                  <Card key={item.label} className="p-4 flex items-center gap-3">
                    <div className="p-3 bg-blue-50 text-[#003DA5] rounded-xl border border-blue-100 shadow-sm shrink-0">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gray-500">{item.label}</p>
                      <p className="text-xl font-black text-gray-900 mt-0.5">{item.value.toLocaleString()}</p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Warnings o Errores de validación */}
              {result.advertencias.length > 0 && (
                <Card className="border-l-4 border-l-amber-500 bg-amber-50/50 p-5 shadow-sm border border-amber-200">
                  <h4 className="font-black text-amber-800 text-sm uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Consistencia Horas Circular 003 ({result.advertencias.length} advertencias)
                  </h4>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {result.advertencias.map((warn, i) => (
                      <p key={i} className="text-xs text-gray-700 bg-white p-2 rounded-lg border border-amber-100 shadow-sm">
                        {warn}
                      </p>
                    ))}
                  </div>
                </Card>
              )}
            {/* Indicadores de Impacto */}
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="p-5 border border-yellow-200 bg-yellow-50/30">
                  <h4 className="text-xs font-black text-yellow-700 uppercase tracking-wider">Revisiones Pendientes</h4>
                  <p className="text-3xl font-black text-yellow-900 mt-1">
                    {result.indicadores_pta.asignaturas_modalidad_sin_definir}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Asignaturas con modalidad 'Sin Definir' que requieren revisión manual.
                  </p>
                </Card>

                <Card className="p-5 border border-purple-200 bg-purple-50/30">
                  <h4 className="text-xs font-black text-purple-700 uppercase tracking-wider">Asignaturas con Excepción</h4>
                  <p className="text-3xl font-black text-purple-900 mt-1">
                    {result.indicadores_pta.asignaturas_con_excepcion}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Materias especiales de la Circular 003 con carga horaria fija (grado, seminarios).
                  </p>
                </Card>

                <Card className="p-5 border border-blue-200 bg-blue-50/30">
                  <h4 className="text-xs font-black text-[#003DA5] uppercase tracking-wider">Horas PTA Promedio</h4>
                  <p className="text-3xl font-black text-blue-900 mt-1">
                    {result.indicadores_pta.horas_pta_calculadas_promedio} h
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Carga promedio proyectada en el PTA por asignatura (criterio 1+2).
                  </p>
                </Card>
              </div>

              {/* Cobertura Territorial */}
              <Card className="p-5">
                <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Building className="w-4 h-4 text-[#003DA5]" />
                  Distribución de Catálogo por Dirección Territorial
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(result.indicadores_pta.asignaturas_disponibles_por_dt).map(([dt, count]) => (
                    <div key={dt} className="p-3 bg-gray-50 border rounded-xl flex justify-between items-center text-xs">
                      <span className="font-bold text-gray-700 truncate mr-2">{dt.replace(/_/g, ' ')}</span>
                      <Badge className="bg-blue-100 text-[#003DA5] hover:bg-blue-200 shrink-0 font-bold">
                        {count} asig.
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>

            {/* Tabla de Relaciones y Validaciones */}
            {result.relaciones_cruzadas && (
              <ValidationTable relaciones={result.relaciones_cruzadas} />
            )}
          </div>
        </div>
      )}

      {/* Reporte final exitoso */}
      {isSuccessLoad && result && (
        <Card className="p-8 text-center space-y-6 border-2 border-emerald-500 bg-emerald-50/30 max-w-2xl mx-auto shadow-lg">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-emerald-950">Catálogo de Asignaturas Importado</h2>
            <p className="text-sm text-gray-700">
              La base de datos fue actualizada exitosamente en {result.tiempo_ms} ms para el periodo{' '}
              <strong>{result.periodo}</strong>.
            </p>
          </div>

          {/* Counts */}
          <div className="grid grid-cols-3 gap-3 bg-white p-4 rounded-2xl border shadow-inner text-center">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Programas</p>
              <p className="text-lg font-black text-gray-900 mt-1">{result.carga.programas.creados}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Asignaturas</p>
              <p className="text-lg font-black text-gray-900 mt-1">{result.carga.asignaturas.creados}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">Ofertas CETAP</p>
              <p className="text-lg font-black text-gray-900 mt-1">{result.carga.ofertas_cetap_programa.creados}</p>
            </div>
          </div>

          {result.indicadores_pta.asignaturas_modalidad_sin_definir > 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-left flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-yellow-800">
                  {result.indicadores_pta.asignaturas_modalidad_sin_definir} asignaturas requieren revisión de modalidad
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  Las asignaturas con modalidad "Por Definir" fueron creadas como "sin_definir". Un gestor GGP debe revisarlas manualmente para evitar inconsistencias en el cálculo.
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={onBack}
              className="px-6 py-3 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-xl font-bold text-sm shadow-sm active:scale-95 transition-all"
            >
              Ir a la Lista de Programas
            </button>
            <button
              onClick={() => {
                setIsSuccessLoad(false);
                setFile(null);
                window.location.reload();
              }}
              className="px-5 py-3 border bg-white hover:bg-gray-50 text-gray-700 rounded-xl font-bold text-sm transition-all"
            >
              Cargar Otro Archivo
            </button>
          </div>
        </Card>
      )}

      {/* Modal de confirmación irreversible */}
      <ConfirmationDialog
        open={showConfirmModal}
        title={result?.errores && result.errores.length > 0 ? "Existen errores en el archivo" : "Confirmar carga del catálogo"}
        description={
          result?.errores && result.errores.length > 0 
          ? `Se encontraron ${result.errores.length} errores bloqueantes. Puede OMITIR los registros con error y guardar únicamente la información válida, o CANCELAR para corregir su archivo Excel.`
          : `Esta operación es irreversible y reemplazará la oferta de asignaturas y programas para el periodo ${periodo}.
Los Planes de Trabajo Académico (PTA) en construcción se recalcularán según estos nuevos parámetros.
¿Está seguro de continuar?`
        }
        confirmText={result?.errores && result.errores.length > 0 ? "Continuar y Omitir Errores" : "Sí, Confirmar Carga"}
        cancelText={result?.errores && result.errores.length > 0 ? "Cancelar y Corregir" : "Cancelar"}
        variant={result?.errores && result.errores.length > 0 ? "danger" : "warning"}
        onConfirm={() => handleRealUpload(result?.errores ? result.errores.length > 0 : false)}
        onClose={() => setShowConfirmModal(false)}
      />

      {/* Modal para Crear Periodo Académico */}
      <AnimatePresence>
        {showCreatePeriodModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-md border border-gray-100"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-[#003DA5]">
                  <Database className="w-5 h-5" />
                  <h3 className="text-lg font-black uppercase tracking-wider">Crear Periodo</h3>
                </div>
                <button
                  onClick={() => setShowCreatePeriodModal(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreatePeriodo} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Año del Periodo
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2050"
                    value={newAnio}
                    onChange={(e) => setNewAnio(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] font-bold text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                    Semestre
                  </label>
                  <select
                    value={newSemestre}
                    onChange={(e) => setNewSemestre(parseInt(e.target.value, 10))}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] bg-white font-bold text-sm cursor-pointer"
                    required
                  >
                    <option value={1}>Semestre 1 (Periodo XX-1)</option>
                    <option value={2}>Semestre 2 (Periodo XX-2)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      Fecha de Inicio
                    </label>
                    <input
                      type="date"
                      value={newFechaInicio}
                      onChange={(e) => setNewFechaInicio(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] font-bold text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                      Fecha de Fin
                    </label>
                    <input
                      type="date"
                      value={newFechaFin}
                      onChange={(e) => setNewFechaFin(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] font-bold text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreatePeriodModal(false)}
                    className="px-4 py-2.5 text-gray-600 hover:bg-gray-50 border rounded-xl text-xs font-bold transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingPeriodo}
                    className="px-5 py-2.5 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    {creatingPeriodo ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      'Crear Periodo'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Container4K>
  );
}

// Icono GraduationCap temporal
function GraduationCapIcon(props: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
    </svg>
  );
}
