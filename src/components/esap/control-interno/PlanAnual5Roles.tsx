/**
 * PLAN ANUAL DE AUDITORÍA - 5 ROLES DEL DECRETO 648 DE 2017
 * RF001 - Gestión del Plan Anual estructurado por roles normativos
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, Shield, Building2, TrendingUp, CheckCircle2,
  Plus, Edit, Trash2, Calendar, Clock, User, FileText,
  Download, Eye, ChevronDown, ChevronUp, AlertCircle, Save, X
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { MetricCard } from '../shared/MetricCard';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { toast } from 'sonner@2.0.3';

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

const RESPONSABLES = [
  'Mario Oswaldo Bernal Rodriguez',
  'Catalina Rubio',
  'Nubia Pimiento',
  'Sandra Montero',
  'Fernando Ávila',
  'William Ramírez',
  'Lucila Villamil',
  'Alexandra Triviño',
  'Natalia Cañon',
  'Flor Mireya Murcia'
];

// Plan Anual Mock inicial
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
      icono: Target,
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
        }
      ]
    },
    {
      id: 2,
      nombre: 'Enfoque hacia la Prevención',
      descripcion: 'Fomentar la cultura del autocontrol y promover acciones preventivas',
      color: '#10B981',
      icono: Shield,
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
      icono: Building2,
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
      icono: TrendingUp,
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
        }
      ]
    },
    {
      id: 5,
      nombre: 'Evaluación y Seguimiento',
      descripcion: 'Evaluar y hacer seguimiento a la gestión institucional y los procesos',
      color: '#EF4444',
      icono: CheckCircle2,
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
          estado: 'en-progreso',
          porcentajeAvance: 50,
          observaciones: 'Primera evaluación en curso',
          prioridad: 'Media'
        }
      ]
    }
  ]
};

export function PlanAnual5Roles() {
  const [planAnual, setPlanAnual] = useState<PlanAnual>(MOCK_PLAN_ANUAL);
  const [rolExpandido, setRolExpandido] = useState<number | null>(1);
  const [modalNuevaActividad, setModalNuevaActividad] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(null);
  const [actividadSeleccionada, setActividadSeleccionada] = useState<Actividad | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);

  // Form state
  const [formActividad, setFormActividad] = useState<Partial<Actividad>>({
    nombre: '',
    descripcion: '',
    responsable: '',
    fechaInicio: '',
    fechaFin: '',
    estado: 'pendiente',
    porcentajeAvance: 0,
    observaciones: '',
    prioridad: 'Media'
  });

  const resetForm = () => {
    setFormActividad({
      nombre: '',
      descripcion: '',
      responsable: '',
      fechaInicio: '',
      fechaFin: '',
      estado: 'pendiente',
      porcentajeAvance: 0,
      observaciones: '',
      prioridad: 'Media'
    });
    setActividadSeleccionada(null);
    setModoEdicion(false);
  };

  const handleAgregarActividad = () => {
    if (!rolSeleccionado || !formActividad.nombre || !formActividad.responsable || 
        !formActividad.fechaInicio || !formActividad.fechaFin) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    const nuevaActividad: Actividad = {
      id: `${rolSeleccionado}-${Date.now()}`,
      nombre: formActividad.nombre!,
      descripcion: formActividad.descripcion || '',
      responsable: formActividad.responsable!,
      fechaInicio: formActividad.fechaInicio!,
      fechaFin: formActividad.fechaFin!,
      estado: formActividad.estado!,
      porcentajeAvance: formActividad.porcentajeAvance || 0,
      observaciones: formActividad.observaciones || '',
      prioridad: formActividad.prioridad!
    };

    const nuevosPlan = { ...planAnual };
    const rolIndex = nuevosPlan.roles.findIndex(r => r.id === rolSeleccionado);
    if (rolIndex !== -1) {
      nuevosPlan.roles[rolIndex].actividades.push(nuevaActividad);
      // Recalcular cumplimiento
      const cumplimiento = calcularCumplimientoRol(nuevosPlan.roles[rolIndex].actividades);
      nuevosPlan.roles[rolIndex].porcentajeCumplimiento = cumplimiento;
      setPlanAnual(nuevosPlan);
      toast.success('Actividad agregada exitosamente');
    }

    setModalNuevaActividad(false);
    resetForm();
  };

  const handleEditarActividad = () => {
    if (!rolSeleccionado || !actividadSeleccionada || !formActividad.nombre || 
        !formActividad.responsable || !formActividad.fechaInicio || !formActividad.fechaFin) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    const nuevosPlan = { ...planAnual };
    const rolIndex = nuevosPlan.roles.findIndex(r => r.id === rolSeleccionado);
    if (rolIndex !== -1) {
      const actividadIndex = nuevosPlan.roles[rolIndex].actividades.findIndex(
        a => a.id === actividadSeleccionada.id
      );
      if (actividadIndex !== -1) {
        nuevosPlan.roles[rolIndex].actividades[actividadIndex] = {
          ...actividadSeleccionada,
          nombre: formActividad.nombre!,
          descripcion: formActividad.descripcion || '',
          responsable: formActividad.responsable!,
          fechaInicio: formActividad.fechaInicio!,
          fechaFin: formActividad.fechaFin!,
          estado: formActividad.estado!,
          porcentajeAvance: formActividad.porcentajeAvance || 0,
          observaciones: formActividad.observaciones || '',
          prioridad: formActividad.prioridad!
        };
        // Recalcular cumplimiento
        const cumplimiento = calcularCumplimientoRol(nuevosPlan.roles[rolIndex].actividades);
        nuevosPlan.roles[rolIndex].porcentajeCumplimiento = cumplimiento;
        setPlanAnual(nuevosPlan);
        toast.success('Actividad actualizada exitosamente');
      }
    }

    setModalNuevaActividad(false);
    resetForm();
  };

  const handleEliminarActividad = (rolId: number, actividadId: string) => {
    const nuevosPlan = { ...planAnual };
    const rolIndex = nuevosPlan.roles.findIndex(r => r.id === rolId);
    if (rolIndex !== -1) {
      nuevosPlan.roles[rolIndex].actividades = nuevosPlan.roles[rolIndex].actividades.filter(
        a => a.id !== actividadId
      );
      // Recalcular cumplimiento
      const cumplimiento = calcularCumplimientoRol(nuevosPlan.roles[rolIndex].actividades);
      nuevosPlan.roles[rolIndex].porcentajeCumplimiento = cumplimiento;
      setPlanAnual(nuevosPlan);
      toast.success('Actividad eliminada');
    }
  };

  const abrirModalNuevaActividad = (rolId: number) => {
    setRolSeleccionado(rolId);
    setModoEdicion(false);
    resetForm();
    setModalNuevaActividad(true);
  };

  const abrirModalEditar = (rol: Rol, actividad: Actividad) => {
    setRolSeleccionado(rol.id);
    setActividadSeleccionada(actividad);
    setFormActividad({
      nombre: actividad.nombre,
      descripcion: actividad.descripcion,
      responsable: actividad.responsable,
      fechaInicio: actividad.fechaInicio,
      fechaFin: actividad.fechaFin,
      estado: actividad.estado,
      porcentajeAvance: actividad.porcentajeAvance,
      observaciones: actividad.observaciones,
      prioridad: actividad.prioridad
    });
    setModoEdicion(true);
    setModalNuevaActividad(true);
  };

  const calcularCumplimientoRol = (actividades: Actividad[]): number => {
    if (actividades.length === 0) return 0;
    const totalAvance = actividades.reduce((sum, act) => sum + act.porcentajeAvance, 0);
    return Math.round(totalAvance / actividades.length);
  };

  const calcularCumplimientoGeneral = (): number => {
    const totalCumplimiento = planAnual.roles.reduce(
      (sum, rol) => sum + rol.porcentajeCumplimiento, 0
    );
    return Math.round(totalCumplimiento / planAnual.roles.length);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada': return '#10B981';
      case 'en-progreso': return '#3B82F6';
      case 'pendiente': return '#6B7280';
      case 'retrasada': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'completada': return 'Completada';
      case 'en-progreso': return 'En Progreso';
      case 'pendiente': return 'Pendiente';
      case 'retrasada': return 'Retrasada';
      default: return estado;
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return '#EF4444';
      case 'Media': return '#F59E0B';
      case 'Baja': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Métricas calculadas
  const cumplimientoGeneral = calcularCumplimientoGeneral();
  const totalActividades = planAnual.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
  const actividadesCompletadas = planAnual.roles.reduce(
    (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'completada').length, 0
  );
  const actividadesEnProgreso = planAnual.roles.reduce(
    (sum, rol) => sum + rol.actividades.filter(a => a.estado === 'en-progreso').length, 0
  );

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black" style={{ color: '#1F2937' }}>
            Plan Anual de Auditoría {planAnual.añoFiscal}
          </h2>
          <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
            Basado en los 5 roles del Decreto 648 de 2017
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge style={{ background: '#F0FDF4', color: '#10B981', padding: '8px 16px' }}>
            Estado: {planAnual.estado === 'en-ejecucion' ? 'En Ejecución' : planAnual.estado}
          </Badge>
          <Button variant="outline" size="sm" className="border-2">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Cumplimiento General"
          value={`${cumplimientoGeneral}%`}
          icon={Target}
          iconColor="#F97316"
          iconBgColor="#FFF7ED"
          trend={{
            value: cumplimientoGeneral >= 70 ? 'Satisfactorio' : cumplimientoGeneral >= 50 ? 'Aceptable' : 'Requiere atención',
            isPositive: cumplimientoGeneral >= 70 ? true : cumplimientoGeneral >= 50 ? undefined : false
          }}
        />
        <MetricCard
          title="Total Actividades"
          value={totalActividades.toString()}
          icon={FileText}
          iconColor="#3B82F6"
          iconBgColor="#EFF6FF"
          subtitle={`${planAnual.roles.length} roles`}
        />
        <MetricCard
          title="Completadas"
          value={actividadesCompletadas.toString()}
          icon={CheckCircle2}
          iconColor="#10B981"
          iconBgColor="#F0FDF4"
          trend={{
            value: `${Math.round((actividadesCompletadas / totalActividades) * 100)}% del total`,
            isPositive: true
          }}
        />
        <MetricCard
          title="En Progreso"
          value={actividadesEnProgreso.toString()}
          icon={Clock}
          iconColor="#F59E0B"
          iconBgColor="#FFFBEB"
          subtitle="Seguimiento activo"
        />
      </div>

      {/* ROLES DEL DECRETO 648 */}
      <div className="space-y-4">
        {planAnual.roles.map((rol) => {
          const Icono = rol.icono;
          const isExpanded = rolExpandido === rol.id;

          return (
            <motion.div
              key={rol.id}
              className="rounded-2xl border-2 overflow-hidden"
              style={{ background: '#FFFFFF', borderColor: '#E5E7EB' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* HEADER DEL ROL */}
              <div
                className="p-6 cursor-pointer"
                style={{ background: `${rol.color}10` }}
                onClick={() => setRolExpandido(isExpanded ? null : rol.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 rounded-xl" style={{ background: `${rol.color}20` }}>
                      <Icono className="w-6 h-6" style={{ color: rol.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-black" style={{ color: '#1F2937' }}>
                          Rol {rol.id}: {rol.nombre}
                        </h3>
                        <Badge style={{ background: `${rol.color}20`, color: rol.color }}>
                          {rol.actividades.length} actividades
                        </Badge>
                      </div>
                      <p className="text-sm mb-4" style={{ color: '#6B7280' }}>
                        {rol.descripcion}
                      </p>

                      {/* Barra de progreso */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span style={{ color: '#6B7280' }}>Cumplimiento del rol</span>
                          <span className="font-black" style={{ color: rol.color }}>
                            {rol.porcentajeCumplimiento}%
                          </span>
                        </div>
                        <div className="h-3 rounded-full" style={{ background: '#E5E7EB' }}>
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ 
                              background: rol.color, 
                              width: `${rol.porcentajeCumplimiento}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalNuevaActividad(rol.id);
                      }}
                      style={{ background: rol.color, color: '#FFFFFF' }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Actividad
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5" style={{ color: '#6B7280' }} />
                    ) : (
                      <ChevronDown className="w-5 h-5" style={{ color: '#6B7280' }} />
                    )}
                  </div>
                </div>
              </div>

              {/* ACTIVIDADES DEL ROL */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-6 space-y-3 border-t-2" style={{ borderColor: '#E5E7EB' }}>
                      {rol.actividades.length === 0 ? (
                        <div className="text-center py-8">
                          <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#9CA3AF' }} />
                          <p className="text-sm" style={{ color: '#6B7280' }}>
                            No hay actividades registradas para este rol
                          </p>
                          <Button
                            size="sm"
                            onClick={() => abrirModalNuevaActividad(rol.id)}
                            className="mt-3"
                            style={{ background: rol.color, color: '#FFFFFF' }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            Agregar Primera Actividad
                          </Button>
                        </div>
                      ) : (
                        rol.actividades.map((actividad) => (
                          <motion.div
                            key={actividad.id}
                            className="p-4 rounded-xl border-2 hover:shadow-md transition-all"
                            style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
                            whileHover={{ scale: 1.01 }}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-bold" style={{ color: '#1F2937' }}>
                                    {actividad.nombre}
                                  </h4>
                                  <Badge 
                                    style={{ 
                                      background: `${getEstadoColor(actividad.estado)}20`, 
                                      color: getEstadoColor(actividad.estado) 
                                    }}
                                  >
                                    {getEstadoLabel(actividad.estado)}
                                  </Badge>
                                  <Badge 
                                    style={{ 
                                      background: `${getPrioridadColor(actividad.prioridad)}20`, 
                                      color: getPrioridadColor(actividad.prioridad),
                                      fontSize: '10px'
                                    }}
                                  >
                                    {actividad.prioridad}
                                  </Badge>
                                </div>

                                {actividad.descripcion && (
                                  <p className="text-sm mb-3" style={{ color: '#6B7280' }}>
                                    {actividad.descripcion}
                                  </p>
                                )}

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                                    <User className="w-4 h-4" />
                                    <span>{actividad.responsable}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm" style={{ color: '#6B7280' }}>
                                    <Calendar className="w-4 h-4" />
                                    <span>
                                      {new Date(actividad.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })} - {' '}
                                      {new Date(actividad.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </span>
                                  </div>
                                </div>

                                {/* Progreso de la actividad */}
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span style={{ color: '#6B7280' }}>Avance</span>
                                    <span className="font-bold" style={{ color: rol.color }}>
                                      {actividad.porcentajeAvance}%
                                    </span>
                                  </div>
                                  <div className="h-2 rounded-full" style={{ background: '#E5E7EB' }}>
                                    <div
                                      className="h-full rounded-full transition-all"
                                      style={{ 
                                        background: rol.color, 
                                        width: `${actividad.porcentajeAvance}%` 
                                      }}
                                    />
                                  </div>
                                </div>

                                {actividad.observaciones && (
                                  <p className="text-xs mt-2 italic" style={{ color: '#6B7280' }}>
                                    Observaciones: {actividad.observaciones}
                                  </p>
                                )}
                              </div>

                              {/* Acciones */}
                              <div className="flex flex-col gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => abrirModalEditar(rol, actividad)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEliminarActividad(rol.id, actividad.id)}
                                  style={{ color: '#EF4444' }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* MODAL NUEVA/EDITAR ACTIVIDAD */}
      <ResponsiveModal
        isOpen={modalNuevaActividad}
        onClose={() => {
          setModalNuevaActividad(false);
          resetForm();
        }}
        title={modoEdicion ? 'Editar Actividad' : 'Nueva Actividad'}
        subtitle={
          modoEdicion 
            ? 'Actualiza la información de la actividad'
            : `Agregar actividad al ${planAnual.roles.find(r => r.id === rolSeleccionado)?.nombre}`
        }
        icon={<FileText className="w-6 h-6" style={{ color: '#F97316' }} />}
        maxWidth="2xl"
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={modoEdicion ? handleEditarActividad : handleAgregarActividad}
              className="flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: '#F97316', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4" />
              {modoEdicion ? 'Guardar Cambios' : 'Crear Actividad'}
            </button>
            <button
              onClick={() => {
                setModalNuevaActividad(false);
                resetForm();
              }}
              className="px-6 py-3 rounded-xl font-semibold"
              style={{ background: '#F3F4F6', color: '#4B5563' }}
            >
              Cancelar
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-1">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Nombre de la Actividad *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
              style={{ borderColor: '#E5E7EB' }}
              value={formActividad.nombre}
              onChange={(e) => setFormActividad({ ...formActividad, nombre: e.target.value })}
              placeholder="Ej: Auditoría de Gestión Financiera Q1"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Descripción Detallada
            </label>
            <textarea
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
              style={{ borderColor: '#E5E7EB' }}
              value={formActividad.descripcion}
              onChange={(e) => setFormActividad({ ...formActividad, descripcion: e.target.value })}
              placeholder="Describe la actividad en detalle..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Responsable *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formActividad.responsable}
                onChange={(e) => setFormActividad({ ...formActividad, responsable: e.target.value })}
              >
                <option value="">Seleccione responsable...</option>
                {RESPONSABLES.map(resp => (
                  <option key={resp} value={resp}>{resp}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Prioridad *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formActividad.prioridad}
                onChange={(e) => setFormActividad({ ...formActividad, prioridad: e.target.value as any })}
              >
                <option value="Baja">Baja</option>
                <option value="Media">Media</option>
                <option value="Alta">Alta</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Fecha de Inicio *
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formActividad.fechaInicio}
                onChange={(e) => setFormActividad({ ...formActividad, fechaInicio: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Fecha de Fin *
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formActividad.fechaFin}
                onChange={(e) => setFormActividad({ ...formActividad, fechaFin: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Estado *
              </label>
              <select
                required
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formActividad.estado}
                onChange={(e) => setFormActividad({ ...formActividad, estado: e.target.value as any })}
              >
                <option value="pendiente">Pendiente</option>
                <option value="en-progreso">En Progreso</option>
                <option value="completada">Completada</option>
                <option value="retrasada">Retrasada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
                Porcentaje de Avance (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
                style={{ borderColor: '#E5E7EB' }}
                value={formActividad.porcentajeAvance}
                onChange={(e) => setFormActividad({ ...formActividad, porcentajeAvance: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#4B5563' }}>
              Observaciones
            </label>
            <textarea
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
              style={{ borderColor: '#E5E7EB' }}
              value={formActividad.observaciones}
              onChange={(e) => setFormActividad({ ...formActividad, observaciones: e.target.value })}
              placeholder="Notas adicionales sobre el avance..."
            />
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}