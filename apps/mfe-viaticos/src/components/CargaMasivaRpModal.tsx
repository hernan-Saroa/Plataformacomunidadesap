import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  FileText,
  FolderArchive,
  RefreshCw,
} from 'lucide-react';
import { ItemCargaMasivaRp, ResumenCargaMasivaRp } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';

export interface CargaMasivaRPModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: () => void;
}

interface FilaPrevia {
  fila: number;
  item: ItemCargaMasivaRp;
  esValida: boolean;
  error?: string;
}

export default function CargaMasivaRPModal({
  abierto,
  onCerrar,
  onExito,
}: CargaMasivaRPModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfsInputRef = useRef<HTMLInputElement>(null);

  // Archivo CSV/Excel
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [filasPrevias, setFilasPrevias] = useState<FilaPrevia[]>([]);

  // Paquete o grupo de soportes PDF
  const [archivosSoporte, setArchivosSoporte] = useState<File[]>([]);

  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState<ResumenCargaMasivaRp | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  if (!abierto) return null;

  const handleDescargarPlantilla = () => {
    const encabezados =
      'solicitud_consecutivo,numero_rp,fecha_rp,valor_comprometido,rubro,soporte_rp_nombre,observaciones\n';
    const ejemplos =
      'COM-2026-0001,12345,2026-09-16,1450000,C-2101-01,20260916_RP_12345.pdf,Carga lote SIIF 1\n' +
      'COM-2026-0002,12346,2026-09-16,2100000,C-2101-02,20260916_RP_12346.pdf,Carga lote SIIF 2\n';
    const blob = new Blob([encabezados + ejemplos], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Plantilla_Carga_Masiva_RP.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const validarFila = (
    item: ItemCargaMasivaRp,
    filaIndex: number,
  ): { esValida: boolean; error?: string } => {
    if (!item.consecutivoUnico && !item.solicitudId) {
      return { esValida: false, error: 'Falta consecutivo o ID de la comisión' };
    }
    if (!item.numeroRp || !item.numeroRp.trim()) {
      return { esValida: false, error: 'Falta número de RP' };
    }
    if (!item.fechaRp || !item.fechaRp.trim()) {
      return { esValida: false, error: 'Falta fecha de RP' };
    }
    if (isNaN(item.valorComprometido) || item.valorComprometido <= 0) {
      return { esValida: false, error: 'Monto debe ser mayor a 0' };
    }
    if (!item.rubro || !item.rubro.trim()) {
      return { esValida: false, error: 'Falta rubro presupuestal' };
    }
    return { esValida: true };
  };

  const parsearCsv = (contenido: string) => {
    const lineas = contenido
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lineas.length <= 1) {
      setErrorGeneral('El archivo CSV está vacío o solo contiene la cabecera.');
      return;
    }

    const cabeceras = lineas[0].split(',').map((c) => c.trim().toLowerCase().replace(/"/g, ''));

    const parsed: FilaPrevia[] = [];

    for (let i = 1; i < lineas.length; i++) {
      const valores = lineas[i].split(',').map((v) => v.trim().replace(/"/g, ''));
      const obj: any = {};
      cabeceras.forEach((col, idx) => {
        obj[col] = valores[idx] || '';
      });

      const item: ItemCargaMasivaRp = {
        consecutivoUnico:
          obj.solicitud_consecutivo ||
          obj.consecutivo_comision ||
          obj.consecutivounico ||
          obj.consecutivo ||
          '',
        solicitudId: obj.solicitud_id || obj.solicitudid || '',
        numeroRp: obj.numero_rp || obj.numerorp || '',
        fechaRp: obj.fecha_rp || obj.fecharp || '',
        valorComprometido: Number(
          obj.valor_comprometido || obj.valorcomprometido || obj.monto || 0,
        ),
        rubro: obj.rubro_presupuestal || obj.rubropresupuestal || obj.rubro || '',
        codigoRp: obj.codigo_rp || obj.codigorp || '',
        observaciones: obj.observaciones || '',
      };

      const validacion = validarFila(item, i);
      parsed.push({
        fila: i,
        item,
        esValida: validacion.esValida,
        error: validacion.error,
      });
    }

    setFilasPrevias(parsed);
  };

  const handleSeleccionarCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setNombreArchivo(file.name);
    setErrorGeneral(null);
    setResultado(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const texto = evt.target?.result as string;
      if (texto) {
        parsearCsv(texto);
      }
    };
    reader.onerror = () => {
      setErrorGeneral('Error al leer el archivo seleccionado.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleSeleccionarPdfs = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const lista = Array.from(files);
    setArchivosSoporte(lista);
  };

  const filasValidas = filasPrevias.filter((f) => f.esValida);

  const handleProcesar = async () => {
    if (filasValidas.length === 0) return;

    setProcesando(true);
    setErrorGeneral(null);

    try {
      const itemsPayload = filasValidas.map((f) => f.item);
      const res = await viaticosService.cargaMasivaRp(itemsPayload);
      setResultado(res);
      if (res.exitosos > 0) {
        onExito();
      }
    } catch (err: any) {
      console.error('Error en carga masiva:', err);
      setErrorGeneral(
        err?.response?.data?.message || err?.message || 'Error al procesar la carga masiva en el servidor.',
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Encabezado */}
        <div className="px-6 py-5 bg-gradient-to-r from-teal-900 via-emerald-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-white/10 rounded-2xl border border-white/20 backdrop-blur-sm">
              <UploadCloud className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  Etapa 7 · RF-PRE-001
                </span>
                <span className="text-xs text-emerald-300">Carga Masiva SIIF</span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                Carga Masiva de Registros Presupuestales (RP)
              </h3>
              <p className="text-xs text-emerald-200/80">
                Procesamiento transaccional de plantilla CSV/Excel y grupo de soportes PDF
              </p>
            </div>
          </div>

          <button
            onClick={onCerrar}
            disabled={procesando}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorGeneral && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error en la carga masiva</p>
                <p className="mt-0.5">{errorGeneral}</p>
              </div>
            </div>
          )}

          {/* Resumen del Lote Procesado */}
          {resultado && (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Resultado del Procesamiento Transaccional
                </h4>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  {resultado.exitosos} de {resultado.total} procesados
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <p className="text-slate-500 font-medium">Total Leídos</p>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{resultado.total}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-emerald-200">
                  <p className="text-emerald-700 font-medium">Comprometidas</p>
                  <p className="text-lg font-bold text-emerald-700 mt-0.5">{resultado.exitosos}</p>
                </div>
                <div className="p-3 bg-white rounded-xl border border-rose-200">
                  <p className="text-rose-700 font-medium">Con Error</p>
                  <p className="text-lg font-bold text-rose-700 mt-0.5">{resultado.fallidos}</p>
                </div>
              </div>

              {resultado.errores && resultado.errores.length > 0 && (
                <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-xs">
                  <p className="font-bold text-rose-800">Detalle de Inconsistencias:</p>
                  {resultado.errores.map((err, i) => (
                    <p key={i} className="text-rose-700 text-[11px]">
                      • Fila {err.fila} ({err.identificador}): {err.error}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Área 1: Plantilla CSV / Excel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                  <span className="text-xs font-bold text-slate-800">1. Plantilla Oficial CSV/Excel</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Descarga el formato oficial con las columnas requeridas para cargar el lote de RPs.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDescargarPlantilla}
                className="mt-3 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-all"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Descargar Plantilla CSV</span>
              </button>
            </div>

            {/* Dropzone CSV */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-5 border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white rounded-2xl text-center cursor-pointer transition-all hover:bg-emerald-50/20 group flex flex-col items-center justify-center"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleSeleccionarCsv}
                accept=".csv,text/csv"
                className="hidden"
              />
              <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              <p className="text-xs font-bold text-slate-800 mt-2">
                {nombreArchivo ? nombreArchivo : 'Haz clic para seleccionar o arrastrar archivo CSV'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {nombreArchivo ? 'Archivo cargado. Revisa la previsualización abajo.' : 'Formato delimitado por comas (.csv)'}
              </p>
            </div>
          </div>

          {/* Área 2: Contenedor Multi-Archivo para PDFs o Carpeta Comprimida */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FolderArchive className="w-5 h-5 text-indigo-700" />
                <span className="text-xs font-bold text-slate-800">
                  2. Contenedor de Soportes (PDFs o Carpeta Comprimida ZIP)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Opcional / Carga masiva
              </span>
            </div>

            <input
              type="file"
              ref={pdfsInputRef}
              onChange={handleSeleccionarPdfs}
              accept=".pdf,.zip,.rar"
              multiple
              className="hidden"
            />

            <div
              onClick={() => pdfsInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-white p-4 rounded-xl text-center cursor-pointer transition-all hover:bg-indigo-50/20 group"
            >
              <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mx-auto transition-colors" />
              <p className="text-xs font-bold text-slate-700 mt-1">
                {archivosSoporte.length > 0
                  ? `${archivosSoporte.length} archivos de soporte seleccionados`
                  : 'Adjuntar grupo de PDFs o archivo .ZIP con los soportes'}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Permite asociar masivamente los soportes bajo la nomenclatura Fecha_RP_Número.pdf
              </p>
            </div>

            {archivosSoporte.length > 0 && (
              <div className="max-h-24 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 text-[11px]">
                {archivosSoporte.map((f, idx) => (
                  <div key={idx} className="py-1 flex items-center justify-between text-slate-600">
                    <span className="font-mono truncate max-w-[280px]">{f.name}</span>
                    <span className="text-slate-400">{(f.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabla de Previsualización */}
          {filasPrevias.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Previsualización del Lote ({filasValidas.length} válidos de {filasPrevias.length})
                </span>
                {filasValidas.length !== filasPrevias.length && (
                  <span className="text-[11px] text-amber-700 font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    <span>Se omitirán las filas con error</span>
                  </span>
                )}
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Fila</th>
                      <th className="px-3 py-2">Comisión</th>
                      <th className="px-3 py-2">RP #</th>
                      <th className="px-3 py-2">Fecha</th>
                      <th className="px-3 py-2">Valor</th>
                      <th className="px-3 py-2">Rubro</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filasPrevias.map((f) => (
                      <tr key={f.fila} className={f.esValida ? 'hover:bg-slate-50' : 'bg-rose-50/50'}>
                        <td className="px-3 py-1.5 font-bold text-slate-600">{f.fila}</td>
                        <td className="px-3 py-1.5 font-bold text-slate-800">
                          {f.item.consecutivoUnico || f.item.solicitudId}
                        </td>
                        <td className="px-3 py-1.5 font-mono">{f.item.numeroRp}</td>
                        <td className="px-3 py-1.5 font-mono">{f.item.fechaRp}</td>
                        <td className="px-3 py-1.5 font-mono">${f.item.valorComprometido.toLocaleString('es-CO')}</td>
                        <td className="px-3 py-1.5 font-mono">{f.item.rubro}</td>
                        <td className="px-3 py-1.5">
                          {f.esValida ? (
                            <span className="text-emerald-700 font-bold">Válido</span>
                          ) : (
                            <span className="text-rose-600 font-semibold" title={f.error}>
                              {f.error}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer con Acciones */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {filasValidas.length > 0
              ? `${filasValidas.length} comisiones listas para comprometer.`
              : 'Selecciona una plantilla CSV para procesar.'}
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onCerrar}
              disabled={procesando}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleProcesar}
              disabled={filasValidas.length === 0 || procesando}
              style={
                filasValidas.length === 0 || procesando
                  ? { backgroundColor: '#94a3b8', color: '#ffffff' }
                  : { backgroundColor: '#047857', color: '#ffffff' }
              }
              className="px-5 py-2.5 font-bold text-xs rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span className="text-white">{procesando ? 'Procesando Lote...' : 'Procesar Carga Masiva'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
