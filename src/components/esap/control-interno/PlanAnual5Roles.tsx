/**
 * PLAN ANUAL DE AUDITORÍA - 5 ROLES DEL DECRETO 648 DE 2017
 * RF001 - Gestión del Plan Anual estructurado por roles normativos
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, Shield, Building2, TrendingUp, CheckCircle2,
  Plus, Edit, Trash2, Calendar, User, FileText,
  Download, ChevronDown, ChevronUp, AlertCircle, Save
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveModal } from '../shared/ResponsiveModal';
import { NotificacionesPlanAnual } from './NotificacionesPlanAnual';
import { toast } from 'sonner@2.0.3';
import { exportarPlanAnualExcel, exportarPlanAnualPDF } from '../../../utils/planAnualExport';

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
        },
        {
          id: '1-4',
          nombre: 'Informe Ejecutivo Trimestral a Dirección',
          descripcion: 'Presentación de informe trimestral de gestión a la Dirección Nacional',
          responsable: 'Mario Oswaldo Bernal Rodriguez',
          fechaInicio: '2024-12-01',
          fechaFin: '2024-12-18',
          estado: 'en-progreso',
          porcentajeAvance: 30,
          observaciones: 'Vence en días',
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
  const [modalEditarRol, setModalEditarRol] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(null);
  const [actividadSeleccionada, setActividadSeleccionada] = useState<Actividad | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [menuExportarAbierto, setMenuExportarAbierto] = useState(false);

  // Form state para actividades
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

  // Form state para roles
  const [formRol, setFormRol] = useState<{ nombre: string; descripcion: string }>({
    nombre: '',
    descripcion: ''
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

  const abrirModalEditarRol = (rol: Rol) => {
    setRolSeleccionado(rol.id);
    setFormRol({
      nombre: rol.nombre,
      descripcion: rol.descripcion
    });
    setModalEditarRol(true);
  };

  const handleEditarRol = () => {
    if (!rolSeleccionado || !formRol.nombre || !formRol.descripcion) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    const nuevosPlan = { ...planAnual };
    const rolIndex = nuevosPlan.roles.findIndex(r => r.id === rolSeleccionado);
    if (rolIndex !== -1) {
      nuevosPlan.roles[rolIndex] = {
        ...nuevosPlan.roles[rolIndex],
        nombre: formRol.nombre,
        descripcion: formRol.descripcion
      };
      setPlanAnual(nuevosPlan);
      toast.success('Rol actualizado exitosamente');
    }

    setModalEditarRol(false);
    setFormRol({ nombre: '', descripcion: '' });
    setRolSeleccionado(null);
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black" style={{ color: '#1F2937' }}>
            Plan Anual de Auditoría {planAnual.añoFiscal}
          </h2>
          <p className="text-xs sm:text-sm mt-1" style={{ color: '#6B7280' }}>
            Basado en los 5 roles del Decreto 648 de 2017
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <Badge 
            className="w-full sm:w-auto justify-center sm:justify-start"
            style={{ background: '#F0FDF4', color: '#10B981', padding: '8px 16px' }}
          >
            Estado: {planAnual.estado === 'en-ejecucion' ? 'En Ejecución' : planAnual.estado}
          </Badge>
          
          {/* Dropdown de Exportación */}
          <div className="relative w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full sm:w-auto border-2"
              onClick={() => setMenuExportarAbierto(!menuExportarAbierto)}
            >
              <Download className="w-4 h-4 sm:mr-2" />
              <span className="sm:inline">Exportar</span>
              <ChevronDown className="w-3 h-3 ml-2" />
            </Button>

            {/* Menu Desplegable */}
            <AnimatePresence>
              {menuExportarAbierto && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 rounded-xl border-2 overflow-hidden z-50"
                  style={{ background: '#FFFFFF', borderColor: '#E5E7EB', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                >
                  <button
                    onClick={() => {
                      exportarPlanAnualExcel(planAnual);
                      setMenuExportarAbierto(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                    style={{ color: '#1F2937' }}
                  >
                    <FileText className="w-4 h-4" style={{ color: '#10B981' }} />
                    <div>
                      <div className="text-sm font-semibold">Excel (CSV)</div>
                      <div className="text-xs" style={{ color: '#6B7280' }}>Compatible con Excel</div>
                    </div>
                  </button>
                  <div className="h-px" style={{ background: '#E5E7EB' }} />
                  <button
                    onClick={() => {
                      exportarPlanAnualPDF(planAnual);
                      setMenuExportarAbierto(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                    style={{ color: '#1F2937' }}
                  >
                    <FileText className="w-4 h-4" style={{ color: '#EF4444' }} />
                    <div>
                      <div className="text-sm font-semibold">PDF</div>
                      <div className="text-xs" style={{ color: '#6B7280' }}>Documento imprimible</div>
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* SISTEMA DE NOTIFICACIONES Y ALERTAS */}
      <NotificacionesPlanAnual roles={planAnual.roles} />

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
                className="p-4 sm:p-6 cursor-pointer"
                style={{ background: `${rol.color}10` }}
                onClick={() => setRolExpandido(isExpanded ? null : rol.id)}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
                    <div className="p-2.5 sm:p-3 rounded-xl flex-shrink-0" style={{ background: `${rol.color}20` }}>
                      <Icono className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: rol.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-black" style={{ color: '#1F2937' }}>
                            Rol {rol.id}: {rol.nombre}
                          </h3>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              abrirModalEditarRol(rol);
                            }}
                            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors flex-shrink-0"
                            title="Editar nombre y descripción del rol"
                          >
                            <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" style={{ color: rol.color }} />
                          </button>
                        </div>
                        <Badge 
                          className="self-start sm:self-auto"
                          style={{ background: `${rol.color}20`, color: rol.color }}
                        >
                          {rol.actividades.length} actividades
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm mb-3 sm:mb-4" style={{ color: '#6B7280' }}>
                        {rol.descripcion}
                      </p>

                      {/* Barra de progreso */}
                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex items-center justify-between text-xs sm:text-sm">
                          <span style={{ color: '#6B7280' }}>Cumplimiento del rol</span>
                          <span className="font-black" style={{ color: rol.color }}>
                            {rol.porcentajeCumplimiento}%
                          </span>
                        </div>
                        <div className="h-2.5 sm:h-3 rounded-full" style={{ background: '#E5E7EB' }}>
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

                  <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-4">
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        abrirModalNuevaActividad(rol.id);
                      }}
                      style={{ background: rol.color, color: '#FFFFFF' }}
                    >
                      <Plus className="w-4 h-4 sm:mr-1" />
                      <span className="hidden sm:inline">Actividad</span>
                    </Button>
                    <button
                      className="p-2 rounded-lg hover:bg-black/5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRolExpandido(isExpanded ? null : rol.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" style={{ color: '#6B7280' }} />
                      ) : (
                        <ChevronDown className="w-5 h-5" style={{ color: '#6B7280' }} />
                      )}
                    </button>
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
                            className="p-3 sm:p-4 rounded-xl border-2 hover:shadow-md transition-all"
                            style={{ background: '#F9FAFB', borderColor: '#E5E7EB' }}
                            whileHover={{ scale: 1.01 }}
                          >
                            <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                              <div className="flex-1 w-full min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2 flex-wrap">
                                  <h4 className="text-sm sm:text-base font-bold" style={{ color: '#1F2937' }}>
                                    {actividad.nombre}
                                  </h4>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge 
                                      className="text-xs"
                                      style={{ 
                                        background: `${getEstadoColor(actividad.estado)}20`, 
                                        color: getEstadoColor(actividad.estado) 
                                      }}
                                    >
                                      {getEstadoLabel(actividad.estado)}
                                    </Badge>
                                    <Badge 
                                      className="text-xs"
                                      style={{ 
                                        background: `${getPrioridadColor(actividad.prioridad)}20`, 
                                        color: getPrioridadColor(actividad.prioridad)
                                      }}
                                    >
                                      {actividad.prioridad}
                                    </Badge>
                                  </div>
                                </div>

                                {actividad.descripcion && (
                                  <p className="text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-2" style={{ color: '#6B7280' }}>
                                    {actividad.descripcion}
                                  </p>
                                )}

                                <div className="grid grid-cols-1 gap-2 sm:gap-3 mb-2 sm:mb-3">
                                  <div className="flex items-start sm:items-center gap-2 text-xs sm:text-sm" style={{ color: '#6B7280' }}>
                                    <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 mt-0.5 sm:mt-0" />
                                    <span className="break-words">{actividad.responsable}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs sm:text-sm" style={{ color: '#6B7280' }}>
                                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                                    <span className="whitespace-nowrap">
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
                                  <div className="h-1.5 sm:h-2 rounded-full" style={{ background: '#E5E7EB' }}>
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
                                  <p className="text-xs mt-2 italic line-clamp-1 sm:line-clamp-none" style={{ color: '#6B7280' }}>
                                    Observaciones: {actividad.observaciones}
                                  </p>
                                )}
                              </div>

                              {/* Acciones */}
                              <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1 sm:flex-none"
                                  onClick={() => abrirModalEditar(rol, actividad)}
                                >
                                  <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  <span className="sm:hidden ml-2">Editar</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex-1 sm:flex-none"
                                  onClick={() => handleEliminarActividad(rol.id, actividad.id)}
                                  style={{ color: '#EF4444' }}
                                >
                                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                  <span className="sm:hidden ml-2">Eliminar</span>
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

      {/* MODAL EDITAR ROL */}
      <ResponsiveModal
        isOpen={modalEditarRol}
        onClose={() => {
          setModalEditarRol(false);
          setFormRol({ nombre: '', descripcion: '' });
          setRolSeleccionado(null);
        }}
        title="Editar Rol"
        subtitle="Actualiza la información del rol"
        icon={<FileText className="w-6 h-6" style={{ color: '#F97316' }} />}
        maxWidth="2xl"
        footer={
          <div className="flex items-center gap-3">
            <button
              onClick={handleEditarRol}
              className="flex-1 px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
              style={{ background: '#F97316', color: '#FFFFFF' }}
            >
              <Save className="w-4 h-4" />
              Guardar Cambios
            </button>
            <button
              onClick={() => {
                setModalEditarRol(false);
                setFormRol({ nombre: '', descripcion: '' });
                setRolSeleccionado(null);
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
              Nombre del Rol *
            </label>
            <input
              type="text"
              required
              className="w-full px-4 py-2.5 rounded-xl border-2 focus:outline-none focus:border-[#F97316]"
              style={{ borderColor: '#E5E7EB' }}
              value={formRol.nombre}
              onChange={(e) => setFormRol({ ...formRol, nombre: e.target.value })}
              placeholder="Ej: Liderazgo Estratégico"
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
              value={formRol.descripcion}
              onChange={(e) => setFormRol({ ...formRol, descripcion: e.target.value })}
              placeholder="Describe el rol en detalle..."
            />
          </div>
        </div>
      </ResponsiveModal>
    </div>
  );
}