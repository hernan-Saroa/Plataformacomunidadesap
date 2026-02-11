/**
 * ModalExpedienteComunicacion - Modal COMPLETO de visualización de comunicación
 * ✅ Diseño corporativo ESAP 2025 premium
 * ✅ Vista detallada con tabs funcionales
 */

import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { 
  Mail, Gavel, FileText, User, Calendar, Clock, AlertTriangle,
  Download, Eye, Paperclip, CheckCircle, Share, Send,
  Building2, Activity, MessageSquare, History, Archive,
  ExternalLink, Target, Flag
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Textarea } from '../../../ui/textarea';

import { ModalHeaderClean } from '../../../design-system/ModalHeaderClean';
import { ModalCompartir } from './ModalCompartir';

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
  estado: 'PENDIENTE' | 'LEIDA' | 'ARCHIVADA';
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
}

export function ModalExpedienteComunicacion({ 
  isOpen, 
  onClose, 
  comunicacion,
  onMarcarLeida,
  onArchivar
}: ModalExpedienteComunicacionProps) {
  const [tabActivo, setTabActivo] = useState('general');
  const [modalCompartirAbierto, setModalCompartirAbierto] = useState(false);

  // ==================== DATOS MOCK ====================
  
  const timeline = [
    {
      id: 'TL-001',
      tipo: 'RECEPCIÓN',
      descripcion: 'Comunicación recibida y radicada',
      fecha: comunicacion.fechaRadicacion,
      usuario: 'Sistema SIGL',
      color: '#2962FF'
    },
    {
      id: 'TL-002',
      tipo: 'CLASIFICACIÓN',
      descripcion: `IA clasificó como: ${comunicacion.clasificacionIA?.tipoDetectado || 'N/A'}`,
      fecha: new Date(comunicacion.fechaRadicacion.getTime() + 60000),
      usuario: 'Sistema IA',
      color: '#8B5CF6'
    },
    {
      id: 'TL-003',
      tipo: 'ASIGNACIÓN',
      descripcion: `Sugerencia: Derivar a ${comunicacion.clasificacionIA?.moduloSugerido || 'N/A'}`,
      fecha: new Date(comunicacion.fechaRadicacion.getTime() + 120000),
      usuario: 'Sistema SIGL',
      color: '#10B981'
    }
  ];

  const comentarios = [
    {
      id: 'COM-001',
      usuario: 'Coordinador Jurídico',
      fecha: new Date(),
      comentario: 'Requiere atención inmediata. Favor asignar al módulo correspondiente.',
      tipo: 'CLASIFICACIÓN'
    }
  ];

  // ==================== HANDLERS ====================
  
  const handleDescargarDocumento = (doc: string) => {
    toast.success('✅ Descarga iniciada', {
      description: doc
    });
  };

  const handleDescargarPDF = () => {
    toast.success('📄 Generando reporte PDF', {
      description: `Comunicación ${comunicacion.id} - Reporte completo`,
      duration: 3000
    });
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
            titulo={`Comunicación ${comunicacion.id}`}
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
                    Documentos ({comunicacion.documentosAdjuntos.length})
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
                        <p className="text-xs text-gray-600 mb-2">Descripción</p>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                          {comunicacion.descripcion}
                        </p>
                      </div>
                    </div>
                  </Card>
                </TabsContent>

                {/* TAB: DOCUMENTOS */}
                <TabsContent value="documentos" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    {comunicacion.documentosAdjuntos.map((doc, index) => (
                      <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-4">
                          <div className="p-3 rounded-lg bg-blue-50">
                            <FileText className="w-6 h-6 text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 truncate">{doc}</h4>
                            <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                              <span>PDF</span>
                              <span>2.3 MB</span>
                              <span>{new Date(comunicacion.fechaRadicacion).toLocaleDateString('es-CO')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toast.info('Abriendo visor...', { description: doc })}
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
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
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

                        <Button
                          className="w-full"
                          style={{ background: '#8B5CF6', color: '#FFFFFF' }}
                          onClick={handleDerivarModulo}
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Derivar a {comunicacion.clasificacionIA.moduloSugerido}
                        </Button>
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
                  <div className="space-y-3">
                    {timeline.map((evento) => (
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
                      placeholder="Escriba su comentario..."
                      rows={3}
                      className="mb-3"
                    />
                    <Button size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Publicar Comentario
                    </Button>
                  </Card>

                  {/* Comentarios Existentes */}
                  <div className="space-y-3">
                    {comentarios.map((comentario) => (
                      <Card key={comentario.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                              {comentario.usuario.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-bold text-gray-900">{comentario.usuario}</h4>
                                <p className="text-xs text-gray-600">
                                  {new Date(comentario.fecha).toLocaleDateString('es-CO')}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {comentario.tipo}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-800">{comentario.comentario}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>

          {/* FOOTER CON ACCIONES */}
          <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!comunicacion.leida && (
                  <Button variant="outline" size="sm" onClick={handleMarcarLeidaLocal}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Marcar como Leída
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setModalCompartirAbierto(true)}>
                  <Share className="w-4 h-4 mr-2" />
                  Compartir
                </Button>
                <Button variant="outline" size="sm" onClick={handleDescargarPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleArchivarLocal}>
                  <Archive className="w-4 h-4 mr-2" />
                  Archivar
                </Button>
                <Button onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODALES SECUNDARIOS */}
      {modalCompartirAbierto && (
        <ModalCompartir
          isOpen={modalCompartirAbierto}
          onClose={() => setModalCompartirAbierto(false)}
          expedienteId={comunicacion.id}
          tipoExpediente="COMUNICACION"
        />
      )}
    </>
  );
}