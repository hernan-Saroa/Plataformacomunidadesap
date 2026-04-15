/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CRONOGRAMA VISUAL PREMIUM - PROGRAMA ANUAL DE AUDITORÍAS
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Vista de cronograma multi-nivel con vistas:
 * - DÍA: Timeline diario con horas
 * - SEMANA: Vista semanal con días
 * - MES: Calendario mensual tipo Gantt
 * - AÑO: Vista anual trimestral
 * 
 * Características:
 * - Colores por estado de auditoría
 * - Tooltips con información detallada
 * - Filtros dinámicos
 * - Exportación
 * - Navegación temporal
 * - 100% Responsive
 * 
 * Diseño: World Class Premium ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Activity,
  CheckCircle2,
  X as XIcon,
  Filter,
  Download,
  Eye,
  Grid3x3,
  BarChart3,
  Users,
  Target,
  Search, // 🆕 Agregado
  MapPin, // 🆕 Agregado
  CalendarOff,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

// 🆕 Importar datos de territoriales y CETAP
import { TERRITORIALES_ESAP } from '../../../data/territoriales-cetap-completo';
// ✅ Importar tipos del hook para compatibilidad
import {
  resolverColumnaKanban,
  type AuditoriaProgramadaUI,
  type ColumnaKanban,
  type TipoAuditoria as TipoAuditoriaHook,
  type EstadoAuditoria as EstadoAuditoriaHook,
} from './hooks/useProgramaAnualData';
import { esFestivo } from '../gestion-legal/utils/diasHabiles';

/** Colores por columna del tablero (misma semántica que `resolverColumnaKanban`) */
const COLORES_POR_COLUMNA_KANBAN: Record<
  ColumnaKanban,
  { bg: string; border: string; text: string }
> = {
  plan_anual: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
  planeacion: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
  ejecucion: { bg: '#FEF08A', border: '#F59E0B', text: '#854D0E' },
  comunicacion: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  seguimiento: { bg: '#EDE9FE', border: '#7C3AED', text: '#5B21B6' },
  finalizada: { bg: '#E0E7FF', border: '#6366F1', text: '#4338CA' },
  desconocido: { bg: '#F3F4F6', border: '#6B7280', text: '#374151' },
};

const ETIQUETA_COLUMNA_KANBAN: Record<ColumnaKanban, string> = {
  plan_anual: 'Plan Anual',
  planeacion: 'Planeación',
  ejecucion: 'Ejecución',
  comunicacion: 'Comunicación',
  seguimiento: 'Seguimiento',
  finalizada: 'Finalizada',
  desconocido: 'Desconocido',
};

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type VistaCalendario = 'dia' | 'semana' | 'mes' | 'año';
/** Solo las 3 columnas del flujo principal; Plan Anual, Seguimiento y Finalizada se ven en «Todas» */
type FiltroColumnaCronograma = 'TODOS' | 'planeacion' | 'ejecucion' | 'comunicacion';
type EstadoAuditoria = EstadoAuditoriaHook; // Usar tipo del hook
// Tipo técnico de auditoría (del hook): GESTION, CUMPLIMIENTO, etc.
type TipoAuditoria = TipoAuditoriaHook;
// Tipo operativo para filtros visuales: Regular / Territorial / Especial
type TipoFiltroOperativo = 'regular' | 'territorial' | 'especial';

interface AuditoriaProgramada {
  id: string;
  nombre: string;
  tipo: TipoAuditoria;
  proceso: { nombre: string; codigo?: string };
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoAuditoria;
  /** Columna Kanban del backend (misma que en `AuditoriaProgramadaUI`) */
  estadoKanban?: string;
  /** Fase backend — usada por `resolverColumnaKanban` si falta estadoKanban */
  fase?: string;
  auditorLider: string;
  equipo: string[];
  avance: number;
  horasEstimadas: number;
  trimestre: 1 | 2 | 3 | 4;
  territorial: string; // 🆕 Propiedad territorial
}

interface CronogramaAuditoriasPremiumProps {
  auditorias: AuditoriaProgramada[] | AuditoriaProgramadaUI[];
  vigencia?: number;
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS Y CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

const COLORES_ESTADO = {
  'PROGRAMADA': { bg: '#DBEAFE', border: '#3B82F6', text: '#1E40AF' },
  'EN_EJECUCION': { bg: '#FEF08A', border: '#F59E0B', text: '#854D0E' },
  'COMPLETADA': { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
  'CANCELADA': { bg: '#FEE2E2', border: '#EF4444', text: '#991B1B' }
};

// Etiquetas de etapas (alineadas con workflow de auditoría: Planeación, Ejecución, Comunicación)
const LABELS_ESTADO: Record<keyof typeof COLORES_ESTADO, string> = {
  'PROGRAMADA': 'Planeación',
  'EN_EJECUCION': 'Ejecución',
  'COMPLETADA': 'Comunicación',
  'CANCELADA': 'Cancelada'
};

/**
 * Color y etiqueta de lista/cards: misma regla que filtros y tablero (`resolverColumnaKanban`).
 * Evita que columnas como Seguimiento o Plan Anual caigan en COMPLETADA → "Comunicación".
 */
function obtenerEstadoVisual(auditoria: any): { colores: typeof COLORES_ESTADO['PROGRAMADA']; label: string } {
  const estadoKanban = auditoria.estadoKanban as string | undefined;
  const fase = auditoria.fase as string | undefined;
  const estado = auditoria.estado as EstadoAuditoriaHook | undefined;

  const columna = resolverColumnaKanban(estadoKanban, fase, estado);
  if (columna !== 'desconocido') {
    return {
      colores: COLORES_POR_COLUMNA_KANBAN[columna],
      label: ETIQUETA_COLUMNA_KANBAN[columna],
    };
  }

  const estadoUI = auditoria.estado as keyof typeof COLORES_ESTADO;
  return {
    colores: COLORES_ESTADO[estadoUI] || COLORES_ESTADO['PROGRAMADA'],
    label: LABELS_ESTADO[estadoUI] || String(estadoUI ?? '').replace(/_/g, ' ') || 'Desconocido',
  };
}

const COLORES_TIPO: Record<string, string> = {
  // Tipos legacy
  'regular': '#3B82F6',
  'territorial': '#8B5CF6',
  'especial': '#EF4444',
  // Tipos del hook
  'CUMPLIMIENTO': '#3B82F6',
  'GESTION': '#10B981',
  'FINANCIERA': '#F59E0B',
  'TI': '#6366F1',
  'ESPECIAL': '#EF4444'
};

/** Color por tipo de auditoría (backend puede enviar Regular, GESTION, etc.) */
function colorBordePorTipo(tipo: unknown): string {
  const raw = String(tipo ?? '').trim();
  if (!raw) return COLORES_TIPO.regular;
  if (COLORES_TIPO[raw]) return COLORES_TIPO[raw];
  const lower = raw.toLowerCase();
  if (COLORES_TIPO[lower]) return COLORES_TIPO[lower];
  const upper = raw.toUpperCase();
  if (COLORES_TIPO[upper]) return COLORES_TIPO[upper];
  if (lower.includes('territorial')) return COLORES_TIPO.territorial;
  if (lower.includes('especial')) return COLORES_TIPO.especial;
  return COLORES_TIPO.regular;
}

/** Auditorías en el rango del día; en festivos nacionales no se muestran chips (sáb/dom se tratan como días normales). */
function auditoriasEnRangoDiaLaborable(
  dia: Date,
  auditorias: AuditoriaProgramada[]
): AuditoriaProgramada[] {
  if (esFestivo(dia)) return [];
  return auditorias.filter((aud) => {
    const inicio = new Date(aud.fechaInicio);
    const fin = new Date(aud.fechaFin);
    return dia >= inicio && dia <= fin;
  });
}

/** Estilo rojo institucional para días festivos en el calendario */
function estiloDiaFestivo(): {
  cardClass: string;
  badgeClass: string;
  Icon: LucideIcon;
  titulo: string;
  subtitulo: string;
} {
  return {
    cardClass:
      'bg-gradient-to-br from-red-50 via-rose-50 to-red-100/90 border-red-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.75)] ring-1 ring-red-200/60',
    badgeClass:
      'bg-gradient-to-r from-red-700 to-red-800 text-white shadow-md ring-1 ring-red-900/25',
    Icon: CalendarOff,
    titulo: 'Festivo nacional',
    subtitulo: 'Sin actividades de auditoría',
  };
}

function safeNombre(val: unknown): string {
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.nombre === 'string') return obj.nombre;
    if (typeof obj.personaId === 'string') return obj.personaId;
    if (typeof obj.rolOCI === 'string') return obj.rolOCI;
    if (typeof obj.id === 'string') return obj.id;
  }
  return 'No asignado';
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function CronogramaAuditoriasPremium({
  auditorias,
  vigencia = new Date().getFullYear()
}: CronogramaAuditoriasPremiumProps) {
  
  const [vista, setVista] = useState<VistaCalendario>('mes');
  const [fechaActual, setFechaActual] = useState(new Date());
  
  // Filtro por columna: solo Planeación / Ejecución / Comunicación (el resto de columnas Kanban se listan en «Todas»)
  const [busqueda, setBusqueda] = useState('');
  const [filtroColumna, setFiltroColumna] = useState<FiltroColumnaCronograma>('TODOS');
  // Filtro por tipo operativo (Regular / Territorial / Especial)
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltroOperativo | 'TODOS'>('TODOS');
  const [filtroTerritorial, setFiltroTerritorial] = useState<string>('Todas las Territoriales');
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<AuditoriaProgramada | null>(null);

  // Filtrar auditorías con TODOS los criterios
  const auditoriasFiltradas = useMemo(() => {
    return auditorias.filter(aud => {
      const ui = aud as AuditoriaProgramadaUI;
      const col = resolverColumnaKanban(ui.estadoKanban, ui.fase, ui.estado);

      if (filtroColumna !== 'TODOS' && col !== filtroColumna) {
        return false;
      }
      
      // Filtro de búsqueda por nombre
      const codigoProceso = (aud as any).proceso?.codigo ?? '';
      const cumpleBusqueda =
        busqueda === '' ||
        aud.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        String(codigoProceso).toLowerCase().includes(busqueda.toLowerCase());
      
      // Filtro de tipo (usamos el tipo operativo mapeado en el hook:
      // 'regular' | 'territorial' | 'especial')
      const tipoOperativoRaw = (aud as any).tipoOperativo as string | undefined;
      const tipoKanbanRaw = (aud as any).tipoKanban as string | undefined;
      const tipoBackendRaw = (aud as any).tipo as string | undefined;

      // Normalizamos el tipo operativo usando varias fuentes posibles:
      // 1. tipoOperativo (si viene del hook)
      // 2. tipoKanban (si viene del backend de kanban)
      // 3. tipo backend "Regular / Territorial / Especial" (no los técnicos GESTION / CUMPLIMIENTO)
      let tipoAudNormalizado: string | undefined;

      if (typeof tipoOperativoRaw === 'string' && tipoOperativoRaw.trim() !== '') {
        tipoAudNormalizado = tipoOperativoRaw.toLowerCase();
      } else if (typeof tipoKanbanRaw === 'string' && tipoKanbanRaw.trim() !== '') {
        tipoAudNormalizado = tipoKanbanRaw.toLowerCase();
      } else if (typeof tipoBackendRaw === 'string' && tipoBackendRaw.trim() !== '') {
        const tipoLower = tipoBackendRaw.toLowerCase();
        // Si el backend envía directamente Regular / Territorial / Especial
        if (['regular', 'territorial', 'especial'].includes(tipoLower)) {
          tipoAudNormalizado = tipoLower;
        } else if (tipoLower === 'especial') {
          // Cuando el tipo técnico es ESPECIAL, lo tratamos como operativo "especial"
          tipoAudNormalizado = 'especial';
        } else if (tipoLower === 'gestion') {
          // Cuando solo sabemos que es GESTION, lo asumimos como "regular" por defecto
          tipoAudNormalizado = 'regular';
        }
      }

      const cumpleTipo =
        filtroTipo === 'TODOS' ||
        (typeof tipoAudNormalizado === 'string' &&
          tipoAudNormalizado === (filtroTipo as string).toLowerCase());
      
      // Filtro territorial (aquí asumimos que las auditorías tienen una propiedad territorial)
      // Si no existe en el tipo, esto se puede ignorar o adaptar
      const cumpleTerritorial =
        filtroTerritorial === 'Todas las Territoriales' ||
        (typeof aud.territorial === 'string' && aud.territorial === filtroTerritorial);
      
      return cumpleBusqueda && cumpleTipo && cumpleTerritorial;
    });
  }, [auditorias, busqueda, filtroColumna, filtroTipo, filtroTerritorial]);

  // Navegación de fechas
  const navegarFecha = (direccion: 'anterior' | 'siguiente') => {
    const nuevaFecha = new Date(fechaActual);
    
    if (vista === 'dia') {
      nuevaFecha.setDate(fechaActual.getDate() + (direccion === 'siguiente' ? 1 : -1));
    } else if (vista === 'semana') {
      nuevaFecha.setDate(fechaActual.getDate() + (direccion === 'siguiente' ? 7 : -7));
    } else if (vista === 'mes') {
      nuevaFecha.setMonth(fechaActual.getMonth() + (direccion === 'siguiente' ? 1 : -1));
    } else if (vista === 'año') {
      nuevaFecha.setFullYear(fechaActual.getFullYear() + (direccion === 'siguiente' ? 1 : -1));
    }
    
    setFechaActual(nuevaFecha);
  };

  const irHoy = () => {
    setFechaActual(new Date());
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER CON CONTROLES */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] px-6 py-4 border-b-4 border-[#F57C00]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">
                Cronograma de Auditorías {vigencia}
              </h2>
              <p className="text-xs text-white/80 font-medium">
                {auditoriasFiltradas.length} auditorías programadas
              </p>
            </div>
          </div>

          {/* Controles de Vista */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVista('dia')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                vista === 'dia'
                  ? 'bg-white text-[#003DA5]'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Día
            </button>
            <button
              onClick={() => setVista('semana')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                vista === 'semana'
                  ? 'bg-white text-[#003DA5]'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setVista('mes')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                vista === 'mes'
                  ? 'bg-white text-[#003DA5]'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setVista('año')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                vista === 'año'
                  ? 'bg-white text-[#003DA5]'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              Año
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* BARRA DE NAVEGACIÓN Y FILTROS */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gray-50 px-6 py-4 border-b-2 border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          {/* Navegación temporal */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navegarFecha('anterior')}
              className="p-2 bg-white border-2 border-gray-300 hover:border-[#2962FF] rounded-lg transition-all"
            >
              <ChevronLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={irHoy}
              className="px-4 py-2 bg-white border-2 border-gray-300 hover:border-[#2962FF] rounded-lg text-sm font-bold text-gray-700 transition-all"
            >
              Hoy
            </button>
            <button
              onClick={() => navegarFecha('siguiente')}
              className="p-2 bg-white border-2 border-gray-300 hover:border-[#2962FF] rounded-lg transition-all"
            >
              <ChevronRight className="w-4 h-4 text-gray-700" />
            </button>
            <div className="text-lg font-black text-[#003DA5]">
              {getTituloFecha(fechaActual, vista)}
            </div>
          </div>

          {/* Filtros y Acciones */}
          <div className="flex items-center gap-2">
            {/* Filtro Estado */}
            <select
              value={filtroColumna}
              onChange={(e) =>
                setFiltroColumna(e.target.value as FiltroColumnaCronograma)
              }
              className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-xs font-bold focus:border-[#2962FF] outline-none"
              title="Plan Anual, Seguimiento y Finalizada solo aparecen al elegir «Todas las etapas»"
            >
              <option value="TODOS">Todas las etapas</option>
              <option value="planeacion">Planeación</option>
              <option value="ejecucion">Ejecución</option>
              <option value="comunicacion">Comunicación</option>
            </select>

            {/* Filtro Tipo (operativo: Regular / Territorial / Especial) */}
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as TipoFiltroOperativo | 'TODOS')}
              className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-xs font-bold focus:border-[#2962FF] outline-none"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="regular">Regular</option>
              <option value="territorial">Territorial</option>
              <option value="especial">Especial</option>
            </select>

            {/* Filtro Territorial */}
            <select
              value={filtroTerritorial}
              onChange={(e) => setFiltroTerritorial(e.target.value)}
              className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-xs font-bold focus:border-[#2962FF] outline-none"
            >
              <option value="Todas las Territoriales">Todas las Territoriales</option>
              {TERRITORIALES_ESAP.map((territorial) => (
                <option key={territorial.id} value={territorial.nombre}>
                  {territorial.nombre}
                </option>
              ))}
            </select>

            {/* Buscador */}
            <div className="relative">
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar..."
                className="px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-xs font-bold focus:border-[#2962FF] outline-none"
              />
              <Search className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 text-gray-500" />
            </div>

            {/* Exportar */}
            <button
              onClick={() => toast.success('Exportando cronograma...')}
              className="px-3 py-2 bg-white border-2 border-gray-300 hover:border-[#2962FF] rounded-lg text-xs font-bold flex items-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONTENIDO DEL CRONOGRAMA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="p-6 min-h-[600px] bg-gradient-to-br from-gray-50 to-blue-50/30">
        <AnimatePresence mode="wait">
          {vista === 'dia' && (
            <VistaDia
              key="dia"
              fecha={fechaActual}
              auditorias={auditoriasFiltradas}
              onSeleccionar={setAuditoriaSeleccionada}
            />
          )}
          {vista === 'semana' && (
            <VistaSemana
              key="semana"
              fecha={fechaActual}
              auditorias={auditoriasFiltradas}
              onSeleccionar={setAuditoriaSeleccionada}
            />
          )}
          {vista === 'mes' && (
            <VistaMes
              key="mes"
              fecha={fechaActual}
              auditorias={auditoriasFiltradas}
              onSeleccionar={setAuditoriaSeleccionada}
            />
          )}
          {vista === 'año' && (
            <VistaAño
              key="año"
              fecha={fechaActual}
              auditorias={auditoriasFiltradas}
              onSeleccionar={setAuditoriaSeleccionada}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* LEYENDA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gray-50 px-6 py-4 border-t-2 border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="text-xs font-bold text-gray-600">Estados:</span>
            {(['planeacion', 'ejecucion', 'comunicacion', 'seguimiento', 'finalizada'] as ColumnaKanban[]).map((col) => {
              const colores = COLORES_POR_COLUMNA_KANBAN[col];
              return (
                <div key={col} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded border-2"
                    style={{ backgroundColor: colores.bg, borderColor: colores.border }}
                  />
                  <span className="text-xs font-semibold text-gray-700">
                    {ETIQUETA_COLUMNA_KANBAN[col]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal de detalle (si se selecciona una auditoría) */}
      {auditoriaSeleccionada && (
        <ModalDetalleAuditoria
          auditoria={auditoriaSeleccionada}
          onCerrar={() => setAuditoriaSeleccionada(null)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA DÍA
// ════════════════════════════════════════════════════════════════════════════

interface VistaDiaProps {
  fecha: Date;
  auditorias: AuditoriaProgramada[];
  onSeleccionar: (auditoria: AuditoriaProgramada) => void;
}

function VistaDia({ fecha, auditorias, onSeleccionar }: VistaDiaProps) {
  const auditoriasDelDia = auditoriasEnRangoDiaLaborable(fecha, auditorias);
  const esFestivoDia = esFestivo(fecha);
  const festivoStyle = esFestivoDia ? estiloDiaFestivo() : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <h3 className="text-lg font-black text-[#003DA5] mb-2">
          {fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </h3>
        <p className="text-sm text-gray-600">
          {esFestivoDia
            ? 'Festivo nacional: no se programan actividades de auditoría este día.'
            : `${auditoriasDelDia.length} auditoría(s) en curso`}
        </p>
      </div>

      {esFestivoDia && festivoStyle ? (
        <div
          className={`rounded-2xl border-2 border-red-200 p-8 text-center ${festivoStyle.cardClass}`}
        >
          <div
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold mb-3 ${festivoStyle.badgeClass}`}
          >
            <festivoStyle.Icon className="w-5 h-5 shrink-0" aria-hidden />
            {festivoStyle.titulo}
          </div>
          <p className="text-red-950/90 font-semibold text-sm mb-1">{festivoStyle.subtitulo}</p>
          <p className="text-red-900/70 text-xs leading-relaxed max-w-md mx-auto">
            Los sábados y domingos se muestran con normalidad; solo los festivos oficiales bloquean la vista de auditorías.
          </p>
        </div>
      ) : auditoriasDelDia.length > 0 ? (
        <div className="space-y-3">
          {auditoriasDelDia.map((aud) => (
            <CardAuditoria
              key={aud.id}
              auditoria={aud}
              onClick={() => onSeleccionar(aud)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
          <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 font-semibold">No hay auditorías programadas para este día</p>
        </div>
      )}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA SEMANA
// ════════════════════════════════════════════════════════════════════════════

interface VistaSemanaProps {
  fecha: Date;
  auditorias: AuditoriaProgramada[];
  onSeleccionar: (auditoria: AuditoriaProgramada) => void;
}

function VistaSemana({ fecha, auditorias, onSeleccionar }: VistaSemanaProps) {
  // Obtener inicio y fin de la semana
  const inicioSemana = new Date(fecha);
  inicioSemana.setDate(fecha.getDate() - fecha.getDay());
  
  const diasSemana = Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(inicioSemana);
    dia.setDate(inicioSemana.getDate() + i);
    return dia;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4 overflow-x-auto"
    >
      <div className="grid grid-cols-7 gap-2 min-w-[700px]">
        {diasSemana.map((dia, idx) => {
          const auditoriasDelDia = auditoriasEnRangoDiaLaborable(dia, auditorias);
          const esFestivoDia = esFestivo(dia);
          const festivoStyle = esFestivoDia ? estiloDiaFestivo() : null;

          const esHoy = dia.toDateString() === new Date().toDateString();

          return (
            <div
              key={idx}
              className={`rounded-xl border-2 p-3 min-h-[200px] transition-shadow ${
                esFestivoDia && festivoStyle
                  ? `${festivoStyle.cardClass}`
                  : 'bg-white ' + (esHoy ? 'border-[#F57C00] ring-2 ring-[#F57C00]/30' : 'border-gray-200')
              }`}
            >
              <div className="text-center mb-3">
                <div className="text-xs font-bold text-gray-500 uppercase">
                  {DIAS_SEMANA[dia.getDay()]}
                </div>
                <div className={`text-2xl font-black ${
                  esHoy ? 'text-[#F57C00]' : 'text-gray-900'
                }`}>
                  {dia.getDate()}
                </div>
              </div>

              <div className="space-y-2">
                {esFestivoDia && festivoStyle && (
                  <div className="flex flex-col items-center gap-1 py-1">
                    <span
                      className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${festivoStyle.badgeClass}`}
                    >
                      <festivoStyle.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      Festivo
                    </span>
                    <span className="text-[9px] text-center text-red-800/90 font-medium leading-snug px-1">
                      {festivoStyle.subtitulo}
                    </span>
                  </div>
                )}
                {auditoriasDelDia.slice(0, 3).map((aud) => {
                  const { colores } = obtenerEstadoVisual(aud);
                  return (
                    <button
                      key={aud.id}
                      onClick={() => onSeleccionar(aud)}
                      className="w-full p-2 rounded-lg text-left text-xs font-bold transition-all hover:scale-105"
                      style={{
                        backgroundColor: colores.bg,
                        color: colores.text,
                        borderLeft: `3px solid ${colorBordePorTipo(aud.tipo)}`
                      }}
                    >
                      <div className="truncate">{aud.nombre}</div>
                    </button>
                  );
                })}
                {auditoriasDelDia.length > 3 && (
                  <div className="text-xs text-center text-gray-500 font-semibold">
                    +{auditoriasDelDia.length - 3} más
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA MES (CALENDARIO TIPO GANTT)
// ════════════════════════════════════════════════════════════════════════════

interface VistaMesProps {
  fecha: Date;
  auditorias: AuditoriaProgramada[];
  onSeleccionar: (auditoria: AuditoriaProgramada) => void;
}

function VistaMes({ fecha, auditorias, onSeleccionar }: VistaMesProps) {
  const primerDia = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
  const ultimoDia = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0);
  const diasDelMes = ultimoDia.getDate();
  const diaSemanaInicio = primerDia.getDay();
  const [diasExpandidos, setDiasExpandidos] = useState<Set<string>>(new Set());

  const toggleDiaExpandido = (diaKey: string) => {
    setDiasExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(diaKey)) {
        next.delete(diaKey);
      } else {
        next.add(diaKey);
      }
      return next;
    });
  };

  // Crear array de días del calendario (incluyendo días del mes anterior)
  const diasCalendario = [];
  for (let i = 0; i < diaSemanaInicio; i++) {
    diasCalendario.push(null);
  }
  for (let dia = 1; dia <= diasDelMes; dia++) {
    diasCalendario.push(new Date(fecha.getFullYear(), fecha.getMonth(), dia));
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-4 overflow-x-auto"
    >
      <div className="min-w-[700px] space-y-4">
        {/* Cabecera de días de la semana */}
        <div className="grid grid-cols-7 gap-2">
        {DIAS_SEMANA.map((dia) => (
          <div key={dia} className="text-center font-black text-sm text-gray-600 uppercase">
            {dia}
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="grid grid-cols-7 gap-2">
        {diasCalendario.map((dia, idx) => {
          if (!dia) {
            return <div key={idx} className="aspect-square" />;
          }

          const auditoriasDelDia = auditoriasEnRangoDiaLaborable(dia, auditorias);
          const esFestivoDia = esFestivo(dia);
          const festivoStyle = esFestivoDia ? estiloDiaFestivo() : null;

          const esHoy = dia.toDateString() === new Date().toDateString();
          const diaKey = `${fecha.getFullYear()}-${fecha.getMonth()}-${dia.getDate()}`;
          const estaExpandido = diasExpandidos.has(diaKey);
          const auditoriasAMostrar = auditoriasDelDia.slice(0, estaExpandido ? auditoriasDelDia.length : 4);

          return (
            <div
              key={idx}
              className={`rounded-lg border-2 p-2 min-h-[120px] transition-shadow ${
                esFestivoDia && festivoStyle
                  ? festivoStyle.cardClass
                  : 'bg-white ' + (esHoy ? 'border-[#F57C00] ring-2 ring-[#F57C00]/30' : 'border-gray-200')
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-1.5">
                <span
                  className={`text-sm font-black tabular-nums ${
                    esFestivoDia ? 'text-red-800' : esHoy ? 'text-[#F57C00]' : 'text-gray-900'
                  }`}
                >
                  {dia.getDate()}
                </span>
                {esFestivoDia && festivoStyle && (
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 shrink-0 ${festivoStyle.badgeClass}`}
                    title="Festivo nacional · sin auditorías"
                  >
                    <festivoStyle.Icon className="w-2.5 h-2.5" aria-hidden />
                  </span>
                )}
              </div>

              <div className={`space-y-1 ${estaExpandido ? 'max-h-[200px]' : 'max-h-[70px]'} overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent transition-all`}>
                {esFestivoDia && festivoStyle && (
                  <p className="text-[8px] font-bold text-center leading-tight text-red-800 mb-0.5 line-clamp-2">
                    Festivo · sin auditorías
                  </p>
                )}
                {auditoriasAMostrar.map((aud) => {
                  const { colores } = obtenerEstadoVisual(aud);
                  return (
                    <button
                      key={aud.id}
                      onClick={() => onSeleccionar(aud)}
                      className="w-full p-1 rounded text-left text-[9px] font-bold transition-all hover:scale-105 leading-tight"
                      style={{
                        backgroundColor: colores.bg,
                        color: colores.text,
                        borderLeft: `2px solid ${colorBordePorTipo(aud.tipo)}`
                      }}
                    >
                      <div className="truncate">{aud.nombre}</div>
                    </button>
                  );
                })}
                {auditoriasDelDia.length > 4 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDiaExpandido(diaKey);
                    }}
                    className="w-full text-[9px] text-center text-blue-600 hover:text-blue-800 font-bold py-0.5 hover:bg-blue-50 rounded transition-colors"
                    title={estaExpandido ? 'Click para contraer' : 'Click para ver todas las auditorías'}
                  >
                    {estaExpandido ? '▲ Contraer' : `+${auditoriasDelDia.length - 4} más`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// VISTA AÑO (GANTT CHART ANUAL)
// ════════════════════════════════════════════════════════════════════════════

interface VistaAñoProps {
  fecha: Date;
  auditorias: AuditoriaProgramada[];
  onSeleccionar: (auditoria: AuditoriaProgramada) => void;
}

function VistaAño({ fecha, auditorias, onSeleccionar }: VistaAñoProps) {
  const año = fecha.getFullYear();

  // Calcular el ancho y posición de cada auditoría en el timeline anual
  const getBarraAuditoria = (auditoria: AuditoriaProgramada) => {
    const inicioAño = new Date(año, 0, 1).getTime();
    const finAño = new Date(año, 11, 31).getTime();
    const duracionAño = finAño - inicioAño;

    const inicioAud = new Date(auditoria.fechaInicio).getTime();
    const finAud = new Date(auditoria.fechaFin).getTime();

    // Calcular porcentajes
    const left = Math.max(0, ((inicioAud - inicioAño) / duracionAño) * 100);
    const width = Math.min(100 - left, ((finAud - inicioAud) / duracionAño) * 100);

    return { left, width };
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-4"
    >
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* HEADER: MESES DEL AÑO */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#2962FF] rounded-xl p-4 border-2 border-[#F57C00]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-black text-white">Cronograma Anual {año}</h3>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-white" />
            <span className="text-sm font-bold text-white/90">
              {auditorias.length} auditorías
            </span>
          </div>
        </div>

        {/* Grid de meses */}
        <div className="overflow-x-auto">
          <div className="grid grid-cols-12 gap-0.5 bg-white/20 rounded-lg overflow-hidden min-w-[900px]">
          {MESES.map((mes, idx) => {
            const mesActual = new Date().getMonth() === idx && new Date().getFullYear() === año;
            return (
              <div
                key={mes}
                className={`px-2 py-3 text-center ${
                  mesActual ? 'bg-[#F57C00]' : 'bg-white/10'
                }`}
              >
                <div className={`text-xs font-black uppercase ${
                  mesActual ? 'text-white' : 'text-white/90'
                }`}>
                  {mes.substring(0, 3)}
                </div>
                <div className={`text-[10px] mt-0.5 ${
                  mesActual ? 'text-white/90' : 'text-white/60'
                }`}>
                  {idx + 1}
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CRONOGRAMA GANTT */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border-2 border-gray-200 overflow-x-auto">
        {/* Tabla de auditorías */}
        <div className="divide-y-2 divide-gray-100 min-w-[900px]">
          {auditorias.length > 0 ? (
            auditorias.map((auditoria) => {
              const { left, width } = getBarraAuditoria(auditoria);
              const { colores, label } = obtenerEstadoVisual(auditoria);

              return (
                <div
                  key={auditoria.id}
                  className="hover:bg-blue-50/50 transition-colors"
                >
                  <div className="grid grid-cols-[300px_1fr] gap-4 p-4">
                    {/* Columna izquierda: Info de auditoría */}
                    <div className="pr-4 border-r-2 border-gray-200">
                      <div className="flex items-start gap-2 mb-2">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                          style={{ backgroundColor: colorBordePorTipo(auditoria.tipo) }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-gray-900 leading-tight mb-1 truncate">
                            {auditoria.nombre}
                          </h4>
                          <p className="text-xs text-gray-600 truncate">
                            {auditoria.proceso?.nombre ?? 'Sin proceso'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ backgroundColor: colores.bg, color: colores.text }}
                        >
                          {label}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                          Q{auditoria.trimestre}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">
                          {auditoria.avance}%
                        </span>
                      </div>

                      <div className="text-[10px] text-gray-500 space-y-0.5">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span className="truncate">{safeNombre(auditoria.auditorLider)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{auditoria.horasEstimadas}h estimadas</span>
                        </div>
                      </div>
                    </div>

                    {/* Columna derecha: Barra de timeline */}
                    <div className="relative h-16 flex items-center">
                      {/* Grid de meses (líneas verticales) */}
                      <div className="absolute inset-0 grid grid-cols-12">
                        {Array.from({ length: 12 }).map((_, idx) => (
                          <div
                            key={idx}
                            className="border-r border-gray-200 last:border-r-0"
                          />
                        ))}
                      </div>

                      {/* Indicador de mes actual */}
                      {new Date().getFullYear() === año && (
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-[#F57C00] z-10"
                          style={{
                            left: `${((new Date().getMonth() + (new Date().getDate() / 31)) / 12) * 100}%`
                          }}
                        >
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#F57C00] rounded-full" />
                        </div>
                      )}

                      {/* Barra de auditoría */}
                      <button
                        onClick={() => onSeleccionar(auditoria)}
                        className="absolute h-10 rounded-lg shadow-md hover:shadow-xl transition-all transform hover:scale-105 cursor-pointer z-20 group"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          background: `linear-gradient(135deg, ${colores.border}, ${colores.bg})`,
                          border: `2px solid ${colores.border}`,
                          minWidth: '40px'
                        }}
                      >
                        <div className="h-full flex items-center justify-center px-2">
                          <span
                            className="text-xs font-black truncate"
                            style={{ color: colores.text }}
                          >
                            {width > 5 ? auditoria.nombre : ''}
                          </span>
                        </div>

                        {/* Tooltip al hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl">
                            <div className="font-bold mb-1">{auditoria.nombre}</div>
                            <div className="text-[10px] text-gray-300">
                              {new Date(auditoria.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                              {' → '}
                              {new Date(auditoria.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                            </div>
                            <div className="text-[10px] text-gray-300 mt-1">
                              Click para ver detalles
                            </div>
                          </div>
                          {/* Flecha del tooltip */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
                        </div>
                      </button>

                      {/* Etiquetas de inicio y fin (solo si la barra es muy ancha) */}
                      {width > 10 && (
                        <>
                          <div
                            className="absolute top-0 text-[9px] font-bold text-gray-500"
                            style={{ left: `${left}%` }}
                          >
                            {new Date(auditoria.fechaInicio).getDate()}
                          </div>
                          <div
                            className="absolute top-0 text-[9px] font-bold text-gray-500"
                            style={{ left: `${left + width}%`, transform: 'translateX(-100%)' }}
                          >
                            {new Date(auditoria.fechaFin).getDate()}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center">
              <CalendarIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 font-semibold">No hay auditorías programadas para este año</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ESTADÍSTICAS POR TRIMESTRE */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((trimestre) => {
          const auditoriasTrimestre = auditorias.filter(a => a.trimestre === trimestre);
          const colQ = (a: (typeof auditorias)[0]) => {
            const ui = a as AuditoriaProgramadaUI;
            return resolverColumnaKanban(ui.estadoKanban, ui.fase, ui.estado);
          };
          const enComunicacion = auditoriasTrimestre.filter(a => colQ(a) === 'comunicacion').length;
          const enEjecucion = auditoriasTrimestre.filter(a => colQ(a) === 'ejecucion').length;
          const enPlaneacion = auditoriasTrimestre.filter(
            a => colQ(a) === 'plan_anual' || colQ(a) === 'planeacion'
          ).length;

          return (
            <div
              key={trimestre}
              className="bg-white rounded-xl border-2 border-gray-200 p-4 hover:border-blue-400 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-black text-[#003DA5]">Q{trimestre}</h4>
                <Target className="w-4 h-4 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Total</span>
                  <span className="font-black text-gray-900">{auditoriasTrimestre.length}</span>
                </div>
                {enComunicacion > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-gray-600">Comunicación</span>
                    </div>
                    <span className="font-bold text-green-700">{enComunicacion}</span>
                  </div>
                )}
                {enEjecucion > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-yellow-500" />
                      <span className="text-gray-600">Ejecución</span>
                    </div>
                    <span className="font-bold text-yellow-700">{enEjecucion}</span>
                  </div>
                )}
                {enPlaneacion > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-gray-600">Planeación</span>
                    </div>
                    <span className="font-bold text-blue-700">{enPlaneacion}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

interface CardAuditoriaProps {
  auditoria: AuditoriaProgramada;
  onClick: () => void;
  compact?: boolean;
}

function CardAuditoria({ auditoria, onClick, compact = false }: CardAuditoriaProps) {
  const { colores, label } = obtenerEstadoVisual(auditoria);

  return (
    <button
      onClick={onClick}
      className={`w-full bg-white rounded-lg border-2 hover:shadow-lg transition-all text-left ${
        compact ? 'p-3' : 'p-4'
      }`}
      style={{ borderColor: colores.border }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORES_TIPO[auditoria.tipo] }}
            />
            <h4 className={`font-black text-gray-900 truncate ${
              compact ? 'text-sm' : 'text-base'
            }`}>
              {auditoria.nombre}
            </h4>
          </div>
          <p className={`text-gray-600 truncate ${
            compact ? 'text-xs' : 'text-sm'
          }`}>
            {auditoria.proceso?.nombre ?? 'Sin proceso'}
          </p>
          <div className={`flex items-center gap-3 mt-2 ${
            compact ? 'text-xs' : 'text-sm'
          }`}>
            <span className="text-gray-500">
              {new Date(auditoria.fechaInicio).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
              {' - '}
              {new Date(auditoria.fechaFin).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`px-2 py-1 rounded text-xs font-bold ${
              compact ? 'text-[10px]' : ''
            }`}
            style={{ backgroundColor: colores.bg, color: colores.text }}
          >
            {label}
          </span>
          <span className="text-lg font-black text-[#003DA5]">
            {auditoria.avance}%
          </span>
        </div>
      </div>
    </button>
  );
}

// Modal de detalle
interface ModalDetalleAuditoriaProps {
  auditoria: AuditoriaProgramada;
  onCerrar: () => void;
}

function ModalDetalleAuditoria({ auditoria, onCerrar }: ModalDetalleAuditoriaProps) {
  const { colores, label } = obtenerEstadoVisual(auditoria);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl"
      >
        {/* Header */}
        <div
          className="px-6 py-4 rounded-t-2xl border-b-4"
          style={{
            background: `linear-gradient(135deg, ${colorBordePorTipo(auditoria.tipo)}, ${colores.border})`,
            borderColor: '#F57C00'
          }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-black text-white mb-1">
                {auditoria.nombre}
              </h3>
              <p className="text-sm text-white/90 font-medium">
                {auditoria.proceso?.nombre ?? 'Sin proceso'}
              </p>
            </div>
            <button
              onClick={onCerrar}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <XIcon className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="text-xs font-bold text-gray-600 mb-1">Estado</div>
              <div
                className="text-sm font-black"
                style={{ color: colores.text }}
              >
                {label}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="text-xs font-bold text-gray-600 mb-1">Tipo</div>
              <div className="text-sm font-black text-gray-900">
                {auditoria.tipo}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="text-xs font-bold text-gray-600 mb-1">Fecha Inicio</div>
              <div className="text-sm font-black text-gray-900">
                {new Date(auditoria.fechaInicio).toLocaleDateString('es-CO')}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="text-xs font-bold text-gray-600 mb-1">Fecha Fin</div>
              <div className="text-sm font-black text-gray-900">
                {new Date(auditoria.fechaFin).toLocaleDateString('es-CO')}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="text-xs font-bold text-gray-600 mb-1">Auditor Líder</div>
              <div className="text-sm font-black text-gray-900">
                {safeNombre(auditoria.auditorLider)}
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
              <div className="text-xs font-bold text-gray-600 mb-1">Avance</div>
              <div className="text-2xl font-black text-[#003DA5]">
                {auditoria.avance}%
              </div>
            </div>
          </div>

          {/* Equipo */}
          {(auditoria.equipo ?? []).length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
              <div className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Equipo Auditor
              </div>
              <div className="flex flex-wrap gap-2">
                {(auditoria.equipo ?? []).map((miembro, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-gray-700 border border-blue-300"
                  >
                    {safeNombre(miembro)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-2xl border-t-2 border-gray-200">
          <button
            onClick={onCerrar}
            className="w-full px-4 py-3 bg-gradient-to-r from-[#003DA5] to-[#2962FF] text-white rounded-xl font-bold hover:shadow-lg transition-all"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

function getTituloFecha(fecha: Date, vista: VistaCalendario): string {
  if (vista === 'dia') {
    return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  } else if (vista === 'semana') {
    const inicioSemana = new Date(fecha);
    inicioSemana.setDate(fecha.getDate() - fecha.getDay());
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    return `${inicioSemana.getDate()} - ${finSemana.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
  } else if (vista === 'mes') {
    return `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
  } else {
    return `${fecha.getFullYear()}`;
  }
}
