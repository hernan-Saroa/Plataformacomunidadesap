/**
 * TabActuacionesExpediente - Tab de Actuaciones COMPARTIDA
 * ✅ Usada por ModalExpediente.tsx y ModalProcesoDisciplinario.tsx
 * ✅ Timeline unificado con línea vertical y puntos
 * ✅ Soporta acciones configurables (Audiencias en DJ, Decisiones en JD)
 * ✅ Header con botones parametrizables
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, User, Activity, Plus, Clock, MapPin, Trash2, Download, Paperclip, ExternalLink, Video, Lock, PenTool, Upload, RefreshCw, CheckCircle, X, FileText, Settings, Info, CornerUpLeft, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Card } from '@esap-mfe/shared-ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@esap-mfe/shared-ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import type { ActuacionExpediente } from './expedienteShared';
import { buildServiceAssetUrl } from '../../../../config/environment';
import { authService } from '../../../../services/api/authService';
import { legalService } from '../../../../services/api/legal.service';
import { FirmaDigitalActuacion, FirmaData } from './FirmaDigitalActuacion';

// ==================== TIPOS ====================

interface BotonAccion {
  label: string;
  icono: React.ReactNode;
  onClick: () => Promise<any> | void;
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
  onViewDocument?: (doc: any) => void;
  onAutoAdvanceStage?: () => void;
  onDeleteActuacion?: (id: string) => Promise<void> | void;
  onSendEmail?: (data: { para: string; cc?: string; asunto: string; cuerpo: string; archivos?: File[] }) => void;
  /**
   * Consecutivo/radicado legible del proceso (p. ej. "9756492-99c5..."). Se usa en el asunto y
   * cuerpo del correo para mostrar el número del proceso en vez del UUID interno (expedienteId).
   */
  radicadoExpediente?: string;
  /**
   * Configuración de aprobación de la ETAPA ACTUAL del expediente (campo "Aprobación para entrar").
   * Si la etapa actual exige aprobación, las actuaciones quedan pendientes de firma y solo
   * el rol/usuario configurado (o un super admin) puede autorizarlas. Es dinámica: depende
   * de la etapa en la que se encuentre actualmente el expediente.
   */
  aprobacionEtapaActual?: {
    aprobacionTipo?: 'ninguno' | 'rol' | 'usuario';
    aprobacionRol?: string;
    aprobacionUsuario?: string;
    nombreEtapa?: string;
  } | null;
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
  onReloadExpediente,
  onViewDocument,
  onAutoAdvanceStage,
  onDeleteActuacion,
  onSendEmail,
  radicadoExpediente,
  aprobacionEtapaActual
}: TabActuacionesExpedienteProps) {
  const [firmaSeleccionadaUrl, setFirmaSeleccionadaUrl] = useState<string | null>(null);
  const [lockedButtons, setLockedButtons] = useState<number[]>([]);

  const handleButtonClick = async (btn: BotonAccion, idx: number) => {
    if (lockedButtons.includes(idx)) return;
    setLockedButtons(prev => [...prev, idx]);
    try {
      const result = btn.onClick();
      if (result instanceof Promise) {
        await result;
      }
    } catch (err) {
      console.error('Error executing action:', err);
    } finally {
      setTimeout(() => {
        setLockedButtons(prev => prev.filter(i => i !== idx));
      }, 1500);
    }
  };

  // Helper to check if all associated documents for an actuation are signed
  const checkAllAssociatedDocsSigned = (act: ActuacionExpediente) => {
    const associatedDocIds = act.metadata?.documentosAsociados || [];
    const resolvedDocs = documentosExpediente.filter(doc => {
      const docIdStr = String(doc.id);
      return Array.isArray(associatedDocIds) && associatedDocIds.some((id: any) => String(id) === docIdStr);
    });
    const isDocSigned = (d: any) => {
      if (!d) return false;
      if (d.descripcion) {
        try {
          const data = JSON.parse(d.descripcion);
          return !!(data && data.firmado);
        } catch (e) {
          return false;
        }
      }
      return false;
    };
    return resolvedDocs.every(doc => isDocSigned(doc));
  };

  const handleSendEmail = async (actuacion: ActuacionExpediente) => {
    const loadingToastId = toast.loading('🔄 Preparando correo y descargando adjuntos...', { duration: 0 } as any);
    try {
      const filesToAttach: File[] = [];
      const failedAttachments: string[] = [];

      const urlToFile = async (url: string, filename: string): Promise<File | null> => {
        try {
          let storedFilename = url.split('/').pop() || 'documento';
          if (url.includes('/correos/adjuntos/')) {
            const regex = /\/adjuntos\/([^/]+)/;
            const match = url.match(regex);
            if (match) {
              storedFilename = match[1];
              if (storedFilename.endsWith('/download')) {
                storedFilename = storedFilename.replace('/download', '');
              }
            }
          }
          
          let downloadUrl = '';
          if (url.includes('/correos/adjuntos/')) {
            const baseUrl = buildServiceAssetUrl('legal', '');
            const cleanUrl = url.startsWith('/legal') ? url.replace('/legal', '') : url;
            downloadUrl = `${baseUrl.replace(/\/$/, '')}${cleanUrl.startsWith('/') ? '' : '/'}${cleanUrl}`;
          } else {
            downloadUrl = buildServiceAssetUrl('legal', `/files/download/${encodeURIComponent(storedFilename)}?name=${encodeURIComponent(filename)}`);
          }

          const response = await fetch(downloadUrl);
          if (!response.ok) return null;
          const blob = await response.blob();
          return new File([blob], filename, { type: blob.type || 'application/pdf' });
        } catch (e) {
          console.error('Error fetching file for email attachment:', e);
          return null;
        }
      };

      // Documento principal
      if (actuacion.documentoUrl) {
        const docName = actuacion.documentoNombre || 'documento.pdf';
        const fileObj = await urlToFile(actuacion.documentoUrl, docName);
        if (fileObj) filesToAttach.push(fileObj);
        else failedAttachments.push(docName);
      }

      // Documentos asociados (firmados). Resolvemos contra la lista MÁS RECIENTE de documentos
      // para asegurar que se adjunte la versión "(Firmado)" — evita la carrera del useEffect de carga.
      const expId = expedienteId || String(actuacion.expedienteId);
      let docsParaResolver = documentosExpediente;
      try {
        const freshDocs = await legalService.getDocumentos(expId);
        if (Array.isArray(freshDocs) && freshDocs.length > 0) {
          docsParaResolver = freshDocs;
        }
      } catch (e) {
        console.error('No se pudo refrescar documentos para adjuntar; se usa la lista en memoria.', e);
      }

      const associatedDocIds = actuacion.metadata?.documentosAsociados || [];
      const resolvedDocs = docsParaResolver.filter(doc => {
        const docIdStr = String(doc.id);
        return Array.isArray(associatedDocIds) && associatedDocIds.some((id: any) => String(id) === docIdStr);
      });

      for (const doc of resolvedDocs) {
        const docUrl = doc.archivoUrl || doc.url;
        const docName = doc.nombre || 'documento_asociado.pdf';
        if (docUrl) {
          const fileObj = await urlToFile(docUrl, docName);
          if (fileObj) filesToAttach.push(fileObj);
          else failedAttachments.push(docName);
        } else {
          failedAttachments.push(docName);
        }
      }

      // Consecutivo legible del proceso para el correo (no el UUID interno del expediente).
      const numeroProceso = radicadoExpediente || expedienteId || actuacion.expedienteId || '';

      const emailData = {
        para: '',
        asunto: `Actuación: ${actuacion.descripcion} - Expediente #${numeroProceso}`,
        cuerpo: `Cordial saludo,\n\nSe remite la actuación "${actuacion.descripcion}" relacionada con el expediente #${numeroProceso}.\n\nDetalles de la actuación:\n- Tipo: ${actuacion.tipo}\n- Fecha: ${actuacion.fecha}\n\nAtentamente,\nOficina Jurídica ESAP`,
        archivos: filesToAttach,
      };

      if (!onSendEmail) {
        toast.error('La funcionalidad de envío de correo no está disponible en este contexto.', { id: loadingToastId });
        return;
      }

      if (failedAttachments.length > 0) {
        toast.warning('⚠️ Algunos adjuntos no se pudieron descargar', {
          id: loadingToastId,
          description: `Se enviará el correo sin: ${failedAttachments.join(', ')}`,
        });
      } else {
        toast.success('📨 Correo preparado con adjuntos', { id: loadingToastId });
      }

      // Siempre abrimos el correo con los adjuntos válidos (no se bloquea por uno fallido)
      onSendEmail(emailData);
    } catch (error) {
      console.error('Error al preparar el correo:', error);
      toast.error('❌ Error al preparar el correo con los adjuntos', { id: loadingToastId });
    }
  };

  const canDeleteActuacion = (act: ActuacionExpediente) => {
    // 1. No se pueden eliminar las transiciones de etapa ni trazas del sistema
    if (act.tipo === 'CAMBIO_ETAPA' || (act.origen && act.origen !== 'MANUAL')) {
      return false;
    }
    // 2. No se pueden eliminar actuaciones ya autorizadas
    if (act.metadata?.estadoAutorizacion === 'AUTORIZADO') {
      return false;
    }
    const associatedDocIds = act.metadata?.documentosAsociados || [];
    const resolvedDocs = documentosExpediente.filter(doc => {
      const docIdStr = String(doc.id);
      return Array.isArray(associatedDocIds) && associatedDocIds.some((id: any) => String(id) === docIdStr);
    });
    const isDocSigned = (d: any) => {
      if (!d) return false;
      if (d.descripcion) {
        try {
          const data = JSON.parse(d.descripcion);
          return !!(data && data.firmado);
        } catch (e) {
          return false;
        }
      }
      return false;
    };
    return !resolvedDocs.some(doc => isDocSigned(doc));
  };
  
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

  // Modal de Detalle de Actuación
  const [actuacionDetalle, setActuacionDetalle] = useState<ActuacionExpediente | null>(null);

  // Mapa de resolución de nombres de usuario
  const [userNamesMap, setUserNamesMap] = useState<Record<string, string>>({});

  // Lista de documentos del expediente para resolver adjuntos
  const [documentosExpediente, setDocumentosExpediente] = useState<any[]>([]);

  useEffect(() => {
    if (expedienteId) {
      legalService.getDocumentos(expedienteId)
        .then((docs) => {
          if (Array.isArray(docs)) {
            setDocumentosExpediente(docs);
          }
        })
        .catch((err) => {
          console.error('Error fetching documentos in TabActuacionesExpediente:', err);
        });
    }
  }, [expedienteId, actuaciones]);

  useEffect(() => {
    let active = true;
    async function loadUsers() {
      const map: Record<string, string> = {};
      try {
        const profesionales = await authService.getProfesionales();
        if (active && Array.isArray(profesionales)) {
          profesionales.forEach((u: any) => {
            const id = u.id || u.id_user || u.user?.id_user || u.person?.id;
            const firstName = u.person?.first_name || u.first_name || '';
            const lastName = u.person?.last_name || u.last_name || '';
            const fullName = u.full_name || u.fullName || `${firstName} ${lastName}`.trim();
            if (id && fullName) {
              map[String(id)] = fullName;
            }
          });
        }
      } catch (err) {
        console.error('Error fetching profesionales in TabActuacionesExpediente:', err);
      }

      try {
        const abogados = await legalService.getAbogadosDashboard();
        if (active && Array.isArray(abogados)) {
          abogados.forEach((abogado: any) => {
            const id = abogado.id;
            const fullName = abogado.nombreCompleto || abogado.nombre;
            if (id && fullName) {
              map[String(id)] = fullName;
            }
          });
        }
      } catch (err) {
        console.error('Error fetching abogados dashboard in TabActuacionesExpediente:', err);
      }

      try {
        const todosLosUsuarios = await authService.getTodosLosUsuariosActivos();
        if (active && Array.isArray(todosLosUsuarios)) {
          todosLosUsuarios.forEach((u: any) => {
            if (u.id && u.nombre) {
              map[String(u.id)] = u.nombre;
            }
          });
        }
      } catch (err) {
        console.error('Error fetching todos los usuarios in TabActuacionesExpediente:', err);
      }

      if (active) {
        setUserNamesMap(map);
      }
    }

    loadUsers();
    return () => {
      active = false;
    };
  }, []);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (modalFirmaActuacion || modalDevolucionActuacion || actuacionDetalle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [modalFirmaActuacion, modalDevolucionActuacion, actuacionDetalle]);

  const getFriendlyRoleName = (role: string) => {
    if (role === 'JEFE_GESTION_LEGAL') return 'Jefe de Gestión Legal';
    if (role === 'RESUELVE_GESTION_LEGAL') return 'Abogado Sustanciador (Resuelve)';
    return role;
  };

  // ¿La etapa siguiente exige aprobación para entrar? (dinámico según etapa actual del expediente)
  const requiereFirmaEtapa = !!(aprobacionEtapaActual && aprobacionEtapaActual.aprobacionTipo && aprobacionEtapaActual.aprobacionTipo !== 'ninguno');

  /**
   * Estado de firma DERIVADO de la etapa actual del expediente (no congelado al crear).
   * - AUTORIZADO / DEVUELTO: resultado real de una acción de aprobación (persistido).
   * - PENDIENTE: la etapa siguiente requiere aprobación y aún no se ha firmado.
   * - NINGUNO: entrada directa (no requiere firma).
   */
  const getEstadoFirma = (act: ActuacionExpediente): 'AUTORIZADO' | 'DEVUELTO' | 'PENDIENTE' | 'NINGUNO' => {
    const stored = act?.metadata?.estadoAutorizacion;
    // AUTORIZADO/DEVUELTO son resultado real de una aprobación persistida: NO deben depender
    // de requiereFirmaEtapa (que cambia al avanzar de etapa). Se evalúan primero.
    if (stored === 'AUTORIZADO') return 'AUTORIZADO';
    if (stored === 'DEVUELTO') return 'DEVUELTO';
    // Las actuaciones del sistema (cambios de etapa, trazas) nunca requieren firma
    if (act?.tipo === 'CAMBIO_ETAPA' || (act?.origen && act.origen !== 'MANUAL')) return 'NINGUNO';
    return requiereFirmaEtapa ? 'PENDIENTE' : 'NINGUNO';
  };

  /**
   * ¿Se puede enviar por correo esta actuación? Fuente de verdad única para el botón
   * "Enviar Correo" tanto en la tarjeta como en el modal de detalle.
   * Una actuación AUTORIZADA ya implica que sus documentos fueron firmados (requisito previo
   * para autorizar), por lo que NO se vuelve a exigir checkAllAssociatedDocsSigned aquí
   * (esa comprobación podía ocultar el botón por carreras de carga o flags ausentes).
   */
  const canSendEmail = (act: ActuacionExpediente): boolean => {
    if (!onSendEmail) return false;
    if (act?.tipo === 'CAMBIO_ETAPA') return false;
    if (act?.origen && act.origen !== 'MANUAL') return false;
    return getEstadoFirma(act) === 'AUTORIZADO';
  };

  /**
   * Valida si el usuario activo puede autorizar/firmar, según el rol o usuario configurado
   * en la etapa siguiente ("Aprobación para entrar"). Los super admin siempre pueden.
   */
  const isUserAuthorizedToApprove = () => {
    if (!requiereFirmaEtapa || !aprobacionEtapaActual) return false;
    const currentUser = authService.getCurrentUser() as any;
    if (!currentUser) return false;

    // Super admins can always authorize
    const rolesList = currentUser.roles || [];
    const isSuperAdmin = rolesList.some((r: any) =>
      typeof r === 'string' ? r === 'SUPER_ADMIN' : r.code === 'SUPER_ADMIN' || r.name === 'SUPER_ADMIN'
    );
    if (isSuperAdmin) return true;

    if (aprobacionEtapaActual.aprobacionTipo === 'rol' && aprobacionEtapaActual.aprobacionRol) {
      return authService.hasRole(aprobacionEtapaActual.aprobacionRol);
    }

    if (aprobacionEtapaActual.aprobacionTipo === 'usuario' && aprobacionEtapaActual.aprobacionUsuario) {
      const currentUserId = currentUser.id || currentUser.id_user || currentUser.user?.id || currentUser.user?.id_user || currentUser.person?.id;
      return String(currentUserId) === String(aprobacionEtapaActual.aprobacionUsuario);
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

  const handleConfirmarFirmaHash = async (firmaData: FirmaData) => {
    if (!modalFirmaActuacion) return;

    setEnviandoFirma(true);
    try {
      const expId = expedienteId || String(modalFirmaActuacion.expedienteId);
      
      // Generar dummy file para satisfacer al backend sin pedir foto
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const dataUrl = canvas.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const dummyFile = new File([blob], `firma-${firmaData.certificado_id}.png`, { type: 'image/png' });

      await legalService.autorizarActuacion(
        expId,
        String(modalFirmaActuacion.id),
        firmaData.pin_verificado ? otpArray.join('') : otpArray.join(''), // PIN
        dummyFile
      );
      
      toast.success('✍️ Actuación firmada y autorizada exitosamente');
      if (onAutoAdvanceStage) {
        onAutoAdvanceStage();
      } else if (onReloadExpediente) {
        onReloadExpediente();
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.message || 'Error al procesar la firma electrónica. Verifica el OTP.';
      toast.error(errorMsg);
    } finally {
      setEnviandoFirma(false);
      setModalFirmaActuacion(null);
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

  const downloadDocumentFile = async (docUrl: string, docNombre: string) => {
    try {
      const storedFilename = docUrl.split('/').pop() || 'documento';
      const downloadName = docNombre || storedFilename;
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
      toast.error('No se pudo descargar el archivo.');
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
              {botonesAccion.map((btn, idx) => {
                const getBtnClasses = (color: string) => {
                  if (color === '#003DA5') return 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs';
                  if (color === '#10B981') return 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs';
                  if (color === '#7C3AED') return 'bg-violet-600 hover:bg-violet-700 text-white shadow-xs';
                  if (color === '#EF4444') return 'bg-red-600 hover:bg-red-700 text-white shadow-xs';
                  return 'bg-slate-700 hover:bg-slate-800 text-white shadow-xs';
                };
                const isLocked = lockedButtons.includes(idx);
                return (
                  <Button
                    key={idx}
                    className={`h-8 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${!isLocked ? 'hover:-translate-y-0.5 active:translate-y-0 hover:shadow-md' : 'opacity-60 cursor-not-allowed pointer-events-none'} border-none ${getBtnClasses(btn.color)}`}
                    onClick={() => handleButtonClick(btn, idx)}
                    disabled={isLocked}
                  >
                    {isLocked ? (
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0 mr-0.5" />
                    ) : (
                      btn.icono && React.isValidElement(btn.icono)
                        ? React.cloneElement(btn.icono as React.ReactElement, { className: 'w-3.5 h-3.5 flex-shrink-0 mr-0' })
                        : btn.icono
                    )}
                    {btn.label}
                  </Button>
                );
              })}
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
                          className="h-8 px-3 text-xs font-bold text-amber-700 border border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 hover:shadow-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Reasignar
                        </Button>
                        {onEliminarAudiencia && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEliminarAudiencia(audiencia.id)}
                            className="h-8 px-3 text-xs font-bold text-red-600 border border-red-200 bg-red-50/50 hover:bg-red-50 hover:border-red-300 hover:shadow-xs rounded-lg transition-all flex items-center justify-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* ==================== TIMELINE DE ACTUACIONES (WORLD-CLASS DESIGN) ==================== */}
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
        <div className="mt-6 space-y-4">
          {actuaciones.map((actuacion, idx) => {
            const isCompleted = actuacion.estado === 'Completado' || actuacion.estado === 'COMPLETADA';
            const isScheduled = actuacion.estado === 'Programado';
            const isRecent = idx === 0;
            // Solo es relevante "firma pendiente" si la etapa siguiente exige aprobación.
            // En entrada directa los documentos no requieren firma.
            const hasUnsignedDocs = getEstadoFirma(actuacion) === 'PENDIENTE' && !checkAllAssociatedDocsSigned(actuacion);

            return (
              <Card 
                key={actuacion.id}
                className={`group relative overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer rounded-xl border ${
                  hasUnsignedDocs 
                    ? 'border-amber-300 hover:border-amber-400 bg-amber-50/10 hover:bg-amber-50/20' 
                    : 'border-slate-200 hover:border-blue-300 bg-white hover:bg-slate-50/50'
                }`}
                onClick={() => setActuacionDetalle(actuacion)}
              >
                {/* Decorator on the left based on status */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 group-hover:w-2"
                  style={{ background: isCompleted ? '#10B981' : isScheduled ? '#8B5CF6' : '#F59E0B' }}
                />

                 <div className="p-3 sm:p-4 pl-5 sm:pl-6">
                  <div className="flex flex-col gap-2">
                    {/* Row 1: Title, ID & Date / User metadata */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h4 className="text-[14px] font-extrabold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                          {actuacion.descripcion}
                        </h4>
                        {isRecent && (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-bold text-[9px] px-1.5 py-0.2 rounded shadow-xs shrink-0">
                            ✨ Nuevo
                          </Badge>
                        )}
                        <span className="text-[9px] font-semibold text-slate-400 font-mono shrink-0">
                          #{actuacion.id}
                        </span>
                      </div>

                      {/* Compact Date/Time and Responsable inline */}
                      <div className="flex items-center gap-2.5 text-[11px] text-slate-500 font-semibold shrink-0">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {actuacion.fecha} {actuacion.hora && `• ${actuacion.hora}`}
                        </span>
                        <span className="text-slate-300 font-normal">|</span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <User className="w-3 h-3 text-slate-400" />
                          {actuacion.responsable || 'Sistema'}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Badges (Status/Tags) & Comments (inline) & Actions (inline right) */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1.5 border-t border-slate-100/60">
                      {/* Badges and Comments */}
                      <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-slate-200">
                          <FileText className="w-3 h-3 text-slate-400" />
                          {actuacion.tipo}
                        </span>
                        
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border"
                          style={{
                            background: isCompleted ? '#ECFDF5' : isScheduled ? '#F5F3FF' : '#FFFBEB',
                            color: isCompleted ? '#059669' : isScheduled ? '#7C3AED' : '#D97706',
                            borderColor: isCompleted ? '#D1FAE5' : isScheduled ? '#EDE9FE' : '#FEF3C7'
                          }}
                        >
                          {isCompleted ? <CheckCircle className="w-3 h-3" /> : isScheduled ? <Calendar className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                          {actuacion.estado === 'COMPLETADA' ? 'Completado' : actuacion.estado}
                        </span>

                        {hasUnsignedDocs && (
                          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-extrabold border border-amber-200 animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            Firma Pendiente
                          </span>
                        )}

                        {actuacion.origen && actuacion.origen !== 'MANUAL' && (
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
                            <Settings className="w-3 h-3 text-indigo-400" />
                            {actuacion.origen}
                          </span>
                        )}

                        {actuacion.metadata?.observaciones && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 italic bg-slate-50 border border-slate-100 rounded px-2 py-0.5 truncate max-w-[200px] sm:max-w-[300px]" title={actuacion.metadata.observaciones}>
                            📝 {actuacion.metadata.observaciones}
                          </span>
                        )}
                      </div>

                      {/* Actions and status on the right */}
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        {getEstadoFirma(actuacion) === 'PENDIENTE' && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {checkAllAssociatedDocsSigned(actuacion) ? (
                              <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-850 text-[9px] font-extrabold py-0.5 px-1.5 inline-flex items-center gap-1 rounded hover:bg-emerald-50 shadow-none">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                Documentos Firmados
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 border border-amber-200 text-amber-800 text-[9px] font-extrabold py-0.5 px-1.5 inline-flex items-center gap-1 rounded hover:bg-amber-50 shadow-none">
                                <Lock className="w-3 h-3 text-amber-600 animate-pulse" />
                                Firma Pendiente ({aprobacionEtapaActual?.aprobacionTipo === 'rol' ? getFriendlyRoleName(aprobacionEtapaActual?.aprobacionRol || '') : 'Usuario'})
                              </Badge>
                            )}
                          </div>
                        )}

                        {getEstadoFirma(actuacion) === 'AUTORIZADO' && (
                          <Badge className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-extrabold py-0.5 px-1.5 inline-flex items-center gap-1 rounded hover:bg-emerald-50 shadow-none">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Firmado por {actuacion.metadata.firmadoPor}
                          </Badge>
                        )}

                        {getEstadoFirma(actuacion) === 'DEVUELTO' && (
                          <Badge className="bg-red-50 border border-red-200 text-red-800 text-[9px] font-extrabold py-0.5 px-1.5 inline-flex items-center gap-1 rounded hover:bg-red-50 shadow-none" title={actuacion.metadata.observacionesDevolucion}>
                            <X className="w-3 h-3 text-red-600" />
                            Devuelto por {actuacion.metadata.devueltoPor}
                          </Badge>
                        )}

                        {canSendEmail(actuacion) && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendEmail(actuacion);
                            }}
                            variant="outline"
                            className="h-8 px-3 text-xs font-bold text-violet-700 border border-violet-200 bg-violet-50/30 hover:bg-violet-50 hover:border-violet-300 hover:text-violet-800 hover:shadow-xs rounded-lg transition-all flex items-center gap-1.5"
                            title="Enviar Correo con Actuación y Adjuntos"
                          >
                            <Mail className="w-3.5 h-3.5 text-violet-600" />
                            <span>Enviar Correo</span>
                          </Button>
                        )}

                        {actuacion.documentoUrl && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadDocumentFile(actuacion.documentoUrl!, actuacion.documentoNombre || 'documento');
                            }}
                            variant="outline"
                            className="h-8 px-3 text-xs font-bold text-blue-700 border border-blue-200 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-300 hover:shadow-xs rounded-lg transition-all flex items-center gap-1.5"
                            title={actuacion.documentoNombre || 'Descargar Documento'}
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Descargar</span>
                          </Button>
                        )}

                        {onDeleteActuacion && canDeleteActuacion(actuacion) && (
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteActuacion(String(actuacion.id));
                            }}
                            variant="outline"
                            className="h-8 px-3 text-xs font-bold text-red-650 hover:text-red-800 border-red-200 hover:bg-red-50 hover:border-red-300 hover:shadow-xs rounded-lg transition-all flex items-center gap-1.5 bg-white"
                            title="Eliminar Actuación"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Eliminar</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Firma Electrónica */}
      {modalFirmaActuacion && (
        <FirmaDigitalActuacion
          expedienteId={expedienteId || String(modalFirmaActuacion.expedienteId)}
          radicado={expedienteId || String(modalFirmaActuacion.expedienteId)}
          actuacionDescripcion={modalFirmaActuacion.descripcion}
          firmanteNombre={(() => {
            const u = authService.getCurrentUser() as any;
            if (!u) return 'Usuario Funcionario';
            return u.fullName || u.full_name || u.name || u.nombre || (u.person?.first_name ? `${u.person.first_name} ${u.person.last_name ?? ''}`.trim() : null) || u.email || 'Usuario Funcionario';
          })()}
          firmanteCargo={(() => {
            const u = authService.getCurrentUser() as any;
            if (!u) return 'Funcionario';
            const roles = u.roles || [];
            const hasRole = (roleCode: string) => roles.some((r: any) => {
              if (typeof r === 'string') return r === roleCode;
              return r?.code === roleCode || r?.name === roleCode;
            });
            if (hasRole('JEFE_GESTION_LEGAL')) return 'Jefe de Gestión Legal';
            if (hasRole('RESUELVE_GESTION_LEGAL')) return 'Abogado Sustanciador (Resuelve)';
            if (roles.length > 0) {
              const firstRole = roles[0];
              if (typeof firstRole === 'string') return firstRole;
              return firstRole.displayName || firstRole.name || firstRole.code || 'Funcionario';
            }
            return 'Funcionario';
          })()}
          etapaLabel="Autorización de Actuación"
          correoDestino={(authService.getCurrentUser() as any)?.email}
          onVerifyCodigo={async (codigo) => {
            // Guardamos el OTP ingresado para usarlo al final
            setOtpArray(codigo.split(''));
            return Promise.resolve();
          }}
          onFirmaCompleta={handleConfirmarFirmaHash}
          onCancelar={() => setModalFirmaActuacion(null)}
        />
      )}

      {/* Modal de Devolución */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {modalDevolucionActuacion && (
              <motion.div 
                key="modal-devolucion-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm pointer-events-auto"
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
              <motion.div
                key="modal-devolucion-content"
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
                  <div className="bg-red-600 p-3 rounded-xl shadow-lg flex items-center justify-center shrink-0">
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
                      className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 rounded-xl shadow-md hover:shadow-lg transition-all"
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
            </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Modal de Detalle de Actuación (World Class Design) */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {actuacionDetalle && (
              <motion.div 
                key="modal-detalle-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm pointer-events-auto"
                onClick={() => setActuacionDetalle(null)}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
              >
              <motion.div
                key="modal-detalle-content"
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
              >
              {/* Header */}
              <div className="relative p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/30 overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -z-10 pointer-events-none" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActuacionDetalle(null); }}
                  className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-900 rounded-full hover:bg-white/90 transition-colors z-[100] cursor-pointer"
                >
                  <X className="w-5 h-5 pointer-events-none" />
                </button>
                
                <div className="flex items-start gap-4 pr-8 relative z-10">
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-3.5 rounded-xl shadow-lg shadow-blue-200 flex items-center justify-center shrink-0">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                  <div className="pt-1">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                        {actuacionDetalle.tipo}
                      </span>
                      <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {actuacionDetalle.fecha} {actuacionDetalle.hora && `- ${actuacionDetalle.hora}`}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 leading-tight">
                      Detalle de la Actuación
                    </h2>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
                
                {/* Bloque Principal */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1 block">Descripción Completa</label>
                  <p className="text-[15px] font-medium text-gray-800 leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    {actuacionDetalle.descripcion}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Bloque Estado */}
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                      <Activity className="w-3 h-3 text-slate-400" /> Estado
                    </label>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-bold inline-block border"
                      style={{
                        background: (actuacionDetalle.estado === 'Completado' || actuacionDetalle.estado === 'COMPLETADA') ? '#D1FAE5' : actuacionDetalle.estado === 'Programado' ? '#EDE9FE' : '#FEF3C7',
                        color: (actuacionDetalle.estado === 'Completado' || actuacionDetalle.estado === 'COMPLETADA') ? '#065F46' : actuacionDetalle.estado === 'Programado' ? '#5B21B6' : '#92400E',
                        borderColor: (actuacionDetalle.estado === 'Completado' || actuacionDetalle.estado === 'COMPLETADA') ? '#A7F3D0' : actuacionDetalle.estado === 'Programado' ? '#DDD6FE' : '#FDE68A'
                      }}
                    >
                      {actuacionDetalle.estado === 'COMPLETADA' ? 'Completado' : actuacionDetalle.estado}
                    </span>
                  </div>

                  {/* Bloque Responsable */}
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block flex items-center gap-1.5">
                      <User className="w-3 h-3 text-slate-400" /> Responsable de Registro
                    </label>
                    <span className="text-sm font-bold text-gray-800">
                      {userNamesMap[String(actuacionDetalle.responsable)] || actuacionDetalle.responsable || 'Sistema Automático'}
                    </span>
                  </div>
                </div>

                {/* Adjuntos y Estado de Firma */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" /> Adjuntos y Estado de Firma
                  </label>
                  {(() => {
                    const associatedDocIds = actuacionDetalle.metadata?.documentosAsociados || [];
                    const resolvedDocs = documentosExpediente.filter(doc => {
                      const docIdStr = String(doc.id);
                      return Array.isArray(associatedDocIds) && associatedDocIds.some((id: any) => String(id) === docIdStr);
                    });
                    const hasDocs = actuacionDetalle.documentoUrl || resolvedDocs.length > 0;

                    if (!hasDocs) {
                      return (
                        <div className="p-3 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-center">
                          <p className="text-xs font-medium text-slate-400">Sin documentos adjuntos en esta actuación.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          {actuacionDetalle.documentoUrl && (() => {
                            const isMainDocSigned = actuacionDetalle.metadata?.estadoAutorizacion === 'AUTORIZADO';
                            return (
                              <div className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4.5 h-4.5 text-blue-600 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Documento Principal</p>
                                      <Badge 
                                        className={`text-[9px] font-extrabold px-1.5 py-0 rounded border ${
                                          isMainDocSigned 
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                            : 'bg-amber-50 border-amber-200 text-amber-700'
                                        }`}
                                      >
                                        {isMainDocSigned ? '✓ Firmado' : '⚠ Sin Firmar'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs font-bold text-gray-700 truncate" title={actuacionDetalle.documentoNombre}>
                                      {actuacionDetalle.documentoNombre || 'documento.pdf'}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 text-[11px] font-bold text-blue-700 hover:text-blue-800 border-blue-200 hover:bg-blue-50 shrink-0 flex items-center gap-1"
                                  onClick={() => downloadDocumentFile(actuacionDetalle.documentoUrl!, actuacionDetalle.documentoNombre || 'documento.pdf')}
                                >
                                  <Download className="w-3.5 h-3.5" /> Descargar
                                </Button>
                              </div>
                            );
                          })()}

                          {resolvedDocs.map((doc: any, index: number) => {
                            const isDocSigned = (d: any) => {
                              if (!d) return false;
                              if (d.descripcion) {
                                try {
                                  const data = JSON.parse(d.descripcion);
                                  return !!(data && data.firmado);
                                } catch (e) {
                                  return false;
                                }
                              }
                              return false;
                            };
                            const signed = isDocSigned(doc);
                            
                            return (
                              <div key={doc.id || index} className="flex items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100/70 transition-colors">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileText className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Documento Asociado #{index + 1}</p>
                                      <Badge 
                                        className={`text-[9px] font-extrabold px-1.5 py-0 rounded border ${
                                          signed 
                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                                            : 'bg-amber-50 border-amber-200 text-amber-700'
                                        }`}
                                      >
                                        {signed ? '✓ Firmado' : '⚠ Sin Firmar'}
                                      </Badge>
                                    </div>
                                    <p className="text-xs font-bold text-gray-700 truncate" title={doc.nombre}>
                                      {doc.nombre}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-1.5 shrink-0">
                                  {doc.archivoUrl && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 text-[11px] font-bold text-blue-700 hover:text-blue-800 border-blue-200 hover:bg-blue-50 flex items-center gap-1"
                                      onClick={() => downloadDocumentFile(doc.archivoUrl, doc.nombre)}
                                    >
                                      <Download className="w-3.5 h-3.5" /> Descargar
                                    </Button>
                                  )}
                                  {!signed && onViewDocument && doc.archivoUrl && getEstadoFirma(actuacionDetalle) === 'PENDIENTE' && isUserAuthorizedToApprove() && (
                                    <Button
                                      size="sm"
                                      className="h-8 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 border-emerald-200 hover:bg-emerald-50 flex items-center gap-1 bg-white"
                                      variant="outline"
                                      onClick={() => {
                                        const docInfo = {
                                          id: doc.id,
                                          nombre: doc.nombre,
                                          url: doc.archivoUrl,
                                          tipo: doc.tipo || 'Documento Asociado',
                                          descripcion: doc.descripcion || ''
                                        };
                                        // Cerramos primero el detalle (portal) y abrimos el visor en el
                                        // siguiente tick para no encadenar el cierre del modal del expediente
                                        // (evita que el clic se interprete como descarte y vuelva al Kanban).
                                        setActuacionDetalle(null);
                                        setTimeout(() => onViewDocument(docInfo), 0);
                                      }}
                                    >
                                      <PenTool className="w-3.5 h-3.5 text-emerald-600" /> Firmar
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 pt-2 border-t border-slate-100">
                          {getEstadoFirma(actuacionDetalle) === 'AUTORIZADO' ? (
                            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl space-y-1 shadow-sm">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                Firmado electrónicamente
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-emerald-100/50 text-[11px] text-emerald-700">
                                <p>
                                  <strong>Firmante:</strong> {userNamesMap[String(actuacionDetalle.metadata.firmadoPor)] || actuacionDetalle.metadata.firmadoPor || 'Usuario Autorizado'}
                                </p>
                                {(actuacionDetalle.metadata.firmadoPorEmail || actuacionDetalle.metadata.firmadoPorCorreo) && (
                                  <p>
                                    <strong>Correo:</strong> {actuacionDetalle.metadata.firmadoPorEmail || actuacionDetalle.metadata.firmadoPorCorreo}
                                  </p>
                                )}
                                {(actuacionDetalle.metadata.fechaFirma || actuacionDetalle.metadata.fechaAutorizacion) && (
                                  <p className="sm:col-span-2">
                                    <strong>Fecha de Firma:</strong> {formatFechaHora(actuacionDetalle.metadata.fechaFirma || actuacionDetalle.metadata.fechaAutorizacion)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : getEstadoFirma(actuacionDetalle) === 'PENDIENTE' ? (
                            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50/30 border border-amber-200 rounded-xl space-y-2 shadow-sm">
                              <div className="flex items-center gap-2 text-xs font-black text-amber-800 uppercase tracking-wider">
                                <Lock className="w-4 h-4 text-amber-600 animate-bounce" />
                                Firma y Aprobación Pendiente
                              </div>
                              <p className="text-xs text-amber-700 leading-relaxed">
                                Esta actuación y sus documentos asociados se encuentran en estado <strong className="text-amber-900 font-extrabold">SIN FIRMA</strong>. Se requiere la firma electrónica del aprobador para formalizar la actuación.
                              </p>
                              {isUserAuthorizedToApprove() ? (
                                <div className="bg-amber-100/50 p-3 rounded-lg border border-amber-200/40 text-xs text-amber-950 font-semibold mt-2 flex flex-col gap-1">
                                  <span>👉 Usted es el usuario/rol autorizado.</span>
                                  <span className="text-[11px] font-medium text-amber-800">Puede autorizar y firmar digitalmente esta actuación usando los botones del footer de este modal.</span>
                                </div>
                              ) : (
                                <p className="text-[11px] text-amber-600 bg-amber-50/50 p-2 rounded border border-amber-100">
                                  <strong>Aprobador requerido:</strong> {aprobacionEtapaActual?.aprobacionTipo === 'rol' ? getFriendlyRoleName(aprobacionEtapaActual?.aprobacionRol || '') : (userNamesMap[String(aprobacionEtapaActual?.aprobacionUsuario)] || aprobacionEtapaActual?.aprobacionUsuario)}
                                </p>
                              )}
                            </div>
                          ) : getEstadoFirma(actuacionDetalle) === 'DEVUELTO' ? (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl space-y-1 shadow-sm">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-red-800">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                Devuelto con observaciones
                              </div>
                              <p className="text-[11px] text-red-700">
                                <strong>Devuelto por:</strong> {userNamesMap[String(actuacionDetalle.metadata.devueltoPor)] || actuacionDetalle.metadata.devueltoPor || 'Revisor'}
                              </p>
                              {actuacionDetalle.metadata.observacionesDevolucion && (
                                <p className="text-[11px] text-red-600 italic bg-white/60 p-2.5 rounded-lg border border-red-100 mt-1 leading-relaxed">
                                  "{actuacionDetalle.metadata.observacionesDevolucion}"
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-sm">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                                <CheckCircle className="w-3.5 h-3.5 text-slate-400" />
                                No requiere firma
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Esta actuación fue registrada de manera directa y no requiere firma o aprobación formal.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Regla de Aprobación del Flujo Kanban */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-slate-400" /> Reglas de Transición Kanban (Columna)
                  </label>
                  {requiereFirmaEtapa ? (
                    <div className="space-y-2">
                      <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg flex items-start gap-3">
                        <Lock className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-indigo-900">
                            Requiere Autorización en la etapa {aprobacionEtapaActual?.nombreEtapa ? `"${aprobacionEtapaActual.nombreEtapa}"` : 'actual'}
                          </p>
                          <p className="text-[11px] text-indigo-700 mt-1 leading-relaxed">
                            {aprobacionEtapaActual?.aprobacionTipo === 'rol' ? (
                              <>
                                <strong>Rol Aprobador:</strong> {getFriendlyRoleName(aprobacionEtapaActual?.aprobacionRol || '')} (<code>{aprobacionEtapaActual?.aprobacionRol}</code>)
                              </>
                            ) : (
                              <>
                                <strong>Usuario Aprobador Asignado:</strong> {userNamesMap[String(aprobacionEtapaActual?.aprobacionUsuario)] || `Usuario (ID: ${aprobacionEtapaActual?.aprobacionUsuario})`}
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-lg flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-emerald-950">Entrada Directa</p>
                        <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                          Esta actuación no requiere aprobación de firma ni autorización de terceros para avanzar en el tablero Kanban del proceso judicial.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bloque Origen y Metadata */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">Origen</label>
                    <span className="text-xs font-bold text-slate-700">{actuacionDetalle.origen || 'MANUAL'}</span>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">ID Sistema</label>
                    <span className="text-xs font-bold text-slate-500 font-mono">#{actuacionDetalle.id}</span>
                  </div>
                </div>

                {/* Bloque de Observaciones */}
                {actuacionDetalle.metadata?.observaciones && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                    <label className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-1.5 block flex items-center gap-1.5">
                      <FileText className="w-3 h-3" /> Observaciones del autor
                    </label>
                    <p className="text-sm text-blue-900 italic leading-relaxed">
                      "{actuacionDetalle.metadata.observaciones}"
                    </p>
                  </div>
                )}
              </div>

              {/* Footer (Document Download and Actions) */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-4 shrink-0 rounded-b-2xl">
                <div className="flex-1 min-w-0">
                  {(() => {
                    const associatedDocIds = actuacionDetalle.metadata?.documentosAsociados || [];
                    const resolvedDocs = documentosExpediente.filter(doc => {
                      const docIdStr = String(doc.id);
                      return Array.isArray(associatedDocIds) && associatedDocIds.some((id: any) => String(id) === docIdStr);
                    });

                    if (actuacionDetalle.documentoUrl) {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                            <Paperclip className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Documento Adjunto</p>
                            <p className="text-xs font-bold text-gray-700 truncate" title={actuacionDetalle.documentoNombre}>
                              {actuacionDetalle.documentoNombre || 'Documento'}
                            </p>
                          </div>
                        </div>
                      );
                    } else if (resolvedDocs.length > 0) {
                      return (
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-200">
                            <Paperclip className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Documentos Asociados</p>
                            <p className="text-xs font-bold text-gray-700 truncate">
                              {resolvedDocs.length} {resolvedDocs.length === 1 ? 'documento asociado' : 'documentos asociados'}
                            </p>
                          </div>
                        </div>
                      );
                    } else {
                      return (
                        <p className="text-[11px] font-medium text-gray-400 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 opacity-50" /> Sin documento adjunto
                        </p>
                      );
                    }
                  })()}
                </div>
                
                <div className="flex gap-2 shrink-0">
                  {getEstadoFirma(actuacionDetalle) === 'PENDIENTE' && (
                    <div className="flex gap-2 shrink-0">
                      {isUserAuthorizedToApprove() ? (
                        <>
                          <Button
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white font-bold gap-1.5 shadow-md hover:shadow-lg transition-all h-9"
                            onClick={(e) => {
                              e.stopPropagation();
                              const act = actuacionDetalle;
                              setActuacionDetalle(null);
                              handleOpenDevolucionModal(act);
                            }}
                          >
                            <CornerUpLeft className="w-4 h-4" /> Devolver
                          </Button>
                          {checkAllAssociatedDocsSigned(actuacionDetalle) ? (
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md hover:shadow-lg transition-all h-9"
                              onClick={(e) => {
                                e.stopPropagation();
                                const act = actuacionDetalle;
                                setActuacionDetalle(null);
                                handleOpenFirmaModal(act);
                              }}
                            >
                              <PenTool className="w-4 h-4" /> Autorizar Actuación
                            </Button>
                          ) : (
                            <Badge className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold py-1 px-3 inline-flex items-center gap-1.5 rounded-lg hover:bg-amber-50 shadow-none">
                              <Lock className="w-4 h-4 text-amber-600 animate-pulse" />
                              Firma Pendiente (Documentos)
                            </Badge>
                          )}
                        </>
                      ) : (
                        <>
                          {checkAllAssociatedDocsSigned(actuacionDetalle) ? (
                            <Badge className="bg-emerald-50 border border-emerald-250 text-emerald-800 text-xs font-bold py-1 px-3 inline-flex items-center gap-1.5 rounded-lg hover:bg-emerald-50 shadow-none">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              Documentos Firmados
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold py-1 px-3 inline-flex items-center gap-1.5 rounded-lg hover:bg-amber-50 shadow-none">
                              <Lock className="w-4 h-4 text-amber-600 animate-pulse" />
                              Firma Pendiente
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  )}
                  {canSendEmail(actuacionDetalle) && (
                    <Button 
                      size="sm"
                      className="text-white font-bold gap-1.5 shadow-md hover:shadow-lg transition-all h-9 border-none"
                      style={{ background: '#7C3AED' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        const act = actuacionDetalle;
                        setActuacionDetalle(null);
                        handleSendEmail(act);
                      }}
                    >
                      <Mail className="w-4 h-4" /> Enviar Correo
                    </Button>
                  )}
                  {actuacionDetalle.documentoUrl && (
                    <Button 
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold gap-1.5 shadow-md hover:shadow-lg transition-all h-9"
                      onClick={() => downloadDocumentFile(actuacionDetalle.documentoUrl!, actuacionDetalle.documentoNombre || 'documento')}
                    >
                      <Download className="w-4 h-4" /> Descargar
                    </Button>
                  )}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); setActuacionDetalle(null); }} 
                    className="font-bold text-gray-600 cursor-pointer z-50 h-9"
                  >
                    Cerrar
                  </Button>
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
