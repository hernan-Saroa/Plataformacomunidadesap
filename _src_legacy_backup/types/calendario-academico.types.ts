/**
 * TIPOS - CALENDARIO ACADÉMICO ESAP
 * Basado en Resolución SC-1676 del 23 de septiembre de 2025
 */

export type CategoriaEvento =
  | 'inscripcion'           // Inscripciones y Admisiones
  | 'matricula'             // Matrícula y Pagos
  | 'situaciones'           // Situaciones Académicas
  | 'desarrollo'            // Desarrollo de Clases
  | 'calificaciones'        // Calificaciones y Evaluación
  | 'grados'                // Grados y Ceremonias
  | 'recesos'               // Recesos y Festivos
  | 'administrativo';       // Administrativo

export type TipoUsuario =
  | 'aspirante'
  | 'estudiante_nuevo'
  | 'estudiante_antiguo'
  | 'docente'
  | 'administrativo'
  | 'egresado';

export type TipoPrograma =
  | 'pregrado_presencial'
  | 'apt'                   // Administración Pública Territorial
  | 'especializacion'
  | 'maestria';

export type PeriodoAcademico = '2026-1' | 'interperiodo' | '2026-2';

export type EstadoEvento = 
  | 'proximo'               // Más de 7 días
  | 'esta_semana'           // Entre 1 y 7 días
  | 'en_curso'              // En progreso
  | 'finalizado'            // Ya pasó
  | 'urgente';              // Menos de 3 días

/**
 * Evento del Calendario Académico
 */
export interface EventoCalendario {
  id: string;
  nombre: string;
  categoria: CategoriaEvento;
  color: string;
  fechaInicio: string;      // ISO 8601
  fechaFin?: string;         // ISO 8601 (opcional para eventos de un solo día)
  duracion?: number;         // Días
  aplicaA: TipoUsuario[];
  programas?: TipoPrograma[];
  descripcion: string;
  accionPrincipal?: string;
  urlAccion?: string;
  documentosRequeridos?: string[];
  sistema?: string;
  responsable?: string;
  baseLegal?: string;
  importancia?: 'alta' | 'media' | 'baja';
  nota?: string;
  metadata?: Record<string, any>;
}

/**
 * Configuración de colores por categoría
 */
export const CATEGORIA_COLORS: Record<CategoriaEvento, { bg: string; text: string; badge: string }> = {
  inscripcion: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    badge: '#003DA5',
  },
  matricula: {
    bg: 'bg-green-100',
    text: 'text-green-700',
    badge: '#28A745',
  },
  situaciones: {
    bg: 'bg-cyan-100',
    text: 'text-cyan-700',
    badge: '#17A2B8',
  },
  desarrollo: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    badge: '#28A745',
  },
  calificaciones: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    badge: '#FD7E14',
  },
  grados: {
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    badge: '#6F42C1',
  },
  recesos: {
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    badge: '#6C757D',
  },
  administrativo: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-700',
    badge: '#17A2B8',
  },
};

/**
 * Filtros del calendario
 */
export interface FiltrosCalendario {
  periodo: PeriodoAcademico | 'todos';
  tipoUsuario: TipoUsuario | 'todos';
  programa: TipoPrograma | 'todos';
  categoria: CategoriaEvento | 'todas';
  estado: EstadoEvento | 'todos';
  busqueda: string;
}

/**
 * Vista del calendario
 */
export type VistaCalendario = 
  | 'mensual'
  | 'semanal'
  | 'diaria'
  | 'lista';

/**
 * Tab principal
 */
export type TabCalendario = 
  | 'calendario'
  | 'periodos'
  | 'grados'
  | 'alertas'
  | 'exportar';
