/**
 * DASHBOARD DOCENTE - MIS PTAs
 * 
 * Vista principal para docentes donde pueden:
 * - Ver todos sus PTAs por período académico
 * - Ver el estado de aprobación de cada PTA
 * - Crear un nuevo PTA
 * - Editar PTAs en estado "borrador" o "rechazado"
 * - Duplicar PTAs de períodos anteriores
 * - Ver el detalle de PTAs aprobados
 * 
 * Estados del PTA:
 * - Borrador: En construcción, no enviado
 * - En Revisión: Enviado, esperando aprobación
 * - Aprobado: Completamente aprobado por los 3 niveles
 * - Rechazado: Rechazado por algún nivel, requiere ajustes
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Copy,
  Trash2,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  TrendingUp,
  BookOpen,
  FlaskConical,
  Users,
  Briefcase,
  Download,
  Send
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface DocenteInfo {
  cedula: string;
  nombreCompleto: string;
  email: string;
}

interface PTAResumen {
  id: string;
  periodoAcademico: string;
  estado: 'borrador' | 'en-revision' | 'aprobado' | 'rechazado';
  fechaCreacion: string;
  fechaEnvio?: string;
  fechaAprobacion?: string;
  totalHoras: number;
  distribucion: {
    docencia: number;
    investigacion: number;
    extension: number;
    complementarias: number;
  };
  nivelAprobacion?: 1 | 2 | 3;
  observaciones?: string;
  aprobadores?: {
    nivel1?: { nombre: string; fecha?: string; estado: 'pendiente' | 'aprobado' | 'rechazado' };
    nivel2?: { nombre: string; fecha?: string; estado: 'pendiente' | 'aprobado' | 'rechazado' };
    nivel3?: { nombre: string; fecha?: string; estado: 'pendiente' | 'aprobado' | 'rechazado' };
  };
}

// ============================================================================
// DATOS MOCK (temporal - vendrán del backend)
// ============================================================================

const PTAS_MOCK: PTAResumen[] = [
  {
    id: 'pta-001',
    periodoAcademico: '2025-2',
    estado: 'borrador',
    fechaCreacion: '2025-01-02T10:30:00',
    totalHoras: 650,
    distribucion: {
      docencia: 400,
      investigacion: 150,
      extension: 100,
      complementarias: 0
    }
  },
  {
    id: 'pta-002',
    periodoAcademico: '2025-1',
    estado: 'en-revision',
    fechaCreacion: '2024-12-15T14:20:00',
    fechaEnvio: '2024-12-20T09:00:00',
    totalHoras: 800,
    distribucion: {
      docencia: 480,
      investigacion: 200,
      extension: 80,
      complementarias: 40
    },
    nivelAprobacion: 2,
    aprobadores: {
      nivel1: { nombre: 'Coord. Ricardo Gómez', fecha: '2024-12-21T10:30:00', estado: 'aprobado' },
      nivel2: { nombre: 'Dir. María Torres', estado: 'pendiente' },
      nivel3: { nombre: 'Subdirector Académico', estado: 'pendiente' }
    }
  },
  {
    id: 'pta-003',
    periodoAcademico: '2024-2',
    estado: 'aprobado',
    fechaCreacion: '2024-06-10T11:00:00',
    fechaEnvio: '2024-06-15T16:00:00',
    fechaAprobacion: '2024-06-25T12:00:00',
    totalHoras: 800,
    distribucion: {
      docencia: 500,
      investigacion: 200,
      extension: 50,
      complementarias: 50
    },
    nivelAprobacion: 3,
    aprobadores: {
      nivel1: { nombre: 'Coord. Ricardo Gómez', fecha: '2024-06-16T10:00:00', estado: 'aprobado' },
      nivel2: { nombre: 'Dir. María Torres', fecha: '2024-06-20T14:00:00', estado: 'aprobado' },
      nivel3: { nombre: 'Subdirector Académico', fecha: '2024-06-25T12:00:00', estado: 'aprobado' }
    }
  },
  {
    id: 'pta-004',
    periodoAcademico: '2024-1',
    estado: 'rechazado',
    fechaCreacion: '2024-01-08T09:15:00',
    fechaEnvio: '2024-01-12T11:00:00',
    totalHoras: 800,
    distribucion: {
      docencia: 350,
      investigacion: 400,
      extension: 50,
      complementarias: 0
    },
    nivelAprobacion: 1,
    observaciones: 'El porcentaje de investigación (50%) es muy alto. Se requiere mayor dedicación a docencia para tu tipo de vinculación.',
    aprobadores: {
      nivel1: { nombre: 'Coord. Ricardo Gómez', fecha: '2024-01-15T15:30:00', estado: 'rechazado' },
      nivel2: { nombre: 'Dir. María Torres', estado: 'pendiente' },
      nivel3: { nombre: 'Subdirector Académico', estado: 'pendiente' }
    }
  }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface DashboardDocenteProps {
  docente: DocenteInfo;
  onCrearNuevo: () => void;
  onVerDetalle: (ptaId: string) => void;
  onEditar: (ptaId: string) => void;
  onDuplicar: (ptaId: string) => void;
  onEliminar: (ptaId: string) => void;
}

export function DashboardDocente({
  docente,
  onCrearNuevo,
  onVerDetalle,
  onEditar,
  onDuplicar,
  onEliminar
}: DashboardDocenteProps) {
  const [ptas, setPTAs] = useState<PTAResumen[]>(PTAS_MOCK);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Filtrar PTAs
  const ptasFiltrados = ptas.filter(pta => {
    const cumpleEstado = filtroEstado === 'todos' || pta.estado === filtroEstado;
    const cumplePeriodo = filtroPeriodo === 'todos' || pta.periodoAcademico === filtroPeriodo;
    const cumpleBusqueda = busqueda === '' || 
      pta.periodoAcademico.toLowerCase().includes(busqueda.toLowerCase()) ||
      pta.estado.toLowerCase().includes(busqueda.toLowerCase());
    
    return cumpleEstado && cumplePeriodo && cumpleBusqueda;
  });

  // Calcular estadísticas
  const stats = {
    total: ptas.length,
    borradores: ptas.filter(p => p.estado === 'borrador').length,
    enRevision: ptas.filter(p => p.estado === 'en-revision').length,
    aprobados: ptas.filter(p => p.estado === 'aprobado').length,
    rechazados: ptas.filter(p => p.estado === 'rechazado').length
  };

  // Obtener períodos únicos
  const periodosUnicos = ['todos', ...Array.from(new Set(ptas.map(p => p.periodoAcademico)))];

  const handleEliminar = (ptaId: string, periodo: string) => {
    if (confirm(`¿Estás seguro de eliminar el PTA del período ${periodo}?`)) {
      setPTAs(ptas.filter(p => p.id !== ptaId));
      onEliminar(ptaId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mis Planes de Trabajo Académico</h1>
              <p className="text-blue-100">
                {docente.nombreCompleto} • {docente.email}
              </p>
            </div>
            <button
              onClick={onCrearNuevo}
              className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-xl font-bold transition-all shadow-lg transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              Crear Nuevo PTA
            </button>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <StatCard
              label="Total"
              value={stats.total}
              icon={FileText}
              color="blue"
            />
            <StatCard
              label="Borradores"
              value={stats.borradores}
              icon={Edit}
              color="gray"
            />
            <StatCard
              label="En Revisión"
              value={stats.enRevision}
              icon={Clock}
              color="yellow"
            />
            <StatCard
              label="Aprobados"
              value={stats.aprobados}
              icon={CheckCircle}
              color="green"
            />
            <StatCard
              label="Rechazados"
              value={stats.rechazados}
              icon={XCircle}
              color="red"
            />
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtros y Búsqueda */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por período o estado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filtro por Estado */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="borrador">Borradores</option>
                <option value="en-revision">En Revisión</option>
                <option value="aprobado">Aprobados</option>
                <option value="rechazado">Rechazados</option>
              </select>
            </div>

            {/* Filtro por Período */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filtroPeriodo}
                onChange={(e) => setFiltroPeriodo(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                {periodosUnicos.map(periodo => (
                  <option key={periodo} value={periodo}>
                    {periodo === 'todos' ? 'Todos los períodos' : `Período ${periodo}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-semibold">{ptasFiltrados.length}</span> de{' '}
              <span className="font-semibold">{ptas.length}</span> PTAs
            </p>
            {(busqueda || filtroEstado !== 'todos' || filtroPeriodo !== 'todos') && (
              <button
                onClick={() => {
                  setBusqueda('');
                  setFiltroEstado('todos');
                  setFiltroPeriodo('todos');
                }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Lista de PTAs */}
        {ptasFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              No se encontraron PTAs
            </h3>
            <p className="text-gray-600 mb-6">
              {ptas.length === 0
                ? 'Aún no has creado ningún Plan de Trabajo Académico'
                : 'No hay PTAs que coincidan con los filtros aplicados'}
            </p>
            {ptas.length === 0 && (
              <button
                onClick={onCrearNuevo}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Crear mi primer PTA
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {ptasFiltrados.map((pta, index) => (
              <motion.div
                key={pta.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <PTACard
                  pta={pta}
                  onVerDetalle={() => onVerDetalle(pta.id)}
                  onEditar={() => onEditar(pta.id)}
                  onDuplicar={() => onDuplicar(pta.id)}
                  onEliminar={() => handleEliminar(pta.id, pta.periodoAcademico)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: any;
  color: 'blue' | 'gray' | 'yellow' | 'green' | 'red';
}

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    gray: 'bg-gray-100 text-gray-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600'
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-blue-100">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface PTACardProps {
  pta: PTAResumen;
  onVerDetalle: () => void;
  onEditar: () => void;
  onDuplicar: () => void;
  onEliminar: () => void;
}

function PTACard({ pta, onVerDetalle, onEditar, onDuplicar, onEliminar }: PTACardProps) {
  const estadoConfig = {
    'borrador': {
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: Edit,
      label: 'Borrador'
    },
    'en-revision': {
      color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      icon: Clock,
      label: 'En Revisión'
    },
    'aprobado': {
      color: 'bg-green-100 text-green-700 border-green-300',
      icon: CheckCircle,
      label: 'Aprobado'
    },
    'rechazado': {
      color: 'bg-red-100 text-red-700 border-red-300',
      icon: XCircle,
      label: 'Rechazado'
    }
  };

  const config = estadoConfig[pta.estado];
  const Icon = config.icon;
  const porcentajeCompletado = (pta.totalHoras / 800) * 100;

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-all overflow-hidden group">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">
                PTA {pta.periodoAcademico}
              </h3>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${config.color}`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{config.label}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Creado: {new Date(pta.fechaCreacion).toLocaleDateString('es-ES')}
              </div>
              {pta.fechaEnvio && (
                <div className="flex items-center gap-1">
                  <Send className="w-4 h-4" />
                  Enviado: {new Date(pta.fechaEnvio).toLocaleDateString('es-ES')}
                </div>
              )}
              {pta.fechaAprobacion && (
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Aprobado: {new Date(pta.fechaAprobacion).toLocaleDateString('es-ES')}
                </div>
              )}
            </div>
          </div>

          {/* Total de Horas */}
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{pta.totalHoras}</div>
            <div className="text-sm text-gray-600">de 800 hrs</div>
            <div className="text-xs text-gray-500">{porcentajeCompletado.toFixed(0)}%</div>
          </div>
        </div>

        {/* Distribución de Horas */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">Docencia</span>
            </div>
            <p className="font-bold text-blue-900">{pta.distribucion.docencia} hrs</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Investigación</span>
            </div>
            <p className="font-bold text-green-900">{pta.distribucion.investigacion} hrs</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-teal-600" />
              <span className="text-xs text-gray-600">Extensión</span>
            </div>
            <p className="font-bold text-teal-900">{pta.distribucion.extension} hrs</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-gray-600">Complementarias</span>
            </div>
            <p className="font-bold text-orange-900">{pta.distribucion.complementarias} hrs</p>
          </div>
        </div>

        {/* Timeline de Aprobación (solo para en-revision, aprobado, rechazado) */}
        {pta.estado !== 'borrador' && pta.aprobadores && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Timeline de Aprobación</h4>
            <div className="space-y-2">
              {pta.aprobadores.nivel1 && (
                <AprobacionNivel
                  nivel={1}
                  aprobador={pta.aprobadores.nivel1}
                />
              )}
              {pta.aprobadores.nivel2 && (
                <AprobacionNivel
                  nivel={2}
                  aprobador={pta.aprobadores.nivel2}
                />
              )}
              {pta.aprobadores.nivel3 && (
                <AprobacionNivel
                  nivel={3}
                  aprobador={pta.aprobadores.nivel3}
                />
              )}
            </div>
          </div>
        )}

        {/* Observaciones (solo si está rechazado) */}
        {pta.estado === 'rechazado' && pta.observaciones && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Observaciones del Aprobador</h4>
                <p className="text-sm text-red-700">{pta.observaciones}</p>
              </div>
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={onVerDetalle}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            Ver Detalle
          </button>

          {(pta.estado === 'borrador' || pta.estado === 'rechazado') && (
            <button
              onClick={onEditar}
              className="flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
              Editar
            </button>
          )}

          <button
            onClick={onDuplicar}
            className="flex items-center gap-2 px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
            Duplicar
          </button>

          {pta.estado === 'aprobado' && (
            <button
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title="Descargar PDF"
            >
              <Download className="w-4 h-4" />
              Descargar
            </button>
          )}

          {pta.estado === 'borrador' && (
            <button
              onClick={onEliminar}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-auto"
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface AprobacionNivelProps {
  nivel: 1 | 2 | 3;
  aprobador: {
    nombre: string;
    fecha?: string;
    estado: 'pendiente' | 'aprobado' | 'rechazado';
  };
}

function AprobacionNivel({ nivel, aprobador }: AprobacionNivelProps) {
  const estadoConfig = {
    'pendiente': {
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      icon: Clock,
      label: 'Pendiente'
    },
    'aprobado': {
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      icon: CheckCircle,
      label: 'Aprobado'
    },
    'rechazado': {
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      icon: XCircle,
      label: 'Rechazado'
    }
  };

  const config = estadoConfig[aprobador.estado];
  const Icon = config.icon;

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
        <Icon className={`w-4 h-4 ${config.color}`} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">Nivel {nivel}: {aprobador.nombre}</p>
        {aprobador.fecha && (
          <p className="text-xs text-gray-600">
            {new Date(aprobador.fecha).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
        )}
      </div>
      <span className={`text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    </div>
  );
}
