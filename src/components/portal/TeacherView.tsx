/**
 * Vista de Docente - Portal Transaccional
 * 
 * Vista especializada para usuarios con rol DOCENTE activo.
 * Integra acceso al PTA, clases, evaluaciones y recursos académicos.
 * Con navegación por tabs para acceso directo a Gestión Profesoral.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Calendar,
  Users,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  BarChart3,
  Download,
  ChevronRight,
  GraduationCap,
  ClipboardList,
  Upload,
  MessageSquare,
  Award,
  Bell,
  Target,
  Activity,
  Lightbulb,
  Home,
  BookMarked,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { toast } from 'sonner@2.0.3';

// Importar componente de PTA y su Provider
import { MiPTADashboardV3 } from './gestion-profesoral/MiPTADashboardV3';
import { PTAProvider } from '../../contexts/PTAContext';

interface TeacherViewProps {
  userName: string;
  userEmail: string;
  teacherData?: {
    tipo_vinculacion: string;
    dedicacion: string;
    area: string;
    codigo_docente: string;
    clases_asignadas: number;
    estudiantes_totales: number;
    nivel_educativo: string;
    anos_experiencia: number;
  };
}

type VistaDocente = 'inicio' | 'pta' | 'clases' | 'evaluaciones';

export function TeacherView({ userName, userEmail, teacherData }: TeacherViewProps) {
  const [vistaActiva, setVistaActiva] = useState<VistaDocente>('inicio');

  // Datos mock si no se proveen
  const data = teacherData || {
    tipo_vinculacion: 'Cátedra',
    dedicacion: 'Medio Tiempo',
    area: 'Administración Pública',
    codigo_docente: 'DOC-00456',
    clases_asignadas: 3,
    estudiantes_totales: 87,
    nivel_educativo: 'Maestría',
    anos_experiencia: 8,
  };

  // Tabs de navegación
  const tabs = [
    { id: 'inicio' as VistaDocente, label: 'Inicio', icon: Home },
    { id: 'pta' as VistaDocente, label: 'Gestión Profesoral', icon: Target, badge: data.tipo_vinculacion === 'Carrera' || data.tipo_vinculacion === 'Ocasional' },
    { id: 'clases' as VistaDocente, label: 'Mis Clases', icon: BookMarked },
    { id: 'evaluaciones' as VistaDocente, label: 'Evaluaciones', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Tabs Navigation - Sticky */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = vistaActiva === tab.id;
              
              // Solo mostrar tab PTA si el docente tiene vinculación Carrera u Ocasional
              if (tab.id === 'pta' && !(data.tipo_vinculacion === 'Carrera' || data.tipo_vinculacion === 'Ocasional')) {
                return null;
              }
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setVistaActiva(tab.id)}
                  className={`
                    relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap
                    transition-colors border-b-2 hover:text-[#003DA5]
                    ${isActive 
                      ? 'text-[#003DA5] border-[#003DA5]' 
                      : 'text-gray-600 border-transparent hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && isActive && (
                    <Badge className="ml-1 bg-green-500 text-white border-none text-xs px-1.5 py-0">
                      Activo
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenido según tab activo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={vistaActiva}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {vistaActiva === 'inicio' && <VistaInicio userName={userName} data={data} onNavigateToPTA={() => setVistaActiva('pta')} />}
          {vistaActiva === 'pta' && (
            <PTAProvider>
              <MiPTADashboardV3
                docenteNombre={userName}
                docenteCodigo={data.codigo_docente}
                tipoVinculacion={data.tipo_vinculacion}
                territorial="Bogotá D.C."
                horasBase={data.tipo_vinculacion === 'Carrera' ? 40 : data.tipo_vinculacion === 'Ocasional' ? 40 : 20}
                periodo="2025-1"
              />
            </PTAProvider>
          )}
          {vistaActiva === 'clases' && <VistaClases userName={userName} data={data} />}
          {vistaActiva === 'evaluaciones' && <VistaEvaluaciones userName={userName} data={data} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Componente de Vista Inicio
interface VistaInicioProps {
  userName: string;
  data: {
    tipo_vinculacion: string;
    dedicacion: string;
    area: string;
    codigo_docente: string;
    clases_asignadas: number;
    estudiantes_totales: number;
    nivel_educativo: string;
    anos_experiencia: number;
  };
  onNavigateToPTA: () => void;
}

function VistaInicio({ userName, data, onNavigateToPTA }: VistaInicioProps) {
  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header docente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold">
                ¡Hola, Profesor(a) {userName.split(' ')[0]}!
              </h1>
            </div>
            <p className="text-purple-100 text-sm sm:text-base mb-4">
              {data.area} • {data.tipo_vinculacion}
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-purple-100">Clases Asignadas</p>
                <p className="text-xl font-bold">{data.clases_asignadas}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-purple-100">Estudiantes</p>
                <p className="text-xl font-bold">{data.estudiantes_totales}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-purple-100">Experiencia</p>
                <p className="text-xl font-bold">{data.anos_experiencia} años</p>
              </div>
            </div>
          </div>
          <Badge className="bg-green-500 text-white border-none">
            Activo
          </Badge>
        </div>
      </motion.div>

      {/* Notificación importante - Acceso a PTA */}
      {(data.tipo_vinculacion === 'Carrera' || data.tipo_vinculacion === 'Ocasional') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-[#003DA5] to-[#1e5da8] rounded-xl p-6 text-white shadow-lg"
        >
          <div className="flex items-start gap-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">
                Plan de Trabajo Académico 2025-1
              </h3>
              <p className="text-sm text-purple-100 mb-4">
                Gestiona tu PTA, revisa aprobaciones y realiza seguimiento de tus actividades académicas
              </p>
              <Button
                onClick={onNavigateToPTA}
                className="bg-white text-[#003DA5] hover:bg-gray-100"
              >
                <Target className="w-4 h-4 mr-2" />
                Acceder a Mi PTA
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickActionCard
          icon={<ClipboardList className="w-6 h-6" />}
          title="Calificaciones"
          description="Ingresar notas"
          color="from-blue-500 to-blue-600"
          onClick={() => toast.info('Abriendo módulo de calificaciones...')}
        />
        <QuickActionCard
          icon={<Users className="w-6 h-6" />}
          title="Mis Estudiantes"
          description="Ver listados"
          color="from-purple-500 to-purple-600"
          onClick={() => toast.info('Cargando listado de estudiantes...')}
        />
        <QuickActionCard
          icon={<Calendar className="w-6 h-6" />}
          title="Horario"
          description="Ver clases"
          color="from-emerald-500 to-emerald-600"
          onClick={() => toast.info('Mostrando horario académico...')}
        />
        <QuickActionCard
          icon={<Upload className="w-6 h-6" />}
          title="Material"
          description="Subir recursos"
          color="from-amber-500 to-amber-600"
          onClick={() => toast.info('Abriendo gestión de material...')}
        />
      </div>

      {/* Cards principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clases asignadas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Clases Asignadas
            </CardTitle>
            <CardDescription>
              Semestre 2025-1 • {data.clases_asignadas} asignaturas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                nombre: 'Políticas Públicas',
                nivel: 'Pregrado',
                estudiantes: 32,
                horario: 'L-M 8:00-10:00',
                progreso: 65,
              },
              {
                nombre: 'Gestión Territorial',
                nivel: 'Especialización',
                estudiantes: 28,
                horario: 'J-V 14:00-16:00',
                progreso: 58,
              },
              {
                nombre: 'Teoría del Estado',
                nivel: 'Pregrado',
                estudiantes: 27,
                horario: 'S 9:00-13:00',
                progreso: 70,
              },
            ].map((clase, index) => (
              <div key={index} className="border rounded-lg p-3 hover:border-purple-300 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-sm">{clase.nombre}</p>
                    <p className="text-xs text-gray-600">{clase.nivel} • {clase.estudiantes} estudiantes</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {clase.horario}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Progreso del curso</span>
                    <span className="font-medium">{clase.progreso}%</span>
                  </div>
                  <Progress value={clase.progreso} className="h-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Actividades pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              Actividades Pendientes
            </CardTitle>
            <CardDescription>
              Tareas y compromisos de esta semana
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                tarea: 'Calificar Parcial II - Políticas Públicas',
                fecha: 'Hoy',
                urgente: true,
                completado: false,
              },
              {
                tarea: 'Subir material Unidad 4 - Gestión Territorial',
                fecha: 'Mañana',
                urgente: false,
                completado: false,
              },
              {
                tarea: 'Reunión comité curricular',
                fecha: 'Viernes 15:00',
                urgente: false,
                completado: false,
              },
              {
                tarea: 'Actualizar PTA - Evidencias Q1',
                fecha: '28 Nov',
                urgente: true,
                completado: false,
              },
            ].map((actividad, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  actividad.urgente ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={actividad.completado}
                  onChange={() => toast.success('Actividad marcada como completada')}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">{actividad.tarea}</p>
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {actividad.fecha}
                    {actividad.urgente && (
                      <Badge className="ml-2 bg-red-100 text-red-700 border-red-200 text-xs px-2 py-0">
                        Urgente
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Estadísticas del Periodo
            </CardTitle>
            <CardDescription>
              Resumen de tu desempeño académico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <StatItem
              label="Calificación promedio asignada"
              valor="4.2"
              maxValor="5.0"
              icon={<TrendingUp className="w-4 h-4 text-green-600" />}
            />
            <Separator />
            <StatItem
              label="Asistencia a clases"
              valor="98%"
              icon={<CheckCircle2 className="w-4 h-4 text-green-600" />}
            />
            <Separator />
            <StatItem
              label="Material didáctico publicado"
              valor="24"
              descripcion="documentos"
              icon={<Upload className="w-4 h-4 text-blue-600" />}
            />
            <Separator />
            <StatItem
              label="Evaluación de estudiantes"
              valor="4.8"
              maxValor="5.0"
              icon={<Award className="w-4 h-4 text-amber-600" />}
            />
          </CardContent>
        </Card>

        {/* Notificaciones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-purple-600" />
              Notificaciones Recientes
            </CardTitle>
            <CardDescription>
              Últimas actualizaciones importantes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                tipo: 'success',
                mensaje: 'Tu PTA 2025-1 fue aprobado por Coordinación',
                tiempo: 'Hace 2 horas',
              },
              {
                tipo: 'info',
                mensaje: 'Nuevo material disponible en biblioteca digital',
                tiempo: 'Hace 5 horas',
              },
              {
                tipo: 'warning',
                mensaje: 'Recordatorio: Comité curricular mañana 15:00',
                tiempo: 'Hace 1 día',
              },
            ].map((notif, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  notif.tipo === 'success'
                    ? 'bg-green-50 border-green-200'
                    : notif.tipo === 'warning'
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <p className="text-sm mb-1">{notif.mensaje}</p>
                <p className="text-xs text-gray-600">{notif.tiempo}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Componente de Vista Clases
interface VistaClasesProps {
  userName: string;
  data: {
    tipo_vinculacion: string;
    dedicacion: string;
    area: string;
    codigo_docente: string;
    clases_asignadas: number;
    estudiantes_totales: number;
    nivel_educativo: string;
    anos_experiencia: number;
  };
}

function VistaClases({ userName, data }: VistaClasesProps) {
  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header docente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold">
                ¡Hola, Profesor(a) {userName.split(' ')[0]}!
              </h1>
            </div>
            <p className="text-purple-100 text-sm sm:text-base mb-4">
              {data.area} • {data.tipo_vinculacion}
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-purple-100">Clases Asignadas</p>
                <p className="text-xl font-bold">{data.clases_asignadas}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-purple-100">Estudiantes</p>
                <p className="text-xl font-bold">{data.estudiantes_totales}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-purple-100">Experiencia</p>
                <p className="text-xl font-bold">{data.anos_experiencia} años</p>
              </div>
            </div>
          </div>
          <Badge className="bg-green-500 text-white border-none">
            Activo
          </Badge>
        </div>
      </motion.div>

      {/* Clases asignadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Clases Asignadas
          </CardTitle>
          <CardDescription>
            Semestre 2025-1 • {data.clases_asignadas} asignaturas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            {
              nombre: 'Políticas Públicas',
              nivel: 'Pregrado',
              estudiantes: 32,
              horario: 'L-M 8:00-10:00',
              progreso: 65,
            },
            {
              nombre: 'Gestión Territorial',
              nivel: 'Especialización',
              estudiantes: 28,
              horario: 'J-V 14:00-16:00',
              progreso: 58,
            },
            {
              nombre: 'Teoría del Estado',
              nivel: 'Pregrado',
              estudiantes: 27,
              horario: 'S 9:00-13:00',
              progreso: 70,
            },
          ].map((clase, index) => (
            <div key={index} className="border rounded-lg p-3 hover:border-purple-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-medium text-sm">{clase.nombre}</p>
                  <p className="text-xs text-gray-600">{clase.nivel} • {clase.estudiantes} estudiantes</p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {clase.horario}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Progreso del curso</span>
                  <span className="font-medium">{clase.progreso}%</span>
                </div>
                <Progress value={clase.progreso} className="h-1" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de Vista Evaluaciones
interface VistaEvaluacionesProps {
  userName: string;
  data: {
    tipo_vinculacion: string;
    dedicacion: string;
    area: string;
    codigo_docente: string;
    clases_asignadas: number;
    estudiantes_totales: number;
    nivel_educativo: string;
    anos_experiencia: number;
  };
}

function VistaEvaluaciones({ userName, data }: VistaEvaluacionesProps) {
  return (
    <div className="space-y-6 p-4 sm:p-6 bg-gray-50 min-h-screen">
      {/* Header docente */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-2xl p-6 text-white shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-6 h-6" />
              <h1 className="text-2xl sm:text-3xl font-bold">
                ¡Hola, Profesor(a) {userName.split(' ')[0]}!
              </h1>
            </div>
            <p className="text-purple-100 text-sm sm:text-base mb-4">
              {data.area} • {data.tipo_vinculacion}
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-purple-100">Clases Asignadas</p>
                <p className="text-xl font-bold">{data.clases_asignadas}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-purple-100">Estudiantes</p>
                <p className="text-xl font-bold">{data.estudiantes_totales}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 border border-white/20">
                <p className="text-xs text-purple-100">Experiencia</p>
                <p className="text-xl font-bold">{data.anos_experiencia} años</p>
              </div>
            </div>
          </div>
          <Badge className="bg-green-500 text-white border-none">
            Activo
          </Badge>
        </div>
      </motion.div>

      {/* Evaluaciones */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            Evaluaciones
          </CardTitle>
          <CardDescription>
            Gestión de calificaciones y evaluaciones
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            {
              tarea: 'Calificar Parcial II - Políticas Públicas',
              fecha: 'Hoy',
              urgente: true,
              completado: false,
            },
            {
              tarea: 'Subir material Unidad 4 - Gestión Territorial',
              fecha: 'Mañana',
              urgente: false,
              completado: false,
            },
            {
              tarea: 'Reunión comité curricular',
              fecha: 'Viernes 15:00',
              urgente: false,
              completado: false,
            },
            {
              tarea: 'Actualizar PTA - Evidencias Q1',
              fecha: '28 Nov',
              urgente: true,
              completado: false,
            },
          ].map((actividad, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg border ${
                actividad.urgente ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <input
                type="checkbox"
                checked={actividad.completado}
                onChange={() => toast.success('Actividad marcada como completada')}
                className="mt-1"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">{actividad.tarea}</p>
                <p className="text-xs text-gray-600 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {actividad.fecha}
                  {actividad.urgente && (
                    <Badge className="ml-2 bg-red-100 text-red-700 border-red-200 text-xs px-2 py-0">
                      Urgente
                    </Badge>
                  )}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Componente de Quick Action Card
interface QuickActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  onClick: () => void;
}

function QuickActionCard({ icon, title, description, color, onClick }: QuickActionCardProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all text-left`}
    >
      <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-white/80">{description}</p>
    </motion.button>
  );
}

// Componente de Estadística
interface StatItemProps {
  label: string;
  valor: string;
  maxValor?: string;
  descripcion?: string;
  icon: React.ReactNode;
}

function StatItem({ label, valor, maxValor, descripcion, icon }: StatItemProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-sm text-gray-600">{label}</p>
          {descripcion && <p className="text-xs text-gray-500">{descripcion}</p>}
        </div>
      </div>
      <p className="font-bold">
        {valor}
        {maxValor && <span className="text-gray-400 text-sm font-normal"> / {maxValor}</span>}
      </p>
    </div>
  );
}