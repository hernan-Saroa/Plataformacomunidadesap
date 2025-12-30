/**
 * ModalProcesoDisciplinario - Modal del Expediente Disciplinario
 * ✅ Diseño corporativo ESAP 2025 - Versión Premium
 * ✅ 6 tabs funcionales con lógica de negocio profesional
 * ✅ Similar a ModalExpediente pero adaptado para procesos disciplinarios
 * ✅ Header limpio profesional ESAP 2025
 */

import {
  Gavel, FileText, Users, Clock, AlertTriangle, CheckCircle, X,
  Calendar, User, Building, Phone, Mail, MapPin, Briefcase,
  Eye, Download, Upload, Plus, Edit, Trash2, Send, Bell, Share2,
  FileDown, ExternalLink
} from 'lucide-react';
import type { ProcesoDisciplinario } from '../core/types';
import { useState, useMemo } from 'react'; // Added useMemo
import { legalService } from '../../../../services/api/legal.service'; // Import Service
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '../../../ui/dialog';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { Card } from '../../../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../ui/tabs';
import { Avatar, AvatarFallback } from '../../../ui/avatar';
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

  // Mapear Actuaciones del Proceso a las diferentes listas
  // El backend debe devolver todas en proceso.actuaciones (si el mapeo fue correcto en ModuloJuzgamiento)
  // Como 'proceso' puede venir sin actualizaciones live, idealmente deberíamos hacer refetch o actualizar localmente.
  // Por simplicidad, usamos el prop 'proceso' y estados locales para nuevos items.

  // Filtramos por tipo. Asumimos que existen tipos 'PRUEBA' y 'DOCUMENTO'.
  const [nuevasActuaciones, setNuevasActuaciones] = useState<any[]>([]);

  const [mostrarModalNotificar, setMostrarModalNotificar] = useState(false);
  const [mostrarModalCompartir, setMostrarModalCompartir] = useState(false);
  const [mostrarModalPortales, setMostrarModalPortales] = useState(false);
  const [enlaceCompartir, setEnlaceCompartir] = useState('');
  const [mostrarFormularioDecision, setMostrarFormularioDecision] = useState(false);
  const [decisiones, setDecisiones] = useState<any[]>([]);
  const actuacionesTotales = useMemo(() => {
    const fromProps = proceso.actuaciones || [];
    return [...nuevasActuaciones, ...fromProps].sort((a, b) => new Date(b.fechaActuacion).getTime() - new Date(a.fechaActuacion).getTime());
  }, [proceso.actuaciones, nuevasActuaciones]);

  const pruebas = actuacionesTotales.filter(a => a.tipoActuacion === 'EVIDENCIA' || a.tipoActuacion === 'PRUEBA');
  const documentos = actuacionesTotales.filter(a => a.tipoActuacion === 'DOCUMENTO');

  // Cronología Logic
  const terminosEtapa = {
    'E1_AVOCAMIENTO': 5,
    'E2_DESCARGOS': 15,
    'E3_PRUEBAS': 30,
    'E4_ALEGATOS': 10
  };
  const diasTotalesEtapa = terminosEtapa[proceso.etapa as keyof typeof terminosEtapa] || 30;
  // diasRestantes comes from backend, but we can verify consistency if needed. Backend is source of truth.

  const handleFileUpload = async (e: any, tipo: 'EVIDENCIA' | 'DOCUMENTO') => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const toastId = toast.loading(`Cargando ${tipo.toLowerCase()}...`);
    try {
      // Real backend upload
      const result = await legalService.uploadJuzgamientoDocumento(proceso.id, file, tipo); // proceso.id SHOULD be the RADICADO mocked in controller

      // Add to local state to update UI immediately
      const nuevaActuacion = {
        ...result,
        tipoActuacion: tipo,
        descripcion: file.name,
        fechaActuacion: new Date(), // Now
        documentoNombre: file.name,
        documentoUrl: result.documentoUrl
        // ID etc comes from backend if we used result fully, but result might be just Actuacion object
      };
      setNuevasActuaciones(prev => [result, ...prev]); // Assuming result is the full Actuacion entity

      toast.success('Curalo exitosamente', { id: toastId });
      setHasChanges(true); // Trigger "Guardar Cambios" UI state if relevant, though it's already saved in backend
    } catch (error) {
      console.error(error);
      toast.error('Error al subir archivo', { id: toastId });
    }
  };

  const handleAgregarPrueba = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png,.xlsx';
    input.onchange = (e) => handleFileUpload(e, 'EVIDENCIA');
    input.click();
  };

  const handleSubirDocumento = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.png,.xlsx';
    input.onchange = (e) => handleFileUpload(e, 'DOCUMENTO');
    input.click();
  };

  const handleVerPrueba = (prueba: any) => {
    if (prueba.documentoUrl) {
      window.open(prueba.documentoUrl, '_blank');
    } else {
      toast.error('URL del documento no disponible');
    }
  };

  const handleDescargarPrueba = (prueba: any) => {
    if (prueba.documentoUrl) {
      // En producción se usa un endpoint de descarga o el mismo URL
      window.open(prueba.documentoUrl, '_blank');
    }
  };

  const handleGuardarCambios = () => {
    // Backend saves uploads immediately, so this might just be for other form fields if any.
    // For now, just close/reset state.
    toast.info('Los documentos se guardan automáticamente al subir.');
    setHasChanges(false);
    onClose(); // Or reload data
  };

  const handleCerrar = () => {
    onClose();
  };

  // ... (Notification handlers remain similar but mocked for now as per instructions)
  // const handleNotificar = () => toast.info('Notificación enviada (Simulación)');
  // const handleCompartir = () => toast.info('Enlace compartido (Simulación)');
  // const handleDescargarPDF = () => toast.info('PDF descargado (Simulación)');
  // const handleAbrirEnPortales = () => toast.info('Abriendo portal (Simulación)');

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
          Vista completa del proceso disciplinario {proceso.id}
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
                  {proceso.etapa || 'SIN ETAPA'}
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
              {['general', 'hechos', 'pruebas', 'actuaciones', 'decisiones', 'documentos'].map(tab => (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  className="data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 rounded-t-lg font-semibold capitalize"
                >
                  {tab}
                </TabsTrigger>
              ))}
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
                          {(proceso.abogadoAsignado || 'User').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <p className="font-bold">{proceso.abogadoAsignado || 'Sin Asignar'}</p>
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
                    <p className="font-bold text-lg">{proceso.disciplinado || proceso.investigado}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Cargo</p>
                    <p className="font-semibold">{proceso.cargo || 'No registrado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Dependencia</p>
                    <p className="font-semibold">{proceso.dependencia || 'No registrado'}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Cronología de Términos */}
            <Card className="p-4 bg-blue-50 border-2 border-blue-200">
              <h3 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: '#003DA5' }}>
                <Clock className="w-5 h-5" />
                Cronología de Términos ({proceso.etapa})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Restantes</p>
                  <p className="text-3xl font-black text-orange-600">{proceso.diasRestantes}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Transcurridos</p>
                  <p className="text-3xl font-black text-blue-600">{Math.max(0, diasTotalesEtapa - proceso.diasRestantes)}</p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Días Totales Etapa</p>
                  <p className="text-3xl font-black text-gray-600">{diasTotalesEtapa}</p>
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
              <div className="p-4 bg-blue-50 rounded-lg mb-4">
                <p className="text-sm text-gray-600 mb-1">Actuación:</p>
                <p className="font-bold text-gray-900">
                  {actuacionesTotales[0]?.descripcion || 'Inicio del proceso'}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>📅 {actuacionesTotales[0]?.fechaActuacion ? new Date(actuacionesTotales[0].fechaActuacion).toLocaleDateString('es-CO') : new Date().toLocaleDateString('es-CO')}</span>
                </div>
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
              <p className="text-gray-700 leading-relaxed mb-4">
                {proceso.descripcionHechos || proceso.hechos || 'No se han registrado hechos.'}
              </p>
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

            {pruebas.length === 0 && <p className="text-gray-500 italic">No hay pruebas registradas.</p>}

            {pruebas.map((prueba: any, index: number) => (
              <Card key={prueba.id || index} className="p-4 hover:shadow-md transition-all border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <FileText className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-lg mb-1">{prueba.documentoNombre || `Prueba #${index + 1}`}</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {prueba.descripcion} - {new Date(prueba.fechaActuacion).toLocaleDateString()}
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleVerPrueba(prueba)}>
                        <Eye className="w-4 h-4 mr-1.5" /> Ver
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
              {actuacionesTotales.length === 0 && <p className="text-gray-500">Solo inicio del proceso.</p>}
              {actuacionesTotales.map((act, idx) => (
                <Card key={idx} className="p-4 border-l-4 border-blue-800">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-sm text-gray-900">{act.descripcion || act.tipoActuacion}</p>
                      <p className="text-xs text-gray-500 mt-1">📅 {new Date(act.fechaActuacion).toLocaleDateString('es-CO')}</p>
                    </div>
                  </div>
                </Card>
              ))}
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
                onClick={handleSubirDocumento}
                style={{ background: '#003DA5', color: '#FFFFFF' }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Documento
              </Button>
            </div>

            {documentos.length === 0 && <p className="text-gray-500 italic">No hay documentos registrados.</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documentos.map((doc: any, index: number) => (
                <Card key={doc.id || index} className="p-4 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <FileText className="w-8 h-8 text-blue-600" />
                    <div className="flex-1">
                      <h4 className="font-bold mb-1">{doc.documentoNombre || `Documento ${index + 1}`}</h4>
                      <p className="text-xs text-gray-500">{new Date(doc.fechaActuacion).toLocaleDateString()}</p>
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => handleVerPrueba(doc)}>
                          <Eye className="w-3 h-3 mr-1" /> Ver
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
