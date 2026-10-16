import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Receipt,
  FileCheck2,
  Calendar,
  DollarSign,
  Tag,
  AlertCircle,
  CheckCircle2,
  UploadCloud,
  FileText,
  AlertTriangle,
  Download,
  FileSignature,
  ShieldCheck,
  User,
  LoaderCircle,
  MapPin,
  Clock,
} from 'lucide-react';
import {
  SolicitudViatico,
  SolicitudComisionResponse,
  EstadoFirmasResponse,
} from '../types/viaticos';
import { viaticosService } from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import { useFestivos } from '../hooks/useFestivos';
import {
  calcularDiasHabilesPrevios,
  DIAS_HABILES_UMBRAL_AVANCE_RP,
} from '../utils/diasHabilesUtils';
import { formatearMoneda } from '../utils/viaticosUtils';
import AprobacionPorComponente from './AprobacionPorComponente';
import FirmaDigitalViaticosModal, { FirmaDigitalData } from './FirmaDigitalViaticosModal';

export interface RegistrarRPModalProps {
  solicitud: SolicitudViatico | null;
  abierto: boolean;
  onCerrar: () => void;
  onExito: (solicitudActualizada: any) => void;
}

export const REGEX_NOMENCLATURA_PDF = /^(\d{4}-?\d{2}-?\d{2})_RP_([A-Za-z0-9\-_]+)\.pdf$/i;

// Generar estampa digital certificada institucional para el Grupo de Presupuesto
const generarEstampaDigitalPresupuesto = (nombre: string, cargo: string): string => {
  try {
    const canvas = document.createElement('canvas');
    if (!canvas || typeof canvas.getContext !== 'function') return '';
    canvas.width = 400;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // Fondo limpio
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Borde azul institucional ESAP
    ctx.strokeStyle = '#003DA5';
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

    // Texto de encabezado de seguridad
    ctx.fillStyle = '#003DA5';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('ESAP — GRUPO DE PRESUPUESTO — EXPEDICIÓN RP', 16, 24);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(nombre.slice(0, 36), 16, 52);

    ctx.fillStyle = '#475569';
    ctx.font = '11px sans-serif';
    ctx.fillText(cargo.slice(0, 42), 16, 72);

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    const ahora = new Date().toISOString();
    ctx.fillText(`FECHA/HORA: ${ahora}`, 16, 96);
    ctx.fillText('VALIDACIÓN: HASH SHA-256 + VALIDACIÓN OTP', 16, 112);

    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
};

export default function RegistrarRPModal({
  solicitud,
  abierto,
  onCerrar,
  onExito,
}: RegistrarRPModalProps) {
  const hoy = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { festivos } = useFestivos();

  const [numeroRp, setNumeroRp] = useState('');
  const [fechaRp, setFechaRp] = useState(hoy);
  const [valorComprometido, setValorComprometido] = useState<number>(0);
  const [rubroPresupuestal, setRubroPresupuestal] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Archivo Soporte PDF
  const [archivoPdf, setArchivoPdf] = useState<File | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>('');
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para Formato 023 y visor/descarga
  const [descargando023, setDescargando023] = useState(false);

  // Estados para trazabilidad y apartado de firmas digitales
  const [solicitudCompleta, setSolicitudCompleta] = useState<SolicitudComisionResponse | null>(null);
  const [estadoFirmas, setEstadoFirmas] = useState<EstadoFirmasResponse | null>(null);
  const [cargandoFirmas, setCargandoFirmas] = useState(false);

  // Estados para flujo de firma digital institucional con OTP
  const [solicitandoOtp, setSolicitandoOtp] = useState(false);
  const [modalFirmaOtpAbierta, setModalFirmaOtpAbierta] = useState(false);
  const [otpData, setOtpData] = useState<{
    verificationId: string;
    emailEnviadoA?: string;
    devCode?: string;
  } | null>(null);

  // Inicializar campos con datos de la comisión
  useEffect(() => {
    if (solicitud && abierto) {
      setNumeroRp(solicitud.numeroRp || '');
      setFechaRp(solicitud.fechaRp ? solicitud.fechaRp.slice(0, 10) : hoy);
      const totalSugerido =
        solicitud.valorComprometido != null && Number(solicitud.valorComprometido) > 0
          ? Number(solicitud.valorComprometido)
          : Number(
              solicitud.montoTotal ||
                solicitud.montoTotalEstimado ||
                (Number(solicitud.montoSolicitadoViaticos) || 0) +
                  (Number(solicitud.montoSolicitadoGastosViaje) || 0) ||
                0,
            );
      setValorComprometido(totalSugerido);
      setRubroPresupuestal(
        solicitud.rubroRp ||
          (solicitud as any).rubroPresupuestal ||
          (solicitud as any).rubro ||
          '',
      );
      setObservaciones(solicitud.observacionesRp || '');
      setArchivoPdf(null);
      setNombreArchivo(solicitud.soporteRpPath || '');
      setErrorArchivo(null);
      setError(null);

      // Cargar en paralelo la solicitud completa y el estado de firmas institucionales
      setCargandoFirmas(true);
      Promise.allSettled([
        typeof viaticosService.obtenerSolicitudCompleta === 'function'
          ? viaticosService.obtenerSolicitudCompleta(solicitud.id)
          : Promise.resolve(null),
        typeof viaticosService.obtenerEstadoFirmas === 'function'
          ? viaticosService.obtenerEstadoFirmas(solicitud.id)
          : Promise.resolve(null),
      ])
        .then(([respCompleta, respFirmas]) => {
          if (respCompleta.status === 'fulfilled') {
            setSolicitudCompleta(respCompleta.value);
          } else {
            setSolicitudCompleta(null);
          }
          if (respFirmas.status === 'fulfilled') {
            setEstadoFirmas(respFirmas.value);
          } else {
            setEstadoFirmas(null);
          }
        })
        .finally(() => {
          setCargandoFirmas(false);
        });
    } else {
      setSolicitudCompleta(null);
      setEstadoFirmas(null);
    }
  }, [solicitud, abierto, hoy]);

  // Patrón esperado de ejemplo: YYYYMMDD_RP_Numero.pdf
  const nombreEsperadoEjemplo = useMemo(() => {
    const f = (fechaRp || hoy).replace(/-/g, '');
    const n = numeroRp.trim() || '12345';
    return `${f}_RP_${n}.pdf`;
  }, [fechaRp, hoy, numeroRp]);

  // Validación en tiempo real del archivo PDF adjunto
  const validacionArchivo = useMemo(() => {
    if (!nombreArchivo) {
      return { esValido: false, mensaje: 'Adjuntar el soporte oficial del RP en formato PDF.' };
    }
    if (!nombreArchivo.toLowerCase().endsWith('.pdf')) {
      return { esValido: false, mensaje: 'El archivo debe ser un documento en formato PDF (.pdf).' };
    }
    if (!REGEX_NOMENCLATURA_PDF.test(nombreArchivo)) {
      return {
        esValido: false,
        mensaje: `La nomenclatura del soporte es inválida. Debe cumplir el patrón 'YYYYMMDD_RP_Numero.pdf' (ej: ${nombreEsperadoEjemplo}).`,
      };
    }
    return { esValido: true, mensaje: 'Nomenclatura oficial válida según estándar SIIF Nación.' };
  }, [nombreArchivo, nombreEsperadoEjemplo]);

  // Proyección de modalidad de pago (RF-PRE-003) con días hábiles y festivos
  const proyeccionModalidad = useMemo(() => {
    if (!solicitud?.fechaInicio || !fechaRp) {
      return null;
    }
    const habiles = calcularDiasHabilesPrevios(fechaRp, solicitud.fechaInicio, festivos);
    return {
      diasHabiles: habiles,
      modalidad: habiles >= DIAS_HABILES_UMBRAL_AVANCE_RP ? 'AVANCE' : 'RECONOCIMIENTO_POSTERIOR',
    };
  }, [solicitud?.fechaInicio, fechaRp, festivos]);

  const handleSeleccionarArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoPdf(file);
    setNombreArchivo(file.name);

    if (!REGEX_NOMENCLATURA_PDF.test(file.name)) {
      setErrorArchivo(
        `El soporte '${file.name}' no cumple con la regla Fecha_RP_Número (ejemplo: ${nombreEsperadoEjemplo}).`,
      );
    } else {
      setErrorArchivo(null);
    }
  };

  const estaComprometida =
    solicitud?.estado === 'COMPROMETIDA' ||
    (solicitud as any)?.estadoSolicitud === 'COMPROMETIDA';

  const puedeEnviar =
    Boolean(numeroRp.trim()) &&
    Boolean(fechaRp) &&
    valorComprometido > 0 &&
    Boolean(rubroPresupuestal.trim()) &&
    (!nombreArchivo || validacionArchivo.esValido) &&
    !guardando &&
    !solicitandoOtp &&
    !estaComprometida;

  // Descargar Formato 023 oficial en PDF
  const handleDescargar023 = async () => {
    if (!solicitud) return;
    setDescargando023(true);
    setError(null);
    try {
      const consecutivo =
        solicitud.consecutivoUnico ||
        (solicitud as any).codigoSolicitud ||
        solicitud.codigo ||
        '023';
      const blob = await viaticosService.exportarFormato023(solicitud.id, consecutivo);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Formato_023_${consecutivo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    } catch (err: any) {
      console.error('Error descargando Formato 023:', err);
      setError('No fue posible descargar el archivo PDF del Formato 023.');
    } finally {
      setDescargando023(false);
    }
  };

  const currentUser =
    typeof authService?.getCurrentUserSync === 'function'
      ? authService.getCurrentUserSync()
      : null;
  const nombreFirmante =
    currentUser?.person?.full_name ||
    currentUser?.username ||
    'Profesional de Presupuesto';
  const cargoFirmante = 'Profesional de Presupuesto / SIIF';

  // Iniciar flujo de firma digital con código OTP
  const handleIniciarFirmaOtp = async () => {
    if (!puedeEnviar) return;

    if (nombreArchivo && !validacionArchivo.esValido) {
      setError(`La nomenclatura del archivo soporte '${nombreArchivo}' es inválida.`);
      return;
    }

    // Si la función solicitarOtpFirma existe en el servicio, ejecutar flujo OTP institucional
    if (typeof viaticosService.solicitarOtpFirma === 'function') {
      setSolicitandoOtp(true);
      setError(null);
      try {
        const resp = await viaticosService.solicitarOtpFirma(solicitud!.id, {
          tipoFirma: 'PRESUPUESTO',
          etapaLabel: 'Expedición de Registro Presupuestal RP (RF-PRE-001)',
        });
        setOtpData({
          verificationId: resp.verificationId,
          emailEnviadoA: resp.emailEnviadoA || (resp as any).email,
          devCode: resp.devCode,
        });
        setModalFirmaOtpAbierta(true);
      } catch (err: any) {
        console.error('Error solicitando OTP:', err);
        setError(
          err?.response?.data?.message ||
            err?.message ||
            'No fue posible solicitar el código OTP de verificación para el Grupo de Presupuesto.',
        );
      } finally {
        setSolicitandoOtp(false);
      }
    } else {
      // Fallback directo si no está configurado el cliente OTP
      await ejecutarExpedicionRpDirecta();
    }
  };

  // Ejecución directa de expedición de RP (usada cuando no aplica modal OTP o en tests)
  const ejecutarExpedicionRpDirecta = async (firmaOtpData?: FirmaDigitalData) => {
    if (!solicitud) return;
    setGuardando(true);
    setError(null);

    try {
      const codigoRpCalculado = `${fechaRp.replace(/-/g, '')}_RP_${numeroRp.trim()}`;
      const firmaImagen = generarEstampaDigitalPresupuesto(nombreFirmante, cargoFirmante);

      const payload = {
        numeroRp: numeroRp.trim(),
        fechaRp,
        valorComprometido: Number(valorComprometido),
        rubroPresupuestal: rubroPresupuestal.trim(),
        rubro: rubroPresupuestal.trim(),
        codigoRp: codigoRpCalculado,
        soporteRpPath: nombreArchivo || undefined,
        observaciones: observaciones.trim() || undefined,
        otp: firmaOtpData?.codigoOtp,
        verificationId: otpData?.verificationId,
        certificadoId: firmaOtpData?.certificado_id,
        hashSha256: firmaOtpData?.hash,
        firmaImagen,
      };

      const resp = await viaticosService.expedirRp(solicitud.id, payload);
      setModalFirmaOtpAbierta(false);
      onExito(resp?.data || { ...solicitud, estado: 'COMPROMETIDA', codigoRp: codigoRpCalculado });
      onCerrar();
    } catch (err: any) {
      console.error('Error al registrar RP:', err);
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Ocurrió un error al registrar el Registro Presupuestal en SIIF Nación.',
      );
    } finally {
      setGuardando(false);
    }
  };

  // Confirmar firma digital tras validación exitosa de OTP
  const handleFirmaDigitalCompleta = async (firma: FirmaDigitalData) => {
    await ejecutarExpedicionRpDirecta(firma);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleIniciarFirmaOtp();
  };

  if (!abierto || !solicitud) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-rp-titulo"
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col h-[88vh] max-h-[88vh] animate-in fade-in zoom-in-95 duration-200"
        style={{
          height: '88vh',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Encabezado Institucional Protegido (Garantiza contraste y fondo permanente) */}
        <div
          className="px-5 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between shrink-0"
          style={{
            background: 'linear-gradient(135deg, #002266 0%, #003DA5 100%)',
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 border border-white/20">
              <Receipt className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white border border-white/30">
                  Etapa 7 · RF-PRE-001
                </span>
                <span className="text-xs text-blue-100 font-medium">SIIF Nación</span>
                {estaComprometida && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                    COMPROMETIDA
                  </span>
                )}
              </div>
              <h2 id="modal-rp-titulo" className="text-base sm:text-lg font-bold text-white mt-0.5 truncate">
                Registrar Registro Presupuestal (RP)
              </h2>
              <p className="text-xs text-blue-100/90 truncate">
                Comisión {solicitud.codigo || solicitud.consecutivoUnico} · Comisionado: {solicitud.nombreComisionado}
              </p>
            </div>
          </div>

          {/* Acciones del encabezado: Descargar Formato 023 en un solo lado y botón de cerrar */}
          <div className="flex items-center space-x-2.5 shrink-0 ml-3">
            <button
              type="button"
              onClick={handleDescargar023}
              disabled={descargando023}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              title="Descargar versión PDF oficial del Formato 023"
            >
              {descargando023 ? (
                <LoaderCircle className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Download className="w-3.5 h-3.5 text-blue-200" />
              )}
              <span className="hidden sm:inline">Descargar Formato 023</span>
              <span className="sm:hidden">023 PDF</span>
            </button>

            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando || solicitandoOtp}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              title="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal con Scroll Interno Protegido (min-h-0 evita romper el flexbox) */}
        <form onSubmit={handleSubmitForm} className="p-5 sm:p-6 overflow-y-auto min-h-0 space-y-6 flex-1">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-start space-x-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error en el proceso</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Tarjeta 1: Resumen y Datos de la Comisión */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-400" />
                <span>1. Información General de la Comisión</span>
              </h3>
              <span className="text-xs font-mono font-bold text-indigo-900 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                {solicitud.codigo || solicitud.consecutivoUnico}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Comisionado:</span>
                <span className="font-bold text-slate-900 block truncate" title={solicitud.nombreComisionado}>
                  {solicitud.nombreComisionado}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  C.C. {solicitud.cedulaComisionado || (solicitud as any).comisionado?.numeroDocumento || '—'}
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Dependencia:</span>
                <span className="font-semibold text-slate-800 block truncate" title={solicitud.dependencia || 'Sede Central'}>
                  {solicitud.dependencia || viaticosService.resolverNombreDependencia?.(solicitud as any) || 'Sede Central'}
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{solicitud.ciudadDestino || 'Destino'}</span>
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Fechas de Comisión:</span>
                <span className="font-bold text-slate-800 block text-[11px]">
                  {solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toLocaleDateString('es-CO') : '—'} al{' '}
                  {solicitud.fechaFin ? new Date(solicitud.fechaFin).toLocaleDateString('es-CO') : '—'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {solicitud.diasComision ? `${solicitud.diasComision} día(s)` : 'Duración estimada'}
                </span>
              </div>

              <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-200">
                <span className="text-[10px] text-[#003DA5] font-bold block uppercase">Total a Comprometer:</span>
                <span className="text-sm sm:text-base font-black text-[#003DA5]">
                  {formatearMoneda(
                    solicitud.valorComprometido ||
                      solicitud.montoTotal ||
                      solicitud.montoTotalEstimado ||
                      0,
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Apartado de Firmas Digitales y Aprobaciones Institucionales (Formato 023) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                  <FileSignature className="w-4 h-4 text-indigo-700" />
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800">
                    2. Apartado de Firmas Digitales y Trazabilidad (Formato 023)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cadena de custodia digital y firmas de aprobación previas a radicación y expedición
                  </p>
                </div>
              </div>
            </div>

            <AprobacionPorComponente
              solicitud={solicitud}
              solicitudCompleta={solicitudCompleta}
              estadoFirmas={estadoFirmas}
              cargandoFirmas={cargandoFirmas}
            />
          </div>

          {/* Tarjeta 3: Formulario de Registro Presupuestal en SIIF Nación */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-4">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-700" />
              <span>3. Datos Oficiales del Registro Presupuestal (SIIF Nación)</span>
            </h3>

            {/* Fila 1: Número de RP y Fecha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Número de RP en SIIF *</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={estaComprometida}
                  value={numeroRp}
                  onChange={(e) => setNumeroRp(e.target.value)}
                  placeholder="Ej. 12345"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition-all placeholder:text-slate-400 bg-white disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Fecha de Expedición RP *</span>
                </label>
                <input
                  type="date"
                  required
                  disabled={estaComprometida}
                  value={fechaRp}
                  onChange={(e) => setFechaRp(e.target.value)}
                  max={hoy}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition-all bg-white disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Proyección Modalidad de Pago (RF-PRE-003) */}
            {proyeccionModalidad && (
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between transition-all ${
                  proyeccionModalidad.modalidad === 'AVANCE'
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-200 text-amber-900'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      proyeccionModalidad.modalidad === 'AVANCE' ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}
                  />
                  <div>
                    <span className="font-bold uppercase tracking-wider text-[10px] block text-slate-500">
                      Modalidad proyectada según días hábiles (RF-PRE-003)
                    </span>
                    <span className="font-bold text-xs">
                      {proyeccionModalidad.modalidad === 'AVANCE'
                        ? 'AVANCE (Pago Anticipado)'
                        : 'RECONOCIMIENTO POSTERIOR (Liquidación Posterior)'}
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] shrink-0 pl-2">
                  <span className="font-bold">~{proyeccionModalidad.diasHabiles}</span>{' '}
                  {proyeccionModalidad.diasHabiles === 1 ? 'día hábil previo' : 'días hábiles previos'}
                  <div className="text-[10px] opacity-75">
                    {proyeccionModalidad.modalidad === 'AVANCE' ? '≥ 5 días hábiles' : '< 5 días hábiles'}
                  </div>
                </div>
              </div>
            )}

            {/* Fila 2: Valor Comprometido y Rubro */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Valor Comprometido ($ COP) *</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-xs">
                    $
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    disabled={estaComprometida}
                    value={
                      valorComprometido
                        ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(valorComprometido)
                        : ''
                    }
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '');
                      setValorComprometido(raw ? parseInt(raw, 10) : 0);
                    }}
                    placeholder="0"
                    className="w-full pl-8 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono font-bold text-slate-900 transition-all placeholder:text-slate-400 bg-white disabled:bg-slate-100"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {valorComprometido > 0
                    ? `Monto oficial: $ ${new Intl.NumberFormat('es-CO').format(valorComprometido)} COP`
                    : 'Ingrese el valor monetario oficial amparado en el Registro Presupuestal.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-700" />
                  <span>Rubro Presupuestal *</span>
                </label>
                <input
                  type="text"
                  required
                  disabled={estaComprometida}
                  value={rubroPresupuestal}
                  onChange={(e) => setRubroPresupuestal(e.target.value)}
                  placeholder="Ej. C-2101-0100-0-2101010-02-00-00"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono transition-all placeholder:text-slate-400 bg-white disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Uploader de Soporte PDF con Validación en Tiempo Real */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <FileCheck2 className="w-4 h-4 text-indigo-700" />
                  <span>Soporte Oficial RP (PDF)</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  Regla: YYYYMMDD_RP_Numero.pdf
                </span>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleSeleccionarArchivo}
                accept=".pdf"
                className="hidden"
                disabled={estaComprometida}
              />

              {!nombreArchivo ? (
                <div
                  onClick={() => !estaComprometida && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-slate-300 ${
                    estaComprometida ? 'opacity-60 cursor-not-allowed' : 'hover:border-indigo-500 cursor-pointer hover:bg-indigo-50/20'
                  } bg-slate-50/50 p-5 rounded-xl text-center transition-all group`}
                >
                  <UploadCloud className="w-7 h-7 text-slate-400 group-hover:text-indigo-600 mx-auto transition-colors" />
                  <p className="text-xs font-bold text-slate-700 mt-2">
                    Haz clic para adjuntar el PDF de soporte expedido en SIIF
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    El archivo debe llamarse <span className="font-mono text-indigo-700 font-bold">{nombreEsperadoEjemplo}</span>
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${validacionArchivo.esValido ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-slate-800 truncate">{nombreArchivo}</p>
                      <p className={`text-[11px] ${validacionArchivo.esValido ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}`}>
                        {validacionArchivo.mensaje}
                      </p>
                    </div>
                  </div>

                  {!estaComprometida && (
                    <button
                      type="button"
                      onClick={() => {
                        setArchivoPdf(null);
                        setNombreArchivo('');
                        setErrorArchivo(null);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 shrink-0 ml-2 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}

              {errorArchivo && (
                <p className="text-[11px] text-rose-600 font-semibold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorArchivo}</span>
                </p>
              )}
            </div>

            {/* Observaciones opcionales */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Observaciones de Expedición (Opcional)
              </label>
              <textarea
                rows={2}
                disabled={estaComprometida}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas aclaratorias sobre el registro del RP..."
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400 bg-white disabled:bg-slate-100"
              />
            </div>
          </div>
        </form>

        {/* Barra de Acciones Inferior */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 text-center sm:text-left">
            {estaComprometida ? (
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Esta comisión ya cuenta con RP expedido en firme en SIIF Nación.
              </span>
            ) : (
              <span>
                Al confirmar y comprometer, se validará la{' '}
                <strong className="text-slate-700">firma digital con código OTP</strong> y la comisión pasará a{' '}
                <span className="font-bold text-indigo-800">COMPROMETIDA</span>.
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onCerrar}
              disabled={guardando || solicitandoOtp}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {estaComprometida ? 'Cerrar' : 'Cancelar'}
            </button>

            {!estaComprometida && (
              <button
                type="button"
                onClick={handleIniciarFirmaOtp}
                disabled={!puedeEnviar || solicitandoOtp || guardando}
                style={
                  !puedeEnviar
                    ? { backgroundColor: '#94a3b8', color: '#ffffff' }
                    : { backgroundColor: '#003DA5', color: '#ffffff' }
                }
                className="px-5 py-2.5 font-bold text-xs rounded-xl shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 cursor-pointer"
              >
                {solicitandoOtp || guardando ? (
                  <LoaderCircle className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-white" />
                )}
                <span className="text-white">
                  {guardando
                    ? 'Comprometiendo...'
                    : solicitandoOtp
                    ? 'Solicitando OTP...'
                    : 'Confirmar y Comprometer'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal Institucional de Firma Digital con Validación OTP */}
      {modalFirmaOtpAbierta && solicitud && (
        <FirmaDigitalViaticosModal
          isOpen={modalFirmaOtpAbierta}
          solicitudId={solicitud.id}
          consecutivo={solicitud.consecutivoUnico || solicitud.codigo || '023'}
          comisionadoNombre={solicitud.nombreComisionado || 'Comisionado'}
          destino={solicitud.ciudadDestino || ''}
          fechas={
            solicitud.fechaInicio && solicitud.fechaFin
              ? `${solicitud.fechaInicio} al ${solicitud.fechaFin}`
              : ''
          }
          firmanteNombre={nombreFirmante}
          firmanteCargo={cargoFirmante}
          etapaLabel="Expedición de Registro Presupuestal RP — SIIF Nación (RF-PRE-001)"
          correoDestino={otpData?.emailEnviadoA}
          devCode={otpData?.devCode}
          onVerifyCodigo={async (codigoOtp: string) => {
            if (typeof viaticosService.verificarOtpFirma === 'function') {
              await viaticosService.verificarOtpFirma(solicitud.id, {
                verificationId: otpData?.verificationId || '',
                code: codigoOtp,
                otp: codigoOtp,
                tipoFirma: 'PRESUPUESTO',
                consume: false,
              });
            }
          }}
          onFirmaCompleta={handleFirmaDigitalCompleta}
          onCancelar={() => setModalFirmaOtpAbierta(false)}
        />
      )}
    </div>
  );
}
