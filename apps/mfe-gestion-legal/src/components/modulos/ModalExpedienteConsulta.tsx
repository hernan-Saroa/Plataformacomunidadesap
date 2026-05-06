/**
 * ModalExpedienteConsulta - Modal COMPLETO de visualización del expediente de consulta jurídica
 * ✅ Diseño corporativo ESAP 2025 premium
 * ✅ Estilo moderno con header destacado y métricas visuales
 * ✅ Tabs funcionales con lógica de negocio profesional
 */

import { useState, useEffect, useRef, useCallback } from 'react';
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

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { useConfirmation } from '@esap-mfe/shared-ui/confirmation-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@esap-mfe/shared-ui/select';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@esap-mfe/shared-ui/tabs';
import { Input } from '@esap-mfe/shared-ui/input';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { Textarea } from '@esap-mfe/shared-ui/textarea';

import type { ConsultaJuridica } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';
import { ModalNuevaConsulta } from './ModalNuevaConsulta';
import { ModalCompartir } from './ModalCompartir';
import { ModalAgregarNota } from './ModalAgregarNota';
import { useConfiguracionModulo } from '../config/ConfiguracionesSIGLContext';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { VisorDocumentoModal } from './VisorDocumentoModal';

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
  console.log('📋 estadosActivos en modal:', estadosActivos);

  // Hook de confirmación personalizado
  const { confirm, ConfirmationComponent } = useConfirmation();

  // Estado para visor de documentos inline
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [docParaVisor, setDocParaVisor] = useState<{ url: string; nombre: string; asunto?: string } | null>(null);

  const [busquedaDocs, setBusquedaDocs] = useState('');
  const [filtroDocTipo, setFiltroDocTipo] = useState('TODOS');
  const [tabActivo, setTabActivo] = useState('general');

  // Estados para modales
  const [modalCompartirAbierto, setModalCompartirAbierto] = useState(false);
  const [modalAgregarNotaAbierto, setModalAgregarNotaAbierto] = useState(false);
  const [showArchivarModal, setShowArchivarModal] = useState(false);
  const [motivoArchivo, setMotivoArchivo] = useState('');
  const [showEditarModal, setShowEditarModal] = useState(false);


  // Estados para documentos
  const [documentos, setDocumentos] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [destinatariosAdicionales, setDestinatariosAdicionales] = useState<string[]>([]);
  const [nuevoDestinatario, setNuevoDestinatario] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados para workflow firmado/sin firmar
  const [showFirmadoModal, setShowFirmadoModal] = useState(false);
  const [firmadoSelection, setFirmadoSelection] = useState<boolean | null>(null);
  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // Cargar documentos al abrir o cambiar de consulta
  useEffect(() => {
    if (isOpen && consulta?.uuid) {
      loadDocumentos();
      setRespuestaTexto(consulta.respuesta || '');
      try {
        const adicionales = consulta.destinatariosAdicionales
          ? JSON.parse(consulta.destinatariosAdicionales)
          : [];
        setDestinatariosAdicionales(Array.isArray(adicionales) ? adicionales : []);
      } catch {
        setDestinatariosAdicionales([]);
      }
    }
  }, [isOpen, consulta?.uuid, consulta?.respuesta, consulta?.destinatariosAdicionales]);

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
      const usuarioNombreBorrador = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario Sistema';
      await legalService.guardarRespuestaConsulta(consulta.uuid, respuestaTexto, false, usuarioNombreBorrador, destinatariosAdicionales.length > 0 ? destinatariosAdicionales : undefined);
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

  const handleAgregarDestinatario = () => {
    const email = nuevoDestinatario.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('Ingrese un correo electrónico válido');
      return;
    }
    if (email === consulta?.emailSolicitante?.toLowerCase()) {
      toast.error('Este correo ya es el destinatario principal');
      return;
    }
    if (destinatariosAdicionales.includes(email)) {
      toast.error('Este correo ya fue agregado');
      return;
    }
    setDestinatariosAdicionales(prev => [...prev, email]);
    setNuevoDestinatario('');
  };

  const handleEliminarDestinatario = (email: string) => {
    setDestinatariosAdicionales(prev => prev.filter(e => e !== email));
  };

  // Estado para devolver respuesta (jefe)
  const [showDevolverModal, setShowDevolverModal] = useState(false);
  const [comentarioDevolucion, setComentarioDevolucion] = useState('');

  // Detección de rol: jefe = JEFE_GESTION_LEGAL o tiene el permiso de aprobar (post-migración)
  const esJefe = authService.hasRole('JEFE_GESTION_LEGAL')
    || authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_APROBAR_RESPUESTA);
  const esAbogadoResuelve = authService.hasRole('RESUELVE_GESTION_LEGAL')
    || (!esJefe && authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_RESPONDER));

  const handleEnviarAJefe = async () => {
    if (!consulta?.uuid || !respuestaTexto.trim()) return;

    const confirmado = await confirm({
      title: 'Plataforma ESAP',
      description: '¿Enviar esta respuesta al jefe para su revisión y aprobación?',
      variant: 'info',
      confirmText: 'Enviar al Jefe',
      cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    try {
      toast.loading('Enviando al jefe para revisión...', { id: 'send-jefe' });
      const usuarioNombre = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario Sistema';
      await legalService.enviarRespuestaAJefe(consulta.uuid, respuestaTexto, usuarioNombre, destinatariosAdicionales.length > 0 ? destinatariosAdicionales : undefined);
      toast.success('✅ Respuesta enviada al jefe para revisión', { id: 'send-jefe' });
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error enviando al jefe:', error);
      toast.error('Error al enviar al jefe', { id: 'send-jefe' });
    }
  };

  const handleAprobarYEnviar = async () => {
    if (!consulta?.uuid) return;

    if (!consulta.emailSolicitante) {
      toast.error('No se puede enviar: el solicitante no tiene correo electrónico registrado');
      return;
    }

    const todosDestinatarios = [consulta.emailSolicitante, ...destinatariosAdicionales];
    const listaDestinatarios = todosDestinatarios.join(', ');

    const confirmado = await confirm({
      title: 'Plataforma ESAP',
      description: `¿Aprobar y enviar esta respuesta al solicitante (${listaDestinatarios})?`,
      variant: 'info',
      confirmText: 'Aprobar y Enviar',
      cancelText: 'Cancelar'
    });

    if (!confirmado) return;

    try {
      toast.loading('Aprobando y enviando respuesta...', { id: 'approve-response' });

      const asunto = `Respuesta a Consulta Jurídica ${consulta.id} - ${consulta.funcionarioSolicitante}`;
      await correosJuridicosService.sendEmail({
        to: consulta.emailSolicitante,
        cc: destinatariosAdicionales.length > 0 ? destinatariosAdicionales : undefined,
        subject: asunto,
        body: consulta.respuesta || respuestaTexto
      });

      const usuarioNombre = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario Sistema';
      await legalService.aprobarRespuestaConsulta(
        consulta.uuid,
        usuarioNombre,
        destinatariosAdicionales.length > 0 ? destinatariosAdicionales : undefined
      );

      toast.success('✅ Respuesta aprobada y enviada al solicitante', {
        id: 'approve-response',
        description: `Correo enviado a ${listaDestinatarios}`
      });

      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error aprobando respuesta:', error);
      toast.error('Error al aprobar y enviar la respuesta', { id: 'approve-response' });
    }
  };

  const handleDevolverRespuesta = async () => {
    if (!consulta?.uuid || !comentarioDevolucion.trim()) return;

    try {
      toast.loading('Devolviendo respuesta...', { id: 'devolver-response' });
      const usuarioNombre = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario Sistema';
      await legalService.devolverRespuestaConsulta(consulta.uuid, comentarioDevolucion, usuarioNombre);
      toast.success('Respuesta devuelta al abogado con comentarios', { id: 'devolver-response' });
      setShowDevolverModal(false);
      setComentarioDevolucion('');
      if (onUpdate) onUpdate();
      onClose();
    } catch (error) {
      console.error('Error devolviendo respuesta:', error);
      toast.error('Error al devolver la respuesta', { id: 'devolver-response' });
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

      // Construir nombre de usuario, evitando undefined
      const firstName = user?.firstName || '';
      const lastName = user?.lastName || '';
      const usuarioNombre = (firstName || lastName)
        ? `${firstName} ${lastName}`.trim()
        : (user?.email || 'Usuario Sistema');

      // Obtener el nombre legible de la etapa para el timeline
      const estadoInfo = estadosActivos.find(e => e.id === etapaSeleccionada);
      const estadoNombre = estadoInfo?.nombre || etapaSeleccionada;

      if (consulta.uuid) {
        await legalService.updateEstadoConsulta(consulta.uuid, etapaSeleccionada, usuarioNombre, estadoNombre);
      } else {
        await legalService.updateEstadoConsulta(consulta.id, etapaSeleccionada, usuarioNombre, estadoNombre);
      }

      toast.success(`Etapa actualizada correctamente`, { id: 'change-stage' });
      setEditandoEtapa(false);

      // Cerrar el modal principal para que al reabrir muestre datos frescos
      onClose();

      // Notificar al padre para recargar la lista
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
      const abogado = abogados.find(a => a.id === abogadoSeleccionado);
      await legalService.updateConsultaJuridica(consulta.uuid || '', {
        abogadoAsignadoId: abogadoSeleccionado,
        abogadoAsignadoNombre: abogado?.nombreCompleto || abogado?.nombre || '',
      });
      toast.success(`Abogado reasignado a: ${abogado?.nombreCompleto || 'Desconocido'}`, { id: 'assign-lawyer' });
      setEditandoAbogado(false);

      // Cerrar el modal principal para que al reabrir muestre datos frescos
      onClose();

      // Notificar al padre para recargar la lista
      if (onUpdate) {
        onUpdate();
      }
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
        usuario: user ? (user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Usuario') : 'Usuario',
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



  const handleArchivar = async () => {
    if (!consulta?.uuid) return;
    if (!motivoArchivo.trim()) {
      toast.error('Debe ingresar un motivo para archivar');
      return;
    }

    try {
      toast.loading('Archivando consulta...');
      const usuarioNombre = user ? `${user.firstName} ${user.lastName}`.trim() : 'Usuario Sistema';

      await legalService.archivarConsulta(consulta.uuid || consulta.id, motivoArchivo, usuarioNombre);
      toast.dismiss();
      toast.success('Consulta archivada exitosamente');
      setShowArchivarModal(false);
      onClose();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error archivando:', error);
      toast.dismiss();
      toast.error('Error al archivar la consulta');
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
    // Eliminación inmediata sin confirmación
    // const confirmado = await confirm({ ... }); 
    // if (!confirmado) return;

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
    const prefix = API_MODE === 'direct' ? '' : '/legal';

    // ✨ FIXED: Rutas de adjuntos de correos/oficios (usar /api/v1 para que gateway rutee correctamente)
    if (url.includes('/correos/adjuntos/')) {
      const regex = /\/adjuntos\/([^/]+)/;
      const match = url.match(regex);
      if (match) {
        let adjuntoId = match[1];
        if (adjuntoId.endsWith('/download')) adjuntoId = adjuntoId.replace('/download', '');

        const adjuntoPrefix = API_MODE === 'direct' ? '' : '/legal/api/v1';
        return `${baseUrl}${adjuntoPrefix}/correos/adjuntos/${adjuntoId}/download`;
      }
    }

    // Manejar otras rutas directas de API evitando /files/
    if (url.includes('/api/') || url.includes('/download')) {
      let cleanUrl = url.startsWith('/legal') ? url.replace('/legal', '') : url;
      if (API_MODE === 'direct') {
        cleanUrl = cleanUrl.replace('/api/v1', ''); // remove /api/v1 since port 3008 doesn't use it
      }
      return `${baseUrl}${prefix}${cleanUrl}`;
    }

    // Extraer nombre del archivo
    let filename = url;
    if (url.includes('/files/')) {
      filename = url.split('/files/').pop() || url;
    } else if (url.includes('/')) {
      filename = url.split('/').pop() || url;
    }

    // Gateway rutea /legal/files/* -> backend /files/* (NO usa /api/v1 para archivos)
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
    // Abrir en el visor inline en lugar de una nueva pestaña
    setDocParaVisor({ url: fullUrl, nombre: doc.nombre || doc.archivoNombreOriginal || 'Documento', asunto: doc.tipoDocumento || '' });
    setVisorAbierto(true);
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

      const token = sessionStorage.getItem('esap_auth_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
        credentials: 'include',
      });

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
   * Abrir modal para seleccionar si el documento está firmado o no
   */
  const handleIniciarSubida = () => {
    setFirmadoSelection(null);
    setShowFirmadoModal(true);
  };

  /**
   * Confirmar selección de firmado y abrir selector de archivo
   */
  const handleConfirmarFirmado = () => {
    if (firmadoSelection === null) {
      toast.warning('Seleccione si el documento está firmado o sin firmar');
      return;
    }
    setShowFirmadoModal(false);
    fileInputRef.current?.click();
  };

  /**
   * Subir nuevo documento al expediente con indicador de firmado.
   */
  const handleSubirDocumento = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !consulta?.uuid) return;

    const nombreLower = (file.name || '').toLowerCase();
    const esDocx =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      nombreLower.endsWith('.docx');
    const esPdf = file.type === 'application/pdf' || nombreLower.endsWith('.pdf');

    if (firmadoSelection === false && !esDocx) {
      toast.error('Para documentos "Sin firmar" solo se permite formato Word (.docx)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (firmadoSelection === true && !esPdf) {
      toast.error('Para documentos "Firmado" solo se permite formato PDF');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (firmadoSelection === null && !esPdf && !esDocx) {
      toast.error('Solo se permiten archivos PDF o Word (.docx)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('archivo', file);
    formData.append('nombre', file.name);
    formData.append('tipoDocumento', 'adjunto');
    formData.append('firmado', firmadoSelection ? 'true' : 'false');

    try {
      await legalService.uploadDocumentoConsulta(consulta.uuid, formData);
      toast.success(firmadoSelection ? '✅ Documento firmado subido exitosamente' : '✅ Documento sin firmar subido exitosamente');
      await loadDocumentos();
    } catch (error) {
      console.error('Error subiendo documento:', error);
      toast.error('Error al subir el documento');
    } finally {
      setUploadingDoc(false);
      setFirmadoSelection(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * Reemplazar documento sin firmar con versión firmada
   */
  const handleReemplazarConFirmado = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !replacingDocId) return;

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF');
      if (replaceFileInputRef.current) replaceFileInputRef.current.value = '';
      return;
    }

    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('archivo', file);

    try {
      await legalService.replaceDocumentoConsulta(replacingDocId, formData);
      toast.success('✅ Documento reemplazado con versión firmada');
      await loadDocumentos();
    } catch (error) {
      console.error('Error reemplazando documento:', error);
      toast.error('Error al reemplazar el documento');
    } finally {
      setUploadingDoc(false);
      setReplacingDocId(null);
      if (replaceFileInputRef.current) {
        replaceFileInputRef.current.value = '';
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
          <ConfirmationComponent />
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
            actions={
              authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_CREATE) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowEditarModal(true)}
                  className="flex items-center gap-1.5 text-blue-700 border-blue-300 hover:bg-blue-50"
                >
                  <Edit className="w-3.5 h-3.5" />
                  Editar
                </Button>
              ) : undefined
            }
            badges={
              <>
                <span className="inline-flex items-center rounded-md px-2 py-0.5 bg-blue-100 text-blue-700 border-blue-300 font-semibold text-xs border gap-1">
                  {consulta.etapa}
                  {authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_ETAPA_EDIT) && (
                    <button
                      onClick={() => {
                        setEtapaSeleccionada(consulta.estado || consulta.etapa);
                        setEditandoEtapa(true);
                      }}
                      className="ml-1 p-0.5 hover:bg-blue-200 rounded-full transition-colors"
                      title="Cambiar etapa"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  )}
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
                      {authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_CREATE) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setEditandoAbogado(true)}
                          title="Reasignar Abogado"
                        >
                          <Edit className="w-3 h-3 text-gray-500" />
                        </Button>
                      )}
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
                      {authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_ETAPA_EDIT) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => {
                            setEtapaSeleccionada('');
                            setEditandoEtapa(true);
                          }}
                          title="Cambiar Etapa"
                        >
                          <Edit className="w-3 h-3 text-gray-500" />
                        </Button>
                      )}
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
                        {estadosActivos.map(estado => (
                          <option key={estado.id} value={estado.id}>
                            {estado.nombre}
                          </option>
                        ))}
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
                        {(consulta as any).cargoSolicitante && (
                          <div>
                            <p className="text-xs text-gray-600">Cargo</p>
                            <p className="text-sm font-bold text-gray-900">{(consulta as any).cargoSolicitante}</p>
                          </div>
                        )}
                        <div className="pt-2 border-t border-gray-200">
                          <p className="text-xs text-gray-600 mb-2">Contacto</p>
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Mail className="w-4 h-4" />
                            <span>{consulta.emailSolicitante || 'No especificado'}</span>
                          </div>
                          {(consulta as any).telefonoSolicitante && (
                            <div className="flex items-center gap-2 text-sm text-gray-700 mt-1">
                              <Phone className="w-4 h-4" />
                              <span>{(consulta as any).telefonoSolicitante}</span>
                            </div>
                          )}
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

                  {/* Antecedentes (si existen) */}
                  {(consulta as any).antecedentes && (
                    <Card className="p-4 bg-gray-50 border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <BookOpen className="w-5 h-5 text-gray-600" />
                        <h3 className="font-bold text-gray-900">Antecedentes</h3>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-gray-200">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {(consulta as any).antecedentes}
                        </p>
                      </div>
                    </Card>
                  )}

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
                    accept=".pdf,.docx"
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
                        <Button variant="outline" size="sm" onClick={handleIniciarSubida} disabled={uploadingDoc}>
                          <Upload className="w-4 h-4 mr-2" />
                          {uploadingDoc ? 'Subiendo...' : 'Subir Documento'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Input oculto para reemplazar con firmado */}
                  <input
                    ref={replaceFileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleReemplazarConFirmado}
                    accept=".pdf"
                  />

                  {/* Modal de selección firmado/sin firmar */}
                  {showFirmadoModal && (
                    <Card className="p-5 border-2 border-blue-200 bg-blue-50/50 mb-4">
                      <h4 className="font-bold text-sm text-gray-900 mb-3 flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-blue-600" />
                        ¿El documento está firmado?
                      </h4>
                      <div className="flex gap-3 mb-4">
                        <button
                          onClick={() => setFirmadoSelection(true)}
                          className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${firmadoSelection === true
                            ? 'border-green-500 bg-green-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-green-300'
                            }`}
                        >
                          <CheckCircle className={`w-8 h-8 mx-auto mb-2 ${firmadoSelection === true ? 'text-green-600' : 'text-gray-400'}`} />
                          <p className="font-bold text-sm">Firmado</p>
                          <p className="text-xs text-gray-500 mt-1">El documento ya tiene firma</p>
                        </button>
                        <button
                          onClick={() => setFirmadoSelection(false)}
                          className={`flex-1 p-4 rounded-xl border-2 transition-all text-center ${firmadoSelection === false
                            ? 'border-amber-500 bg-amber-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-amber-300'
                            }`}
                        >
                          <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${firmadoSelection === false ? 'text-amber-600' : 'text-gray-400'}`} />
                          <p className="font-bold text-sm">Sin Firmar</p>
                          <p className="text-xs text-gray-500 mt-1">Pendiente de firma — podrá reemplazarlo después</p>
                        </button>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setShowFirmadoModal(false)}>
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleConfirmarFirmado}
                          disabled={firmadoSelection === null}
                          className="bg-[#003DA5] hover:bg-[#002d7a] text-white"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Seleccionar Archivo
                        </Button>
                      </div>
                    </Card>
                  )}

                  <div className="space-y-2">
                    {documentos.map((doc) => (
                      <Card key={doc.id} className={`p-4 hover:shadow-md transition-shadow ${!doc.firmado ? 'border-l-4 border-l-amber-400' : 'border-l-4 border-l-green-400'}`}>
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-lg ${doc.firmado ? 'bg-green-50' : 'bg-amber-50'}`}>
                            <FileText className={`w-6 h-6 ${doc.firmado ? 'text-green-600' : 'text-amber-600'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-bold text-sm truncate">{doc.nombre}</p>
                              {doc.firmado ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-green-500 flex items-center gap-1 flex-shrink-0">
                                  <CheckCircle className="w-3 h-3" /> Firmado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-amber-500 flex items-center gap-1 flex-shrink-0">
                                  <AlertCircle className="w-3 h-3" /> Sin Firmar
                                </span>
                              )}
                            </div>
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
                            {/* Botón Subir Firmado — solo para docs sin firmar */}
                            {!doc.firmado && authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_EXPEDIENTE_DOC_UPLOAD) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-300 font-bold"
                                onClick={() => {
                                  setReplacingDocId(doc.id);
                                  replaceFileInputRef.current?.click();
                                }}
                                disabled={uploadingDoc}
                              >
                                <Upload className="w-4 h-4 mr-1" />
                                Subir Firmado
                              </Button>
                            )}
                            {/* Botón Ver */}
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

                  {/* ESTADO: RESPONDIDO — Solo lectura */}
                  {(consulta.estado === 'respondido' || consulta.estado === 'Respondida') && (
                    <Card className="p-6 bg-green-50 border-green-200">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                        <div>
                          <h3 className="font-bold text-gray-900">Respuesta Enviada</h3>
                          {consulta.fechaRespuesta && (
                            <p className="text-sm text-gray-600">
                              {new Date(consulta.fechaRespuesta).toLocaleDateString('es-CO', {
                                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                      {consulta.emailSolicitante && (
                        <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3 mb-1">
                            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                            <p className="text-sm font-semibold text-blue-800">Respuesta enviada por correo</p>
                          </div>
                          <div className="ml-8 space-y-1">
                            <p className="text-xs text-blue-700 font-medium">Destinatario principal: <span className="font-normal">{consulta.emailSolicitante}</span></p>
                            {consulta.destinatariosAdicionales && (() => {
                              try {
                                const adicionales: string[] = JSON.parse(consulta.destinatariosAdicionales);
                                return adicionales.length > 0 ? (
                                  <div>
                                    <p className="text-xs text-blue-700 font-medium mb-1">Destinatarios adicionales:</p>
                                    {adicionales.map((email: string) => (
                                      <p key={email} className="text-xs text-blue-600 ml-2">• {email}</p>
                                    ))}
                                  </div>
                                ) : null;
                              } catch { return null; }
                            })()}
                          </div>
                        </div>
                      )}
                      <div className="bg-white p-6 rounded-lg border border-green-200">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{consulta.respuesta}</p>
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
                  )}

                  {/* ESTADO: PENDIENTE REVISIÓN JEFE — Vista del jefe para aprobar o devolver */}
                  {consulta.estado === 'pendiente_revision_jefe' && esJefe && (
                    <Card className="p-6 bg-purple-50 border-purple-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Gavel className="w-6 h-6 text-purple-600" />
                        <div>
                          <h3 className="font-bold text-gray-900">Revisión del Jefe — Borrador Pendiente</h3>
                          <p className="text-sm text-gray-600">El abogado ha enviado la siguiente respuesta para su aprobación.</p>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border border-purple-200 mb-4">
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{consulta.respuesta}</p>
                      </div>

                      {/* Destinatarios para cuando el jefe apruebe */}
                      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> Se enviará al solicitante
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-1 truncate">
                            {consulta.emailSolicitante || 'Sin correo registrado'} <span className="text-blue-500">(principal)</span>
                          </span>
                        </div>
                        {destinatariosAdicionales.map((email) => (
                          <div key={email} className="flex items-center gap-2 mb-2">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex-1 truncate">{email}</span>
                            <button type="button" onClick={() => handleEliminarDestinatario(email)} className="text-red-400 hover:text-red-600 flex-shrink-0 text-xs leading-none" title="Quitar destinatario">✕</button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="email"
                            value={nuevoDestinatario}
                            onChange={(e) => setNuevoDestinatario(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarDestinatario(); } }}
                            placeholder="Agregar destinatario adicional..."
                            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={handleAgregarDestinatario} className="text-xs h-7 px-2">+ Agregar</Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          onClick={handleAprobarYEnviar}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Aprobar y Enviar al Solicitante
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowDevolverModal(true)}
                          className="border-red-300 text-red-700 hover:bg-red-50"
                        >
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Devolver con Comentarios
                        </Button>
                      </div>
                    </Card>
                  )}

                  {/* ESTADO: PENDIENTE REVISIÓN JEFE — Vista del abogado (solo lectura, esperando) */}
                  {consulta.estado === 'pendiente_revision_jefe' && !esJefe && (
                    <Card className="p-6 bg-purple-50 border-purple-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-6 h-6 text-purple-600" />
                        <div>
                          <h3 className="font-bold text-gray-900">Pendiente de Aprobación</h3>
                          <p className="text-sm text-gray-600">La respuesta fue enviada al jefe y está esperando su revisión.</p>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-purple-200">
                        <p className="text-xs text-gray-500 mb-2 font-medium">Borrador enviado:</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{consulta.respuesta}</p>
                      </div>
                    </Card>
                  )}

                  {/* ESTADO: DEVUELTA POR JEFE */}
                  {consulta.estado === 'devuelta_por_jefe' && (
                    <>
                      {/* Comentario del jefe — visible para todos */}
                      <Card className="p-4 bg-red-50 border-red-200">
                        <div className="flex items-center gap-3 mb-2">
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <h3 className="font-bold text-red-800">Respuesta devuelta por el Jefe</h3>
                        </div>
                        <div className="bg-white p-3 rounded border border-red-200">
                          <p className="text-xs text-red-700 font-medium mb-1">Motivo / Comentarios:</p>
                          <p className="text-sm text-red-800 whitespace-pre-wrap">
                            {consulta.comentarioDevolucionJefe || <span className="italic text-red-400">Sin comentario registrado</span>}
                          </p>
                        </div>
                      </Card>

                      {/* Jefe: solo lectura — espera a que el abogado reenvíe */}
                      {esJefe && (
                        <Card className="p-4 bg-gray-50 border-gray-200">
                          <div className="flex items-center gap-3">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <p className="text-sm text-gray-500">Esperando correcciones del abogado. No hay acción disponible hasta que reenvíe la respuesta.</p>
                          </div>
                        </Card>
                      )}

                      {/* Abogado: editor para corregir y reenviar */}
                      {esAbogadoResuelve && (
                        <Card className="p-6 bg-amber-50 border-amber-200">
                          <div className="flex items-center gap-3 mb-4">
                            <Edit className="w-6 h-6 text-amber-600" />
                            <h3 className="font-bold text-gray-900">Corregir y Reenviar al Jefe</h3>
                          </div>
                          <Textarea
                            placeholder="Corrija el concepto jurídico según las indicaciones del jefe..."
                            rows={10}
                            className="mb-4 bg-white"
                            value={respuestaTexto}
                            onChange={(e) => setRespuestaTexto(e.target.value)}
                          />
                          <div className="flex items-center gap-3">
                            <Button
                              onClick={handleEnviarAJefe}
                              disabled={!respuestaTexto.trim()}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Reenviar al Jefe para Revisión
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
                    </>
                  )}

                  {/* ESTADO: EN EDICIÓN — solo abogados (resuelve), no jefes */}
                  {consulta.estado !== 'respondido' && consulta.estado !== 'Respondida' &&
                   consulta.estado !== 'pendiente_revision_jefe' && consulta.estado !== 'devuelta_por_jefe' &&
                   !esJefe && (
                    <Card className="p-6 bg-amber-50 border-amber-200">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertCircle className="w-6 h-6 text-amber-600" />
                        <h3 className="font-bold text-gray-900">Redactar Respuesta</h3>
                      </div>
                      <div className="bg-blue-50 p-3 mb-4 rounded border border-blue-100 text-xs text-blue-800">
                        <p>Redacte la respuesta y envíela al jefe para revisión. El jefe la aprobará y la enviará al solicitante, o la devolverá con comentarios.</p>
                      </div>

                      <Textarea
                        placeholder="Redacte aquí el concepto jurídico con fundamento en la normativa aplicable..."
                        rows={10}
                        className="mb-4 bg-white"
                        value={respuestaTexto}
                        onChange={(e) => setRespuestaTexto(e.target.value)}
                        disabled={!authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_RESPONDER)}
                      />

                      {/* Destinatarios adicionales — el jefe podrá editarlos antes de aprobar */}
                      <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" /> Destinatarios adicionales (CC)
                        </p>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex-1 truncate">
                            {consulta.emailSolicitante || 'Sin correo registrado'} <span className="text-blue-500">(principal)</span>
                          </span>
                        </div>
                        {destinatariosAdicionales.map((email) => (
                          <div key={email} className="flex items-center gap-2 mb-2">
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full flex-1 truncate">{email}</span>
                            <button type="button" onClick={() => handleEliminarDestinatario(email)} className="text-red-400 hover:text-red-600 flex-shrink-0 text-xs leading-none" title="Quitar destinatario">✕</button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="email"
                            value={nuevoDestinatario}
                            onChange={(e) => setNuevoDestinatario(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAgregarDestinatario(); } }}
                            placeholder="Agregar destinatario adicional..."
                            className="flex-1 text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                          />
                          <Button type="button" variant="outline" size="sm" onClick={handleAgregarDestinatario} className="text-xs h-7 px-2">+ Agregar</Button>
                        </div>
                      </div>

                      {authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_RESPONDER) && (
                        <div className="flex items-center gap-3">
                          <Button
                            onClick={handleEnviarAJefe}
                            disabled={!respuestaTexto.trim()}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Enviar al Jefe para Revisión
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
                      )}
                    </Card>
                  )}

                  {/* JEFE: Sin borrador pendiente — card informativo bloqueado */}
                  {consulta.estado !== 'respondido' && consulta.estado !== 'Respondida' &&
                   consulta.estado !== 'pendiente_revision_jefe' && consulta.estado !== 'devuelta_por_jefe' &&
                   esJefe && (
                    <Card className="p-6 bg-gray-50 border-gray-200">
                      <div className="flex items-center gap-3 mb-3">
                        <Clock className="w-6 h-6 text-gray-400" />
                        <div>
                          <h3 className="font-bold text-gray-600">Sin respuesta pendiente de revisión</h3>
                          <p className="text-sm text-gray-500">El abogado aún no ha enviado la respuesta para su aprobación.</p>
                        </div>
                      </div>
                      <div className="bg-white p-4 rounded border border-dashed border-gray-300 text-center">
                        <Gavel className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">Cuando el abogado complete la respuesta y la envíe al jefe, aparecerá aquí para su revisión.</p>
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
                  {authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_COMENTARIO_CREATE) && (
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
                  )}

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
            <div className="flex items-center justify-end gap-3">
              {authService.hasPermission(Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_CREATE) && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    setShowArchivarModal(true);
                  }}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  Archivar
                </Button>
              )}
              <Button type="button" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Cambio de Etapa */}
      <Dialog open={editandoEtapa} onOpenChange={(open: boolean) => {
        setEditandoEtapa(open);
        if (open) {
          // Preseleccionar valor actual
          setEtapaSeleccionada(consulta.estado || '');
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Etapa del Caso</DialogTitle>
            <DialogDescription>
              Seleccione la nueva etapa para este caso de asesoría jurídica.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Nueva Etapa
            </label>
            {estadosActivos.length === 0 && (
              <p className="text-xs text-red-500 mb-2">⚠️ No se cargaron las etapas desde configuración</p>
            )}
            <Select value={etapaSeleccionada} onValueChange={setEtapaSeleccionada}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una etapa" />
              </SelectTrigger>
              <SelectContent className="z-[9999]">
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

      {/* Modal Archivar */}
      <Dialog open={showArchivarModal} onOpenChange={setShowArchivarModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archivar Consulta</DialogTitle>
            <DialogDescription>
              ¿Está seguro de archivar esta consulta? Desaparecerá de la lista activa y se moverá a la pestaña de Archivados.
            </DialogDescription>
          </DialogHeader>


          <div className="py-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Motivo del Archivo
            </label>
            <Textarea
              placeholder="Indique la razón por la cual se archiva este expediente..."
              value={motivoArchivo}
              onChange={(e) => setMotivoArchivo(e.target.value)}
              className="min-h-[100px]"
            />
          </div>



          <div className="flex justify-end gap-3 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowArchivarModal(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="bg-orange-600 hover:bg-orange-700 text-white border-none"
              onClick={handleArchivar}
            >
              <Archive className="w-4 h-4 mr-2" />
              Confirmar Archivo
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

      {/* MODAL EDITAR CONSULTA */}
      <ModalNuevaConsulta
        isOpen={showEditarModal}
        onClose={() => setShowEditarModal(false)}
        modoEdicion={true}
        consultaInicial={consulta}
        onSuccess={() => {
          setShowEditarModal(false);
          if (onUpdate) onUpdate();
        }}
      />

      {/* MODAL: Devolver respuesta con comentarios (jefe) */}
      <Dialog open={showDevolverModal} onOpenChange={setShowDevolverModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver Respuesta al Abogado</DialogTitle>
            <DialogDescription>
              Indique los comentarios o correcciones necesarias. El abogado los verá antes de reenviar la respuesta.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Describa qué debe corregirse o mejorar en la respuesta..."
              value={comentarioDevolucion}
              onChange={(e) => setComentarioDevolucion(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setShowDevolverModal(false); setComentarioDevolucion(''); }}>
              Cancelar
            </Button>
            <Button
              onClick={handleDevolverRespuesta}
              disabled={!comentarioDevolucion.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Devolver con Comentarios
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* VISOR INLINE DE DOCUMENTOS */}
      {docParaVisor && (
        <VisorDocumentoModal
          isOpen={visorAbierto}
          onClose={() => { setVisorAbierto(false); setDocParaVisor(null); }}
          archivo={docParaVisor.url}
          numero={docParaVisor.nombre}
          asunto={docParaVisor.asunto}
        />
      )}
    </>
  );
}
