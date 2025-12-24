/**
 * Modal: Revisar PTAs - Gestión Profesoral
 * Permite revisar, aprobar o rechazar PTAs pendientes
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  FileText,
  User,
  Calendar,
  BarChart3,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  Download,
  Filter,
  Search,
} from 'lucide-react';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner@2.0.3';

interface PTAPendiente {
  id: string;
  codigo: string;
  docente: {
    nombre: string;
    cedula: string;
    tipoVinculacion: 'Planta' | 'Cátedra';
    email: string;
  };
  periodo: string;
  fechaEnvio: string;
  horasAsignadas: number;
  horasBase: number;
  estado: 'Pendiente' | 'En Revisión' | 'Observaciones' | 'Urgente';
  diasPendientes: number;
  prioridad: 'alta' | 'media' | 'baja';
  resumen: {
    docencia: number;
    investigacion: number;
    extension: number;
    administracion: number;
  };
}

interface RevisarPTAsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPTAReviewed?: (ptaId: string, accion: 'aprobar' | 'rechazar' | 'observaciones') => void;
}

export function RevisarPTAsModal({ isOpen, onClose, onPTAReviewed }: RevisarPTAsModalProps) {
  const [selectedPTA, setSelectedPTA] = useState<PTAPendiente | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Mock data - 45 PTAs pendientes
  const ptasPendientes: PTAPendiente[] = [
    {
      id: 'pta_001',
      codigo: 'PTA-2025-045',
      docente: {
        nombre: 'Dr. Carlos Méndez Rivera',
        cedula: '1234567890',
        tipoVinculacion: 'Planta',
        email: 'carlos.mendez@esap.edu.co',
      },
      periodo: '2025-1',
      fechaEnvio: '2024-11-26T10:00:00Z',
      horasAsignadas: 1450,
      horasBase: 1600,
      estado: 'Urgente',
      diasPendientes: 2,
      prioridad: 'alta',
      resumen: {
        docencia: 640,
        investigacion: 480,
        extension: 160,
        administracion: 170,
      },
    },
    {
      id: 'pta_002',
      codigo: 'PTA-2025-046',
      docente: {
        nombre: 'Dra. Ana Gutiérrez López',
        cedula: '0987654321',
        tipoVinculacion: 'Planta',
        email: 'ana.gutierrez@esap.edu.co',
      },
      periodo: '2025-1',
      fechaEnvio: '2024-11-25T14:30:00Z',
      horasAsignadas: 1580,
      horasBase: 1600,
      estado: 'En Revisión',
      diasPendientes: 3,
      prioridad: 'media',
      resumen: {
        docencia: 720,
        investigacion: 400,
        extension: 240,
        administracion: 220,
      },
    },
    {
      id: 'pta_003',
      codigo: 'PTA-2025-047',
      docente: {
        nombre: 'Mg. Roberto Silva Castro',
        cedula: '1122334455',
        tipoVinculacion: 'Cátedra',
        email: 'roberto.silva@esap.edu.co',
      },
      periodo: '2025-1',
      fechaEnvio: '2024-11-27T09:15:00Z',
      horasAsignadas: 1350,
      horasBase: 1600,
      estado: 'Observaciones',
      diasPendientes: 1,
      prioridad: 'alta',
      resumen: {
        docencia: 800,
        investigacion: 320,
        extension: 130,
        administracion: 100,
      },
    },
    {
      id: 'pta_004',
      codigo: 'PTA-2025-048',
      docente: {
        nombre: 'Dra. María Fernández Ruiz',
        cedula: '5566778899',
        tipoVinculacion: 'Planta',
        email: 'maria.fernandez@esap.edu.co',
      },
      periodo: '2025-1',
      fechaEnvio: '2024-11-24T16:45:00Z',
      horasAsignadas: 1520,
      horasBase: 1600,
      estado: 'Pendiente',
      diasPendientes: 4,
      prioridad: 'baja',
      resumen: {
        docencia: 680,
        investigacion: 440,
        extension: 200,
        administracion: 200,
      },
    },
    {
      id: 'pta_005',
      codigo: 'PTA-2025-049',
      docente: {
        nombre: 'Dr. Luis Ramírez González',
        cedula: '2233445566',
        tipoVinculacion: 'Planta',
        email: 'luis.ramirez@esap.edu.co',
      },
      periodo: '2025-1',
      fechaEnvio: '2024-11-23T11:20:00Z',
      horasAsignadas: 1480,
      horasBase: 1600,
      estado: 'Pendiente',
      diasPendientes: 5,
      prioridad: 'media',
      resumen: {
        docencia: 660,
        investigacion: 420,
        extension: 220,
        administracion: 180,
      },
    },
  ];

  const ptasFiltradas = ptasPendientes.filter((pta) => {
    const matchEstado = filtroEstado === 'todos' || pta.estado === filtroEstado;
    const matchBusqueda =
      busqueda === '' ||
      pta.docente.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      pta.codigo.toLowerCase().includes(busqueda.toLowerCase());
    return matchEstado && matchBusqueda;
  });

  const handleAprobar = (pta: PTAPendiente) => {
    toast.success(`PTA ${pta.codigo} aprobado`, {
      description: `El PTA de ${pta.docente.nombre} ha sido aprobado exitosamente.`,
    });
    onPTAReviewed?.(pta.id, 'aprobar');
    setSelectedPTA(null);
  };

  const handleRechazar = (pta: PTAPendiente) => {
    if (!comentarios.trim()) {
      toast.error('Debe agregar comentarios para rechazar un PTA');
      return;
    }
    toast.error(`PTA ${pta.codigo} rechazado`, {
      description: `Se ha notificado a ${pta.docente.nombre}.`,
    });
    onPTAReviewed?.(pta.id, 'rechazar');
    setSelectedPTA(null);
    setComentarios('');
  };

  const handleObservaciones = (pta: PTAPendiente) => {
    if (!comentarios.trim()) {
      toast.error('Debe agregar observaciones');
      return;
    }
    toast.info(`Observaciones enviadas`, {
      description: `${pta.docente.nombre} ha sido notificado.`,
    });
    onPTAReviewed?.(pta.id, 'observaciones');
    setSelectedPTA(null);
    setComentarios('');
  };

  const getEstadoBadge = (estado: PTAPendiente['estado']) => {
    const estilos = {
      Urgente: 'bg-red-100 text-red-800 border-red-300',
      'En Revisión': 'bg-blue-100 text-blue-800 border-blue-300',
      Observaciones: 'bg-amber-100 text-amber-800 border-amber-300',
      Pendiente: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return estilos[estado] || estilos.Pendiente;
  };

  const getPrioridadIcon = (prioridad: PTAPendiente['prioridad']) => {
    if (prioridad === 'alta') return <AlertTriangle className="w-4 h-4 text-red-600" />;
    if (prioridad === 'media') return <Clock className="w-4 h-4 text-amber-600" />;
    return <CheckCircle className="w-4 h-4 text-green-600" />;
  };

  const calcularProgreso = (asignadas: number, base: number) => {
    return Math.round((asignadas / base) * 100);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl mb-1">📄 Revisar PTAs Pendientes</h2>
                <p className="text-sm text-blue-100">
                  {ptasFiltradas.length} PTAs requieren revisión
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Filtros */}
            <div className="mt-4 flex flex-col sm:flex-row gap-3">
              {/* Búsqueda */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200" />
                <input
                  type="text"
                  placeholder="Buscar por docente o código PTA..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-200 focus:outline-none focus:bg-white/20 focus:border-white/40"
                />
              </div>

              {/* Filtro Estado */}
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:bg-white/20 cursor-pointer"
              >
                <option value="todos">Todos los estados</option>
                <option value="Urgente">Urgente</option>
                <option value="En Revisión">En Revisión</option>
                <option value="Observaciones">Observaciones</option>
                <option value="Pendiente">Pendiente</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedPTA ? (
              /* Vista Detalle del PTA */
              <div className="space-y-6">
                {/* Header del PTA */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl">{selectedPTA.codigo}</h3>
                      <Badge className={getEstadoBadge(selectedPTA.estado)}>
                        {selectedPTA.estado}
                      </Badge>
                      {getPrioridadIcon(selectedPTA.prioridad)}
                    </div>
                    <p className="text-gray-600">
                      Enviado el{' '}
                      {new Date(selectedPTA.fechaEnvio).toLocaleDateString('es-CO', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedPTA(null)}>
                    ← Volver a la lista
                  </Button>
                </div>

                {/* Info del Docente */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl">
                      {selectedPTA.docente.nombre.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl mb-1">{selectedPTA.docente.nombre}</h4>
                      <p className="text-sm text-gray-600">
                        CC: {selectedPTA.docente.cedula} • {selectedPTA.docente.email}
                      </p>
                      <Badge className="mt-1">
                        {selectedPTA.docente.tipoVinculacion === 'Planta'
                          ? '🟣 Docente de Planta'
                          : '🔵 Docente de Cátedra'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Distribución de Horas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Resumen de Horas */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                    <h5 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                      Distribución de Horas
                    </h5>
                    <div className="space-y-4">
                      {[
                        {
                          label: 'Docencia',
                          horas: selectedPTA.resumen.docencia,
                          color: 'bg-blue-500',
                        },
                        {
                          label: 'Investigación',
                          horas: selectedPTA.resumen.investigacion,
                          color: 'bg-purple-500',
                        },
                        {
                          label: 'Extensión',
                          horas: selectedPTA.resumen.extension,
                          color: 'bg-green-500',
                        },
                        {
                          label: 'Administración',
                          horas: selectedPTA.resumen.administracion,
                          color: 'bg-amber-500',
                        },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{item.label}</span>
                            <span className="text-gray-600">{item.horas} horas</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`${item.color} h-2 rounded-full`}
                              style={{
                                width: `${(item.horas / selectedPTA.horasBase) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 pt-6 border-t-2 border-gray-200">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-bold">Total Asignado</span>
                        <span className="font-bold">
                          {selectedPTA.horasAsignadas} / {selectedPTA.horasBase} horas
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${
                            calcularProgreso(
                              selectedPTA.horasAsignadas,
                              selectedPTA.horasBase
                            ) >= 90
                              ? 'bg-green-500'
                              : calcularProgreso(
                                  selectedPTA.horasAsignadas,
                                  selectedPTA.horasBase
                                ) >= 75
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{
                            width: `${calcularProgreso(
                              selectedPTA.horasAsignadas,
                              selectedPTA.horasBase
                            )}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1 text-center">
                        {calcularProgreso(selectedPTA.horasAsignadas, selectedPTA.horasBase)}%
                        completado
                      </p>
                    </div>
                  </div>

                  {/* Acciones y Comentarios */}
                  <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                    <h5 className="font-bold text-lg mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                      Observaciones y Comentarios
                    </h5>
                    <textarea
                      value={comentarios}
                      onChange={(e) => setComentarios(e.target.value)}
                      placeholder="Agregar observaciones, correcciones o comentarios..."
                      className="w-full h-40 p-4 border-2 border-gray-300 rounded-xl focus:border-blue-600 focus:outline-none resize-none"
                    />

                    <div className="mt-4 space-y-2">
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAprobar(selectedPTA)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Aprobar PTA
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-amber-600 text-amber-600 hover:bg-amber-50"
                        onClick={() => handleObservaciones(selectedPTA)}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Enviar Observaciones
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-red-600 text-red-600 hover:bg-red-50"
                        onClick={() => handleRechazar(selectedPTA)}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Rechazar PTA
                      </Button>
                    </div>

                    <Button variant="ghost" className="w-full mt-2" onClick={() => {}}>
                      <Download className="w-4 h-4 mr-2" />
                      Descargar PTA Completo
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Lista de PTAs */
              <div className="space-y-3">
                {ptasFiltradas.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">No se encontraron PTAs con los filtros aplicados</p>
                  </div>
                ) : (
                  ptasFiltradas.map((pta) => (
                    <motion.div
                      key={pta.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-bold text-lg">{pta.codigo}</h4>
                            <Badge className={getEstadoBadge(pta.estado)}>{pta.estado}</Badge>
                            {getPrioridadIcon(pta.prioridad)}
                            {pta.diasPendientes <= 2 && (
                              <Badge className="bg-red-100 text-red-800 border-red-300">
                                ⏰ {pta.diasPendientes} días
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{pta.docente.nombre}</span>
                            <span className="text-gray-400">•</span>
                            <Badge variant="outline" className="text-xs">
                              {pta.docente.tipoVinculacion}
                            </Badge>
                            <span className="text-gray-400">•</span>
                            <Calendar className="w-4 h-4" />
                            <span>Período {pta.periodo}</span>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <BarChart3 className="w-4 h-4 text-blue-600" />
                              <span className="text-gray-600">
                                {pta.horasAsignadas} / {pta.horasBase} horas
                              </span>
                            </div>
                            <div className="flex-1 max-w-xs">
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    calcularProgreso(pta.horasAsignadas, pta.horasBase) >= 90
                                      ? 'bg-green-500'
                                      : calcularProgreso(pta.horasAsignadas, pta.horasBase) >= 75
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{
                                    width: `${calcularProgreso(
                                      pta.horasAsignadas,
                                      pta.horasBase
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                            <span className="text-gray-600 font-medium">
                              {calcularProgreso(pta.horasAsignadas, pta.horasBase)}%
                            </span>
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPTA(pta);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Revisar
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {!selectedPTA && (
            <div className="border-t-2 border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Mostrando {ptasFiltradas.length} de {ptasPendientes.length} PTAs
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cerrar
                  </Button>
                  <Button onClick={() => toast.info('Exportando lista de PTAs...')}>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar Lista
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}