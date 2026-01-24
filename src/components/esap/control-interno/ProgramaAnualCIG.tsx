/**
 * ============================================
 * RF003: PROGRAMA ANUAL CIG - PROGRAMACIÓN DE AUDITORÍAS
 * ============================================
 * 
 * Sistema de Programación y Calendarización de Auditorías Anuales
 * Basado en: EMFO001 - Programa Anual de Auditorías (Excel actual)
 * 
 * INTEGRACIÓN:
 * - Universo de Auditorías (RF002) - Áreas seleccionadas
 * - Estructura Organizacional - 18 Unidades (9 Sede + 9 Territoriales)
 * - Gestión de Personas - Auditores disponibles
 * 
 * FUNCIONALIDADES:
 * - Vista de Calendario Anual tipo Gantt (12 meses × 4 semanas)
 * - Programación visual de auditorías con drag & drop
 * - Asignación de equipos auditores (Líder + Equipo)
 * - Diferenciación Sede vs Territorial (duraciones específicas)
 * - Fases: Planeación (P) → Ejecución (E) → Comunicación (C)
 * - Dashboard ejecutivo con métricas de capacidad
 * - Detección de conflictos de agenda
 * - Exportación a Excel/PDF
 * - Workflow de aprobación
 * 
 * DURACIONES ESTÁNDAR:
 * SEDE CENTRAL:
 *   - Planeación: 5-10 días
 *   - Ejecución: 10-30 días
 *   - Comunicación: 10-15 días
 * 
 * TERRITORIALES:
 *   - Planeación: 3 días
 *   - Ejecución: 4 días (FIJO)
 *   - Comunicación: 2 días
 * 
 * ÚLTIMA ACTUALIZACIÓN: 21 Diciembre 2025
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Plus, Filter, Search, Users, MapPin,
  ChevronLeft, ChevronRight, Download, Check, X, AlertCircle,
  Grid, List, Edit2, Save, Trash2, Building2,
  AlertTriangle, Eye, BarChart3, FileText, Layers, Info, Send
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { auditoriasApi } from './services/api';
import ExcelJS from 'exceljs';

// ============ COMPONENTES DEL DESIGN SYSTEM ============
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { Badge } from '../../ui/badge';

// ============ COMPONENTES DE AUDITORÍA ============
import { FormularioNuevaAuditoria } from './FormularioNuevaAuditoria';

// ============ INTEGRACIÓN CONTEXT ============
import { useIntegracionAuditoriaPlanes, type AuditoriaProgramada } from './IntegracionAuditoriasPlanesContext';

// ============ TIPOS ============

type TipoAuditoria = 'Sede' | 'Territorial';
type FaseAuditoria = 'Planeación' | 'Ejecución' | 'Comunicación';
type EstadoPrograma = 'Borrador' | 'Pendiente Aprobación' | 'Aprobado' | 'En Ejecución' | 'Finalizado';
type MesAño = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

interface AuditoriaPrograma {
  id: string;
  codigo: string; // AUD-2025-001
  nombre: string;
  tipo: TipoAuditoria;
  areaAuditable: string;
  procesoId: string;
  procesoNombre: string;
  
  // Equipo auditor
  auditorLider: {
    id: string;
    nombre: string;
    iniciales: string;
  };
  equipoAuditores: {
    id: string;
    nombre: string;
    iniciales: string;
  }[];
  
  // Cronograma
  mesInicio: MesAño;
  semanaInicio: number; // 1-4
  fases: {
    planeacion: { duracionDias: number; color: string };
    ejecucion: { duracionDias: number; color: string };
    comunicacion: { duracionDias: number; color: string };
  };
  
  // Estado
  estadoPrograma: EstadoPrograma;
  observaciones?: string;
}

interface AuditorDisponible {
  id: string;
  nombre: string;
  apellido: string;
  iniciales: string;
  cargo: 'Jefe OCI' | 'Auditor Líder' | 'Auditor Operativo';
  auditoriasProgramadas: number;
  disponibilidad: number; // % 0-100
}

// ============ DATOS MOCK ============

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const;

const SEMANAS = [1, 2, 3, 4] as const;

const AUDITORES_MOCK: AuditorDisponible[] = [
  {
    id: 'aud-001',
    nombre: 'Fernando',
    apellido: 'Ávila',
    iniciales: 'FA',
    cargo: 'Auditor Líder',
    auditoriasProgramadas: 3,
    disponibilidad: 65
  },
  {
    id: 'aud-002',
    nombre: 'Lucila',
    apellido: 'Villamil',
    iniciales: 'LV',
    cargo: 'Auditor Líder',
    auditoriasProgramadas: 2,
    disponibilidad: 80
  },
  {
    id: 'aud-003',
    nombre: 'Catalina',
    apellido: 'Rubio',
    iniciales: 'CR',
    cargo: 'Auditor Líder',
    auditoriasProgramadas: 3,
    disponibilidad: 65
  },
  {
    id: 'aud-004',
    nombre: 'William',
    apellido: 'Alonso',
    iniciales: 'WA',
    cargo: 'Auditor Operativo',
    auditoriasProgramadas: 4,
    disponibilidad: 50
  },
  {
    id: 'aud-005',
    nombre: 'Natalia',
    apellido: 'Cañón',
    iniciales: 'NC',
    cargo: 'Auditor Operativo',
    auditoriasProgramadas: 3,
    disponibilidad: 70
  }
];

const AUDITORIAS_PROGRAMADAS_MOCK: AuditoriaPrograma[] = [
  {
    id: 'prog-001',
    codigo: 'AUD-2025-001',
    nombre: 'Auditoría Gestión Financiera',
    tipo: 'Sede',
    areaAuditable: 'SEDE-001',
    procesoId: 'proc-001',
    procesoNombre: 'Gestión Financiera',
    auditorLider: { id: 'aud-001', nombre: 'Fernando Ávila', iniciales: 'FA' },
    equipoAuditores: [
      { id: 'aud-004', nombre: 'William Alonso', iniciales: 'WA' },
      { id: 'aud-005', nombre: 'Natalia Cañón', iniciales: 'NC' }
    ],
    mesInicio: 0, // Enero
    semanaInicio: 2,
    fases: {
      planeacion: { duracionDias: 7, color: '#3B82F6' },
      ejecucion: { duracionDias: 20, color: '#10B981' },
      comunicacion: { duracionDias: 12, color: '#8B5CF6' }
    },
    estadoPrograma: 'Aprobado'
  },
  {
    id: 'prog-002',
    codigo: 'AUD-2025-002',
    nombre: 'Auditoría Territorial Antioquia',
    tipo: 'Territorial',
    areaAuditable: 'TERR-001',
    procesoId: 'proc-terr-001',
    procesoNombre: 'Territorial Antioquia',
    auditorLider: { id: 'aud-002', nombre: 'Lucila Villamil', iniciales: 'LV' },
    equipoAuditores: [
      { id: 'aud-003', nombre: 'Catalina Rubio', iniciales: 'CR' }
    ],
    mesInicio: 2, // Marzo
    semanaInicio: 1,
    fases: {
      planeacion: { duracionDias: 3, color: '#3B82F6' },
      ejecucion: { duracionDias: 4, color: '#10B981' },
      comunicacion: { duracionDias: 2, color: '#8B5CF6' }
    },
    estadoPrograma: 'Pendiente Aprobación'
  },
  {
    id: 'prog-003',
    codigo: 'AUD-2025-003',
    nombre: 'Auditoría Gestión Administrativa',
    tipo: 'Sede',
    areaAuditable: 'SEDE-002',
    procesoId: 'proc-002',
    procesoNombre: 'Gestión Administrativa',
    auditorLider: { id: 'aud-003', nombre: 'Catalina Rubio', iniciales: 'CR' },
    equipoAuditores: [
      { id: 'aud-005', nombre: 'Natalia Cañón', iniciales: 'NC' }
    ],
    mesInicio: 4, // Mayo
    semanaInicio: 3,
    fases: {
      planeacion: { duracionDias: 5, color: '#3B82F6' },
      ejecucion: { duracionDias: 15, color: '#10B981' },
      comunicacion: { duracionDias: 10, color: '#8B5CF6' }
    },
    estadoPrograma: 'Borrador'
  }
];

// ============ COMPONENTE PRINCIPAL ============

interface ProgramaAnualCIGProps {
  filtros?: {
    año: number;
    estado: string;
    area: string;
    busqueda: string;
  };
}

export function ProgramaAnualCIG({ filtros: filtrosExternos }: ProgramaAnualCIGProps = {} as ProgramaAnualCIGProps) {
  // Usar el año del filtro externo o el año actual por defecto
  const añoActual = filtrosExternos?.año || new Date().getFullYear();
  const [vistaActiva, setVistaActiva] = useState<'calendario' | 'lista' | 'auditores'>('calendario');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Sede' | 'Territorial'>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoPrograma>(
    filtrosExternos?.estado && filtrosExternos.estado !== 'TODOS' 
      ? filtrosExternos.estado as EstadoPrograma 
      : 'Todos'
  );
  const [busqueda, setBusqueda] = useState(filtrosExternos?.busqueda || '');
  const [mesSeleccionado, setMesSeleccionado] = useState<MesAño | null>(null);
  const [mostrarModalNueva, setMostrarModalNueva] = useState(false);
  const [auditoriasPrograma, setAuditoriasPrograma] = useState<AuditoriaPrograma[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaPrograma | null>(null);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);

  // Función para mapear Auditoria (backend) a AuditoriaPrograma (frontend)
  // Función auxiliar para parsear fechas en formato DD/MM/YYYY o YYYY-MM-DD
  const parsearFecha = (fechaStr: string): Date | null => {
    if (!fechaStr) return null;
    
    // Intentar formato DD/MM/YYYY (español)
    const formatoEspanol = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const matchEspanol = fechaStr.match(formatoEspanol);
    if (matchEspanol) {
      const [, dia, mes, año] = matchEspanol;
      // new Date(año, mes-1, dia) - mes es 0-indexed en JS
      return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
    }
    
    // Intentar formato YYYY-MM-DD (ISO)
    const formatoISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const matchISO = fechaStr.match(formatoISO);
    if (matchISO) {
      const [, año, mes, dia] = matchISO;
      return new Date(parseInt(año), parseInt(mes) - 1, parseInt(dia));
    }
    
    // Intentar parseo directo (para otros formatos)
    const fecha = new Date(fechaStr);
    if (!isNaN(fecha.getTime())) {
      return fecha;
    }
    
    return null;
  };

  const mapearAuditoriaAPrograma = (aud: any): AuditoriaPrograma | null => {
    // Filtrar por año si hay filtro externo
    if (filtrosExternos?.año) {
      const añoFiltro = filtrosExternos.año;
      // Intentar obtener el año de la auditoría desde fechaInicio
      if (aud.fechaInicio) {
        const fecha = parsearFecha(aud.fechaInicio);
        if (fecha && !isNaN(fecha.getTime())) {
          const añoAuditoria = fecha.getFullYear();
          // Si el año no coincide, retornar null para filtrar
          if (añoAuditoria !== añoFiltro) {
            return null;
          }
        } else if (aud.programaAnualMetadata?.mesInicio !== undefined) {
          // Si no hay fecha válida pero tiene metadata, verificar el año del código
          const codigoMatch = aud.codigo?.match(/AUD-(\d{4})-/);
          if (codigoMatch) {
            const añoCodigo = parseInt(codigoMatch[1]);
            if (añoCodigo !== añoFiltro) {
              return null;
            }
          }
        }
      } else {
        // Si no hay fechaInicio, verificar el año del código
        const codigoMatch = aud.codigo?.match(/AUD-(\d{4})-/);
        if (codigoMatch) {
          const añoCodigo = parseInt(codigoMatch[1]);
          if (añoCodigo !== añoFiltro) {
            return null;
          }
        } else {
          // Si no hay código ni fecha, excluir
          return null;
        }
      }
    }

    // Determinar mes de inicio (0-11 para MesAño)
    // Priorizar metadata guardada, si no existe, calcular desde fechaInicio
    let mesInicio: MesAño = 0;
    let semanaInicio = 1;
    
    if (aud.programaAnualMetadata?.mesInicio !== undefined && aud.programaAnualMetadata?.semanaInicio !== undefined) {
      // Usar valores guardados en metadata
      mesInicio = aud.programaAnualMetadata.mesInicio as MesAño;
      semanaInicio = aud.programaAnualMetadata.semanaInicio;
    } else if (aud.fechaInicio) {
      // Calcular desde fechaInicio si no hay metadata
      const fecha = parsearFecha(aud.fechaInicio);
      if (fecha && !isNaN(fecha.getTime())) {
        mesInicio = fecha.getMonth() as MesAño;
        // Calcular semana del mes (1-4)
        const diaMes = fecha.getDate();
        semanaInicio = Math.ceil(diaMes / 7);
        if (semanaInicio > 4) semanaInicio = 4;
      }
    }

    // Calcular duraciones de fases
    // Priorizar metadata guardada, si no existe, calcular desde fechas
    let duracionPlaneacion = 5;
    let duracionEjecucion = 15;
    let duracionComunicacion = 10;
    
    if (aud.programaAnualMetadata?.duraciones) {
      // Usar duraciones guardadas en metadata
      duracionPlaneacion = aud.programaAnualMetadata.duraciones.planeacion || 5;
      duracionEjecucion = aud.programaAnualMetadata.duraciones.ejecucion || 15;
      duracionComunicacion = aud.programaAnualMetadata.duraciones.comunicacion || 10;
    } else if (aud.fechaInicio && aud.fechaFin) {
      // Calcular desde fechas si no hay metadata
      const inicio = parsearFecha(aud.fechaInicio);
      const fin = parsearFecha(aud.fechaFin);
      if (inicio && fin && !isNaN(inicio.getTime()) && !isNaN(fin.getTime())) {
        const duracionTotal = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        
        // Distribuir duración en fases (proporción aproximada)
        duracionPlaneacion = Math.max(3, Math.floor(duracionTotal * 0.15));
        duracionEjecucion = Math.max(4, Math.floor(duracionTotal * 0.65));
        duracionComunicacion = Math.max(2, Math.floor(duracionTotal * 0.20));
      }
    }

    // Determinar tipo (Sede o Territorial)
    // Si tiene territorial definido o el proceso es territorial, es Territorial
    const tipo: TipoAuditoria = (aud.territorial || aud.tipo === 'Territorial') ? 'Territorial' : 'Sede';

    // Mapear estado del backend al estado del programa
    let estadoPrograma: EstadoPrograma = 'Borrador';
    
    // Mapear estados de ciclo de vida de auditoría (Planeación, Ejecución, etc.)
    if (aud.estado === 'Finalizada' || aud.estado === 'cerrada' || aud.estadoKanban === 'cerrada') {
      estadoPrograma = 'Finalizado'; // ✅ Auditoría completada
    } else if (aud.estado === 'Ejecución' || aud.estado === 'Comunicación' || aud.estado === 'Seguimiento' || 
               aud.estado === 'en-ejecucion' || aud.estadoKanban === 'en-ejecucion') {
      estadoPrograma = 'En Ejecución'; // 🔄 Auditoría activa
    } else if (aud.estado === 'Planeación' || aud.estado === 'planeacion') {
      estadoPrograma = 'Aprobado'; // 📋 Auditoría programada/planeada = Aprobada para el programa anual
    } else if (aud.estado === 'aprobado' || aud.estadoKanban === 'aprobado') {
      estadoPrograma = 'Aprobado';
    } else if (aud.estado === 'pendiente-aprobacion' || aud.estadoKanban === 'pendiente-aprobacion') {
      estadoPrograma = 'Pendiente Aprobación';
    }

    // Mapear auditor líder - manejar objeto completo o solo ID
    const auditorLider = aud.auditorLider ? {
      id: aud.auditorLider.id || aud.auditorLiderId || 'sin-asignar',
      nombre: aud.auditorLider.nombre || 'Sin asignar',
      iniciales: aud.auditorLider.iniciales || 'SA'
    } : aud.auditorLiderId ? {
      id: aud.auditorLiderId,
      nombre: aud.auditorLiderNombre || 'Sin asignar',
      iniciales: aud.auditorLiderIniciales || 'SA'
    } : {
      id: 'sin-asignar',
      nombre: 'Sin asignar',
      iniciales: 'SA'
    };

    // Mapear equipo de auditores - manejar strings directos o objetos
    const equipoAuditores = (aud.equipoAuditores || aud.equipoAuditor || []).map((eq: any) => {
      // Si es un string directo (nombre del auditor)
      if (typeof eq === 'string') {
        const initials = eq.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
        return {
          id: eq,
          nombre: eq,
          iniciales: initials
        };
      }
      // Si es un objeto
      return {
        id: eq.personaId || eq.id || eq.auditorId,
        nombre: eq.persona?.nombre || eq.nombre || 'Sin nombre',
        iniciales: eq.persona?.iniciales || eq.iniciales || 'SN'
      };
    });

    const auditoriaPrograma: AuditoriaPrograma = {
      id: aud.id,
      codigo: aud.codigo || `AUD-${añoActual}-${aud.id.substring(0, 3).toUpperCase()}`,
      nombre: aud.nombre || aud.titulo || 'Sin nombre',
      tipo,
      areaAuditable: aud.areaObjetivo || aud.procesoAuditableId || aud.areaAuditableId || '',
      procesoId: aud.procesoAuditableId || '',
      procesoNombre: aud.areaObjetivo || aud.procesoNombre || aud.procesoAuditable?.nombre || aud.alcance || 'Sin proceso',
      auditorLider,
      equipoAuditores,
      mesInicio,
      semanaInicio,
      fases: {
        planeacion: { duracionDias: duracionPlaneacion, color: '#3B82F6' },
        ejecucion: { duracionDias: duracionEjecucion, color: '#10B981' },
        comunicacion: { duracionDias: duracionComunicacion, color: '#8B5CF6' }
      },
      estadoPrograma,
      observaciones: aud.observacionesAdicionales || aud.observaciones || aud.descripcion || ''
    };
    
    return auditoriaPrograma;
  };

  // Función para recargar auditorías (reutilizable)
  const recargarAuditorias = async (mostrarToast = false) => {
    try {
      setLoading(true);
      console.log('[ProgramaAnualCIG] Recargando auditorías desde BD...');
      const response = await auditoriasApi.getAllKanban();
      
      if (response.success && response.data) {
        console.log('[ProgramaAnualCIG] Total auditorías recibidas al recargar:', response.data.length);
        
        // Mostrar TODAS las auditorías activas del kanban (ya vienen filtradas por activa: true)
        const todasLasAuditorias = response.data;
        
        console.log('[ProgramaAnualCIG] Auditorías a mostrar:', todasLasAuditorias.length);
        console.log('[ProgramaAnualCIG] Detalle auditorías:', todasLasAuditorias.map((a: any) => ({ 
          id: a.id, 
          codigo: a.codigo, 
          fechaInicio: a.fechaInicio,
          tieneMetadata: !!a.programaAnualMetadata,
          mesInicio: a.programaAnualMetadata?.mesInicio
        })));

        const auditoriasMapeadas = todasLasAuditorias
          .map(mapearAuditoriaAPrograma)
          .filter((aud): aud is AuditoriaPrograma => aud !== null);
        console.log('[ProgramaAnualCIG] Auditorías mapeadas después de recargar:', auditoriasMapeadas.length);
        setAuditoriasPrograma(auditoriasMapeadas);
        
        if (mostrarToast && auditoriasMapeadas.length > 0) {
          toast.success(`${auditoriasMapeadas.length} auditorías cargadas`, {
            description: 'Datos actualizados desde el tablero'
          });
        } else if (mostrarToast && auditoriasMapeadas.length === 0) {
          toast.info('No hay auditorías activas', {
            description: 'Las auditorías aparecerán aquí cuando estén activas en el sistema'
          });
        }
      } else {
        console.warn('[ProgramaAnualCIG] No se recibieron datos válidos al recargar');
        setAuditoriasPrograma([]);
      }
    } catch (error) {
      console.error('[ProgramaAnualCIG] Error al recargar auditorías:', error);
      setAuditoriasPrograma([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar auditorías desde la BD
  useEffect(() => {
    const cargarAuditorias = async () => {
      try {
        setLoading(true);
        const response = await auditoriasApi.getAllKanban();
        
        if (response.success && response.data) {
          
          // TODAS las auditorías activas del kanban deben mostrarse
          // No filtrar por fecha ni año, todas son válidas para el programa anual
          // (el backend ya filtra por activa: true)
          const todasLasAuditorias = response.data;

          // Mapear a formato de programa
        // Mapear y filtrar nulls (auditorías que no coinciden con el año)
        const auditoriasMapeadas = todasLasAuditorias
          .map(mapearAuditoriaAPrograma)
          .filter((aud): aud is AuditoriaPrograma => aud !== null);
        setAuditoriasPrograma(auditoriasMapeadas);
          
          if (auditoriasMapeadas.length === 0) {
            toast.info('No hay auditorías activas', {
              description: 'Las auditorías aparecerán aquí cuando estén activas en el sistema'
            });
          } else {
            toast.success(`${auditoriasMapeadas.length} auditorías cargadas`, {
              description: 'Todas las auditorías activas del tablero'
            });
          }
        } else {
          console.warn('[ProgramaAnualCIG] No se recibieron datos válidos. Response:', response);
          setAuditoriasPrograma([]);
          toast.info('No hay auditorías en la base de datos', {
            description: 'Las auditorías aparecerán aquí cuando se creen'
          });
        }
      } catch (error) {
        console.error('[ProgramaAnualCIG] Error al cargar auditorías:', error);
        toast.error('Error al cargar auditorías', {
          description: error instanceof Error ? error.message : 'No se pudieron obtener las auditorías'
        });
        setAuditoriasPrograma([]);
      } finally {
        setLoading(false);
      }
    };

    cargarAuditorias();
  }, [filtrosExternos?.año]); // Recargar cuando cambie el año del filtro

  // Métricas calculadas desde datos reales
  const metricas = useMemo(() => {
    const total = auditoriasPrograma.length;
    const sede = auditoriasPrograma.filter(a => a.tipo === 'Sede').length;
    const territoriales = auditoriasPrograma.filter(a => a.tipo === 'Territorial').length;
    const aprobadas = auditoriasPrograma.filter(a => a.estadoPrograma === 'Aprobado').length;
    const pendientes = auditoriasPrograma.filter(a => a.estadoPrograma === 'Pendiente Aprobación').length;
    const borradores = auditoriasPrograma.filter(a => a.estadoPrograma === 'Borrador').length;
    const finalizadas = auditoriasPrograma.filter(a => a.estadoPrograma === 'Finalizado').length;
    
    // Calcular porcentaje de cumplimiento (auditorías finalizadas / total programadas)
    const porcentajeCumplimiento = total > 0 ? Math.round((finalizadas / total) * 100) : 0;

    return { total, sede, territoriales, aprobadas, pendientes, borradores, finalizadas, porcentajeCumplimiento };
  }, [auditoriasPrograma]);

  // Sincronizar filtros externos con estados locales
  useEffect(() => {
    if (filtrosExternos) {
      if (filtrosExternos.busqueda !== undefined && filtrosExternos.busqueda !== busqueda) {
        setBusqueda(filtrosExternos.busqueda);
      }
      if (filtrosExternos.estado && filtrosExternos.estado !== 'TODOS' && filtrosExternos.estado !== filtroEstado) {
        setFiltroEstado(filtrosExternos.estado as EstadoPrograma);
      } else if (filtrosExternos.estado === 'TODOS' && filtroEstado !== 'Todos') {
        setFiltroEstado('Todos');
      }
    }
  }, [filtrosExternos]);

  // Filtrado de auditorías (incluye filtros externos)
  const auditoriasFiltradas = useMemo(() => {
    return auditoriasPrograma.filter(aud => {
      // Filtro por tipo
      const matchTipo = filtroTipo === 'Todos' || aud.tipo === filtroTipo;
      
      // Filtro por estado (usa filtro externo si está disponible)
      let matchEstado = true;
      if (filtrosExternos?.estado && filtrosExternos.estado !== 'TODOS') {
        // Mapear estados del filtro padre a estados del programa
        // BORRADOR -> 'Borrador'
        // EN_REVISION -> 'Pendiente Aprobación'
        // APROBADO -> 'Aprobado'
        // PUBLICADO -> 'En Ejecución' o 'Finalizado'
        if (filtrosExternos.estado === 'BORRADOR') {
          matchEstado = aud.estadoPrograma === 'Borrador';
        } else if (filtrosExternos.estado === 'EN_REVISION') {
          matchEstado = aud.estadoPrograma === 'Pendiente Aprobación';
        } else if (filtrosExternos.estado === 'APROBADO') {
          matchEstado = aud.estadoPrograma === 'Aprobado';
        } else if (filtrosExternos.estado === 'PUBLICADO') {
          matchEstado = aud.estadoPrograma === 'En Ejecución' || aud.estadoPrograma === 'Finalizado';
        }
      } else if (filtroEstado !== 'Todos') {
        matchEstado = aud.estadoPrograma === filtroEstado;
      }
      
      // Filtro por búsqueda (usa filtro externo si está disponible)
      const busquedaFiltro = filtrosExternos?.busqueda || busqueda;
      const matchBusqueda = busquedaFiltro === '' || 
        aud.nombre.toLowerCase().includes(busquedaFiltro.toLowerCase()) ||
        aud.codigo.toLowerCase().includes(busquedaFiltro.toLowerCase()) ||
        aud.procesoNombre.toLowerCase().includes(busquedaFiltro.toLowerCase());
      
      // Filtro por año ya se aplica en mapearAuditoriaAPrograma, pero verificamos también aquí por seguridad
      // Las auditorías ya vienen filtradas por año, así que este filtro es redundante pero seguro
      let matchAño = true;
      if (filtrosExternos?.año) {
        // Verificar el año desde el código de la auditoría
        const codigoMatch = aud.codigo?.match(/AUD-(\d{4})-/);
        if (codigoMatch) {
          const añoCodigo = parseInt(codigoMatch[1]);
          matchAño = añoCodigo === filtrosExternos.año;
        } else {
          // Si no hay código, incluir (ya debería estar filtrado en el mapeo)
          matchAño = true;
        }
      }
      
      return matchTipo && matchEstado && matchBusqueda && matchAño;
    });
  }, [auditoriasPrograma, filtroTipo, filtroEstado, busqueda, filtrosExternos]);

  // Función para exportar Programa Anual siguiendo el diseño del Excel proporcionado
  const handleExportarProgramaAnual = async () => {
    try {
      const toastId = toast.loading('Generando Excel...', {
        description: 'Por favor espera un momento'
      });

      // Crear workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Programa Anual');

      // Función auxiliar para fusionar celdas de forma segura
      const mergeCellsSafely = (range: string) => {
        try {
          worksheet.mergeCells(range);
        } catch (error: any) {
          // Si la celda ya está fusionada o hay otro error, continuar silenciosamente
          // Esto puede ocurrir si ExcelJS detecta un conflicto, pero no es crítico
          if (!error.message?.includes('already merged')) {
            console.warn(`Advertencia al fusionar ${range}:`, error.message);
          }
        }
      };

      // ============ CONFIGURACIÓN DE COLUMNAS ============
      // Ajustar anchos de columna según el diseño
      worksheet.getColumn('A').width = 5;   // N°
      worksheet.getColumn('B').width = 20;  // Auditorias (inicio)
      worksheet.getColumn('C').width = 20;  // Auditorias (fin)
      worksheet.getColumn('D').width = 8;   // Tipo Procesos - Estratégico
      worksheet.getColumn('E').width = 8;   // Tipo Procesos - Misional
      worksheet.getColumn('F').width = 8;   // Tipo Procesos - Apoyo
      worksheet.getColumn('G').width = 12;  // Tipo Procesos - Evaluación y Control
      worksheet.getColumn('H').width = 15;  // Responsable de la Auditoria (inicio)
      worksheet.getColumn('I').width = 15;  // Responsable de la Auditoria (fin)
      worksheet.getColumn('J').width = 15;  // Recursos
      worksheet.getColumn('K').width = 5;   // Enero
      worksheet.getColumn('L').width = 5;   // Febrero
      worksheet.getColumn('M').width = 5;   // Marzo
      worksheet.getColumn('N').width = 5;   // Abril
      worksheet.getColumn('O').width = 5;   // Mayo
      worksheet.getColumn('P').width = 5;   // Junio
      worksheet.getColumn('Q').width = 5;   // Julio
      worksheet.getColumn('R').width = 5;   // Agosto
      worksheet.getColumn('S').width = 5;   // Septiembre
      worksheet.getColumn('T').width = 5;   // Octubre
      worksheet.getColumn('U').width = 5;   // Noviembre
      worksheet.getColumn('V').width = 5;   // Diciembre
      worksheet.getColumn('W').width = 15;  // Observaciones (inicio)
      worksheet.getColumn('X').width = 15;
      worksheet.getColumn('Y').width = 15;
      worksheet.getColumn('Z').width = 15;
      worksheet.getColumn('AA').width = 15; // Observaciones (fin)

      // ============ FILA 1-4: LOGO Y TÍTULO ============
      // Logo ESAP (A1:C4) - Insertar logo desde el Excel original
      worksheet.mergeCells('A1:C4');
      
      // Intentar cargar e insertar el logo de ESAP
      let logoInserted = false;
      try {
        let imageBuffer: ArrayBuffer | null = null;
        let imageExtension = 'png';
        
        // Estrategia 1: Intentar leer el logo del Excel original en la carpeta public
        try {
          const templatePath = '/FORMATOPROGRAMAANUALDEAUDITORIASN- (1).xlsx';
          const templateResponse = await fetch(templatePath);
          
          if (templateResponse.ok) {
            const templateBuffer = await templateResponse.arrayBuffer();
            const templateWorkbook = new ExcelJS.Workbook();
            await templateWorkbook.xlsx.load(templateBuffer);
            const templateWorksheet = templateWorkbook.getWorksheet(1);
            
            // Buscar imágenes en el template usando getImages()
            if (templateWorksheet) {
              const images = templateWorksheet.getImages();
              console.log('Imágenes encontradas en template:', images.length);
              
              if (images.length > 0) {
                // Obtener la primera imagen (debería ser el logo)
                const firstImage = images[0];
                const imageId = firstImage.imageId;
                
                // Buscar el buffer en workbook.model.media
                const media = (templateWorkbook as any).model?.media || [];
                console.log('Media items encontrados:', media.length);
                
                const mediaItem = media.find((m: any) => m.index === imageId);
                
                if (mediaItem && mediaItem.buffer) {
                  imageBuffer = mediaItem.buffer;
                  imageExtension = mediaItem.extension || 'png';
                  console.log('Logo cargado desde template, extensión:', imageExtension);
                }
              }
            }
          } else {
            console.warn('Template no encontrado en:', templatePath);
          }
        } catch (e) {
          console.warn('Error al leer el logo del template:', e);
        }
        
        // Estrategia 2: Intentar desde ruta pública
        if (!imageBuffer) {
          try {
            const response = await fetch('/certificados/header-esap.png');
            if (response.ok) {
              imageBuffer = await response.arrayBuffer();
              console.log('Logo cargado desde /certificados/header-esap.png');
            } else {
              console.warn('No se encontró /certificados/header-esap.png');
            }
          } catch (e) {
            console.warn('Error al cargar logo desde ruta pública:', e);
          }
        }
        
        // Estrategia 3: Usar logo base64 como último recurso
        if (!imageBuffer) {
          console.log('Usando logo base64 como fallback');
          // Logo ESAP en base64 (extraído del Excel original)
          const logoBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAGQAAABGCAYAAAA3W5EfAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAALEwAACxMBAJqcGAAAAhNJREFUeJzt3LFKw0AYB/D/XRJwcHFw6OYg+ABuPoBDN8EnEHwABx/AxcVBcBAHBwcHX0DwAYRODg4ODg4ODtKlJZe0Te7uS+7+P0ihQ4f0R0pyfS0AIiIiIiIiIiIiIiIiIiKiRtLSJ0jTNAXgA8B79OsIQABgBOAMwAmAIwBHURv5sCzbVFGapolSSksp9wDsAdiNft0F0AWwHbUdAGMAXvR7OPouACDlPWdK2wcwAPAS/T1834ve89vy+1K070HU5wBAx4aNDIJ4uxRCnAO4BnAF4BLARfRnAGBY8xjdaDs5eM/r6L0r0XsXAC6itz9LPr+IPr+O3rsSvX8ZfT4obZ/Rz38O4EwIsaugY9xGhtdLAB8A3gC8AniJ/nwF8Azg6RefW7bvKWon/3ke7XtYsU3+8xOA+2jfE4D76OeG0b5BdMxemc0M73fL63MA7wDeATxFr58APu9x9P6H6JgPpe9O0T6Z13cAHgE8RO95iI75cM++p6V9d9HxelU2Mwh6sFJKpZTySin1SKnGqZTSSinlUio1Uan0vZRKP5RK6amU+q1Sqe+llPoqZdUvKeVFqda1lEpNpdT/l+HyJ3qfRtl7f8cYLZ7rz0aG17xelZzXQ8V5PWvL+T5G75f3yqJzfoxer9rI8P2p5LweVpzXs3lf9gW0UT+iLbOV4e/oW+Y8ZH5+VivD6915NrI3o5/RTgDcp1TqR0r1LaVU4+h5zL+Uqp9SqutSKj2Nsue+t9E23hMRERERERERERERERERbYYfHllRW7U3ptEAAAAASUVORK5CYII=';
          
          // Convertir base64 a ArrayBuffer
          const binaryString = atob(logoBase64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          imageBuffer = bytes.buffer;
        }
        
        // Insertar la imagen en el workbook
        if (imageBuffer && imageBuffer.byteLength > 0) {
          console.log('Insertando logo, tamaño del buffer:', imageBuffer.byteLength);
          
          try {
            const imageId = workbook.addImage({
              buffer: imageBuffer,
              extension: imageExtension,
            });
            
            console.log('Image ID generado:', imageId);
            
            // Insertar imagen en A1:C4
            // Usar coordenadas de celda para posicionar la imagen
            // Ajustar el tamaño para que quepa bien en las celdas A1:C4
            // Las celdas tienen aproximadamente 80 píxeles de ancho (3 columnas) y 80 píxeles de alto (4 filas)
            worksheet.addImage(imageId, {
              tl: { col: 0, row: 0 }, // Columna A (0), Fila 1 (0)
              ext: { width: 200, height: 100 }, // Tamaño en píxeles (ajustado para mejor visibilidad)
              editAs: 'oneCell' // Anclar a una celda
            });
            
            logoInserted = true;
            console.log('Logo insertado exitosamente en A1:C4');
          } catch (imgError) {
            console.error('Error al insertar imagen en worksheet:', imgError);
            throw imgError;
          }
        } else {
          throw new Error('Buffer de imagen vacío o inválido');
        }
      } catch (error) {
        console.error('Error al insertar logo:', error);
      }
      
      // Si no se pudo insertar el logo, usar texto como fallback
      if (!logoInserted) {
        console.warn('Usando texto como fallback para el logo');
        const logoCell = worksheet.getCell('A1');
        logoCell.value = 'ESAP\nEscuela Superior de\nAdministración Pública';
        logoCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF003DA5' } };
        logoCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      }
      
      worksheet.getRow(1).height = 20;
      worksheet.getRow(2).height = 20;
      worksheet.getRow(3).height = 20;
      worksheet.getRow(4).height = 20;

      // Título principal (D1:W4)
      worksheet.mergeCells('D1:W4');
      const tituloCell = worksheet.getCell('D1');
      tituloCell.value = 'PROGRAMA ANUAL DE AUDITORIAS INTERNAS\nDEL SISTEMA DE GESTIÓN DE LA CALIDAD';
      tituloCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF003DA5' } };
      tituloCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

      // Metadatos (X1:AA4)
      const fechaActual = new Date();
      worksheet.mergeCells('X1:AA1');
      worksheet.getCell('X1').value = 'CÓDIGO: EM-FO-013';
      worksheet.getCell('X1').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('X1').alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('X2:AA2');
      worksheet.getCell('X2').value = 'VERSIÓN: 1';
      worksheet.getCell('X2').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('X2').alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('X3:AA3');
      worksheet.getCell('X3').value = `FECHA: ${fechaActual.getDate()}/${fechaActual.getMonth() + 1}/${fechaActual.getFullYear()}`;
      worksheet.getCell('X3').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('X3').alignment = { vertical: 'middle', horizontal: 'left' };

      // ============ FILA 5: OBJETIVO DEL PROGRAMA ============
      worksheet.mergeCells('A5:C5');
      worksheet.getCell('A5').value = 'Objetivo del programa:';
      worksheet.getCell('A5').font = { name: 'Arial', size: 10, bold: true };
      worksheet.getCell('A5').alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('D5:AA5');
      worksheet.getCell('D5').value = 'Verificar el cumplimiento de los procesos del Sistema de Gestión de la Calidad mediante auditorías internas programadas.';
      worksheet.getCell('D5').font = { name: 'Arial', size: 10 };
      worksheet.getCell('D5').alignment = { vertical: 'middle', horizontal: 'left' };

      // ============ FILA 6: ALCANCE DEL PROGRAMA ============
      worksheet.mergeCells('A6:C6');
      worksheet.getCell('A6').value = 'Alcance del Programa:';
      worksheet.getCell('A6').font = { name: 'Arial', size: 10, bold: true };
      worksheet.getCell('A6').alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('D6:AA6');
      worksheet.getCell('D6').value = `Todos los procesos del Sistema de Gestión de la Calidad de la ESAP para el año ${añoActual}.`;
      worksheet.getCell('D6').font = { name: 'Arial', size: 10 };
      worksheet.getCell('D6').alignment = { vertical: 'middle', horizontal: 'left' };

      // ============ FILA 7: RESPONSABLE ============
      worksheet.mergeCells('A7:C7');
      worksheet.getCell('A7').value = 'Responsable:';
      worksheet.getCell('A7').font = { name: 'Arial', size: 10, bold: true };
      worksheet.getCell('A7').alignment = { vertical: 'middle', horizontal: 'left' };

      worksheet.mergeCells('D7:AA7');
      worksheet.getCell('D7').value = 'Oficina de Control Interno de Gestión - ESAP';
      worksheet.getCell('D7').font = { name: 'Arial', size: 10 };
      worksheet.getCell('D7').alignment = { vertical: 'middle', horizontal: 'left' };

      // ============ FILA 8-9: ESPACIO ============
      worksheet.getRow(8).height = 5;
      worksheet.getRow(9).height = 5;

      // ============ FILA 10-11: HEADERS DE LA TABLA ============
      // N° (A10:A11)
      worksheet.mergeCells('A10:A11');
      worksheet.getCell('A10').value = 'N°';
      worksheet.getCell('A10').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('A10').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('A10').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      worksheet.getCell('A10').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Auditorias (B10:C11)
      worksheet.mergeCells('B10:C11');
      worksheet.getCell('B10').value = 'Auditorias';
      worksheet.getCell('B10').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('B10').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('B10').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      worksheet.getCell('B10').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Tipo de Procesos (D10:G10)
      worksheet.mergeCells('D10:G10');
      worksheet.getCell('D10').value = 'Tipo de Procesos';
      worksheet.getCell('D10').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('D10').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('D10').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      worksheet.getCell('D10').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Subcolumnas de Tipo de Procesos (D11:G11)
      const tiposProceso = ['Estratégico', 'Misional', 'Apoyo', 'Evaluación y Control'];
      ['D11', 'E11', 'F11', 'G11'].forEach((cellRef, index) => {
        const cell = worksheet.getCell(cellRef);
        cell.value = tiposProceso[index];
        cell.font = { name: 'Arial', size: 8, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Responsable de la Auditoria (H10:I11)
      worksheet.mergeCells('H10:I11');
      worksheet.getCell('H10').value = 'Responsable de la Auditoria';
      worksheet.getCell('H10').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('H10').alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      worksheet.getCell('H10').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      worksheet.getCell('H10').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Recursos (J10:J11)
      worksheet.mergeCells('J10:J11');
      worksheet.getCell('J10').value = 'Recursos';
      worksheet.getCell('J10').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('J10').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('J10').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      worksheet.getCell('J10').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Meses (K10:V10)
      worksheet.mergeCells('K10:V10');
      worksheet.getCell('K10').value = 'Meses';
      worksheet.getCell('K10').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('K10').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('K10').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      worksheet.getCell('K10').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Subcolumnas de Meses (K11:V11) - Enero a Diciembre
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const columnasMeses = ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V'];
      columnasMeses.forEach((col, index) => {
        const cell = worksheet.getCell(`${col}11`);
        cell.value = meses[index];
        cell.font = { name: 'Arial', size: 8, bold: true };
        cell.alignment = { vertical: 'middle', horizontal: 'center', textRotation: 90 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' }
        };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Observaciones (W10:AA11)
      worksheet.mergeCells('W10:AA11');
      worksheet.getCell('W10').value = 'Observaciones';
      worksheet.getCell('W10').font = { name: 'Arial', size: 9, bold: true };
      worksheet.getCell('W10').alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getCell('W10').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }
      };
      worksheet.getCell('W10').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Ajustar altura de filas de headers
      worksheet.getRow(10).height = 20;
      worksheet.getRow(11).height = 40; // Más alto para texto vertical

      // ============ FILAS DE DATOS (12+) ============
      let filaActual = 12;
      auditoriasFiltradas.forEach((auditoria, index) => {
        // Ajustar altura de fila para mejor visualización
        worksheet.getRow(filaActual).height = 30;
        // N°
        const cellN = worksheet.getCell(`A${filaActual}`);
        cellN.value = index + 1;
        cellN.font = { name: 'Arial', size: 9 };
        cellN.alignment = { vertical: 'middle', horizontal: 'center' };
        cellN.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Auditorias (B:C)
        mergeCellsSafely(`B${filaActual}:C${filaActual}`);
        const cellAuditorias = worksheet.getCell(`B${filaActual}`);
        cellAuditorias.value = auditoria.nombre || auditoria.codigo;
        cellAuditorias.font = { name: 'Arial', size: 9 };
        cellAuditorias.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cellAuditorias.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Tipo de Procesos - Determinar tipo según el proceso
        // Mapear tipo de proceso basado en el nombre del proceso o área
        let tipoProceso = 'Misional'; // Por defecto
        const procesoNombre = (auditoria.procesoNombre || auditoria.areaAuditable || '').toLowerCase();
        
        // Lógica de mapeo mejorada
        if (procesoNombre.includes('estratégico') || procesoNombre.includes('estrategia') || procesoNombre.includes('plan')) {
          tipoProceso = 'Estratégico';
        } else if (procesoNombre.includes('apoyo') || procesoNombre.includes('administrativo') || procesoNombre.includes('financiero')) {
          tipoProceso = 'Apoyo';
        } else if (procesoNombre.includes('evaluación') || procesoNombre.includes('control') || procesoNombre.includes('auditoría')) {
          tipoProceso = 'Evaluación y Control';
        } else {
          tipoProceso = 'Misional'; // Por defecto para procesos misionales
        }
        
        const columnasTipo = { 
          'Estratégico': 'D', 
          'Misional': 'E', 
          'Apoyo': 'F', 
          'Evaluación y Control': 'G' 
        };
        const columnaTipo = columnasTipo[tipoProceso] || 'E';
        
        ['D', 'E', 'F', 'G'].forEach((col) => {
          const cell = worksheet.getCell(`${col}${filaActual}`);
          if (col === columnaTipo) {
            cell.value = 'X';
            cell.font = { name: 'Arial', size: 9, bold: true };
          } else {
            cell.value = '';
          }
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // Responsable de la Auditoria (H:I)
        mergeCellsSafely(`H${filaActual}:I${filaActual}`);
        const cellResponsable = worksheet.getCell(`H${filaActual}`);
        cellResponsable.value = auditoria.auditorLider?.nombre || 'Sin asignar';
        cellResponsable.font = { name: 'Arial', size: 9 };
        cellResponsable.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cellResponsable.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Recursos (J)
        const cellRecursos = worksheet.getCell(`J${filaActual}`);
        const equipoCount = auditoria.equipoAuditores?.length || 0;
        cellRecursos.value = `${equipoCount + 1} auditores`; // Líder + equipo
        cellRecursos.font = { name: 'Arial', size: 9 };
        cellRecursos.alignment = { vertical: 'middle', horizontal: 'left' };
        cellRecursos.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        // Meses (K:V) - Marcar meses según cronograma de fases
        const mesInicio = auditoria.mesInicio;
        const duracionPlaneacion = auditoria.fases.planeacion.duracionDias;
        const duracionEjecucion = auditoria.fases.ejecucion.duracionDias;
        const duracionComunicacion = auditoria.fases.comunicacion.duracionDias;
        
        // Calcular días acumulados para cada fase
        let diaInicioPlaneacion = 1; // Día 1 del mes de inicio
        let diaFinPlaneacion = diaInicioPlaneacion + duracionPlaneacion - 1;
        let diaInicioEjecucion = diaFinPlaneacion + 1;
        let diaFinEjecucion = diaInicioEjecucion + duracionEjecucion - 1;
        let diaInicioComunicacion = diaFinEjecucion + 1;
        let diaFinComunicacion = diaInicioComunicacion + duracionComunicacion - 1;
        
        // Función para determinar en qué mes está un día específico
        const obtenerMesParaDia = (dia: number, mesInicial: number): number => {
          const diasPorMes = 30; // Aproximado
          const mesOffset = Math.floor((dia - 1) / diasPorMes);
          return Math.min(mesInicial + mesOffset, 11); // Máximo diciembre (mes 11)
        };
        
        // Calcular meses activos para cada fase
        const mesesActivos = new Set<number>();
        
        // Meses de Planeación
        const mesInicioPlaneacion = mesInicio;
        const mesFinPlaneacion = obtenerMesParaDia(diaFinPlaneacion, mesInicio);
        for (let mes = mesInicioPlaneacion; mes <= mesFinPlaneacion && mes < 12; mes++) {
          mesesActivos.add(mes);
        }
        
        // Meses de Ejecución
        const mesInicioEjecucion = obtenerMesParaDia(diaInicioEjecucion, mesInicio);
        const mesFinEjecucion = obtenerMesParaDia(diaFinEjecucion, mesInicio);
        for (let mes = mesInicioEjecucion; mes <= mesFinEjecucion && mes < 12; mes++) {
          mesesActivos.add(mes);
        }
        
        // Meses de Comunicación
        const mesInicioComunicacion = obtenerMesParaDia(diaInicioComunicacion, mesInicio);
        const mesFinComunicacion = obtenerMesParaDia(diaFinComunicacion, mesInicio);
        for (let mes = mesInicioComunicacion; mes <= mesFinComunicacion && mes < 12; mes++) {
          mesesActivos.add(mes);
        }

        columnasMeses.forEach((col, mesIndex) => {
          const cell = worksheet.getCell(`${col}${filaActual}`);
          if (mesesActivos.has(mesIndex)) {
            cell.value = 'X';
            cell.font = { name: 'Arial', size: 9, bold: true };
          } else {
            cell.value = '';
          }
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });

        // Observaciones (W:AA)
        mergeCellsSafely(`W${filaActual}:AA${filaActual}`);
        const cellObservaciones = worksheet.getCell(`W${filaActual}`);
        cellObservaciones.value = auditoria.observaciones || '';
        cellObservaciones.font = { name: 'Arial', size: 9 };
        cellObservaciones.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
        cellObservaciones.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };

        filaActual++;
      });

      // Si no hay auditorías, agregar una fila vacía
      if (auditoriasFiltradas.length === 0) {
        filaActual = 12;
        ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'AA'].forEach((col) => {
          const cell = worksheet.getCell(`${col}${filaActual}`);
          cell.value = '';
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
        mergeCellsSafely(`B${filaActual}:C${filaActual}`);
        mergeCellsSafely(`H${filaActual}:I${filaActual}`);
        mergeCellsSafely(`W${filaActual}:AA${filaActual}`);
        filaActual++;
      }

      // ============ FIRMAS (FILAS DESPUÉS DE LOS DATOS) ============
      // Espacio antes de las firmas
      filaActual = Math.max(filaActual + 3, 18);
      
      // Elaboró (columna B-D aproximadamente)
      worksheet.mergeCells(`B${filaActual}:D${filaActual}`);
      const cellElaboroLabel = worksheet.getCell(`B${filaActual}`);
      cellElaboroLabel.value = 'Elaboró';
      cellElaboroLabel.font = { name: 'Arial', size: 10, bold: true };
      cellElaboroLabel.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Línea para firma Elaboró
      worksheet.mergeCells(`B${filaActual + 1}:D${filaActual + 1}`);
      const cellFirmaElaboro = worksheet.getCell(`B${filaActual + 1}`);
      cellFirmaElaboro.border = {
        bottom: { style: 'medium', color: { argb: 'FF000000' } }
      };
      worksheet.getRow(filaActual + 1).height = 20;

      // Responsable (columna G-I aproximadamente)
      worksheet.mergeCells(`G${filaActual}:I${filaActual}`);
      const cellResponsableLabel = worksheet.getCell(`G${filaActual}`);
      cellResponsableLabel.value = 'Responsable';
      cellResponsableLabel.font = { name: 'Arial', size: 10, bold: true };
      cellResponsableLabel.alignment = { vertical: 'middle', horizontal: 'center' };
      
      // Línea para firma Responsable
      worksheet.mergeCells(`G${filaActual + 1}:I${filaActual + 1}`);
      const cellFirmaResponsable = worksheet.getCell(`G${filaActual + 1}`);
      cellFirmaResponsable.border = {
        bottom: { style: 'medium', color: { argb: 'FF000000' } }
      };
      worksheet.getRow(filaActual + 1).height = 20;

      // ============ GUARDAR ARCHIVO ============
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `PROGRAMA_ANUAL_AUDITORIAS_${añoActual}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success('Excel generado correctamente', {
        description: `Programa Anual ${añoActual} exportado`
      });
    } catch (error: any) {
      console.error('Error al generar Excel:', error);
      toast.error('Error al generar Excel', {
        description: error.message || 'No se pudo generar el documento'
      });
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ============ HEADER ============ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl text-gray-900">
                Programa Anual de Auditorías {añoActual}
                {loading && <span className="ml-2 text-sm text-gray-500">(Cargando...)</span>}
              </h1>
              <p className="text-sm text-gray-600">
                RF003 - Programación y calendarización de auditorías
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* ✅ NUEVO: Botón Aprobar Programa */}
          {!programaAprobado && (
            <ButtonSIGL
              variant="primary"
              icon={<Send className="w-4 h-4" />}
              onClick={handleAprobarPrograma}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-md"
            >
              Aprobar Programa
            </ButtonSIGL>
          )}

          {programaAprobado && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg border border-green-300">
              <Check className="w-4 h-4" />
              <span className="text-sm">Programa Aprobado</span>
            </div>
          )}

          <ButtonSIGL
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportarProgramaAnual}
          >
            Exportar
          </ButtonSIGL>
        </div>
      </motion.div>

      {/* ============ BARRA DE FILTROS Y NAVEGACIÓN ============ */}
      <CardSIGL className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Selector de vista */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setVistaActiva('calendario')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                vistaActiva === 'calendario'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span className="hidden sm:inline">Calendario</span>
            </button>
            <button
              onClick={() => setVistaActiva('lista')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                vistaActiva === 'lista'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Lista</span>
            </button>
            <button
              onClick={() => setVistaActiva('auditores')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-all ${
                vistaActiva === 'auditores'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Auditores</span>
            </button>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:flex-initial">
            <div className="relative flex-1 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar auditoría..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Sede">Sede Central</option>
              <option value="Territorial">Territoriales</option>
            </select>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Borrador">Borrador</option>
              <option value="Pendiente Aprobación">Pendiente Aprobación</option>
              <option value="Aprobado">Aprobado</option>
              <option value="En Ejecución">En Ejecución</option>
              <option value="Finalizado">Finalizado</option>
            </select>
          </div>
        </div>
      </CardSIGL>

      {/* ============ CONTENIDO SEGÚN VISTA ACTIVA ============ */}
      {loading ? (
        <CardSIGL className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-gray-600">Cargando auditorías desde la base de datos...</p>
          </div>
        </CardSIGL>
      ) : (
        <AnimatePresence mode="wait">
          {vistaActiva === 'calendario' && (
            <VistaCalendario
              auditorias={auditoriasFiltradas}
              año={añoActual}
              onSeleccionarMes={setMesSeleccionado}
            />
          )}
          {vistaActiva === 'lista' && (
            <VistaLista 
              auditorias={auditoriasFiltradas}
              onVerDetalle={(aud) => {
                setAuditoriaSeleccionada(aud);
                setModalDetalleOpen(true);
              }}
              onEditar={(aud) => {
                setAuditoriaSeleccionada(aud);
                setModalEditarOpen(true);
              }}
            />
          )}
          {vistaActiva === 'auditores' && (
            <VistaAuditores 
              auditores={calcularAuditoresDesdePrograma(auditoriasPrograma)} 
            />
          )}
        </AnimatePresence>
      )}

      {/* ============ MODAL NUEVA AUDITORÍA ============ */}
      {mostrarModalNueva && (
        <ModalNuevaAuditoria 
          onClose={() => setMostrarModalNueva(false)} 
          onAuditoriaCreada={async () => {
            // Recargar auditorías después de crear
            try {
              setLoading(true);
              const response = await auditoriasApi.getAllKanban();
              if (response.success && response.data) {
                const añoActual = new Date().getFullYear();
                const auditoriasAnoActual = response.data.filter((aud: any) => {
                  if (!aud.fechaInicio) return false;
                  const fechaInicio = new Date(aud.fechaInicio);
                  return fechaInicio.getFullYear() === añoActual;
                });
                const auditoriasMapeadas = auditoriasAnoActual
                  .map(mapearAuditoriaAPrograma)
                  .filter((aud): aud is AuditoriaPrograma => aud !== null);
                setAuditoriasPrograma(auditoriasMapeadas);
              }
            } catch (error) {
              console.error('[ProgramaAnualCIG] Error al recargar auditorías:', error);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {/* ============ MODAL DETALLE AUDITORÍA ============ */}
      {auditoriaSeleccionada && (
        <ModalDetalleAuditoria
          auditoria={auditoriaSeleccionada}
          isOpen={modalDetalleOpen}
          onClose={() => {
            setModalDetalleOpen(false);
            setAuditoriaSeleccionada(null);
          }}
        />
      )}

      {/* ============ MODAL EDITAR AUDITORÍA ============ */}
      {auditoriaSeleccionada && (
        <ModalEditarAuditoria
          auditoria={auditoriaSeleccionada}
          isOpen={modalEditarOpen}
          onClose={() => {
            setModalEditarOpen(false);
            setAuditoriaSeleccionada(null);
          }}
          onGuardar={async (auditoriaActualizada) => {
            try {
              
              // Obtener el año de la auditoría original para mantenerla en el mismo año
              // Primero obtener la auditoría actual desde la BD para saber su año
              const audOriginalResponse = await auditoriasApi.getById(auditoriaActualizada.id);
              let añoAuditoria = añoActual; // Por defecto usar año actual
              
              if (audOriginalResponse.success && audOriginalResponse.data?.fechaInicio) {
                const fechaOriginal = parsearFecha(audOriginalResponse.data.fechaInicio);
                // Validar que la fecha sea válida
                if (fechaOriginal && !isNaN(fechaOriginal.getTime())) {
                  const añoObtenido = fechaOriginal.getFullYear();
                  // Validar que el año obtenido sea un número válido
                  if (!isNaN(añoObtenido) && añoObtenido > 2000 && añoObtenido < 2100) {
                    añoAuditoria = añoObtenido;
                  }
                }
              }

              // Validar que añoAuditoria sea válido antes de usarlo
              if (isNaN(añoAuditoria) || añoAuditoria < 2000 || añoAuditoria > 2100) {
                añoAuditoria = añoActual;
              }

              // Calcular fechaInicio desde mesInicio y semanaInicio
              const fechaInicio = new Date(añoAuditoria, auditoriaActualizada.mesInicio, 1);
              // Ajustar al día de la semana (semana 1 = días 1-7, semana 2 = días 8-14, etc.)
              const diaSemana = (auditoriaActualizada.semanaInicio - 1) * 7 + 1;
              fechaInicio.setDate(diaSemana);

              // Validar que la fecha calculada sea válida
              if (isNaN(fechaInicio.getTime())) {
                throw new Error(`Fecha de inicio inválida calculada: año=${añoAuditoria}, mes=${auditoriaActualizada.mesInicio}, semana=${auditoriaActualizada.semanaInicio}`);
              }

              // Validar duraciones antes de calcular (máximo razonable: 365 días por fase, 730 total)
              const duracionPlaneacion = auditoriaActualizada.fases.planeacion.duracionDias;
              const duracionEjecucion = auditoriaActualizada.fases.ejecucion.duracionDias;
              const duracionComunicacion = auditoriaActualizada.fases.comunicacion.duracionDias;
              
              // Validaciones individuales de cada fase
              if (duracionPlaneacion < 1 || duracionPlaneacion > 365) {
                throw new Error(`⚠️ Duración de Planeación inválida: ${duracionPlaneacion} días. Debe estar entre 1 y 365 días.`);
              }
              if (duracionEjecucion < 1 || duracionEjecucion > 365) {
                throw new Error(`⚠️ Duración de Ejecución inválida: ${duracionEjecucion} días. Debe estar entre 1 y 365 días.`);
              }
              if (duracionComunicacion < 1 || duracionComunicacion > 365) {
                throw new Error(`⚠️ Duración de Comunicación inválida: ${duracionComunicacion} días. Debe estar entre 1 y 365 días.`);
              }

              // Calcular fechaFin sumando todas las duraciones
              const duracionTotal = duracionPlaneacion + duracionEjecucion + duracionComunicacion;
              
              // Validar duración total (máximo 2 años = 730 días)
              if (duracionTotal > 730) {
                throw new Error(`⚠️ Duración total demasiado larga: ${duracionTotal} días. El máximo permitido es 730 días (2 años). Reduzca las duraciones de las fases.`);
              }
              
              const fechaFin = new Date(fechaInicio);
              fechaFin.setDate(fechaFin.getDate() + duracionTotal - 1);

              // Validar que la fecha fin sea válida
              if (isNaN(fechaFin.getTime())) {
                throw new Error(`Fecha de fin inválida calculada: duración total=${duracionTotal} días`);
              }

              // Preparar datos para el backend
              const fechaInicioStr = fechaInicio.toISOString().split('T')[0]; // Formato YYYY-MM-DD
              const fechaFinStr = fechaFin.toISOString().split('T')[0];
              
              // Validar que las fechas en string sean válidas
              if (!fechaInicioStr || fechaInicioStr === 'Invalid Date' || !fechaFinStr || fechaFinStr === 'Invalid Date') {
                throw new Error(`Error al formatear fechas: fechaInicio=${fechaInicioStr}, fechaFin=${fechaFinStr}`);
              }

              const updateData: any = {
                nombre: auditoriaActualizada.nombre,
                fechaInicio: fechaInicioStr,
                fechaFin: fechaFinStr,
                observacionesAdicionales: auditoriaActualizada.observaciones || '',
                programaAnualMetadata: {
                  mesInicio: auditoriaActualizada.mesInicio,
                  semanaInicio: auditoriaActualizada.semanaInicio,
                  duraciones: {
                    planeacion: auditoriaActualizada.fases.planeacion.duracionDias,
                    ejecucion: auditoriaActualizada.fases.ejecucion.duracionDias,
                    comunicacion: auditoriaActualizada.fases.comunicacion.duracionDias
                  }
                }
              };

              // Llamar al API para actualizar
              const response = await auditoriasApi.update(auditoriaActualizada.id, updateData);

              if (response.success && response.data) {
                // Recargar auditorías desde la BD
                const allResponse = await auditoriasApi.getAllKanban();
                if (allResponse.success && allResponse.data) {
                  
                  // Filtrar solo las del año actual
                  const auditoriasAnoActual = allResponse.data.filter((aud: any) => {
                    // Si tiene programaAnualMetadata con mesInicio, incluirla aunque no tenga fechaInicio válida
                    if (aud.programaAnualMetadata?.mesInicio !== undefined) {
                      // Si tiene metadata, asumir que es del año actual si no hay fechaInicio
                      if (!aud.fechaInicio) {
                        return true;
                      }
                    }
                    
                    if (!aud.fechaInicio) {
                      return false;
                    }
                    
                    // Usar función parsearFecha para manejar formato DD/MM/YYYY
                    const fecha = parsearFecha(aud.fechaInicio);
                    // Validar que la fecha sea válida
                    if (!fecha || isNaN(fecha.getTime())) {
                      // Si tiene metadata, incluirla aunque la fecha sea inválida
                      if (aud.programaAnualMetadata?.mesInicio !== undefined) {
                        console.log('[ProgramaAnualCIG] Auditoría con fechaInicio inválida pero con metadata, incluyendo:', aud.id, aud.codigo);
                        return true;
                      }
                      console.warn('[ProgramaAnualCIG] Auditoría con fechaInicio inválida (filtrada):', aud.id, aud.codigo, 'fechaInicio:', aud.fechaInicio);
                      return false;
                    }
                    
                    const añoAud = fecha.getFullYear();
                    // Validar que el año sea un número válido
                    if (isNaN(añoAud) || añoAud < 2000 || añoAud > 2100) {
                      // Si tiene metadata, incluirla aunque el año sea inválido
                      if (aud.programaAnualMetadata?.mesInicio !== undefined) {
                        console.log('[ProgramaAnualCIG] Auditoría con año inválido pero con metadata, incluyendo:', aud.id, aud.codigo);
                        return true;
                      }
                      console.warn('[ProgramaAnualCIG] Auditoría con año inválido (filtrada):', aud.id, aud.codigo, 'año:', añoAud, 'fechaInicio:', aud.fechaInicio);
                      return false;
                    }
                    
                    return añoAud === añoActual;
                  });
                  
                  // Verificar si la auditoría actualizada está en el año actual
                  const auditoriaActualizadaEnLista = auditoriasAnoActual.find((a: any) => a.id === auditoriaActualizada.id);
                  if (!auditoriaActualizadaEnLista) {
                    const auditoriaEncontrada = allResponse.data.find((a: any) => a.id === auditoriaActualizada.id);
                    if (auditoriaEncontrada && auditoriaEncontrada.fechaInicio) {
                      const fechaAud = parsearFecha(auditoriaEncontrada.fechaInicio);
                      // Validar que la fecha sea válida
                      if (fechaAud && !isNaN(fechaAud.getTime())) {
                        const añoAud = fechaAud.getFullYear();
                        // Validar que el año sea válido
                        if (!isNaN(añoAud) && añoAud >= 2000 && añoAud <= 2100) {
                          console.warn('[ProgramaAnualCIG] ⚠️ La auditoría actualizada está en el año', añoAud, 'pero el filtro es para el año', añoActual);
                          toast.warning('Auditoría actualizada', {
                            description: `La auditoría se guardó en el año ${añoAud}. Cambia el año en el filtro para verla.`
                          });
                        } else {
                          console.error('[ProgramaAnualCIG] ⚠️ La auditoría actualizada tiene un año inválido:', añoAud);
                          toast.warning('Auditoría actualizada', {
                            description: 'La auditoría se guardó pero tiene una fecha inválida. Por favor, verifica los datos.'
                          });
                        }
                      } else {
                        console.error('[ProgramaAnualCIG] ⚠️ La auditoría actualizada tiene una fecha inválida:', auditoriaEncontrada.fechaInicio);
                        toast.warning('Auditoría actualizada', {
                          description: 'La auditoría se guardó pero tiene una fecha inválida. Por favor, verifica los datos.'
                        });
                      }
                    } else {
                      console.warn('[ProgramaAnualCIG] ⚠️ No se encontró la auditoría actualizada en la respuesta o no tiene fechaInicio');
                    }
                  }
                  
                  console.log('[ProgramaAnualCIG] Auditorías del año actual después de actualizar:', auditoriasAnoActual.length);
                  
                  const auditoriasMapeadas = auditoriasAnoActual
                    .map(mapearAuditoriaAPrograma)
                    .filter((aud): aud is AuditoriaPrograma => aud !== null);
                  console.log('[ProgramaAnualCIG] Auditorías mapeadas después de actualizar:', auditoriasMapeadas.length);
                  
                  setAuditoriasPrograma(auditoriasMapeadas);
                  
                  // Verificar si la auditoría actualizada está en la lista
                  const auditoriaEncontrada = auditoriasMapeadas.find(a => a.id === auditoriaActualizada.id);
                  if (auditoriaEncontrada) {
                    console.log('[ProgramaAnualCIG] ✅ La auditoría actualizada SÍ está en la lista:', auditoriaEncontrada);
                  }
                }

                toast.success('Auditoría actualizada exitosamente', {
                  description: 'Los cambios se han guardado en la base de datos'
                });
                setModalEditarOpen(false);
                setAuditoriaSeleccionada(null);
              } else {
                throw new Error(response.error || 'Error al actualizar la auditoría');
              }
            } catch (error) {
              console.error('[ProgramaAnualCIG] Error al actualizar auditoría:', error);
              toast.error('Error al actualizar auditoría', {
                description: error instanceof Error ? error.message : 'No se pudieron guardar los cambios'
              });
            }
          }}
        />
      )}
    </div>
  );
}

// ============ VISTA CALENDARIO (GANTT) ============

function VistaCalendario({ 
  auditorias, 
  año,
  onSeleccionarMes 
}: { 
  auditorias: AuditoriaPrograma[];
  año: number;
  onSeleccionarMes: (mes: MesAño | null) => void;
}) {
  // Función auxiliar para calcular qué meses ocupa cada fase
  const calcularMesesFase = (aud: AuditoriaPrograma, fase: 'planeacion' | 'ejecucion' | 'comunicacion') => {
    const diasPorMes = 30; // Aproximación
    const mesesOcupados: MesAño[] = [];
    
    // Calcular mes de inicio de esta fase
    let mesActual = aud.mesInicio;
    if (fase === 'ejecucion') {
      // Ejecución empieza después de planeación
      const mesesPlaneacion = Math.ceil(aud.fases.planeacion.duracionDias / diasPorMes);
      mesActual = ((aud.mesInicio + mesesPlaneacion) % 12) as MesAño;
    } else if (fase === 'comunicacion') {
      // Comunicación empieza después de ejecución
      const mesesPlaneacion = Math.ceil(aud.fases.planeacion.duracionDias / diasPorMes);
      const mesesEjecucion = Math.ceil(aud.fases.ejecucion.duracionDias / diasPorMes);
      mesActual = ((aud.mesInicio + mesesPlaneacion + mesesEjecucion) % 12) as MesAño;
    }
    
    // Obtener duración de la fase
    const duracionDias = fase === 'planeacion' ? aud.fases.planeacion.duracionDias :
                        fase === 'ejecucion' ? aud.fases.ejecucion.duracionDias :
                        aud.fases.comunicacion.duracionDias;
    
    // Calcular cuántos meses ocupa esta fase
    const mesesNecesarios = Math.max(1, Math.ceil(duracionDias / diasPorMes));
    for (let i = 0; i < mesesNecesarios; i++) {
      mesesOcupados.push(((mesActual + i) % 12) as MesAño);
    }
    
    return { mesInicioFase: mesActual, mesesOcupados };
  };

  // Función para obtener la fase que corresponde a un mes específico
  const obtenerFaseEnMes = (aud: AuditoriaPrograma, mesIdx: MesAño) => {
    const { mesesOcupados: mesesPlaneacion } = calcularMesesFase(aud, 'planeacion');
    if (mesesPlaneacion.includes(mesIdx)) {
      return { fase: 'planeacion', color: aud.fases.planeacion.color, duracion: aud.fases.planeacion.duracionDias };
    }
    
    const { mesesOcupados: mesesEjecucion } = calcularMesesFase(aud, 'ejecucion');
    if (mesesEjecucion.includes(mesIdx)) {
      return { fase: 'ejecucion', color: aud.fases.ejecucion.color, duracion: aud.fases.ejecucion.duracionDias };
    }
    
    const { mesesOcupados: mesesComunicacion } = calcularMesesFase(aud, 'comunicacion');
    if (mesesComunicacion.includes(mesIdx)) {
      return { fase: 'comunicacion', color: aud.fases.comunicacion.color, duracion: aud.fases.comunicacion.duracionDias };
    }
    
    return null;
  };

  // Función para obtener el tooltip completo
  const getTooltipContent = (aud: AuditoriaPrograma) => {
    return (
      <div className="text-sm space-y-1">
        <div className="font-bold text-white">{aud.codigo}</div>
        <div className="text-white/90">{aud.nombre}</div>
        <div className="text-white/80 text-xs mt-2 pt-2 border-t border-white/20">
          <div><strong>Tipo:</strong> {aud.tipo}</div>
          <div><strong>Proceso:</strong> {aud.procesoNombre}</div>
          <div><strong>Auditor Líder:</strong> {aud.auditorLider.nombre}</div>
          <div><strong>Estado:</strong> {aud.estadoPrograma}</div>
          <div className="mt-2">
            <div><strong>Planeación:</strong> {aud.fases.planeacion.duracionDias} días</div>
            <div><strong>Ejecución:</strong> {aud.fases.ejecucion.duracionDias} días</div>
            <div><strong>Comunicación:</strong> {aud.fases.comunicacion.duracionDias} días</div>
          </div>
          {aud.observaciones && (
            <div className="mt-2 text-xs"><strong>Observaciones:</strong> {aud.observaciones}</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      key="calendario"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <CardSIGL className="overflow-x-auto">
        <div className="min-w-[1200px] p-6 pl-52">
          {/* Header de meses */}
          <div className="grid grid-cols-12 gap-2 mb-4">
            {MESES.map((mes, idx) => (
              <div
                key={mes}
                className="text-center p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200"
              >
                <div className="text-sm text-blue-900">{mes}</div>
                <div className="text-xs text-blue-600 mt-1">
                  {auditorias.filter(a => {
                    const { mesesOcupados: mesesPlaneacion } = calcularMesesFase(a, 'planeacion');
                    const { mesesOcupados: mesesEjecucion } = calcularMesesFase(a, 'ejecucion');
                    const { mesesOcupados: mesesComunicacion } = calcularMesesFase(a, 'comunicacion');
                    return mesesPlaneacion.includes(idx as MesAño) || 
                           mesesEjecucion.includes(idx as MesAño) || 
                           mesesComunicacion.includes(idx as MesAño);
                  }).length} aud.
                </div>
              </div>
            ))}
          </div>

          {/* Línea de tiempo con auditorías */}
          <div className="space-y-4">
            {auditorias.map((aud) => {
              return (
                <div key={aud.id} className="relative group">
                  <div className="grid grid-cols-12 gap-2">
                    {MESES.map((_, mesIdx) => {
                      const fase = obtenerFaseEnMes(aud, mesIdx as MesAño);
                      const etiquetaFase = fase?.fase === 'planeacion' ? 'P' : 
                                          fase?.fase === 'ejecucion' ? 'E' : 
                                          fase?.fase === 'comunicacion' ? 'C' : '';
                      
                      return (
                        <div
                          key={mesIdx}
                          className="h-24 bg-gray-50 rounded border border-gray-200 relative"
                        >
                          {/* Renderizar fase si corresponde al mes */}
                          {fase && (
                            <div 
                              className="absolute inset-0 p-0.5"
                              title={`${aud.codigo}: ${aud.nombre}`}
                            >
                              <div
                                className="h-full rounded flex flex-col justify-center items-center shadow-md hover:shadow-xl transition-all cursor-pointer group/item relative"
                                style={{ 
                                  backgroundColor: fase.color,
                                  padding: '8px 12px'
                                }}
                              >
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover/item:block z-50 w-64 pointer-events-none">
                                  <div 
                                    className="bg-gray-900 text-white rounded-lg p-3 shadow-2xl border border-gray-700"
                                    style={{ 
                                      fontSize: '12px',
                                      lineHeight: '1.4'
                                    }}
                                  >
                                    {getTooltipContent(aud)}
                                  </div>
                                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                                    <div className="border-4 border-transparent border-t-gray-900"></div>
                                  </div>
                                </div>

                                {/* Contenido truncado */}
                                <div 
                                  className="text-white font-black tracking-tight w-full text-center overflow-hidden" 
                                  style={{ 
                                    fontSize: '13px', 
                                    lineHeight: '1.2',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={aud.codigo}
                                >
                                  {aud.codigo}
                                </div>
                                <div 
                                  className="text-white font-bold mt-0.5 text-xs" 
                                  style={{ 
                                    lineHeight: '1.2',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                  }}
                                >
                                  {etiquetaFase}: {fase.duracion}d
                                </div>
                                <div 
                                  className="text-white/90 text-[10px] mt-0.5 w-full text-center overflow-hidden" 
                                  style={{ 
                                    lineHeight: '1.1',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    textOverflow: 'ellipsis'
                                  }}
                                  title={aud.nombre}
                                >
                                  {aud.nombre}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Etiqueta lateral */}
                  <div className="absolute -left-48 top-0 w-44 pr-2 flex items-center h-24">
                    <div className="text-xs text-right w-full">
                      <div 
                        className="text-gray-900 truncate font-semibold" 
                        title={aud.nombre}
                      >
                        {aud.nombre}
                      </div>
                      <div className="text-gray-500 mt-1" title={aud.auditorLider.nombre}>
                        {aud.auditorLider.iniciales}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="flex items-center gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }} />
              <span className="text-xs text-gray-600">Planeación (P)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }} />
              <span className="text-xs text-gray-600">Ejecución (E)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }} />
              <span className="text-xs text-gray-600">Comunicación (C)</span>
            </div>
          </div>
        </div>
      </CardSIGL>
    </motion.div>
  );
}

// ============ VISTA LISTA ============

function VistaLista({ 
  auditorias,
  onVerDetalle,
  onEditar
}: { 
  auditorias: AuditoriaPrograma[];
  onVerDetalle: (aud: AuditoriaPrograma) => void;
  onEditar: (aud: AuditoriaPrograma) => void;
}) {
  return (
    <motion.div
      key="lista"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="space-y-3"
    >
      {auditorias.map((aud) => (
        <CardSIGL key={aud.id} hoverable className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Info principal */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Badge key={`codigo-${aud.id}`} variant="default" size="sm">
                  {aud.codigo}
                </Badge>
                <Badge 
                  key={`tipo-${aud.id}`}
                  variant={aud.tipo === 'Sede' ? 'info' : 'success'} 
                  size="sm"
                >
                  {aud.tipo === 'Sede' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                  <span className="ml-1">{aud.tipo}</span>
                </Badge>
                <Badge 
                  key={`estado-${aud.id}`}
                  variant={
                    aud.estadoPrograma === 'Aprobado' ? 'success' :
                    aud.estadoPrograma === 'Pendiente Aprobación' ? 'warning' :
                    'default'
                  }
                  size="sm"
                >
                  {aud.estadoPrograma}
                </Badge>
              </div>
              
              <h3 className="text-gray-900 mb-1">{aud.nombre}</h3>
              <p className="text-sm text-gray-600">{aud.procesoNombre}</p>
            </div>

            {/* Equipo auditor */}
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Líder:</span>
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-xs text-white">
                    {aud.auditorLider.iniciales}
                  </div>
                  <span className="text-sm text-blue-900">{aud.auditorLider.nombre}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-600">Equipo:</span>
                {aud.equipoAuditores.map((auditor) => (
                  <div
                    key={auditor.id}
                    className="w-6 h-6 bg-gray-600 rounded-full flex items-center justify-center text-xs text-white"
                    title={auditor.nombre}
                  >
                    {auditor.iniciales}
                  </div>
                ))}
              </div>
            </div>

            {/* Cronograma */}
            <div className="flex flex-col items-end gap-1 min-w-[200px]">
              <div className="text-xs text-gray-600">
                Inicio: {MESES[aud.mesInicio]} Semana {aud.semanaInicio}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span key={`planeacion-${aud.id}`} className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  P: {aud.fases.planeacion.duracionDias}d
                </span>
                <span key={`ejecucion-${aud.id}`} className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  E: {aud.fases.ejecucion.duracionDias}d
                </span>
                <span key={`comunicacion-${aud.id}`} className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                  C: {aud.fases.comunicacion.duracionDias}d
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-2">
              <ButtonSIGL
                variant="secondary"
                size="sm"
                icon={<Eye className="w-4 h-4" />}
                onClick={() => onVerDetalle(aud)}
              >
                Ver
              </ButtonSIGL>
              <ButtonSIGL
                variant="secondary"
                size="sm"
                icon={<Edit2 className="w-4 h-4" />}
                onClick={() => onEditar(aud)}
              >
                Editar
              </ButtonSIGL>
            </div>
          </div>
        </CardSIGL>
      ))}

      {auditorias.length === 0 && (
        <CardSIGL className="p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No se encontraron auditorías con los filtros aplicados</p>
        </CardSIGL>
      )}
    </motion.div>
  );
}

// ============ FUNCIÓN AUXILIAR: CALCULAR AUDITORES DESDE PROGRAMA ============

function calcularAuditoresDesdePrograma(auditorias: AuditoriaPrograma[]): AuditorDisponible[] {
  const auditoresMap = new Map<string, {
    id: string;
    nombre: string;
    apellido: string;
    iniciales: string;
    cargo: 'Jefe OCI' | 'Auditor Líder' | 'Auditor Operativo';
    auditoriasProgramadas: number;
  }>();

  // Contar auditorías por auditor
  auditorias.forEach(aud => {
    // Auditor líder
    if (aud.auditorLider && aud.auditorLider.id !== 'sin-asignar') {
      const nombreCompleto = aud.auditorLider.nombre.split(' ');
      const lider = auditoresMap.get(aud.auditorLider.id) || {
        id: aud.auditorLider.id,
        nombre: nombreCompleto[0] || aud.auditorLider.nombre,
        apellido: nombreCompleto.slice(1).join(' ') || '',
        iniciales: aud.auditorLider.iniciales,
        cargo: 'Auditor Líder' as const,
        auditoriasProgramadas: 0
      };
      lider.auditoriasProgramadas++;
      auditoresMap.set(aud.auditorLider.id, lider);
    }

    // Equipo de auditores
    aud.equipoAuditores.forEach(eq => {
      const nombreCompleto = eq.nombre.split(' ');
      const auditor = auditoresMap.get(eq.id) || {
        id: eq.id,
        nombre: nombreCompleto[0] || eq.nombre,
        apellido: nombreCompleto.slice(1).join(' ') || '',
        iniciales: eq.iniciales,
        cargo: 'Auditor Operativo' as const,
        auditoriasProgramadas: 0
      };
      auditor.auditoriasProgramadas++;
      auditoresMap.set(eq.id, auditor);
    });
  });

  // Convertir a array y calcular disponibilidad
  return Array.from(auditoresMap.values()).map(auditor => ({
    ...auditor,
    disponibilidad: Math.max(0, 100 - (auditor.auditoriasProgramadas * 15)) // Cada auditoría reduce ~15% disponibilidad
  }));
}

// ============ VISTA AUDITORES ============

function VistaAuditores({ auditores }: { auditores: AuditorDisponible[] }) {
  return (
    <motion.div
      key="auditores"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <CardSIGL className="p-6">
        <h2 className="text-lg text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Equipo de Auditores - Capacidad y Disponibilidad
        </h2>

        <div className="space-y-4">
          {auditores.map((auditor) => (
            <div
              key={auditor.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              {/* Info auditor */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-md">
                  {auditor.iniciales}
                </div>
                <div>
                  <div className="text-gray-900">{auditor.nombre} {auditor.apellido}</div>
                  <div className="text-sm text-gray-600">{auditor.cargo}</div>
                </div>
              </div>

              {/* Métricas */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl text-blue-600">{auditor.auditoriasProgramadas}</div>
                  <div className="text-xs text-gray-600">Auditorías</div>
                </div>

                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">Disponibilidad</span>
                    <span className="text-xs text-gray-900">{auditor.disponibilidad}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        auditor.disponibilidad >= 70 ? 'bg-green-500' :
                        auditor.disponibilidad >= 50 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${auditor.disponibilidad}%` }}
                    />
                  </div>
                </div>

                <Badge
                  variant={
                    auditor.disponibilidad >= 70 ? 'success' :
                    auditor.disponibilidad >= 50 ? 'warning' :
                    'danger'
                  }
                  size="sm"
                >
                  {auditor.disponibilidad >= 70 ? 'Disponible' :
                   auditor.disponibilidad >= 50 ? 'Moderado' :
                   'Saturado'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardSIGL>
    </motion.div>
  );
}

// ============ MODAL DETALLE AUDITORÍA ============

interface ModalDetalleAuditoriaProps {
  auditoria: AuditoriaPrograma;
  isOpen: boolean;
  onClose: () => void;
}

function ModalDetalleAuditoria({ auditoria, isOpen, onClose }: ModalDetalleAuditoriaProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{auditoria.nombre}</h2>
                <p className="text-blue-100 text-sm">{auditoria.codigo}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Información General */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              Información General
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Tipo</p>
                <Badge variant={auditoria.tipo === 'Sede' ? 'info' : 'success'} size="sm">
                  {auditoria.tipo === 'Sede' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                  <span className="ml-1">{auditoria.tipo}</span>
                </Badge>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Estado</p>
                <Badge 
                  variant={
                    auditoria.estadoPrograma === 'Aprobado' ? 'success' :
                    auditoria.estadoPrograma === 'Pendiente Aprobación' ? 'warning' :
                    auditoria.estadoPrograma === 'En Ejecución' ? 'info' :
                    'default'
                  }
                  size="sm"
                >
                  {auditoria.estadoPrograma}
                </Badge>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Proceso Auditable</p>
                <p className="text-sm font-semibold text-gray-900">{auditoria.procesoNombre}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Área Auditable</p>
                <p className="text-sm font-semibold text-gray-900">{auditoria.areaAuditable || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Equipo Auditor */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Equipo Auditor
            </h3>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600 mb-2">Auditor Líder</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    {auditoria.auditorLider.iniciales}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{auditoria.auditorLider.nombre}</p>
                    <p className="text-xs text-gray-600">Líder del equipo</p>
                  </div>
                </div>
              </div>
              {auditoria.equipoAuditores.length > 0 && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-2">Equipo de Auditores</p>
                  <div className="flex flex-wrap gap-2">
                    {auditoria.equipoAuditores.map((auditor) => (
                      <div key={auditor.id} className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-200">
                        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center text-xs text-white">
                          {auditor.iniciales}
                        </div>
                        <span className="text-sm text-gray-900">{auditor.nombre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Cronograma */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Cronograma
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-gray-600 mb-1">Inicio</p>
                <p className="text-sm font-semibold text-gray-900">
                  {MESES[auditoria.mesInicio]} - Semana {auditoria.semanaInicio}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-gray-600 mb-1">Duración Total</p>
                <p className="text-sm font-semibold text-gray-900">
                  {auditoria.fases.planeacion.duracionDias + 
                   auditoria.fases.ejecucion.duracionDias + 
                   auditoria.fases.comunicacion.duracionDias} días
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-xs text-gray-600 mb-1">Fases</p>
                <div className="flex gap-2">
                  <Badge key="planeacion" variant="info" size="sm">P: {auditoria.fases.planeacion.duracionDias}d</Badge>
                  <Badge key="ejecucion" variant="success" size="sm">E: {auditoria.fases.ejecucion.duracionDias}d</Badge>
                  <Badge key="comunicacion" variant="default" size="sm">C: {auditoria.fases.comunicacion.duracionDias}d</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          {auditoria.observaciones && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Observaciones
              </h3>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{auditoria.observaciones}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <ButtonSIGL variant="secondary" onClick={onClose}>
            Cerrar
          </ButtonSIGL>
        </div>
      </motion.div>
    </div>
  );
}

// ============ MODAL EDITAR AUDITORÍA ============

interface ModalEditarAuditoriaProps {
  auditoria: AuditoriaPrograma;
  isOpen: boolean;
  onClose: () => void;
  onGuardar: (auditoria: AuditoriaPrograma) => void;
}

function ModalEditarAuditoria({ auditoria, isOpen, onClose, onGuardar }: ModalEditarAuditoriaProps) {
  const [formData, setFormData] = useState({
    nombre: auditoria.nombre,
    mesInicio: auditoria.mesInicio,
    semanaInicio: auditoria.semanaInicio,
    duracionPlaneacion: auditoria.fases.planeacion.duracionDias,
    duracionEjecucion: auditoria.fases.ejecucion.duracionDias,
    duracionComunicacion: auditoria.fases.comunicacion.duracionDias,
    observaciones: auditoria.observaciones || ''
  });
  const [guardando, setGuardando] = useState(false);
  const guardandoRef = useRef(false); // Ref para rastrear estado de guardado de forma síncrona

  useEffect(() => {
    if (isOpen) {
      // Resetear estados cuando se abre el modal
      setGuardando(false);
      guardandoRef.current = false;
      setFormData({
        nombre: auditoria.nombre,
        mesInicio: auditoria.mesInicio,
        semanaInicio: auditoria.semanaInicio,
        duracionPlaneacion: auditoria.fases.planeacion.duracionDias,
        duracionEjecucion: auditoria.fases.ejecucion.duracionDias,
        duracionComunicacion: auditoria.fases.comunicacion.duracionDias,
        observaciones: auditoria.observaciones || ''
      });
    }
  }, [isOpen, auditoria]);

  const handleGuardar = async () => {
    // Evitar múltiples llamadas simultáneas usando ref (más confiable que state)
    if (guardandoRef.current || guardando) {
      return;
    }
    
    // ✅ VALIDACIÓN PREVIA antes de intentar guardar
    const duracionTotal = formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion;
    
    if (duracionTotal > 730) {
      toast.error('⚠️ Duración total excedida', {
        description: `La duración total es de ${duracionTotal} días, pero el máximo permitido es 730 días (2 años). Por favor, ajuste las duraciones.`
      });
      return;
    }
    
    if (formData.duracionPlaneacion < 1 || formData.duracionPlaneacion > 365 ||
        formData.duracionEjecucion < 1 || formData.duracionEjecucion > 365 ||
        formData.duracionComunicacion < 1 || formData.duracionComunicacion > 365) {
      toast.error('⚠️ Duraciones inválidas', {
        description: 'Cada fase debe tener una duración entre 1 y 365 días.'
      });
      return;
    }
    
    try {
      guardandoRef.current = true; // Bloquear inmediatamente
      setGuardando(true);
      
      const auditoriaActualizada: AuditoriaPrograma = {
        ...auditoria,
        nombre: formData.nombre,
        mesInicio: formData.mesInicio as MesAño,
        semanaInicio: formData.semanaInicio,
        fases: {
          planeacion: { 
            duracionDias: formData.duracionPlaneacion, 
            color: auditoria.fases.planeacion.color 
          },
          ejecucion: { 
            duracionDias: formData.duracionEjecucion, 
            color: auditoria.fases.ejecucion.color 
          },
          comunicacion: { 
            duracionDias: formData.duracionComunicacion, 
            color: auditoria.fases.comunicacion.color 
          }
        },
        observaciones: formData.observaciones
      };
      
      await onGuardar(auditoriaActualizada);
      onClose(); // Cerrar el modal después de guardar exitosamente
    } catch (error) {
      setGuardando(false);
      guardandoRef.current = false; // Resetear en caso de error para permitir reintentar
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Edit2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Editar Auditoría</h2>
                <p className="text-blue-100 text-sm">{auditoria.codigo}</p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre de la Auditoría
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Cronograma */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cronograma</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mes de Inicio
                </label>
                <select
                  value={formData.mesInicio}
                  onChange={(e) => setFormData({ ...formData, mesInicio: parseInt(e.target.value) as MesAño })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {MESES.map((mes, idx) => (
                    <option key={mes} value={idx}>{mes}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Semana de Inicio
                </label>
                <select
                  value={formData.semanaInicio}
                  onChange={(e) => setFormData({ ...formData, semanaInicio: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {[1, 2, 3, 4].map(sem => (
                    <option key={sem} value={sem}>Semana {sem}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Duraciones de Fases */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-4">Duración de Fases (días)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Planeación
                  <span className="text-xs text-gray-500 ml-2">(1-365 días)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.duracionPlaneacion}
                  onChange={(e) => {
                    const valor = parseInt(e.target.value) || 1;
                    const valorLimitado = Math.min(Math.max(valor, 1), 365);
                    setFormData({ ...formData, duracionPlaneacion: valorLimitado });
                  }}
                  onBlur={(e) => {
                    const valor = parseInt(e.target.value) || 1;
                    if (valor > 365) {
                      toast.error('Duración inválida', { description: 'La duración máxima por fase es de 365 días' });
                      setFormData({ ...formData, duracionPlaneacion: 365 });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 30"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ejecución
                  <span className="text-xs text-gray-500 ml-2">(1-365 días)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.duracionEjecucion}
                  onChange={(e) => {
                    const valor = parseInt(e.target.value) || 1;
                    const valorLimitado = Math.min(Math.max(valor, 1), 365);
                    setFormData({ ...formData, duracionEjecucion: valorLimitado });
                  }}
                  onBlur={(e) => {
                    const valor = parseInt(e.target.value) || 1;
                    if (valor > 365) {
                      toast.error('Duración inválida', { description: 'La duración máxima por fase es de 365 días' });
                      setFormData({ ...formData, duracionEjecucion: 365 });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 60"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Comunicación
                  <span className="text-xs text-gray-500 ml-2">(1-365 días)</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.duracionComunicacion}
                  onChange={(e) => {
                    const valor = parseInt(e.target.value) || 1;
                    const valorLimitado = Math.min(Math.max(valor, 1), 365);
                    setFormData({ ...formData, duracionComunicacion: valorLimitado });
                  }}
                  onBlur={(e) => {
                    const valor = parseInt(e.target.value) || 1;
                    if (valor > 365) {
                      toast.error('Duración inválida', { description: 'La duración máxima por fase es de 365 días' });
                      setFormData({ ...formData, duracionComunicacion: 365 });
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: 15"
                />
              </div>
            </div>
            
            {/* Indicador de Duración Total */}
            <div className={`mt-4 p-3 rounded-lg border-2 ${
              (formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) > 730
                ? 'bg-red-50 border-red-300'
                : (formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) > 365
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-green-50 border-green-300'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-semibold ${
                  (formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) > 730
                    ? 'text-red-700'
                    : (formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) > 365
                      ? 'text-yellow-700'
                      : 'text-green-700'
                }`}>
                  Duración Total:
                </span>
                <span className={`text-lg font-bold ${
                  (formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) > 730
                    ? 'text-red-700'
                    : (formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) > 365
                      ? 'text-yellow-700'
                      : 'text-green-700'
                }`}>
                  {formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion} días
                </span>
              </div>
              {(formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) > 730 && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ La duración excede el máximo permitido de 730 días (2 años). Ajuste las duraciones.
                </p>
              )}
              {(formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) > 365 && 
               (formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) <= 730 && (
                <p className="text-xs text-yellow-600 mt-1">
                  ⚡ Auditoría de larga duración (más de 1 año)
                </p>
              )}
              {(formData.duracionPlaneacion + formData.duracionEjecucion + formData.duracionComunicacion) <= 365 && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ Duración dentro del rango normal
                </p>
              )}
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Observaciones
            </label>
            <textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Agregar observaciones sobre esta auditoría..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <ButtonSIGL variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL variant="primary" onClick={handleGuardar} disabled={guardando}>
            <Save className="w-4 h-4 mr-2" />
            {guardando ? 'Guardando...' : 'Guardar Cambios'}
          </ButtonSIGL>
        </div>
      </motion.div>
    </div>
  );
}

// ============ MODAL NUEVA AUDITORÍA ============

function ModalNuevaAuditoria({ onClose, onAuditoriaCreada }: { onClose: () => void; onAuditoriaCreada?: () => void }) {
  const [guardando, setGuardando] = useState(false);
  const añoActual = new Date().getFullYear();

  const handleGuardarAuditoria = async (auditoria: any) => {
    try {
      setGuardando(true);
      console.log('[ModalNuevaAuditoria] Creando auditoría:', auditoria);

      // Mapear datos del formulario al formato del backend
      const fechaInicio = auditoria.fechaInicio ? new Date(auditoria.fechaInicio) : new Date(añoActual, 0, 1);
      const fechaFin = auditoria.fechaFin ? new Date(auditoria.fechaFin) : new Date(añoActual, 11, 31);

      // Calcular mes y semana de inicio desde fechaInicio
      const mesInicio = fechaInicio.getMonth();
      const diaMes = fechaInicio.getDate();
      const semanaInicio = Math.ceil(diaMes / 7);
      const semanaInicioFinal = semanaInicio > 4 ? 4 : semanaInicio;

      // Calcular duraciones de fases desde fechaInicio y fechaFin
      const duracionTotal = Math.ceil((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
      const duracionPlaneacion = Math.max(3, Math.floor(duracionTotal * 0.15));
      const duracionEjecucion = Math.max(4, Math.floor(duracionTotal * 0.65));
      const duracionComunicacion = Math.max(2, Math.floor(duracionTotal * 0.20));

      // Mapear tipo del formulario al enum del backend
      // Los valores válidos son: 'Gestión', 'Control Interno', 'Académica', 'RRHH', 'Financiera', 'TI', 'Cumplimiento', 'Operacional'
      const mapearTipo = (tipo: string): string => {
        const mapeo: Record<string, string> = {
          'Financiera': 'Financiera',
          'Operacional': 'Operacional',
          'Cumplimiento': 'Cumplimiento',
          'TI': 'TI',
          'Gestión': 'Gestión',
          'Especial': 'Gestión' // Mapear Especial a Gestión
        };
        return mapeo[tipo] || 'Gestión';
      };

      // Mapear prioridad del formulario al enum del backend
      // Los valores válidos son: 'Alta', 'Media', 'Baja'
      const mapearPrioridad = (prioridad: string): string => {
        const mapeo: Record<string, string> = {
          'Crítica': 'Alta',
          'Alta': 'Alta',
          'Media': 'Media',
          'Baja': 'Baja'
        };
        return mapeo[prioridad] || 'Media';
      };

      // Validar que los campos requeridos estén presentes
      if (!auditoria.nombre || !auditoria.fechaInicio || !auditoria.fechaFin) {
        throw new Error('Faltan campos obligatorios: nombre, fechaInicio o fechaFin');
      }

      // Preparar datos para el backend (solo campos requeridos por CreateAuditoriaDto)
      // IMPORTANTE: NO incluir campos que no estén en CreateAuditoriaDto porque el ValidationPipe
      // está configurado con forbidNonWhitelisted: true, lo que causa que el backend rechace la petición
      const auditoriaData: any = {
        nombre: auditoria.nombre.trim(),
        tipo: mapearTipo(auditoria.tipo || 'Gestión'),
        territorial: auditoria.areaAuditable?.tipo === 'Territorial' ? (auditoria.areaAuditable.nombre || 'Territorial') : 'Sede Central',
        sede: 'Sede Central',
        responsable: auditoria.areaAuditable?.responsable || 'Sin responsable',
        fechaInicio: fechaInicio.toISOString().split('T')[0],
        fechaFin: fechaFin.toISOString().split('T')[0],
        fase: 'planeacion',
        prioridad: mapearPrioridad(auditoria.prioridad || 'Media'),
        progreso: 0
      };

      // NOTA: auditorLiderId NO está en CreateAuditoriaDto, así que lo agregaremos en el update después de crear

      console.log('[ModalNuevaAuditoria] Datos a enviar al backend:', JSON.stringify(auditoriaData, null, 2));

      // Guardar en la base de datos
      const response = await auditoriasApi.create(auditoriaData);
      
      console.log('[ModalNuevaAuditoria] Respuesta completa del backend:', JSON.stringify(response, null, 2));

      if (!response.success) {
        console.error('[ModalNuevaAuditoria] ❌ Error en la respuesta:', response);
        const errorMsg = response.error || 'Error desconocido al crear la auditoría';
        throw new Error(errorMsg);
      }

      if (!response.data) {
        console.error('[ModalNuevaAuditoria] ❌ La respuesta no contiene datos:', response);
        throw new Error('El servidor no devolvió los datos de la auditoría creada');
      }

      console.log('[ModalNuevaAuditoria] ✅ Auditoría creada exitosamente:', response.data);
      console.log('[ModalNuevaAuditoria] ID de la auditoría:', response.data.id);
      console.log('[ModalNuevaAuditoria] Código de la auditoría:', response.data.codigo);
      
      // Actualizar con campos adicionales usando update
      // IMPORTANTE: establecer estadoKanban para que aparezca en Auditorías OCIG
      const mapearRiesgoKanban = (nivelRiesgo: string): string => {
        if (nivelRiesgo === 'Crítico' || nivelRiesgo === 'Alto') return 'Alto';
        if (nivelRiesgo === 'Medio') return 'Medio';
        return 'Bajo';
      };

      const mapearPrioridadKanban = (prioridad: string): string => {
        if (prioridad === 'Crítica') return 'crítica';
        if (prioridad === 'Alta') return 'alta';
        if (prioridad === 'Media') return 'media';
        return 'baja';
      };

      const updateData: any = {
        alcance: auditoria.alcance || '',
        observacionesAdicionales: auditoria.objetivo || '',
        estadoKanban: 'Planeación', // CRÍTICO: Sin esto no aparece en el Kanban de Auditorías OCIG
        tipoKanban: auditoria.areaAuditable?.tipo === 'Territorial' ? 'territorial' : 'regular',
        riesgoKanban: mapearRiesgoKanban(auditoria.nivelRiesgo || 'Medio'),
        semaforo: 'verde', // Por defecto verde al crear
        prioridadKanban: mapearPrioridadKanban(auditoria.prioridad || 'Media'),
        programaAnualMetadata: {
          mesInicio: mesInicio,
          semanaInicio: semanaInicioFinal,
          duraciones: {
            planeacion: duracionPlaneacion,
            ejecucion: duracionEjecucion,
            comunicacion: duracionComunicacion
          }
        }
      };

      // Si hay auditor líder, agregarlo en el update (no en el create porque no está en CreateAuditoriaDto)
      if (auditoria.liderAuditor?.id) {
        updateData.auditorLiderId = parseInt(auditoria.liderAuditor.id);
      }

      console.log('[ModalNuevaAuditoria] Actualizando auditoría con campos Kanban:', JSON.stringify(updateData, null, 2));

      // Actualizar con metadata y campos adicionales
      console.log('[ModalNuevaAuditoria] Llamando a update con ID:', response.data.id);
      const updateResponse = await auditoriasApi.update(response.data.id, updateData);
      
      if (!updateResponse.success) {
        console.error('[ModalNuevaAuditoria] ⚠️ Error al actualizar campos adicionales:', updateResponse.error);
        // No lanzar error, solo loguear, porque la auditoría ya se creó
        toast.warning('Auditoría creada pero algunos campos no se actualizaron', {
          description: updateResponse.error || 'Revisa la consola para más detalles'
        });
      } else {
        console.log('[ModalNuevaAuditoria] ✅ Auditoría actualizada completamente:', updateResponse.data);
      }
      
      toast.success('¡Auditoría creada exitosamente!', {
        description: `${response.data.codigo} se guardó en la base de datos`
      });

      // Cerrar modal
      onClose();
      
      // Recargar auditorías si hay callback
      if (onAuditoriaCreada) {
        await onAuditoriaCreada();
      } else {
        // Recargar la página después de un breve delay
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('[ModalNuevaAuditoria] ❌ ERROR COMPLETO al crear auditoría:', error);
      console.error('[ModalNuevaAuditoria] Stack trace:', error instanceof Error ? error.stack : 'No hay stack trace');
      
      // Mostrar error detallado al usuario
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      
      toast.error('Error al crear auditoría', {
        description: `${errorMessage}. Revisa la consola del navegador (F12) para más detalles.`
      });
      
      // También mostrar en consola para debugging
      console.error('[ModalNuevaAuditoria] Detalles del error:', {
        message: errorMessage,
        error: error,
        tipo: typeof error
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-[9999] overflow-y-auto">
      <div className="min-h-screen w-full flex items-start justify-center p-4 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl relative"
        >
          {/* Botón Cerrar Moderno */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-all duration-200 hover:scale-110 active:scale-95 shadow-md"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Contenido del formulario sin padding extra */}
          <FormularioNuevaAuditoria 
            onClose={onClose} 
            onGuardar={handleGuardarAuditoria}
          />
          {guardando && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-2xl">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-700 font-medium">Guardando auditoría en la base de datos...</p>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}