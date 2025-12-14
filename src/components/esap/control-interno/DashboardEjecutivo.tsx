/**
 * DASHBOARD EJECUTIVO - CONTROL INTERNO DE GESTIÓN
 * Vista centralizada de todas las estadísticas y métricas del módulo
 * RF001 - Gráficos de cumplimiento del Plan Anual
 */

'use client';

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Calendar,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

// ============ COLORES ============

const COLORES_ROL = ['#003DA5', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444'];
const COLORES_ESTADO = ['#3B82F6', '#6B7280'];
const COLORES_DETALLE = {
  completadas: '#10B981',
  enProgreso: '#3B82F6',
  pendientes: '#6B7280',
  retrasadas: '#EF4444',
};

// ============ TIPOS ============

interface Actividad {
  id: string;
  nombre: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'en-progreso' | 'completada' | 'retrasada';
  porcentajeAvance: number;
  observaciones: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
}

interface Rol {
  id: number;
  nombre: string;
  descripcion: string;
  color: string;
  icono: any;
  actividades: Actividad[];
  porcentajeCumplimiento: number;
}

interface PlanAnual {
  añoFiscal: number;
  fechaCreacion: string;
  responsable: string;
  estado: 'borrador' | 'aprobado' | 'en-ejecucion' | 'completado';
  roles: Rol[];
}

// ============ DATOS MOCK DEL PLAN ANUAL ============
// Importamos la misma estructura que usa PlanAnual5Roles

const MOCK_PLAN_ANUAL: PlanAnual = {
  añoFiscal: 2025,
  fechaCreacion: '2024-12-01',
  responsable: 'Mario Oswaldo Bernal Rodriguez',
  estado: 'en-ejecucion',
  roles: [
    {
      id: 1,
      nombre: 'Liderazgo Estratégico',
      descripcion: 'Asesorar y acompañar a la alta dirección en la gestión del riesgo y el control',
      color: '#3B82F6',
      icono: null,
      porcentajeCumplimiento: 75,
      actividades: [
        {
          id: '1-1',
          nombre: 'Asesoría en Política de Gestión de Riesgos',
          descripcion: 'Asesorar a la Dirección Nacional en la actualización de la política de riesgos institucional',
          responsable: 'Mario Oswaldo Bernal Rodriguez',
          fechaInicio: '2025-01-15',
          fechaFin: '2025-03-31',
          estado: 'en-progreso',
          porcentajeAvance: 60,
          observaciones: 'Reuniones periódicas con subdirecciones',
          prioridad: 'Alta'
        },
        {
          id: '1-2',
          nombre: 'Acompañamiento Plan Estratégico Institucional',
          descripcion: 'Acompañar la formulación y seguimiento del Plan Estratégico 2025-2028',
          responsable: 'Sandra Montero',
          fechaInicio: '2025-02-01',
          fechaFin: '2025-06-30',
          estado: 'en-progreso',
          porcentajeAvance: 40,
          observaciones: '',
          prioridad: 'Alta'
        },
        {
          id: '1-3',
          nombre: 'Comité de Gestión y Desempeño Institucional',
          descripcion: 'Participación activa en el Comité de Gestión Institucional mensual',
          responsable: 'Mario Oswaldo Bernal Rodriguez',
          fechaInicio: '2025-01-10',
          fechaFin: '2025-12-31',
          estado: 'en-progreso',
          porcentajeAvance: 90,
          observaciones: 'Sesiones mensuales programadas',
          prioridad: 'Alta'
        },
        {
          id: '1-4',
          nombre: 'Informe Ejecutivo Trimestral a Dirección',
          descripcion: 'Presentación de informe trimestral de gestión a la Dirección Nacional',
          responsable: 'Mario Oswaldo Bernal Rodriguez',
          fechaInicio: '2024-12-01',
          fechaFin: '2024-12-18',
          estado: 'completada',
          porcentajeAvance: 100,
          observaciones: 'Entregado',
          prioridad: 'Alta'
        }
      ]
    },
    {
      id: 2,
      nombre: 'Enfoque hacia la Prevención',
      descripcion: 'Fomentar la cultura del autocontrol y promover acciones preventivas',
      color: '#10B981',
      icono: null,
      porcentajeCumplimiento: 65,
      actividades: [
        {
          id: '2-1',
          nombre: 'Capacitación en Cultura de Control',
          descripcion: 'Diseñar e implementar programa de capacitación en autocontrol para funcionarios',
          responsable: 'Fernando Ávila',
          fechaInicio: '2025-01-20',
          fechaFin: '2025-04-30',
          estado: 'en-progreso',
          porcentajeAvance: 55,
          observaciones: '3 talleres realizados, faltan 2',
          prioridad: 'Media'
        },
        {
          id: '2-2',
          nombre: 'Seguimiento a Planes de Mejoramiento Internos',
          descripcion: 'Realizar seguimiento trimestral a planes de mejoramiento de auditorías previas',
          responsable: 'Nubia Pimiento',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          estado: 'en-progreso',
          porcentajeAvance: 70,
          observaciones: 'Primer seguimiento completado',
          prioridad: 'Alta'
        },
        {
          id: '2-3',
          nombre: 'Programa de Transparencia y Ética Pública',
          descripcion: 'Implementación del programa de transparencia según normativa vigente',
          responsable: 'William Ramírez',
          fechaInicio: '2025-02-01',
          fechaFin: '2025-05-31',
          estado: 'en-progreso',
          porcentajeAvance: 50,
          observaciones: '',
          prioridad: 'Media'
        }
      ]
    },
    {
      id: 3,
      nombre: 'Relación con Entes de Control',
      descripcion: 'Coordinar y facilitar las relaciones con organismos de control externo',
      color: '#F59E0B',
      icono: null,
      porcentajeCumplimiento: 80,
      actividades: [
        {
          id: '3-1',
          nombre: 'Atención Requerimientos CGR',
          descripcion: 'Coordinar respuesta a requerimientos de la Contraloría General de la República',
          responsable: 'Alexandra Triviño',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          estado: 'en-progreso',
          porcentajeAvance: 85,
          observaciones: '12 requerimientos atendidos',
          prioridad: 'Alta'
        },
        {
          id: '3-2',
          nombre: 'Seguimiento Plan de Mejoramiento CGR',
          descripcion: 'Seguimiento mensual al plan de mejoramiento establecido con la CGR',
          responsable: 'Fernando Ávila',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          estado: 'en-progreso',
          porcentajeAvance: 75,
          observaciones: 'Cumplimiento satisfactorio',
          prioridad: 'Alta'
        },
        {
          id: '3-3',
          nombre: 'Informes a Entes de Control',
          descripcion: 'Generación y envío de informes obligatorios a entes de control externos',
          responsable: 'Catalina Rubio',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          estado: 'en-progreso',
          porcentajeAvance: 80,
          observaciones: 'Entregas al día',
          prioridad: 'Alta'
        }
      ]
    },
    {
      id: 4,
      nombre: 'Evaluación y Gestión de Riesgos',
      descripcion: 'Evaluar la gestión del riesgo institucional y la efectividad de los controles',
      color: '#8B5CF6',
      icono: null,
      porcentajeCumplimiento: 55,
      actividades: [
        {
          id: '4-1',
          nombre: 'Evaluación Mapa de Riesgos de Corrupción',
          descripcion: 'Evaluar cuatrimestralmente el mapa de riesgos de corrupción institucional',
          responsable: 'Sandra Montero',
          fechaInicio: '2025-01-15',
          fechaFin: '2025-12-31',
          estado: 'en-progreso',
          porcentajeAvance: 40,
          observaciones: 'Primera evaluación en curso',
          prioridad: 'Alta'
        },
        {
          id: '4-2',
          nombre: 'Evaluación Mapa de Riesgos de Gestión',
          descripcion: 'Evaluar cuatrimestralmente el mapa de riesgos de gestión y seguridad digital',
          responsable: 'Sandra Montero',
          fechaInicio: '2025-01-15',
          fechaFin: '2025-12-31',
          estado: 'en-progreso',
          porcentajeAvance: 40,
          observaciones: 'Primera evaluación en curso',
          prioridad: 'Alta'
        },
        {
          id: '4-3',
          nombre: 'Auditoría a Gestión de Riesgos',
          descripcion: 'Realizar auditoría a la gestión de riesgos en procesos críticos',
          responsable: 'William Ramírez',
          fechaInicio: '2025-03-01',
          fechaFin: '2025-06-30',
          estado: 'pendiente',
          porcentajeAvance: 0,
          observaciones: 'Programada para marzo',
          prioridad: 'Media'
        },
        {
          id: '4-4',
          nombre: 'Auditoría a Gestión de Riesgos Adicional',
          descripcion: 'Realizar auditoría a la gestión de riesgos en procesos críticos',
          responsable: 'William Ramírez',
          fechaInicio: '2025-03-01',
          fechaFin: '2025-06-30',
          estado: 'retrasada',
          porcentajeAvance: 20,
          observaciones: 'Atrasada',
          prioridad: 'Media'
        }
      ]
    },
    {
      id: 5,
      nombre: 'Evaluación y Seguimiento',
      descripcion: 'Evaluar y hacer seguimiento a la gestión institucional y los procesos',
      color: '#EF4444',
      icono: null,
      porcentajeCumplimiento: 60,
      actividades: [
        {
          id: '5-1',
          nombre: 'Auditorías Internas Programadas',
          descripcion: 'Ejecutar 33-35 auditorías internas según programa anual',
          responsable: 'Mario Oswaldo Bernal Rodriguez',
          fechaInicio: '2025-01-15',
          fechaFin: '2025-11-30',
          estado: 'en-progreso',
          porcentajeAvance: 25,
          observaciones: '8 de 33 auditorías completadas',
          prioridad: 'Alta'
        },
        {
          id: '5-2',
          nombre: 'Evaluación Sistema de Control Interno',
          descripcion: 'Evaluación anual del Sistema de Control Interno institucional',
          responsable: 'Sandra Montero',
          fechaInicio: '2025-08-01',
          fechaFin: '2025-11-30',
          estado: 'pendiente',
          porcentajeAvance: 0,
          observaciones: 'Programada para agosto',
          prioridad: 'Alta'
        },
        {
          id: '5-3',
          nombre: 'Medición MECI',
          descripcion: 'Realizar medición anual del Modelo Estándar de Control Interno',
          responsable: 'Fernando Ávila',
          fechaInicio: '2025-09-01',
          fechaFin: '2025-11-30',
          estado: 'pendiente',
          porcentajeAvance: 0,
          observaciones: 'Programada para septiembre',
          prioridad: 'Alta'
        },
        {
          id: '5-4',
          nombre: 'Evaluación Gestión por Dependencias',
          descripcion: 'Evaluación semestral de gestión por dependencias',
          responsable: 'Catalina Rubio',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          estado: 'retrasada',
          porcentajeAvance: 30,
          observaciones: 'Primera evaluación atrasada',
          prioridad: 'Media'
        },
        {
          id: '5-5',
          nombre: 'Auditoría a DAFP',
          descripcion: 'Auditoría al Departamento Administrativo de la Función Pública',
          responsable: 'Catalina Rubio',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          estado: 'retrasada',
          porcentajeAvance: 15,
          observaciones: 'Evaluación atrasada',
          prioridad: 'Media'
        },
        {
          id: '5-6',
          nombre: 'Auditoría Final',
          descripcion: 'Auditoría final del periodo',
          responsable: 'Catalina Rubio',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-12-31',
          estado: 'retrasada',
          porcentajeAvance: 50,
          observaciones: 'Evaluación atrasada',
          prioridad: 'Media'
        }
      ]
    }
  ]
};

// ============ COMPONENTE PRINCIPAL ============

export function DashboardEjecutivo() {
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('2025');

  // ============ CÁLCULOS DINÁMICOS DEL PLAN ANUAL ============

  const datosCalculados = useMemo(() => {
    // Calcular métricas generales
    const totalActividades = MOCK_PLAN_ANUAL.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
    const actividadesCompletadas = MOCK_PLAN_ANUAL.roles.reduce(
      (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'completada').length, 0
    );
    const actividadesEnProgreso = MOCK_PLAN_ANUAL.roles.reduce(
      (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'en-progreso').length, 0
    );
    const actividadesPendientes = MOCK_PLAN_ANUAL.roles.reduce(
      (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'pendiente').length, 0
    );
    const actividadesRetrasadas = MOCK_PLAN_ANUAL.roles.reduce(
      (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'retrasada').length, 0
    );

    const cumplimientoGeneral = Math.round(
      MOCK_PLAN_ANUAL.roles.reduce((sum, rol) => sum + rol.porcentajeCumplimiento, 0) / MOCK_PLAN_ANUAL.roles.length
    );

    // Datos para el gráfico de actividades por estado (Dona)
    const dataActividadesPorEstado = [
      { 
        estado: 'En Progreso', 
        cantidad: actividadesEnProgreso,
        porcentaje: Math.round((actividadesEnProgreso / totalActividades) * 100)
      },
      { 
        estado: 'Pendientes', 
        cantidad: actividadesPendientes + actividadesRetrasadas,
        porcentaje: Math.round(((actividadesPendientes + actividadesRetrasadas) / totalActividades) * 100)
      },
    ];

    // Datos para el gráfico de detalle por rol y estado (Barras apiladas)
    const dataDetallePorRolYEstado = MOCK_PLAN_ANUAL.roles.map(rol => ({
      rol: rol.nombre,
      completadas: rol.actividades.filter(a => a.estado === 'completada').length,
      enProgreso: rol.actividades.filter(a => a.estado === 'en-progreso').length,
      pendientes: rol.actividades.filter(a => a.estado === 'pendiente').length,
      retrasadas: rol.actividades.filter(a => a.estado === 'retrasada').length,
    }));

    return {
      cumplimientoGeneral,
      totalActividades,
      actividadesCompletadas,
      actividadesEnProgreso,
      actividadesPendientes,
      actividadesRetrasadas,
      dataActividadesPorEstado,
      dataDetallePorRolYEstado,
    };
  }, []);

  // ============ DATOS MOCK PARA OTRAS SECCIONES ============

  const dataHallazgosPorTipo = [
    { tipo: 'No Conformidad Mayor', cantidad: 8 },
    { tipo: 'No Conformidad Menor', cantidad: 15 },
    { tipo: 'Observación', cantidad: 23 },
    { tipo: 'Oportunidad de Mejora', cantidad: 12 },
  ];

  const dataPlanesPorEstado = [
    { estado: 'En Ejecución', cantidad: 18, porcentaje: 45 },
    { estado: 'Completados', cantidad: 15, porcentaje: 37.5 },
    { estado: 'Vencidos', cantidad: 5, porcentaje: 12.5 },
    { estado: 'En Revisión', cantidad: 2, porcentaje: 5 },
  ];

  const dataAuditoriasPorTerritorial = [
    { territorial: 'Sede Principal', cantidad: 12 },
    { territorial: 'Antioquia', cantidad: 8 },
    { territorial: 'Valle', cantidad: 7 },
    { territorial: 'Atlántico', cantidad: 6 },
    { territorial: 'Santander', cantidad: 5 },
    { territorial: 'Otros', cantidad: 15 },
  ];

  // ============ MÉTRICAS GENERALES ============

  const metricas = {
    cumplimientoGeneral: datosCalculados.cumplimientoGeneral,
    totalActividades: datosCalculados.totalActividades,
    actividadesCompletadas: datosCalculados.actividadesCompletadas,
    totalAuditorias: 24,
    auditoriasEnCurso: 8,
    totalHallazgos: 58,
    hallazgosCriticos: 8,
    planesActivos: 40,
    planesCumplidos: 15,
  };

  // ============ RENDER ============

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#E0EFFF' }}>
              <BarChart3 className="w-7 h-7" style={{ color: '#003DA5' }} />
            </div>
            Dashboard Ejecutivo - Control Interno
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Métricas y estadísticas consolidadas del año {periodoSeleccionado}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de período */}
          <select
            value={periodoSeleccionado}
            onChange={(e) => setPeriodoSeleccionado(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
          >
            <option value="2025">2025</option>
            <option value="2024">2024</option>
            <option value="2023">2023</option>
          </select>

          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>

          <Button size="sm" style={{ backgroundColor: '#003DA5' }}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Cumplimiento General */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-5 h-5 opacity-80" />
            <ArrowUpRight className="w-4 h-4 opacity-60" />
          </div>
          <p className="text-3xl font-bold mb-1">{metricas.cumplimientoGeneral}%</p>
          <p className="text-sm opacity-90">Cumplimiento General</p>
        </div>

        {/* Actividades */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-5 h-5 text-green-600" />
            <Badge variant="secondary">{metricas.totalActividades}</Badge>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metricas.actividadesCompletadas}</p>
          <p className="text-sm text-gray-600">Actividades Completadas</p>
        </div>

        {/* Auditorías */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            <Badge variant="secondary">{metricas.totalAuditorias}</Badge>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metricas.auditoriasEnCurso}</p>
          <p className="text-sm text-gray-600">Auditorías en Curso</p>
        </div>

        {/* Hallazgos Críticos */}
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <Badge className="bg-red-100 text-red-800">{metricas.hallazgosCriticos}</Badge>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metricas.totalHallazgos}</p>
          <p className="text-sm text-gray-600">Total Hallazgos</p>
        </div>
      </div>

      {/* Sección: Análisis Visual del Plan Anual */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" style={{ color: '#003DA5' }} />
              Análisis Visual del Plan Anual
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Métricas y gráficos de cumplimiento
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filtrar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cumplimiento por Rol */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Cumplimiento por Rol</h3>
              <Badge variant="outline">5 roles</Badge>
            </div>
            <p className="text-xs text-gray-500 mb-4">Porcentaje de avance de cada rol</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={MOCK_PLAN_ANUAL.roles.map((rol) => ({ rol: rol.nombre, cumplimiento: rol.porcentajeCumplimiento }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="rol" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="cumplimiento" fill="#003DA5" radius={[8, 8, 0, 0]}>
                  {MOCK_PLAN_ANUAL.roles.map((rol, index) => (
                    <Cell key={`cell-${index}`} fill={rol.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-4 justify-center">
              {MOCK_PLAN_ANUAL.roles.map((item, index) => (
                <div key={item.nombre} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-xs text-gray-600">{item.nombre}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actividades por Estado */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Actividades por Estado</h3>
              <Badge variant="outline">{metricas.totalActividades} total</Badge>
            </div>
            <p className="text-xs text-gray-500 mb-4">Distribución del total de actividades</p>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Pie
                  data={datosCalculados.dataActividadesPorEstado}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  dataKey="cantidad"
                  label={({ porcentaje }) => `${porcentaje}%`}
                >
                  {datosCalculados.dataActividadesPorEstado.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORES_ESTADO[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 mt-4">
              {datosCalculados.dataActividadesPorEstado.map((item, index) => (
                <div key={item.estado} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: COLORES_ESTADO[index] }}
                    />
                    <span className="text-sm text-gray-700">{item.estado}</span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {item.cantidad} ({item.porcentaje}%)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detalle por Rol y Estado */}
          <div className="border rounded-lg p-4 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Detalle por Rol y Estado</h3>
              <Badge variant="outline">Composición de actividades</Badge>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Composición de actividades por rol
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={datosCalculados.dataDetallePorRolYEstado}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="rol" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="completadas"
                  stackId="a"
                  fill={COLORES_DETALLE.completadas}
                  name="Completadas"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="enProgreso"
                  stackId="a"
                  fill={COLORES_DETALLE.enProgreso}
                  name="En Progreso"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="pendientes"
                  stackId="a"
                  fill={COLORES_DETALLE.pendientes}
                  name="Pendientes"
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="retrasadas"
                  stackId="a"
                  fill={COLORES_DETALLE.retrasadas}
                  name="Retrasadas"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sección: Hallazgos y Planes de Mejoramiento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hallazgos por Tipo */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Hallazgos por Tipo
            </h2>
            <Badge variant="outline">{metricas.totalHallazgos} total</Badge>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dataHallazgosPorTipo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="tipo" type="category" tick={{ fontSize: 11 }} width={150} />
              <Tooltip />
              <Bar dataKey="cantidad" fill="#F59E0B" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Planes de Mejoramiento */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Planes de Mejoramiento
            </h2>
            <Badge variant="outline">{metricas.planesActivos} activos</Badge>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <RechartsPieChart>
              <Pie
                data={dataPlanesPorEstado}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="cantidad"
                label={({ estado, porcentaje }) => `${estado}: ${porcentaje}%`}
              >
                <Cell fill="#10B981" />
                <Cell fill="#3B82F6" />
                <Cell fill="#EF4444" />
                <Cell fill="#F59E0B" />
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Auditorías por Territorial */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <PieChart className="w-5 h-5" style={{ color: '#003DA5' }} />
            Auditorías por Territorial
          </h2>
          <Badge variant="outline">16 territoriales</Badge>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={dataAuditoriasPorTerritorial}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
            <XAxis dataKey="territorial" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="cantidad" fill="#003DA5" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Indicadores Clave */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Tiempo Promedio</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">18 días</p>
          <p className="text-xs text-gray-500 mt-1">Por auditoría</p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Efectividad</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">92%</p>
          <p className="text-xs text-gray-500 mt-1">Hallazgos resueltos</p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">Tendencia</span>
          </div>
          <p className="text-2xl font-bold text-green-600">+15%</p>
          <p className="text-xs text-gray-500 mt-1">vs año anterior</p>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-orange-600" />
            <span className="text-sm text-gray-600">Cobertura</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">85%</p>
          <p className="text-xs text-gray-500 mt-1">Procesos auditados</p>
        </div>
      </div>
    </div>
  );
}