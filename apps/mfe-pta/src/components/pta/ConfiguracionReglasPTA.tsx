import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { getConfiguracionPTAGlobal, updateConfiguracionPTAGlobal } from "../../services/api/ptaApi";
import { TabInvestigacion } from "./config-tabs/TabInvestigacion";
import { TabExtension } from "./config-tabs/TabExtension";
import { TabDocencia } from './config-tabs/TabDocencia';
import { TabComplementarias } from "./config-tabs/TabComplementarias";
import { TabGenerales } from "./config-tabs/TabGenerales";
import { TabAADM } from "./config-tabs/TabAADM";

export interface PTARules {
  // Horas base
  horas_base_carrera_009: number;
  horas_base_carrera_003: number;
  horas_semanales_tc: number; // Tiempo Completo No Vinculados (Generalmente 40)
  horas_semanales_mt: number; // Medio Tiempo No Vinculados (Generalmente 20)

  // Topes
  max_pct_investigacion: number;
  max_pct_extension: number;
  max_pct_complementarias: number;
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

  // Configuración dinámica de docencia por programa académico (Base h/Cr, Multiplicador, etc.)
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

  // Extensión
  ext_max_horas_enlace: number;
  ext_max_pct_enlace: number;
  ext_construccion_contenidos_max: number;
  ext_talleres_ejec_base: number;
  ext_seminarios_ejec_base: number;
  ext_cursos_ejec_max: number;
  ext_diplomados_ejec_max: number;

  // Extensión: Procesos Selección (Tablas 6, 7, 8)
  ext_sel_revision_prueba: number;
  ext_sel_validacion_prueba: number;
  ext_sel_construccion_casos: number;
  ext_sel_revision_casos: number;
  ext_sel_item_validacion: number;
  ext_sel_analisis_evidencias: number;
  ext_sel_grupos_discusion: number;
  ext_sel_jurado_con_asis: number;
  ext_sel_jurado_con_cal: number;
  ext_sel_jurado_apt_vir: number;
  ext_sel_jurado_apt_apl: number;

  // Extensión: Fortalecimiento (Tablas 9, 10)
  ext_fag_asistencia_tecnica: number;
  ext_fag_bateria_indicadores: number;
  ext_fag_red_plan_1: number;
  ext_fag_red_plan_2: number;
  ext_fag_red_analisis_1: number;
  ext_fag_red_analisis_2: number;
  ext_fag_red_analisis_3: number;
  ext_fag_red_arq_1: number;
  ext_fag_red_arq_2: number;

  // Extensión: Laboratorio (Tabla 11)
  ext_lab_fijo_participacion: number;
  ext_lab_fijo_administrativo: number;
  ext_lab_var_planear: number;
  ext_lab_var_elab_1: number;
  ext_lab_var_elab_2: number;
  ext_lab_var_disenar: number;
  ext_lab_var_campo: number;
  ext_lab_var_acomp_eventos: number;
  ext_lab_var_acomp_campo: number;
  ext_lab_var_representar: number;
  ext_lab_var_charlas: number;
  ext_lab_var_coord: number;
  ext_lab_var_diseno_est: number;

  // Extensión: Investigación Aplicada (Tabla 12)
  ext_inv_doc_tec_min: number;
  ext_inv_doc_tec_max: number;
  ext_inv_plan_trabajo_min: number;
  ext_inv_plan_trabajo_max: number;
  ext_inv_prod_nuevo_con_min: number;
  ext_inv_prod_nuevo_con_max: number;
  ext_inv_prod_des_tec_min: number;
  ext_inv_prod_des_tec_max: number;
  ext_inv_prod_apropiacion_min: number;
  ext_inv_prod_apropiacion_max: number;
  ext_inv_prod_formacion_min: number;
  ext_inv_prod_formacion_max: number;
  ext_inv_eventos_max: number;
  ext_inv_procesos_eval_max: number;

  // Extensión: Escuela de Alto Gobierno (Tabla 13)
  ext_eag_coaching_min: number;
  ext_eag_coaching_max: number;
  ext_eag_formacion_min: number;
  ext_eag_formacion_max: number;
  ext_eag_gestion_con_min: number;
  ext_eag_gestion_con_max: number;
  ext_eag_desarrollo_con_min: number;
  ext_eag_desarrollo_con_max: number;

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

  // Roles de Investigación (configurables)
  inv_roles: Array<{ id: string; nombre: string; horas_max: number; pct_max: number }>;
  // Actividades de Investigación (configurables)
  inv_actividades: Array<{ id: string; nombre: string; horas_max: number }>;

  // Secciones de Extensión (configurables)
  ext_secciones: Array<{ key: string; label: string; color: string; orden: number; multiplicador?: number }>;
  // Actividades de Extensión por sección (configurables)
  ext_actividades: Record<string, Array<{ id: string; nombre: string; max_horas: number }>>;

  // Actividades Complementarias (configurables)
  comp_actividades: Array<{ id: string; nombre: string; max_horas: number | null; seccion: string; consumeTotalidad?: boolean }>;

  // Actividades Académico-Administrativas (configurables)
  aadm_actividades: Array<{ id: string; nombre: string; max_horas: number | null; consumeTotalidad: boolean }>;
}

export const defaultPTARules: PTARules = {
  horas_base_carrera_009: 720,
  horas_base_carrera_003: 800,
  horas_semanales_tc: 40,
  horas_semanales_mt: 20,

  max_pct_investigacion: 50,
  max_pct_extension: 25,
  max_pct_complementarias: 25,

  sla_radicacion_pta: 5,
  sla_verificacion_jefaturas: 15,
  sla_verificacion_sna: 3,
  sla_verificacion_vr: 3,
  sla_consolidacion_nacional: 3,

  requiere_aprobacion_inicio: true,
  requiere_acreditacion_final: true,
  ggp_auditoria_activa: false,

  min_creditos_docencia: 3,
  dias_cierre_concertacion: 5,
  dias_limite_radicacion_ggp: 10,
  dias_verificacion_posterior: 15,
  criterio_multiplicador_docencia: 3,
  min_pct_docencia_no_vinculados: 50,

  docencia_por_programa: {},

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
  ext_max_pct_enlace: 25,
  ext_construccion_contenidos_max: 160,
  ext_talleres_ejec_base: 8,
  ext_seminarios_ejec_base: 16,
  ext_cursos_ejec_max: 32,
  ext_diplomados_ejec_max: 80,

  ext_sel_revision_prueba: 1,
  ext_sel_validacion_prueba: 2,
  ext_sel_construccion_casos: 4,
  ext_sel_revision_casos: 3,
  ext_sel_item_validacion: 1,
  ext_sel_analisis_evidencias: 1.5,
  ext_sel_grupos_discusion: 1.5,
  ext_sel_jurado_con_asis: 2,
  ext_sel_jurado_con_cal: 3,
  ext_sel_jurado_apt_vir: 2,
  ext_sel_jurado_apt_apl: 2,

  ext_fag_asistencia_tecnica: 80,
  ext_fag_bateria_indicadores: 80,
  ext_fag_red_plan_1: 40,
  ext_fag_red_plan_2: 40,
  ext_fag_red_analisis_1: 80,
  ext_fag_red_analisis_2: 80,
  ext_fag_red_analisis_3: 100,
  ext_fag_red_arq_1: 100,
  ext_fag_red_arq_2: 40,

  ext_lab_fijo_participacion: 100,
  ext_lab_fijo_administrativo: 120,
  ext_lab_var_planear: 80,
  ext_lab_var_elab_1: 40,
  ext_lab_var_elab_2: 80,
  ext_lab_var_disenar: 120,
  ext_lab_var_campo: 40,
  ext_lab_var_acomp_eventos: 20,
  ext_lab_var_acomp_campo: 40,
  ext_lab_var_representar: 20,
  ext_lab_var_charlas: 20,
  ext_lab_var_coord: 60,
  ext_lab_var_diseno_est: 60,

  ext_inv_doc_tec_min: 40,
  ext_inv_doc_tec_max: 60,
  ext_inv_plan_trabajo_min: 2,
  ext_inv_plan_trabajo_max: 6,
  ext_inv_prod_nuevo_con_min: 40,
  ext_inv_prod_nuevo_con_max: 60,
  ext_inv_prod_des_tec_min: 40,
  ext_inv_prod_des_tec_max: 60,
  ext_inv_prod_apropiacion_min: 40,
  ext_inv_prod_apropiacion_max: 60,
  ext_inv_prod_formacion_min: 40,
  ext_inv_prod_formacion_max: 60,
  ext_inv_eventos_max: 8,
  ext_inv_procesos_eval_max: 4,

  ext_eag_coaching_min: 80,
  ext_eag_coaching_max: 200,
  ext_eag_formacion_min: 80,
  ext_eag_formacion_max: 200,
  ext_eag_gestion_con_min: 80,
  ext_eag_gestion_con_max: 200,
  ext_eag_desarrollo_con_min: 40,
  ext_eag_desarrollo_con_max: 120,

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
    { key: 'capacitacion', label: 'Capacitación (SNPI)', color: '#059669', orden: 1, multiplicador: 2 },
    { key: 'seleccion', label: 'Selección (SNPI)', color: '#0284C7', orden: 2, multiplicador: 1 },
    { key: 'fortalecimiento', label: 'Fortalecimiento (SNPI)', color: '#7C3AED', orden: 3, multiplicador: 1 },
    { key: 'laboratorio_innovacion', label: 'Laboratorio de Innovación', color: '#0E7490', orden: 4, multiplicador: 1 },
    { key: 'investigacion_aplicada', label: 'Investigación Aplicada', color: '#15803D', orden: 5, multiplicador: 1 },
    { key: 'alto_gobierno', label: 'Alto Gobierno (EAG)', color: '#B45309', orden: 6, multiplicador: 1 },
  ],
  ext_actividades: {
    capacitacion: [
      { id: 'CAP_01', nombre: 'Orientación de Talleres', max_horas: 16 },
      { id: 'CAP_02', nombre: 'Orientación de Seminarios', max_horas: 32 },
      { id: 'CAP_03', nombre: 'Orientación de Cursos', max_horas: 64 },
      { id: 'CAP_04', nombre: 'Orientación de Diplomados', max_horas: 160 },
    ],
    seleccion: [
      { id: 'SEL_01', nombre: 'Revisión de estructuras de prueba — Capacitación', max_horas: 1 },
      { id: 'SEL_02', nombre: 'Revisión de estructuras de prueba — Sesión de validación', max_horas: 2 },
      { id: 'SEL_03', nombre: 'Definición de constructos — Capacitación', max_horas: 1 },
      { id: 'SEL_04', nombre: 'Definición de constructos — Sesión de validación', max_horas: 2 },
      { id: 'SEL_05', nombre: 'Construcción de casos — por caso', max_horas: 4 },
      { id: 'SEL_06', nombre: 'Revisión de casos — por caso', max_horas: 3 },
      { id: 'SEL_07', nombre: 'Validación de casos — por caso', max_horas: 3 },
      { id: 'SEL_08', nombre: 'Construcción/Validación de casos — Capacitación', max_horas: 2 },
      { id: 'SEL_09', nombre: 'Validación de ítems — por ítem', max_horas: 1 },
      { id: 'SEL_10', nombre: 'Análisis validez / Grupos de discusión — Capacitación', max_horas: 1 },
      { id: 'SEL_11', nombre: 'Análisis validez / Grupos de discusión — por semana', max_horas: 2 },
      { id: 'SEL_12', nombre: 'Jurados Tribunales — Capacitación', max_horas: 2 },
      { id: 'SEL_13', nombre: 'Jurados Tribunales — Prueba escrita', max_horas: 3 },
      { id: 'SEL_14', nombre: 'Jurados Tribunales — Prueba oral', max_horas: 4 },
    ],
    fortalecimiento: [
      { id: 'FOR_01', nombre: 'Línea temática con municipios', max_horas: 80 },
      { id: 'FOR_02', nombre: 'Batería de indicadores', max_horas: 80 },
      { id: 'FOR_03', nombre: 'Planeación y desarrollo', max_horas: 40 },
      { id: 'FOR_04', nombre: 'Elaboración de instrumentos', max_horas: 40 },
      { id: 'FOR_05', nombre: 'Análisis y diagnóstico institucional — trabajo de campo', max_horas: 80 },
      { id: 'FOR_06', nombre: 'Análisis y diagnóstico institucional — externo/interno', max_horas: 80 },
      { id: 'FOR_07', nombre: 'Análisis y diagnóstico institucional — producción documento', max_horas: 100 },
      { id: 'FOR_08', nombre: 'Arquitectura institucional', max_horas: 100 },
      { id: 'FOR_09', nombre: 'Elaboración de actos administrativos', max_horas: 40 },
    ],
    laboratorio_innovacion: [
      { id: 'LAB_01', nombre: 'Componente Fijo — Participación en Laboratorio', max_horas: 120 },
      { id: 'LAB_02', nombre: 'Componente Fijo — Gestión administrativa del Laboratorio', max_horas: 100 },
      { id: 'LAB_03', nombre: 'Componente Variable — Diseño e implementación (por actividad)', max_horas: 120 },
    ],
    investigacion_aplicada: [
      { id: 'INV_AP_01', nombre: 'Elaboración de documentos técnicos', max_horas: 60 },
      { id: 'INV_AP_02', nombre: 'Elaboración de Plan de Trabajo', max_horas: 6 },
      { id: 'INV_AP_03', nombre: 'Generación de Nuevo Conocimiento / Desarrollo Tecnológico', max_horas: 60 },
      { id: 'INV_AP_04', nombre: 'Asistencia a eventos de extensión', max_horas: 8 },
      { id: 'INV_AP_05', nombre: 'Procesos de evaluación de desempeño', max_horas: 4 },
    ],
    alto_gobierno: [
      { id: 'EAG_01', nombre: 'Coaching directivo', max_horas: 200 },
      { id: 'EAG_02', nombre: 'Formación estratégica', max_horas: 200 },
      { id: 'EAG_03', nombre: 'Gestión del conocimiento', max_horas: 200 },
      { id: 'EAG_04', nombre: 'Desarrollo de contenidos', max_horas: 120 },
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

export function usePTARules() {
  const [rules, setRules] = useState<PTARules>(defaultPTARules);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await getConfiguracionPTAGlobal();
        if (res.success && res.data) {
          setRules({ ...defaultPTARules, ...res.data });
        } else {
          // Fallback locale dev
          const stored = localStorage.getItem("pta_rules_v2");
          if (stored) setRules({ ...defaultPTARules, ...JSON.parse(stored) });
        }
      } catch (e) {
        console.error("Error fetching PTA rules v2", e);
        const stored = localStorage.getItem("pta_rules_v2");
        if (stored) setRules({ ...defaultPTARules, ...JSON.parse(stored) });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const saveRules = async (newRules: PTARules) => {
    setRules(newRules);
    localStorage.setItem("pta_rules_v2", JSON.stringify(newRules));
    try {
      const res = await updateConfiguracionPTAGlobal(newRules);
      if (res.success) {
        toast.success('Configuración guardada exitosamente en la base de datos.');
      } else {
        toast.error(res.message || 'Error al guardar la configuración.');
      }
    } catch (e) {
      toast.error('Error de conexión al guardar la configuración.');
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
    {
      id: "aadm",
      label: "Académicas y Admin",
      icon: Shield,
      desc: "Doctorado, Misiones y Flujos",
    },
  ];

  useEffect(() => {
    setDraft(rules);
    setHasChanges(false);
  }, [rules]);

  const STRING_KEYS: (keyof PTARules)[] = ['fecha_inicio_semestre', 'fecha_fin_semestre'];

  const handleChange = (key: keyof PTARules, value: any) => {
    setDraft((prev) => {
      let nextVal: any = value;
      if (typeof value === "string" && !STRING_KEYS.includes(key)) {
        const num = parseFloat(value);
        nextVal = isNaN(num) ? 0 : num;
      }
      const next = { ...prev, [key]: nextVal } as unknown as PTARules;
      setHasChanges(JSON.stringify(next) !== JSON.stringify(rules));
      return next;
    });
  };

  const handleSave = () => {
    saveRules(draft);
    setGuardado(true);
    setHasChanges(false);
    setTimeout(() => {
      setGuardado(false);
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[conic-gradient(at_top_right,_var(--tw-gradient-stops))] from-blue-50/60 via-white to-sky-50/60 pb-24 font-sans selection:bg-blue-100">
      {/* Premium Glass Header */}
      <div className="sticky top-0 z-40 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] px-6 lg:px-10 py-5 flex items-center justify-between transition-all">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white">
            <Settings className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              Configuración de Reglas
            </h1>
            <p className="text-sm tracking-wide text-slate-500 font-medium mt-0.5">
              Parámetros y flujos de aprobación - Estatutos 009/2004, 003/2018 y demás normatividad vigente.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {hasChanges && (
            <span className="text-xs font-bold text-amber-600 animate-pulse bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200/50 hidden sm:block shadow-sm">
              Hay cambios sin guardar
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!hasChanges && !guardado}
            className={`
              flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300
              ${
                guardado
                  ? "bg-emerald-500 text-white shadow-[0_8px_30px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500 ring-offset-2"
                  : hasChanges
                    ? "bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-900/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-900/30 ring-1 ring-slate-800"
                    : "bg-white text-slate-400 cursor-not-allowed border border-slate-200 shadow-sm"
              }
            `}
          >
            {guardado ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {guardado ? "Cambios Guardados" : "Guardar Configuración"}
          </button>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto flex flex-col lg:flex-row p-6 lg:p-10 w-full gap-8 md:gap-12 items-start relative">
        {/* Floating Sidebar Nav */}
        <div
          style={{ width: sidebarCollapsed ? '80px' : '260px' }}
          className="flex-shrink-0 bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] py-6 px-3.5 sticky top-24 z-20 max-h-[calc(100vh-120px)] overflow-y-auto hidden lg:flex lg:flex-col transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          <div className={`mb-6 flex items-center ${sidebarCollapsed ? 'justify-center px-0' : 'justify-between px-2'} transition-all duration-300`}>
            {!sidebarCollapsed && (
              <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
                <h3 className="text-[0.95rem] font-extrabold text-slate-800 m-0 tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                  Módulos
                </h3>
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400 m-0 mt-1.5 ml-3.5">{TABS.length} vistas disponibles</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm active:scale-95 transition-all cursor-pointer flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              title={sidebarCollapsed ? 'Expandir menú' : 'Colapsar menú'}
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="flex flex-col gap-1.5 relative">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={sidebarCollapsed ? tab.label : undefined}
                  className={`group relative w-full flex items-center py-2.5 rounded-2xl border-none cursor-pointer transition-all duration-300 overflow-hidden ${
                    sidebarCollapsed ? 'justify-center px-0' : 'justify-start px-3 gap-3 hover:pl-4'
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-blue-50/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5)]"
                      : "bg-transparent hover:bg-slate-50/80"
                  }`}
                >
                  {/* Background highlight for active state */}
                  {isActive && (
                    <div className="absolute inset-0 border border-blue-100 rounded-2xl pointer-events-none" />
                  )}
                  
                  {/* Indicador activo - Píldora lateral */}
                  {isActive && !sidebarCollapsed && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
                  )}
                  {isActive && sidebarCollapsed && (
                    <div className="absolute left-1/2 bottom-[2px] top-auto -translate-x-1/2 w-4 h-[3px] bg-blue-600 rounded-full" />
                  )}

                  {/* Contenedor del Icono */}
                  <div className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isActive 
                      ? "bg-blue-600 shadow-md shadow-blue-600/20 scale-100" 
                      : (sidebarCollapsed ? "bg-transparent text-slate-400 group-hover:text-blue-500" : "bg-white border border-slate-100 text-slate-400 shadow-sm group-hover:border-slate-200 group-hover:shadow-md group-hover:text-blue-500 scale-95")
                  }`}>
                    <Icon
                      className={`w-[18px] h-[18px] transition-colors duration-300 ${isActive ? "text-white" : ""}`}
                    />
                  </div>
                  
                  {/* Texto principal */}
                  {!sidebarCollapsed && (
                    <div className="flex flex-col items-start overflow-hidden text-left w-full transition-all duration-300">
                      <span className={`text-[0.85rem] truncate w-full transition-colors duration-300 ${isActive ? "font-extrabold text-blue-900" : "font-semibold text-slate-600 group-hover:text-slate-800"}`}>
                        {tab.label}
                      </span>
                      <span className={`text-[0.62rem] truncate w-full transition-colors duration-300 ${isActive ? "text-blue-600/80 font-semibold" : "text-slate-400 group-hover:text-slate-500"}`}>
                        {tab.desc}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Nav (Fallback) */}
        <div className="w-full lg:hidden block mb-6">
          <select 
            value={activeTab} 
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {TABS.map(tab => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 w-full">
          {activeTab === "generales" && <TabGenerales draft={draft} handleChange={handleChange} />}
          {activeTab === "docencia" && <TabDocencia draft={draft} handleChange={handleChange} />}
          {activeTab === "investigacion" && <TabInvestigacion draft={draft} handleChange={handleChange} />}
          {activeTab === "extension" && <TabExtension draft={draft} handleChange={handleChange} />}
          {activeTab === "complementarias" && <TabComplementarias draft={draft} handleChange={handleChange} />}
          {activeTab === "aadm" && <TabAADM draft={draft} handleChange={handleChange} />}
        </div>
      </div>
    </div>
  );
}

