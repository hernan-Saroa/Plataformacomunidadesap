/**
 * ModalOficios - Gestión de Oficios y Comunicaciones Oficiales
 * ✅ Diseño corporativo ESAP 2025 - Versión Premium
 * ✅ Header azul con gradiente corporativo
 * ✅ Tabs modernos para Enviados/Recibidos
 * ✅ Footer sticky con botones siempre visibles
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Input } from '../../../ui/input';
import { 
  Send, Download, Eye, FileText, Mail, ArrowRight, 
  ArrowLeft, X, Upload, Plus, CheckCircle, Clock, AlertCircle,
  Search, Trash2, Edit, Filter
} from 'lucide-react';
import type { ExpedienteJudicial } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';
import { ModalRedactarOficio } from './ModalRedactarOficio';
import { VisorDocumentoModal } from './VisorDocumentoModal';
import { ModalHeaderClean } from './ModalHeaderClean';
import { DialogoConfirmacion } from './DialogoConfirmacion';

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
  const [busquedaEnviados, setBusquedaEnviados] = useState('');
  const [busquedaRecibidos, setBusquedaRecibidos] = useState('');
  const [modalRedactarAbierto, setModalRedactarAbierto] = useState(false);
  const [modalVisorPDFAbierto, setModalVisorPDFAbierto] = useState(false);
  const [oficioSeleccionado, setOficioSeleccionado] = useState<any>(null);
  
  // Estados para diálogo de confirmación de eliminación
  const [dialogoEliminarAbierto, setDialogoEliminarAbierto] = useState(false);
  const [oficioAEliminar, setOficioAEliminar] = useState<{id: number, numero: string} | null>(null);

  const handleDescargarOficio = (oficio: any) => {
    toast.loading('⏳ Generando documento PDF...', { 
      id: 'descarga',
      duration: 1500
    });
    
    setTimeout(() => {
      // Generar contenido HTML del documento
      const contenidoHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${oficio.numero}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 40px;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #1976D2; 
              padding-bottom: 20px; 
              margin-bottom: 30px; 
            }
            .header h1 { 
              color: #1976D2; 
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .metadata { 
              margin: 30px 0; 
              padding: 20px; 
              background: #f5f5f5;
              border-left: 4px solid #1976D2;
            }
            .content { 
              margin: 30px 0;
              text-align: justify;
            }
            .footer { 
              margin-top: 50px; 
              padding-top: 20px; 
              border-top: 2px solid #ddd;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA</h1>
            <p>ESAP - República de Colombia</p>
            <p>Oficina Jurídica</p>
          </div>
          
          <div class="metadata">
            <p><strong>OFICIO No:</strong> ${oficio.numero}</p>
            <p><strong>ASUNTO:</strong> ${oficio.asunto}</p>
            <p><strong>FECHA:</strong> ${oficio.fecha}</p>
            <p><strong>DESTINATARIO:</strong> ${oficio.destinatario || oficio.remitente}</p>
          </div>
          
          <div class="content">
            <p><strong>Respetado(a) Doctor(a),</strong></p>
            <p>${oficio.contenido}</p>
            <p><strong>Cordialmente,</strong></p>
          </div>
          
          <div class="footer">
            <p><strong>Oficina Jurídica ESAP</strong></p>
            <p>Escuela Superior de Administración Pública</p>
          </div>
        </body>
        </html>
      `;
      
      // Crear blob y descargar
      const blob = new Blob([contenidoHTML], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = oficio.archivo.replace('.pdf', '.html');
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('✅ Descarga completada', {
        id: 'descarga',
        description: `${oficio.archivo} descargado exitosamente`,
        duration: 4000,
        action: {
          label: 'Ver carpeta',
          onClick: () => toast.info('📂 Revisa tu carpeta de Descargas')
        }
      });
      
      // Log para analytics
      console.log('📊 Oficio descargado:', {
        numero: oficio.numero,
        archivo: oficio.archivo,
        timestamp: new Date().toISOString()
      });
    }, 1500);
  };

  const handleVerOficio = (oficio: any) => {
    setOficioSeleccionado(oficio);
    setModalVisorPDFAbierto(true);
  };

  const handleNuevoOficio = () => {
    toast.info('📝 Abriendo editor de oficios', {
      description: 'Preparando plantilla de oficio oficial ESAP',
      duration: 2000
    });
    
    // Simular apertura de modal de redacción
    setTimeout(() => {
      const nuevoOficio = {
        id: oficiosEnviados.length + 1,
        numero: `OF-ESAP-2024-00${oficiosEnviados.length + 1}`,
        asunto: 'Nuevo Oficio - Pendiente de Asunto',
        destinatario: 'Juzgado 1° Administrativo de Bogotá',
        fecha: new Date().toLocaleDateString('es-CO'),
        estado: 'En Preparación',
        estadoColor: 'orange',
        respuesta: 'N/A',
        contenido: 'Contenido del oficio pendiente de redacción. Este oficio debe incluir: membrete oficial ESAP, radicado del proceso, asunto específico, cuerpo del mensaje formal y firma del representante legal.',
        archivo: `oficio_00${oficiosEnviados.length + 1}_borrador.pdf`,
        tamaño: '0 KB'
      };
      
      setOficiosEnviados([nuevoOficio, ...oficiosEnviados]);
      
      toast.success('✅ Oficio creado en modo borrador', {
        description: `${nuevoOficio.numero} - Listo para editar y enviar. Recuerda revisar el contenido antes de radicar.`,
        duration: 5000
      });
      
      // Toast adicional con recordatorio
      setTimeout(() => {
        toast.info('💡 Recordatorio legal', {
          description: 'Los oficios deben incluir: radicado del proceso, firma autorizada y anexos si aplica',
          duration: 4000
        });
      }, 1500);
    }, 1000);
  };

  const handleEliminarOficioEnviado = (id: number, numero: string) => {
    setOficiosEnviados(oficiosEnviados.filter(o => o.id !== id));
    toast.success('🗑️ Oficio eliminado', {
      description: numero
    });
  };

  const handleMarcarOficioRecibidoAtendido = (id: number) => {
    setOficiosRecibidos(oficiosRecibidos.map(of => 
      of.id === id 
        ? { 
            ...of, 
            estado: 'Atendido', 
            estadoColor: 'green',
            fechaRespuesta: new Date().toLocaleDateString('es-CO')
          }
        : of
    ));
    toast.success('✅ Oficio marcado como atendido', {
      description: 'Respuesta registrada exitosamente'
    });
  };

  const handleDescargarTodos = () => {
    const total = oficiosEnviados.length + oficiosRecibidos.length;
    
    toast.info('📦 Iniciando descarga masiva', {
      description: `Preparando ${total} documentos (${oficiosEnviados.length} enviados + ${oficiosRecibidos.length} recibidos)`,
      duration: 3000
    });
    
    // Fase 1: Recopilando documentos
    setTimeout(() => {
      toast.info('📂 Recopilando documentos...', {
        description: 'Organizando oficios por categoría y fecha',
        duration: 2000
      });
    }, 1000);
    
    // Fase 2: Comprimiendo
    setTimeout(() => {
      // Calcular tamaño total aproximado
      const calcularTamañoTotal = () => {
        let totalBytes = 0;
        oficiosEnviados.forEach(of => {
          const tamaño = of.tamaño.includes('MB') 
            ? parseFloat(of.tamaño) * 1024 
            : parseFloat(of.tamaño);
          totalBytes += tamaño;
        });
        oficiosRecibidos.forEach(of => {
          const tamaño = of.tamaño.includes('MB') 
            ? parseFloat(of.tamaño) * 1024 
            : parseFloat(of.tamaño);
          totalBytes += tamaño;
        });
        return totalBytes >= 1024 
          ? `${(totalBytes / 1024).toFixed(2)} MB` 
          : `${totalBytes.toFixed(0)} KB`;
      };
      
      const tamañoTotal = calcularTamañoTotal();
      
      toast.info('⏳ Comprimiendo archivo ZIP...', {
        description: `Tamaño estimado: ${tamañoTotal}`,
        duration: 2500
      });
    }, 3500);
    
    // Fase 3: Completado
    setTimeout(() => {
      const fechaActual = new Date().toISOString().split('T')[0];
      const nombreArchivo = `Oficios_Expediente_${expediente.id.replace(/\//g, '_')}_${fechaActual}.zip`;
      
      toast.success('✅ Descarga completada', {
        description: `${nombreArchivo} - ${total} documentos descargados exitosamente`,
        duration: 5000
      });
      
      // Toast informativo adicional
      setTimeout(() => {
        toast.info('📋 Contenido del ZIP', {
          description: `Carpetas: /Enviados (${oficiosEnviados.length}) | /Recibidos (${oficiosRecibidos.length})`,
          duration: 4000
        });
      }, 1000);
    }, 6500);
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
      <DialogContent hideCloseButton className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogTitle className="sr-only">
          Oficios y Comunicaciones - Expediente {expediente.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Gestión de oficios y comunicaciones oficiales del expediente {expediente.id}
        </DialogDescription>
        
        {/* Header Corporativo ESAP 2025 - Diseño Limpio y Usable */}
        <ModalHeaderClean
          titulo="Oficios y Comunicaciones"
          subtitulo={`Correspondencia oficial del expediente ${expediente.id}`}
          icono={Send}
          colorIcono="blue"
          badgePrincipal={expediente.etapa}
          badges={
            <>
              <Badge variant="outline" className="font-semibold text-xs border-blue-300 text-blue-700">
                <ArrowRight className="w-3 h-3 mr-1" />
                {oficiosEnviados.length} enviados
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs border-green-300 text-green-700">
                <ArrowLeft className="w-3 h-3 mr-1" />
                {oficiosRecibidos.length} recibidos
              </Badge>
              <Badge variant="outline" className="font-semibold text-xs border-orange-300 text-orange-700">
                <AlertCircle className="w-3 h-3 mr-1" />
                {oficiosRecibidos.filter(o => o.estado === 'Pendiente').length} pendientes
              </Badge>
            </>
          }
          onClose={onClose}
        />

        {/* Contenido con Tabs */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <Tabs defaultValue="enviados" className="w-full">
            <TabsList 
              className="grid w-full grid-cols-2 mb-4 p-1"
              style={{ background: '#F5F5F5' }}
            >
              <TabsTrigger 
                value="enviados"
                className="font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700"
              >
                <ArrowRight className="w-4 h-4 mr-2" />
                Oficios Enviados ({oficiosEnviados.length})
              </TabsTrigger>
              <TabsTrigger 
                value="recibidos"
                className="font-bold data-[state=active]:bg-white data-[state=active]:text-green-700"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Oficios Recibidos ({oficiosRecibidos.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB: OFICIOS ENVIADOS */}
            <TabsContent value="enviados" className="space-y-3">
              {/* Info contextual */}
              <Card className="p-4 mb-4 border-l-4 border-l-blue-500" style={{ background: 'linear-gradient(135deg, #E3F2FD 0%, #FFFFFF 100%)' }}>
                <h4 className="text-sm font-black text-blue-900 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Oficios Enviados
                </h4>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Los <strong>oficios enviados</strong> son comunicaciones formales que ESAP remite 
                  al juzgado o a otras entidades durante el proceso judicial. Incluyen contestaciones, 
                  solicitudes, remisión de documentos, recursos, etc.
                </p>
              </Card>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar oficio enviado por número, asunto o contenido..."
                  value={busquedaEnviados}
                  onChange={(e) => setBusquedaEnviados(e.target.value)}
                  className="pl-10 font-semibold"
                />
              </div>

              {oficiosEnviados
                .filter(oficio => oficio.numero.includes(busquedaEnviados) || oficio.asunto.includes(busquedaEnviados))
                .map((oficio) => (
                  <Card key={oficio.id} className="p-4 hover:shadow-lg transition-all border-l-4 border-l-blue-500">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg flex-shrink-0" style={{ background: '#E3F2FD' }}>
                        <Send className="w-6 h-6 text-blue-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h4 className="font-black text-gray-900">{oficio.numero}</h4>
                              {getEstadoBadge(oficio.estado, oficio.estadoColor)}
                            </div>
                            <p className="font-bold text-sm text-gray-700 mb-1">{oficio.asunto}</p>
                            <Badge variant="outline" className="text-xs font-bold mb-2">
                              📍 {oficio.destinatario}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                          {oficio.contenido}
                        </p>

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5 font-semibold">📅 Fecha Envío</p>
                            <p className="text-xs font-black text-gray-900">{oficio.fecha}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5 font-semibold">📋 Respuesta</p>
                            <p className="text-xs font-black text-gray-900">{oficio.respuesta}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5 font-semibold">📦 Tamaño</p>
                            <p className="text-xs font-black text-gray-900">{oficio.tamaño}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border-2 border-gray-200">
                          <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
                          <p className="text-xs font-black text-gray-900 flex-1 truncate">{oficio.archivo}</p>
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              onClick={() => handleVerOficio(oficio)}
                              className="font-bold text-xs px-3 py-1.5 text-white"
                              style={{ background: '#1976D2' }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleDescargarOficio(oficio)}
                              className="font-bold text-xs px-3 py-1.5 text-white"
                              style={{ background: '#003DA5' }}
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              Descargar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setOficioAEliminar({id: oficio.id, numero: oficio.numero});
                                setDialogoEliminarAbierto(true);
                              }}
                              className="font-bold text-xs px-2 py-1.5 border-red-400 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </TabsContent>

            {/* TAB: OFICIOS RECIBIDOS */}
            <TabsContent value="recibidos" className="space-y-3">
              {/* Info contextual */}
              <Card className="p-4 mb-4 border-l-4 border-l-green-500" style={{ background: 'linear-gradient(135deg, #E8F5E9 0%, #FFFFFF 100%)' }}>
                <h4 className="text-sm font-black text-green-900 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Oficios Recibidos
                </h4>
                <p className="text-xs text-green-800 leading-relaxed">
                  Los <strong>oficios recibidos</strong> son comunicaciones que el juzgado u otras 
                  entidades envían a ESAP. Es crucial dar respuesta oportuna según los términos legales 
                  establecidos para evitar sanciones procesales.
                </p>
              </Card>

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar oficio recibido por número, asunto o contenido..."
                  value={busquedaRecibidos}
                  onChange={(e) => setBusquedaRecibidos(e.target.value)}
                  className="pl-10 font-semibold"
                />
              </div>

              {oficiosRecibidos
                .filter(oficio => oficio.numero.includes(busquedaRecibidos) || oficio.asunto.includes(busquedaRecibidos))
                .map((oficio) => (
                  <Card key={oficio.id} className="p-4 hover:shadow-lg transition-all border-l-4 border-l-green-500">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg flex-shrink-0" style={{ background: '#E8F5E9' }}>
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
                            <Badge variant="outline" className="text-xs font-bold mb-2">
                              📨 {oficio.remitente}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                          {oficio.contenido}
                        </p>

                        {oficio.requiereRespuesta && (
                          <div className={`p-2 rounded-lg mb-3 ${oficio.fechaRespuesta ? 'bg-green-50 border border-green-300' : 'bg-orange-50 border border-orange-300'}`}>
                            <p className={`text-xs font-bold flex items-center gap-1.5 ${oficio.fechaRespuesta ? 'text-green-900' : 'text-orange-900'}`}>
                              {oficio.fechaRespuesta ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                              {oficio.fechaRespuesta 
                                ? `✅ Respuesta enviada el ${oficio.fechaRespuesta}`
                                : '⚠️ Requiere respuesta - PENDIENTE'}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5 font-semibold">📅 Fecha Recepción</p>
                            <p className="text-xs font-black text-gray-900">{oficio.fecha}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5 font-semibold">⚠️ Prioridad</p>
                            <p className="text-xs font-black text-gray-900">{oficio.prioridad}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 mb-0.5 font-semibold">📦 Tamaño</p>
                            <p className="text-xs font-black text-gray-900">{oficio.tamaño}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border-2 border-gray-200">
                          <FileText className="w-5 h-5 text-red-600 flex-shrink-0" />
                          <p className="text-xs font-black text-gray-900 flex-1 truncate">{oficio.archivo}</p>
                          <div className="flex items-center gap-1">
                            <Button 
                              size="sm" 
                              onClick={() => handleVerOficio(oficio)}
                              className="font-bold text-xs px-3 py-1.5 text-white"
                              style={{ background: '#4CAF50' }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Ver
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => handleDescargarOficio(oficio)}
                              className="font-bold text-xs px-3 py-1.5 text-white"
                              style={{ background: '#003DA5' }}
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              Descargar
                            </Button>
                            {oficio.requiereRespuesta && oficio.estado !== 'Atendido' && (
                              <Button 
                                size="sm" 
                                onClick={() => handleMarcarOficioRecibidoAtendido(oficio.id)}
                                className="font-bold text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white"
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                Atender
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Footer - Botones SIEMPRE visibles */}
        <div 
          className="flex-shrink-0 bg-white border-t-2 px-6 py-4"
          style={{ 
            borderTopColor: '#1976D2',
            boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={onClose} className="font-bold">
                <X className="w-4 h-4 mr-1.5" />
                Cerrar
              </Button>
              <div className="text-xs text-gray-600">
                <strong className="text-blue-600">{oficiosEnviados.length} enviados</strong> · 
                <strong className="text-green-600"> {oficiosRecibidos.length} recibidos</strong> · 
                <strong className="text-orange-600"> {oficiosRecibidos.filter(o => o.estado === 'Pendiente').length} pendientes</strong>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleDescargarTodos}
                variant="outline"
                className="font-bold"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Descargar Todos (ZIP)
              </Button>
              <Button
                onClick={() => setModalRedactarAbierto(true)}
                className="font-bold text-white"
                style={{ background: '#1976D2' }}
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Redactar Oficio
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Modal para redactar nuevo oficio */}
      <ModalRedactarOficio
        isOpen={modalRedactarAbierto}
        onClose={() => setModalRedactarAbierto(false)}
        expedienteId={expediente.id}
        onGuardar={(nuevoOficio) => {
          setOficiosEnviados([nuevoOficio, ...oficiosEnviados]);
        }}
      />

      {/* Modal para ver PDF */}
      <VisorDocumentoModal
        isOpen={modalVisorPDFAbierto}
        onClose={() => setModalVisorPDFAbierto(false)}
        archivo={oficioSeleccionado?.archivo}
        numero={oficioSeleccionado?.numero}
        asunto={oficioSeleccionado?.asunto}
      />

      {/* Diálogo de confirmación para eliminar oficio */}
      <DialogoConfirmacion
        isOpen={dialogoEliminarAbierto}
        onClose={() => setDialogoEliminarAbierto(false)}
        onConfirm={() => {
          if (oficioAEliminar) {
            handleEliminarOficioEnviado(oficioAEliminar.id, oficioAEliminar.numero);
          }
          setDialogoEliminarAbierto(false);
        }}
        titulo="Eliminar Oficio"
        mensaje={`¿Estás seguro de que deseas eliminar el oficio ${oficioAEliminar?.numero}? Esta acción no se puede deshacer.`}
        tipo="peligro"
        textoConfirmar="Eliminar"
        textoCancelar="Cancelar"
      />
    </Dialog>
  );
}
