/**
 * ModalExpedienteComunicacion - Modal COMPLETO de visualización de comunicación
 * ✅ Diseño corporativo ESAP 2025 premium
 * ✅ Vista detallada con tabs funcionales
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Mail, Gavel, FileText, User, Calendar, Clock, AlertTriangle,
  Download, Eye, Paperclip, CheckCircle, Share, Send,
  Building2, Activity, MessageSquare, History, Archive,
  ExternalLink, Target, Flag, Loader2, Scale, Search
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@esap-mfe/shared-ui/dialog';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { Card } from '@esap-mfe/shared-ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@esap-mfe/shared-ui/tabs';
import { Avatar, AvatarFallback } from '@esap-mfe/shared-ui/avatar';
import { Textarea } from '@esap-mfe/shared-ui/textarea';
import { authService } from '../../../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';
import { ModalHeaderClean } from './ModalHeaderClean';
import { correosJuridicosService, AdjuntoCorreo } from '../../../../services/api/legal.service';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { isPreviewableInPlatform } from '../../../utils/fileUtils';

import { Input } from '@esap-mfe/shared-ui/input';
import { legalService } from '../../../../services/api/legal.service';

interface ComunicacionUnificada {
  id: string;
  tipo: 'JUDICIAL' | 'CORREO' | 'OFICIO' | 'ENVIADO';
  tipoProceso?: string;
  asunto: string;
  descripcion: string;
  remitente: string;
  despachoOrigen?: string;
  radicadoExterno?: string;
  fechaRadicacion: Date;
  urgente: boolean;
  leida: boolean;
  estado: 'PENDIENTE' | 'LEIDA' | 'ARCHIVADA' | 'ENVIADA';
  documentosAdjuntos: string[];
  clasificacionIA?: {
    tipoDetectado: string;
    moduloSugerido: string;
    confianza: number;
  };
}

interface ModalExpedienteComunicacionProps {
  isOpen: boolean;
  onClose: () => void;
  comunicacion: ComunicacionUnificada;
  onMarcarLeida?: (id: string) => void;
  onArchivar?: (id: string) => void;
  onLink?: (id: string, expedienteId: string, targetModule: string) => Promise<any>;
}

export function ModalExpedienteComunicacion({
  isOpen,
  onClose,
  comunicacion,
  onMarcarLeida,
  onArchivar,
  onLink
}: ModalExpedienteComunicacionProps) {
  const [tabActivo, setTabActivo] = useState('general');
  // Linking State
  const [selectedModule, setSelectedModule] = useState<'DEFENSA' | 'DISCIPLINARIO' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<any | null>(null);
  const [linking, setLinking] = useState(false);

  // Auto-fetch when module changes
  useEffect(() => {
    if (selectedModule) {
      handleSearch();
    }
  }, [selectedModule]);

  const handleSearch = async () => {
    if (!selectedModule) return;
    setIsSearching(true);
    // Don't clear results immediately to avoid flash, but maybe safe enough
    try {
      if (selectedModule === 'DEFENSA') {
        // Fetch all/recent if no term, or search if term exists
        const expedientes = await legalService.getExpedientes(searchTerm ? { search: searchTerm } : {});
        setSearchResults(expedientes);
      } else if (selectedModule === 'DISCIPLINARIO') {
        const procesos = await legalService.getJuzgamientoProcesos();
        // Client-side filter
        const filtered = !searchTerm ? procesos : procesos.filter((p: any) =>
          (p.radicado && p.radicado.includes(searchTerm)) ||
          (p.investigado && p.investigado.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      toast.error('Error buscando procesos');
      console.error(error);
    } finally {
      setIsSearching(false);
    }
  };

  const executeLink = async () => {
    if (!selectedProcess || !selectedModule || !onLink) return;
    setLinking(true);
    try {
      const processId = selectedProcess.id;
      await onLink(comunicacion.id, processId, selectedModule);
      // UI success handled by parent toast, but maybe we close or reset?
      // Parent closes modal, so we are good.
    } catch (e) {
      // Handled by parent
    } finally {
      setLinking(false);
    }
  };
  const [adjuntos, setAdjuntos] = useState<AdjuntoCorreo[]>([]);
  const [loadingAdjuntos, setLoadingAdjuntos] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [visorAbierto, setVisorAbierto] = useState(false);
  const [docParaVisor, setDocParaVisor] = useState<{ url: string; nombre: string } | null>(null);

  // Historial (Timeline)
  const [historial, setHistorial] = useState<any[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Comentarios
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [loadingComentarios, setLoadingComentarios] = useState(false);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [publicandoComentario, setPublicandoComentario] = useState(false);

  // Cuerpo HTML completo del correo (con imágenes inline resueltas)
  const [fullBodyHtml, setFullBodyHtml] = useState<string | null>(null);
  const [loadingBody, setLoadingBody] = useState(false);

  useEffect(() => {
    if (isOpen && comunicacion?.id) {
      setLoadingBody(true);
      correosJuridicosService.getCorreo(comunicacion.id)
        .then((full: any) => {
          if (full?.cuerpoHtml) setFullBodyHtml(full.cuerpoHtml);
        })
        .catch(() => {})
        .finally(() => setLoadingBody(false));
    } else {
      setFullBodyHtml(null);
    }
  }, [isOpen, comunicacion?.id]);

  // Cargar adjuntos reales desde la API
  useEffect(() => {
    const loadAdjuntos = async () => {
      if (!isOpen || !comunicacion?.id) return;

      setLoadingAdjuntos(true);
      try {
        const data = await correosJuridicosService.getAdjuntos(comunicacion.id);
        setAdjuntos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading adjuntos:', error);
        setAdjuntos([]);
      } finally {
        setLoadingAdjuntos(false);
      }
    };

    loadAdjuntos();
  }, [isOpen, comunicacion?.id]);

  // Cargar el historial del correo
  useEffect(() => {
    const loadHistorial = async () => {
      if (!isOpen || !comunicacion?.id || tabActivo !== 'timeline') return;

      setLoadingHistorial(true);
      try {
        const data = await correosJuridicosService.getHistorial(comunicacion.id);
        setHistorial(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading historial:', error);
        setHistorial([]);
      } finally {
        setLoadingHistorial(false);
      }
    };

    loadHistorial();
  }, [isOpen, comunicacion?.id, tabActivo]);

  // Cargar comentarios al abrir la comunicación o al entrar a la pestaña
  useEffect(() => {
    const loadComentarios = async () => {
      if (!isOpen || !comunicacion?.id || tabActivo !== 'comentarios') return;

      setLoadingComentarios(true);
      try {
        const data = await correosJuridicosService.getComentarios(comunicacion.id);
        setComentarios(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading comentarios:', error);
        setComentarios([]);
      } finally {
        setLoadingComentarios(false);
      }
    };

    loadComentarios();
  }, [isOpen, comunicacion?.id, tabActivo]);

  const handlePublicarComentario = async () => {
    if (!comunicacion?.id || !nuevoComentario.trim()) return;

    setPublicandoComentario(true);
    try {
      const currentUser = authService.getCurrentUser() as any;
      const usuarioNombre = currentUser
        ? (currentUser.fullName || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Usuario')
        : 'Usuario';

      await correosJuridicosService.createComentario(comunicacion.id, {
        mensaje: nuevoComentario,
        usuario: usuarioNombre,
        cargo: 'Funcionario'
      });

      setNuevoComentario('');
      const data = await correosJuridicosService.getComentarios(comunicacion.id);
      setComentarios(Array.isArray(data) ? data : []);
      toast.success('Comentario publicado');
    } catch (error) {
      console.error('Error creando comentario:', error);
      toast.error('Error al publicar el comentario');
    } finally {
      setPublicandoComentario(false);
    }
  };

  // ==================== DATOS MOCK ====================

  // Dynamic Timeline mapped from fetched data instead of mock
  const mappedTimeline = historial.length > 0 ? historial.map((h, i) => {
    // Determine color and icon by event type
    let color = '#71717A'; // default gray
    if (h.tipoEvento === 'ENVIADO') color = '#003DA5'; // corporate blue (ESAP)
    if (h.tipoEvento === 'RECIBIDO') color = '#2563EB'; // blue
    if (h.tipoEvento === 'LEIDO') color = '#10B981'; // green
    if (h.tipoEvento === 'ARCHIVADO') color = '#8B5CF6'; // purple
    if (h.tipoEvento === 'DESARCHIVADO') color = '#F59E0B'; // yellow
    if (h.tipoEvento === 'ASOCIADO_PROCESO') color = '#E11D48'; // rose
    if (h.tipoEvento === 'RESPONDIDO') color = '#0284C7'; // sky
    if (h.tipoEvento === 'REENVIADO') color = '#F97316'; // orange
    if (h.tipoEvento === 'DOCUMENTO_ABIERTO') color = '#7C3AED'; // violet
    if (h.tipoEvento === 'CORREO_ABIERTO_EXTERNO') color = '#059669'; // emerald
    if (h.tipoEvento === 'DOCUMENTO_ABIERTO_EXTERNO') color = '#D946EF'; // fuchsia
    if (h.tipoEvento === 'CLASIFICADO_MANUAL') color = '#6366F1'; // indigo

    return {
      id: h.id || `historial-${i}`,
      tipo: h.tipoEvento,
      descripcion: h.descripcion,
      fecha: h.fechaCreacion,
      usuario: h.usuario || 'Sistema',
      color
    };
  }) : [];

  // ==================== HANDLERS ====================

  const handleDescargarAdjunto = async (adjunto: AdjuntoCorreo) => {
    setDownloadingId(adjunto.id);
    try {
      const blobUrl = await correosJuridicosService.downloadAdjunto(adjunto.id);

      // Create temporary link to trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = adjunto.nombre;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Cleanup blob URL
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);

      toast.success('✅ Descarga completada', {
        description: adjunto.nombre
      });
    } catch (error) {
      console.error('Error downloading adjunto:', error);
      toast.error('Error al descargar el archivo');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleVerAdjunto = async (adjunto: AdjuntoCorreo) => {
    setPreviewingId(adjunto.id);
    try {
      const blobUrl = await correosJuridicosService.downloadAdjunto(adjunto.id);
      setDocParaVisor({ url: blobUrl, nombre: adjunto.nombre });
      setVisorAbierto(true);
    } catch (error) {
      console.error('Error previewing adjunto:', error);
      toast.error('Error al abrir la vista previa del archivo');
    } finally {
      setPreviewingId(null);
    }
  };

  const handleCerrarVisor = () => {
    setVisorAbierto(false);
    if (docParaVisor?.url) {
      window.URL.revokeObjectURL(docParaVisor.url);
    }
    setDocParaVisor(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleDescargarPDF = async () => {
    toast.info('⏳ Generando ZIP con PDF y Adjuntos...');
    try {
      const url = await correosJuridicosService.exportCorreoZip(comunicacion.id);

      const link = document.createElement('a');
      link.href = url;
      link.download = `Email_${comunicacion.id.substring(0, 8)}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('✅ Exportación completada');
    } catch (error) {
      console.error('Error exporting ZIP:', error);
      toast.error('Error al generar el archivo ZIP');
    }
  };

  const handleDerivarModulo = () => {
    const modulo = comunicacion.clasificacionIA?.moduloSugerido || 'Defensa Judicial';
    toast.success('✅ Comunicación derivada', {
      description: `Derivado a: ${modulo}`,
      duration: 3000
    });
  };

  const handleMarcarLeidaLocal = () => {
    if (onMarcarLeida) {
      onMarcarLeida(comunicacion.id);
    }
    toast.success('✅ Marcado como leída');
  };

  const handleArchivarLocal = () => {
    if (onArchivar) {
      onArchivar(comunicacion.id);
    }
    toast.success('📦 Comunicación archivada');
    onClose();
  };

  const badgeTipo = {
    JUDICIAL: { label: 'Judicial', color: 'bg-blue-100 text-blue-700', icon: '⚖️' },
    CORREO: { label: 'Correo', color: 'bg-gray-100 text-gray-700', icon: '📧' },
    OFICIO: { label: 'Oficio', color: 'bg-green-100 text-green-700', icon: '📄' },
    ENVIADO: { label: 'Enviado', color: 'bg-gray-100 text-gray-700', icon: '📤' }
  }[comunicacion.tipo] || { label: 'Otro', color: 'bg-gray-100 text-gray-700', icon: '📋' };

  const getIcono = () => {
    switch (comunicacion.tipo) {
      case 'JUDICIAL': return Gavel;
      case 'CORREO': return Mail;
      case 'OFICIO': return FileText;
      case 'ENVIADO': return Send;
      default: return Mail;
    }
  };

  // ==================== RENDER ====================

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent hideCloseButton className="w-[95vw] max-w-[900px] lg:max-w-4xl h-[95vh] flex flex-col p-0">
          <DialogTitle className="sr-only">Expediente Comunicación {comunicacion.id}</DialogTitle>
          <DialogDescription className="sr-only">
            Visualización completa de la comunicación
          </DialogDescription>

          {/* HEADER - flex-shrink-0 (siempre visible) */}
          <ModalHeaderClean
            icono={getIcono()}
            titulo="Detalle de Comunicación"
            subtitulo={comunicacion.asunto}
            colorIcono={comunicacion.tipo === 'JUDICIAL' ? 'blue' : 'indigo'}
            badges={[
              { texto: badgeTipo.label, color: comunicacion.tipo === 'JUDICIAL' ? 'azul' : 'gris' },
              ...(comunicacion.urgente ? [{ texto: '🔴 Urgente', color: 'rojo' as const }] : []),
              ...(comunicacion.leida ? [{ texto: '✅ Leída', color: 'verde' as const }] : [{ texto: '📬 No leída', color: 'naranja' as const }])
            ]}
            onClose={onClose}
          />

          {/* MÉTRICAS SUPERIORES - flex-shrink-0 (siempre visible) */}
          <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Fecha Recepción</p>
                  <p className="text-sm font-bold text-gray-900">
                    {new Date(comunicacion.fechaRadicacion).toLocaleDateString('es-CO')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Remitente</p>
                  <p className="text-sm font-bold text-gray-900 truncate">{comunicacion.remitente}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Paperclip className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Documentos</p>
                  <p className="text-sm font-bold text-gray-900">{comunicacion.documentosAdjuntos.length}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Estado</p>
                  <Badge variant="outline" className="font-bold">
                    {comunicacion.estado}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* TABS PRINCIPALES */}
          <div className="flex-1 overflow-y-auto">
            <Tabs value={tabActivo} onValueChange={setTabActivo} className="h-full">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 z-10">
                <TabsList className="w-full justify-start gap-4 bg-transparent">
                  <TabsTrigger value="general" className="gap-2">
                    <FileText className="w-4 h-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="documentos" className="gap-2">
                    <Paperclip className="w-4 h-4" />
                    Documentos ({loadingAdjuntos ? '...' : adjuntos.length})
                  </TabsTrigger>
                  <TabsTrigger value="clasificacion" className="gap-2">
                    <Activity className="w-4 h-4" />
                    Clasificación IA
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="gap-2">
                    <History className="w-4 h-4" />
                    Timeline
                  </TabsTrigger>
                  <TabsTrigger value="comentarios" className="gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comentarios ({comentarios.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-6">
                {/* TAB: GENERAL */}
                <TabsContent value="general" className="space-y-4 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Información del Remitente */}
                    <Card className="p-4 bg-gray-50 border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Building2 className="w-5 h-5 text-gray-600" />
                        <h3 className="font-bold text-gray-900">Información del Remitente</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600">Remitente</p>
                          <p className="text-sm font-bold text-gray-900">{comunicacion.remitente}</p>
                        </div>
                        {comunicacion.despachoOrigen && (
                          <div>
                            <p className="text-xs text-gray-600">Despacho de Origen</p>
                            <p className="text-sm font-bold text-gray-900">{comunicacion.despachoOrigen}</p>
                          </div>
                        )}
                        {comunicacion.radicadoExterno && (
                          <div>
                            <p className="text-xs text-gray-600">Radicado Externo</p>
                            <p className="text-sm font-bold text-gray-900">{comunicacion.radicadoExterno}</p>
                          </div>
                        )}
                      </div>
                    </Card>

                    {/* Información de la Comunicación */}
                    <Card className="p-4 bg-gray-50 border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <h3 className="font-bold text-gray-900">Clasificación</h3>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600">Tipo</p>
                          <Badge className={badgeTipo.color}>
                            {badgeTipo.icon} {badgeTipo.label}
                          </Badge>
                        </div>
                        {comunicacion.tipoProceso && (
                          <div>
                            <p className="text-xs text-gray-600">Tipo de Proceso</p>
                            <p className="text-sm font-bold text-gray-900">{comunicacion.tipoProceso}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-600">Urgencia</p>
                          <Badge variant={comunicacion.urgente ? 'destructive' : 'outline'}>
                            {comunicacion.urgente ? '🔴 Urgente' : '🟢 Normal'}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Asunto y Descripción */}
                  <Card className="p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center gap-3 mb-4">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <h3 className="font-bold text-gray-900">Contenido</h3>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Asunto</p>
                        <p className="font-bold text-gray-900">{comunicacion.asunto}</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <p className="text-xs text-gray-600 mb-2">Contenido</p>
                        {loadingBody ? (
                          <div className="flex items-center gap-2 py-4 text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Cargando contenido...</span>
                          </div>
                        ) : fullBodyHtml ? (
                          <div
                            className="text-sm text-gray-800 overflow-auto max-h-[400px] [&_img]:max-w-full [&_img]:h-auto"
                            dangerouslySetInnerHTML={{ __html: fullBodyHtml }}
                          />
                        ) : (
                          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {comunicacion.descripcion}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* TAB: DOCUMENTOS */}
                <TabsContent value="documentos" className="space-y-4 mt-0">
                  {loadingAdjuntos ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Cargando adjuntos...</span>
                    </div>
                  ) : adjuntos.length === 0 ? (
                    <Card className="p-8 bg-gray-50 border-gray-200 text-center">
                      <Paperclip className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No hay documentos adjuntos</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Este correo no tiene archivos adjuntos
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      {adjuntos.map((adjunto) => (
                        <Card key={adjunto.id} className="p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-blue-50">
                              <FileText className="w-6 h-6 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-gray-900 truncate">{adjunto.nombre}</h4>
                              <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                                <span>{adjunto.contentType || 'Archivo'}</span>
                                <span>{formatFileSize(adjunto.tamanio)}</span>
                                <span>{new Date(adjunto.createdAt).toLocaleDateString('es-CO')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isPreviewableInPlatform(adjunto.nombre) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={previewingId === adjunto.id}
                                  onClick={() => handleVerAdjunto(adjunto)}
                                >
                                  {previewingId === adjunto.id ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Eye className="w-4 h-4 mr-1" />
                                  )}
                                  Ver
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={downloadingId === adjunto.id}
                                onClick={() => handleDescargarAdjunto(adjunto)}
                              >
                                {downloadingId === adjunto.id ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4 mr-1" />
                                )}
                                Descargar
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* TAB: CLASIFICACIÓN IA */}
                <TabsContent value="clasificacion" className="space-y-4 mt-0">
                  {comunicacion.clasificacionIA ? (
                    <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                      <div className="flex items-center gap-3 mb-4">
                        <Activity className="w-6 h-6 text-purple-600" />
                        <div>
                          <h3 className="font-bold text-gray-900">Análisis Automático IA</h3>
                          <p className="text-sm text-gray-600">Sistema de clasificación inteligente</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-white p-4 rounded-lg border border-purple-200">
                            <p className="text-xs text-gray-600 mb-1">Tipo Detectado</p>
                            <p className="text-sm font-bold text-gray-900">{comunicacion.clasificacionIA.tipoDetectado}</p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-purple-200">
                            <p className="text-xs text-gray-600 mb-1">Módulo Sugerido</p>
                            <p className="text-sm font-bold text-gray-900">{comunicacion.clasificacionIA.moduloSugerido}</p>
                          </div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-purple-200">
                          <p className="text-xs text-gray-600 mb-2">Nivel de Confianza</p>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-purple-600 h-2 rounded-full transition-all"
                                style={{ width: `${comunicacion.clasificacionIA.confianza}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-gray-900">{comunicacion.clasificacionIA.confianza}%</span>
                          </div>
                        </div>

                        {/* SECCIÓN DE DERIVACIÓN MANUAL START */}
                        <div className="mt-4 pt-4 border-t border-purple-200">
                          <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Send className="w-4 h-4 text-purple-600" />
                            Derivar a Proceso / Expediente
                          </h4>

                          {/* Selector de Módulo */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <button
                              onClick={() => setSelectedModule('DEFENSA')}
                              className={`py-2 px-3 rounded-md border text-sm transition-all flex items-center justify-center gap-2 ${selectedModule === 'DEFENSA'
                                ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold shadow-sm'
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                              <Gavel className="w-4 h-4" />
                              Defensa Judicial
                            </button>
                            <button
                              onClick={() => setSelectedModule('DISCIPLINARIO')}
                              className={`py-2 px-3 rounded-md border text-sm transition-all flex items-center justify-center gap-2 ${selectedModule === 'DISCIPLINARIO'
                                ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold shadow-sm'
                                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                              <Scale className="w-4 h-4" />
                              Disciplinario
                            </button>
                          </div>

                          {/* Buscador (Solo si hay módulo seleccionado) */}
                          {selectedModule && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                  <Input
                                    placeholder={selectedModule === 'DEFENSA' ? "Filtrar por radicado, demandante o ID..." : "Filtrar por radicado o investigado..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 bg-white"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                  />
                                </div>
                                <Button onClick={handleSearch} disabled={isSearching} variant="default" className="bg-purple-600 hover:bg-purple-700">
                                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                              </div>

                              {/* Resultados */}
                              {searchResults.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-md max-h-[180px] overflow-y-auto shadow-inner">
                                  {searchResults.map((proc) => (
                                    <div
                                      key={proc.id}
                                      onClick={() => setSelectedProcess(proc)}
                                      className={`p-3 text-sm border-b border-gray-100 cursor-pointer hover:bg-purple-50 transition-colors ${selectedProcess?.id === proc.id ? 'bg-purple-50 border-l-4 border-purple-600 pl-2' : ''
                                        }`}
                                    >
                                      <div className="flex justify-between items-start">
                                        <p className="font-bold text-gray-900">{proc.radicado}</p>
                                        <Badge variant="outline" className="text-[10px]">{selectedModule === 'DEFENSA' ? 'Judicial' : 'Disciplinario'}</Badge>
                                      </div>
                                      <p className="text-gray-600 truncate mt-1">
                                        {selectedModule === 'DEFENSA'
                                          ? `Dte: ${proc.demandante} - Dda: ${proc.demandado}`
                                          : `Inv: ${proc.investigado || proc.nombreInvestigado}`}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {searchResults.length === 0 && !isSearching && (
                                <div className="text-center py-4 text-gray-500 italic bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                  No se encontraron procesos con ese criterio
                                </div>
                              )}

                              {/* Botón Acción Final */}
                              <Button
                                className="w-full h-10 font-bold shadow-md transform active:scale-95 transition-all"
                                style={{ background: '#003DA5' }} // Corporate Blue
                                disabled={!selectedProcess || linking}
                                onClick={executeLink}
                              >
                                {linking ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Vinculando Correo...
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Confirmar Vinculación al Expediente
                                  </>
                                )}
                              </Button>
                            </div>
                          )}

                          {/* Info Default (Sin selección) */}
                          {!selectedModule && (
                            <div className="text-center p-4 bg-purple-50/50 rounded-lg border border-dashed border-purple-200 text-purple-800 text-sm">
                              Seleccione el módulo destino para derivar esta comunicación
                            </div>
                          )}
                        </div>
                        {/* SECCIÓN DE DERIVACIÓN MANUAL END */}
                      </div>
                    </Card>
                  ) : (
                    <Card className="p-6 bg-gray-50 border-gray-200">
                      <p className="text-center text-gray-500">No hay análisis IA disponible</p>
                    </Card>
                  )}
                </TabsContent>

                {/* TAB: TIMELINE */}
                <TabsContent value="timeline" className="space-y-4 mt-0">
                  {loadingHistorial ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                      <span className="ml-3 text-gray-600">Cargando trazabilidad...</span>
                    </div>
                  ) : mappedTimeline.length === 0 ? (
                    <Card className="p-8 bg-gray-50 border-gray-200 text-center">
                      <History className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium">No hay historial disponible</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Aún no se ha registrado ninguna acción sobre este correo.
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {mappedTimeline.map((evento) => (
                        <Card key={evento.id} className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className="p-2 rounded-lg flex-shrink-0"
                              style={{ background: `${evento.color}20` }}
                            >
                              <Activity className="w-5 h-5" style={{ color: evento.color }} />
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
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
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
                      placeholder="Escriba su comentario..."
                      rows={3}
                      className="mb-3"
                      value={nuevoComentario}
                      onChange={(e) => setNuevoComentario(e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={handlePublicarComentario}
                      disabled={!nuevoComentario.trim() || publicandoComentario}
                    >
                      {publicandoComentario ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Publicar Comentario
                    </Button>
                  </Card>

                  {/* Comentarios Existentes */}
                  {loadingComentarios ? (
                    <div className="text-center py-4 text-gray-500">Cargando comentarios...</div>
                  ) : (
                    <div className="space-y-3">
                      {comentarios.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <p className="text-sm">No hay comentarios aún.</p>
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
                                    <p className="text-xs text-gray-600">
                                      {new Date(comentario.fecha).toLocaleString('es-CO')}
                                    </p>
                                  </div>
                                  {comentario.cargo && (
                                    <Badge variant="outline" className="text-xs">
                                      {comentario.cargo}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-800">{comentario.mensaje}</p>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!comunicacion.leida && authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_LEIDO) && (
                  <Button variant="outline" size="sm" onClick={handleMarcarLeidaLocal}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Leída
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleDescargarPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF/ZIP
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {authService.hasPermission(Permissions.GESTION_LEGAL_COMUNICACIONES_ARCHIVAR) && (
                  <Button variant="outline" size="sm" onClick={handleArchivarLocal}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archivar
                  </Button>
                )}
                <Button onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* VISOR INLINE DE ADJUNTOS (PDF/Imágenes) */}
      {docParaVisor && (
        <VisorDocumentoModal
          isOpen={visorAbierto}
          onClose={handleCerrarVisor}
          archivo={docParaVisor.url}
          numero={docParaVisor.nombre}
          asunto={comunicacion.asunto}
          forcePdfJsViewer
        />
      )}
    </>
  );
}
