/**
 * ModalProcesoDisciplinario - Modal del Expediente Disciplinario
 * ✅ Diseño corporativo ESAP 2025 - Versión Premium
 * ✅ 6 tabs funcionales con lógica de negocio profesional
 * ✅ Similar a ModalExpediente pero adaptado para procesos disciplinarios
 * ✅ Header limpio profesional ESAP 2025
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
import { 
  Gavel, User, Clock, FileText, AlertTriangle, Eye, Download, Plus, Upload,
  CheckCircle, X, Calendar, Bell, Share2, ExternalLink, FileDown
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import type { ExpedienteJudicial } from '../core/types';
import { ModalHeaderClean } from './ModalHeaderClean';
import { FormularioRegistrarDecision } from './FormularioRegistrarDecision';

// Tipo para Proceso Disciplinario
interface ProcesoDisciplinario {
  id: string;
  tipoFalta: string;
  etapa: string;
  abogadoAsignado: string;
  disciplinado: string;
  cargo?: string;
  dependencia?: string;
  diasRestantes: number;
  diasTotales: number;
  ultimaActuacion?: string;
  fechaActualizacion: Date;
  descripcionHechos?: string;
}

interface ModalProcesoDisciplinarioProps {
  isOpen: boolean;
  onClose: () => void;
  proceso: ProcesoDisciplinario;
}

export function ModalProcesoDisciplinario({ isOpen, onClose, proceso }: ModalProcesoDisciplinarioProps) {
  const [tabActivo, setTabActivo] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [mostrarModalNotificar, setMostrarModalNotificar] = useState(false);
  const [mostrarModalCompartir, setMostrarModalCompartir] = useState(false);
  const [mostrarModalPortales, setMostrarModalPortales] = useState(false);
  const [enlaceCompartir, setEnlaceCompartir] = useState('');
  const [mostrarFormularioDecision, setMostrarFormularioDecision] = useState(false);
  const [decisiones, setDecisiones] = useState<any[]>([]);
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
    setMostrarModalNotificar(true);
  };

  const confirmarNotificacion = () => {
    const destinatarios = [
      { nombre: proceso.disciplinado, correo: 'juan.perez@esap.gov.co', rol: 'Disciplinado' },
      { nombre: proceso.abogadoAsignado, correo: 'carlos.mendoza@esap.gov.co', rol: 'Investigador' },
      { nombre: 'Oficina Jurídica ESAP', correo: 'juridica@esap.gov.co', rol: 'Oficina Jurídica' }
    ];

    toast.loading('📧 Enviando notificaciones por correo electrónico...', {
      id: 'notificar-actuacion',
      duration: 2000
    });
    
    setTimeout(() => {
      toast.success(`✅ Notificaciones enviadas exitosamente a ${destinatarios.length} destinatarios`, {
        id: 'notificar-actuacion',
        description: `${destinatarios.map(d => d.correo).join(', ')}`,
        duration: 5000
      });
      setHasChanges(true);
      setMostrarModalNotificar(false);
    }, 2000);
  };

  const handleCompartir = () => {
    toast.loading('🔗 Generando enlace seguro de compartir...', {
      id: 'compartir-actuacion',
      duration: 1500
    });
    
    setTimeout(() => {
      const enlace = `https://esap.gov.co/procesos/${proceso.id}/actuacion-ultima`;
      setEnlaceCompartir(enlace);
      
      // Copiar al portapapeles
      navigator.clipboard.writeText(enlace).then(() => {
        // Mostrar modal con el enlace
        setMostrarModalCompartir(true);
        
        toast.success('✅ Enlace generado y copiado al portapapeles', {
          id: 'compartir-actuacion',
          description: 'Puedes pegar el enlace donde desees compartirlo',
          duration: 4000
        });
      }).catch(() => {
        setMostrarModalCompartir(true);
        toast.info('🔗 Enlace generado', {
          id: 'compartir-actuacion',
          description: 'Copia el enlace desde el modal',
          duration: 3000
        });
      });
    }, 1500);
  };

  const handleDescargarPDF = () => {
    const nombreArchivo = `Actuacion_${proceso.id}_${new Date().toLocaleDateString('es-CO').replace(/\//g, '-')}.pdf`;
    
    toast.loading('📄 Generando documento PDF...', {
      id: 'descargar-pdf-actuacion',
      duration: 2000
    });
    
    setTimeout(() => {
      toast.success('✅ Documento PDF generado y descargado', {
        id: 'descargar-pdf-actuacion',
        description: `${nombreArchivo} (245 KB)`,
        duration: 4000,
        action: {
          label: 'Ver carpeta',
          onClick: () => toast.info('Abriendo carpeta de descargas...')
        }
      });
      
      // En producción esto descargará el archivo real:
      // window.open(`/api/procesos/${proceso.id}/actuacion/pdf`, '_blank');
      // O usar: downloadFile(`/api/procesos/${proceso.id}/actuacion/pdf`, nombreArchivo);
      
      console.log(`📥 Descargando: ${nombreArchivo}`);
    }, 2000);
  };

  const handleAbrirEnPortales = () => {
    setMostrarModalPortales(true);
  };

  const confirmarAbrirPortales = () => {
    const urlPortal = 'https://consultaprocesos.ramajudicial.gov.co/';
    
    toast.loading('🌐 Abriendo Portal de Notificaciones Judiciales...', {
      id: 'abrir-portales',
      duration: 1500
    });
    
    setTimeout(() => {
      // Abrir en nueva ventana
      window.open(urlPortal, '_blank', 'noopener,noreferrer');
      
      toast.success('✅ Portal abierto en nueva ventana', {
        id: 'abrir-portales',
        description: 'Sistema de Portales de la Rama Judicial',
        duration: 3000
      });
      
      setMostrarModalPortales(false);
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCerrar}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col p-0">
        <DialogTitle className="sr-only">
          Proceso Disciplinario {proceso.id}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Vista completa del proceso disciplinario {proceso.id} con información detallada de hechos, pruebas, actuaciones y decisiones
        </DialogDescription>
        
        {/* ==================== HEADER LIMPIO ESAP 2025 ==================== */}
        <ModalHeaderClean
          icono={Gavel}
          titulo={proceso.id}
          subtitulo={proceso.tipoFalta}
          badges={[
            { texto: proceso.etapa, color: 'azul' },
            { texto: `${proceso.diasRestantes} días restantes`, color: 'naranja' }
          ]}
          onClose={onClose}
        />

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
            <Card className="p-6 border-2 border-blue-200 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-xl flex items-center gap-2" style={{ color: '#003DA5' }}>
                  <AlertTriangle className="w-6 h-6" />
                  ÚLTIMA ACTUACIÓN PROCESAL
                </h3>
              </div>

              <div className="p-5 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl mb-5 border border-blue-200">
                <p className="text-sm font-semibold text-gray-600 mb-2">Actuación:</p>
                <p className="font-black text-lg text-gray-900">
                  {proceso.ultimaActuacion || 'Solicitud de informes a RRHH'}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs font-semibold text-gray-500">
                  <span>📅 {proceso.fechaActualizacion.toLocaleDateString('es-CO')}</span>
                  <span>⏰ {proceso.fechaActualizacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={handleNotificar}
                  size="sm"
                  className="font-semibold"
                  style={{ background: '#F57C00', color: '#FFFFFF' }}
                >
                  <Bell className="w-4 h-4 mr-1.5" />
                  Notificar
                </Button>
                <Button 
                  onClick={handleCompartir}
                  size="sm"
                  className="font-semibold"
                  style={{ background: '#F57C00', color: '#FFFFFF' }}
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  Compartir
                </Button>
                <Button 
                  onClick={handleDescargarPDF}
                  size="sm"
                  className="font-semibold"
                  style={{ background: '#F57C00', color: '#FFFFFF' }}
                >
                  <FileText className="w-4 h-4 mr-1.5" />
                  PDF
                </Button>
                <Button 
                  onClick={handleAbrirEnPortales}
                  size="sm"
                  className="font-semibold"
                  style={{ background: '#1e5da8', color: '#FFFFFF' }}
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
            {decisiones.length === 0 ? (
              <Card className="p-6 text-center">
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="font-black text-xl mb-2 text-gray-600">Sin Decisiones Registradas</h3>
                <p className="text-gray-500 mb-4">
                  El proceso aún se encuentra en etapa de investigación
                </p>
                <Button 
                  onClick={() => {
                    setMostrarFormularioDecision(true);
                    setHasChanges(true);
                  }}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Decisión
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-black text-xl" style={{ color: '#003DA5' }}>
                    Decisiones Registradas ({decisiones.length})
                  </h3>
                  <Button 
                    onClick={() => {
                      setMostrarFormularioDecision(true);
                      setHasChanges(true);
                    }}
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Decisión
                  </Button>
                </div>

                {decisiones.map((decision, index) => (
                  <Card key={index} className="p-6 border-2 border-blue-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-black text-xl" style={{ color: '#003DA5' }}>
                            {decision.tipoDecision}
                          </h4>
                          <Badge 
                            className="font-bold"
                            style={{ 
                              background: decision.tipoFallo === 'Absolutoria' ? '#10B981' : '#EF4444',
                              color: '#FFFFFF'
                            }}
                          >
                            {decision.tipoFallo}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Decisión #{index + 1} • {decision.fecha}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {decision.sancion && (
                        <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                          <p className="text-sm font-bold text-orange-900 mb-1">⚖️ Sanción Impuesta</p>
                          <p className="font-bold text-orange-800">{decision.sancion}</p>
                        </div>
                      )}

                      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                        <p className="text-sm font-bold text-blue-900 mb-2">📋 Consideraciones</p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {decision.consideraciones}
                        </p>
                      </div>

                      {decision.fundamentosJuridicos && (
                        <div className="p-4 bg-gray-50 border-2 border-gray-200 rounded-lg">
                          <p className="text-sm font-bold text-gray-900 mb-2">⚖️ Fundamentos Jurídicos</p>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {decision.fundamentosJuridicos}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Responsable</p>
                          <p className="font-bold text-sm">{decision.responsable}</p>
                        </div>
                        <div className="p-3 bg-white border border-gray-200 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Cargo</p>
                          <p className="font-bold text-sm">{decision.cargoResponsable}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" variant="outline" className="font-semibold">
                          <Eye className="w-3.5 h-3.5 mr-1.5" />
                          Ver Detalle
                        </Button>
                        <Button size="sm" variant="outline" className="font-semibold">
                          <Download className="w-3.5 h-3.5 mr-1.5" />
                          Descargar
                        </Button>
                        <Button size="sm" variant="outline" className="font-semibold text-orange-600 border-orange-300 hover:bg-orange-50">
                          <Bell className="w-3.5 h-3.5 mr-1.5" />
                          Notificar
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
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
        <div className="flex-shrink-0 bg-gray-50 border-t px-6 py-4 flex justify-between items-center">
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

      {/* ==================== MODAL: ENLACE COMPARTIR ==================== */}
      {mostrarModalCompartir && (
        <Dialog open={mostrarModalCompartir} onOpenChange={setMostrarModalCompartir}>
          <DialogContent className="max-w-2xl">
            <DialogTitle className="text-2xl font-black flex items-center gap-2" style={{ color: '#003DA5' }}>
              <Share2 className="w-6 h-6" />
              Enlace de Compartir Generado
            </DialogTitle>
            <DialogDescription className="sr-only">
              Enlace seguro para compartir la última actuación procesal
            </DialogDescription>

            <div className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-bold text-blue-900 mb-2">🔗 Enlace Seguro</p>
                <p className="text-sm text-gray-700 break-all font-mono bg-white p-3 rounded border">
                  {enlaceCompartir}
                </p>
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm font-bold text-green-900 mb-2">✅ Enlace Copiado al Portapapeles</p>
                <p className="text-sm text-green-700">
                  El enlace ha sido copiado automáticamente. Puedes pegarlo en un correo, mensaje o documento.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-900 mb-2">⚠️ Información Importante</p>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>Este enlace permite consultar la última actuación procesal</li>
                  <li>Es válido por 30 días desde su generación</li>
                  <li>Requiere autenticación para acceder al contenido</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(enlaceCompartir);
                    toast.success('✅ Enlace copiado nuevamente');
                  }}
                  className="font-semibold"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Copiar Nuevamente
                </Button>
                <Button
                  onClick={() => setMostrarModalCompartir(false)}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================== MODAL: NOTIFICAR ==================== */}
      {mostrarModalNotificar && (
        <Dialog open={mostrarModalNotificar} onOpenChange={setMostrarModalNotificar}>
          <DialogContent className="max-w-2xl">
            <DialogTitle className="text-2xl font-black flex items-center gap-2" style={{ color: '#003DA5' }}>
              <Bell className="w-6 h-6" />
              Notificar Última Actuación Procesal
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirmación para enviar notificaciones por correo electrónico a los destinatarios del proceso disciplinario
            </DialogDescription>

            <div className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-bold text-blue-900 mb-2">🔗 Destinatarios</p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                  <li>{proceso.disciplinado} (Disciplinado)</li>
                  <li>{proceso.abogadoAsignado} (Investigador)</li>
                  <li>Oficina Jurídica ESAP</li>
                </ul>
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm font-bold text-green-900 mb-2">✅ Notificación Exitosa</p>
                <p className="text-sm text-green-700">
                  Las notificaciones se enviarán por correo electrónico a los destinatarios indicados.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-900 mb-2">⚠️ Información Importante</p>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>Las notificaciones incluyen la última actuación procesal</li>
                  <li>Requiere autenticación para acceder al contenido</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={confirmarNotificacion}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Notificar
                </Button>
                <Button
                  onClick={() => setMostrarModalNotificar(false)}
                  style={{ background: '#9CA3AF', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================== MODAL: PORTALES ==================== */}
      {mostrarModalPortales && (
        <Dialog open={mostrarModalPortales} onOpenChange={setMostrarModalPortales}>
          <DialogContent className="max-w-2xl">
            <DialogTitle className="text-2xl font-black flex items-center gap-2" style={{ color: '#003DA5' }}>
              <ExternalLink className="w-6 h-6" />
              Abrir en Portales
            </DialogTitle>
            <DialogDescription className="sr-only">
              Confirmación para abrir el Portal de Notificaciones Judiciales en una nueva ventana
            </DialogDescription>

            <div className="space-y-4 mt-4">
              <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <p className="text-sm font-bold text-blue-900 mb-2">🔗 Portal de Notificaciones Judiciales</p>
                <p className="text-sm text-gray-700 break-all font-mono bg-white p-3 rounded border">
                  https://consultaprocesos.ramajudicial.gov.co/
                </p>
              </div>

              <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                <p className="text-sm font-bold text-green-900 mb-2">✅ Portal Abierto Exitosamente</p>
                <p className="text-sm text-green-700">
                  El Portal de Notificaciones Judiciales se abrirá en una nueva ventana.
                </p>
              </div>

              <div className="p-4 bg-orange-50 border-2 border-orange-200 rounded-lg">
                <p className="text-sm font-bold text-orange-900 mb-2">⚠️ Información Importante</p>
                <ul className="text-sm text-orange-700 space-y-1 list-disc list-inside">
                  <li>Requiere autenticación para acceder al contenido</li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  onClick={confirmarAbrirPortales}
                  style={{ background: '#003DA5', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Abrir Portal
                </Button>
                <Button
                  onClick={() => setMostrarModalPortales(false)}
                  style={{ background: '#9CA3AF', color: '#FFFFFF' }}
                  className="font-semibold"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* ==================== MODAL: REGISTRAR DECISIÓN ==================== */}
      <FormularioRegistrarDecision
        isOpen={mostrarFormularioDecision}
        onClose={() => setMostrarFormularioDecision(false)}
        onGuardar={(nuevaDecision) => {
          setDecisiones([...decisiones, nuevaDecision]);
          setMostrarFormularioDecision(false);
        }}
        procesoId={proceso.id}
      />
    </Dialog>
  );
}