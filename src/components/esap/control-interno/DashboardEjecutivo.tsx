/**
 * RF009 - DASHBOARD EJECUTIVO
 * Centro de control visual con métricas en tiempo real de Control Interno
 * Integra todos los módulos: RF003-RF008, RF010, RF012, RF013
 * Oficina de Control Interno - ESAP
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle,
  Clock, Users, FileText, Activity, BarChart3, PieChart,
  Calendar, Shield, Bell, ArrowRight, Download, Filter,
  Eye, Edit, Flag, AlertCircle, CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { useControlInterno } from './ControlInternoContext';
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from 'recharts';

// ============ TIPOS ============

interface MetricaKPI {
  id: string;
  titulo: string;
  valor: number;
  total: number;
  porcentaje: number;
  tendencia: 'up' | 'down' | 'stable';
  cambio: number;
  color: string;
  icono: any;
}

interface Rol {
  id: string;
  nombre: string;
  cumplimiento: number;
  actividades: number;
  completadas: number;
  enProgreso: number;
  color: string;
}

interface Actividad {
  id: string;
  titulo: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
  estado: 'En Progreso' | 'Completada' | 'Alta' | 'Vencida';
  prioridad: 'Alta' | 'Media' | 'Baja';
  observaciones?: string;
}

interface Notificacion {
  id: string;
  tipo: 'alerta' | 'info' | 'exito' | 'advertencia';
  titulo: string;
  descripcion: string;
  fecha: string;
  leida: boolean;
  prioridad: 'Alta' | 'Media' | 'Baja';
}

// ============ DATOS MOCK ============

const METRICAS_KPI: MetricaKPI[] = [
  {
    id: 'kpi-1',
    titulo: 'Auditorías Programadas',
    valor: 18,
    total: 25,
    porcentaje: 72,
    tendencia: 'up',
    cambio: 12,
    color: '#3B82F6',
    icono: Target
  },
  {
    id: 'kpi-2',
    titulo: 'Auditorías Completadas',
    valor: 12,
    total: 18,
    porcentaje: 67,
    tendencia: 'up',
    cambio: 8,
    color: '#10B981',
    icono: CheckCircle
  },
  {
    id: 'kpi-3',
    titulo: 'Hallazgos Abiertos',
    valor: 24,
    total: 45,
    porcentaje: 53,
    tendencia: 'down',
    cambio: -15,
    color: '#F97316',
    icono: AlertTriangle
  },
  {
    id: 'kpi-4',
    titulo: 'Planes de Mejoramiento',
    valor: 8,
    total: 12,
    porcentaje: 67,
    tendencia: 'up',
    cambio: 20,
    color: '#8B5CF6',
    icono: FileText
  }
];

const ROLES_ESTRATEGICOS: Rol[] = [
  {
    id: 'rol-1',
    nombre: 'Rol 1: Liderazgo Estratégico',
    cumplimiento: 75,
    actividades: 4,
    completadas: 3,
    enProgreso: 1,
    color: '#3B82F6'
  },
  {
    id: 'rol-2',
    nombre: 'Rol 2: Gestión de Riesgos',
    cumplimiento: 85,
    actividades: 5,
    completadas: 4,
    enProgreso: 1,
    color: '#10B981'
  },
  {
    id: 'rol-3',
    nombre: 'Rol 3: Control Interno',
    cumplimiento: 60,
    actividades: 6,
    completadas: 3,
    enProgreso: 3,
    color: '#F59E0B'
  },
  {
    id: 'rol-4',
    nombre: 'Rol 4: Cultura de Control',
    cumplimiento: 90,
    actividades: 3,
    completadas: 3,
    enProgreso: 0,
    color: '#8B5CF6'
  },
  {
    id: 'rol-5',
    nombre: 'Rol 5: Mejora Continua',
    cumplimiento: 70,
    actividades: 5,
    completadas: 3,
    enProgreso: 2,
    color: '#EF4444'
  }
];

const ACTIVIDADES_RECIENTES: Actividad[] = [
  {
    id: 'act-1',
    titulo: 'Asesoría en Política de Gestión de Riesgos',
    responsable: 'Mario Osvaldo Bernal Rodríguez',
    fechaInicio: '14 de ene',
    fechaFin: '30 de mar de 2025',
    progreso: 60,
    estado: 'En Progreso',
    prioridad: 'Alta',
    observaciones: 'Reuniones periódicas con subáreas'
  },
  {
    id: 'act-2',
    titulo: 'Acompañamiento Plan Estratégico Institucional',
    responsable: 'Sandra Montero',
    fechaInicio: '31 de ene',
    fechaFin: '29 de jun de 2025',
    progreso: 40,
    estado: 'En Progreso',
    prioridad: 'Alta'
  },
  {
    id: 'act-3',
    titulo: 'Comité de Gestión y Desempeño Institucional',
    responsable: 'Mario Osvaldo Bernal Rodríguez',
    fechaInicio: '9 de ene',
    fechaFin: '30 de dic de 2025',
    progreso: 90,
    estado: 'En Progreso',
    prioridad: 'Alta',
    observaciones: 'Sesiones mensuales programadas'
  }
];

const NOTIFICACIONES_ALERTAS: Notificacion[] = [
  {
    id: 'not-1',
    tipo: 'alerta',
    titulo: 'Auditoría AUD-2025-003 próxima a vencer',
    descripcion: 'Vence en 3 días - Gestión de Talento Humano',
    fecha: '2025-12-14',
    leida: false,
    prioridad: 'Alta'
  },
  {
    id: 'not-2',
    tipo: 'advertencia',
    titulo: '5 hallazgos pendientes de respuesta',
    descripcion: 'Área Jurídica debe presentar plan de mejoramiento',
    fecha: '2025-12-13',
    leida: false,
    prioridad: 'Media'
  },
  {
    id: 'not-3',
    tipo: 'info',
    titulo: 'Nuevo informe de ley generado',
    descripcion: 'Informe trimestral Octubre-Diciembre 2025',
    fecha: '2025-12-12',
    leida: true,
    prioridad: 'Baja'
  },
  {
    id: 'not-4',
    tipo: 'exito',
    titulo: 'Plan de mejoramiento aprobado',
    descripción: 'Plan PM-2025-005 - Gestión Financiera',
    fecha: '2025-12-11',
    leida: true,
    prioridad: 'Media'
  },
  {
    id: 'not-5',
    tipo: 'alerta',
    titulo: '2 aprobaciones pendientes',
    descripcion: 'Planes individuales requieren autorización',
    fecha: '2025-12-10',
    leida: false,
    prioridad: 'Alta'
  }
];

// Datos para gráficas
const DATOS_CUMPLIMIENTO_MENSUAL = [
  { mes: 'Ene', cumplimiento: 65, planificado: 80 },
  { mes: 'Feb', cumplimiento: 70, planificado: 80 },
  { mes: 'Mar', cumplimiento: 75, planificado: 85 },
  { mes: 'Abr', cumplimiento: 72, planificado: 85 },
  { mes: 'May', cumplimiento: 78, planificado: 85 },
  { mes: 'Jun', cumplimiento: 82, planificado: 90 },
  { mes: 'Jul', cumplimiento: 85, planificado: 90 },
  { mes: 'Ago', cumplimiento: 80, planificado: 90 },
  { mes: 'Sep', cumplimiento: 88, planificado: 90 },
  { mes: 'Oct', cumplimiento: 85, planificado: 95 },
  { mes: 'Nov', cumplimiento: 90, planificado: 95 },
  { mes: 'Dic', cumplimiento: 87, planificado: 95 }
];

const DATOS_HALLAZGOS_POR_TIPO = [
  { nombre: 'No Conformidad', valor: 12, color: '#EF4444' },
  { nombre: 'Observación', valor: 18, color: '#F59E0B' },
  { nombre: 'Oportunidad de Mejora', valor: 15, color: '#10B981' }
];

const DATOS_AUDITORIAS_POR_PROCESO = [
  { proceso: 'Gestión Contractual', completadas: 8, pendientes: 3 },
  { proceso: 'Talento Humano', completadas: 5, pendientes: 2 },
  { proceso: 'Gestión Financiera', completadas: 6, pendientes: 1 },
  { proceso: 'Gestión de TIC', completadas: 3, pendientes: 4 },
  { proceso: 'Gestión Documental', completadas: 4, pendientes: 2 }
];

// ============ COMPONENTE PRINCIPAL ============

export function DashboardEjecutivo() {
  const [filtroTiempo, setFiltroTiempo] = useState<'mes' | 'trimestre' | 'año'>('mes');
  const [notificacionesVisibles, setNotificacionesVisibles] = useState(true);
  
  const controlContext = useControlInterno();
  const { auditoria } = useIntegracionControlInterno();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Dashboard Ejecutivo
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF009 - Centro de control visual con métricas en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setFiltroTiempo('mes')}
            variant={filtroTiempo === 'mes' ? 'default' : 'outline'}
            size="sm"
          >
            Mes
          </Button>
          <Button
            onClick={() => setFiltroTiempo('trimestre')}
            variant={filtroTiempo === 'trimestre' ? 'default' : 'outline'}
            size="sm"
          >
            Trimestre
          </Button>
          <Button
            onClick={() => setFiltroTiempo('año')}
            variant={filtroTiempo === 'año' ? 'default' : 'outline'}
            size="sm"
          >
            Año
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* NOTIFICACIONES Y ALERTAS */}
      {notificacionesVisibles && (
        <Card className="p-4 border-l-4" style={{ borderLeftColor: '#EF4444', background: '#FEF2F2' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: '#EF4444' }}>
                <Bell className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="font-black text-gray-900 mb-1">Notificaciones y Alertas</p>
                <p className="text-sm text-gray-700 mb-2">
                  Tienes <strong>{NOTIFICACIONES_ALERTAS.filter(n => !n.leida).length} notificaciones</strong> sin leer
                </p>
                <div className="space-y-2">
                  {NOTIFICACIONES_ALERTAS.slice(0, 3).map(notificacion => (
                    <div key={notificacion.id} className="p-2 bg-white rounded-lg border">
                      <div className="flex items-start gap-2">
                        {notificacion.tipo === 'alerta' && <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />}
                        {notificacion.tipo === 'advertencia' && <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />}
                        {notificacion.tipo === 'info' && <Activity className="w-4 h-4 text-blue-600 mt-0.5" />}
                        {notificacion.tipo === 'exito' && <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900">{notificacion.titulo}</p>
                          <p className="text-xs text-gray-600">{notificacion.descripcion}</p>
                        </div>
                        <Badge
                          style={{
                            background: notificacion.prioridad === 'Alta' ? '#EF4444' :
                              notificacion.prioridad === 'Media' ? '#F59E0B' : '#6B7280',
                            color: '#FFF'
                          }}
                        >
                          {notificacion.prioridad}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="link" size="sm" className="mt-2 p-0 h-auto">
                  Ver todas las notificaciones ({NOTIFICACIONES_ALERTAS.length})
                </Button>
              </div>
            </div>
            <button
              onClick={() => setNotificacionesVisibles(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        </Card>
      )}

      {/* MÉTRICAS KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICAS_KPI.map(metrica => (
          <MetricaKPICard key={metrica.id} metrica={metrica} />
        ))}
      </div>

      {/* PLAN ANUAL - 5 ROLES ESTRATÉGICOS */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900">
              Plan Anual de Auditoría 2025
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Basado en los 5 roles del Decreto 648 de 2017
            </p>
          </div>
          <Badge style={{ background: '#10B981', color: '#FFF' }} className="text-sm px-3 py-1">
            Estado: En Ejecución
          </Badge>
        </div>

        <div className="space-y-4">
          {ROLES_ESTRATEGICOS.map(rol => (
            <RolEstrategicoCard key={rol.id} rol={rol} />
          ))}
        </div>
      </Card>

      {/* GRÁFICAS Y ANÁLISIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfica: Cumplimiento Mensual */}
        <Card className="p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">
            Cumplimiento del Plan Anual
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={DATOS_CUMPLIMIENTO_MENSUAL}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="mes" stroke="#6B7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="cumplimiento"
                stroke="#10B981"
                strokeWidth={3}
                name="Cumplimiento Real"
                dot={{ fill: '#10B981', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="planificado"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Meta Planificada"
                dot={{ fill: '#3B82F6', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Gráfica: Hallazgos por Tipo */}
        <Card className="p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">
            Distribución de Hallazgos
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPie>
              <Pie
                data={DATOS_HALLAZGOS_POR_TIPO}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.nombre}: ${entry.valor}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="valor"
              >
                {DATOS_HALLAZGOS_POR_TIPO.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPie>
          </ResponsiveContainer>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {DATOS_HALLAZGOS_POR_TIPO.map(tipo => (
              <div key={tipo.nombre} className="text-center">
                <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ background: tipo.color }} />
                <p className="text-xs text-gray-600">{tipo.nombre}</p>
                <p className="text-lg font-black text-gray-900">{tipo.valor}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Gráfica: Auditorías por Proceso */}
        <Card className="p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">
            Auditorías por Proceso
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={DATOS_AUDITORIAS_POR_PROCESO}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="proceso" stroke="#6B7280" style={{ fontSize: '10px' }} angle={-15} textAnchor="end" height={80} />
              <YAxis stroke="#6B7280" style={{ fontSize: '12px' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="completadas" fill="#10B981" name="Completadas" />
              <Bar dataKey="pendientes" fill="#F59E0B" name="Pendientes" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Actividades Recientes */}
        <Card className="p-6">
          <h3 className="text-lg font-black text-gray-900 mb-4">
            Actividades en Progreso
          </h3>
          <div className="space-y-3">
            {ACTIVIDADES_RECIENTES.map(actividad => (
              <ActividadCard key={actividad.id} actividad={actividad} />
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-4">
            Ver todas las actividades
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>

      {/* ACCESOS RÁPIDOS */}
      <Card className="p-6">
        <h3 className="text-lg font-black text-gray-900 mb-4">
          Accesos Rápidos
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <AccesoRapido
            titulo="Plan Anual"
            icono={Target}
            color="#3B82F6"
          />
          <AccesoRapido
            titulo="Auditorías"
            icono={CheckCircle}
            color="#10B981"
          />
          <AccesoRapido
            titulo="Hallazgos"
            icono={AlertTriangle}
            color="#F97316"
            badge={24}
          />
          <AccesoRapido
            titulo="Planes"
            icono={FileText}
            color="#8B5CF6"
          />
          <AccesoRapido
            titulo="Informes"
            icono={BarChart3}
            color="#6B7280"
          />
          <AccesoRapido
            titulo="Documentos"
            icono={Shield}
            color="#EC4899"
          />
        </div>
      </Card>
    </div>
  );
}

// ============ COMPONENTES AUXILIARES ============

function MetricaKPICard({ metrica }: { metrica: MetricaKPI }) {
  const Icono = metrica.icono;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <Card className="p-4 border-l-4" style={{ borderLeftColor: metrica.color }}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: metrica.color }}>
            <Icono className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-center gap-1">
            {metrica.tendencia === 'up' && <TrendingUp className="w-4 h-4 text-green-600" />}
            {metrica.tendencia === 'down' && <TrendingDown className="w-4 h-4 text-red-600" />}
            <span
              className="text-xs font-bold"
              style={{ color: metrica.tendencia === 'up' ? '#10B981' : '#EF4444' }}
            >
              {metrica.cambio > 0 ? '+' : ''}{metrica.cambio}%
            </span>
          </div>
        </div>
        
        <p className="text-xs text-gray-600 mb-1">{metrica.titulo}</p>
        <p className="text-2xl font-black text-gray-900 mb-2">
          {metrica.valor}
          <span className="text-sm text-gray-500 font-normal"> / {metrica.total}</span>
        </p>
        
        {/* Barra de progreso */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${metrica.porcentaje}%`,
              background: metrica.color
            }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-right">{metrica.porcentaje}%</p>
      </Card>
    </motion.div>
  );
}

function RolEstrategicoCard({ rol }: { rol: Rol }) {
  return (
    <div className="p-4 rounded-lg border hover:border-blue-500 transition-colors" style={{ background: '#F9FAFB' }}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: rol.color }}>
          <Target className="w-6 h-6 text-white" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="font-black text-gray-900">{rol.nombre}</p>
              <p className="text-sm text-gray-600 mt-1">
                {rol.completadas} de {rol.actividades} actividades completadas
                {rol.enProgreso > 0 && ` • ${rol.enProgreso} en progreso`}
              </p>
            </div>
            <Badge style={{ background: rol.color, color: '#FFF' }}>
              {rol.cumplimiento}%
            </Badge>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${rol.cumplimiento}%`,
                background: rol.color
              }}
            />
          </div>
        </div>

        <Button variant="outline" size="sm">
          <Eye className="w-4 h-4 mr-2" />
          Ver
        </Button>
      </div>
    </div>
  );
}

function ActividadCard({ actividad }: { actividad: Actividad }) {
  return (
    <div className="p-3 rounded-lg border" style={{ background: '#F9FAFB' }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-sm">{actividad.titulo}</p>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
            <Users className="w-3 h-3" />
            <span>{actividad.responsable}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
            <Calendar className="w-3 h-3" />
            <span>{actividad.fechaInicio} - {actividad.fechaFin}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            style={{
              background: actividad.prioridad === 'Alta' ? '#EF4444' :
                actividad.prioridad === 'Media' ? '#F59E0B' : '#6B7280',
              color: '#FFF'
            }}
          >
            {actividad.prioridad}
          </Badge>
          <Badge
            variant="outline"
            style={{
              borderColor: actividad.estado === 'En Progreso' ? '#3B82F6' : '#10B981',
              color: actividad.estado === 'En Progreso' ? '#3B82F6' : '#10B981'
            }}
          >
            {actividad.estado}
          </Badge>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${actividad.progreso}%`,
            background: actividad.prioridad === 'Alta' ? '#3B82F6' : '#10B981'
          }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-right">{actividad.progreso}%</p>

      {actividad.observaciones && (
        <p className="text-xs text-gray-600 italic mt-2">
          Observaciones: {actividad.observaciones}
        </p>
      )}
    </div>
  );
}

function AccesoRapido({ titulo, icono: Icono, color, badge }: { titulo: string; icono: any; color: string; badge?: number }) {
  return (
    <button className="p-4 rounded-lg border hover:border-blue-500 hover:shadow-md transition-all" style={{ background: '#FFFFFF' }}>
      <div className="relative">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: color }}>
          <Icono className="w-6 h-6 text-white" />
        </div>
        {badge !== undefined && (
          <div
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: '#EF4444' }}
          >
            {badge}
          </div>
        )}
      </div>
      <p className="text-sm font-bold text-gray-900">{titulo}</p>
    </button>
  );
}
