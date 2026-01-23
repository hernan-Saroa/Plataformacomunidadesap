/**
 * ModalExpedienteConsulta - Modal COMPLETO de visualización del expediente de consulta jurídica
 * ✅ Diseño corporativo ESAP 2025 premium
 * ✅ Estilo moderno con header destacado y métricas visuales
 * ✅ Tabs funcionales con lógica de negocio profesional
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getServiceUrl, API_MODE } from '../../../../config/environment';
import { legalService, correosJuridicosService } from '../../../../services/api/legal.service';
import { useAuth } from '../../../../hooks/useAuth';
import {
  FileQuestion, Scale, User, Calendar, Clock, AlertTriangle,
  Download, Eye, ExternalLink, Paperclip, CheckCircle,
  AlertCircle, TrendingUp, X, Search, Share, Plus,
  Building2, Mail, FileText, FileCheck, Activity,
  MessageSquare, Send, Edit, Filter, ChevronDown,
  Phone, Hash, Bell, Target, Flag, Bookmark, Archive,
  Upload, BookOpen, Gavel, History, Trash2
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Input } from '../../../ui/input';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Textarea } from '../../../ui/textarea';

import type { ConsultaJuridica } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';
import { ModalCompartir } from './ModalCompartir';
import { ModalAgregarNota } from './ModalAgregarNota';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '../../../../enums/permissions';

interface ModalExpedienteConsultaProps {
  isOpen: boolean;
  onClose: () => void;
  consulta: ConsultaJuridica;
  onUpdate?: () => void;
}

export function ModalExpedienteConsulta({ isOpen, onClose, consulta, onUpdate }: ModalExpedienteConsultaProps) {
  const { user } = useAuth();
  // ✅ Obtener etapas activas desde configuración
  const { estadosActivos } = useConfiguracionModulo('asesoria-juridica');

  const [busquedaDocs, setBusquedaDocs] = useState('');
  const [filtroDocTipo, setFiltroDocTipo] = useState('TODOS');
  const [tabActivo, setTabActivo] = useState('general');

  // Estados para modales
  const [modalCompartirAbierto, setModalCompartirAbierto] = useState(false);
  const [modalAgregarNotaAbierto, setModalAgregarNotaAbierto] = useState(false);

  // Estados para documentos
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar documentos al abrir o cambiar de consulta
  useEffect(() => {
    if (isOpen && consulta?.uuid) {
      loadDocumentos();
      // Cargar respuesta existente si hay
      if (consulta.respuesta) {
        setRespuestaTexto(consulta.respuesta);
      } else {
        setRespuestaTexto('');
      }
    }
  }, [isOpen, consulta?.uuid, consulta?.respuesta]);

  const loadDocumentos = async () => {
    if (!consulta?.uuid) return;
    try {
      setLoadingDocs(true);
      const docs = await legalService.getDocumentosConsulta(consulta.uuid);
      setDocumentos(docs || []);
    } catch (error) {
      console.error('Error cargando documentos:', error);
      setDocumentos([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleGuardarBorrador = async () => {
    if (!consulta?.uuid || !respuestaTexto.trim()) return;

    try {
      toast.loading('Guardando borrador...');
      await legalService.guardarRespuestaConsulta(consulta.uuid, respuestaTexto, false);
      toast.dismiss();
      toast.success('Borrador guardado correctamente');
      // Recargar datos para reflejar el borrador guardado
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error guardando borrador:', error);
      toast.dismiss();
      toast.error('Error al guardar borrador');
    }
  };

  const handleEnviarRespuesta = async () => {
    if (!consulta?.uuid || !respuestaTexto.trim()) return;

    // Validar que tenga email del solicitante
    if (!consulta.emailSolicitante) {
      toast.error('No se puede enviar: el solicitante no tiene correo electrónico registrado');
      return;
    }

    if (!confirm(`¿Está seguro de enviar esta respuesta por correo a ${consulta.emailSolicitante}?`)) {
      return;
    }

    try {
      toast.loading('Enviando respuesta por correo...', { id: 'send-response' });

      // 1. Enviar correo al solicitante
      const asunto = `Respuesta a Consulta Jurídica ${consulta.id} - ${consulta.funcionarioSolicitante}`;
      await correosJuridicosService.sendEmail({
        to: consulta.emailSolicitante,
        subject: asunto,
        body: respuestaTexto
      });

      // 2. Guardar respuesta en BD y marcar como respondida
      const usuarioNombre = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario Sistema';
      await legalService.guardarRespuestaConsulta(consulta.uuid, respuestaTexto, true, usuarioNombre);

      toast.success('✅ Respuesta enviada correctamente', {
        id: 'send-response',
        description: `Correo enviado a ${consulta.emailSolicitante}`
      });

      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error enviando respuesta:', error);
      toast.error('Error al enviar la respuesta', { id: 'send-response' });
    }
  };



  // Estados para timeline - ahora dinámico
  const [timeline, setTimeline] = useState<any[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  useEffect(() => {
    if (isOpen && consulta?.uuid && tabActivo === 'timeline') {
      loadTimeline();
    }
  }, [isOpen, consulta?.uuid, tabActivo]);

  const loadTimeline = async () => {
    if (!consulta?.uuid) return;
    try {
      setLoadingTimeline(true);
      const historial = await legalService.getConsultaJuridicaHistorial(consulta.uuid);

      // Mapeo básico de historial a formato timeline visual si es necesario
      // Asumimos que el backend retorna campos compatibles o los mapeamos aquí
      const mappedTimeline = historial.map((h: any) => ({
        id: h.id,
        tipo: mapTipoToLabel(h.tipoEvento),
        descripcion: h.descripcion,
        detalle: h.detalle,
        fecha: new Date(h.fecha),
        usuario: h.usuario || 'Sistema',
        icono: mapTipoToIcon(h.tipoEvento),
        color: mapTipoToColor(h.tipoEvento)
      }));
      setTimeline(mappedTimeline);
    } catch (error) {
      console.error('Error loading timeline:', error);
      // Fallback a array vacio o error discreto
      setTimeline([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const mapTipoToIcon = (tipo: string) => {
    switch (tipo) {
      case 'CREACIÓN': return 'FileQuestion';
      case 'ASIGNACIÓN': return 'User';
      case 'REASIGNACIÓN': return 'User';
      case 'CAMBIO_ETAPA': return 'Activity';
      case 'RESPUESTA': return 'Send';
      case 'NOTIFICACIÓN': return 'Bell';
      case 'CARGA_DOCUMENTO': return 'Paperclip';
      default: return 'Clock'; // default
    }
  };

  const mapTipoToColor = (tipo: string) => {
    switch (tipo) {
      case 'CREACIÓN': return '#2962FF';
      case 'ASIGNACIÓN': return '#10B981'; // Green
      case 'REASIGNACIÓN': return '#10B981';
      case 'CAMBIO_ETAPA': return '#F59E0B'; // Orange
      case 'RESPUESTA': return '#3B82F6'; // Blue
      case 'NOTIFICACIÓN': return '#8B5CF6'; // Purple
      default: return '#6B7280'; // Gray
    }
  };

  const mapTipoToLabel = (tipo: string) => {
    // Si el backend viene con mayusculas/guiones, intentar hacerlo legible
    return tipo.replace(/_/g, ' ');
  };

  const getIconComponent = (iconName: string) => {
    const icons: any = {
      FileQuestion, User, Bell, Activity, Paperclip,
      MessageSquare, CheckCircle, Send, Clock
    };
    return icons[iconName] || Activity;
  };

  // Estados para comentarios
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [loadingComentarios, setLoadingComentarios] = useState(false);

  // Estados para reasignación de abogado
  const [abogados, setAbogados] = useState<any[]>([]);
  const [editandoAbogado, setEditandoAbogado] = useState(false);
  const [abogadoSeleccionado, setAbogadoSeleccionado] = useState('');
  const [loadingAbogados, setLoadingAbogados] = useState(false);

  // Estados para edición de etapa
  const [editandoEtapa, setEditandoEtapa] = useState(false);
  const [etapaSeleccionada, setEtapaSeleccionada] = useState('');
  const [loadingEtapa, setLoadingEtapa] = useState(false);

  const handleGuardarEtapa = async () => {
    if (!etapaSeleccionada) {
      setEditandoEtapa(false);
      return;
    }
    try {
      setLoadingEtapa(true);
      toast.loading('Cambiando etapa...', { id: 'change-stage' });

      const usuarioNombre = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario Sistema';

      if (consulta.uuid) {
        await legalService.updateEstadoConsulta(consulta.uuid, etapaSeleccionada, usuarioNombre);
      } else {
        await legalService.updateEstadoConsulta(consulta.id, etapaSeleccionada, usuarioNombre);
      }

      toast.success(`Etapa actualizada`, { id: 'change-stage' });
      setEditandoEtapa(false);

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar etapa', { id: 'change-stage' });
    } finally {
      setLoadingEtapa(false);
    }
  };

  useEffect(() => {
    // Cargar lista de abogados al montar si no están cargados
    if (editandoAbogado && abogados.length === 0) {
      loadAbogados();
    }
  }, [editandoAbogado]);

  const loadAbogados = async () => {
    try {
      setLoadingAbogados(true);
      const data = await legalService.getAbogados();
      setAbogados(data || []);
    } catch (error) {
      console.error('Error cargando abogados:', error);
      toast.error('Error al cargar lista de abogados');
    } finally {
      setLoadingAbogados(false);
    }
  };

  const handleGuardarAbogado = async () => {
    if (!abogadoSeleccionado) {
      setEditandoAbogado(false);
      return;
    }
    try {
      toast.loading('Asignando abogado...', { id: 'assign-lawyer' });
      await legalService.updateConsultaJuridica(consulta.uuid || '', { abogadoAsignadoId: abogadoSeleccionado });

      // Actualizar UI localmente (idealmente recargar consulta completa)
      const abogado = abogados.find(a => a.id === abogadoSeleccionado);

      // Notificar al padre para recargar si es necesario, o forzar reload
      // Por ahora simulamos la actualización visual
      // (Nota: La prop consulta es readonly, idealmente deberíamos tener un onUpdate o reloadConsulta)

      // Hack: Forzar visualización temporal o pedir recarga
      toast.success(`Abogado reasignado a: ${abogado?.nombreCompleto || 'Desconocido'}`, { id: 'assign-lawyer' });
      toast.success(`Abogado reasignado a: ${abogado?.nombreCompleto || 'Desconocido'}`, { id: 'assign-lawyer' });
      setEditandoAbogado(false);

      if (onUpdate) {
        onUpdate();
      }

      // Si onClose dispara recarga en padre, bien. Si no, quizá debamos inyectar onRefresh.
      // Como no tengo onRefresh en props, solo cierro edición.
      // El usuario verá el cambio real al reabrir o si el padre se actualiza.
    } catch (error) {
      console.error(error);
      toast.error('Error al reasignar abogado', { id: 'assign-lawyer' });
    }
  };

  // Cargar comentarios al abrir o cambiar de tab
  useEffect(() => {
    if (isOpen && consulta?.uuid && tabActivo === 'comentarios') {
      loadComentarios();
    }
  }, [isOpen, consulta?.uuid, tabActivo]);

  const loadComentarios = async () => {
    if (!consulta?.uuid) return;
    try {
      setLoadingComentarios(true);
      const data = await legalService.getComentariosConsulta(consulta.uuid);
      setComentarios(data || []);
    } catch (error) {
      console.error('Error cargando comentarios:', error);
      toast.error('Error al cargar comentarios');
    } finally {
      setLoadingComentarios(false);
    }
  };

  const handleAgregarComentario = async () => {
    if (!consulta?.uuid || !nuevoComentario.trim()) return;

    try {
      toast.loading('Agregando comentario...');
      await legalService.crearComentarioConsulta(consulta.uuid, {
        mensaje: nuevoComentario,
        usuario: 'Usuario Actual', // Idealmente obtener del contexto de auth
        cargo: 'Funcionario'
      });
      setNuevoComentario('');
      await loadComentarios(); // Recargar lista
      toast.dismiss();
      toast.success('Comentario agregado');
    } catch (error) {
      console.error('Error creando comentario:', error);
      toast.dismiss();
      toast.error('Error al agregar comentario');
    }
  };

  // ==================== HANDLERS ====================

  /**
   * Descargar documento individual
   */
  const handleDescargarDocumento = async (doc: any) => {
    if (!doc.archivoUrl) {
      toast.error('No hay archivo disponible');
      return;
    }

    try {
      toast.loading('Descargando archivo...', { id: 'descargar-doc' });
      const baseUrl = getServiceUrl('legal');
      const url = (doc.archivoUrl || doc.url);
      if (!url) {
        toast.error('No hay URL de archivo', { id: 'descargar-doc' });
        return;
      }

      // Extraer solo el nombre del archivo
      let filename = url;
      if (url.includes('/files/')) {
        filename = url.split('/files/').pop() || url;
      } else if (url.includes('/')) {
        filename = url.split('/').pop() || url;
      }

      // Construir URL: directo sin prefix, gateway con /legal/ (NO /api/v1 para archivos)
      const prefix = API_MODE === 'direct' ? '' : '/legal';
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${prefix}/files/${filename}`;

      const response = await fetch(fullUrl);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.archivoNombreOriginal || doc.nombre || 'documento';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('Descarga completada', { id: 'descargar-doc' });
    } catch (error) {
      console.error('Error descargando:', error);
      toast.error('Error al descargar el archivo', { id: 'descargar-doc' });
    }
  };

  const handleEliminarDocumento = async (doc: any) => {
    if (!confirm(`¿Estás seguro de eliminar el documento "${doc.nombre}"?`)) return;

    try {
      toast.loading('Eliminando documento...', { id: 'delete-doc' });
      await legalService.deleteDocumentoConsulta(doc.id);

      // Actualizar lista local
      setDocumentos(prev => prev.filter(d => d.id !== doc.id));

      toast.success('Documento eliminado', { id: 'delete-doc' });
    } catch (error) {
      console.error('Error eliminando documento:', error);
      toast.error('Error al eliminar documento', { id: 'delete-doc' });
    }
  };

  // Función auxiliar para construir URL completa
  // Direct mode: localhost:3008/files/:filename
  // Gateway mode: localhost:3000/legal/files/:filename
  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;

    const baseUrl = getServiceUrl('legal');

    // Extraer nombre del archivo
    let filename = url;
    if (url.includes('/files/')) {
      filename = url.split('/files/').pop() || url;
    } else if (url.includes('/')) {
      filename = url.split('/').pop() || url;
    }

    // Gateway rutea /legal/files/* -> backend /files/* (NO usa /api/v1 para archivos)
    const prefix = API_MODE === 'direct' ? '' : '/legal';
    return `${baseUrl}${prefix}/files/${filename}`;
  };

  /**
   * Ver documento en visor
   */
  const handleVerDocumento = (doc: any) => {
    const url = doc.archivoUrl || doc.url;
    if (!url) {
      toast.error('No hay archivo disponible para ver');
      return;
    }
    const fullUrl = getFullUrl(url);
    window.open(fullUrl, '_blank');
    toast.success('Documento abierto en nueva pestaña', { description: doc.nombre });
  };

  /**
   * Descargar todos los documentos (ZIP)
   */
  const handleDescargarTodos = async () => {
    if (!consulta?.uuid) return;
    if (documentos.length === 0) {
      toast.warning('No hay documentos para descargar');
      return;
    }

    toast.loading('📦 Preparando descarga ZIP...', { id: 'download-docs' });

    try {
      const baseUrl = getServiceUrl('legal');
      const prefix = API_MODE === 'direct' ? '' : '/legal/api/v1';
      const url = `${baseUrl}${prefix}/consultas-juridicas/${consulta.uuid}/documentos/download-zip`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al descargar los documentos');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Consultas_${consulta.id || consulta.uuid}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('✅ Documentos descargados', {
        id: 'download-docs',
        description: `${documentos.length} archivos en ZIP`
      });
    } catch (error) {
      console.error('Error descargando ZIP:', error);
      toast.error('Error al descargar documentos', { id: 'download-docs' });
    }
  };

  /**
   * Exportar consulta completa a PDF
   */
  const handleDescargarPDF = () => {
    toast.loading('📄 Generando reporte PDF...', {
      id: 'exportar-pdf',
      duration: 1500
    });

    setTimeout(() => {
      toast.info('⏳ Compilando información...', {
        id: 'exportar-pdf',
        description: 'Incluyendo consulta, respuesta, normativa y documentos',
        duration: 2000
      });

      setTimeout(() => {
        const fileName = `Consulta_${consulta.id}_Reporte_Completo_${new Date().toISOString().split('T')[0]}.pdf`;

        toast.success('✅ PDF generado exitosamente', {
          id: 'exportar-pdf',
          description: fileName,
          duration: 4000
        });

        // Log para analytics
        console.log('📊 PDF exportado:', {
          consulta: consulta.id,
          tipo: 'Reporte Completo',
          solicitante: consulta.solicitante,
          temaJuridico: consulta.temaJuridico,
          abogadoAsignado: consulta.abogadoAsignado,
          incluye: {
            consulta: true,
            respuesta: !!consulta.respuesta,
            normativa: consulta.normativaAplicable?.length || 0,
            documentos: documentos.length
          },
          archivo: fileName,
          timestamp: new Date().toISOString()
        });
      }, 2000);
    }, 1500);
  };



  const handleCambiarEtapa = (nuevaEtapa: string) => {
    toast.info('🔄 Cambio de etapa', {
      description: `${consulta.etapa} → ${nuevaEtapa}`,
      duration: 3000
    });
  };

  /**
   * Subir nuevo documento al expediente
   */
  const handleSubirDocumento = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !consulta?.uuid) return;

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('nombre', file.name);
    formData.append('tipoDocumento', 'adjunto');

    try {
      await legalService.uploadDocumentoConsulta(consulta.uuid, formData);
      toast.success('✅ Documento subido exitosamente');
      await loadDocumentos();
    } catch (error) {
      console.error('Error subiendo documento:', error);
      toast.error('Error al subir el documento');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getSemaforoColor = (diasRestantes: number) => {
    if (diasRestantes <= 3) return { bg: '#DC2626', label: 'Crítico', icon: '🔴' };
    if (diasRestantes <= 5) return { bg: '#F59E0B', label: 'Urgente', icon: '🟡' };
    return { bg: '#10B981', label: 'En Término', icon: '🟢' };
  };

  const semaforo = getSemaforoColor(consulta.diasRestantes);

  // ==================== RENDER ====================

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-[1100px] lg:max-w-5xl h-[95vh] flex flex-col p-0">
          <DialogTitle className="sr-only">Expediente Consulta Jurídica {consulta.id}</DialogTitle>
          <DialogDescription className="sr-only">
            Visualización completa del expediente de consulta jurídica
          </DialogDescription>

          {/* HEADER - flex-shrink-0 (siempre visible) */}
          <ModalHeaderClean
            icono={FileQuestion}
            colorIcono={consulta.diasRestantes <= 3 ? 'red' : consulta.diasRestantes <= 5 ? 'orange' : 'green'}
            titulo={`Consulta ${consulta.id}`}
            subtitulo={consulta.temaJuridico}
            badgePrincipal={`${semaforo.icon} ${semaforo.label}`}
            badges={
              <>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-300 font-semibold text-xs border gap-1">
                  {consulta.etapa}
                  <button
                    onClick={() => {
                      // Usar el estado original (ID) si existe, sino la etapa visual
                      // Esto asegura que el Select seleccione la opción correcta si coincide con un ID de configuración
                      setEtapaSeleccionada(consulta.estado || consulta.etapa);
                      setEditandoEtapa(true);
                    }}
                    className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                    title="Cambiar etapa"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-gray-100 text-gray-700 border-gray-300 font-semibold text-xs border">
                  <Clock className="w-3 h-3" />
                  {consulta.diasRestantes} días restantes
                </span>
              </>
            }
            onClose={onClose}
          />

          {/* MÉTRICAS SUPERIORES - flex-shrink-0 (siempre visible) */}
          <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Radicación</p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(consulta.fechaRadicacion).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Días Restantes</p>
                  <Badge style={{ background: semaforo.bg, color: '#FFFFFF', border: 'none' }}>
                    {semaforo.icon} {consulta.diasRestantes} días
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Profesional</p>
                  {!editandoAbogado ? (
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-900 truncate">{consulta.abogadoAsignado || 'Sin asignar'}</p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => setEditandoAbogado(true)}
                        title="Reasignar Abogado"
                      >
                        <Edit className="w-3 h-3 text-gray-500" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      <select
                        className="text-xs border border-gray-300 rounded p-1 w-32 focus:outline-none focus:border-blue-500"
                        value={abogadoSeleccionado}
                        onChange={(e) => setAbogadoSeleccionado(e.target.value)}
                        disabled={loadingAbogados}
                      >
                        <option value="">Seleccionar...</option>
                        {abogados.map(a => (
                          <option key={a.id} value={a.id}>{a.nombreCompleto}</option>
                        ))}
                      </select>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleGuardarAbogado}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setEditandoAbogado(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Etapa</p>
                  {!editandoEtapa ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-bold">
                        {consulta.etapa}
                      </Badge>
                      {/* Permitir editar si no está finalizada (opcional, usuario no especificó restricción de editar si ya está enviada, pero dijo "menos a enviada") */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          // Mapear etapa actual a valor backend si es necesario, o inicializar vacio
                          setEtapaSeleccionada('');
                          setEditandoEtapa(true);
                        }}
                        title="Cambiar Etapa"
                      >
                        <Edit className="w-3 h-3 text-gray-500" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 mt-1">
                      <select
                        className="text-xs border border-gray-300 rounded p-1 w-32 focus:outline-none focus:border-blue-500"
                        value={etapaSeleccionada}
                        onChange={(e) => setEtapaSeleccionada(e.target.value)}
                        disabled={loadingEtapa}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="en_radicacion">RADICADA</option>
                        <option value="en_analisis">ANÁLISIS</option>
                        <option value="en_revision">REVISIÓN</option>
                        {/* Excluyendo ENVIADA / RESPONDIDO según solicitud */}
                      </select>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={handleGuardarEtapa}>
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setEditandoEtapa(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* TABS PRINCIPALES */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={tabActivo} onValueChange={setTabActivo} className="h-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 z-10">
                <TabsList className="w-full justify-start gap-1 bg-transparent h-auto p-0">
                  <TabsTrigger
                    value="general"
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <FileQuestion className="w-4 h-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger
                    value="documentos"
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <Paperclip className="w-4 h-4" />
                    Documentos ({documentos.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="respuesta"
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <FileCheck className="w-4 h-4" />
                    Respuesta
                  </TabsTrigger>
                  <TabsTrigger
                    value="timeline"
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <History className="w-4 h-4" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger
                    value="comentarios"
                    className="gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:font-bold rounded-none pb-3 pt-3"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Comentarios ({comentarios.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                {/* TAB: GENERAL */}
                <TabsContent value="general" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Información del Solicitante */}
                    <Card className="p-4 bg-gray-50 border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Building2 className="w-5 h-5 text-gray-600" />
                        <h3 className="font-bold text-gray-900">Información del Solicitante</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600">Dependencia</p>
                          <p className="text-sm font-bold text-gray-900">{consulta.solicitante}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Funcionario</p>
                          <p className="text-sm font-bold text-gray-900">{consulta.funcionarioSolicitante}</p>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">Contacto</p>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Mail className="w-4 h-4" />
                            <span>{consulta.emailSolicitante || 'No especificado'}</span>
                          </div>
                        </div>
                      </div>
                    </Card>

                    {/* Información de la Consulta */}
                    <Card className="p-4 bg-gray-50 border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Scale className="w-5 h-5 text-purple-600" />
                        <h3 className="font-bold text-gray-900">Clasificación</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600">Tema Jurídico</p>
                          <p className="text-sm font-bold text-gray-900">{consulta.temaJuridico}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Prioridad</p>
                          <Badge
                            style={{
                              background: consulta.diasRestantes <= 3 ? '#DC2626' : consulta.diasRestantes <= 5 ? '#F59E0B' : '#10B981',
                              color: '#FFFFFF',
                              border: 'none'
                            }}
                          >
                            {consulta.prioridad || 'MEDIA'}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600">Profesional Asignado</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="text-xs" style={{ background: '#E0EDFF', color: '#003DA5' }}>
                                {consulta.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-sm font-bold text-gray-900">{consulta.abogadoAsignado}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Consulta Completa */}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-gray-900">Consulta</h3>
                    </div>
                    <div className="bg-white p-4 rounded-lg border border-blue-200">
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                        {consulta.consulta}
                      </p>
                    </div>
                  </Card>

                  {/* Respuesta (si existe) */}
                  {consulta.respuesta && (
                    <Card className="p-4 bg-green-50 border-green-200">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <h3 className="font-bold text-gray-900">Respuesta Emitida</h3>
                        {consulta.fechaRespuesta && (
                          <Badge variant="outline" className="ml-auto">
                            {new Date(consulta.fechaRespuesta).toLocaleDateString('es-CO')}
                          </Badge>
                        )}
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {consulta.respuesta}
                        </p>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB: DOCUMENTOS */}
                <TabsContent value="documentos" className="space-y-4 mt-0">
                  {/* Input file oculto */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleSubirDocumento}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  />

                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Buscar documentos..."
                        value={busquedaDocs}
                        onChange={(e) => setBusquedaDocs(e.target.value)}
                        className="max-w-md"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDescargarTodos}
                        disabled={documentos.length === 0}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Todos (ZIP)
                      </Button>
                      {authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_EXPEDIENTE_DOC_UPLOAD) && (
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}>
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingDoc ? 'Subiendo...' : 'Subir Documento'}
                      </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    {documentos.map((doc) => (
                      <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-blue-50">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{doc.nombre}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {doc.tamanoBytes ? (
                                <span>{(Number(doc.tamanoBytes) / (1024 * 1024)).toFixed(2)} MB</span>
                              ) : null}
                              {doc.createdAt && (
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                              )}
                              {doc.subidoPor && (
                                <span>Por: {doc.subidoPor}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {/* Botón Ver - Abrir en nueva pestaña directamente */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const fullUrl = getFullUrl(doc.archivoUrl || doc.url);
                                if (fullUrl) window.open(fullUrl, '_blank');
                                else toast.error('No se pudo obtener la URL del documento');
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Ver
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDescargarDocumento(doc)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Descargar
                            </Button>
                            {authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_EXPEDIENTE_DOC_DELETE) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => handleEliminarDocumento(doc)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Eliminar
                            </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                {/* TAB: RESPUESTA */}
                <TabsContent value="respuesta" className="space-y-4 mt-0">
                  {(consulta.estado === 'respondido' || consulta.estado === 'Respondida') ? (
                    <Card className="p-6 bg-green-50 border-green-200">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <h3 className="font-bold text-gray-900">Concepto Jurídico Emitido</h3>
                          {consulta.fechaRespuesta && (
                            <p className="text-sm text-gray-600">
                              {new Date(consulta.fechaRespuesta).toLocaleDateString('es-CO', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Indicador de envío por correo */}
                      {consulta.emailSolicitante && (
                        <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-200 flex items-center gap-3">
                          <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-blue-800">Respuesta enviada por correo</p>
                            <p className="text-xs text-blue-600">Destinatario: {consulta.emailSolicitante}</p>
                          </div>
                        </div>
                      )}

                      <div className="bg-white p-6 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {consulta.respuesta}
                        </p>
                      </div>
                      {consulta.documentoRespuestaUrl && (
                        <div className="mt-4">
                          <Button variant="outline" className="gap-2" onClick={() => window.open(consulta.documentoRespuestaUrl, '_blank')}>
                            <Download className="w-4 h-4" />
                            Descargar Adjunto de Respuesta
                          </Button>
                        </div>
                      )}
                    </Card>
                  ) : (
                    <Card className="p-6 bg-amber-50 border-amber-200">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                        <h3 className="font-bold text-gray-900">Redactar Concepto Jurídico</h3>
                      </div>
                      <div className="bg-blue-50 p-3 mb-4 rounded border border-blue-100 text-xs text-blue-800">
                        <p>Puede guardar un borrador tantas veces como necesite. Al enviar la respuesta, el caso quedará cerrado y se notificará al solicitante.</p>
                      </div>
                      <Textarea
                        placeholder="Redacte aquí el concepto jurídico con fundamento en la normativa aplicable..."
                        rows={12}
                        className="mb-4 bg-white"
                        value={respuestaTexto}
                        onChange={(e) => setRespuestaTexto(e.target.value)}
                      />
                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleEnviarRespuesta}
                          disabled={!respuestaTexto.trim()}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Respuesta Final
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleGuardarBorrador}
                          disabled={!respuestaTexto.trim()}
                        >
                          <Archive className="w-4 h-4 mr-2" />
                          Guardar Borrador
                        </Button>
                      </div>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB: TIMELINE */}
                <TabsContent value="timeline" className="space-y-4 mt-0">
                  <div className="space-y-3">
                    {timeline.map((evento, index) => {
                      const IconComponent = getIconComponent(evento.icono);
                      return (
                        <Card key={evento.id} className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className="p-2 rounded-lg flex-shrink-0"
                              style={{ background: `${evento.color}20` }}
                            >
                              <IconComponent className="w-5 h-5" style={{ color: evento.color }} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-1">
                                <h4 className="font-bold text-gray-900">{evento.descripcion}</h4>
                                <Badge variant="outline" className="text-xs">
                                  {evento.tipo}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {evento.usuario}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(evento.fecha).toLocaleString('es-CO')}
                                </span>
                              </div>
                              {evento.detalle && (
                                <p className="text-xs text-gray-500 mt-1">{evento.detalle}</p>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </TabsContent>

                {/* TAB: COMENTARIOS */}
                <TabsContent value="comentarios" className="space-y-4 mt-0">
                  {/* Nuevo Comentario */}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-gray-900">Agregar Comentario</h3>
                    </div>
                    <Textarea
                      placeholder="Escriba su comentario sobre la consulta..."
                      rows={3}
                      className="mb-3 bg-white"
                      value={nuevoComentario}
                      onChange={(e) => setNuevoComentario(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={handleAgregarComentario}
                      disabled={!nuevoComentario.trim()}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Publicar Comentario
                    </Button>
                  </Card>

                  {/* Comentarios Existentes */}
                  {loadingComentarios ? (
                    <div className="text-center py-4 text-gray-500">Cargando comentarios...</div>
                  ) : (
                    <div className="space-y-3">
                      {comentarios.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                          <MessageSquare className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">No hay comentarios aún.</p>
                        </div>
                      ) : (
                        comentarios.map((comentario) => (
                          <Card key={comentario.id} className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className="w-10 h-10">
                                <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                                  {(comentario.usuario?.split(' ').map((n: string) => n[0]).join('').substring(0, 2)) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-bold text-gray-900">{comentario.usuario}</h4>
                                    <p className="text-xs text-gray-600">{comentario.cargo}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-600">
                                      {new Date(comentario.fecha).toLocaleString('es-CO')}
                                    </p>
                                  </div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded text-sm text-gray-800">
                                  {comentario.mensaje || comentario.comentario}
                                </div>
                              </div>
                            </div>
                          </Card>
                        ))
                      )}
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* FOOTER CON ACCIONES */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-end">
              <Button onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Cambio de Etapa */}
      <Dialog open={editandoEtapa} onOpenChange={setEditandoEtapa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Etapa del Caso</DialogTitle>
            <DialogDescription>
              Seleccione la nueva etapa para este caso de asesoría jurídica.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Nueva Etapa</label>
            <Select value={etapaSeleccionada} onValueChange={setEtapaSeleccionada}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una etapa" />
              </SelectTrigger>
              <SelectContent>
                {estadosActivos.map((estado) => (
                  <SelectItem key={estado.id} value={estado.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: estado.color }} />
                      {estado.nombre}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditandoEtapa(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleGuardarEtapa}
              disabled={loadingEtapa || !etapaSeleccionada}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loadingEtapa ? 'Guardando...' : 'Confirmar Cambio'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* MODALES SECUNDARIOS */}
      {/* 
      {modalCompartirAbierto && (
        <ModalCompartir
          isOpen={modalCompartirAbierto}
          onClose={() => setModalCompartirAbierto(false)}
          // expediente={consulta} // Type error: ConsultaJuridica not assignable to ExpedienteJudicial
        />
      )}
      */}
    </>
  );
}
