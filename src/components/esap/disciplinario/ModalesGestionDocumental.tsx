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
  FileSignature, Send, Save, Printer, Copy, Share2, Package, Tag,
  Paperclip, MessageSquare, UserCheck, AlertTriangle, Info, Users
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

interface Proceso {
  numeroProceso: string;
  denunciado: string;
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

  // Mock data de autos
  const autos = [
    {
      id: 'a1',
      numero: 'AUTO-001-2025',
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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
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
                  {proceso.numeroProceso} - {proceso.denunciado}
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
                      <Button size="sm" variant="outline">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Printer className="w-3.5 h-3.5" />
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
  const evidencias = [
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
  ];

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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
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
                    <Button size="sm" variant="outline">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Botón de Subir */}
          <Card
            className="mt-4 p-8 border-2 border-dashed cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onSubirEvidencia}
          >
            <div className="text-center">
              <Upload className="w-12 h-12 mx-auto mb-3" style={{ color: '#F59E0B' }} />
              <p className="font-bold text-gray-900 mb-1">Subir Nueva Evidencia</p>
              <p className="text-sm text-gray-600">Click para seleccionar archivos</p>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button
            onClick={onSubirEvidencia}
            style={{ background: '#F59E0B', color: '#FFFFFF' }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Subir Evidencias
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
  const oficios = [
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
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
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
                    <Button size="sm" variant="outline">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Crear Nuevo */}
          <Card
            className="mt-4 p-8 border-2 border-dashed cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={onCrearOficio}
          >
            <div className="text-center">
              <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: '#06B6D4' }} />
              <p className="font-bold text-gray-900 mb-1">Crear Nuevo Oficio</p>
              <p className="text-sm text-gray-600">Generar comunicación oficial</p>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-between">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
          <Button onClick={onCrearOficio} style={{ background: '#06B6D4', color: '#FFFFFF' }}>
            <Plus className="w-4 h-4 mr-2" />
            Crear Oficio
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
  const actas = [
    {
      id: 'ac1',
      numero: 'ACTA-001-2025',
      tipo: 'Versión Libre',
      fecha: '2025-01-12',
      participantes: 3,
      firmada: true
    }
  ];

  const tiposActa = [
    { id: 'version', nombre: 'Versión Libre', icon: MessageSquare },
    { id: 'audiencia', nombre: 'Audiencia', icon: Users },
    { id: 'descargos', nombre: 'Descargos', icon: FileText },
    { id: 'diligencia', nombre: 'Diligencia', icon: FileCheck }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
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
                    <Button size="sm" variant="outline">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="outline">
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
                    toast.success('Crear Acta', {
                      description: `Preparando acta de ${tipo.nombre}`
                    });
                  }}
                  className="p-4 border-2 rounded-xl hover:shadow-md transition-all text-left group"
                  style={{ borderColor: '#DC262640' }}
                >
                  <tipo.icon className="w-6 h-6 mb-2" style={{ color: '#DC2626' }} />
                  <p className="font-bold text-sm text-gray-900">{tipo.nombre}</p>
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
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
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