import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  AlertTriangle,
  FileText,
  UploadCloud,
  CheckCircle2,
  Receipt,
  Calendar,
  DollarSign,
  LoaderCircle,
  Eye,
  ShieldAlert,
  FileCheck2,
  Trash2,
  Info,
} from 'lucide-react';
import { SolicitudViatico } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';
import { formatearMoneda } from '../utils/viaticosUtils';

export interface RevocatoriaModalProps {
  solicitud: SolicitudViatico | null;
  abierto: boolean;
  modo?: 'ORDENADOR' | 'PRESUPUESTO';
  onCerrar: () => void;
  onExito: (solicitudActualizada: any) => void;
}

export default function RevocatoriaModal({
  solicitud,
  abierto,
  modo,
  onCerrar,
  onExito,
}: RevocatoriaModalProps) {
  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Determinar el modo activo (si no se pasa explícito, se deduce de la fase)
  const modoEfectivo = useMemo<'ORDENADOR' | 'PRESUPUESTO'>(() => {
    if (modo) return modo;
    const fase = solicitud?.procesoRevocatoria?.fase;
    if (fase === 'PENDIENTE_REDUCCION_PRESUPUESTO') {
      return 'PRESUPUESTO';
    }
    return 'ORDENADOR';
  }, [modo, solicitud?.procesoRevocatoria?.fase]);

  // Estados comunes
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados Modo ORDENADOR
  const [numeroActo, setNumeroActo] = useState('');
  const [fechaActo, setFechaActo] = useState(hoy);
  const [justificacion, setJustificacion] = useState('');
  const [archivoPdfReporte, setArchivoPdfReporte] = useState<File | null>(null);
  const [nombreArchivoReporte, setNombreArchivoReporte] = useState('');
  const [base64Reporte, setBase64Reporte] = useState<string>('');
  const inputReporteRef = useRef<HTMLInputElement>(null);

  // Estados Modo PRESUPUESTO
  const [numeroOperacionReduccion, setNumeroOperacionReduccion] = useState('');
  const [fechaReduccion, setFechaReduccion] = useState(hoy);
  const [valorReducido, setValorReducido] = useState<number>(0);
  const [observacionesPresupuesto, setObservacionesPresupuesto] = useState('');
  const [archivoPdfSoporte, setArchivoPdfSoporte] = useState<File | null>(null);
  const [nombreArchivoSoporte, setNombreArchivoSoporte] = useState('');
  const [base64Soporte, setBase64Soporte] = useState<string>('');
  const inputSoporteRef = useRef<HTMLInputElement>(null);

  // Tiene RP previo
  const tieneRpPrevio = useMemo(() => {
    if (!solicitud) return false;
    return Boolean(
      solicitud.procesoRevocatoria?.tieneRp ||
        solicitud.codigoRp ||
        solicitud.numeroRp ||
        Number(solicitud.valorComprometido || 0) > 0,
    );
  }, [solicitud]);

  const valorComprometidoSugerido = useMemo(() => {
    if (!solicitud) return 0;
    if (solicitud.procesoRevocatoria?.valorComprometido != null) {
      return Number(solicitud.procesoRevocatoria.valorComprometido);
    }
    if (solicitud.valorComprometido != null && Number(solicitud.valorComprometido) > 0) {
      return Number(solicitud.valorComprometido);
    }
    return Number(solicitud.montoTotal || solicitud.montoTotalEstimado || 0);
  }, [solicitud]);

  // Inicializar o resetear formulario al abrir
  useEffect(() => {
    if (!abierto || !solicitud) {
      setError(null);
      setGuardando(false);
      return;
    }

    setError(null);
    setGuardando(false);

    // Precarga para Ordenador
    setNumeroActo('');
    setFechaActo(hoy);
    setJustificacion(
      solicitud.procesoRevocatoria?.solicitadoPor?.motivo
        ? `Cancelación solicitada: ${solicitud.procesoRevocatoria.solicitadoPor.motivo}`
        : '',
    );
    setArchivoPdfReporte(null);
    setNombreArchivoReporte('');
    setBase64Reporte('');

    // Precarga para Presupuesto
    setNumeroOperacionReduccion('');
    setFechaReduccion(hoy);
    setValorReducido(valorComprometidoSugerido);
    setObservacionesPresupuesto('');
    setArchivoPdfSoporte(null);
    setNombreArchivoSoporte('');
    setBase64Soporte('');
  }, [abierto, solicitud, hoy, valorComprometidoSugerido]);

  // Manejo de archivo PDF para Ordenador
  const handleSeleccionarReportePdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('El reporte de SIIF Nación debe ser un archivo en formato PDF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo PDF no puede exceder los 10MB.');
      return;
    }

    setError(null);
    setArchivoPdfReporte(file);
    setNombreArchivoReporte(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setBase64Reporte(reader.result as string);
    };
    reader.onerror = () => {
      setError('Error al leer el archivo PDF seleccionado.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoverReporte = () => {
    setArchivoPdfReporte(null);
    setNombreArchivoReporte('');
    setBase64Reporte('');
    if (inputReporteRef.current) inputReporteRef.current.value = '';
  };

  // Manejo de archivo PDF para Presupuesto (opcional)
  const handleSeleccionarSoportePdf = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('El soporte de reducción debe ser un archivo en formato PDF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo soporte no puede exceder los 10MB.');
      return;
    }

    setError(null);
    setArchivoPdfSoporte(file);
    setNombreArchivoSoporte(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setBase64Soporte(reader.result as string);
    };
    reader.onerror = () => {
      setError('Error al leer el archivo de soporte.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoverSoporte = () => {
    setArchivoPdfSoporte(null);
    setNombreArchivoSoporte('');
    setBase64Soporte('');
    if (inputSoporteRef.current) inputSoporteRef.current.value = '';
  };

  // Abrir reporte SIIF en nueva pestaña
  const handleVerReporteSiif = () => {
    const url =
      solicitud?.procesoRevocatoria?.registroSiif?.reportePdfUrl;
    if (!url) return;

    if (url.startsWith('data:')) {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${url}" frameborder="0" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`,
        );
      }
    } else {
      window.open(url, '_blank');
    }
  };

  // Envío Ordenador
  const handleSubmitOrdenador = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitud) return;

    if (!numeroActo.trim()) {
      setError('Debe indicar el número de acto o consecutivo de la revocatoria en SIIF Nación.');
      return;
    }

    if (!fechaActo) {
      setError('Debe indicar la fecha del acto administrativo.');
      return;
    }

    if (!justificacion.trim() || justificacion.trim().length < 5) {
      setError('La justificación debe tener al menos 5 caracteres.');
      return;
    }

    if (!base64Reporte) {
      setError('Es obligatorio cargar en PDF el reporte de la revocatoria registrada en SIIF Nación.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const resp = await viaticosService.registrarRevocatoriaSiif(solicitud.id, {
        numeroActoRevocatoria: numeroActo.trim(),
        fechaActoRevocatoria: fechaActo,
        justificacion: justificacion.trim(),
        reporteRevocatoriaPdfBase64: base64Reporte,
        nombreArchivoPdf: nombreArchivoReporte || `Reporte_Revocatoria_SIIF_${solicitud.codigo || solicitud.id}.pdf`,
      });

      onExito(resp?.data || resp);
      onCerrar();
    } catch (err: any) {
      console.error('Error registrando revocatoria en SIIF:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Ocurrió un error al registrar la revocatoria en SIIF Nación.',
      );
    } finally {
      setGuardando(false);
    }
  };

  // Envío Presupuesto
  const handleSubmitPresupuesto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solicitud) return;

    if (!numeroOperacionReduccion.trim()) {
      setError('Debe indicar el número de operación de reducción en SIIF Nación.');
      return;
    }

    if (!fechaReduccion) {
      setError('Debe indicar la fecha de la reducción presupuestal.');
      return;
    }

    if (valorReducido <= 0) {
      setError('El valor a reducir debe ser mayor a $0.');
      return;
    }

    setGuardando(true);
    setError(null);

    try {
      const resp = await viaticosService.aplicarReduccionRpRevocatoria(solicitud.id, {
        numeroOperacionReduccion: numeroOperacionReduccion.trim(),
        fechaReduccion: fechaReduccion,
        valorReducido: Number(valorReducido),
        observaciones: observacionesPresupuesto.trim() || undefined,
        soporteReduccionPdfBase64: base64Soporte || undefined,
        nombreArchivoSoporte: nombreArchivoSoporte || undefined,
      });

      onExito(resp?.data || resp);
      onCerrar();
    } catch (err: any) {
      console.error('Error aplicando reducción de RP:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Ocurrió un error al aplicar la reducción de RP en SIIF Nación.',
      );
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto || !solicitud) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-revocatoria-titulo"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Encabezado */}
        <div
          className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{
            background:
              modoEfectivo === 'ORDENADOR'
                ? 'linear-gradient(135deg, #7c2d12 0%, #c2410c 100%)' // Tonalidad naranja/ámbar institucional
                : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', // Tonalidad slate ejecutiva para presupuesto
            color: '#ffffff',
          }}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 border border-white/20">
              {modoEfectivo === 'ORDENADOR' ? (
                <ShieldAlert className="h-5 w-5 text-amber-200" />
              ) : (
                <Receipt className="h-5 w-5 text-indigo-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  {modoEfectivo === 'ORDENADOR' ? 'Ordenador del Gasto' : 'Grupo de Presupuesto'}
                </span>
                <span className="text-xs text-white/70">·</span>
                <span className="text-xs text-white/90 font-medium">SIIF Nación</span>
              </div>
              <h2 id="modal-revocatoria-titulo" className="text-base sm:text-lg font-bold text-white truncate">
                {modoEfectivo === 'ORDENADOR'
                  ? 'Registro de Revocatoria en SIIF Nación'
                  : 'Reducción de RP por Revocatoria'}
              </h2>
              <p className="text-xs text-white/80 truncate">
                Comisión {solicitud.codigo || solicitud.consecutivoUnico} · {solicitud.nombreComisionado}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo del Modal con scroll */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Alerta de Error */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold">Atención: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Tarjeta de Resumen de la Comisión */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-medium">Destino / Itinerario:</span>
              <span className="font-semibold text-slate-800">{solicitud.ciudadDestino || 'Nacional'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span className="font-medium">Fechas de Comisión:</span>
              <span className="font-semibold text-slate-800">
                {solicitud.fechaInicio} al {solicitud.fechaFin}
              </span>
            </div>
            {tieneRpPrevio && (
              <div className="flex justify-between items-center text-indigo-900 bg-indigo-50/80 p-2 rounded-lg border border-indigo-100">
                <span className="font-semibold flex items-center gap-1">
                  <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                  Registro Presupuestal (RP):
                </span>
                <span className="font-bold font-mono">
                  {solicitud.codigoRp || solicitud.numeroRp || 'RP Expedido'} · {formatearMoneda(valorComprometidoSugerido)}
                </span>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* MODO ORDENADOR DEL GASTO */}
          {/* ======================================================== */}
          {modoEfectivo === 'ORDENADOR' && (
            <form onSubmit={handleSubmitOrdenador} className="space-y-4">
              {/* Contexto normativo */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start space-x-2.5">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">
                    Revocatoria de Comisión Autorizada en SIIF Nación
                  </p>
                  <p className="text-amber-800">
                    Al tratarse de una comisión que ya fue autorizada y cancelada por el jefe de dependencia,
                    debe registrarse el acto en SIIF Nación y adjuntar obligatoriamente el reporte oficial en PDF.
                  </p>
                  {tieneRpPrevio ? (
                    <p className="font-medium text-amber-900 pt-0.5">
                      ⚠️ Esta comisión tiene RP comprometido ({solicitud.codigoRp || solicitud.numeroRp}).
                      Al registrar este reporte se solicitará la reducción de recursos al Grupo de Presupuesto.
                    </p>
                  ) : (
                    <p className="font-medium text-emerald-800 pt-0.5">
                      ✓ Esta comisión no tiene RP expedido. Al radicar el reporte culminará directamente en estado REVOCADA.
                    </p>
                  )}
                </div>
              </div>

              {/* Fila: Número de Acto y Fecha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número de Acto / Consecutivo SIIF <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. ACT-REV-2026-0034"
                    value={numeroActo}
                    onChange={(e) => setNumeroActo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha del Acto Administrativo <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={fechaActo}
                      onChange={(e) => setFechaActo(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Justificación */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Justificación de la Revocatoria <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explique las razones administrativas o técnicas por las cuales se revoca la comisión en SIIF..."
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"
                />
              </div>

              {/* Carga obligatoria del PDF del Reporte SIIF */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reporte de Revocatoria en SIIF Nación (PDF) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  ref={inputReporteRef}
                  accept="application/pdf,.pdf"
                  onChange={handleSeleccionarReportePdf}
                  className="hidden"
                />

                {!archivoPdfReporte ? (
                  <button
                    type="button"
                    onClick={() => inputReporteRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 text-center cursor-pointer transition-colors group bg-slate-50/50 hover:bg-amber-50/20"
                  >
                    <UploadCloud className="w-6 h-6 text-slate-400 group-hover:text-amber-600 mx-auto mb-1.5 transition-colors" />
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-amber-800">
                      Seleccionar o arrastrar PDF del reporte SIIF Nación
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      Solo archivos en formato PDF (máx. 10MB)
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-amber-700 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-amber-900 truncate">
                          {nombreArchivoReporte}
                        </p>
                        <p className="text-[11px] text-amber-700">
                          {(archivoPdfReporte.size / 1024).toFixed(1)} KB · Documento cargado
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoverReporte}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Botón de acción */}
              <div className="pt-2 flex justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onCerrar}
                  disabled={guardando}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || !base64Reporte || !numeroActo.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-700 to-amber-800 hover:from-amber-800 hover:to-amber-900 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                >
                  {guardando ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      <span>Registrando en SIIF...</span>
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      <span>Registrar Revocatoria en SIIF</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ======================================================== */}
          {/* MODO GRUPO DE PRESUPUESTO */}
          {/* ======================================================== */}
          {modoEfectivo === 'PRESUPUESTO' && (
            <form onSubmit={handleSubmitPresupuesto} className="space-y-4">
              {/* Datos registrados por el Ordenador del Gasto */}
              <div className="p-4 bg-amber-50/60 border border-amber-200/90 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-700" />
                    Revocatoria Registrada en SIIF Nación por el Ordenador
                  </span>
                  {solicitud.procesoRevocatoria?.registroSiif?.reportePdfUrl && (
                    <button
                      type="button"
                      onClick={handleVerReporteSiif}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-amber-900 bg-white border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-700" />
                      <span>Ver Reporte SIIF (PDF)</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-500">Acto de Revocatoria: </span>
                    <span className="font-mono font-bold text-slate-900">
                      {solicitud.procesoRevocatoria?.registroSiif?.numeroActo || 'No especificado'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Fecha del Acto: </span>
                    <span className="font-medium text-slate-900">
                      {solicitud.procesoRevocatoria?.registroSiif?.fechaActo || 'No especificada'}
                    </span>
                  </div>
                </div>

                {solicitud.procesoRevocatoria?.registroSiif?.justificacion && (
                  <div className="text-xs text-slate-600 bg-white/70 p-2.5 rounded-lg border border-amber-200/50">
                    <span className="font-semibold text-slate-700">Justificación: </span>
                    {solicitud.procesoRevocatoria.registroSiif.justificacion}
                  </div>
                )}
              </div>

              {/* Datos de la Operación de Reducción */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    No. Operación Reducción SIIF <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. RED-RP-2026-081"
                    value={numeroOperacionReduccion}
                    onChange={(e) => setNumeroOperacionReduccion(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha de Reducción Presupuestal <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      value={fechaReduccion}
                      onChange={(e) => setFechaReduccion(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    />
                    <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Valor Reducido */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Monto a Reducir en el RP ($ COP) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-xs font-bold">$</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={valorReducido || ''}
                    onChange={(e) => setValorReducido(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono font-bold"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Por defecto se libera el saldo total comprometido en la comisión ({formatearMoneda(valorComprometidoSugerido)}).
                </p>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Observaciones de Presupuesto (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre la liberación de los recursos y rubro presupuestal..."
                  value={observacionesPresupuesto}
                  onChange={(e) => setObservacionesPresupuesto(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              {/* Carga opcional de soporte de reducción */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Soporte de Reducción en SIIF Nación (PDF Opcional)
                </label>
                <input
                  type="file"
                  ref={inputSoporteRef}
                  accept="application/pdf,.pdf"
                  onChange={handleSeleccionarSoportePdf}
                  className="hidden"
                />

                {!archivoPdfSoporte ? (
                  <button
                    type="button"
                    onClick={() => inputSoporteRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-xl p-3 text-center cursor-pointer transition-colors group bg-slate-50/50 hover:bg-indigo-50/20"
                  >
                    <UploadCloud className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 mx-auto mb-1 transition-colors" />
                    <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-800">
                      Cargar soporte de la operación de reducción (opcional)
                    </span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <FileText className="w-5 h-5 text-indigo-700 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-indigo-900 truncate">
                          {nombreArchivoSoporte}
                        </p>
                        <p className="text-[11px] text-indigo-700">
                          {(archivoPdfSoporte.size / 1024).toFixed(1)} KB · Soporte adjunto
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoverSoporte}
                      className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar archivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="pt-2 flex justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onCerrar}
                  disabled={guardando}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando || !numeroOperacionReduccion.trim() || valorReducido <= 0}
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-700 to-indigo-800 hover:from-indigo-800 hover:to-indigo-900 rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center space-x-2 cursor-pointer"
                >
                  {guardando ? (
                    <>
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                      <span>Aplicando Reducción...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aplicar Reducción y Revocar</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
