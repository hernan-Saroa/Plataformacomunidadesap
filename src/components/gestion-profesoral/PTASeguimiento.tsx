import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  FileText,
  Calendar,
  User,
  BookOpen
} from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback } from '../ui/avatar';

interface PTASeguimientoProps {
  className?: string;
  ptaId?: string;
}

interface Componente {
  nombre: string;
  horas_programadas: number;
  horas_ejecutadas: number;
  porcentaje_cumplimiento: number;
  estado: 'En Riesgo' | 'Atención' | 'Cumpliendo' | 'Completado';
  actividades: ActividadSeguimiento[];
}

interface ActividadSeguimiento {
  descripcion: string;
  horas_programadas: number;
  horas_reportadas: number;
  evidencias: number;
  fecha_limite?: string;
}

interface Alerta {
  tipo: 'Crítico' | 'Advertencia' | 'Info';
  mensaje: string;
  componente: string;
  fecha: string;
}

export function PTASeguimiento({ className = '', ptaId = '1' }: PTASeguimientoProps) {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025-I');
  
  // Mock data
  const docente = {
    nombre: 'María López Gómez',
    periodo: '2025-I',
    territorial: 'Bogotá',
    avance_global: 72
  };

  const componentes: Componente[] = [
    {
      nombre: 'Enseñanza',
      horas_programadas: 384,
      horas_ejecutadas: 298,
      porcentaje_cumplimiento: 78,
      estado: 'Cumpliendo',
      actividades: [
        {
          descripcion: 'Derecho Administrativo I',
          horas_programadas: 64,
          horas_reportadas: 56,
          evidencias: 12
        },
        {
          descripcion: 'Procedimiento Administrativo',
          horas_programadas: 64,
          horas_reportadas: 52,
          evidencias: 10
        },
        {
          descripcion: 'Preparación de clases',
          horas_programadas: 128,
          horas_reportadas: 98,
          evidencias: 8
        },
        {
          descripcion: 'Atención a estudiantes',
          horas_programadas: 64,
          horas_reportadas: 48,
          evidencias: 5
        },
        {
          descripcion: 'Evaluaciones',
          horas_programadas: 64,
          horas_reportadas: 44,
          evidencias: 6
        }
      ]
    },
    {
      nombre: 'Investigación',
      horas_programadas: 128,
      horas_ejecutadas: 82,
      porcentaje_cumplimiento: 64,
      estado: 'Atención',
      actividades: [
        {
          descripcion: 'Proyecto investigación',
          horas_programadas: 96,
          horas_reportadas: 58,
          evidencias: 3,
          fecha_limite: '2025-06-30'
        },
        {
          descripcion: 'Publicación artículo',
          horas_programadas: 32,
          horas_reportadas: 24,
          evidencias: 2,
          fecha_limite: '2025-05-15'
        }
      ]
    },
    {
      nombre: 'Extensión',
      horas_programadas: 64,
      horas_ejecutadas: 48,
      porcentaje_cumplimiento: 75,
      estado: 'Cumpliendo',
      actividades: [
        {
          descripcion: 'Consultorías',
          horas_programadas: 32,
          horas_reportadas: 26,
          evidencias: 4
        },
        {
          descripcion: 'Conferencias',
          horas_programadas: 32,
          horas_reportadas: 22,
          evidencias: 3
        }
      ]
    },
    {
      nombre: 'Apoyo Institucional',
      horas_programadas: 64,
      horas_ejecutadas: 58,
      porcentaje_cumplimiento: 91,
      estado: 'Cumpliendo',
      actividades: [
        {
          descripcion: 'Comité curricular',
          horas_programadas: 32,
          horas_reportadas: 30,
          evidencias: 6
        },
        {
          descripcion: 'Actividades administrativas',
          horas_programadas: 32,
          horas_reportadas: 28,
          evidencias: 4
        }
      ]
    }
  ];

  const alertas: Alerta[] = [
    {
      tipo: 'Advertencia',
      mensaje: 'El componente de Investigación está por debajo del 70% de cumplimiento',
      componente: 'Investigación',
      fecha: '2025-02-18'
    },
    {
      tipo: 'Info',
      mensaje: 'Se aproxima fecha límite de publicación (Mayo 15)',
      componente: 'Investigación',
      fecha: '2025-02-15'
    }
  ];

  const getEstadoColor = (estado: Componente['estado']) => {
    switch (estado) {
      case 'Completado':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Cumpliendo':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Atención':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'En Riesgo':
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getAlertaColor = (tipo: Alerta['tipo']) => {
    switch (tipo) {
      case 'Crítico':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'Advertencia':
        return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'Info':
        return 'bg-blue-50 border-blue-200 text-blue-700';
    }
  };

  const getAlertaIcon = (tipo: Alerta['tipo']) => {
    switch (tipo) {
      case 'Crítico':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'Advertencia':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'Info':
        return <FileText className="w-5 h-5 text-blue-600" />;
    }
  };

  const getInitials = (nombre: string) => {
    const parts = nombre.split(' ');
    return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase();
  };

  const totalHorasProgramadas = componentes.reduce((sum, c) => sum + c.horas_programadas, 0);
  const totalHorasEjecutadas = componentes.reduce((sum, c) => sum + c.horas_ejecutadas, 0);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            Seguimiento de PTA
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitoreo de ejecución y cumplimiento
          </p>
        </div>
        <select
          value={periodoSeleccionado}
          onChange={(e) => setPeriodoSeleccionado(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg"
        >
          <option value="2025-I">2025-I</option>
          <option value="2024-II">2024-II</option>
          <option value="2024-I">2024-I</option>
        </select>
      </div>

      {/* Info Docente */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-12 h-12">
            <AvatarFallback className="bg-[#1e5da8] text-white">
              {getInitials(docente.nombre)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{docente.nombre}</h2>
            <p className="text-gray-600">{docente.territorial} • Periodo {docente.periodo}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-[#1e5da8]">{docente.avance_global}%</p>
            <p className="text-sm text-gray-600">Avance Global</p>
          </div>
        </div>
      </Card>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">{totalHorasProgramadas}h</span>
          </div>
          <p className="text-sm text-gray-600">Horas Programadas</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-bold text-gray-900">{totalHorasEjecutadas}h</span>
          </div>
          <p className="text-sm text-gray-600">Horas Ejecutadas</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <span className="text-2xl font-bold text-gray-900">
              {Math.round((totalHorasEjecutadas / totalHorasProgramadas) * 100)}%
            </span>
          </div>
          <p className="text-sm text-gray-600">Cumplimiento</p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
            <span className="text-2xl font-bold text-gray-900">{alertas.length}</span>
          </div>
          <p className="text-sm text-gray-600">Alertas Activas</p>
        </Card>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-gray-900">Alertas y Notificaciones</h3>
          {alertas.map((alerta, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-4 border-l-4 ${getAlertaColor(alerta.tipo)}`}>
                <div className="flex items-start gap-3">
                  {getAlertaIcon(alerta.tipo)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary">{alerta.componente}</Badge>
                      <span className="text-xs text-gray-600">{alerta.fecha}</span>
                    </div>
                    <p className="text-sm font-medium">{alerta.mensaje}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Componentes */}
      <div className="space-y-6">
        <h3 className="font-bold text-gray-900">Seguimiento por Componente</h3>
        
        {componentes.map((componente, index) => (
          <motion.div
            key={componente.nombre}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="p-6">
              {/* Header del Componente */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-bold text-gray-900">{componente.nombre}</h4>
                    <Badge className={getEstadoColor(componente.estado)}>
                      {componente.estado}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>{componente.horas_ejecutadas} / {componente.horas_programadas} horas</span>
                    <span>•</span>
                    <span>{componente.actividades.length} actividades</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-[#1e5da8]">
                    {componente.porcentaje_cumplimiento}%
                  </p>
                  <p className="text-xs text-gray-600">Cumplimiento</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <Progress 
                  value={componente.porcentaje_cumplimiento} 
                  className={`h-3 ${
                    componente.porcentaje_cumplimiento >= 80 ? 'bg-green-500' :
                    componente.porcentaje_cumplimiento >= 60 ? 'bg-blue-500' :
                    componente.porcentaje_cumplimiento >= 40 ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                />
              </div>

              {/* Actividades */}
              <div className="space-y-2">
                {componente.actividades.map((actividad, actIndex) => {
                  const porcentaje = (actividad.horas_reportadas / actividad.horas_programadas) * 100;
                  
                  return (
                    <div key={actIndex} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm mb-1">
                            {actividad.descripcion}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-gray-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{actividad.horas_reportadas}/{actividad.horas_programadas}h</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              <span>{actividad.evidencias} evidencias</span>
                            </div>
                            {actividad.fecha_limite && (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Límite: {actividad.fecha_limite}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p className={`text-lg font-bold ${
                            porcentaje >= 80 ? 'text-green-600' :
                            porcentaje >= 60 ? 'text-blue-600' :
                            porcentaje >= 40 ? 'text-amber-600' :
                            'text-red-600'
                          }`}>
                            {Math.round(porcentaje)}%
                          </p>
                        </div>
                      </div>
                      <Progress value={porcentaje} className="h-1" />
                    </div>
                  );
                })}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Acciones */}
      <Card className="p-6 bg-gray-50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="font-bold text-gray-900 mb-1">Acciones Disponibles</h4>
            <p className="text-sm text-gray-600">
              Gestiona el seguimiento del PTA
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Gráficos
            </Button>
            <Button size="sm" className="bg-[#1e5da8] hover:bg-[#1a4d8f]">
              <FileText className="w-4 h-4 mr-2" />
              Generar Informe
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
