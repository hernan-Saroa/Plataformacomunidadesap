/**
 * Bandeja de Aprobadores - Vista de Aprobación de PTAs
 * Vista split con lista inteligente + panel de detalle
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  User,
  Calendar,
  FileText,
  MessageSquare,
  Download,
  Send,
  ThumbsUp,
  ThumbsDown,
  Eye
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface PTAPendiente {
  id: string;
  radicado: string;
  docenteNombre: string;
  docenteCodigo: string;
  territorial: string;
  periodo: string;
  fechaEnvio: string;
  horasBase: number;
  horasAsignadas: number;
  estado: 'Pendiente' | 'En Revisión' | 'Aprobado' | 'Rechazado';
  prioridad: 'Alta' | 'Media' | 'Baja';
  diasPendientes: number;
  componentes: {
    docencia: number;
    investigacion: number;
    extension: number;
    complementarias: number;
  };
  evidencias: {
    completas: number;
    totales: number;
  };
  comentarios: number;
  nivelAprobacion: number;
  aprobadorActual: string;
}

interface Comentario {
  id: string;
  autor: string;
  rol: string;
  fecha: string;
  mensaje: string;
  tipo: 'comentario' | 'solicitud_cambio' | 'aprobacion' | 'rechazo';
}

// ============================================================================
// MOCK DATA
// ============================================================================

const ptasMock: PTAPendiente[] = [
  {
    id: 'PTA-001',
    radicado: 'PTA-2025-2-00847',
    docenteNombre: 'Juan Carlos Pérez García',
    docenteCodigo: 'DOC-12345',
    territorial: 'Bogotá',
    periodo: '2025-2',
    fechaEnvio: '2025-11-25T10:30:00',
    horasBase: 800,
    horasAsignadas: 800,
    estado: 'Pendiente',
    prioridad: 'Alta',
    diasPendientes: 3,
    componentes: {
      docencia: 384,
      investigacion: 200,
      extension: 120,
      complementarias: 96
    },
    evidencias: {
      completas: 8,
      totales: 8
    },
    comentarios: 0,
    nivelAprobacion: 1,
    aprobadorActual: 'Coordinación Académica'
  },
  {
    id: 'PTA-002',
    radicado: 'PTA-2025-2-00848',
    docenteNombre: 'María Fernanda López',
    docenteCodigo: 'DOC-12346',
    territorial: 'Antioquia',
    periodo: '2025-2',
    fechaEnvio: '2025-11-24T14:15:00',
    horasBase: 800,
    horasAsignadas: 784,
    estado: 'En Revisión',
    prioridad: 'Media',
    diasPendientes: 4,
    componentes: {
      docencia: 400,
      investigacion: 184,
      extension: 100,
      complementarias: 100
    },
    evidencias: {
      completas: 7,
      totales: 8
    },
    comentarios: 2,
    nivelAprobacion: 1,
    aprobadorActual: 'Coordinación Académica'
  },
  {
    id: 'PTA-003',
    radicado: 'PTA-2025-2-00849',
    docenteNombre: 'Carlos Alberto Rodríguez',
    docenteCodigo: 'DOC-12347',
    territorial: 'Valle del Cauca',
    periodo: '2025-2',
    fechaEnvio: '2025-11-23T09:00:00',
    horasBase: 800,
    horasAsignadas: 800,
    estado: 'Pendiente',
    prioridad: 'Baja',
    diasPendientes: 5,
    componentes: {
      docencia: 320,
      investigacion: 240,
      extension: 160,
      complementarias: 80
    },
    evidencias: {
      completas: 8,
      totales: 8
    },
    comentarios: 0,
    nivelAprobacion: 1,
    aprobadorActual: 'Coordinación Académica'
  }
];

const comentariosMock: Comentario[] = [
  {
    id: 'COM-001',
    autor: 'Dr. Carlos Méndez',
    rol: 'Coordinación Académica',
    fecha: '2025-11-26T15:30:00',
    mensaje: 'Por favor verificar las evidencias del proyecto de investigación. Falta el acta de inicio.',
    tipo: 'solicitud_cambio'
  },
  {
    id: 'COM-002',
    autor: 'María Fernanda López',
    rol: 'Docente',
    fecha: '2025-11-26T16:45:00',
    mensaje: 'Evidencia cargada. Adjunto acta de inicio del proyecto firmada por el director del grupo.',
    tipo: 'comentario'
  }
];

// ============================================================================
// COMPONENT
// ============================================================================

export function BandejaAprobadores() {
  const [ptaSeleccionado, setPtaSeleccionado] = useState<PTAPendiente | null>(ptasMock[0]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todos');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [comentarioNuevo, setComentarioNuevo] = useState('');
  const [accionModalAbierto, setAccionModalAbierto] = useState<'aprobar' | 'rechazar' | null>(null);

  // Filtrar PTAs
  const ptasFiltrados = useMemo(() => {
    return ptasMock.filter(pta => {
      // Búsqueda
      if (busqueda) {
        const termino = busqueda.toLowerCase();
        if (
          !pta.radicado.toLowerCase().includes(termino) &&
          !pta.docenteNombre.toLowerCase().includes(termino) &&
          !pta.docenteCodigo.toLowerCase().includes(termino)
        ) {
          return false;
        }
      }

      // Filtro estado
      if (filtroEstado !== 'todos' && pta.estado !== filtroEstado) {
        return false;
      }

      // Filtro prioridad
      if (filtroPrioridad !== 'todos' && pta.prioridad !== filtroPrioridad) {
        return false;
      }

      return true;
    });
  }, [busqueda, filtroEstado, filtroPrioridad]);

  // Estadísticas
  const stats = {
    pendientes: ptasMock.filter(p => p.estado === 'Pendiente').length,
    enRevision: ptasMock.filter(p => p.estado === 'En Revisión').length,
    urgentes: ptasMock.filter(p => p.prioridad === 'Alta').length,
    total: ptasMock.length
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return 'bg-red-100 text-red-700 border-red-200';
      case 'Media': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Baja': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'Pendiente': return <Clock className="w-4 h-4 text-amber-600" />;
      case 'En Revisión': return <Eye className="w-4 h-4 text-blue-600" />;
      case 'Aprobado': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'Rechazado': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Bandeja de Aprobación</h1>
              <p className="text-sm text-gray-600 mt-1">
                Coordinación Académica • Nivel 1
              </p>
            </div>

            {/* Stats rápidas */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{stats.pendientes}</div>
                <div className="text-xs text-gray-600">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.enRevision}</div>
                <div className="text-xs text-gray-600">En revisión</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.urgentes}</div>
                <div className="text-xs text-gray-600">Urgentes</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            {/* Búsqueda */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por radicado, docente o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:outline-none transition-colors"
              />
            </div>

            {/* Botón filtros */}
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`
                flex items-center gap-2 px-4 py-2 border-2 rounded-lg transition-colors
                ${mostrarFiltros
                  ? 'border-[#003DA5] bg-blue-50 text-[#003DA5]'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              <Filter className="w-5 h-5" />
              Filtros
            </button>
          </div>

          {/* Panel de filtros */}
          <AnimatePresence>
            {mostrarFiltros && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-4 flex items-center gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado
                    </label>
                    <select
                      value={filtroEstado}
                      onChange={(e) => setFiltroEstado(e.target.value)}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:outline-none"
                    >
                      <option value="todos">Todos</option>
                      <option value="Pendiente">Pendiente</option>
                      <option value="En Revisión">En Revisión</option>
                      <option value="Aprobado">Aprobado</option>
                      <option value="Rechazado">Rechazado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prioridad
                    </label>
                    <select
                      value={filtroPrioridad}
                      onChange={(e) => setFiltroPrioridad(e.target.value)}
                      className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-[#003DA5] focus:outline-none"
                    >
                      <option value="todos">Todas</option>
                      <option value="Alta">Alta</option>
                      <option value="Media">Media</option>
                      <option value="Baja">Baja</option>
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      setFiltroEstado('todos');
                      setFiltroPrioridad('todos');
                    }}
                    className="mt-6 text-sm text-blue-600 hover:text-blue-700"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Vista Split */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-12 gap-6 h-[calc(100vh-280px)]">
          {/* Lista de PTAs (izquierda) */}
          <div className="col-span-5 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                PTAs para revisar ({ptasFiltrados.length})
              </h3>
            </div>

            <div className="flex-1 overflow-auto">
              {ptasFiltrados.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
                  <FileText className="w-16 h-16 text-gray-300 mb-3" />
                  <p className="text-center">No hay PTAs que coincidan con los filtros</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {ptasFiltrados.map((pta) => (
                    <motion.div
                      key={pta.id}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setPtaSeleccionado(pta)}
                      className={`
                        p-4 rounded-lg border-2 cursor-pointer transition-all
                        ${ptaSeleccionado?.id === pta.id
                          ? 'border-[#003DA5] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                        }
                      `}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getEstadoIcon(pta.estado)}
                            <span className="text-xs font-mono text-gray-600">
                              {pta.radicado}
                            </span>
                          </div>
                          <h4 className="font-semibold text-gray-900 mb-1">
                            {pta.docenteNombre}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {pta.docenteCodigo} • {pta.territorial}
                          </p>
                        </div>

                        <div className={`
                          px-2 py-1 text-xs font-medium rounded border
                          ${getPrioridadColor(pta.prioridad)}
                        `}>
                          {pta.prioridad}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-600 mt-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatearFecha(pta.fechaEnvio)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {pta.diasPendientes}d
                        </span>
                        {pta.comentarios > 0 && (
                          <span className="flex items-center gap-1 text-blue-600">
                            <MessageSquare className="w-3 h-3" />
                            {pta.comentarios}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${(pta.horasAsignadas / pta.horasBase) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-700">
                          {pta.horasAsignadas}/{pta.horasBase}h
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel de Detalle (derecha) */}
          <div className="col-span-7 bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
            {ptaSeleccionado ? (
              <>
                {/* Header del detalle */}
                <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className="text-xs font-mono text-blue-600 bg-blue-100 px-2 py-1 rounded">
                        {ptaSeleccionado.radicado}
                      </span>
                      <h2 className="text-2xl font-bold text-gray-900 mt-2">
                        {ptaSeleccionado.docenteNombre}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {ptaSeleccionado.docenteCodigo} • {ptaSeleccionado.territorial} • {ptaSeleccionado.periodo}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button className="p-2 text-gray-600 hover:bg-white rounded-lg transition-colors">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Estado</div>
                      <div className="flex items-center gap-2">
                        {getEstadoIcon(ptaSeleccionado.estado)}
                        <span className="font-medium text-gray-900">{ptaSeleccionado.estado}</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Enviado</div>
                      <div className="font-medium text-gray-900">
                        {formatearFecha(ptaSeleccionado.fechaEnvio)}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 border border-gray-200">
                      <div className="text-xs text-gray-600 mb-1">Días pendiente</div>
                      <div className="font-medium text-gray-900">
                        {ptaSeleccionado.diasPendientes} días
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido scrolleable */}
                <div className="flex-1 overflow-auto p-6 space-y-6">
                  {/* Distribución de horas */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">DISTRIBUCIÓN DE HORAS</h3>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-gray-900">
                          {ptaSeleccionado.horasAsignadas}/{ptaSeleccionado.horasBase}h
                        </span>
                        <span className="text-lg font-semibold text-gray-700">
                          {Math.round((ptaSeleccionado.horasAsignadas / ptaSeleccionado.horasBase) * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-green-600"
                          style={{ width: `${(ptaSeleccionado.horasAsignadas / ptaSeleccionado.horasBase) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🔵</span>
                          <span className="text-sm font-medium text-gray-900">DOCENCIA</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {ptaSeleccionado.componentes.docencia}h
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {Math.round((ptaSeleccionado.componentes.docencia / ptaSeleccionado.horasBase) * 100)}%
                        </div>
                      </div>

                      <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🟠</span>
                          <span className="text-sm font-medium text-gray-900">INVESTIGACIÓN</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {ptaSeleccionado.componentes.investigacion}h
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {Math.round((ptaSeleccionado.componentes.investigacion / ptaSeleccionado.horasBase) * 100)}%
                        </div>
                      </div>

                      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🟣</span>
                          <span className="text-sm font-medium text-gray-900">EXTENSIÓN</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {ptaSeleccionado.componentes.extension}h
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {Math.round((ptaSeleccionado.componentes.extension / ptaSeleccionado.horasBase) * 100)}%
                        </div>
                      </div>

                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🟢</span>
                          <span className="text-sm font-medium text-gray-900">COMPLEM.</span>
                        </div>
                        <div className="text-2xl font-bold text-gray-900">
                          {ptaSeleccionado.componentes.complementarias}h
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {Math.round((ptaSeleccionado.componentes.complementarias / ptaSeleccionado.horasBase) * 100)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Evidencias */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">EVIDENCIAS</h3>
                    <div className={`
                      flex items-center justify-between p-4 rounded-lg border-2
                      ${ptaSeleccionado.evidencias.completas === ptaSeleccionado.evidencias.totales
                        ? 'bg-green-50 border-green-200'
                        : 'bg-amber-50 border-amber-200'
                      }
                    `}>
                      <div className="flex items-center gap-2">
                        {ptaSeleccionado.evidencias.completas === ptaSeleccionado.evidencias.totales ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        )}
                        <span className="font-medium text-gray-900">
                          {ptaSeleccionado.evidencias.completas}/{ptaSeleccionado.evidencias.totales} actividades con evidencia
                        </span>
                      </div>
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        Ver detalle →
                      </button>
                    </div>
                  </div>

                  {/* Comentarios */}
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">
                      HISTORIAL ({comentariosMock.length})
                    </h3>
                    
                    <div className="space-y-3 mb-4">
                      {comentariosMock.map((comentario) => (
                        <div key={comentario.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">{comentario.autor}</span>
                                <span className="text-xs text-gray-500">{comentario.rol}</span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">
                                  {formatearFecha(comentario.fecha)}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{comentario.mensaje}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Nuevo comentario */}
                    <div className="bg-white border-2 border-gray-300 rounded-lg p-3">
                      <textarea
                        value={comentarioNuevo}
                        onChange={(e) => setComentarioNuevo(e.target.value)}
                        placeholder="Agregar comentario o solicitud de cambio..."
                        className="w-full min-h-[80px] text-sm border-0 focus:outline-none resize-none"
                      />
                      <div className="flex items-center justify-end gap-2 mt-2">
                        <button className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                          Cancelar
                        </button>
                        <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
                          <Send className="w-4 h-4" />
                          Enviar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer con acciones */}
                <div className="p-6 border-t-2 border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Nivel de aprobación:</span> {ptaSeleccionado.nivelAprobacion} - {ptaSeleccionado.aprobadorActual}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setAccionModalAbierto('rechazar')}
                        className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-red-50 text-red-600 border-2 border-red-300 rounded-lg transition-colors font-medium"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        Rechazar
                      </button>
                      
                      <button
                        onClick={() => setAccionModalAbierto('aprobar')}
                        className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-lg"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        Aprobar
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FileText className="w-20 h-20 text-gray-300 mb-4" />
                <p className="text-lg">Selecciona un PTA para ver los detalles</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
