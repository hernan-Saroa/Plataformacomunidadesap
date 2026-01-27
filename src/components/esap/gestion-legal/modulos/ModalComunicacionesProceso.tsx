/**
 * ModalComunicacionesProceso - Feed de Comunicaciones del Expediente
 * ✅ Diseño corporativo ESAP 2025 premium
 * ✅ Timeline de comunicaciones estilo chat profesional
 * ✅ Envío de mensajes y adjuntos
 * ✅ Filtros por tipo de comunicación
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Input } from '../../../ui/input';
import { Textarea } from '../../../ui/textarea';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { 
  MessageSquare, X, Send, Paperclip, Search, Filter,
  User, Calendar, Clock, CheckCircle, AlertCircle,
  Mail, Phone, FileText, Download, Eye, Building2,
  Bell, Share2, Plus, Edit, Trash2, MoreVertical
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface Comunicacion {
  id: string;
  tipo: 'Enviada' | 'Recibida' | 'Interna' | 'Juzgado';
  asunto: string;
  mensaje: string;
  remitente: string;
  destinatario: string;
  fecha: string;
  hora: string;
  leido: boolean;
  adjuntos?: Array<{
    nombre: string;
    tamaño: string;
    tipo: string;
  }>;
  prioridad?: 'Alta' | 'Media' | 'Baja';
}

interface ModalComunicacionesProcesoProps {
  isOpen: boolean;
  onClose: () => void;
  expedienteId: string;
  expedienteTitulo: string;
}

export function ModalComunicacionesProceso({ 
  isOpen, 
  onClose, 
  expedienteId,
  expedienteTitulo 
}: ModalComunicacionesProcesoProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'TODAS' | 'Enviada' | 'Recibida' | 'Interna' | 'Juzgado'>('TODAS');
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [nuevoAsunto, setNuevoAsunto] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // ==================== DATOS MOCK ====================
  const [comunicaciones, setComunicaciones] = useState<Comunicacion[]>([
    {
      id: '1',
      tipo: 'Recibida',
      asunto: 'Auto admisorio de la demanda',
      mensaje: 'Se admite la demanda presentada. Se corre traslado a la parte demandada por el término de 30 días para que presente contestación.',
      remitente: 'Juzgado 1° Administrativo de Bogotá',
      destinatario: 'Oficina Jurídica ESAP',
      fecha: '28/12/2024',
      hora: '14:30',
      leido: true,
      prioridad: 'Alta',
      adjuntos: [
        { nombre: 'Auto_Admisorio_001.pdf', tamaño: '1.2 MB', tipo: 'PDF' }
      ]
    },
    {
      id: '2',
      tipo: 'Enviada',
      asunto: 'Contestación de la demanda',
      mensaje: 'Adjunto encontrarán la contestación de la demanda presentada oportunamente por nuestra parte, junto con las excepciones de rigor y las pruebas documentales.',
      remitente: 'Dr. Juan Pérez - ESAP',
      destinatario: 'Juzgado 1° Administrativo',
      fecha: '27/12/2024',
      hora: '11:15',
      leido: true,
      adjuntos: [
        { nombre: 'Contestacion_Demanda.pdf', tamaño: '3.4 MB', tipo: 'PDF' },
        { nombre: 'Pruebas_Documentales.pdf', tamaño: '5.8 MB', tipo: 'PDF' }
      ]
    },
    {
      id: '3',
      tipo: 'Interna',
      asunto: 'Reunión estratégica sobre el caso',
      mensaje: 'Recordatorio: Mañana a las 10:00 AM tenemos reunión con el coordinador jurídico para definir la estrategia de defensa. Favor traer análisis jurisprudencial.',
      remitente: 'Dr. Juan Pérez',
      destinatario: 'Equipo Jurídico',
      fecha: '26/12/2024',
      hora: '16:45',
      leido: true,
      prioridad: 'Media'
    },
    {
      id: '4',
      tipo: 'Recibida',
      asunto: 'Solicitud de información adicional',
      mensaje: 'Se requiere certificación laboral del demandante correspondiente a los últimos 6 meses. Plazo: 5 días hábiles.',
      remitente: 'Juzgado 1° Administrativo',
      destinatario: 'Oficina Jurídica ESAP',
      fecha: '25/12/2024',
      hora: '09:20',
      leido: true,
      prioridad: 'Alta',
      adjuntos: [
        { nombre: 'Solicitud_Info.pdf', tamaño: '850 KB', tipo: 'PDF' }
      ]
    },
    {
      id: '5',
      tipo: 'Enviada',
      asunto: 'Remisión de documentos solicitados',
      mensaje: 'De conformidad con su solicitud, adjunto certificaciones laborales y constancias de pago solicitadas.',
      remitente: 'Dr. Juan Pérez - ESAP',
      destinatario: 'Juzgado 1° Administrativo',
      fecha: '24/12/2024',
      hora: '15:30',
      leido: true,
      adjuntos: [
        { nombre: 'Certificaciones.pdf', tamaño: '2.1 MB', tipo: 'PDF' }
      ]
    }
  ]);

  // ==================== HANDLERS ====================

  const handleEnviarMensaje = () => {
    if (!nuevoAsunto.trim() || !nuevoMensaje.trim()) {
      toast.error('⚠️ Campos requeridos', {
        description: 'Por favor complete el asunto y el mensaje'
      });
      return;
    }

    const nuevaComunicacion: Comunicacion = {
      id: `${comunicaciones.length + 1}`,
      tipo: 'Enviada',
      asunto: nuevoAsunto,
      mensaje: nuevoMensaje,
      remitente: 'Dr. Juan Pérez - ESAP',
      destinatario: 'Juzgado 1° Administrativo',
      fecha: new Date().toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      leido: true
    };

    setComunicaciones([nuevaComunicacion, ...comunicaciones]);
    setNuevoAsunto('');
    setNuevoMensaje('');
    setMostrarFormulario(false);

    toast.success('✅ Comunicación enviada', {
      description: 'El mensaje se envió correctamente al expediente',
      duration: 3000
    });
  };

  const handleAdjuntarArchivo = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx';
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        toast.success('📎 Archivo adjuntado', {
          description: file.name,
          duration: 2000
        });
      }
    };
    input.click();
  };

  const handleDescargarAdjunto = (adjunto: any) => {
    toast.success('📥 Descargando archivo', {
      description: adjunto.nombre,
      duration: 2000
    });
  };

  const handleVerAdjunto = (adjunto: any) => {
    toast.info('👁️ Abriendo visor', {
      description: adjunto.nombre,
      duration: 2000
    });
  };

  // ==================== FILTROS ====================

  const comunicacionesFiltradas = comunicaciones.filter(com => {
    const matchBusqueda = 
      com.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
      com.mensaje.toLowerCase().includes(busqueda.toLowerCase()) ||
      com.remitente.toLowerCase().includes(busqueda.toLowerCase());
    
    const matchTipo = filtroTipo === 'TODAS' || com.tipo === filtroTipo;
    
    return matchBusqueda && matchTipo;
  });

  // ==================== HELPERS ====================

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'Enviada': return { bg: '#DBEAFE', color: '#1E40AF', icon: Send };
      case 'Recibida': return { bg: '#D1FAE5', color: '#065F46', icon: Mail };
      case 'Interna': return { bg: '#FEF3C7', color: '#92400E', icon: MessageSquare };
      case 'Juzgado': return { bg: '#E0E7FF', color: '#3730A3', icon: Building2 };
      default: return { bg: '#F3F4F6', color: '#374151', icon: MessageSquare };
    }
  };

  const getPrioridadColor = (prioridad?: string) => {
    switch (prioridad) {
      case 'Alta': return { bg: '#FEE2E2', color: '#DC2626' };
      case 'Media': return { bg: '#FEF3C7', color: '#F59E0B' };
      case 'Baja': return { bg: '#DBEAFE', color: '#3B82F6' };
      default: return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="w-[95vw] max-w-[750px] lg:max-w-3xl h-[90vh] flex flex-col p-0">
        <DialogDescription className="sr-only">
          Feed de comunicaciones del expediente {expedienteId} con timeline de mensajes enviados y recibidos
        </DialogDescription>
        
        {/* ==================== HEADER ==================== */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black text-white">
                    Comunicaciones del Proceso
                  </DialogTitle>
                  <p className="text-sm text-blue-100">{expedienteTitulo}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/20 text-white font-bold border border-white/30">
                  <FileText className="w-3 h-3 mr-1" />
                  {expedienteId}
                </Badge>
                <Badge className="bg-white text-blue-700 font-bold">
                  {comunicacionesFiltradas.length} comunicaciones
                </Badge>
                <Badge className="bg-green-500 text-white font-bold">
                  {comunicaciones.filter(c => c.tipo === 'Enviada').length} enviadas
                </Badge>
                <Badge className="bg-orange-500 text-white font-bold">
                  {comunicaciones.filter(c => c.tipo === 'Recibida').length} recibidas
                </Badge>
              </div>
            </div>

            <Button 
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="ml-4 text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* ==================== CONTROLES Y FILTROS ==================== */}
        <div className="flex-shrink-0 bg-gray-50 border-b px-6 py-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex-1 w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar en comunicaciones..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <select 
                value={filtroTipo}
                onChange={(e) => setFiltroTipo(e.target.value as any)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white font-semibold"
              >
                <option value="TODAS">Todas</option>
                <option value="Enviada">Enviadas</option>
                <option value="Recibida">Recibidas</option>
                <option value="Interna">Internas</option>
                <option value="Juzgado">Juzgado</option>
              </select>
              <Button 
                size="sm" 
                style={{ background: '#003DA5', color: '#FFFFFF' }}
                className="font-bold"
                onClick={() => setMostrarFormulario(!mostrarFormulario)}
              >
                <Plus className="w-3 h-3 mr-1" />
                Nueva Comunicación
              </Button>
            </div>
          </div>

          {/* Formulario de nueva comunicación */}
          {mostrarFormulario && (
            <Card className="mt-4 p-4 border-2 border-blue-200">
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                Nueva Comunicación
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">
                    Asunto *
                  </label>
                  <Input
                    placeholder="Ej: Solicitud de prórroga para presentar alegatos"
                    value={nuevoAsunto}
                    onChange={(e) => setNuevoAsunto(e.target.value)}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 mb-1 block">
                    Mensaje *
                  </label>
                  <Textarea
                    placeholder="Escriba el contenido de la comunicación..."
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    rows={4}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleAdjuntarArchivo}
                    className="font-bold"
                  >
                    <Paperclip className="w-3 h-3 mr-1" />
                    Adjuntar
                  </Button>
                  <Button 
                    size="sm"
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                    className="font-bold"
                    onClick={handleEnviarMensaje}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Enviar Comunicación
                  </Button>
                  <Button 
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setMostrarFormulario(false);
                      setNuevoAsunto('');
                      setNuevoMensaje('');
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* ==================== TIMELINE DE COMUNICACIONES ==================== */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {comunicacionesFiltradas.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-bold text-gray-500">
                No se encontraron comunicaciones
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {busqueda ? 'Intenta ajustar los filtros de búsqueda' : 'Aún no hay comunicaciones registradas para este expediente'}
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {comunicacionesFiltradas.map((com, idx) => {
                const tipoConfig = getTipoColor(com.tipo);
                const Icon = tipoConfig.icon;
                const prioridadConfig = com.prioridad ? getPrioridadColor(com.prioridad) : null;

                return (
                  <Card 
                    key={com.id}
                    className={`p-4 border-l-4 transition-all hover:shadow-md ${
                      !com.leido ? 'bg-blue-50 border-l-blue-600' : 'border-l-gray-300'
                    }`}
                  >
                    {/* Header de la comunicación */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <div 
                          className="p-2 rounded-lg flex-shrink-0"
                          style={{ background: tipoConfig.bg }}
                        >
                          <Icon className="w-5 h-5" style={{ color: tipoConfig.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h5 className="text-sm font-bold text-gray-900">
                              {com.asunto}
                            </h5>
                            {!com.leido && (
                              <Badge className="bg-blue-600 text-white text-xs font-bold animate-pulse">
                                Nuevo
                              </Badge>
                            )}
                            {prioridadConfig && (
                              <Badge 
                                className="text-xs font-bold"
                                style={{ background: prioridadConfig.bg, color: prioridadConfig.color }}
                              >
                                {com.prioridad}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
                            <Badge 
                              className="text-xs font-semibold"
                              style={{ background: tipoConfig.bg, color: tipoConfig.color }}
                            >
                              {com.tipo}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {com.fecha}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {com.hora}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Remitente y Destinatario */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 pb-3 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">De:</p>
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          {com.remitente}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Para:</p>
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          {com.destinatario}
                        </p>
                      </div>
                    </div>

                    {/* Mensaje */}
                    <div className="mb-3">
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {com.mensaje}
                      </p>
                    </div>

                    {/* Adjuntos */}
                    {com.adjuntos && com.adjuntos.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                          <Paperclip className="w-3 h-3" />
                          Archivos adjuntos ({com.adjuntos.length})
                        </p>
                        <div className="space-y-2">
                          {com.adjuntos.map((adjunto, adjIdx) => (
                            <div 
                              key={adjIdx}
                              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-red-600 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-gray-900 truncate">
                                    {adjunto.nombre}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {adjunto.tipo} · {adjunto.tamaño}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleVerAdjunto(adjunto)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleDescargarAdjunto(adjunto)}
                                  className="h-7 w-7 p-0"
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Acciones */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs font-bold"
                      >
                        <Share2 className="w-3 h-3 mr-1" />
                        Responder
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-xs font-bold"
                      >
                        <Bell className="w-3 h-3 mr-1" />
                        Notificar
                      </Button>
                      {com.tipo === 'Recibida' && !com.leido && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-xs font-bold text-blue-600"
                        >
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Marcar como leída
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* ==================== FOOTER ==================== */}
        <div className="flex-shrink-0 bg-gradient-to-r from-gray-50 to-white border-t-2 border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="font-bold">
                <X className="w-3.5 h-3.5 mr-1.5" />
                Cerrar
              </Button>
              <div className="text-xs text-gray-600 hidden md:block">
                <strong className="font-black" style={{ color: '#003DA5' }}>{comunicacionesFiltradas.length}</strong> comunicaciones · 
                <strong className="text-green-600"> {comunicaciones.filter(c => c.tipo === 'Enviada').length} enviadas</strong> · 
                <strong className="text-orange-600"> {comunicaciones.filter(c => c.tipo === 'Recibida').length} recibidas</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                size="sm"
                variant="outline"
                className="font-bold text-xs"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Exportar
              </Button>
              <Button 
                size="sm"
                style={{ background: '#003DA5', color: '#FFFFFF' }}
                className="font-bold text-xs"
                onClick={() => setMostrarFormulario(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Nueva Comunicación
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
