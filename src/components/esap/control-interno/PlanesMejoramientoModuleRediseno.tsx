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

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileText, AlertTriangle, Target, Users, Calendar, Clock,
  ChevronDown, CheckCircle2, Plus, Eye, Send, Edit2, Trash2, 
  Save, Download, X, AlertCircle, CheckSquare, ArrowLeft, Search,
  BarChart3, ClipboardCheck, FileCheck, Building2, Activity, 
  Info, List, LayoutGrid, GripVertical, ArrowRight, Filter,
  TrendingUp, Flag, Circle, Maximize2, Minimize2, Zap, Award,
  PlayCircle, PauseCircle, AlertOctagon, HelpCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

// Design System
import { ModalSIGL } from '../gestion-legal/design-system/ModalSIGL';
import { HeaderModuloCIG } from './HeaderModuloCIG';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { ModalDetallePlanMejoramiento } from './ModalDetallePlanMejoramiento';

// Integración
import { useIntegracionAuditoriaPlanes } from './IntegracionAuditoriasPlanesContext';

// API
import { planesMejoramientoApi, auditoriasApi, hallazgosApi } from './services/api';
import type { PlanMejoramiento as PlanMejoramientoBD, AccionMejoramiento } from './services/types';
import * as tablerosKanbanService from '../../../services/tableros-kanban.service';
import type { EtapaKanban } from '../../../services/tableros-kanban.service';

// Notificaciones
import { useCrearNotificacion } from './hooks/useCrearNotificacion';
import { useAuth } from '../../../hooks/useAuth';
import { authService } from '../../../services/api/authService';
import { Permissions } from '../../../enums/permissions';

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type EstadoPlan = 'FORMULACION' | 'APROBADO' | 'EN_EJECUCION' | 'CON_RETRASO' | 'COMPLETADO' | 'SUSPENDIDO';
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

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE MAPEO BD ↔ FRONTEND
// ════════════════════════════════════════════════════════════════════════════

/**
 * Mapea el nombre de una etapa del tablero Kanban (desde BD) al estado del frontend
 * 
 * IMPORTANTE: Los nombres deben coincidir exactamente con los definidos en:
 * - db/migrations/090_seed_tableros_kanban.sql
 * - ConfiguracionKanbanModule.tsx
 * 
 * Etapas esperadas para Planes de Mejoramiento:
 * - "Formulación" → FORMULACION
 * - "Aprobación" → APROBADO
 * - "En Ejecución" → EN_EJECUCION
 * - "En Seguimiento" → EN_EJECUCION (etapa especial, filtrada por avance > 50%)
 * - "Cumplido" → COMPLETADO
 */
function mapearNombreEtapaAEstado(nombreEtapa: string): EstadoPlan {
  const nombreLower = nombreEtapa.toLowerCase().trim();
  
  // Mapeo exacto según los nombres de las etapas en la BD
  // Formulación
  if (nombreLower === 'formulación' || nombreLower === 'formulacion' || nombreLower.includes('formulaci')) {
    return 'FORMULACION';
  }
  
  // Aprobación
  if (nombreLower === 'aprobación' || nombreLower === 'aprobacion' || nombreLower.includes('aprobaci')) {
    return 'APROBADO';
  }
  
  // En Ejecución (etapa normal)
  if (nombreLower === 'en ejecución' || nombreLower === 'en ejecucion' || nombreLower.includes('ejecuci')) {
    return 'EN_EJECUCION';
  }
  
  // En Seguimiento (etapa especial - muestra planes en ejecución con avance > 50%)
  // Esta etapa NO cambia el estado, solo filtra visualmente
  // Se maneja en la lógica de filtrado de VistaKanban
  if (nombreLower === 'en seguimiento' || nombreLower === 'seguimiento' || nombreLower.includes('seguimiento')) {
    return 'EN_EJECUCION'; // Mantiene el estado EN_EJECUCION, el filtrado se hace por porcentaje
  }
  
  // Cumplido
  if (nombreLower === 'cumplido' || nombreLower.includes('completado') || nombreLower.includes('finalizado')) {
    return 'COMPLETADO';
  }
  
  // Estados adicionales (no están en el tablero por defecto pero pueden existir)
  if (nombreLower.includes('retraso') || nombreLower.includes('vencido')) {
    return 'CON_RETRASO';
  }
  
  if (nombreLower.includes('suspendido') || nombreLower.includes('rechazado')) {
    return 'SUSPENDIDO';
  }
  
  // Por defecto, mapear a FORMULACION (etapa inicial)
  return 'FORMULACION';
}

/**
 * Mapea el estado del backend al estado del frontend
 */
function mapearEstadoBD(estadoBD: string, fechaFin?: string, porcentajeAvance?: number): EstadoPlan {
  // Si el estado es vencido, siempre mapear a CON_RETRASO
  if (estadoBD === 'vencido') {
    return 'CON_RETRASO';
  }
  
  // Si el estado es en_ejecucion, verificar si está vencido para mapear a CON_RETRASO
  if (estadoBD === 'en_ejecucion') {
    if (fechaFin) {
      const hoy = new Date();
      const fin = new Date(fechaFin);
      const diasRestantes = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
      // Si está vencido (días restantes negativos) o muy cerca de vencer con bajo avance
      if (diasRestantes < 0 || (diasRestantes <= 30 && porcentajeAvance && porcentajeAvance < 50)) {
        return 'CON_RETRASO';
      }
    }
    return 'EN_EJECUCION';
  }
  
  switch (estadoBD) {
    case 'borrador':
      return 'FORMULACION';
    case 'revision':
      return 'FORMULACION'; // REVISION se mapea a FORMULACION en el frontend
    case 'aprobado':
      return 'APROBADO';
    case 'completado':
      return 'COMPLETADO';
    case 'rechazado':
      return 'SUSPENDIDO'; // RECHAZADO se mapea a SUSPENDIDO en el frontend (temporalmente)
    default:
      return 'FORMULACION';
  }
}

/**
 * Mapea el estado del frontend al estado del backend
 */
function mapearEstadoFrontend(estado: EstadoPlan): 'borrador' | 'revision' | 'aprobado' | 'en_ejecucion' | 'completado' | 'vencido' | 'rechazado' {
  switch (estado) {
    case 'FORMULACION':
      return 'borrador';
    case 'APROBADO':
      return 'aprobado';
    case 'EN_EJECUCION':
      return 'en_ejecucion';
    case 'CON_RETRASO':
      return 'vencido'; // CON_RETRASO se mapea a vencido en el backend
    case 'COMPLETADO':
      return 'completado';
    case 'SUSPENDIDO':
      return 'rechazado'; // SUSPENDIDO se mapea a rechazado en el backend (temporalmente)
    default:
      return 'borrador';
  }
}

/**
 * Calcula el semáforo basado en días restantes y porcentaje de avance
 */
function calcularSemaforo(diasRestantes: number, porcentajeAvance: number, fechaFin: string): SemaforoPlan {
  const hoy = new Date();
  const fin = new Date(fechaFin);
  const dias = Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  
  if (dias < 0) return 'rojo'; // Vencido
  if (dias <= 30) return 'amarillo'; // Próximo a vencer
  if (porcentajeAvance < 50 && dias <= 60) return 'amarillo'; // Bajo avance y poco tiempo
  return 'verde'; // En término
}

/**
 * Calcula días restantes hasta la fecha fin
 */
function calcularDiasRestantes(fechaFin: string): number {
  const hoy = new Date();
  const fin = new Date(fechaFin);
  const diff = fin.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calcula alertas basado en acciones vencidas o próximas a vencer
 */
function calcularAlertas(acciones: AccionMejoramiento[]): number {
  const hoy = new Date();
  let alertas = 0;
  
  acciones.forEach(accion => {
    const fechaFin = new Date(accion.fechaFin);
    const diasRestantes = Math.ceil((fechaFin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    
    // Si está vencida y no completada
    if (diasRestantes < 0 && accion.estado !== 'completada') {
      alertas++;
    }
    // Si está próxima a vencer (menos de 7 días) y no completada
    else if (diasRestantes <= 7 && diasRestantes >= 0 && accion.estado !== 'completada') {
      alertas++;
    }
  });
  
  return alertas;
}

/**
 * Convierte un PlanMejoramiento de BD a la estructura del frontend
 */
function mapearPlanDesdeBD(planBD: PlanMejoramientoBD): PlanMejoramiento {
  const acciones = planBD.acciones || [];
  const totalAcciones = acciones.length;
  const accionesCompletadas = acciones.filter(a => a.estado === 'completada').length;
  const accionesEnProceso = acciones.filter(a => a.estado === 'en-ejecucion').length;
  const accionesPendientes = acciones.filter(a => a.estado === 'programada').length;
  
  // Función auxiliar para validar y crear fecha válida
  const crearFechaValida = (fechaString: string | null | undefined, fechaDefault?: Date): Date => {
    if (!fechaString) {
      return fechaDefault || new Date();
    }
    const fecha = new Date(fechaString);
    if (isNaN(fecha.getTime())) {
      return fechaDefault || new Date();
    }
    return fecha;
  };
  
  // Calcular fecha fin (usar la fecha más lejana de las acciones, o fechaElaboracion + 1 año)
  const fechaElaboracionValida = crearFechaValida(planBD.fechaElaboracion || planBD.fechaCreacion);
  let fechaFin = new Date(fechaElaboracionValida);
  fechaFin.setFullYear(fechaFin.getFullYear() + 1);
  
  if (acciones.length > 0) {
    const fechasFinValidas = acciones
      .map(a => crearFechaValida(a.fechaFin))
      .filter(f => !isNaN(f.getTime()));
    
    if (fechasFinValidas.length > 0) {
      const fechaMax = new Date(Math.max(...fechasFinValidas.map(d => d.getTime())));
      if (!isNaN(fechaMax.getTime()) && fechaMax > fechaFin) {
        fechaFin = fechaMax;
      }
    }
  }
  
  // Asegurar que fechaFin sea válida antes de convertir a ISO
  if (isNaN(fechaFin.getTime())) {
    fechaFin = new Date();
    fechaFin.setFullYear(fechaFin.getFullYear() + 1);
  }
  
  // Usar fechaLimite del plan si existe, de lo contrario usar fechaFin calculada
  const fechaLimitePlan = (planBD as any).fechaLimite;
  const fechaLimiteValida = fechaLimitePlan ? crearFechaValida(fechaLimitePlan) : null;
  const fechaFinFinal = fechaLimiteValida && !isNaN(fechaLimiteValida.getTime()) 
    ? fechaLimiteValida 
    : fechaFin;
  
  const fechaFinISO = fechaFinFinal.toISOString().split('T')[0];
  const diasRestantes = calcularDiasRestantes(fechaFinISO);
  
  // Calcular porcentaje de avance: SIEMPRE calcular basado en las acciones si hay acciones
  // El porcentajeAvanceGeneral puede estar desactualizado, así que lo recalculamos
  let porcentajeAvance = 0;
  
  if (acciones.length > 0) {
    // Calcular el promedio del porcentaje de avance de todas las acciones
    const sumaAvances = acciones.reduce((sum, accion) => {
      const avanceAccion = accion.porcentajeAvance || 0;
      return sum + avanceAccion;
    }, 0);
    porcentajeAvance = Math.round(sumaAvances / acciones.length);
  } 
  // Si no hay acciones pero hay porcentajeAvanceGeneral, usarlo como fallback
  else if (planBD.porcentajeAvanceGeneral !== null && planBD.porcentajeAvanceGeneral !== undefined) {
    porcentajeAvance = planBD.porcentajeAvanceGeneral;
  }
  
  const semaforo = calcularSemaforo(diasRestantes, porcentajeAvance, fechaFinISO);
  const alertas = calcularAlertas(acciones);

  // Validar y formatear fechas para el retorno
  const fechaCreacionValida = crearFechaValida(planBD.fechaElaboracion || planBD.fechaCreacion);
  const fechaCreacionISO = fechaCreacionValida.toISOString().split('T')[0];

  const fechaAprobacionValida = planBD.fechaAprobacion ? crearFechaValida(planBD.fechaAprobacion) : null;
  const fechaAprobacionISO = fechaAprobacionValida && !isNaN(fechaAprobacionValida.getTime()) 
    ? fechaAprobacionValida.toISOString().split('T')[0] 
    : undefined;

  const fechaActualizacionValida = crearFechaValida(planBD.fechaActualizacion || planBD.fechaCreacion || planBD.fechaElaboracion);
  const fechaActualizacionISO = fechaActualizacionValida.toISOString().split('T')[0];

  // Extraer area y responsable del plan o de la auditoría anidada
  const areaResponsable = (planBD as any).areaResponsable || (planBD.auditoria as any)?.areaObjetivo || '';
  const responsableArea = (planBD.auditoria as any)?.responsableAreaNombre || planBD.responsable || (planBD as any).responsableImplementacion || '';
  const cargoResponsable = (planBD.auditoria as any)?.responsableAreaCargo || '';

  // Contar hallazgos: puede venir como hallazgosIds (array), desde la auditoría, o hallazgoId (singular)
  let totalHallazgos = 0;
  
  // PRIORIDAD 1: Intentar desde hallazgosIds (array) - más preciso
  if (planBD.hallazgosIds && planBD.hallazgosIds.length > 0) {
    totalHallazgos = planBD.hallazgosIds.length;
  } 
  // PRIORIDAD 2: Intentar desde la auditoría anidada (puede ser número o array) - más completo
  // Un plan puede tener un hallazgoId específico, pero la auditoría tiene múltiples hallazgos
  else if ((planBD.auditoria as any)?.hallazgos !== undefined) {
    const hallazgosAuditoria = (planBD.auditoria as any).hallazgos;
    if (typeof hallazgosAuditoria === 'number') {
      // Si es un número (contador)
      totalHallazgos = hallazgosAuditoria;
    } else if (Array.isArray(hallazgosAuditoria)) {
      // Si es un array
      totalHallazgos = hallazgosAuditoria.length;
    }
  }
  // PRIORIDAD 3: Intentar desde hallazgoId (singular) - último recurso
  // Solo usar esto si no hay información de la auditoría
  else if ((planBD as any).hallazgoId) {
    totalHallazgos = 1;
  }

  const estadoMapeado = mapearEstadoBD(planBD.estado, fechaFinISO, porcentajeAvance);
  
  return {
    id: planBD.id,
    codigo: planBD.codigo,
    auditoria: planBD.auditoriaCodigo || planBD.nombre || 'Auditoría sin código',
    area: areaResponsable,
    responsable: responsableArea,
    cargoResponsable: cargoResponsable,
    fechaCreacion: fechaCreacionISO,
    fechaAprobacion: fechaAprobacionISO,
    fechaInicio: fechaAprobacionISO, // Usar fechaAprobacion como inicio
    fechaFin: fechaFinISO,
    estado: estadoMapeado,
    semaforo,
    totalHallazgos,
    totalAcciones,
    accionesCompletadas,
    accionesEnProceso,
    accionesPendientes,
    porcentajeAvance,
    hallazgosCriticos: 0, // Se calcularía desde los hallazgos si se cargan
    hallazgosModerados: 0,
    hallazgosLeves: 0,
    ultimaActualizacion: fechaActualizacionISO,
    alertas,
    diasRestantes
  };
}

/**
 * Convierte un PlanMejoramiento del frontend a la estructura de BD
 */
function mapearPlanABD(plan: PlanMejoramiento, auditoriaId?: string, auditoriaCodigo?: string): Partial<PlanMejoramientoBD> {
  return {
    codigo: plan.codigo,
    nombre: plan.auditoria,
    auditoriaId: auditoriaId || '',
    auditoriaCodigo: auditoriaCodigo || plan.auditoria,
    responsable: plan.responsable,
    fechaElaboracion: plan.fechaCreacion,
    fechaAprobacion: plan.fechaAprobacion,
    estado: mapearEstadoFrontend(plan.estado),
    porcentajeAvanceGeneral: plan.porcentajeAvance,
    observaciones: ''
  };
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

// Configuración de columnas Kanban (fallback por defecto)
const COLUMNAS_KANBAN_DEFAULT = [
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
  // Hooks para notificaciones
  const { notificarPlanMejoramientoCreado } = useCrearNotificacion();
  const { user } = useAuth();

  const [planes, setPlanes] = useState<PlanMejoramiento[]>([]);
  const [modalCrearPlanOpen, setModalCrearPlanOpen] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<'seguimiento' | 'soporte'>('seguimiento');
  const [etapasKanban, setEtapasKanban] = useState<EtapaKanban[]>([]);
  const [columnasKanban, setColumnasKanban] = useState(COLUMNAS_KANBAN_DEFAULT);

  // Integración con Auditorías
  const { 
    auditoriaSeleccionada, 
    limpiarSeleccion,
    auditoriasConHallazgos,
    agregarAuditoriaConHallazgos,
    limpiarAuditoriasConHallazgos,
    navegarAFormulacion,
    setNavegarAFormulacion,
    crearPlan
  } = useIntegracionAuditoriaPlanes();

  // Función para mapear etapa a icono basado en el nombre
  const obtenerIconoEtapa = (nombre: string) => {
    const nombreLower = nombre.toLowerCase();
    if (nombreLower.includes('formulaci') || nombreLower.includes('formulacion')) {
      return <ClipboardCheck className="w-4 h-4" style={{ color: '#9333ea' }} />;
    } else if (nombreLower.includes('aprobad')) {
      return <CheckSquare className="w-4 h-4" style={{ color: '#3b82f6' }} />;
    } else if (nombreLower.includes('ejecuci') || nombreLower.includes('ejecucion')) {
      return <PlayCircle className="w-4 h-4" style={{ color: '#10b981' }} />;
    } else if (nombreLower.includes('retraso')) {
      return <AlertOctagon className="w-4 h-4" style={{ color: '#f97316' }} />;
    } else if (nombreLower.includes('completad') || nombreLower.includes('finalizad')) {
      return <CheckCircle2 className="w-4 h-4" style={{ color: '#10b981' }} />;
    } else if (nombreLower.includes('suspendid')) {
      return <PauseCircle className="w-4 h-4" style={{ color: '#6b7280' }} />;
    }
    return <Circle className="w-4 h-4" style={{ color: '#6b7280' }} />;
  };

  // Función para mapear etapa a colores
  const obtenerColoresEtapa = (nombre: string) => {
    const nombreLower = nombre.toLowerCase();
    if (nombreLower.includes('formulaci') || nombreLower.includes('formulacion')) {
      return { color: '#9333ea', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' };
    } else if (nombreLower.includes('aprobad')) {
      return { color: '#3b82f6', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' };
    } else if (nombreLower.includes('ejecuci') || nombreLower.includes('ejecucion')) {
      return { color: '#10b981', bgColor: 'bg-green-50', borderColor: 'border-green-200' };
    } else if (nombreLower.includes('retraso')) {
      return { color: '#f97316', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' };
    } else if (nombreLower.includes('completad') || nombreLower.includes('finalizad')) {
      return { color: '#10b981', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200' };
    } else if (nombreLower.includes('suspendid')) {
      return { color: '#6b7280', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
    }
    return { color: '#6b7280', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' };
  };

  // Cargar etapas del tablero Kanban desde la BD
  const cargarEtapasKanban = async () => {
    try {
      const tableros = await tablerosKanbanService.cargarTablerosKanban();
      const tableroPlanesM = tableros.find(
        (t: any) => t.tipo === 'planes_mejoramiento' && !t.deletedAt
      );
      
      if (tableroPlanesM && tableroPlanesM.etapas) {
        const etapasOrdenadas = [...tableroPlanesM.etapas]
          .filter((e: any) => !e.deletedAt)
          .sort((a: EtapaKanban, b: EtapaKanban) => a.orden - b.orden);
        
        setEtapasKanban(etapasOrdenadas);
        
        // Mapear etapas a formato de columnas
        const columnas = etapasOrdenadas.map((etapa: EtapaKanban) => {
          const colores = obtenerColoresEtapa(etapa.nombre);
          return {
            id: etapa.nombre,
            titulo: etapa.nombre,
            icono: obtenerIconoEtapa(etapa.nombre),
            color: colores.color,
            bgColor: colores.bgColor,
            borderColor: colores.borderColor,
            diasEstimados: etapa.tiempoSLA || 0
          };
        });
        
        setColumnasKanban(columnas);
      } else {
        // Si no hay configuración, usar columnas por defecto
        setColumnasKanban(COLUMNAS_KANBAN_DEFAULT);
      }
    } catch (error) {
      console.error('Error al cargar etapas del tablero Kanban:', error);
      // En caso de error, usar columnas por defecto
      setColumnasKanban(COLUMNAS_KANBAN_DEFAULT);
    }
  };

  // Cargar etapas al montar el componente
  useEffect(() => {
    cargarEtapasKanban();
  }, []);

  // Cargar auditorías finalizadas con hallazgos desde BD
  useEffect(() => {
    const cargarAuditoriasConHallazgos = async () => {
      try {
        // Limpiar datos mock primero
        limpiarAuditoriasConHallazgos();
        
        // Usar getAllKanban() que devuelve las auditorías en el formato del frontend
        const responseKanban = await auditoriasApi.getAllKanban();
        
        if (!responseKanban.success || !responseKanban.data) {
          return;
        }
        
        // Filtrar auditorías finalizadas con el mismo criterio que el botón en Auditorías OCIG
        // auditoria.estado === 'Finalizada' && auditoria.hallazgos > 0
        // Pero también buscaremos hallazgos en BD porque el contador puede no estar actualizado
        const auditoriasFinalizadas = responseKanban.data.filter((aud: any) => {
          const estado = aud.estado || '';
          const hallazgos = aud.hallazgos || 0;
          return estado === 'Finalizada';
        });
        
        if (auditoriasFinalizadas.length === 0) {
          return;
        }
        
        // Obtener todos los hallazgos de una vez y luego filtrar por auditoría
        const responseTodosHallazgos = await hallazgosApi.getAll();
        
        if (!responseTodosHallazgos.success || !responseTodosHallazgos.data) {
          console.error('[PlanesMejoramiento] Error al obtener hallazgos:', responseTodosHallazgos.error);
          return;
        }
        
        
        const auditoriasConHallazgosBD: any[] = [];
        
        // Para cada auditoría finalizada, buscar sus hallazgos en BD
        for (const auditoria of auditoriasFinalizadas) {
          try {
            // Filtrar hallazgos por auditoriaId o código de auditoría
            // Usar comparación más flexible para asegurar que encontremos los hallazgos
            const hallazgosDeAuditoria = responseTodosHallazgos.data.filter((h: any) => {
              // Comparar por ID (UUID)
              const coincideId = h.auditoriaId && auditoria.id && String(h.auditoriaId).toLowerCase() === String(auditoria.id).toLowerCase();
              // Comparar por código
              const coincideCodigo = h.auditoria && auditoria.codigo && String(h.auditoria).trim() === String(auditoria.codigo).trim();
              return coincideId || coincideCodigo;
            });
            
            if (hallazgosDeAuditoria.length > 0) {
              
              // Convertir hallazgos del backend al formato esperado
              const hallazgosMapeados = hallazgosDeAuditoria.map((h: any) => {
                // Mapear gravedad: 'Baja' | 'Media' | 'Alta' | 'Crítica' → 'LEVE' | 'MODERADO' | 'GRAVE'
                let gravedad: 'GRAVE' | 'MODERADO' | 'LEVE' = 'LEVE';
                if (h.gravedad) {
                  const gravedadLower = h.gravedad.toLowerCase();
                  if (gravedadLower === 'alta' || gravedadLower === 'crítica' || gravedadLower === 'critica') {
                    gravedad = 'GRAVE';
                  } else if (gravedadLower === 'media' || gravedadLower === 'moderado' || gravedadLower === 'moderada') {
                    gravedad = 'MODERADO';
                  } else {
                    gravedad = 'LEVE';
                  }
                }

                // El tipo Hallazgo tiene causaRaiz, impacto, recomendacion como strings (no arrays)
                // Convertirlos a arrays para el formato esperado por AuditoriaParaPlan
                const causas = h.causaRaiz ? (h.causaRaiz.includes(';') ? h.causaRaiz.split(';').map((c: string) => c.trim()) : [h.causaRaiz]) : [];
                const efectos = h.impacto ? (h.impacto.includes(';') ? h.impacto.split(';').map((e: string) => e.trim()) : [h.impacto]) : [];
                const recomendaciones = h.recomendacion ? (h.recomendacion.includes(';') ? h.recomendacion.split(';').map((r: string) => r.trim()) : [h.recomendacion]) : [];

                return {
                  id: h.id,
                  titulo: h.titulo || h.descripcion || 'Hallazgo sin título',
                  gravedad,
                  descripcion: h.descripcion || '',
                  causas,
                  efectos,
                  recomendaciones
                };
              });

              // Convertir auditoría al formato AuditoriaParaPlan
              // Nota: En el formato del Kanban, auditorLider puede ser un objeto o un string
              const aud = auditoria as any; // Type assertion para manejar ambos formatos
              const auditorLiderObj = typeof aud.auditorLider === 'object' && aud.auditorLider !== null 
                ? aud.auditorLider as { nombre?: string; cargo?: string }
                : null;
              const auditorLiderStr = typeof aud.auditorLider === 'string' ? aud.auditorLider : '';
              
              const auditoriaParaPlan = {
                id: auditoria.id,
                codigo: auditoria.codigo || '',
                nombre: aud.titulo || auditoria.nombre || '',
                areaResponsable: aud.areaObjetivo || auditoria.territorial || auditoria.sede || '',
                responsable: aud.responsableAreaNombre || auditorLiderObj?.nombre || auditorLiderStr || 'Sin responsable asignado',
                cargo: aud.responsableAreaCargo || auditorLiderObj?.cargo || 'Responsable de Área',
                fechaFinalizacion: auditoria.fechaFin || new Date().toISOString().split('T')[0],
                estadoPlan: 'SIN_PLAN' as const,
                fechaLimitePlan: calcularFechaLimitePlan(auditoria.fechaFin),
                plazoFormulacion: 30,
                hallazgos: hallazgosMapeados
              };

              auditoriasConHallazgosBD.push(auditoriaParaPlan);
            }
          } catch (errorHallazgo) {
            console.error(`[PlanesMejoramiento] Error al cargar hallazgos de auditoría ${auditoria.id}:`, errorHallazgo);
          }
        }
        
        // Agregar todas las auditorías desde BD (ya limpiamos al inicio)
        if (auditoriasConHallazgosBD.length > 0) {
          // Agregar todas las auditorías de BD
          auditoriasConHallazgosBD.forEach(aud => {
            agregarAuditoriaConHallazgos(aud);
          });
          toast.success(`${auditoriasConHallazgosBD.length} auditorías con hallazgos cargadas desde BD`);
        } else {
          console.warn('[PlanesMejoramiento] ⚠️ No se encontraron auditorías finalizadas con hallazgos en BD');
          console.log('[PlanesMejoramiento] Esto puede significar que:');
          console.log('  1. No hay auditorías finalizadas en BD');
          console.log('  2. Las auditorías finalizadas no tienen hallazgos asociados');
          console.log('  3. El estado/fase de las auditorías no coincide con los filtros');
        }
      } catch (error) {
        console.error('[PlanesMejoramiento] ❌ Error al cargar auditorías con hallazgos:', error);
        toast.error('Error al cargar auditorías finalizadas. Revisa la consola para más detalles.');
      }
    };

    // Siempre intentar cargar desde BD al montar el componente
    cargarAuditoriasConHallazgos();
  }, []); // Solo ejecutar una vez al montar

  // Función auxiliar para calcular fecha límite (30 días después)
  const calcularFechaLimitePlan = (fechaFin: string | null | undefined): string => {
    // Validar que la fecha sea válida
    if (!fechaFin) {
      // Si no hay fecha, usar la fecha actual + 30 días
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + 30);
      return fecha.toISOString().split('T')[0];
    }

    // Intentar crear la fecha
    const fecha = new Date(fechaFin);
    
    // Validar que la fecha sea válida
    if (isNaN(fecha.getTime())) {
      // Si la fecha es inválida, usar la fecha actual + 30 días
      const fechaDefault = new Date();
      fechaDefault.setDate(fechaDefault.getDate() + 30);
      return fechaDefault.toISOString().split('T')[0];
    }

    // Si la fecha es válida, agregar 30 días
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().split('T')[0];
  };

  // Cargar planes desde BD
  useEffect(() => {
    const cargarPlanes = async () => {
      try {
        setCargando(true);
        const response = await planesMejoramientoApi.getAll();
        
        if (response.success && response.data) {
          const planesMapeados = response.data.map(planBD => mapearPlanDesdeBD(planBD));
          setPlanes(planesMapeados);
        } else {
          console.warn('[PlanesMejoramiento] No se pudieron cargar planes, usando datos de ejemplo');
          setPlanes(PLANES_EJEMPLO);
        }
      } catch (error) {
        console.error('[PlanesMejoramiento] Error al cargar planes:', error);
        toast.error('Error al cargar planes de mejoramiento');
        // Fallback a datos de ejemplo
        setPlanes(PLANES_EJEMPLO);
      } finally {
        setCargando(false);
      }
    };

    cargarPlanes();
  }, []);

  // Auto-abrir modal si viene desde auditorías
  useEffect(() => {
    if (auditoriaSeleccionada && navegarAFormulacion) {
      setModalCrearPlanOpen(true);
      setNavegarAFormulacion(false);
    }
  }, [auditoriaSeleccionada, navegarAFormulacion, setNavegarAFormulacion]);

  const handleCrearPlanDesdeAuditoria = async (auditoria: any) => {
    if (!auditoria) return;

    try {
      // Obtener el primer hallazgo si existe
      const primerHallazgo = auditoria.hallazgos && auditoria.hallazgos.length > 0 
        ? auditoria.hallazgos[0] 
        : null;

      // Calcular fecha límite (30 días después de la fecha de fin de la auditoría)
      const fechaLimite = calcularFechaLimitePlan(auditoria.fechaFin);
      
      // Asegurar que fechaLimite esté en formato ISO 8601 válido (YYYY-MM-DDTHH:mm:ss.sssZ)
      // El backend espera ISO 8601, pero parseDateOnly puede manejar YYYY-MM-DD
      // Para cumplir con el validador @IsDateString(), usamos formato ISO completo
      const fechaLimiteISO = fechaLimite.includes('T') 
        ? fechaLimite 
        : `${fechaLimite}T00:00:00Z`;

      // Obtener área responsable y responsable de implementación
      const areaResponsable = auditoria.areaResponsable 
        || auditoria.areaObjetivo 
        || auditoria.territorial 
        || auditoria.sede 
        || 'Área no especificada';
      
      const responsableImplementacion = auditoria.responsable 
        || auditoria.responsableAreaNombre 
        || 'Responsable no especificado';

      // Crear plan en BD según el DTO del backend
      const planData = {
        titulo: auditoria.nombre || `Plan de Mejoramiento - ${auditoria.codigo}`,
        descripcion: auditoria.descripcion || `Plan de mejoramiento derivado de la auditoría ${auditoria.codigo}`,
        auditoriaId: auditoria.id,
        hallazgoId: primerHallazgo?.id || undefined,
        hallazgoCodigo: primerHallazgo?.codigo || undefined,
        areaResponsable: areaResponsable,
        responsableImplementacion: responsableImplementacion,
        fechaLimite: fechaLimiteISO,
        objetivos: [`Mejorar los procesos identificados en la auditoría ${auditoria.codigo}`],
        acciones: []
      };

      const response = await planesMejoramientoApi.create(planData);

      if (response.success && response.data) {
        // Mapear el plan desde BD y agregarlo al estado
        const planMapeado = mapearPlanDesdeBD(response.data);
        setPlanes(prev => [planMapeado, ...prev]);

        // ============ NOTIFICACIONES: Plan de Mejoramiento Creado ============
        if (response.success && planMapeado?.id && user?.id) {
          try {
            const codigoPlan = planMapeado.codigo || `PM-${new Date().getFullYear()}-${planMapeado.id.substring(0, 6).toUpperCase()}`;
            const codigoAuditoria = auditoria.codigo || `AUD-${auditoria.id.substring(0, 6).toUpperCase()}`;
            
            await notificarPlanMejoramientoCreado(
              planMapeado.id,
              codigoPlan,
              auditoria.id,
              codigoAuditoria,
              user.id
            );
          } catch (notifError) {
            // No fallar la creación si las notificaciones fallan
            console.error('Error al enviar notificaciones:', notifError);
          }
        }

        // Actualizar contexto
        crearPlan({
          auditoriaId: auditoria.id,
          codigoAuditoria: auditoria.codigo,
          fechaCreacion: planMapeado.fechaCreacion,
          estado: 'EN_FORMULACION',
          accionesCreadas: 0,
          progresoGeneral: 0
        });

        toast.success(`Plan ${planMapeado.codigo || 'creado'} creado exitosamente`);
        setModalCrearPlanOpen(false);
        limpiarSeleccion();
      } else {
        throw new Error(response.error || 'Error al crear el plan');
      }
    } catch (error: any) {
      console.error('[PlanesMejoramiento] Error al crear plan:', error);
      toast.error(`Error al crear plan: ${error.message || 'Error desconocido'}`);
    }
  };
  
  if (cargando) {
    return (
      <div className="min-h-screen bg-gray-50">
        <HeaderModuloCIG
          titulo="Planes de Mejoramiento"
          subtitulo="Control Interno de Gestión"
        />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e5da8] mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando planes de mejoramiento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-gray-50">
        <HeaderModuloCIG
          titulo="Planes de Mejoramiento"
          subtitulo="Control Interno de Gestión"
        />

        {/* Navegación */}
        <div className="bg-white border-b sticky top-0 z-40 shadow-sm">
          <div className="mx-auto px-8 max-w-[1920px]">
            <div className="flex gap-1">
              <TabButton
                active={vistaActiva === 'seguimiento'}
                onClick={() => setVistaActiva('seguimiento')}
                icon={<BarChart3 className="w-4 h-4" />}
                label="Seguimiento de Planes"
                badge={planes.length.toString()}
              />
              <TabButton
                active={vistaActiva === 'soporte'}
                onClick={() => setVistaActiva('soporte')}
                icon={<HelpCircle className="w-4 h-4" />}
                label="Soporte"
              />
            </div>
          </div>
        </div>

        {/* Contenido */}
        <AnimatePresence mode="wait">
          <motion.div
            key={vistaActiva}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {vistaActiva === 'seguimiento' ? (
              <SeguimientoView 
                planes={planes} 
                setPlanes={setPlanes}
                onAbrirCrearPlan={() => setModalCrearPlanOpen(true)}
                auditoriasDisponibles={auditoriasConHallazgos}
                columnasKanban={columnasKanban}
              />
            ) : (
              <SoporteView />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Modal Crear Plan desde Auditoría */}
        {modalCrearPlanOpen && (
          <ModalCrearPlanDesdeAuditoria
            auditoria={auditoriaSeleccionada}
            auditoriasDisponibles={auditoriasConHallazgos}
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
  columnasKanban: any[];
}

function SeguimientoView({ planes, setPlanes, onAbrirCrearPlan, auditoriasDisponibles, columnasKanban }: SeguimientoViewProps) {
  const [vistaTablero, setVistaTablero] = useState<'kanban' | 'lista'>('kanban');
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPlan | 'TODOS'>('TODOS');
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanMejoramiento | null>(null);
  const [columnasColapsadas, setColumnasColapsadas] = useState<Set<string>>(new Set());

  const planesFiltrados = useMemo(() => {
    let resultado = planes;
    
    if (filtroEstado !== 'TODOS') {
      resultado = resultado.filter(p => p.estado === filtroEstado);
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
    const formulacion = planes.filter(p => p.estado === 'FORMULACION').length;
    const aprobados = planes.filter(p => p.estado === 'APROBADO').length;
    const enEjecucion = planes.filter(p => p.estado === 'EN_EJECUCION').length;
    const conRetraso = planes.filter(p => p.estado === 'CON_RETRASO').length;
    const completados = planes.filter(p => p.estado === 'COMPLETADO').length;
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

  const handleMoverPlan = async (planId: string, nuevoEstado: EstadoPlan, nombreEtapa?: string) => {
    try {
      const plan = planes.find(p => p.id === planId);
      if (!plan) {
        toast.error('Plan no encontrado');
        return;
      }

      // Manejar caso especial de "En Seguimiento"
      // "En Seguimiento" es una vista filtrada de EN_EJECUCION con avance > 50%
      const nombreEtapaLower = nombreEtapa?.toLowerCase().trim() || '';
      const esSeguimiento = nombreEtapaLower === 'en seguimiento' || nombreEtapaLower.includes('seguimiento');
      
      if (esSeguimiento && plan.porcentajeAvance <= 50) {
        // Si se mueve a "En Seguimiento" pero el avance es <= 50%, informar al usuario y NO actualizar
        toast.warning(`El plan necesita tener más del 50% de avance para estar en "En Seguimiento". Actualmente tiene ${plan.porcentajeAvance}% de avance. Se mantendrá en "En Ejecución".`);
        // NO actualizar el estado, retornar inmediatamente
        return;
      }

      // Actualizar en BD
      const estadoBD = mapearEstadoFrontend(nuevoEstado);
      const response = await planesMejoramientoApi.update(planId, { estado: estadoBD });

      if (response.success && response.data) {
        // Actualizar estado local con el plan completo desde BD
        const planActualizado = mapearPlanDesdeBD(response.data);
        setPlanes(prev => prev.map(p => 
          p.id === planId ? planActualizado : p
        ));
        
        // Mostrar mensaje apropiado según la etapa
        const nombreMostrar = nombreEtapa || obtenerNombreEstado(nuevoEstado);
        if (nombreMostrar && !esSeguimiento) {
          toast.success(`Plan movido a ${nombreMostrar}`);
        } else if (esSeguimiento && planActualizado.porcentajeAvance > 50) {
          toast.success(`Plan movido a ${nombreMostrar}`);
        } else {
          toast.success('Plan actualizado correctamente');
        }
      } else {
        throw new Error(response.error || 'Error al actualizar el plan');
      }
    } catch (error: any) {
      console.error('[PlanesMejoramiento] Error al mover plan:', error);
      toast.error(`Error al mover plan: ${error.message || 'Error desconocido'}`);
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
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      {/* Header con Métricas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl text-gray-900 font-medium mb-1">Panel de Seguimiento</h2>
            <p className="text-sm text-gray-600">Gestión integral de planes de mejoramiento</p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botón Crear Plan */}
            {authService.hasPermission(Permissions.CONTROL_INTERNO_PLANES_MEJORAMIENTO_CREATE) && (
            <button
              onClick={onAbrirCrearPlan}
              className="px-4 py-2 bg-gradient-to-r from-[#1e5da8] to-[#2a6dbd] text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2 text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Crear Plan desde Auditoría
              {auditoriasDisponibles.length > 0 && (
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {auditoriasDisponibles.length}
                </span>
              )}
            </button>
            )}
            {/* Toggle Vista */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setVistaTablero('kanban')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  vistaTablero === 'kanban'
                    ? 'bg-white text-[#1e5da8] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </button>
              <button
                onClick={() => setVistaTablero('lista')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  vistaTablero === 'lista'
                    ? 'bg-white text-[#1e5da8] shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="w-4 h-4" />
                Lista
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
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
          columnasColapsadas={columnasColapsadas}
          onToggleColapso={toggleColapsoColumna}
          columnasKanban={columnasKanban}
        />
      ) : (
        <VistaLista 
          planes={planesFiltrados}
          onAbrirPlan={setPlanSeleccionado}
        />
      )}

      {/* Modal Detalle Premium */}
      {planSeleccionado && (
        <ModalDetallePlanMejoramiento
          planId={planSeleccionado.id}
          onClose={() => setPlanSeleccionado(null)}
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
  onMoverPlan: (planId: string, nuevoEstado: EstadoPlan, nombreEtapa?: string) => void;
  onAbrirPlan: (plan: PlanMejoramiento) => void;
  columnasColapsadas: Set<string>;
  onToggleColapso: (columnaId: string) => void;
  columnasKanban: any[];
}

function VistaKanban({ planes, onMoverPlan, onAbrirPlan, columnasColapsadas, onToggleColapso, columnasKanban }: VistaKanbanProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-6">
      {columnasKanban.map((columna: any) => {
        // Mapear el nombre de la etapa (columna.id) al estado del frontend
        // Los nombres deben coincidir exactamente con los definidos en:
        // - db/migrations/090_seed_tableros_kanban.sql: "Formulación", "Aprobación", "En Ejecución", "En Seguimiento", "Cumplido"
        const estadoEsperado = mapearNombreEtapaAEstado(columna.id);
        const nombreColumnaLower = (columna.id || columna.nombre || '').toLowerCase().trim();
        
        // Filtrar planes según el estado esperado
        // Cada plan solo debe aparecer en UNA columna
        let planesColumna: PlanMejoramiento[];
        
        // IMPORTANTE: Verificar primero "En Seguimiento" porque contiene la palabra "ejecución" en su contexto
        // "En Seguimiento" es una etapa especial que muestra planes en ejecución con avance > 50%
        const esSeguimiento = nombreColumnaLower.includes('seguimiento');
        
        // "En Ejecución" muestra planes en ejecución con avance <= 50%
        // Debe verificar que NO sea "En Seguimiento" primero y que contenga "ejecución" o "ejecucion"
        const esEjecucion = !esSeguimiento && (
          nombreColumnaLower.includes('ejecución') || 
          nombreColumnaLower.includes('ejecucion') ||
          nombreColumnaLower.includes('ejecuci')
        );
        
        if (esSeguimiento) {
          // Mostrar solo planes en ejecución con avance significativo (>50%)
          planesColumna = planes.filter(p => {
            const avance = p.porcentajeAvance || 0;
            return p.estado === 'EN_EJECUCION' && avance > 50;
          });
        } else if (esEjecucion) {
          // Mostrar planes en ejecución con avance <= 50%
          // Excluir planes que ya están en "En Seguimiento" (avance > 50%)
          planesColumna = planes.filter(p => {
            const avance = p.porcentajeAvance || 0;
            return p.estado === 'EN_EJECUCION' && avance <= 50;
          });
        } else {
          // Para otras columnas (Formulación, Aprobación, Cumplido, etc.), filtrar por estado exacto
          planesColumna = planes.filter(p => p.estado === estadoEsperado);
        }
        
        const colapsada = columnasColapsadas.has(columna.id);
        
        return (
          <ColumnaKanban
            key={columna.id}
            columna={columna}
            planes={planesColumna}
            onMoverPlan={onMoverPlan}
            onAbrirPlan={onAbrirPlan}
            colapsada={colapsada}
            onToggleColapso={() => onToggleColapso(columna.id)}
            estadoEsperado={estadoEsperado}
          />
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COLUMNA KANBAN PREMIUM
// ════════════════════════════════════════════════════════════════════════════

interface ColumnaKanbanProps {
  columna: typeof COLUMNAS_KANBAN_DEFAULT[0];
  planes: PlanMejoramiento[];
  onMoverPlan: (planId: string, nuevoEstado: EstadoPlan, nombreEtapa?: string) => void;
  onAbrirPlan: (plan: PlanMejoramiento) => void;
  colapsada: boolean;
  onToggleColapso: () => void;
  estadoEsperado: EstadoPlan;
}

function ColumnaKanban({ columna, planes, onMoverPlan, onAbrirPlan, colapsada, onToggleColapso, estadoEsperado }: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'PLAN',
    drop: (item: { planId: string }) => {
      // Pasar el estado esperado y el nombre de la etapa para manejar casos especiales como "En Seguimiento"
      onMoverPlan(item.planId, estadoEsperado, columna.id);
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
        className="flex-shrink-0 h-full"
        initial={{ width: 64 }}
        animate={{ width: 64 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <Card 
          className={`h-full border transition-all cursor-pointer group ${
            isOver ? 'shadow-lg border-[#1e5da8] bg-blue-50' : 'hover:shadow-md hover:border-gray-300'
          }`}
          onClick={onToggleColapso}
        >
          <div className="flex flex-col items-center py-4 px-2 gap-3">
            {isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 border-2 border-[#1e5da8] border-dashed rounded-lg pointer-events-none"
              />
            )}
            
            <button
              className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors"
              title={`Expandir ${columna.titulo}`}
            >
              <Maximize2 className="w-4 h-4 text-gray-600 group-hover:text-[#1e5da8]" />
            </button>

            <div className="p-2 rounded-lg bg-gray-50 border border-gray-200">
              {columna.icono}
            </div>

            {/* Indicadores de semáforo */}
            {planes.length > 0 && (
              <div className="flex flex-col gap-1 py-2">
                {planesRojos > 0 && (
                  <div className="flex items-center gap-1" title={`${planesRojos} vencidos`}>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-bold text-red-600">{planesRojos}</span>
                  </div>
                )}
                {planesAmarillos > 0 && (
                  <div className="flex items-center gap-1" title={`${planesAmarillos} próximos a vencer`}>
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-amber-600">{planesAmarillos}</span>
                  </div>
                )}
                {planesVerdes > 0 && (
                  <div className="flex items-center gap-1" title={`${planesVerdes} en término`}>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-bold text-green-600">{planesVerdes}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex-1 flex items-center justify-center py-4">
              <h3 
                className="font-black text-xs text-gray-800 whitespace-nowrap"
                style={{ 
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed'
                }}
              >
                {columna.titulo}
              </h3>
            </div>

            <Badge className="font-semibold text-xs px-1.5 py-0.5 bg-gray-100 border border-gray-200 text-gray-700">
              {planes.length}
            </Badge>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Versión expandida
  return (
    <div className="flex-shrink-0" style={{ width: '320px' }}>
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
        className={`p-3 space-y-3 overflow-y-auto ${isOver ? 'bg-blue-50' : 'bg-gray-50'} transition-colors rounded-b-xl`}
        style={{ minHeight: 'calc(100vh - 500px)', maxHeight: 'calc(100vh - 500px)' }}
      >
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

function TarjetaKanban({ plan, onAbrirPlan }: TarjetaKanbanProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'PLAN',
    item: { planId: plan.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:shadow-md hover:border-[#1e5da8] transition-all cursor-move`}
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
            <span className="font-semibold text-gray-900">{plan.porcentajeAvance}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                plan.porcentajeAvance === 100 ? 'bg-emerald-500' :
                plan.porcentajeAvance >= 70 ? 'bg-blue-500' :
                plan.porcentajeAvance >= 40 ? 'bg-orange-500' :
                'bg-red-500'
              }`}
              style={{ width: `${plan.porcentajeAvance}%` }}
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
              <span className={plan.diasRestantes < 0 ? 'text-red-600 font-semibold' : ''}>
                {plan.diasRestantes < 0 ? `${Math.abs(plan.diasRestantes)}d vencido` : `${plan.diasRestantes}d`}
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
}

function VistaLista({ planes, onAbrirPlan }: VistaListaProps) {
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
      {planes.map((plan) => (
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
                        {plan.diasRestantes < 0 
                          ? <span className="text-red-600 font-semibold">{Math.abs(plan.diasRestantes)}d vencido</span>
                          : `${plan.diasRestantes}d restantes`
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
                            plan.porcentajeAvance === 100 ? '#10b981' :
                            plan.porcentajeAvance >= 70 ? '#3b82f6' :
                            plan.porcentajeAvance >= 40 ? '#f59e0b' : '#ef4444'
                          }
                          strokeWidth="6" fill="none"
                          strokeDasharray={`${2 * Math.PI * 32}`}
                          strokeDashoffset={`${2 * Math.PI * 32 * (1 - plan.porcentajeAvance / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-base font-semibold text-gray-900">{plan.porcentajeAvance}%</span>
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
                    <span>{plan.porcentajeAvance}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        plan.porcentajeAvance === 100 ? 'bg-emerald-500' :
                        plan.porcentajeAvance >= 70 ? 'bg-blue-500' :
                        plan.porcentajeAvance >= 40 ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${plan.porcentajeAvance}%` }}
                    />
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    Actualizado: {plan.ultimaActualizacion}
                  </div>
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
        </motion.div>
      ))}
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
  const config = {
    FORMULACION: { label: 'Formulación', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
    APROBADO: { label: 'Aprobado', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
    EN_EJECUCION: { label: 'En Ejecución', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
    CON_RETRASO: { label: 'Con Retraso', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
    COMPLETADO: { label: 'Completado', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
    SUSPENDIDO: { label: 'Suspendido', bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' }
  };

  const { label, bg, text, border } = config[estado];

  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-medium border ${bg} ${text} ${border}`}>
      {label}
    </span>
  );
}

function obtenerNombreEstado(estado: EstadoPlan | undefined | null): string {
  if (!estado) return 'estado desconocido';
  
  const nombres: Record<EstadoPlan, string> = {
    FORMULACION: 'Formulación',
    APROBADO: 'Aprobado',
    EN_EJECUCION: 'En Ejecución',
    CON_RETRASO: 'Con Retraso',
    COMPLETADO: 'Completado',
    SUSPENDIDO: 'Suspendido'
  };
  return nombres[estado] || 'estado desconocido';
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
    <ModalSIGL isOpen={true} onClose={onCerrar} title="Crear Plan de Mejoramiento2" size="large">
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
                              {aud.hallazgos.length} hallazgos
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
                    <div className="text-sm text-gray-900 font-medium">{auditoriaSeleccionada.hallazgos.length}</div>
                  </div>
                </div>

                {/* Distribución de Hallazgos */}
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
                      <li>Los {auditoriaSeleccionada.hallazgos.length} hallazgos quedarán vinculados al plan</li>
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
                // Ejecutar la creación del plan
                onCrear(auditoriaSeleccionada);
                
                // Mostrar notificación de éxito
                toast.success('Plan de Mejoramiento creado exitosamente', {
                  description: `Se ha creado el plan PM-${auditoriaSeleccionada.codigo} con ${auditoriaSeleccionada.hallazgos.length} hallazgos vinculados.`,
                  duration: 4000
                });
                
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
      className={`
        relative px-6 py-4 flex items-center gap-2 text-sm font-medium border-b-2 transition-all
        ${active 
          ? 'border-[#1e5da8] text-[#1e5da8] bg-blue-50/50' 
          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
        }
      `}
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
// VISTA: SOPORTE
// ════════════════════════════════════════════════════════════════════════════

function SoporteView() {
  return (
    <div className="mx-auto px-8 py-6 max-w-[1920px]">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="text-center mb-8">
          <HelpCircle className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl text-gray-900 font-bold mb-2">Centro de Soporte</h2>
          <p className="text-gray-600">Guías, documentación y ayuda para Planes de Mejoramiento</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <FileText className="w-8 h-8 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Guía de Uso</h3>
            <p className="text-sm text-gray-600 mb-4">
              Aprende a crear y gestionar planes de mejoramiento paso a paso
            </p>
            <button className="text-blue-600 text-sm font-medium hover:underline">
              Ver guía →
            </button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <AlertCircle className="w-8 h-8 text-amber-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Preguntas Frecuentes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Respuestas a las dudas más comunes sobre planes de mejoramiento
            </p>
            <button className="text-blue-600 text-sm font-medium hover:underline">
              Ver FAQs →
            </button>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <Info className="w-8 h-8 text-green-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Contactar Soporte</h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Necesitas ayuda? Contacta con nuestro equipo de soporte técnico
            </p>
            <button className="text-blue-600 text-sm font-medium hover:underline">
              Contactar →
            </button>
          </Card>
        </div>
      </div>
    </div>
  );
}
