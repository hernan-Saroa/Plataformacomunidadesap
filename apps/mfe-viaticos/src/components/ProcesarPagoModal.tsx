import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Calendar,
  DollarSign,
  FileText,
  BadgeDollarSign,
  Landmark,
  ExternalLink,
  Building2,
  User,
  ShieldCheck,
  Receipt,
  FileCheck,
  UploadCloud,
  FileUp,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { SolicitudListaResponse, ProcesarPagoDto } from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';
import { formatearMoneda } from '../utils/viaticosUtils';

interface ProcesarPagoModalProps {
  abierta?: boolean;
  isOpen?: boolean;
  solicitud: SolicitudListaResponse | any | null;
  onCerrar?: () => void;
  onClose?: () => void;
  onExito?: (solicitudActualizada: any) => void;
  onSuccess?: (solicitudActualizada: any) => void;
}

const formatearTamano = (bytes: number): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export default function ProcesarPagoModal({
  abierta,
  isOpen,
  solicitud,
  onCerrar,
  onClose,
  onExito,
  onSuccess,
}: ProcesarPagoModalProps) {
  const modalAbierta = Boolean(abierta || isOpen);
  const handleCerrar = onCerrar || onClose || (() => {});
  const handleExito = onExito || onSuccess || (() => {});

  const [fechaPago, setFechaPago] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [valorPagado, setValorPagado] = useState<number>(0);
  const [numeroOrdenPago, setNumeroOrdenPago] = useState('');
  const [soportePagoPath, setSoportePagoPath] = useState('');
  const [archivoSoporte, setArchivoSoporte] = useState<File | null>(null);
  const [esArrastrando, setEsArrastrando] = useState(false);
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (solicitud) {
      const valorBase =
        solicitud.valorPagado != null && solicitud.valorPagado > 0
          ? Number(solicitud.valorPagado)
          : solicitud.valorObligacion != null && solicitud.valorObligacion > 0
            ? Number(solicitud.valorObligacion)
            : solicitud.valorComprometido != null && solicitud.valorComprometido > 0
              ? Number(solicitud.valorComprometido)
              : Number(solicitud.montoViaticos || 0) + Number(solicitud.montoGastosViaje || 0);

      setValorPagado(valorBase);
      setFechaPago(
        solicitud.fechaPago
          ? String(solicitud.fechaPago).split('T')[0]
          : new Date().toISOString().split('T')[0],
      );
      setNumeroOrdenPago(solicitud.numeroOrdenPago || '');
      setSoportePagoPath(solicitud.soportePagoPath || '');
      setArchivoSoporte(null);
      setObservaciones(solicitud.observacionesPago || '');
      setError(null);
    }
  }, [solicitud, modalAbierta]);

  if (!modalAbierta || !solicitud) return null;

  const codigoRp = solicitud.codigoRp || solicitud.numeroRp || 'RP-N/A';
  const numObligacion = solicitud.numeroObligacion || 'OBL-N/A';
  const modalidad = solicitud.modalidadPago || 'AVANCE';
  const esAvance = modalidad === 'AVANCE';

  const nombreComisionado = solicitud.comisionado
    ? `${solicitud.comisionado.primerNombre || ''} ${solicitud.comisionado.primerApellido || ''}`.trim()
    : 'Funcionario comisionado';

  const validarYEstablecerArchivo = (file: File) => {
    setError(null);
    const nombre = file.name.toLowerCase();
    const esValido =
      file.type === 'application/pdf' ||
      file.type.startsWith('image/') ||
      nombre.endsWith('.pdf') ||
      nombre.endsWith('.png') ||
      nombre.endsWith('.jpg') ||
      nombre.endsWith('.jpeg') ||
      nombre.endsWith('.webp');

    if (!esValido) {
      setError(
        `El archivo '${file.name}' no tiene un formato válido. Solo se admiten documentos PDF o imágenes (PNG, JPG).`,
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError(`El archivo '${file.name}' excede el límite de 25 MB.`);
      return;
    }

    setArchivoSoporte(file);
  };

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validarYEstablecerArchivo(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setEsArrastrando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validarYEstablecerArchivo(file);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setError(null);

    if (!fechaPago || !String(fechaPago).trim()) {
      setError('Por favor seleccione la fecha en la que se efectuó el pago o desembolso.');
      return;
    }

    if (valorPagado <= 0) {
      setError('El valor pagado debe ser un monto positivo mayor a cero.');
      return;
    }

    setGuardando(true);
    try {
      let rutaSoporteFinal = soportePagoPath;

      // Cargar archivo físico al storage del backend si se seleccionó uno nuevo
      if (archivoSoporte) {
        const uploadRes = await viaticosService.subirSoportePago(solicitud.id, archivoSoporte);
        rutaSoporteFinal =
          uploadRes?.urlRepositorio ||
          uploadRes?.data?.urlRepositorio ||
          uploadRes?.nombreArchivoSeguro ||
          `/uploads/${solicitud.id}/${archivoSoporte.name}`;
      }

      const payload: ProcesarPagoDto = {
        fechaPago,
        valorPagado: Number(valorPagado),
        numeroOrdenPago: numeroOrdenPago.trim() || undefined,
        soportePagoPath: rutaSoporteFinal ? String(rutaSoporteFinal).trim() : undefined,
        observacionesPago: observaciones.trim() || undefined,
        modalidadPago: modalidad as 'AVANCE' | 'RECONOCIMIENTO_POSTERIOR',
      };

      const resp = await viaticosService.procesarPago(solicitud.id, payload);
      const resultado = resp?.data || resp || {
        ...solicitud,
        estadoSolicitud: 'PAGADA',
        ...payload,
      };

      handleExito(resultado);
      handleCerrar();
    } catch (err: any) {
      console.error('Error al procesar pago en Tesorería:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Error al procesar el pago en el sistema. Intente nuevamente.',
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-pago-title"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera institucional con gradiente esmeralda seguro */}
        <div
          style={{
            background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
            color: '#ffffff',
          }}
          className="bg-emerald-900 px-6 py-5 text-white"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/15 rounded-xl backdrop-blur-md border border-white/30 text-white shadow-sm">
                <BadgeDollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-black/30 text-emerald-100 border border-emerald-300/40">
                  Etapa 8 — Tesorería y Desembolso (RF-PAG-003)
                </span>
                <h3 id="modal-pago-title" className="text-lg font-bold text-white mt-1">
                  Procesar Desembolso y Pago de Comisión
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Registrar orden de pago en SIIF Nación y dejar la comisión en estado PAGADA
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCerrar}
              disabled={guardando}
              className="p-1.5 rounded-lg text-white/90 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tarjeta resumen de la comisión */}
        <div className="p-6 space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Expediente de Comisión
              </span>
              <span className="text-sm font-black text-slate-900 dark:text-white font-mono">
                {solicitud.consecutivoUnico || solicitud.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="truncate">
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Comisionado</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{nombreComisionado}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Registro Presupuestal (RP)</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{codigoRp}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Obligación SIIF</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">{numObligacion}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Modalidad Presupuestal</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {esAvance ? 'AVANCE (Desembolso Previo)' : 'RECONOCIMIENTO POSTERIOR'}
                  </span>
                </div>
              </div>
            </div>

            {/* Resumen de Valores Financieros */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Obligado</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 text-xs">
                  {solicitud.valorObligacion != null ? formatearMoneda(solicitud.valorObligacion) : 'N/A'}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Comprometido (RP)</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {solicitud.valorComprometido != null ? formatearMoneda(solicitud.valorComprometido) : 'N/A'}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/80 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Viáticos Calculados</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {formatearMoneda(Number(solicitud.montoViaticos || 0) + Number(solicitud.montoGastosViaje || 0))}
                </span>
              </div>
            </div>
          </div>

          {/* Formulario de Pago */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                role="alert"
                className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Fecha de pago */}
              <div>
                <label
                  htmlFor="fechaPago"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Fecha de Desembolso / Pago <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="date"
                    id="fechaPago"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white font-mono"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Fecha efectiva de pago en SIIF Nación o transferencia
                </span>
              </div>

              {/* Valor pagado (Campo Monetario) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="valorPagado"
                    className="block text-xs font-bold text-slate-700 dark:text-slate-300"
                  >
                    Valor Pagado (COP) <span className="text-rose-500">*</span>
                  </label>
                  {solicitud.valorObligacion != null && Number(solicitud.valorObligacion) > 0 && valorPagado !== Number(solicitud.valorObligacion) && (
                    <button
                      type="button"
                      onClick={() => setValorPagado(Number(solicitud.valorObligacion))}
                      className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                    >
                      Usar valor obligado ({formatearMoneda(solicitud.valorObligacion)})
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm pointer-events-none">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    id="valorPagado"
                    required
                    disabled={guardando}
                    value={
                      valorPagado
                        ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valorPagado)
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setValorPagado(raw ? parseInt(raw, 10) : 0);
                    }}
                    placeholder="0"
                    className="w-full pl-8 pr-3 py-2 text-sm font-semibold font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white"
                  />
                </div>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  {valorPagado > 0
                    ? `Monto oficial a desembolsar: $ ${new Intl.NumberFormat('es-CO').format(valorPagado)} COP`
                    : 'Ingrese el monto oficial desembolsado'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Número de Orden de Pago SIIF */}
              <div>
                <label
                  htmlFor="numeroOrdenPago"
                  className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Nº Orden de Pago / Egreso SIIF
                </label>
                <input
                  type="text"
                  id="numeroOrdenPago"
                  value={numeroOrdenPago}
                  onChange={(e) => setNumeroOrdenPago(e.target.value)}
                  placeholder="OP-SIIF-2026-98124"
                  maxLength={100}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white uppercase font-mono"
                />
                <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                  Identificador oficial de la orden de pago o egreso expedida en SIIF
                </span>
              </div>

              {/* Carga de Soporte de Desembolso (PDF o Imagen) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Soporte del Desembolso / Comprobante Bancario</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">PDF, PNG, JPG (máx. 25MB)</span>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  id="soporte-pago-file-input"
                  aria-label="Cargar soporte de desembolso"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleSeleccionarArchivo}
                  className="hidden"
                />

                {archivoSoporte ? (
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                          {archivoSoporte.name}
                        </p>
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5 mt-0.5">
                          <span>{formatearTamano(archivoSoporte.size)}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Listo para cargar al proyecto
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setArchivoSoporte(null);
                          if (fileInputRef.current) fileInputRef.current.value = '';
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Quitar archivo"
                        aria-label="Quitar archivo seleccionado"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : soportePagoPath ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-900 dark:text-white font-mono truncate">
                          {soportePagoPath.split('/').pop() || 'Comprobante registrado'}
                        </p>
                        <a
                          href={viaticosService.obtenerUrlArchivo(soportePagoPath)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold mt-0.5"
                        >
                          <span>Ver comprobante registrado</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 rounded-lg transition-colors cursor-pointer"
                    >
                      Reemplazar comprobante
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setEsArrastrando(true);
                    }}
                    onDragLeave={() => setEsArrastrando(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      esArrastrando
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <UploadCloud className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Haga clic o arrastre aquí el comprobante de desembolso
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Comprobante bancario de pago o transferencia (PDF, PNG o JPG)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label
                htmlFor="observaciones"
                className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1"
              >
                Observaciones del Desembolso
              </label>
              <textarea
                id="observaciones"
                rows={2}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Detalle o notas de la transferencia interbancaria..."
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 dark:text-white resize-none"
              />
            </div>

            {/* Banner explicativo del estado resultante */}
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="text-xs text-emerald-900 dark:text-emerald-200">
                <span className="font-bold">Estado resultante: PAGADA.</span> El registro del desembolso
                asentará la fecha y soporte en la trazabilidad inmutable del expediente y notificará al
                comisionado y analista asignado.
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCerrar}
                disabled={guardando}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={guardando}
                style={{ backgroundColor: '#059669', color: '#ffffff' }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
              >
                {guardando ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Procesando pago...</span>
                  </>
                ) : (
                  <>
                    <BadgeDollarSign className="w-4 h-4 text-white" />
                    <span>Confirmar Desembolso y Pago</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
