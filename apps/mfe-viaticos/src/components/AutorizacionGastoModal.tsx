import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileCheck,
  FileSignature,
  FileText,
  LoaderCircle,
  MapPin,
  Plane,
  RotateCcw,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import { SolicitudAutorizacion } from '../types/viaticos';
import { formatearMoneda } from '../utils/viaticosUtils';

interface AutorizacionGastoModalProps {
  solicitud: SolicitudAutorizacion | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AutorizacionGastoModal: React.FC<AutorizacionGastoModalProps> = ({
  solicitud,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [observaciones, setObservaciones] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarConfirmacionDevolucion, setMostrarConfirmacionDevolucion] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [accionExitosa, setAccionExitosa] = useState<string | null>(null);

  if (!isOpen || !solicitud) return null;

  const estaAutorizada = solicitud.estadoSolicitud === 'AUTORIZADA';

  const handleAutorizar = async () => {
    setProcesando(true);
    setError(null);
    try {
      await viaticosService.autorizarComision(solicitud.id, observaciones);
      setAccionExitosa(
        'Comisión autorizada exitosamente. Se ha notificado al responsable de tiquetes y enviado el PDF del itinerario al comisionado y enlace.',
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Error al emitir la autorización corporativa.',
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleDevolver = async () => {
    if (!observaciones.trim() || observaciones.trim().length < 3) {
      setError('Las observaciones de devolución son obligatorias (mínimo 3 caracteres).');
      return;
    }
    setProcesando(true);
    setError(null);
    try {
      await viaticosService.devolverComisionAutorizacion(solicitud.id, observaciones);
      setAccionExitosa(
        'Comisión devuelta al analista con observaciones. Notificaciones enviadas.',
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Error al devolver la comisión.',
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleDescargarPdf = async () => {
    setDescargandoPdf(true);
    try {
      const blob = await viaticosService.descargarPdfTiqueteItinerario(solicitud.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Autorizacion-Itinerario-${solicitud.consecutivoUnico}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error descargando PDF:', err);
    } finally {
      setDescargandoPdf(false);
    }
  };

  const fechaInicioFormateada = new Date(solicitud.fechaInicio).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const fechaFinFormateada = new Date(solicitud.fechaFin).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const currentUser = typeof (authService as any).getCurrentUserSync === 'function'
    ? (authService as any).getCurrentUserSync()
    : null;

  const nombreSubdirector =
    solicitud.autorizadorNombre ||
    currentUser?.person?.full_name ||
    [currentUser?.person?.first_name, currentUser?.person?.last_name].filter(Boolean).join(' ') ||
    currentUser?.username ||
    'Subdirección de Gestión Corporativa';

  const fechaAutorizacionFormateada = solicitud.fechaAutorizacion
    ? new Date(solicitud.fechaAutorizacion).toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-autorizacion-titulo"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Cabecera institucional con Estilo Protegido (Garantiza fondo azul y contraste permanente) */}
        <div
          className="px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between shrink-0"
          style={{
            background: 'linear-gradient(135deg, #002266 0%, #003DA5 100%)',
            color: '#ffffff',
          }}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 border border-white/20">
              <FileCheck className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-100">
                  Autorización Corporativa
                </span>
                <span
                  style={
                    estaAutorizada
                      ? { backgroundColor: '#10B981', color: '#ffffff' }
                      : { backgroundColor: '#F59E0B', color: '#1E293B' }
                  }
                  className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full"
                >
                  {solicitud.estadoSolicitud}
                </span>
              </div>
              <h2 id="modal-autorizacion-titulo" className="text-lg sm:text-xl font-black text-white truncate drop-shadow-xs mt-0.5">
                Comisión {solicitud.consecutivoUnico}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/80 hover:bg-white/15 hover:text-white transition-colors cursor-pointer shrink-0 ml-2"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensaje de éxito / error */}
        {accionExitosa && (
          <div className="m-4 sm:m-6 rounded-xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-900 flex items-center space-x-3 shrink-0 text-xs sm:text-sm">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="font-semibold">{accionExitosa}</p>
          </div>
        )}

        {error && (
          <div className="m-4 sm:m-6 rounded-xl bg-red-50 border border-red-300 p-4 text-red-900 flex items-center space-x-3 shrink-0 text-xs sm:text-sm">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <p className="font-semibold">{error}</p>
          </div>
        )}

        {/* Cuerpo del modal con scroll interno suave */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* Tarjeta 1: Pasajero / Comisionado */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-2">
              <User className="h-4 w-4 text-slate-400" />
              <span>1. Datos del Pasajero / Comisionado</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs sm:text-sm">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Nombre Completo:</span>
                <span className="font-bold text-slate-900">
                  {solicitud.comisionado?.nombreCompleto || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Documento de Identidad:</span>
                <span className="font-bold text-slate-900">
                  {solicitud.comisionado?.numeroDocumento || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Correo Electrónico:</span>
                <span className="font-medium text-slate-700 break-all">
                  {solicitud.comisionado?.email || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Itinerario y Objeto */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-2">
              <MapPin className="h-4 w-4 text-slate-400" />
              <span>2. Itinerario y Objeto de la Comisión</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs sm:text-sm mb-3">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Destino:</span>
                <span className="font-bold text-slate-900">
                  {solicitud.destinoCiudad}, {solicitud.destinoDepartamento}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Fechas del Viaje:</span>
                <span className="font-bold text-slate-900">
                  {fechaInicioFormateada} — {fechaFinFormateada} ({solicitud.diasComision} día(s))
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-semibold block">Modalidad de Transporte:</span>
                <span className="inline-flex items-center space-x-1 font-bold text-slate-900">
                  {solicitud.requiereTiquetes ? (
                    <>
                      <Plane className="h-4 w-4 text-sky-600 inline" />
                      <span className="text-sky-800">Aéreo (Requiere Tiquetes)</span>
                    </>
                  ) : (
                    <span>Terrestre</span>
                  )}
                </span>
              </div>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-semibold block mb-1">Objeto / Justificación:</span>
              <p className="text-slate-800 bg-white p-3 rounded-xl border border-slate-200 text-xs leading-relaxed font-normal">
                {solicitud.objetoComision}
              </p>
            </div>
          </div>

          {/* Tarjeta 3: Liquidación Financiera */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-slate-400" />
              <span>3. Liquidación Financiera y Rubro Presupuestal</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs sm:text-sm">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Monto Viáticos:</span>
                <span className="font-bold text-slate-900">
                  {formatearMoneda(solicitud.montoViaticos)}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[11px] text-slate-400 font-semibold block">Gastos de Viaje:</span>
                <span className="font-bold text-slate-900">
                  {formatearMoneda(solicitud.montoGastosViaje)}
                </span>
              </div>
              {solicitud.requiereTiquetes && (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <span className="text-[11px] text-slate-400 font-semibold block">Costo Estimado Tiquete:</span>
                  <span className="font-bold text-sky-800">
                    {formatearMoneda(solicitud.costoEstimadoTiquete || 0)}
                  </span>
                </div>
              )}
              <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200">
                <span className="text-[11px] text-[#003DA5] font-bold block">TOTAL AUTORIZADO:</span>
                <span className="text-base sm:text-lg font-black text-[#003DA5]">
                  {formatearMoneda(solicitud.montoTotal)}
                </span>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-700">Rubro Presupuestal: </span>
              <span className="font-mono text-slate-800">{solicitud.rubroPresupuestal || 'No especificado'}</span>
            </div>
          </div>

          {/* Tarjeta 4: Soportes y Trazabilidad */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span>4. Soportes y Documentos del Expediente</span>
              </h3>
              <button
                type="button"
                onClick={handleDescargarPdf}
                disabled={descargandoPdf}
                style={{ backgroundColor: '#EEF2FF', color: '#003DA5', borderColor: '#C7D2FE' }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all shadow-2xs hover:bg-blue-100 cursor-pointer w-fit"
              >
                {descargandoPdf ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>Descargar PDF Itinerario Oficial</span>
              </button>
            </div>
            {solicitud.documentosSoporte && solicitud.documentosSoporte.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {solicitud.documentosSoporte.map((doc, idx) => (
                  <div
                    key={doc.id || idx}
                    className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200 text-xs"
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileText className="h-4 w-4 text-[#003DA5] shrink-0" />
                      <span className="font-semibold text-slate-800 truncate">
                        {doc.tipoDocumento} — {doc.nombreArchivoOriginal || 'Documento adjunto'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">No hay documentos de soporte adjuntos.</p>
            )}
          </div>

          {/* Tarjeta 5: Apartado de Firma del Subdirector y Aprobación */}
          {estaAutorizada && (
            <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 p-4 sm:p-5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200">
                <div className="flex items-center space-x-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-950">
                      5. Apartado de Firma y Visto Bueno del Subdirector
                    </h3>
                    <p className="text-[11px] text-emerald-700">
                      Autorización corporativa de gasto e itinerario oficial
                    </p>
                  </div>
                </div>

                {/* Sello de APROBADO */}
                <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-black text-xs shadow-xs tracking-wider uppercase self-start sm:self-auto">
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  <span>APROBADO</span>
                </div>
              </div>

              {/* Contenido de la firma */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
                {/* Visual Digital Signature Card */}
                <div className="md:col-span-7 bg-white rounded-xl border border-emerald-200 p-4 shadow-2xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider flex items-center gap-1.5">
                        <FileSignature className="h-3.5 w-3.5 text-emerald-600" />
                        Firma Digital del Subdirector
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ESTADO: APROBADO
                      </span>
                    </div>

                    <div className="mt-3 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                        Nombre del Subdirector
                      </span>
                      <p className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                        {nombreSubdirector}
                      </p>
                      <p className="text-xs font-semibold text-slate-700">
                        Subdirector(a) de Gestión Corporativa
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Escuela Superior de Administración Pública - ESAP
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1.5">
                    <span>
                      <strong className="text-slate-700">Fecha de Aprobación: </strong>
                      {fechaAutorizacionFormateada}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Radicado: {solicitud.consecutivoUnico}
                    </span>
                  </div>
                </div>

                {/* Sello de Garantía y Trazabilidad */}
                <div className="md:col-span-5 bg-emerald-900/5 rounded-xl border border-emerald-200/80 p-4 text-xs flex flex-col justify-between space-y-2.5">
                  <div>
                    <div className="flex items-center space-x-1.5 text-emerald-900 font-bold text-[11px] mb-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-700 shrink-0" />
                      <span>Certificación Institucional</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      El itinerario y la asignación presupuestal fueron revisados y autorizados con firma digital corporativa en el sistema institucional de Viáticos ESAP.
                    </p>
                  </div>

                  {solicitud.observacionesAutorizacion ? (
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-200 text-[11px]">
                      <span className="font-bold text-emerald-900 block text-[10px] uppercase mb-0.5">
                        Observaciones del Subdirector:
                      </span>
                      <p className="text-slate-700 italic">
                        "{solicitud.observacionesAutorizacion}"
                      </p>
                    </div>
                  ) : (
                    <div className="text-[11px] text-emerald-800 italic bg-white/70 px-2.5 py-1.5 rounded-lg border border-emerald-100">
                      Aprobado con visto bueno institucional sin observaciones adicionales.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Formulario de Observaciones / Hallazgos */}
          {!estaAutorizada && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <label
                htmlFor="observaciones-autorizacion"
                className="text-[11px] font-bold uppercase tracking-wider text-slate-600 block mb-1.5"
              >
                {mostrarConfirmacionDevolucion ? (
                  <span className="text-red-700 flex items-center space-x-1">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Observaciones de devolución al analista (OBLIGATORIAS):</span>
                  </span>
                ) : (
                  <span>Observaciones de visto bueno institucional (Opcional):</span>
                )}
              </label>
              <textarea
                id="observaciones-autorizacion"
                rows={3}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder={
                  mostrarConfirmacionDevolucion
                    ? 'Escriba detalladamente los reparos o faltantes para que el analista subsane el expediente...'
                    : 'Indique alguna observación o directriz corporativa si lo considera pertinente...'
                }
                className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 bg-white focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100 outline-none leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* Acciones del pie de página adaptadas a móviles y escritorios */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 text-xs sm:text-sm font-semibold rounded-xl text-slate-700 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer text-center"
          >
            Cerrar
          </button>

          {!estaAutorizada && !mostrarConfirmacionDevolucion && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMostrarConfirmacionDevolucion(true)}
                disabled={procesando}
                style={{ backgroundColor: '#FEF2F2', color: '#B91C1C', borderColor: '#FECACA' }}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl border transition-colors cursor-pointer hover:bg-red-100"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Devolver con Reparos</span>
              </button>
              <button
                type="button"
                onClick={handleAutorizar}
                disabled={procesando}
                style={{ backgroundColor: '#059669', color: '#ffffff' }}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-2.5 text-xs sm:text-sm font-black rounded-xl shadow-xs transition-all hover:opacity-90 active:scale-95 cursor-pointer"
              >
                {procesando ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                )}
                <span>Autorizar Comisión (AUTORIZADA)</span>
              </button>
            </div>
          )}

          {!estaAutorizada && mostrarConfirmacionDevolucion && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setMostrarConfirmacionDevolucion(false)}
                disabled={procesando}
                className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer text-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDevolver}
                disabled={procesando || observaciones.trim().length < 3}
                style={{ backgroundColor: '#DC2626', color: '#ffffff' }}
                className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 text-xs sm:text-sm font-black rounded-xl shadow-xs disabled:opacity-50 transition-colors cursor-pointer"
              >
                {procesando ? (
                  <LoaderCircle className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <RotateCcw className="h-4 w-4 text-white" />
                )}
                <span>Confirmar Devolución al Analista</span>
              </button>
            </div>
          )}

          {estaAutorizada && (
            <div className="flex items-center justify-center sm:justify-start space-x-2 text-emerald-800 font-bold text-xs sm:text-sm bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 w-full sm:w-auto">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>Comisión con visto bueno corporativo vigente</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AutorizacionGastoModal;
