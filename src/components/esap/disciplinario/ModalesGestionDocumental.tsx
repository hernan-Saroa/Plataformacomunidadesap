/**
 * MODALES DE GESTIÓN DOCUMENTAL - CONTROL INTERNO DISCIPLINARIO
 * Componentes para gestión de Autos, Evidencias, Oficios, Notificaciones, Actas e Historial
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Scale, Archive, Mail, Bell, FileCheck, History, Upload, Download,
  Eye, Edit2, Trash2, Plus, Calendar, User, FileText, CheckCircle,
  AlertCircle, Clock, ExternalLink, Link as LinkIcon, Filter, Search,
  FileSignature, Send, Save, Package, Tag,
  Paperclip, MessageSquare, UserCheck, AlertTriangle, Info, Users, Copy
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

interface Persona {
  nombre: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT';
  numeroIdentificacion: string;
}

interface Proceso {
  numeroProceso: string;
  denunciado: Persona;
  denunciante: Persona;
  profesionalAsignado: Persona;
  cedula: string;
  noticiaOrigen: string;
  etapaActual: string;
}

// ==================== MODAL GESTIÓN DE AUTOS ====================
interface ModalAutosProps {
  proceso: Proceso;
  onClose: () => void;
  onCrearAuto: () => void;
}

export function ModalGestionAutos({ proceso, onClose, onCrearAuto }: ModalAutosProps) {
  const [vistaActual, setVistaActual] = useState<'lista' | 'crear'>('lista');
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: any }>({ show: false, documento: null });

  // Mock data de autos
  const autos = [
    {
      id: 'a1',
      numero: 'AUTO-041-2025',
      tipo: 'Apertura',
      fecha: '2025-01-08',
      firmado: true,
      notificado: true,
      estado: 'Ejecutoriado'
    },
    {
      id: 'a2',
      numero: 'AUTO-002-2025',
      tipo: 'Indagación Preliminar',
      fecha: '2025-01-10',
      firmado: true,
      notificado: false,
      estado: 'Pendiente Notificación'
    }
  ];

  const tiposAuto = [
    { id: 'apertura', nombre: 'Auto de Apertura', icon: Scale, color: '#8B5CF6' },
    { id: 'indagacion', nombre: 'Auto de Indagación Preliminar', icon: Search, color: '#06B6D4' },
    { id: 'investigacion', nombre: 'Auto de Apertura de Investigación', icon: FileText, color: '#10B981' },
    { id: 'pliego', nombre: 'Auto de Formulación de Pliego', icon: FileCheck, color: '#F59E0B' },
    { id: 'cierre', nombre: 'Auto de Cierre', icon: CheckCircle, color: '#22C55E' },
    { id: 'archivo', nombre: 'Auto de Archivo', icon: Archive, color: '#6B7280' },
    { id: 'sancion', nombre: 'Fallo con Sanción', icon: AlertTriangle, color: '#DC2626' },
    { id: 'absolutorio', nombre: 'Fallo Absolutorio', icon: CheckCircle, color: '#10B981' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#EDE9FE' }}>
                <Scale className="w-6 h-6" style={{ color: '#8B5CF6' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Gestión de Autos y Providencias
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - {proceso.denunciado.nombre}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b">
          <div className="flex gap-2">
            <button
              onClick={() => setVistaActual('lista')}
              className={`px-4 py-2 rounded-t-lg font-bold text-sm ${
                vistaActual === 'lista'
                  ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Lista de Autos
            </button>
            <button
              onClick={() => setVistaActual('crear')}
              className={`px-4 py-2 rounded-t-lg font-bold text-sm ${
                vistaActual === 'crear'
                  ? 'bg-purple-100 text-purple-700 border-b-2 border-purple-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Crear Nuevo Auto
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          {vistaActual === 'lista' ? (
            // Lista de Autos Existentes
            <div className="space-y-3">
              {autos.map((auto) => (
                <Card key={auto.id} className="p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Scale className="w-5 h-5" style={{ color: '#8B5CF6' }} />
                        <h3 className="font-bold text-gray-900">{auto.numero}</h3>
                        {auto.firmado && (
                          <Badge className="bg-green-100 text-green-700 border-green-300">
                            <FileSignature className="w-3 h-3 mr-1" />
                            Firmado
                          </Badge>
                        )}
                        {auto.notificado && (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                            <Bell className="w-3 h-3 mr-1" />
                            Notificado
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Tipo:</p>
                          <p className="font-bold text-gray-900">{auto.tipo}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Fecha:</p>
                          <p className="font-bold text-gray-900">{auto.fecha}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Estado:</p>
                          <p className="font-bold text-gray-900">{auto.estado}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button 
                        type="button"
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setVisorDocumento({ show: true, documento: auto });
                        }}
                        title="Ver documento"
                        style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button 
                        type="button"
                        size="sm" 
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Crear elemento de descarga simulado
                          const link = document.createElement('a');
                          link.href = '#';
                          link.download = `${auto.numero}.pdf`;
                          toast.success('Descarga iniciada', {
                            description: `${auto.numero}.pdf se está descargando`
                          });
                        }}
                        title="Descargar documento"
                        style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            // Crear Nuevo Auto
            <div className="space-y-4">
              <Card className="p-4 bg-purple-50 border-purple-200">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-purple-900 mb-1">
                      Selecciona el tipo de auto a crear
                    </p>
                    <p className="text-xs text-purple-700">
                      El sistema pre-llenará automáticamente los campos del documento con la información del proceso
                    </p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-3">
                {tiposAuto.map((tipo) => (
                  <button
                    key={tipo.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Tipo de auto seleccionado:', tipo.nombre);
                      console.log('Ejecutando onCrearAuto...');
                      // Ejecutar callback que cierra el modal y muestra notificación
                      onCrearAuto();
                    }}
                    className="p-4 border-2 rounded-xl hover:shadow-md transition-all text-left group hover:scale-105"
                    style={{ borderColor: tipo.color + '40' }}
                  >
                    <tipo.icon
                      className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform"
                      style={{ color: tipo.color }}
                    />
                    <p className="font-bold text-sm text-gray-900">{tipo.nombre}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          {vistaActual === 'lista' ? (
            <Button
              onClick={() => setVistaActual('crear')}
              style={{ background: '#8B5CF6', color: '#FFFFFF' }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Nuevo Auto
            </Button>
          ) : (
            <Button
              onClick={() => setVistaActual('lista')}
              variant="outline"
            >
              <FileText className="w-4 h-4 mr-2" />
              Ver Lista de Autos
            </Button>
          )}
        </div>
      </motion.div>

      {/* Modal Visor de Documento */}
      <AnimatePresence>
        {visorDocumento.show && visorDocumento.documento && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-start justify-center pt-16 sm:pt-20 z-[160] p-4"
            onClick={() => setVisorDocumento({ show: false, documento: null })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl" style={{ background: '#EDE9FE' }}>
                      <Eye className="w-6 h-6" style={{ color: '#8B5CF6' }} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                        Visor de Documento
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {visorDocumento.documento.numero}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setVisorDocumento({ show: false, documento: null })} 
                    className="p-2 hover:bg-white/50 rounded-lg"
                  >
                    <X className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                {/* Información del Documento */}
                <Card className="p-4 mb-4 bg-purple-50 border-purple-200">
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Número:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.numero}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Tipo:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.tipo}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Fecha:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.fecha}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Estado:</p>
                      <p className="font-bold text-gray-900">{visorDocumento.documento.estado}</p>
                    </div>
                  </div>
                </Card>

                {/* Vista previa del documento - MEJORADO */}
                <Card className="p-4 bg-gray-50 border-2 border-gray-300 overflow-hidden">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <p className="font-bold text-gray-900">
                        {visorDocumento.documento.nombre || `${visorDocumento.documento.numero}.pdf`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Función de impresión
                          window.print();
                          toast.info('Preparando impresión...', {
                            description: 'Abre el diálogo de impresión del navegador'
                          });
                        }}
                        title="Imprimir"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          // Función de zoom
                          toast.info('Zoom', {
                            description: 'Usa Ctrl+Rueda para hacer zoom'
                          });
                        }}
                        title="Zoom"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Visualizador según tipo de archivo */}
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ minHeight: '500px', maxHeight: '600px' }}>
                    {(() => {
                      const nombreArchivo = visorDocumento.documento.nombre || visorDocumento.documento.numero;
                      const extension = nombreArchivo.split('.').pop()?.toLowerCase();
                      
                      // PDF
                      if (extension === 'pdf' || visorDocumento.documento.tipo === 'Documento') {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8">
                            <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8 border-2 border-gray-200">
                              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                                <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: '#DC2626' }}>
                                  <FileText className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h3 className="font-bold text-lg">Documento PDF</h3>
                                  <p className="text-sm text-gray-600">{nombreArchivo}</p>
                                </div>
                              </div>
                              
                              {/* Simulación de contenido PDF */}
                              <div className="space-y-4 text-sm">
                                <p className="font-bold text-center text-lg mb-4">
                                  {visorDocumento.documento.tipo?.toUpperCase() || 'DOCUMENTO LEGAL'}
                                </p>
                                
                                <p className="text-justify leading-relaxed text-gray-700">
                                  La Oficina de Control Interno Disciplinario de la ESAP, en ejercicio de sus 
                                  facultades legales y reglamentarias, y con fundamento en lo dispuesto en la 
                                  Ley 734 de 2002 (Código Disciplinario Único) y demás normas concordantes...
                                </p>
                                
                                <p className="font-bold mt-4">CONSIDERANDO:</p>
                                
                                <p className="text-justify leading-relaxed text-gray-700">
                                  <strong>PRIMERO:</strong> Que mediante radicado No. {proceso.numeroProceso}, se 
                                  recibió información sobre presuntos hechos que podrían constituir falta disciplinaria...
                                </p>
                                
                                <p className="text-justify leading-relaxed text-gray-700">
                                  <strong>SEGUNDO:</strong> Que analizados los hechos y valorada la información allegada, 
                                  se encuentra mérito suficiente para proceder conforme a derecho...
                                </p>
                                
                                <div className="mt-6 pt-4 border-t text-center text-xs text-gray-500">
                                  <p>Vista previa simulada - En producción se mostraría el documento real</p>
                                  <p className="mt-2">
                                    <a 
                                      href="#"
                                      className="text-blue-600 hover:underline"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toast.info('Función de PDF real', {
                                          description: 'Conectar con backend para mostrar PDF real'
                                        });
                                      }}
                                    >
                                      Cargar documento completo →
                                    </a>
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // VIDEO
                      if (extension === 'mp4' || extension === 'avi' || extension === 'mov' || visorDocumento.documento.tipo === 'Video') {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8 bg-gray-900">
                            <div className="w-full max-w-4xl">
                              <div className="aspect-video bg-black rounded-lg flex items-center justify-center mb-4">
                                <div className="text-center text-white">
                                  <Scale className="w-20 h-20 mx-auto mb-4 opacity-50" />
                                  <p className="text-lg font-bold mb-2">Reproductor de Video</p>
                                  <p className="text-sm text-gray-400 mb-4">{nombreArchivo}</p>
                                  <Button
                                    onClick={() => {
                                      toast.info('Reproducción de video', {
                                        description: 'En producción se cargaría el video real'
                                      });
                                    }}
                                    style={{ background: '#003DA5' }}
                                  >
                                    ▶ Reproducir Video
                                  </Button>
                                </div>
                              </div>
                              <div className="text-center text-sm text-gray-400">
                                <p>Vista previa de video - Conectar con backend para reproducción real</p>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // IMAGEN
                      if (extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'zip' || visorDocumento.documento.categoria === 'Fotográfica') {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8">
                            <div className="w-full max-w-4xl">
                              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-8 border-2 border-dashed border-blue-300">
                                <div className="text-center">
                                  <Archive className="w-20 h-20 mx-auto mb-4 text-blue-500" />
                                  <p className="text-lg font-bold mb-2">Galería de Imágenes</p>
                                  <p className="text-sm text-gray-600 mb-4">{nombreArchivo}</p>
                                  
                                  {/* Simulación de miniaturas */}
                                  <div className="grid grid-cols-3 gap-4 mt-6">
                                    {[1, 2, 3].map((i) => (
                                      <div 
                                        key={i}
                                        className="aspect-square bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors"
                                        onClick={() => {
                                          toast.info(`Imagen ${i}`, {
                                            description: 'Click para ampliar'
                                          });
                                        }}
                                      >
                                        <FileText className="w-8 h-8 text-gray-400" />
                                      </div>
                                    ))}
                                  </div>
                                  
                                  <p className="text-xs text-gray-500 mt-4">
                                    Click en las miniaturas para ampliar
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // AUDIO
                      if (extension === 'mp3' || extension === 'wav' || visorDocumento.documento.categoria === 'Audiovisual') {
                        return (
                          <div className="h-full flex flex-col items-center justify-center p-8">
                            <div className="w-full max-w-2xl">
                              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-8 border-2 border-purple-200">
                                <div className="text-center">
                                  <Archive className="w-20 h-20 mx-auto mb-4 text-purple-500" />
                                  <p className="text-lg font-bold mb-2">Archivo de Audio</p>
                                  <p className="text-sm text-gray-600 mb-6">{nombreArchivo}</p>
                                  
                                  {/* Control de reproducción simulado */}
                                  <div className="bg-white rounded-xl p-6 shadow-lg">
                                    <div className="flex items-center justify-center gap-4 mb-4">
                                      <Button
                                        onClick={() => toast.info('Reproduciendo...')}
                                        size="lg"
                                        style={{ background: '#8B5CF6' }}
                                      >
                                        ▶ Reproducir Audio
                                      </Button>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: '30%' }}></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                      <span>0:45</span>
                                      <span>2:30</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      
                      // ARCHIVO GENÉRICO
                      return (
                        <div className="h-full flex items-center justify-center p-8">
                          <div className="text-center">
                            <FileText className="w-20 h-20 mx-auto mb-4 text-gray-400" />
                            <p className="font-bold text-gray-900 mb-2">Vista Previa No Disponible</p>
                            <p className="text-sm text-gray-600 mb-4">{nombreArchivo}</p>
                            <p className="text-xs text-gray-500">
                              Descarga el archivo para visualizarlo en tu equipo
                            </p>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </Card>
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setVisorDocumento({ show: false, documento: null })} 
                    variant="outline"
                  >
                    Cerrar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.print();
                      toast.info('Imprimiendo documento...', {
                        description: 'Abre el diálogo de impresión'
                      });
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      // Copiar enlace
                      const url = `${window.location.origin}/documento/${visorDocumento.documento.id || visorDocumento.documento.numero}`;
                      navigator.clipboard.writeText(url);
                      toast.success('Enlace copiado', {
                        description: 'El enlace se copió al portapapeles'
                      });
                    }}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar Enlace
                  </Button>
                  <Button
                    onClick={() => {
                      // Descarga REAL
                      try {
                        const nombreArchivo = visorDocumento.documento.nombre || `${visorDocumento.documento.numero}.pdf`;
                        const blob = new Blob(['Contenido del documento'], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = nombreArchivo;
                        link.style.display = 'none';
                        
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        window.URL.revokeObjectURL(url);
                        
                        toast.success('Descarga completada', {
                          description: nombreArchivo,
                          duration: 3000
                        });
                      } catch (error) {
                        toast.error('Error en descarga', {
                          description: 'No se pudo descargar el archivo'
                        });
                      }
                    }}
                    style={{ background: '#003DA5', color: '#FFFFFF' }}
                    className="hover:opacity-90"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== MODAL GESTIÓN DE EVIDENCIAS ====================
interface ModalEvidenciasProps {
  proceso: Proceso;
  onClose: () => void;
  onSubirEvidencia: () => void;
}

export function ModalGestionEvidencias({ proceso, onClose, onSubirEvidencia }: ModalEvidenciasProps) {
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: any }>({ show: false, documento: null });
  const [evidenciasLocal, setEvidenciasLocal] = useState([
    {
      id: 'e1',
      nombre: 'Declaración Testigo 1.pdf',
      tipo: 'Documento',
      fecha: '2025-01-10',
      tamaño: '2.3 MB',
      categoria: 'Testimonial'
    },
    {
      id: 'e2',
      nombre: 'Fotografías del lugar.zip',
      tipo: 'Archivo',
      fecha: '2025-01-09',
      tamaño: '15.7 MB',
      categoria: 'Fotográfica'
    },
    {
      id: 'e3',
      nombre: 'Video_incidente.mp4',
      tipo: 'Video',
      fecha: '2025-01-08',
      tamaño: '45.2 MB',
      categoria: 'Audiovisual'
    }
  ]);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [archivoCargando, setArchivoCargando] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Simular carga de archivos
    setCargando(true);
    setProgreso(0);

    let archivoIndex = 0;
    const cargarArchivos = () => {
      if (archivoIndex >= files.length) {
        // Todos los archivos cargados
        setTimeout(() => {
          setCargando(false);
          setProgreso(0);
          setArchivoCargando('');
          toast.success('Evidencias cargadas exitosamente', {
            description: `${files.length} archivo(s) subido(s) correctamente`
          });
        }, 500);
        return;
      }

      const file = files[archivoIndex];
      setArchivoCargando(file.name);
      
      // Simular progreso de carga
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += 10;
        setProgreso(currentProgress);
        
        if (currentProgress >= 100) {
          clearInterval(interval);
          
          // Agregar archivo a la lista
          const nuevoArchivo = {
            id: `e${Date.now()}_${archivoIndex}`,
            nombre: file.name,
            tipo: file.type.includes('pdf') ? 'Documento' : 
                  file.type.includes('image') ? 'Imagen' :
                  file.type.includes('video') ? 'Video' : 'Archivo',
            fecha: new Date().toISOString().split('T')[0],
            tamaño: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            categoria: file.type.includes('pdf') ? 'Documental' : 
                      file.type.includes('image') ? 'Fotográfica' : 
                      file.type.includes('video') ? 'Audiovisual' : 'Digital'
          };
          
          setEvidenciasLocal(prev => [nuevoArchivo, ...prev]);
          
          // Pasar al siguiente archivo
          archivoIndex++;
          setTimeout(cargarArchivos, 300);
        }
      }, 100);
    };

    cargarArchivos();
  };

  const evidencias = evidenciasLocal;

  const categorias = [
    { id: 'documental', nombre: 'Documental', icon: FileText, color: '#3B82F6' },
    { id: 'testimonial', nombre: 'Testimonial', icon: MessageSquare, color: '#10B981' },
    { id: 'fotografica', nombre: 'Fotográfica', icon: Archive, color: '#F59E0B' },
    { id: 'audiovisual', nombre: 'Audiovisual', icon: Archive, color: '#8B5CF6' },
    { id: 'digital', nombre: 'Digital', icon: Package, color: '#06B6D4' },
    { id: 'pericial', nombre: 'Pericial', icon: FileCheck, color: '#DC2626' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-orange-50 to-yellow-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#FEF3C7' }}>
                <Archive className="w-6 h-6" style={{ color: '#F59E0B' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Gestión de Evidencias
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - Material Probatorio
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Todas ({evidencias.length})
            </Badge>
            {categorias.map((cat) => (
              <Badge
                key={cat.id}
                variant="outline"
                className="cursor-pointer hover:bg-gray-100"
              >
                {cat.nombre}
              </Badge>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 260px)' }}>
          <div className="space-y-3">
            {evidencias.map((evidencia) => (
              <Card key={evidencia.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-orange-100">
                      <Archive className="w-5 h-5" style={{ color: '#F59E0B' }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{evidencia.nombre}</h3>
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Tipo:</p>
                          <p className="font-bold text-gray-900">{evidencia.tipo}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Categoría:</p>
                          <p className="font-bold text-gray-900">{evidencia.categoria}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Fecha:</p>
                          <p className="font-bold text-gray-900">{evidencia.fecha}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Tamaño:</p>
                          <p className="font-bold text-gray-900">{evidencia.tamaño}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVisorDocumento({ show: true, documento: evidencia });
                      }}
                      title="Ver documento"
                      style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      className="hover:bg-blue-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Función REAL de descarga
                        try {
                          // Crear un blob de prueba (en producción vendría del backend)
                          const blob = new Blob(['Contenido del archivo de evidencia'], { type: 'application/pdf' });
                          const url = window.URL.createObjectURL(blob);
                          
                          // Crear elemento temporal para descarga
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = evidencia.nombre;
                          link.style.display = 'none';
                          
                          // Agregar al DOM, hacer click y remover
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          
                          // Liberar memoria
                          window.URL.revokeObjectURL(url);
                          
                          toast.success('Descarga iniciada', {
                            description: `${evidencia.nombre} - ${evidencia.tamaño}`,
                            duration: 3000
                          });
                        } catch (error) {
                          toast.error('Error en descarga', {
                            description: 'No se pudo descargar el archivo'
                          });
                        }
                      }}
                      title="Descargar archivo"
                      style={{ borderColor: '#003DA5', color: '#003DA5' }}
                      className="hover:bg-blue-50"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Botón de Subir */}
          <div className="relative">
            <input
              type="file"
              id="file-upload-evidencias"
              multiple
              accept="*/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="file-upload-evidencias">
              <Card
                className={`mt-4 p-8 border-2 border-dashed cursor-pointer transition-all ${
                  cargando ? 'border-orange-500 bg-orange-50' : 'hover:bg-gray-50 border-gray-300'
                }`}
              >
                <div className="text-center">
                  <motion.div
                    animate={cargando ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Upload 
                      className="w-12 h-12 mx-auto mb-3" 
                      style={{ color: cargando ? '#F59E0B' : '#9CA3AF' }} 
                    />
                  </motion.div>
                  <p className="font-bold text-gray-900 mb-1">
                    {cargando ? 'Subiendo archivos...' : 'Subir Nueva Evidencia'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {cargando ? archivoCargando : 'Click para seleccionar archivos'}
                  </p>
                  
                  {/* Barra de progreso */}
                  {cargando && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: '#F59E0B' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progreso}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">{progreso}% completado</p>
                    </div>
                  )}
                </div>
              </Card>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button
            onClick={() => {
              const input = document.getElementById('file-upload-evidencias') as HTMLInputElement;
              if (input) input.click();
            }}
            style={{ background: '#F59E0B', color: '#FFFFFF' }}
            disabled={cargando}
          >
            <Upload className="w-4 h-4 mr-2" />
            {cargando ? 'Cargando...' : 'Subir Evidencias'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL GESTIÓN DE OFICIOS ====================
interface ModalOficiosProps {
  proceso: Proceso;
  onClose: () => void;
  onCrearOficio: () => void;
}

export function ModalGestionOficios({ proceso, onClose, onCrearOficio }: ModalOficiosProps) {
  const [oficiosLocal, setOficiosLocal] = useState([
    {
      id: 'o1',
      numero: 'OCID-025-2025',
      destinatario: 'Contraloría General',
      asunto: 'Solicitud de información presupuestal',
      fecha: '2025-01-10',
      estado: 'Enviado',
      respuesta: false
    },
    {
      id: 'o2',
      numero: 'OCID-026-2025',
      destinatario: 'Jefe Dependencia X',
      asunto: 'Solicitud de documentos',
      fecha: '2025-01-11',
      estado: 'Enviado',
      respuesta: true
    }
  ]);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [archivoCargando, setArchivoCargando] = useState<string>('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Simular carga de archivo
    setCargando(true);
    setProgreso(0);

    const file = files[0]; // Solo tomar el primer archivo
    setArchivoCargando(file.name);
    
    // Simular progreso de carga
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgreso(currentProgress);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        
        // Generar número de oficio automático
        const numeroOficio = `OCID-${String(oficiosLocal.length + 25).padStart(3, '0')}-2025`;
        
        // Agregar oficio a la lista
        const nuevoOficio = {
          id: `o${Date.now()}`,
          numero: numeroOficio,
          destinatario: 'Por asignar',
          asunto: file.name.replace(/\.[^/.]+$/, ''), // Nombre sin extensión
          fecha: new Date().toISOString().split('T')[0],
          estado: 'Borrador',
          respuesta: false
        };
        
        setOficiosLocal(prev => [nuevoOficio, ...prev]);
        
        // Finalizar carga
        setTimeout(() => {
          setCargando(false);
          setProgreso(0);
          setArchivoCargando('');
          toast.success('Oficio creado exitosamente', {
            description: `${numeroOficio} - Documento cargado correctamente`
          });
        }, 500);
      }
    }, 100);
  };

  const oficios = oficiosLocal;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-cyan-50 to-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#CFFAFE' }}>
                <Mail className="w-6 h-6" style={{ color: '#06B6D4' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Gestión de Oficios
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - Comunicaciones Oficiales
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          <div className="space-y-3">
            {oficios.map((oficio) => (
              <Card key={oficio.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-cyan-100">
                      <Mail className="w-5 h-5" style={{ color: '#06B6D4' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900">{oficio.numero}</h3>
                        <Badge className={
                          oficio.respuesta
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }>
                          {oficio.respuesta ? 'Con Respuesta' : 'Pendiente Respuesta'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Destinatario:</p>
                          <p className="font-bold text-gray-900">{oficio.destinatario}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Asunto:</p>
                          <p className="font-bold text-gray-900">{oficio.asunto}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Fecha:</p>
                          <p className="font-bold text-gray-900">{oficio.fecha}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.info('Visor de Oficio', {
                          description: `Visualizando ${oficio.numero}`
                        });
                      }}
                      title="Ver oficio"
                      style={{ borderColor: '#003DA5', color: '#003DA5' }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = '#';
                        link.download = `${oficio.numero}.pdf`;
                        toast.success('Descarga iniciada', {
                          description: `${oficio.numero}.pdf`
                        });
                      }}
                      title="Descargar oficio"
                      style={{ borderColor: '#003DA5', color: '#003DA5' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Crear Nuevo */}
          <div className="relative">
            <input
              type="file"
              id="file-upload-oficios"
              accept="*/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="file-upload-oficios">
              <Card
                className={`mt-4 p-8 border-2 border-dashed cursor-pointer transition-all ${
                  cargando ? 'border-cyan-500 bg-cyan-50' : 'hover:bg-gray-50 border-gray-300'
                }`}
              >
                <div className="text-center">
                  <motion.div
                    animate={cargando ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  >
                    <Upload 
                      className="w-12 h-12 mx-auto mb-3" 
                      style={{ color: cargando ? '#06B6D4' : '#9CA3AF' }} 
                    />
                  </motion.div>
                  <p className="font-bold text-gray-900 mb-1">
                    {cargando ? 'Subiendo archivo...' : 'Crear Nuevo Oficio'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {cargando ? archivoCargando : 'Click para seleccionar archivo'}
                  </p>
                  
                  {/* Barra de progreso */}
                  {cargando && (
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: '#06B6D4' }}
                          initial={{ width: 0 }}
                          animate={{ width: `${progreso}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-2">{progreso}% completado</p>
                    </div>
                  )}
                </div>
              </Card>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button
            onClick={() => {
              const input = document.getElementById('file-upload-oficios') as HTMLInputElement;
              if (input) input.click();
            }}
            style={{ background: '#06B6D4', color: '#FFFFFF' }}
            disabled={cargando}
          >
            <Upload className="w-4 h-4 mr-2" />
            {cargando ? 'Cargando...' : 'Crear Oficio'}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ==================== MODAL GESTIÓN DE ACTAS ====================
interface ModalActasProps {
  proceso: Proceso;
  onClose: () => void;
}

export function ModalGestionActas({ proceso, onClose }: ModalActasProps) {
  const [visorDocumento, setVisorDocumento] = useState<{ show: boolean; documento: any }>({ show: false, documento: null });
  const [modalCrearActa, setModalCrearActa] = useState<{ show: boolean; tipo: any | null }>({ show: false, tipo: null });
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<File | null>(null);
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [actasLocal, setActasLocal] = useState([
    {
      id: 'ac1',
      numero: 'ACTA-001-2025',
      tipo: 'Versión Libre',
      fecha: '2025-01-12',
      participantes: 3,
      firmada: true
    }
  ]);
  
  const actas = actasLocal;

  const tiposActa = [
    { id: 'version', nombre: 'Versión Libre', icon: MessageSquare, color: '#3B82F6' },
    { id: 'audiencia', nombre: 'Audiencia', icon: Users, color: '#10B981' },
    { id: 'descargos', nombre: 'Descargos', icon: FileText, color: '#F59E0B' },
    { id: 'diligencia', nombre: 'Diligencia', icon: FileCheck, color: '#DC2626' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#FEE2E2' }}>
                <FileCheck className="w-6 h-6" style={{ color: '#DC2626' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Gestión de Actas
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - Registro de Diligencias
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 220px)' }}>
          <div className="space-y-3">
            {actas.map((acta) => (
              <Card key={acta.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-red-100">
                      <FileCheck className="w-5 h-5" style={{ color: '#DC2626' }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-gray-900">{acta.numero}</h3>
                        {acta.firmada && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Firmada
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <p className="text-gray-600">Tipo:</p>
                          <p className="font-bold text-gray-900">{acta.tipo}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Fecha:</p>
                          <p className="font-bold text-gray-900">{acta.fecha}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Participantes:</p>
                          <p className="font-bold text-gray-900">{acta.participantes}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVisorDocumento({ show: true, documento: acta });
                        toast.info('Ver Acta', {
                          description: `Abriendo ${acta.numero} - ${acta.tipo}`
                        });
                      }}
                      title="Ver acta"
                      style={{ borderColor: '#003DA5', color: '#003DA5' }}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = document.createElement('a');
                        link.href = '#';
                        link.download = `${acta.numero}.pdf`;
                        toast.success('Descarga iniciada', {
                          description: `${acta.numero}.pdf - ${acta.tipo}`
                        });
                      }}
                      title="Descargar acta"
                      style={{ borderColor: '#003DA5', color: '#003DA5' }}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Crear Nueva Acta */}
          <div className="mt-4">
            <p className="text-sm font-bold text-gray-700 mb-3">Crear Nueva Acta:</p>
            <div className="grid grid-cols-2 gap-3">
              {tiposActa.map((tipo) => (
                <button
                  key={tipo.id}
                  onClick={() => {
                    setModalCrearActa({ show: true, tipo });
                    setArchivoSeleccionado(null);
                  }}
                  className="p-4 border-2 rounded-xl hover:shadow-lg transition-all text-left group hover:scale-105 active:scale-95"
                  style={{ borderColor: tipo.color + '40', background: tipo.color + '08' }}
                >
                  <tipo.icon 
                    className="w-6 h-6 mb-2 group-hover:scale-110 transition-transform" 
                    style={{ color: tipo.color }} 
                  />
                  <p className="font-bold text-sm text-gray-900">{tipo.nombre}</p>
                  <p className="text-xs text-gray-600 mt-1">Click para subir documento</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <Button onClick={onClose} variant="outline" className="w-full">
            Cerrar
          </Button>
        </div>
      </motion.div>

      {/* Modal Secundario: Crear Acta con Documento */}
      <AnimatePresence>
        {modalCrearActa.show && modalCrearActa.tipo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-start justify-center pt-16 sm:pt-20 z-[160] p-4"
            onClick={() => setModalCrearActa({ show: false, tipo: null })}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              {/* Header del Modal Secundario */}
              <div 
                className="p-6 border-b"
                style={{ background: modalCrearActa.tipo.color + '15' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="p-3 rounded-xl"
                      style={{ background: modalCrearActa.tipo.color + '30' }}
                    >
                      <modalCrearActa.tipo.icon 
                        className="w-6 h-6" 
                        style={{ color: modalCrearActa.tipo.color }} 
                      />
                    </div>
                    <div>
                      <h3 className="text-xl font-black" style={{ color: '#003DA5' }}>
                        Crear Acta: {modalCrearActa.tipo.nombre}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {proceso.numeroProceso}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setModalCrearActa({ show: false, tipo: null })}
                    className="p-2 hover:bg-black/10 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Contenido del Modal Secundario */}
              <div className="p-6 space-y-4">
                <Card className="p-4 bg-blue-50 border-blue-200">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-blue-900 mb-1">
                        Sube el documento del acta
                      </p>
                      <p className="text-xs text-blue-700">
                        El archivo se asociará automáticamente al proceso {proceso.numeroProceso}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Área de Carga */}
                <div className="relative">
                  <input
                    type="file"
                    id="file-upload-acta"
                    accept="application/pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setArchivoSeleccionado(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="file-upload-acta">
                    <Card
                      className={`p-8 border-2 border-dashed cursor-pointer transition-all ${
                        archivoSeleccionado 
                          ? 'border-green-500 bg-green-50' 
                          : 'hover:bg-gray-50 border-gray-300'
                      }`}
                    >
                      <div className="text-center">
                        {archivoSeleccionado ? (
                          <>
                            <CheckCircle 
                              className="w-12 h-12 mx-auto mb-3 text-green-600" 
                            />
                            <p className="font-bold text-gray-900 mb-1">
                              Archivo seleccionado
                            </p>
                            <p className="text-sm text-gray-600 mb-1">
                              {archivoSeleccionado.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(archivoSeleccionado.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <Button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setArchivoSeleccionado(null);
                                const input = document.getElementById('file-upload-acta') as HTMLInputElement;
                                if (input) input.value = '';
                              }}
                              variant="outline"
                              size="sm"
                              className="mt-3"
                            >
                              Cambiar archivo
                            </Button>
                          </>
                        ) : (
                          <>
                            <Upload className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                            <p className="font-bold text-gray-900 mb-1">
                              Click para seleccionar archivo
                            </p>
                            <p className="text-sm text-gray-600">
                              Formatos: PDF, Word (.doc, .docx)
                            </p>
                          </>
                        )}
                      </div>
                    </Card>
                  </label>
                </div>

                {/* Barra de Progreso */}
                {cargando && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold text-gray-700">Creando acta...</span>
                      <span className="text-gray-600">{progreso}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: modalCrearActa.tipo.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progreso}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer del Modal Secundario */}
              <div className="p-4 border-t bg-gray-50 flex justify-between">
                <Button 
                  onClick={() => {
                    setModalCrearActa({ show: false, tipo: null });
                    setArchivoSeleccionado(null);
                  }}
                  variant="outline"
                  disabled={cargando}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    if (!archivoSeleccionado) {
                      toast.error('Error', {
                        description: 'Debes seleccionar un archivo'
                      });
                      return;
                    }

                    // Simular carga
                    setCargando(true);
                    setProgreso(0);

                    const interval = setInterval(() => {
                      setProgreso(prev => {
                        if (prev >= 100) {
                          clearInterval(interval);
                          
                          // Generar número de acta
                          const numeroActa = `ACTA-${String(actasLocal.length + 1).padStart(3, '0')}-2025`;
                          
                          // Crear nueva acta
                          const nuevaActa = {
                            id: `ac${Date.now()}`,
                            numero: numeroActa,
                            tipo: modalCrearActa.tipo!.nombre,
                            fecha: new Date().toISOString().split('T')[0],
                            participantes: 0,
                            firmada: false
                          };

                          setActasLocal(prev => [nuevaActa, ...prev]);

                          // Finalizar
                          setTimeout(() => {
                            setCargando(false);
                            setProgreso(0);
                            setModalCrearActa({ show: false, tipo: null });
                            setArchivoSeleccionado(null);
                            
                            toast.success('Acta creada exitosamente', {
                              description: `${numeroActa} - ${modalCrearActa.tipo!.nombre}`
                            });
                          }, 500);
                          
                          return 100;
                        }
                        return prev + 10;
                      });
                    }, 100);
                  }}
                  style={{ background: modalCrearActa.tipo.color, color: '#FFFFFF' }}
                  disabled={cargando || !archivoSeleccionado}
                >
                  {cargando ? (
                    <>
                      <Upload className="w-4 h-4 mr-2 animate-pulse" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Crear Acta
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==================== MODAL HISTORIAL DE AUDITORÍA ====================
interface ModalHistorialProps {
  proceso: Proceso;
  onClose: () => void;
}

export function ModalHistorialAuditoria({ proceso, onClose }: ModalHistorialProps) {
  const actividades = [
    {
      id: 'h1',
      tipo: 'carga',
      usuario: 'Juan Pérez',
      fecha: '2025-01-12 14:30',
      accion: 'Subió documento',
      detalle: 'Auto de Indagación Preliminar v3.pdf'
    },
    {
      id: 'h2',
      tipo: 'modificacion',
      usuario: 'María Torres',
      fecha: '2025-01-12 10:15',
      accion: 'Modificó proceso',
      detalle: 'Cambió etapa a Indagación Preliminar'
    },
    {
      id: 'h3',
      tipo: 'visualizacion',
      usuario: 'Carlos Gómez',
      fecha: '2025-01-11 16:45',
      accion: 'Consultó expediente',
      detalle: 'Descargó Auto de Apertura'
    },
    {
      id: 'h4',
      tipo: 'notificacion',
      usuario: 'Sistema',
      fecha: '2025-01-10 09:00',
      accion: 'Envió notificación',
      detalle: 'Auto de Apertura notificado por correo'
    }
  ];

  const tipoIcono: any = {
    carga: Upload,
    modificacion: Edit2,
    visualizacion: Eye,
    notificacion: Bell,
    eliminacion: Trash2
  };

  const tipoColor: any = {
    carga: '#10B981',
    modificacion: '#F59E0B',
    visualizacion: '#3B82F6',
    notificacion: '#8B5CF6',
    eliminacion: '#DC2626'
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-start justify-center pt-16 sm:pt-20 z-[150] p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-gray-50 to-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl" style={{ background: '#F3F4F6' }}>
                <History className="w-6 h-6" style={{ color: '#6B7280' }} />
              </div>
              <div>
                <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                  Historial de Auditoría
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {proceso.numeroProceso} - Trazabilidad Completa
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/50 rounded-lg">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Todas
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Cargas
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Modificaciones
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Visualizaciones
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              Notificaciones
            </Badge>
          </div>
        </div>

        {/* Contenido - Timeline */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 260px)' }}>
          <div className="space-y-4 relative">
            {/* Línea vertical */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"></div>

            {actividades.map((actividad, index) => {
              const Icono = tipoIcono[actividad.tipo];
              const color = tipoColor[actividad.tipo];

              return (
                <div key={actividad.id} className="relative pl-16">
                  {/* Icono en timeline */}
                  <div
                    className="absolute left-3 p-2 rounded-full bg-white border-4"
                    style={{ borderColor: color + '40' }}
                  >
                    <Icono className="w-4 h-4" style={{ color }} />
                  </div>

                  {/* Contenido */}
                  <Card className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-bold text-gray-900">{actividad.accion}</p>
                          <Badge style={{ background: color + '20', color }}>
                            {actividad.tipo}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{actividad.detalle}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {actividad.usuario}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {actividad.fecha}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Historial
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}