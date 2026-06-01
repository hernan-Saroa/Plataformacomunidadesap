/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLANES DE MEJORAMIENTO - VERSIÓN KANBAN PREMIUM + LISTA
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * SEGUIMIENTO como protagonista - Diseño nivel Auditorías
 * Integración automática desde Auditorías Finalizadas
 * 
 * VERSIÓN: 4.0 - PREMIUM KANBAN
 * ÚLTIMA ACTUALIZACIÓN: 24 Diciembre 2025
 * 
 * ✨ Características Premium:
 * - Columnas colapsables/expandibles
 * - Semáforos de alerta (verde/amarillo/rojo)
 * - Drag & Drop fluido
 * - Animaciones suaves
 * - Indicadores visuales de progreso
 * - Headers sticky con métricas
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, AlertTriangle, Target, Users, Calendar, Clock,
  ChevronDown, CheckCircle2, Plus, Eye, Send, Edit2, Trash2, 
  Save, Download, X, AlertCircle, CheckSquare, ArrowLeft, Search,
  BarChart3, ClipboardCheck, FileCheck, Building2, Activity, 
  Info, List, LayoutGrid, GripVertical, ArrowRight, Filter,
  TrendingUp, Flag, Circle, Maximize2, Minimize2,
  PlayCircle, PauseCircle, AlertOctagon, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Design System
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { HeaderModuloCIG } from './HeaderModuloCIG';
import { ModuleHeaderBar } from './ModuleHeaderBar';
import { ModalDetallePlanMejoramiento } from './ModalDetallePlanMejoramiento';

// Integración
import { useIntegracionAuditoriaPlanes } from './IntegracionAuditoriasPlanesContext';

// ✅ Hook de backend para planes de mejoramiento
import { usePlanesMejoramiento, PlanMejoramientoKanban } from './services/usePlanesMejoramiento';
import { controlInternoService } from '../../services/api/controlInternoService';
import { usePlanAnualVigenciaContextOptional } from './PlanAnualVigenciaContext';
import { auditoriaCoincideVigenciaPlan } from './services/useAuditoriasKanban';

// Validaciones
import { validarPlanParaAuditoriaCompleta, mostrarErroresValidacion } from './utils/validaciones';

// ✅ FASE 1 DÍA 2: Componentes responsive
import { useResponsive } from '@/hooks/useResponsive';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES UI BÁSICOS (Badge y Card)
// ════════════════════════════════════════════════════════════════════════════

const Badge = ({ className = '', children }: { className?: string; children: React.ReactNode }) => (
  <span className={`inline-flex items-center rounded-full ${className}`}>{children}</span>
);

const Card = ({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`} {...props}>{children}</div>
);

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type EstadoPlan = 'FORMULACION' | 'borrador' | 'revision' | 'APROBADO' | 'aprobado' | 'EN_EJECUCION' | 'en_ejecucion' | 'CON_RETRASO' | 'COMPLETADO' | 'completado' | 'SUSPENDIDO' | 'rechazado' | 'RECHAZADO';
type SemaforoPlan = 'verde' | 'amarillo' | 'rojo';

interface PlanMejoramiento {
  id: string;
  codigo: string;
  auditoria: string;
  area: string;
  responsable: string;
  cargoResponsable: string;
  fechaCreacion: string;
  fechaAprobacion?: string;
  fechaInicio?: string;
  fechaFin: string;
  estado: EstadoPlan;
  semaforo: SemaforoPlan;
  totalHallazgos: number;
  totalAcciones: number;
  accionesCompletadas: number;
  accionesEnProceso: number;
  accionesPendientes: number;
  porcentajeAvance: number;
  hallazgosCriticos: number;
  hallazgosModerados: number;
  hallazgosLeves: number;
  ultimaActualizacion: string;
  alertas: number;
  diasRestantes: number;
}

// Datos de ejemplo mejorados con semáforos
const PLANES_EJEMPLO: PlanMejoramiento[] = [
  {
    id: 'plan-1',
    codigo: 'PM-2024-001',
    auditoria: 'Auditoría Control Interno - Gestión Documental',
    area: 'Dirección General',
    responsable: 'Carlos Méndez',
    cargoResponsable: 'Director General',
    fechaCreacion: '2024-01-10',
    fechaAprobacion: '2024-01-15',
    fechaInicio: '2024-01-20',
    fechaFin: '2024-12-30',
    estado: 'EN_EJECUCION',
    semaforo: 'verde',
    totalHallazgos: 8,
    totalAcciones: 8,
    accionesCompletadas: 6,
    accionesEnProceso: 2,
    accionesPendientes: 0,
    porcentajeAvance: 75,
    hallazgosCriticos: 2,
    hallazgosModerados: 3,
    hallazgosLeves: 3,
    ultimaActualizacion: '2024-12-20',
    alertas: 0,
    diasRestantes: 10
  },
  {
    id: 'plan-2',
    codigo: 'PM-2024-002',
    auditoria: 'Auditoría Contratación - Procesos de Selección',
    area: 'Subdirección Administrativa',
    responsable: 'Ana Rodríguez',
    cargoResponsable: 'Subdirectora Administrativa',
    fechaCreacion: '2024-02-05',
    fechaAprobacion: '2024-02-10',
    fechaInicio: '2024-02-15',
    fechaFin: '2024-12-25',
    estado: 'CON_RETRASO',
    semaforo: 'rojo',
    totalHallazgos: 12,
    totalAcciones: 12,
    accionesCompletadas: 4,
    accionesEnProceso: 5,
    accionesPendientes: 3,
    porcentajeAvance: 33,
    hallazgosCriticos: 4,
    hallazgosModerados: 5,
    hallazgosLeves: 3,
    ultimaActualizacion: '2024-12-10',
    alertas: 3,
    diasRestantes: -5
  },
  {
    id: 'plan-3',
    codigo: 'PM-2023-015',
    auditoria: 'Auditoría Financiera - Ejecución Presupuestal',
    area: 'Dirección Financiera',
    responsable: 'Luis Gómez',
    cargoResponsable: 'Director Financiero',
    fechaCreacion: '2023-11-01',
    fechaAprobacion: '2023-11-05',
    fechaInicio: '2023-11-10',
    fechaFin: '2024-11-10',
    estado: 'COMPLETADO',
    semaforo: 'verde',
    totalHallazgos: 6,
    totalAcciones: 6,
    accionesCompletadas: 6,
    accionesEnProceso: 0,
    accionesPendientes: 0,
    porcentajeAvance: 100,
    hallazgosCriticos: 1,
    hallazgosModerados: 3,
    hallazgosLeves: 2,
    ultimaActualizacion: '2024-11-05',
    alertas: 0,
    diasRestantes: 0
  },
  {
    id: 'plan-4',
    codigo: 'PM-2024-003',
    auditoria: 'Auditoría Recursos Humanos - Nómina',
    area: 'Gestión del Talento Humano',
    responsable: 'María Torres',
    cargoResponsable: 'Jefe de Talento Humano',
    fechaCreacion: '2024-02-25',
    fechaAprobacion: '2024-03-01',
    fechaInicio: '2024-03-05',
    fechaFin: '2025-03-05',
    estado: 'EN_EJECUCION',
    semaforo: 'amarillo',
    totalHallazgos: 10,
    totalAcciones: 10,
    accionesCompletadas: 5,
    accionesEnProceso: 4,
    accionesPendientes: 1,
    porcentajeAvance: 50,
    hallazgosCriticos: 2,
    hallazgosModerados: 4,
    hallazgosLeves: 4,
    ultimaActualizacion: '2024-12-22',
    alertas: 1,
    diasRestantes: 73
  },
  {
    id: 'plan-5',
    codigo: 'PM-2024-004',
    auditoria: 'Auditoría TIC - Seguridad de la Información',
    area: 'Dirección de Tecnología',
    responsable: 'Jorge Silva',
    cargoResponsable: 'Director de TIC',
    fechaCreacion: '2024-04-10',
    fechaAprobacion: '2024-04-12',
    fechaInicio: '2024-04-15',
    fechaFin: '2025-04-15',
    estado: 'APROBADO',
    semaforo: 'verde',
    totalHallazgos: 15,
    totalAcciones: 15,
    accionesCompletadas: 0,
    accionesEnProceso: 0,
    accionesPendientes: 15,
    porcentajeAvance: 0,
    hallazgosCriticos: 5,
    hallazgosModerados: 6,
    hallazgosLeves: 4,
    ultimaActualizacion: '2024-04-12',
    alertas: 0,
    diasRestantes: 114
  },
  {
    id: 'plan-6',
    codigo: 'PM-2024-005',
    auditoria: 'Auditoría Académica - Programas de Formación',
    area: 'Dirección Académica',
    responsable: 'Patricia Vargas',
    cargoResponsable: 'Directora Académica',
    fechaCreacion: '2024-05-15',
    fechaAprobacion: '2024-05-20',
    fechaInicio: '2024-05-25',
    fechaFin: '2024-12-25',
    estado: 'SUSPENDIDO',
    semaforo: 'rojo',
    totalHallazgos: 7,
    totalAcciones: 7,
    accionesCompletadas: 2,
    accionesEnProceso: 0,
    accionesPendientes: 5,
    porcentajeAvance: 28,
    hallazgosCriticos: 1,
    hallazgosModerados: 2,
    hallazgosLeves: 4,
    ultimaActualizacion: '2024-10-15',
    alertas: 2,
    diasRestantes: 1
  },
  {
    id: 'plan-7',
    codigo: 'PM-2024-006',
    auditoria: 'Auditoría Planeación Estratégica - Indicadores de Gestión',
    area: 'Oficina de Planeación',
    responsable: 'Ricardo Mora',
    cargoResponsable: 'Jefe de Planeación',
    fechaCreacion: '2024-12-20',
    fechaFin: '2025-12-20',
    estado: 'FORMULACION',
    semaforo: 'amarillo',
    totalHallazgos: 9,
    totalAcciones: 0,
    accionesCompletadas: 0,
    accionesEnProceso: 0,
    accionesPendientes: 0,
    porcentajeAvance: 0,
    hallazgosCriticos: 3,
    hallazgosModerados: 4,
    hallazgosLeves: 2,
    ultimaActualizacion: '2024-12-20',
    alertas: 0,
    diasRestantes: 365
  },
  {
    id: 'plan-8',
    codigo: 'PM-2024-007',
    auditoria: 'Auditoría Inventarios - Control de Activos Fijos',
    area: 'Almacén General',
    responsable: 'Sandra López',
    cargoResponsable: 'Jefe de Almacén',
    fechaCreacion: '2024-11-15',
    fechaFin: '2025-11-15',
    estado: 'FORMULACION',
    semaforo: 'verde',
    totalHallazgos: 5,
    totalAcciones: 0,
    accionesCompletadas: 0,
    accionesEnProceso: 0,
    accionesPendientes: 0,
    porcentajeAvance: 0,
    hallazgosCriticos: 1,
    hallazgosModerados: 2,
    hallazgosLeves: 2,
    ultimaActualizacion: '2024-11-15',
    alertas: 0,
    diasRestantes: 329
  }
];

// Configuración de columnas Kanban
const COLUMNAS_KANBAN = [
  {
    id: 'FORMULACION',
    titulo: 'Formulación',
    icono: <ClipboardCheck className="w-4 h-4" style={{ color: '#9333ea' }} />,
    color: '#9333ea',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    diasEstimados: 15
  },
  {
    id: 'APROBADO',
    titulo: 'Aprobado',
    icono: <CheckSquare className="w-4 h-4" style={{ color: '#3b82f6' }} />,
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    diasEstimados: 0
  },
  {
    id: 'EN_EJECUCION',
    titulo: 'En Ejecución',
    icono: <PlayCircle className="w-4 h-4" style={{ color: '#10b981' }} />,
    color: '#10b981',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    diasEstimados: 180
  },
  {
    id: 'CON_RETRASO',
    titulo: 'Con Retraso',
    icono: <AlertOctagon className="w-4 h-4" style={{ color: '#f97316' }} />,
    color: '#f97316',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    diasEstimados: 0
  },
  {
    id: 'COMPLETADO',
    titulo: 'Completado',
    icono: <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />,
    color: '#10b981',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    diasEstimados: 0
  },
  {
    id: 'SUSPENDIDO',
    titulo: 'Suspendido',
    icono: <PauseCircle className="w-4 h-4" style={{ color: '#6b7280' }} />,
    color: '#6b7280',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    diasEstimados: 0
  }
];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function PlanesMejoramientoModuleRediseno() {
  const vigenciaCtx = usePlanAnualVigenciaContextOptional();
  const vigenciaActiva = vigenciaCtx?.vigencia;

  // ✅ HOOK DE BACKEND - Planes de mejoramiento
  const {
    planes,
    loading: cargandoBackend,
    error: errorBackend,
    fetchPlanes,
    crearPlan: crearPlanBackend,
    actualizarEstadoPlan,
    aprobarPlan,
    rechazarPlan
  } = usePlanesMejoramiento(
    vigenciaActiva != null ? { planAnualVigencia: vigenciaActiva } : undefined,
  );

  const [modalCrearPlanOpen, setModalCrearPlanOpen] = useState(false);
  const [auditoriasElegiblesBackend, setAuditoriasElegiblesBackend] = useState<any[]>([]);



  // Integración con Auditorías
  const { 
    auditoriaSeleccionada, 
    limpiarSeleccion,
    auditoriasConHallazgos,
    navegarAFormulacion,
    setNavegarAFormulacion,
    auditoriaIdParaVerPlan,
    limpiarVerPlan,
    crearPlan: crearPlanContext,
    generarExpediente,
    auditoriaIdFoco,
    setAuditoriaIdFoco
  } = useIntegracionAuditoriaPlanes();

  // Plan a abrir cuando viene de "Ir a ver plan" (plan ya existe)
  const planIdParaAbrir = useMemo(() => {
    if (!auditoriaIdParaVerPlan || planes.length === 0) return null;
    const plan = planes.find(
      (p: any) => (p.auditoriaId || p.auditoria_id || p.auditoria?.id) === auditoriaIdParaVerPlan
    );
    return plan?.id ?? null;
  }, [auditoriaIdParaVerPlan, planes]);

  const normalizarTexto = (valor: unknown): string =>
    String(valor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

  const contarHallazgos = (auditoria: any): number => {
    if (Array.isArray(auditoria?.hallazgos)) return auditoria.hallazgos.length;
    const candidatos = [
      auditoria?.hallazgos,
      auditoria?.totalHallazgos,
      auditoria?.total_hallazgos,
      auditoria?.numeroHallazgos,
      auditoria?.hallazgosDetectados,
    ];
    for (const c of candidatos) {
      const n = Number(c);
      if (Number.isFinite(n) && n > 0) return n;
    }
    return 0;
  };

  const auditoriasElegiblesParaCrear = useMemo(() => {
    const fuente = Array.isArray(auditoriasElegiblesBackend) ? auditoriasElegiblesBackend : [];
    const porId = new Map<string, any>();

    for (const aud of fuente) {
      if (aud?.id) porId.set(aud.id, aud);
    }

    for (const aud of auditoriasConHallazgos) {
      if (aud?.id && !porId.has(aud.id)) porId.set(aud.id, aud);
    }

    return Array.from(porId.values());
  }, [auditoriasElegiblesBackend, auditoriasConHallazgos]);

  const cargarAuditoriasElegibles = useCallback(async () => {
    try {
      const filtrosVigencia =
        vigenciaActiva != null
          ? { planAnualVigencia: vigenciaActiva, year: vigenciaActiva }
          : undefined;
      const [auditoriasResp, planesResp] = await Promise.all([
        controlInternoService.getAuditorias(filtrosVigencia),
        controlInternoService
          .getPlanesMejoramiento(
            vigenciaActiva != null ? { planAnualVigencia: vigenciaActiva } : undefined,
          )
          .catch(() => []),
      ]);

      let auditorias = Array.isArray(auditoriasResp) ? auditoriasResp : [];
      if (vigenciaActiva != null) {
        auditorias = auditorias.filter((a: any) =>
          auditoriaCoincideVigenciaPlan(a, vigenciaActiva),
        );
      }
      const planesExistentes = Array.isArray(planesResp) ? planesResp : [];
      const idsConPlan = new Set(
        planesExistentes
          .map((p: any) => p?.auditoriaId || p?.auditoria_id || p?.auditoria?.id)
          .filter((id: any) => typeof id === 'string' && id.length > 0)
      );

      const elegibles = auditorias
        .filter((a: any) => {
          const estado = normalizarTexto(a?.estadoKanban || a?.fase || a?.estado);
          const enEstadoPermitido =
            estado === 'comunicacion' || estado === 'seguimiento' || estado === 'finalizada';
          const hallazgos = contarHallazgos(a);
          return enEstadoPermitido && hallazgos > 0 && !idsConPlan.has(a?.id);
        })
        .map((a: any) => {
          const fechaFin = String(
            a?.fechaFinComunicacion || a?.fechaFin || a?.fecha_fin || new Date().toISOString().split('T')[0]
          );
          const fechaFinIso = fechaFin.includes('T') ? fechaFin.split('T')[0] : fechaFin;
          const fechaLimiteObj = new Date(`${fechaFinIso}T00:00:00`);
          if (!Number.isNaN(fechaLimiteObj.getTime())) fechaLimiteObj.setDate(fechaLimiteObj.getDate() + 30);
          const fechaLimitePlan = !Number.isNaN(fechaLimiteObj.getTime())
            ? fechaLimiteObj.toISOString().split('T')[0]
            : calcularFechaLimite();

          return {
            id: a.id,
            codigo: a.codigo || 'AUD',
            nombre: a.nombre || a.titulo || a.proceso || 'Auditoría',
            areaResponsable: a.areaResponsable || a.areaObjetivo || a.proceso || 'N/A',
            responsable:
              typeof a.auditorLider === 'string'
                ? a.auditorLider
                : a.auditorLider?.nombre || a.responsable || 'N/A',
            cargo:
              typeof a.auditorLider === 'object' && a.auditorLider?.cargo ? a.auditorLider.cargo : '',
            fechaFinalizacion: fechaFinIso,
            estadoPlan: 'SIN_PLAN' as const,
            fechaLimitePlan,
            plazoFormulacion: 30,
            hallazgos: Array.isArray(a.hallazgos) ? a.hallazgos : [],
          };
        });

      setAuditoriasElegiblesBackend(elegibles);
    } catch (err) {
      console.error('[PlanesMejoramiento] Error cargando auditorias elegibles:', err);
      setAuditoriasElegiblesBackend([]);
    }
  }, [vigenciaActiva]);

  // Auto-abrir modal CREAR solo si viene desde auditorías para crear (no para ver)
  useEffect(() => {
    if (auditoriaSeleccionada && navegarAFormulacion && !auditoriaIdParaVerPlan) {
      setModalCrearPlanOpen(true);
      setNavegarAFormulacion(false);
    }
  }, [auditoriaSeleccionada, navegarAFormulacion, setNavegarAFormulacion, auditoriaIdParaVerPlan]);

  useEffect(() => {
    cargarAuditoriasElegibles();
  }, [cargarAuditoriasElegibles]);

  useEffect(() => {
    if (planes.length > 0) {
      cargarAuditoriasElegibles();
    }
  }, [planes, cargarAuditoriasElegibles]);

  const handleCrearPlanDesdeAuditoria = async (auditoria: any) => {
    if (!auditoria) return;

    // ✅ Crear en backend con DTO correcto
    const fechaLimite = auditoria.fechaLimitePlan || calcularFechaLimite();
    // Asegurar formato ISO 8601
    const fechaLimiteISO = fechaLimite.includes('/') 
      ? (() => {
          const [d, m, y] = fechaLimite.split('/');
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        })()
      : fechaLimite;

    const planCreado = await crearPlanBackend({
      areaResponsable: auditoria.areaResponsable || auditoria.area || 'Sin área',
      responsableImplementacion: auditoria.responsable || 'Sin responsable',
      fechaLimite: fechaLimiteISO,
      auditoriaId: auditoria.id,
      titulo: `Plan de Mejoramiento - ${auditoria.codigo || 'Nuevo'}`,
      descripcion: `Plan de mejoramiento derivado de la auditoría ${auditoria.nombre || auditoria.titulo || ''}`
    });

    if (planCreado) {
      // Actualizar contexto de integración
      crearPlanContext({
        auditoriaId: auditoria.id,
        codigoAuditoria: auditoria.codigo,
        fechaCreacion: planCreado.fechaCreacion,
        estado: 'EN_FORMULACION',
        accionesCreadas: 0,
        progresoGeneral: 0
      });
      
      // ✅ Toast de éxito
      toast.success(`Plan ${planCreado.codigo} creado exitosamente`);
      setModalCrearPlanOpen(false);
      limpiarSeleccion();
      return;
    }

    // En caso de que no se haya podido crear en el backend, el hook ya manejará el error y mostrará el toast.
    // Ya no usamos el fallback local para evitar inconsistencias de estado.

    setModalCrearPlanOpen(false);
    limpiarSeleccion();
  };

  // ✅ NUEVO: Handler para completar plan y generar expediente automáticamente
  const handleCompletarPlan = async (plan: PlanMejoramiento) => {
    // 0. Validar requisitos mínimos: al menos 1 acción y 1 completada (para auditoría al 100%)
    const validacionMinima = validarPlanParaAuditoriaCompleta(
      plan.totalAcciones || 0,
      plan.accionesCompletadas || 0
    );
    if (!validacionMinima.valido) {
      mostrarErroresValidacion(validacionMinima);
      return;
    }
    // 1. Validar que esté 100% completo
    if (plan.porcentajeAvance < 100) {
      toast.error('El plan debe estar completado al 100%', {
        description: `Progreso actual: ${plan.porcentajeAvance}%. Completa todas las acciones primero.`
      });
      return;
    }

    // 2. Validar que todas las acciones estén completadas
    if (plan.accionesCompletadas < plan.totalAcciones) {
      toast.error(
        `Faltan ${plan.totalAcciones - plan.accionesCompletadas} acciones por completar`,
        {
          description: 'Todas las acciones deben estar marcadas como completadas con evidencias.'
        }
      );
      return;
    }

    // 3. Actualizar estado del plan en backend
    const actualizado = await actualizarEstadoPlan(plan.id, 'COMPLETADO' as EstadoPlan);
    if (!actualizado) {
      toast.error('Error al completar el plan en el servidor');
      return;
    }

    // La actualización se reflejará a través del hook tras el refresco
    await fetchPlanes();

    // 4. Generar expediente automáticamente
    const expediente = {
      id: `exp-${Date.now()}`,
      auditoriaId: plan.id,
      codigoAuditoria: plan.codigo,
      planMejoramientoId: plan.id,
      fechaGeneracion: new Date().toISOString(),
      documentos: [
        {
          tipo: 'Plan de Auditoría',
          nombre: `Plan_${plan.codigo}.pdf`,
          url: '#',
          fecha: plan.fechaCreacion
        },
        {
          tipo: 'Informe Final de Auditoría',
          nombre: `Informe_${plan.codigo}.pdf`,
          url: '#',
          fecha: plan.fechaCreacion
        },
        {
          tipo: 'Plan de Mejoramiento',
          nombre: `Plan_Mejoramiento_${plan.codigo}.pdf`,
          url: '#',
          fecha: plan.fechaCreacion
        },
        {
          tipo: 'Evidencias de Cumplimiento',
          nombre: `Evidencias_${plan.codigo}.zip`,
          url: '#',
          fecha: new Date().toISOString()
        }
      ],
      metadatos: {
        duracionTotal: calcularDuracionDias(plan.fechaCreacion, new Date().toISOString()),
        hallazgos: plan.totalHallazgos,
        hallazgosResueltos: plan.accionesCompletadas,
        cumplimientoPlan: plan.porcentajeAvance
      },
      estado: 'GENERADO' as const
    };

    // 5. Guardar expediente en el context
    generarExpediente(expediente);

    // 6. Notificación de éxito
    toast.success(
      '✅ Plan completado y expediente generado',
      {
        description: `Expediente ${plan.codigo} generado automáticamente y disponible en el módulo de Expedientes.`,
        duration: 7000,
        action: {
          label: 'Ver Expediente',
          onClick: () => {
            console.log('Navegar a expedientes', expediente.id);
            toast.info('Navegando al módulo de Expedientes...');
          }
        }
      }
    );

    console.log('📁 Expediente generado:', expediente);
  };

  // Helper para calcular duración en días
  const calcularDuracionDias = (fechaInicio: string, fechaFin: string): number => {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const diff = fin.getTime() - inicio.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };
  
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50">
        <ModuleHeaderBar
          title="Planes de Mejoramiento"
          subtitle={`Formulación, seguimiento y cierre de acciones correctivas${vigenciaActiva ? ` · Vigencia ${vigenciaActiva}` : ''}`}
          icon={<AlertTriangle className="w-5 h-5 text-white" />}
          color="#EF4444"
        />

        {/* Contenido Principal */}
        <SeguimientoView 
          planes={planes} 
          onAbrirCrearPlan={() => setModalCrearPlanOpen(true)}
          auditoriasDisponibles={auditoriasElegiblesParaCrear}
          onCompletarPlan={handleCompletarPlan}
          planIdParaAbrir={planIdParaAbrir}
          onPlanAbiertoParaVer={limpiarVerPlan}
          fetchPlanes={fetchPlanes}
        />

        {/* Modal Crear Plan desde Auditoría */}
        {modalCrearPlanOpen && (
          <ModalCrearPlanDesdeAuditoria
            auditoria={auditoriaSeleccionada}
            auditoriasDisponibles={auditoriasElegiblesParaCrear}
            onCrear={handleCrearPlanDesdeAuditoria}
            onCerrar={() => {
              setModalCrearPlanOpen(false);
              limpiarSeleccion();
            }}
          />
        )}
      </div>
    </DndProvider>
  );
}

// Función auxiliar
function calcularFechaLimite(): string {
  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() + 1);
  return fecha.toISOString().split('T')[0];
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA: SEGUIMIENTO
// ════════════════════════════════════════════════════════════════════════════

interface SeguimientoViewProps {
  planes: PlanMejoramiento[];
  setPlanes: React.Dispatch<React.SetStateAction<PlanMejoramiento[]>>;
  onAbrirCrearPlan: () => void;
  auditoriasDisponibles: any[];
  onCompletarPlan?: (plan: PlanMejoramiento) => void;
  planIdParaAbrir?: string | null;
  onPlanAbiertoParaVer?: () => void;
  /** Recarga planes desde API (Kanban/lista tras cerrar modal o actualizar acciones) */
  fetchPlanes?: () => void | Promise<void>;
}

function SeguimientoView({ planes, onAbrirCrearPlan, auditoriasDisponibles, onCompletarPlan, planIdParaAbrir, onPlanAbiertoParaVer, fetchPlanes }: SeguimientoViewProps) {
  const [vistaTablero, setVistaTablero] = useState<'kanban' | 'lista'>('lista');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPlan | 'TODOS'>('TODOS');
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanMejoramiento | null>(null);
  const [columnasColapsadas, setColumnasColapsadas] = useState<Set<string>>(new Set());
  const { auditoriaIdFoco, setAuditoriaIdFoco } = useIntegracionAuditoriaPlanes();

  // Abrir detalle cuando viene de "Ir a ver plan"
  useEffect(() => {
    if (planIdParaAbrir && planes.length > 0) {
      const plan = planes.find(p => p.id === planIdParaAbrir);
      if (plan) {
        setPlanSeleccionado(plan);
        onPlanAbiertoParaVer?.();
      }
    }
  }, [planIdParaAbrir, planes, onPlanAbiertoParaVer]);

  // ✅ NUEVO: Foco automático desde Notificaciones (Abrir plan)
  useEffect(() => {
    if (auditoriaIdFoco && planes.length > 0) {
      console.log('[PlanesMejoramiento] Detectado foco para plan (vía auditoríaId/planId):', auditoriaIdFoco);
      // El foco puede ser el ID del plan directamente o el ID de la auditoría asociada
      const plan = planes.find(
        (p: any) => 
          p.id === auditoriaIdFoco || 
          (p.auditoriaId || p.auditoria_id || p.auditoria?.id) === auditoriaIdFoco
      );
      if (plan) {
        setPlanSeleccionado(plan);
        setAuditoriaIdFoco(null); // Limpiar foco después de abrir
      }
    }
  }, [auditoriaIdFoco, planes, setAuditoriaIdFoco]);

  const planesFiltrados = useMemo(() => {
    let resultado = planes;
    
    if (filtroEstado !== 'TODOS') {
      // Agrupar estados del backend a filtros Kanban
      const estadosDelFiltro: Record<string, string[]> = {
        FORMULACION: ['FORMULACION', 'borrador', 'revision'],
        APROBADO: ['APROBADO', 'aprobado'],
        EN_EJECUCION: ['EN_EJECUCION', 'en_ejecucion'],
        CON_RETRASO: ['CON_RETRASO'],
        COMPLETADO: ['COMPLETADO', 'completado'],
        SUSPENDIDO: ['SUSPENDIDO', 'rechazado', 'RECHAZADO'],
      };
      const permitidos = estadosDelFiltro[filtroEstado] ?? [filtroEstado];
      resultado = resultado.filter(p => permitidos.includes(p.estado));
    }
    
    if (busqueda) {
      const search = busqueda.toLowerCase();
      resultado = resultado.filter(p => 
        p.codigo.toLowerCase().includes(search) ||
        p.auditoria.toLowerCase().includes(search) ||
        p.area.toLowerCase().includes(search) ||
        p.responsable.toLowerCase().includes(search)
      );
    }
    
    return resultado;
  }, [planes, filtroEstado, busqueda]);

  const estadisticas = useMemo(() => {
    const total = planes.length;
    const formulacion = planes.filter(p => p.estado === 'FORMULACION' || p.estado === 'borrador' || p.estado === 'revision').length;
    const aprobados = planes.filter(p => p.estado === 'APROBADO' || p.estado === 'aprobado').length;
    const enEjecucion = planes.filter(p => p.estado === 'EN_EJECUCION' || p.estado === 'en_ejecucion').length;
    const conRetraso = planes.filter(p => p.estado === 'CON_RETRASO').length;
    const completados = planes.filter(p => p.estado === 'COMPLETADO' || p.estado === 'completado').length;
    const suspendidos = planes.filter(p => p.estado === 'SUSPENDIDO').length;
    
    // Semáforos
    const planesVerdes = planes.filter(p => p.semaforo === 'verde').length;
    const planesAmarillos = planes.filter(p => p.semaforo === 'amarillo').length;
    const planesRojos = planes.filter(p => p.semaforo === 'rojo').length;
    
    const totalAcciones = planes.reduce((sum, p) => sum + p.totalAcciones, 0);
    const accionesCompletadas = planes.reduce((sum, p) => sum + p.accionesCompletadas, 0);
    const alertasActivas = planes.reduce((sum, p) => sum + p.alertas, 0);
    
    return {
      total,
      formulacion,
      aprobados,
      enEjecucion,
      conRetraso,
      completados,
      suspendidos,
      planesVerdes,
      planesAmarillos,
      planesRojos,
      totalAcciones,
      accionesCompletadas,
      alertasActivas,
      promedioAvance: totalAcciones > 0 ? Math.round((accionesCompletadas / totalAcciones) * 100) : 0
    };
  }, [planes]);

  const handleMoverPlan = async (planId: string, nuevoEstado: EstadoPlan) => {
    // Sincronizar con backend (el hook ya maneja la actualización del estado local)
    const actualizado = await actualizarEstadoPlan(planId, nuevoEstado);
    if (!actualizado) {
      // Revertir si falla
      fetchPlanes();
    } else {
      toast.success(`Plan movido a ${obtenerNombreEstado(nuevoEstado)}`);
    }
  };

  const toggleColapsoColumna = (columnaId: string) => {
    setColumnasColapsadas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(columnaId)) {
        nuevo.delete(columnaId);
      } else {
        nuevo.add(columnaId);
      }
      return nuevo;
    });
  };

  return (
    <div className="w-full p-3">
      {/* Header con Métricas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Panel de Seguimiento</h2>
            <p className="text-[11px] text-gray-500">Gestión integral de planes de mejoramiento</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botón Crear Plan */}
            <button
              onClick={onAbrirCrearPlan}
              className="px-4 py-2 bg-[#1e5da8] text-white rounded-lg hover:bg-[#174a8a] transition-all flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Crear Plan desde Auditoría
            </button>

            {/* Toggle Vista - Estilo Kanban referencia */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200">
              <button
                onClick={() => setVistaTablero('lista')}
                className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
                  vistaTablero === 'lista' ? 'bg-[#1e5da8] text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
              <button
                onClick={() => setVistaTablero('kanban')}
                className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
                  vistaTablero === 'kanban' ? 'bg-[#1e5da8] text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar por código, auditoría, área o responsable..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1e5da8] focus:border-[#1e5da8] text-sm"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          </div>
          
          {vistaTablero === 'lista' && (
            <div className="flex gap-2">
              <FilterButton
                active={filtroEstado === 'TODOS'}
                onClick={() => setFiltroEstado('TODOS')}
                label="Todos"
                count={planes.length}
              />
              <FilterButton
                active={filtroEstado === 'FORMULACION'}
                onClick={() => setFiltroEstado('FORMULACION')}
                label="Formulación"
                count={estadisticas.formulacion}
                color="purple"
              />
              <FilterButton
                active={filtroEstado === 'EN_EJECUCION'}
                onClick={() => setFiltroEstado('EN_EJECUCION')}
                label="Ejecución"
                count={estadisticas.enEjecucion}
                color="green"
              />
              <FilterButton
                active={filtroEstado === 'CON_RETRASO'}
                onClick={() => setFiltroEstado('CON_RETRASO')}
                label="Retraso"
                count={estadisticas.conRetraso}
                color="orange"
              />
              <FilterButton
                active={filtroEstado === 'COMPLETADO'}
                onClick={() => setFiltroEstado('COMPLETADO')}
                label="Completados"
                count={estadisticas.completados}
                color="emerald"
              />
            </div>
          )}
        </div>
      </div>

      {/* Contenido según vista */}
      {vistaTablero === 'kanban' ? (
        <VistaKanban 
          planes={planesFiltrados}
          onMoverPlan={handleMoverPlan}
          onAbrirPlan={setPlanSeleccionado}
          onCompletarPlan={onCompletarPlan}
          columnasColapsadas={columnasColapsadas}
          onToggleColapso={toggleColapsoColumna}
        />
      ) : (
        <VistaLista 
          planes={planesFiltrados}
          onAbrirPlan={setPlanSeleccionado}
          onCompletarPlan={onCompletarPlan}
        />
      )}

      {/* Modal Detalle Premium */}
      {planSeleccionado && (
        <ModalDetallePlanMejoramiento
          planId={planSeleccionado.id}
          onClose={() => {
            setPlanSeleccionado(null);
            void fetchPlanes?.();
          }}
          onPlanActualizado={() => void fetchPlanes?.()}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA KANBAN CON DRAG & DROP PREMIUM
// ════════════════════════════════════════════════════════════════════════════

interface VistaKanbanProps {
  planes: PlanMejoramiento[];
  onMoverPlan: (planId: string, nuevoEstado: EstadoPlan) => void;
  onAbrirPlan: (plan: PlanMejoramiento) => void;
  onCompletarPlan?: (plan: PlanMejoramiento) => void;
  columnasColapsadas: Set<string>;
  onToggleColapso: (columnaId: string) => void;
}

function VistaKanban({ planes, onMoverPlan, onAbrirPlan, onCompletarPlan, columnasColapsadas, onToggleColapso }: VistaKanbanProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
    }
  };

  return (
    <>
      <style>{`
        /* Scroll horizontal personalizado ESAP para Planes de Mejoramiento - MEJORADO */
        .kanban-scroll-container {
          scrollbar-width: auto;
          scrollbar-color: #2962FF #E5E7EB;
        }
        
        .kanban-scroll-container::-webkit-scrollbar {
          height: 16px;
        }
        
        .kanban-scroll-container::-webkit-scrollbar-track {
          background: linear-gradient(to bottom, #F9FAFB, #F3F4F6);
          border-radius: 10px;
          border: 1px solid #E5E7EB;
          box-shadow: inset 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .kanban-scroll-container::-webkit-scrollbar-thumb {
          background: linear-gradient(to right, #2962FF, #003DA5);
          border-radius: 10px;
          border: 3px solid #F3F4F6;
          box-shadow: 0 2px 4px rgba(41, 98, 255, 0.2);
        }
        
        .kanban-scroll-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to right, #003DA5, #002D7A);
          box-shadow: 0 2px 6px rgba(41, 98, 255, 0.4);
        }

        .kanban-scroll-container::-webkit-scrollbar-thumb:active {
          background: linear-gradient(to right, #002D7A, #001F5A);
        }

        /* Fallback para otros elementos con overflow-x */
        .overflow-x-auto {
          scrollbar-width: thin;
          scrollbar-color: #2962FF #E5E7EB;
        }
        
        .overflow-x-auto::-webkit-scrollbar {
          height: 12px;
        }
        
        .overflow-x-auto::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 8px;
        }
        
        .overflow-x-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(to right, #2962FF, #003DA5);
          border-radius: 8px;
          border: 2px solid #F3F4F6;
        }
        
        .overflow-x-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to right, #003DA5, #002D7A);
        }

        /* Scroll vertical personalizado para columnas kanban */
        .overflow-y-auto {
          scrollbar-width: thin;
          scrollbar-color: #2962FF #E5E7EB;
        }
        
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: #F3F4F6;
          border-radius: 8px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #2962FF, #003DA5);
          border-radius: 8px;
          border: 2px solid #F3F4F6;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #003DA5, #002D7A);
        }
      `}</style>
      
      {/* Indicador de scroll horizontal con botones de navegación - Desktop */}
      

      {/* Indicador Mobile - FASE 1 DÍA 2 */}
      <div className="lg:hidden bg-blue-50 border-l-4 border-blue-500 rounded-lg p-3 mb-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Vista móvil:</strong> Las etapas de planes se muestran apiladas para mejor seguimiento
        </p>
      </div>

      {/* Contenedor con scroll horizontal mejorado */}
      <div 
        ref={scrollContainerRef}
        className="flex flex-col lg:flex-row gap-4 overflow-x-auto pb-6 px-1 kanban-scroll-container"
        style={{
          flexWrap: 'nowrap',
          minWidth: 'max-content'
        }}
      >
        {COLUMNAS_KANBAN.map((columna) => {
        // Normalizar estados del backend (minúsculas) a columnas Kanban (MAYÚSCULAS)
        const estadoToColumna: Record<string, string> = {
          borrador: 'FORMULACION',
          revision: 'FORMULACION',
          FORMULACION: 'FORMULACION',
          aprobado: 'APROBADO',
          APROBADO: 'APROBADO',
          en_ejecucion: 'EN_EJECUCION',
          EN_EJECUCION: 'EN_EJECUCION',
          CON_RETRASO: 'CON_RETRASO',
          completado: 'COMPLETADO',
          COMPLETADO: 'COMPLETADO',
          rechazado: 'SUSPENDIDO',
          RECHAZADO: 'SUSPENDIDO',
          SUSPENDIDO: 'SUSPENDIDO',
        };
        const planesColumna = planes.filter(p => (estadoToColumna[p.estado] ?? p.estado) === columna.id);
        const colapsada = columnasColapsadas.has(columna.id);
        
        return (
          <ColumnaKanban
            key={columna.id}
            columna={columna}
            planes={planesColumna}
            onMoverPlan={onMoverPlan}
            onAbrirPlan={onAbrirPlan}
            onCompletarPlan={onCompletarPlan}
            colapsada={colapsada}
            onToggleColapso={() => onToggleColapso(columna.id)}
          />
        );
      })}
    </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COLUMNA KANBAN PREMIUM
// ════════════════════════════════════════════════════════════════════════════

interface ColumnaKanbanProps {
  columna: typeof COLUMNAS_KANBAN[0];
  planes: PlanMejoramiento[];
  onMoverPlan: (planId: string, nuevoEstado: EstadoPlan) => void;
  onAbrirPlan: (plan: PlanMejoramiento) => void;
  onCompletarPlan?: (plan: PlanMejoramiento) => void;
  colapsada: boolean;
  onToggleColapso: () => void;
}

function ColumnaKanban({ columna, planes, onMoverPlan, onAbrirPlan, onCompletarPlan, colapsada, onToggleColapso }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'PLAN',
    drop: (item: { planId: string; plan?: PlanMejoramiento }) => {
      if (columna.id === 'COMPLETADO' && onCompletarPlan && item.plan) {
        onCompletarPlan(item.plan);
      } else {
        onMoverPlan(item.planId, columna.id as EstadoPlan);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }));

  // Contar planes por semáforo
  const planesVerdes = planes.filter(p => p.semaforo === 'verde').length;
  const planesAmarillos = planes.filter(p => p.semaforo === 'amarillo').length;
  const planesRojos = planes.filter(p => p.semaforo === 'rojo').length;

  // Si está colapsada, renderizar versión compacta
  if (colapsada) {
    return (
      <motion.div
        ref={drop}
        className="w-full lg:w-10 flex-shrink-0 lg:h-full"
        initial={{ width: '100%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <Card 
          className={`h-full border transition-all cursor-pointer group ${
            isOver ? 'shadow-lg border-[#1e5da8] bg-blue-50' : 'hover:shadow-md hover:border-gray-300'
          }`}
          onClick={onToggleColapso}
        >
          <div className="flex flex-col items-center py-3 px-1 gap-2.5 relative">
            {isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 border-2 border-[#1e5da8] border-dashed rounded-lg pointer-events-none"
              />
            )}
            
            <button
              className="p-1.5 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors"
              title={`Expandir ${columna.titulo}`}
            >
              <Maximize2 className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#1e5da8]" />
            </button>

            <div className="p-1 rounded-lg bg-gray-50 border border-gray-200">
              {columna.icono}
            </div>

            {/* Indicadores de semáforo */}
            {planes.length > 0 && (
              <div className="flex flex-col gap-1 py-1">
                {planesRojos > 0 && (
                  <div className="flex items-center gap-1" title={`${planesRojos} vencidos`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold text-red-600">{planesRojos}</span>
                  </div>
                )}
                {planesAmarillos > 0 && (
                  <div className="flex items-center gap-1" title={`${planesAmarillos} próximos a vencer`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600">{planesAmarillos}</span>
                  </div>
                )}
                {planesVerdes > 0 && (
                  <div className="flex items-center gap-1" title={`${planesVerdes} en término`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    <span className="text-[10px] font-bold text-green-600">{planesVerdes}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 flex items-center justify-center py-4">
              <h3 
                className="font-black text-[10px] text-gray-800 whitespace-nowrap"
                style={{ 
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed'
                }}
              >
                {columna.titulo}
              </h3>
            </div>

            <Badge className="font-bold text-[10px] px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-700">
              {planes.length}
            </Badge>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Versión expandida
  return (
    <div 
      className="w-full flex-shrink-0"
      style={{
        minWidth: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '320px' : undefined,
        width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? '320px' : '100%'
      }}
    >
      {/* Header Columna */}
      <div className="p-4 border-b bg-gray-50 sticky top-0 z-10 rounded-t-xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="p-2 rounded-lg bg-white border border-gray-200">
              {columna.icono}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm text-gray-800">
                {columna.titulo}
              </h3>
              {columna.diasEstimados > 0 && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {columna.diasEstimados} días
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="font-semibold text-sm px-2 py-1 bg-white border border-gray-200 text-gray-700">
              {planes.length}
            </Badge>
            
            <button
              onClick={onToggleColapso}
              className="p-1.5 rounded-lg hover:bg-white transition-colors"
              title={`Colapsar ${columna.titulo}`}
            >
              <Minimize2 className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Indicadores de semáforo en header */}
        {planes.length > 0 && (
          <div className="flex items-center gap-3 mt-2">
            {planesRojos > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-600 font-medium">{planesRojos}</span>
              </div>
            )}
            {planesAmarillos > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-600 font-medium">{planesAmarillos}</span>
              </div>
            )}
            {planesVerdes > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-green-600 font-medium">{planesVerdes}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lista de Tarjetas */}
      <div
        ref={drop}
        className={`p-3 space-y-3 overflow-y-auto transition-all rounded-b-xl border-2 ${
          isOver 
            ? 'bg-gradient-to-b from-blue-100 to-blue-50 border-[#1e5da8] border-dashed shadow-inner' 
            : 'bg-gray-50 border-transparent'
        }`}
        style={{ minHeight: 'calc(100vh - 180px)', maxHeight: 'calc(100vh - 180px)' }}
      >
        {isOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center justify-center py-8 px-4 bg-white/80 rounded-lg border-2 border-dashed border-[#1e5da8] mb-3"
          >
            <div className="text-center">
              <ArrowRight className="w-8 h-8 text-[#1e5da8] mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium text-[#1e5da8]">
                Suelta aquí para mover a {columna.titulo}
              </p>
            </div>
          </motion.div>
        )}
        <AnimatePresence>
          {planes.map((plan) => (
            <TarjetaKanban
              key={plan.id}
              plan={plan}
              onAbrirPlan={onAbrirPlan}
            />
          ))}
        </AnimatePresence>

        {planes.length === 0 && (
          <Card className="p-6 border-dashed border-2 border-gray-200">
            <p className="text-sm text-gray-400 text-center">
              No hay planes en esta etapa
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// TARJETA KANBAN (DRAGGABLE) PREMIUM
// ════════════════════════════════════════════════════════════════════════════

interface TarjetaKanbanProps {
  plan: PlanMejoramiento;
  onAbrirPlan: (plan: PlanMejoramiento) => void;
}

function safePct(n: number | undefined): number {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.min(100, Math.max(0, x));
}

function safeDias(n: number | undefined): number {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function TarjetaKanban({ plan, onAbrirPlan }: TarjetaKanbanProps) {
  const pct = safePct(plan.porcentajeAvance);
  const dias = safeDias(plan.diasRestantes);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PLAN',
    item: { planId: plan.id, plan },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0, scale: isDragging ? 1.02 : 1 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-white rounded-lg shadow-sm border-2 transition-all ${
        isDragging 
          ? 'border-[#1e5da8] shadow-xl cursor-grabbing rotate-2' 
          : 'border-gray-200 hover:shadow-md hover:border-[#1e5da8] cursor-grab'
      }`}
    >
      <div className="p-4">
        {/* Header con Semáforo */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-400" />
            <div 
              className={`w-2.5 h-2.5 rounded-full ${
                plan.semaforo === 'verde' ? 'bg-green-500' :
                plan.semaforo === 'amarillo' ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              title={
                plan.semaforo === 'verde' ? 'En término' :
                plan.semaforo === 'amarillo' ? 'Próximo a vencer' :
                'Vencido'
              }
            />
            <span className="text-xs font-semibold text-[#1e5da8]">{plan.codigo}</span>
          </div>
          {plan.alertas > 0 && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {plan.alertas}
            </span>
          )}
        </div>

        {/* Título */}
        <h4 className="text-sm text-gray-900 mb-3 line-clamp-2 leading-snug">{plan.auditoria}</h4>

        {/* Métricas */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600">Progreso</span>
            <span className="font-semibold text-gray-900">{pct}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                pct === 100 ? 'bg-emerald-500' :
                pct >= 70 ? 'bg-blue-500' :
                pct >= 40 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Info Compacta */}
        <div className="space-y-1.5 mb-3 text-xs text-gray-600">
          <div className="flex items-center gap-1.5 truncate">
            <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{plan.area}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Users className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{plan.responsable}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{plan.totalHallazgos} hallazgos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" />
              <span className={dias < 0 ? 'text-red-600 font-semibold' : ''}>
                {dias < 0 ? `${Math.abs(dias)}d vencido` : `${dias}d`}
              </span>
            </div>
          </div>
        </div>

        {/* Hallazgos por Tipo */}
        <div className="flex gap-1.5 mb-3">
          {plan.hallazgosCriticos > 0 && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
              {plan.hallazgosCriticos} C
            </span>
          )}
          {plan.hallazgosModerados > 0 && (
            <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-medium">
              {plan.hallazgosModerados} M
            </span>
          )}
          {plan.hallazgosLeves > 0 && (
            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
              {plan.hallazgosLeves} L
            </span>
          )}
        </div>

        {/* Botón */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAbrirPlan(plan);
          }}
          className="w-full px-3 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] hover:from-[#1557a0] hover:to-[#1e5da8] text-white rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2"
        >
          <Eye className="w-3.5 h-3.5" />
          {plan.estado === 'FORMULACION' ? 'Formular Acciones' : 'Ver Detalle'}
        </button>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA LISTA (Igual que antes, pero mejoro la visualización)
// ════════════════════════════════════════════════════════════════════════════

interface VistaListaProps {
  planes: PlanMejoramiento[];
  onAbrirPlan: (plan: PlanMejoramiento) => void;
  onCompletarPlan?: (plan: PlanMejoramiento) => void;
}

function VistaLista({ planes, onAbrirPlan, onCompletarPlan }: VistaListaProps) {
  if (planes.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-base text-gray-900 mb-2">No se encontraron planes</h3>
        <p className="text-sm text-gray-600">Intenta ajustar los filtros o la búsqueda</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {planes.map((plan) => {
        const pctLista = safePct(plan.porcentajeAvance);
        const diasLista = safeDias(plan.diasRestantes);
        return (
        <motion.div
          key={plan.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-start gap-6">
              {/* Indicador Estado + Semáforo */}
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className={`w-1 h-24 rounded-full ${
                  plan.estado === 'COMPLETADO' ? 'bg-emerald-500' :
                  plan.estado === 'EN_EJECUCION' ? 'bg-green-500' :
                  plan.estado === 'CON_RETRASO' ? 'bg-orange-500' :
                  plan.estado === 'APROBADO' ? 'bg-blue-500' :
                  plan.estado === 'FORMULACION' ? 'bg-purple-500' :
                  'bg-gray-400'
                }`} />
                
                <div 
                  className={`w-3 h-3 rounded-full ${
                    plan.semaforo === 'verde' ? 'bg-green-500' :
                    plan.semaforo === 'amarillo' ? 'bg-amber-500' :
                    'bg-red-500'
                  }`}
                  title={
                    plan.semaforo === 'verde' ? 'En término' :
                    plan.semaforo === 'amarillo' ? 'Próximo a vencer' :
                    'Vencido'
                  }
                />
              </div>

              {/* Contenido */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base text-gray-900 font-medium">{plan.codigo}</h3>
                      <EstadoBadge estado={plan.estado} />
                      {plan.alertas > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-md text-xs font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {plan.alertas} {plan.alertas === 1 ? 'alerta' : 'alertas'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{plan.auditoria}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5" />
                        {plan.area}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {plan.responsable}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {diasLista < 0 
                          ? <span className="text-red-600 font-semibold">{Math.abs(diasLista)}d vencido</span>
                          : `${diasLista}d restantes`
                        }
                      </span>
                    </div>
                  </div>

                  {/* Progreso Circular */}
                  <div className="flex-shrink-0">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 transform -rotate-90">
                        <circle cx="40" cy="40" r="32" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                        <circle
                          cx="40" cy="40" r="32"
                          stroke={
                            pctLista === 100 ? '#10b981' :
                            pctLista >= 70 ? '#3b82f6' :
                            pctLista >= 40 ? '#f59e0b' : '#ef4444'
                          }
                          strokeWidth="6" fill="none"
                          strokeDasharray={`${2 * Math.PI * 32}`}
                          strokeDashoffset={`${2 * Math.PI * 32 * (1 - pctLista / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-base font-semibold text-gray-900">{pctLista}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">Total Acciones</div>
                    <div className="text-lg font-semibold text-gray-900">{plan.totalAcciones}</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <div className="text-xs text-green-700 mb-1">Completadas</div>
                    <div className="text-lg font-semibold text-green-600">{plan.accionesCompletadas}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-700 mb-1">En Proceso</div>
                    <div className="text-lg font-semibold text-blue-600">{plan.accionesEnProceso}</div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-xs text-orange-700 mb-1">Pendientes</div>
                    <div className="text-lg font-semibold text-orange-600">{plan.accionesPendientes}</div>
                  </div>
                </div>

                {/* Hallazgos */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-xs text-gray-600">Hallazgos:</span>
                  {plan.hallazgosCriticos > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                      {plan.hallazgosCriticos} Críticos
                    </span>
                  )}
                  {plan.hallazgosModerados > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                      {plan.hallazgosModerados} Moderados
                    </span>
                  )}
                  {plan.hallazgosLeves > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                      {plan.hallazgosLeves} Leves
                    </span>
                  )}
                </div>

                {/* Barra Progreso */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                    <span>Progreso de Ejecución</span>
                    <span>{pctLista}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        pctLista === 100 ? 'bg-emerald-500' :
                        pctLista >= 70 ? 'bg-blue-500' :
                        pctLista >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pctLista}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    Actualizado: {plan.ultimaActualizacion}
                  </div>
                  <div className="flex items-center gap-2">
                    {onCompletarPlan && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCompletarPlan(plan);
                        }}
                        disabled={
                          plan.estado === 'COMPLETADO' ||
                          (plan.totalAcciones || 0) < 1 ||
                          (plan.accionesCompletadas || 0) < (plan.totalAcciones || 1)
                        }
                        className="px-4 py-2 rounded-lg transition-all text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed enabled:bg-emerald-600 enabled:hover:bg-emerald-700 enabled:text-white"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Completar plan
                      </button>
                    )}
                    <button
                      onClick={() => onAbrirPlan(plan)}
                      className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all text-sm flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      {plan.estado === 'FORMULACION' ? 'Formular Acciones' : 'Ver Detalle'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  color?: 'purple' | 'blue' | 'green' | 'orange' | 'emerald' | 'gray';
}

function FilterButton({ active, onClick, label, count, color = 'gray' }: FilterButtonProps) {
  const colorClasses = {
    purple: active ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-gray-700 border-gray-300',
    blue: active ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-gray-700 border-gray-300',
    green: active ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-700 border-gray-300',
    orange: active ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-white text-gray-700 border-gray-300',
    emerald: active ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-gray-700 border-gray-300',
    gray: active ? 'bg-gray-100 text-gray-900 border-gray-400' : 'bg-white text-gray-700 border-gray-300'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${colorClasses[color]}`}
    >
      {label} ({count})
    </button>
  );
}

function EstadoBadge({ estado }: { estado: EstadoPlan }) {
  // Mapa unificado: backend (minusculas) + legacy (MAYUSCULAS)
  const configMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
    borrador:     { label: 'Borrador',      bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-300' },
    revision:     { label: 'En Revision',   bg: 'bg-amber-100',   text: 'text-amber-700',   border: 'border-amber-300' },
    aprobado:     { label: 'Aprobado',      bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300' },
    en_ejecucion: { label: 'En Ejecucion',  bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-300' },
    completado:   { label: 'Completado',    bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    rechazado:    { label: 'Rechazado',     bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300' },
    FORMULACION:  { label: 'Formulacion',  bg: 'bg-purple-100',  text: 'text-purple-700',  border: 'border-purple-300' },
    APROBADO:     { label: 'Aprobado',     bg: 'bg-blue-100',    text: 'text-blue-700',    border: 'border-blue-300' },
    EN_EJECUCION: { label: 'En Ejecucion', bg: 'bg-green-100',   text: 'text-green-700',   border: 'border-green-300' },
    CON_RETRASO:  { label: 'Con Retraso',  bg: 'bg-orange-100',  text: 'text-orange-700',  border: 'border-orange-300' },
    COMPLETADO:   { label: 'Completado',   bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    SUSPENDIDO:   { label: 'Suspendido',   bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-300' },
    RECHAZADO:    { label: 'Rechazado',    bg: 'bg-red-100',     text: 'text-red-700',     border: 'border-red-300' },
  };
  const config = configMap[estado] ?? { label: estado, bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };

  const { label, bg, text, border } = config;

  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${bg} ${text} ${border}`}>
      {label}
    </span>
  );
}

function obtenerNombreEstado(estado: EstadoPlan): string {
  const nombres = {
    FORMULACION: 'Formulación',
    APROBADO: 'Aprobado',
    EN_EJECUCION: 'En Ejecución',
    CON_RETRASO: 'Con Retraso',
    COMPLETADO: 'Completado',
    SUSPENDIDO: 'Suspendido'
  };
  return nombres[estado];
}

// ════════════════════════════════════════════════════════════════════════════
// MODAL: CREAR PLAN DESDE AUDITORÍA
// ════════════════════════════════════════════════════════════════════════════

interface ModalCrearPlanDesdeAuditoriaProps {
  auditoria: any;
  auditoriasDisponibles: any[];
  onCrear: (auditoria: any) => void;
  onCerrar: () => void;
}

function ModalCrearPlanDesdeAuditoria({ 
  auditoria, 
  auditoriasDisponibles, 
  onCrear, 
  onCerrar 
}: ModalCrearPlanDesdeAuditoriaProps) {
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState(auditoria);

  return (
    <ModalSIGL isOpen={true} onClose={onCerrar} title="Crear Plan de Mejoramiento" size="large">
      <div className="p-6">
        {/* Intro */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm text-blue-900 font-medium mb-1">
                Creación de Plan desde Auditoría
              </h4>
              <p className="text-sm text-blue-700">
                Selecciona una auditoría finalizada con hallazgos para crear automáticamente 
                un plan de mejoramiento. Los hallazgos identificados se convertirán en acciones 
                correctivas que deberán ser formuladas.
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Auditorías Disponibles */}
        {!auditoria && auditoriasDisponibles.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-base text-gray-900 mb-2">No hay auditorías disponibles</h3>
            <p className="text-sm text-gray-600">
              No hay auditorías finalizadas con hallazgos pendientes de plan de mejoramiento.
            </p>
          </div>
        ) : (
          <>
            {!auditoria && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seleccionar Auditoría
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {auditoriasDisponibles.map((aud) => (
                    <button
                      key={aud.id}
                      onClick={() => setAuditoriaSeleccionada(aud)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                        auditoriaSeleccionada?.id === aud.id
                          ? 'border-[#1e5da8] bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-[#1e5da8]">{aud.codigo}</span>
                            <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                              {Array.isArray(aud.hallazgos) ? aud.hallazgos.length : (aud.hallazgos || 0)} hallazgos
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 mb-1">{aud.nombre}</p>
                          <p className="text-xs text-gray-600">{aud.areaResponsable}</p>
                        </div>
                        {auditoriaSeleccionada?.id === aud.id && (
                          <CheckCircle2 className="w-5 h-5 text-[#1e5da8]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Resumen de Auditoría Seleccionada */}
            {auditoriaSeleccionada && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">
                  Resumen de la Auditoría Seleccionada
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Código</div>
                    <div className="text-sm text-gray-900 font-medium">{auditoriaSeleccionada.codigo}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Área Responsable</div>
                    <div className="text-sm text-gray-900">{auditoriaSeleccionada.areaResponsable}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Responsable</div>
                    <div className="text-sm text-gray-900">{auditoriaSeleccionada.responsable}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 mb-1">Total Hallazgos</div>
                    <div className="text-sm text-gray-900 font-medium">{Array.isArray(auditoriaSeleccionada.hallazgos) ? auditoriaSeleccionada.hallazgos.length : (auditoriaSeleccionada.hallazgos || 0)}</div>
                  </div>
                </div>

                {/* Distribución de Hallazgos - Solo si es array */}
                {Array.isArray(auditoriaSeleccionada.hallazgos) && (
                <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                  <span className="text-xs text-gray-600">Gravedad:</span>
                  {auditoriaSeleccionada.hallazgos.filter((h: any) => h.gravedad === 'GRAVE').length > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                      {auditoriaSeleccionada.hallazgos.filter((h: any) => h.gravedad === 'GRAVE').length} Graves
                    </span>
                  )}
                  {auditoriaSeleccionada.hallazgos.filter((h: any) => h.gravedad === 'MODERADO').length > 0 && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                      {auditoriaSeleccionada.hallazgos.filter((h: any) => h.gravedad === 'MODERADO').length} Moderados
                    </span>
                  )}
                  {auditoriaSeleccionada.hallazgos.filter((h: any) => h.gravedad === 'LEVE').length > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">
                      {auditoriaSeleccionada.hallazgos.filter((h: any) => h.gravedad === 'LEVE').length} Leves
                    </span>
                  )}
                </div>
                )}
              </div>
            )}

            {/* Información del Plan a Crear */}
            {auditoriaSeleccionada && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm text-purple-900 font-medium mb-1">
                      ¿Qué sucederá después?
                    </h4>
                    <ul className="text-sm text-purple-700 space-y-1 list-disc list-inside">
                      <li>Se creará un plan de mejoramiento en estado Formulación</li>
                      <li>Los {Array.isArray(auditoriaSeleccionada.hallazgos) ? auditoriaSeleccionada.hallazgos.length : (auditoriaSeleccionada.hallazgos || 0)} hallazgos quedarán vinculados al plan</li>
                      <li>Deberás formular acciones correctivas para cada hallazgo</li>
                      <li>El plazo para formular es de 30 días desde la finalización de la auditoría</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={onCerrar}
            className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (auditoriaSeleccionada) {
                // Ejecutar la creación del plan - el toast se muestra en handleCrearPlanDesdeAuditoria
                onCrear(auditoriaSeleccionada);
                
                // Cerrar el modal
                onCerrar();
              }
            }}
            disabled={!auditoriaSeleccionada}
            className="px-6 py-2.5 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Crear Plan de Mejoramiento
          </button>
        </div>
      </div>
    </ModalSIGL>
  );
}
