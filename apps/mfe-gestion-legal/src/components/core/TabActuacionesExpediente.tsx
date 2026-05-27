/**
 * TabActuacionesExpediente - Tab de Actuaciones COMPARTIDA
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 * ✅ Timeline unificado con línea vertical y puntos
 * ✅ Soporta acciones configurables (Audiencias en DJ, Decisiones en JD)
 * ✅ Header con botones parametrizables
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, User, Activity, Plus, Clock, MapPin, Trash2, Download, Paperclip, ExternalLink, Video, Lock, PenTool, Upload, RefreshCw, CheckCircle, X } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Card } from '@esap-mfe/shared-ui/card';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { ActuacionExpediente } from './expedienteShared';
import { buildServiceAssetUrl } from '../../../../config/environment';
import { authService } from '../../../../services/api/authService';
import { legalService } from '../../../../services/api/legal.service';

// ==================== TIPOS ====================

interface BotonAccion {
  label: string;
  icono: React.ReactNode;
  onClick: () => void;
  color: string; // hex color for bg
}

interface AudienciaProgramada {
  id: number | string;
  tipo: string;
  fecha: string;
  hora: string;
  lugar?: string;
  modalidad?: string;
  linkReunion?: string;
  abogadoResponsable?: string;
  estado: string;
  descripcion?: string;
}

interface DecisionRegistrada {
  tipoDecision: string;
  tipoFallo: string;
  fecha: string;
  responsable: string;
  sancion?: string;
}

interface TabActuacionesExpedienteProps {
  actuaciones: ActuacionExpediente[];
  botonesAccion: BotonAccion[];
  /** Audiencias programadas (Defensa Judicial) */
  audienciasProgramadas?: AudienciaProgramada[];
  onReasignarAudiencia?: (audiencia: AudienciaProgramada) => void;
  onEliminarAudiencia?: (id: string | number) => void;
  /** Decisiones registradas (Juzgamiento Disciplinario) */
  decisiones?: DecisionRegistrada[];
  /** Label para botón vacío */
  labelRegistrar?: string;
  onRegistrarPrimera?: () => void;
  expedienteId?: string;
  onReloadExpediente?: () => void;
}

export function TabActuacionesExpediente({
  actuaciones,
  botonesAccion,
  audienciasProgramadas,
  onReasignarAudiencia,
  onEliminarAudiencia,
  decisiones,
  labelRegistrar = 'Registrar Primera Actuación',
  onRegistrarPrimera,
  expedienteId,
  onReloadExpediente
}: TabActuacionesExpedienteProps) {
  const [firmaSeleccionadaUrl, setFirmaSeleccionadaUrl] = useState<string | null>(null);
  
  // Modal de Firma
  const [modalFirmaActuacion, setModalFirmaActuacion] = useState<ActuacionExpediente | null>(null);
  const [otpPaso, setOtpPaso] = useState<1 | 2 | 3>(1);
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const [firmaArchivo, setFirmaArchivo] = useState<File | null>(null);
  const [firmaPreview, setFirmaPreview] = useState<string | null>(null);
  const [enviandoFirma, setEnviandoFirma] = useState(false);
  const [enviandoOtp, setEnviandoOtp] = useState(false);

  // Modal de Devolución
  const [modalDevolucionActuacion, setModalDevolucionActuacion] = useState<ActuacionExpediente | null>(null);
  const [observacionesDevolucion, setObservacionesDevolucion] = useState('');
  const [enviandoDevolucion, setEnviandoDevolucion] = useState(false);

  const getFriendlyRoleName = (role: string) => {
    if (role === 'JEFE_GESTION_LEGAL') return 'Jefe de Gestión Legal';
    if (role === 'RESUELVE_GESTION_LEGAL') return 'Abogado Sustanciador (Resuelve)';
    return role;
  };

  const isUserAuthorizedToApprove = (metadata: any) => {
    if (!metadata) return false;
    const currentUser = authService.getCurrentUser() as any;
    if (!currentUser) return false;

    // Super admins can always authorize
    const rolesList = currentUser.roles || [];
    const isSuperAdmin = rolesList.some((r: any) => 
      typeof r === 'string' ? r === 'SUPER_ADMIN' : r.code === 'SUPER_ADMIN'
    );
    if (isSuperAdmin) return true;

    if (metadata.aprobacionTipo === 'rol' && metadata.aprobacionRol) {
      return authService.hasRole(metadata.aprobacionRol);
    }

    if (metadata.aprobacionTipo === 'usuario' && metadata.aprobacionUsuario) {
      const currentUserId = currentUser.id || currentUser.id_user || currentUser.user?.id || currentUser.user?.id_user || currentUser.person?.id;
      return String(currentUserId) === String(metadata.aprobacionUsuario);
    }

    return false;
  };

  const formatFechaHora = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otpArray];
    newOtp[index] = value;
    setOtpArray(newOtp);

    if (value !== '' && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && otpArray[index] === '' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleOpenFirmaModal = async (actuacion: ActuacionExpediente) => {
    setModalFirmaActuacion(actuacion);
    setOtpPaso(1);
    setOtpArray(['', '', '', '', '', '']);
    setFirmaArchivo(null);
    setFirmaPreview(null);
    setEnviandoOtp(true);
    
    try {
      const expId = expedienteId || String(actuacion.expedienteId);
      await legalService.enviarOtpActuacion(expId, String(actuacion.id));
      toast.success('🔑 Código OTP de 6 dígitos enviado a tu correo institucional');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al solicitar el código OTP. Intenta de nuevo.');
      setModalFirmaActuacion(null);
    } finally {
      setEnviandoOtp(false);
    }
  };

  const handleReenviarOtp = async () => {
    if (!modalFirmaActuacion) return;
    setEnviandoOtp(true);
    try {
      const expId = expedienteId || String(modalFirmaActuacion.expedienteId);
      await legalService.enviarOtpActuacion(expId, String(modalFirmaActuacion.id));
      toast.success('🔑 Nuevo código OTP enviado a tu correo institucional');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al reenviar el código OTP');
    } finally {
      setEnviandoOtp(false);
    }
  };

  const handleFirmaFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('El archivo debe ser una imagen (PNG, JPG, JPEG)');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La imagen de la firma no debe superar los 10MB');
        return;
      }
      setFirmaArchivo(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFirmaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmarFirma = async () => {
    if (!modalFirmaActuacion) return;
    const finalOtp = otpArray.join('');
    if (finalOtp.length !== 6) {
      toast.error('El código OTP debe tener 6 dígitos');
      return;
    }
    if (!firmaArchivo) {
      toast.error('Debe adjuntar una foto de su firma');
      return;
    }

    setEnviandoFirma(true);
    try {
      const expId = expedienteId || String(modalFirmaActuacion.expedienteId);
      await legalService.autorizarActuacion(
        expId,
        String(modalFirmaActuacion.id),
        finalOtp,
        firmaArchivo
      );
      toast.success('✓ Actuación autorizada y firmada electrónicamente con éxito');
      setOtpPaso(3); // Mostrar pantalla de éxito
      if (onReloadExpediente) onReloadExpediente();
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.message || 'Error al procesar la firma electrónica. Verifica el OTP.';
      toast.error(errorMsg);
    } finally {
      setEnviandoFirma(false);
    }
  };

  const handleOpenDevolucionModal = (actuacion: ActuacionExpediente) => {
    setModalDevolucionActuacion(actuacion);
    setObservacionesDevolucion('');
  };

  const handleConfirmarDevolucion = async () => {
    if (!modalDevolucionActuacion) return;
    if (!observacionesDevolucion.trim()) {
      toast.error('Debe ingresar las observaciones de la devolución');
      return;
    }

    setEnviandoDevolucion(true);
    try {
      const expId = expedienteId || String(modalDevolucionActuacion.expedienteId);
      await legalService.devolverActuacion(
        expId,
        String(modalDevolucionActuacion.id),
        observacionesDevolucion.trim()
      );
      toast.success('↩ Actuación devuelta al paso anterior en el Kanban');
      setModalDevolucionActuacion(null);
      if (onReloadExpediente) onReloadExpediente();
    } catch (err: any) {
      console.error(err);
      toast.error('Error al procesar la devolución. Intenta de nuevo.');
    } finally {
      setEnviandoDevolucion(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* ==================== HEADER ==================== */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-white border-blue-200">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Historial Cronológico de Actuaciones Procesales
            <Badge className="bg-blue-600 text-white font-bold">
              {actuaciones.length} registros
            </Badge>
          </h4>
            <div className="flex items-center gap-2">
              {botonesAccion.map((btn, idx) => (
                <Button
                  key={idx}
                  className="text-white font-semibold shadow-sm hover:opacity-90 transition-opacity border-none"
                  style={{ 
                    background: btn.color, 
                    height: '26px', 
                    padding: '0 10px', 
                    fontSize: '11px', 
                    borderRadius: '6px' 
                  }}
                  onClick={btn.onClick}
                >
                  {btn.icono}
                  {btn.label}
                </Button>
              ))}
            </div>
        </div>
      </Card>

      {/* ==================== AUDIENCIAS PROGRAMADAS (DJ) ==================== */}
      {audienciasProgramadas && audienciasProgramadas.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-white border-purple-200">
          <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-purple-600" />
            Audiencias Programadas
            <Badge className="bg-purple-600 text-white font-bold">
              {audienciasProgramadas.length}
            </Badge>
          </h4>
          <div className="space-y-2">
            {audienciasProgramadas.map((audiencia) => {
              const isPresencial = audiencia.modalidad?.toUpperCase() === 'PRESENCIAL';
              const theme = isPresencial
                ? {
                  border: 'border-orange-200',
                  bg: 'bg-orange-50/50',
                  badgeBg: 'bg-orange-100',
                  badgeText: 'text-orange-700',
                  icon: <MapPin className="w-3 h-3 text-orange-600" />
                }
                : {
                  border: 'border-purple-200',
                  bg: 'bg-purple-50/50',
                  badgeBg: 'bg-purple-100',
                  badgeText: 'text-purple-700',
                  icon: <Video className="w-3 h-3 text-purple-600" />
                };

              return (
                <Card key={audiencia.id} className={`p-3 border ${theme.border} ${theme.bg} transition-colors`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={`text-xs font-bold ${theme.badgeBg} ${theme.badgeText}`}>
                          {audiencia.tipo}
                        </Badge>
                        <Badge className="text-xs font-bold bg-green-100 text-green-700">
                          {audiencia.estado}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <p className="flex items-center gap-1.5 text-gray-700">
                          <Calendar className="w-3 h-3" />
                          <strong>{audiencia.fecha}</strong> a las {audiencia.hora}
                        </p>
                        <p className="flex items-center gap-1.5 text-gray-700">
                          {theme.icon}
                          {isPresencial ? (
                            audiencia.lugar
                          ) : audiencia.linkReunion ? (
                            <a href={audiencia.linkReunion} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline break-all" title={audiencia.linkReunion}>
                              {audiencia.linkReunion.length > 30 ? `${audiencia.linkReunion.substring(0, 30)}...` : audiencia.linkReunion}
                            </a>
                          ) : (
                            'Audiencia Virtual (Sin enlace)'
                          )}
                        </p>
                        {audiencia.abogadoResponsable && (
                          <p className="flex items-center gap-1.5 text-gray-700 col-span-2">
                            <User className="w-3 h-3" />
                            {audiencia.abogadoResponsable}
                          </p>
                        )}
                      </div>
                      {audiencia.descripcion && (
                        <p className="mt-2 text-xs text-gray-600 bg-gray-50 rounded px-2 py-1.5 border border-gray-100 italic">
                          📝 {audiencia.descripcion}
                        </p>
                      )}
                    </div>
                    {onReasignarAudiencia && (
                      <div className="flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReasignarAudiencia(audiencia)}
                          className="text-orange-600 border-orange-300 hover:bg-orange-50 font-bold text-xs"
                        >
                          🔄 Reasignar
                        </Button>
                        {onEliminarAudiencia && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEliminarAudiencia(audiencia.id)}
                            className="text-red-600 border-red-300 hover:bg-red-50 font-bold text-xs"
                          >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Eliminar
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      )}

      {/* ==================== DECISIONES REGISTRADAS (JD) ==================== */}
      {decisiones && decisiones.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-green-50 to-white border-2 border-green-200">
          <h4 className="font-bold text-sm text-green-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Decisiones Registradas ({decisiones.length})
          </h4>
          <div className="space-y-2">
            {decisiones.map((decision, index) => (
              <Card key={index} className="p-3 border border-green-200 bg-white">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-900">{decision.tipoDecision}</span>
                  <Badge
                    className="font-bold text-xs"
                    style={{
                      background: decision.tipoFallo === 'Absolutoria' ? '#10B981' : '#EF4444',
                      color: '#FFFFFF'
                    }}
                  >
                    {decision.tipoFallo}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">{decision.fecha} • {decision.responsable}</p>
                {decision.sancion && (
                  <p className="text-xs text-orange-700 mt-1 font-semibold">⚖️ {decision.sancion}</p>
                )}
              </Card>
            ))}
          </div>
        </Card>
      )}

      {/* ==================== TIMELINE DE ACTUACIONES ==================== */}
      {actuaciones.length === 0 ? (
        <Card className="p-10 text-center border border-dashed border-gray-300 bg-gray-50/50 rounded-2xl shadow-sm">
          <Clock className="w-16 h-16 mx-auto mb-4 text-gray-300 drop-shadow-sm" />
          <h4 className="font-bold text-xl text-gray-700 mb-2">
            Sin actuaciones registradas
          </h4>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Aún no se han registrado actuaciones procesales en este expediente. Haga clic en Registrar para comenzar.
          </p>
        </Card>
      ) : (
        <div className="relative mt-6">
          {/* Línea temporal vertical */}
          <div className="absolute left-[14px] top-4 bottom-4 w-[3px] bg-gradient-to-b from-blue-500 via-indigo-400 to-transparent rounded-full opacity-80" />

          {actuaciones.map((actuacion, idx) => (
            <div key={actuacion.id} className="relative pl-12 pb-8 last:pb-0 group">
              {/* Punto en la línea */}
              <div
                className="absolute left-0 top-4 w-8 h-8 rounded-full border-4 border-white shadow-[0_4px_10px_rgba(0,0,0,0.12)] flex items-center justify-center transition-transform duration-300 group-hover:scale-110 z-10"
                style={{ background: idx === 0 ? 'linear-gradient(135deg, #2563EB, #4F46E5)' : (idx === 1 ? 'linear-gradient(135deg, #60A5FA, #818CF8)' : '#E2E8F0') }}
              >
                {idx === 0 && <Activity className="w-3.5 h-3.5 text-white animate-pulse" />}
              </div>

              <Card className={`p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl rounded-2xl ${idx === 0 ? 'border border-indigo-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-gradient-to-br from-white to-blue-50/30' : 'border border-gray-100 shadow-sm bg-white hover:border-blue-100'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className="text-xs font-bold px-2.5 py-1"
                      style={{
                        background: idx === 0 ? 'linear-gradient(135deg, #003DA5, #2563EB)' : (idx === 1 ? 'linear-gradient(135deg, #3B82F6, #60A5FA)' : '#F3F4F6'),
                        color: idx <= 1 ? '#FFFFFF' : '#4B5563',
                        border: 'none',
                        boxShadow: idx <= 1 ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
                      }}
                    >
                      {actuacion.fecha}
                    </Badge>
                    {actuacion.hora && (
                      <Badge variant="outline" className="text-xs font-semibold bg-white shadow-sm border-gray-200">
                        <Clock className="w-3 h-3 mr-1 text-gray-500" />
                        {actuacion.hora}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs font-semibold bg-gray-50 text-gray-700 border-gray-200">
                      {actuacion.tipo}
                    </Badge>
                    {actuacion.origen && actuacion.origen !== 'MANUAL' && (
                      <Badge className="text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {actuacion.origen}
                      </Badge>
                    )}
                    <Badge className={`text-xs font-bold shadow-sm ${actuacion.estado === 'Completado' || actuacion.estado === 'COMPLETADA' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {actuacion.estado || 'Registrado'}
                    </Badge>
                  </div>
                  {idx === 0 && (
                    <Badge className="text-xs bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold shadow-md border-0 animate-pulse px-3 py-1">
                      ⚡ Más Reciente
                    </Badge>
                  )}
                </div>
                
                <h5 className="text-base font-bold text-gray-800 mb-2 leading-snug">
                  {actuacion.descripcion}
                </h5>
                
                <div className="flex flex-col gap-1.5 mb-4 mt-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50/50 p-2 rounded-lg border border-gray-100 w-fit">
                    <div className="bg-white p-1 rounded-md shadow-sm border border-gray-100">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <span><span className="font-semibold text-gray-700">Responsable:</span> {actuacion.responsable || 'Sistema'}</span>
                  </div>
                  {actuacion.metadata?.observaciones && (
                    <div className="text-sm text-gray-600 bg-blue-50/30 p-3 rounded-lg border border-blue-100 mt-1 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">💬</span>
                      <p className="italic leading-relaxed">{actuacion.metadata.observaciones}</p>
                    </div>
                  )}
                </div>

                {/* Flujo de Autorización y Firma Electrónica */}
                {actuacion.metadata?.estadoAutorizacion === 'PENDIENTE' && (
                  <div className="mb-4 p-4 rounded-xl border border-amber-200/60 bg-gradient-to-r from-amber-50 to-orange-50/40 shadow-sm space-y-3 relative overflow-hidden group/alert">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400/20 to-orange-500/20 blur-2xl rounded-full -mr-10 -mt-10 transition-transform duration-700 group-hover/alert:scale-150" />
                    <div className="flex items-center gap-2 text-sm font-bold text-amber-900 relative z-10">
                      <div className="p-1.5 bg-amber-100 rounded-lg shadow-sm border border-amber-200/50">
                        <Lock className="w-4 h-4 text-amber-600 animate-pulse" />
                      </div>
                      <span>Autorización y Firma Electrónica Requerida</span>
                    </div>
                    {isUserAuthorizedToApprove(actuacion.metadata) ? (
                      <div className="flex items-center gap-3 relative z-10 pt-1">
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 border-0 h-9 px-4 rounded-lg"
                          onClick={() => handleOpenFirmaModal(actuacion)}
                        >
                          <PenTool className="w-4 h-4" />
                          Firmar y Autorizar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 font-bold text-xs shadow-sm transition-all h-9 px-4 rounded-lg"
                          onClick={() => handleOpenDevolucionModal(actuacion)}
                        >
                          Devolver con observaciones
                        </Button>
                      </div>
                    ) : (
                      <div className="relative z-10 flex items-center gap-2 text-sm text-amber-800 bg-white/60 backdrop-blur-sm p-2.5 rounded-lg border border-amber-200/50">
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span>Esperando firma por parte de: <strong>{actuacion.metadata?.aprobacionTipo === 'rol' ? `Rol: ${getFriendlyRoleName(actuacion.metadata.aprobacionRol)}` : 'Usuario Asignado'}</strong></span>
                      </div>
                    )}
                  </div>
                )}

                {actuacion.metadata?.estadoAutorizacion === 'AUTORIZADO' && (
                  <div className="mb-3 p-3 rounded-lg border border-green-200 bg-green-50/50 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-green-800">
                      <div className="flex items-center gap-2 font-bold">
                        <Badge className="bg-green-600 text-white font-bold">✓ Autorizado y Firmado</Badge>
                        <span>Firmado electrónicamente por {actuacion.metadata.firmadoPor}</span>
                      </div>
                      {actuacion.metadata.fechaFirma && (
                        <span className="text-gray-500 font-semibold">
                          Fecha: {formatFechaHora(actuacion.metadata.fechaFirma)}
                        </span>
                      )}
                    </div>
                    {actuacion.metadata.firmaFotoUrl && (
                      <button
                        onClick={() => setFirmaSeleccionadaUrl(actuacion.metadata.firmaFotoUrl)}
                        className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline bg-transparent border-none cursor-pointer p-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Ver Firma Adjunta
                      </button>
                    )}
                  </div>
                )}

                {actuacion.metadata?.estadoAutorizacion === 'DEVUELTO' && (
                  <div className="mb-3 p-3 rounded-lg border border-red-200 bg-red-50/50 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                      <Badge className="bg-red-600 text-white font-bold">⚠️ Devuelto</Badge>
                      <span>Devuelto con observaciones por {actuacion.metadata.devueltoPor}</span>
                    </div>
                    {actuacion.metadata.observacionesDevolucion && (
                      <p className="text-xs text-red-700 bg-white p-2 rounded border border-red-100 font-semibold mt-1">
                        &ldquo;{actuacion.metadata.observacionesDevolucion}&rdquo;
                      </p>
                    )}
                    {actuacion.metadata.fechaDevolucion && (
                      <p className="text-[10px] text-gray-400 text-right">
                        Fecha: {formatFechaHora(actuacion.metadata.fechaDevolucion)}
                      </p>
                    )}
                  </div>
                )}

                {/* Documento adjunto */}
                {actuacion.documentoUrl && (
                  <div className="mb-2 p-2 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-bold text-blue-800 truncate max-w-[200px]">
                        {actuacion.documentoNombre || 'Documento adjunto'}
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          // Extract the stored filename from the documentoUrl (e.g. "/uploads/abc123.pdf" → "abc123.pdf")
                          const storedFilename = actuacion.documentoUrl!.split('/').pop() || 'documento';
                          const downloadName = actuacion.documentoNombre || storedFilename;
                          const downloadUrl = buildServiceAssetUrl('legal', `/files/download/${encodeURIComponent(storedFilename)}?name=${encodeURIComponent(downloadName)}`);
                          
                          const response = await fetch(downloadUrl);
                          if (!response.ok) throw new Error('Error al descargar');
                          
                          const blob = await response.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = blobUrl;
                          a.download = downloadName;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(blobUrl);
                        } catch (err) {
                          console.error('Error descargando archivo de actuación:', err);
                          alert('No se pudo descargar el archivo. Verifique que el archivo exista en el servidor.');
                        }
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none"
                    >
                      <Download className="w-3 h-3" />
                      Descargar
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <User className="w-3 h-3" />
                      {actuacion.responsable}
                    </p>
                    {actuacion.createdAt && (
                      <p className="text-xs text-gray-400">
                        Registrado: {actuacion.createdAt}
                      </p>
                    )}
                  </div>
                  <Badge
                    className="text-xs font-semibold"
                    style={{
                      background: actuacion.estado === 'Completado' || actuacion.estado === 'COMPLETADA'
                        ? '#D1FAE5'
                        : actuacion.estado === 'Programado'
                          ? '#EDE9FE'
                          : '#FEF3C7',
                      color: actuacion.estado === 'Completado' || actuacion.estado === 'COMPLETADA'
                        ? '#065F46'
                        : actuacion.estado === 'Programado'
                          ? '#5B21B6'
                          : '#92400E'
                    }}
                  >
                    {actuacion.estado === 'COMPLETADA' ? 'Completado' : actuacion.estado}
                  </Badge>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Firma Electrónica */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {modalFirmaActuacion && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalFirmaActuacion(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 relative">
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-indigo-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
                
                <div className="mb-6 relative z-10 flex items-center gap-4 pr-8">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center">
                    <PenTool className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                      Firma Electrónica
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      Autorizando: <strong className="text-gray-800">{modalFirmaActuacion.descripcion}</strong>
                    </p>
                  </div>
                </div>

                {otpPaso === 3 ? (
              <div className="text-center py-6 relative z-10">
                <div className="relative">
                  <div className="w-20 h-20 bg-emerald-100 text-[#059669] rounded-full flex items-center justify-center mx-auto mb-5 relative z-10">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-20 bg-emerald-100 rounded-full z-0 animate-ping opacity-75" />
                </div>

                <h3 className="text-2xl font-black text-gray-900 mb-2">¡Firma Exitosa!</h3>
                <p className="text-sm text-gray-500 mb-8">
                  La actuación ha sido autorizada y firmada electrónicamente.
                </p>

                <Button
                  onClick={() => setModalFirmaActuacion(null)}
                  className="w-full bg-[#003DA5] text-white py-6 rounded-xl font-bold text-base hover:bg-blue-800 transition-colors flex justify-center items-center shadow-lg shadow-blue-500/20"
                >
                  Continuar
                </Button>
              </div>
            ) : otpPaso === 1 ? (
              <div className="space-y-6 relative z-10">
                <div className="p-4 bg-blue-50/80 backdrop-blur-sm border border-blue-100 rounded-xl text-sm text-blue-900 flex items-start gap-3 shadow-sm">
                  <Lock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-blue-950 block mb-0.5">Código OTP de seguridad enviado</span>
                    Hemos enviado un código de 6 dígitos a su correo electrónico. Este código expirará en 15 minutos.
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700 text-center">
                    Ingrese el Código OTP de verificación
                  </label>
                  <div className="flex justify-center gap-2 mb-2">
                    {otpArray.map((digit, i) => (
                      <input
                        key={i}
                        id={`otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value.replace(/[^0-9]/g, ''))}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        maxLength={1}
                        className="w-12 h-14 text-center text-xl font-bold text-[#003DA5] border-2 border-gray-200 rounded-xl focus:border-[#003DA5] focus:ring-2 focus:ring-blue-100 outline-none transition-all bg-white"
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleReenviarOtp}
                    disabled={enviandoOtp}
                    className="text-sm font-bold text-blue-600 hover:text-blue-800 disabled:text-gray-400 hover:underline flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${enviandoOtp ? 'animate-spin' : ''}`} />
                    {enviandoOtp ? 'Reenviando...' : 'Reenviar código OTP'}
                  </button>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Paso 1 de 2</span>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    className="border-gray-200 text-gray-700 font-bold hover:bg-gray-50 h-11 px-6 rounded-xl"
                    onClick={() => setModalFirmaActuacion(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-11 px-8 rounded-xl shadow-md hover:shadow-lg transition-all"
                    onClick={() => {
                      const finalOtp = otpArray.join('');
                      if (finalOtp.length !== 6) {
                        toast.error('El código OTP debe tener exactamente 6 dígitos');
                        return;
                      }
                      setOtpPaso(2);
                    }}
                  >
                    Continuar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 relative z-10">
                <div className="p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-100 rounded-xl text-sm text-amber-900 flex items-start gap-3 shadow-sm">
                  <Upload className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-amber-950 block mb-0.5">Adjuntar rúbrica digital</span>
                    Por favor, adjunte una fotografía o imagen legible de su firma manuscrita para registrarla oficial y legalmente en la actuación.
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-bold text-gray-700">
                    Cargar Imagen de la Firma *
                  </label>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-blue-50/50 hover:border-blue-300 transition-all duration-300 relative group/dropzone">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFirmaFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    {firmaPreview ? (
                      <div className="space-y-3 relative z-0">
                        <div className="relative inline-block">
                          <div className="absolute -inset-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl blur opacity-20"></div>
                          <img
                            src={firmaPreview}
                            alt="Vista previa firma"
                            className="relative max-h-28 mx-auto object-contain border border-gray-200 rounded-lg p-2 bg-white shadow-sm"
                          />
                        </div>
                        <div className="flex items-center justify-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 w-fit mx-auto px-3 py-1 rounded-full">
                          <CheckCircle className="w-4 h-4" />
                          <span className="truncate max-w-[200px]">{firmaArchivo?.name}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 relative z-0">
                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-3 group-hover/dropzone:scale-110 transition-transform duration-300">
                          <Upload className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-bold text-gray-700">
                          Haga clic o arrastre una imagen aquí
                        </p>
                        <p className="text-xs text-gray-500 font-medium">
                          Formatos: PNG, JPG, JPEG (Max. 10MB)
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setOtpPaso(1)}
                    className="text-sm font-bold text-gray-500 hover:text-gray-800 hover:underline bg-transparent border-none cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    ← Volver al código OTP
                  </button>
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">Paso 2 de 2</span>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    className="border-gray-200 text-gray-700 font-bold hover:bg-gray-50 h-11 px-6 rounded-xl"
                    onClick={() => setModalFirmaActuacion(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-11 px-6 rounded-xl shadow-md hover:shadow-lg transition-all"
                    onClick={handleConfirmarFirma}
                    disabled={enviandoFirma || !firmaArchivo}
                  >
                    {enviandoFirma ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Procesando Firma...
                      </>
                    ) : (
                      'Confirmar Firma Electrónica'
                    )}
                  </Button>
                </div>
              </div>
            )}
              </div>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal de Devolución */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {modalDevolucionActuacion && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
            >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setModalDevolucionActuacion(null)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors z-20"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-6 relative">
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-red-400/10 to-rose-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
                
                <div className="mb-6 relative z-10 flex items-start gap-4 pr-8">
                  <div className="bg-gradient-to-br from-red-500 to-rose-600 p-3 rounded-xl shadow-lg shadow-red-200 flex items-center justify-center shrink-0">
                    <X className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                      Devolver Actuación
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 leading-relaxed">
                      La actuación será devuelta con estado <span className="font-bold text-red-600">DEVUELTO</span>. El autor deberá corregir las observaciones indicadas antes de poder avanzar.
                    </p>
                  </div>
                </div>

                <div className="space-y-5 relative z-10">
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-800">
                      Observaciones y motivos del rechazo <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={observacionesDevolucion}
                      onChange={(e) => setObservacionesDevolucion(e.target.value)}
                      placeholder="Escriba claramente las razones por las cuales no se aprueba esta actuación..."
                      rows={5}
                      className="w-full px-4 py-3 bg-gray-50/50 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-500/20 focus:border-red-400 text-sm transition-all resize-none shadow-inner"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      className="border-gray-200 text-gray-700 font-bold hover:bg-gray-50 h-11 px-6 rounded-xl"
                      onClick={() => setModalDevolucionActuacion(null)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold h-11 px-6 rounded-xl shadow-md hover:shadow-lg transition-all"
                      onClick={handleConfirmarDevolucion}
                      disabled={enviandoDevolucion || !observacionesDevolucion.trim()}
                    >
                      {enviandoDevolucion ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Procesando...
                        </>
                      ) : (
                        'Confirmar Devolución'
                      )}
                    </Button>
                  </div>
                </div>
                </div>
              </div>
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Visualizador de Firma Adjunta */}
      {firmaSeleccionadaUrl && (
        <Dialog open={!!firmaSeleccionadaUrl} onOpenChange={() => setFirmaSeleccionadaUrl(null)}>
          <DialogContent className="max-w-md w-full bg-white rounded-xl shadow-2xl p-6 border border-gray-100 flex flex-col items-center">
            <DialogHeader className="w-full border-b pb-3 mb-4">
              <DialogTitle className="text-lg font-black text-gray-900 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-gray-700" />
                Firma Electrónica Registrada
              </DialogTitle>
            </DialogHeader>

            <div className="w-full p-4 bg-gray-50 border rounded-lg flex items-center justify-center min-h-[150px]">
              <img
                src={buildServiceAssetUrl('legal', firmaSeleccionadaUrl)}
                alt="Firma Electrónica"
                className="max-h-40 max-w-full object-contain"
              />
            </div>

            <div className="w-full flex justify-end gap-2 border-t pt-4 mt-4">
              <Button
                className="bg-gray-800 hover:bg-gray-900 text-white font-bold"
                onClick={() => setFirmaSeleccionadaUrl(null)}
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}
