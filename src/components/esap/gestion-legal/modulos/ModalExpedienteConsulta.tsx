/**
 * ModalExpedienteConsulta - Modal COMPLETO de visualización del expediente de consulta jurídica
 * ✅ Diseño corporativo ESAP 2025 premium
 * ✅ Estilo moderno con header destacado y métricas visuales
 * ✅ Tabs funcionales con lógica de negocio profesional
 */

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { legalService } from '../../../../services/api/legal.service';
import {
  FileQuestion, Scale, User, Calendar, Clock, AlertTriangle,
  Download, Eye, ExternalLink, Paperclip, CheckCircle,
  AlertCircle, TrendingUp, X, Search, Share, Plus,
  Building2, Mail, FileText, FileCheck, Activity,
  MessageSquare, Send, Edit, Filter, ChevronDown,
  Phone, Hash, Bell, Target, Flag, Bookmark, Archive,
  Upload, BookOpen, Gavel, History
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
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

interface ModalExpedienteConsultaProps {
  isOpen: boolean;
  onClose: () => void;
  consulta: ConsultaJuridica;
}

export function ModalExpedienteConsulta({ isOpen, onClose, consulta }: ModalExpedienteConsultaProps) {
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
    } catch (error) {
      console.error('Error guardando borrador:', error);
      toast.dismiss();
      toast.error('Error al guardar borrador');
    }
  };

  const handleEnviarRespuesta = async () => {
    if (!consulta?.uuid || !respuestaTexto.trim()) return;

    if (!confirm('¿Está seguro de enviar esta respuesta? La consulta quedará marcada como respondida.')) {
      return;
    }

    try {
      toast.loading('Enviando respuesta...');
      await legalService.guardarRespuestaConsulta(consulta.uuid, respuestaTexto, true);
      toast.dismiss();
      toast.success('Respuesta enviada correctamente');
      onClose(); // Cerrar modal o recargar datos
      // Podríamos disparar un evento de recarga si lo recibimos por props
    } catch (error) {
      console.error('Error enviando respuesta:', error);
      toast.dismiss();
      toast.error('Error al enviar respuesta');
    }
  };



  const timeline = consulta.timeline || [
    {
      id: 'TL-001',
      tipo: 'CREACIÓN',
      descripcion: 'Consulta radicada en el sistema',
      fecha: new Date('2025-01-15T08:30:00'),
      usuario: 'Sistema SIGL',
      icono: 'FileQuestion',
      color: '#2962FF'
    },
    {
      id: 'TL-002',
      tipo: 'ASIGNACIÓN',
      descripcion: 'Asignada a Dra. Ana López García',
      fecha: new Date('2025-01-15T09:15:00'),
      usuario: 'Coordinador Jurídico',
      icono: 'User',
      color: '#10B981'
    },
    {
      id: 'TL-003',
      tipo: 'CAMBIO_ETAPA',
      descripcion: 'Cambio de etapa: RADICADA → ANÁLISIS',
      fecha: new Date('2025-01-16T10:00:00'),
      usuario: 'Dra. Ana López García',
      icono: 'Activity',
      color: '#F59E0B'
    },
    {
      id: 'TL-004',
      tipo: 'CARGA_DOCUMENTO',
      descripcion: 'Normativa aplicable adjuntada',
      fecha: new Date('2025-01-16T14:30:00'),
      usuario: 'Dra. Ana López García',
      icono: 'Paperclip',
      color: '#6366F1'
    },
    {
      id: 'TL-005',
      tipo: 'COMENTARIO',
      descripcion: 'Comentario: Se requiere revisar jurisprudencia reciente',
      fecha: new Date('2025-01-17T11:00:00'),
      usuario: 'Dra. Ana López García',
      icono: 'MessageSquare',
      color: '#8B5CF6'
    }
  ];

  // Estados para comentarios
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [loadingComentarios, setLoadingComentarios] = useState(false);

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

  const handleDescargarDocumento = async (doc: any) => {
    if (!doc.archivoUrl) {
      toast.error('No hay archivo disponible');
      return;
    }

    try {
      const baseUrl = 'http://localhost:3008';
      const url = doc.archivoUrl.startsWith('http') ? doc.archivoUrl : `${baseUrl}${doc.archivoUrl}`;

      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = doc.archivoNombreOriginal || doc.nombre || 'documento';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('✅ Descarga completada', {
        description: doc.archivoNombreOriginal || doc.nombre
      });
    } catch (error) {
      console.error('Error descargando:', error);
      toast.error('Error al descargar el archivo');
    }
  };

  const handleVerDocumento = (doc: any) => {
    if (doc.archivoUrl) {
      const baseUrl = 'http://localhost:3008';
      const url = doc.archivoUrl.startsWith('/') ? `${baseUrl}${doc.archivoUrl}` : doc.archivoUrl;
      window.open(url, '_blank');
    } else {
      toast.error('No hay archivo disponible para ver');
    }
  };

  const handleDescargarTodos = async () => {
    if (!consulta?.uuid) return;
    if (documentos.length === 0) {
      toast.warning('No hay documentos para descargar');
      return;
    }

    toast.loading('📦 Preparando descarga ZIP...', { id: 'download-docs' });

    try {
      const url = legalService.getDocumentosConsultaDownloadUrl(consulta.uuid);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Error al descargar los documentos');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `consulta_juridica_${consulta.id || consulta.uuid}.zip`;
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

  const handleEliminarDocumento = async (docId: string) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await legalService.deleteDocumentoConsulta(docId);
      toast.success('Documento eliminado');
      await loadDocumentos();
    } catch (error) {
      console.error('Error eliminando documento:', error);
      toast.error('Error al eliminar');
    }
  };

  const handleDescargarPDF = () => {
    toast.success('📄 Generando reporte PDF', {
      description: `Consulta ${consulta.id} - Reporte completo`,
      duration: 3000
    });
  };



  const handleCambiarEtapa = (nuevaEtapa: string) => {
    toast.info('🔄 Cambio de etapa', {
      description: `${consulta.etapa} → ${nuevaEtapa}`,
      duration: 3000
    });
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
        <DialogContent className="max-w-7xl max-h-[95vh] p-0 gap-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>Expediente Consulta Jurídica {consulta.id}</DialogTitle>
            <DialogDescription>Visualización completa del expediente de consulta jurídica</DialogDescription>
          </DialogHeader>

          {/* HEADER LIMPIO ESAP 2025 */}
          <ModalHeaderClean
            icono={FileQuestion}
            titulo={`Consulta ${consulta.id}`}
            subtitulo={consulta.temaJuridico}
            colorIcono="purple"
            onClose={onClose}
          />

          {/* MÉTRICAS SUPERIORES */}
          <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-200">
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
                  <p className="text-sm font-bold text-gray-900 truncate">{consulta.abogadoAsignado}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white shadow-sm">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600">Etapa</p>
                  <Badge variant="outline" className="font-bold">
                    {consulta.etapa}
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
                    <FileQuestion className="w-4 h-4" />
                    General
                  </TabsTrigger>
                  <TabsTrigger value="documentos" className="gap-2">
                    <Paperclip className="w-4 h-4" />
                    Documentos ({documentos.length})
                  </TabsTrigger>

                  <TabsTrigger value="respuesta" className="gap-2">
                    <FileCheck className="w-4 h-4" />
                    Respuesta
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingDoc}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingDoc ? 'Subiendo...' : 'Subir Documento'}
                      </Button>
                    </div>
                  </div>

                  {loadingDocs ? (
                    <div className="text-center py-8 text-gray-500">
                      <Clock className="w-8 h-8 mx-auto mb-2 animate-spin" />
                      <p>Cargando documentos...</p>
                    </div>
                  ) : documentos.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">No hay documentos adjuntos</p>
                      <p className="text-sm">Haz clic en "Subir Documento" para agregar archivos</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {documentos
                        .filter(doc =>
                          !busquedaDocs ||
                          doc.nombre?.toLowerCase().includes(busquedaDocs.toLowerCase()) ||
                          doc.archivoNombreOriginal?.toLowerCase().includes(busquedaDocs.toLowerCase())
                        )
                        .map((doc) => (
                          <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-4">
                              <div className="p-3 rounded-lg bg-blue-50">
                                <FileText className="w-6 h-6 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-900 truncate">
                                  {doc.archivoNombreOriginal || doc.nombre}
                                </h4>
                                <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                                  <span>{doc.tipoDocumento || 'Documento'}</span>
                                  {doc.tamanoBytes && (
                                    <span>{(doc.tamanoBytes / 1024 / 1024).toFixed(2)} MB</span>
                                  )}
                                  <span>{new Date(doc.createdAt).toLocaleDateString('es-CO')}</span>
                                  {doc.subidoPor && <span>Por: {doc.subidoPor}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleVerDocumento(doc)}
                                >
                                  <Eye className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDescargarDocumento(doc)}
                                >
                                  <Download className="w-4 h-4 mr-1" />
                                  Descargar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEliminarDocumento(doc.id)}
                                  className="text-red-600 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                    </div>
                  )}
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
                    {timeline.map((evento, index) => (
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