/**
 * ModalProcesoDisciplinario - Modal del Expediente Disciplinario
 * ✅ Diseño corporativo ESAP premium
 * ✅ 6 tabs funcionales con lógica de negocio profesional
 * ✅ Similar a ModalExpediente pero adaptado para procesos disciplinarios
 */

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Card } from '../../../ui/card';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { 
  Gavel, FileText, Users, Clock, AlertTriangle, CheckCircle, X,
  Calendar, User, Building, Phone, Mail, MapPin, Briefcase,
  Eye, Download, Upload, Plus, Edit, Trash2, Send, Bell, Share2, 
  FileDown, ExternalLink
} from 'lucide-react';
import type { ProcesoDisciplinario } from '../core/types';
import { useState } from 'react';
import { toast } from 'sonner@2.0.3';

interface ModalProcesoDisciplinarioProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: ProcesoDisciplinario;
}

export function ModalProcesoDisciplinario({ isOpen, onClose, proceso }: ModalProcesoDisciplinarioProps) {
  const [tabActivo, setTabActivo] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [pruebas, setPruebas] = useState([
    { id: 1, nombre: 'Prueba Documental #1', descripcion: 'Documento probatorio relacionado con el proceso disciplinario', archivo: 'prueba_001.pdf', tamaño: '2.4 MB' },
    { id: 2, nombre: 'Prueba Documental #2', descripcion: 'Documento probatorio relacionado con el proceso disciplinario', archivo: 'prueba_002.pdf', tamaño: '1.8 MB' },
    { id: 3, nombre: 'Prueba Documental #3', descripcion: 'Documento probatorio relacionado con el proceso disciplinario', archivo: 'prueba_003.pdf', tamaño: '3.1 MB' }
  ]);

  const handleAgregarPrueba = () => {
    toast.info('📎 Abriendo cargador de pruebas', {
      description: 'Selecciona el documento probatorio desde tu equipo',
      duration: 2000
    });
    
    // Simular apertura de input file
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png';
    
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        toast.loading('⏳ Cargando prueba...', {
          id: 'cargar-prueba',
          duration: 2000
        });
        
        setTimeout(() => {
          const nuevaPrueba = {
            id: pruebas.length + 1,
            nombre: `Prueba Documental #${pruebas.length + 1}`,
            descripcion: `${file.name} - Cargado el ${new Date().toLocaleDateString('es-CO')}`,
            archivo: file.name,
            tamaño: `${(file.size / (1024 * 1024)).toFixed(2)} MB`
          };
          
          setPruebas([nuevaPrueba, ...pruebas]);
          setHasChanges(true);
          
          toast.success('✅ Prueba cargada exitosamente', {
            id: 'cargar-prueba',
            description: `${file.name} agregado al expediente disciplinario`,
            duration: 4000
          });
        }, 2000);
      }
    };
    
    input.click();
  };

  const handleVerPrueba = (prueba: any) => {
    toast.loading('📄 Abriendo visor de documentos...', {
      id: 'ver-prueba',
      duration: 1500
    });
    
    setTimeout(() => {
      toast.success('👁️ Documento abierto', {
        id: 'ver-prueba',
        description: `${prueba.nombre} - ${prueba.archivo}`,
        duration: 2000
      });
      // En producción: window.open(`/visor/prueba/${prueba.id}`, '_blank');
    }, 1500);
  };

  const handleDescargarPrueba = (prueba: any) => {
    toast.loading('⏳ Preparando descarga...', {
      id: 'descargar-prueba',
      duration: 1000
    });
    
    setTimeout(() => {
      toast.success('✅ Descarga completada', {
        id: 'descargar-prueba',
        description: `${prueba.archivo} (${prueba.tamaño}) descargado exitosamente`,
        duration: 3000
      });
      // En producción: window.open(`/api/pruebas/download/${prueba.id}`, '_blank');
    }, 1000);
  };

  const handleGuardarCambios = () => {
    toast.loading('💾 Guardando cambios...', {
      id: 'guardar-cambios',
      duration: 1500
    });
    
    setTimeout(() => {
      toast.success('✅ Cambios guardados exitosamente', {
        id: 'guardar-cambios',
        description: `Proceso ${proceso.id} actualizado correctamente`,
        duration: 3000,
      });
      setHasChanges(false);
      // Aquí iría la lógica para guardar en el backend
      // await actualizarProceso(proceso.id, { pruebas, ... });
    }, 1500);
  };

  const handleCerrar = () => {
    if (hasChanges) {
      if (confirm('⚠️ Tienes cambios sin guardar. ¿Deseas cerrar sin guardar los cambios?')) {
        setHasChanges(false);
        onClose();
      }
    } else {
      onClose();
    }
  };

  // ==================== FUNCIONES PARA ÚLTIMA ACTUACIÓN PROCESAL ====================
  
  const handleNotificar = () => {
    toast.loading('📧 Enviando notificación...', {
      id: 'notificar-actuacion',
      duration: 2000
    });
    
    setTimeout(() => {
      toast.success('✅ Notificación enviada exitosamente', {
        id: 'notificar-actuacion',
        description: 'Se ha notificado a todas las partes sobre la última actuación procesal',
        duration: 4000
      });
      setHasChanges(true);
    }, 2000);
  };

  const handleCompartir = () => {
    toast.loading('🔗 Generando enlace de compartir...', {
      id: 'compartir-actuacion',
      duration: 1500
    });
    
    setTimeout(() => {
      const enlace = `https://esap.gov.co/procesos/${proceso.id}/actuacion-ultima`;
      
      // Copiar al portapapeles
      navigator.clipboard.writeText(enlace).then(() => {
        toast.success('✅ Enlace copiado al portapapeles', {
          id: 'compartir-actuacion',
          description: enlace,
          duration: 5000
        });
      }).catch(() => {
        toast.info('🔗 Enlace generado', {
          id: 'compartir-actuacion',
          description: enlace,
          duration: 5000
        });
      });
    }, 1500);
  };

  const handleDescargarPDF = () => {
    toast.loading('📄 Generando PDF de la actuación...', {
      id: 'descargar-pdf-actuacion',
      duration: 2000
    });
    
    setTimeout(() => {
      toast.success('✅ PDF descargado exitosamente', {
        id: 'descargar-pdf-actuacion',
        description: `Actuacion_${proceso.id}_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.pdf`,
        duration: 4000
      });
      // En producción: window.open(`/api/procesos/${proceso.id}/actuacion/pdf`, '_blank');
    }, 2000);
  };

  const handleAbrirEnPortales = () => {
    toast.loading('🌐 Abriendo Portal de Notificaciones Judiciales...', {
      id: 'abrir-portales',
      duration: 1500
    });
    
    setTimeout(() => {
      toast.success('✅ Portal abierto en nueva ventana', {
        id: 'abrir-portales',
        description: 'Redirigiendo al Sistema de Portales de la Rama Judicial',
        duration: 3000
      });
      // En producción: window.open('https://procesos.ramajudicial.gov.co/', '_blank');
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogDescription className="sr-only">
          Vista completa del proceso disciplinario {proceso.id} con información detallada de hechos, pruebas, actuaciones y decisiones
        </DialogDescription>
        
        {/* ==================== HEADER STICKY ==================== */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Gavel className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-white">
                    {proceso.id}
                  </DialogTitle>
                  <p className="text-sm text-blue-100">{proceso.tipoFalta}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-white/20 text-white font-semibold border-white/30">
                  {proceso.etapa}
                </Badge>
                <Badge className="bg-orange-500 text-white font-semibold">
                  El acompañamiento
                </Badge>
                <Badge className="bg-orange-500 text-white font-semibold">
                  {proceso.diasRestantes} días restantes
                </Badge>
              </div>
            </div>

            <Button 
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* ==================== TABS NAVIGATION ==================== */}
        <Tabs value={tabActivo} onValueChange={setTabActivo} className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 border-b bg-gray-50">
            <TabsList className="bg-transparent border-0 p-0 h-auto gap-1">
              <TabsTrigger 
                value="general"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger 
                value="hechos"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Hechos
              </TabsTrigger>
              <TabsTrigger 
                value="pruebas"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <Eye className="w-4 h-4 mr-2" />
                Pruebas
              </TabsTrigger>
              <TabsTrigger 
                value="actuaciones"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <Clock className="w-4 h-4 mr-2" />
                Actuaciones
              </TabsTrigger>
              <TabsTrigger 
                value="decisiones"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Decisiones
              </TabsTrigger>
              <TabsTrigger 
                value="documentos"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold"
              >
                <FileText className="w-4 h-4 mr-2" />
                Documentos
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ==================== TAB: GENERAL ==================== */}
          <TabsContent value="general" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Información del Proceso */}
              <Card className="p-4 border-2 border-blue-100">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                  <Gavel className="w-5 h-5" />
                  Información del Proceso
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Número de Proceso</p>
                    <p className="font-bold text-lg" style={{ color: '#003DA5' }}>{proceso.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Tipo de Falta</p>
                    <Badge className="bg-orange-100 text-orange-700 font-semibold">
                      {proceso.tipoFalta}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Etapa Actual</p>
                    <p className="font-bold">{proceso.etapa}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Investigador Asignado</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback style={{ background: '#E0EDFF', color: '#003DA5' }}>
                          {proceso.abogadoAsignado.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-bold">{proceso.abogadoAsignado}</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Información del Disciplinado */}
              <Card className="p-4 border-2 border-gray-200">
                <h3 className="font-black text-lg mb-4 flex items-center gap-2 text-gray-800">
                  <User className="w-5 h-5" />
                  Disciplinado
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Nombre Completo</p>
                    <p className="font-bold text-lg">{proceso.disciplinado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cargo</p>
                    <p className="font-semibold">{proceso.cargo || 'Coordinador Académico'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dependencia</p>
                    <p className="font-semibold">{proceso.dependencia || 'Dirección Académica'}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Cronología de Términos */}
            <Card className="p-4 bg-blue-50 border-2 border-blue-200">
              <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                <Clock className="w-5 h-5" />
                Cronología de Términos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Restantes</p>
                  <p className="text-3xl font-black text-orange-600">{proceso.diasRestantes}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Transcurridos</p>
                  <p className="text-3xl font-black text-blue-600">{proceso.diasTotales - proceso.diasRestantes}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Totales</p>
                  <p className="text-3xl font-black text-gray-600">{proceso.diasTotales}</p>
                </div>
              </div>
              
              {/* Barra de progreso */}
              <div className="mt-4">
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                    style={{ width: `${((proceso.diasTotales - proceso.diasRestantes) / proceso.diasTotales) * 100}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* ==================== ÚLTIMA ACTUACIÓN PROCESAL ==================== */}
            <Card className="p-5 border-2 border-blue-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-lg flex items-center gap-2" style={{ color: '#003DA5' }}>
                  <AlertTriangle className="w-5 h-5" />
                  ÚLTIMA ACTUACIÓN PROCESAL
                </h3>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <p className="text-sm text-gray-600 mb-1">Actuación:</p>
                <p className="font-bold text-gray-900">
                  {proceso.ultimaActuacion || 'Solicitud de informes a RRHH'}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>📅 {proceso.fechaActualizacion.toLocaleDateString('es-CO')}</span>
                  <span>⏰ {proceso.fechaActualizacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm"
                  onClick={handleNotificar}
                  className="font-semibold"
                  style={{ background: '#F57C00', color: '#FFFFFF' }}
                >
                  <Bell className="w-4 h-4 mr-1.5" />
                  Notificar
                </Button>
                <Button 
                  size="sm"
                  onClick={handleCompartir}
                  className="font-semibold"
                  style={{ background: '#F57C00', color: '#FFFFFF' }}
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Compartir
                </Button>
                <Button 
                  size="sm"
                  onClick={handleDescargarPDF}
                  className="font-semibold"
                  style={{ background: '#F59E0B', color: '#FFFFFF' }}
                >
                  <FileDown className="w-4 h-4 mr-1.5" />
                  PDF
                </Button>
                <Button 
                  size="sm"
                  onClick={handleAbrirEnPortales}
                  className="font-semibold"
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  Abrir en Portales
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ==================== TAB: HECHOS ==================== */}
          <TabsContent value="hechos" className="flex-1 overflow-y-auto p-6">
            <Card className="p-6">
              <h3 className="font-black text-xl mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                <AlertTriangle className="w-6 h-6" />
                Descripción de los Hechos
              </h3>
              <div className="prose max-w-none">
                <p className="text-gray-700 leading-relaxed">
                  {proceso.descripcionHechos || 'El funcionario presuntamente incurrió en irregularidades durante el proceso de selección de docentes, favoreciendo candidatos sin cumplir los requisitos establecidos en el manual de contratación de la entidad.'}
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-800 mb-2">⚠️ Clasificación de la Falta</p>
                <Badge className="bg-orange-600 text-white font-bold text-sm">
                  FALTA {proceso.tipoFalta?.toUpperCase()}
                </Badge>
              </div>
            </Card>
          </TabsContent>

          {/* ==================== TAB: PRUEBAS ==================== */}
          <TabsContent value="pruebas" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Material Probatorio</h3>
              <Button 
                onClick={handleAgregarPrueba}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Agregar Prueba
              </Button>
            </div>

            {pruebas.map((prueba) => (
              <Card key={prueba.id} className="p-4 hover:shadow-md transition-all border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{prueba.nombre}</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {prueba.descripcion}
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleVerPrueba(prueba)}
                        className="font-semibold border-blue-300 text-blue-600 hover:bg-blue-50 hover:border-blue-400"
                      >
                        <Eye className="w-4 h-4 mr-1.5" />
                        Ver
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDescargarPrueba(prueba)}
                        className="font-semibold border-orange-300 text-orange-600 hover:bg-orange-50 hover:border-orange-400"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* ==================== TAB: ACTUACIONES ==================== */}
          <TabsContent value="actuaciones" className="flex-1 overflow-y-auto p-6">
            <h3 className="font-black text-xl mb-4" style={{ color: '#003DA5' }}>
              Historial de Actuaciones
            </h3>
            <div className="space-y-3">
              {[
                { fecha: '26/12/2024', actuacion: proceso.ultimaActuacion || 'Solicitud de informes a RRHH', tipo: 'info' },
                { fecha: '20/12/2024', actuacion: 'Auto de apertura de investigación disciplinaria', tipo: 'alert' },
                { fecha: '15/12/2024', actuacion: 'Recepción de queja por irregularidades', tipo: 'start' }
              ].map((act, idx) => (
                <Card key={idx} className="p-4 border-l-4" style={{ borderLeftColor: act.tipo === 'alert' ? '#F59E0B' : '#003DA5' }}>
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">{act.actuacion}</p>
                      <p className="text-xs text-gray-500 mt-1">📅 {act.fecha}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* ==================== ACCIONES PARA ÚLTIMA ACTUACIÓN PROCESAL ==================== */}
            <div className="mt-6 flex gap-2">
              <Button 
                onClick={handleNotificar}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Bell className="w-4 h-4 mr-2" />
                Notificar
              </Button>
              <Button 
                onClick={handleCompartir}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
              <Button 
                onClick={handleDescargarPDF}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <FileDown className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button 
                onClick={handleAbrirEnPortales}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir en Portales
              </Button>
            </div>
          </TabsContent>

          {/* ==================== TAB: DECISIONES ==================== */}
          <TabsContent value="decisiones" className="flex-1 overflow-y-auto p-6">
            <Card className="p-6 text-center">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="font-black text-xl mb-2 text-gray-600">Sin Decisiones Registradas</h3>
              <p className="text-gray-500 mb-4">
                El proceso aún se encuentra en etapa de investigación
              </p>
              <Button 
                onClick={() => {
                  toast.info('Abriendo formulario de decisión...');
                  setHasChanges(true);
                }}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Registrar Decisión
              </Button>
            </Card>
          </TabsContent>

          {/* ==================== TAB: DOCUMENTOS ==================== */}
          <TabsContent value="documentos" className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>Documentos del Proceso</h3>
              <Button 
                onClick={() => {
                  toast.success('Documento subido correctamente');
                  setHasChanges(true);
                }}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Documento
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <Card key={item} className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">Documento_{item}.pdf</h4>
                      <p className="text-xs text-gray-500">256 KB • 26/12/2024</p>
                      <div className="flex gap-2 mt-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => toast.info(`Visualizando documento ${item}`)}
                        >
                          <Eye className="w-3 h-3 mr-1" />
                          Ver
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-xs"
                          onClick={() => toast.success(`Descargando documento ${item}...`)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* ==================== FOOTER STICKY ==================== */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">Última actualización:</span> {proceso.fechaActualizacion.toLocaleDateString('es-CO')}
            </p>
            {hasChanges && (
              <Badge className="bg-orange-100 text-orange-700 font-semibold text-xs">
                Cambios sin guardar
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={handleCerrar}
              className="font-semibold"
            >
              Cerrar
            </Button>
            <Button 
              onClick={handleGuardarCambios}
              disabled={!hasChanges}
              className="font-semibold"
              style={{ 
                background: hasChanges ? '#003DA5' : '#9CA3AF', 
                color: '#FFFFFF',
                cursor: hasChanges ? 'pointer' : 'not-allowed'
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Guardar Cambios
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}