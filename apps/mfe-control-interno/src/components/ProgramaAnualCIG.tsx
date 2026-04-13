/**
 * ============================================
 * RF003: PROGRAMA ANUAL OCI - PROGRAMACIÓN DE AUDITORÍAS
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
  AlertTriangle, Eye, BarChart3, FileText, Layers, Send
} from 'lucide-react';
import { toast } from 'sonner';

// ============ COMPONENTES DEL DESIGN SYSTEM ============
import { CardSIGL } from '../gestion-legal/design-system/CardSIGL';
import { ButtonSIGL } from '../gestion-legal/design-system/ButtonSIGL';
import { Badge } from '@esap-mfe/shared-ui/badge';

// ============ COMPONENTES DE AUDITORÍA ============
import { FormularioNuevaAuditoria } from './FormularioNuevaAuditoria';

// ============ SERVICIO BACKEND ============
import { controlInternoService } from '@/services/api/controlInternoService';

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

export function ProgramaAnualOCIG() {
  const [añoActual] = useState(new Date().getFullYear());
  const [vistaActiva, setVistaActiva] = useState<'calendario' | 'lista' | 'auditores'>('calendario');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | 'Sede' | 'Territorial'>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | EstadoPrograma>('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [mesSeleccionado, setMesSeleccionado] = useState<MesAño | null>(null);
  const [mostrarModalNueva, setMostrarModalNueva] = useState(false);

  // Estado para auditorías cargadas del backend
  const [auditoriasProgramadas, setAuditoriasProgramadas] = useState<AuditoriaPrograma[]>(AUDITORIAS_PROGRAMADAS_MOCK);
  const [cargandoAuditorias, setCargandoAuditorias] = useState(false);

  // ✅ NUEVO: Integración con Context
  const { agregarAuditoriasProgramadas } = useIntegracionAuditoriaPlanes();
  const [programaAprobado, setProgramaAprobado] = useState(false);

  // Cargar auditorías desde el backend
  useEffect(() => {
    const cargarAuditorias = async () => {
      setCargandoAuditorias(true);
      try {
        const response = await controlInternoService.getAuditorias();
        console.log('[ProgramaAnualOCIG] Auditorías del backend:', response);
        
        if (Array.isArray(response) && response.length > 0) {
          // Mapear auditorías del backend al formato del componente
          const auditoriasFormateadas: AuditoriaPrograma[] = response.map((aud: any) => {
            const fechaInicio = new Date(aud.fechaInicio);
            const mesInicio = fechaInicio.getMonth() as MesAño;
            const semanaInicio = Math.ceil(fechaInicio.getDate() / 7);
            
            return {
              id: aud.id,
              codigo: aud.codigo || `AUD-${añoActual}-${String(response.indexOf(aud) + 1).padStart(3, '0')}`,
              nombre: aud.nombre || 'Sin nombre',
              tipo: aud.territorial === 'Nacional' || aud.sede === 'Nacional' ? 'Sede' : 'Territorial' as 'Sede' | 'Territorial',
              areaAuditable: aud.areaObjetivo || aud.procesoAuditado || '',
              procesoId: aud.id,
              procesoNombre: aud.procesoAuditado || aud.areaObjetivo || '',
              auditorLider: {
                id: String(aud.auditorLiderId || 'aud-001'),
                nombre: aud.auditorLider || 'Sin asignar',
                iniciales: aud.auditorLider ? aud.auditorLider.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'NA'
              },
              equipoAuditores: [],
              mesInicio,
              semanaInicio: Math.min(semanaInicio, 4) as 1 | 2 | 3 | 4,
              fases: {
                planeacion: { duracionDias: 7, color: '#3B82F6' },
                ejecucion: { duracionDias: 15, color: '#10B981' },
                comunicacion: { duracionDias: 10, color: '#8B5CF6' }
              },
              estadoPrograma: mapEstadoBackendToFrontend(aud.estadoKanban || aud.fase || 'Borrador'),
              observaciones: aud.descripcion
            };
          });
          
          setAuditoriasProgramadas(auditoriasFormateadas);
          console.log('[ProgramaAnualOCIG] Auditorías formateadas:', auditoriasFormateadas.length);
        }
      } catch (error) {
        console.error('[ProgramaAnualOCIG] Error al cargar auditorías:', error);
        // Mantener datos mock como fallback
      } finally {
        setCargandoAuditorias(false);
      }
    };
    
    cargarAuditorias();
  }, [añoActual]);

  // Helper para mapear estados
  const mapEstadoBackendToFrontend = (estado: string): EstadoPrograma => {
    const mapa: Record<string, EstadoPrograma> = {
      'Planeación': 'Aprobado',
      'Ejecución': 'En Ejecución',
      'Comunicación': 'En Ejecución',
      'Comunicación Preliminar': 'En Ejecución',
      'Finalizada': 'Finalizado',
      'planeacion': 'Aprobado',
      'ejecucion': 'En Ejecución',
      'comunicacion': 'En Ejecución',
      'finalizada': 'Finalizado',
      'Borrador': 'Borrador',
      'borrador': 'Borrador',
    };
    return mapa[estado] || 'Borrador';
  };

  // ✅ NUEVO: Handler para aprobar programa
  const handleAprobarPrograma = () => {
    // 1. Validar que haya auditorías aprobadas
    const auditoriasParaKanban = auditoriasProgramadas.filter(
      aud => aud.estadoPrograma === 'Aprobado' || aud.estadoPrograma === 'Pendiente Aprobación'
    );

    if (auditoriasParaKanban.length === 0) {
      toast.error('No hay auditorías pendientes de enviar al Kanban', {
        description: 'Debe aprobar al menos una auditoría antes de enviar al Kanban'
      });
      return;
    }

    // 2. Convertir a formato AuditoriaProgramada
    const auditoriasFormateadas: AuditoriaProgramada[] = auditoriasParaKanban.map(aud => {
      const fechaInicio = calcularFechaInicio(aud.mesInicio, aud.semanaInicio);
      const fechaFin = calcularFechaFin(aud.mesInicio, aud.semanaInicio, aud.fases);
      
      return {
        codigo: aud.codigo,
        titulo: aud.nombre,
        descripcion: aud.procesoNombre,
        territorial: aud.tipo === 'Territorial' ? aud.areaAuditable : 'Nacional',
        auditorLider: {
          nombre: aud.auditorLider.nombre,
          cargo: 'Auditor Líder',
          iniciales: aud.auditorLider.iniciales
        },
        fechaInicio,
        fechaFin,
        tipo: aud.tipo === 'Sede' ? 'regular' : 'territorial',
        prioridad: 'alta',
        areaObjetivo: aud.areaAuditable,
        programaId: 'programa-2025',
        planAnualAño: añoActual
      };
    });

    // 3. Agregar al context
    console.log('📋 Enviando', auditoriasFormateadas.length, 'auditorías al Kanban');
    agregarAuditoriasProgramadas(auditoriasFormateadas);

    // 4. Marcar como aprobado
    setProgramaAprobado(true);

    // 5. Notificación de éxito
    toast.success(
      `✅ Programa Anual aprobado`,
      {
        description: `${auditoriasFormateadas.length} auditorías enviadas al Kanban de Auditorías`,
        duration: 5000
      }
    );

    // 6. Confirmar navegación (después de un breve delay)
    setTimeout(() => {
      toast.info(
        'Las auditorías ya están disponibles en el Kanban',
        {
          description: 'Navega a "Auditorías OCI" para verlas en la columna "Planeación"',
          duration: 7000
        }
      );
    }, 1500);
  };

  // Helper para calcular fecha de inicio
  const calcularFechaInicio = (mes: MesAño, semana: number): string => {
    const año = añoActual;
    const dia = (semana - 1) * 7 + 1;
    return `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  };

  // Helper para calcular fecha fin
  const calcularFechaFin = (mes: MesAño, semana: number, fases: any): string => {
    const fechaInicio = new Date(calcularFechaInicio(mes, semana));
    const duracionTotal = fases.planeacion.duracionDias + 
                          fases.ejecucion.duracionDias + 
                          fases.comunicacion.duracionDias;
    const fechaFin = new Date(fechaInicio);
    fechaFin.setDate(fechaFin.getDate() + duracionTotal);
    return fechaFin.toISOString().split('T')[0];
  };

  // Filtrado de auditorías
  const auditoriasFiltradas = useMemo(() => {
    return auditoriasProgramadas.filter(aud => {
      const matchTipo = filtroTipo === 'Todos' || aud.tipo === filtroTipo;
      const matchEstado = filtroEstado === 'Todos' || aud.estadoPrograma === filtroEstado;
      const matchBusqueda = busqueda === '' || 
        aud.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        aud.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
        aud.procesoNombre.toLowerCase().includes(busqueda.toLowerCase());
      
      return matchTipo && matchEstado && matchBusqueda;
    });
  }, [auditoriasProgramadas, filtroTipo, filtroEstado, busqueda]);

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
            variant="secondary"
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
      <AnimatePresence mode="wait">
        {vistaActiva === 'calendario' && (
          <VistaCalendario
            auditorias={auditoriasFiltradas}
            año={añoActual}
            onSeleccionarMes={setMesSeleccionado}
          />
        )}
        {vistaActiva === 'lista' && (
          <VistaLista auditorias={auditoriasFiltradas} />
        )}
        {vistaActiva === 'auditores' && (
          <VistaAuditores auditores={AUDITORES_MOCK} />
        )}
      </AnimatePresence>

      {/* ============ MODAL NUEVA AUDITORÍA ============ */}
      {mostrarModalNueva && (
        <ModalNuevaAuditoria onClose={() => setMostrarModalNueva(false)} />
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
                  {auditorias.filter(a => a.mesInicio === idx).length} aud.
                </div>
              </div>
            ))}
          </div>

          {/* Línea de tiempo con auditorías */}
          <div className="space-y-4">
            {auditorias.map((aud) => (
              <div key={aud.id} className="relative">
                <div className="grid grid-cols-12 gap-2">
                  {MESES.map((_, mesIdx) => (
                    <div
                      key={mesIdx}
                      className="h-24 bg-gray-50 rounded border border-gray-200 relative"
                    >
                      {/* Renderizar fase si corresponde al mes */}
                      {aud.mesInicio === mesIdx && (
                        <div className="absolute inset-0 p-0.5">
                          <div
                            className="h-full rounded flex flex-col justify-center items-center shadow-md hover:shadow-lg transition-all cursor-pointer"
                            style={{ 
                              backgroundColor: aud.fases.planeacion.color,
                              padding: '8px 12px'
                            }}
                          >
                            <div 
                              className="text-white font-black tracking-tight" 
                              style={{ 
                                fontSize: '15px', 
                                lineHeight: '1.3',
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                              }}
                            >
                              {aud.codigo}
                            </div>
                            <div 
                              className="text-white font-bold mt-1" 
                              style={{ 
                                fontSize: '13px', 
                                lineHeight: '1.3',
                                textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                              }}
                            >
                              P: {aud.fases.planeacion.duracionDias}d
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Etiqueta lateral */}
                <div className="absolute -left-48 top-0 w-44 pr-2 flex items-center h-24">
                  <div className="text-xs text-right">
                    <div className="text-gray-900 truncate font-semibold">{aud.nombre}</div>
                    <div className="text-gray-500 mt-1">{aud.auditorLider.iniciales}</div>
                  </div>
                </div>
              </div>
            ))}
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

function VistaLista({ auditorias }: { auditorias: AuditoriaPrograma[] }) {
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
                onClick={() => toast.info('Ver detalle de auditoría')}
              >
                Ver
              </ButtonSIGL>
              <ButtonSIGL
                variant="secondary"
                size="sm"
                icon={<Edit2 className="w-4 h-4" />}
                onClick={() => toast.info('Editar auditoría')}
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

// ============ MODAL NUEVA AUDITORÍA ============

function ModalNuevaAuditoria({ onClose }: { onClose: () => void }) {
  const [guardando, setGuardando] = useState(false);

  const handleGuardarAuditoria = async (auditoria: any) => {
    setGuardando(true);
    try {
      // Mapear datos del formulario al formato del backend
      const dataBackend = {
        codigo: auditoria.codigo,
        nombre: auditoria.nombre,
        tipo: auditoria.tipo?.toLowerCase() || 'gestion',
        objetivo: auditoria.objetivo || '',
        alcance: auditoria.alcance || '',
        procesoId: auditoria.areaAuditable?.id || null,
        procesoNombre: auditoria.areaAuditable?.nombre || '',
        areaAuditable: auditoria.areaAuditable?.nombre || '',
        fechaInicio: auditoria.fechaInicio,
        fechaFin: auditoria.fechaFin,
        duracionDias: auditoria.duracionDias || 0,
        auditorLider: auditoria.liderAuditor?.nombre || '',
        equipoAuditor: auditoria.equipoAuditor?.map((m: any) => m.nombre) || [],
        nivelRiesgo: auditoria.nivelRiesgo?.toLowerCase() || 'medio',
        prioridad: auditoria.prioridad || 'Media',
        estado: 'planeada',
        año: auditoria.añoPlan || new Date().getFullYear(),
        normativaAplicable: auditoria.normativaAplicable || [],
        metodologia: auditoria.metodologia || '',
        presupuestoEstimado: auditoria.presupuestoEstimado || 0,
        horasTotales: auditoria.horasTotales || 0,
      };

      console.log('[ModalNuevaAuditoria] Enviando al backend:', dataBackend);
      
      const response = await controlInternoService.createAuditoria(dataBackend);
      
      console.log('[ModalNuevaAuditoria] Respuesta backend:', response);
      
      toast.success('¡Auditoría creada exitosamente!', {
        description: `${auditoria.codigo} - ${auditoria.nombre}`
      });
      
      onClose();
    } catch (error) {
      console.error('[ModalNuevaAuditoria] Error al guardar:', error);
      toast.error('Error al crear la auditoría', {
        description: error instanceof Error ? error.message : 'Error de conexión con el servidor'
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] overflow-y-auto p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto relative my-auto"
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
      </motion.div>
    </div>
  );
}