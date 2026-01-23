/**
 * ModalVerRequerimientoOrgano - Vista completa del requerimiento de órgano de control
 * DISEÑO LIMPIO ESAP 2025
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import {
  Building2, Calendar, User, Clock, X, AlertTriangle, FileText,
  CheckCircle, Target, Mail, Download, Upload, MessageSquare,
  Paperclip, Edit, Send, Archive, TrendingUp, AlertCircle, Trash2, Users, Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ModalComentariosOrgano } from './ModalComentariosOrgano';
import { ModalRespuestaOrgano } from './ModalRespuestaOrgano';
import { ModalSolicitudInsumo } from './ModalSolicitudInsumo';
import { ModalCambiarEtapa } from './ModalCambiarEtapa';
import { ModalReasignar } from './ModalReasignar';
import { ModalArchivar } from './ModalArchivar';
import { ModalSubirDocumento } from './ModalSubirDocumento';
import { legalService, ocService } from '../../../../services/api/legal.service';
import { getServiceUrl, API_MODE } from '../../../../config/environment';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '../../../../enums/permissions';

interface RequerimientoOrganoControl {
  id: string;
  numeroOficio: string;
  organismo: string;
  asunto: string;
  responsable: string;
  fechaRadicacion: Date;
  fechaVencimiento: Date;
  diasRestantes: number;
  diasTotales: number;
  etapa: 'RECIBIDO' | 'EN_ANALISIS' | 'EN_RESPUESTA' | 'ENVIADO';
  ultimaActuacion?: string;
  documentos?: number;
}

interface ModalVerRequerimientoOrganoProps {
  isOpen: boolean;
  onClose: () => void;
  requerimiento: RequerimientoOrganoControl | null;
  onUpdate?: () => void;
}

export function ModalVerRequerimientoOrgano({
  isOpen,
  onClose,
  requerimiento,
  onUpdate
}: ModalVerRequerimientoOrganoProps) {
  const [tabActiva, setTabActiva] = useState('general');
  const [showComentarModal, setShowComentarModal] = useState(false);
  const [showRespuestaModal, setShowRespuestaModal] = useState(false);
  const [showInsumoModal, setShowInsumoModal] = useState(false);
  const [showCambiarEtapaModal, setShowCambiarEtapaModal] = useState(false);
  const [showReasignarModal, setShowReasignarModal] = useState(false);
  const [showArchivarModal, setShowArchivarModal] = useState(false);
  const [showSubirDocModal, setShowSubirDocModal] = useState(false);
  const [modalPadreVisible, setModalPadreVisible] = useState(true);

  if (!requerimiento) return null;

  // Estados para documentos y timeline
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Cargar documentos y timeline al abrir
  useEffect(() => {
    if (isOpen && requerimiento?.id) {
      loadDocumentos();
      loadTimeline();
    }
  }, [isOpen, requerimiento?.id]);

  const loadDocumentos = async () => {
    if (!requerimiento?.id) return;
    try {
      setLoadingDocs(true);
      const docs = await ocService.getDocumentosByRequerimiento(requerimiento.id);

      // Mapear para asegurar campos compatibles
      const docsMapeados = docs.map((d: any) => ({
        ...d,
        nombre: d.nombre,
        tipo: d.tipoDocumento || 'Documento',
        fecha: d.createdAt ? new Date(d.createdAt) : new Date(),
        url: d.archivoUrl
      }));
      setDocumentos(docsMapeados);
    } catch (error) {
      console.error('Error cargando documentos:', error);
    } finally {
      setLoadingDocs(false);
    }
  };

  const loadTimeline = async () => {
    if (!requerimiento?.id) return;
    try {
      setLoadingTimeline(true);
      // Usamos los comentarios/actuaciones como timeline
      const comments = await ocService.getComentariosByRequerimiento(requerimiento.id);
      const timelineMapeado = comments.map((c: any) => ({
        id: c.id,
        fecha: new Date(c.createdAt),
        accion: c.contenido,
        usuario: c.autorNombre || 'Usuario Sistema',
        tipo: (c.tipo === 'ACTUACION' || c.tipo === 'seguimiento') ? 'actuacion' : 'comentario'
      })).sort((a: any, b: any) => b.fecha.getTime() - a.fecha.getTime());

      setTimeline(timelineMapeado);
    } catch (error) {
      console.error('Error cargando timeline:', error);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleDescargarTodos = async () => {
    if (!requerimiento?.id) return;
    if (documentos.length === 0) {
      toast.info('No hay documentos para descargar');
      return;
    }

    toast.loading('📦 Preparando descarga ZIP...', { id: 'download-oc-zip' });

    try {
      const url = ocService.getDocumentosDownloadUrl(requerimiento.id);
      const response = await fetch(url);

      if (!response.ok) throw new Error('Error en descarga');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `requerimiento_oc_${requerimiento.id}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('✅ Documentos descargados', { id: 'download-oc-zip' });
    } catch (error) {
      console.error(error);
      toast.error('Error al descargar documentos', { id: 'download-oc-zip' });
    }
  };



  const handleAbrirSubirDocumento = () => {
    setModalPadreVisible(false);
    setShowSubirDocModal(true);
  };

  const handleCerrarSubirDocumento = () => {
    setShowSubirDocModal(false);
    setModalPadreVisible(true);
  };

  const handleDescargarDocumento = async (doc: any) => {
    if (!doc.url) return;

    try {
      const baseUrl = getServiceUrl('legal');
      // Gateway rutea /legal/files/* -> backend /files/* (NO usa /api/v1 para archivos)
      const prefix = API_MODE === 'direct' ? '' : '/legal';

      let filename = doc.url;
      if (doc.url.includes('/files/')) filename = doc.url.split('/files/').pop();
      else if (doc.url.includes('files/')) filename = doc.url.split('files/').pop();

      const fullUrl = `${baseUrl}${prefix}/files/${filename}`;

      window.open(fullUrl, '_blank');
    } catch (error) {
      console.error(error);
      toast.error('Error al abrir documento');
    }
  };

  const handleEliminarDocumento = async (id: string) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await ocService.deleteDocumento(id);
      toast.success('Documento eliminado');
      setDocumentos(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar documento');
    }
  };

  // Resetear visibilidad cuando se cierra el modal
  const handleClose = () => {
    setModalPadreVisible(true);
    setShowComentarModal(false);
    setShowRespuestaModal(false);
    setShowInsumoModal(false);
    setShowCambiarEtapaModal(false);
    setShowReasignarModal(false);
    setShowReasignarModal(false);
    setShowArchivarModal(false);
    setShowSubirDocModal(false);
    onClose();
  };

  // Handlers para modales hijos - ocultar padre mientras hijo está abierto
  const handleAbrirComentar = () => {
    setModalPadreVisible(false);
    setShowComentarModal(true);
  };

  const handleCerrarComentar = () => {
    setShowComentarModal(false);
    setModalPadreVisible(true);
    // Recargar timeline al cerrar por si hubo cambios
    loadTimeline();
  };

  const handleAbrirRespuesta = () => {
    setModalPadreVisible(false);
    setShowRespuestaModal(true);
  };

  const handleCerrarRespuesta = () => {
    setShowRespuestaModal(false);
    setModalPadreVisible(true);
    // Podríamos recargar info si cambió estado
    loadTimeline();
    // Si la respuesta fue exitosa, el modal hijo llama a onSuccess que nosotros pasamos
  };

  const handleAbrirInsumo = () => {
    setModalPadreVisible(false);
    setShowInsumoModal(true);
  }

  const handleCerrarInsumo = () => {
    setShowInsumoModal(false);
    setModalPadreVisible(true);
    loadTimeline(); // Recargar timeline por si se generó actuación automática
  }

  const handleAbrirCambiarEtapa = () => {
    setModalPadreVisible(false);
    setShowCambiarEtapaModal(true);
  };

  const handleCerrarCambiarEtapa = () => {
    setShowCambiarEtapaModal(false);
    setModalPadreVisible(true);
  };

  const handleAbrirReasignar = () => {
    setModalPadreVisible(false);
    setShowReasignarModal(true);
  };

  const handleCerrarReasignar = () => {
    setShowReasignarModal(false);
    setModalPadreVisible(true);
  };

  const handleAbrirArchivar = () => {
    setModalPadreVisible(false);
    setShowArchivarModal(true);
  };

  const handleCerrarArchivar = () => {
    setShowArchivarModal(false);
    setModalPadreVisible(true);
  };

  // Calcular semáforo
  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes < 0) return { color: '#DC2626', bg: '#FEE2E2', label: 'VENCIDO' };
    if (diasRestantes <= 5) return { color: '#F59E0B', bg: '#FEF3C7', label: 'URGENTE' };
    return { color: '#10B981', bg: '#D1FAE5', label: 'EN TÉRMINO' };
  };

  const semaforo = getSemaforoColor(requerimiento.diasRestantes);
  const diasTranscurridos = requerimiento.diasTotales > 0 ? Math.max(0, requerimiento.diasTotales - Math.max(0, requerimiento.diasRestantes)) : 0;
  const porcentajeTiempo = requerimiento.diasTotales > 0 ? Math.min(100, Math.max(0, Math.round((diasTranscurridos / requerimiento.diasTotales) * 100))) : 0;

  const getOrganoInfo = (organo: string) => {
    // Normalizar string para coincidencia aproximada
    const org = organo.toUpperCase();
    if (org.includes('CGR') || org.includes('CONTRALORIA GENERAL')) return { nombre: 'Contraloría General de la República', icon: '🏛️', color: '#1E40AF' };
    if (org.includes('TERRITORIAL')) return { nombre: 'Contraloría Territorial', icon: '📊', color: '#7C3AED' };
    if (org.includes('PROCURADURIA')) return { nombre: 'Procuraduría General de la Nación', icon: '⚖️', color: '#059669' };
    if (org.includes('FISCALIA')) return { nombre: 'Fiscalía General de la Nación', icon: '🔍', color: '#DC2626' };
    if (org.includes('DEFENSORIA')) return { nombre: 'Defensoría del Pueblo', icon: '🛡️', color: '#EA580C' };
    if (org.includes('PERSONERIA')) return { nombre: 'Personería Municipal', icon: '📜', color: '#0891B2' };
    return { nombre: organo, icon: '📋', color: '#6B7280' };
  };

  const organoInfo = getOrganoInfo(requerimiento.organismo);

  const etapasConfig = {
    RECIBIDO: { label: 'Recibido', color: 'bg-gray-100 text-gray-700', icon: '📥' },
    EN_ANALISIS: { label: 'En Análisis', color: 'bg-yellow-100 text-yellow-700', icon: '🔍' },
    EN_RESPUESTA: { label: 'Elaborando Respuesta', color: 'bg-blue-100 text-blue-700', icon: '✍️' },
    ENVIADO: { label: 'Respuesta Enviada', color: 'bg-green-100 text-green-700', icon: '✅' }
  };

  return (
    <Dialog open={isOpen && modalPadreVisible} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[750px] lg:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">
          Detalle del Requerimiento {requerimiento.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista completa del requerimiento {requerimiento.id} del órgano de control con información detallada sobre plazos, etapas, responsables y documentación asociada.
        </DialogDescription>

        {/* Header - FIJO NO SCROLL */}
        <div className="flex-shrink-0 px-6 py-5 bg-white border-b flex items-center justify-between">
          <style>{`
            .config-dialog-close {
              display: none !important;
            }
          `}</style>
          <div className="flex items-center gap-3 flex-1">
            <div
              className="p-2.5 border-2 rounded-lg"
              style={{ borderColor: organoInfo.color, backgroundColor: `${organoInfo.color}10` }}
            >
              <Building2 className="w-5 h-5" style={{ color: organoInfo.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-gray-900">{requerimiento.numeroOficio}</h2>
                <Badge className={etapasConfig[requerimiento.etapa].color}>
                  {etapasConfig[requerimiento.etapa].icon} {etapasConfig[requerimiento.etapa].label}
                </Badge>
              </div>
              <p className="text-sm text-gray-600 mt-0.5">
                {organoInfo.icon} {organoInfo.nombre}
              </p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Contenido - CON SCROLL */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-gray-50">
          <div className="space-y-6">

            {/* ALERTA DE SEMÁFORO */}
            <div
              className="p-4 rounded-lg border-2 flex items-center gap-3"
              style={{
                backgroundColor: semaforo.bg,
                borderColor: semaforo.color
              }}
            >
              <AlertTriangle
                className="w-6 h-6 flex-shrink-0"
                style={{ color: semaforo.color }}
              />
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: semaforo.color }}>
                  Estado: {semaforo.label}
                </p>
                <p className="text-xs text-gray-700 mt-1">
                  {requerimiento.diasRestantes < 0
                    ? `⚠️ Vencido hace ${Math.abs(requerimiento.diasRestantes)} días`
                    : `⏰ Quedan ${requerimiento.diasRestantes} día${requerimiento.diasRestantes !== 1 ? 's' : ''} para vencimiento`
                  }
                </p>
              </div>
              <Badge
                className="font-bold text-lg px-4 py-2"
                style={{ backgroundColor: semaforo.color, color: '#FFFFFF' }}
              >
                {Math.abs(requerimiento.diasRestantes)} días
              </Badge>
            </div>

            {/* INFORMACIÓN GENERAL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Número de Oficio
                  </p>
                  <p className="text-sm font-mono font-bold text-gray-900">{requerimiento.numeroOficio}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Órgano de Control
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {organoInfo.icon} {organoInfo.nombre}
                  </p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Responsable ESAP
                  </p>
                  <p className="text-sm font-bold text-gray-900">{requerimiento.responsable}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Fecha de Radicación
                  </p>
                  <p className="text-sm font-bold text-gray-900">
                    {requerimiento.fechaRadicacion.toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div
                  className="p-3 rounded-lg border-2"
                  style={{ backgroundColor: semaforo.bg, borderColor: semaforo.color }}
                >
                  <p className="text-xs font-bold mb-1 flex items-center gap-1" style={{ color: semaforo.color }}>
                    <Clock className="w-3 h-3" />
                    Fecha Límite de Respuesta
                  </p>
                  <p className="text-sm font-bold" style={{ color: semaforo.color }}>
                    {requerimiento.fechaVencimiento.toLocaleDateString('es-CO', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-600 font-bold mb-1">Término Legal</p>
                  <p className="text-sm font-bold text-blue-900">
                    {requerimiento.diasTotales} días hábiles
                  </p>
                </div>
              </div>
            </div>

            {/* BARRA DE PROGRESO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">Progreso del plazo legal</span>
                <span className="font-bold text-gray-900">{porcentajeTiempo}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(porcentajeTiempo, 100)}%`,
                    backgroundColor: semaforo.color
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                {diasTranscurridos} de {requerimiento.diasTotales} días transcurridos
              </p>
            </div>

            {/* TABS CON INFORMACIÓN DETALLADA */}
            <Tabs value={tabActiva} onValueChange={setTabActiva}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general">
                  <FileText className="w-4 h-4 mr-2" />
                  General
                </TabsTrigger>
                <TabsTrigger value="timeline">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Historia ({timeline.length})
                </TabsTrigger>
                {/* <TabsTrigger value="documentos">
                  <Paperclip className="w-4 h-4 mr-2" />
                  Documentos ({documentos.length})
                </TabsTrigger> */}
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">📋 Asunto del Requerimiento</h3>
                  <p className="text-sm text-gray-700 bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {requerimiento.asunto}
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 mb-2">📝 Última Actuación</h3>
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-sm text-gray-700">
                      {requerimiento.ultimaActuacion || 'Sin actuaciones registradas'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      📅 {(requerimiento.fechaRadicacion instanceof Date && !isNaN(requerimiento.fechaRadicacion.getTime())) ? requerimiento.fechaRadicacion.toLocaleDateString('es-CO') : 'Sin fecha'}
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-purple-900">
                      <p className="font-bold mb-1">💡 Información del Requerimiento:</p>
                      <ul className="list-disc list-inside space-y-1 text-purple-700">
                        <li>Este requerimiento proviene de {organoInfo.nombre}</li>
                        <li>Término legal: {requerimiento.diasTotales} días hábiles (improrrogable)</li>
                        <li>Responsable: {requerimiento.responsable}</li>
                        <li>Estado actual: {etapasConfig[requerimiento.etapa].label}</li>
                        <li>La respuesta debe ser completa, precisa y con soportes documentales</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-3 mt-4">
                {loadingTimeline ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-sm text-gray-600">Cargando historial...</span>
                  </div>
                ) : timeline.length === 0 ? (
                  <div className="text-center p-6 bg-gray-50 border border-dashed rounded-lg">
                    <p className="text-sm text-gray-500">No hay actuaciones registradas</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
                    {timeline.map((evento, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center ${evento.tipo === 'actuacion' ? 'bg-green-100' : 'bg-blue-100'
                              }`}
                          >
                            {evento.tipo === 'actuacion' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <MessageSquare className="w-4 h-4 text-blue-600" />
                            )}
                          </div>
                          {idx < timeline.length - 1 && (
                            <div className="w-0.5 h-full min-h-[40px] bg-gray-300 mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-bold text-gray-900 whitespace-pre-line">{evento.accion}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            👤 {evento.usuario} • 📅 {(evento.fecha instanceof Date && !isNaN(evento.fecha.getTime())) ? `${evento.fecha.toLocaleDateString('es-CO')} ${evento.fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}` : 'Fecha inválida'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Documentos Tab - Commented out
              <TabsContent value="documentos" className="space-y-3 mt-4">
                ... documentos content ...
              </TabsContent>
              */}
            </Tabs>

            {/* ACCIONES RÁPIDAS */}
            <div className="grid grid-cols-2 gap-2 pt-4 border-t">
              {/* Botón de Adjuntar Documento eliminado según solicitud */}
              {/* <Button
                variant="outline"
                size="sm"
                onClick={handleAbrirInsumo}
              >
                <Users className="w-3 h-3 mr-1" />
                Solicitar Insumo
              </Button> */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAbrirCambiarEtapa}
              >
                <Edit className="w-3 h-3 mr-1" />
                Cambiar Etapa
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAbrirReasignar}
              >
                <User className="w-3 h-3 mr-1" />
                Reasignar
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                onClick={handleAbrirArchivar}
              >
                <Archive className="w-3 h-3 mr-1" />
                Archivar
              </Button> */}
            </div>
          </div>
        </div>

        {/* Footer con acciones principales */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-2" />
            Cerrar
          </Button>
          <div className="flex items-center gap-2">
            {authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_DELETE) && (
            <Button
              variant="outline"
              className="text-red-600 hover:bg-red-50"
              onClick={async () => {
                if (!confirm('¿Está seguro de eliminar este requerimiento? Esta acción no se puede deshacer.')) return;
                try {
                  await ocService.deleteRequerimientoOC(requerimiento.id);
                  toast.success('Requerimiento eliminado');
                  if (onUpdate) onUpdate();
                  onClose();
                } catch (error) {
                  console.error(error);
                  toast.error('Error al eliminar el requerimiento');
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>
            )}
            {authService.hasPermission(Permissions.GESTION_LEGAL_ORGANOS_CONTROL_ELABORAR) && (
            <Button
              style={{ background: '#003DA5' }}
              className="text-white"
              onClick={handleAbrirRespuesta}
            >
              <Send className="w-4 h-4 mr-2" />
              Elaborar Respuesta
            </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Modales Hijos - FUERA del Dialog padre para evitar conflictos de z-index */}
      <ModalComentariosOrgano
        isOpen={showComentarModal}
        onClose={handleCerrarComentar}
        requerimientoId={requerimiento.id}
      />

      <ModalRespuestaOrgano
        isOpen={showRespuestaModal}
        onClose={handleCerrarRespuesta}
        requerimientoId={requerimiento.id}
        organismoNombre={organoInfo.nombre}
        onSuccess={() => {
          if (onUpdate) onUpdate();
          // Además loadTimeline se llama en el handleCerrarRespuesta
        }}
      />

      <ModalSolicitudInsumo
        isOpen={showInsumoModal}
        onClose={handleCerrarInsumo}
        requerimientoId={requerimiento.id}
        fechaVencimientoPrincipal={requerimiento.fechaVencimiento}
        onSuccess={() => {
          if (onUpdate) onUpdate();
        }}
      />

      <ModalCambiarEtapa
        isOpen={showCambiarEtapaModal}
        onClose={handleCerrarCambiarEtapa}
        requerimientoId={requerimiento.id}
        etapaActual={requerimiento.etapa}
        onCambioEtapa={() => {
          if (onUpdate) onUpdate();
        }}
      />

      <ModalReasignar
        isOpen={showReasignarModal}
        onClose={handleCerrarReasignar}
        requerimientoId={requerimiento.id}
        responsableActual={requerimiento.responsable}
        onReasignacion={() => {
          if (onUpdate) onUpdate();
        }}
      />

      <ModalArchivar
        isOpen={showArchivarModal}
        onClose={handleCerrarArchivar}
        requerimientoId={requerimiento.id}
        requerimientoAsunto={requerimiento.asunto}
        onArchivar={() => {
          if (onUpdate) onUpdate();
          onClose(); // Close parent too if archived
        }}
      />

      <ModalSubirDocumento
        isOpen={showSubirDocModal}
        onClose={handleCerrarSubirDocumento}
        requerimientoId={requerimiento.id}
        onSuccess={() => {
          if (onUpdate) onUpdate();
          loadDocumentos();
        }}
      />
    </Dialog>
  );
}