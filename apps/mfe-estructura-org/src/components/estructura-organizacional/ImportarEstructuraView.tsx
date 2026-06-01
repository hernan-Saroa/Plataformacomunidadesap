import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Upload, AlertTriangle, CheckCircle, Loader2, Building,
  Layers, Info, ArrowLeft, Database, Check, AlertCircle,
  Plus, X, Download, FileSpreadsheet, MapPin, CheckCircle2,
  Search, ChevronRight
} from 'lucide-react';
import { Card, Badge } from '@esap-mfe/shared-ui';
import { toast } from 'sonner';
import { estructuraService } from '../../services/estructuraService';
import * as XLSX from 'xlsx';

interface ImportarEstructuraViewProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function ImportarEstructuraView({ onBack, onSuccess }: ImportarEstructuraViewProps) {
  const [file, setFile] = useState<File | null>(null);
  const [fileStats, setFileStats] = useState<{ total: number; valid: number; errors: number; type: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Estados de Importación
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isSimulated, setIsSimulated] = useState(false);
  
  // States for Master-Detail Explorer
  const [selectedDtCode, setSelectedDtCode] = useState<string | null>(null); // null = Global
  const [searchTerm, setSearchTerm] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const analyzeFile = (selectedFile: File) => {
    const isCsv = selectedFile.name.toLowerCase().endsWith('.csv');
    const type = isCsv ? 'CSV' : 'Excel';
    setFileStats({ total: 0, valid: 0, errors: 0, type }); // TODO: parser in FE is not needed, backend validates G1-G7
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
        analyzeFile(droppedFile);
        handleImportar(true, droppedFile);
      } else {
        toast.error('Archivo no soportado. Por favor suba archivos Excel o CSV');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      analyzeFile(selectedFile);
      handleImportar(true, selectedFile);
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
      ['CET-0288', 'Sede Central', 'sedecentral', 'SC', 'SEDE_CENTRAL', 'sede_central', '4,6486', '-74,0828', 'TRUE'],
      ['CET-0001', 'OTRO', 'otro', 'SC', 'SEDE_CENTRAL', 'otro', '', '', 'TRUE'],
      ['CET-0005', 'Amaga', 'amaga', 'DT-001', 'ANTIOQUIA', 'cetap', '', '', 'TRUE'],
    ]);
    XLSX.utils.book_append_sheet(wb, wsCetaps, 'CETAPS');

    XLSX.writeFile(wb, 'Plantilla_Estructura_Geografica.xlsx');
  };

  const handleImportar = async (dryRun: boolean = true, fileToImport?: File) => {
    const currentFile = fileToImport || file;
    if (!currentFile) return;

    setLoading(true);
    setError(null);
    setValidationErrors([]);
    
    // Si no es simulación, limpiamos el resultado para mostrar loader
    if (!dryRun) setResult(null);

    try {
      const res = await estructuraService.importarEstructura(currentFile, dryRun);
      
      setResult(res.data || res);
      setIsSimulated(dryRun);
      
      if (!dryRun) {
        toast.success('Estructura geográfica cargada exitosamente');
        onSuccess();
      }
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || 'Error al procesar el archivo.';
      setError(msg);
      
      const backendErrores = err.response?.data?.errores;
      if (backendErrores) {
        setValidationErrors(backendErrores);
      }
      
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const resetState = () => {
    setFile(null);
    setFileStats(null);
    setResult(null);
    setError(null);
    setValidationErrors([]);
    setIsSimulated(false);
    setSelectedDtCode(null);
    setSearchTerm('');
  };

  // Helper variables for Master-Detail
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

  const renderDataQualityTable = (errorsList: any[]) => (
    <div className="overflow-x-auto border border-red-200 rounded-xl mt-3 max-h-64 overflow-y-auto custom-scrollbar bg-white shadow-sm">
      <table className="w-full text-left text-xs whitespace-nowrap">
        <thead className="bg-red-50 sticky top-0 z-10 border-b border-red-100 shadow-sm">
          <tr>
            <th className="px-3 py-2.5 font-black text-red-900 uppercase tracking-wider">Ubicación</th>
            <th className="px-3 py-2.5 font-black text-red-900 uppercase tracking-wider">Columna</th>
            <th className="px-3 py-2.5 font-black text-red-900 uppercase tracking-wider">Dato Errado</th>
            <th className="px-3 py-2.5 font-black text-emerald-800 uppercase tracking-wider">Valor Sugerido / Esperado</th>
            <th className="px-3 py-2.5 font-black text-red-900 uppercase tracking-wider">Descripción del Error</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-red-100">
          {errorsList.map((err, idx) => {
            if (typeof err === 'string') {
              return (
                <tr key={idx} className="hover:bg-red-50/50">
                  <td colSpan={5} className="px-3 py-2 text-red-800 font-medium whitespace-normal">{err}</td>
                </tr>
              );
            }
            return (
              <tr key={idx} className="hover:bg-red-50/50 transition-colors">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50/50 font-bold">{err.hoja || 'Archivo'}</Badge>
                    {err.fila && <Badge variant="secondary" className="font-mono bg-gray-100 text-gray-600">Fila {err.fila}</Badge>}
                  </div>
                </td>
                <td className="px-3 py-2.5 font-mono text-gray-500 font-medium">{err.columna || '-'}</td>
                <td className="px-3 py-2.5">
                  {err.datoErrado ? (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md font-bold border border-red-200 line-through decoration-red-400/50">
                      {err.datoErrado}
                    </span>
                  ) : <span className="text-gray-400 italic">-</span>}
                </td>
                <td className="px-3 py-2.5">
                  {err.valorEsperado ? (
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-md font-bold border border-emerald-200 shadow-sm flex items-center gap-1 w-fit">
                      <CheckCircle2 className="w-3 h-3" /> {err.valorEsperado}
                    </span>
                  ) : <span className="text-gray-400 italic">-</span>}
                </td>
                <td className="px-3 py-2.5 text-red-700 font-bold whitespace-normal">{err.mensaje}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header premium */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-all mr-2 flex items-center justify-center border border-gray-200 bg-white"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-[#003DA5]" />
            Importar Estructura Geográfica (Territoriales y CETAPs)
          </h1>
          <p className="text-sm text-gray-600">
            Actualización masiva de 17 Direcciones Territoriales y 288 CETAPs
          </p>
        </div>
      </div>

      {!loading && !result && !error && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Panel de carga */}
          <div className="md:col-span-2 space-y-4">
            <Card className="p-6">
              <h3 className="font-black text-gray-900 text-base mb-4 flex items-center gap-2">
                <Upload className="w-5 h-5 text-[#003DA5]" />
                Subir Archivo Excel/CSV (.xlsx, .csv)
              </h3>

              <div className="flex items-center gap-4 mb-5 flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="text-xs font-bold text-[#003DA5] hover:underline ml-auto flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar Plantilla Excel
                </button>
              </div>

              {/* Drag-and-drop box */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-3 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-[#003DA5] bg-blue-50/50 scale-[0.99]'
                    : file
                    ? 'border-emerald-500 bg-emerald-50/10'
                    : 'border-gray-300 hover:border-[#003DA5] hover:bg-gray-50/50'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                />
                
                {file ? (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center border border-emerald-200 shadow-sm">
                      <FileSpreadsheet className="w-8 h-8" />
                    </div>
                    <p className="font-extrabold text-gray-900 text-sm max-w-md mx-auto truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Tamaño: {(file.size / 1024).toFixed(1)} KB — Listo para procesar
                    </p>
                    <div className="mt-4 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          resetState();
                        }}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all"
                      >
                        Remover y Cambiar Archivo
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 text-[#003DA5] rounded-full flex items-center justify-center border border-blue-100 shadow-sm">
                      <Database className="w-8 h-8" />
                    </div>
                    <p className="font-bold text-gray-800 text-sm">
                      Arrastra tu archivo aquí o haz clic para explorar
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Formatos soportados: Excel (.xlsx, .xls) o CSV. Tamaño máximo: 10 MB.
                    </p>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Columna Derecha */}
          <div className="space-y-6">
            <Card className="p-6 flex flex-col shadow-sm border border-[#003DA5]/20 bg-blue-50/30">
              <h3 className="font-black text-[#003DA5] text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#003DA5]" />
                Instrucciones
              </h3>
              <div className="space-y-3 text-sm text-gray-700">
                <p>1. Descargue la plantilla Excel.</p>
                <p>2. Llene las 17 Direcciones Territoriales y los 288 CETAPs.</p>
                <p>3. Use el botón <b>Simular</b> para validar el archivo sin afectar la base de datos (Validaciones G1-G7).</p>
                <p>4. Si la simulación es exitosa, proceda a <b>Procesar Importación</b>.</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Cargando progreso */}
      {loading && (
        <Card className="p-12 text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin mx-auto text-[#003DA5]" />
          <h3 className="font-black text-gray-900 text-sm uppercase tracking-wider">
            {isSimulated ? 'Simulando Estructura Geográfica' : 'Procesando Estructura Geográfica'}
          </h3>
          <p className="text-sm text-gray-600">
            {isSimulated ? 'Validando reglas G1-G7...' : 'Sincronizando Territoriales y CETAPs en la base de datos...'}
          </p>
          <div className="w-64 mx-auto h-2 bg-gray-200 rounded-full overflow-hidden relative">
            <div className="h-full bg-[#003DA5] animate-pulse w-full" />
          </div>
        </Card>
      )}

      {/* Error de carga bloqueante */}
      {error && !loading && (
        <Card className="border-l-4 border-l-red-600 bg-red-50 p-6 shadow-sm border border-red-200 space-y-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-5 h-5" />
            <h4 className="font-black text-sm uppercase tracking-wider">Error de {isSimulated ? 'simulación' : 'importación'}</h4>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed font-semibold">
            {isSimulated ? 'La validación falló. Corrija los errores e intente nuevamente:' : 'No se pudo procesar la importación debido al siguiente error:'}
          </p>
          
          {validationErrors.length > 0 ? (
            renderDataQualityTable(validationErrors)
          ) : (
            <div className="p-4 bg-white rounded-xl border border-red-200 font-mono text-xs text-red-950 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {error}
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={resetState}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all font-bold text-xs"
            >
              Cargar Otro Archivo
            </button>
            <button
              onClick={onBack}
              className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-bold text-xs"
            >
              Volver al Módulo
            </button>
          </div>
        </Card>
      )}

      {/* Exito y Master-Detail Layout */}
      {result && !error && !loading && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          
          {/* Banner Superior de Estado */}
          {result.success ? (
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
              {/* Decoration rings */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm border border-white/20">
                  <CheckCircle2 className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight drop-shadow-sm mb-1">Simulación Completada con Éxito</h3>
                  <p className="text-emerald-50 text-sm font-medium">
                    El archivo cumple con todas las reglas de validación (G1-G7) y está listo para ser importado.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 relative z-10 w-full sm:w-auto">
                <button
                  onClick={resetState}
                  className="flex-1 sm:flex-none px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-sm text-white rounded-xl transition-all font-bold text-sm"
                >
                  Cambiar Archivo
                </button>
                <button
                  onClick={() => handleImportar(false)}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-white text-teal-700 hover:bg-emerald-50 hover:shadow-md rounded-xl transition-all font-black text-sm shadow-sm"
                >
                  Procesar Importación
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-red-500 to-rose-600 rounded-2xl shadow-lg p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
              
              <div className="flex items-start sm:items-center gap-4 relative z-10">
                <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm border border-white/20 shrink-0">
                  <AlertCircle className="w-8 h-8 text-white drop-shadow-sm" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight drop-shadow-sm mb-1">La validación ha fallado</h3>
                  <p className="text-red-50 text-sm font-medium">
                    El archivo no cumple con todas las reglas. Revisa el análisis de calidad a continuación.
                  </p>
                </div>
              </div>
              <button
                onClick={resetState}
                className="w-full sm:w-auto px-5 py-2.5 bg-white text-red-600 hover:bg-red-50 rounded-xl transition-all font-black text-sm shadow-sm shrink-0"
              >
                Cargar Otro Archivo
              </button>
            </div>
          )}

          {/* Master-Detail Explorer */}
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* PANEL IZQUIERDO: Master (Territoriales) */}
            <div className="w-full md:w-1/3 bg-white border border-gray-200/60 rounded-2xl shadow-sm flex flex-col overflow-hidden sticky top-6">
              <div className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100 p-4 shrink-0">
                <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#003DA5]" />
                  Explorador de Territoriales
                </h3>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar territorial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#003DA5]/20 focus:border-[#003DA5] transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar max-h-[60vh] p-2">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setSelectedDtCode(null)}
                    className={`text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group relative overflow-hidden ${
                      selectedDtCode === null 
                        ? 'bg-[#003DA5] text-white shadow-md shadow-[#003DA5]/20 scale-[1.02] z-10' 
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {selectedDtCode === null && (
                      <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent pointer-events-none"></div>
                    )}
                    <div className="flex items-center gap-3 relative z-10">
                      <div className={`p-1.5 rounded-lg ${selectedDtCode === null ? 'bg-white/20' : 'bg-gray-100 text-[#003DA5]'}`}>
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-sm font-black tracking-tight">Resumen Global</span>
                        <span className={`block text-[10px] ${selectedDtCode === null ? 'text-blue-100' : 'text-gray-400'}`}>
                          Todas las territoriales
                        </span>
                      </div>
                    </div>
                    <ChevronRight className={`w-4 h-4 relative z-10 transition-transform ${selectedDtCode === null ? 'text-white translate-x-1' : 'text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5'}`} />
                  </button>

                  <div className="h-px bg-gray-100 my-2 mx-4"></div>

                  {filteredTerritoriales.map((dt: any, idx: number) => {
                    const isSelected = selectedDtCode === dt.codigo_dt;
                    const cetapCount = result.preview_cetaps.filter((c: any) => c.codigo_dt === dt.codigo_dt).length;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDtCode(dt.codigo_dt)}
                        className={`text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group relative overflow-hidden ${
                          isSelected 
                            ? 'bg-blue-50/80 border border-blue-100 text-[#003DA5] shadow-sm scale-[1.01] z-10' 
                            : 'hover:bg-gray-50/80 border border-transparent'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#003DA5] rounded-l-xl"></div>
                        )}
                        <div className="flex flex-col relative z-10 w-full pr-4">
                          <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#003DA5]' : 'text-gray-700'}`}>
                            {dt.nombre_dt}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-gray-500 bg-gray-100/80 px-1.5 rounded">{dt.codigo_dt}</span>
                            {!dt.activo && (
                              <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider">Inactivo</span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 relative z-10 shrink-0">
                          <span className={`text-xs font-black px-2 py-0.5 rounded-md ${isSelected ? 'bg-[#003DA5] text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>
                            {cetapCount}
                          </span>
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-[#003DA5] translate-x-0.5' : 'text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5'}`} />
                        </div>
                      </button>
                    );
                  })}
                  
                  {filteredTerritoriales.length === 0 && (
                    <div className="text-center p-4 text-xs text-gray-500">
                      No se encontraron territoriales
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PANEL DERECHO: Detalle (Análisis y Tablas) */}
            <div className="w-full md:w-2/3 flex flex-col gap-6">
                
                {/* Cabecera del Detalle */}
                <div className="bg-white/60 backdrop-blur-md border border-gray-200/60 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <MapPin className="w-32 h-32" />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 tracking-tight">
                      {activeTerritorial ? activeTerritorial.nombre_dt : 'Resumen Global de la Estructura'}
                    </h2>
                    <p className="text-sm text-gray-500 mt-1.5 font-medium">
                      {activeTerritorial 
                        ? `Código: ${activeTerritorial.codigo_dt} • ${activeTerritorial.activo ? 'Territorial Activa' : 'Territorial Inactiva'}`
                        : `¿Cómo quedará la estructura geográfica luego de importar este archivo?`
                      }
                    </p>
                  </div>
                  {activeTerritorial && (
                    <Badge variant={activeTerritorial.activo ? 'success' : 'destructive'} className="w-fit relative z-10 shadow-sm border border-black/5 px-3 py-1 font-bold">
                      {activeTerritorial.activo ? 'TERRITORIAL ACTIVA' : 'TERRITORIAL INACTIVA'}
                    </Badge>
                  )}
                </div>

                {/* Métricas del Detalle */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-gray-200/80 rounded-2xl p-5 bg-white shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -bottom-4 bg-gray-50 rounded-full p-6 transition-transform group-hover:scale-110">
                      <MapPin className="w-8 h-8 text-gray-200" />
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 mb-3 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      <span className="text-xs font-black uppercase tracking-widest">Total CETAPs</span>
                    </div>
                    <span className="text-4xl font-black text-gray-900 mt-auto relative z-10 tracking-tighter">{visibleCetaps.length}</span>
                  </div>
                  <div className="border border-emerald-200/80 rounded-2xl p-5 bg-gradient-to-br from-emerald-50 to-white shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -bottom-4 bg-emerald-100/50 rounded-full p-6 transition-transform group-hover:scale-110">
                      <CheckCircle2 className="w-8 h-8 text-emerald-200" />
                    </div>
                    <div className="flex items-center gap-2 text-emerald-600 mb-3 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-black uppercase tracking-widest">Activos</span>
                    </div>
                    <span className="text-4xl font-black text-emerald-700 mt-auto relative z-10 tracking-tighter">{countActiveCetaps}</span>
                  </div>
                  <div className="border border-rose-200/80 rounded-2xl p-5 bg-gradient-to-br from-rose-50 to-white shadow-sm flex flex-col relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute -right-4 -bottom-4 bg-rose-100/50 rounded-full p-6 transition-transform group-hover:scale-110">
                      <AlertCircle className="w-8 h-8 text-rose-200" />
                    </div>
                    <div className="flex items-center gap-2 text-rose-600 mb-3 relative z-10">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <span className="text-xs font-black uppercase tracking-widest">Inactivos</span>
                    </div>
                    <span className="text-4xl font-black text-rose-700 mt-auto relative z-10 tracking-tighter">{countInactiveCetaps}</span>
                  </div>
                </div>

                {/* Errores Globales (Solo en Resumen Global) */}
                {!activeTerritorial && result.success === false && result.errores && result.errores.length > 0 && (
                  <div className="bg-red-50/50 p-5 rounded-xl border border-red-200 shadow-sm flex flex-col">
                    <h4 className="font-black text-red-900 text-sm mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Análisis de Calidad de Datos ({result.errores.length} incidencias encontradas)
                    </h4>
                    {renderDataQualityTable(result.errores)}
                  </div>
                )}

                {/* Tabla de CETAPs */}
                <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm flex-1 flex flex-col overflow-hidden max-h-[50vh]">
                  <div className="bg-gray-50/80 backdrop-blur-sm border-b border-gray-100 px-5 py-4 flex items-center justify-between">
                    <h3 className="font-black text-gray-900 text-xs uppercase tracking-widest flex items-center gap-2">
                      <Layers className="w-4 h-4 text-gray-400" />
                      Detalle de Sedes (CETAPs)
                    </h3>
                  </div>
                  <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white sticky top-0 border-b border-gray-200 z-10 shadow-sm">
                        <tr>
                          <th className="px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Código</th>
                          <th className="px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Nombre</th>
                          {!activeTerritorial && <th className="px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Territorial</th>}
                          <th className="px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Tipo</th>
                          <th className="px-5 py-3.5 font-bold text-gray-500 text-xs uppercase tracking-wider">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {visibleCetaps.map((c: any, idx: number) => (
                          <tr key={idx} className="hover:bg-blue-50/30 transition-colors group">
                            <td className="px-5 py-3 font-mono text-xs text-gray-500 group-hover:text-blue-600 transition-colors">{c.codigo_cetap}</td>
                            <td className="px-5 py-3 font-bold text-gray-800">{c.nombre_cetap}</td>
                            {!activeTerritorial && <td className="px-5 py-3 font-mono text-xs text-gray-500">{c.codigo_dt}</td>}
                            <td className="px-5 py-3"><Badge variant="secondary" className="font-bold text-[10px] bg-gray-100 text-gray-600 uppercase tracking-widest">{c.tipo}</Badge></td>
                            <td className="px-5 py-3">
                              <Badge variant={c.activo ? 'success' : 'outline'} className={`font-bold text-[10px] uppercase tracking-widest ${!c.activo ? 'bg-gray-50 text-gray-400 border-gray-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                {c.activo ? 'ACTIVO' : 'INACTIVO'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {visibleCetaps.length === 0 && (
                          <tr>
                            <td colSpan={!activeTerritorial ? 5 : 4} className="px-5 py-16 text-center text-gray-400">
                              <div className="flex flex-col items-center gap-2">
                                <Layers className="w-8 h-8 text-gray-200" />
                                <p className="font-medium text-sm">No hay CETAPs asociados a esta selección.</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

    </div>
  );
}
