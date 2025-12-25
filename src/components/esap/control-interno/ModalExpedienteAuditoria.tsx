/**
 * ============================================
 * MODAL DE EXPEDIENTE DE AUDITORÍA - COMPLETO
 * ============================================
 * 
 * Componente modal para mostrar el expediente completo de una auditoría
 * con todas sus secciones y datos detallados.
 * 
 * SECCIONES:
 * 1. Información General
 * 2. Equipo Auditor
 * 3. Alcance y Objetivos
 * 4. Hallazgos Detectados
 * 5. Documentos Adjuntos
 * 6. Timeline de Estados
 * 7. Métricas y Progreso
 */

import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, Users, Target, AlertTriangle, FileText,
  Clock, CheckCircle, Download, Upload, Eye, TrendingUp,
  MapPin, Shield, User, Hash, Activity, ChevronRight
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';

// ============ TIPOS ============

type EstadoAuditoria =
  | 'Planeación'
  | 'Ejecución'
  | 'Comunicación'
  | 'Seguimiento'
  | 'Finalizada';

type RiesgoAuditoria = 'Alto' | 'Medio' | 'Bajo';
type SemaforoColor = 'verde' | 'amarillo' | 'rojo';

interface Persona {
  nombre: string;
  cargo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
}

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoAuditoria;
  riesgo: RiesgoAuditoria;
  semaforo: SemaforoColor;
  territorial: string;
  auditorLider: Persona;
  auditorAsignado: Persona;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
  hallazgos: number;
  diasRestantes: number;
  porcentajeTiempo: number;
  ultimaActuacion: string;
  objetivos: { id: string, descripcion: string }[];
  calificacionRiesgo: string;
  documentos: number;
  informes: number;
}

interface Hallazgo {
  id: string;
  codigo: string;
  titulo: string;
  tipo: string;
  nivelRiesgo: string;
  estado: string;
  fecha: string;
}

interface Documento {
  id: string;
  nombre: string;
  tipo: string;
  fecha: string;
  tamano: string;
  autor: string;
}

interface EventoTimeline {
  id: string;
  fecha: string;
  hora: string;
  evento: string;
  responsable: string;
  tipo: 'inicio' | 'cambio' | 'hito' | 'finalizacion';
}

interface ModalExpedienteProps {
  auditoria: Auditoria | null;
  open: boolean;
  onClose: () => void;
}

// ============ DATOS MOCK ============

const HALLAZGOS_MOCK: Record<string, Hallazgo[]> = {
  'aud-001': [
    {
      id: 'h1',
      codigo: 'HALL-2025-001',
      titulo: 'Inconsistencias en documentación administrativa',
      tipo: 'No Conformidad Menor',
      nivelRiesgo: 'Medio',
      estado: 'Detectado',
      fecha: '2025-01-15'
    },
    {
      id: 'h2',
      codigo: 'HALL-2025-002',
      titulo: 'Retraso en actualización de inventarios',
      tipo: 'Observación',
      nivelRiesgo: 'Bajo',
      estado: 'En Validación',
      fecha: '2025-01-18'
    }
  ],
  'aud-004': [
    {
      id: 'h3',
      codigo: 'HALL-2025-012',
      titulo: 'Falta de evaluaciones de desempeño',
      tipo: 'No Conformidad Mayor',
      nivelRiesgo: 'Alto',
      estado: 'Detectado',
      fecha: '2025-01-10'
    },
    {
      id: 'h4',
      codigo: 'HALL-2025-013',
      titulo: 'Ausencia de plan de capacitación',
      tipo: 'No Conformidad Menor',
      nivelRiesgo: 'Medio',
      estado: 'En Plan',
      fecha: '2025-01-12'
    },
    {
      id: 'h5',
      codigo: 'HALL-2025-014',
      titulo: 'Inconsistencias en hojas de vida',
      tipo: 'Observación',
      nivelRiesgo: 'Bajo',
      estado: 'Validado',
      fecha: '2025-01-14'
    }
  ]
};

const DOCUMENTOS_MOCK: Record<string, Documento[]> = {
  'aud-001': [
    {
      id: 'd1',
      nombre: 'Plan de Auditoría 2025',
      tipo: 'PDF',
      fecha: '2025-01-05',
      tamano: '2.3 MB',
      autor: 'Juan Pérez'
    },
    {
      id: 'd2',
      nombre: 'Matriz de Riesgos',
      tipo: 'Excel',
      fecha: '2025-01-08',
      tamano: '1.1 MB',
      autor: 'Juan Pérez'
    },
    {
      id: 'd3',
      nombre: 'Checklist de Verificación',
      tipo: 'PDF',
      fecha: '2025-01-10',
      tamano: '856 KB',
      autor: 'María López'
    }
  ],
  'aud-004': [
    {
      id: 'd4',
      nombre: 'Informe Preliminar',
      tipo: 'Word',
      fecha: '2025-01-15',
      tamano: '3.2 MB',
      autor: 'Carlos Rodríguez'
    },
    {
      id: 'd5',
      nombre: 'Evidencias Fotográficas',
      tipo: 'ZIP',
      fecha: '2025-01-16',
      tamano: '15.8 MB',
      autor: 'Ana Martínez'
    },
    {
      id: 'd6',
      nombre: 'Acta de Apertura',
      tipo: 'PDF',
      fecha: '2025-01-08',
      tamano: '445 KB',
      autor: 'Carlos Rodríguez'
    },
    {
      id: 'd7',
      nombre: 'Papeles de Trabajo',
      tipo: 'PDF',
      fecha: '2025-01-18',
      tamano: '5.6 MB',
      autor: 'Carlos Rodríguez'
    }
  ]
};

const TIMELINE_MOCK: Record<string, EventoTimeline[]> = {
  'aud-001': [
    {
      id: 't1',
      fecha: '2025-01-05',
      hora: '09:00',
      evento: 'Auditoría creada',
      responsable: 'Sistema',
      tipo: 'inicio'
    },
    {
      id: 't2',
      fecha: '2025-01-05',
      hora: '10:30',
      evento: 'Equipo auditor asignado',
      responsable: 'Jefe OCI',
      tipo: 'cambio'
    },
    {
      id: 't3',
      fecha: '2025-01-08',
      hora: '14:00',
      evento: 'Plan de auditoría aprobado',
      responsable: 'Jefe OCI',
      tipo: 'hito'
    },
    {
      id: 't4',
      fecha: '2025-01-10',
      hora: '11:00',
      evento: 'Inicio de campo programado',
      responsable: 'Juan Pérez',
      tipo: 'cambio'
    }
  ],
  'aud-004': [
    {
      id: 't5',
      fecha: '2025-01-08',
      hora: '08:00',
      evento: 'Auditoría iniciada',
      responsable: 'Sistema',
      tipo: 'inicio'
    },
    {
      id: 't6',
      fecha: '2025-01-08',
      hora: '09:30',
      evento: 'Reunión de apertura realizada',
      responsable: 'Carlos Rodríguez',
      tipo: 'hito'
    },
    {
      id: 't7',
      fecha: '2025-01-10',
      hora: '15:00',
      evento: 'Primer hallazgo detectado',
      responsable: 'Carlos Rodríguez',
      tipo: 'cambio'
    },
    {
      id: 't8',
      fecha: '2025-01-15',
      hora: '10:00',
      evento: 'Estado cambiado a Ejecución',
      responsable: 'Jefe OCI',
      tipo: 'cambio'
    },
    {
      id: 't9',
      fecha: '2025-01-18',
      hora: '16:30',
      evento: 'Informe preliminar cargado',
      responsable: 'Carlos Rodríguez',
      tipo: 'hito'
    }
  ]
};

// ============ UTILIDADES ============

const formatearFecha = (fecha: string) => {
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const getRiesgoColor = (riesgo: RiesgoAuditoria) => {
  const colores = {
    'Alto': 'bg-red-100 text-red-700 border-red-200',
    'Medio': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'Bajo': 'bg-green-100 text-green-700 border-green-200'
  };
  return colores[riesgo];
};

const getEstadoColor = (estado: EstadoAuditoria) => {
  const colores = {
    'Planeación': 'bg-blue-100 text-blue-700',
    'Ejecución': 'bg-purple-100 text-purple-700',
    'Comunicación': 'bg-orange-100 text-orange-700',
    'Seguimiento': 'bg-teal-100 text-teal-700',
    'Finalizada': 'bg-green-100 text-green-700'
  };
  return colores[estado];
};

const getSemaforoColor = (semaforo: SemaforoColor) => {
  const colores = {
    'verde': 'bg-green-500',
    'amarillo': 'bg-yellow-500',
    'rojo': 'bg-red-500'
  };
  return colores[semaforo];
};

const getTimelineIcon = (tipo: EventoTimeline['tipo']) => {
  const iconos = {
    'inicio': <Activity className="w-4 h-4" />,
    'cambio': <ChevronRight className="w-4 h-4" />,
    'hito': <CheckCircle className="w-4 h-4" />,
    'finalizacion': <Target className="w-4 h-4" />
  };
  return iconos[tipo];
};

const getTimelineColor = (tipo: EventoTimeline['tipo']) => {
  const colores = {
    'inicio': 'bg-blue-500',
    'cambio': 'bg-gray-500',
    'hito': 'bg-green-500',
    'finalizacion': 'bg-purple-500'
  };
  return colores[tipo];
};

// ============ COMPONENTE PRINCIPAL ============

export function ModalExpedienteAuditoria({ auditoria, open, onClose }: ModalExpedienteProps) {
  if (!auditoria) return null;

  const hallazgos = HALLAZGOS_MOCK[auditoria.id] || [];
  const documentos = DOCUMENTOS_MOCK[auditoria.id] || [];
  const timeline = TIMELINE_MOCK[auditoria.id] || [];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* OVERLAY */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[110]"
            onClick={onClose}
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[111] w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] lg:w-full lg:max-w-7xl max-h-[90vh]"
          >
            <div className="bg-white rounded-lg shadow-2xl w-full h-full max-h-[90vh] flex flex-col">
              {/* HEADER */}
              <div className="flex items-start justify-between p-6 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Shield className="w-6 h-6" style={{ color: '#003DA5' }} />
                    <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                      Expediente de Auditoría
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-sm font-mono">
                      {auditoria.codigo}
                    </Badge>
                    <Badge className={getEstadoColor(auditoria.estado)}>
                      {auditoria.estado}
                    </Badge>
                    <Badge className={getRiesgoColor(auditoria.riesgo)} variant="outline">
                      Riesgo {auditoria.riesgo}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded-full ${getSemaforoColor(auditoria.semaforo)}`}></div>
                      <span className="text-xs text-gray-600">Semáforo</span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="ml-4"
                  aria-label="Cerrar modal"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* CONTENIDO SCROLLEABLE */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* INFORMACIÓN GENERAL */}
                  <section className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Información General
                    </h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Título</label>
                        <p className="text-gray-900">{auditoria.titulo}</p>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1">Descripción</label>
                        <p className="text-gray-600">{auditoria.descripcion}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1 flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            Territorial
                          </label>
                          <p className="text-gray-900">{auditoria.territorial}</p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Fecha Inicio
                          </label>
                          <p className="text-gray-900">{formatearFecha(auditoria.fechaInicio)}</p>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Fecha Fin
                          </label>
                          <p className="text-gray-900">{formatearFecha(auditoria.fechaFin)}</p>
                        </div>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1 flex items-center gap-1">
                          <AlertTriangle className="w-4 h-4" />
                          Calificación de Riesgo
                        </label>
                        <p className="text-gray-600">{auditoria.calificacionRiesgo}</p>
                      </div>
                    </div>
                  </section>

                  {/* EQUIPO AUDITOR */}
                  <section className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Equipo Auditor
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Auditor Líder */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12" style={{ backgroundColor: '#003DA5' }}>
                            <AvatarFallback className="text-white font-bold">
                              {auditoria.auditorLider.iniciales}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-gray-900">{auditoria.auditorLider.nombre}</p>
                              <Badge variant="outline" className="text-xs">Líder</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{auditoria.auditorLider.cargo}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Hash className="w-3 h-3" />
                              <span>{auditoria.auditorLider.tipoIdentificacion} {auditoria.auditorLider.numeroIdentificacion}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Auditor Asignado */}
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start gap-3">
                          <Avatar className="w-12 h-12 bg-gray-600">
                            <AvatarFallback className="text-white font-bold">
                              {auditoria.auditorAsignado.iniciales}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-gray-900">{auditoria.auditorAsignado.nombre}</p>
                              <Badge variant="outline" className="text-xs">Asignado</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{auditoria.auditorAsignado.cargo}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Hash className="w-3 h-3" />
                              <span>{auditoria.auditorAsignado.tipoIdentificacion} {auditoria.auditorAsignado.numeroIdentificacion}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* ALCANCE Y OBJETIVOS */}
                  <section className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Alcance y Objetivos
                    </h3>

                    <div className="space-y-2">
                      {auditoria.objetivos.map((objetivo, index) => (
                        <div key={objetivo.id} className="flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <p className="text-gray-700">{objetivo.descripcion}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* MÉTRICAS Y PROGRESO */}
                  <section className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" style={{ color: '#003DA5' }} />
                      Métricas y Progreso
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                        <div className="text-3xl font-black mb-1" style={{ color: '#003DA5' }}>
                          {auditoria.progreso}%
                        </div>
                        <div className="text-xs text-gray-600">Progreso</div>
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${auditoria.progreso}%`,
                              backgroundColor: '#003DA5'
                            }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                        <div className="text-3xl font-black text-red-600 mb-1">
                          {auditoria.hallazgos}
                        </div>
                        <div className="text-xs text-gray-600">Hallazgos</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                        <div className="text-3xl font-black text-blue-600 mb-1">
                          {auditoria.documentos}
                        </div>
                        <div className="text-xs text-gray-600">Documentos</div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200 text-center">
                        <div className="text-3xl font-black text-green-600 mb-1">
                          {auditoria.informes}
                        </div>
                        <div className="text-xs text-gray-600">Informes</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Días Restantes</span>
                          <span className="text-xl font-bold text-gray-900">{auditoria.diasRestantes}</span>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Tiempo Transcurrido</span>
                          <span className="text-xl font-bold text-gray-900">{auditoria.porcentajeTiempo}%</span>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* HALLAZGOS DETECTADOS */}
                  {hallazgos.length > 0 && (
                    <section className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" style={{ color: '#003DA5' }} />
                        Hallazgos Detectados ({hallazgos.length})
                      </h3>

                      <div className="space-y-3">
                        {hallazgos.map((hallazgo) => (
                          <div key={hallazgo.id} className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="outline" className="text-xs font-mono">
                                    {hallazgo.codigo}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {hallazgo.tipo}
                                  </Badge>
                                  <Badge 
                                    className={`text-xs ${
                                      hallazgo.nivelRiesgo === 'Alto' 
                                        ? 'bg-red-100 text-red-700' 
                                        : hallazgo.nivelRiesgo === 'Medio'
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}
                                  >
                                    {hallazgo.nivelRiesgo}
                                  </Badge>
                                </div>
                                <p className="font-medium text-gray-900 mb-1">{hallazgo.titulo}</p>
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatearFecha(hallazgo.fecha)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Activity className="w-3 h-3" />
                                    {hallazgo.estado}
                                  </span>
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" title="Ver detalle del hallazgo">
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* DOCUMENTOS ADJUNTOS */}
                  {documentos.length > 0 && (
                    <section className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" style={{ color: '#003DA5' }} />
                        Documentos Adjuntos ({documentos.length})
                      </h3>

                      <div className="space-y-2">
                        {documentos.map((doc) => (
                          <div key={doc.id} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <FileText className="w-5 h-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{doc.nombre}</p>
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span>{doc.tipo}</span>
                                  <span>•</span>
                                  <span>{doc.tamano}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {doc.autor}
                                  </span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatearFecha(doc.fecha)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" title="Ver documento">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Descargar documento">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4">
                        <Button variant="outline" className="w-full">
                          <Upload className="w-4 h-4 mr-2" />
                          Cargar nuevo documento
                        </Button>
                      </div>
                    </section>
                  )}

                  {/* TIMELINE DE ESTADOS */}
                  {timeline.length > 0 && (
                    <section className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" style={{ color: '#003DA5' }} />
                        Historial de Cambios
                      </h3>

                      <div className="relative">
                        {/* Línea vertical */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                        <div className="space-y-4">
                          {timeline.map((evento, index) => (
                            <div key={evento.id} className="relative pl-12">
                              {/* Punto en la línea */}
                              <div 
                                className={`absolute left-0 w-8 h-8 rounded-full ${getTimelineColor(evento.tipo)} flex items-center justify-center text-white`}
                              >
                                {getTimelineIcon(evento.tipo)}
                              </div>

                              <div className="bg-white rounded-lg p-4 border border-gray-200">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900 mb-1">{evento.evento}</p>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {formatearFecha(evento.fecha)}
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {evento.hora}
                                      </span>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {evento.responsable}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )}

                  {/* ÚLTIMA ACTUACIÓN */}
                  <section className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-900 mb-1">Última Actuación</p>
                        <p className="text-sm text-blue-700">{auditoria.ultimaActuacion}</p>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Última actualización: Hoy a las {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Cerrar
                  </Button>
                  <Button style={{ backgroundColor: '#003DA5' }} className="text-white">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}