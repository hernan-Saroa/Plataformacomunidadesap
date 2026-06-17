import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Upload, Loader2, Download, AlertTriangle, CheckCircle2,
  AlertCircle, FileSpreadsheet, Building2, MapPin, Check
} from 'lucide-react';
import { toast } from 'sonner';
import { estructuraService } from '../../services/estructuraService';
import * as XLSX from 'xlsx';

interface ImportEstructuraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportEstructuraModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportEstructuraModalProps) {
  const [periodos, setPeriodos] = useState<any[]>([]);
  const [selectedPeriodo, setSelectedPeriodo] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPeriodos, setLoadingPeriodos] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      cargarPeriodos();
    }
  }, [isOpen]);

  const cargarPeriodos = async () => {
    try {
      setLoadingPeriodos(true);
      const data = await estructuraService.obtenerPeriodos();
      // Ordenar periodos descendente por código
      const sorted = [...data].sort((a, b) => b.codigo.localeCompare(a.codigo));
      setPeriodos(sorted);
      if (sorted.length > 0) {
        setSelectedPeriodo(sorted[0].codigo);
      }
    } catch (err: any) {
      console.error('Error cargando periodos:', err);
      toast.error('Error al cargar la lista de periodos académicos');
    } finally {
      setLoadingPeriodos(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setResult(null);
    setError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const ext = droppedFile.name.split('.').pop()?.toLowerCase();
      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        setFile(droppedFile);
      } else {
        toast.error('Solo se permiten archivos Excel (.xlsx, .xls) o CSV');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Hoja 1: DIRECCIONES_TERRITORIALES
    const wsDt = XLSX.utils.aoa_to_sheet([
      ['codigo_dt', 'nombre_dt', 'nombre_normalizado', 'orden_visualizacion', 'activo'],
      ['SC', 'SEDE_CENTRAL', 'sedecentral', 1, 'TRUE'],
      ['DT-001', 'ANTIOQUIA', 'antioquia', 2, 'TRUE'],
    ]);
    XLSX.utils.book_append_sheet(wb, wsDt, 'DIRECCIONES_TERRITORIALES');

    // Hoja 2: CETAPS
    const wsCetaps = XLSX.utils.aoa_to_sheet([
      ['codigo_cetap', 'nombre_cetap', 'nombre_normalizado', 'codigo_dt', 'nombre_dt', 'tipo', 'latitud', 'longitud', 'activo'],
      ['CET-0001', 'Sede Central Principal', 'sedecentralprincipal', 'SC', 'SEDE_CENTRAL', 'sede_central', '4.6486', '-74.0828', 'TRUE'],
      ['CET-0002', 'OTRO SEDE_CENTRAL', 'otrosedecentral', 'SC', 'SEDE_CENTRAL', 'otro', '', '', 'TRUE'],
    ]);
    XLSX.utils.book_append_sheet(wb, wsCetaps, 'CETAPS');

    XLSX.writeFile(wb, 'Plantilla_Estructura_Geografica.xlsx');
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Debe seleccionar un archivo para importar');
      return;
    }
    if (!selectedPeriodo) {
      toast.error('Debe seleccionar un periodo académico');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await estructuraService.importarEstructura(file, selectedPeriodo);
      setResult(response.data || response);
      toast.success('Estructura organizacional importada correctamente');
      onSuccess();
    } catch (err: any) {
      console.error('Error importando estructura:', err);
      const msg = err.response?.data?.message || err.message || 'Error al procesar la carga';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <div className="fixed inset-0 z-[201] flex items-center justify-center p-4">
            <motion.div
              className="bg-white rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-150 bg-gradient-to-b from-gray-50 to-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003DA5] to-blue-600 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Importar Estructura</h2>
                    <p className="text-xs text-gray-500">Carga masiva de Territoriales y CETAPs</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!result && !error ? (
                  <>
                    {/* Periodo Academico */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-800">
                        1. Seleccionar Periodo Académico
                      </label>
                      <p className="text-xs text-gray-500">
                        La activación de la estructura organizacional (Territoriales y CETAPs) irá ligada a este periodo.
                      </p>
                      {loadingPeriodos ? (
                        <div className="h-10 flex items-center gap-2 px-3 border border-gray-250 rounded-xl bg-gray-50">
                          <Loader2 className="w-4 h-4 animate-spin text-[#003DA5]" />
                          <span className="text-xs text-gray-500">Cargando periodos académicos...</span>
                        </div>
                      ) : (
                        <select
                          value={selectedPeriodo}
                          onChange={(e) => setSelectedPeriodo(e.target.value)}
                          className="w-full h-11 px-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] text-sm font-bold text-gray-900 bg-white transition-all cursor-pointer"
                        >
                          <option value="">Seleccione un periodo...</option>
                          {periodos.map(p => (
                            <option key={p.id} value={p.codigo}>
                              Periodo Académico {p.codigo}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    {/* File Upload Zone */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="block text-sm font-semibold text-gray-800">
                          2. Cargar Archivo
                        </label>
                        <button
                          onClick={handleDownloadTemplate}
                          className="text-xs font-bold text-[#003DA5] hover:text-blue-800 flex items-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Descargar Plantilla Excel
                        </button>
                      </div>

                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                          dragActive
                            ? 'border-[#003DA5] bg-blue-50/30'
                            : file
                            ? 'border-emerald-500 bg-emerald-50/10'
                            : 'border-gray-300 hover:border-[#003DA5] hover:bg-gray-50/50'
                        }`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          onChange={handleFileChange}
                          accept=".xlsx,.xls,.csv"
                          className="hidden"
                        />

                        {file ? (
                          <>
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                              <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-black text-gray-900 max-w-[250px] truncate">{file.name}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFile(null);
                              }}
                              className="text-xs font-bold text-red-600 hover:text-red-800 underline transition-colors"
                            >
                              Cambiar archivo
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#003DA5] flex items-center justify-center border border-blue-100">
                              <Upload className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-bold text-gray-800">
                                Arrastra tu archivo de Excel o CSV aquí
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                O haz clic para buscar en tu dispositivo
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </>
                ) : error ? (
                  /* Error Card */
                  <div className="bg-red-50/50 border border-red-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-red-950 text-sm">Error en la Importación</h3>
                        <p className="text-xs text-red-700 mt-0.5">No se pudo procesar el catálogo</p>
                      </div>
                    </div>
                    <p className="text-xs text-red-800 leading-relaxed font-mono bg-white p-3 rounded-lg border border-red-150 overflow-x-auto whitespace-pre-wrap max-h-48">
                      {error}
                    </p>
                    <button
                      onClick={resetState}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
                    >
                      Reintentar Carga
                    </button>
                  </div>
                ) : (
                  /* Success Summary Card */
                  <div className="space-y-4">
                    <div className="bg-emerald-50/50 border border-emerald-150 rounded-2xl p-5 flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-emerald-950 text-sm">Carga Completada Exitosamente</h3>
                        <p className="text-xs text-emerald-700 mt-0.5">Se actualizó la estructura para el periodo {selectedPeriodo}</p>
                      </div>
                    </div>

                    {/* Desglose de Datos */}
                    <div className="border border-gray-150 rounded-2xl overflow-hidden bg-gray-50/20">
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-150">
                        <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">Resumen de registros procesados</h4>
                      </div>
                      <div className="p-4 space-y-3.5 text-xs text-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2 font-semibold">
                            <Building2 className="w-4 h-4 text-gray-500" /> Direcciones Territoriales:
                          </span>
                          <span className="font-bold text-gray-900 bg-white border px-2.5 py-1 rounded-lg">
                            {result.data?.seccionales?.creadas || 0} creadas, {result.data?.seccionales?.actualizadas || 0} actualizadas
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2 font-semibold">
                            <MapPin className="w-4 h-4 text-gray-500" /> CETAPs (Sedes):
                          </span>
                          <span className="font-bold text-gray-900 bg-white border px-2.5 py-1 rounded-lg">
                            {result.data?.sedes?.creadas || 0} creadas, {result.data?.sedes?.actualizadas || 0} actualizadas
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="flex items-center gap-2 font-semibold">
                            <Check className="w-4 h-4 text-emerald-600" /> CETAPs Activadas en Periodo:
                          </span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            {result.data?.periodo?.totalOfertasActivas || 0} ofertas activadas
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Warnings (if any) */}
                    {result.data?.warnings && result.data.warnings.length > 0 && (
                      <div className="border border-amber-200 rounded-2xl bg-amber-50/20 overflow-hidden">
                        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-150 flex items-center gap-1.5 text-amber-900">
                          <AlertCircle className="w-4 h-4" />
                          <h4 className="text-xs font-black uppercase tracking-wider">Advertencias de validación</h4>
                        </div>
                        <div className="p-3 max-h-36 overflow-y-auto text-xs font-mono text-amber-800 space-y-1 bg-white">
                          {result.data.warnings.map((w: string, idx: number) => (
                            <div key={idx} className="border-b border-amber-50 last:border-0 pb-1 last:pb-0">
                              ⚠️ {w}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={resetState}
                      className="w-full py-2.5 border-2 border-gray-250 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-bold transition-all"
                    >
                      Cargar otro archivo
                    </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              {!result && !error && (
                <div className="px-6 py-4 border-t border-gray-150 bg-gray-50/50 flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 h-10 border border-gray-300 bg-white text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors text-sm"
                    disabled={loading}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="flex-1 h-10 bg-[#003DA5] hover:bg-[#002d7a] text-white rounded-xl font-bold transition-colors text-sm flex items-center justify-center gap-2 shadow-sm"
                    disabled={loading}
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Procesar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
