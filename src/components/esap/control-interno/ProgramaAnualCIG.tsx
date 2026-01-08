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

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar, Plus, Filter, Search, Users, MapPin,
  ChevronLeft, ChevronRight, Download, Check, X, AlertCircle,
  Grid, List, Edit2, Save, Trash2, Building2,
  AlertTriangle, Eye, BarChart3, FileText, Layers, Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { auditoriasApi } from './services/api';

// ============ COMPONENTES DEL DESIGN SYSTEM ============
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';

// ============ COMPONENTES DE AUDITORÍA ============
import { FormularioNuevaAuditoria } from './FormularioNuevaAuditoria';

// ============ COMPONENTE BADGE AUXILIAR ============
function Badge({ 
  variant = 'default', 
  size = 'md',
  children, 
  className = '' 
}: { 
  variant?: 'default' | 'info' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}) {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
  };
  
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded font-medium ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

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

export function ProgramaAnualCIG() {
  const [añoActual] = useState(new Date().getFullYear());
  const [vistaActiva, setVistaActiva] = useState<'calendario' | 'lista' | 'auditores'>('calendario');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Sede' | 'Territorial'>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoPrograma>('Todos');
  const [busqueda, setBusqueda] = useState('');
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

  const mapearAuditoriaAPrograma = (aud: any): AuditoriaPrograma => {
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
    if (aud.estado === 'aprobado' || aud.estadoKanban === 'aprobado') estadoPrograma = 'Aprobado';
    else if (aud.estado === 'en-ejecucion' || aud.estadoKanban === 'en-ejecucion') estadoPrograma = 'En Ejecución';
    else if (aud.estado === 'cerrada' || aud.estadoKanban === 'cerrada') estadoPrograma = 'Finalizado';
    else if (aud.estado === 'pendiente-aprobacion' || aud.estadoKanban === 'pendiente-aprobacion') estadoPrograma = 'Pendiente Aprobación';

    // Mapear auditor líder
    const auditorLider = aud.auditorLiderId ? {
      id: aud.auditorLiderId,
      nombre: aud.auditorLider?.nombre || aud.auditorLiderNombre || 'Sin asignar',
      iniciales: aud.auditorLider?.iniciales || aud.auditorLiderIniciales || 'SA'
    } : {
      id: 'sin-asignar',
      nombre: 'Sin asignar',
      iniciales: 'SA'
    };

    // Mapear equipo de auditores
    const equipoAuditores = (aud.equipoAuditores || aud.equipoAuditor || []).map((eq: any) => ({
      id: eq.personaId || eq.id || eq.auditorId,
      nombre: eq.persona?.nombre || eq.nombre || 'Sin nombre',
      iniciales: eq.persona?.iniciales || eq.iniciales || 'SN'
    }));

    return {
      id: aud.id,
      codigo: aud.codigo || `AUD-${añoActual}-${aud.id.substring(0, 3).toUpperCase()}`,
      nombre: aud.nombre || aud.titulo || 'Sin nombre',
      tipo,
      areaAuditable: aud.procesoAuditableId || aud.areaAuditableId || '',
      procesoId: aud.procesoAuditableId || '',
      procesoNombre: aud.procesoNombre || aud.procesoAuditable?.nombre || 'Sin proceso',
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
      observaciones: aud.observaciones || aud.descripcion
    };
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

        const auditoriasMapeadas = todasLasAuditorias.map(mapearAuditoriaAPrograma);
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
        console.log('[ProgramaAnualCIG] Cargando auditorías desde BD...');
        const response = await auditoriasApi.getAllKanban();
        
        console.log('[ProgramaAnualCIG] Respuesta recibida:', response);
        
        if (response.success && response.data) {
          console.log('[ProgramaAnualCIG] Total auditorías recibidas:', response.data.length);
          
          // TODAS las auditorías activas del kanban deben mostrarse
          // No filtrar por fecha ni año, todas son válidas para el programa anual
          // (el backend ya filtra por activa: true)
          const todasLasAuditorias = response.data;
          
          console.log('[ProgramaAnualCIG] Auditorías a mostrar:', todasLasAuditorias.length);
          console.log('[ProgramaAnualCIG] Detalle auditorías:', todasLasAuditorias.map((a: any) => ({ 
            id: a.id, 
            codigo: a.codigo, 
            fechaInicio: a.fechaInicio,
            tieneMetadata: !!a.programaAnualMetadata,
            mesInicio: a.programaAnualMetadata?.mesInicio
          })));

          // Mapear a formato de programa
          const auditoriasMapeadas = todasLasAuditorias.map(mapearAuditoriaAPrograma);
          console.log('[ProgramaAnualCIG] Auditorías mapeadas:', auditoriasMapeadas.length);
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
  }, []); // Remover dependencia de añoActual, cargar siempre todas las activas

  // Métricas calculadas desde datos reales
  const metricas = useMemo(() => {
    const total = auditoriasPrograma.length;
    const sede = auditoriasPrograma.filter(a => a.tipo === 'Sede').length;
    const territoriales = auditoriasPrograma.filter(a => a.tipo === 'Territorial').length;
    const aprobadas = auditoriasPrograma.filter(a => a.estadoPrograma === 'Aprobado').length;
    const pendientes = auditoriasPrograma.filter(a => a.estadoPrograma === 'Pendiente Aprobación').length;
    const borradores = auditoriasPrograma.filter(a => a.estadoPrograma === 'Borrador').length;

    return { total, sede, territoriales, aprobadas, pendientes, borradores };
  }, [auditoriasPrograma]);

  // Filtrado de auditorías
  const auditoriasFiltradas = useMemo(() => {
    return auditoriasPrograma.filter(aud => {
      const matchTipo = filtroTipo === 'Todos' || aud.tipo === filtroTipo;
      const matchEstado = filtroEstado === 'Todos' || aud.estadoPrograma === filtroEstado;
      const matchBusqueda = busqueda === '' || 
        aud.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        aud.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        aud.procesoNombre.toLowerCase().includes(busqueda.toLowerCase());
      
      return matchTipo && matchEstado && matchBusqueda;
    });
  }, [auditoriasPrograma, filtroTipo, filtroEstado, busqueda]);

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
          <ButtonSIGL
            variant="outline"
            icon={<Download className="w-4 h-4" />}
            onClick={() => toast.success('Exportando programa anual...')}
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
                const auditoriasMapeadas = auditoriasAnoActual.map(mapearAuditoriaAPrograma);
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
                    console.log('[ProgramaAnualCIG] Año de la auditoría original:', añoAuditoria);
                  } else {
                    console.warn('[ProgramaAnualCIG] Año obtenido inválido:', añoObtenido, 'usando año actual:', añoAuditoria);
                  }
                } else {
                  console.warn('[ProgramaAnualCIG] Fecha original inválida:', audOriginalResponse.data.fechaInicio, 'usando año actual:', añoAuditoria);
                }
              } else {
                console.log('[ProgramaAnualCIG] No se pudo obtener el año original, usando año actual:', añoAuditoria);
              }

              // Validar que añoAuditoria sea válido antes de usarlo
              if (isNaN(añoAuditoria) || añoAuditoria < 2000 || añoAuditoria > 2100) {
                console.error('[ProgramaAnualCIG] ⚠️ Año inválido detectado:', añoAuditoria, 'usando año actual como fallback');
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

              // Calcular fechaFin sumando todas las duraciones
              const duracionTotal = auditoriaActualizada.fases.planeacion.duracionDias + 
                                   auditoriaActualizada.fases.ejecucion.duracionDias + 
                                   auditoriaActualizada.fases.comunicacion.duracionDias;
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

              console.log('[ProgramaAnualCIG] Actualizando auditoría:', {
                id: auditoriaActualizada.id,
                codigo: auditoriaActualizada.codigo,
                añoAuditoria,
                mesInicio: auditoriaActualizada.mesInicio,
                semanaInicio: auditoriaActualizada.semanaInicio,
                fechaInicio: updateData.fechaInicio,
                fechaFin: updateData.fechaFin,
                duracionTotal,
                programaAnualMetadata: updateData.programaAnualMetadata
              });
              
              console.log('[ProgramaAnualCIG] updateData completo:', JSON.stringify(updateData, null, 2));

              // Llamar al API para actualizar
              const response = await auditoriasApi.update(auditoriaActualizada.id, updateData);

              if (response.success && response.data) {
                console.log('[ProgramaAnualCIG] Auditoría actualizada exitosamente en BD:', {
                  id: response.data.id,
                  codigo: response.data.codigo,
                  fechaInicio: response.data.fechaInicio,
                  fechaFin: response.data.fechaFin
                });
                
                // Recargar auditorías desde la BD
                const allResponse = await auditoriasApi.getAllKanban();
                if (allResponse.success && allResponse.data) {
                  console.log('[ProgramaAnualCIG] Total auditorías recibidas después de actualizar:', allResponse.data.length);
                  
                  // Filtrar solo las del año actual
                  const auditoriasAnoActual = allResponse.data.filter((aud: any) => {
                    // Si tiene programaAnualMetadata con mesInicio, incluirla aunque no tenga fechaInicio válida
                    if (aud.programaAnualMetadata?.mesInicio !== undefined) {
                      // Si tiene metadata, asumir que es del año actual si no hay fechaInicio
                      if (!aud.fechaInicio) {
                        console.log('[ProgramaAnualCIG] Auditoría sin fechaInicio pero con metadata, incluyendo:', aud.id, aud.codigo);
                        return true;
                      }
                    }
                    
                    if (!aud.fechaInicio) {
                      console.log('[ProgramaAnualCIG] Auditoría sin fechaInicio (filtrada):', aud.id, aud.codigo);
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
                    
                    const esDelAño = añoAud === añoActual;
                    if (!esDelAño) {
                      console.log('[ProgramaAnualCIG] Auditoría fuera del año actual (filtrada):', aud.id, aud.codigo, 'año:', añoAud, 'esperado:', añoActual);
                    } else {
                      console.log('[ProgramaAnualCIG] Auditoría incluida:', aud.id, aud.codigo, 'fechaInicio:', aud.fechaInicio);
                    }
                    return esDelAño;
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
                  
                  const auditoriasMapeadas = auditoriasAnoActual.map(mapearAuditoriaAPrograma);
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
                <Badge variant="default" size="sm">
                  {aud.codigo}
                </Badge>
                <Badge 
                  variant={aud.tipo === 'Sede' ? 'info' : 'success'} 
                  size="sm"
                >
                  {aud.tipo === 'Sede' ? <Building2 className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                  <span className="ml-1">{aud.tipo}</span>
                </Badge>
                <Badge 
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
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                  P: {aud.fases.planeacion.duracionDias}d
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                  E: {aud.fases.ejecucion.duracionDias}d
                </span>
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
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

  useEffect(() => {
    if (isOpen) {
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
    try {
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
    } catch (error) {
      console.error('[ModalEditarAuditoria] Error al guardar:', error);
    } finally {
      setGuardando(false);
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
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duracionPlaneacion}
                  onChange={(e) => setFormData({ ...formData, duracionPlaneacion: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Ejecución
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duracionEjecucion}
                  onChange={(e) => setFormData({ ...formData, duracionEjecucion: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Comunicación
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.duracionComunicacion}
                  onChange={(e) => setFormData({ ...formData, duracionComunicacion: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
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
          <ButtonSIGL variant="secondary" onClick={onClose}>
            Cancelar
          </ButtonSIGL>
          <ButtonSIGL variant="primary" onClick={handleGuardar}>
            <Save className="w-4 h-4 mr-2" />
            Guardar Cambios
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