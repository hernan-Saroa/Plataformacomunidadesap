import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  Eye,
  FileCheck,
  FileSignature,
  FileText,
  Key,
  LoaderCircle,
  Lock,
  MapPin,
  Plane,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import viaticosService from '../services/api/viaticosService';
import { authService } from '../services/api/authService';
import { SolicitudAutorizacion } from '../types/viaticos';
import { formatearMoneda } from '../utils/viaticosUtils';
import VisorDocumentosFlotante, { useVisorDocumentos } from './VisorDocumentosFlotante';
import FirmaDigitalViaticosModal, { FirmaDigitalData } from './FirmaDigitalViaticosModal';

// Generar estampa digital certificada institucional para la Dirección Nacional
const generarEstampaDigitalDireccion = (nombre: string, cargo: string): string => {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Fondo limpio
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Borde púrpura institucional Dirección Nacional
  ctx.strokeStyle = '#6B21A8';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);

  // Texto de encabezado de seguridad
  ctx.fillStyle = '#6B21A8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('ESAP — DIRECCIÓN NACIONAL — FIRMA DIGITAL', 16, 24);

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
};

interface AutorizacionDireccionModalProps {
  solicitud: SolicitudAutorizacion | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AutorizacionDireccionModal: React.FC<AutorizacionDireccionModalProps> = ({
  solicitud,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [justificacion, setJustificacion] = useState('');
  const [esDelegado, setEsDelegado] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrarConfirmacionRechazo, setMostrarConfirmacionRechazo] = useState(false);
  const [accionExitosa, setAccionExitosa] = useState<string | null>(null);

  // Estados para Formato 023 y visor flotante
  const { documentosVisor, abrirDocumentoVisor, cerrarDocumentoVisor } = useVisorDocumentos();
  const [descargando023, setDescargando023] = useState(false);

  // Estados para proceso de firma digital con validación OTP
  const [solicitandoOtp, setSolicitandoOtp] = useState(false);
  const [modalFirmaOtpAbierta, setModalFirmaOtpAbierta] = useState(false);
  const [otpData, setOtpData] = useState<{
    verificationId: string;
    emailEnviadoA?: string;
    devCode?: string;
  } | null>(null);

  if (!isOpen || !solicitud) return null;

  const currentUser = authService.getCurrentUserSync();
  const esSuperAdmin = authService.isSuperAdmin();

  // Validación preventiva SoD en frontend (el backend lo blinda estrictamente con AuthorizationSodGuard)
  const esComisionadoMismo =
    Boolean(currentUser?.userId && solicitud.comisionado?.id === currentUser.userId);
  const esCreadorMismo =
    Boolean(currentUser?.userId && solicitud.creadoPorUsuarioId === currentUser.userId);
  const violaSoD = (esComisionadoMismo || esCreadorMismo) && !esSuperAdmin;

  const yaDecidida =
    Boolean(solicitud.decisionDireccion) ||
    solicitud.estadoSolicitud === 'AUTORIZADA' ||
    solicitud.estadoSolicitud === 'RECHAZADO' ||
    (solicitud.estadoSolicitud === 'EN_AUTORIZACION' && Boolean(solicitud.autorizadorDireccionId));

  // Visualizar Formato 023 en visor flotante / mitad de pantalla
  const handlePrevisualizar023 = async () => {
    if (!solicitud) return;
    setDescargando023(true);
    setError(null);
    try {
      const blob = await viaticosService.exportarFormato023(
        solicitud.id,
        solicitud.consecutivoUnico || '023',
      );
      const url = window.URL.createObjectURL(blob);
      abrirDocumentoVisor({
        url,
        nombre: `Formato 023 — ${solicitud.consecutivoUnico || 'comision'}.pdf`,
        tipo: 'Formato 023 Oficial',
        mime: 'application/pdf',
      });
    } catch (err: any) {
      console.error('Error previsualizando Formato 023:', err);
      setError('No fue posible abrir el Formato 023 en el visor flotante.');
    } finally {
      setDescargando023(false);
    }
  };

  // Descargar Formato 023 en PDF
  const handleDescargar023 = async () => {
    if (!solicitud) return;
    setDescargando023(true);
    setError(null);
    try {
      const blob = await viaticosService.exportarFormato023(
        solicitud.id,
        solicitud.consecutivoUnico || '023',
      );
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Formato_023_${solicitud.consecutivoUnico || 'comision'}.pdf`;
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

  // Iniciar flujo de firma digital con validación OTP
  const handleIniciarFirmaOtp = async () => {
    if (violaSoD || yaDecidida || procesando) return;
    setSolicitandoOtp(true);
    setError(null);
    try {
      const resp = await viaticosService.solicitarOtpFirma(solicitud.id, {
        tipoFirma: 'DIRECCION_NACIONAL',
        etapaLabel: 'Autorización Dirección Nacional — Comisión Extemporánea (RF-AUT-002)',
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
          'No fue posible solicitar el código OTP de verificación.',
      );
    } finally {
      setSolicitandoOtp(false);
    }
  };

  // Confirmar firma digital y autorización formal
  const handleFirmaDigitalCompleta = async (firma: FirmaDigitalData) => {
    setProcesando(true);
    setError(null);
    try {
      const nombreFirmante =
        currentUser?.person?.full_name || currentUser?.username || 'Dirección Nacional';
      const cargoFirmante = esDelegado
        ? 'Delegado(a) de Dirección Nacional'
        : 'Director(a) Nacional';
      const firmaImagen = generarEstampaDigitalDireccion(nombreFirmante, cargoFirmante);

      await viaticosService.autorizarComisionExtemporanea(
        solicitud.id,
        justificacion,
        esDelegado,
        {
          otp: firma.codigoOtp,
          verificationId: otpData?.verificationId,
          certificadoId: firma.certificado_id,
          hashSha256: firma.hash,
          firmaImagen,
        },
      );
      setAccionExitosa(
        `Comisión extemporánea autorizada con firma digital OTP (Certificado: ${firma.certificado_id}). Enrutada a Subdirección de Gestión Corporativa.`,
      );
      setModalFirmaOtpAbierta(false);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1600);
      return true;
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Error al emitir la autorización con firma digital de Dirección Nacional.',
      );
      return false;
    } finally {
      setProcesando(false);
    }
  };

  // Rechazo de comisión extemporánea (no requiere OTP de firma positiva)
  const handleRechazar = async () => {
    if (!justificacion.trim() || justificacion.trim().length < 5) {
      setError('La justificación del rechazo es obligatoria (mínimo 5 caracteres).');
      return;
    }
    setProcesando(true);
    setError(null);
    try {
      await viaticosService.rechazarComisionExtemporanea(
        solicitud.id,
        justificacion,
        esDelegado,
      );
      setAccionExitosa(
        'Comisión extemporánea rechazada definitivamente. Se registró la justificación en el historial.',
      );
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1600);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Error al rechazar la comisión extemporánea.',
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-dir-nac-title"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[82vh] sm:max-h-[84vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Cabecera Ejecutiva Dirección Nacional */}
        <div
          className="p-4 sm:p-5 text-white relative overflow-hidden shrink-0"
          style={{
            background: 'linear-gradient(135deg, #3B0764 0%, #6B21A8 50%, #9333EA 100%)',
          }}
        >
          <div className="relative z-10 flex items-start justify-between gap-3 sm:gap-4">
            <div className="space-y-1 sm:space-y-1.5 min-w-0">
              <div className="inline-flex items-center space-x-2 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold bg-white/20 text-purple-100 border border-white/25">
                <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">ETAPA 6 · RF-AUT-002 · RUTA ESPECIAL DE AUTORIZACIÓN</span>
              </div>
              <h2 id="modal-dir-nac-title" className="text-lg sm:text-2xl font-black tracking-tight truncate">
                Autorización de Comisión Extemporánea
              </h2>
              <p className="text-[11px] sm:text-xs text-purple-100/90 font-medium">
                Dirección Nacional (o su delegado) · Decisión y firma con validación OTP
              </p>
            </div>

            {/* Botones de acción de cabecera: Formato 023 y Cerrar */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrevisualizar023}
                disabled={descargando023}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer disabled:opacity-50"
                title="Ver Formato 023 en visor flotante / mitad de pantalla"
              >
                {descargando023 ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin text-amber-300" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-amber-300" />
                )}
                <span className="hidden sm:inline">Ver Formato 023</span>
              </button>

              <button
                type="button"
                onClick={handleDescargar023}
                disabled={descargando023}
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-xs flex items-center gap-1.5 border border-white/20 transition-all cursor-pointer disabled:opacity-50"
                title="Descargar Formato 023 en PDF"
              >
                <Download className="w-3.5 h-3.5 text-purple-200" />
                <span className="hidden sm:inline">Exportar 023</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 sm:p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Alerta Destacada de Comisión Extemporánea */}
        <div className="bg-purple-50/90 border-b border-purple-200 px-4 sm:px-6 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 text-xs text-purple-950 font-semibold shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-4 h-4 text-purple-700 shrink-0" />
            <span className="truncate sm:whitespace-normal">
              Comisión marcada como <strong>EXTEMPORÁNEA</strong>: requiere aval directivo y firma digital OTP para continuar.
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900 font-extrabold text-[11px] uppercase shrink-0">
            Radicado {solicitud.consecutivoUnico}
          </span>
        </div>

        {/* Contenido Principal con Scroll Interno Garantizado */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0 text-slate-800">
          {/* Mensajes de Éxito / Error */}
          {accionExitosa && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{accionExitosa}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs font-semibold flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Advertencia de Segregación de Funciones (SoD) */}
          {violaSoD && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900">Restricción de Segregación de Funciones (SoD):</p>
                <p className="mt-0.5">
                  Usted figura como el comisionado o el enlace creador de esta solicitud. Por principios de control interno y transparencia, la autorización o rechazo debe ser emitida por otro directivo o delegado facultado.
                </p>
              </div>
            </div>
          )}

          {/* Sección 1: Datos del Comisionado y Expediente */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-purple-600" />
                1. Información del Comisionado y Expediente
              </h3>
              <span className="text-xs font-bold text-slate-500">
                Prioridad: <span className="text-purple-700 font-black">{solicitud.prioridad || 'NORMAL'}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Comisionado</p>
                <p className="font-black text-slate-900 text-sm mt-0.5">
                  {solicitud.comisionado?.nombreCompleto || 'Sin registrar'}
                </p>
                <p className="text-slate-500 font-medium">CC: {solicitud.comisionado?.numeroDocumento || 'N/A'}</p>
              </div>

              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Dependencia</p>
                <p className="font-bold text-slate-800 mt-0.5">
                  {viaticosService.resolverNombreDependencia?.(solicitud)}
                </p>
                <p className="text-slate-500 font-medium">
                  {solicitud.comisionado?.tipoComisionado || 'Servidor Público'}
                </p>
              </div>

              <div>
                <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Rubro Presupuestal</p>
                <p className="font-bold text-purple-900 mt-0.5 bg-purple-100/70 px-2 py-0.5 rounded inline-block">
                  {solicitud.rubroPresupuestal || 'C-Funcionamiento'}
                </p>
                <p className="text-slate-500 font-medium mt-1">
                  Requiere Tiquetes: <strong>{solicitud.requiereTiquetes ? 'SÍ' : 'NO'}</strong>
                </p>
              </div>
            </div>

            <div>
              <p className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">Objeto de la Comisión</p>
              <p className="mt-1 text-slate-700 bg-white p-3 rounded-xl border border-slate-200 text-xs font-medium leading-relaxed">
                {solicitud.objetoComision || 'Sin objeto detallado'}
              </p>
            </div>

            {/* Acciones de Formato 023 en Sección 1 */}
            <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileSignature className="w-4 h-4 text-purple-700 shrink-0" />
                <div>
                  <span className="text-xs font-bold text-purple-950 block">
                    Formato GF-FO-023 Oficial de Desplazamiento
                  </span>
                  <span className="text-[10px] text-purple-800/80 font-medium">
                    Expediente completo y liquidación proyectada para revisión directiva
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevisualizar023}
                  disabled={descargando023}
                  className="px-2.5 py-1.5 rounded-lg bg-white border border-purple-300 hover:bg-purple-100/60 text-purple-900 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5 text-purple-600" />
                  Previsualizar Formato 023
                </button>
                <button
                  type="button"
                  onClick={handleDescargar023}
                  disabled={descargando023}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar PDF
                </button>
              </div>
            </div>
          </div>

          {/* Sección 2: Itinerario y Fechas */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-3">
              <Calendar className="w-4 h-4 text-purple-600" />
              2. Itinerario y Vigencia del Desplazamiento
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <MapPin className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Origen Territorial</p>
                  <p className="font-black text-slate-900 mt-0.5">{solicitud.ciudadOrigen || solicitud.sedeOrigen || 'Bogotá D.C.'}</p>
                  <p className="text-slate-500 font-semibold">Sede Origen</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <MapPin className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Destino Territorial</p>
                  <p className="font-black text-slate-900 mt-0.5">{solicitud.destinoCiudad}</p>
                  <p className="text-slate-500 font-semibold">{solicitud.destinoDepartamento}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <Calendar className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Fecha de Inicio</p>
                  <p className="font-black text-slate-900 mt-0.5">
                    {solicitud.fechaInicio ? new Date(solicitud.fechaInicio).toLocaleDateString('es-CO') : 'N/A'}
                  </p>
                  <p className="text-slate-500 font-medium">Comienzo de labores</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-slate-200">
                <Calendar className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-slate-400 font-bold uppercase text-[10px]">Fecha de Retorno / Días</p>
                  <p className="font-black text-slate-900 mt-0.5">
                    {solicitud.fechaFin ? new Date(solicitud.fechaFin).toLocaleDateString('es-CO') : 'N/A'}
                  </p>
                  <p className="text-purple-700 font-bold">{solicitud.diasComision || 1} días de comisión</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sección 3: Liquidación del Gasto Proyectado */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-3">
              <DollarSign className="w-4 h-4 text-purple-600" />
              3. Resumen de Liquidación Económica
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Viáticos</p>
                <p className="text-sm font-black text-slate-800 mt-1">
                  {formatearMoneda(Number(solicitud.montoViaticos) || 0)}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Gastos de Viaje</p>
                <p className="text-sm font-black text-slate-800 mt-1">
                  {formatearMoneda(Number(solicitud.montoGastosViaje) || 0)}
                </p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] uppercase font-bold text-slate-400">Tiquetes (Est.)</p>
                <p className="text-sm font-black text-slate-800 mt-1">
                  {formatearMoneda(Number(solicitud.costoEstimadoTiquete) || 0)}
                </p>
              </div>

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-200">
                <p className="text-[10px] uppercase font-bold text-purple-700">Total Proyectado</p>
                <p className="text-sm font-black text-purple-900 mt-1">
                  {formatearMoneda(Number(solicitud.montoTotal) || 0)}
                </p>
              </div>
            </div>
          </div>

          {/* Sección 4: Decisión Ya Registrada (Solo Lectura) o Formulario de Decisión */}
          {yaDecidida ? (
            <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
              <div className="flex items-center gap-2 text-purple-900 font-black text-sm">
                <FileCheck className="w-5 h-5 text-purple-700" />
                Decisión de Dirección Nacional Ya Registrada
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Decisión Emitida:</span>
                  <p className="font-extrabold text-purple-950 mt-0.5">
                    {solicitud.decisionDireccion || 'AUTORIZADA'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Fecha de Decisión:</span>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {solicitud.fechaAutorizacionDireccion
                      ? new Date(solicitud.fechaAutorizacionDireccion).toLocaleString('es-CO')
                      : 'Fecha no registrada'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Autorizador Dirección:</span>
                  <p className="font-medium text-slate-700 mt-0.5">
                    {solicitud.autorizadorDireccionNombre || 'Dirección Nacional'}
                    {solicitud.esDelegadoDireccion && (
                      <span className="ml-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900">
                        En calidad de Delegado
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {solicitud.justificacionDireccion && (
                <div className="pt-2 border-t border-purple-200/80 text-xs">
                  <span className="text-slate-400 font-semibold uppercase text-[10px]">Justificación Registrada:</span>
                  <p className="text-slate-700 bg-white p-3 rounded-xl border border-purple-200 mt-1 font-medium">
                    {solicitud.justificacionDireccion}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-purple-50/40 border border-purple-200 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-700" />
                4. Registro de Decisión — Dirección Nacional
              </h3>

              {/* Checkbox de Delegación */}
              <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-purple-200 cursor-pointer hover:bg-purple-50/30 transition-colors">
                <input
                  type="checkbox"
                  checked={esDelegado}
                  onChange={(e) => setEsDelegado(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                />
                <div className="text-xs">
                  <span className="font-bold text-slate-800">
                    Actúo formalmente en calidad de Delegado(a) de la Dirección Nacional
                  </span>
                  <p className="text-slate-500 mt-0.5">
                    Marque esta casilla si la autorización o rechazo se suscribe bajo delegación de funciones directivas.
                  </p>
                </div>
              </label>

              {/* Justificación de la Decisión */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Motivación / Justificación de la Decisión{' '}
                  <span className="text-slate-400 font-normal">
                    (Opcional para autorizar, <strong>obligatoria mín. 5 caracteres</strong> para rechazar)
                  </span>
                </label>
                <textarea
                  value={justificacion}
                  onChange={(e) => setJustificacion(e.target.value)}
                  placeholder="Describa la justificación institucional, pertinencia de la actividad o los motivos en caso de rechazo..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all placeholder:text-slate-400 bg-white"
                  maxLength={2000}
                />
                <p className="text-[11px] text-slate-400 text-right mt-1">
                  {justificacion.length}/2000 caracteres
                </p>
              </div>

              {/* Confirmación específica para Rechazo */}
              {mostrarConfirmacionRechazo && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-900">¿Está seguro de negar y rechazar esta comisión?</p>
                      <p className="text-xs text-rose-700 mt-0.5">
                        La comisión pasará de forma definitiva al estado <strong>RECHAZADO</strong> y se notificará al comisionado y enlace con la justificación ingresada.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setMostrarConfirmacionRechazo(false)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-200/60"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleRechazar}
                      disabled={procesando || justificacion.trim().length < 5}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {procesando ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : null}
                      Confirmar Rechazo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Barra de Acciones Inferior */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            {!yaDecidida
              ? 'Al autorizar, la comisión avanza a la bandeja de la Subdirección de Gestión Corporativa.'
              : 'Esta solicitud ya cuenta con decisión registrada por la Dirección Nacional.'}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              Cerrar
            </button>

            {!yaDecidida && !mostrarConfirmacionRechazo && (
              <>
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacionRechazo(true)}
                  disabled={procesando || violaSoD}
                  className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Negar / Rechazar
                </button>

                <button
                  type="button"
                  onClick={handleIniciarFirmaOtp}
                  disabled={procesando || solicitandoOtp || violaSoD}
                  className="px-5 py-2 rounded-xl text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all disabled:opacity-50 hover:brightness-110 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #6B21A8 0%, #9333EA 100%)',
                  }}
                >
                  {solicitandoOtp || procesando ? (
                    <LoaderCircle className="w-4 h-4 animate-spin" />
                  ) : (
                    <Award className="w-4 h-4 text-amber-300" />
                  )}
                  <span>Autorizar Comisión Extemporánea (Firma OTP)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Institucional de Firma Digital con Validación OTP */}
      {modalFirmaOtpAbierta && solicitud && (
        <FirmaDigitalViaticosModal
          isOpen={modalFirmaOtpAbierta}
          solicitudId={solicitud.id}
          consecutivo={solicitud.consecutivoUnico || '023'}
          comisionadoNombre={solicitud.comisionado?.nombreCompleto || 'Comisionado'}
          destino={`${solicitud.destinoCiudad || ''}${solicitud.destinoDepartamento ? `, ${solicitud.destinoDepartamento}` : ''}`.trim()}
          fechas={
            solicitud.fechaInicio && solicitud.fechaFin
              ? `${solicitud.fechaInicio} al ${solicitud.fechaFin}`
              : ''
          }
          firmanteNombre={
            currentUser?.person?.full_name || currentUser?.username || 'Dirección Nacional'
          }
          firmanteCargo={esDelegado ? 'Delegado(a) de Dirección Nacional' : 'Director(a) Nacional'}
          etapaLabel="Autorización Dirección Nacional — Comisión Extemporánea (RF-AUT-002)"
          correoDestino={otpData?.emailEnviadoA}
          devCode={otpData?.devCode}
          onVerifyCodigo={async (codigoOtp: string) => {
            await viaticosService.verificarOtpFirma(solicitud.id, {
              verificationId: otpData?.verificationId || '',
              code: codigoOtp,
              otp: codigoOtp,
              tipoFirma: 'DIRECCION_NACIONAL',
              consume: false,
            });
          }}
          onFirmaCompleta={handleFirmaDigitalCompleta}
          onCancelar={() => setModalFirmaOtpAbierta(false)}
        />
      )}

      {/* Visor Flotante Multiventana Formato 023 */}
      <VisorDocumentosFlotante
        documentos={documentosVisor}
        onCerrar={cerrarDocumentoVisor}
      />
    </div>
  );
};

export default AutorizacionDireccionModal;
