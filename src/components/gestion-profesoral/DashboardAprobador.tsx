/**
 * DASHBOARD DE APROBADOR - ESAP
 * 
 * Vista para Coordinadores, Directores y Subdirectores Académicos
 * que deben aprobar/rechazar PTAs según su nivel jerárquico.
 * 
 * Niveles de Aprobación:
 * - Nivel 1: Coordinador de Programa
 * - Nivel 2: Director de Escuela
 * - Nivel 3: Subdirector Académico
 * 
 * Workflow:
 * 1. Docente envía PTA → Estado "En Revisión" (Nivel 1)
 * 2. Nivel 1 aprueba → Pasa a Nivel 2
 * 3. Nivel 2 aprueba → Pasa a Nivel 3
 * 4. Nivel 3 aprueba → Estado "Aprobado"
 * 
 * Si cualquier nivel rechaza → Vuelve al docente (Estado "Rechazado")
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  FileText,
  Calendar,
  User,
  Filter,
  Search,
  TrendingUp,
  AlertCircle,
  Send,
  BookOpen,
  FlaskConical,
  Users as UsersIcon,
  Briefcase,
  Award,
  Building2,
  ChevronRight
} from 'lucide-react';

// ============================================================================
// TIPOS
// ============================================================================

interface AprobadorInfo {
  id: string;
  nombre: string;
  cargo: string;
  nivel: 1 | 2 | 3;
  email: string;
}

interface PTAPendienteAprobacion {
  id: string;
  docente: {
    cedula: string;
    nombreCompleto: string;
    tipoVinculacion: string;
    programa: string;
  };
  periodoAcademico: string;
  fechaEnvio: string;
  fechaUltimaAccion?: string;
  totalHoras: number;
  distribucion: {
    docencia: number;
    investigacion: number;
    extension: number;
    complementarias: number;
  };
  nivelActual: 1 | 2 | 3;
  estadoAnterior?: {
    nivel: number;
    aprobador: string;
    fecha: string;
    accion: 'aprobado' | 'rechazado';
  };
  urgente: boolean; // Más de 5 días sin revisar
  diasPendiente: number;
}

// ============================================================================
// DATOS MOCK (temporal - vendrán del backend)
// ============================================================================

const PTAS_PENDIENTES_MOCK: PTAPendienteAprobacion[] = [
  {
    id: 'pta-001',
    docente: {
      cedula: '1234567890',
      nombreCompleto: 'Dr. Carlos Alberto Méndez Rivera',
      tipoVinculacion: 'Tiempo Completo',
      programa: 'Administración Pública'
    },
    periodoAcademico: '2025-1',
    fechaEnvio: '2025-01-01T10:00:00',
    totalHoras: 800,
    distribucion: {
      docencia: 480,
      investigacion: 200,
      extension: 80,
      complementarias: 40
    },
    nivelActual: 1,
    urgente: false,
    diasPendiente: 2
  },
  {
    id: 'pta-002',
    docente: {
      cedula: '9876543210',
      nombreCompleto: 'Dra. María Fernanda Rodríguez López',
      tipoVinculacion: 'Ocasional',
      programa: 'Administración Pública'
    },
    periodoAcademico: '2025-1',
    fechaEnvio: '2024-12-20T15:30:00',
    fechaUltimaAccion: '2024-12-28T09:00:00',
    totalHoras: 800,
    distribucion: {
      docencia: 500,
      investigacion: 150,
      extension: 100,
      complementarias: 50
    },
    nivelActual: 2,
    estadoAnterior: {
      nivel: 1,
      aprobador: 'Coord. Ricardo Gómez',
      fecha: '2024-12-28T09:00:00',
      accion: 'aprobado'
    },
    urgente: true,
    diasPendiente: 6
  },
  {
    id: 'pta-003',
    docente: {
      cedula: '5555555555',
      nombreCompleto: 'Dr. Jorge Enrique Martínez Silva',
      tipoVinculacion: 'Tiempo Completo',
      programa: 'Gobierno y Relaciones Internacionales'
    },
    periodoAcademico: '2025-1',
    fechaEnvio: '2024-12-28T11:00:00',
    totalHoras: 800,
    distribucion: {
      docencia: 400,
      investigacion: 300,
      extension: 50,
      complementarias: 50
    },
    nivelActual: 1,
    urgente: false,
    diasPendiente: 5
  },
  {
    id: 'pta-004',
    docente: {
      cedula: '3333333333',
      nombreCompleto: 'Dra. Ana Patricia González Ruiz',
      tipoVinculacion: 'Visitante',
      programa: 'Administración Pública'
    },
    periodoAcademico: '2025-1',
    fechaEnvio: '2024-12-15T14:00:00',
    fechaUltimaAccion: '2024-12-22T16:00:00',
    totalHoras: 800,
    distribucion: {
      docencia: 600,
      investigacion: 100,
      extension: 50,
      complementarias: 50
    },
    nivelActual: 3,
    estadoAnterior: {
      nivel: 2,
      aprobador: 'Dir. María Torres',
      fecha: '2024-12-22T16:00:00',
      accion: 'aprobado'
    },
    urgente: true,
    diasPendiente: 11
  }
];

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

interface DashboardAprobadorProps {
  aprobador: AprobadorInfo;
  onVerDetallePTA: (ptaId: string) => void;
  onAprobarPTA: (ptaId: string) => void;
  onRechazarPTA: (ptaId: string) => void;
}

export function DashboardAprobador({
  aprobador,
  onVerDetallePTA,
  onAprobarPTA,
  onRechazarPTA
}: DashboardAprobadorProps) {
  const [ptas, setPTAs] = useState<PTAPendienteAprobacion[]>(
    // Filtrar solo los PTAs del nivel del aprobador
    PTAS_PENDIENTES_MOCK.filter(pta => pta.nivelActual === aprobador.nivel)
  );
  const [filtroPrograma, setFiltroPrograma] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarSoloUrgentes, setMostrarSoloUrgentes] = useState(false);

  // Filtrar PTAs
  const ptasFiltrados = ptas.filter(pta => {
    const cumplePrograma = filtroPrograma === 'todos' || pta.docente.programa === filtroPrograma;
    const cumpleBusqueda = busqueda === '' || 
      pta.docente.nombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) ||
      pta.docente.cedula.includes(busqueda) ||
      pta.periodoAcademico.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleUrgente = !mostrarSoloUrgentes || pta.urgente;
    
    return cumplePrograma && cumpleBusqueda && cumpleUrgente;
  });

  // Calcular estadísticas
  const stats = {
    total: ptas.length,
    urgentes: ptas.filter(p => p.urgente).length,
    nuevos: ptas.filter(p => p.diasPendiente <= 2).length,
    promedioHoras: Math.round(ptas.reduce((sum, p) => sum + p.totalHoras, 0) / (ptas.length || 1))
  };

  // Obtener programas únicos
  const programasUnicos = ['todos', ...Array.from(new Set(ptas.map(p => p.docente.programa)))];

  const getNivelLabel = (nivel: number): string => {
    const labels = {
      1: 'Coordinador de Programa',
      2: 'Director de Escuela',
      3: 'Subdirector Académico'
    };
    return labels[nivel as 1 | 2 | 3];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-8 h-8" />
                <h1 className="text-3xl font-bold">Panel de Aprobación - Nivel {aprobador.nivel}</h1>
              </div>
              <p className="text-green-100 mb-1">
                {aprobador.nombre} • {aprobador.cargo}
              </p>
              <p className="text-sm text-green-200">
                {aprobador.email}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-center">
              <div className="text-4xl font-bold">{stats.total}</div>
              <div className="text-sm text-green-100">PTAs Pendientes</div>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <StatCard
              label="Total Pendientes"
              value={stats.total}
              icon={FileText}
              color="white"
            />
            <StatCard
              label="Urgentes"
              value={stats.urgentes}
              icon={AlertCircle}
              color="red"
            />
            <StatCard
              label="Nuevos (≤2 días)"
              value={stats.nuevos}
              icon={TrendingUp}
              color="blue"
            />
            <StatCard
              label="Promedio Horas"
              value={stats.promedioHoras}
              icon={Clock}
              color="yellow"
              suffix=" hrs"
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
                placeholder="Buscar por docente, cédula o período..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Filtro por Programa */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filtroPrograma}
                onChange={(e) => setFiltroPrograma(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none"
              >
                {programasUnicos.map(programa => (
                  <option key={programa} value={programa}>
                    {programa === 'todos' ? 'Todos los programas' : programa}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Urgentes */}
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={mostrarSoloUrgentes}
                onChange={(e) => setMostrarSoloUrgentes(e.target.checked)}
                className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
              />
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <span className="font-medium text-gray-900">Solo Urgentes</span>
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Mostrando <span className="font-semibold">{ptasFiltrados.length}</span> de{' '}
              <span className="font-semibold">{ptas.length}</span> PTAs
            </p>
            {(busqueda || filtroPrograma !== 'todos' || mostrarSoloUrgentes) && (
              <button
                onClick={() => {
                  setBusqueda('');
                  setFiltroPrograma('todos');
                  setMostrarSoloUrgentes(false);
                }}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>

        {/* Lista de PTAs */}
        {ptasFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {ptas.length === 0 
                ? '¡Todo al día!' 
                : 'No se encontraron PTAs'}
            </h3>
            <p className="text-gray-600">
              {ptas.length === 0
                ? 'No tienes PTAs pendientes de aprobación en este momento'
                : 'No hay PTAs que coincidan con los filtros aplicados'}
            </p>
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
                  nivelAprobador={aprobador.nivel}
                  onVerDetalle={() => onVerDetallePTA(pta.id)}
                  onAprobar={() => onAprobarPTA(pta.id)}
                  onRechazar={() => onRechazarPTA(pta.id)}
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
  color: 'white' | 'red' | 'blue' | 'yellow';
  suffix?: string;
}

function StatCard({ label, value, icon: Icon, color, suffix = '' }: StatCardProps) {
  const colorClasses = {
    white: 'bg-white/20 text-white',
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    yellow: 'bg-yellow-100 text-yellow-600'
  };

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}{suffix}</p>
          <p className="text-xs text-green-100">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface PTACardProps {
  pta: PTAPendienteAprobacion;
  nivelAprobador: number;
  onVerDetalle: () => void;
  onAprobar: () => void;
  onRechazar: () => void;
}

function PTACard({ pta, nivelAprobador, onVerDetalle, onAprobar, onRechazar }: PTACardProps) {
  return (
    <div className={`bg-white rounded-xl border-2 ${pta.urgente ? 'border-red-300 shadow-lg shadow-red-100' : 'border-gray-200'} hover:border-green-300 transition-all overflow-hidden`}>
      <div className="p-6">
        {/* Header con Urgencia */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">
                {pta.docente.nombreCompleto}
              </h3>
              {pta.urgente && (
                <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full border border-red-300">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Urgente</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Cédula: {pta.docente.cedula}
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                {pta.docente.tipoVinculacion}
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {pta.docente.programa}
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Período {pta.periodoAcademico}
              </div>
            </div>
          </div>

          {/* Total de Horas */}
          <div className="text-right">
            <div className="text-3xl font-bold text-green-600">{pta.totalHoras}</div>
            <div className="text-sm text-gray-600">horas</div>
          </div>
        </div>

        {/* Fechas */}
        <div className="flex items-center gap-6 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Enviado: {new Date(pta.fechaEnvio).toLocaleDateString('es-ES')}
          </div>
          <div className={`flex items-center gap-2 font-medium ${pta.urgente ? 'text-red-600' : 'text-gray-600'}`}>
            <Clock className="w-4 h-4" />
            {pta.diasPendiente} día{pta.diasPendiente !== 1 ? 's' : ''} pendiente
          </div>
        </div>

        {/* Estado Anterior (si viene de nivel anterior) */}
        {pta.estadoAnterior && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-900">
                Aprobado por {pta.estadoAnterior.aprobador}
              </span>
              <span className="text-green-700">
                el {new Date(pta.estadoAnterior.fecha).toLocaleDateString('es-ES')}
              </span>
            </div>
          </div>
        )}

        {/* Distribución de Horas */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-gray-600">Docencia</span>
            </div>
            <p className="font-bold text-blue-900">{pta.distribucion.docencia} hrs</p>
            <p className="text-xs text-blue-700">{Math.round((pta.distribucion.docencia / pta.totalHoras) * 100)}%</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-4 h-4 text-green-600" />
              <span className="text-xs text-gray-600">Investigación</span>
            </div>
            <p className="font-bold text-green-900">{pta.distribucion.investigacion} hrs</p>
            <p className="text-xs text-green-700">{Math.round((pta.distribucion.investigacion / pta.totalHoras) * 100)}%</p>
          </div>
          <div className="bg-teal-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <UsersIcon className="w-4 h-4 text-teal-600" />
              <span className="text-xs text-gray-600">Extensión</span>
            </div>
            <p className="font-bold text-teal-900">{pta.distribucion.extension} hrs</p>
            <p className="text-xs text-teal-700">{Math.round((pta.distribucion.extension / pta.totalHoras) * 100)}%</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-orange-600" />
              <span className="text-xs text-gray-600">Complementarias</span>
            </div>
            <p className="font-bold text-orange-900">{pta.distribucion.complementarias} hrs</p>
            <p className="text-xs text-orange-700">{Math.round((pta.distribucion.complementarias / pta.totalHoras) * 100)}%</p>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onVerDetalle}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
          >
            <Eye className="w-4 h-4" />
            Ver Detalle Completo
          </button>

          <div className="flex-1" />

          <button
            onClick={onRechazar}
            className="flex items-center gap-2 px-6 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors font-medium border border-red-200"
          >
            <XCircle className="w-4 h-4" />
            Rechazar
          </button>

          <button
            onClick={onAprobar}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium shadow-lg"
          >
            <CheckCircle className="w-4 h-4" />
            Aprobar
          </button>
        </div>
      </div>
    </div>
  );
}
