/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODAL DETALLE PLAN DE MEJORAMIENTO - VERSIÓN PREMIUM
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Modal completo para visualización y gestión de Planes de Mejoramiento
 * 
 * CARACTERÍSTICAS:
 * - 5 tabs: Resumen, Hallazgos, Acciones, Documentos, Seguimiento
 * - Dashboard con KPIs detallados
 * - Gestión de acciones (crear, editar, completar)
 * - Carga de evidencias
 * - Timeline de actividades
 * - Semáforos de vencimiento
 * - Progreso visual por hallazgo y global
 * 
 * VERSIÓN: 3.0 - PREMIUM
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Calendar, User, Clock, AlertTriangle, CheckCircle2, FileText,
  TrendingUp, Activity, Target, Flag, Plus, Upload, Download,
  Edit2, Trash2, Eye, MessageSquare, Paperclip, History,
  BarChart3, Users, Building2, AlertCircle, Check, XCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

interface Hallazgo {
  id: string;
  codigo: string;
  descripcion: string;
  criticidad: 'ALTA' | 'MEDIA' | 'BAJA';
  proceso: string;
  responsable: string;
  accionesCount: number;
  accionesCompletadas: number;
  progreso: number;
}

interface AccionCorrectiva {
  id: string;
  hallazgoId: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaVencimiento: string;
  estado: 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA' | 'VENCIDA';
  progreso: number;
  evidencias: number;
  observaciones?: string;
}

interface DocumentoPlan {
  id: string;
  nombre: string;
  tipo: string;
  fechaCarga: string;
  autor: string;
  tamanio: string;
}

interface ActividadTimeline {
  id: string;
  tipo: 'CREACION' | 'ACTUALIZACION' | 'COMPLETADA' | 'EVIDENCIA' | 'COMENTARIO';
  descripcion: string;
  usuario: string;
  fecha: string;
}

interface PlanMejoramientoDetalle {
  id: string;
  codigo: string;
  nombre: string;
  area: string;
  responsableGeneral: string;
  fechaCreacion: string;
  fechaVencimiento: string;
  estado: 'FORMULACION' | 'APROBACION' | 'EN_EJECUCION' | 'EN_SEGUIMIENTO' | 'CUMPLIDO';
  progresoGlobal: number;
  hallazgos: Hallazgo[];
  acciones: AccionCorrectiva[];
  documentos: DocumentoPlan[];
  timeline: ActividadTimeline[];
  auditoria: string;
  observaciones?: string;
}

type TabActiva = 'resumen' | 'hallazgos' | 'acciones' | 'documentos' | 'seguimiento';

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK
// ════════════════════════════════════════════════════════════════════════════

const PLAN_MOCK: PlanMejoramientoDetalle = {
  id: 'pm-2024-004',
  codigo: 'PM-2024-004',
  nombre: 'Plan de Mejoramiento - Auditoría TIC - Seguridad de la Información',
  area: 'Dirección de Tecnología',
  responsableGeneral: 'Jorge Silva',
  fechaCreacion: '2024-10-15',
  fechaVencimiento: '2025-04-15',
  estado: 'EN_EJECUCION',
  progresoGlobal: 45,
  auditoria: 'AU-2024-008 - Auditoría Control Interno TIC',
  observaciones: 'Plan en ejecución con avance según cronograma. Requiere seguimiento cercano en acciones de criticidad alta.',
  
  hallazgos: [
    {
      id: 'h1',
      codigo: 'H-001',
      descripcion: 'Falta de políticas documentadas de seguridad de la información',
      criticidad: 'ALTA',
      proceso: 'Gestión de Seguridad TI',
      responsable: 'Jorge Silva',
      accionesCount: 3,
      accionesCompletadas: 1,
      progreso: 33
    },
    {
      id: 'h2',
      codigo: 'H-002',
      descripcion: 'Ausencia de backups periódicos de bases de datos críticas',
      criticidad: 'ALTA',
      proceso: 'Infraestructura TI',
      responsable: 'María González',
      accionesCount: 2,
      accionesCompletadas: 1,
      progreso: 50
    },
    {
      id: 'h3',
      codigo: 'H-003',
      descripcion: 'Falta de capacitación en ciberseguridad para funcionarios',
      criticidad: 'MEDIA',
      proceso: 'Talento Humano TI',
      responsable: 'Carlos Méndez',
      accionesCount: 2,
      accionesCompletadas: 2,
      progreso: 100
    },
    {
      id: 'h4',
      codigo: 'H-004',
      descripcion: 'Documentación desactualizada de procedimientos técnicos',
      criticidad: 'BAJA',
      proceso: 'Gestión Documental TI',
      responsable: 'Ana Torres',
      accionesCount: 1,
      accionesCompletadas: 0,
      progreso: 0
    }
  ],

  acciones: [
    // Hallazgo H-001
    {
      id: 'a1',
      hallazgoId: 'h1',
      descripcion: 'Elaborar Manual de Políticas de Seguridad de la Información según ISO 27001',
      responsable: 'Jorge Silva',
      fechaInicio: '2024-10-20',
      fechaVencimiento: '2024-12-15',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 3,
      observaciones: 'Completado y socializado con el equipo'
    },
    {
      id: 'a2',
      hallazgoId: 'h1',
      descripcion: 'Aprobación del manual por el Comité de Dirección',
      responsable: 'Jorge Silva',
      fechaInicio: '2024-12-16',
      fechaVencimiento: '2025-01-15',
      estado: 'EN_EJECUCION',
      progreso: 60,
      evidencias: 1
    },
    {
      id: 'a3',
      hallazgoId: 'h1',
      descripcion: 'Socialización del manual a todos los funcionarios',
      responsable: 'María González',
      fechaInicio: '2025-01-16',
      fechaVencimiento: '2025-02-28',
      estado: 'PENDIENTE',
      progreso: 0,
      evidencias: 0
    },
    
    // Hallazgo H-002
    {
      id: 'a4',
      hallazgoId: 'h2',
      descripcion: 'Implementar sistema automatizado de backups diarios',
      responsable: 'María González',
      fechaInicio: '2024-11-01',
      fechaVencimiento: '2024-12-31',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 2
    },
    {
      id: 'a5',
      hallazgoId: 'h2',
      descripcion: 'Documentar procedimiento de restauración y realizar pruebas',
      responsable: 'Carlos Méndez',
      fechaInicio: '2025-01-05',
      fechaVencimiento: '2025-03-15',
      estado: 'EN_EJECUCION',
      progreso: 40,
      evidencias: 1
    },

    // Hallazgo H-003
    {
      id: 'a6',
      hallazgoId: 'h3',
      descripcion: 'Diseñar programa de capacitación en ciberseguridad',
      responsable: 'Carlos Méndez',
      fechaInicio: '2024-10-25',
      fechaVencimiento: '2024-11-30',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 2
    },
    {
      id: 'a7',
      hallazgoId: 'h3',
      descripcion: 'Ejecutar jornadas de capacitación para 100% del personal',
      responsable: 'Ana Torres',
      fechaInicio: '2024-12-01',
      fechaVencimiento: '2025-01-31',
      estado: 'COMPLETADA',
      progreso: 100,
      evidencias: 4
    },

    // Hallazgo H-004
    {
      id: 'a8',
      hallazgoId: 'h4',
      descripcion: 'Actualizar documentación técnica de procedimientos TI',
      responsable: 'Ana Torres',
      fechaInicio: '2025-02-01',
      fechaVencimiento: '2025-04-15',
      estado: 'PENDIENTE',
      progreso: 0,
      evidencias: 0
    }
  ],

  documentos: [
    {
      id: 'd1',
      nombre: 'Plan de Mejoramiento PM-2024-004.pdf',
      tipo: 'PDF',
      fechaCarga: '2024-10-15',
      autor: 'Jorge Silva',
      tamanio: '2.4 MB'
    },
    {
      id: 'd2',
      nombre: 'Manual Políticas Seguridad v1.0.pdf',
      tipo: 'PDF',
      fechaCarga: '2024-12-15',
      autor: 'Jorge Silva',
      tamanio: '3.8 MB'
    },
    {
      id: 'd3',
      nombre: 'Evidencia Implementación Backups.xlsx',
      tipo: 'XLSX',
      fechaCarga: '2024-12-31',
      autor: 'María González',
      tamanio: '1.2 MB'
    },
    {
      id: 'd4',
      nombre: 'Certificados Capacitación Ciberseguridad.pdf',
      tipo: 'PDF',
      fechaCarga: '2025-01-31',
      autor: 'Carlos Méndez',
      tamanio: '5.6 MB'
    }
  ],

  timeline: [
    {
      id: 't1',
      tipo: 'CREACION',
      descripcion: 'Plan de mejoramiento creado',
      usuario: 'Jorge Silva',
      fecha: '2024-10-15 09:30'
    },
    {
      id: 't2',
      tipo: 'COMPLETADA',
      descripcion: 'Acción A1 completada: Manual de Políticas elaborado',
      usuario: 'Jorge Silva',
      fecha: '2024-12-15 16:45'
    },
    {
      id: 't3',
      tipo: 'EVIDENCIA',
      descripcion: 'Cargada evidencia de implementación de backups',
      usuario: 'María González',
      fecha: '2024-12-31 11:20'
    },
    {
      id: 't4',
      tipo: 'COMPLETADA',
      descripcion: 'Hallazgo H-003 completado al 100%',
      usuario: 'Carlos Méndez',
      fecha: '2025-01-31 14:30'
    },
    {
      id: 't5',
      tipo: 'ACTUALIZACION',
      descripcion: 'Actualizado progreso de acción A2 al 60%',
      usuario: 'Jorge Silva',
      fecha: '2025-02-10 10:15'
    }
  ]
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

interface ModalDetallePlanProps {
  planId: string;
  onClose: () => void;
}

export function ModalDetallePlanMejoramiento({ planId, onClose }: ModalDetallePlanProps) {
  const [tabActiva, setTabActiva] = useState<TabActiva>('resumen');
  const [modalActualizacion, setModalActualizacion] = useState(false);
  const plan = PLAN_MOCK; // En producción: cargar según planId

  const estadisticas = useMemo(() => {
    const totalAcciones = plan.acciones.length;
    const accionesCompletadas = plan.acciones.filter(a => a.estado === 'COMPLETADA').length;
    const accionesEnEjecucion = plan.acciones.filter(a => a.estado === 'EN_EJECUCION').length;
    const accionesPendientes = plan.acciones.filter(a => a.estado === 'PENDIENTE').length;
    const accionesVencidas = plan.acciones.filter(a => a.estado === 'VENCIDA').length;

    const totalHallazgos = plan.hallazgos.length;
    const hallazgosResueltos = plan.hallazgos.filter(h => h.progreso === 100).length;
    const hallazgosCriticosAbiertos = plan.hallazgos.filter(h => h.criticidad === 'ALTA' && h.progreso < 100).length;

    return {
      totalAcciones,
      accionesCompletadas,
      accionesEnEjecucion,
      accionesPendientes,
      accionesVencidas,
      totalHallazgos,
      hallazgosResueltos,
      hallazgosCriticosAbiertos,
      porcentajeCompletado: totalAcciones > 0 ? Math.round((accionesCompletadas / totalAcciones) * 100) : 0
    };
  }, [plan]);

  const handleActualizarPlan = () => {
    setModalActualizacion(true);
  };

  const handleGuardarActualizacion = () => {
    toast.success('Plan actualizado exitosamente');
    setModalActualizacion(false);
  };

  const handleDescargarReporte = () => {
    toast.success('Generando reporte PDF...');
    // Aquí iría la lógica para generar y descargar el reporte
  };

  const estadoConfig = {
    FORMULACION: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Formulación' },
    APROBACION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Aprobación' },
    EN_EJECUCION: { bg: 'bg-green-100', text: 'text-green-700', label: 'En Ejecución' },
    EN_SEGUIMIENTO: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'En Seguimiento' },
    CUMPLIDO: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Cumplido' }
  };

  const config = estadoConfig[plan.estado];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
      {/* Overlay con efecto blur */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - Tamaño optimizado */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-medium">{plan.codigo}</h2>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${config.bg} ${config.text}`}>
                  {config.label}
                </span>
              </div>
              <p className="text-blue-100 mb-3 text-sm">{plan.nombre}</p>
              
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-blue-200 text-xs mb-1">Área Responsable</div>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span className="truncate">{plan.area}</span>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Responsable</div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="truncate">{plan.responsableGeneral}</span>
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Fecha Vencimiento</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {plan.fechaVencimiento}
                  </div>
                </div>
                <div>
                  <div className="text-blue-200 text-xs mb-1">Progreso Global</div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    {plan.progresoGlobal}%
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Barra de Progreso Global */}
          <div className="mt-3">
            <div className="bg-white bg-opacity-20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full transition-all duration-500"
                style={{ width: `${plan.progresoGlobal}%` }}
              />
            </div>
          </div>
        </div>

        {/* KPIs Dashboard */}
        <div className="flex-shrink-0 bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="grid grid-cols-6 gap-2">
            <KPICard
              label="Total Acciones"
              valor={estadisticas.totalAcciones}
              color="blue"
              icon={<Target className="w-4 h-4" />}
            />
            <KPICard
              label="Completadas"
              valor={estadisticas.accionesCompletadas}
              color="green"
              icon={<CheckCircle2 className="w-4 h-4" />}
            />
            <KPICard
              label="En Ejecución"
              valor={estadisticas.accionesEnEjecucion}
              color="yellow"
              icon={<Activity className="w-4 h-4" />}
            />
            <KPICard
              label="Pendientes"
              valor={estadisticas.accionesPendientes}
              color="gray"
              icon={<Clock className="w-4 h-4" />}
            />
            <KPICard
              label="Hallazgos Resueltos"
              valor={`${estadisticas.hallazgosResueltos}/${estadisticas.totalHallazgos}`}
              color="purple"
              icon={<Flag className="w-4 h-4" />}
            />
            <KPICard
              label="Críticos Abiertos"
              valor={estadisticas.hallazgosCriticosAbiertos}
              color="red"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6">
          <div className="flex gap-1">
            <TabButton
              active={tabActiva === 'resumen'}
              onClick={() => setTabActiva('resumen')}
              icon={<BarChart3 className="w-4 h-4" />}
              label="Resumen"
            />
            <TabButton
              active={tabActiva === 'hallazgos'}
              onClick={() => setTabActiva('hallazgos')}
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Hallazgos"
              badge={plan.hallazgos.length.toString()}
            />
            <TabButton
              active={tabActiva === 'acciones'}
              onClick={() => setTabActiva('acciones')}
              icon={<Target className="w-4 h-4" />}
              label="Acciones"
              badge={plan.acciones.length.toString()}
            />
            <TabButton
              active={tabActiva === 'documentos'}
              onClick={() => setTabActiva('documentos')}
              icon={<FileText className="w-4 h-4" />}
              label="Documentos"
              badge={plan.documentos.length.toString()}
            />
            <TabButton
              active={tabActiva === 'seguimiento'}
              onClick={() => setTabActiva('seguimiento')}
              icon={<History className="w-4 h-4" />}
              label="Seguimiento"
            />
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tabActiva}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              {tabActiva === 'resumen' && <TabResumen plan={plan} estadisticas={estadisticas} />}
              {tabActiva === 'hallazgos' && <TabHallazgos plan={plan} />}
              {tabActiva === 'acciones' && <TabAcciones plan={plan} />}
              {tabActiva === 'documentos' && <TabDocumentos plan={plan} />}
              {tabActiva === 'seguimiento' && <TabSeguimiento plan={plan} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer con Acciones */}
        <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Última actualización: {plan.timeline[0]?.fecha}
            </div>
            <div className="flex gap-3">
              <button
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm"
                onClick={handleDescargarReporte}
              >
                <Download className="w-4 h-4" />
                Descargar Reporte
              </button>
              <button
                className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                onClick={handleActualizarPlan}
              >
                <Edit2 className="w-4 h-4" />
                Actualizar Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Actualización */}
      {modalActualizacion && (
        <div className="fixed inset-0 z-60 overflow-hidden flex items-center justify-center p-4">
          {/* Overlay con efecto blur */}
          <div className="absolute inset-0 bg-white/30 backdrop-blur-sm" onClick={() => setModalActualizacion(false)} />

          {/* Modal - Tamaño optimizado */}
          <div className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white px-6 py-4 rounded-t-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-medium">Actualizar Plan de Mejoramiento</h2>
                  </div>
                </div>

                <button
                  onClick={() => setModalActualizacion(false)}
                  className="ml-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <div className="space-y-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-base font-medium text-gray-900 mb-4">Información General</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoItem label="Código" valor={plan.codigo} />
                    <InfoItem label="Estado" valor={plan.estado.replace(/_/g, ' ')} />
                    <InfoItem label="Auditoría Origen" valor={plan.auditoria} />
                    <InfoItem label="Área Responsable" valor={plan.area} />
                    <InfoItem label="Responsable General" valor={plan.responsableGeneral} />
                    <InfoItem label="Fecha Creación" valor={plan.fechaCreacion} />
                    <InfoItem label="Fecha Vencimiento" valor={plan.fechaVencimiento} />
                    <InfoItem label="Progreso Global" valor={`${plan.progresoGlobal}%`} />
                  </div>

                  {plan.observaciones && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-1">Observaciones</div>
                      <div className="text-sm text-blue-700">{plan.observaciones}</div>
                    </div>
                  )}
                </div>

                {/* Distribución de Acciones */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-base font-medium text-gray-900 mb-4">Distribución de Acciones por Estado</h3>
                  <div className="space-y-3">
                    <ProgresoBar
                      label="Completadas"
                      valor={estadisticas.accionesCompletadas}
                      total={estadisticas.totalAcciones}
                      color="green"
                    />
                    <ProgresoBar
                      label="En Ejecución"
                      valor={estadisticas.accionesEnEjecucion}
                      total={estadisticas.totalAcciones}
                      color="yellow"
                    />
                    <ProgresoBar
                      label="Pendientes"
                      valor={estadisticas.accionesPendientes}
                      total={estadisticas.totalAcciones}
                      color="gray"
                    />
                    {estadisticas.accionesVencidas > 0 && (
                      <ProgresoBar
                        label="Vencidas"
                        valor={estadisticas.accionesVencidas}
                        total={estadisticas.totalAcciones}
                        color="red"
                      />
                    )}
                  </div>
                </div>

                {/* Hallazgos Críticos */}
                {estadisticas.hallazgosCriticosAbiertos > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-medium text-red-900 mb-1">
                          Atención: {estadisticas.hallazgosCriticosAbiertos} Hallazgo(s) Crítico(s) Abierto(s)
                        </h4>
                        <p className="text-sm text-red-700">
                          Existen hallazgos de criticidad alta que requieren atención prioritaria
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-6 py-3 rounded-b-xl">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Última actualización: {plan.timeline[0]?.fecha}
                </div>
                <div className="flex gap-3">
                  <button
                    className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                    onClick={handleGuardarActualizacion}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Guardar Cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// KPI CARD
// ════════════════════════════════════════════════════════════════════════════

interface KPICardProps {
  label: string;
  valor: string | number;
  color: 'blue' | 'green' | 'yellow' | 'gray' | 'purple' | 'red';
  icon: React.ReactNode;
}

function KPICard({ label, valor, color, icon }: KPICardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    red: 'bg-red-50 border-red-200 text-red-700'
  };

  return (
    <div className={`rounded-lg border p-2.5 ${colorClasses[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <div className="text-xs opacity-80 leading-tight">{label}</div>
      </div>
      <div className="text-lg font-semibold">{valor}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB BUTTON
// ════════════════════════════════════════════════════════════════════════════

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: string;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-all ${
        active
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50'
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
      {badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
          active ? 'bg-[#1e5da8] text-white' : 'bg-gray-200 text-gray-700'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: RESUMEN
// ════════════════════════════════════════════════════════════════════════════

function TabResumen({ plan, estadisticas }: { plan: PlanMejoramientoDetalle; estadisticas: any }) {
  return (
    <div className="space-y-6">
      {/* Información General */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Información General</h3>
        <div className="grid grid-cols-2 gap-4">
          <InfoItem label="Código" valor={plan.codigo} />
          <InfoItem label="Estado" valor={plan.estado.replace(/_/g, ' ')} />
          <InfoItem label="Auditoría Origen" valor={plan.auditoria} />
          <InfoItem label="Área Responsable" valor={plan.area} />
          <InfoItem label="Responsable General" valor={plan.responsableGeneral} />
          <InfoItem label="Fecha Creación" valor={plan.fechaCreacion} />
          <InfoItem label="Fecha Vencimiento" valor={plan.fechaVencimiento} />
          <InfoItem label="Progreso Global" valor={`${plan.progresoGlobal}%`} />
        </div>

        {plan.observaciones && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm font-medium text-blue-900 mb-1">Observaciones</div>
            <div className="text-sm text-blue-700">{plan.observaciones}</div>
          </div>
        )}
      </div>

      {/* Distribución de Acciones */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-medium text-gray-900 mb-4">Distribución de Acciones por Estado</h3>
        <div className="space-y-3">
          <ProgresoBar
            label="Completadas"
            valor={estadisticas.accionesCompletadas}
            total={estadisticas.totalAcciones}
            color="green"
          />
          <ProgresoBar
            label="En Ejecución"
            valor={estadisticas.accionesEnEjecucion}
            total={estadisticas.totalAcciones}
            color="yellow"
          />
          <ProgresoBar
            label="Pendientes"
            valor={estadisticas.accionesPendientes}
            total={estadisticas.totalAcciones}
            color="gray"
          />
          {estadisticas.accionesVencidas > 0 && (
            <ProgresoBar
              label="Vencidas"
              valor={estadisticas.accionesVencidas}
              total={estadisticas.totalAcciones}
              color="red"
            />
          )}
        </div>
      </div>

      {/* Hallazgos Críticos */}
      {estadisticas.hallazgosCriticosAbiertos > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-red-900 mb-1">
                Atención: {estadisticas.hallazgosCriticosAbiertos} Hallazgo(s) Crítico(s) Abierto(s)
              </h4>
              <p className="text-sm text-red-700">
                Existen hallazgos de criticidad alta que requieren atención prioritaria
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: HALLAZGOS
// ════════════════════════════════════════════════════════════════════════════

function TabHallazgos({ plan }: { plan: PlanMejoramientoDetalle }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Hallazgos del Plan</h3>
          <p className="text-sm text-gray-600">{plan.hallazgos.length} hallazgos identificados</p>
        </div>
      </div>

      {plan.hallazgos.map((hallazgo) => (
        <CardHallazgo key={hallazgo.id} hallazgo={hallazgo} plan={plan} />
      ))}
    </div>
  );
}

function CardHallazgo({ hallazgo, plan }: { hallazgo: Hallazgo; plan: PlanMejoramientoDetalle }) {
  const [expandido, setExpandido] = useState(false);

  const criticidadConfig = {
    ALTA: { bg: 'bg-red-100', text: 'text-red-700', label: 'Crítica' },
    MEDIA: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Media' },
    BAJA: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Baja' }
  };

  const config = criticidadConfig[hallazgo.criticidad];
  const accionesHallazgo = plan.acciones.filter(a => a.hallazgoId === hallazgo.id);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-medium text-gray-900">{hallazgo.codigo}</span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                {config.label}
              </span>
              <span className="text-xs text-gray-600">{hallazgo.proceso}</span>
            </div>
            <p className="text-sm text-gray-700 mb-2">{hallazgo.descripcion}</p>
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {hallazgo.responsable}
              </div>
              <div className="flex items-center gap-1">
                <Target className="w-3 h-3" />
                {hallazgo.accionesCompletadas}/{hallazgo.accionesCount} acciones completadas
              </div>
            </div>
          </div>

          {/* Progreso Circular */}
          <div className="text-center">
            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
              hallazgo.progreso === 100 ? 'bg-green-100' :
              hallazgo.progreso >= 50 ? 'bg-yellow-100' :
              'bg-gray-100'
            }`}>
              <span className={`text-lg font-semibold ${
                hallazgo.progreso === 100 ? 'text-green-700' :
                hallazgo.progreso >= 50 ? 'text-yellow-700' :
                'text-gray-700'
              }`}>
                {hallazgo.progreso}%
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Progreso */}
        <div className="mb-3">
          <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                hallazgo.progreso === 100 ? 'bg-green-600' :
                hallazgo.progreso >= 50 ? 'bg-yellow-600' :
                'bg-blue-600'
              }`}
              style={{ width: `${hallazgo.progreso}%` }}
            />
          </div>
        </div>

        {/* Botón Ver Acciones */}
        <button
          onClick={() => setExpandido(!expandido)}
          className="text-sm text-[#1e5da8] hover:text-[#2a6dbd] font-medium flex items-center gap-2"
        >
          {expandido ? 'Ocultar' : 'Ver'} {accionesHallazgo.length} acciones
          <ChevronDown className={`w-4 h-4 transition-transform ${expandido ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Lista de Acciones del Hallazgo */}
      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-5 space-y-2">
              {accionesHallazgo.map((accion) => (
                <MiniCardAccion key={accion.id} accion={accion} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: ACCIONES
// ════════════════════════════════════════════════════════════════════════════

function TabAcciones({ plan }: { plan: PlanMejoramientoDetalle }) {
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | AccionCorrectiva['estado']>('TODOS');

  const accionesFiltradas = filtroEstado === 'TODOS'
    ? plan.acciones
    : plan.acciones.filter(a => a.estado === filtroEstado);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Acciones Correctivas</h3>
          <p className="text-sm text-gray-600">{accionesFiltradas.length} acciones</p>
        </div>

        <div className="flex gap-2">
          <FiltroButton
            active={filtroEstado === 'TODOS'}
            onClick={() => setFiltroEstado('TODOS')}
            label="Todas"
          />
          <FiltroButton
            active={filtroEstado === 'COMPLETADA'}
            onClick={() => setFiltroEstado('COMPLETADA')}
            label="Completadas"
            color="green"
          />
          <FiltroButton
            active={filtroEstado === 'EN_EJECUCION'}
            onClick={() => setFiltroEstado('EN_EJECUCION')}
            label="En Ejecución"
            color="yellow"
          />
          <FiltroButton
            active={filtroEstado === 'PENDIENTE'}
            onClick={() => setFiltroEstado('PENDIENTE')}
            label="Pendientes"
            color="gray"
          />
        </div>
      </div>

      {accionesFiltradas.map((accion) => (
        <CardAccion key={accion.id} accion={accion} plan={plan} />
      ))}
    </div>
  );
}

function CardAccion({ accion, plan }: { accion: AccionCorrectiva; plan: PlanMejoramientoDetalle }) {
  const estadoConfig = {
    PENDIENTE: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pendiente', icon: Clock },
    EN_EJECUCION: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Ejecución', icon: Activity },
    COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completada', icon: CheckCircle2 },
    VENCIDA: { bg: 'bg-red-100', text: 'text-red-700', label: 'Vencida', icon: XCircle }
  };

  const config = estadoConfig[accion.estado];
  const Icon = config.icon;
  const hallazgo = plan.hallazgos.find(h => h.id === accion.hallazgoId);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 ${config.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                  {config.label}
                </span>
                {hallazgo && (
                  <span className="text-xs text-gray-600">{hallazgo.codigo}</span>
                )}
              </div>
              <p className="text-sm text-gray-900 mb-2">{accion.descripcion}</p>
            </div>

            <div className="text-right">
              <div className={`text-2xl font-semibold ${
                accion.progreso === 100 ? 'text-green-600' :
                accion.progreso >= 50 ? 'text-yellow-600' :
                'text-gray-600'
              }`}>
                {accion.progreso}%
              </div>
            </div>
          </div>

          {/* Progreso */}
          <div className="mb-3">
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  accion.progreso === 100 ? 'bg-green-600' :
                  accion.progreso >= 50 ? 'bg-yellow-600' :
                  'bg-blue-600'
                }`}
                style={{ width: `${accion.progreso}%` }}
              />
            </div>
          </div>

          {/* Información */}
          <div className="grid grid-cols-4 gap-4 text-xs text-gray-600 mb-3">
            <div>
              <div className="flex items-center gap-1 mb-1">
                <User className="w-3 h-3" />
                <span>Responsable</span>
              </div>
              <div className="text-gray-900">{accion.responsable}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="w-3 h-3" />
                <span>Inicio</span>
              </div>
              <div className="text-gray-900">{accion.fechaInicio}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Flag className="w-3 h-3" />
                <span>Vencimiento</span>
              </div>
              <div className="text-gray-900">{accion.fechaVencimiento}</div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-1">
                <Paperclip className="w-3 h-3" />
                <span>Evidencias</span>
              </div>
              <div className="text-gray-900">{accion.evidencias} archivos</div>
            </div>
          </div>

          {/* Observaciones */}
          {accion.observaciones && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
              {accion.observaciones}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              <Edit2 className="w-3.5 h-3.5" />
              Editar
            </button>
            <button className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50 transition-colors flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              Cargar Evidencia
            </button>
            {accion.estado !== 'COMPLETADA' && (
              <button className="px-3 py-1.5 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded text-sm hover:shadow transition-all flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Marcar Completada
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniCardAccion({ accion }: { accion: AccionCorrectiva }) {
  const estadoConfig = {
    PENDIENTE: { bg: 'bg-gray-100', text: 'text-gray-700' },
    EN_EJECUCION: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
    COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700' },
    VENCIDA: { bg: 'bg-red-100', text: 'text-red-700' }
  };

  const config = estadoConfig[accion.estado];

  return (
    <div className="bg-white rounded border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-900 flex-1">{accion.descripcion}</p>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ml-2 ${config.bg} ${config.text}`}>
          {accion.progreso}%
        </span>
      </div>
      <div className="text-xs text-gray-600">
        {accion.responsable} • Vence: {accion.fechaVencimiento}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: DOCUMENTOS
// ════════════════════════════════════════════════════════════════════════════

function TabDocumentos({ plan }: { plan: PlanMejoramientoDetalle }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-medium text-gray-900">Documentos y Evidencias</h3>
          <p className="text-sm text-gray-600">{plan.documentos.length} archivos</p>
        </div>

        <button className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Cargar Documento
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {plan.documentos.map((doc) => (
          <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>

              <div className="flex-1">
                <h4 className="text-sm text-gray-900 font-medium mb-1">{doc.nombre}</h4>
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <span>{doc.tipo}</span>
                  <span>{doc.tamanio}</span>
                  <span>{doc.fechaCarga}</span>
                  <span>{doc.autor}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button className="p-2 text-gray-600 hover:text-[#1e5da8] transition-colors">
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-[#1e5da8] transition-colors">
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TAB: SEGUIMIENTO (TIMELINE)
// ════════════════════════════════════════════════════════════════════════════

function TabSeguimiento({ plan }: { plan: PlanMejoramientoDetalle }) {
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-base font-medium text-gray-900">Historial de Actividades</h3>
        <p className="text-sm text-gray-600">{plan.timeline.length} eventos registrados</p>
      </div>

      <div className="space-y-3">
        {plan.timeline.map((actividad, index) => (
          <TimelineItem key={actividad.id} actividad={actividad} isLast={index === plan.timeline.length - 1} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ actividad, isLast }: { actividad: ActividadTimeline; isLast: boolean }) {
  const tipoConfig = {
    CREACION: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Plus },
    ACTUALIZACION: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Edit2 },
    COMPLETADA: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2 },
    EVIDENCIA: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Paperclip },
    COMENTARIO: { bg: 'bg-gray-100', text: 'text-gray-700', icon: MessageSquare }
  };

  const config = tipoConfig[actividad.tipo];
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-5 h-5 ${config.text}`} />
        </div>
        {!isLast && <div className="flex-1 w-0.5 bg-gray-200 mt-2" style={{ minHeight: '40px' }} />}
      </div>

      <div className="flex-1 pb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-900 mb-2">{actividad.descripcion}</p>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {actividad.usuario}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {actividad.fecha}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

function InfoItem({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div className="text-xs text-gray-600 mb-1">{label}</div>
      <div className="text-sm text-gray-900">{valor}</div>
    </div>
  );
}

function ProgresoBar({ label, valor, total, color }: { label: string; valor: number; total: number; color: string }) {
  const porcentaje = total > 0 ? Math.round((valor / total) * 100) : 0;

  const colorClasses = {
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    gray: 'bg-gray-600',
    red: 'bg-red-600'
  };

  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-gray-700">{label}</span>
        <span className="text-gray-900 font-medium">{valor}/{total} ({porcentaje}%)</span>
      </div>
      <div className="bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full transition-all ${colorClasses[color as keyof typeof colorClasses]}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}

function FiltroButton({ active, onClick, label, color = 'gray' }: any) {
  const colorClasses = {
    green: active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-300',
    yellow: active ? 'bg-yellow-100 text-yellow-700 border-yellow-300' : 'bg-white text-gray-700 border-gray-300',
    gray: active ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300'
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 border rounded-lg text-xs font-medium transition-colors ${colorClasses[color]}`}
    >
      {label}
    </button>
  );
}

// Importar ChevronDown si no está
import { ChevronDown } from 'lucide-react';