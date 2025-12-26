/**
 * ModalOficios - Gestión de Oficios y Comunicaciones Oficiales
 * Oficios = Comunicaciones formales enviadas/recibidas durante el proceso
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { 
  Send, Download, Eye, FileText, Mail, ArrowRight, 
  ArrowLeft, X, Upload, Plus, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalOficiosProps {
  isOpen: boolean;
  onClose: () => void;
  expediente: ExpedienteJudicial;
}

// Datos mock de oficios enviados
const oficiosEnviadosMock = [
  {
    id: 1,
    numero: 'OF-ESAP-2024-001',
    asunto: 'Solicitud de Prórroga para Contestación',
    destinatario: 'Juzgado 1° Administrativo de Bogotá',
    fecha: '18/12/2024',
    estado: 'Entregado',
    estadoColor: 'green',
    respuesta: 'Sí',
    contenido: 'Por medio del presente oficio, comedidamente solicitamos prórroga de 10 días adicionales para presentar contestación a la demanda, dado el volumen de documentación que debe ser revisada y analizada.',
    archivo: 'oficio_001_prorroga.pdf',
    tamaño: '450 KB'
  },
  {
    id: 2,
    numero: 'OF-ESAP-2024-002',
    asunto: 'Remisión de Documentos Solicitados',
    destinatario: 'Juzgado 1° Administrativo de Bogotá',
    fecha: '20/12/2024',
    estado: 'Enviado',
    estadoColor: 'blue',
    respuesta: 'Pendiente',
    contenido: 'Atendiendo requerimiento del despacho judicial, me permito remitir la documentación solicitada mediante auto del 15/12/2024: certificaciones laborales, contratos y resoluciones administrativas.',
    archivo: 'oficio_002_documentos.pdf',
    tamaño: '620 KB'
  },
  {
    id: 3,
    numero: 'OF-ESAP-2024-003',
    asunto: 'Contestación de la Demanda',
    destinatario: 'Juzgado 1° Administrativo de Bogotá',
    fecha: '22/12/2024',
    estado: 'En Preparación',
    estadoColor: 'orange',
    respuesta: 'N/A',
    contenido: 'Contestación formal a la demanda presentada, incluyendo pronunciamiento sobre cada una de las pretensiones del demandante y presentación de excepciones de mérito.',
    archivo: 'oficio_003_contestacion.pdf',
    tamaño: '2.8 MB'
  }
];

// Datos mock de oficios recibidos
const oficiosRecibidosMock = [
  {
    id: 1,
    numero: 'OF-JUZG-2024-045',
    asunto: 'Traslado de Demanda',
    remitente: 'Juzgado 1° Administrativo de Bogotá',
    fecha: '10/12/2024',
    estado: 'Atendido',
    estadoColor: 'green',
    prioridad: 'Alta',
    contenido: 'Se traslada demanda presentada por [Demandante] contra ESAP, para que en término de 30 días calendario presente contestación y oponga las excepciones que estime pertinentes.',
    archivo: 'oficio_juzgado_045.pdf',
    tamaño: '1.2 MB',
    requiereRespuesta: true,
    fechaRespuesta: '18/12/2024'
  },
  {
    id: 2,
    numero: 'OF-JUZG-2024-056',
    asunto: 'Solicitud de Documentos',
    remitente: 'Juzgado 1° Administrativo de Bogotá',
    fecha: '15/12/2024',
    estado: 'Atendido',
    estadoColor: 'green',
    prioridad: 'Media',
    contenido: 'Sírvase remitir a este despacho en término de 5 días: certificaciones laborales del demandante, copia del contrato laboral, resoluciones administrativas y expediente disciplinario si existiere.',
    archivo: 'oficio_juzgado_056.pdf',
    tamaño: '380 KB',
    requiereRespuesta: true,
    fechaRespuesta: '20/12/2024'
  },
  {
    id: 3,
    numero: 'OF-JUZG-2024-067',
    asunto: 'Citación a Audiencia de Conciliación',
    remitente: 'Juzgado 1° Administrativo de Bogotá',
    fecha: '23/12/2024',
    estado: 'Pendiente',
    estadoColor: 'orange',
    prioridad: 'Alta',
    contenido: 'Se cita a las partes a audiencia de conciliación para el día 15 de enero de 2025 a las 10:00 AM en las instalaciones del juzgado. Confirmar asistencia.',
    archivo: 'oficio_juzgado_067.pdf',
    tamaño: '520 KB',
    requiereRespuesta: true,
    fechaRespuesta: null
  }
];

export function ModalOficios({ isOpen, onClose, expediente }: ModalOficiosProps) {
  const [oficiosEnviados, setOficiosEnviados] = useState(oficiosEnviadosMock);
  const [oficiosRecibidos, setOficiosRecibidos] = useState(oficiosRecibidosMock);

  const handleDescargarOficio = (oficio: any) => {
    toast.success('Descargando oficio', {
      description: oficio.numero
    });
  };

  const handleVerOficio = (oficio: any) => {
    toast.info('Abriendo visor', {
      description: oficio.numero
    });
  };

  const handleNuevoOficio = () => {
    toast.info('Redactar nuevo oficio', {
      description: 'Abriendo editor de oficios...'
    });
  };

  const getEstadoBadge = (estado: string, color: string) => {
    const colors: Record<string, string> = {
      green: 'bg-green-100 text-green-700 border-green-300',
      blue: 'bg-blue-100 text-blue-700 border-blue-300',
      orange: 'bg-orange-100 text-orange-700 border-orange-300'
    };

    const icons: Record<string, JSX.Element> = {
      green: <CheckCircle className="w-3 h-3" />,
      blue: <Clock className="w-3 h-3" />,
      orange: <AlertCircle className="w-3 h-3" />
    };

    return (
      <Badge className={`${colors[color]} font-semibold flex items-center gap-1 text-xs`}>
        {icons[color]}
        {estado}
      </Badge>
    );
  };

  const getPrioridadBadge = (prioridad: string) => {
    const colors: Record<string, string> = {
      'Alta': 'bg-red-100 text-red-700',
      'Media': 'bg-yellow-100 text-yellow-700',
      'Baja': 'bg-gray-100 text-gray-700'
    };

    return (
      <Badge variant="outline" className={`${colors[prioridad]} text-xs font-semibold`}>
        {prioridad}
      </Badge>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: '#E3F2FD' }}>
                  <Send className="w-5 h-5" style={{ color: '#1976D2' }} />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black" style={{ color: '#003DA5' }}>
                    Oficios y Comunicaciones
                  </DialogTitle>
                  <p className="text-sm text-gray-600">
                    Correspondencia oficial - {expediente.id}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge style={{ background: '#003DA5', color: '#FFFFFF' }}>
                  {expediente.etapa}
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 font-semibold">
                  <ArrowRight className="w-3 h-3 mr-1" />
                  {oficiosEnviados.length} enviados
                </Badge>
                <Badge className="bg-green-100 text-green-700 font-semibold">
                  <ArrowLeft className="w-3 h-3 mr-1" />
                  {oficiosRecibidos.length} recibidos
                </Badge>
              </div>
            </div>

            <Button onClick={onClose} variant="ghost" size="sm" className="ml-4">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Contenido con Tabs */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs defaultValue="enviados" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="enviados">
                📤 Oficios Enviados ({oficiosEnviados.length})
              </TabsTrigger>
              <TabsTrigger value="recibidos">
                📥 Oficios Recibidos ({oficiosRecibidos.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB: OFICIOS ENVIADOS */}
            <TabsContent value="enviados" className="space-y-3">
              {/* Info contextual */}
              <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
                <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Oficios Enviados
                </h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Los <strong>oficios enviados</strong> son comunicaciones formales que ESAP remite 
                  al juzgado o a otras entidades durante el proceso judicial. Incluyen contestaciones, 
                  solicitudes, remisión de documentos, recursos, etc.
                </p>
              </Card>

              {oficiosEnviados.map((oficio) => (
                <Card key={oficio.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 flex-shrink-0">
                      <Send className="w-6 h-6 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-black text-gray-900">{oficio.numero}</h4>
                            {getEstadoBadge(oficio.estado, oficio.estadoColor)}
                          </div>
                          <p className="font-bold text-sm text-gray-700 mb-1">{oficio.asunto}</p>
                          <Badge variant="outline" className="text-xs mb-2">
                            📍 {oficio.destinatario}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {oficio.contenido}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📅 Fecha Envío</p>
                          <p className="text-xs font-bold text-gray-900">{oficio.fecha}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📋 Respuesta</p>
                          <p className="text-xs font-bold text-gray-900">{oficio.respuesta}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📦 Tamaño</p>
                          <p className="text-xs font-bold text-gray-900">{oficio.tamaño}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <FileText className="w-4 h-4 text-red-600" />
                        <p className="text-xs font-bold text-gray-900 flex-1">{oficio.archivo}</p>
                        <Button size="sm" variant="ghost" onClick={() => handleVerOficio(oficio)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDescargarOficio(oficio)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>

            {/* TAB: OFICIOS RECIBIDOS */}
            <TabsContent value="recibidos" className="space-y-3">
              {/* Info contextual */}
              <Card className="p-4 mb-4 bg-green-50 border-green-200">
                <h4 className="text-sm font-bold text-green-900 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Oficios Recibidos
                </h4>
                <p className="text-xs text-green-800 leading-relaxed">
                  Los <strong>oficios recibidos</strong> son comunicaciones que el juzgado u otras 
                  entidades envían a ESAP. Es crucial dar respuesta oportuna según los términos legales 
                  establecidos para evitar sanciones procesales.
                </p>
              </Card>

              {oficiosRecibidos.map((oficio) => (
                <Card key={oficio.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex-shrink-0">
                      <ArrowLeft className="w-6 h-6 text-green-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-black text-gray-900">{oficio.numero}</h4>
                            {getEstadoBadge(oficio.estado, oficio.estadoColor)}
                            {getPrioridadBadge(oficio.prioridad)}
                          </div>
                          <p className="font-bold text-sm text-gray-700 mb-1">{oficio.asunto}</p>
                          <Badge variant="outline" className="text-xs mb-2">
                            📨 {oficio.remitente}
                          </Badge>
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                        {oficio.contenido}
                      </p>

                      {oficio.requiereRespuesta && (
                        <div className={`p-2 rounded-lg mb-3 ${oficio.fechaRespuesta ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                          <p className={`text-xs font-bold flex items-center gap-1.5 ${oficio.fechaRespuesta ? 'text-green-900' : 'text-orange-900'}`}>
                            {oficio.fechaRespuesta ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {oficio.fechaRespuesta 
                              ? `Respuesta enviada el ${oficio.fechaRespuesta}`
                              : 'Requiere respuesta - PENDIENTE'}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📅 Fecha Recepción</p>
                          <p className="text-xs font-bold text-gray-900">{oficio.fecha}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">⚠️ Prioridad</p>
                          <p className="text-xs font-bold text-gray-900">{oficio.prioridad}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">📦 Tamaño</p>
                          <p className="text-xs font-bold text-gray-900">{oficio.tamaño}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-200">
                        <FileText className="w-4 h-4 text-red-600" />
                        <p className="text-xs font-bold text-gray-900 flex-1">{oficio.archivo}</p>
                        <Button size="sm" variant="ghost" onClick={() => handleVerOficio(oficio)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDescargarOficio(oficio)}>
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-3">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleNuevoOficio}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Redactar Oficio
              </Button>
              <Button style={{ background: '#003DA5', color: '#FFFFFF' }}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Descargar Todos
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}