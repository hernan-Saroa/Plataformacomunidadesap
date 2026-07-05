import React, { useState, useEffect, useRef } from "react";
import { toast } from 'sonner';
import {
  Settings,
  Save,
  AlertCircle,
  Clock,
  Shield,
  Calculator,
  CheckSquare,
  Users,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  Unlock,
  FileDown,
  RotateCcw,
  BarChart3,
  Eye,
  X,
} from "lucide-react";
import { getConfiguracionPTAGlobal, updateConfiguracionPTAGlobal } from "../../services/api/ptaApi";
import { TabInvestigacion } from "./config-tabs/TabInvestigacion";
import { TabExtension } from "./config-tabs/TabExtension";
import { TabDocencia } from './config-tabs/TabDocencia';
import { TabComplementarias } from "./config-tabs/TabComplementarias";
import { TabGenerales } from "./config-tabs/TabGenerales";

// Ítem dentro de una actividad de extensión (etapa)
export interface ExtItem {
  nombre: string;
  tipo: 'fija' | 'por_unidad' | 'hasta' | 'intervalo';
  horas: number;
  horas_min?: number;   // minimum hours (used when tipo='intervalo')
  max_unidades?: number;
  unidad?: string;
  col_valores?: Record<string, string[]>;
  parent_col_idx?: number; // index of the first-column value this item belongs to
}

export interface PTARules {
  // Horas base
  horas_base_carrera_009: number;
  horas_base_carrera_003: number;
  horas_semanales_tc: number; // Tiempo Completo No Vinculados (Generalmente 40)
  horas_semanales_mt: number; // Medio Tiempo No Vinculados (Generalmente 20)
  semanas_periodo_academico: number; // Circular §2: "20 semanas por 40 horas" — base proporcionalidad

  // Topes
  max_pct_investigacion: number;
  max_horas_investigacion_global: number; // Tope absoluto en horas (Tabla 3: max 400h para líder)
  max_pct_extension: number;
  max_horas_extension_global: number;     // Circular §3: "no podrá superar las 200 horas o el 25%"
  max_pct_complementarias: number;
  max_horas_complementarias_global: number; // Tope global horas complementarias
  comp_anexo1_validado: boolean;             // Confirmacion manual: catalogo cotejado contra Anexo 1
  comp_anexo1_fuente: string;                // Fuente/version usada para el cotejo del Anexo 1
  max_horas_aadm_global: number;            // Tope global horas Académica/Docencia
  max_pct_aadm: number;                     // Tope porcentual Académica/Docencia
  // Tope cruzado investigación + extensión para Enlace Territorial / Director de Grupo
  max_pct_inv_ext_combinado: number;
  // Plazo de consolidación nacional (en semanas calendario)
  plazo_consolidacion_semanas: number; // Circular §5: "4 semanas siguientes al inicio de clases"
  // SLAs Operativos (Días)
  sla_radicacion_pta: number;
  sla_verificacion_jefaturas: number;
  sla_verificacion_sna: number;
  sla_verificacion_vr: number;
  sla_consolidacion_nacional: number;

  // Reglas de Control (Toggles)
  requiere_aprobacion_inicio: boolean;
  requiere_acreditacion_final: boolean;
  ggp_auditoria_activa: boolean;

  // Docencia Directa (Asignación Académica)
  min_creditos_docencia: number;
  dias_cierre_concertacion: number;
  dias_limite_radicacion_ggp: number;
  dias_verificacion_posterior: number;
  criterio_multiplicador_docencia: number;
  min_pct_docencia_no_vinculados: number;

  // Horas base de docencia por categoría (usadas por el portal cuando un programa no tiene
  // configuración propia en la Matriz Paramétrica). Bloque fijo o base por crédito según categoría.
  docencia_base_seminario_sc: number;   // Seminario de Énfasis Sede Central (bloque fijo)
  docencia_base_pregrado_sc: number;    // Pregrado Sede Central AP/EP (bloque fijo)
  docencia_base_maestria: number;       // Maestría (horas por crédito)
  docencia_base_especializacion: number;// Especialización (horas por crédito)
  docencia_base_apt: number;            // APT / Territorial / otros (horas por crédito)

  // R9: Configuración dinámica de docencia por programa académico (Tabla 1 Circular)
  docencia_por_programa: Record<string, {
    esVariable: boolean;
    base: number;
    multiplicador: number;
  }>;

  // Investigación
  max_horas_inv_lider: number;
  max_pct_inv_lider: number;
  max_horas_inv_coinvestigador: number;
  max_pct_inv_coinvestigador: number;
  max_horas_inv_asistente: number;
  max_pct_inv_asistente: number;
  max_horas_inv_fomento: number; // Por solicitud de SNI a Decanatura
  max_pct_inv_fomento: number;
  inv_lider_semillero_max: number;
  inv_enlace_territorial_pct: number;
  inv_enlace_territorial_horas: number;
  inv_director_grupo_pct: number;
  inv_director_grupo_horas: number;
  inv_par_propuestas: number;
  inv_par_resultados: number;
  inv_diseno_cursos: number;
  inv_capacitador_cursos: number;
  inv_produccion_articulos: number;
  inv_produccion_libro: number;

  // Resolución de investigación — obligatoriedad configurable
  inv_resolucion_obligatoria: boolean;
  inv_adjunto_obligatorio: boolean;

  // Extensión: tope global del Enlace. Los topes por actividad SNPI viven en
  // ext_actividades[].max_horas (única fuente real). Los antiguos campos sueltos
  // ext_sel_*/ext_fag_*/ext_lab_*/ext_inv_*/ext_eag_* se eliminaron por ser código muerto.
  ext_max_horas_enlace: number;

  // Actividades Complementarias (Tabla 14)
  comp_acomp_pregrado_ap: number;
  comp_acomp_pregrado_apt_9: number;
  comp_acomp_pregrado_apt_10: number;
  comp_acomp_pregrado_prac_ap: number;
  comp_acomp_pregrado_prac_apt: number;
  comp_acomp_seminario_maestria: number;
  comp_act_unidades_min: number;
  comp_act_unidades_max: number;
  comp_coord_escuela_doc_min: number;
  comp_coord_escuela_doc_max: number;
  comp_cursos_repeticion: number;
  comp_dir_trabajos_maestria: number;
  comp_elab_micro_curriculos: number;
  comp_elab_rea: number;
  comp_elab_preg_ecaes: number;
  comp_exam_hab_grupo: number;
  comp_exam_hab_individual: number;
  comp_exam_homolog: number;
  comp_jurado_concurso_no_vinc: number;
  comp_jurado_concurso_vinc: number;
  comp_jurado_trabajo_maestria: number;
  comp_jurado_productos: number;
  comp_lider_campo_con: number;
  comp_lider_posgrado_min: number;
  comp_lider_posgrado_max: number;
  comp_sindicato_titular: number;
  comp_sindicato_suplente: number;
  comp_expo_eventos: number;
  comp_rep_cuerpos_col: number;
  comp_rep_escenarios_acad: number;
  comp_formacion_competencias: number;
  comp_prod_academica: number;

  // Actividades Doctorado (Tabla 15)
  comp_doc_coord_comision: number;
  comp_doc_comisionado: number;
  comp_doc_eval_propuesta: number;
  comp_doc_ajuste_microcv: number;
  comp_doc_gestor_intl: number;
  comp_doc_gestor_ext: number;

  // Actividades Académico-Administrativas (Generales)
  aadm_acreditacion_max: number;
  aadm_misiones_pct: number;
  aadm_misiones_horas: number;

  // Semestre (fechas límite para actividades)
  fecha_inicio_semestre: string;
  fecha_fin_semestre: string;

  // Versionamiento de la Circular normativa vigente
  circular_version: string;

  // R7: Bloqueo de configuración por período activo
  config_bloqueada: boolean;
  config_bloqueada_motivo?: string;

  // Historial de cambios de configuración (audit trail)
  config_changelog: Array<{
    fecha: string;
    usuario: string;
    campos_modificados: string[];
    nota?: string;
  }>;

  // R12: Snapshots para rollback (últimos 10 estados completos)
  config_snapshots: Array<{
    fecha: string;
    usuario: string;
    snapshot: Record<string, any>;
    label?: string;
  }>;

  // Roles de Investigación (configurables)
  inv_roles: Array<{ id: string; nombre: string; horas_max: number; pct_max: number }>;
  // Actividades de Investigación (configurables)
  inv_actividades: Array<{ id: string; nombre: string; horas_max: number }>;

  // Secciones de Extensión (configurables)
  ext_secciones: Array<{ key: string; label: string; color: string; orden: number; multiplicador?: number; columnas?: string[] }>;
  // Actividades de Extensión por sección (configurables)
  // Si la actividad tiene 'items', es una ETAPA jerárquica (con ítems fijos o por unidad).
  // Si no tiene 'items', es una actividad plana (backward-compatible) con max_horas.
  ext_actividades: Record<string, Array<{
    id: string;
    nombre: string;
    linea?: string;       // backward-compat: línea temática
    items?: ExtItem[];     // ítems jerárquicos dentro de la etapa
    evidencias?: string[]; // backward-compat: evidencias requeridas
    columnas?: Array<{ nombre: string; valores: string[] }>; // backward-compat: per-activity columns
    columnas_valores?: Record<string, string[]>; // valores por columna (columnas definidas en ext_secciones)
    columnas_meta?: Record<string, Array<{ tipo?: string; horas?: number; horas_en?: string }>>; // metadata (tipo/horas) per column value — applies to 1st column
    horas_en_etapa?: boolean;  // true = horas assigned directly on the etapa, false = distributed in items/columns below
    max_horas?: number;   // tope total opcional (o valor directo para actividades planas)
    min_horas?: number;   // valor mínimo para actividades planas (backward-compat)
  }>>;

  // Actividades Complementarias — LEGACY (backward-compat, no borrar)
  comp_actividades: Array<{ id: string; nombre: string; max_horas: number | null; min_horas?: number; tipo?: string; seccion: string; consumeTotalidad?: boolean }>;
  comp_tipos?: Record<string, { tipo: string; min_horas?: number }>;
  comp_secciones_custom?: Array<{ id: string; label: string; color: string }>;
  comp_secciones_deleted?: string[];

  // Actividades Complementarias — NUEVO (misma arquitectura que Extensión)
  comp_secciones: Array<{ key: string; label: string; color: string; orden: number; multiplicador?: number; columnas?: string[] }>;
  comp_actividades_v2: Record<string, Array<{
    id: string;
    nombre: string;
    items?: ExtItem[];
    columnas_valores?: Record<string, string[]>;
    columnas_meta?: Record<string, Array<{ tipo?: string; horas?: number; horas_en?: string }>>;
    horas_en_etapa?: boolean;
    max_horas?: number;
    min_horas?: number;
    consumeTotalidad?: boolean;
  }>>;

  // Actividades Académico-Administrativas (configurables)
  aadm_actividades: Array<{ id: string; nombre: string; max_horas: number | null; consumeTotalidad: boolean }>;
}

export const defaultPTARules: PTARules = {
  horas_base_carrera_009: 720,
  horas_base_carrera_003: 800,
  horas_semanales_tc: 40,
  horas_semanales_mt: 20,
  semanas_periodo_academico: 20,

  max_pct_investigacion: 50,
  max_horas_investigacion_global: 400,
  max_pct_extension: 25,
  max_horas_extension_global: 200,
  max_pct_complementarias: 25,
  max_horas_complementarias_global: 200,
  comp_anexo1_validado: false,
  comp_anexo1_fuente: 'Pendiente de cotejo contra Anexo 1',
  max_horas_aadm_global: 200,
  max_pct_aadm: 25,
  max_pct_inv_ext_combinado: 50,
  plazo_consolidacion_semanas: 4,

  sla_radicacion_pta: 5,
  sla_verificacion_jefaturas: 15,
  sla_verificacion_sna: 3,
  sla_verificacion_vr: 3,
  sla_consolidacion_nacional: 20, // 4 semanas hábiles según §5 Circular 003/2025

  requiere_aprobacion_inicio: true,
  requiere_acreditacion_final: true,
  ggp_auditoria_activa: false,

  min_creditos_docencia: 3,
  dias_cierre_concertacion: 5,
  dias_limite_radicacion_ggp: 10,
  dias_verificacion_posterior: 15,
  criterio_multiplicador_docencia: 3,
  min_pct_docencia_no_vinculados: 50,

  docencia_base_seminario_sc: 128,
  docencia_base_pregrado_sc: 64,
  docencia_base_maestria: 12,
  docencia_base_especializacion: 16,
  docencia_base_apt: 16,

  // R9: Matriz Paramétrica pre-poblada — IDs de la tabla academic_work_plan.programa
  // Circular Tabla 1: Pregrado SC = bloque fijo 64h (N/A por crédito), APT = 16h/cr variable
  docencia_por_programa: {
    // Pregrado Sede Central — BLOQUE FIJO: 64h × multiplicador = 192h (independiente de créditos)
    '57': { base: 64, multiplicador: 3, esVariable: false },  // AP Diurno (SC)
    '58': { base: 64, multiplicador: 3, esVariable: false },  // AP Nocturno (SC)
    '60': { base: 64, multiplicador: 3, esVariable: false },  // Economía Pública (SC)
    // APT — VARIABLE: créditos × 16h/cr × multiplicador
    '59': { base: 16, multiplicador: 3, esVariable: true },   // APT distancia (Nacional)
    // Especialización — VARIABLE: créditos × 16h/cr × multiplicador
    '61': { base: 16, multiplicador: 3, esVariable: true },   // Alta Dirección
    '62': { base: 16, multiplicador: 3, esVariable: true },   // DDHH
    '63': { base: 16, multiplicador: 3, esVariable: true },   // Finanzas Públicas
    '64': { base: 16, multiplicador: 3, esVariable: true },   // Gestión Pública Urbana
    '65': { base: 16, multiplicador: 3, esVariable: true },   // Gerencia Social
    '66': { base: 16, multiplicador: 3, esVariable: true },   // Gestión Pública
    '67': { base: 16, multiplicador: 3, esVariable: true },   // Proyectos de Desarrollo
    // Maestría — VARIABLE: créditos × 12h/cr × multiplicador
    '68': { base: 12, multiplicador: 3, esVariable: true },   // DDHH y Posconflicto
    '69': { base: 12, multiplicador: 3, esVariable: true },   // Admin Pública Distancia
    '70': { base: 12, multiplicador: 3, esVariable: true },   // Admin Pública Presencial
  },

  max_horas_inv_lider: 400,
  max_pct_inv_lider: 50,
  max_horas_inv_coinvestigador: 300,
  max_pct_inv_coinvestigador: 37.5,
  max_horas_inv_asistente: 200,
  max_pct_inv_asistente: 25,
  max_horas_inv_fomento: 200,
  max_pct_inv_fomento: 25,
  inv_lider_semillero_max: 120,
  inv_enlace_territorial_pct: 25,
  inv_enlace_territorial_horas: 200,
  inv_director_grupo_pct: 25,
  inv_director_grupo_horas: 200,
  inv_par_propuestas: 20,
  inv_par_resultados: 20,
  inv_diseno_cursos: 32,
  inv_capacitador_cursos: 32,
  inv_produccion_articulos: 96,
  inv_produccion_libro: 144,
  inv_resolucion_obligatoria: true,
  inv_adjunto_obligatorio: true,

  ext_max_horas_enlace: 200,

  comp_acomp_pregrado_ap: 20,
  comp_acomp_pregrado_apt_9: 10,
  comp_acomp_pregrado_apt_10: 10,
  comp_acomp_pregrado_prac_ap: 20,
  comp_acomp_pregrado_prac_apt: 16,
  comp_acomp_seminario_maestria: 18,
  comp_act_unidades_min: 60,
  comp_act_unidades_max: 120,
  comp_coord_escuela_doc_min: 40,
  comp_coord_escuela_doc_max: 80,
  comp_cursos_repeticion: 32,
  comp_dir_trabajos_maestria: 30,
  comp_elab_micro_curriculos: 10,
  comp_elab_rea: 60,
  comp_elab_preg_ecaes: 3,
  comp_exam_hab_grupo: 10,
  comp_exam_hab_individual: 3,
  comp_exam_homolog: 6,
  comp_jurado_concurso_no_vinc: 5,
  comp_jurado_concurso_vinc: 5,
  comp_jurado_trabajo_maestria: 12,
  comp_jurado_productos: 20,
  comp_lider_campo_con: 100,
  comp_lider_posgrado_min: 120,
  comp_lider_posgrado_max: 200,
  comp_sindicato_titular: 320,
  comp_sindicato_suplente: 160,
  comp_expo_eventos: 30,
  comp_rep_cuerpos_col: 40,
  comp_rep_escenarios_acad: 5,
  comp_formacion_competencias: 48,
  comp_prod_academica: 80,

  comp_doc_coord_comision: 200,
  comp_doc_comisionado: 60,
  comp_doc_eval_propuesta: 10,
  comp_doc_ajuste_microcv: 100,
  comp_doc_gestor_intl: 100,
  comp_doc_gestor_ext: 100,

  aadm_acreditacion_max: 64,
  aadm_misiones_pct: 25,
  aadm_misiones_horas: 200,

  fecha_inicio_semestre: '',
  fecha_fin_semestre: '',

  circular_version: 'Circular Dispositiva 003/2025',
  config_bloqueada: false,
  config_changelog: [],
  config_snapshots: [],

  inv_roles: [
    { id: 'ROL_001', nombre: 'INVESTIGADOR LÍDER DE PROYECTO', horas_max: 400, pct_max: 50 },
    { id: 'ROL_002', nombre: 'COINVESTIGADOR', horas_max: 300, pct_max: 37.5 },
    { id: 'ROL_003', nombre: 'ASISTENTE DE INVESTIGACIÓN NIVEL II', horas_max: 200, pct_max: 25 },
  ],
  inv_actividades: [
    { id: 'INV_01', nombre: 'Líder de Semillero de Investigación', horas_max: 120 },
    { id: 'INV_02', nombre: 'Enlace Territorial de Investigaciones', horas_max: 200 },
    { id: 'INV_03', nombre: 'Líder / Director de Grupo de Investigación', horas_max: 200 },
    { id: 'INV_04', nombre: 'Par evaluador de propuestas de proyecto — por propuesta', horas_max: 20 },
    { id: 'INV_05', nombre: 'Par evaluador de resultados / productos — por resultado', horas_max: 20 },
    { id: 'INV_06', nombre: 'Diseño de cursos de formación investigativa — por curso', horas_max: 32 },
    { id: 'INV_07', nombre: 'Capacitador de cursos de formación investigativa — por curso', horas_max: 32 },
    { id: 'INV_08', nombre: 'Producción de artículos científicos', horas_max: 96 },
    { id: 'INV_09', nombre: 'Producción de libro (mínimo 3 capítulos)', horas_max: 144 },
  ],

  ext_secciones: [
    { key: 'capacitacion', label: '3.1.1. Dirección de Capacitación', color: '#059669', orden: 1, multiplicador: 2 },
    { key: 'seleccion', label: '3.1.2. Dirección de Procesos de Selección', color: '#0284C7', orden: 2, multiplicador: 1 },
    { key: 'fortalecimiento', label: '3.1.3. Dirección de Fortalecimiento y Apoyo a la Gestión Estatal', color: '#7C3AED', orden: 3, multiplicador: 1 },
    { key: 'alto_gobierno', label: '3.2. Escuela de Alto Gobierno', color: '#B45309', orden: 4, multiplicador: 1 },
  ],
  ext_actividades: {
    capacitacion: [
      { id: 'CAP_01', nombre: 'Orientación de Talleres', max_horas: 16 },
      { id: 'CAP_02', nombre: 'Orientación de Seminarios', max_horas: 32 },
      { id: 'CAP_03', nombre: 'Orientación de Cursos', max_horas: 64 },
      { id: 'CAP_04', nombre: 'Orientación de Diplomados', max_horas: 160 },
    ],
    seleccion: [
      // ── Tabla 6: Construcción de instrumentos de medición ──────────────────
      {
        id: 'SEL_01',
        nombre: 'Revisión y validación de estructuras de prueba',
        items: [
          { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
          { nombre: 'Sesiones de validación', tipo: 'hasta', horas: 2 },
        ],
      },
      {
        id: 'SEL_02',
        nombre: 'Definición y operacionalización de constructos',
        items: [
          { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
          { nombre: 'Sesiones de validación', tipo: 'hasta', horas: 2 },
        ],
      },
      {
        id: 'SEL_03',
        nombre: 'Construcción y validación de casos',
        items: [
          { nombre: 'Capacitación', tipo: 'fija', horas: 2 },
          { nombre: 'Construcción de casos', tipo: 'hasta', horas: 4 },
          { nombre: 'Sesiones de revisión de casos', tipo: 'hasta', horas: 3 },
          { nombre: 'Sesiones de validación de casos', tipo: 'hasta', horas: 3 },
        ],
      },
      {
        id: 'SEL_04',
        nombre: 'Validación de ítems',
        items: [
          { nombre: 'Capacitación', tipo: 'fija', horas: 2 },
          { nombre: 'Sesiones de revisión', tipo: 'hasta', horas: 1 },
        ],
      },
      // ── Tabla 7: Investigación aplicada a instrumentos de selección ─────────
      {
        id: 'SEL_05',
        nombre: 'Análisis de evidencias de validez en instrumentos de medición',
        items: [
          { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
          { nombre: 'Sesiones de revisión', tipo: 'hasta', horas: 1.5 },
        ],
      },
      {
        id: 'SEL_06',
        nombre: 'Grupos de discusión sobre instrumentos de medición',
        items: [
          { nombre: 'Capacitación sobre la prueba', tipo: 'fija', horas: 1 },
          { nombre: 'Sesiones de revisión', tipo: 'hasta', horas: 1.5 },
        ],
      },
      // ── Tabla 8: Jurados en tribunales de Concursos de Selección ───────────
      {
        id: 'SEL_07',
        nombre: 'Jurados — Prueba de Conocimientos (Componente escrito)',
        items: [
          { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
          { nombre: 'Calificación del documento — Rúbrica (10 categorías)', tipo: 'fija', horas: 3 },
        ],
      },
      {
        id: 'SEL_08',
        nombre: 'Jurados — Prueba de Aptitud Pedagógica e Investigativa (Componente oral)',
        items: [
          { nombre: 'Asistir a capacitación virtual para la Jornada', tipo: 'fija', horas: 2 },
          { nombre: 'Asistir a jornadas de aplicación presencial/virtual', tipo: 'fija', horas: 2 },
          { nombre: 'Evaluar sustentación oral (Rúbrica)', tipo: 'fija', horas: 2 },
        ],
      },
    ],
    fortalecimiento: [
      {
        id: 'FOR_01',
        nombre: 'Retroalimentación línea temática (Asistencia Técnica)',
        items: [
          { nombre: 'Análisis de anexos técnicos de las líneas temáticas', tipo: 'hasta', horas: 80 }
        ]
      },
      {
        id: 'FOR_02',
        nombre: 'Batería de indicadores (Asistencia Técnica)',
        items: [
          { nombre: 'Proponer/presentar batería de indicadores', tipo: 'hasta', horas: 80 }
        ]
      },
      {
        id: 'FOR_03',
        nombre: 'Planeación del desarrollo del proyecto (Rediseño)',
        items: [
          { nombre: 'Análisis de info primaria e instrumentos de recolección', tipo: 'hasta', horas: 40 },
          { nombre: 'Organización y presentación del plan de trabajo', tipo: 'hasta', horas: 40 }
        ]
      },
      {
        id: 'FOR_04',
        nombre: 'Análisis y diagnóstico institucional (Rediseño)',
        items: [
          { nombre: 'Recolección, análisis y control de info en campo', tipo: 'hasta', horas: 80 },
          { nombre: 'Análisis de factores externos e internos', tipo: 'hasta', horas: 80 },
          { nombre: 'Análisis de info asociada a la producción (cargas de trabajo)', tipo: 'hasta', horas: 100 }
        ]
      },
      {
        id: 'FOR_05',
        nombre: 'Arquitectura institucional (Rediseño)',
        items: [
          { nombre: 'Análisis de procesos, productos, estructura, planta y manual', tipo: 'hasta', horas: 100 }
        ]
      },
      {
        id: 'FOR_06',
        nombre: 'Actos administrativos y acompañamiento (Rediseño)',
        items: [
          { nombre: 'Elaboración de actos administrativos y orientación de trámite', tipo: 'hasta', horas: 40 }
        ]
      }
    ],
    laboratorio_innovacion: [
      { id: 'LAB_01', nombre: 'Componente Fijo — Espacios de participación y representación', max_horas: 100, items: [{ nombre: 'Participación, representación y apoyo al Laboratorio', tipo: 'hasta', horas: 100 }] },
      { id: 'LAB_02', nombre: 'Componente Fijo — Aspectos administrativos y gestión', max_horas: 120, items: [{ nombre: 'Coordinación, planeación, seguimiento y control del Laboratorio', tipo: 'hasta', horas: 120 }] },
      { id: 'LAB_03', nombre: 'Componente Variable — Elaborar documentos técnicos en el marco de las iniciativas', max_horas: 80, items: [{ nombre: 'Documento técnico académico elaborado', tipo: 'hasta', horas: 80 }] },
      { id: 'LAB_04', nombre: 'Componente Variable — Preparar y compilar documentos técnicos para publicación', max_horas: 40, items: [{ nombre: 'Documento técnico preparado o compilado', tipo: 'hasta', horas: 40 }] },
      { id: 'LAB_05', nombre: 'Componente Variable — Elaborar documentos soporte de ejecución de iniciativas', max_horas: 80, items: [{ nombre: 'Documento soporte de ejecución', tipo: 'hasta', horas: 80 }] },
      { id: 'LAB_06', nombre: 'Componente Variable — Diseñar, ejecutar y/o liderar iniciativas innovadoras', max_horas: 120, items: [{ nombre: 'Informe académico de ejecución de la iniciativa', tipo: 'hasta', horas: 120 }] },
      { id: 'LAB_07', nombre: 'Componente Variable — Ejecutar trabajo de campo', max_horas: 40, items: [{ nombre: 'Informe ejecutivo del trabajo de campo', tipo: 'hasta', horas: 40 }] },
      { id: 'LAB_08', nombre: 'Componente Variable — Acompañamiento en planeación de eventos', max_horas: 20, items: [{ nombre: 'Acompañamiento y planeación de eventos', tipo: 'hasta', horas: 20 }] },
      { id: 'LAB_09', nombre: 'Componente Variable — Acompañamiento en trabajo de campo', max_horas: 40, items: [{ nombre: 'Acompañamiento y planeación del trabajo de campo', tipo: 'hasta', horas: 40 }] },
      { id: 'LAB_10', nombre: 'Componente Variable — Representar a la ESAP en espacios consultivos', max_horas: 20, items: [{ nombre: 'Representación institucional en espacios consultivos', tipo: 'hasta', horas: 20 }] },
      { id: 'LAB_11', nombre: 'Componente Variable — Charlas y conferencias (formación)', max_horas: 20, items: [{ nombre: 'Charlas, conferencias o paneles de formación', tipo: 'hasta', horas: 20 }] },
      { id: 'LAB_12', nombre: 'Componente Variable — Coordinar enlace de capacitación en temáticas del Lab.', max_horas: 60, items: [{ nombre: 'Coordinación y enlace de iniciativas de capacitación', tipo: 'hasta', horas: 60 }] },
      { id: 'LAB_13', nombre: 'Componente Variable — Diseño de estrategias de gestión social del conocimiento', max_horas: 60, items: [{ nombre: 'Documento de estrategia e informe de gestión', tipo: 'hasta', horas: 60 }] },
    ],
    investigacion_aplicada: [
      { id: 'INV_AP_01', nombre: 'Documentos técnicos (informe, análisis temático)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Documento técnico', tipo: 'intervalo', horas_min:40, horas: 60 }] },
      { id: 'INV_AP_02', nombre: 'Plan de Trabajo de Investigación Aplicada', min_horas: 2, max_horas: 6, items: [{ nombre: 'Plan de trabajo', tipo: 'intervalo', horas_min:2, horas: 6 }] },
      { id: 'INV_AP_03', nombre: 'Productos de Generación de Nuevo Conocimiento (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de generación de nuevo conocimiento', tipo: 'intervalo', horas_min:40, horas: 60 }] },
      { id: 'INV_AP_04', nombre: 'Productos de Desarrollo Tecnológico e Innovación (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de desarrollo tecnológico e innovación', tipo: 'intervalo', horas_min:40, horas: 60 }] },
      { id: 'INV_AP_05', nombre: 'Productos de Apropiación Social del Conocimiento (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de apropiación social del conocimiento', tipo: 'intervalo', horas_min:40, horas: 60 }] },
      { id: 'INV_AP_06', nombre: 'Productos de Formación de Recurso Humano para CTeI (SNCTI)', min_horas: 40, max_horas: 60, items: [{ nombre: 'Producto de formación de recurso humano para CTeI', tipo: 'intervalo', horas_min:40, horas: 60 }] },
      { id: 'INV_AP_07', nombre: 'Asistencia a eventos académicos / representación Grupo Inv. Aplicada', max_horas: 8, items: [{ nombre: 'Asistencia o representación académica', tipo: 'hasta', horas: 8 }] },
      { id: 'INV_AP_08', nombre: 'Procesos de evaluación de desempeño y productos', max_horas: 4, items: [{ nombre: 'Evaluación de desempeño o productos generados', tipo: 'hasta', horas: 4 }] },
    ],
    alto_gobierno: [
      { id: 'EAG_01', nombre: 'Coaching directivo', min_horas: 80, max_horas: 200, items: [{ nombre: 'Coaching directivo', tipo: 'intervalo', horas_min:80, horas: 200 }] },
      { id: 'EAG_02', nombre: 'Formación estratégica a la alta gerencia', min_horas: 80, max_horas: 200, items: [{ nombre: 'Diseño y formación estratégica', tipo: 'intervalo', horas_min:80, horas: 200 }] },
      { id: 'EAG_03', nombre: 'Gestión del conocimiento', min_horas: 80, max_horas: 200, items: [{ nombre: 'Diseño y formación en gestión del conocimiento', tipo: 'intervalo', horas_min:80, horas: 200 }] },
      { id: 'EAG_04', nombre: 'Desarrollo de contenidos', min_horas: 40, max_horas: 120, items: [{ nombre: 'Diseño y desarrollo de contenidos', tipo: 'intervalo', horas_min:40, horas: 120 }] },
    ],
  },

  comp_actividades: [
    { id: 'COMP_01', nombre: 'Acompañamiento pregrado (monografía) — AP: por estudiante/grupo', max_horas: 20, seccion: 'Acompañamiento Pregrado y Posgrado' },
    { id: 'COMP_02', nombre: 'Acompañamiento pregrado (monografía) — APT (9° sem)', max_horas: 10, seccion: 'Acompañamiento Pregrado y Posgrado' },
    { id: 'COMP_03', nombre: 'Acompañamiento pregrado (monografía) — APT (10° sem)', max_horas: 10, seccion: 'Acompañamiento Pregrado y Posgrado' },
    { id: 'COMP_04', nombre: 'Acompañamiento pregrado (práctica/proyecto) — AP: por estudiante/grupo', max_horas: 20, seccion: 'Acompañamiento Pregrado y Posgrado' },
    { id: 'COMP_05', nombre: 'Acompañamiento pregrado (práctica/proyecto) — APT: por estudiante/grupo', max_horas: 16, seccion: 'Acompañamiento Pregrado y Posgrado' },
    { id: 'COMP_06', nombre: 'Acompañamiento seminario de grado — Maestrías: por estudiante/grupo', max_horas: 18, seccion: 'Acompañamiento Pregrado y Posgrado' },
    { id: 'COMP_07', nombre: 'Dirección de trabajos de grado — Maestrías: por estudiante/grupo', max_horas: 30, seccion: 'Acompañamiento Pregrado y Posgrado' },
    { id: 'COMP_08', nombre: 'Actualización / creación de unidades didácticas: por unidad', max_horas: 120, seccion: 'Diseño y Desarrollo Curricular' },
    { id: 'COMP_09', nombre: 'Elaboración de micro currículos: por micro currículo', max_horas: 10, seccion: 'Diseño y Desarrollo Curricular' },
    { id: 'COMP_10', nombre: 'Elaboración REA "Comunidades que Aprenden"', max_horas: 60, seccion: 'Diseño y Desarrollo Curricular' },
    { id: 'COMP_11', nombre: 'Preguntas para pruebas ECAES: por pregunta', max_horas: 3, seccion: 'Diseño y Desarrollo Curricular' },
    { id: 'COMP_12', nombre: 'Cursos de repetición y nivelación en posgrados: por curso', max_horas: 32, seccion: 'Diseño y Desarrollo Curricular' },
    { id: 'COMP_13', nombre: 'Coordinación de Escuela Doctoral', max_horas: 80, seccion: 'Coordinación y Eventos Académicos' },
    { id: 'COMP_14', nombre: 'Líder académico de campo de conocimiento (Pregrado)', max_horas: 100, seccion: 'Coordinación y Eventos Académicos' },
    { id: 'COMP_15', nombre: 'Líder académico de posgrados', max_horas: 200, seccion: 'Coordinación y Eventos Académicos' },
    { id: 'COMP_16', nombre: 'Participación como expositor en eventos académicos', max_horas: 30, seccion: 'Coordinación y Eventos Académicos' },
    { id: 'COMP_17', nombre: 'Participación en cuerpos colegiados en representación docente', max_horas: 40, seccion: 'Coordinación y Eventos Académicos' },
    { id: 'COMP_18', nombre: 'Participación en escenarios académicos institucionales: por evento', max_horas: 5, seccion: 'Coordinación y Eventos Académicos' },
    { id: 'COMP_19', nombre: 'Examen de habilitación o segundo calificador: grupo (máx 10h)', max_horas: 10, seccion: 'Evaluaciones y Jurados' },
    { id: 'COMP_20', nombre: 'Examen de habilitación o segundo calificador: individual (3h)', max_horas: 3, seccion: 'Evaluaciones y Jurados' },
    { id: 'COMP_21', nombre: 'Examen de homologación / suficiencia: por estudiante/grupo', max_horas: 6, seccion: 'Evaluaciones y Jurados' },
    { id: 'COMP_22', nombre: 'Jurado concurso docente no vinculado (TC/MT): por aspirante', max_horas: 5, seccion: 'Evaluaciones y Jurados' },
    { id: 'COMP_23', nombre: 'Jurado concurso docente vinculado a carrera: por aspirante', max_horas: 5, seccion: 'Evaluaciones y Jurados' },
    { id: 'COMP_24', nombre: 'Jurado trabajo de grado — Maestrías', max_horas: 12, seccion: 'Evaluaciones y Jurados' },
    { id: 'COMP_25', nombre: 'Jurado valoración de productos académicos / investigativos: por producto', max_horas: 20, seccion: 'Evaluaciones y Jurados' },
    { id: 'COMP_26', nombre: 'Miembro Sindicato Docente — Titular (directivas / subdirectivas)', max_horas: 320, seccion: 'Sindicatos y Formación Docente' },
    { id: 'COMP_27', nombre: 'Miembro Sindicato Docente — Suplente (directivas / subdirectivas)', max_horas: 160, seccion: 'Sindicatos y Formación Docente' },
    { id: 'COMP_28', nombre: 'Participación en actividades formativas — Desarrollo Profesoral (Plan Anual)', max_horas: 48, seccion: 'Sindicatos y Formación Docente' },
    { id: 'COMP_29', nombre: 'Producción académica independiente (papers, ensayos, innovación ped.)', max_horas: 80, seccion: 'Sindicatos y Formación Docente' },
  ],

  // Secciones Complementarias (nueva arquitectura)
  comp_secciones: [
    { key: 'complementarias_docencia', label: 'ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA', color: '#D97706', orden: 1, multiplicador: 1, columnas: ['_items_'] },
    { key: 'academico_administrativas', label: 'ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS', color: '#2563EB', orden: 2, multiplicador: 1, columnas: ['_items_'] },
  ],
  comp_actividades_v2: {
    acompanamiento: [
      { id: 'COMP_01', nombre: 'Acomp. Monografías (AP)', max_horas: 20, items: [{ nombre: 'Por estudiante/grupo, Pregrado AP', tipo: 'hasta', horas: 20 }] },
      { id: 'COMP_02', nombre: 'Acomp. APT (9° semestre)', max_horas: 10, items: [{ nombre: 'Por estudiante/grupo', tipo: 'hasta', horas: 10 }] },
      { id: 'COMP_03', nombre: 'Acomp. APT (10° semestre)', max_horas: 10, items: [{ nombre: 'Por estudiante/grupo', tipo: 'hasta', horas: 10 }] },
      { id: 'COMP_04', nombre: 'Prácticas (AP)', max_horas: 20, items: [{ nombre: 'Práctica admin, proyecto aplicado AP', tipo: 'hasta', horas: 20 }] },
      { id: 'COMP_05', nombre: 'Prácticas (APT)', max_horas: 16, items: [{ nombre: 'Práctica admin, proyecto aplicado APT', tipo: 'hasta', horas: 16 }] },
      { id: 'COMP_06', nombre: 'Seminario (Maestrías)', max_horas: 18, items: [{ nombre: 'Trabajos grado III y IV', tipo: 'hasta', horas: 18 }] },
      { id: 'COMP_07', nombre: 'Dir. Trabajo (Maestrías)', max_horas: 30, items: [{ nombre: 'Hasta 30h por est./grupo', tipo: 'hasta', horas: 30 }] },
    ],
    diseno: [
      { id: 'COMP_08', nombre: 'Unidades Didácticas', max_horas: 120, items: [{ nombre: 'Creación/Actualización por unidad', tipo: 'hasta', horas: 120 }] },
      { id: 'COMP_09', nombre: 'Micro Currículos', max_horas: 10, items: [{ nombre: 'Hasta 10 horas por micro currículo', tipo: 'hasta', horas: 10 }] },
      { id: 'COMP_10', nombre: 'Elaboración de REA', max_horas: 60, items: [{ nombre: 'Recursos Educativos Abiertos PREAAP', tipo: 'hasta', horas: 60 }] },
      { id: 'COMP_11', nombre: 'Const. Preguntas ECAES', max_horas: 3, items: [{ nombre: 'Revisión/generación por pregunta', tipo: 'hasta', horas: 3 }] },
      { id: 'COMP_12', nombre: 'Cursos Nivelación', max_horas: 32, items: [{ nombre: 'Espec. y maestrías por curso', tipo: 'hasta', horas: 32 }] },
    ],
    coordinacion: [
      { id: 'COMP_13', nombre: 'Coord. Escuela Doctoral', max_horas: 80, items: [{ nombre: 'Rango de horas asignado', tipo: 'hasta', horas: 80 }] },
      { id: 'COMP_14', nombre: 'Líder Acad. Campo', max_horas: 100, items: [{ nombre: 'Líder de campo conocimiento programa', tipo: 'hasta', horas: 100 }] },
      { id: 'COMP_15', nombre: 'Líder Acad. Posgrados', max_horas: 200, items: [{ nombre: 'En programa de posgrados', tipo: 'hasta', horas: 200 }] },
      { id: 'COMP_16', nombre: 'Expositores Eventos', max_horas: 30, items: [{ nombre: 'Aprobados por decanaturas (ponencia)', tipo: 'hasta', horas: 30 }] },
      { id: 'COMP_17', nombre: 'Cuerpos Colegiados', max_horas: 40, items: [{ nombre: 'Representación docente', tipo: 'hasta', horas: 40 }] },
      { id: 'COMP_18', nombre: 'Representación ESAP', max_horas: 5, items: [{ nombre: 'Escenarios por Territorial (evento)', tipo: 'hasta', horas: 5 }] },
    ],
    evaluaciones: [
      { id: 'COMP_19', nombre: 'Examen Habil. (Grupo)', max_horas: 10, items: [{ nombre: 'Hasta 10 horas', tipo: 'hasta', horas: 10 }] },
      { id: 'COMP_20', nombre: 'Examen Habil. (Individual)', max_horas: 3, items: [{ nombre: 'Hasta 3 horas', tipo: 'fija', horas: 3 }] },
      { id: 'COMP_21', nombre: 'Examen Homologación', max_horas: 6, items: [{ nombre: 'Por estudiante o grupo', tipo: 'hasta', horas: 6 }] },
      { id: 'COMP_22', nombre: 'Jurado Conc. (No Vinc)', max_horas: 5, items: [{ nombre: 'Aspirantes ocasionales/especiales', tipo: 'hasta', horas: 5 }] },
      { id: 'COMP_23', nombre: 'Jurado Conc. (Vinc)', max_horas: 5, items: [{ nombre: 'Aspirantes carrera profesoral', tipo: 'hasta', horas: 5 }] },
      { id: 'COMP_24', nombre: 'Jurado Trabajo Maestría', max_horas: 12, items: [{ nombre: 'Sustentación/evaluación', tipo: 'hasta', horas: 12 }] },
      { id: 'COMP_25', nombre: 'Jurado Prods Acad.', max_horas: 20, items: [{ nombre: 'Por evaluación producto externo/int', tipo: 'hasta', horas: 20 }] },
    ],
    sindicatos: [
      { id: 'COMP_26', nombre: 'Sindicato Titular', max_horas: 320, items: [{ nombre: 'Hasta 320h (40% de PTA 800h)', tipo: 'hasta', horas: 320 }] },
      { id: 'COMP_27', nombre: 'Sindicato Suplente', max_horas: 160, items: [{ nombre: 'Hasta 160h (20% de PTA 800h)', tipo: 'hasta', horas: 160 }] },
      { id: 'COMP_28', nombre: 'Formación Docente', max_horas: 48, items: [{ nombre: 'Plan Anual Des. Profesoral', tipo: 'hasta', horas: 48 }] },
      { id: 'COMP_29', nombre: 'Prod. Académica Indep.', max_horas: 80, items: [{ nombre: 'Paper, ensayos innovación ped.', tipo: 'hasta', horas: 80 }] },
    ],
  },

  aadm_actividades: [
    { id: 'AA_01', nombre: 'Comisión de servicio — dentro del país', max_horas: null, consumeTotalidad: true },
    { id: 'AA_02', nombre: 'Comisión de servicio — fuera del país', max_horas: null, consumeTotalidad: true },
    { id: 'AA_03', nombre: 'Comisión de estudio', max_horas: null, consumeTotalidad: true },
    { id: 'AA_04', nombre: 'Año Sabático o Semestre de Perfeccionamiento', max_horas: null, consumeTotalidad: true },
    { id: 'AA_05', nombre: 'Cargo Directivo Académico-Administrativo', max_horas: null, consumeTotalidad: true },
    { id: 'AA_06', nombre: 'Misiones profesorales', max_horas: 200, consumeTotalidad: false },
    { id: 'AA_07', nombre: 'Actividades de Acreditación Institucional', max_horas: 64, consumeTotalidad: false },
    { id: 'AA_08', nombre: 'Organización Doctorado — Coordinador Comisión Doctoral (Parcial)', max_horas: 200, consumeTotalidad: false },
    { id: 'AA_08_EXC', nombre: 'Organización Doctorado — Coordinador Comisión Doctoral (Exclusiva)', max_horas: null, consumeTotalidad: true },
    { id: 'AA_09', nombre: 'Organización Doctorado — Comisionado Comité Científico', max_horas: 60, consumeTotalidad: false },
    { id: 'AA_10', nombre: 'Organización Doctorado — Evaluación aspirantes (por aspirante)', max_horas: 10, consumeTotalidad: false },
    { id: 'AA_11', nombre: 'Organización Doctorado — Ajuste Micro currículo y Alistamiento (por asignatura)', max_horas: 100, consumeTotalidad: false },
    { id: 'AA_12', nombre: 'Organización Doctorado — Gestor (Internacionalización o Extensión)', max_horas: 100, consumeTotalidad: false },
  ],
};

type ExtActividad = PTARules['ext_actividades'][string][number];
type CompActividadV2 = PTARules['comp_actividades_v2'][string][number];

const FIXED_EXT_SECCIONES: PTARules['ext_secciones'] = [
  { key: 'capacitacion', label: '3.1.1. Dirección de Capacitación', color: '#059669', orden: 1, multiplicador: 2 },
  { key: 'seleccion', label: '3.1.2. Dirección de Procesos de Selección', color: '#0284C7', orden: 2, multiplicador: 1 },
  { key: 'fortalecimiento', label: '3.1.3. Dirección de Fortalecimiento y Apoyo a la Gestión Estatal', color: '#7C3AED', orden: 3, multiplicador: 1 },
  { key: 'alto_gobierno', label: '3.2. Escuela de Alto Gobierno', color: '#B45309', orden: 4, multiplicador: 1 },
];

const FIXED_COMP_SECCIONES: PTARules['comp_secciones'] = [
  { key: 'complementarias_docencia', label: 'ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA', color: '#D97706', orden: 1, multiplicador: 1, columnas: ['_items_'] },
  { key: 'academico_administrativas', label: 'ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS', color: '#2563EB', orden: 2, multiplicador: 1, columnas: ['_items_'] },
];

const EXT_SECTION_ALIASES: Record<string, string> = {
  laboratorio_innovacion: 'fortalecimiento',
  investigacion_aplicada: 'fortalecimiento',
};

const COMP_DOCENCIA_SECTION = 'complementarias_docencia';
const COMP_AADM_SECTION = 'academico_administrativas';
const COMP_SECTION_ALIASES: Record<string, string> = {
  acompanamiento: COMP_DOCENCIA_SECTION,
  diseno: COMP_DOCENCIA_SECTION,
  coordinacion: COMP_DOCENCIA_SECTION,
  evaluaciones: COMP_DOCENCIA_SECTION,
  sindicatos: COMP_DOCENCIA_SECTION,
  complementarias_docencia: COMP_DOCENCIA_SECTION,
  academico_administrativas: COMP_AADM_SECTION,
};

type NormativeRange = { min: number; max: number; label: string };

const NORMATIVE_RULE_RANGES: Record<string, NormativeRange> = {
  max_pct_investigacion: { min: 0, max: 50, label: 'Tope max. Investigacion' },
  max_horas_investigacion_global: { min: 0, max: 400, label: 'Tope global Investigacion' },
  max_pct_extension: { min: 0, max: 25, label: 'Tope max. Extension' },
  max_horas_extension_global: { min: 0, max: 200, label: 'Tope global Extension' },
  max_pct_complementarias: { min: 0, max: 25, label: 'Tope max. Complementarias' },
  max_horas_complementarias_global: { min: 0, max: 200, label: 'Tope global Complementarias' },
  max_pct_aadm: { min: 0, max: 25, label: 'Tope max. AADM' },
  max_horas_aadm_global: { min: 0, max: 200, label: 'Tope global AADM' },
  max_pct_inv_ext_combinado: { min: 0, max: 50, label: 'Tope cruzado Inv+Ext' },
  horas_base_carrera_009: { min: 600, max: 800, label: 'Horas base Acuerdo 009' },
  horas_base_carrera_003: { min: 600, max: 900, label: 'Horas base Acuerdo 003' },
  horas_semanales_tc: { min: 20, max: 48, label: 'Horas semanales TC' },
  horas_semanales_mt: { min: 10, max: 24, label: 'Horas semanales MT' },
  min_creditos_docencia: { min: 1, max: 10, label: 'Min. creditos docencia' },
  min_pct_docencia_no_vinculados: { min: 30, max: 70, label: 'Min. % docencia no vinculados' },
  criterio_multiplicador_docencia: { min: 1, max: 5, label: 'Multiplicador docencia' },
  dias_cierre_concertacion: { min: 1, max: 30, label: 'Dias cierre concertacion' },
  dias_limite_radicacion_ggp: { min: 1, max: 30, label: 'Dias radicar GGP' },
  dias_verificacion_posterior: { min: 1, max: 30, label: 'Dias verificacion' },
  sla_consolidacion_nacional: { min: 5, max: 30, label: 'SLA consolidacion nacional' },
};

function isCircular003Config(rules: Partial<PTARules> | null | undefined): boolean {
  const version = String(rules?.circular_version || '').toUpperCase();
  return version.includes('003') && version.includes('2025');
}

function finiteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getNormativeRangeErrors(rules: Partial<PTARules>): string[] {
  if (!isCircular003Config(rules)) return [];
  const errors: string[] = [];
  for (const [field, range] of Object.entries(NORMATIVE_RULE_RANGES)) {
    const raw = (rules as any)[field];
    if (raw === undefined || raw === null || raw === '') continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (value < range.min || value > range.max) {
      errors.push(`${range.label} (${field}) debe estar entre ${range.min} y ${range.max}; valor actual: ${value}.`);
    }
  }
  return errors;
}

function mergeExtActividad(defaultAct: ExtActividad, savedAct?: ExtActividad): ExtActividad {
  if (!savedAct) return defaultAct;
  const merged: ExtActividad = { ...defaultAct, ...savedAct };

  // Solo rellenar ítems desde el default cuando el guardado NO trae el arreglo
  // (config legacy sin `items`). Un arreglo vacío es una eliminación deliberada
  // del usuario y debe respetarse (no re-poblar).
  if (!Array.isArray(savedAct.items) && Array.isArray(defaultAct.items) && defaultAct.items.length > 0) {
    merged.items = defaultAct.items;
  }
  if ((savedAct.max_horas === undefined || savedAct.max_horas === null) && defaultAct.max_horas !== undefined) {
    merged.max_horas = defaultAct.max_horas;
  }
  if ((savedAct.min_horas === undefined || savedAct.min_horas === null) && defaultAct.min_horas !== undefined) {
    merged.min_horas = defaultAct.min_horas;
  }
  if ((!Array.isArray(savedAct.evidencias) || savedAct.evidencias.length === 0) && Array.isArray(defaultAct.evidencias)) {
    merged.evidencias = defaultAct.evidencias;
  }

  return merged;
}

function normalizeFixedExtSecciones(saved: any): PTARules['ext_secciones'] {
  const savedByKey = new Map(
    (Array.isArray(saved) ? saved : [])
      .filter((s: any) => s?.key)
      .map((s: any) => [String(s.key), s])
  );

  return FIXED_EXT_SECCIONES.map(sec => {
    const previous = savedByKey.get(sec.key) as Partial<PTARules['ext_secciones'][number]> | undefined;
    const savedMult = Number(previous?.multiplicador);
    return {
      ...sec,
      color: previous?.color || sec.color,
      columnas: Array.isArray(previous?.columnas) ? previous?.columnas : sec.columnas,
      // El multiplicador (×Factor) lo edita el admin y debe persistir; el fijo es solo default.
      multiplicador: Number.isFinite(savedMult) && savedMult > 0 ? savedMult : sec.multiplicador,
    };
  });
}

function normalizeFixedCompSecciones(saved: any): PTARules['comp_secciones'] {
  const savedByKey = new Map(
    (Array.isArray(saved) ? saved : [])
      .filter((s: any) => s?.key)
      .map((s: any) => [String(s.key), s])
  );

  return FIXED_COMP_SECCIONES.map(sec => {
    const previous = savedByKey.get(sec.key) as Partial<PTARules['comp_secciones'][number]> | undefined;
    return {
      ...sec,
      color: previous?.color || sec.color,
      columnas: Array.isArray(previous?.columnas) ? previous?.columnas : sec.columnas,
    };
  });
}

function canonicalExtSectionKey(sectionKey: string): string {
  if (FIXED_EXT_SECCIONES.some(s => s.key === sectionKey)) return sectionKey;
  return EXT_SECTION_ALIASES[sectionKey] || 'fortalecimiento';
}

function canonicalizeExtActivities(raw: any): PTARules['ext_actividades'] {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: PTARules['ext_actividades'] = {};

  for (const [sectionKey, value] of Object.entries(source)) {
    if (!Array.isArray(value)) continue;
    const targetKey = canonicalExtSectionKey(sectionKey);
    result[targetKey] = [
      ...(result[targetKey] || []),
      ...value.map((act: any) => ({ ...act })),
    ];
  }

  return result;
}

function mergeExtActividades(defaults: PTARules['ext_actividades'], saved: any): PTARules['ext_actividades'] {
  const defaultRecord = canonicalizeExtActivities(defaults);
  const savedRecord = canonicalizeExtActivities(saved);
  const result: PTARules['ext_actividades'] = {};

  const sectionKeys = new Set<string>([...Object.keys(defaultRecord), ...Object.keys(savedRecord)]);
  for (const sectionKey of sectionKeys) {
    const defaultActivities = defaultRecord[sectionKey] || [];
    const defaultById = new Map(defaultActivities.map(act => [act.id, act]));

    // Si la sección ya fue guardada (clave presente, aunque el arreglo esté vacío),
    // el arreglo guardado es la fuente de verdad: se respetan las eliminaciones y NO
    // se re-agregan las actividades por defecto que el usuario ya borró. Los defaults
    // solo se usan para rellenar campos de actividades que aún existen (por id).
    if (Object.prototype.hasOwnProperty.call(savedRecord, sectionKey)) {
      const savedActivities = Array.isArray(savedRecord[sectionKey]) ? savedRecord[sectionKey] : [];
      result[sectionKey] = savedActivities.map((savedAct: ExtActividad) =>
        mergeExtActividad(defaultById.get(savedAct.id) || savedAct, savedAct)
      );
    } else {
      // Sección nunca guardada → sembrar valores por defecto (primer uso / migración).
      result[sectionKey] = defaultActivities.map(act => ({ ...act }));
    }
  }

  return result;
}

function canonicalCompSectionKey(sectionKey: string): string {
  return COMP_SECTION_ALIASES[sectionKey] || COMP_DOCENCIA_SECTION;
}

function aadmToCompActividadV2(activity: PTARules['aadm_actividades'][number]): CompActividadV2 {
  return {
    id: activity.id,
    nombre: activity.nombre,
    max_horas: activity.max_horas ?? undefined,
    consumeTotalidad: activity.consumeTotalidad,
    items: [{
      nombre: activity.nombre,
      tipo: activity.consumeTotalidad ? 'fija' : 'hasta',
      horas: activity.max_horas ?? 0,
    }],
  };
}

function legacyComplementariaToV2(activity: PTARules['comp_actividades'][number]): CompActividadV2 {
  const maxHoras = activity.max_horas ?? 0;
  const tipo = activity.tipo || (activity.min_horas !== undefined ? 'intervalo' : 'hasta');
  return {
    id: activity.id,
    nombre: activity.nombre,
    max_horas: activity.max_horas ?? undefined,
    min_horas: activity.min_horas,
    consumeTotalidad: activity.consumeTotalidad,
    items: [{
      nombre: activity.nombre,
      tipo: tipo as ExtItem['tipo'],
      horas: Number(maxHoras) || 0,
      horas_min: activity.min_horas,
    }],
  };
}

function canonicalizeCompActividadesV2(raw: any): PTARules['comp_actividades_v2'] {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const result: PTARules['comp_actividades_v2'] = {};

  for (const [sectionKey, value] of Object.entries(source)) {
    if (!Array.isArray(value)) continue;
    const targetKey = canonicalCompSectionKey(sectionKey);
    result[targetKey] = [
      ...(result[targetKey] || []),
      ...value.map((act: any) => ({ ...act })),
    ];
  }

  return result;
}

function mergeLegacyCompIntoV2(inputRules: Partial<PTARules>): PTARules['comp_actividades_v2'] {
  const rawV2 = (inputRules as any).comp_actividades_v2;
  const hasV2 = rawV2 && typeof rawV2 === 'object' && !Array.isArray(rawV2) && Object.keys(rawV2).length > 0;
  const base = canonicalizeCompActividadesV2(rawV2);
  // Solo importar el arreglo legacy plano (`comp_actividades`) cuando NO existe aún la
  // estructura v2 (migración real de una config antigua). Si ya hay v2, ese arreglo es
  // solo un espejo derivado; re-importarlo duplicaría o "resucitaría" actividades borradas.
  if (!hasV2 && Array.isArray((inputRules as any).comp_actividades) && (inputRules as any).comp_actividades.length > 0) {
    base[COMP_DOCENCIA_SECTION] = [
      ...(base[COMP_DOCENCIA_SECTION] || []),
      ...(inputRules as any).comp_actividades.map(legacyComplementariaToV2),
    ];
  }
  return base;
}

function mergeCompActividadV2(defaultAct: CompActividadV2, savedAct?: CompActividadV2): CompActividadV2 {
  if (!savedAct) return defaultAct;
  const merged: CompActividadV2 = { ...defaultAct, ...savedAct };
  // Un arreglo `items` vacío es una eliminación deliberada; solo rellenar cuando el
  // guardado no trae el arreglo en absoluto (config legacy).
  if (!Array.isArray(savedAct.items) && Array.isArray(defaultAct.items) && defaultAct.items.length > 0) {
    merged.items = defaultAct.items;
  }
  return merged;
}

function mergeCompActividadesV2(
  defaults: PTARules['comp_actividades_v2'],
  saved: any,
  defaultAadm: PTARules['aadm_actividades'],
): PTARules['comp_actividades_v2'] {
  const defaultRecord = canonicalizeCompActividadesV2(defaults);
  defaultRecord[COMP_AADM_SECTION] = defaultAadm.map(aadmToCompActividadV2);

  const savedRecord = canonicalizeCompActividadesV2(saved);
  const result: PTARules['comp_actividades_v2'] = {};

  for (const fixedSection of FIXED_COMP_SECCIONES) {
    const sectionKey = fixedSection.key;
    const defaultActivities = defaultRecord[sectionKey] || [];
    const defaultById = new Map(defaultActivities.map(act => [act.id, act]));

    // Igual que Extensión: si la sección ya fue guardada, el arreglo guardado manda
    // (se respetan las eliminaciones). Los defaults solo siembran secciones nuevas.
    if (Object.prototype.hasOwnProperty.call(savedRecord, sectionKey)) {
      const savedActivities = Array.isArray(savedRecord[sectionKey]) ? savedRecord[sectionKey] : [];
      result[sectionKey] = savedActivities.map((savedAct: CompActividadV2) =>
        mergeCompActividadV2(defaultById.get(savedAct.id) || savedAct, savedAct)
      );
    } else {
      result[sectionKey] = defaultActivities.map(act => ({ ...act }));
    }
  }

  return result;
}

function activityMaxHoursFromV2(activity: CompActividadV2): number | null {
  if (activity.consumeTotalidad) return null;
  if (activity.max_horas !== undefined && activity.max_horas !== null) return Number(activity.max_horas) || 0;
  const itemHours = (activity.items || []).map(item => Number(item.horas || 0)).filter(Number.isFinite);
  return itemHours.length > 0 ? Math.max(...itemHours) : 0;
}

function syncLegacyComplementariasFromV2(v2: PTARules['comp_actividades_v2']): PTARules['comp_actividades'] {
  return (v2[COMP_DOCENCIA_SECTION] || []).map(activity => ({
    id: activity.id,
    nombre: activity.nombre,
    max_horas: activityMaxHoursFromV2(activity),
    min_horas: activity.min_horas,
    tipo: activity.items?.[0]?.tipo,
    seccion: 'ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA',
    consumeTotalidad: activity.consumeTotalidad,
  }));
}

function syncLegacyAadmFromV2(v2: PTARules['comp_actividades_v2']): PTARules['aadm_actividades'] {
  return (v2[COMP_AADM_SECTION] || []).map(activity => ({
    id: activity.id,
    nombre: activity.nombre,
    max_horas: activityMaxHoursFromV2(activity),
    consumeTotalidad: Boolean(activity.consumeTotalidad),
  }));
}

export function normalizePTARules(input?: Partial<PTARules> | null): PTARules {
  const inputRules = input || {};
  const merged = { ...defaultPTARules, ...inputRules } as PTARules;
  const rawGlobalExtension = (inputRules as any).max_horas_extension_global;
  const rawLegacyExtension = (inputRules as any).ext_max_horas_enlace;
  const unifiedExtensionHours = finiteNumber(
    rawGlobalExtension ?? rawLegacyExtension,
    defaultPTARules.max_horas_extension_global,
  );

  merged.max_horas_extension_global = unifiedExtensionHours;
  merged.ext_max_horas_enlace = unifiedExtensionHours;
  merged.comp_anexo1_validado = Boolean((inputRules as any).comp_anexo1_validado ?? defaultPTARules.comp_anexo1_validado);
  merged.comp_anexo1_fuente = String((inputRules as any).comp_anexo1_fuente || defaultPTARules.comp_anexo1_fuente);
  merged.ext_secciones = normalizeFixedExtSecciones((inputRules as any).ext_secciones);
  merged.ext_actividades = mergeExtActividades(defaultPTARules.ext_actividades, (inputRules as any).ext_actividades);
  merged.comp_secciones = normalizeFixedCompSecciones((inputRules as any).comp_secciones);
  merged.comp_actividades_v2 = mergeCompActividadesV2(
    defaultPTARules.comp_actividades_v2,
    mergeLegacyCompIntoV2(inputRules),
    Array.isArray((inputRules as any).aadm_actividades) && (inputRules as any).aadm_actividades.length > 0
      ? (inputRules as any).aadm_actividades
      : defaultPTARules.aadm_actividades,
  );
  merged.comp_actividades = syncLegacyComplementariasFromV2(merged.comp_actividades_v2);
  merged.aadm_actividades = syncLegacyAadmFromV2(merged.comp_actividades_v2);
  return merged;
}

export function usePTARules() {
  const [rules, setRules] = useState<PTARules>(() => normalizePTARules(defaultPTARules));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getConfiguracionPTAGlobal();
        if (res.success && res.data) {
          setRules(normalizePTARules(res.data));
        } else {
          // Fallback locale dev
          const stored = localStorage.getItem("pta_rules_v2");
          if (stored) setRules(normalizePTARules(JSON.parse(stored)));
        }
      } catch (e) {
        console.error("Error fetching PTA rules v2", e);
        const stored = localStorage.getItem("pta_rules_v2");
        if (stored) setRules(normalizePTARules(JSON.parse(stored)));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saveRules = async (newRules: PTARules): Promise<boolean> => {
    const normalizedRules = normalizePTARules(newRules);
    const normativeErrors = getNormativeRangeErrors(normalizedRules);
    if (normativeErrors.length > 0) {
      toast.error('Configuración Circular 003/2025 fuera de rango', {
        description: normativeErrors.join(' • '),
        duration: 9000,
      });
      return false;
    }

    try {
      const res = await updateConfiguracionPTAGlobal(normalizedRules);
      if (res.success) {
        // R5: Refresh rules from server (includes updated changelog)
        if (res.data && typeof res.data === 'object') {
          if ((res.data as any)._error) {
            toast.error((res.data as any)._error, {
              description: Array.isArray((res.data as any)._warnings) ? (res.data as any)._warnings.join(' • ') : undefined,
              duration: 9000,
            });
            return false;
          }

          const { _warnings, _error, ...serverRules } = res.data as any;
          const merged = normalizePTARules(serverRules);
          setRules(merged);
          localStorage.setItem("pta_rules_v2", JSON.stringify(merged));

          // R3: Show validation warnings
          if (Array.isArray(_warnings) && _warnings.length > 0) {
            toast.warning(`⚠ ${_warnings.length} advertencia(s) normativa(s)`, {
              description: _warnings.join(' • '),
              duration: 8000,
            });
          }
        } else {
          setRules(normalizedRules);
          localStorage.setItem("pta_rules_v2", JSON.stringify(normalizedRules));
        }
        toast.success('Configuración guardada exitosamente en la base de datos.');
        return true;
      } else {
        toast.error('Error al guardar la configuración.');
        return false;
      }
    } catch (e) {
      setRules(normalizedRules);
      localStorage.setItem("pta_rules_v2", JSON.stringify(normalizedRules));
      toast.warning('No se pudo conectar con la base de datos. La configuración quedó guardada solo localmente.');
      return true;
    }
  };

  return { rules, saveRules, loading };
}

// Sub-component for Toggle Buttons
function SwitchToggle({
  checked,
  onChange,
  title,
  description,
}: {
  checked: boolean;
  onChange: (c: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex items-start justify-between gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-slate-300 transition-colors cursor-pointer"
      onClick={() => onChange(!checked)}
    >
      <div>
        <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      <div
        className={`relative w-12 h-6 flex-shrink-0 rounded-full transition-colors duration-200 ease-in-out ${checked ? "bg-emerald-500" : "bg-slate-200"}`}
      >
        <div
          className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform duration-200 ${checked ? "translate-x-6" : "translate-x-0"}`}
        />
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// R4: Deviation Badge — indicador visual cuando un valor difiere del default de la Circular
// ════════════════════════════════════════════════════════════════════════
export function DeviationBadge({ field, currentValue }: { field: keyof PTARules; currentValue: any }) {
  const defaultVal = (defaultPTARules as any)[field];
  if (defaultVal === undefined || defaultVal === currentValue) return null;
  return (
    <span
      title={`Valor Circular: ${defaultVal} \u2014 Valor actual: ${currentValue}`}
      className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-md bg-amber-50 text-amber-700 border border-amber-200 cursor-help select-none animate-in fade-in duration-200"
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
      </svg>
      Personalizado
    </span>
  );
}

/** Computes the list of scalar fields that differ from the Circular default */
export function getDeviations(current: PTARules): Array<{ field: string; defaultVal: any; currentVal: any }> {
  const SKIP: (keyof PTARules)[] = [
    'fecha_inicio_semestre', 'fecha_fin_semestre', 'config_changelog', 'config_snapshots',
    'config_bloqueada', 'circular_version', 'ext_max_horas_enlace',
    'docencia_por_programa', 'inv_roles', 'inv_actividades',
    'ext_secciones', 'ext_actividades', 'comp_actividades', 'aadm_actividades',
  ];
  const deviations: Array<{ field: string; defaultVal: any; currentVal: any }> = [];
  for (const key of Object.keys(defaultPTARules) as (keyof PTARules)[]) {
    if (SKIP.includes(key)) continue;
    const d = (defaultPTARules as any)[key];
    const c = (current as any)[key];
    if (d !== undefined && d !== c && JSON.stringify(d) !== JSON.stringify(c)) {
      deviations.push({ field: key, defaultVal: d, currentVal: c });
    }
  }
  return deviations;
}

export default function ConfiguracionReglasPTA({
  onClose,
}: {
  onClose: () => void;
}) {
  const { rules, saveRules } = usePTARules();
  const [draft, setDraft] = useState<PTARules>(rules);
  const [guardado, setGuardado] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("generales");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);

  const TABS = [
    {
      id: "generales",
      label: "Términos Generales",
      icon: Settings,
      desc: "Horas base y vinculación",
    },
    {
      id: "docencia",
      label: "Académica / Docencia",
      icon: CheckSquare,
      desc: "Topes y matrices (Tablas 1, 2)",
    },
    {
      id: "investigacion",
      label: "Investigación",
      icon: Search,
      desc: "Proyectos y fomento (Tablas 3, 4)",
    },
    {
      id: "extension",
      label: "Extensión",
      icon: Users,
      desc: "Actividades de SNPI (Tablas 5-13)",
    },
    {
      id: "complementarias",
      label: "Acts. Complementarias",
      icon: Calculator,
      desc: "Apoyo interno (Tabla 14)",
    },
  ];

  useEffect(() => {
    setDraft(rules);
    setHasChanges(false);
  }, [rules]);

  const STRING_KEYS: (keyof PTARules)[] = ['fecha_inicio_semestre', 'fecha_fin_semestre', 'circular_version', 'comp_anexo1_fuente'];

  const handleChange = (key: keyof PTARules, value: any) => {
    setDraft((prev) => {
      let nextVal: any = value;
      if (typeof value === "string" && !STRING_KEYS.includes(key)) {
        const num = parseFloat(value);
        nextVal = isNaN(num) ? 0 : num;
      }
      const next = { ...prev, [key]: nextVal } as unknown as PTARules;
      if (key === 'max_horas_extension_global' || key === 'ext_max_horas_enlace') {
        const unified = finiteNumber(nextVal, defaultPTARules.max_horas_extension_global);
        next.max_horas_extension_global = unified;
        next.ext_max_horas_enlace = unified;
      }
      setHasChanges(JSON.stringify(next) !== JSON.stringify(rules));
      return next;
    });
  };

  // R8: Cross-validation before save
  const getCrossValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (draft.max_pct_investigacion + draft.max_pct_extension + draft.max_pct_complementarias > 100) {
      errors.push(`La suma de Investigación (${draft.max_pct_investigacion}%) + Extensión (${draft.max_pct_extension}%) + Complementarias (${draft.max_pct_complementarias}%) = ${draft.max_pct_investigacion + draft.max_pct_extension + draft.max_pct_complementarias}% excede 100%`);
    }
    if (draft.horas_semanales_mt >= draft.horas_semanales_tc) {
      errors.push(`Horas MT (${draft.horas_semanales_mt}) deben ser menores que TC (${draft.horas_semanales_tc})`);
    }
    if (draft.sla_consolidacion_nacional <= draft.dias_limite_radicacion_ggp) {
      errors.push(`SLA consolidación (${draft.sla_consolidacion_nacional} días) debe ser mayor que plazo radicación GGP (${draft.dias_limite_radicacion_ggp} días)`);
    }
    if (draft.horas_base_carrera_003 < draft.horas_base_carrera_009) {
      errors.push(`Horas Acuerdo 003 (${draft.horas_base_carrera_003}) deben ser >= Acuerdo 009 (${draft.horas_base_carrera_009})`);
    }
    return errors;
  };

  // R11: Compute diff for preview
  const getDiffEntries = () => {
    const diffs: Array<{ field: string; oldVal: any; newVal: any }> = [];
    const SKIP = ['config_changelog', 'config_snapshots'];
    for (const key of Object.keys(draft) as (keyof PTARules)[]) {
      if (SKIP.includes(key)) continue;
      const oldV = (rules as any)[key];
      const newV = (draft as any)[key];
      if (JSON.stringify(oldV) !== JSON.stringify(newV)) {
        diffs.push({ field: key, oldVal: oldV, newVal: newV });
      }
    }
    return diffs;
  };

  const handleSave = async () => {
    // R7: Block save if locked
    if (draft.config_bloqueada) {
      toast.error('Configuración bloqueada. Desbloquee antes de guardar.');
      return;
    }

    // R8: Cross-validation warnings
    const crossErrors = getCrossValidationErrors();
    if (crossErrors.length > 0) {
      toast.warning(`⚠ ${crossErrors.length} advertencia(s) de consistencia`, {
        description: crossErrors.join(' • '),
        duration: 8000,
      });
    }

    const saved = await saveRules(draft);
    if (!saved) return;
    setGuardado(true);
    setHasChanges(false);
    setShowDiffModal(false);
    setTimeout(() => {
      setGuardado(false);
    }, 2500);
  };
  // ── Auto-save with debounce ──
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (!hasChanges || draft.config_bloqueada) return;

    // Clear previous timer
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    setAutoSaveStatus('idle');
    autoSaveTimerRef.current = setTimeout(async () => {
      const crossErrors = getCrossValidationErrors();
      if (crossErrors.length > 0) {
        toast.warning(`⚠ ${crossErrors.length} advertencia(s)`, {
          description: crossErrors.join(' • '), duration: 6000,
        });
      }
      setAutoSaveStatus('saving');
      const saved = await saveRules(draft);
      if (!saved) {
        setAutoSaveStatus('idle');
        return;
      }
      setHasChanges(false);
      setTimeout(() => {
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus('idle'), 2000);
      }, 400);
    }, 1500);

    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [draft, hasChanges]);

  // R10: Export to print
  const handleExport = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    const devs = getDeviations(draft);
    w.document.write(`<html><head><title>Configuración PTA — ${draft.circular_version}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:900px;margin:0 auto}
      h1{color:#1e293b;border-bottom:2px solid #3b82f6;padding-bottom:8px}
      h2{color:#334155;margin-top:24px} table{width:100%;border-collapse:collapse;margin:12px 0}
      th,td{padding:6px 12px;border:1px solid #e2e8f0;text-align:left;font-size:13px}
      th{background:#f1f5f9;font-weight:700} .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
      .ok{background:#d1fae5;color:#065f46} .warn{background:#fef3c7;color:#92400e}
      @media print{button{display:none}}</style></head><body>
      <h1>📋 Configuración PTA — ${draft.circular_version}</h1>
      <p>Exportado: ${new Date().toLocaleString()}</p>
      <h2>Parámetros Generales</h2><table><tr><th>Campo</th><th>Valor</th><th>Estado</th></tr>
      ${Object.keys(defaultPTARules).filter(k => !['config_changelog','config_snapshots','config_bloqueada','circular_version','ext_max_horas_enlace','docencia_por_programa','inv_roles','inv_actividades','ext_secciones','ext_actividades','comp_actividades','aadm_actividades'].includes(k)).map(k => {
        const val = (draft as any)[k];
        const def = (defaultPTARules as any)[k];
        const match = JSON.stringify(val) === JSON.stringify(def);
        return '<tr><td><b>' + k + '</b></td><td>' + (typeof val === 'boolean' ? (val ? 'Sí' : 'No') : val) + '</td><td><span class="badge ' + (match ? 'ok' : 'warn') + '">' + (match ? '✓ Circular' : '⚠ Personalizado') + '</span></td></tr>';
      }).join('')}
      </table>
      <h2>Desviaciones (${devs.length})</h2>
      ${devs.length === 0 ? '<p>✅ Todos los valores alineados con la Circular.</p>' : '<table><tr><th>Campo</th><th>Circular</th><th>Actual</th></tr>' + devs.map(d => '<tr><td><b>' + d.field + '</b></td><td>' + d.defaultVal + '</td><td>' + d.currentVal + '</td></tr>').join('') + '</table>'}
      <h2>Historial de Cambios (últimos 10)</h2>
      <table><tr><th>Fecha</th><th>Usuario</th><th>Campos</th></tr>
      ${(draft.config_changelog || []).slice(-10).reverse().map(e => '<tr><td>' + e.fecha + '</td><td>' + e.usuario + '</td><td>' + e.campos_modificados?.join(', ') + '</td></tr>').join('')}
      </table><br><button onclick="window.print()">🖨️ Imprimir</button></body></html>`);
    w.document.close();
  };

  // R12: Rollback
  const handleRollback = (snapshotIdx: number) => {
    const snap = draft.config_snapshots?.[snapshotIdx];
    if (!snap?.snapshot) return;
    const restored = normalizePTARules({ ...snap.snapshot, config_snapshots: draft.config_snapshots, config_changelog: draft.config_changelog });
    setDraft(restored as PTARules);
    setHasChanges(true);
    setShowRollbackModal(false);
    toast.info(`Config restaurada al snapshot de ${snap.fecha}. Guarde para confirmar.`);
  };

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-50/60 via-white to-sky-50/60 pb-24 font-sans selection:bg-blue-100">
      {/* Premium Compact Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm px-5 lg:px-8 py-3 flex items-center justify-between transition-all">
        {/* Left: Icon + Title + Circular Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shadow-blue-500/15">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
              Configuración de Reglas
            </h1>
            <p className="text-[11px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
              Estatutos 009/2004, 003/2018
            </p>
          </div>
        </div>

        {/* Right: Status + Actions */}
        <div className="flex items-center gap-3">
          {draft.circular_version && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              ALINEADO CON {draft.circular_version.toUpperCase()}
            </div>
          )}

          {/* Auto-save status indicator */}
          <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
            {autoSaveStatus === 'saving' && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                Guardando…
              </span>
            )}
            {autoSaveStatus === 'saved' && (
              <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
                <CheckSquare className="w-3.5 h-3.5" />
                Guardado
              </span>
            )}
            {autoSaveStatus === 'idle' && hasChanges && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Sin guardar
              </span>
            )}
            {autoSaveStatus === 'idle' && !hasChanges && (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                Al día
              </span>
            )}
          </div>

          {/* Lock toggle */}
          <button
            onClick={() => handleChange('config_bloqueada', !draft.config_bloqueada)}
            title={draft.config_bloqueada ? 'Desbloquear' : 'Bloquear'}
            className={`p-2 rounded-lg border transition-all ${draft.config_bloqueada
              ? 'bg-red-50 border-red-200 text-red-500 hover:bg-red-100'
              : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
          >
            {draft.config_bloqueada ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Export */}
          <button onClick={handleExport} title="Exportar configuración"
            className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
            <FileDown className="w-4 h-4" />
          </button>

          {/* Rollback */}
          {Array.isArray(draft.config_snapshots) && draft.config_snapshots.length > 0 && (
            <button onClick={() => setShowRollbackModal(true)} title="Restaurar versión anterior"
              className="p-2 rounded-lg border border-gray-200 bg-gray-50 text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Diff preview — only when changes exist */}
          {hasChanges && (
            <button onClick={() => setShowDiffModal(true)} title="Ver cambios pendientes"
              className="p-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
              <Eye className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>





      {/* R7: Lock Banner */}
      {draft.config_bloqueada && (
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 lg:px-10 py-3 flex items-center gap-3 text-sm font-bold shadow-lg">
          <Lock className="w-5 h-5 flex-shrink-0" />
          <span>Configuración bloqueada — {draft.config_bloqueada_motivo || 'Período académico activo'}. No se permiten cambios.</span>
          <button onClick={() => handleChange('config_bloqueada', false)}
            className="ml-auto px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-bold transition-all">
            Desbloquear
          </button>
        </div>
      )}

      {/* R11: Diff Preview Modal */}
      {showDiffModal && (() => {
        const diffs = getDiffEntries();
        return (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDiffModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><Eye className="w-5 h-5 text-blue-500" /> Vista previa de cambios</h3>
                <button onClick={() => setShowDiffModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {diffs.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No hay cambios pendientes.</p>
                ) : (
                  <div className="space-y-2">
                    {diffs.map(d => (
                      <div key={d.field} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="text-xs font-mono font-bold text-slate-600 min-w-[180px]">{d.field}</span>
                        <span className="text-xs text-red-500 line-through truncate max-w-[150px]">{typeof d.oldVal === 'object' ? JSON.stringify(d.oldVal).slice(0, 40) + '…' : String(d.oldVal)}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-xs text-emerald-600 font-bold truncate max-w-[150px]">{typeof d.newVal === 'object' ? JSON.stringify(d.newVal).slice(0, 40) + '…' : String(d.newVal)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
                <button onClick={() => setShowDiffModal(false)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
                <button onClick={handleSave} className="px-6 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black transition-all">
                  Confirmar y guardar ({diffs.length} cambio{diffs.length !== 1 ? 's' : ''})
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* R12: Rollback Modal */}
      {showRollbackModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowRollbackModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2"><RotateCcw className="w-5 h-5 text-amber-500" /> Restaurar versión anterior</h3>
              <button onClick={() => setShowRollbackModal(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-2">
              {(draft.config_snapshots || []).slice().reverse().map((snap, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-200 transition-colors">
                  <div>
                    <div className="text-sm font-bold text-slate-700">{snap.fecha}</div>
                    <div className="text-xs text-slate-500">{snap.usuario} {snap.label ? `— ${snap.label}` : ''}</div>
                  </div>
                  <button onClick={() => handleRollback((draft.config_snapshots || []).length - 1 - i)}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-all">
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-screen-2xl mx-auto flex flex-col p-4 sm:p-6 lg:p-10 w-full gap-6 items-start relative">
        {/* ── Premium Horizontal Tab Navigation ── */}
        <div className="w-full sticky top-[52px] z-20 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, rgba(248,250,252,0.95) 80%, transparent 100%)', backdropFilter: 'blur(12px)' }}>
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 16px',
                    borderRadius: 12,
                    border: isActive ? '1.5px solid #003DA5' : '1.5px solid transparent',
                    background: isActive ? '#ffffff' : 'rgba(255,255,255,0.6)',
                    boxShadow: isActive
                      ? '0 4px 16px rgba(0,61,165,0.12), 0 1px 3px rgba(0,61,165,0.08)'
                      : '0 1px 2px rgba(0,0,0,0.04)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                    whiteSpace: 'nowrap' as const,
                    position: 'relative' as const,
                    overflow: 'hidden' as const,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.6)';
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                    }
                  }}
                >
                  {/* Step number + Icon combo */}
                  <div style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: isActive
                      ? 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)'
                      : '#F1F5F9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 2px 8px rgba(0,61,165,0.25)' : 'none',
                    position: 'relative' as const,
                  }}>
                    <Icon style={{
                      width: 16,
                      height: 16,
                      color: isActive ? '#ffffff' : '#94A3B8',
                      transition: 'color 0.2s ease',
                    }} />
                    {/* Step number badge */}
                    <div style={{
                      position: 'absolute',
                      top: -4,
                      right: -4,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: isActive ? '#003DA5' : '#E2E8F0',
                      color: isActive ? '#ffffff' : '#94A3B8',
                      fontSize: 9,
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2px solid #f8fafc',
                      transition: 'all 0.2s ease',
                    }}>
                      {i + 1}
                    </div>
                  </div>
                  {/* Label + description */}
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', gap: 1 }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: isActive ? 800 : 600,
                      color: isActive ? '#003DA5' : '#64748B',
                      lineHeight: 1.2,
                      transition: 'all 0.2s ease',
                      letterSpacing: isActive ? '-0.01em' : '0',
                    }}>
                      {tab.label}
                    </span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: isActive ? '#003DA5' : '#94A3B8',
                      lineHeight: 1.2,
                      opacity: isActive ? 0.6 : 0.8,
                      transition: 'all 0.2s ease',
                    }}>
                      {tab.desc}
                    </span>
                  </div>
                  {/* Active bottom bar */}
                  {isActive && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 12,
                      right: 12,
                      height: 3,
                      borderRadius: '3px 3px 0 0',
                      background: 'linear-gradient(90deg, #003DA5, #0052CC)',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="w-full min-w-0">
          {activeTab === "generales" && <TabGenerales draft={draft} handleChange={handleChange} />}
          {activeTab === "docencia" && <TabDocencia draft={draft} handleChange={handleChange} />}
          {activeTab === "investigacion" && <TabInvestigacion draft={draft} handleChange={handleChange} />}
          {activeTab === "extension" && <TabExtension draft={draft} handleChange={handleChange} />}
          {activeTab === "complementarias" && <TabComplementarias draft={draft} handleChange={handleChange} />}

        </div>
      </div>
    </div>
  );
}

