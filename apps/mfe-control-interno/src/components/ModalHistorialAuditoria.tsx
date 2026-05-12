/**
 * ============================================
 * MODAL DE HISTORIAL DE AUDITORÍA - COMPLETO
 * ============================================
 * 
 * Componente modal para visualizar el historial completo
 * de cambios y movimientos de una auditoría.
 * 
 * FUNCIONALIDADES:
 * 1. Timeline visual de todos los cambios
 * 2. Filtros por tipo de evento
 * 3. Búsqueda en historial
 * 4. Exportar historial a PDF
 * 5. Ver detalles de cada cambio
 * 6. Comparación de versiones
 * 7. Trazabilidad completa
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, History, Calendar, Clock, User, Activity, CheckCircle,
  AlertCircle, Edit2, Trash2, Upload, Download, FileText,
  ChevronRight, ChevronDown, Search, Filter, RefreshCw,
  ArrowRight, Info, Shield, Eye, MessageSquare, Target
} from 'lucide-react';
import { Button } from '@esap-mfe/shared-ui/button';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Input } from '@esap-mfe/shared-ui/input';
import { getServiceUrl, API_MODE } from '../../../config/environment';
import { toast } from 'sonner';

// URL base para el servicio de Control Interno
const CONTROL_INTERNO_BASE_URL = getServiceUrl('control-institucional');
const SERVICE_PREFIX = API_MODE === 'gateway' ? '/control-institucional/api/v1' : '';

// ============ TIPOS ============

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  estado: string;
}

type TipoEvento =
  | 'creacion'
  | 'cambio_estado'
  | 'asignacion'
  | 'actualizacion'
  | 'documento'
  | 'hallazgo'
  | 'nota'
  | 'aprobacion'
  | 'finalizacion'
  | 'eliminacion'
  | 'archivo'
  | 'ampliacion_plazo';

interface CambioDetalle {
  campo: string;
  valorAnterior: string;
  valorNuevo: string;
}

interface EventoHistorial {
  id: string;
  auditoriaId: string;
  tipo: TipoEvento;
  fecha: string;
  hora: string;
  usuario: string;
  cargoUsuario: string;
  accion: string;
  descripcion: string;
  cambios?: CambioDetalle[];
  documentoAdjunto?: string;
  observaciones?: string;
  ip?: string;
}

interface ModalHistorialProps {
  auditoria: Auditoria | null;
  open: boolean;
  onClose: () => void;
}

// ============ DATOS MOCK ============

const HISTORIAL_MOCK: Record<string, EventoHistorial[]> = {
  'aud-001': [
    {
      id: 'hist-001',
      auditoriaId: 'aud-001',
      tipo: 'creacion',
      fecha: '2025-01-05',
      hora: '09:00:00',
      usuario: 'Sistema SIGL',
      cargoUsuario: 'Sistema',
      accion: 'Creación de auditoría',
      descripcion: 'Se creó la auditoría en el sistema',
      cambios: [
        { campo: 'Estado', valorAnterior: '', valorNuevo: 'Planeación' },
        { campo: 'Código', valorAnterior: '', valorNuevo: 'AUD-2025-001' }
      ],
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-002',
      auditoriaId: 'aud-001',
      tipo: 'asignacion',
      fecha: '2025-01-05',
      hora: '10:30:00',
      usuario: 'María González Díaz',
      cargoUsuario: 'Jefe OCI',
      accion: 'Asignación de equipo auditor',
      descripcion: 'Se asignó el equipo auditor para la auditoría',
      cambios: [
        { campo: 'Auditor Líder', valorAnterior: 'Sin asignar', valorNuevo: 'Juan Pérez Gómez' },
        { campo: 'Auditor Asignado', valorAnterior: 'Sin asignar', valorNuevo: 'Ana María López Silva' }
      ],
      observaciones: 'Se asignó el equipo según disponibilidad y expertise en gestión administrativa',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-003',
      auditoriaId: 'aud-001',
      tipo: 'actualizacion',
      fecha: '2025-01-06',
      hora: '14:15:00',
      usuario: 'Juan Pérez Gómez',
      cargoUsuario: 'Auditor Senior',
      accion: 'Actualización de alcance',
      descripcion: 'Se actualizó el alcance y objetivos de la auditoría',
      cambios: [
        { campo: 'Alcance', valorAnterior: 'Por definir', valorNuevo: 'Evaluación integral de procesos administrativos de la territorial Antioquia' },
        { campo: 'Objetivos', valorAnterior: '0 objetivos', valorNuevo: '2 objetivos definidos' }
      ],
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-004',
      auditoriaId: 'aud-001',
      tipo: 'documento',
      fecha: '2025-01-08',
      hora: '09:45:00',
      usuario: 'Juan Pérez Gómez',
      cargoUsuario: 'Auditor Senior',
      accion: 'Carga de documento',
      descripcion: 'Se cargó el plan de auditoría',
      documentoAdjunto: 'Plan_Auditoria_AUD-2025-001.pdf',
      observaciones: 'Plan de auditoría aprobado por el Jefe OCI',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-005',
      auditoriaId: 'aud-001',
      tipo: 'aprobacion',
      fecha: '2025-01-08',
      hora: '14:00:00',
      usuario: 'María González Díaz',
      cargoUsuario: 'Jefe OCI',
      accion: 'Aprobación de plan',
      descripcion: 'Se aprobó el plan de auditoría',
      observaciones: 'Plan aprobado sin observaciones. Puede iniciarse trabajo de campo.',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-006',
      auditoriaId: 'aud-001',
      tipo: 'nota',
      fecha: '2025-01-10',
      hora: '11:00:00',
      usuario: 'Juan Pérez Gómez',
      cargoUsuario: 'Auditor Senior',
      accion: 'Nota agregada',
      descripcion: 'Se agregó una nota sobre la programación del trabajo de campo',
      observaciones: 'Inicio de campo programado para el 20 de enero',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-007',
      auditoriaId: 'aud-001',
      tipo: 'actualizacion',
      fecha: '2025-01-12',
      hora: '16:20:00',
      usuario: 'Ana María López Silva',
      cargoUsuario: 'Auditor Junior',
      accion: 'Actualización de progreso',
      descripcion: 'Se actualizó el porcentaje de progreso de la auditoría',
      cambios: [
        { campo: 'Progreso', valorAnterior: '10%', valorNuevo: '15%' }
      ],
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-008',
      auditoriaId: 'aud-001',
      tipo: 'documento',
      fecha: '2025-01-15',
      hora: '10:30:00',
      usuario: 'Ana María López Silva',
      cargoUsuario: 'Auditor Junior',
      accion: 'Carga de documento',
      descripcion: 'Se cargó la matriz de riesgos actualizada',
      documentoAdjunto: 'Matriz_Riesgos_AUD-2025-001.xlsx',
      ip: 'IP interna protegida'
    }
  ],
  'aud-004': [
    {
      id: 'hist-101',
      auditoriaId: 'aud-004',
      tipo: 'creacion',
      fecha: '2025-01-08',
      hora: '08:00:00',
      usuario: 'Sistema SIGL',
      cargoUsuario: 'Sistema',
      accion: 'Creación de auditoría',
      descripcion: 'Se creó la auditoría en el sistema',
      cambios: [
        { campo: 'Estado', valorAnterior: '', valorNuevo: 'Planeación' },
        { campo: 'Código', valorAnterior: '', valorNuevo: 'AUD-2025-004' }
      ],
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-102',
      auditoriaId: 'aud-004',
      tipo: 'asignacion',
      fecha: '2025-01-08',
      hora: '09:30:00',
      usuario: 'María González Díaz',
      cargoUsuario: 'Jefe OCI',
      accion: 'Asignación de equipo auditor',
      descripcion: 'Se asignó el equipo auditor para la auditoría',
      cambios: [
        { campo: 'Auditor Líder', valorAnterior: 'Sin asignar', valorNuevo: 'Carlos Ramírez Díaz' },
        { campo: 'Auditor Asignado', valorAnterior: 'Sin asignar', valorNuevo: 'Patricia Gómez Silva' }
      ],
      observaciones: 'Equipo especializado en auditorías de recursos humanos',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-103',
      auditoriaId: 'aud-004',
      tipo: 'aprobacion',
      fecha: '2025-01-10',
      hora: '10:00:00',
      usuario: 'María González Díaz',
      cargoUsuario: 'Jefe OCI',
      accion: 'Aprobación de plan',
      descripcion: 'Se aprobó el plan de auditoría',
      observaciones: 'Plan aprobado. Autorizado inicio de auditoría.',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-104',
      auditoriaId: 'aud-004',
      tipo: 'cambio_estado',
      fecha: '2025-01-15',
      hora: '08:30:00',
      usuario: 'Carlos Ramírez Díaz',
      cargoUsuario: 'Auditor Senior',
      accion: 'Cambio de estado',
      descripcion: 'Se cambió el estado de la auditoría',
      cambios: [
        { campo: 'Estado', valorAnterior: 'Planeación', valorNuevo: 'Ejecución' }
      ],
      observaciones: 'Inicio de trabajo de campo y recolección de evidencias',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-105',
      auditoriaId: 'aud-004',
      tipo: 'documento',
      fecha: '2025-01-15',
      hora: '09:00:00',
      usuario: 'Carlos Ramírez Díaz',
      cargoUsuario: 'Auditor Senior',
      accion: 'Carga de documento',
      descripcion: 'Se cargó acta de reunión de apertura',
      documentoAdjunto: 'Acta_Apertura_AUD-2025-004.pdf',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-106',
      auditoriaId: 'aud-004',
      tipo: 'hallazgo',
      fecha: '2025-01-18',
      hora: '15:30:00',
      usuario: 'Carlos Ramírez Díaz',
      cargoUsuario: 'Auditor Senior',
      accion: 'Hallazgo detectado',
      descripcion: 'Se detectó un hallazgo crítico',
      observaciones: 'HALL-2025-012: Falta de evaluaciones de desempeño (45% pendientes)',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-107',
      auditoriaId: 'aud-004',
      tipo: 'nota',
      fecha: '2025-01-19',
      hora: '10:15:00',
      usuario: 'Patricia Gómez Silva',
      cargoUsuario: 'Auditor',
      accion: 'Nota agregada',
      descripcion: 'Se agregó nota sobre solicitud de documentación',
      observaciones: 'Se solicitó al área de Gestión Humana el plan de capacitación 2025',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-108',
      auditoriaId: 'aud-004',
      tipo: 'hallazgo',
      fecha: '2025-01-20',
      hora: '11:20:00',
      usuario: 'Patricia Gómez Silva',
      cargoUsuario: 'Auditor',
      accion: 'Hallazgo detectado',
      descripcion: 'Se detectó segundo hallazgo',
      observaciones: 'HALL-2025-013: Ausencia de plan de capacitación documentado',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-109',
      auditoriaId: 'aud-004',
      tipo: 'documento',
      fecha: '2025-01-22',
      hora: '14:45:00',
      usuario: 'Carlos Ramírez Díaz',
      cargoUsuario: 'Auditor Senior',
      accion: 'Carga de documento',
      descripcion: 'Se cargó informe preliminar de hallazgos',
      documentoAdjunto: 'Informe_Preliminar_AUD-2025-004.docx',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-110',
      auditoriaId: 'aud-004',
      tipo: 'actualizacion',
      fecha: '2025-01-23',
      hora: '09:30:00',
      usuario: 'Carlos Ramírez Díaz',
      cargoUsuario: 'Auditor Senior',
      accion: 'Actualización de progreso',
      descripcion: 'Se actualizó el progreso de la auditoría',
      cambios: [
        { campo: 'Progreso', valorAnterior: '35%', valorNuevo: '45%' },
        { campo: 'Hallazgos', valorAnterior: '2', valorNuevo: '3' }
      ],
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-111',
      auditoriaId: 'aud-004',
      tipo: 'hallazgo',
      fecha: '2025-01-24',
      hora: '16:45:00',
      usuario: 'Patricia Gómez Silva',
      cargoUsuario: 'Auditor',
      accion: 'Hallazgo detectado',
      descripcion: 'Se detectó tercer hallazgo',
      observaciones: 'HALL-2025-014: Inconsistencias en hojas de vida (8% de la muestra)',
      ip: 'IP interna protegida'
    },
    {
      id: 'hist-112',
      auditoriaId: 'aud-004',
      tipo: 'nota',
      fecha: '2025-01-25',
      hora: '10:00:00',
      usuario: 'Carlos Ramírez Díaz',
      cargoUsuario: 'Auditor Senior',
      accion: 'Nota agregada',
      descripcion: 'Se agregó recomendación para plan de mejoramiento',
      observaciones: 'Recomendar implementar sistema de alertas automáticas',
      ip: 'IP interna protegida'
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

const formatearHora = (hora: string) => {
  return hora.slice(0, 5); // HH:MM
};

const getTipoEventoColor = (tipo: TipoEvento) => {
  const colores = {
    'creacion': 'bg-blue-100 text-blue-700 border-blue-200',
    'cambio_estado': 'bg-purple-100 text-purple-700 border-purple-200',
    'asignacion': 'bg-green-100 text-green-700 border-green-200',
    'actualizacion': 'bg-yellow-100 text-yellow-700 border-yellow-200',
    'documento': 'bg-indigo-100 text-indigo-700 border-indigo-200',
    'hallazgo': 'bg-red-100 text-red-700 border-red-200',
    'nota': 'bg-gray-100 text-gray-700 border-gray-200',
    'aprobacion': 'bg-green-100 text-green-700 border-green-200',
    'finalizacion': 'bg-purple-100 text-purple-700 border-purple-200',
    'eliminacion': 'bg-red-100 text-red-700 border-red-200',
    'archivo': 'bg-slate-100 text-slate-700 border-slate-200',
    'ampliacion_plazo': 'bg-orange-100 text-orange-700 border-orange-200'
  };
  return colores[tipo];
};

const getTipoEventoIcon = (tipo: TipoEvento) => {
  const iconos = {
    'creacion': <Activity className="w-4 h-4" />,
    'cambio_estado': <RefreshCw className="w-4 h-4" />,
    'asignacion': <User className="w-4 h-4" />,
    'actualizacion': <Edit2 className="w-4 h-4" />,
    'documento': <FileText className="w-4 h-4" />,
    'hallazgo': <AlertCircle className="w-4 h-4" />,
    'nota': <MessageSquare className="w-4 h-4" />,
    'aprobacion': <CheckCircle className="w-4 h-4" />,
    'finalizacion': <Target className="w-4 h-4" />,
    'eliminacion': <Trash2 className="w-4 h-4" />,
    'archivo': <FileText className="w-4 h-4" />,
    'ampliacion_plazo': <Clock className="w-4 h-4" />
  };
  return iconos[tipo];
};

const getTipoEventoLabel = (tipo: TipoEvento) => {
  const labels = {
    'creacion': 'Creación',
    'cambio_estado': 'Cambio de Estado',
    'asignacion': 'Asignación',
    'actualizacion': 'Actualización',
    'documento': 'Documento',
    'hallazgo': 'Hallazgo',
    'nota': 'Nota',
    'aprobacion': 'Aprobación',
    'finalizacion': 'Finalización',
    'eliminacion': 'Eliminación',
    'archivo': 'Archivo',
    'ampliacion_plazo': 'Ampliación de Plazo'
  };
  return labels[tipo];
};

const getTipoEventoBgColor = (tipo: TipoEvento) => {
  const colores = {
    'creacion': 'bg-blue-500',
    'cambio_estado': 'bg-purple-500',
    'asignacion': 'bg-green-500',
    'actualizacion': 'bg-yellow-500',
    'documento': 'bg-indigo-500',
    'hallazgo': 'bg-red-500',
    'nota': 'bg-gray-500',
    'aprobacion': 'bg-green-500',
    'finalizacion': 'bg-purple-500',
    'eliminacion': 'bg-red-500',
    'archivo': 'bg-slate-500',
    'ampliacion_plazo': 'bg-orange-500'
  };
  return colores[tipo];
};

// ============ COMPONENTE PRINCIPAL ============

export function ModalHistorialAuditoria({ auditoria, open, onClose }: ModalHistorialProps) {
  const [historial, setHistorial] = useState<EventoHistorial[]>([]);
  const [eventoExpandido, setEventoExpandido] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoEvento | 'Todos'>('Todos');
  const [cargando, setCargando] = useState(false);

  // Cargar historial cuando se abre el modal
  useEffect(() => {
    if (auditoria && open) {
      cargarHistorial();
    }
  }, [auditoria, open]);

  const cargarHistorial = async () => {
    if (!auditoria) return;

    setCargando(true);
    try {
      // Usar la URL configurada según el modo (gateway o direct)
      const response = await fetch(
        `${CONTROL_INTERNO_BASE_URL}${SERVICE_PREFIX}/auditorias/${auditoria.id}/historial`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al cargar el historial');
      }

      const data = await response.json();
      setHistorial(data);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      toast.error('Error al cargar el historial');
      setHistorial([]);
    } finally {
      setCargando(false);
    }
  };

  if (!auditoria) return null;

  // Filtrar eventos
  const eventosFiltrados = historial.filter(evento => {
    const cumpleBusqueda = 
      evento.accion.toLowerCase().includes(busqueda.toLowerCase()) ||
      evento.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
      evento.usuario.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleTipo = filtroTipo === 'Todos' || evento.tipo === filtroTipo;
    
    return cumpleBusqueda && cumpleTipo;
  });

  // Agrupar eventos por fecha
  const eventosPorFecha = eventosFiltrados.reduce((acc, evento) => {
    const fecha = evento.fecha;
    if (!acc[fecha]) {
      acc[fecha] = [];
    }
    acc[fecha].push(evento);
    return acc;
  }, {} as Record<string, EventoHistorial[]>);

  const toggleEvento = (eventoId: string) => {
    setEventoExpandido(eventoExpandido === eventoId ? null : eventoId);
  };

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
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[111] w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] lg:w-full lg:max-w-5xl max-h-[90vh]"
          >
            <div className="bg-white rounded-lg shadow-2xl w-full h-full max-h-[90vh] flex flex-col">
              {/* HEADER */}
              <div className="flex items-start justify-between p-6 border-b border-gray-200">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <History className="w-6 h-6" style={{ color: '#003DA5' }} />
                    <h2 className="text-2xl font-black" style={{ color: '#003DA5' }}>
                      Historial de Cambios
                    </h2>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="outline" className="text-sm font-mono">
                      {auditoria.codigo}
                    </Badge>
                    <span className="text-sm text-gray-600">{auditoria.titulo}</span>
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

              {/* TOOLBAR */}
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Búsqueda */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Buscar en historial..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filtro de tipo */}
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value as TipoEvento | 'Todos')}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Todos">Todos los tipos</option>
                    <option value="creacion">Creación</option>
                    <option value="cambio_estado">Cambio de Estado</option>
                    <option value="asignacion">Asignación</option>
                    <option value="actualizacion">Actualización</option>
                    <option value="documento">Documento</option>
                    <option value="hallazgo">Hallazgo</option>
                    <option value="nota">Nota</option>
                    <option value="aprobacion">Aprobación</option>
                    <option value="finalizacion">Finalización</option>
                    <option value="eliminacion">Eliminación</option>
                    <option value="archivo">Archivo</option>
                    <option value="ampliacion_plazo">Ampliación de Plazo</option>
                  </select>

                  {/* Botón exportar */}
                  <Button
                    variant="outline"
                    className="gap-2"
                    style={{ borderColor: '#003DA5', color: '#003DA5' }}
                  >
                    <Download className="w-4 h-4" />
                    Exportar PDF
                  </Button>
                </div>

                {/* Contador de resultados */}
                <div className="flex items-center justify-between mt-3">
                  {busqueda && (
                    <p className="text-xs text-gray-600">
                      {eventosFiltrados.length} evento{eventosFiltrados.length !== 1 ? 's' : ''} encontrado{eventosFiltrados.length !== 1 ? 's' : ''}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 ml-auto">
                    Total: {historial.length} evento{historial.length !== 1 ? 's' : ''} registrado{historial.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {/* TIMELINE DE EVENTOS */}
              <div className="flex-1 overflow-y-auto p-6">
                {cargando ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-3" />
                    <p className="text-gray-600">Cargando historial...</p>
                  </div>
                ) : eventosFiltrados.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">
                      {busqueda || filtroTipo !== 'Todos'
                        ? 'No se encontraron eventos con los filtros aplicados'
                        : 'No hay eventos en el historial'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(eventosPorFecha).map(([fecha, eventos]) => (
                      <div key={fecha}>
                        {/* Separador de fecha */}
                        <div className="flex items-center gap-3 mb-4">
                          <Calendar className="w-5 h-5 text-gray-400" />
                          <h3 className="font-bold text-gray-900">
                            {formatearFecha(fecha)}
                          </h3>
                          <div className="flex-1 h-px bg-gray-200"></div>
                          <Badge variant="outline" className="text-xs">
                            {eventos.length} evento{eventos.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>

                        {/* Timeline vertical */}
                        <div className="relative ml-4">
                          {/* Línea vertical */}
                          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                          <div className="space-y-4">
                            {eventos.map((evento, index) => {
                              const expandido = eventoExpandido === evento.id;

                              return (
                                <motion.div
                                  key={evento.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  className="relative pl-12"
                                >
                                  {/* Punto en la línea */}
                                  <div 
                                    className={`absolute left-0 w-8 h-8 rounded-full ${getTipoEventoBgColor(evento.tipo)} flex items-center justify-center text-white shadow-md z-10`}
                                  >
                                    {getTipoEventoIcon(evento.tipo)}
                                  </div>

                                  {/* Tarjeta del evento */}
                                  <div className="bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all">
                                    {/* Header del evento */}
                                    <div
                                      className="p-4 cursor-pointer"
                                      onClick={() => toggleEvento(evento.id)}
                                    >
                                      <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                                            <Badge 
                                              className={`${getTipoEventoColor(evento.tipo)} flex items-center gap-1`}
                                              variant="outline"
                                            >
                                              {getTipoEventoIcon(evento.tipo)}
                                              {getTipoEventoLabel(evento.tipo)}
                                            </Badge>
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {formatearHora(evento.hora)}
                                            </span>
                                          </div>
                                          
                                          <h4 className="font-bold text-gray-900 mb-1">
                                            {evento.accion}
                                          </h4>
                                          <p className="text-sm text-gray-600">
                                            {evento.descripcion}
                                          </p>
                                          
                                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-1">
                                              <User className="w-3 h-3" />
                                              <span className="font-medium">{evento.usuario}</span>
                                              <span className="text-gray-400">({evento.cargoUsuario})</span>
                                            </span>
                                          </div>
                                        </div>

                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="flex-shrink-0"
                                        >
                                          {expandido ? (
                                            <ChevronDown className="w-4 h-4" />
                                          ) : (
                                            <ChevronRight className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Detalles expandidos */}
                                    <AnimatePresence>
                                      {expandido && (
                                        <motion.div
                                          initial={{ height: 0, opacity: 0 }}
                                          animate={{ height: 'auto', opacity: 1 }}
                                          exit={{ height: 0, opacity: 0 }}
                                          className="overflow-hidden border-t border-gray-200"
                                        >
                                          <div className="p-4 bg-gray-50 space-y-3">
                                            {/* Cambios realizados */}
                                            {evento.cambios && evento.cambios.length > 0 && (
                                              <div>
                                                <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                                                  <ArrowRight className="w-3 h-3" />
                                                  Cambios Realizados
                                                </h5>
                                                <div className="space-y-2">
                                                  {evento.cambios.map((cambio, idx) => (
                                                    <div 
                                                      key={idx}
                                                      className="bg-white rounded-lg p-3 border border-gray-200 text-xs"
                                                    >
                                                      <div className="font-medium text-gray-700 mb-1">
                                                        {cambio.campo}
                                                      </div>
                                                      <div className="flex items-center gap-2">
                                                        <span className="text-red-600 line-through">
                                                          {cambio.valorAnterior || '(vacío)'}
                                                        </span>
                                                        <ArrowRight className="w-3 h-3 text-gray-400" />
                                                        <span className="text-green-600 font-medium">
                                                          {cambio.valorNuevo}
                                                        </span>
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            {/* Documento adjunto */}
                                            {evento.documentoAdjunto && (
                                              <div>
                                                <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                                                  <FileText className="w-3 h-3" />
                                                  Documento Adjunto
                                                </h5>
                                                <div className="bg-white rounded-lg p-3 border border-gray-200 flex items-center justify-between">
                                                  <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                    <span className="text-xs font-medium">
                                                      {evento.documentoAdjunto}
                                                    </span>
                                                  </div>
                                                  <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" title="Ver documento">
                                                      <Eye className="w-3 h-3" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" title="Descargar documento">
                                                      <Download className="w-3 h-3" />
                                                    </Button>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {/* Observaciones */}
                                            {evento.observaciones && (
                                              <div>
                                                <h5 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                                                  <Info className="w-3 h-3" />
                                                  Observaciones
                                                </h5>
                                                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                                                  <p className="text-xs text-blue-900">
                                                    {evento.observaciones}
                                                  </p>
                                                </div>
                                              </div>
                                            )}

                                            {/* Metadata técnica */}
                                            <div className="pt-2 border-t border-gray-200">
                                              <div className="flex items-center justify-between text-xs text-gray-500">
                                                <span>ID: {evento.id}</span>
                                                {evento.ip && (
                                                  <span className="flex items-center gap-1">
                                                    <Shield className="w-3 h-3" />
                                                    IP: {evento.ip}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-600">
                  Mostrando {eventosFiltrados.length} de {historial.length} eventos
                </div>
                <Button variant="outline" onClick={onClose}>
                  Cerrar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}