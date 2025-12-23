import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';
import {
  FileText,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Eye,
  Edit,
  Plus,
  Filter,
  Search,
  Download,
  TrendingUp,
  Activity,
  BookOpen,
  GraduationCap,
  Building2,
  ChevronRight,
  Target,
  BarChart3
} from 'lucide-react';
import { CardSIGL } from '../design-system/CardSIGL';
import { ButtonSIGL } from '../design-system/ButtonSIGL';
import { BadgeSIGL } from '../design-system/BadgeSIGL';
import { todasLasPTAs } from '../../data/ptasMockData';

interface DocenteAsignado {
  id: string;
  nombre: string;
  tipo: 'planta' | 'catedra';
  sede: string;
  estado: 'activo' | 'pendiente' | 'inactivo';
  programacionCreada: boolean;
  ptaCreado?: boolean;
  ptaEstado?: string;
}

interface AsignacionHoraria {
  id: string;
  docenteId: string;
  docenteNombre: string;
  asignatura: string;
  programa: string;
  grupo: string;
  horario: string;
  aula: string;
  modalidad: 'presencial' | 'virtual' | 'hibrido';
  horasSemana: number;
  estudiantesMatriculados: number;
}

interface PTAResumen {
  id: string;
  codigo: string;
  docente: string;
  periodo: string;
  estado: string;
  horasAsignadas: number;
  horasBase: number;
  porcentajeCompletado: number;
  nivelAprobacion: string;
  urgente: boolean;
}

export function Fase4ProgramacionDocente() {
  const [vistaActiva, setVistaActiva] = useState<'ptas' | 'horarios'>('ptas');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  // Docentes seleccionados de convocatorias (simulado)
  const docentesAsignados: DocenteAsignado[] = [
    {
      id: 'DOC-001',
      nombre: 'Dr. Carlos Méndez Rivera',
      tipo: 'catedra',
      sede: 'Bogotá',
      estado: 'activo',
      programacionCreada: true,
      ptaCreado: true,
      ptaEstado: 'urgente'
    },
    {
      id: 'DOC-002',
      nombre: 'Dra. Ana Gutiérrez López',
      tipo: 'catedra',
      sede: 'Medellín',
      estado: 'activo',
      programacionCreada: true,
      ptaCreado: true,
      ptaEstado: 'en_revision'
    },
    {
      id: 'DOC-003',
      nombre: 'Mg. Roberto Silva Castro',
      tipo: 'catedra',
      sede: 'Cali',
      estado: 'activo',
      programacionCreada: true,
      ptaCreado: true,
      ptaEstado: 'devuelto'
    },
    {
      id: 'DOC-004',
      nombre: 'Dr. Juan Pérez Martínez',
      tipo: 'planta',
      sede: 'Bogotá',
      estado: 'activo',
      programacionCreada: false,
      ptaCreado: false
    },
    {
      id: 'DOC-005',
      nombre: 'Dra. María Rodríguez',
      tipo: 'planta',
      sede: 'Medellín',
      estado: 'pendiente',
      programacionCreada: false,
      ptaCreado: false
    },
    {
      id: 'DOC-006',
      nombre: 'Mg. Laura Sánchez',
      tipo: 'catedra',
      sede: 'Bogotá',
      estado: 'activo',
      programacionCreada: true
    },
    {
      id: 'DOC-007',
      nombre: 'Esp. Diego Torres',
      tipo: 'planta',
      sede: 'Cali',
      estado: 'pendiente',
      programacionCreada: false,
      ptaCreado: false
    }
  ];

  // Asignaciones horarias de docentes de cátedra
  const asignacionesHorarias: AsignacionHoraria[] = [
    {
      id: 'ASIG-001',
      docenteId: 'DOC-001',
      docenteNombre: 'Dr. Carlos Méndez Rivera',
      asignatura: 'Políticas Públicas I',
      programa: 'Administración Pública Territorial',
      grupo: 'Grupo A',
      horario: 'Lunes 18:00-22:00',
      aula: 'Aula 301',
      modalidad: 'presencial',
      horasSemana: 4,
      estudiantesMatriculados: 35
    },
    {
      id: 'ASIG-002',
      docenteId: 'DOC-001',
      docenteNombre: 'Dr. Carlos Méndez Rivera',
      asignatura: 'Gestión Territorial',
      programa: 'Administración Pública Territorial',
      grupo: 'Grupo B',
      horario: 'Miércoles 18:00-22:00',
      aula: 'Aula 305',
      modalidad: 'presencial',
      horasSemana: 4,
      estudiantesMatriculados: 32
    },
    {
      id: 'ASIG-003',
      docenteId: 'DOC-002',
      docenteNombre: 'Dra. Ana Gutiérrez López',
      asignatura: 'Presupuesto Público',
      programa: 'Administración Pública Territorial',
      grupo: 'Grupo A',
      horario: 'Martes 14:00-18:00',
      aula: 'Aula 201',
      modalidad: 'presencial',
      horasSemana: 4,
      estudiantesMatriculados: 38
    },
    {
      id: 'ASIG-004',
      docenteId: 'DOC-003',
      docenteNombre: 'Mg. Roberto Silva Castro',
      asignatura: 'Estadística Aplicada',
      programa: 'Administración Pública Territorial',
      grupo: 'Grupo A',
      horario: 'Viernes 18:00-21:00',
      aula: 'Lab 102',
      modalidad: 'hibrido',
      horasSemana: 3,
      estudiantesMatriculados: 32
    },
    {
      id: 'ASIG-005',
      docenteId: 'DOC-003',
      docenteNombre: 'Mg. Roberto Silva Castro',
      asignatura: 'Estadística Aplicada',
      programa: 'Administración Pública Territorial',
      grupo: 'Grupo B',
      horario: 'Sábado 8:00-11:00',
      aula: 'Lab 103',
      modalidad: 'hibrido',
      horasSemana: 3,
      estudiantesMatriculados: 33
    },
    {
      id: 'ASIG-006',
      docenteId: 'DOC-006',
      docenteNombre: 'Mg. Laura Sánchez',
      asignatura: 'Gestión Financiera Pública',
      programa: 'Especialización en Gestión Pública',
      grupo: 'Grupo A',
      horario: 'Sábado 14:00-17:00',
      aula: 'Aula 402',
      modalidad: 'presencial',
      horasSemana: 3,
      estudiantesMatriculados: 25
    }
  ];

  // Convertir PTAs a resumen
  const ptasResumen: PTAResumen[] = todasLasPTAs.map(pta => ({
    id: pta.id,
    codigo: pta.codigo,
    docente: pta.docente_nombre,
    periodo: pta.periodo_nombre,
    estado: pta.estado,
    horasAsignadas: pta.componente_ensenanza.horas + 
                    pta.componente_investigacion.horas + 
                    pta.componente_extension.horas + 
                    pta.componente_apoyo_institucional.horas,
    horasBase: pta.horas_base,
    porcentajeCompletado: Math.round(
      ((pta.componente_ensenanza.horas + pta.componente_investigacion.horas + 
        pta.componente_extension.horas + pta.componente_apoyo_institucional.horas) / 
        pta.horas_base) * 100
    ),
    nivelAprobacion: pta.flujoAprobacion?.nivelActual || 'No iniciado',
    urgente: pta.codigo.includes('006')
  }));

  const docentesFiltrados = docentesAsignados.filter(doc => {
    const matchBusqueda = doc.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchFiltro = filtroEstado === 'todos' || doc.estado === filtroEstado;
    return matchBusqueda && matchFiltro;
  });

  const totalDocentes = docentesAsignados.length;
  const docentesPlanta = docentesAsignados.filter(d => d.tipo === 'planta').length;
  const docentesCatedra = docentesAsignados.filter(d => d.tipo === 'catedra').length;
  const programacionCompleta = docentesAsignados.filter(d => d.programacionCreada).length;
  const ptasCreados = docentesAsignados.filter(d => d.ptaCreado).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-slate-900">Fase 4: Programación Docente</h1>
          </div>
          <p className="text-slate-600">
            Asignación de PTAs y programación horaria para docentes seleccionados
          </p>
        </div>
        <div className="flex gap-2">
          <ButtonSIGL variant="outline" size="md">
            <Download className="w-4 h-4 mr-2" />
            Exportar Programación
          </ButtonSIGL>
          <ButtonSIGL variant="primary" size="md">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Asignación
          </ButtonSIGL>
        </div>
      </div>

      {/* Métricas Globales */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <Users className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-blue-600 mb-1">{totalDocentes}</p>
            <p className="text-sm text-slate-600">Docentes Asignados</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <Building2 className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-indigo-600 mb-1">{docentesPlanta}</p>
            <p className="text-sm text-slate-600">Docentes Planta</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <GraduationCap className="w-6 h-6 text-purple-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-purple-600 mb-1">{docentesCatedra}</p>
            <p className="text-sm text-slate-600">Docentes Cátedra</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <FileText className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-green-600 mb-1">{ptasCreados}</p>
            <p className="text-sm text-slate-600">PTAs Creados</p>
          </div>
        </CardSIGL>

        <CardSIGL variant="elevated">
          <div className="p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-teal-600 mx-auto mb-2" />
            <p className="text-3xl font-bold text-teal-600 mb-1">{programacionCompleta}</p>
            <p className="text-sm text-slate-600">Programación Completa</p>
          </div>
        </CardSIGL>
      </div>

      {/* Tabs: PTAs vs Horarios */}
      <CardSIGL>
        <div className="p-4">
          <div className="flex gap-2 border-b border-slate-200 pb-4">
            <button
              onClick={() => setVistaActiva('ptas')}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${vistaActiva === 'ptas'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                PTAs Docentes de Planta ({ptasCreados})
              </div>
            </button>
            <button
              onClick={() => setVistaActiva('horarios')}
              className={`
                px-4 py-2 rounded-lg font-medium transition-all
                ${vistaActiva === 'horarios'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }
              `}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Programación Hora Cátedra ({asignacionesHorarias.length})
              </div>
            </button>
          </div>
        </div>
      </CardSIGL>

      {/* Vista de PTAs */}
      {vistaActiva === 'ptas' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Filtros */}
          <CardSIGL>
            <div className="p-4 flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por docente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="todos">Todos los estados</option>
                <option value="activo">Activos</option>
                <option value="pendiente">Pendientes</option>
                <option value="inactivo">Inactivos</option>
              </select>
            </div>
          </CardSIGL>

          {/* Lista de PTAs */}
          <div className="space-y-3">
            {ptasResumen.map((pta, index) => (
              <motion.div
                key={pta.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <CardSIGL
                  variant="elevated"
                  className={`${pta.urgente ? 'border-l-4 border-l-red-500' : ''}`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-slate-900 font-semibold">{pta.docente}</h3>
                          {pta.urgente && (
                            <BadgeSIGL variant="danger">🔴 URGENTE</BadgeSIGL>
                          )}
                          <BadgeSIGL variant={
                            pta.estado === 'aprobado' ? 'success' :
                            pta.estado === 'en_aprobacion' ? 'primary' :
                            pta.estado === 'devuelto' ? 'warning' :
                            'default'
                          }>
                            {pta.estado.replace('_', ' ').toUpperCase()}
                          </BadgeSIGL>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">
                          {pta.codigo} • {pta.periodo} • Nivel: {pta.nivelAprobacion}
                        </p>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-xs text-slate-500">Horas Asignadas</p>
                            <p className="text-lg font-bold text-slate-900">{pta.horasAsignadas}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Horas Base</p>
                            <p className="text-lg font-bold text-slate-900">{pta.horasBase}h</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Completado</p>
                            <p className="text-lg font-bold text-blue-600">{pta.porcentajeCompletado}%</p>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-slate-600">Progreso del PTA</span>
                            <span className="font-medium">{pta.porcentajeCompletado}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full ${
                                pta.porcentajeCompletado >= 90 ? 'bg-green-600' :
                                pta.porcentajeCompletado >= 70 ? 'bg-blue-600' :
                                'bg-yellow-600'
                              }`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pta.porcentajeCompletado}%` }}
                              transition={{ duration: 0.5, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <ButtonSIGL variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-2" />
                          Ver Detalles
                        </ButtonSIGL>
                        {pta.estado === 'construccion' && (
                          <ButtonSIGL variant="primary" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </ButtonSIGL>
                        )}
                        {pta.estado === 'construccion' && (
                          <ButtonSIGL variant="success" size="sm">
                            <Send className="w-4 h-4 mr-2" />
                            Enviar
                          </ButtonSIGL>
                        )}
                      </div>
                    </div>
                  </div>
                </CardSIGL>
              </motion.div>
            ))}
          </div>

          {/* Crear nuevo PTA */}
          <CardSIGL variant="primary">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <Plus className="w-8 h-8 text-blue-600" />
                <div className="flex-1">
                  <h3 className="text-slate-900 font-semibold mb-1">
                    Crear PTAs para Nuevos Docentes
                  </h3>
                  <p className="text-slate-600">
                    {docentesPlanta - ptasCreados} docentes de planta pendientes de crear PTA
                  </p>
                </div>
                <ButtonSIGL variant="primary" size="lg">
                  Crear Nuevo PTA
                  <ChevronRight className="w-5 h-5 ml-2" />
                </ButtonSIGL>
              </div>
            </div>
          </CardSIGL>
        </motion.div>
      )}

      {/* Vista de Horarios */}
      {vistaActiva === 'horarios' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Resumen de Asignaciones */}
          <CardSIGL variant="elevated">
            <div className="p-6">
              <h2 className="text-slate-900 font-semibold mb-4">Resumen de Programación</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Calendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{asignacionesHorarias.length}</p>
                  <p className="text-sm text-slate-600">Asignaciones Totales</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <BookOpen className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-600">
                    {new Set(asignacionesHorarias.map(a => a.asignatura)).size}
                  </p>
                  <p className="text-sm text-slate-600">Asignaturas</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <Users className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">
                    {asignacionesHorarias.reduce((sum, a) => sum + a.estudiantesMatriculados, 0)}
                  </p>
                  <p className="text-sm text-slate-600">Estudiantes</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-orange-600">
                    {asignacionesHorarias.reduce((sum, a) => sum + a.horasSemana, 0)}
                  </p>
                  <p className="text-sm text-slate-600">Horas/Semana</p>
                </div>
              </div>
            </div>
          </CardSIGL>

          {/* Agrupación por Docente */}
          <div className="space-y-3">
            {Object.entries(
              asignacionesHorarias.reduce((acc, asig) => {
                if (!acc[asig.docenteId]) acc[asig.docenteId] = [];
                acc[asig.docenteId].push(asig);
                return acc;
              }, {} as Record<string, AsignacionHoraria[]>)
            ).map(([docenteId, asignaciones], index) => (
              <motion.div
                key={docenteId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <CardSIGL variant="elevated">
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-slate-900 font-semibold mb-1">
                          {asignaciones[0].docenteNombre}
                        </h3>
                        <div className="flex items-center gap-2">
                          <BadgeSIGL variant="info">Hora Cátedra</BadgeSIGL>
                          <BadgeSIGL variant="default">
                            {asignaciones.length} asignaciones
                          </BadgeSIGL>
                          <BadgeSIGL variant="success">
                            {asignaciones.reduce((sum, a) => sum + a.horasSemana, 0)} horas/semana
                          </BadgeSIGL>
                        </div>
                      </div>
                      <ButtonSIGL variant="outline" size="sm">
                        <Edit className="w-4 h-4 mr-2" />
                        Editar Horarios
                      </ButtonSIGL>
                    </div>

                    <div className="space-y-2">
                      {asignaciones.map((asig) => (
                        <div
                          key={asig.id}
                          className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Asignatura</p>
                              <p className="font-semibold text-slate-900 text-sm">{asig.asignatura}</p>
                              <p className="text-xs text-slate-600">{asig.grupo}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Horario</p>
                              <p className="font-semibold text-slate-900 text-sm">{asig.horario}</p>
                              <p className="text-xs text-slate-600">{asig.aula}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Modalidad</p>
                              <BadgeSIGL variant={
                                asig.modalidad === 'presencial' ? 'primary' :
                                asig.modalidad === 'virtual' ? 'info' :
                                'warning'
                              }>
                                {asig.modalidad}
                              </BadgeSIGL>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">Estudiantes</p>
                              <p className="font-semibold text-slate-900 text-sm">
                                {asig.estudiantesMatriculados} estudiantes
                              </p>
                              <p className="text-xs text-slate-600">{asig.horasSemana}h/semana</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardSIGL>
              </motion.div>
            ))}
          </div>

          {/* Agregar nueva asignación */}
          <CardSIGL variant="primary">
            <div className="p-6">
              <div className="flex items-center gap-4">
                <Plus className="w-8 h-8 text-blue-600" />
                <div className="flex-1">
                  <h3 className="text-slate-900 font-semibold mb-1">
                    Agregar Nueva Asignación Horaria
                  </h3>
                  <p className="text-slate-600">
                    Asignar horarios a docentes de cátedra disponibles
                  </p>
                </div>
                <ButtonSIGL variant="primary" size="lg">
                  Nueva Asignación
                  <ChevronRight className="w-5 h-5 ml-2" />
                </ButtonSIGL>
              </div>
            </div>
          </CardSIGL>
        </motion.div>
      )}

      {/* Progreso General */}
      <CardSIGL variant="elevated">
        <div className="p-6">
          <h2 className="text-slate-900 font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Progreso de Programación Docente
          </h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600">PTAs Creados (Planta)</span>
                <span className="font-semibold text-slate-900">
                  {ptasCreados} de {docentesPlanta} ({Math.round((ptasCreados / docentesPlanta) * 100)}%)
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${(ptasCreados / docentesPlanta) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600">Asignaciones Horarias (Cátedra)</span>
                <span className="font-semibold text-slate-900">
                  {asignacionesHorarias.length} asignaciones completadas
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-purple-600"
                  initial={{ width: 0 }}
                  animate={{ width: '85%' }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-600">Progreso Total de Fase 4</span>
                <span className="font-semibold text-blue-600">25%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-600 to-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: '25%' }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                />
              </div>
            </div>
          </div>
        </div>
      </CardSIGL>

      {/* Siguiente Paso */}
      <CardSIGL variant="warning">
        <div className="p-6">
          <div className="flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-yellow-600" />
            <div className="flex-1">
              <h3 className="text-slate-900 font-semibold mb-1">
                Fase en Progreso
              </h3>
              <p className="text-slate-600">
                La programación docente está al 25%. Completar todos los PTAs y asignaciones 
                horarias para proceder a la Fase 5 (Evaluación Docente) al finalizar el semestre.
              </p>
            </div>
          </div>
        </div>
      </CardSIGL>
    </div>
  );
}
