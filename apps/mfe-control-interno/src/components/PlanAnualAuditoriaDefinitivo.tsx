/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLAN ANUAL DE AUDITORÍA INTERNA - OCI ESAP
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Base legal: Decreto 648 de 2017
 * Formato: EM-FO-001 Plan Anual de Auditoría Interna V.6
 * Fuente: RolesOCI_Estructurado.md
 * 
 * Estructura:
 * - 5 roles obligatorios del Decreto 648/2017
 * - 22 actividades fijas distribuidas en los roles
 * - Seguimiento y evaluación de cada actividad
 * - Flujo de estados: Borrador → En revisión → Aprobado → Vigente → Cerrado
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO API - Plan Anual (cargar datos desde backend)
// ═══════════════════════════════════════════════════════════════════════════
import { usePlanAnualCompleto, useCreatePlanAnual, actividadesApi, planAnualApi } from './services/plan-anual';
import { useControlInternoPermissions } from './hooks/useControlInternoPermissions';
import {
  Shield, Calendar, Users, FileText, Download, ArrowLeft, ArrowRight,
  Plus, Check, AlertCircle, CheckCircle2, TrendingUp,
  BookOpen, Eye, Clock, FileCheck, ChevronRight, X
} from 'lucide-react';
import { toast } from 'sonner';
import { WizardCreacion, DashboardPlan } from './PlanAnualWizardDashboard';
import { PlanAnualRol4Integrado } from './PlanAnualRol4Integrado';
import { IntegracionRol4Provider } from './IntegracionRol4Context';
import {
  ConfiguracionEvidencias,
  ObservacionHistorica,
  // ArchivoAdjunto se define localmente para evitar conflicto de tipos
  CONFIGURACIONES_PREDEFINIDAS
} from './SistemaEvidenciasActividades';

/**
 * El backend guarda responsables en jsonb (`responsables`) y/o en varchar (`responsable`).
 * Si jsonb viene como `[]`, sigue siendo truthy en JS y el wizard no caía al fallback del objeto.
 * Además jsonb puede serializarse como string en algunos caminos.
 */
function normalizarArrayResponsablesBackend(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return Array.isArray(raw) ? raw : [];
}

// ════════════════════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════════════════════

type EstadoPlan = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'VIGENTE' | 'CERRADO';
type EstadoActividad = 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA';

interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
}

interface Actividad {
  id: number | string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: Auditor | null;
  porcentajeAvance: number;
  estado: EstadoActividad;
  control: string;
  evaluacion: string;
  seguimiento: string;
  
  // ═══════════════════════════════════════════════════════════════════════
  // SISTEMA DE EVIDENCIAS COMPLETO (opcionales para datos iniciales)
  // ═══════════════════════════════════════════════════════════════════════
  configuracionEvidencias?: ConfiguracionEvidencias; // Configuración de requisitos
  adjuntos?: ArchivoAdjunto[]; // Archivos adjuntos con metadata completa (opcional)
  bitacoraObservaciones?: ObservacionHistorica[]; // Historial de observaciones (opcional)
  
  // ═══════════════════════════════════════════════════════════════════════
  // VERIFICACIÓN DEL DIRECTOR
  // ═══════════════════════════════════════════════════════════════════════
  requiereVerificacionDirector: boolean; // Indica si requiere verificación del Director OCI
  verificadaPorDirector?: boolean; // Indica si fue verificada por el Director
  fechaVerificacion?: string; // Fecha de verificación del Director
  observacionesDirector?: string; // Observaciones del Director al verificar
  activo?: boolean; // Soft delete
}

interface ArchivoAdjunto {
  id: string;
  nombre: string;
  tipo: string;
  tamaño: number;
  fechaCarga: string;
  cargadoPor: string;
  url?: string;
}

interface Rol {
  numero: number;
  nombre: string;
  color: string;
  icono: string;
  descripcion: string;
  actividades: Actividad[];
}

interface PlanAnual {
  id: string;
  vigencia: number;
  version: number;
  estado: EstadoPlan;
  jefeOCI: Auditor;
  fechaCreacion: string;
  fechaAprobacion: string | null;
  actaCICC: string | null;
  roles: Rol[];
}

// ════════════════════════════════════════════════════════════════════════════
// DATOS MOCK COMENTADOS - Ahora se cargan desde el backend
// ════════════════════════════════════════════════════════════════════════════
// Los auditores ahora vienen del hook useAuditores()
const AUDITORES: Auditor[] = [
  { id: '1', nombre: 'Mario Oswaldo Bernal', cargo: 'Jefe de Control Interno', email: 'mario.bernal@esap.edu.co' },
  { id: '2', nombre: 'Ana María López', cargo: 'Auditora sénior', email: 'ana.lopez@esap.edu.co' },
  { id: '3', nombre: 'Carlos Mendoza', cargo: 'Auditor', email: 'carlos.mendoza@esap.edu.co' },
  { id: '4', nombre: 'Laura Rodríguez', cargo: 'Auditora', email: 'laura.rodriguez@esap.edu.co' },
  { id: '5', nombre: 'Juan Pablo García', cargo: 'Auditor júnior', email: 'juan.garcia@esap.edu.co' }
];

// ════════════════════════════════════════════════════════════════════════════
// DATOS: ESTRUCTURA OFICIAL DECRETO 648/2017
// ════════════════════════════════════════════════════════════════════════════
//
// ⚠️ MOCK DATA - En producción estos datos vienen del backend:
//    - Los 5 roles se cargan automáticamente al crear un plan
//    - Endpoint: GET /plan-anual-5-roles/year/:año
//    - El backend trae plan.roles[] con actividades incluidas
//    - Hook: usePlanAnualByYear(año) de './services/plan-anual'
//
// TODO: Reemplazar por datos de BD cuando el backend esté conectado
// const { plan } = usePlanAnualByYear(2026);
// plan.roles contiene los 5 roles con sus actividades
//
const ROLES_DECRETO_648: Omit<Rol, 'actividades'>[] = [
  {
    numero: 1,
    nombre: 'Liderazgo estratégico',
    color: '#2962FF',
    icono: '🎯',
    descripcion: 'Asesorar y acompañar a la alta dirección en la gestión estratégica del control interno'
  },
  {
    numero: 2,
    nombre: 'Enfoque a la prevención',
    color: '#00C853',
    icono: '🛡️',
    descripcion: 'Promover actividades preventivas que eviten la materialización de riesgos'
  },
  {
    numero: 3,
    nombre: 'Evaluación de la gestión del riesgo',
    color: '#FF6D00',
    icono: '⚠️',
    descripcion: 'Evaluar la efectividad del sistema de gestión de riesgos institucional'
  },
  {
    numero: 4,
    nombre: 'Evaluación y seguimiento',
    color: '#AA00FF',
    icono: '✓',
    descripcion: 'Evaluar de manera independiente el diseño y efectividad del sistema de control interno'
  },
  {
    numero: 5,
    nombre: 'Relación con entes externos de control',
    color: '#C62828',
    icono: '⚖️',
    descripcion: 'Coordinar y facilitar las relaciones con entes de control externo'
  }
];

// ════════════════════════════════════════════════════════════════════════════
// ACTIVIDADES POR ROL (basadas en RolesOCI_Estructurado.md)
// ════════════════════════════════════════════════════════════════════════════
//
// ⚠️ MOCK DATA - En producción las actividades vienen del backend:
//    - Ya incluidas en plan.roles[].actividades[]
//    - Se pueden agregar nuevas: POST /plan-anual-5-roles/:rolId/actividades
//    - Se pueden actualizar: PUT /plan-anual-5-roles/actividades/:id
//    - Hook: useActividadesMutations() de './services/plan-anual'
//
const ACTIVIDADES_ROL_1: Omit<Actividad, 'id' | 'responsable' | 'porcentajeAvance' | 'estado'>[] = [
  {
    nombre: 'Establecer canales de comunicación directa con el Director Nacional de la ESAP',
    descripcion: 'Mantener comunicación permanente con la dirección sobre temas estratégicos de control interno',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '50% avance',
    seguimiento: 'Publicar todos los informes de gestión en la página web institucional y allegar al correo del Director',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Verificar a través del Plan anual de auditorías, el cumplimiento de metas, indicadores, procesos estratégicos de la entidad y riegos asociados a estos',
    descripcion: 'Revisar cumplimiento de objetivos institucionales y riesgos asociados',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento cuatrimestral.',
    evaluacion: '50% avance',
    seguimiento: 'Socializar resultados en el Comité Institucional de Gestión y Desempeño',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Establecer en el Comité de Gestión y Desempeño la periodicidad y alcance de rendición de informes estratégicos',
    descripcion: 'Definir en el comité de gestión y desempeño la periodicidad de rendición de informes',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento anual.',
    evaluacion: '10% avance',
    seguimiento: 'Socializar Plan Anual de Auditoría en el Comité Institucional de Gestión y Desempeño',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Presentar ante el Comité Institucional de Coordinación de Control Interno los resultados de la evaluación de la operación de la primera y segunda línea de defensa',
    descripcion: 'Evaluar operación de primera y segunda línea de defensa ante el CICC. Analizar las variaciones del ambiente organizacional y del entorno, identificando procesos críticos, controles y servicios que tengan un impacto significativo en el cumplimiento de los objetivos institucionales',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '60% avance',
    seguimiento: 'Hacer informe de los resultados de la evaluación independiente del Estado del Sistema de Control Interno, a través de sus cinco (5) componentes y publicar en la página web',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Informar al jefe de la entidad sobre las alertas de riesgo fiscal identificadas y en general los resultados de los ejercicios de auditoría y se planteen recomendaciones estratégicas para el fortalecimiento y la prevención',
    descripcion: 'Comunicar al jefe de la entidad sobre alertas identificadas en auditorías',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace informe cuatrimestral.',
    evaluacion: '60% avance',
    seguimiento: 'Hacer informe, publicar en la página web, diligenciar el seguimiento como tercera línea en ISOLUCION',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Participación frente a los procesos de empalme cuando se dan cambios de administración',
    descripcion: 'Acompañar procesos de transición cuando hay cambios de administración',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: '',
    evaluacion: '0% avance',
    seguimiento: 'Se hace seguimiento el último año',
    requiereVerificacionDirector: false
  }
];

const ACTIVIDADES_ROL_2: Omit<Actividad, 'id' | 'responsable' | 'porcentajeAvance' | 'estado'>[] = [
  {
    nombre: 'Programar en los comités institucionales más estratégicos (gestión y desempeño institucional, de coordinación de control interno, de gerencia u otro), sesiones que sensibilicen sobre la articulación del sistema de control interno y el control externo',
    descripcion: 'Programar sesiones en comités estratégicos sobre la articulación del sistema de control interno y el control externo',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '60% avance',
    seguimiento: 'Socializar articulación del sistema de control interno y el control externo (Guía de auditoría)',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Acompañar a los procesos en la formulación de planes de mejoramiento',
    descripcion: 'Asesorar a los procesos en la formulación de planes de mejoramiento',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento trimestral.',
    evaluacion: '60% avance',
    seguimiento: 'Asesorar y suministrar herramientas como el diagrama causa efecto',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Adoptar formalmente un procedimiento para el seguimiento al Plan de Mejoramiento, con esquema de semaforización que genere informe de alertas a los responsables internos',
    descripcion: 'Formalizar procedimiento con semaforización y alertas a responsables. Hacer mesas de trabajo con los responsables de las acciones que se encuentren en alguna de las alertas',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento anual.',
    evaluacion: '60% avance',
    seguimiento: 'Documentar procedimiento y formato para hacer seguimiento al cumplimiento y efectividad de las acciones de mejora',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Elaborar y presentar, en el marco del Comité Institucional de Coordinación de Control Interno un informe en relación con el avance del plan de mejoramiento',
    descripcion: 'Informar sobre el estado de avance del plan de mejoramiento institucional',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento trimestral.',
    evaluacion: '60% avance',
    seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Hacer seguimiento a decisiones en firme de órganos de control e investigación sobre procesos penales, fiscales y disciplinarios derivados de hallazgos o denuncias relacionadas con la entidad',
    descripcion: 'Monitorear procesos penales, fiscales y disciplinarios relacionados con la entidad',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '60% avance',
    seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Desarrollar diagnósticos para la mejora en la gestión del riesgo en todos sus ámbitos',
    descripcion: 'Realizar diagnósticos en todos los ámbitos de gestión del riesgo',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '60% avance',
    seguimiento: 'Establecer a través de la auditoría interna la efectividad de los controles para evitar la materialización de riesgos y socializar en el Comité Institucional de Coordinación de Control Interno',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Asesorar a la alta dirección para la articulación del esquema de líneas de defensa',
    descripcion: 'Acompañar a la alta dirección en la implementación de las tres líneas de defensa',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '60% avance',
    seguimiento: 'Realizar capacitaciones del esquema de tres líneas de defensa del Sistema de Control Interno',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Establecer una estrategia de acompañamiento de la batería de indicadores y diseño de tableros de control',
    descripcion: 'Establecer estrategia para el diseño y seguimiento de indicadores',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '60% avance',
    seguimiento: 'Realizar capacitaciones',
    requiereVerificacionDirector: false
  }
];

const ACTIVIDADES_ROL_3: Omit<Actividad, 'id' | 'responsable' | 'porcentajeAvance' | 'estado'>[] = [
  {
    nombre: 'Revisar la adecuación y/o actualización de la política de administración del riesgo y si se evalúa periódicamente su implementación',
    descripcion: 'Evaluar actualización y cumplimiento de la política de gestión del riesgo',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '48% avance',
    seguimiento: 'Revisar que está formalizada a través de acto administrativo o actuación administrativa y que contenga (objetivo, alcance, niveles de aceptación del riesgo, niveles para calificar el impacto, tratamiento del riesgo)  de conformidad con la Guía para la Administración del Riesgo y el diseño de controles en entidades públicas',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Promover escenarios para que la dirección comprenda el valor de la gestión de riesgos como paso previo para promover el proceso en toda la organización',
    descripcion: 'Generar escenarios para que la dirección comprenda la importancia de la gestión de riesgos. Proporcionar la información de riesgos para que la alta dirección la utilice en la toma de decisiones',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '48% avance',
    seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Evaluar prácticas actuales de gestión del riesgo para migrar a esquemas más efectivos',
    descripcion: 'Migrar a esquemas más efectivos y articular ejercicios de seguimiento y monitoreo en el marco del Esquema de las líneas de defensa',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento cuatrimestral.',
    evaluacion: '48% avance',
    seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
    requiereVerificacionDirector: false
  }
];

const ACTIVIDADES_ROL_4: Omit<Actividad, 'id' | 'responsable' | 'porcentajeAvance' | 'estado'>[] = [
  {
    nombre: 'Efectuar auditorías internas con enfoque preventivo y las especiales acorde al programa de auditoria',
    descripcion: 'Realizar auditorías internas y especiales conforme al programa anual',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento mensual.',
    evaluacion: '60% avance',
    seguimiento: 'Realizar seguimiento al cumplimiento de ejecución de las auditorías establecidas en el Programa de Auditoría',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Seguimiento a planes de mejoramiento internos y externos',
    descripcion: 'Monitorear cumplimiento de planes de mejoramiento derivados de auditorías',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento trimestral.',
    evaluacion: '60% avance',
    seguimiento: 'Asesorar y suministrar herramientas como el diagrama causa efecto',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Establecer una estrategia de acompañamiento de la batería de indicadores y diseño de tableros de control',
    descripcion: 'Fortalecer la medición del desempeño institucional a través del seguimiento de indicadores',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento semestral.',
    evaluacion: '60% avance',
    seguimiento: 'Realizar capacitaciones y acompañamiento en el diseño de tableros de control',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Adelantar de una manera armónica procesos de auditoría que lleve a cabo el organismo de control',
    descripcion: 'Coordinación efectiva con entes de control externo durante sus visitas',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: '',
    evaluacion: '60% avance',
    seguimiento: 'Dar asesoría y acompañamiento puntuales a los procesos y sus líderes',
    requiereVerificacionDirector: false
  },
  {
    nombre: 'Presentar informes y seguimientos de ley',
    descripcion: 'Cumplimiento de todos los informes obligatorios del cronograma anual',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento mensual.',
    evaluacion: '60% avance',
    seguimiento: 'Realizar seguimiento al cumplimiento de ejecución de los informes establecidos en el cronograma de informes',
    requiereVerificacionDirector: false
  }
];

const ACTIVIDADES_ROL_5: Omit<Actividad, 'id' | 'responsable' | 'porcentajeAvance' | 'estado'>[] = [
  {
    nombre: 'Brindar asesoría y generar alertas oportunas a los líderes de los procesos o responsables del suministro de información, para evitar la entrega no acorde o inconsistente con las solicitudes del organismo de control. Alertar a la primera línea de defensa, y en general, a los responsables del aporte de información requerida por órganos de control sobre estos efectos (Conductas generadoras de sanciones)',
    descripcion: 'Alertar a la primera línea de defensa y a los responsables del aporte de información requerida por órganos de control',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Se hace seguimiento mensual.',
    evaluacion: '59% avance',
    seguimiento: 'Publicar todos los informes de gestión en la página web institucional y allegar al correo del proceso respectivo',
    requiereVerificacionDirector: false
  },
  // ═══════════════════ INFORMES DE LEY OBLIGATORIOS (Desglose de la actividad anterior) ═══════════════════
  {
    nombre: 'Informe de Pormenorizado del Estado del Control Interno',
    descripcion: 'Presentar ante el CICC y Director Nacional informe detallado del estado del sistema de control interno (Decreto 648/2017, Art. 12)',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-02-28',
    control: 'Anual - Febrero',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Publicar en página web y radicar ante organismos de control',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Plan Anual de Auditoría Interna',
    descripcion: 'Elaborar y aprobar el plan anual de auditoría basado en riesgos institucionales (Decreto 648/2017)',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-03-31',
    control: 'Anual - Marzo',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Aprobación en CICC y socialización institucional',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Auditorías Realizadas',
    descripcion: 'Consolidar y reportar todas las auditorías internas ejecutadas durante la vigencia',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Anual - Diciembre',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Incluir hallazgos, recomendaciones y planes de mejoramiento',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Seguimiento a Planes de Mejoramiento',
    descripcion: 'Realizar seguimiento trimestral al cumplimiento de planes de mejoramiento internos y externos',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Trimestral',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Presentar en CICC con semaforización de avances',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Evaluación del Sistema de Control Interno Contable',
    descripcion: 'Evaluar el diseño, desarrollo y efectividad del sistema de control interno contable (Resolución 357/2008 CGN)',
    fechaInicio: '2026-10-01',
    fechaFin: '2026-11-30',
    control: 'Anual - Noviembre',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Presentar ante Contaduría General de la Nación',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Austeridad del Gasto Público',
    descripcion: 'Verificar cumplimiento de medidas de austeridad establecidas en la normatividad vigente (Decreto 984/2012)',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-02-28',
    control: 'Anual - Febrero',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Publicar en página web institucional',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Evaluación de Gestión y Resultados',
    descripcion: 'Evaluar la gestión institucional y el cumplimiento de metas del plan estratégico',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-02-28',
    control: 'Anual - Febrero',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Presentar ante Director Nacional y publicar en web',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Evaluación de Política de Administración del Riesgo',
    descripcion: 'Evaluar el diseño, desarrollo y efectividad de la política de administración del riesgo institucional',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-06-30',
    control: 'Semestral',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Presentar en CICC con recomendaciones de mejora',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Evaluación del Código de Integridad',
    descripcion: 'Evaluar la implementación y seguimiento del Código de Integridad institucional (Decreto 1081/2015)',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Anual - Diciembre',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Incluir nivel de apropiación y casos de incumplimiento',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Seguimiento al Plan Anticorrupción y de Atención al Ciudadano',
    descripcion: 'Verificar el cumplimiento de metas del Plan Anticorrupción y de Atención al Ciudadano (Ley 1474/2011)',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Cuatrimestral',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Presentar avances y alertas en CICC',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Seguimiento a Acciones Correctivas de Auditorías Externas',
    descripcion: 'Hacer seguimiento a hallazgos de Contraloría, Procuraduría y otros entes de control',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Trimestral',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Alertar sobre vencimientos y nivel de cumplimiento',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Rendición de la Cuenta Fiscal',
    descripcion: 'Certificar la consistencia y veracidad de la información reportada en el Consolidador de Hacienda e Información Pública (CHIP)',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-02-15',
    control: 'Anual - Febrero',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Remitir certificación a la Contraloría General',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Gestión Anual de la OCI',
    descripcion: 'Consolidar y presentar la gestión anual de la Oficina de Control Interno con estadísticas y resultados',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-01-31',
    control: 'Anual - Enero',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Publicar en página web y presentar ante Director Nacional',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Seguimiento a Denuncias y Quejas',
    descripcion: 'Consolidar el seguimiento realizado a denuncias y quejas recibidas por la OCI',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Semestral',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Presentar estadísticas y acciones adelantadas en CICC',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Evaluación de Trámites y Servicios',
    descripcion: 'Evaluar la eficiencia y efectividad de los trámites y servicios institucionales al ciudadano',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-06-30',
    control: 'Anual - Junio',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Publicar en página web con recomendaciones',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Evaluación del Sistema de Gestión Documental',
    descripcion: 'Evaluar el cumplimiento de la política de gestión documental y archivo (Ley 594/2000)',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-11-30',
    control: 'Anual - Noviembre',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Verificar tablas de retención y archivo de gestión',
    requiereVerificacionDirector: true
  },
  {
    nombre: 'Informe de Seguimiento a Recomendaciones de Auditorías Anteriores',
    descripcion: 'Verificar el cumplimiento de recomendaciones formuladas en auditorías de vigencias anteriores',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
    control: 'Trimestral',
    evaluacion: 'Cumplimiento normativo',
    seguimiento: 'Presentar estado de implementación en CICC',
    requiereVerificacionDirector: true
  }
];

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN: CREAR PLAN INICIAL
// ════════════════════════════════════════════════════════════════════════════

function crearPlanInicial(vigencia: number, jefeOCI: Auditor, rolesConfig?: any): PlanAnual {
  let contadorActividades = 1;

  const crearActividades = (actividadesBase: typeof ACTIVIDADES_ROL_1, numeroRol: number, configuracionRol?: any): Actividad[] => {
    // ✅ Obtener responsables asignados al rol desde el wizard
    const responsablesDelRol = configuracionRol?.responsables || [];
    let indiceResponsable = 0;

    return actividadesBase.map(act => {
      // ✅ NUEVO: Buscar configuración desde el wizard
      let requiereAutorizacionJefeOCI = false;
      let tipoEvidenciaConfig: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO' | undefined;
      
      if (configuracionRol) {
        const actividadConfig = configuracionRol.actividadesSeleccionadas?.find((a: any) => a.nombre === act.nombre);
        requiereAutorizacionJefeOCI = actividadConfig?.requiereAutorizacionJefeOCI || false;
        tipoEvidenciaConfig = actividadConfig?.tipoEvidencia;
      }

      // ✅ Responsables específicos de la actividad (del wizard) o del rol como fallback
      const actividadConfig2 = configuracionRol?.actividadesSeleccionadas?.find((a: any) => a.nombre === act.nombre);
      const responsablesActividad: any[] = actividadConfig2?.responsables?.length
        ? actividadConfig2.responsables
        : [];

      // ✅ Asignar responsable rotativamente si hay responsables configurados
      let responsableAsignado = null;
      if (responsablesActividad.length > 0) {
        responsableAsignado = responsablesActividad[0];
      } else if (responsablesDelRol.length > 0) {
        responsableAsignado = responsablesDelRol[indiceResponsable % responsablesDelRol.length];
        indiceResponsable++;
      }

      // Determinar configuración de evidencias según tipo configurado en wizard
      let configuracionEvidencias: ConfiguracionEvidencias;
      
      if (tipoEvidenciaConfig) {
        // ✅ Usuario configuró el tipo de evidencia en el wizard
        switch (tipoEvidenciaConfig) {
          case 'SOLO_CHECK':
            configuracionEvidencias = {
              adjuntosRequeridos: 'NO_REQUERIDO',
              observacionRequerida: 'NO_REQUERIDO',
              minimoAdjuntos: 0,
              longitudMinimaObservacion: 0
            };
            break;
          case 'OBSERVACIONES':
            configuracionEvidencias = {
              adjuntosRequeridos: 'OPCIONAL',
              observacionRequerida: 'OBLIGATORIO',
              minimoAdjuntos: 0,
              longitudMinimaObservacion: 30
            };
            break;
          case 'ADJUNTOS':
            configuracionEvidencias = {
              adjuntosRequeridos: 'OBLIGATORIO',
              observacionRequerida: 'OPCIONAL',
              minimoAdjuntos: 1,
              tiposAdjuntosPermitidos: ['pdf', 'docx', 'xlsx'],
              longitudMinimaObservacion: 0
            };
            break;
          case 'COMPLETO':
            configuracionEvidencias = CONFIGURACIONES_PREDEFINIDAS.INFORME_LEY;
            break;
          default:
            configuracionEvidencias = CONFIGURACIONES_PREDEFINIDAS.FLEXIBLE;
        }
      } else {
        // Fallback al comportamiento anterior
        if (act.requiereVerificacionDirector) {
          configuracionEvidencias = CONFIGURACIONES_PREDEFINIDAS.INFORME_LEY;
        } else if (act.nombre.toLowerCase().includes('seguimiento')) {
          configuracionEvidencias = CONFIGURACIONES_PREDEFINIDAS.SEGUIMIENTO;
        } else {
          configuracionEvidencias = CONFIGURACIONES_PREDEFINIDAS.FLEXIBLE;
        }
      }
      
      return {
        ...act,
        id: contadorActividades++,
        responsable: responsableAsignado, // ✅ NUEVO: Asignar responsable desde wizard
        responsables: responsablesActividad.length > 0 ? responsablesActividad : (responsablesDelRol.length > 0 ? [responsableAsignado].filter(Boolean) : []),
        porcentajeAvance: 0,
        estado: 'PENDIENTE' as EstadoActividad,
        requiereVerificacionDirector: act.requiereVerificacionDirector ?? false,
        requiereAutorizacionJefeOCI, // ✅ NUEVO: Transferir configuración del wizard
        autorizadaPorJefeOCI: false,
        configuracionEvidencias,
        adjuntos: [],
        bitacoraObservaciones: []
      };
    });
  };

  const roles: Rol[] = ROLES_DECRETO_648.map((rol, index) => {
    let actividades: Actividad[] = [];
    const configuracionRol = rolesConfig?.find((r: any) => r.numero === rol.numero);
    
    switch(rol.numero) {
      case 1: actividades = crearActividades(ACTIVIDADES_ROL_1, rol.numero, configuracionRol); break;
      case 2: actividades = crearActividades(ACTIVIDADES_ROL_2, rol.numero, configuracionRol); break;
      case 3: actividades = crearActividades(ACTIVIDADES_ROL_3, rol.numero, configuracionRol); break;
      case 4: actividades = crearActividades(ACTIVIDADES_ROL_4, rol.numero, configuracionRol); break;
      case 5: actividades = crearActividades(ACTIVIDADES_ROL_5, rol.numero, configuracionRol); break;
    }

    // ✅ NUEVO: Agregar actividades personalizadas (custom) desde el wizard
    if (configuracionRol?.actividadesCustom) {
      const responsablesDelRol = configuracionRol?.responsables || [];
      let indiceResponsableCustom = actividades.length; // Continuar rotación desde donde quedó

      const actividadesCustom: Actividad[] = configuracionRol.actividadesCustom.map((act: any) => {
        // Determinar configuración de evidencias según tipo configurado
        let configuracionEvidencias: ConfiguracionEvidencias;
        
        switch (act.tipoEvidencia) {
          case 'SOLO_CHECK':
            configuracionEvidencias = {
              adjuntosRequeridos: 'NO_REQUERIDO',
              observacionRequerida: 'NO_REQUERIDO',
              minimoAdjuntos: 0,
              longitudMinimaObservacion: 0
            };
            break;
          case 'OBSERVACIONES':
            configuracionEvidencias = {
              adjuntosRequeridos: 'OPCIONAL',
              observacionRequerida: 'OBLIGATORIO',
              minimoAdjuntos: 0,
              longitudMinimaObservacion: 30
            };
            break;
          case 'ADJUNTOS':
            configuracionEvidencias = {
              adjuntosRequeridos: 'OBLIGATORIO',
              observacionRequerida: 'OPCIONAL',
              minimoAdjuntos: 1,
              tiposAdjuntosPermitidos: ['pdf', 'docx', 'xlsx'],
              longitudMinimaObservacion: 0
            };
            break;
          case 'COMPLETO':
            configuracionEvidencias = CONFIGURACIONES_PREDEFINIDAS.INFORME_LEY;
            break;
          default:
            configuracionEvidencias = CONFIGURACIONES_PREDEFINIDAS.FLEXIBLE;
        }

        // ✅ Asignar responsable rotativamente (o usar los específicos de la actividad)
        let responsableAsignado = null;
        const responsablesActividadCustom: any[] = act.responsables?.length ? act.responsables : [];
        if (responsablesActividadCustom.length > 0) {
          responsableAsignado = responsablesActividadCustom[0];
        } else if (responsablesDelRol.length > 0) {
          responsableAsignado = responsablesDelRol[indiceResponsableCustom % responsablesDelRol.length];
          indiceResponsableCustom++;
        }

        return {
          ...act,
          id: contadorActividades++,
          responsable: responsableAsignado, // ✅ NUEVO: Asignar responsable desde wizard
          responsables: responsablesActividadCustom.length > 0 ? responsablesActividadCustom : (responsableAsignado ? [responsableAsignado] : []),
          porcentajeAvance: 0,
          estado: 'PENDIENTE' as EstadoActividad,
          requiereVerificacionDirector: false,
          requiereAutorizacionJefeOCI: act.requiereAutorizacionJefeOCI || false,
          autorizadaPorJefeOCI: false,
          configuracionEvidencias,
          adjuntos: [],
          bitacoraObservaciones: []
        };
      });
      actividades = [...actividades, ...actividadesCustom];
    }

    // Log de depuración para verificar cantidad de actividades
    console.log(`ROL ${rol.numero} (${rol.nombre}): ${actividades.length} actividades`);
    if (rol.numero === 5) {
      console.log('Actividades del Rol 5:', actividades.map(a => a.nombre));
    }

    return { ...rol, actividades };
  });

  return {
    id: `PAI-${vigencia}-V1`,
    vigencia,
    version: 1,
    estado: 'BORRADOR',
    jefeOCI,
    fechaCreacion: new Date().toISOString(),
    fechaAprobacion: null,
    actaCICC: null,
    roles
  };
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN: CREAR PLAN CON DATOS MOCK (COMENTADA - AHORA SE USA BACKEND)
// ════════════════════════════════════════════════════════════════════════════

// MOCK DISPONIBLE
export function crearPlanConDatosMock(vigencia: number, jefeOCI: Auditor): PlanAnual {
  const planBase = crearPlanInicial(vigencia, jefeOCI);
  
  // ═══════════════════════════════════════════════════════════════════════
  // ASIGNAR RESPONSABLES Y PROGRESO A ACTIVIDADES
  // ═══════════════════════════════════════════════════════════════════════
  
  const rolesConProgreso = planBase.roles.map(rol => {
    const actividadesConProgreso = rol.actividades.map((actividad, index) => {
      // Asignar responsable rotativo
      const responsable = AUDITORES[index % AUDITORES.length];
      
      // Determinar estado y progreso según posición
      let estado: EstadoActividad = 'PENDIENTE';
      let porcentajeAvance = 0;
      let configuracion: ConfiguracionEvidencias;
      let adjuntos: ArchivoAdjunto[] = [];
      let observaciones: ObservacionHistorica[] = [];
      
      // Distribución de estados: 40% completadas, 30% en ejecución, 30% pendientes
      if (index % 10 < 4) {
        // COMPLETADAS (40%)
        estado = 'COMPLETADA';
        porcentajeAvance = 100;
        
        // Configuración según tipo de actividad
        if (actividad.requiereVerificacionDirector) {
          configuracion = CONFIGURACIONES_PREDEFINIDAS.INFORME_LEY;
        } else if (actividad.nombre.toLowerCase().includes('seguimiento')) {
          configuracion = CONFIGURACIONES_PREDEFINIDAS.SEGUIMIENTO;
        } else {
          configuracion = CONFIGURACIONES_PREDEFINIDAS.FLEXIBLE;
        }
        
        // Agregar evidencias completas
        if (configuracion.adjuntosRequeridos !== 'NO_REQUERIDO') {
          adjuntos = [
            {
              id: `adj-${actividad.id}-1`,
              nombre: `Evidencia_${actividad.id}_v1.pdf`,
              tipo: 'application/pdf',
              tamaño: 1024 * 250, // 250 KB
              fechaCarga: '2026-01-15T10:30:00.000Z',
              cargadoPor: responsable.nombre,
              url: '#'
            },
            {
              id: `adj-${actividad.id}-2`,
              nombre: `Soporte_${actividad.id}.xlsx`,
              tipo: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              tamaño: 1024 * 89, // 89 KB
              fechaCarga: '2026-01-20T14:45:00.000Z',
              cargadoPor: responsable.nombre,
              url: '#'
            }
          ];
        }
        
        if (configuracion.observacionRequerida !== 'NO_REQUERIDO') {
          observaciones = [
            {
              id: `obs-${actividad.id}-1`,
              texto: `Se inició la actividad con reunión del equipo auditor. Se definieron alcances y metodología.`,
              fechaCreacion: '2026-01-10',
              horaCreacion: '09:15:00',
              responsable: {
                nombre: responsable.nombre,
                cargo: responsable.cargo
              },
              editada: false
            },
            {
              id: `obs-${actividad.id}-2`,
              texto: `Revisión documental completada. Se identificaron ${Math.floor(Math.random() * 5) + 1} oportunidades de mejora que serán incluidas en el informe final.`,
              fechaCreacion: '2026-01-25',
              horaCreacion: '15:30:00',
              responsable: {
                nombre: responsable.nombre,
                cargo: responsable.cargo
              },
              editada: false
            },
            {
              id: `obs-${actividad.id}-3`,
              texto: `Actividad finalizada exitosamente. Informe presentado al Director OCI para revisión y aprobación. Todas las evidencias documentales fueron recopiladas y archivadas.`,
              fechaCreacion: '2026-02-01',
              horaCreacion: '16:45:00',
              responsable: {
                nombre: jefeOCI.nombre,
                cargo: jefeOCI.cargo
              },
              editada: true,
              fechaEdicion: '2026-02-02',
              horaEdicion: '10:00:00'
            }
          ];
        }
        
        // ✅ AGREGAR PUNTOS DE CONTROL CON ALGUNOS COMPLETADOS
        if (rol.numero === 1 && index < 2) {
          // Actividades del Rol 1 con puntos de control trimestrales (algunas completadas)
          actividad.frecuenciaPuntosControl = 'trimestral';
          actividad.puntosControl = [
            {
              id: `pc-${actividad.id}-1`,
              orden: 1,
              nombre: 'Trimestral #1',
              descripcion: `Primer punto de control trimestral para ${actividad.nombre}`,
              fechaProgramada: '2026-03-31',
              fechaReal: '2026-03-28',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Checkpoint completado exitosamente. Todas las evidencias documentadas.',
              evidencias: ['evidencia1.pdf', 'evidencia2.xlsx']
            },
            {
              id: `pc-${actividad.id}-2`,
              orden: 2,
              nombre: 'Trimestral #2',
              descripcion: `Segundo punto de control trimestral para ${actividad.nombre}`,
              fechaProgramada: '2026-06-30',
              fechaReal: '2026-06-29',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Segundo checkpoint alcanzado. Avance conforme a lo planificado.',
              evidencias: ['reporte_q2.pdf']
            },
            {
              id: `pc-${actividad.id}-3`,
              orden: 3,
              nombre: 'Trimestral #3',
              descripcion: `Tercer punto de control trimestral para ${actividad.nombre}`,
              fechaProgramada: '2026-09-30',
              fechaReal: '2026-09-30',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Tercer trimestre completado según programación.',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-4`,
              orden: 4,
              nombre: 'Trimestral #4',
              descripcion: `Cuarto punto de control trimestral para ${actividad.nombre}`,
              fechaProgramada: '2026-12-31',
              fechaReal: '2026-12-30',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Actividad completada al 100%. Todos los checkpoints cumplidos.',
              evidencias: ['informe_final.pdf']
            }
          ];
        }
        
      } else if (index % 10 < 7) {
        // EN EJECUCIÓN (30%)
        estado = 'EN_EJECUCION';
        porcentajeAvance = 35 + (index % 4) * 15; // Entre 35% y 80%
        
        configuracion = actividad.requiereVerificacionDirector 
          ? CONFIGURACIONES_PREDEFINIDAS.INFORME_LEY
          : CONFIGURACIONES_PREDEFINIDAS.SEGUIMIENTO;
        
        // Agregar algunas evidencias parciales
        if (configuracion.adjuntosRequeridos === 'OBLIGATORIO') {
          adjuntos = [
            {
              id: `adj-${actividad.id}-1`,
              nombre: `Borrador_${actividad.id}.docx`,
              tipo: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              tamaño: 1024 * 145,
              fechaCarga: new Date().toISOString(),
              cargadoPor: responsable.nombre,
              url: '#'
            }
          ];
        }
        
        observaciones = [
          {
            id: `obs-${actividad.id}-1`,
            texto: `Actividad iniciada. Se está trabajando en la recopilación de información y evidencias.`,
            fechaCreacion: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            horaCreacion: '11:00:00',
            responsable: {
              nombre: responsable.nombre,
              cargo: responsable.cargo
            },
            editada: false
          },
          {
            id: `obs-${actividad.id}-2`,
            texto: `Avance del ${porcentajeAvance}%. Se han completado las reuniones preliminares y se está en proceso de análisis.`,
            fechaCreacion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            horaCreacion: '14:20:00',
            responsable: {
              nombre: responsable.nombre,
              cargo: responsable.cargo
            },
            editada: false
          }
        ];
        
        // ✅ AGREGAR PUNTOS DE CONTROL CON ALGUNOS COMPLETADOS Y OTROS PENDIENTES
        if (rol.numero === 2 && index < 2) {
          // Actividades del Rol 2 con puntos mensuales (50% completado)
          actividad.frecuenciaPuntosControl = 'mensual';
          actividad.puntosControl = [
            {
              id: `pc-${actividad.id}-1`,
              orden: 1,
              nombre: 'Mensual #1',
              descripcion: `Punto de control mensual enero`,
              fechaProgramada: '2026-01-31',
              fechaReal: '2026-01-31',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Mes 1 completado',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-2`,
              orden: 2,
              nombre: 'Mensual #2',
              descripcion: `Punto de control mensual febrero`,
              fechaProgramada: '2026-02-28',
              fechaReal: '2026-02-28',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Mes 2 completado',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-3`,
              orden: 3,
              nombre: 'Mensual #3',
              descripcion: `Punto de control mensual marzo`,
              fechaProgramada: '2026-03-31',
              fechaReal: '2026-03-31',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Mes 3 completado',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-4`,
              orden: 4,
              nombre: 'Mensual #4',
              descripcion: `Punto de control mensual abril`,
              fechaProgramada: '2026-04-30',
              fechaReal: '2026-04-30',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Mes 4 completado',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-5`,
              orden: 5,
              nombre: 'Mensual #5',
              descripcion: `Punto de control mensual mayo`,
              fechaProgramada: '2026-05-31',
              fechaReal: '2026-05-31',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Mes 5 completado',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-6`,
              orden: 6,
              nombre: 'Mensual #6',
              descripcion: `Punto de control mensual junio`,
              fechaProgramada: '2026-06-30',
              fechaReal: '2026-06-30',
              responsable: responsable.nombre,
              estado: 'completado',
              observaciones: 'Mes 6 completado',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-7`,
              orden: 7,
              nombre: 'Mensual #7',
              descripcion: `Punto de control mensual julio`,
              fechaProgramada: '2026-07-31',
              fechaReal: null,
              responsable: responsable.nombre,
              estado: 'pendiente',
              observaciones: '',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-8`,
              orden: 8,
              nombre: 'Mensual #8',
              descripcion: `Punto de control mensual agosto`,
              fechaProgramada: '2026-08-31',
              fechaReal: null,
              responsable: responsable.nombre,
              estado: 'pendiente',
              observaciones: '',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-9`,
              orden: 9,
              nombre: 'Mensual #9',
              descripcion: `Punto de control mensual septiembre`,
              fechaProgramada: '2026-09-30',
              fechaReal: null,
              responsable: responsable.nombre,
              estado: 'pendiente',
              observaciones: '',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-10`,
              orden: 10,
              nombre: 'Mensual #10',
              descripcion: `Punto de control mensual octubre`,
              fechaProgramada: '2026-10-31',
              fechaReal: null,
              responsable: responsable.nombre,
              estado: 'pendiente',
              observaciones: '',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-11`,
              orden: 11,
              nombre: 'Mensual #11',
              descripcion: `Punto de control mensual noviembre`,
              fechaProgramada: '2026-11-30',
              fechaReal: null,
              responsable: responsable.nombre,
              estado: 'pendiente',
              observaciones: '',
              evidencias: []
            },
            {
              id: `pc-${actividad.id}-12`,
              orden: 12,
              nombre: 'Mensual #12',
              descripcion: `Punto de control mensual diciembre`,
              fechaProgramada: '2026-12-31',
              fechaReal: null,
              responsable: responsable.nombre,
              estado: 'pendiente',
              observaciones: '',
              evidencias: []
            }
          ];
        }
        
      } else {
        // PENDIENTES (30%)
        estado = 'PENDIENTE';
        porcentajeAvance = 0;
        configuracion = CONFIGURACIONES_PREDEFINIDAS.FLEXIBLE;
        adjuntos = [];
        observaciones = [];
      }
      
      return {
        ...actividad,
        responsable,
        estado,
        porcentajeAvance,
        configuracionEvidencias: configuracion,
        adjuntos,
        bitacoraObservaciones: observaciones,
        // Actividades del Rol 5 con requiereVerificacionDirector=true tendrán algunos verificados
        verificadaPorDirector: actividad.requiereVerificacionDirector && estado === 'COMPLETADA' && index % 2 === 0,
        fechaVerificacion: actividad.requiereVerificacionDirector && estado === 'COMPLETADA' && index % 2 === 0 
          ? '2026-02-03T09:00:00.000Z' 
          : undefined,
        observacionesDirector: actividad.requiereVerificacionDirector && estado === 'COMPLETADA' && index % 2 === 0
          ? 'Revisado y aprobado. Cumple con los requisitos del Decreto 648/2017.'
          : undefined
      };
    });
    
    return {
      ...rol,
      actividades: actividadesConProgreso
    };
  });
  
  return {
    ...planBase,
    estado: 'VIGENTE', // Cambiamos a VIGENTE para poder ver todo en acción
    fechaAprobacion: '2026-01-05T10:00:00.000Z',
    actaCICC: 'ACTA-CICC-001-2026',
    roles: rolesConProgreso
  };
}
// FIN MOCK crearPlanConDatosMock

// ════════════════════════════════════════════════════════════════════════════
// FECHAS DE CORTES / TAREAS AL CARGAR EL PLAN (alineadas a la vigencia)
// ════════════════════════════════════════════════════════════════════════════

/** Mes/día calendario conservados; el año se fuerza al de la vigencia del plan (evita desfase UTC / año erróneo en JSON). */
function normalizarFechaCampoAVigencia(fecha: unknown, vigencia: number): string {
  if (fecha == null || fecha === '') return '';
  let month = 1;
  let day = 1;
  if (typeof fecha === 'string') {
    const trimmed = fecha.trim();
    const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
      month = parseInt(iso[2], 10);
      day = parseInt(iso[3], 10);
    } else {
      const dt = new Date(trimmed.includes('T') ? trimmed : `${trimmed.slice(0, 10)}T12:00:00`);
      if (Number.isNaN(dt.getTime())) return '';
      month = dt.getMonth() + 1;
      day = dt.getDate();
    }
  } else if (fecha instanceof Date) {
    if (Number.isNaN(fecha.getTime())) return '';
    month = fecha.getMonth() + 1;
    day = fecha.getDate();
  } else {
    return '';
  }
  const lastDay = new Date(vigencia, month, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return `${vigencia}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
}

function mapPuntosControlFechasVigencia(puntos: unknown, vigencia: number): any[] {
  if (!Array.isArray(puntos)) return [];
  return puntos.map((pc: any) => {
    const next = { ...pc };
    const fp = pc.fechaProgramada ?? pc.fecha_programada;
    if (fp != null && fp !== '') {
      next.fechaProgramada = normalizarFechaCampoAVigencia(fp, vigencia);
    }
    const fs = pc.fechaSeguimiento ?? pc.fecha_seguimiento;
    if (fs != null && fs !== '') {
      next.fechaSeguimiento = normalizarFechaCampoAVigencia(fs, vigencia);
    }
    const fr = pc.fechaReal ?? pc.fecha_real;
    if (fr != null && fr !== '') {
      next.fechaReal = normalizarFechaCampoAVigencia(fr, vigencia);
    }
    return next;
  });
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

export function PlanAnualAuditoriaDefinitivo({ onNavegarModulo }: { onNavegarModulo?: (seccion: string) => void }) {
  const [vista, setVista] = useState<'inicio' | 'wizard' | 'dashboard' | 'rol4-integrado'>('inicio');
  const [planAEditar, setPlanAEditar] = useState<PlanAnual | undefined>(undefined);
  const { puedeRealizar, esSuperUsuario } = useControlInternoPermissions();
  const puedeCrearPlan = puedeRealizar('plan-anual', 'create') || esSuperUsuario;
  const puedeVerPlan = puedeRealizar('plan-anual', 'view') || esSuperUsuario;
  const puedeEditarPlan = puedeRealizar('plan-anual', 'edit') || esSuperUsuario;
  const puedeAprobarPlan = puedeRealizar('plan-anual', 'approve');
  const puedeActivarPlan = puedeRealizar('plan-anual', 'activate');
  /** Misma regla que `puedeVerAprobacion` en el dashboard */
  const puedeIrAAprobacion =
    puedeAprobarPlan || puedeActivarPlan || puedeEditarPlan || esSuperUsuario;
  const [wizardSoloLectura, setWizardSoloLectura] = useState(false);
  const [dashboardSeccionForzada, setDashboardSeccionForzada] = useState<'gestion' | 'aprobar' | null>(null);
  const limpiarSeccionForzadaDashboard = useCallback(() => setDashboardSeccionForzada(null), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const seccion = params.get('seccion');
    const vigenciaParam = params.get('vigencia');
    if (vigenciaParam) {
      const v = parseInt(vigenciaParam, 10);
      if (!Number.isNaN(v) && v > 2000) {
        setAñoActual(v);
      }
    }
    if (seccion === 'aprobar') {
      setDashboardSeccionForzada('aprobar');
    }
  }, []);
  
  // ═══════════════════════════════════════════════════════════════════════
  // AÑO ACTIVO (puede cambiar al seleccionar otro plan)
  // ═══════════════════════════════════════════════════════════════════════
  const [añoActual, setAñoActual] = useState<number>(() => {
    try {
      const stored = localStorage.getItem('esap:plan_anual_activo');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.vigencia && typeof parsed.vigencia === 'number') {
          return parsed.vigencia;
        }
      }
    } catch {}
    return new Date().getFullYear();
  });
  
  // ═══════════════════════════════════════════════════════════════════════
  // CARGA DESDE BACKEND - Plan Anual y Auditores
  // ═══════════════════════════════════════════════════════════════════════
  const {
    plan: planDesdeBackend,
    auditores,
    estadisticas,
    loadingPlan: cargandoPlan,
    loadingAuditores: cargandoAuditores,
    refetch: recargarPlan,
    createActividad,
    updateActividad,
    deleteActividad,
    updateEstado,
  } = usePlanAnualCompleto(añoActual);



  // Estado local para el plan (sincronizado con backend)
  const [planActual, setPlanActual] = useState<PlanAnual | null>(null);

  // Función helper para obtener icono según número de rol
  function obtenerIconoRol(numeroRol: number): string {
    const iconos: Record<number, string> = {
      1: '🎯', // Liderazgo estratégico
      2: '🛡️', // Enfoque hacia la prevención
      3: '⚠️', // Evaluación de la gestión del riesgo
      4: '✓', // Evaluación del sistema de control interno
      5: '⚖️'  // Relación con organismos externos
    };
    return iconos[numeroRol] || '📋';
  }

  // Mapear estado del backend al frontend
  const mapearEstadoPlan = (estadoBackend: string): EstadoPlan => {
    const mapeo: Record<string, EstadoPlan> = {
      'borrador': 'BORRADOR',
      'en-revision': 'EN_REVISION',
      'aprobado': 'APROBADO',
      'en-ejecucion': 'VIGENTE',
      'completado': 'CERRADO',
    };
    return mapeo[estadoBackend?.toLowerCase()] || 'BORRADOR';
  };

  const transformarPlanBackendAFicha = useCallback((planDesdeBackend: any): PlanAnual => {
      // Transformar datos del backend al formato del frontend
      // ✅ IMPORTANTE: Ordenar roles por rol_numero para mantener el orden del Decreto 648/2017
      const añoPlanRaw = Number(planDesdeBackend.año);
      const vigenciaSafe = Number.isFinite(añoPlanRaw) ? añoPlanRaw : new Date().getFullYear();
      const rolesOrdenados = [...planDesdeBackend.roles].sort((a, b) => a.rol_numero - b.rol_numero);
      
      return {
        id: planDesdeBackend.id,
        vigencia: planDesdeBackend.año,
        version: 1,
        estado: mapearEstadoPlan(planDesdeBackend.estado),
        // Debe coincidir con responsable_id / responsable del backend (no usar auditores[0]: desalineaba identidad y el banner de «responsable del plan»).
        jefeOCI: (() => {
          const pb = planDesdeBackend as any;
          const rid = pb.responsable_id || pb.jefe_oci_id || '';
          const nombreResp =
            pb.responsable ||
            pb.responsable_nombre ||
            'Responsable del plan';
          const emailResp = (pb.responsable_email || '').trim();
          const cargoResp = pb.responsable_cargo || 'Jefe de Control Interno';
          if (auditores?.length) {
            const norm = (s: string) =>
              (s || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .trim()
                .toLowerCase();
            const coincidencia =
              (rid
                ? auditores.find((a) => String(a.id) === String(rid))
                : undefined) ||
              auditores.find((a) => norm(a.nombre) === norm(nombreResp));
            if (coincidencia) return coincidencia;
          }
          return {
            id: rid || '1',
            nombre: nombreResp,
            cargo: cargoResp,
            email: emailResp,
          };
        })(),
        fechaCreacion: planDesdeBackend.fecha_creacion,
        // ═══════════════════════════════════════════════════════════════════
        // CORRECCIÓN DE TIMEZONE: El backend NestJS/TypeORM serializa columnas
        // DATE de PostgreSQL con desfase -1 día (UTC-5 Colombia).
        // Ejemplo: DB tiene 2028-01-01 → backend devuelve "2027-12-31"
        // Solución: sumar 1 día a las fechas que vienen del backend.
        // ═══════════════════════════════════════════════════════════════════
        fechaInicio: (() => {
          const fi = planDesdeBackend.fecha_inicio;
          if (!fi) return `${planDesdeBackend.año}-01-01`;
          // Parsear a mediodía local para evitar timezone shift, luego sumar 1 día
          const d = new Date(String(fi).split('T')[0] + 'T12:00:00');
          d.setDate(d.getDate() + 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        fechaFin: (() => {
          const ff = planDesdeBackend.fecha_fin;
          if (!ff) return `${planDesdeBackend.año}-12-31`;
          const d = new Date(String(ff).split('T')[0] + 'T12:00:00');
          d.setDate(d.getDate() + 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })(),
        fechaAprobacion: null,
        actaCICC: null,
        equipoAprobacion: planDesdeBackend.equipo_aprobacion || [],
        ordenAprobacion: planDesdeBackend.orden_aprobacion || 'secuencial',
        roles: rolesOrdenados.map(rol => ({
          id: rol.id, // ID del rol desde el backend (requerido para crear actividades)
          numero: rol.rol_numero,
          nombre: rol.nombre,
          color: rol.color,
          icono: obtenerIconoRol(rol.rol_numero),
          descripcion: rol.descripcion,
          actividades: rol.actividades.map((act: any) => {
            // Cast a any para acceder campos extendidos que vienen del backend
            const actExtendido = act as any;

            // Formatear fechas (backend puede devolver Date o string)
            // NOTA: Usar getUTC* para evitar bug de timezone (UTC-5 restaba 1 día)
            const formatearFecha = (fecha: any): string => {
              if (!fecha) return '';
              if (typeof fecha === 'string') return fecha.split('T')[0];
              if (fecha instanceof Date) {
                return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
              }
              return '';
            };

            // Mapear estado del backend al frontend (en-progreso/en_progreso → EN_EJECUCION, retrasada → EN_EJECUCION)
            const estadoBackend = (act.estado || 'pendiente').toLowerCase().replace(/_/g, '-');
            const estadoFront: EstadoActividad =
              estadoBackend === 'completada' ? 'COMPLETADA' :
              estadoBackend === 'en-progreso' || estadoBackend === 'retrasada' ? 'EN_EJECUCION' : 'PENDIENTE';

            // Obtener configuración de evidencias del backend y transformar al formato del frontend
            const configBackend = actExtendido.configuracion_evidencias || actExtendido.configuracionEvidencias;

            // Transformar booleans del backend a strings del frontend
            let configEvidencias: ConfiguracionEvidencias;
            if (configBackend) {
              // Determinar si los adjuntos son obligatorios basándose en minimoAdjuntos
              const minimoAdjuntos = configBackend.minimoAdjuntos || 0;
              const minObservacion = configBackend.longitudMinimaObservacion || 0;

              let adjuntosRequeridos: 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';
              if (!configBackend.documentos) {
                adjuntosRequeridos = 'NO_REQUERIDO';
              } else if (minimoAdjuntos > 0) {
                adjuntosRequeridos = 'OBLIGATORIO';
              } else {
                adjuntosRequeridos = 'OPCIONAL';
              }

              let observacionRequerida: 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';
              if (!configBackend.observaciones) {
                observacionRequerida = 'NO_REQUERIDO';
              } else if (minObservacion > 0) {
                observacionRequerida = 'OBLIGATORIO';
              } else {
                observacionRequerida = 'OPCIONAL';
              }

              configEvidencias = {
                adjuntosRequeridos,
                observacionRequerida,
                minimoAdjuntos,
                longitudMinimaObservacion: minObservacion
              };
            } else {
              // Fallback si no hay configuración
              configEvidencias = {
                adjuntosRequeridos: 'OPCIONAL',
                observacionRequerida: 'OPCIONAL',
                minimoAdjuntos: 0,
                longitudMinimaObservacion: 0
              };
            }

            const responsableSingular: Auditor | null = (() => {
              if (!act.responsable || act.responsable === 'Por asignar') return null;
              const auditorEncontrado = auditores.find(a =>
                a.nombre.toLowerCase() === act.responsable.toLowerCase()
              );
              if (auditorEncontrado) return auditorEncontrado;
              return {
                id: `temp-${act.responsable}`,
                nombre: act.responsable,
                cargo: 'Auditor',
                email: ''
              } as Auditor;
            })();

            const responsablesRaw = normalizarArrayResponsablesBackend(actExtendido.responsables);
            let responsablesLista: Auditor[] = responsablesRaw.map((r: any) => ({
              id: r.id,
              nombre: r.nombre,
              cargo: r.cargo || 'Auditor',
              email: r.email || ''
            }));
            if (responsablesLista.length === 0 && responsableSingular) {
              responsablesLista = [{
                id: responsableSingular.id,
                nombre: responsableSingular.nombre,
                cargo: responsableSingular.cargo || 'Auditor',
                email: responsableSingular.email || ''
              }];
            }

            return {
              id: act.id, // UUID string desde el backend
              nombre: act.nombre,
              descripcion: act.descripcion || '',
              fechaInicio: formatearFecha(act.fecha_inicio) || formatearFecha(act.fechaInicio),
              fechaFin: formatearFecha(act.fecha_fin) || formatearFecha(act.fechaFin),
              responsable: responsableSingular,
              porcentajeAvance: act.porcentaje_avance ?? 0,
              estado: estadoFront,
              control: actExtendido.control || '',
              evaluacion: actExtendido.evaluacion || '',
              seguimiento: actExtendido.seguimiento || '',
              // Observaciones del modal de evidencias: backend las guarda en "observaciones"
              observacionesCumplimiento: actExtendido.observaciones ?? act.observaciones ?? '',
              requiereVerificacionDirector: actExtendido.requiere_verificacion_director || actExtendido.requiereVerificacionDirector || false,
              verificadaPorDirector: actExtendido.verificada_por_director || actExtendido.verificadaPorDirector || false,
              fechaVerificacion: actExtendido.fecha_verificacion || actExtendido.fechaVerificacion,
              observacionesDirector: actExtendido.observaciones_director || actExtendido.observacionesDirector,
              configuracionEvidencias: configEvidencias,
              // Mapear adjuntos del backend al formato del frontend
              adjuntos: (actExtendido.adjuntos || []).map((adj: any) => ({
                id: adj.id,
                nombre: adj.nombre,
                tipo: adj.tipo || '',
                tamaño: typeof adj.tamanio === 'string' ? parseInt(adj.tamanio, 10) : (adj.tamanio ?? adj.tamaño ?? 0),
                fechaCarga: adj.fechaCarga || adj.fecha_carga || adj.createdAt || '',
                cargadoPor: adj.cargadoPor || adj.cargado_por || 'Usuario',
                url: adj.url
              })),
              bitacoraObservaciones: actExtendido.bitacoraObservaciones || [],
              activo: actExtendido.activo ?? act.activo ?? true,
              responsables: responsablesLista,
              // Puntos de control persistidos
              puntosControl: mapPuntosControlFechasVigencia(actExtendido.puntos_control || actExtendido.puntosControl, vigenciaSafe),
              frecuenciaPuntosControl: actExtendido.frecuencia_puntos_control || null,
              entradasSeguimiento: actExtendido.entradas_seguimiento || actExtendido.entradasSeguimiento || [],
              // Tareas de seguimiento (sub-tareas)
              tareasSeguimiento: (actExtendido.tareas_seguimiento || actExtendido.tareasSeguimiento || []).map((t: any) => ({
                id: t.id,
                descripcion: t.descripcion,
                completada: t.completada || false,
                responsables: t.responsables || [],
                fechaLimite: (() => {
                  const raw = t.fechaLimite ?? t.fecha_limite;
                  return raw != null && raw !== '' ? normalizarFechaCampoAVigencia(raw, vigenciaSafe) : undefined;
                })(),
                fechaEntrega: (() => {
                  const raw = t.fechaEntrega ?? t.fecha_entrega ?? t.fechaLimite ?? t.fecha_limite;
                  return raw != null && raw !== '' ? normalizarFechaCampoAVigencia(raw, vigenciaSafe) : undefined;
                })(),
                fechaCompletada: (() => {
                  const raw = t.fechaCompletada ?? t.fecha_completada;
                  return raw != null && raw !== '' ? normalizarFechaCampoAVigencia(raw, vigenciaSafe) : undefined;
                })(),
                completadaPor: t.completadaPor || t.completada_por || undefined,
                requiereAdjuntos: !!(t.requiereAdjuntos ?? t.requiere_adjuntos),
                requiereObservaciones: !!(t.requiereObservaciones ?? t.requiere_observaciones),
                observaciones: t.observaciones || '',
                adjuntosTarea: t.adjuntosTarea || t.adjuntos_tarea || [],
              })),
              fechaCorte: formatearFecha(actExtendido.fecha_corte) || '',
            };
          })
        }))
      };
  }, [auditores]);

  useEffect(() => {
    if (!planDesdeBackend) return;
    // Evitar pisar el plan recién cargado por historial (getById): al cambiar año el hook
    // puede seguir exponiendo el plan del año anterior hasta que termine getByYear.
    const añoPlan = Number((planDesdeBackend as any).año);
    if (Number.isFinite(añoPlan) && añoPlan !== añoActual) return;

    setPlanActual(transformarPlanBackendAFicha(planDesdeBackend));
    setVista('dashboard');
  }, [planDesdeBackend, añoActual, transformarPlanBackendAFicha]);
  
  // Planes anteriores/disponibles - Carga desde backend
  const [planesAnteriores, setPlanesAnteriores] = useState<PlanAnual[]>([]);

  // Cargar lista de todos los planes disponibles
  useEffect(() => {
    const cargarPlanesDisponibles = async () => {
      try {
        const response = await planAnualApi.getAll();
        if (response.data && Array.isArray(response.data)) {
          // Transformar planes del backend al formato frontend (normalizado para EDICIÓN en wizard)
          const planesTransformados = response.data.map((planBackend: any) => {
            const añoPlanList = Number(planBackend.año ?? planBackend.vigencia);
            const vigenciaLista = Number.isFinite(añoPlanList) ? añoPlanList : new Date().getFullYear();
            const rolesOrdenados = Array.isArray(planBackend.roles)
              ? [...planBackend.roles].sort((a: any, b: any) => (a.rol_numero || a.numero || 0) - (b.rol_numero || b.numero || 0))
              : [];

            const rolesNormalizados = rolesOrdenados.map((rol: any) => ({
              id: rol.id,
              numero: rol.rol_numero ?? rol.numero ?? 0,
              nombre: rol.nombre || '',
              color: rol.color || '#3B82F6',
              icono: obtenerIconoRol(rol.rol_numero ?? rol.numero ?? 0),
              descripcion: rol.descripcion || '',
              actividades: (rol.actividades || []).map((act: any) => ({
                id: act.id,
                nombre: act.nombre || '',
                descripcion: act.descripcion || '',
                fechaInicio: String(act.fecha_inicio || act.fechaInicio || '').split('T')[0],
                fechaFin: String(act.fecha_fin || act.fechaFin || '').split('T')[0],
                fechaCorte: String(act.fecha_corte || act.fechaCorte || '').split('T')[0],
                porcentajeAvance: act.porcentaje_avance ?? act.porcentajeAvance ?? 0,
                estado: (act.estado || 'pendiente').toLowerCase() === 'completada'
                  ? 'COMPLETADA'
                  : (String(act.estado || '').toLowerCase().replace(/_/g, '-') === 'en-progreso' || String(act.estado || '').toLowerCase() === 'retrasada')
                    ? 'EN_EJECUCION'
                    : 'PENDIENTE',
                control: act.control || '',
                evaluacion: act.evaluacion || '',
                seguimiento: act.seguimiento || '',
                activo: act.activo ?? true,
                ...(() => {
                  const respSing =
                    act.responsable && act.responsable !== 'Por asignar'
                      ? { id: `temp-${act.responsable}`, nombre: act.responsable, cargo: 'Auditor', email: '' }
                      : null;
                  let respList = normalizarArrayResponsablesBackend(act.responsables).map((r: any) => ({
                    id: r.id,
                    nombre: r.nombre,
                    cargo: r.cargo || 'Auditor',
                    email: r.email || '',
                  }));
                  if (respList.length === 0 && respSing) {
                    respList = [{ ...respSing }];
                  }
                  return { responsable: respSing, responsables: respList };
                })(),
                puntosControl: mapPuntosControlFechasVigencia(act.puntos_control || act.puntosControl, vigenciaLista),
                frecuenciaPuntosControl: act.frecuencia_puntos_control || act.frecuenciaPuntosControl || null,
                entradasSeguimiento: act.entradas_seguimiento || act.entradasSeguimiento || [],
                tareasSeguimiento: (act.tareas_seguimiento || act.tareasSeguimiento || []).map((t: any) => ({
                  id: t.id,
                  descripcion: t.descripcion || '',
                  completada: !!t.completada,
                  responsables: t.responsables || [],
                  fechaLimite: (() => {
                    const raw = t.fechaLimite ?? t.fecha_limite ?? t.fechaEntrega ?? t.fecha_entrega;
                    return raw != null && raw !== '' ? normalizarFechaCampoAVigencia(raw, vigenciaLista) : undefined;
                  })(),
                  fechaEntrega: (() => {
                    const raw = t.fechaEntrega ?? t.fecha_entrega ?? t.fechaLimite ?? t.fecha_limite;
                    return raw != null && raw !== '' ? normalizarFechaCampoAVigencia(raw, vigenciaLista) : undefined;
                  })(),
                  fechaCompletada: (() => {
                    const raw = t.fechaCompletada ?? t.fecha_completada;
                    return raw != null && raw !== '' ? normalizarFechaCampoAVigencia(raw, vigenciaLista) : undefined;
                  })(),
                  completadaPor: t.completadaPor || t.completada_por || undefined,
                  requiereAdjuntos: !!(t.requiereAdjuntos ?? t.requiere_adjuntos),
                  requiereObservaciones: !!(t.requiereObservaciones ?? t.requiere_observaciones),
                  observaciones: t.observaciones || '',
                  adjuntosTarea: t.adjuntosTarea || t.adjuntos_tarea || [],
                })),
              })),
            }));

            return {
              ...planBackend,
              id: planBackend.id,
              vigencia: planBackend.año || planBackend.vigencia || new Date().getFullYear(),
              version: planBackend.version || 1,
              estado: (planBackend.estado?.toUpperCase().replace(/-/g, '_') || 'BORRADOR') as EstadoPlan,
              nombrePlan:
                planBackend.nombre
                || planBackend.nombre_plan
                || planBackend.titulo
                || null,
              totalActividades:
                planBackend.total_actividades
                || planBackend.totalActividades
                || 0,
              jefeOCI: {
                id: planBackend.responsable_id || planBackend.jefe_oci_id || '',
                nombre:
                  planBackend.responsable
                  || planBackend.responsable_nombre
                  || planBackend.jefe_oci
                  || 'No asignado',
                cargo: planBackend.responsable_cargo || 'Responsable',
                email: planBackend.responsable_email || ''
              },
              fechaAprobacion: planBackend.fecha_aprobacion || planBackend.fechaAprobacion || null,
              fechaCreacion: planBackend.fecha_creacion || planBackend.createdAt || new Date().toISOString(),
              actaCICC: planBackend.acta_cicc || planBackend.actaCICC || null,
              // ✅ Campos en camelCase para que WizardCreacion los use correctamente
              equipoAprobacion: planBackend.equipo_aprobacion || planBackend.equipoAprobacion || [],
              ordenAprobacion: planBackend.orden_aprobacion || planBackend.ordenAprobacion || 'secuencial',
              roles: rolesNormalizados
            };
          });
          setPlanesAnteriores(planesTransformados);
        }
      } catch (error) {
        console.error('Error cargando planes disponibles:', error);
      }
    };
    cargarPlanesDisponibles();
  }, [planActual]); // Recargar cuando cambie el plan actual para reflejar nuevos planes

  // Handler para cambiar de plan (historial: ojo). Carga por ID: solo cambiar año puede dejar planActual sin actualizar si getByYear falla.
  const handleCambiarPlan = async (planId: string) => {
    if (planId === planActual?.id) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const planSeleccionado = planesAnteriores.find((p) => p.id === planId);
    if (!planSeleccionado) {
      toast.error('No se encontró el plan en el historial.');
      return;
    }

    const toastId = 'plan-anual-cambiar-vigencia';
    toast.loading(`Cargando plan ${planSeleccionado.vigencia}…`, { id: toastId });

    try {
      let resp = await planAnualApi.getById(planId);
      let raw: any = resp.data;
      if (!resp.success || !raw) {
        toast.error(resp.error || 'No se pudo cargar el plan.', { id: toastId });
        return;
      }

      const rolesArr = Array.isArray(raw?.roles) ? raw.roles : [];
      const sinActividades =
        rolesArr.length === 0 ||
        rolesArr.every((r: any) => !Array.isArray(r?.actividades) || r.actividades.length === 0);
      const vig = raw.año ?? planSeleccionado.vigencia;
      if (sinActividades && vig) {
        const byYear = await planAnualApi.getByYear(vig);
        if (byYear?.success && byYear.data) {
          raw = byYear.data as any;
        }
      }

      if (!Array.isArray(raw?.roles) || raw.roles.length === 0) {
        toast.error('El plan no tiene roles/actividades en el servidor.', { id: toastId });
        return;
      }

      setAñoActual(vig);
      setPlanActual(transformarPlanBackendAFicha(raw));
      setVista('dashboard');

      try {
        localStorage.setItem(
          'esap:plan_anual_activo',
          JSON.stringify({
            vigencia: vig,
            id: raw.id,
            estado: raw.estado,
            version: planSeleccionado.version ?? 1,
            jefeOCINombre: raw.responsable || planSeleccionado.jefeOCI?.nombre || '',
            fechaCorte: `${vig}-12-31`,
          }),
        );
      } catch {
        /* ignore */
      }

      toast.success(`Plan ${planSeleccionado.vigencia} cargado`, { id: toastId });
    } catch (e: any) {
      toast.error(e?.message || 'Error al cargar el plan', { id: toastId });
    }
  };

  const abrirWizardConPlan = async (plan: PlanAnual, soloLectura: boolean) => {
    setDashboardSeccionForzada(null);
    setWizardSoloLectura(soloLectura);
    try {
      const resp = await planAnualApi.getById(plan.id);
      if (!resp?.success || !resp.data) {
        toast.error('No se pudo cargar el plan completo para edición');
        setPlanAEditar(plan);
        setVista('wizard');
        return;
      }

      let planBackend: any = resp.data;
      // Fallback: algunos backends devuelven getById sin actividades anidadas.
      const rolesGetById = Array.isArray(planBackend?.roles) ? planBackend.roles : [];
      const sinActividades =
        rolesGetById.length === 0 ||
        rolesGetById.every((r: any) => !Array.isArray(r?.actividades) || r.actividades.length === 0);
      if (sinActividades && plan.vigencia) {
        const byYear = await planAnualApi.getByYear(plan.vigencia);
        if (byYear?.success && byYear.data) {
          planBackend = byYear.data as any;
        }
      }

      const rolesOrdenados = [...(planBackend.roles || [])].sort(
        (a, b) => (a.rol_numero ?? a.numero ?? 0) - (b.rol_numero ?? b.numero ?? 0),
      );

      const planCompleto: PlanAnual = {
        ...plan,
        id: planBackend.id || plan.id,
        vigencia: planBackend.año || planBackend.ano || plan.vigencia,
        estado: mapearEstadoPlan(planBackend.estado || plan.estado || 'borrador'),
        fechaInicio: planBackend.fecha_inicio || plan.fechaInicio || `${plan.vigencia}-01-01`,
        fechaFin: planBackend.fecha_fin || plan.fechaFin || `${plan.vigencia}-12-31`,
        equipoAprobacion: planBackend.equipo_aprobacion || planBackend.equipoAprobacion || plan.equipoAprobacion || [],
        ordenAprobacion: planBackend.orden_aprobacion || planBackend.ordenAprobacion || plan.ordenAprobacion || 'secuencial',
        roles: rolesOrdenados.map((rol: any) => ({
          id: rol.id,
          numero: rol.rol_numero ?? rol.numero,
          nombre: rol.nombre,
          color: rol.color,
          icono: obtenerIconoRol(rol.rol_numero ?? rol.numero),
          descripcion: rol.descripcion,
          responsables: normalizarArrayResponsablesBackend(rol.responsables).slice(0, 1) as any,
          actividades: (rol.actividades || []).map((act: any) => ({
            ...act,
            id: act.id,
            nombre: act.nombre,
            descripcion: act.descripcion,
            fechaInicio: act.fecha_inicio || act.fechaInicio || '',
            fechaFin: act.fecha_fin || act.fechaFin || '',
            porcentajeAvance: act.porcentaje_avance ?? act.porcentajeAvance ?? 0,
            estado: (act.estado || 'pendiente').toUpperCase(),
            control: act.control || '',
            evaluacion: act.evaluacion || '',
            seguimiento: act.seguimiento || '',
            activo: act.activo !== false,
            incluidaEnPlan: act.incluidaEnPlan !== false,
            puntosControl: act.puntos_control || act.puntosControl || [],
            frecuenciaPuntosControl: act.frecuencia_puntos_control || act.frecuenciaPuntosControl || null,
            ...(() => {
              const respSing =
                act.responsable && act.responsable !== 'Por asignar'
                  ? { id: `temp-${act.responsable}`, nombre: act.responsable, cargo: 'Auditor', email: '' }
                  : null;
              let respList = normalizarArrayResponsablesBackend(act.responsables).map((r: any) => ({
                id: r.id,
                nombre: r.nombre,
                cargo: r.cargo || 'Auditor',
                email: r.email || '',
              }));
              if (respList.length === 0 && respSing) respList = [{ ...respSing }];
              return { responsable: respSing, responsables: respList };
            })(),
            tareasSeguimiento: (act.tareas_seguimiento || act.tareasSeguimiento || []).map((t: any) => ({
              id: t.id,
              descripcion: t.descripcion || '',
              completada: !!t.completada,
              responsables: t.responsables || [],
              fechaLimite: t.fechaLimite || t.fecha_limite || t.fechaEntrega || t.fecha_entrega || undefined,
              fechaEntrega: t.fechaEntrega || t.fecha_entrega || t.fechaLimite || t.fecha_limite || undefined,
              fechaCompletada: t.fechaCompletada || t.fecha_completada || undefined,
              completadaPor: t.completadaPor || t.completada_por || undefined,
              requiereAdjuntos: !!(t.requiereAdjuntos ?? t.requiere_adjuntos),
              requiereObservaciones: !!(t.requiereObservaciones ?? t.requiere_observaciones),
              observaciones: t.observaciones || '',
              adjuntosTarea: t.adjuntosTarea || t.adjuntos_tarea || [],
            })),
            entradasSeguimiento: act.entradas_seguimiento || act.entradasSeguimiento || [],
          })),
        })),
      };

      setPlanAEditar(planCompleto);
      setVista('wizard');
    } catch (error) {
      console.error('Error cargando plan completo para edición:', error);
      toast.error('No se pudo cargar el plan completo para edición');
      setPlanAEditar(plan);
      setVista('wizard');
    }
  };

  const handleEditarPlan = (plan: PlanAnual) => abrirWizardConPlan(plan, false);
  const handleVerDefinicionPlan = (plan: PlanAnual) => abrirWizardConPlan(plan, true);

  // Hook para crear plan en backend
  const { mutate: crearPlanEnBackend, loading: creandoPlan } = useCreatePlanAnual();

  const handleCrearPlan = async (vigencia: number, jefeOCI: Auditor, rolesConfig: any[], fechaInicio: string, fechaFin: string, comiteAprobacion?: Auditor[], ordenAprobacion?: string): Promise<boolean> => {
    try {
      // ═══════════════════════════════════════════════════════════════
      // DEBUG: Resumen completo de lo que se va a enviar al backend
      // ═══════════════════════════════════════════════════════════════
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🚀 [handleCrearPlan] INICIO - Creando Plan Anual');
      console.log(`   Vigencia: ${vigencia}`);
      console.log(`   Jefe OCI: ${jefeOCI.nombre} (id: ${jefeOCI.id})`);
      console.log(`   Fechas: ${fechaInicio} → ${fechaFin}`);
      console.log(`   Roles configurados: ${rolesConfig.length}`);
      
      /** Solo actividades con checkbox marcado en el wizard (`incluidaEnPlan !== false`). */
      const actividadesTemplateIncluidas = (rc: any) =>
        (rc.actividadesSeleccionadas || []).filter((a: any) => a?.incluidaEnPlan !== false);

      let totalActividadesEsperadas = 0;
      let totalTareasEsperadas = 0;
      for (const rc of rolesConfig) {
        const actSel = actividadesTemplateIncluidas(rc).length;
        const actCus = rc.actividadesCustom?.length || 0;
        const totalAct = actSel + actCus;
        totalActividadesEsperadas += totalAct;
        
        const todasActs = [...actividadesTemplateIncluidas(rc), ...(rc.actividadesCustom || [])];
        const tareasEnRol = todasActs.reduce((sum: number, a: any) => sum + (a.tareasSeguimiento?.length || 0), 0);
        totalTareasEsperadas += tareasEnRol;
        
        console.log(`   Rol ${rc.numero} "${rc.nombre}": ${actSel} sel + ${actCus} custom = ${totalAct} actividades, ${tareasEnRol} tareas, ${rc.responsables?.length || 0} responsables`);
      }
      console.log(`   📊 TOTAL ESPERADO: ${totalActividadesEsperadas} actividades, ${totalTareasEsperadas} tareas`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      const esUUID = (v: unknown): v is string =>
        typeof v === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(v);
      // Validar si el id es un UUID válido. Si no lo es, enviamos undefined para evitar el Error 400 del Backend.
      const esIdUUID = esUUID(jefeOCI.id);

      // Determinar si creamos o actualizamos
      let planCreado: any = null;

      if (planAEditar) {
        // Actualizar plan existente
        const resp = await planAnualApi.update(planAEditar.id, {
          estado: planAEditar.estado,
          responsable: jefeOCI.nombre,
          responsable_id: esIdUUID ? jefeOCI.id : undefined,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          equipo_aprobacion: comiteAprobacion || [],
          orden_aprobacion: ordenAprobacion || 'secuencial',
        });
        
        if (resp.success) {
          planCreado = resp.data;

          // Además de los datos generales del plan, sincronizar SOLO actividades modificadas.
          const todasActividadesEdicion = rolesConfig.flatMap((rc: any) => [
            ...(rc.actividadesSeleccionadas || []).filter((a: any) => a?.incluidaEnPlan !== false),
            ...(rc.actividadesCustom || []),
          ]);
          const actividadesOriginales = (planAEditar?.roles || []).flatMap((r: any) => r.actividades || []);
          const originalPorId = new Map<string, any>(
            actividadesOriginales
              .filter((a: any) => esUUID(a?.id))
              .map((a: any) => [String(a.id), a])
          );

          const construirPayloadActividad = (act: any) => {
            let configuracionEvidencias = act.configuracionEvidencias;
            if (!configuracionEvidencias && act.tipoEvidencia) {
              switch (act.tipoEvidencia) {
                case 'SOLO_CHECK':
                  configuracionEvidencias = {
                    documentos: false, observaciones: false,
                    adjuntosRequeridos: 'NO_REQUERIDO', observacionRequerida: 'NO_REQUERIDO',
                    minimoAdjuntos: 0, longitudMinimaObservacion: 0
                  };
                  break;
                case 'OBSERVACIONES':
                  configuracionEvidencias = {
                    documentos: false, observaciones: true,
                    adjuntosRequeridos: 'OPCIONAL', observacionRequerida: 'OBLIGATORIO',
                    minimoAdjuntos: 0, longitudMinimaObservacion: 30
                  };
                  break;
                case 'ADJUNTOS':
                  configuracionEvidencias = {
                    documentos: true, observaciones: false,
                    adjuntosRequeridos: 'OBLIGATORIO', observacionRequerida: 'OPCIONAL',
                    minimoAdjuntos: 1, longitudMinimaObservacion: 0
                  };
                  break;
                case 'COMPLETO':
                  configuracionEvidencias = {
                    documentos: true, observaciones: true,
                    adjuntosRequeridos: 'OBLIGATORIO', observacionRequerida: 'OBLIGATORIO',
                    minimoAdjuntos: 1, longitudMinimaObservacion: 30
                  };
                  break;
              }
            }
            if (!configuracionEvidencias) {
              configuracionEvidencias = {
                documentos: false, observaciones: false,
                adjuntosRequeridos: 'NO_REQUERIDO', observacionRequerida: 'NO_REQUERIDO',
                minimoAdjuntos: 0, longitudMinimaObservacion: 0
              };
            }

            const responsablesActividad = Array.isArray(act.responsables) ? act.responsables : [];
            return {
              nombre: act.nombre || '',
              descripcion: act.descripcion || '',
              responsable: responsablesActividad[0]?.nombre || act.responsable?.nombre || act.responsable || 'Por asignar',
              responsables: responsablesActividad,
              fecha_inicio: act.fechaInicio || undefined,
              fecha_fin: act.fechaFin || undefined,
              fecha_corte: act.fechaCorte || undefined,
              configuracionEvidencias,
              puntos_control: Array.isArray(act.puntosControl) ? act.puntosControl : [],
              frecuencia_puntos_control: act.frecuenciaPuntosControl || undefined,
              tareas_seguimiento: Array.isArray(act.tareasSeguimiento)
                ? act.tareasSeguimiento.map((t: any) => ({
                    id: t.id,
                    descripcion: t.descripcion,
                    completada: !!t.completada,
                    responsables: t.responsables || [],
                    fechaLimite: t.fechaEntrega || t.fechaLimite || t.fecha_limite || t.fecha_entrega || null,
                    fechaCompletada: t.fechaCompletada || t.fecha_completada || undefined,
                    completadaPor: t.completadaPor || t.completada_por || undefined,
                    requiereAdjuntos: !!(t.requiereAdjuntos ?? t.requiere_adjuntos),
                    requiereObservaciones: !!(t.requiereObservaciones ?? t.requiere_observaciones),
                    observaciones: t.observaciones || '',
                    adjuntosTarea: t.adjuntosTarea || t.adjuntos_tarea || [],
                  }))
                : [],
            };
          };

          let actividadesSincronizadas = 0;
          let actividadesNoUuid = 0;
          let actividadesConError = 0;
          let actividadesSinCambios = 0;

          const updatesPendientes: Array<{ id: string; payload: any }> = [];
          for (const act of todasActividadesEdicion) {
            if (!esUUID(act?.id)) {
              actividadesNoUuid++;
              continue;
            }
            const payloadNuevo = construirPayloadActividad(act);
            const original = originalPorId.get(String(act.id));
            if (original) {
              const payloadOriginal = construirPayloadActividad(original);
              if (JSON.stringify(payloadOriginal) === JSON.stringify(payloadNuevo)) {
                actividadesSinCambios++;
                continue;
              }
            }
            updatesPendientes.push({ id: String(act.id), payload: payloadNuevo });
          }

          // Envío en lotes paralelos para reducir tiempo total sin saturar el backend.
          const TAM_LOTE = 6;
          for (let i = 0; i < updatesPendientes.length; i += TAM_LOTE) {
            const lote = updatesPendientes.slice(i, i + TAM_LOTE);
            const resultados = await Promise.allSettled(
              lote.map((u) => actividadesApi.update(u.id, u.payload))
            );
            resultados.forEach((r, idx) => {
              if (r.status === 'fulfilled' && r.value?.success) {
                actividadesSincronizadas++;
              } else {
                actividadesConError++;
                const id = lote[idx]?.id;
                console.error('[handleCrearPlan] Error actualizando actividad en edición:', id, r);
              }
            });
          }

          toast.success('Plan guardado exitosamente');
          setPlanAEditar(undefined);
          return true;
        } else {
          toast.error('Error al actualizar el plan', { description: resp.error });
          return false;
        }
      } else {
        // Crear plan nuevo en backend
        planCreado = await crearPlanEnBackend({
          año: vigencia,
          responsable: jefeOCI.nombre,
          responsable_id: esIdUUID ? jefeOCI.id : undefined,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
          equipo_aprobacion: comiteAprobacion || [],
          orden_aprobacion: ordenAprobacion || 'secuencial',
        });
      }

    // ✅ Sincronizar año activo con la vigencia del plan recién creado
    if (planCreado) {
      setAñoActual(vigencia);
    }

    if (planCreado && planCreado.roles) {
      let actividadesCreadas = 0;
      let actividadesFallidas = 0;
      const erroresPorActividad: string[] = [];

      // Crear actividades para cada rol
      for (const rolConfig of rolesConfig) {
        // Buscar el rol correspondiente en el plan creado
        const rolBackend = planCreado.roles.find((r: any) => r.rol_numero === rolConfig.numero);
        
        if (rolBackend) {
          // Combinar actividades seleccionadas (solo incluidas en plan) y custom
          const todasActividades = [
            ...(rolConfig.actividadesSeleccionadas || []).filter((a: any) => a?.incluidaEnPlan !== false),
            ...(rolConfig.actividadesCustom || [])
          ];

          console.log(`📦 [handleCrearPlan] Rol ${rolBackend.rol_numero}:`, {
            actividadesSeleccionadas: (rolConfig.actividadesSeleccionadas || []).filter((a: any) => a?.incluidaEnPlan !== false).length,
            actividadesCustom: rolConfig.actividadesCustom?.length || 0,
            primeraActividad: todasActividades[0]?.nombre,
            tieneTareas: !!todasActividades[0]?.tareasSeguimiento,
            tareas: todasActividades[0]?.tareasSeguimiento?.length || 0
          });

          const responsablesDelRol = rolConfig.responsables || [];

          // Crear cada actividad en el backend
          for (let i = 0; i < todasActividades.length; i++) {
            const act = todasActividades[i];
            
            // ⚡ LÓGICA ACTUALIZADA: 
            // - Si el ROL tiene responsables asignados → asignar rotativamente a las actividades
            // - Si el ROL NO tiene responsables → dejar como "Por asignar"
            const responsablesDelRol = rolConfig.responsables || [];
            let responsable: string;
            
            if (act.responsables && act.responsables.length > 0) {
              // Usar el primer responsable asignado a la actividad
              responsable = act.responsables[0].nombre || 'Por asignar';
              console.log(`🆕 [handleCrearPlan] Actividad "${act.nombre}" → Responsable (actividad): ${responsable}`);
            } else if (responsablesDelRol.length > 0) {
              // Fallback: asignar responsable rotativo de los asignados al rol
              responsable = responsablesDelRol[i % responsablesDelRol.length]?.nombre || 'Por asignar';
              console.log(`🆕 [handleCrearPlan] Actividad "${act.nombre}" → Responsable (rol): ${responsable}`);
            } else {
              // Rol sin responsables asignados → actividad queda "Por asignar"
              responsable = 'Por asignar';
              console.log(`🆕 [handleCrearPlan] Actividad "${act.nombre}" → Sin asignar (rol sin responsables)`);
            }

            // ⚡ Convertir tipoEvidencia del Wizard a configuracionEvidencias del backend
            let configuracionEvidencias = act.configuracionEvidencias;
            if (!configuracionEvidencias && act.tipoEvidencia) {
              // Mapear tipoEvidencia a configuracionEvidencias completa
              switch (act.tipoEvidencia) {
                case 'SOLO_CHECK':
                  configuracionEvidencias = { 
                    documentos: false, observaciones: false,
                    adjuntosRequeridos: 'NO_REQUERIDO', observacionRequerida: 'NO_REQUERIDO',
                    minimoAdjuntos: 0, longitudMinimaObservacion: 0
                  };
                  break;
                case 'OBSERVACIONES':
                  configuracionEvidencias = { 
                    documentos: false, observaciones: true,
                    adjuntosRequeridos: 'OPCIONAL', observacionRequerida: 'OBLIGATORIO',
                    minimoAdjuntos: 0, longitudMinimaObservacion: 30
                  };
                  break;
                case 'ADJUNTOS':
                  configuracionEvidencias = { 
                    documentos: true, observaciones: false,
                    adjuntosRequeridos: 'OBLIGATORIO', observacionRequerida: 'OPCIONAL',
                    minimoAdjuntos: 1, longitudMinimaObservacion: 0
                  };
                  break;
                case 'COMPLETO':
                  configuracionEvidencias = { 
                    documentos: true, observaciones: true,
                    adjuntosRequeridos: 'OBLIGATORIO', observacionRequerida: 'OBLIGATORIO',
                    minimoAdjuntos: 1, longitudMinimaObservacion: 30
                  };
                  break;
              }
            }
            // Asegurar defaults si no tiene configuración
            if (!configuracionEvidencias) {
              configuracionEvidencias = {
                documentos: false, observaciones: false,
                adjuntosRequeridos: 'NO_REQUERIDO', observacionRequerida: 'NO_REQUERIDO',
                minimoAdjuntos: 0, longitudMinimaObservacion: 0
              };
            }

            // ⚡ Las tareas de seguimiento NO se convierten en entradas_seguimiento al crear.
            // Un plan nuevo debe iniciar en 0%. Las entradas se crean manualmente durante el seguimiento.

            const resultActividad = await actividadesApi.create(rolBackend.id, {
              nombre: act.nombre,
              descripcion: act.descripcion || '',
              responsable: responsable,
              responsables: act.responsables && act.responsables.length > 0
                ? act.responsables
                : (responsablesDelRol.length > 0 ? [responsablesDelRol[i % responsablesDelRol.length]] : []),
              fecha_corte: act.fechaCorte || undefined,
              fecha_inicio: act.fechaInicio || `${vigencia}-01-01`,
              fecha_fin: act.fechaFin || `${vigencia}-12-31`,
              observaciones: '',
              // Campos nuevos migración 129
              control: act.control || '',
              evaluacion: act.evaluacion || '',
              seguimiento: act.seguimiento || '',
              requiereVerificacionDirector: act.requiereVerificacionDirector || false,
              configuracionEvidencias: configuracionEvidencias,
              puntos_control: act.puntosControl && act.puntosControl.length > 0 ? act.puntosControl : undefined,
              frecuencia_puntos_control: act.frecuenciaPuntosControl || undefined,
              // Tareas de seguimiento — mismo shape que en edición (`construirPayloadActividad`)
              // para que requiereObservaciones / requiereAdjuntos no se pierdan al crear el plan.
              tareas_seguimiento: act.tareasSeguimiento && act.tareasSeguimiento.length > 0 
                ? act.tareasSeguimiento.map((t: any) => ({
                    id: t.id,
                    descripcion: t.descripcion,
                    completada: false,
                    responsables: t.responsables || [],
                    fechaLimite: t.fechaEntrega || t.fechaLimite || t.fecha_limite || t.fecha_entrega || null,
                    fechaCompletada: undefined,
                    completadaPor: undefined,
                    requiereAdjuntos: !!(t.requiereAdjuntos ?? t.requiere_adjuntos),
                    requiereObservaciones: !!(t.requiereObservaciones ?? t.requiere_observaciones),
                    observaciones: t.observaciones || '',
                    adjuntosTarea: t.adjuntosTarea || t.adjuntos_tarea || [],
                  }))
                : undefined,
            });

            if (resultActividad.success) {
              actividadesCreadas++;
            } else {
              actividadesFallidas++;
              const nombreCorto = act.nombre.slice(0, 50);
              erroresPorActividad.push(`"${nombreCorto}": ${resultActividad.error || 'Error desconocido'}`);
              console.error(`❌ Error creando actividad "${act.nombre}":`, resultActividad.error);
            }
          }
        }
      }

      // NO recargamos el plan ni cambiamos la vista aquí, 
      // lo hará el Wizard después de mostrar el Modal de feedback.

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`✅ [handleCrearPlan] RESUMEN FINAL:`);
      console.log(`   Actividades creadas: ${actividadesCreadas}`);
      console.log(`   Actividades fallidas: ${actividadesFallidas}`);
      if (erroresPorActividad.length > 0) {
        console.log(`   Errores:`, erroresPorActividad);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      if (actividadesFallidas === 0) {
        toast.success('Plan creado exitosamente', {
          description: `Plan anual ${vigencia} — ${actividadesCreadas} actividades guardadas`
        });
      } else if (actividadesCreadas > 0) {
        toast.warning('Plan creado con errores parciales', {
          description: `${actividadesCreadas} actividades guardadas, ${actividadesFallidas} fallaron. Error: ${erroresPorActividad[0]}`,
          duration: 10000
        });
      } else {
        toast.error('El plan se creó pero no se guardaron las actividades', {
          description: `Error: ${erroresPorActividad[0] || 'Error de conexión con el servidor'}`,
          duration: 10000
        });
      }
      return true;
    } else {
      // crearPlanEnBackend devolvió null — el hook ya mostró toast, pero reforzamos el mensaje
      console.error('[handleCrearPlan] ❌ No se pudo crear el plan. Posible duplicado de vigencia.');
      // Verificar si ya existe un plan para esa vigencia entre los planes cargados
      const planExistente = planesAnteriores.find(p => p.vigencia === vigencia);
      if (planExistente) {
        toast.error(`Ya existe un plan para la vigencia ${vigencia}`, {
          description: `El plan "${planExistente.id}" (${planExistente.estado}) ya cubre esa vigencia. Puede abrirlo desde la pantalla de inicio o eliminarlo para crear uno nuevo.`,
          duration: 12000
        });
      } else {
        toast.error('No se pudo crear el Plan Anual', {
          description: `El servidor rechazó la creación para vigencia ${vigencia}. Verifique que no exista ya un plan o intente con otra vigencia.`,
          duration: 12000
        });
      }
      return false;
    }
  } catch (error: any) {
    console.error('Error no manejado en handleCrearPlan:', error);
    toast.error('Error inesperado al crear el plan', { description: error?.message || 'Error de conexión' });
    return false;
  }
};
  
  // ═══════════════════════════════════════════════════════════════════════
  // FUNCIÓN PARA CARGAR DATOS MOCK (COMENTADA - AHORA SE USA BACKEND)
  // ═══════════════════════════════════════════════════════════════════════
  /* MOCK COMENTADO - Ahora los datos vienen del backend
  const handleCrearPlanConMock = () => {
    const planMock = crearPlanConDatosMock(2026, AUDITORES[0]);
    setPlanActual(planMock);
    setVista('dashboard');
    toast.success('Plan de prueba cargado', {
      description: '✨ Plan con datos mock para testing completo'
    });
  };
  FIN MOCK handleCrearPlanConMock */

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-blue-50/30">
      {vista === 'inicio' && (cargandoPlan || cargandoAuditores) && (
        <div className="shrink-0 px-4 py-2.5 bg-blue-50 border-b border-blue-100 text-sm text-blue-900 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent shrink-0" />
          <span>
            {cargandoPlan ? 'Sincronizando el plan del año seleccionado…' : 'Cargando referencias del equipo auditor…'}
          </span>
        </div>
      )}
      <AnimatePresence mode="wait">
        {vista === 'inicio' && (
          <PantallaInicio
            key="inicio"
            planesAnteriores={planesAnteriores}
            puedeVerPlan={puedeVerPlan}
            onCrearNuevo={puedeCrearPlan ? () => { setWizardSoloLectura(false); setPlanAEditar(undefined); setVista('wizard'); } : undefined}
            onAbrirPlan={(plan) => {
              setWizardSoloLectura(false);
              setPlanAEditar(undefined);
              // Si el plan ya está cargado para ese mismo año, ir directo al dashboard
              if (plan.vigencia === añoActual && planActual) {
                setVista('dashboard');
              } else {
                // Cambiar el año para que el hook re-fetche el plan completo (con roles y actividades)
                setAñoActual(plan.vigencia);
                // El useEffect de planDesdeBackend se encargará de setPlanActual y setVista('dashboard')
              }
            }}
            // onCargarMock comentado - ahora se carga desde backend
          />
        )}

        {vista === 'wizard' && (
          <WizardCreacion
            key={`wizard-${planAEditar?.id ?? 'nuevo'}-${wizardSoloLectura ? 'ro' : 'rw'}`}
            planAEditar={planAEditar}
            soloLectura={wizardSoloLectura}
            puedeIrAAprobacion={wizardSoloLectura && puedeIrAAprobacion}
            onIrAAprobacion={
              puedeIrAAprobacion
                ? () => {
                    setWizardSoloLectura(false);
                    setDashboardSeccionForzada('aprobar');
                    setVista('dashboard');
                  }
                : undefined
            }
            onCancelar={() => {
              setWizardSoloLectura(false);
              setDashboardSeccionForzada(null);
              setVista(planActual ? 'dashboard' : 'inicio');
            }}
            onCrear={handleCrearPlan}
            onTerminado={async () => {
              // añoActual ya fue sincronizado en handleCrearPlan
              setWizardSoloLectura(false);
              setDashboardSeccionForzada(null);
              await recargarPlan();
              setVista('dashboard');
            }}
            planesExistentes={planesAnteriores}
          />
        )}

        {vista === 'dashboard' && planActual && (
          <DashboardPlan
            key="dashboard"
            plan={planActual}
            onActualizar={setPlanActual}
            onRefetchPlan={recargarPlan}
            onVolver={() => setVista('inicio')}
            onAbrirRol4={() => {
              if (onNavegarModulo) {
                onNavegarModulo('universo-auditable');
              } else {
                setVista('rol4-integrado');
              }
            }}
            onCrearNuevo={puedeCrearPlan ? () => { setWizardSoloLectura(false); setPlanAEditar(undefined); setVista('wizard'); } : undefined}
            onEditarPlan={puedeEditarPlan ? handleEditarPlan : undefined}
            onVerDefinicionPlan={puedeVerPlan ? handleVerDefinicionPlan : undefined}
            seccionForzada={dashboardSeccionForzada}
            onSeccionForzadaAplicada={limpiarSeccionForzadaDashboard}
            planesAnteriores={planesAnteriores}
            planesDisponibles={planesAnteriores}
            onCambiarPlan={handleCambiarPlan}
          />
        )}

        {vista === 'rol4-integrado' && planActual && (
          <PlanAnualRol4IntegradoWrapper
            key="rol4-integrado"
            vigencia={planActual.vigencia}
            onVolver={() => setVista('dashboard')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper para el componente integrado
function PlanAnualRol4IntegradoWrapper({ vigencia, onVolver }: { vigencia: number; onVolver: () => void }) {
  return (
    <IntegracionRol4Provider>
      <PlanAnualRol4Integrado vigencia={vigencia} onVolver={onVolver} />
    </IntegracionRol4Provider>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// PANTALLA: INICIO
// ════════════════════════════════════════════════════════════════════════════

interface PantallaInicioProps {
  planesAnteriores: PlanAnual[];
  /** CONTROL_INTERNO_PLAN_ANUAL_VIEW: mostrar acceso al dashboard del plan */
  puedeVerPlan?: boolean;
  onCrearNuevo?: () => void;
  onAbrirPlan: (plan: PlanAnual) => void;
  onCargarMock?: () => void; // NUEVO: Para cargar datos de prueba
}

function PantallaInicio({ planesAnteriores, puedeVerPlan = false, onCrearNuevo, onAbrirPlan, onCargarMock }: PantallaInicioProps) {
  const vigenciaActual = new Date().getFullYear();
  
  // Revisar si existe un borrador local no enviado
  const draftStr = typeof window !== 'undefined' ? localStorage.getItem('esap:wizard_plan_anual_draft') : null;
  let borradorLocal = null;
  try {
    if (draftStr) borradorLocal = JSON.parse(draftStr);
  } catch (e) {}

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 overflow-y-auto p-3"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 mb-6 shadow-xl">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Plan Anual de Auditoría Interna
          </h1>
          <p className="text-lg text-gray-600">
            Oficina de Control Interno de Gestión (OCI) • Decreto 648 de 2017
          </p>
        </div>

        {/* Card principal */}
        <div className="bg-white rounded-2xl border-3 border-blue-200 p-12 text-center shadow-xl mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-blue-50 mb-6">
            <Calendar className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Crear plan anual de auditoría
          </h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Inicia la creación del plan anual de auditoría interna.
          </p>
          
          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {onCrearNuevo && (
            <button
              onClick={onCrearNuevo}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:shadow-2xl text-white rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105"
            >
              <Plus className="w-6 h-6" />
              Crear Plan Anual
            </button>
            )}
            
            {/* Botón para cargar datos mock */}
            {onCargarMock && (
              <button
                onClick={onCargarMock}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:shadow-2xl text-white rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform hover:scale-105"
              >
                <FileCheck className="w-6 h-6" />
                Cargar Plan de Prueba
              </button>
            )}
          </div>
          
          {/* Mensaje informativo para modo prueba */}
          {onCargarMock && (
            <div className="mt-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <p className="text-sm text-amber-900 font-medium flex items-center justify-center gap-2">
                <AlertCircle className="w-4 h-4" />
                El plan de prueba incluye datos mock completos para testing de todas las funcionalidades
              </p>
            </div>
          )}
        </div>

        {/* Borrador en Progreso */}
        {borradorLocal && onCrearNuevo && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-200 p-8 shadow-lg mb-8 animate-pulse-slow">
            <h2 className="text-xl font-bold text-orange-900 mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Borrador en Progreso (Vigencia {borradorLocal.vigencia || vigenciaActual})
            </h2>
            <p className="text-orange-800 mb-4">
              Tienes un plan anual que estabas editando pero aún no ha sido enviado al comité aprobador.
            </p>
            <button
              onClick={onCrearNuevo}
              className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
            >
              Continuar Editando
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Planes anteriores */}
        {planesAnteriores.length > 0 && (
          <div className="bg-white rounded-2xl border-2 border-gray-200 p-8 shadow-lg">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gray-600" />
              Planes de vigencias anteriores
            </h2>
            <div className="space-y-3">
              {planesAnteriores.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div>
                    <h3 className="font-bold text-gray-900">Plan anual {plan.vigencia}</h3>
                    <p className="text-sm text-gray-600">
                      {plan.id} • {plan.estado} • Responsable: {plan.jefeOCI?.nombre || 'No asignado'}
                    </p>
                  </div>
                  {puedeVerPlan ? (
                    <button
                      onClick={() => onAbrirPlan(plan)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-medium flex items-center gap-2 transition-colors"
                      title="Abrir plan en el dashboard"
                    >
                      <Eye className="w-4 h-4" />
                      Ver
                    </button>
                  ) : (
                    <span className="px-3 py-2 text-xs text-gray-400 border border-dashed border-gray-200 rounded-lg">
                      Sin permiso de consulta
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// WIZARD: CREACIÓN (continuará en el siguiente mensaje...)
// ════════════════════════════════════════════════════════════════════════════