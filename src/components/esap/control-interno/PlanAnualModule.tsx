/**
 * ============================================
 * MÓDULO: PLAN ANUAL - DECRETO 648/2017
 * ============================================
 * 
 * RF001 - Crear Plan Anual con 5 Roles Obligatorios
 * 
 * ENFOQUE WORLD-CLASS:
 * - Usabilidad excepcional (flujo paso a paso)
 * - Diseño limpio y minimalista
 * - Sencillez en cada interacción
 * - Validaciones inteligentes en tiempo real
 * - Feedback visual inmediato
 * - Micro-animaciones elegantes
 * 
 * DECRETO 648/2017:
 * 1. Liderazgo Estratégico
 * 2. Enfoque Prevención
 * 3. Relación Entes Control
 * 4. Evaluación Gestión Riesgos
 * 5. Evaluación y Seguimiento
 * 
 * ÚLTIMA ACTUALIZACIÓN: 20 Diciembre 2025
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, CheckCircle, AlertCircle, ChevronRight, ChevronLeft,
  Plus, Trash2, User, Clock, Target, Shield, Eye, Edit, Save,
  Download, Send, X, Check, Info, HelpCircle, FileText, Users, FileSpreadsheet,
  BarChart3, Activity
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner';
import { planAnual5RolesApi } from './services/api';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';
import headerImg from '../../../assets/graduation-certificates/img_primera.png';
import footerImg from '../../../assets/graduation-certificates/img_segunda.png';

// Notificaciones
import { useCrearNotificacion } from './hooks/useCrearNotificacion';
import { useAuth } from '../../../hooks/useAuth';

// Declaración de tipos para jspdf-autotable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable?: {
      finalY: number;
    };
  }
}
import { useEffect } from 'react';

// ✅ DÍA 4: Container4K para padding adaptativo
import { Container4K } from '@/components/ui';

// ✅ NUEVO: Importar validaciones Decreto 648/2017
import {
  validarDecreto648,
  validarAntesDeAprobar,
  validacionRapida,
  generarMensajeToast,
  obtenerEstadisticasPlan,
  type ResultadoValidacion
} from './utils/validacionesDecreto648';

// ✅ NUEVO: Importar badge de cumplimiento Decreto 648
import { BadgeDecreto648Completo, BadgeDecreto648Simple } from './components/BadgeDecreto648';

// ✅ NUEVO: Importar servicio de generación de PDF
import { generarPDFPlanAnual, validarDatosParaPDF } from './services/pdfPlanAnual';

// ✅ NUEVO: Importar helper de configuración
import { cargarConfiguracionPDF } from './utils/configuracionHelper';

// ============ TIPOS ============

interface Actividad {
  id: string;
  nombre: string;
  descripcion: string;
  responsableId: string;
  responsableNombre: string;
  fechaInicio: string;
  fechaFin: string;
  porcentaje: number;
  estado: 'Pendiente' | 'En Ejecución' | 'Completada' | 'Retrasada';
}

interface RolDecreto {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  actividades: Actividad[];
  obligatorio: boolean;
}

interface PlanAnual {
  id: string;
  año: number;
  estado: 'Borrador' | 'En Revisión' | 'Aprobado' | 'Vigente' | 'Cerrado';
  jefeOCI: {
    id: string;
    nombre: string;
    cargo: string;
  };
  roles: RolDecreto[];
  fechaCreacion: string;
  fechaAprobacion?: string;
  version: number;
}

interface Usuario {
  id: string;
  nombre: string;
  cargo: string;
  iniciales: string;
}

// ============ DATOS DECRETO 648/2017 ============

const ROLES_DECRETO_648: Omit<RolDecreto, 'actividades'>[] = [
  {
    id: 1,
    nombre: 'Liderazgo Estratégico',
    descripcion: 'Dirección y coordinación del sistema de control interno. Incluye la participación del Jefe OCI en comités y órganos de dirección.',
    icono: '👔',
    color: '#003DA5',
    obligatorio: true
  },
  {
    id: 2,
    nombre: 'Enfoque Prevención',
    descripcion: 'Diseño e implementación de controles preventivos. Identificación anticipada de riesgos y mejora continua de procesos.',
    icono: '🛡️',
    color: '#10B981',
    obligatorio: true
  },
  {
    id: 3,
    nombre: 'Relación Entes Control',
    descripcion: 'Coordinación con entes de control externos (CGR, Contraloría). Cumplimiento de requerimientos y colaboración institucional.',
    icono: '🤝',
    color: '#F59E0B',
    obligatorio: true
  },
  {
    id: 4,
    nombre: 'Evaluación Gestión Riesgos',
    descripcion: 'Evaluación del sistema de gestión de riesgos institucional. Análisis de mapas de riesgo y controles asociados.',
    icono: '⚠️',
    color: '#EF4444',
    obligatorio: true
  },
  {
    id: 5,
    nombre: 'Evaluación y Seguimiento',
    descripcion: 'Monitoreo de la efectividad del sistema de control interno. Seguimiento a planes de mejoramiento y hallazgos.',
    icono: '📊',
    color: '#8B5CF6',
    obligatorio: true
  }
];

// ============ USUARIOS MOCK ============

const USUARIOS_MOCK: Usuario[] = [
  { id: 'usr-001', nombre: 'Fernando Ávila García', cargo: 'Jefe OCI', iniciales: 'FA' },
  { id: 'usr-002', nombre: 'Catalina Rubio Silva', cargo: 'Auditor Líder', iniciales: 'CR' },
  { id: 'usr-003', nombre: 'Lucila Villamil Torres', cargo: 'Auditor Líder', iniciales: 'LV' },
  { id: 'usr-004', nombre: 'William Alonso Pérez', cargo: 'Auditor', iniciales: 'WA' },
  { id: 'usr-005', nombre: 'Alexandra Gómez López', cargo: 'Auditor', iniciales: 'AG' },
  { id: 'usr-006', nombre: 'Natalia Cañón Mora', cargo: 'Auditor', iniciales: 'NC' }
];

// ============ DATOS MOCK - PLANES DE EJEMPLO ============

const PLANES_MOCK: PlanAnual[] = [
  {
    id: 'plan-2025',
    año: 2025,
    estado: 'Vigente',
    jefeOCI: {
      id: 'usr-001',
      nombre: 'Fernando Ávila García',
      cargo: 'Jefe OCI'
    },
    roles: ROLES_DECRETO_648.map((rol, idx) => ({
      ...rol,
      actividades: [
        {
          id: `act-2025-${idx}-1`,
          nombre: idx === 0 ? 'Participación en Comité Institucional de Coordinación de Control Interno' :
                 idx === 1 ? 'Diseño de matriz de riesgos de corrupción actualizada' :
                 idx === 2 ? 'Atención de requerimientos de Contraloría General' :
                 idx === 3 ? 'Auditoría al Mapa de Riesgos Institucional' :
                 'Seguimiento a Planes de Mejoramiento institucionales',
          descripcion: 'Actividad principal del rol',
          responsableId: 'usr-001',
          responsableNombre: 'Fernando Ávila García',
          fechaInicio: '2025-01-15',
          fechaFin: '2025-12-15',
          porcentaje: 65,
          estado: 'En Ejecución'
        }
      ]
    })),
    fechaCreacion: '2024-11-15',
    fechaAprobacion: '2024-12-10',
    version: 2
  },
  {
    id: 'plan-2024',
    año: 2024,
    estado: 'Cerrado',
    jefeOCI: {
      id: 'usr-001',
      nombre: 'Fernando Ávila García',
      cargo: 'Jefe OCI'
    },
    roles: ROLES_DECRETO_648.map((rol, idx) => ({
      ...rol,
      actividades: [
        {
          id: `act-2024-${idx}-1`,
          nombre: `Actividad ${rol.nombre} - 2024`,
          descripcion: 'Actividad completada',
          responsableId: 'usr-001',
          responsableNombre: 'Fernando Ávila García',
          fechaInicio: '2024-01-15',
          fechaFin: '2024-12-15',
          porcentaje: 100,
          estado: 'Completada'
        }
      ]
    })),
    fechaCreacion: '2023-11-20',
    fechaAprobacion: '2023-12-15',
    version: 1
  },
  {
    id: 'plan-2026',
    año: 2026,
    estado: 'En Revisión',
    jefeOCI: {
      id: 'usr-001',
      nombre: 'Fernando Ávila García',
      cargo: 'Jefe OCI'
    },
    roles: ROLES_DECRETO_648.map((rol, idx) => ({
      ...rol,
      actividades: [
        {
          id: `act-2026-${idx}-1`,
          nombre: `Actividad ${rol.nombre} - 2026`,
          descripcion: 'Actividad en revisión',
          responsableId: 'usr-002',
          responsableNombre: 'Catalina Rubio Silva',
          fechaInicio: '2026-01-15',
          fechaFin: '2026-12-15',
          porcentaje: 0,
          estado: 'Pendiente'
        }
      ]
    })),
    fechaCreacion: '2025-11-01',
    version: 1
  }
];

// ============ COMPONENTE PRINCIPAL ============

interface PlanAnualModuleProps {
  onPlanChange?: () => void; // Callback para notificar cambios en los planes
  filtros?: {
    año: number;
    estado: string;
    area: string;
    busqueda: string;
  };
}

export function PlanAnualModule({ onPlanChange, filtros }: PlanAnualModuleProps = {} as PlanAnualModuleProps) {
  // Hooks para notificaciones
  const { notificarPlanAnualCreado } = useCrearNotificacion();
  const { user } = useAuth();

  const [vistaActiva, setVistaActiva] = useState<'lista' | 'crear' | 'detalle' | 'editar'>('lista');
  const [planes, setPlanes] = useState<PlanAnual[]>([]);
  const [loading, setLoading] = useState(true);
  const [planActual, setPlanActual] = useState<PlanAnual | null>(null);
  const [mostrarModalAprobacion, setMostrarModalAprobacion] = useState(false);

  // Filtrar planes según filtros externos
  const planesFiltrados = useMemo(() => {
    return planes.filter(plan => {
      // Filtrar por año
      const matchAño = !filtros?.año || plan.año === filtros.año;
      
      // Filtrar por estado
      let matchEstado = true;
      if (filtros?.estado && filtros.estado !== 'TODOS') {
        // Mapear estados del filtro padre a estados del plan
        if (filtros.estado === 'BORRADOR') {
          matchEstado = plan.estado === 'Borrador';
        } else if (filtros.estado === 'EN_REVISION') {
          matchEstado = plan.estado === 'En Revisión';
        } else if (filtros.estado === 'APROBADO') {
          matchEstado = plan.estado === 'Aprobado';
        } else if (filtros.estado === 'PUBLICADO') {
          matchEstado = plan.estado === 'Vigente' || plan.estado === 'Cerrado';
        }
      }
      
      // Filtrar por búsqueda
      let matchBusqueda = true;
      if (filtros?.busqueda) {
        const busquedaLower = filtros.busqueda.toLowerCase();
        matchBusqueda = plan.año.toString().includes(busquedaLower) ||
                       plan.jefeOCI.nombre.toLowerCase().includes(busquedaLower) ||
                       plan.estado.toLowerCase().includes(busquedaLower);
      }
      
      return matchAño && matchEstado && matchBusqueda;
    });
  }, [planes, filtros]);

  // Función para mapear PlanAnual5Roles (backend) a PlanAnual (frontend)
  const mapearPlanAnualDesdeBD = (planBD: any): PlanAnual => {
    // Mapear estado del backend al frontend
    const mapearEstadoBD = (estadoBD: string): PlanAnual['estado'] => {
      if (estadoBD === 'aprobado') return 'Aprobado';
      if (estadoBD === 'en-revision') return 'En Revisión';
      if (estadoBD === 'en-ejecucion') return 'Vigente';
      if (estadoBD === 'completado') return 'Cerrado';
      return 'Borrador';
    };

    // Mapear actividades del backend al frontend
    const mapearActividades = (actividadesBD: any[]): Actividad[] => {
      return actividadesBD.map(act => {
        // Las fechas pueden venir como Date o string, convertir a formato YYYY-MM-DD
        const formatearFecha = (fecha: any): string => {
          if (!fecha) return '';
          if (typeof fecha === 'string') {
            // Si ya es string, puede venir como 'YYYY-MM-DD' o 'YYYY-MM-DDTHH:mm:ss'
            return fecha.split('T')[0];
          }
          if (fecha instanceof Date) {
            return fecha.toISOString().split('T')[0];
          }
          return '';
        };

        // Buscar el responsable en USUARIOS_MOCK por nombre si no hay responsableId
        const responsableNombre = act.responsable || '';
        let responsableId = act.responsableId || '';
        
        // Si no hay responsableId pero sí hay nombre, buscar en USUARIOS_MOCK
        if (!responsableId && responsableNombre) {
          const usuarioEncontrado = USUARIOS_MOCK.find(u => 
            u.nombre.toLowerCase() === responsableNombre.toLowerCase()
          );
          if (usuarioEncontrado) {
            responsableId = usuarioEncontrado.id;
          }
        }

        return {
          id: act.id,
          nombre: act.nombre || '',
          descripcion: act.descripcion || '',
          responsableId: responsableId,
          responsableNombre: responsableNombre,
          fechaInicio: formatearFecha(act.fecha_inicio || act.fechaInicio),
          fechaFin: formatearFecha(act.fecha_fin || act.fechaFin),
          porcentaje: act.porcentaje_avance || act.porcentajeAvance || 0,
          estado: mapearEstadoActividadBD(act.estado || 'pendiente')
        };
      });
    };

    // Mapear roles del backend al frontend
    // Los roles vienen ordenados por rol_numero desde la BD
    const rolesMapeados = planBD.roles?.map((rolBD: any, index: number) => {
      // Buscar el template por rol_numero (1-5) que coincide con el id del template
      const rolTemplate = ROLES_DECRETO_648.find(r => r.id === rolBD.rol_numero) || ROLES_DECRETO_648[index] || ROLES_DECRETO_648[0];
      return {
        ...rolTemplate,
        id: rolTemplate.id, // Mantener el id del template (1-5) para que coincida con la búsqueda
        actividades: mapearActividades(rolBD.actividades || [])
      };
    }) || ROLES_DECRETO_648.map(r => ({ ...r, actividades: [] }));

    return {
      id: planBD.id,
      año: planBD.año || planBD.añoFiscal,
      estado: mapearEstadoBD(planBD.estado || 'borrador'),
      jefeOCI: {
        id: planBD.responsableId || '',
        nombre: planBD.responsable || '',
        cargo: 'Jefe OCI'
      },
      roles: rolesMapeados,
      fechaCreacion: planBD.fechaCreacion || planBD.fecha_creacion || new Date().toLocaleDateString(),
      fechaAprobacion: planBD.estado === 'aprobado' ? planBD.fechaActualizacion : undefined,
      version: 1
    };
  };

  const mapearEstadoActividadBD = (estadoBD: string): Actividad['estado'] => {
    if (estadoBD === 'completada') return 'Completada';
    if (estadoBD === 'en-progreso') return 'En Ejecución';
    if (estadoBD === 'retrasada') return 'Retrasada';
    return 'Pendiente';
  };

  // Cargar planes desde la BD
  useEffect(() => {
    const cargarPlanes = async () => {
      try {
        setLoading(true);
        const añoActual = new Date().getFullYear();
        
        // Primero intentar cargar todos los planes
        const allResponse = await planAnual5RolesApi.findAll();
        
        if (allResponse.success && allResponse.data && allResponse.data.length > 0) {
          const planesMapeados = allResponse.data.map(mapearPlanAnualDesdeBD);
          setPlanes(planesMapeados);
        } else {
          // Si no hay planes, intentar buscar por año actual
          const response = await planAnual5RolesApi.getByYear(añoActual);
          
          if (response.success && response.data) {
            const planMapeado = mapearPlanAnualDesdeBD(response.data);
            setPlanes([planMapeado]);
          } else {
            setPlanes([]);
            toast.info('No hay planes anuales en la base de datos', {
              description: 'Puedes crear un nuevo plan desde el botón "Crear Plan Anual"'
            });
          }
        }
      } catch (error) {
        toast.error('Error al cargar planes anuales', {
          description: error instanceof Error ? error.message : 'No se pudieron obtener los datos desde el servidor'
        });
        setPlanes([]);
      } finally {
        setLoading(false);
      }
    };

    cargarPlanes();
  }, []);

  const handleCrearNuevo = () => {
    setVistaActiva('crear');
    setPlanActual(null);
  };

  const handleVerDetalle = (plan: PlanAnual) => {
    setPlanActual(plan);
    setVistaActiva('detalle');
  };

  const handleEditar = (plan: PlanAnual) => {
    setPlanActual(plan);
    setVistaActiva('editar');
  };

  const handleVolver = () => {
    setVistaActiva('lista');
    setPlanActual(null);
  };

  const handleGuardarPlan = async (plan: PlanAnual) => {
    try {
      // Mapear estado del frontend al backend
      const mapearEstado = (estado: PlanAnual['estado']): 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado' => {
        if (estado === 'Borrador') return 'borrador';
        if (estado === 'En Revisión') return 'en-revision';
        if (estado === 'Aprobado') return 'aprobado';
        if (estado === 'Vigente') return 'en-ejecucion';
        if (estado === 'Cerrado') return 'completado';
        return 'borrador';
      };

      // Mapear PlanAnual (frontend) a formato del backend
      const planData = {
        año: plan.año,
        responsable: plan.jefeOCI.nombre,
        estado: mapearEstado(plan.estado)
      };

      // Determinar si es creación o actualización
      // Si el plan tiene un ID que NO empieza con 'plan-' (es UUID de BD), es actualización
      // Si NO tiene ID o tiene ID temporal que empieza con 'plan-', es creación
      const esPlanNuevo = !plan.id || (plan.id && plan.id.startsWith('plan-'));
      
      let response;
      let fueCreado = false;
      
      if (esPlanNuevo) {
        // Es un plan nuevo, crear
        console.log('[PlanAnual] Creando nuevo plan anual para el año:', plan.año);
        response = await planAnual5RolesApi.create(planData);
        fueCreado = true;
      } else {
        // Es un plan existente, actualizar
        console.log('[PlanAnual] Actualizando plan anual existente:', plan.id);
        response = await planAnual5RolesApi.update(plan.id, planData);
        fueCreado = false;
      }

      if (response.success && response.data) {
        // Guardar actividades para cada rol
        // Buscar roles por nombre en lugar de por índice para evitar problemas de orden
        for (const rol of plan.roles) {
          // Buscar el rol correspondiente en la BD por rol_numero o nombre
          const rolBD = response.data.roles?.find((r: any) => 
            r.rol_numero === rol.id || 
            r.nombre === rol.nombre ||
            r.id === rol.id
          );
          
          if (!rolBD) {
            console.warn(`[PlanAnual] No se encontró rol BD para: ${rol.nombre} (id: ${rol.id})`);
            continue;
          }

          if (rol.actividades.length > 0) {
            console.log(`[PlanAnual] Guardando ${rol.actividades.length} actividades para rol: ${rol.nombre} (BD ID: ${rolBD.id})`);
            
            for (const actividad of rol.actividades) {
              try {
                // Validar que la actividad tenga los campos mínimos
                if (!actividad.nombre || !actividad.responsableNombre || !actividad.fechaInicio || !actividad.fechaFin) {
                  console.warn('[PlanAnual] Actividad incompleta, omitiendo:', actividad);
                  continue;
                }

                // Mapear estado del frontend al backend
                const estadoBD = actividad.estado === 'Pendiente' ? 'pendiente' : 
                                actividad.estado === 'En Ejecución' ? 'en-progreso' :
                                actividad.estado === 'Completada' ? 'completada' : 'retrasada';
                
                // 🔍 LOG: Ver configuración de evidencias de la actividad
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🎯 [handleGuardarPlan] Actividad:', actividad.nombre);
                console.log('   - configuracionEvidencias (original):', JSON.stringify(actividad.configuracionEvidencias, null, 2));
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                const actividadData = {
                  nombre: actividad.nombre.trim(),
                  descripcion: (actividad.descripcion || '').trim(),
                  responsable: actividad.responsableNombre.trim(),
                  fecha_inicio: actividad.fechaInicio,
                  fecha_fin: actividad.fechaFin,
                  estado: estadoBD,
                  porcentaje_avance: actividad.porcentaje || 0,
                  prioridad: 'Media' as const,
                  // ✅ AGREGADO: Incluir configuración de evidencias
                  configuracionEvidencias: actividad.configuracionEvidencias || undefined
                };

                if (!actividad.id || actividad.id.startsWith('act-')) {
                  // Nueva actividad - usar rolBD.id como parámetro en la URL
                  console.log('[PlanAnual] Creando nueva actividad:', actividadData);
                  const actividadResponse = await planAnual5RolesApi.addActividad(rolBD.id, actividadData as any);
                  if (!actividadResponse.success) {
                    console.error('[PlanAnual] Error al crear actividad:', actividadResponse.error);
                    throw new Error(`Error al crear actividad: ${actividadResponse.error}`);
                  }
                  console.log('[PlanAnual] Actividad creada exitosamente');
                } else {
                  // Actualizar actividad existente
                  console.log('[PlanAnual] Actualizando actividad existente:', actividad.id, actividadData);
                  const actividadResponse = await planAnual5RolesApi.updateActividad(actividad.id, actividadData as any);
                  if (!actividadResponse.success) {
                    console.error('[PlanAnual] Error al actualizar actividad:', actividadResponse.error);
                    throw new Error(`Error al actualizar actividad: ${actividadResponse.error}`);
                  }
                  console.log('[PlanAnual] Actividad actualizada exitosamente');
                }
              } catch (error: any) {
                console.error('[PlanAnual] Error al guardar actividad:', error);
                throw new Error(`Error al guardar actividad "${actividad.nombre}": ${error.message}`);
              }
            }
          } else {
            console.log(`[PlanAnual] Rol ${rol.nombre} no tiene actividades para guardar`);
          }
        }

        // Recargar planes
        const reloadResponse = await planAnual5RolesApi.findAll();
        if (reloadResponse.success && reloadResponse.data) {
          const planesMapeados = reloadResponse.data.map(mapearPlanAnualDesdeBD);
          setPlanes(planesMapeados);
        }

        // ============ NOTIFICACIONES: Plan Anual Creado ============
        // Solo notificar si fue creado (no actualizado) y la respuesta fue exitosa
        if (fueCreado && response.success && response.data?.id && user?.id) {
          try {
            await notificarPlanAnualCreado(
              response.data.id,
              plan.año,
              user.id
            );
          } catch (notifError) {
            // No fallar la creación si las notificaciones fallan
            console.error('Error al enviar notificaciones:', notifError);
          }
        }

        toast.success('Plan Anual guardado exitosamente', {
          description: `Plan ${plan.año} guardado correctamente`
        });
        
        // Notificar al componente padre para actualizar estadísticas
        if (onPlanChange) {
          onPlanChange();
        }
        
        setVistaActiva('lista');
      } else {
        throw new Error(response.error || 'Error al guardar el plan');
      }
    } catch (error: any) {
      toast.error('Error al guardar plan', {
        description: error.message || 'No se pudo guardar el plan en el servidor'
      });
    }
  };

  const handleActualizarPlan = async (planActualizado: PlanAnual) => {
    try {
      // Mapear estado del frontend al backend
      const mapearEstado = (estado: PlanAnual['estado']): 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado' => {
        if (estado === 'Borrador') return 'borrador';
        if (estado === 'En Revisión') return 'en-revision';
        if (estado === 'Aprobado') return 'aprobado';
        if (estado === 'Vigente') return 'en-ejecucion';
        if (estado === 'Cerrado') return 'completado';
        return 'borrador'; // Por defecto
      };

      const planData = {
        año: planActualizado.año,
        responsable: planActualizado.jefeOCI.nombre,
        estado: mapearEstado(planActualizado.estado)
      };

      const response = await planAnual5RolesApi.update(planActualizado.id, planData);

      if (response.success && response.data) {
        // Guardar actividades para cada rol (igual que en handleGuardarPlan)
        for (const rol of planActualizado.roles) {
          // Buscar el rol correspondiente en la BD por rol_numero o nombre
          const rolBD = response.data.roles?.find((r: any) => 
            r.rol_numero === rol.id || 
            r.nombre === rol.nombre ||
            r.id === rol.id
          );
          
          if (!rolBD) {
            continue;
          }

          if (rol.actividades.length > 0) {
            
            for (const actividad of rol.actividades) {
              try {
                // Validar que la actividad tenga los campos mínimos
                if (!actividad.nombre || !actividad.responsableNombre || !actividad.fechaInicio || !actividad.fechaFin) {
                  continue;
                }

                // Mapear estado del frontend al backend
                const estadoBD = actividad.estado === 'Pendiente' ? 'pendiente' : 
                                actividad.estado === 'En Ejecución' ? 'en-progreso' :
                                actividad.estado === 'Completada' ? 'completada' : 'retrasada';
                
                const actividadData = {
                  nombre: actividad.nombre.trim(),
                  descripcion: (actividad.descripcion || '').trim(),
                  responsable: actividad.responsableNombre.trim(),
                  fecha_inicio: actividad.fechaInicio,
                  fecha_fin: actividad.fechaFin,
                  estado: estadoBD,
                  porcentaje_avance: actividad.porcentaje || 0,
                  prioridad: 'Media' as const,
                  // ✅ AGREGADO: Incluir configuración de evidencias
                  configuracionEvidencias: actividad.configuracionEvidencias || undefined
                };

                if (!actividad.id || actividad.id.startsWith('act-')) {
                  // Nueva actividad - usar rolBD.id como parámetro en la URL
                  const actividadResponse = await planAnual5RolesApi.addActividad(rolBD.id, actividadData as any);
                  if (!actividadResponse.success) {
                    throw new Error(`Error al crear actividad: ${actividadResponse.error}`);
                  }
                } else {
                  // Actualizar actividad existente
                  const actividadResponse = await planAnual5RolesApi.updateActividad(actividad.id, actividadData as any);
                  if (!actividadResponse.success) {
                    throw new Error(`Error al actualizar actividad: ${actividadResponse.error}`);
                  }
                }
              } catch (error: any) {
                throw new Error(`Error al guardar actividad "${actividad.nombre}": ${error.message}`);
              }
            }
          }
        }

        // Recargar planes
        const reloadResponse = await planAnual5RolesApi.findAll();
        if (reloadResponse.success && reloadResponse.data) {
          const planesMapeados = reloadResponse.data.map(mapearPlanAnualDesdeBD);
          setPlanes(planesMapeados);
          const planActualizadoBD = planesMapeados.find(p => p.id === planActualizado.id);
          if (planActualizadoBD) {
            setPlanActual(planActualizadoBD);
          }
        }

        toast.success('Plan Anual actualizado', {
          description: `Los cambios se han guardado correctamente`
        });
        
        // Notificar al componente padre para actualizar estadísticas
        if (onPlanChange) {
          onPlanChange();
        }
        
        setVistaActiva('detalle');
      } else {
        throw new Error(response.error || 'Error al actualizar el plan');
      }
    } catch (error: any) {
      toast.error('Error al actualizar plan', {
        description: error.message || 'No se pudo actualizar el plan en el servidor'
      });
    }
  };

  const handleAprobar = (plan: PlanAnual) => {
    // ✅ NUEVO: Validar antes de mostrar modal de aprobación
    const validacion = validarAntesDeAprobar(plan);
    
    if (!validacion.valido) {
      // Mostrar errores en toast
      const mensaje = generarMensajeToast(validacion);
      
      toast.error(mensaje.titulo, {
        description: mensaje.descripcion,
        duration: 8000,
      });
      
      // Mostrar detalles en consola para debugging
      console.error('❌ Validación Decreto 648/2017 falló:', validacion);
      
      // Mostrar errores específicos
      if (validacion.errores.length > 0) {
        setTimeout(() => {
          validacion.errores.forEach((error, idx) => {
            setTimeout(() => {
              toast.error(`Error ${idx + 1}`, {
                description: error,
                duration: 6000
              });
            }, idx * 500);
          });
        }, 1000);
      }
      
      return; // Bloquear aprobación
    }
    
    // Si pasa validación, mostrar modal
    setPlanActual(plan);
    setMostrarModalAprobacion(true);
  };

  const handleConfirmarAprobacion = async () => {
    if (!planActual) return;

    try {
      const response = await planAnual5RolesApi.update(planActual.id, {
        estado: 'aprobado'
      } as any);

      if (response.success) {
        // Recargar planes
        const reloadResponse = await planAnual5RolesApi.findAll();
        if (reloadResponse.success && reloadResponse.data) {
          const planesMapeados = reloadResponse.data.map(mapearPlanAnualDesdeBD);
          setPlanes(planesMapeados);
          const planAprobadoBD = planesMapeados.find(p => p.id === planActual.id);
          if (planAprobadoBD) {
            setPlanActual(planAprobadoBD);
          }
        }

        setMostrarModalAprobacion(false);
        toast.success('Plan Anual Aprobado', {
          description: `El Plan ${planActual.año} ha sido aprobado exitosamente`
        });
        
        // Notificar al componente padre para actualizar estadísticas
        if (onPlanChange) {
          onPlanChange();
        }
      } else {
        throw new Error(response.error || 'Error al aprobar el plan');
      }
    } catch (error: any) {
      console.error('Error al aprobar plan:', error);
      toast.error('Error al aprobar plan', {
        description: error.message || 'No se pudo aprobar el plan en el servidor'
      });
    }
  };

  const handleExportarPDF = async (plan: PlanAnual) => {
    try {
      toast.info('Generando PDF...', {
        description: 'El documento se descargará en unos segundos'
      });
    
      // Importar jspdf-autotable dinámicamente
      const autoTableModule = await import('jspdf-autotable');
      const autoTable = (autoTableModule as any).default || autoTableModule;

      // Crear instancia de jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configuración de colores
      const colorAzul: [number, number, number] = [0, 61, 165]; // #003DA5
      const colorGris: [number, number, number] = [128, 128, 128];
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;

      // ============ HEADER INSTITUCIONAL ESAP ============
      // Logo ESAP (texto simulado)
      doc.setFillColor(...colorAzul);
      doc.rect(margin, 8, 45, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ESAP', margin + 22.5, 18, { align: 'center' });
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text('Escuela Superior de', margin + 22.5, 23, { align: 'center' });
      doc.text('Administración Pública', margin + 22.5, 27, { align: 'center' });
      
      // Título principal (centrado)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('PLAN DE AUDITORÍAS INTERNAS', 115, 14, { align: 'center' });
      doc.text('SISTEMA DE GESTIÓN DE LA CALIDAD', 115, 20, { align: 'center' });

      // Metadata (Código, Versión, Fecha) - lado derecho
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('Código: EM-FO-014', 165, 12);
      doc.text('Versión: 1', 165, 16);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CO')}`, 165, 20);

      let yPos = 35; // Más espacio después del header

      // ============ SECCIÓN: PROCESO ============
      yPos += 5; // Espacio antes de la sección
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colorAzul);
      doc.text('PROCESO: EVALUACION, CONTROL Y MEJORA', 10, yPos);
      yPos += 8; // Espacio después del título

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Campos del proceso
      doc.setFont('helvetica', 'bold');
      doc.text('FECHA DEL PLAN:', 10, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleDateString('es-CO'), 50, yPos);
      yPos += 10; // Espacio entre líneas

      doc.setFont('helvetica', 'bold');
      const procesoLabel = 'PROCESO/DEPENDENCIA A AUDITAR:';
      doc.text(procesoLabel, 10, yPos);
      doc.setFont('helvetica', 'normal');
      // Calcular posición X para el valor: después del label + espacio
      const procesoLabelWidth = doc.getTextWidth(procesoLabel);
      doc.text('Control Interno - Plan Anual', 10 + procesoLabelWidth + 5, yPos);
      yPos += 10; // Espacio vertical normal

      doc.setFont('helvetica', 'bold');
      const responsableLabel = 'RESPONSABLE PROCESO/DEPENDENCIA A AUDITAR:';
      doc.text(responsableLabel, 10, yPos);
      doc.setFont('helvetica', 'normal');
      // Calcular posición X para el valor: después del label + espacio
      const responsableLabelWidth = doc.getTextWidth(responsableLabel);
      doc.text(plan.jefeOCI.nombre, 10 + responsableLabelWidth + 5, yPos);
      yPos += 10; // Espacio después

      doc.setFont('helvetica', 'bold');
      doc.text('AUDITOR LIDER:', 10, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(plan.jefeOCI.nombre, 50, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'bold');
      doc.text('EQUIPO AUDITOR:', 10, yPos);
      doc.setFont('helvetica', 'normal');
      const equipoAuditores = plan.roles
        .flatMap(rol => rol.actividades.map(act => {
          const actAny = act as any;
          return actAny.responsable?.nombre || actAny.responsable || actAny.responsableNombre || '';
        }))
        .filter((nombre, index, arr) => nombre && arr.indexOf(nombre) === index)
        .join(', ') || 'Por definir';
      // Dividir texto largo en múltiples líneas
      const equipoLines = doc.splitTextToSize(equipoAuditores, 140);
      doc.text(equipoLines, 50, yPos);
      yPos += equipoLines.length * 5 + 10; // Espacio dinámico según líneas

      // ============ SECCIÓN: ASPECTOS A TENER EN CUENTA ============
      yPos += 5; // Espacio antes de la sección
      doc.setFillColor(...colorAzul);
      doc.rect(10, yPos, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('ASPECTOS A TENER EN CUENTA', 105, yPos + 6, { align: 'center' });
      yPos += 10; // Espacio después del banner

      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      // Objetivo
      doc.setFont('helvetica', 'bold');
      doc.text('OBJETIVO DE LA AUDITORIA:', 10, yPos);
      doc.setFont('helvetica', 'normal');
      const objetivoText = doc.splitTextToSize('Verificar el cumplimiento del Plan Anual de Control Interno según Decreto 648/2017', 180);
      doc.text(objetivoText, 10, yPos + 5);
      yPos += objetivoText.length * 5 + 8; // Espacio dinámico

      // Alcance
      doc.setFont('helvetica', 'bold');
      doc.text('ALCANCE DE LA AUDITORIA:', 10, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`Plan Anual ${plan.año} - ${plan.roles.length} roles del Decreto 648/2017`, 10, yPos + 5);
      yPos += 10;

      // Criterios
      doc.setFont('helvetica', 'bold');
      doc.text('CRITERIOS DE AUDITORÍA:', 10, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text('Decreto 648 de 2017 - Sistema de Control Interno', 10, yPos + 5);
      yPos += 10;

      // Método
      doc.setFont('helvetica', 'bold');
      doc.text('METODO DE AUDITORIA:', 10, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text('Revisión documental y verificación de actividades', 10, yPos + 5);
      yPos += 10;

      // Recursos
      doc.setFont('helvetica', 'bold');
      doc.text('RECURSOS:', 10, yPos);
      yPos += 6; // Más espacio
      doc.setFont('helvetica', 'normal');
      doc.text('FINANCIEROS', 10, yPos);
      doc.text('LOGISTICOS', 50, yPos);
      doc.text('TECNOLÓGICOS', 90, yPos);
      doc.text('OTROS', 130, yPos);
      yPos += 10; // Espacio antes de la tabla

      // ============ TABLA: CRONOGRAMA Y EQUIPO AUDITOR ============
      yPos += 5; // Espacio antes de la sección
      doc.setFillColor(...colorAzul);
      doc.rect(10, yPos, 190, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('CRONOGRAMA Y EQUIPO AUDITOR', 105, yPos + 6, { align: 'center' });
      yPos += 10; // Espacio después del banner

      // Preparar datos de la tabla
      const tableData: any[] = [];
      [...plan.roles].sort((a, b) => a.numero - b.numero).forEach(rol => {
        rol.actividades.forEach(actividad => {
          // Obtener nombre del responsable (puede venir como 'responsable' o 'responsableNombre')
          const actAny = actividad as any;
          const nombreResponsable = actAny.responsable?.nombre 
            || actAny.responsable 
            || actAny.responsableNombre 
            || 'Por asignar';
          
          tableData.push([
            `${rol.nombre}: ${actividad.nombre}`,
            nombreResponsable,
            nombreResponsable,
            actAny.fechaInicio || actAny.fecha_inicio || 'Por definir',
            'Por definir',
            'Por definir'
          ]);
        });
      });

      // Si no hay actividades, agregar una fila vacía
      if (tableData.length === 0) {
        tableData.push(['No hay actividades registradas', '', '', '', '', '']);
      }

      // Generar tabla con autoTable
      // Usar autoTable como función pasando doc como primer parámetro
      autoTable(doc, {
        startY: yPos,
        head: [['ACTIVIDAD A DESARROLLAR', 'AUDITOR(ES)', 'PERSONA($) A AUDITAR', 'FECHA', 'HORA', 'LUGAR']],
        body: tableData,
        theme: 'grid',
        headStyles: {
          fillColor: colorAzul,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [0, 0, 0]
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 20 },
          4: { cellWidth: 20 },
          5: { cellWidth: 30 }
        },
        margin: { left: 10, right: 10 }
      });
      
      const finalY = (doc as any).lastAutoTable?.finalY || yPos + 50;
      yPos = finalY + 10; // Espacio después de la tabla

      // ============ FOOTER: FIRMAS ============
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      yPos += 10; // Espacio antes de las firmas

      // Firma Auditor Líder
      doc.setFillColor(...colorAzul);
      doc.rect(10, yPos, 90, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('FIRMA DEL AUDITOR LÍDER', 55, yPos + 6, { align: 'center' });
      yPos += 12; // Espacio entre banner y nombre
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(plan.jefeOCI.nombre, 55, yPos, { align: 'center' });

      // Firma Jefe Oficina de Planeación
      doc.setFillColor(...colorAzul);
      doc.rect(110, yPos - 12, 90, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('FIRMA JEFE OFICINA DE PLANEACIÓN', 155, yPos - 6, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('_________________________', 155, yPos + 2, { align: 'center' });

      // Guardar PDF
      const fileName = `Plan_Anual_${plan.año}_${new Date().getTime()}.pdf`;
      doc.save(fileName);

      toast.success('PDF generado correctamente', {
        description: fileName
      });
    } catch (error: any) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar PDF', {
        description: error.message || 'No se pudo generar el documento'
      });
    }
  };

  const handleExportarExcel = async (plan: PlanAnual) => {
    try {
      const toastId = toast.loading('Generando Excel...', {
        description: 'Por favor espera un momento'
      });

      // Validar que el plan tenga datos
      if (!plan || !plan.roles || !Array.isArray(plan.roles)) {
        throw new Error('El plan no tiene datos válidos');
      }

      // Crear workbook desde cero (sin usar plantillas)
      const wb = XLSX.utils.book_new();
      
      // Validar que el workbook se haya creado correctamente
      if (!wb || !wb.SheetNames) {
        throw new Error('No se pudo crear el archivo Excel');
      }

      // Preparar datos
      const equipoAuditores = plan.roles
        .flatMap(rol => rol.actividades.map(act => act.responsableNombre))
        .filter((nombre, index, arr) => arr.indexOf(nombre) === index)
        .join(', ') || 'Por definir';

      // ============ HOJA 1: INFORMACIÓN GENERAL ============
      const infoGeneralData = [
        ['ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP'],
        ['OFICINA DE CONTROL INTERNO DE GESTIÓN'],
        ['PLAN ANUAL DE AUDITORÍAS'],
        [''],
        ['INFORMACIÓN GENERAL'],
        ['Fecha del Plan:', new Date().toLocaleDateString('es-CO')],
        ['Año:', plan.año],
        ['Estado:', plan.estado],
        ['Proceso/Dependencia a Auditar:', 'Control Interno - Plan Anual'],
        ['Responsable Proceso/Dependencia:', plan.jefeOCI.nombre],
        ['Auditor Líder:', plan.jefeOCI.nombre],
        ['Equipo Auditor:', equipoAuditores],
        [''],
        ['OBJETIVO DE LA AUDITORÍA'],
        ['Verificar el cumplimiento del Plan Anual de Control Interno según Decreto 648/2017'],
        [''],
        ['ALCANCE'],
        [`Plan Anual ${plan.año} - ${plan.roles.length} roles del Decreto 648/2017`],
        [''],
        ['CRITERIOS DE AUDITORÍA'],
        ['Decreto 648 de 2017 - Sistema de Control Interno'],
        [''],
        ['MÉTODO DE AUDITORÍA'],
        ['Revisión documental y verificación de actividades'],
        [''],
        ['ASPECTOS A TENER EN CUENTA'],
        ['Riesgos identificados en el Plan Anual de Control Interno'],
        ['Procesos críticos del Decreto 648/2017'],
        ['Resultados de auditorías anteriores del sistema de control interno'],
        ['Cambios recientes en procesos o normativa aplicable'],
        [''],
        ['RECURSOS'],
        ['Financieros:', 'Recursos asignados en el presupuesto anual'],
        ['Logísticos:', 'Espacios físicos y equipos necesarios para la auditoría'],
        ['Tecnológicos:', 'Sistemas de información y herramientas de auditoría'],
        ['Otros:', 'No aplica']
      ];

      const wsInfo = XLSX.utils.aoa_to_sheet(infoGeneralData);
      wsInfo['!cols'] = [
        { wch: 25 },
        { wch: 60 }
      ];
      XLSX.utils.book_append_sheet(wb, wsInfo, 'Información General');

      // ============ HOJA 2: ROLES Y ACTIVIDADES ============
      const rolesHeaders = [
        'Rol',
        'Actividad',
        'Descripción',
        'Responsable',
        'Fecha Inicio',
        'Fecha Fin',
        'Porcentaje',
        'Estado'
      ];

      const rolesRows: any[] = [];
      [...plan.roles].sort((a, b) => a.numero - b.numero).forEach(rol => {
        if (rol.actividades.length === 0) {
          rolesRows.push([
            rol.nombre,
            'Sin actividades',
            '',
            '',
            '',
            '',
            0,
            'Pendiente'
          ]);
        } else {
          rol.actividades.forEach((actividad, index) => {
            rolesRows.push([
              index === 0 ? rol.nombre : '', // Solo mostrar el nombre del rol en la primera fila
              actividad.nombre,
              actividad.descripcion || '',
              actividad.responsableNombre || 'Por asignar',
              actividad.fechaInicio || 'Por definir',
              actividad.fechaFin || 'Por definir',
              actividad.porcentaje || 0,
              actividad.estado || 'Pendiente'
            ]);
          });
        }
      });

      const wsRoles = XLSX.utils.aoa_to_sheet([rolesHeaders, ...rolesRows]);
      wsRoles['!cols'] = [
        { wch: 30 }, // Rol
        { wch: 40 }, // Actividad
        { wch: 50 }, // Descripción
        { wch: 30 }, // Responsable
        { wch: 15 }, // Fecha Inicio
        { wch: 15 }, // Fecha Fin
        { wch: 12 }, // Porcentaje
        { wch: 15 }  // Estado
      ];
      XLSX.utils.book_append_sheet(wb, wsRoles, 'Roles y Actividades');

      // ============ HOJA 3: CRONOGRAMA ============
      const cronogramaHeaders = [
        'Actividad',
        'Auditor(es)',
        'Proceso(s) Auditado(s)',
        'Fecha',
        'Hora',
        'Lugar'
      ];

      const cronogramaRows: any[] = [];
      [...plan.roles].sort((a, b) => a.numero - b.numero).forEach(rol => {
        rol.actividades.forEach(actividad => {
          cronogramaRows.push([
            `${rol.nombre}: ${actividad.nombre}`,
            actividad.responsableNombre || 'Por asignar',
            actividad.responsableNombre || 'Por asignar',
            actividad.fechaInicio || 'Por definir',
            'Por definir',
            'Por definir'
          ]);
        });
      });

      if (cronogramaRows.length === 0) {
        cronogramaRows.push(['No hay actividades registradas', '', '', '', '', '']);
      }

      const wsCronograma = XLSX.utils.aoa_to_sheet([cronogramaHeaders, ...cronogramaRows]);
      wsCronograma['!cols'] = [
        { wch: 50 }, // Actividad
        { wch: 30 }, // Auditor(es)
        { wch: 30 }, // Proceso(s)
        { wch: 15 }, // Fecha
        { wch: 15 }, // Hora
        { wch: 20 }  // Lugar
      ];
      XLSX.utils.book_append_sheet(wb, wsCronograma, 'Cronograma');

      // ============ HOJA 4: FIRMAS ============
      const firmasData = [
        ['FIRMAS'],
        [''],
        ['AUDITOR LÍDER'],
        ['Nombre:', plan.jefeOCI.nombre],
        ['Cargo:', 'Jefe Oficina de Control Interno'],
        [''],
        ['AUDITADO'],
        ['Nombre:', plan.jefeOCI.nombre],
        ['Cargo:', 'Responsable del Proceso'],
        [''],
        ['Fecha de Generación:', new Date().toLocaleDateString('es-CO')]
      ];

      const wsFirmas = XLSX.utils.aoa_to_sheet(firmasData);
      wsFirmas['!cols'] = [
        { wch: 20 },
        { wch: 40 }
      ];
      XLSX.utils.book_append_sheet(wb, wsFirmas, 'Firmas');

      // Validar que el workbook tenga al menos una hoja
      if (!wb.SheetNames || wb.SheetNames.length === 0) {
        throw new Error('El archivo Excel no contiene hojas válidas');
      }

      // Generar archivo
      const fileName = `Plan_Anual_${plan.año}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      // Escribir el archivo usando writeFile (método más seguro)
      try {
        XLSX.writeFile(wb, fileName);
      } catch (writeError: any) {
        console.error('Error al escribir archivo:', writeError);
        throw new Error(`Error al guardar el archivo: ${writeError.message || 'Error desconocido'}`);
      }

      toast.dismiss(toastId);
      toast.success('Excel generado correctamente', {
        description: fileName
      });
    } catch (error: any) {
      console.error('Error al generar Excel:', error);
      const errorMessage = error?.message || 'No se pudo generar el documento';
      
      // Si el error menciona HTML o plantilla, dar un mensaje más específico
      if (errorMessage.includes('HTML') || errorMessage.includes('plantilla') || errorMessage.includes('table')) {
        toast.error('Error al generar Excel', {
          description: 'Por favor, recarga la página y vuelve a intentar. Si el problema persiste, contacta al administrador.'
        });
      } else {
        toast.error('Error al generar Excel', {
          description: errorMessage
        });
      }
    }
  };

  return (
    <Container4K>
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Cargando planes anuales...</p>
          </div>
        </div>
      ) : (
      <AnimatePresence mode="wait">
        {vistaActiva === 'lista' && (
          <motion.div
            key="lista"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
          >
            <ListaPlanesAnuales
              planes={planesFiltrados}
              onCrearNuevo={handleCrearNuevo}
              onVerDetalle={handleVerDetalle}
              onEditar={handleEditar}
              onAprobar={handleAprobar}
              onExportarPDF={handleExportarPDF}
            />
          </motion.div>
        )}

        {vistaActiva === 'crear' && (
          <motion.div
            key="crear"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CrearPlanAnual
              onVolver={handleVolver}
              onGuardar={handleGuardarPlan}
            />
          </motion.div>
        )}

        {vistaActiva === 'editar' && planActual && (
          <motion.div
            key="editar"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CrearPlanAnual
              planExistente={planActual}
              onVolver={handleVolver}
              onGuardar={handleActualizarPlan}
            />
          </motion.div>
        )}

        {vistaActiva === 'detalle' && planActual && (
          <motion.div
            key="detalle"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <DetallePlanAnual
              plan={planActual}
              onVolver={handleVolver}
              onEditar={() => handleEditar(planActual)}
              onAprobar={() => handleAprobar(planActual)}
              onExportarPDF={() => handleExportarPDF(planActual)}
              onExportarExcel={() => handleExportarExcel(planActual)}
            />
          </motion.div>
        )}
      </AnimatePresence>
      )}

      {/* MODAL DE APROBACIÓN */}
      {mostrarModalAprobacion && planActual && (
        <ModalAprobacionPlan
          plan={planActual}
          onCerrar={() => setMostrarModalAprobacion(false)}
          onAprobar={handleConfirmarAprobacion}
        />
      )}
    </Container4K>
  );
}

// ============ LISTA DE PLANES ANUALES ============

interface ListaPlanesAnualesProps {
  planes: PlanAnual[];
  onCrearNuevo: () => void;
  onVerDetalle: (plan: PlanAnual) => void;
  onEditar: (plan: PlanAnual) => void;
  onAprobar: (plan: PlanAnual) => void;
  onExportarPDF: (plan: PlanAnual) => void;
}

function ListaPlanesAnuales({ planes, onCrearNuevo, onVerDetalle, onEditar, onAprobar, onExportarPDF }: ListaPlanesAnualesProps) {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* ACCIÓN PRINCIPAL */}
      {authService.hasPermission(Permissions.CONTROL_INTERNO_PLANEACION_PLAN_CREATE) && (
      <div className="flex justify-end">
        <Button
          onClick={onCrearNuevo}
          className="gap-2 shadow-lg"
          style={{ background: '#003DA5' }}
          size="lg"
        >
          <Plus className="w-5 h-5" />
          Crear Plan Anual
        </Button>
      </div>
      )}

      {/* INFORMACIÓN DEL DECRETO */}
      <Card className="p-4 sm:p-5 md:p-6 border-l-4 border-l-blue-500 bg-blue-50/50">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-lg bg-blue-100 flex-shrink-0">
            <Info className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs sm:text-sm text-gray-900 mb-2">
              📋 Decreto 648 de 2017 - Requisitos del Plan Anual
            </h3>
            <p className="text-xs sm:text-sm text-gray-700 mb-3">
              Todo Plan Anual de Control Interno debe contener <strong>exactamente 5 roles</strong> definidos 
              por el Decreto 648/2017. Cada rol debe tener al menos una actividad asignada con responsable y fechas.
            </p>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {ROLES_DECRETO_648.map((rol) => (
                <Badge
                  key={rol.id}
                  className="text-[10px] sm:text-xs"
                  style={{ background: rol.color }}
                >
                  {rol.icono} {rol.nombre}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* LISTA DE PLANES */}
      {planes.length === 0 ? (
        <Card className="p-8 sm:p-10 md:p-12">
          <div className="text-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <Calendar className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
              No hay planes anuales creados
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto">
              Crea tu primer Plan Anual de Control Interno cumpliendo con los requisitos del Decreto 648/2017
            </p>
            <Button
              onClick={onCrearNuevo}
              className="gap-2 w-full sm:w-auto"
              style={{ background: '#003DA5' }}
              size="lg"
            >
              <Plus className="w-5 h-5" />
              Crear Primer Plan Anual
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          {planes.map((plan) => (
            <Card
              key={plan.id}
              className="p-4 sm:p-5 md:p-6 hover:shadow-lg transition-all cursor-pointer border-2 border-transparent hover:border-blue-300"
              onClick={() => onVerDetalle(plan)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-50">
                    <Calendar className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-gray-900">
                      Plan {plan.año}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Versión {plan.version}
                    </p>
                  </div>
                </div>
                <Badge
                  className={`${
                    plan.estado === 'Aprobado'
                      ? 'bg-green-100 text-green-800'
                      : plan.estado === 'En Revisión'
                      ? 'bg-yellow-100 text-yellow-800'
                      : plan.estado === 'Vigente'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {plan.estado}
                </Badge>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {plan.jefeOCI.nombre}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {plan.roles.length} roles configurados
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">
                    {plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0)} actividades
                  </span>
                </div>

                {/* ✅ NUEVO: Badge de cumplimiento Decreto 648 */}
                <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                  <BadgeDecreto648Simple plan={plan} />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Creado: {plan.fechaCreacion}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ CREAR PLAN ANUAL (WIZARD) ============

interface CrearPlanAnualProps {
  onVolver: () => void;
  onGuardar: (plan: PlanAnual) => void;
  planExistente?: PlanAnual;
}

function CrearPlanAnual({ onVolver, onGuardar, planExistente }: CrearPlanAnualProps) {
  const [paso, setPaso] = useState(1);
  const [año, setAño] = useState(planExistente ? planExistente.año : new Date().getFullYear() + 1);
  const [jefeOCI, setJefeOCI] = useState<Usuario | null>(() => {
    if (!planExistente || !planExistente.jefeOCI) {
      return null;
    }

    // Buscar el usuario en USUARIOS_MOCK por ID primero
    let usuarioEncontrado = USUARIOS_MOCK.find(u => u.id === planExistente.jefeOCI.id);
    
    // Si no se encuentra por ID, buscar por nombre
    if (!usuarioEncontrado && planExistente.jefeOCI.nombre) {
      usuarioEncontrado = USUARIOS_MOCK.find(u => 
        u.nombre.toLowerCase() === planExistente.jefeOCI.nombre.toLowerCase()
      );
    }

    // Si se encuentra, usar ese usuario
    if (usuarioEncontrado) {
      return {
        ...usuarioEncontrado,
        iniciales: planExistente.jefeOCI.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
      };
    }

    // Si no se encuentra, crear un objeto Usuario con los datos del plan
    return {
      id: planExistente.jefeOCI.id || '',
      nombre: planExistente.jefeOCI.nombre,
      cargo: planExistente.jefeOCI.cargo || 'Jefe OCI',
      iniciales: planExistente.jefeOCI.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    };
  });
  const [roles, setRoles] = useState<RolDecreto[]>(() => {
    if (!planExistente) {
      return ROLES_DECRETO_648.map(r => ({ ...r, actividades: [] }));
    }
    
    // Mapear roles del plan existente, buscando por id del template (1-5)
    return ROLES_DECRETO_648.map(templateRol => {
      // Buscar el rol correspondiente en el plan existente por id (que es el rol_numero 1-5)
      const rolExistente = planExistente.roles.find(p => p.id === templateRol.id);
      return {
        ...templateRol,
        actividades: rolExistente?.actividades || []
      };
    });
  });
  const [rolActual, setRolActual] = useState(0);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const TOTAL_PASOS = 4;

  // Validaciones
  const validarPaso1 = () => {
    const nuevosErrores: Record<string, string> = {};
    
    if (!jefeOCI) {
      nuevosErrores.jefeOCI = 'Debes seleccionar el Jefe de OCI';
    }

    if (año < new Date().getFullYear()) {
      nuevosErrores.año = 'El año no puede ser menor al actual';
    }

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const validarPaso2 = () => {
    const rol = roles[rolActual];
    const nuevosErrores: Record<string, string> = {};

    if (rol.actividades.length === 0) {
      nuevosErrores.actividades = `El rol "${rol.nombre}" debe tener al menos 1 actividad`;
    }

    // Validar que todas las actividades tengan datos completos
    rol.actividades.forEach((act, idx) => {
      // Validar nombre
      if (!act.nombre || !act.nombre.trim()) {
        nuevosErrores[`actividad-${idx}-nombre`] = 'El nombre de la actividad es obligatorio';
      } else if (act.nombre.trim().length < 5) {
        nuevosErrores[`actividad-${idx}-nombre`] = 'El nombre debe tener al menos 5 caracteres';
      }

      // Validar responsable
      if (!act.responsableId) {
        nuevosErrores[`actividad-${idx}-responsable`] = 'Debes asignar un responsable a la actividad';
      }

      // Validar fecha de inicio
      if (!act.fechaInicio) {
        nuevosErrores[`actividad-${idx}-inicio`] = 'La fecha de inicio es obligatoria';
      } else {
        const fechaInicio = new Date(act.fechaInicio);
        if (isNaN(fechaInicio.getTime())) {
          nuevosErrores[`actividad-${idx}-inicio`] = 'La fecha de inicio no es válida';
        } else {
          // Validar que la fecha de inicio no sea anterior al año del plan
          const añoPlan = año || new Date().getFullYear();
          if (fechaInicio.getFullYear() < añoPlan) {
            nuevosErrores[`actividad-${idx}-inicio`] = `La fecha de inicio no puede ser anterior al año del plan (${añoPlan})`;
          }
        }
      }

      // Validar fecha de fin
      if (!act.fechaFin) {
        nuevosErrores[`actividad-${idx}-fin`] = 'La fecha de fin es obligatoria';
      } else {
        const fechaFin = new Date(act.fechaFin);
        if (isNaN(fechaFin.getTime())) {
          nuevosErrores[`actividad-${idx}-fin`] = 'La fecha de fin no es válida';
        } else {
          // Validar que la fecha de fin sea del mismo año o posterior al año del plan
          const añoPlan = año || new Date().getFullYear();
          if (fechaFin.getFullYear() < añoPlan) {
            nuevosErrores[`actividad-${idx}-fin`] = `La fecha de fin no puede ser anterior al año del plan (${añoPlan})`;
          }
        }
      }

      // Validar relación entre fechas (solo si ambas existen y son válidas)
      if (act.fechaInicio && act.fechaFin) {
        const fechaInicio = new Date(act.fechaInicio);
        const fechaFin = new Date(act.fechaFin);
        
        if (!isNaN(fechaInicio.getTime()) && !isNaN(fechaFin.getTime())) {
          // Comparar fechas correctamente
          const tiempoInicio = fechaInicio.getTime();
          const tiempoFin = fechaFin.getTime();
          
          if (tiempoFin <= tiempoInicio) {
            const fechaInicioFormateada = fechaInicio.toLocaleDateString('es-CO');
            const fechaFinFormateada = fechaFin.toLocaleDateString('es-CO');
            nuevosErrores[`actividad-${idx}-fechas`] = `La fecha de fin (${fechaFinFormateada}) debe ser posterior a la fecha de inicio (${fechaInicioFormateada})`;
          } else {
            // Validar que la duración sea razonable (no más de 2 años)
            const diferenciaDias = Math.floor((tiempoFin - tiempoInicio) / (1000 * 60 * 60 * 24));
            if (diferenciaDias > 730) {
              nuevosErrores[`actividad-${idx}-fechas`] = 'La duración de la actividad no puede exceder 2 años';
            }
          }
        }
      }
    });

    setErrores(nuevosErrores);
    return Object.keys(nuevosErrores).length === 0;
  };

  const handleSiguiente = () => {
    if (paso === 1) {
      if (!validarPaso1()) {
        toast.error('Datos incompletos', {
          description: 'Por favor completa todos los campos obligatorios'
        });
        return;
      }
      setPaso(2);
    } else if (paso === 2) {
      if (!validarPaso2()) {
        const erroresCount = Object.keys(errores).length;
        const mensaje = erroresCount === 1 
          ? 'Hay 1 error que debe corregirse' 
          : `Hay ${erroresCount} errores que deben corregirse`;
        
        toast.error('Actividades incompletas', {
          description: mensaje + '. Revisa los campos marcados en rojo.',
          duration: 5000
        });
        return;
      }

      // Si es el último rol, ir al paso 3
      if (rolActual === roles.length - 1) {
        setPaso(3);
      } else {
        // Siguiente rol
        setRolActual(prev => prev + 1);
        setErrores({});
      }
    } else if (paso === 3) {
      setPaso(4);
    }
  };

  const handleAnterior = () => {
    if (paso === 2 && rolActual > 0) {
      setRolActual(prev => prev - 1);
      setErrores({});
    } else if (paso > 1) {
      setPaso(prev => prev - 1);
      if (paso === 3) {
        setRolActual(roles.length - 1);
      }
    }
  };

  const handleAgregarActividad = () => {
    const nuevaActividad: Actividad = {
      id: `act-${Date.now()}`,
      nombre: '',
      descripcion: '',
      responsableId: '',
      responsableNombre: '',
      fechaInicio: '',
      fechaFin: '',
      porcentaje: 0,
      estado: 'Pendiente'
    };

    setRoles(prev => {
      const nuevosRoles = [...prev];
      nuevosRoles[rolActual].actividades.push(nuevaActividad);
      return nuevosRoles;
    });
  };

  const handleEliminarActividad = (actividadId: string) => {
    setRoles(prev => {
      const nuevosRoles = [...prev];
      nuevosRoles[rolActual].actividades = nuevosRoles[rolActual].actividades.filter(
        a => a.id !== actividadId
      );
      return nuevosRoles;
    });
  };

  const handleActualizarActividad = (
    actividadId: string,
    campo: keyof Actividad,
    valor: any
  ) => {
    // Primero, encontrar el índice ANTES de actualizar el estado
    const actividadIdxActual = roles[rolActual].actividades.findIndex(a => a.id === actividadId);

    setRoles(prev => {
      const nuevosRoles = [...prev];
      const actividad = nuevosRoles[rolActual].actividades.find(a => a.id === actividadId);
      if (actividad) {
        (actividad as any)[campo] = valor;

        // Si se selecciona un responsable, actualizar también el nombre
        if (campo === 'responsableId') {
          const usuario = USUARIOS_MOCK.find(u => u.id === valor);
          if (usuario) {
            actividad.responsableNombre = usuario.nombre;
          }
        }
      }
      return nuevosRoles;
    });

    // Limpiar errores del campo cuando se actualiza usando el índice que ya calculamos
    // La validación completa se hará al hacer clic en "Siguiente"
    if (actividadIdxActual !== -1) {
      setErrores(prev => {
        const nuevosErrores = { ...prev };
        // Limpiar errores específicos de este campo e índices relacionados
        delete nuevosErrores[`actividad-${actividadIdxActual}-${campo}`];
        if (campo === 'fechaInicio' || campo === 'fechaFin') {
          delete nuevosErrores[`actividad-${actividadIdxActual}-inicio`];
          delete nuevosErrores[`actividad-${actividadIdxActual}-fin`];
          delete nuevosErrores[`actividad-${actividadIdxActual}-fechas`];
        }
        return nuevosErrores;
      });
    }
  };

  // Validar todo el plan antes de guardar
  const validarPlanCompleto = (): { valido: boolean; mensaje?: string } => {
    // Validar información general
    if (!jefeOCI) {
      return { valido: false, mensaje: 'Debes seleccionar el Jefe de OCI' };
    }

    if (!año || año < new Date().getFullYear()) {
      return { valido: false, mensaje: 'El año del plan no es válido' };
    }

    // Validar que todos los roles obligatorios tengan al menos una actividad
    const rolesIncompletos = roles.filter(rol => rol.obligatorio && rol.actividades.length === 0);
    if (rolesIncompletos.length > 0) {
      const nombresRoles = rolesIncompletos.map(r => r.nombre).join(', ');
      return { 
        valido: false, 
        mensaje: `Los siguientes roles obligatorios deben tener al menos una actividad: ${nombresRoles}` 
      };
    }

    // Validar todas las actividades de todos los roles
    const erroresActividades: string[] = [];
    roles.forEach((rol, rolIdx) => {
      rol.actividades.forEach((act, actIdx) => {
        if (!act.nombre || !act.nombre.trim()) {
          erroresActividades.push(`Rol "${rol.nombre}": La actividad ${actIdx + 1} no tiene nombre`);
        }
        if (!act.responsableId) {
          erroresActividades.push(`Rol "${rol.nombre}": La actividad "${act.nombre || actIdx + 1}" no tiene responsable`);
        }
        if (!act.fechaInicio) {
          erroresActividades.push(`Rol "${rol.nombre}": La actividad "${act.nombre || actIdx + 1}" no tiene fecha de inicio`);
        }
        if (!act.fechaFin) {
          erroresActividades.push(`Rol "${rol.nombre}": La actividad "${act.nombre || actIdx + 1}" no tiene fecha de fin`);
        }
        if (act.fechaInicio && act.fechaFin) {
          const fechaInicio = new Date(act.fechaInicio);
          const fechaFin = new Date(act.fechaFin);
          if (!isNaN(fechaInicio.getTime()) && !isNaN(fechaFin.getTime())) {
            if (fechaFin <= fechaInicio) {
              erroresActividades.push(`Rol "${rol.nombre}": La actividad "${act.nombre}" tiene fechas inválidas (fin debe ser posterior a inicio)`);
            }
          }
        }
      });
    });

    if (erroresActividades.length > 0) {
      return { 
        valido: false, 
        mensaje: `Hay ${erroresActividades.length} error(es) en las actividades:\n${erroresActividades.slice(0, 3).join('\n')}${erroresActividades.length > 3 ? '...' : ''}` 
      };
    }

    return { valido: true };
  };

  const handleGuardarBorrador = async () => {
    try {
      // Validación básica (para borrador es más flexible)
      if (!jefeOCI) {
        toast.error('Datos incompletos', {
          description: 'Debes seleccionar el Jefe de OCI'
        });
        return;
      }

      const nuevoPlan: PlanAnual = {
        id: planExistente?.id || `plan-${Date.now()}`,
        año,
        estado: 'Borrador',
        jefeOCI: {
          id: jefeOCI!.id,
          nombre: jefeOCI!.nombre,
          cargo: jefeOCI!.cargo
        },
        roles,
        fechaCreacion: new Date().toLocaleDateString(),
        version: 1
      };

      await onGuardar(nuevoPlan);
      
      toast.success('Plan guardado como borrador', {
        description: 'Puedes continuar editándolo más tarde'
      });
    } catch (error) {
      console.error('Error al guardar borrador:', error);
      toast.error('Error al guardar borrador', {
        description: error instanceof Error ? error.message : 'No se pudo guardar el plan'
      });
    }
  };

  const handleEnviarRevision = async () => {
    try {
      // Validación completa antes de enviar a revisión
      const validacion = validarPlanCompleto();
      if (!validacion.valido) {
        toast.error('Plan incompleto', {
          description: validacion.mensaje || 'Completa todos los campos obligatorios antes de enviar a revisión',
          duration: 6000
        });
        return;
      }

      const nuevoPlan: PlanAnual = {
        id: planExistente?.id || `plan-${Date.now()}`,
        año,
        estado: 'En Revisión',
        jefeOCI: {
          id: jefeOCI!.id,
          nombre: jefeOCI!.nombre,
          cargo: jefeOCI!.cargo
        },
        roles,
        fechaCreacion: new Date().toLocaleDateString(),
        version: 1
      };

      // Guardar primero, luego mostrar el toast solo si es exitoso
      await onGuardar(nuevoPlan);
      
      toast.success('Plan enviado a revisión', {
        description: 'El Jefe OCI recibirá una notificación para aprobar el plan'
      });
    } catch (error) {
      console.error('Error al enviar a revisión:', error);
      toast.error('Error al enviar plan a revisión', {
        description: error instanceof Error ? error.message : 'No se pudo enviar el plan a revisión'
      });
    }
  };

  const progreso = (paso / TOTAL_PASOS) * 100;

  return (
    <div className="space-y-4 md:space-y-6">
      {/* PROGRESO Y ACCIONES */}
      <Card className="p-4 sm:p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex-1">
            <p className="text-xs sm:text-sm font-bold text-gray-700">
              Paso {paso} de {TOTAL_PASOS} - {
                paso === 1 ? 'Información General' :
                paso === 2 ? `Configurar Rol ${rolActual + 1}/5` :
                paso === 3 ? 'Resumen y Validación' :
                'Confirmación'
              }
            </p>
          </div>

          <Button variant="outline" onClick={onVolver} className="gap-2" size="sm">
            <X className="w-4 h-4" />
            Cancelar
          </Button>
        </div>

        {/* Barra de progreso */}
        <div className="relative">
          <div className="h-1.5 sm:h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${progreso}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-2">
            {[1, 2, 3, 4].map((p) => (
              <div
                key={p}
                className={`text-[10px] sm:text-xs font-semibold ${
                  paso >= p ? 'text-blue-600' : 'text-gray-400'
                }`}
              >
                <span className="hidden xs:inline">
                  {p === 1 && 'General'}
                  {p === 2 && '5 Roles'}
                  {p === 3 && 'Resumen'}
                  {p === 4 && 'Finalizar'}
                </span>
                <span className="xs:hidden">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* CONTENIDO DEL PASO */}
      <AnimatePresence mode="wait">
        {/* PASO 1: INFORMACIÓN GENERAL */}
        {paso === 1 && (
          <motion.div
            key="paso1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="p-6 sm:p-7 md:p-8">
              <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
                <div className="text-center mb-6 sm:mb-8">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 mb-2">
                    Información General del Plan
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Define el año y el responsable del Plan Anual de Control Interno
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Año del Plan Anual *
                  </label>
                  <Input
                    type="number"
                    value={año}
                    onChange={(e) => {
                      setAño(parseInt(e.target.value));
                      setErrores(prev => {
                        const nuevos = { ...prev };
                        delete nuevos.año;
                        return nuevos;
                      });
                    }}
                    className={`text-base sm:text-lg font-bold ${errores.año ? 'border-red-500' : ''}`}
                    min={new Date().getFullYear()}
                  />
                  {errores.año && (
                    <p className="text-xs sm:text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errores.año}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
                    Jefe de Oficina de Control Interno *
                  </label>
                  <select
                    value={jefeOCI?.id || ''}
                    onChange={(e) => {
                      const usuario = USUARIOS_MOCK.find(u => u.id === e.target.value);
                      setJefeOCI(usuario || null);
                      setErrores(prev => {
                        const nuevos = { ...prev };
                        delete nuevos.jefeOCI;
                        return nuevos;
                      });
                    }}
                    className={`w-full px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errores.jefeOCI ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Seleccionar Jefe OCI...</option>
                    {USUARIOS_MOCK.filter(u => u.cargo === 'Jefe OCI').map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre} - {u.cargo}
                      </option>
                    ))}
                  </select>
                  {errores.jefeOCI && (
                    <p className="text-xs sm:text-sm text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errores.jefeOCI}
                    </p>
                  )}
                </div>

                {jefeOCI && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback style={{ background: '#003DA5', color: 'white' }}>
                          {jefeOCI.iniciales}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs sm:text-sm text-gray-900">{jefeOCI.nombre}</p>
                        <p className="text-[10px] sm:text-xs text-gray-600">{jefeOCI.cargo}</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                    </div>
                  </motion.div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* PASO 2: CONFIGURAR ROLES (5 ROLES) */}
        {paso === 2 && (
          <motion.div
            key="paso2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PasoConfigurarRol
              rol={roles[rolActual]}
              numeroRol={rolActual + 1}
              totalRoles={roles.length}
              usuarios={USUARIOS_MOCK}
              errores={errores}
              onAgregarActividad={handleAgregarActividad}
              onEliminarActividad={handleEliminarActividad}
              onActualizarActividad={handleActualizarActividad}
            />
          </motion.div>
        )}

        {/* PASO 3: RESUMEN Y VALIDACIÓN */}
        {paso === 3 && (
          <motion.div
            key="paso3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ResumenPlan
              año={año}
              jefeOCI={jefeOCI!}
              roles={roles}
            />
          </motion.div>
        )}

        {/* PASO 4: CONFIRMACIÓN */}
        {paso === 4 && (
          <motion.div
            key="paso4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <Card className="p-6 sm:p-8 md:p-10 lg:p-12">
              <div className="text-center max-w-2xl mx-auto">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-green-100 rounded-full flex items-center justify-center"
                >
                  <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
                </motion.div>

                <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 sm:mb-3">
                  ¡Plan Anual Listo!
                </h2>
                <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
                  Has completado exitosamente la configuración del Plan Anual {año} cumpliendo 
                  con todos los requisitos del Decreto 648/2017.
                </p>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
                  <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl sm:text-3xl font-black text-blue-600 mb-0.5 sm:mb-1">5</p>
                    <p className="text-[10px] sm:text-xs text-gray-600">Roles Configurados</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl sm:text-3xl font-black text-green-600 mb-0.5 sm:mb-1">
                      {roles.reduce((sum, rol) => sum + rol.actividades.length, 0)}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-600">Actividades Totales</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl sm:text-3xl font-black text-purple-600 mb-0.5 sm:mb-1">100%</p>
                    <p className="text-[10px] sm:text-xs text-gray-600">Cumplimiento</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                  <Button
                    variant="outline"
                    onClick={handleGuardarBorrador}
                    size="lg"
                    className="gap-2 w-full sm:w-auto"
                  >
                    <Save className="w-4 h-4" />
                    Guardar como Borrador
                  </Button>
                  <Button
                    onClick={handleEnviarRevision}
                    size="lg"
                    className="gap-2 w-full sm:w-auto"
                    style={{ background: '#003DA5' }}
                  >
                    <Send className="w-4 h-4" />
                    Enviar a Revisión
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NAVEGACIÓN */}
      {paso < 4 && (
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <Button
              variant="outline"
              onClick={handleAnterior}
              disabled={paso === 1 && rolActual === 0}
              className="gap-1 sm:gap-2"
              size="sm"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden xs:inline">Anterior</span>
            </Button>

            <div className="text-xs sm:text-sm text-gray-600 text-center">
              {paso === 2 && `Rol ${rolActual + 1} de ${roles.length}`}
            </div>

            <Button
              onClick={handleSiguiente}
              className="gap-1 sm:gap-2"
              style={{ background: '#003DA5' }}
              size="sm"
            >
              <span className="hidden xs:inline">{paso === 2 && rolActual < roles.length - 1 ? 'Siguiente Rol' : 'Continuar'}</span>
              <span className="xs:hidden">→</span>
              <ChevronRight className="w-4 h-4 hidden xs:inline" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============ PASO: CONFIGURAR ROL ============

interface PasoConfigurarRolProps {
  rol: RolDecreto;
  numeroRol: number;
  totalRoles: number;
  usuarios: Usuario[];
  errores: Record<string, string>;
  onAgregarActividad: () => void;
  onEliminarActividad: (id: string) => void;
  onActualizarActividad: (id: string, campo: keyof Actividad, valor: any) => void;
}

function PasoConfigurarRol({
  rol,
  numeroRol,
  totalRoles,
  usuarios,
  errores,
  onAgregarActividad,
  onEliminarActividad,
  onActualizarActividad
}: PasoConfigurarRolProps) {
  return (
    <Card className="p-4 sm:p-6 md:p-8">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4">
          <div
            className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-lg flex items-center justify-center text-2xl sm:text-3xl flex-shrink-0"
            style={{ background: `${rol.color}20` }}
          >
            {rol.icono}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
              <h2 className="text-base sm:text-lg md:text-xl font-black text-gray-900">
                {rol.nombre}
              </h2>
              <Badge style={{ background: rol.color }} className="text-[10px] sm:text-xs">
                Rol {numeroRol}/{totalRoles}
              </Badge>
              {rol.obligatorio && (
                <Badge className="bg-red-100 text-red-800 text-[10px] sm:text-xs">
                  Obligatorio
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              {rol.descripcion}
            </p>
          </div>
        </div>

        {errores.actividades && (
          <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-xs sm:text-sm text-red-700">{errores.actividades}</p>
          </div>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4 mb-6">
        <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 xs:gap-3">
          <h3 className="font-bold text-xs sm:text-sm text-gray-900">
            Actividades del Rol ({rol.actividades.length})
          </h3>
          <Button
            onClick={onAgregarActividad}
            size="sm"
            variant="outline"
            className="gap-1.5 sm:gap-2 w-full xs:w-auto"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm">Agregar Actividad</span>
          </Button>
        </div>

        {rol.actividades.length === 0 ? (
          <div className="p-6 sm:p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <Target className="w-7 h-7 sm:w-8 sm:h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
              No hay actividades agregadas a este rol
            </p>
            <Button onClick={onAgregarActividad} size="sm" className="gap-2 w-full xs:w-auto">
              <Plus className="w-4 h-4" />
              Agregar Primera Actividad
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {rol.actividades.map((actividad, idx) => (
              <Card key={actividad.id} className="p-4 border-2 border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-1 space-y-4">
                    {/* Nombre */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nombre de la Actividad *
                      </label>
                      <Input
                        value={actividad.nombre}
                        onChange={(e) => onActualizarActividad(actividad.id, 'nombre', e.target.value)}
                        placeholder="Ej: Participación en Comité de Coordinación del Control Interno"
                        className={errores[`actividad-${idx}-nombre`] ? 'border-red-500' : ''}
                      />
                      {errores[`actividad-${idx}-nombre`] && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errores[`actividad-${idx}-nombre`]}
                        </p>
                      )}
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Descripción (Opcional)
                      </label>
                      <textarea
                        value={actividad.descripcion}
                        onChange={(e) => onActualizarActividad(actividad.id, 'descripcion', e.target.value)}
                        placeholder="Describe brevemente el alcance de esta actividad..."
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      {/* Responsable */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Responsable *
                        </label>
                        <select
                          value={actividad.responsableId}
                          onChange={(e) => onActualizarActividad(actividad.id, 'responsableId', e.target.value)}
                          className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errores[`actividad-${idx}-responsable`] ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Seleccionar...</option>
                          {usuarios.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.nombre}
                            </option>
                          ))}
                        </select>
                        {errores[`actividad-${idx}-responsable`] && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errores[`actividad-${idx}-responsable`]}
                          </p>
                        )}
                      </div>

                      {/* Fecha Inicio */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Fecha Inicio *
                        </label>
                        <Input
                          type="date"
                          value={actividad.fechaInicio}
                          onChange={(e) => onActualizarActividad(actividad.id, 'fechaInicio', e.target.value)}
                          className={errores[`actividad-${idx}-inicio`] || errores[`actividad-${idx}-fechas`] ? 'border-red-500' : ''}
                        />
                        {errores[`actividad-${idx}-inicio`] && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errores[`actividad-${idx}-inicio`]}
                          </p>
                        )}
                      </div>

                      {/* Fecha Fin */}
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Fecha Fin *
                        </label>
                        <Input
                          type="date"
                          value={actividad.fechaFin}
                          onChange={(e) => onActualizarActividad(actividad.id, 'fechaFin', e.target.value)}
                          className={errores[`actividad-${idx}-fin`] || errores[`actividad-${idx}-fechas`] ? 'border-red-500' : ''}
                        />
                        {errores[`actividad-${idx}-fin`] && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {errores[`actividad-${idx}-fin`]}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Mensaje de error de fechas (si existe) */}
                    {errores[`actividad-${idx}-fechas`] && (
                      <div className="mt-2 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-red-700 font-medium">{errores[`actividad-${idx}-fechas`]}</p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEliminarActividad(actividad.id)}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// ============ RESUMEN DEL PLAN ============

interface ResumenPlanProps {
  año: number;
  jefeOCI: Usuario;
  roles: RolDecreto[];
}

function ResumenPlan({ año, jefeOCI, roles }: ResumenPlanProps) {
  const totalActividades = roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
  const rolesCompletos = roles.filter(r => r.actividades.length > 0).length;

  return (
    <Card className="p-6 sm:p-7 md:p-8">
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2">
          Resumen del Plan Anual {año}
        </h2>
        <p className="text-xs sm:text-sm text-gray-600">
          Revisa toda la información antes de enviar a aprobación
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
        <Card className="p-3 sm:p-4 text-center border-2 border-blue-200">
          <p className="text-2xl sm:text-3xl font-black text-blue-600 mb-0.5 sm:mb-1">{rolesCompletos}/5</p>
          <p className="text-[10px] sm:text-xs text-gray-600">Roles Completos</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center border-2 border-green-200">
          <p className="text-2xl sm:text-3xl font-black text-green-600 mb-0.5 sm:mb-1">{totalActividades}</p>
          <p className="text-[10px] sm:text-xs text-gray-600">Actividades Totales</p>
        </Card>
        <Card className="p-3 sm:p-4 text-center border-2 border-purple-200">
          <p className="text-2xl sm:text-3xl font-black text-purple-600 mb-0.5 sm:mb-1">
            {rolesCompletos === 5 ? '✅' : '⚠️'}
          </p>
          <p className="text-[10px] sm:text-xs text-gray-600">
            {rolesCompletos === 5 ? 'Decreto 648 OK' : 'Incompleto'}
          </p>
        </Card>
      </div>

      {/* Información General */}
      <div className="mb-6">
        <h3 className="font-bold text-sm text-gray-900 mb-3">Información General</h3>
        <Card className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Año del Plan</p>
              <p className="font-bold text-gray-900">{año}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Jefe OCI</p>
              <p className="font-bold text-gray-900">{jefeOCI.nombre}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Desglose por Rol */}
      <div>
        <h3 className="font-bold text-sm text-gray-900 mb-3">Desglose por Rol del Decreto 648</h3>
        <div className="space-y-3">
          {roles.map((rol) => (
            <Card
              key={rol.id}
              className="p-4 border-l-4"
              style={{ borderLeftColor: rol.color }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rol.icono}</span>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{rol.nombre}</p>
                    <p className="text-xs text-gray-600">{rol.actividades.length} actividades</p>
                  </div>
                </div>
                {rol.actividades.length > 0 ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
              </div>

              {rol.actividades.length > 0 && (
                <div className="mt-3 space-y-2">
                  {rol.actividades.map((act) => (
                    <div key={act.id} className="text-xs bg-gray-50 p-2 rounded">
                      <p className="font-semibold text-gray-900">{act.nombre}</p>
                      <p className="text-gray-600 mt-1">
                        👤 {act.responsableNombre} • 📅 {act.fechaInicio} - {act.fechaFin}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </Card>
  );
}

// ============ DETALLE DEL PLAN ============

interface DetallePlanAnualProps {
  plan: PlanAnual;
  onVolver: () => void;
  onEditar: () => void;
  onAprobar: () => void;
  onExportarPDF: () => void;
  onExportarExcel: () => void;
}

function DetallePlanAnual({ plan, onVolver, onEditar, onAprobar, onExportarPDF, onExportarExcel }: DetallePlanAnualProps) {
  // Estado para las pestañas
  const [tabActiva, setTabActiva] = useState<'detalle' | 'indicadores'>('detalle');
  const [indicadores, setIndicadores] = useState<any>(null);
  const [loadingIndicadores, setLoadingIndicadores] = useState(false);
  
  // Obtener datos del usuario actual
  const userData = localStorage.getItem('esap_user_data');
  const currentUser = userData ? JSON.parse(userData) : null;
  
  // Verificar si el usuario actual es Jefe OCI o Admin
  const puedeAprobar = currentUser?.roles?.some((role: any) => {
    const roleCode = role.code || '';
    const roleName = role.name || '';
    return (
      roleCode === 'Jefe OCI' || 
      roleName.includes('Jefe OCI') ||
      roleCode === 'ADMIN' ||
      roleCode === 'admin' ||
      roleCode === 'administrator'
    );
  }) || false;

  // Cargar indicadores cuando se activa la tab
  useEffect(() => {
    if (tabActiva === 'indicadores' && !indicadores) {
      cargarIndicadores();
    }
  }, [tabActiva]);

  const cargarIndicadores = async () => {
    setLoadingIndicadores(true);
    try {
      const response = await planAnual5RolesApi.getIndicadores(plan.id);
      if (response.success && response.data) {
        setIndicadores(response.data);
      } else {
        toast.error('Error al cargar indicadores');
      }
    } catch (error) {
      console.error('Error cargando indicadores:', error);
      toast.error('Error al cargar indicadores');
    } finally {
      setLoadingIndicadores(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* ACCIONES */}
      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={onVolver} className="gap-2" size="sm">
          <ChevronLeft className="w-4 h-4" />
          Volver
        </Button>
        <Button variant="outline" onClick={onExportarPDF} className="gap-2" size="sm">
          <FileText className="w-4 h-4" />
          PDF
        </Button>
        <Button variant="outline" onClick={onExportarExcel} className="gap-2" size="sm">
          <FileSpreadsheet className="w-4 h-4" />
          Excel
        </Button>
        {authService.hasPermission(Permissions.CONTROL_INTERNO_PLANEACION_PLAN_EDIT) && (
        <Button variant="outline" onClick={onEditar} className="gap-2" size="sm">
          <Edit className="w-4 h-4" />
          Editar
        </Button>
        )}
        {puedeAprobar && (
        <Button
          variant="outline"
          onClick={onAprobar}
          className="gap-2"
          size="sm"
          disabled={plan.estado !== 'En Revisión'}
        >
          <Check className="w-4 h-4" />
          Aprobar
        </Button>
        )}
      </div>

      {/* ✅ NUEVO: BADGE CUMPLIMIENTO DECRETO 648/2017 */}
      <BadgeDecreto648Completo plan={plan} />

      {/* ESTADO Y JEFE OCI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6">
          <h3 className="font-bold text-sm text-gray-900 mb-4">Estado del Plan</h3>
          <Badge
            className={`text-sm px-3 py-1 ${
              plan.estado === 'Aprobado'
                ? 'bg-green-100 text-green-800'
                : plan.estado === 'En Revisión'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" />
              <span>Detalle</span>
            </div>
          </Badge>
          <button
            onClick={() => setTabActiva('indicadores')}
            className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              tabActiva === 'indicadores'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <BarChart3 className="w-4 h-4" />
              <span>Indicadores</span>
            </div>
          </button>
        </div>
      </div>

      {/* CONTENIDO DE LAS TABS */}
      {tabActiva === 'detalle' && (
        <div className="space-y-4 md:space-y-6">
          {/* ESTADO Y JEFE OCI */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="font-bold text-sm text-gray-900 mb-4">Estado del Plan</h3>
              <Badge
                className={`text-sm px-3 py-1 ${
                  plan.estado === 'Aprobado'
                    ? 'bg-green-100 text-green-800'
                    : plan.estado === 'En Revisión'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {plan.estado}
              </Badge>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold text-sm text-gray-900 mb-4">Jefe OCI Responsable</h3>
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback style={{ background: '#003DA5', color: 'white' }}>
                    {plan.jefeOCI.nombre.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-sm text-gray-900">{plan.jefeOCI.nombre}</p>
                  <p className="text-xs text-gray-600">{plan.jefeOCI.cargo}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* ROLES Y ACTIVIDADES */}
          <Card className="p-6">
            <h3 className="font-bold text-lg text-gray-900 mb-6">
              Roles del Decreto 648/2017
            </h3>

            <div className="space-y-6">
              {[...plan.roles].sort((a, b) => a.numero - b.numero).map((rol) => (
            <div key={rol.id} className="border-l-4 pl-4" style={{ borderLeftColor: rol.color }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{rol.icono}</span>
                <div>
                  <h4 className="font-black text-sm text-gray-900">{rol.nombre}</h4>
                  <p className="text-xs text-gray-600">{rol.descripcion}</p>
                </div>
              </div>

              <div className="space-y-2">
                {rol.actividades.map((act) => {
                  // Detectar si es un informe vinculado
                  const esInformeVinculado = act.nombre?.includes('Informe de Ley:');
                  let informeData: {
                    nombre?: string;
                    codigo?: string;
                    aprobadoPor?: string;
                    fechaAprobacion?: string;
                    archivoUrl?: string;
                    observaciones?: string;
                  } | null = null;

                  if (esInformeVinculado && act.descripcion) {
                    // Extraer información del informe desde la descripción
                    const descripcion = act.descripcion;
                    const codigoMatch = descripcion.match(/Código:\s*(.+)/);
                    const aprobadoPorMatch = descripcion.match(/Aprobado por:\s*(.+)/);
                    const fechaAprobacionMatch = descripcion.match(/Fecha de aprobación:\s*(.+)/);
                    const archivoMatch = descripcion.match(/Archivo:\s*(.+)/);
                    const observacionesMatch = descripcion.match(/Observaciones:\s*(.+)/);

                    informeData = {
                      nombre: act.nombre.replace('Informe de Ley: ', ''),
                      codigo: codigoMatch?.[1]?.trim(),
                      aprobadoPor: aprobadoPorMatch?.[1]?.trim(),
                      fechaAprobacion: fechaAprobacionMatch?.[1]?.trim(),
                      archivoUrl: archivoMatch?.[1]?.trim(),
                      observaciones: observacionesMatch?.[1]?.trim(),
                    };
                  }

                  const handleDescargarArchivo = async () => {
                    if (!informeData?.archivoUrl) return;

                    try {
                      // Extraer el nombre del archivo de la URL
                      const nombreArchivo = informeData.archivoUrl.split('/').pop() || informeData.archivoUrl;
                      
                      // Construir la URL del endpoint de descarga
                      let apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3007';
                      if (apiBaseUrl.includes('/control-institucional')) {
                        apiBaseUrl = `${apiBaseUrl}/api/v1`;
                      } else if (!apiBaseUrl.includes('/api/v1') && !apiBaseUrl.includes('localhost')) {
                        apiBaseUrl = `${apiBaseUrl}/control-institucional/api/v1`;
                      }
                      const urlDescarga = `${apiBaseUrl}/informes-ley/archivos/${encodeURIComponent(nombreArchivo)}`;

                      // Descargar el archivo
                      const response = await fetch(urlDescarga, {
                        method: 'GET',
                        headers: {
                          'Authorization': `Bearer ${localStorage.getItem('esap_auth_token')}`,
                        },
                      });

                      if (!response.ok) {
                        throw new Error('Error al descargar el archivo');
                      }

                      const blob = await response.blob();
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = nombreArchivo;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);

                      toast.success('Archivo descargado exitosamente');
                    } catch (error) {
                      console.error('Error descargando archivo:', error);
                      toast.error('Error al descargar el archivo', {
                        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
                      });
                    }
                  };

                  return (
                    <Card key={act.id} className="p-4 bg-gray-50">
                      <h5 className="font-bold text-sm text-gray-900 mb-2">{act.nombre}</h5>
                      
                      {esInformeVinculado && informeData ? (
                        <div className="space-y-3 mb-3">
                          <div className="bg-white rounded-lg border border-gray-200 p-3">
                            <div className="space-y-2 text-xs">
                              {informeData.codigo && (
                                <p className="text-gray-700">
                                  <span className="font-semibold">Código:</span> {informeData.codigo}
                                </p>
                              )}
                              {informeData.aprobadoPor && (
                                <p className="text-gray-700">
                                  <span className="font-semibold">Aprobado por:</span> {informeData.aprobadoPor}
                                </p>
                              )}
                              {informeData.fechaAprobacion && (
                                <p className="text-gray-700">
                                  <span className="font-semibold">Fecha de aprobación:</span> {informeData.fechaAprobacion}
                                </p>
                              )}
                              {informeData.archivoUrl && (
                                <div className="flex items-center gap-2 pt-2">
                                  <span className="font-semibold text-gray-700">Archivo:</span>
                                  <Button
                                    onClick={handleDescargarArchivo}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1"
                                  >
                                    <Download className="w-3 h-3" />
                                    Descargar PDF
                                  </Button>
                                </div>
                              )}
                              {informeData.observaciones && (
                                <p className="text-gray-700 pt-2 border-t border-gray-200">
                                  <span className="font-semibold">Observaciones:</span> {informeData.observaciones}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : act.descripcion ? (
                        <p className="text-xs text-gray-600 mb-3">{act.descripcion}</p>
                      ) : null}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>👤 {act.responsableNombre}</span>
                        <span>📅 {act.fechaInicio} - {act.fechaFin}</span>
                        <Badge
                          className={`ml-auto ${
                            act.estado === 'Completada'
                              ? 'bg-green-100 text-green-800'
                              : act.estado === 'En Ejecución'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {act.estado}
                        </Badge>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
        </div>
      )}

      {/* TAB DE INDICADORES (US-003) */}
      {tabActiva === 'indicadores' && plan.id && (
        <div className="space-y-4 md:space-y-6">
          {loadingIndicadores ? (
            <Card className="p-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600">Cargando indicadores...</p>
              </div>
            </Card>
          ) : indicadores ? (
            <>
              {/* INDICADORES GENERALES */}
              <Card className="p-6">
                <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  Indicadores Generales del Plan Anual {plan.año}
                </h3>
                
                {/* Actividades del Plan */}
                <div className="mb-6">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">📋 Actividades del Plan</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {indicadores.actividades.total}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {indicadores.actividades.completadas}
                      </div>
                      <div className="text-xs text-gray-600">Completadas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600 mb-1">
                        {indicadores.actividades.enProgreso}
                      </div>
                      <div className="text-xs text-gray-600">En Progreso</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-600 mb-1">
                        {indicadores.actividades.pendientes}
                      </div>
                      <div className="text-xs text-gray-600">Pendientes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-red-600 mb-1">
                        {indicadores.actividades.retrasadas}
                      </div>
                      <div className="text-xs text-gray-600">Retrasadas</div>
                    </div>
                  </div>
                </div>

                {/* Auditorías */}
                <div className="mb-6">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">🔍 Auditorías</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {indicadores.auditorias.total}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {indicadores.auditorias.completadas}
                      </div>
                      <div className="text-xs text-gray-600">Completadas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600 mb-1">
                        {indicadores.auditorias.enEjecucion}
                      </div>
                      <div className="text-xs text-gray-600">En Ejecución</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-600 mb-1">
                        {indicadores.auditorias.pendientes}
                      </div>
                      <div className="text-xs text-gray-600">Pendientes</div>
                    </div>
                  </div>
                </div>

                {/* Informes */}
                <div className="mb-6">
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">📄 Informes de Ley</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {indicadores.informes.total}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {indicadores.informes.aprobados}
                      </div>
                      <div className="text-xs text-gray-600">Aprobados</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600 mb-1">
                        {indicadores.informes.enProceso}
                      </div>
                      <div className="text-xs text-gray-600">En Proceso</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-gray-600 mb-1">
                        {indicadores.informes.pendientes}
                      </div>
                      <div className="text-xs text-gray-600">Pendientes</div>
                    </div>
                  </div>
                </div>

                {/* Hallazgos */}
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 mb-3">⚠️ Hallazgos</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-1">
                        {indicadores.hallazgos.total}
                      </div>
                      <div className="text-xs text-gray-600">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-yellow-600 mb-1">
                        {indicadores.hallazgos.abiertos}
                      </div>
                      <div className="text-xs text-gray-600">Abiertos</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-1">
                        {indicadores.hallazgos.cerrados}
                      </div>
                      <div className="text-xs text-gray-600">Cerrados</div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* INDICADORES POR ROL */}
              <Card className="p-6">
                <h3 className="font-bold text-lg text-gray-900 mb-6 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Indicadores por Rol del Decreto 648
                </h3>
                <div className="space-y-4">
                  {indicadores.indicadoresPorRol.map((rolIndicador: any) => {
                    const rolTemplate = ROLES_DECRETO_648.find(r => r.id === rolIndicador.rolNumero);
                    return (
                      <Card key={rolIndicador.rolId} className="p-4 bg-gray-50">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-2xl">{rolTemplate?.icono}</span>
                          <div className="flex-1">
                            <h4 className="font-bold text-sm text-gray-900">{rolIndicador.rolNombre}</h4>
                            <div className="flex items-center gap-4 mt-2 text-xs flex-wrap">
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                                <span className="text-gray-600">Total: <span className="font-bold">{rolIndicador.totalActividades}</span></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-green-600"></div>
                                <span className="text-gray-600">Completadas: <span className="font-bold">{rolIndicador.actividadesCompletadas}</span></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-yellow-600"></div>
                                <span className="text-gray-600">En Progreso: <span className="font-bold">{rolIndicador.actividadesEnProgreso}</span></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                                <span className="text-gray-600">Pendientes: <span className="font-bold">{rolIndicador.actividadesPendientes}</span></span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-red-600"></div>
                                <span className="text-gray-600">Retrasadas: <span className="font-bold">{rolIndicador.actividadesRetrasadas}</span></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Card>

              {/* INFORMACIÓN ADICIONAL */}
              <Card className="p-4 bg-blue-50 border-l-4 border-l-blue-600">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-gray-700">
                    <p className="font-semibold mb-1">US-003: Cálculo Automático de Indicadores</p>
                    <p>Los indicadores se calculan automáticamente basándose en el estado de las actividades del Plan Anual. Los datos se actualizan en tiempo real.</p>
                    <p className="mt-2 text-gray-500">Última actualización: {new Date(indicadores.fechaConsulta).toLocaleString('es-CO')}</p>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="p-6">
              <div className="text-center py-8">
                <AlertCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  No se pudieron cargar los indicadores
                </h3>
                <Button
                  onClick={cargarIndicadores}
                  className="gap-2 mt-4"
                  style={{ background: '#003DA5' }}
                >
                  <Activity className="w-4 h-4" />
                  Reintentar
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ============ MODAL DE APROBACIÓN ============

interface ModalAprobacionPlanProps {
  plan: PlanAnual;
  onCerrar: () => void;
  onAprobar: () => void;
}

function ModalAprobacionPlan({ plan, onCerrar, onAprobar }: ModalAprobacionPlanProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="p-6 sm:p-8 md:p-10 lg:p-12 max-w-2xl w-full">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
            className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-green-100 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
          </motion.div>

          <h2 className="text-xl sm:text-2xl font-black text-gray-900 mb-2 sm:mb-3">
            Aprobar Plan Anual {plan.año}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8">
            ¿Estás seguro de que deseas aprobar este Plan Anual? Una vez aprobado, no se podrán hacer cambios.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button
              variant="outline"
              onClick={onCerrar}
              size="lg"
              className="gap-2 w-full sm:w-auto"
            >
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              onClick={onAprobar}
              size="lg"
              className="gap-2 w-full sm:w-auto"
              style={{ background: '#003DA5' }}
            >
              <Check className="w-4 h-4" />
              Aprobar Plan
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}