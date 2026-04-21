/**
 * Wizard y Dashboard del Plan Anual de Auditoría
 * Componentes complementarios para PlanAnualAuditoriaDefinitivo.tsx
 * v2.0 - Con soporte para puntos de control
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Check, Shield, Users, CheckCircle2, 
  TrendingUp, FileCheck, AlertCircle, AlertTriangle, BookOpen, Download, FileText,
  Paperclip, Upload, Trash2, X, Eye, Plus, CalendarClock, Loader2, FileSpreadsheet, RefreshCw, Settings,
  ChevronDown, ChevronUp, Calendar, Clock, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalGestionAdjuntos } from './ModalGestionAdjuntosActividades';
import { SemaforoSeguimientoPAI } from '../plan-anual-auditoria/components/SemaforoSeguimientoPAI';
import { ConfiguracionEvidencias, CONFIGURACIONES_PREDEFINIDAS } from './SistemaEvidenciasActividades';
import { 
  ModalConfiguracionPuntosControl, 
  type PuntoControl, 
  type FrecuenciaPuntoControl 
} from './ModalConfiguracionPuntosControl';
import { ModalFirmaOTP, type FirmaElectronicaMetadata } from './ModalFirmaOTP';

// ⚠️ IMPORTACIÓN OBLIGATORIA DE REGLAS DE NEGOCIO Y CUMPLIMIENTO NORMATIVO
import { REGLAS_NEGOCIO_OCIG } from '../config/reglas-negocio-ocig';
import { createPortal } from 'react-dom';
// Hook para sincronizar evidencias con backend y API de auditores
import { useSaveEvidencias, actividadesApi, planAnualApi, type CreateActividadDto } from './services/plan-anual';
import { configuracionesProfesionalesOCIApi } from './services/api';
// Servicio para vinculación de auditorías con Rol 4
import { controlInternoService } from '../../../services/api/controlInternoService';
import { useControlInternoPermissions } from './hooks/useControlInternoPermissions';
import { cargarConfiguracionPDF } from './utils/configuracionHelper';
import { 
  dibujarEncabezadoInstitucional, 
  dibujarPieInstitucional, 
  DOCUMENTOS_PREDEFINIDOS,
  LOGO_ESAP_URL
} from './services/pdfESAPHeader';
// ✅ NUEVO: Exportación Excel con logo
import { exportarPlanAnualExcel } from './services/exportarPlanAnualExcel';
import { exportarCertificadoAprobacionPDF } from './services/exportarCertificadoPDF';

// Tipos re-exportados (deben coincidir con el archivo principal)
type EstadoPlan = 'BORRADOR' | 'EN_REVISION' | 'APROBADO' | 'VIGENTE' | 'CERRADO' | 'DEVUELTO';
type EstadoActividad = 'PENDIENTE' | 'EN_EJECUCION' | 'COMPLETADA';

interface Auditor {
  id: string;
  nombre: string;
  cargo: string;
  email: string;
}

// Tarea de seguimiento estructurada
interface TareaSeguimiento {
  id: string;
  descripcion: string;
  completada: boolean;
  fechaCompletado?: string;
  responsables?: string[];
  observaciones?: string;
  // ✅ Requisitos por tarea (antes estaban al nivel de actividad)
  requiereObservaciones?: boolean;
  requiereAdjuntos?: boolean;
  adjuntosTarea?: { nombre: string; url: string; fecha: string }[];
  // ✅ Fecha de entrega opcional
  fechaEntrega?: string;
  // ✅ Evaluación por el responsable
  evaluada?: boolean;
  aceptada?: boolean;
  observacionesEvaluacion?: string;
  fechaEvaluacion?: string;
}

interface Actividad {
  id: number | string;
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  responsable: Auditor | null; // RESPONSABLE PRINCIPAL - Asignado en la programación (no modificable en seguimiento)
  responsablesApoyo?: Auditor[]; // Responsables adicionales agregados como apoyo en el seguimiento
  porcentajeAvance: number;
  estado: EstadoActividad;
  control: string;
  evaluacion: string;
  seguimiento: string;
  tareasSeguimiento?: TareaSeguimiento[];
  adjuntos?: ArchivoAdjunto[]; // Archivos adjuntos para evidencia de cumplimiento
  observacionesCumplimiento?: ObservacionCumplimiento[] | string; // FLEXIBILIDAD: array para múltiples o string simple
  
  // ═══════════════════════════════════════════════════════════════════════
  // CONFIGURACIÓN DE EVIDENCIAS - Define si adjuntos/observaciones son requeridos
  // ═══════════════════════════════════════════════════════════════════════
  configuracionEvidencias?: ConfiguracionEvidencias;
  
  // Sistema de autorización del Jefe OCI - Configurado en creación del plan
  requiereAutorizacionJefeOCI?: boolean; // Indica si requiere autorización del Jefe OCI para completar
  autorizadaPorJefeOCI?: boolean; // Indica si fue autorizada por el Jefe OCI
  fechaAutorizacion?: string; // Fecha de autorización del Jefe OCI
  observacionesJefeOCI?: string; // Observaciones del Jefe OCI al autorizar
  
  // Sistema de verificación del Director (legacy)
  requiereVerificacionDirector: boolean; // Indica si requiere verificación del Director OCI
  verificadaPorDirector?: boolean; // Indica si fue verificada por el Director
  fechaVerificacion?: string; // Fecha de verificación del Director
  observacionesDirector?: string; // Observaciones del Director al verificar
  
  // ✅ NUEVO: Sistema de puntos de control
  puntosControl?: PuntoControl[]; // Puntos de control configurados
  frecuenciaPuntosControl?: FrecuenciaPuntoControl; // Frecuencia configurada

  // ✅ NUEVO: Entradas de seguimiento vinculadas a puntos de control
  entradasSeguimiento?: EntradaSeguimiento[];

  // Soft delete
  activo?: boolean;
}

interface EntradaSeguimiento {
  id: string;
  puntoControlId: string;   // ID del punto de control (pc-auto-1, etc.)
  fechaRegistro: string;    // ISO date — se compara con fechaProgramada del corte
  registradoPor: string;
  usuarioId?: string;
  texto?: string;           // observación escrita (opcional)
  archivos?: Array<{        // evidencias adjuntas (opcional)
    nombre: string;
    url: string;
    tipo: string;
    tamanio: number;
  }>;
  tipo: 'seguimiento' | 'hallazgo' | 'cierre';
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

interface ObservacionCumplimiento {
  id: string;
  texto: string;
  fechaRegistro: string;
  registradoPor: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIONES HELPER - Manejar diferentes formatos de datos
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el conteo correcto de observaciones
 * Maneja tanto string (del backend) como array (del frontend)
 */
function escapeHtml(s: string): string {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function contarObservaciones(obs: ObservacionCumplimiento[] | string | undefined): number {
  if (!obs) return 0;
  if (Array.isArray(obs)) return obs.length;
  // Es string: cuenta como 1 si tiene contenido
  return typeof obs === 'string' && obs.trim().length > 0 ? 1 : 0;
}

/**
 * Verifica si hay observaciones
 */
function tieneObservaciones(obs: ObservacionCumplimiento[] | string | undefined): boolean {
  return contarObservaciones(obs) > 0;
}

/**
 * Calcula el % de avance basado en cortes de seguimiento.
 * Solo cuenta los cortes cuya fechaProgramada <= hoy.
 * Un corte se considera cumplido si tiene ≥1 EntradaSeguimiento con fechaRegistro <= fechaProgramada del corte.
 */
function calcularPorcentajeCortes(actividad: Actividad): number {
  const cortes = actividad.puntosControl;
  const entradas = actividad.entradasSeguimiento || [];
  if (!cortes || cortes.length === 0) return actividad.porcentajeAvance;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Cumplido = tiene al menos una entrada, sin importar si la fecha ya venció o es futura
  const cumplidos = cortes.filter(corte =>
    entradas.some(e => e.puntoControlId === corte.id)
  );

  return Math.round((cumplidos.length / cortes.length) * 100);
}

/** Días restantes hasta una fecha (negativo = ya venció) */
function diasHastaFecha(fechaISO: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fechaISO + 'T00:00:00');
  return Math.round((f.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

interface Rol {
  id?: string; // ID del rol desde el backend (requerido para crear actividades)
  numero: number;
  nombre: string;
  color: string;
  icono: string;
  descripcion: string;
  actividades: Actividad[];
}

interface HistorialAprobacion {
  auditorId: string;
  auditorNombre: string;
  estado: 'PENDIENTE' | 'OBSERVADA' | 'APROBADA';
  observacion?: string;
  fecha?: string;
  firmaElectronica?: FirmaElectronicaMetadata;
  respuestaSubsanacion?: string;
  fechaRespuesta?: string;
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
  equipoAprobacion?: Auditor[];
  ordenAprobacion?: 'secuencial' | 'paralelo';
  historialAprobaciones?: HistorialAprobacion[];
}

// Auditores - Valor por defecto mientras se cargan del backend
const AUDITORES_DEFAULT: Auditor[] = [
  { id: '1', nombre: 'Cargando...', cargo: 'Auditor', email: '' }
];

// Roles (debe coincidir con el principal)
const ROLES_DECRETO_648: Omit<Rol, 'actividades'>[] = [
  { numero: 1, nombre: 'Liderazgo estratégico', color: '#2962FF', icono: '🎯', descripcion: 'Asesorar y acompañar a la alta dirección' },
  { numero: 2, nombre: 'Enfoque hacia la prevención', color: '#00C853', icono: '🛡️', descripcion: 'Promover actividades preventivas' },
  { numero: 3, nombre: 'Evaluación de la gestión del riesgo', color: '#FF6D00', icono: '⚠️', descripcion: 'Evaluar sistema de gestión de riesgos' },
  { numero: 4, nombre: 'Evaluación y seguimiento', color: '#AA00FF', icono: '✓', descripcion: 'Evaluar diseño y efectividad del sistema de control interno' },
  { numero: 5, nombre: 'Relación con entes externos de control', color: '#C62828', icono: '⚖️', descripcion: 'Coordinar con entes externos' }
];

// Tipo para configuración de roles en el wizard
interface ActividadBase {
  id?: string; // ⚡ ID único para identificar cada actividad
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  control: string;
  evaluacion: string;
  seguimiento: string;
  tareasSeguimiento?: TareaSeguimiento[];
  requiereAutorizacionJefeOCI?: boolean; // Checkbox      por actividad
  tipoEvidencia?: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO'; // Tipo de evidencia requerida
  responsables?: Auditor[]; // ✅ Responsables por actividad (múltiples)
  fechaCorte?: string; // Fecha límite de corte para la actividad
  // ✅ NUEVO: Configuración de puntos de control
  puntosControl?: PuntoControl[];
  frecuenciaPuntosControl?: FrecuenciaPuntoControl;
}

interface RolConfig extends Omit<Rol, 'actividades'> {
  actividadesSeleccionadas: ActividadBase[];
  actividadesCustom: ActividadBase[];
  responsables: Auditor[];
}

// Función para obtener actividades por rol desde el archivo principal
function getActividadesPorRol(numeroRol: number): ActividadBase[] {
  // ════════════════════════════════════════════════════════════════════════════
  // ACTIVIDADES OFICIALES DECRETO 648/2017 - SINCRONIZADO CON EXCEL ESAP
  // ════════════════════════════════════════════════════════════════════════════
  const actividadesPorRol: Record<number, ActividadBase[]> = {
    // ═══════════════════ ROL 1: LIDERAZGO ESTRATÉGICO (46) ═══════════════════
    1: [
      { 
        nombre: 'Establecer canales de comunicación directa con el Director Nacional de la ESAP', 
        descripcion: 'Mantener comunicación permanente con la dirección sobre temas estratégicos de control interno', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '50% avance', 
        seguimiento: 'Publicar todos los informes de gestión en la página web institucional y allegar al correo del Director. Enviar comunicaciones internas hechas a los procesos de la ESAP al Señor Director.',
        tareasSeguimiento: [
          { id: 'r1-a1-t1', descripcion: 'Publicar todos los informes de gestión en la página web institucional y allegar al correo del Director', completada: false },
          { id: 'r1-a1-t2', descripcion: 'Enviar comunicaciones internas hechas a los procesos de la ESAP al Señor Director', completada: false },
        ]
      },
      { 
        nombre: 'Verificar a través del Plan anual de auditorías, el cumplimiento de metas, indicadores, procesos estratégicos de la entidad y riesgos asociados a estos', 
        descripcion: 'Revisar cumplimiento de objetivos institucionales y riesgos asociados', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento cuatrimestral.', 
        evaluacion: '50% avance', 
        seguimiento: 'Socializar resultados en el Comité Institucional de Gestión y Desempeño',
        tareasSeguimiento: [
          { id: 'r1-a2-t1', descripcion: 'Socializar resultados en el Comité Institucional de Gestión y Desempeño', completada: false },
        ]
      },
      { 
        nombre: 'Establecer en el Comité de Gestión y Desempeño la periodicidad y alcance de rendición de informes estratégicos', 
        descripcion: 'Definir en el comité de gestión y desempeño la periodicidad de rendición de informes', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento anual.', 
        evaluacion: '10% avance', 
        seguimiento: 'Socializar Plan Anual de Auditoría en el Comité Institucional de Gestión y Desempeño',
        tareasSeguimiento: [
          { id: 'r1-a3-t1', descripcion: 'Socializar Plan Anual de Auditoría en el Comité Institucional de Gestión y Desempeño', completada: false },
        ]
      },
      { 
        nombre: 'Presentar ante el Comité Institucional de Coordinación de Control Interno los resultados de la evaluación de la operación de la primera y segunda línea de defensa. Analizar las variaciones del ambiente organizacional y del entorno, identificando procesos críticos, controles y servicios que tengan un impacto significativo en el cumplimiento de los objetivos institucionales', 
        descripcion: 'Evaluar operación de primera y segunda línea de defensa ante el CICC', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Hacer informe de los resultados de la evaluación independiente del Estado del Sistema de Control Interno, a través de sus cinco (5) componentes y publicar en la página web',
        tareasSeguimiento: [
          { id: 'r1-a4-t1', descripcion: 'Hacer informe de los resultados de la evaluación independiente del Estado del Sistema de Control Interno, a través de sus cinco (5) componentes', completada: false },
          { id: 'r1-a4-t2', descripcion: 'Publicar en la página web', completada: false },
        ]
      },
      { 
        nombre: 'Informar al jefe de la entidad sobre las alertas de riesgo fiscal identificadas y en general los resultados de los ejercicios de auditoría y se planteen recomendaciones estratégicas para el fortalecimiento y la prevención', 
        descripcion: 'Comunicar al jefe de la entidad sobre alertas identificadas en auditorías', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace informe cuatrimestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Hacer informe, publicar en la página web, diligenciar el seguimiento como tercera línea en ISOLUCION',
        tareasSeguimiento: [
          { id: 'r1-a5-t1', descripcion: 'Hacer informe', completada: false },
          { id: 'r1-a5-t2', descripcion: 'Publicar en la página web', completada: false },
          { id: 'r1-a5-t3', descripcion: 'Diligenciar el seguimiento como tercera línea en ISOLUCION', completada: false },
        ]
      },
      { 
        nombre: 'Participación frente a los procesos de empalme cuando se dan cambios de administración', 
        descripcion: 'Acompañar procesos de transición cuando hay cambios de administración', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: '', 
        evaluacion: '0% avance', 
        seguimiento: 'Se hace seguimiento el último año',
        tareasSeguimiento: [
          { id: 'r1-a6-t1', descripcion: 'Se hace seguimiento el último año', completada: false },
        ]
      }
    ],
    // ═══════════════════ ROL 2: ENFOQUE HACIA LA PREVENCIÓN (60) ═══════════════════
    2: [
      { 
        nombre: 'Programar en los comités institucionales más estratégicos (gestión y desempeño institucional, de coordinación de control interno, de gerencia u otro), sesiones que sensibilicen sobre la articulación del sistema de control interno y el control externo', 
        descripcion: 'Programar sesiones en comités estratégicos sobre la articulación del sistema de control interno y el control externo', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Socializar articulación del sistema de control interno y el control externo (Guía de auditoría)',
        tareasSeguimiento: [
          { id: 'r2-a1-t1', descripcion: 'Socializar articulación del sistema de control interno y el control externo (Guía de auditoría)', completada: false },
        ]
      },
      { 
        nombre: 'Acompañar a los procesos en la formulación de planes de mejoramiento', 
        descripcion: 'Asesorar a los procesos en la formulación de planes de mejoramiento', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento trimestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Asesorar y suministrar herramientas como el diagrama causa efecto',
        tareasSeguimiento: [
          { id: 'r2-a2-t1', descripcion: 'Asesorar y suministrar herramientas como el diagrama causa efecto', completada: false },
        ]
      },
      { 
        nombre: 'Adoptar formalmente un procedimiento para el seguimiento al Plan de Mejoramiento, con esquema de semaforización que genere informe de alertas a los responsables internos. Hacer mesas de trabajo con los responsables de las acciones que se encuentren en alguna de las alertas', 
        descripcion: 'Formalizar procedimiento con semaforización y alertas a responsables', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento anual.', 
        evaluacion: '60% avance', 
        seguimiento: 'Documentar procedimiento y formato para hacer seguimiento al cumplimiento y efectividad de las acciones de mejora',
        tareasSeguimiento: [
          { id: 'r2-a3-t1', descripcion: 'Documentar procedimiento para hacer seguimiento al cumplimiento y efectividad de las acciones de mejora', completada: false },
          { id: 'r2-a3-t2', descripcion: 'Documentar formato para hacer seguimiento al cumplimiento y efectividad de las acciones de mejora', completada: false },
        ]
      },
      { 
        nombre: 'Elaborar y presentar, en el marco del Comité Institucional de Coordinación de Control Interno un informe en relación con el avance del plan de mejoramiento', 
        descripcion: 'Informar sobre el estado de avance del plan de mejoramiento institucional', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento trimestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
        tareasSeguimiento: [
          { id: 'r2-a4-t1', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno', completada: false },
        ]
      },
      { 
        nombre: 'Hacer seguimiento a decisiones en firme de órganos de control e investigación sobre procesos penales, fiscales y disciplinarios derivados de hallazgos o denuncias relacionadas con la entidad', 
        descripcion: 'Monitorear procesos penales, fiscales y disciplinarios relacionados con la entidad', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
        tareasSeguimiento: [
          { id: 'r2-a5-t1', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno', completada: false },
        ]
      },
      { 
        nombre: 'Desarrollar diagnósticos para la mejora en la gestión del riesgo en todos sus ámbitos', 
        descripcion: 'Realizar diagnósticos en todos los ámbitos de gestión del riesgo', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Establecer a través de la auditoría interna la efectividad de los controles para evitar la materialización de riesgos y socializar en el Comité Institucional de Coordinación de Control Interno',
        tareasSeguimiento: [
          { id: 'r2-a6-t1', descripcion: 'Establecer a través de la auditoría interna la efectividad de los controles para evitar la materialización de riesgos', completada: false },
          { id: 'r2-a6-t2', descripcion: 'Socializar en el Comité Institucional de Coordinación de Control Interno', completada: false },
        ]
      },
      { 
        nombre: 'Asesorar a la alta dirección para la articulación del esquema de líneas de defensa', 
        descripcion: 'Acompañar a la alta dirección en la implementación de las tres líneas de defensa', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Realizar capacitaciones del esquema de tres líneas de defensa del Sistema de Control Interno',
        tareasSeguimiento: [
          { id: 'r2-a7-t1', descripcion: 'Realizar capacitaciones del esquema de tres líneas de defensa del Sistema de Control Interno', completada: false },
        ]
      },
      { 
        nombre: 'Establecer una estrategia de acompañamiento de la batería de indicadores y diseño de tableros de control', 
        descripcion: 'Establecer estrategia para el diseño y seguimiento de indicadores', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Realizar capacitaciones',
        tareasSeguimiento: [
          { id: 'r2-a8-t1', descripcion: 'Realizar capacitaciones', completada: false },
        ]
      }
    ],
    // ═══════════════════ ROL 3: EVALUACIÓN DE LA GESTIÓN DEL RIESGO (48) ═══════════════════
    3: [
      { 
        nombre: 'Revisar la adecuación y/o actualización de la política de administración del riesgo y si se evalúa periódicamente su implementación', 
        descripcion: 'Evaluar actualización y cumplimiento de la política de gestión del riesgo', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '48% avance', 
        seguimiento: 'Revisar que está formalizada a través de acto administrativo o actuación administrativa y que contenga (objetivo, alcance, niveles de aceptación del riesgo, niveles para calificar el impacto, tratamiento del riesgo) de conformidad con la Guía para la Administración del Riesgo y el diseño de controles en entidades públicas',
        tareasSeguimiento: [
          { id: 'r3-a1-t1', descripcion: 'Revisar que está formalizada a través de acto administrativo o actuación administrativa', completada: false },
          { id: 'r3-a1-t2', descripcion: 'Verificar que contenga: objetivo, alcance, niveles de aceptación del riesgo, niveles para calificar el impacto, tratamiento del riesgo', completada: false },
          { id: 'r3-a1-t3', descripcion: 'Validar conformidad con la Guía para la Administración del Riesgo y el diseño de controles en entidades públicas', completada: false },
        ]
      },
      { 
        nombre: 'Promover escenarios para que la dirección comprenda el valor de la gestión de riesgos como paso previo para promover el proceso en toda la organización. Proporcionar la información de riesgos para que la alta dirección la utilice en la toma de decisiones', 
        descripcion: 'Generar escenarios para que la dirección comprenda la importancia de la gestión de riesgos', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '48% avance', 
        seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
        tareasSeguimiento: [
          { id: 'r3-a2-t1', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno', completada: false },
        ]
      },
      { 
        nombre: 'Evaluar prácticas actuales de gestión del riesgo para migrar a esquemas más efectivos. Articular ejercicios de seguimiento y monitoreo en el marco del Esquema de las líneas de defensa', 
        descripcion: 'Migrar a esquemas más efectivos y articular ejercicios de seguimiento y monitoreo en el marco del Esquema de las líneas de defensa', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento cuatrimestral.', 
        evaluacion: '48% avance', 
        seguimiento: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno',
        tareasSeguimiento: [
          { id: 'r3-a3-t1', descripcion: 'Socializar resultados en el Comité Institucional de Coordinación de Control Interno', completada: false },
        ]
      }
    ],
    // ═══════════════════ ROL 4: EVALUACIÓN Y SEGUIMIENTO (60) ═══════════════════
    4: [
      { 
        nombre: 'Efectuar auditorías internas con enfoque preventivo y las especiales acorde al programa de auditoria', 
        descripcion: 'Realizar auditorías internas y especiales conforme al programa anual', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento mensual.', 
        evaluacion: '60% avance', 
        seguimiento: 'Realizar seguimiento al cumplimiento de ejecución de las auditorías establecidas en el Programa de Auditoría',
        tareasSeguimiento: [
          { id: 'r4-a1-t1', descripcion: 'Realizar seguimiento al cumplimiento de ejecución de las auditorías establecidas en el Programa de Auditoría', completada: false },
        ]
      },
      { 
        nombre: 'Seguimiento a planes de mejoramiento internos y externos', 
        descripcion: 'Monitorear cumplimiento de planes de mejoramiento derivados de auditorías', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento trimestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Asesorar y suministrar herramientas como el diagrama causa efecto',
        tareasSeguimiento: [
          { id: 'r4-a2-t1', descripcion: 'Asesorar y suministrar herramientas como el diagrama causa efecto', completada: false },
        ]
      },
      { 
        nombre: 'Establecer una estrategia de acompañamiento de la batería de indicadores y diseño de tableros de control', 
        descripcion: 'Fortalecer la medición del desempeño institucional a través del seguimiento de indicadores', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento semestral.', 
        evaluacion: '60% avance', 
        seguimiento: 'Realizar capacitaciones y acompañamiento en el diseño de tableros de control',
        tareasSeguimiento: [
          { id: 'r4-a3-t1', descripcion: 'Realizar capacitaciones en el diseño de tableros de control', completada: false },
          { id: 'r4-a3-t2', descripcion: 'Realizar acompañamiento en el diseño de tableros de control', completada: false },
        ]
      },
      { 
        nombre: 'Adelantar de una manera armónica procesos de auditoría que lleve a cabo el organismo de control', 
        descripcion: 'Coordinación efectiva con entes de control externo durante sus visitas', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: '', 
        evaluacion: '60% avance', 
        seguimiento: 'Dar asesoría y acompañamiento puntuales a los procesos y sus líderes',
        tareasSeguimiento: [
          { id: 'r4-a4-t1', descripcion: 'Dar asesoría y acompañamiento puntuales a los procesos y sus líderes', completada: false },
        ]
      },
      { 
        nombre: 'Presentar informes y seguimientos de ley', 
        descripcion: 'Cumplimiento de todos los informes obligatorios establecidos en el cronograma anual', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento mensual.', 
        evaluacion: '60% avance', 
        seguimiento: 'Realizar seguimiento al cumplimiento de ejecución de los informes establecidos en el cronograma de informes',
        tareasSeguimiento: [
          { id: 'r4-a5-t1', descripcion: 'Realizar seguimiento al cumplimiento de ejecución de los informes establecidos en el cronograma de informes', completada: false },
        ]
      }
    ],
    // ═══════════════════ ROL 5: RELACIÓN CON ENTES EXTERNOS DE CONTROL ═══════════════════
    5: [
      { 
        nombre: 'Brindar asesoría y generar alertas oportunas a los líderes de los procesos o responsables del suministro de información, para evitar la entrega no acorde o inconsistente con las solicitudes del organismo de control', 
        descripcion: 'Alertar a responsables sobre información requerida por organismos de control', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento mensual.', 
        evaluacion: '59% avance', 
        seguimiento: 'Publicar todos los informes de gestión en la página web institucional y allegar al correo del proceso respectivo',
        tareasSeguimiento: [
          { id: 'r5-a1-t1', descripcion: 'Publicar todos los informes de gestión en la página web institucional', completada: false },
          { id: 'r5-a1-t2', descripcion: 'Allegar al correo del proceso respectivo', completada: false },
        ]
      },
      { 
        nombre: 'Alertar a la primera línea de defensa, y en general, a los responsables del aporte de información requerida por órganos de control sobre estos efectos (Conductas generadoras de sanciones)', 
        descripcion: 'Alertar sobre conductas generadoras de sanciones ante órganos de control', 
        fechaInicio: '2026-01-01', 
        fechaFin: '2026-12-31', 
        control: 'Se hace seguimiento mensual.', 
        evaluacion: '59% avance', 
        seguimiento: 'Comunicar oportunamente a los líderes de procesos sobre posibles sanciones',
        tareasSeguimiento: [
          { id: 'r5-a2-t1', descripcion: 'Comunicar oportunamente a los líderes de procesos sobre posibles sanciones', completada: false },
        ]
      },
    ]
  };
  
  return actividadesPorRol[numeroRol] || [];
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE: SELECTOR DE PROFESIONAL DISEÑADO (Combobox)
// ════════════════════════════════════════════════════════════════════════════

function SelectorProfesional({
  auditores,
  onSelect,
  placeholder = "+ Agregar responsable…",
  disabled = false,
  className = ""
}: {
  auditores: Auditor[];
  onSelect: (id: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  const updatePosition = useCallback(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScroll = () => {
        setIsOpen(false); // Close on external scroll to prevent floating away
      };
      // Capture true to catch scroll events from any nested container
      document.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        document.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Allow clicks within the portal dropdown (prevent closing)
      const popup = document.getElementById('selector-profesional-popup');
      if (popup && popup.contains(e.target as Node)) return;
      
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filtrados = auditores.filter(a => 
    a.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    (a.email || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getRoleBadgeColor = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes('jefe') || r.includes('super') || r.includes('director')) return 'bg-purple-100 text-purple-700';
    if (r.includes('líder') || r.includes('lider') || r.includes('senior') || r.includes('sénior')) return 'bg-cyan-100 text-cyan-700';
    if (r.includes('junior') || r.includes('júnior')) return 'bg-green-100 text-green-700';
    if (r.includes('auditado')) return 'bg-amber-100 text-amber-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsOpen(!isOpen); }}
        className={`w-full px-3 py-1.5 border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm text-gray-500 bg-white text-left flex justify-between items-center transition-colors hover:border-blue-400 hover:bg-blue-50 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className="truncate">{placeholder}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && createPortal(
        <AnimatePresence>
          <motion.div 
            id="selector-profesional-popup"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: coords.top,
              left: coords.left,
              width: coords.width,
              zIndex: 99999
            }}
            className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[320px]"
          >
            <div className="p-2 border-b border-gray-100 sticky top-0 bg-gray-50 shadow-sm z-10 flex gap-2 items-center">
              <Search className="w-4 h-4 text-gray-400 absolute left-4" />
              <input
                type="text"
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o email..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={e => e.stopPropagation()}
                onKeyDown={e => {
                  if (e.key === 'Enter' && filtrados.length > 0) {
                     e.preventDefault();
                     onSelect(filtrados[0].id);
                     setIsOpen(false);
                     setBusqueda('');
                  }
                }}
              />
            </div>
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50 py-1">
              {filtrados.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                  No hay profesionales disponibles
                </div>
              ) : (
                filtrados.map(auditor => (
                  <button
                    key={auditor.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onSelect(auditor.id);
                      setIsOpen(false);
                      setBusqueda('');
                    }}
                    className="w-full text-left p-2 hover:bg-blue-50 transition-colors flex items-center gap-3 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[11px] font-black shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {getInitials(auditor.nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{auditor.nombre}</p>
                      <p className="text-[11px] text-gray-400 truncate">{auditor.email || 'jefe.oci@esap.edu.co'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getRoleBadgeColor(auditor.cargo || 'Funcionario')}`}>
                      {auditor.cargo || 'Funcionario'}
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// WIZARD DE CREACIÓN
// ════════════════════════════════════════════════════════════════════════════

interface WizardCreacionProps {
  onCancelar: () => void;
  onCrear: (vigencia: number, jefeOCI: Auditor, rolesConfig: RolConfig[], fechaInicio: string, fechaFin: string) => Promise<boolean>;
  onTerminado?: () => void;
}

export function WizardCreacion({ onCancelar, onCrear, onTerminado }: WizardCreacionProps) {
  const [paso, setPaso] = useState(1);
  const [vigencia, setVigencia] = useState(new Date().getFullYear());
  const [fechaInicio, setFechaInicio] = useState(`${new Date().getFullYear()}-01-01`);
  const [fechaFin, setFechaFin] = useState(`${new Date().getFullYear()}-12-31`);
  const [comiteAprobacion, setComiteAprobacion] = useState<Auditor[]>([]);
  const [ordenAprobacion, setOrdenAprobacion] = useState<'secuencial' | 'paralelo'>('secuencial');
  
  // Estado para auditores cargados desde backend (profesionales OCI configurados)
  const [auditores, setAuditores] = useState<Auditor[]>(AUDITORES_DEFAULT);
  const [jefesOCI, setJefesOCI] = useState<Auditor[]>([]);
  const [cargandoAuditores, setCargandoAuditores] = useState(true);
  const [jefeSeleccionado, setJefeSeleccionado] = useState<Auditor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Función para cargar profesionales OCI (reutilizable)
  const cargarAuditores = async () => {
    setCargandoAuditores(true);
    try {
      // Usar profesionales OCI configurados en lugar de personas disponibles
      const response = await configuracionesProfesionalesOCIApi.getAll();
      console.log('[PlanAnual] Profesionales OCI response:', response);
      
      if (response.success && response.data && response.data.length > 0) {
        // Transformar a formato Auditor
        const profesionales: Auditor[] = response.data
          .filter((config: any) => config.activo)
          .map((config: any) => ({
            id: config.id, // UUID de configuracion_profesionales_OCI
            nombre: config.nombre || `Profesional ${config.idTercero}`,
            cargo: config.rolOcig || config.rolOCI || config.cargo || 'Auditor',
            email: config.email || ''
          }));
        
        setAuditores(profesionales);
        
        // Filtrar solo los que son Jefe OCI
        const jefes = profesionales.filter((a: Auditor) => 
          a.cargo === 'Jefe OCI' || a.cargo.toLowerCase().includes('jefe')
        );
        setJefesOCI(jefes.length > 0 ? jefes : profesionales);
        
        // NO auto-seleccionar: el usuario debe elegir explícitamente el responsable
        
        console.log('[PlanAnual] Profesionales OCI cargados:', profesionales.length);
        return profesionales;
      } else {
        console.warn('[PlanAnual] No hay profesionales OCI configurados');
        toast.warning('No hay profesionales OCI configurados', {
          description: 'Configura el equipo en el módulo de Configuración'
        });
        setAuditores([]);
        setJefesOCI([]);
        return [];
      }
    } catch (error) {
      console.error('[PlanAnual] Error cargando profesionales OCI:', error);
      toast.error('Error al cargar profesionales OCI');
      return [];
    } finally {
      setCargandoAuditores(false);
    }
  };
  
  // Cargar profesionales OCI configurados al montar el componente
  useEffect(() => {
    cargarAuditores();
  }, []);

  // Actualizar fechas de puntos de control cuando cambie la vigencia
  useEffect(() => {
    setRolesConfig(prev => prev.map(rol => ({
      ...rol,
      actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
        const año = vigencia;
        return {
          ...act,
          fechaCorte: `${año}-09-30`,
          puntosControl: [
            { ...act.puntosControl[0], fechaProgramada: `${año}-03-31`, fechaSeguimiento: `${año}-05-31` },
            { ...act.puntosControl[1], fechaProgramada: `${año}-06-30`, fechaSeguimiento: `${año}-08-30` },
            { ...act.puntosControl[2], fechaProgramada: `${año}-09-30`, fechaSeguimiento: `${año}-11-30` },
          ]
        };
      })
    })));
  }, [vigencia]);
  const [rolesConfig, setRolesConfig] = useState<RolConfig[]>(() => 
    ROLES_DECRETO_648.map(rol => {
      const actividades = getActividadesPorRol(rol.numero);
      
      // ⚡ Auto-generar 3 puntos de control trimestrales por actividad (Mar, Jun, Sep)
      const actividadesConPuntos = actividades.map((act, idx) => {
        const uniqueId = `rol-${rol.numero}-act-${idx}`; // ⚡ ID único por rol e índice
        const añoInicial = new Date().getFullYear();
        const puntosDefault: PuntoControl[] = [
          { id: `pc-${uniqueId}-1`, orden: 1, nombre: 'Corte 1', descripcion: '', fechaProgramada: `${añoInicial}-03-31`, fechaSeguimiento: `${añoInicial}-05-31`, fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
          { id: `pc-${uniqueId}-2`, orden: 2, nombre: 'Corte 2', descripcion: '', fechaProgramada: `${añoInicial}-06-30`, fechaSeguimiento: `${añoInicial}-08-30`, fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
          { id: `pc-${uniqueId}-3`, orden: 3, nombre: 'Corte 3', descripcion: '', fechaProgramada: `${añoInicial}-09-30`, fechaSeguimiento: `${añoInicial}-11-30`, fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
        ];
        return {
          ...act,
          id: uniqueId,
          tipoEvidencia: 'SOLO_CHECK' as const,
          fechaCorte: `${añoInicial}-09-30`,
          puntosControl: puntosDefault,
          frecuenciaPuntosControl: 'trimestral' as const,
        };
      });
      
      return {
        ...rol,
        actividadesSeleccionadas: actividadesConPuntos,
        actividadesCustom: [],
        responsables: []
      };
    })
  );

  // Validación del Paso 1: Fechas y vigencia
  const validarPaso1 = () => {
    // Extraer año directamente del string YYYY-MM-DD para evitar problemas de zona horaria
    const anioFechaInicio = fechaInicio ? parseInt(fechaInicio.split('-')[0], 10) : 0;
    const anioFechaFin = fechaFin ? parseInt(fechaFin.split('-')[0], 10) : 0;
    
    // Validar que la fecha fin no sea anterior a fecha inicio (comparación string funciona para YYYY-MM-DD)
    if (fechaFin < fechaInicio) {
      toast.error('Error de fechas', {
        description: 'La fecha de finalización no puede ser anterior a la fecha de inicio'
      });
      return false;
    }
    
    // Validar que las fechas coincidan con la vigencia
    if (anioFechaInicio !== vigencia || anioFechaFin !== vigencia) {
      toast.error('Error de vigencia', {
        description: `Las fechas deben estar dentro de la vigencia ${vigencia}. Fecha inicio: ${anioFechaInicio}, Fecha fin: ${anioFechaFin}`
      });
      return false;
    }
    
    // Validar que haya un responsable seleccionado
    if (!jefeSeleccionado) {
      toast.error('Responsable requerido', {
        description: 'Debe seleccionar un responsable del Plan Anual'
      });
      return false;
    }
    
    return true;
  };

  const validarPaso2 = () => {
    // Validar que hay actividades seleccionadas
    const tieneActividades = rolesConfig.some(rol => 
      rol.actividadesSeleccionadas.length > 0 || rol.actividadesCustom.length > 0
    );
    if (!tieneActividades) {
      toast.error('Debe seleccionar al menos una actividad en algún rol');
      return false;
    }
    
    // ⚠️ VALIDACIÓN OBLIGATORIA: Todos los roles con actividades DEBEN tener responsables
    const rolesConActividades = rolesConfig.filter(rol => 
      (rol.actividadesSeleccionadas?.length || 0) + (rol.actividadesCustom?.length || 0) > 0
    );
    const rolesSinResponsables = rolesConActividades.filter(rol => (rol.responsables?.length || 0) === 0);
    
    if (rolesSinResponsables.length > 0) {
      const nombresRoles = rolesSinResponsables.map(r => `Rol ${r.numero}`).join(', ');
      toast.error('Responsables requeridos', {
        description: `Los siguientes roles tienen actividades pero no tienen responsables asignados: ${nombresRoles}. Debe asignar al menos un responsable por rol.`,
        duration: 6000
      });
      return false;
    }

    // Validar que cada actividad tenga al menos un responsable
    const actividadesSinResponsable: string[] = [];
    for (const rol of rolesConActividades) {
      for (const act of (rol.actividadesSeleccionadas || [])) {
        if (!act.responsables || act.responsables.length === 0) {
          actividadesSinResponsable.push(`"${act.nombre.slice(0, 40)}" (Rol ${rol.numero})`);
        }
      }
      for (const act of (rol.actividadesCustom || [])) {
        if (!act.responsables || act.responsables.length === 0) {
          actividadesSinResponsable.push(`"${act.nombre.slice(0, 40)}" (Rol ${rol.numero} personalizada)`);
        }
      }
    }
    if (actividadesSinResponsable.length > 0) {
      toast.error('Responsable requerido por actividad', {
        description: `Las siguientes actividades no tienen responsable: ${actividadesSinResponsable.slice(0, 3).join(', ')}${actividadesSinResponsable.length > 3 ? ` y ${actividadesSinResponsable.length - 3} más` : ''}.`,
        duration: 7000
      });
      return false;
    }

    // Validar que cada actividad tenga fecha de corte
    const actividadesSinFechaCorte: string[] = [];
    for (const rol of rolesConActividades) {
      for (const act of (rol.actividadesSeleccionadas || [])) {
        if (!act.fechaCorte) {
          actividadesSinFechaCorte.push(`"${act.nombre.slice(0, 40)}" (Rol ${rol.numero})`);
        }
      }
      for (const act of (rol.actividadesCustom || [])) {
        if (!act.fechaCorte) {
          actividadesSinFechaCorte.push(`"${act.nombre.slice(0, 40)}" (Rol ${rol.numero} personalizada)`);
        }
      }
    }
    if (actividadesSinFechaCorte.length > 0) {
      toast.error('Fecha de corte requerida', {
        description: `Las siguientes actividades no tienen fecha de corte: ${actividadesSinFechaCorte.slice(0, 3).join(', ')}${actividadesSinFechaCorte.length > 3 ? ` y ${actividadesSinFechaCorte.length - 3} más` : ''}.`,
        duration: 7000
      });
      return false;
    }
    
    // Contar total de actividades y responsables
    const totalActividades = rolesConActividades.reduce((sum, rol) => 
      sum + (rol.actividadesSeleccionadas?.length || 0) + (rol.actividadesCustom?.length || 0), 0
    );
    const totalResponsables = rolesConActividades.reduce((sum, rol) => 
      sum + (rol.responsables?.length || 0), 0
    );
    
    console.log(`✅ [validarPaso2] Validación exitosa:`);
    console.log(`   - ${rolesConActividades.length} roles con actividades`);
    console.log(`   - ${totalActividades} actividades totales`);
    console.log(`   - ${totalResponsables} responsables asignados`);
    
    return true;
  };

  const avanzarPaso = () => {
    if (paso === 1 && !validarPaso1()) return;
    if (paso === 2 && !validarPaso2()) return;
    setPaso(paso + 1);
  };

    const handleFinalizar = async () => {
    // Validación final de seguridad antes de crear el plan
    const rolesConActividades = rolesConfig.filter(rol => 
      (rol.actividadesSeleccionadas?.length || 0) + (rol.actividadesCustom?.length || 0) > 0
    );
    const totalResponsables = rolesConActividades.reduce((sum, rol) => 
      sum + (rol.responsables?.length || 0), 0
    );
    
    if (totalResponsables === 0) {
      toast.error('No se puede crear el Plan Anual', {
        description: 'Debe asignar al menos un responsable a las actividades antes de crear el plan.',
        duration: 5000
      });
      return;
    }
    
    // Validación de seguridad para TypeScript (ya se validó en validarPaso1)
    if (!jefeSeleccionado) {
      toast.error('Debe seleccionar un responsable del Plan');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const exito = await onCrear(vigencia, jefeSeleccionado, rolesConfig, fechaInicio, fechaFin, comiteAprobacion, ordenAprobacion);
      setIsSubmitting(false);
      
      if (exito) {
        setShowSuccessModal(true);
      }
    } catch (e: any) {
      setIsSubmitting(false);
      toast.error('Error al enviar el plan', { description: e?.message || 'Error desconocido' });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col bg-white relative"
    >
      {/* Success Modal Overlay (Portaled to body to cover whole screen) */}
      {showSuccessModal && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Fondo blanco difuminado intenso */}
          <div className="absolute inset-0 bg-white/70 backdrop-blur-md" />
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="relative bg-white rounded-2xl shadow-2xl border-2 border-gray-200 w-full max-w-md p-8 text-center z-10"
          >
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Plan Creado con Éxito!</h2>
            <p className="text-gray-600 mb-8 border-b pb-8">
              El Plan Anual de Auditoría {vigencia} ha sido guardado correctamente. Ahora puedes revisarlo desde el Dashboard.
            </p>
            <button
              onClick={() => onTerminado?.()}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow hover:shadow-md flex items-center justify-center gap-2"
            >
              Ir al Dashboard <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        </div>,
        document.body
      )}
      {/* Header */}
      <div className="border-b-2 border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={onCancelar} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Crear Plan Anual</h1>
              <p className="text-sm text-gray-600">Paso {paso} de 3</p>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((num) => (
            <div key={num} className={`flex-1 h-2 rounded-full ${num <= paso ? 'bg-blue-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {paso === 1 && (
              <Paso1 
                key="paso1" 
                vigencia={vigencia} 
                onVigenciaChange={setVigencia} 
                jefeOCI={jefeSeleccionado} 
                onJefeChange={setJefeSeleccionado}
                fechaInicio={fechaInicio}
                onFechaInicioChange={setFechaInicio}
                fechaFin={fechaFin}
                onFechaFinChange={setFechaFin}
                auditores={auditores}
                cargandoAuditores={cargandoAuditores}
                onRecargarAuditores={cargarAuditores}
              />
            )}
            {paso === 2 && <Paso2 key="paso2" rolesConfig={rolesConfig} onRolesChange={setRolesConfig} fechaInicio={fechaInicio} fechaFin={fechaFin} auditores={auditores} jefeOCI={jefeSeleccionado} />}
            {paso === 3 && (
              <Paso3 
                key="paso3" 
                vigencia={vigencia} 
                jefeOCI={jefeSeleccionado} 
                rolesConfig={rolesConfig} 
                auditores={auditores}
                comiteAprobacion={comiteAprobacion}
                setComiteAprobacion={setComiteAprobacion}
                ordenAprobacion={ordenAprobacion}
                setOrdenAprobacion={setOrdenAprobacion}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-200 px-8 py-4 flex justify-between bg-white">
        <button onClick={onCancelar} className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium">
          Cancelar
        </button>
        <div className="flex gap-3">
          {paso > 1 && (
            <button onClick={() => setPaso(paso - 1)} className="px-6 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
              Anterior
            </button>
          )}
          {paso < 3 ? (
            <button 
              onClick={avanzarPaso} 
              disabled={paso === 1 && (!jefeSeleccionado || !fechaInicio || !fechaFin || fechaFin < fechaInicio || parseInt(fechaInicio.split('-')[0], 10) !== vigencia || parseInt(fechaFin.split('-')[0], 10) !== vigencia)}
              className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                paso === 1 && (!jefeSeleccionado || !fechaInicio || !fechaFin || fechaFin < fechaInicio || parseInt(fechaInicio.split('-')[0], 10) !== vigencia || parseInt(fechaFin.split('-')[0], 10) !== vigencia)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
              }`}
            >
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button 
              onClick={handleFinalizar} 
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Crear
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Paso 1: Configuración básica
function Paso1({ vigencia, onVigenciaChange, jefeOCI, onJefeChange, fechaInicio, onFechaInicioChange, fechaFin, onFechaFinChange, auditores, cargandoAuditores }: any) {
  // Validaciones de fechas - Extraer año directamente del string YYYY-MM-DD para evitar problemas de zona horaria
  const anioFechaInicio = fechaInicio ? parseInt(fechaInicio.split('-')[0], 10) : vigencia;
  const anioFechaFin = fechaFin ? parseInt(fechaFin.split('-')[0], 10) : vigencia;
  
  // Comparar fechas como strings (formato YYYY-MM-DD se compara correctamente alfabéticamente)
  const errorFechaFinAnterior = fechaFin && fechaInicio && fechaFin < fechaInicio;
  const errorVigenciaNoCoincide = (anioFechaInicio !== vigencia || anioFechaFin !== vigencia);
  
  // Handler para fecha inicio que ajusta automáticamente la fecha fin si es necesario
  const handleFechaInicioChange = (nuevaFechaInicio: string) => {
    onFechaInicioChange(nuevaFechaInicio);
    // Si la fecha fin es anterior a la nueva fecha inicio, ajustar automáticamente
    if (fechaFin && fechaFin < nuevaFechaInicio) {
      onFechaFinChange(nuevaFechaInicio);
    }
  };

  // Handler para vigencia que ajusta las fechas automáticamente
  const handleVigenciaChange = (nuevaVigencia: number) => {
    onVigenciaChange(nuevaVigencia);
    // Ajustar fechas al cambiar vigencia
    onFechaInicioChange(`${nuevaVigencia}-01-01`);
    onFechaFinChange(`${nuevaVigencia}-12-31`);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Configuración básica</h2>
        <p className="text-gray-600">Define la vigencia, periodo de ejecución y el responsable del plan</p>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-8 space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Vigencia <span className="text-red-500">*</span></label>
          <input 
            type="number" 
            value={vigencia} 
            onChange={(e) => handleVigenciaChange(parseInt(e.target.value))} 
            min={2020}
            max={2100}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-lg font-bold focus:outline-none focus:border-blue-500" 
          />
          <p className="text-xs text-gray-500 mt-1">Al cambiar la vigencia, las fechas se ajustarán automáticamente</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha de inicio <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              value={fechaInicio} 
              onChange={(e) => handleFechaInicioChange(e.target.value)}
              min={`${vigencia}-01-01`}
              max={`${vigencia}-12-31`}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                errorVigenciaNoCoincide && anioFechaInicio !== vigencia
                  ? 'border-red-500 bg-red-50 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errorVigenciaNoCoincide && anioFechaInicio !== vigencia && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ El año de la fecha ({anioFechaInicio}) debe coincidir con la vigencia ({vigencia})
              </p>
            )}
            {!errorVigenciaNoCoincide && (
              <p className="text-xs text-gray-500 mt-1">Ajusta al calendario académico o institucional</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">Fecha de finalización <span className="text-red-500">*</span></label>
            <input 
              type="date" 
              value={fechaFin} 
              onChange={(e) => onFechaFinChange(e.target.value)}
              min={fechaInicio || `${vigencia}-01-01`}
              max={`${vigencia}-12-31`}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none ${
                errorFechaFinAnterior || (errorVigenciaNoCoincide && anioFechaFin !== vigencia)
                  ? 'border-red-500 bg-red-50 focus:border-red-500' 
                  : 'border-gray-300 focus:border-blue-500'
              }`}
            />
            {errorFechaFinAnterior && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ La fecha de finalización no puede ser anterior a la fecha de inicio
              </p>
            )}
            {!errorFechaFinAnterior && errorVigenciaNoCoincide && anioFechaFin !== vigencia && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ El año de la fecha ({anioFechaFin}) debe coincidir con la vigencia ({vigencia})
              </p>
            )}
            {!errorFechaFinAnterior && !errorVigenciaNoCoincide && (
              <p className="text-xs text-gray-500 mt-1">Define el cierre del plan anual</p>
            )}
          </div>
        </div>

        {/* Alerta de errores de validación */}
        {(errorFechaFinAnterior || errorVigenciaNoCoincide) && (
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Corrige los errores para continuar</p>
              <ul className="text-sm text-red-700 mt-1 space-y-1">
                {errorFechaFinAnterior && (
                  <li>• La fecha de finalización debe ser igual o posterior a la fecha de inicio</li>
                )}
                {errorVigenciaNoCoincide && (
                  <li>• Las fechas de inicio y fin deben estar dentro de la vigencia {vigencia}</li>
                )}
              </ul>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Responsable del Plan <span className="text-red-500">*</span></label>
          {cargandoAuditores ? (
            <div className="flex items-center gap-2 px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span className="text-gray-600">Cargando profesionales OCI...</span>
            </div>
          ) : (() => {
            // Solo mostrar profesionales con base en las reglas de negocio y perfil normativo
            const responsablesAutorizados = auditores.filter((a: any) => 
              REGLAS_NEGOCIO_OCIG.ROLES_RESPONSABLES_PLAN_ANUAL.esAutorizadoParaResponsablePlan(a.cargo)
            );
            return responsablesAutorizados.length === 0 ? (
              <div className="flex items-center gap-2 px-4 py-3 border-2 border-orange-300 rounded-lg bg-orange-50">
                <AlertCircle className="w-5 h-5 text-orange-600" />
                <span className="text-orange-700">No hay profesionales con rol Jefe OCIG o Auditor Líder configurados. Configure uno en Profesionales OCI.</span>
              </div>
            ) : (
              <select 
                value={jefeOCI?.id || ''} 
                onChange={(e) => onJefeChange(responsablesAutorizados.find((a: any) => a.id === e.target.value))} 
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">Seleccionar responsable...</option>
                {responsablesAutorizados.map((a: any) => (
                  <option key={a.id} value={a.id}>{a.nombre} - {a.cargo || 'Jefe OCIG'}</option>
                ))}
              </select>
            );
          })()}
          <p className="text-xs text-gray-500 mt-1">Solo profesionales con rol Jefe OCIG o Auditor Líder pueden ser responsables del Plan Anual</p>
        </div>
      </div>
    </motion.div>
  );
}

// Paso 2: Configuración de roles, actividades y responsables
function Paso2({ 
  rolesConfig, 
  onRolesChange,
  fechaInicio,
  fechaFin,
  auditores,
  jefeOCI
}: { 
  rolesConfig: RolConfig[]; 
  onRolesChange: (config: RolConfig[]) => void;
  fechaInicio: string;
  fechaFin: string;
  auditores: Auditor[];
  jefeOCI?: Auditor | null;
}) {
  const [rolExpandido, setRolExpandido] = useState<number | string | null>(1);
  const [mostrarFormActividad, setMostrarFormActividad] = useState<number | string | null>(null);
  const [nuevaActividad, setNuevaActividad] = useState<ActividadBase>({
    nombre: '',
    descripcion: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    control: 'Seguimiento trimestral',
    evaluacion: '0% avance',
    seguimiento: 'Por definir'
  });

  // ✅ NUEVO: Estado para configuración de puntos de control
  const [modalPuntosControlAbierto, setModalPuntosControlAbierto] = useState(false);
  const [actividadConfigurando, setActividadConfigurando] = useState<{
    numeroRol: number;
    nombreActividad: string;
    esCustom: boolean;
    indexCustom?: number;
  } | null>(null);

  const toggleActividad = (numeroRol: number, actId: string, nombreActividad: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        const yaSeleccionada = rol.actividadesSeleccionadas.some(a => a.id === actId);
        if (yaSeleccionada) {
          // Deseleccionar
          return {
            ...rol,
            actividadesSeleccionadas: rol.actividadesSeleccionadas.filter(a => a.id !== actId)
          };
        } else {
          // Seleccionar
          const actividadBase = getActividadesPorRol(numeroRol)?.find(a => a.nombre === nombreActividad);
          if (actividadBase) {
            // Auto-asignar primer responsable del rol si existe
            const primerResponsable = rol.responsables?.[0];
            // Auto-generar 3 puntos de control trimestrales (31 Mar, 30 Jun, 30 Sep)
            const año = vigencia;
            const puntosDefault: PuntoControl[] = [
              { id: `pc-${actId}-1`, orden: 1, nombre: 'Corte 1', descripcion: '', fechaProgramada: `${año}-03-31`, fechaSeguimiento: `${año}-05-31`, fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
              { id: `pc-${actId}-2`, orden: 2, nombre: 'Corte 2', descripcion: '', fechaProgramada: `${año}-06-30`, fechaSeguimiento: `${año}-08-30`, fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
              { id: `pc-${actId}-3`, orden: 3, nombre: 'Corte 3', descripcion: '', fechaProgramada: `${año}-09-30`, fechaSeguimiento: `${año}-11-30`, fechaReal: null, responsable: '', estado: 'pendiente' as const, observaciones: '', evidencias: [] },
            ];
            return {
              ...rol,
              actividadesSeleccionadas: [...rol.actividadesSeleccionadas, {
                ...actividadBase,
                id: actId,
                tipoEvidencia: 'SOLO_CHECK' as const,
                fechaCorte: `${año}-09-30`,
                responsables: primerResponsable ? [primerResponsable] : [],
                puntosControl: puntosDefault,
                frecuenciaPuntosControl: 'trimestral' as const,
              }]
            };
          }
        }
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  const estaSeleccionada = (actId: string) => {
    return rolesConfig.some(rol => rol.actividadesSeleccionadas.some(a => a.id === actId));
  };

  const toggleAutorizacionJefeOCI = (actId: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      return {
        ...rol,
        actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
          if (act.id === actId) {
            return {
              ...act,
              requiereAutorizacionJefeOCI: !act.requiereAutorizacionJefeOCI
            };
          }
          return act;
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const cambiarTipoEvidencia = (actId: string, tipo: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO') => {
    const nuevaConfig = rolesConfig.map(rol => {
      return {
        ...rol,
        actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
          if (act.id === actId) {
            return {
              ...act,
              tipoEvidencia: tipo
            };
          }
          return act;
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const agregarActividadCustom = (numeroRol: number) => {
    if (!nuevaActividad.nombre.trim()) {
      toast.error('El nombre de la actividad es obligatorio');
      return;
    }

    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: [...rol.actividadesCustom, { 
            ...nuevaActividad,
            // ⚡ Valor por defecto: SOLO_CHECK (sin requisitos de documentos/observaciones)
            tipoEvidencia: 'SOLO_CHECK' as const
          }]
        };
      }
      return rol;
    });

    onRolesChange(nuevaConfig);
    toast.success('Actividad personalizada agregada');
    setNuevaActividad({
      nombre: '',
      descripcion: '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaFin: new Date().toISOString().split('T')[0],
      control: 'Seguimiento trimestral',
      evaluacion: '0% avance',
      seguimiento: 'Por definir'
    });
    setMostrarFormActividad(null);
  };

  const eliminarActividadCustom = (numeroRol: number, index: number) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.filter((_, i) => i !== index)
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
    toast.success('Actividad eliminada');
  };

  const toggleAutorizacionCustom = (numeroRol: number, index: number) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.map((act, i) => {
            if (i === index) {
              return {
                ...act,
                requiereAutorizacionJefeOCI: !act.requiereAutorizacionJefeOCI
              };
            }
            return act;
          })
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  const cambiarTipoEvidenciaCustom = (numeroRol: number, index: number, tipo: 'SOLO_CHECK' | 'OBSERVACIONES' | 'ADJUNTOS' | 'COMPLETO') => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        return {
          ...rol,
          actividadesCustom: rol.actividadesCustom.map((act, i) => {
            if (i === index) {
              return {
                ...act,
                tipoEvidencia: tipo
              };
            }
            return act;
          })
        };
      }
      return rol;
    });
    onRolesChange(nuevaConfig);
  };

  // ✅ Funciones para asignar responsables por actividad
  const agregarResponsableActividad = (actId: string, auditor: Auditor) => {
    const nuevaConfig = rolesConfig.map(rol => ({
      ...rol,
      actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
        if (act.id === actId) {
          const yaAsignado = (act.responsables || []).some(r => r.id === auditor.id);
          if (yaAsignado) return act;
          return { ...act, responsables: [...(act.responsables || []), auditor] };
        }
        return act;
      })
    }));
    onRolesChange(nuevaConfig);
  };

  const quitarResponsableActividad = (actId: string, auditorId: string) => {
    const nuevaConfig = rolesConfig.map(rol => ({
      ...rol,
      actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
        if (act.id === actId) {
          return { ...act, responsables: (act.responsables || []).filter(r => r.id !== auditorId) };
        }
        return act;
      })
    }));
    onRolesChange(nuevaConfig);
  };

  const agregarResponsableCustom = (numeroRol: number, index: number, auditor: Auditor) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero !== numeroRol) return rol;
      return {
        ...rol,
        actividadesCustom: rol.actividadesCustom.map((act, i) => {
          if (i !== index) return act;
          const yaAsignado = (act.responsables || []).some(r => r.id === auditor.id);
          if (yaAsignado) return act;
          return { ...act, responsables: [...(act.responsables || []), auditor] };
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const quitarResponsableCustom = (numeroRol: number, index: number, auditorId: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero !== numeroRol) return rol;
      return {
        ...rol,
        actividadesCustom: rol.actividadesCustom.map((act, i) => {
          if (i !== index) return act;
          return { ...act, responsables: (act.responsables || []).filter(r => r.id !== auditorId) };
        })
      };
    });
    onRolesChange(nuevaConfig);
  };

  const setFechaCorteActividad = (actId: string, fecha: string) => {
    const nuevaConfig = rolesConfig.map(rol => ({
      ...rol,
      actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act =>
        act.id === actId ? { ...act, fechaCorte: fecha } : act
      )
    }));
    onRolesChange(nuevaConfig);
  };

  const setFechaCorteCustom = (numeroRol: number, index: number, fecha: string) => {
    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero !== numeroRol) return rol;
      return {
        ...rol,
        actividadesCustom: rol.actividadesCustom.map((act, i) =>
          i === index ? { ...act, fechaCorte: fecha } : act
        )
      };
    });
    onRolesChange(nuevaConfig);
  };

  // ✅ NUEVO: Funciones para configurar puntos de control
  const abrirConfiguracionPuntosControl = (numeroRol: number, nombreActividad: string, esCustom: boolean, indexCustom?: number) => {
    setActividadConfigurando({ numeroRol, nombreActividad, esCustom, indexCustom });
    setModalPuntosControlAbierto(true);
  };

  const guardarPuntosControl = (puntos: PuntoControl[], frecuencia: FrecuenciaPuntoControl, fechaCorteModal: string) => {
    if (!actividadConfigurando) return;

    const { numeroRol, nombreActividad, esCustom, indexCustom } = actividadConfigurando;

    const nuevaConfig = rolesConfig.map(rol => {
      if (rol.numero === numeroRol) {
        if (esCustom && indexCustom !== undefined) {
          // Actualizar actividad custom
          return {
            ...rol,
            actividadesCustom: rol.actividadesCustom.map((act, i) => {
              if (i === indexCustom) {
                return {
                  ...act,
                  puntosControl: puntos,
                  frecuenciaPuntosControl: frecuencia,
                  fechaCorte: fechaCorteModal
                };
              }
              return act;
            })
          };
        } else {
          // Actualizar actividad seleccionada
          return {
            ...rol,
            actividadesSeleccionadas: rol.actividadesSeleccionadas.map(act => {
              if (act.nombre === nombreActividad) {
                return {
                  ...act,
                  puntosControl: puntos,
                  frecuenciaPuntosControl: frecuencia,
                  fechaCorte: fechaCorteModal
                };
              }
              return act;
            })
          };
        }
      }
      return rol;
    });

    onRolesChange(nuevaConfig);
    setModalPuntosControlAbierto(false);
    setActividadConfigurando(null);
  };

  const totalActividades = rolesConfig.reduce((sum, rol) => 
    sum + rol.actividadesSeleccionadas.length + rol.actividadesCustom.length, 0
  );

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Configuración de roles y actividades</h2>
        <p className="text-gray-600">Selecciona las actividades del Decreto 648/2017 y asigna los responsables para cada rol estratégico</p>
      </div>

      {/* Resumen */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-700 mb-1">Total de actividades configuradas</p>
            <p className="text-3xl font-bold text-blue-900">{totalActividades}</p>
          </div>
          <CheckCircle2 className="w-12 h-12 text-blue-600" />
        </div>
      </div>

      {/* Roles configurables */}
      <div className="space-y-4">
        {[...rolesConfig].sort((a, b) => a.numero - b.numero).map((rol) => {
          const isExpanded = rolExpandido === rol.numero;
          const actividadesBase = getActividadesPorRol(rol.numero);
          const totalRol = rol.actividadesSeleccionadas.length + rol.actividadesCustom.length;
          const faltaResponsable = totalRol > 0 && rol.responsables.length === 0;

          return (
            <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
              {/* Header */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setRolExpandido(isExpanded ? null : rol.numero)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: rol.color + '20' }}>
                    {rol.icono}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
                    <p className="text-sm text-gray-600">
                      {totalRol} actividades • {(() => {
                        const totalTareas = [...rol.actividadesSeleccionadas, ...rol.actividadesCustom]
                          .reduce((sum, a) => sum + (a.tareasSeguimiento?.length || 0), 0);
                        return totalTareas > 0 ? `${totalTareas} tareas • ` : '';
                      })()}{rol.responsables.length} responsables
                    </p>
                    {/* Avatar chips for assigned responsibles */}
                    {rol.responsables.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <div className="flex -space-x-1">
                          {rol.responsables.slice(0, 4).map((r: Auditor) => (
                            <div
                              key={r.id}
                              title={r.nombre}
                              className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold"
                              style={{ backgroundColor: rol.color }}
                            >
                              {r.nombre.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          ))}
                          {rol.responsables.length > 4 && (
                            <div className="w-5 h-5 rounded-full bg-gray-400 border-2 border-white flex items-center justify-center text-white text-[9px] font-bold">
                              +{rol.responsables.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{rol.responsables.slice(0, 2).map((r: Auditor) => r.nombre.split(' ')[0]).join(', ')}{rol.responsables.length > 2 ? ` +${rol.responsables.length - 2}` : ''}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ 
                    backgroundColor: rol.color + '20', 
                    color: rol.color 
                  }}>
                    {totalRol}/{actividadesBase.length}
                  </span>
                  <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </motion.div>
                </div>
              </div>

              {/* Content expandible */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 space-y-4 border-t-2 border-gray-200">
                      {/* Sección de responsables del rol */}
                      <div className="pt-4">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" />
                          Responsables del rol
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {/* Chips de responsables asignados */}
                          {rol.responsables.map((auditor: Auditor) => (
                            <div key={auditor.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: rol.color }}>
                                {auditor.nombre.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                              <span className="text-sm font-medium text-gray-900 flex-1">{auditor.nombre}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const nuevaConfig = rolesConfig.map(r => {
                                    if (r.numero === rol.numero) {
                                      return {
                                        ...r,
                                        responsables: r.responsables.filter((resp: any) => resp.id !== auditor.id)
                                      };
                                    }
                                    return r;
                                  });
                                  onRolesChange(nuevaConfig);
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 text-xs transition-colors flex-shrink-0"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          {/* Dropdown para agregar — mismo estilo que SeccionAsignar */}
                          <SelectorProfesional
                            auditores={auditores.filter(a => !rol.responsables.some((r: any) => r.id === a.id) && !(a.cargo || '').toLowerCase().includes('aprobador pai'))}
                            onSelect={(id) => {
                              if (!id) return;
                              const auditor = auditores.find(a => a.id === id);
                              if (auditor) {
                                const nuevaConfig = rolesConfig.map(r => {
                                  if (r.numero === rol.numero) {
                                    const nuevosResponsables = [...(r.responsables || []), auditor];
                                    return {
                                      ...r,
                                      responsables: nuevosResponsables,
                                      actividadesSeleccionadas: r.actividadesSeleccionadas.map(act => (
                                        (!act.responsables || act.responsables.length === 0)
                                          ? { ...act, responsables: [auditor] }
                                          : act
                                      )),
                                      actividadesCustom: r.actividadesCustom.map(act => (
                                        (!act.responsables || act.responsables.length === 0)
                                          ? { ...act, responsables: [auditor] }
                                          : act
                                      ))
                                    };
                                  }
                                  return r;
                                });
                                onRolesChange(nuevaConfig);
                                toast.success(`${auditor.nombre} asignado al rol`);
                              }
                            }}
                          />
                        </div>
                      </div>

                      {/* Actividades del Decreto 648 */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Shield className="w-4 h-4" />
                          Actividades del Decreto 648/2017
                        </h4>
                        <div className="space-y-2">
                          {actividadesBase.map((actividad, index) => {
                            // ⚡ Generar ID único para esta actividad
                            const actId = `rol-${rol.numero}-act-${index}`;
                            const seleccionada = estaSeleccionada(actId);
                            const actividadData = rol.actividadesSeleccionadas.find(a => a.id === actId);
                            return (
                              <div
                                key={actId}
                                style={{ contentVisibility: 'auto', containIntrinsicSize: '150px' }}
                                className={`border-2 rounded-lg transition-colors ${
                                  seleccionada
                                    ? 'border-blue-400 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                }`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <label className="flex items-start gap-3 p-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={seleccionada}
                                    onChange={() => toggleActividad(rol.numero, actId, actividad.nombre)}
                                    className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500 mt-0.5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm">{actividad.nombre}</p>
                                    <p className="text-xs text-gray-600 mt-1">{actividad.descripcion}</p>
                                    {seleccionada && actividadData && (
                                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                        {/* Responsable inline */}
                                        {(actividadData.responsables && actividadData.responsables.length > 0) ? (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-medium">
                                            👤 {actividadData.responsables[0].nombre}
                                            {actividadData.responsables.length > 1 && ` +${actividadData.responsables.length - 1}`}
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
                                            ⚠ Sin responsable
                                          </span>
                                        )}
                                        {(actividadData.tipoEvidencia === 'OBSERVACIONES' || actividadData.tipoEvidencia === 'COMPLETO') && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">
                                            <FileText className="w-2.5 h-2.5" />
                                            Observaciones
                                          </span>
                                        )}
                                        {(actividadData.tipoEvidencia === 'ADJUNTOS' || actividadData.tipoEvidencia === 'COMPLETO') && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">
                                            <Paperclip className="w-2.5 h-2.5" />
                                            Adjuntos
                                          </span>
                                        )}
                                        {actividadData.requiereAutorizacionJefeOCI && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-medium">
                                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                            Requiere autorización
                                          </span>
                                        )}
                                        {actividadData.fechaCorte && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">
                                            📅 Corte: {actividadData.fechaCorte}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </label>
                                
                                {/* Configuración de evidencias - Solo visible si actividad está seleccionada */}
                                {seleccionada && (
                                  <div className="px-3 pb-3 pt-2 border-t border-blue-200 mt-2 space-y-3">
                                    {/* Checkbox de autorización Jefe OCI */}
                                    <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-blue-100/50 rounded-lg transition-colors">
                                      <input
                                        type="checkbox"
                                        checked={actividadData?.requiereAutorizacionJefeOCI || false}
                                        onChange={(e) => {
                                          e.stopPropagation();
                                          toggleAutorizacionJefeOCI(actId);
                                        }}
                                        className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-2 focus:ring-orange-500 mt-0.5"
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                          </svg>
                                          <span className="text-xs font-semibold text-orange-900">
                                            Requiere autorización del Jefe OCI
                                          </span>
                                        </div>
                                        <p className="text-xs text-orange-700 mt-1">
                                          Esta actividad no podrá completarse al 100% sin la autorización del Jefe de la OCI
                                        </p>
                                      </div>
                                    </label>

                                    {/* Selector de tipo de evidencia - VERSIÓN COMPACTA */}
                                    <div className="p-2 bg-blue-50/50 rounded-lg">
                                      <label className="block text-xs font-semibold text-gray-900 mb-2">
                                        📋 Requisitos para completar
                                      </label>
                                      <div className="flex flex-col gap-1.5">
                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO'}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const requiereAdjuntos = actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO';
                                              const requiereObservaciones = e.target.checked;
                                              
                                              if (requiereObservaciones && requiereAdjuntos) {
                                                cambiarTipoEvidencia(actId, 'COMPLETO');
                                              } else if (requiereObservaciones) {
                                                cambiarTipoEvidencia(actId, 'OBSERVACIONES');
                                              } else if (requiereAdjuntos) {
                                                cambiarTipoEvidencia(actId, 'ADJUNTOS');
                                              } else {
                                                cambiarTipoEvidencia(actId, 'SOLO_CHECK');
                                              }
                                            }}
                                            className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                          />
                                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                                          <span className="text-xs text-gray-900">Requiere observaciones</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                          <input
                                            type="checkbox"
                                            checked={actividadData?.tipoEvidencia === 'ADJUNTOS' || actividadData?.tipoEvidencia === 'COMPLETO'}
                                            onChange={(e) => {
                                              e.stopPropagation();
                                              const requiereObservaciones = actividadData?.tipoEvidencia === 'OBSERVACIONES' || actividadData?.tipoEvidencia === 'COMPLETO';
                                              const requiereAdjuntos = e.target.checked;
                                              
                                              if (requiereObservaciones && requiereAdjuntos) {
                                                cambiarTipoEvidencia(actId, 'COMPLETO');
                                              } else if (requiereAdjuntos) {
                                                cambiarTipoEvidencia(actId, 'ADJUNTOS');
                                              } else if (requiereObservaciones) {
                                                cambiarTipoEvidencia(actId, 'OBSERVACIONES');
                                              } else {
                                                cambiarTipoEvidencia(actId, 'SOLO_CHECK');
                                              }
                                            }}
                                            className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-2 focus:ring-purple-500"
                                          />
                                          <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                                          <span className="text-xs text-gray-900">Requiere archivos adjuntos</span>
                                        </label>
                                      </div>
                                    </div>

                                    {/* ✅ Sección de puntos de control — vista profesional */}
                                    <div className="border-2 border-blue-200 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                                      {/* Header con resumen y botón configurar */}
                                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2.5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <CalendarClock className="w-4 h-4 text-blue-600" />
                                          <span className="text-xs font-bold text-blue-900">
                                            {actividadData?.puntosControl && actividadData.puntosControl.length > 0
                                              ? `${actividadData.puntosControl.length} Cortes de Seguimiento`
                                              : 'Sin cortes configurados'}
                                          </span>
                                          {actividadData?.frecuenciaPuntosControl && (
                                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold capitalize">
                                              {actividadData.frecuenciaPuntosControl}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            abrirConfiguracionPuntosControl(rol.numero, actividad.nombre, false);
                                          }}
                                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-semibold transition-colors"
                                        >
                                          <Settings className="w-3 h-3" />
                                          Configurar
                                        </button>
                                      </div>

                                      {/* Timeline de cortes */}
                                      {actividadData?.puntosControl && actividadData.puntosControl.length > 0 && (
                                        <div className="divide-y divide-gray-100">
                                          {actividadData.puntosControl.map((pc: PuntoControl, pcIdx: number) => {
                                            const hoyDate = new Date();
                                            hoyDate.setHours(0,0,0,0);
                                            const fechaCorte = new Date(pc.fechaProgramada + 'T00:00:00');
                                            const fechaSeg = pc.fechaSeguimiento ? new Date(pc.fechaSeguimiento + 'T00:00:00') : null;
                                            const esCompletado = pc.estado === 'completado';
                                            const enSeguimiento = !esCompletado && fechaCorte < hoyDate && fechaSeg !== null && hoyDate <= fechaSeg;
                                            const esVencido = !esCompletado && !enSeguimiento && fechaCorte < hoyDate && (fechaSeg === null || hoyDate > fechaSeg);
                                            const esActivo = !esCompletado && !esVencido && !enSeguimiento && fechaCorte >= hoyDate && (pcIdx === 0 || new Date(actividadData.puntosControl![pcIdx-1].fechaProgramada + 'T00:00:00') < hoyDate);
                                            return (
                                              <div key={pc.id} className={`px-3 py-2.5 flex items-start gap-3 ${esActivo ? 'bg-blue-50/50' : enSeguimiento ? 'bg-purple-50/50' : esVencido ? 'bg-red-50/30' : 'bg-white'}`}>
                                                {/* Indicador lateral */}
                                                <div className="flex flex-col items-center pt-0.5">
                                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                                                    esCompletado ? 'bg-green-500 border-green-500 text-white' :
                                                    enSeguimiento ? 'bg-purple-500 border-purple-500 text-white' :
                                                    esVencido ? 'bg-red-100 border-red-400 text-red-700' :
                                                    esActivo ? 'bg-blue-500 border-blue-500 text-white' :
                                                    'bg-gray-100 border-gray-300 text-gray-500'
                                                  }`}>
                                                    {esCompletado ? '✓' : pcIdx + 1}
                                                  </div>
                                                  {pcIdx < actividadData.puntosControl!.length - 1 && (
                                                    <div className={`w-0.5 flex-1 mt-1 min-h-[20px] ${
                                                      esCompletado ? 'bg-green-300' : 'bg-gray-200'
                                                    }`} />
                                                  )}
                                                </div>

                                                {/* Contenido del corte */}
                                                <div className="flex-1 min-w-0">
                                                  <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-bold text-gray-900">{pc.nombre}</span>
                                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                      esCompletado ? 'bg-green-100 text-green-700' :
                                                      enSeguimiento ? 'bg-purple-100 text-purple-700' :
                                                      esVencido ? 'bg-red-100 text-red-700' :
                                                      esActivo ? 'bg-blue-100 text-blue-700' :
                                                      'bg-gray-100 text-gray-500'
                                                    }`}>
                                                      {esCompletado ? '✅ Completado' : enSeguimiento ? '📋 En seguimiento' : esVencido ? '⚠️ Vencido' : esActivo ? '🔵 Activo' : '⏳ Futuro'}
                                                    </span>
                                                  </div>
                                                  <div className="grid grid-cols-2 gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                      <Calendar className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                                      <span className="text-[11px] text-gray-700">
                                                        <span className="text-[9px] text-gray-400 uppercase">Corte: </span>
                                                        <span className="font-semibold">{new Date(pc.fechaProgramada + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                      <Clock className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                                      <span className="text-[11px] text-gray-700">
                                                        <span className="text-[9px] text-gray-400 uppercase">Seguimiento: </span>
                                                        <span className="font-semibold">{pc.fechaSeguimiento ? new Date(pc.fechaSeguimiento + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                                                      </span>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      )}

                                      {/* Estado vacío */}
                                      {(!actividadData?.puntosControl || actividadData.puntosControl.length === 0) && (
                                        <div className="px-3 py-4 text-center">
                                          <p className="text-xs text-gray-400">Haz clic en "Configurar" para definir los cortes de seguimiento</p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Selector de responsables por actividad */}
                                    <div className="mt-2" onClick={e => e.stopPropagation()}>
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        Responsables de esta actividad
                                      </p>
                                      <div className="flex flex-col gap-1">
                                        {/* Chips de responsables asignados */}
                                        {(actividadData?.responsables || []).map(r => (
                                          <div key={r.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                              {r.nombre.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <span className="text-xs font-medium text-gray-900 flex-1">{r.nombre}</span>
                                            <button
                                              type="button"
                                              onClick={e => { e.stopPropagation(); quitarResponsableActividad(actId, r.id); }}
                                              className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 text-[10px] transition-colors flex-shrink-0"
                                            >✕</button>
                                          </div>
                                        ))}
                                        {/* Dropdown punteado */}
                                        <SelectorProfesional
                                          auditores={auditores.filter(a => !(actividadData?.responsables || []).some(r => r.id === a.id) && !(a.cargo || '').toLowerCase().includes('aprobador pai'))}
                                          onSelect={(id) => {
                                            if (!id) return;
                                            const auditor = auditores.find(a => a.id === id);
                                            if (auditor) agregarResponsableActividad(actId, auditor);
                                          }}
                                        />
                                        {(actividadData?.responsables || []).length === 0 && (
                                          <p className="text-[10px] text-red-500 flex items-center gap-1">⚠ Requerido</p>
                                        )}
                                      </div>
                                    </div>

                                    {/* ✅ Tareas de seguimiento — World-class design */}
                                    <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm" onClick={e => e.stopPropagation()}>
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                          <span className="w-5 h-5 rounded-md bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                          </span>
                                          Tareas de seguimiento
                                          {(actividadData?.tareasSeguimiento || []).length > 0 && (
                                            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                                              {(actividadData?.tareasSeguimiento || []).length}
                                            </span>
                                          )}
                                        </p>
                                      </div>

                                      <div className="space-y-2">
                                        {(actividadData?.tareasSeguimiento || []).map((tarea) => {
                                          const updateTarea = (updates: Partial<TareaSeguimiento>) => {
                                            const nuevaConfig = rolesConfig.map(r => ({
                                              ...r,
                                              actividadesSeleccionadas: r.actividadesSeleccionadas.map(a =>
                                                a.id === actId ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).map(t => t.id === tarea.id ? { ...t, ...updates } : t) } : a
                                              )
                                            }));
                                            onRolesChange(nuevaConfig);
                                          };
                                          return (
                                          <div key={tarea.id} className="group bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                                            {/* Header de la tarea */}
                                            <div className="px-3 py-2.5 flex items-start gap-2.5">
                                              <div className="w-5 h-5 mt-0.5 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3 h-3 text-green-600" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 leading-tight">{tarea.descripcion}</p>
                                                {/* Responsables como chips */}
                                                {(tarea.responsables || []).length > 0 && (
                                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {(tarea.responsables || []).map((resp, ri) => (
                                                      <span key={ri} className="inline-flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px]">
                                                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[7px] font-bold">
                                                          {resp.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                        </span>
                                                        <span className="text-blue-800 font-medium">{resp.split(' ').slice(0, 2).join(' ')}</span>
                                                        <button
                                                          onClick={() => updateTarea({ responsables: (tarea.responsables || []).filter((_, idx) => idx !== ri) })}
                                                          className="w-3 h-3 rounded-full hover:bg-red-200 text-blue-400 hover:text-red-600 text-[8px] flex items-center justify-center transition-colors"
                                                        >×</button>
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                              {/* Acciones */}
                                              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                <select
                                                  className="text-[10px] border border-gray-300 rounded-md px-1 py-0.5 text-gray-500 bg-white hover:border-blue-400 cursor-pointer"
                                                  value=""
                                                  onChange={(e) => {
                                                    if (!e.target.value) return;
                                                    const aud = auditores.find(a => a.id === e.target.value);
                                                    if (!aud) return;
                                                    updateTarea({ responsables: [...(tarea.responsables || []), aud.nombre] });
                                                  }}
                                                >
                                                  <option value="">+ Asignar</option>
                                                  {auditores
                                                    .filter(a => !(tarea.responsables || []).includes(a.nombre))
                                                    .map(a => (
                                                      <option key={a.id} value={a.id}>{a.nombre} - {a.cargo || 'Profesional'}</option>
                                                    ))}
                                                </select>
                                                <button
                                                  onClick={() => {
                                                    const nuevaConfig = rolesConfig.map(r => ({
                                                      ...r,
                                                      actividadesSeleccionadas: r.actividadesSeleccionadas.map(a =>
                                                        a.id === actId ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).filter(t => t.id !== tarea.id) } : a
                                                      )
                                                    }));
                                                    onRolesChange(nuevaConfig);
                                                  }}
                                                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                  title="Eliminar tarea"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>

                                            {/* Footer: opciones compactas */}
                                            <div className="px-3 pb-2 flex items-center gap-4 border-t border-gray-100 pt-1.5">
                                              <label className="flex items-center gap-1.5 cursor-pointer group/opt" title="Requiere observaciones al completar">
                                                <div className={`w-7 h-4 rounded-full transition-colors relative ${tarea.requiereObservaciones ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => updateTarea({ requiereObservaciones: !tarea.requiereObservaciones })}>
                                                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereObservaciones ? 'left-3.5' : 'left-0.5'}`} />
                                                </div>
                                                <span className={`text-[11px] ${tarea.requiereObservaciones ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>📝 Observaciones</span>
                                              </label>
                                              <label className="flex items-center gap-1.5 cursor-pointer group/opt" title="Requiere archivos adjuntos">
                                                <div className={`w-7 h-4 rounded-full transition-colors relative ${tarea.requiereAdjuntos ? 'bg-purple-500' : 'bg-gray-300'}`} onClick={() => updateTarea({ requiereAdjuntos: !tarea.requiereAdjuntos })}>
                                                  <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereAdjuntos ? 'left-3.5' : 'left-0.5'}`} />
                                                </div>
                                                <span className={`text-[11px] ${tarea.requiereAdjuntos ? 'text-purple-700 font-semibold' : 'text-gray-500'}`}>📎 Adjuntos</span>
                                              </label>
                                              <div className="flex items-center gap-1.5 ml-auto">
                                                <span className="text-[11px] text-gray-500">📅</span>
                                                <input
                                                  type="date"
                                                  value={tarea.fechaEntrega || ''}
                                                  onChange={(e) => updateTarea({ fechaEntrega: e.target.value })}
                                                  className="text-[11px] border border-gray-200 rounded-md px-1.5 py-0.5 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none w-[120px]"
                                                  title="Fecha de entrega (opcional)"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                          );
                                        })}

                                        {/* Agregar nueva tarea — diseño premium */}
                                        <div className="flex gap-2 mt-1">
                                          <input
                                            type="text"
                                            data-tarea-wizard={actId}
                                            placeholder="✍ Escribir nueva tarea…"
                                            className="flex-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:bg-green-50/30 text-sm text-gray-600 bg-gray-50/50 placeholder:text-gray-400 transition-all"
                                            onClick={e => e.stopPropagation()}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                                const desc = (e.target as HTMLInputElement).value.trim();
                                                const nuevaConfig = rolesConfig.map(r => ({
                                                  ...r,
                                                  actividadesSeleccionadas: r.actividadesSeleccionadas.map(a =>
                                                    a.id === actId ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: desc, completada: false, responsables: [] }] } : a
                                                  )
                                                }));
                                                onRolesChange(nuevaConfig);
                                                (e.target as HTMLInputElement).value = '';
                                              }
                                            }}
                                          />
                                          <button
                                            onClick={() => {
                                              const input = document.querySelector<HTMLInputElement>(`[data-tarea-wizard="${actId}"]`);
                                              if (input && input.value.trim()) {
                                                const nuevaConfig = rolesConfig.map(r => ({
                                                  ...r,
                                                  actividadesSeleccionadas: r.actividadesSeleccionadas.map(a =>
                                                    a.id === actId ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: input.value.trim(), completada: false, responsables: [] }] } : a
                                                  )
                                                }));
                                                onRolesChange(nuevaConfig);
                                                input.value = '';
                                              }
                                            }}
                                            className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all flex-shrink-0"
                                          >
                                            <Plus className="w-3.5 h-3.5" /> Agregar
                                          </button>
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Actividades personalizadas */}
                      {rol.actividadesCustom.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            ⭐ Actividades personalizadas
                          </h4>
                          <div className="space-y-2">
                            {rol.actividadesCustom.map((actividad, index) => (
                              <div
                                key={`rol-${rol.numero}-custom-${index}-${actividad.nombre.slice(0, 20)}`}
                                className="border-2 border-green-200 bg-green-50 rounded-lg"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-start gap-3 p-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm">{actividad.nombre}</p>
                                    <p className="text-xs text-gray-600 mt-1">{actividad.descripcion}</p>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                      {/* Responsable inline */}
                                      {(actividad.responsables && actividad.responsables.length > 0) ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full text-[10px] font-medium">
                                          👤 {actividad.responsables[0].nombre}
                                          {actividad.responsables.length > 1 && ` +${actividad.responsables.length - 1}`}
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium">
                                          ⚠ Sin responsable
                                        </span>
                                      )}
                                      {(actividad.tipoEvidencia === 'OBSERVACIONES' || actividad.tipoEvidencia === 'COMPLETO') && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">
                                          <FileText className="w-2.5 h-2.5" />
                                          Observaciones
                                        </span>
                                      )}
                                      {(actividad.tipoEvidencia === 'ADJUNTOS' || actividad.tipoEvidencia === 'COMPLETO') && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-[10px] font-medium">
                                          <Paperclip className="w-2.5 h-2.5" />
                                          Adjuntos
                                        </span>
                                      )}
                                      {actividad.requiereAutorizacionJefeOCI && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-[10px] font-medium">
                                          <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                          </svg>
                                          Requiere autorización
                                        </span>
                                      )}
                                      {actividad.fechaCorte && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-[10px] font-medium">
                                          📅 Corte: {actividad.fechaCorte}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (confirm('¿Eliminar esta actividad personalizada?')) {
                                        eliminarActividadCustom(rol.numero, index);
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 p-1"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                                
                                {/* Configuración de evidencias */}
                                <div className="px-3 pb-3 pt-2 border-t border-green-300 mt-2 space-y-3">
                                  {/* Checkbox de autorización Jefe OCI */}
                                  <label className="flex items-start gap-2 cursor-pointer p-2 hover:bg-green-100/50 rounded-lg transition-colors">
                                    <input
                                      type="checkbox"
                                      checked={actividad.requiereAutorizacionJefeOCI || false}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        toggleAutorizacionCustom(rol.numero, index);
                                      }}
                                      className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-2 focus:ring-orange-500 mt-0.5"
                                    />
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                        </svg>
                                        <span className="text-xs font-semibold text-orange-900">
                                          Requiere autorización del Jefe OCI
                                        </span>
                                      </div>
                                      <p className="text-xs text-orange-700 mt-1">
                                        Esta actividad no podrá completarse al 100% sin la autorización del Jefe de la OCI
                                      </p>
                                    </div>
                                  </label>

                                  {/* Selector de tipo de evidencia */}
                                  <div className="p-2 bg-green-50/50 rounded-lg">
                                    <label className="block text-xs font-semibold text-gray-900 mb-2">
                                      📋 Requisitos para completar
                                    </label>
                                    <div className="flex flex-col gap-1.5">
                                      <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={actividad.tipoEvidencia === 'OBSERVACIONES' || actividad.tipoEvidencia === 'COMPLETO'}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const requiereAdjuntos = actividad.tipoEvidencia === 'ADJUNTOS' || actividad.tipoEvidencia === 'COMPLETO';
                                            const requiereObservaciones = e.target.checked;
                                            
                                            if (requiereObservaciones && requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'COMPLETO');
                                            } else if (requiereObservaciones) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'OBSERVACIONES');
                                            } else if (requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'ADJUNTOS');
                                            } else {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'SOLO_CHECK');
                                            }
                                          }}
                                          className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                                        />
                                        <FileText className="w-3.5 h-3.5 text-blue-600" />
                                        <span className="text-xs text-gray-900">Requiere observaciones</span>
                                      </label>

                                      <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-1.5 rounded transition-colors">
                                        <input
                                          type="checkbox"
                                          checked={actividad.tipoEvidencia === 'ADJUNTOS' || actividad.tipoEvidencia === 'COMPLETO'}
                                          onChange={(e) => {
                                            e.stopPropagation();
                                            const requiereObservaciones = actividad.tipoEvidencia === 'OBSERVACIONES' || actividad.tipoEvidencia === 'COMPLETO';
                                            const requiereAdjuntos = e.target.checked;
                                            
                                            if (requiereObservaciones && requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'COMPLETO');
                                            } else if (requiereAdjuntos) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'ADJUNTOS');
                                            } else if (requiereObservaciones) {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'OBSERVACIONES');
                                            } else {
                                              cambiarTipoEvidenciaCustom(rol.numero, index, 'SOLO_CHECK');
                                            }
                                          }}
                                          className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-2 focus:ring-purple-500"
                                        />
                                        <Paperclip className="w-3.5 h-3.5 text-purple-600" />
                                        <span className="text-xs text-gray-900">Requiere archivos adjuntos</span>
                                      </label>
                                    </div>
                                  </div>

                                  {/* ✅ Sección de puntos de control — vista profesional (custom) */}
                                  <div className="border-2 border-blue-200 rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
                                    {/* Header con resumen y botón configurar */}
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2.5 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <CalendarClock className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-bold text-blue-900">
                                          {actividad.puntosControl && actividad.puntosControl.length > 0
                                            ? `${actividad.puntosControl.length} Cortes de Seguimiento`
                                            : 'Sin cortes configurados'}
                                        </span>
                                        {actividad.frecuenciaPuntosControl && (
                                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold capitalize">
                                            {actividad.frecuenciaPuntosControl}
                                          </span>
                                        )}
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          abrirConfiguracionPuntosControl(rol.numero, actividad.nombre, true, index);
                                        }}
                                        className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-semibold transition-colors"
                                      >
                                        <Settings className="w-3 h-3" />
                                        Configurar
                                      </button>
                                    </div>

                                    {/* Timeline de cortes */}
                                    {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                                      <div className="divide-y divide-gray-100">
                                        {actividad.puntosControl.map((pc: PuntoControl, pcIdx: number) => {
                                          const hoyDate = new Date();
                                          hoyDate.setHours(0,0,0,0);
                                          const fechaCorte = new Date(pc.fechaProgramada + 'T00:00:00');
                                          const fechaSeg = pc.fechaSeguimiento ? new Date(pc.fechaSeguimiento + 'T00:00:00') : null;
                                          const esCompletado = pc.estado === 'completado';
                                          const enSeguimiento = !esCompletado && fechaCorte < hoyDate && fechaSeg !== null && hoyDate <= fechaSeg;
                                          const esVencido = !esCompletado && !enSeguimiento && fechaCorte < hoyDate && (fechaSeg === null || hoyDate > fechaSeg);
                                          const esActivo = !esCompletado && !esVencido && !enSeguimiento && fechaCorte >= hoyDate && (pcIdx === 0 || new Date(actividad.puntosControl![pcIdx-1].fechaProgramada + 'T00:00:00') < hoyDate);
                                          return (
                                            <div key={pc.id} className={`px-3 py-2.5 flex items-start gap-3 ${esActivo ? 'bg-blue-50/50' : enSeguimiento ? 'bg-purple-50/50' : esVencido ? 'bg-red-50/30' : 'bg-white'}`}>
                                              {/* Indicador lateral */}
                                              <div className="flex flex-col items-center pt-0.5">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 ${
                                                  esCompletado ? 'bg-green-500 border-green-500 text-white' :
                                                  enSeguimiento ? 'bg-purple-500 border-purple-500 text-white' :
                                                  esVencido ? 'bg-red-100 border-red-400 text-red-700' :
                                                  esActivo ? 'bg-blue-500 border-blue-500 text-white' :
                                                  'bg-gray-100 border-gray-300 text-gray-500'
                                                }`}>
                                                  {esCompletado ? '✓' : pcIdx + 1}
                                                </div>
                                                {pcIdx < actividad.puntosControl!.length - 1 && (
                                                  <div className={`w-0.5 flex-1 mt-1 min-h-[20px] ${
                                                    esCompletado ? 'bg-green-300' : 'bg-gray-200'
                                                  }`} />
                                                )}
                                              </div>

                                              {/* Contenido del corte */}
                                              <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-xs font-bold text-gray-900">{pc.nombre}</span>
                                                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                    esCompletado ? 'bg-green-100 text-green-700' :
                                                    enSeguimiento ? 'bg-purple-100 text-purple-700' :
                                                    esVencido ? 'bg-red-100 text-red-700' :
                                                    esActivo ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-500'
                                                  }`}>
                                                    {esCompletado ? '✅ Completado' : enSeguimiento ? '📋 En seguimiento' : esVencido ? '⚠️ Vencido' : esActivo ? '🔵 Activo' : '⏳ Futuro'}
                                                  </span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                  <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                                    <span className="text-[11px] text-gray-700">
                                                      <span className="text-[9px] text-gray-400 uppercase">Corte: </span>
                                                      <span className="font-semibold">{new Date(pc.fechaProgramada + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Clock className="w-3 h-3 text-purple-500 flex-shrink-0" />
                                                    <span className="text-[11px] text-gray-700">
                                                      <span className="text-[9px] text-gray-400 uppercase">Seguimiento: </span>
                                                      <span className="font-semibold">{pc.fechaSeguimiento ? new Date(pc.fechaSeguimiento + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
                                                    </span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Estado vacío */}
                                    {(!actividad.puntosControl || actividad.puntosControl.length === 0) && (
                                      <div className="px-3 py-4 text-center">
                                        <p className="text-xs text-gray-400">Haz clic en "Configurar" para definir los cortes de seguimiento</p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Selector de responsables por actividad personalizada */}
                                  <div className="mt-2" onClick={e => e.stopPropagation()}>
                                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      Responsables de esta actividad
                                    </p>
                                    <div className="flex flex-col gap-1">
                                      {(actividad.responsables || []).map(r => (
                                        <div key={r.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                                            {r.nombre.split(' ').filter(Boolean).map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                                          </div>
                                          <span className="text-xs font-medium text-gray-900 flex-1">{r.nombre}</span>
                                          <button
                                            type="button"
                                            onClick={e => { e.stopPropagation(); quitarResponsableCustom(rol.numero, index, r.id); }}
                                            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 text-[10px] transition-colors flex-shrink-0"
                                          >✕</button>
                                        </div>
                                      ))}
                                      <SelectorProfesional
                                        auditores={auditores.filter(a => !(actividad.responsables || []).some(r => r.id === a.id) && !(a.cargo || '').toLowerCase().includes('aprobador pai'))}
                                        onSelect={(id) => {
                                          if (!id) return;
                                          const auditor = auditores.find(a => a.id === id);
                                          if (auditor) agregarResponsableCustom(rol.numero, index, auditor);
                                        }}
                                      />
                                      {(actividad.responsables || []).length === 0 && (
                                        <p className="text-[10px] text-red-500 flex items-center gap-1">⚠ Requerido</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* ✅ Tareas de seguimiento — World-class design (custom) */}
                                  <div className="mt-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm" onClick={e => e.stopPropagation()}>
                                    <div className="flex items-center justify-between mb-3">
                                      <p className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <span className="w-5 h-5 rounded-md bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                          <Check className="w-3 h-3 text-white" />
                                        </span>
                                        Tareas de seguimiento
                                        {(actividad.tareasSeguimiento || []).length > 0 && (
                                          <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold">
                                            {(actividad.tareasSeguimiento || []).length}
                                          </span>
                                        )}
                                      </p>
                                    </div>

                                    <div className="space-y-2">
                                      {(actividad.tareasSeguimiento || []).map((tarea) => {
                                        const updateTareaCustom = (updates: Partial<TareaSeguimiento>) => {
                                          const nuevaConfig = rolesConfig.map(r => {
                                            if (r.numero !== rol.numero) return r;
                                            return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                              i === index ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).map(t => t.id === tarea.id ? { ...t, ...updates } : t) } : a
                                            )};
                                          });
                                          onRolesChange(nuevaConfig);
                                        };
                                        return (
                                        <div key={tarea.id} className="group bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all">
                                          {/* Header de la tarea */}
                                          <div className="px-3 py-2.5 flex items-start gap-2.5">
                                            <div className="w-5 h-5 mt-0.5 rounded bg-green-100 flex items-center justify-center flex-shrink-0">
                                              <Check className="w-3 h-3 text-green-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-900 leading-tight">{tarea.descripcion}</p>
                                              {(tarea.responsables || []).length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                  {(tarea.responsables || []).map((resp, ri) => (
                                                    <span key={ri} className="inline-flex items-center gap-1 pl-0.5 pr-1.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-[10px]">
                                                      <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[7px] font-bold">
                                                        {resp.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                      </span>
                                                      <span className="text-blue-800 font-medium">{resp.split(' ').slice(0, 2).join(' ')}</span>
                                                      <button
                                                        onClick={() => {
                                                          const nuevaConfig = rolesConfig.map(r => {
                                                            if (r.numero !== rol.numero) return r;
                                                            return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                                              i === index ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).map(t => t.id === tarea.id ? { ...t, responsables: (t.responsables || []).filter((_, idx) => idx !== ri) } : t) } : a
                                                            )};
                                                          });
                                                          onRolesChange(nuevaConfig);
                                                        }}
                                                        className="w-3 h-3 rounded-full hover:bg-red-200 text-blue-400 hover:text-red-600 text-[8px] flex items-center justify-center transition-colors"
                                                      >×</button>
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                            {/* Acciones */}
                                            <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                              <select
                                                className="text-[10px] border border-gray-300 rounded-md px-1 py-0.5 text-gray-500 bg-white hover:border-blue-400 cursor-pointer"
                                                value=""
                                                onChange={(e) => {
                                                  if (!e.target.value) return;
                                                  const aud = auditores.find(a => a.id === e.target.value);
                                                  if (!aud) return;
                                                  updateTareaCustom({ responsables: [...(tarea.responsables || []), aud.nombre] });
                                                }}
                                              >
                                                <option value="">+ Asignar</option>
                                                {auditores
                                                  .filter(a => !(tarea.responsables || []).includes(a.nombre))
                                                  .map(a => (
                                                    <option key={a.id} value={a.id}>{a.nombre} - {a.cargo || 'Profesional'}</option>
                                                  ))}
                                              </select>
                                              <button
                                                onClick={() => {
                                                  const nuevaConfig = rolesConfig.map(r => {
                                                    if (r.numero !== rol.numero) return r;
                                                    return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                                      i === index ? { ...a, tareasSeguimiento: (a.tareasSeguimiento || []).filter(t => t.id !== tarea.id) } : a
                                                    )};
                                                  });
                                                  onRolesChange(nuevaConfig);
                                                }}
                                                className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Eliminar tarea"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          </div>

                                          {/* Footer: opciones compactas */}
                                          <div className="px-3 pb-2 flex items-center gap-4 border-t border-gray-100 pt-1.5">
                                            <label className="flex items-center gap-1.5 cursor-pointer" title="Requiere observaciones al completar">
                                              <div className={`w-7 h-4 rounded-full transition-colors relative ${tarea.requiereObservaciones ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => updateTareaCustom({ requiereObservaciones: !tarea.requiereObservaciones })}>
                                                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereObservaciones ? 'left-3.5' : 'left-0.5'}`} />
                                              </div>
                                              <span className={`text-[11px] ${tarea.requiereObservaciones ? 'text-blue-700 font-semibold' : 'text-gray-500'}`}>📝 Observaciones</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer" title="Requiere archivos adjuntos">
                                              <div className={`w-7 h-4 rounded-full transition-colors relative ${tarea.requiereAdjuntos ? 'bg-purple-500' : 'bg-gray-300'}`} onClick={() => updateTareaCustom({ requiereAdjuntos: !tarea.requiereAdjuntos })}>
                                                <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${tarea.requiereAdjuntos ? 'left-3.5' : 'left-0.5'}`} />
                                              </div>
                                              <span className={`text-[11px] ${tarea.requiereAdjuntos ? 'text-purple-700 font-semibold' : 'text-gray-500'}`}>📎 Adjuntos</span>
                                            </label>
                                            <div className="flex items-center gap-1.5 ml-auto">
                                              <span className="text-[11px] text-gray-500">📅</span>
                                              <input
                                                type="date"
                                                value={tarea.fechaEntrega || ''}
                                                onChange={(e) => updateTareaCustom({ fechaEntrega: e.target.value })}
                                                className="text-[11px] border border-gray-200 rounded-md px-1.5 py-0.5 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 outline-none w-[120px]"
                                                title="Fecha de entrega (opcional)"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                        );
                                      })}

                                      {/* Agregar nueva tarea — diseño premium */}
                                      <div className="flex gap-2 mt-1">
                                        <input
                                          type="text"
                                          data-tarea-wizard-custom={`${rol.numero}-${index}`}
                                          placeholder="✍ Escribir nueva tarea…"
                                          className="flex-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:bg-green-50/30 text-sm text-gray-600 bg-gray-50/50 placeholder:text-gray-400 transition-all"
                                          onClick={e => e.stopPropagation()}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                              const desc = (e.target as HTMLInputElement).value.trim();
                                              const nuevaConfig = rolesConfig.map(r => {
                                                if (r.numero !== rol.numero) return r;
                                                return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                                  i === index ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: desc, completada: false, responsables: [] }] } : a
                                                )};
                                              });
                                              onRolesChange(nuevaConfig);
                                              (e.target as HTMLInputElement).value = '';
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() => {
                                            const input = document.querySelector<HTMLInputElement>(`[data-tarea-wizard-custom="${rol.numero}-${index}"]`);
                                            if (input && input.value.trim()) {
                                              const nuevaConfig = rolesConfig.map(r => {
                                                if (r.numero !== rol.numero) return r;
                                                return { ...r, actividadesCustom: r.actividadesCustom.map((a, i) =>
                                                  i === index ? { ...a, tareasSeguimiento: [...(a.tareasSeguimiento || []), { id: `tarea-${Date.now()}`, descripcion: input.value.trim(), completada: false, responsables: [] }] } : a
                                                )};
                                              });
                                              onRolesChange(nuevaConfig);
                                              input.value = '';
                                            }
                                          }}
                                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:shadow transition-all flex-shrink-0"
                                        >
                                          <Plus className="w-3.5 h-3.5" /> Agregar
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                </div>
                              </div>
                            ))}

                          </div>
                        </div>
                      )}

                      {/* Formulario nueva actividad */}
                      {mostrarFormActividad === rol.numero ? (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg space-y-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-blue-900">Nueva actividad personalizada</h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMostrarFormActividad(null);
                              }}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              ✕
                            </button>
                          </div>
                          <input
                            type="text"
                            value={nuevaActividad.nombre}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })}
                            placeholder="Nombre de la actividad"
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <textarea
                            value={nuevaActividad.descripcion}
                            onChange={(e) => setNuevaActividad({ ...nuevaActividad, descripcion: e.target.value })}
                            placeholder="Descripción"
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                            rows={2}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                agregarActividadCustom(rol.numero);
                              }}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                            >
                              ✓ Agregar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMostrarFormActividad(null);
                              }}
                              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium"
                            >
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMostrarFormActividad(rol.numero);
                          }}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Agregar actividad personalizada
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ✅ NUEVO: Modal de configuración de puntos de control */}
      {modalPuntosControlAbierto && actividadConfigurando && (
        <ModalConfiguracionPuntosControl
          isOpen={modalPuntosControlAbierto}
          onClose={() => {
            setModalPuntosControlAbierto(false);
            setActividadConfigurando(null);
          }}
          nombreActividad={actividadConfigurando.nombreActividad}
          fechaInicioActividad={fechaInicio}
          fechaFinActividad={fechaFin}
          fechaCorte={
            (() => {
              const rol = rolesConfig.find(r => r.numero === actividadConfigurando.numeroRol);
              if (!rol) {
                console.log('[Wizard] ❌ Rol no encontrado');
                return undefined;
              }
              let fechaCorteActividad;
              if (actividadConfigurando.esCustom && actividadConfigurando.indexCustom !== undefined) {
                fechaCorteActividad = rol.actividadesCustom[actividadConfigurando.indexCustom]?.fechaCorte;
              } else {
                fechaCorteActividad = rol.actividadesSeleccionadas.find(a => a.nombre === actividadConfigurando.nombreActividad)?.fechaCorte;
              }
              console.log('[Wizard] 📅 Pasando fechaCorte al modal:', fechaCorteActividad);
              return fechaCorteActividad;
            })()
          }
          puntosControlExistentes={
            (() => {
              const rol = rolesConfig.find(r => r.numero === actividadConfigurando.numeroRol);
              if (!rol) return [];
              
              if (actividadConfigurando.esCustom && actividadConfigurando.indexCustom !== undefined) {
                const actividad = rol.actividadesCustom[actividadConfigurando.indexCustom];
                return actividad?.puntosControl || [];
              } else {
                const actividad = rol.actividadesSeleccionadas.find(
                  a => a.nombre === actividadConfigurando.nombreActividad
                );
                return actividad?.puntosControl || [];
              }
            })()
          }
          frecuenciaActual={
            (() => {
              const rol = rolesConfig.find(r => r.numero === actividadConfigurando.numeroRol);
              if (!rol) return undefined;
              
              if (actividadConfigurando.esCustom && actividadConfigurando.indexCustom !== undefined) {
                const actividad = rol.actividadesCustom[actividadConfigurando.indexCustom];
                return actividad?.frecuenciaPuntosControl;
              } else {
                const actividad = rol.actividadesSeleccionadas.find(
                  a => a.nombre === actividadConfigurando.nombreActividad
                );
                return actividad?.frecuenciaPuntosControl;
              }
            })()
          }
          onGuardar={guardarPuntosControl}
        />
      )}
    </motion.div>
  );
}

// Paso 3: Confirmación
function Paso3({ 
  vigencia, 
  jefeOCI, 
  rolesConfig,
  auditores = [],
  comiteAprobacion = [],
  setComiteAprobacion,
  ordenAprobacion,
  setOrdenAprobacion
}: any) {
  const totalActividades = rolesConfig.reduce((total: number, rol: any) => {
    return total + (rol.actividadesSeleccionadas?.length || 0) + (rol.actividadesCustom?.length || 0);
  }, 0);

  const totalResponsables = rolesConfig.reduce((total: number, rol: any) => {
    return total + (rol.responsables?.length || 0);
  }, 0);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Confirmación</h2>
        <p className="text-gray-600">Revisa la información antes de crear el plan</p>
      </div>

      <div className="bg-white rounded-xl border-2 border-gray-200 p-8">
        <h3 className="font-bold text-gray-900 mb-4">Resumen del plan</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Vigencia:</span>
            <span className="font-bold text-gray-900">{vigencia}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Responsable del Plan:</span>
            <span className="font-bold text-gray-900">{jefeOCI.nombre}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Roles configurados:</span>
            <span className="font-bold text-gray-900">5 roles obligatorios</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Total actividades:</span>
            <span className="font-bold text-gray-900">{totalActividades} actividades</span>
          </div>
          {(() => {
            const totalTareas = rolesConfig.reduce((sum: number, rol: any) => {
              return sum + [...(rol.actividadesSeleccionadas || []), ...(rol.actividadesCustom || [])]
                .reduce((s: number, a: any) => s + (a.tareasSeguimiento?.length || 0), 0);
            }, 0);
            return totalTareas > 0 ? (
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Total tareas:</span>
                <span className="font-bold text-gray-900">{totalTareas} tareas de seguimiento</span>
              </div>
            ) : null;
          })()}
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Total responsables:</span>
            <span className="font-bold text-gray-900">{totalResponsables} auditores asignados</span>
          </div>
        </div>

        {/* COMITÉ DE APROBACIÓN */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Comité Aprobador del Plan
              </h4>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-400" /> Numeral 648 de 2017: Selecciona hasta 5 miembros aprobadores.
              </p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setOrdenAprobacion?.('secuencial')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${ordenAprobacion === 'secuencial' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                📝 Secuencial
              </button>
              <button
                type="button"
                onClick={() => setOrdenAprobacion?.('paralelo')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${ordenAprobacion === 'paralelo' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                ⚡ Paralelo
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Buscador */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Agregar Miembro</label>
                <div className="relative">
                  <SelectorProfesional
                    auditores={auditores.filter((a: any) => {
                      const esAprobador = /aprobador/i.test(a.cargo || '');
                      const yaSeleccionado = comiteAprobacion.find((c: any) => String(c.id) === String(a.id));
                      return esAprobador && !yaSeleccionado;
                    })}
                    onSelect={(id) => {
                      if (!id || comiteAprobacion.length >= 5) return;
                      const auditor = auditores.find((a: any) => String(a.id) === String(id));
                      if (auditor && setComiteAprobacion) {
                        setComiteAprobacion([...comiteAprobacion, auditor]);
                      }
                    }}
                    placeholder={comiteAprobacion.length >= 5 ? "Límite de 5 miembros alcanzado" : "+ Buscar Aprobador PAI..."}
                    disabled={comiteAprobacion.length >= 5}
                    className="w-full bg-white shadow-sm"
                  />
                </div>
                <p className="text-[10px] text-gray-500 leading-tight bg-white/50 p-2 rounded border border-blue-100">
                  <span className="font-semibold text-blue-600">Tip:</span> Dependiendo de la jerarquía de la ESAP, elige estratégicamente el orden si optaste por modalidad secuencial.
                </p>
              </div>

              {/* Lista Seleccionada */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">Flujo de Aprobación</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${comiteAprobacion.length === 5 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {comiteAprobacion.length} / 5
                  </span>
                </div>
                
                {comiteAprobacion.length === 0 ? (
                  <div className="text-sm text-gray-400 italic text-center p-6 border-2 border-dashed border-blue-200 rounded-xl bg-white shadow-sm flex flex-col items-center justify-center">
                    <Users className="w-8 h-8 text-blue-200 mb-2" />
                    El comité está vacío
                  </div>
                ) : (
                  <div className="space-y-2 relative">
                    {/* Línea conectora si es secuencial */}
                    {ordenAprobacion === 'secuencial' && comiteAprobacion.length > 1 && (
                      <div className="absolute left-3 top-4 bottom-4 w-0.5 bg-blue-200" />
                    )}
                    
                    {comiteAprobacion.map((miembro: any, index: number) => {
                      const getInitials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                      const getRoleBadgeColor = (role: string) => {
                        const r = role.toLowerCase();
                        if (r.includes('jefe') || r.includes('super') || r.includes('director')) return 'bg-purple-100 text-purple-700';
                        if (r.includes('líder') || r.includes('lider') || r.includes('senior') || r.includes('sénior')) return 'bg-cyan-100 text-cyan-700';
                        if (r.includes('junior') || r.includes('júnior')) return 'bg-green-100 text-green-700';
                        if (r.includes('auditado')) return 'bg-amber-100 text-amber-700';
                        if (r.includes('aprobador pai')) return 'bg-orange-100 text-orange-700';
                        return 'bg-blue-100 text-blue-700';
                      };

                      return (
                        <div key={miembro.id} className="relative flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm group hover:border-blue-300 transition-all z-10">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ordenAprobacion === 'secuencial' ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-100 text-blue-700'}`}>
                            {ordenAprobacion === 'secuencial' ? index + 1 : '•'}
                          </div>
                          
                          <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[11px] font-black shrink-0">
                            {getInitials(miembro.nombre)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{miembro.nombre}</p>
                            <p className="text-[11px] text-gray-400 truncate">{miembro.email || 'jefe.oci@esap.edu.co'}</p>
                          </div>

                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${getRoleBadgeColor(miembro.cargo || 'Funcionario')}`}>
                            {miembro.cargo || 'Funcionario'}
                          </span>

                          <button
                            type="button"
                            onClick={() => setComiteAprobacion && setComiteAprobacion(comiteAprobacion.filter((c: any) => c.id !== miembro.id))}
                            className="w-7 h-7 shrink-0 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all ml-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// DASHBOARD DEL PLAN - VERSION SIMPLIFICADA
// ════════════════════════════════════════════════════════════════════════════

interface DashboardPlanProps {
  plan: PlanAnual;
  onActualizar: (plan: PlanAnual) => void;
  onRefetchPlan?: () => Promise<void>; // Recargar plan desde backend tras guardar (para reflejar datos y adjuntos)
  onVolver: () => void;
  onAbrirRol4?: () => void;
  onCrearNuevo?: () => void; // Nueva prop para crear un nuevo plan
  planesAnteriores?: PlanAnual[]; // Historial de planes anteriores
  planesDisponibles?: PlanAnual[]; // Lista de todos los planes para selector
  onCambiarPlan?: (planId: string) => void; // Callback para cambiar de plan activo
}

const PLAN_ANUAL_STORAGE_KEY = 'esap:plan_anual_activo';

export function DashboardPlan({ plan, onActualizar, onRefetchPlan, onVolver, onAbrirRol4, onCrearNuevo, planesAnteriores = [], planesDisponibles = [], onCambiarPlan }: DashboardPlanProps) {
  const [seccion, setSeccion] = useState<'gestion' | 'asignar' | 'aprobar'>('gestion');
  const [mostrarModalExportacion, setMostrarModalExportacion] = useState(false);
  const [exportando, setExportando] = useState<'excel' | 'pdf' | null>(null);
  const [mostrarModalEliminar, setMostrarModalEliminar] = useState(false);
  const [eliminandoPlan, setEliminandoPlan] = useState(false);
  
  // Estado para auditores cargados desde backend
  const [auditores, setAuditores] = useState<Auditor[]>([]);
  const [cargandoAuditores, setCargandoAuditores] = useState(true);

  // Cargar usuario actual para filtros de visibilidad
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    try {
      const userDataStr = localStorage.getItem('esap_user_data');
      if (userDataStr) setCurrentUser(JSON.parse(userDataStr));
    } catch (e) {}
  }, []);
  
  // Permisos del Plan Anual (sistema flexible basado en permisos, no roles)
  const { puedeRealizar, esSuperUsuario } = useControlInternoPermissions();
  const puedeAprobarPlan = puedeRealizar('plan-anual', 'approve');
  const puedeActivarPlan = puedeRealizar('plan-anual', 'activate');
  const puedeEditarPlan = puedeRealizar('plan-anual', 'edit');
  const puedeAsignarActividades = puedeRealizar('plan-anual', 'assign');
  const puedeExportarPlan = puedeRealizar('plan-anual', 'export');
  const puedeSeguimiento = puedeRealizar('plan-anual', 'follow-up');
  const puedeEliminarPlan = puedeRealizar('plan-anual', 'delete');
  // Permiso compuesto: editar O seguimiento para gestionar evidencias
  const puedeGestionarEvidencias = puedeEditarPlan || puedeSeguimiento;

  // Cargar auditores desde backend al montar el componente (profesionales OCI configurados)
  useEffect(() => {
    const cargarAuditores = async () => {
      setCargandoAuditores(true);
      try {
        const response = await configuracionesProfesionalesOCIApi.getAll();
        if (response.success && response.data) {
          // Mapear profesionales OCI a formato Auditor
          const auditoresMapeados: Auditor[] = response.data
            .filter((p) => p.activo && p.nombre)
            .map((p) => ({
              id: p.id, // UUID de configuracion_profesionales_OCI
              nombre: p.nombre || '',
              cargo: p.cargo || 'Profesional OCI',
              email: p.email || ''
            }));
          setAuditores(auditoresMapeados);
        }
      } catch (error) {
        console.error('Error cargando auditores:', error);
      } finally {
        setCargandoAuditores(false);
      }
    };
    
    cargarAuditores();
  }, []);

  // Sincronizar plan activo en localStorage cuando el plan cambia
  useEffect(() => {
    localStorage.setItem(PLAN_ANUAL_STORAGE_KEY, JSON.stringify({
      id: plan.id,
      vigencia: plan.vigencia,
      estado: plan.estado,
      version: plan.version,
      jefeOCINombre: plan.jefeOCI?.nombre ?? '',
      fechaCorte: `${plan.vigencia}-12-31`
    }));
  }, [plan.id]);

  // Estadísticas
  // Estadísticas cacheadas para mejorar rendimiento y scroll
  const { totalActividades, actividadesAsignadas, actividadesCompletadas, actividadesEnEjecucion, avancePromedio } = useMemo(() => {
    const total = plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
    const asignadas = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.responsable !== null).length, 0);
    const completadas = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.estado === 'COMPLETADA').length, 0);
    const enEjecucion = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.estado === 'EN_EJECUCION').length, 0);
    
    const avance = total > 0 
      ? Math.round(plan.roles.reduce((sum, rol) => sum + rol.actividades.reduce((s, a) => {
          const pct = (a.estado === 'Completada' || a.estado === 'COMPLETADA') ? 100 
                    : (a.entradasSeguimiento && a.entradasSeguimiento.length > 0 ? calcularPorcentajeCortes(a) : 0);
          return s + pct;
        }, 0), 0) / total) 
      : 0;

    return { totalActividades: total, actividadesAsignadas: asignadas, actividadesCompletadas: completadas, actividadesEnEjecucion: enEjecucion, avancePromedio: avance };
  }, [plan.roles]);



  const handleEliminarPlan = async () => {
    setMostrarModalEliminar(true);
  };

  const ejecutarEliminacionPlan = async () => {
    setEliminandoPlan(true);
    try {
      const { planAnualApi } = await import('./services/plan-anual/api');
      const res = await planAnualApi.delete(plan.id);
      if (res.success) {
        toast.success('Plan eliminado exitosamente', { description: 'Los registros han sido borrados de la base de datos.'});
        setMostrarModalEliminar(false);
        if (onActualizar) {
          onActualizar(null as any); // Devuelve a la vista inicial
          window.location.reload(); 
        }
      } else {
        toast.error('Error al eliminar', { description: res.error || 'No se pudo eliminar el plan' });
      }
    } catch (error) {
      toast.error('Error al eliminar', { description: 'Ocurrió un error inesperado' });
    } finally {
      setEliminandoPlan(false);
    }
  };

  const handleExportarExcel = async () => {
    setExportando('excel');
    setMostrarModalExportacion(false);
    
    // ✅ NUEVO: Usar exportación local con ExcelJS + Logo (no depende del backend)
    try {
      const resultado = await exportarPlanAnualExcel(plan);
      if (resultado.exito) {
        toast.success('Exportado', { description: 'Excel descargado correctamente con logo ESAP' });
      } else {
        toast.error('Error al exportar Excel', { description: resultado.error || 'Error desconocido' });
      }
    } catch (e) {
      console.error('Error al exportar Excel:', e);
      toast.error('Error al exportar Excel', { description: e instanceof Error ? e.message : 'Error desconocido' });
    }
    setExportando(null);
  };

  const handleExportarPDF = async () => {
    setExportando('pdf');
    setMostrarModalExportacion(false);
    try {
      const jsPDF = (await import('jspdf')).default;
      const autoTable = (await import('jspdf-autotable')).default;
      const vigencia = plan.vigencia ?? (plan as { año?: number }).año ?? new Date().getFullYear();
      
      // Crear documento PDF con jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;

      // Header institucional estandarizado (carga logo dinámicamente)
      const alturaEncabezado = dibujarEncabezadoInstitucional(doc, {
        ...DOCUMENTOS_PREDEFINIDOS.PLAN_ANUAL,
        logoImg: LOGO_ESAP_URL
      });
      
      let currentY = alturaEncabezado + 5;

      // Vigencia
      doc.setTextColor(0, 61, 165);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Vigencia ${vigencia}`, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // Información general
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('INFORMACIÓN GENERAL', margin, currentY);
      currentY += 8;

      const estadoLabel = plan.estado === 'BORRADOR' ? 'Borrador' : 
                          plan.estado === 'EN_REVISION' ? 'En revisión' : 
                          plan.estado === 'APROBADO' ? 'Aprobado' : 
                          plan.estado === 'VIGENTE' ? 'Vigente' : 'Cerrado';

      const infoData = [
        ['Vigencia', vigencia.toString()],
        ['Estado', estadoLabel],
        ['Jefe OCI', plan.jefeOCI?.nombre || ''],
        ['Cargo', plan.jefeOCI?.cargo || ''],
        ['Fecha Creación', new Date(plan.fechaCreacion).toLocaleDateString('es-CO')]
      ];

      autoTable(doc, {
        startY: currentY,
        head: [],
        body: infoData,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 40 },
          1: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Actividades por rol
      let sumaAvanceTotal = 0;
      let totalActividadesCount = 0;
      
      [...plan.roles].sort((a, b) => a.numero - b.numero).forEach((rol, rolIdx) => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 61, 165);
        doc.text(`ROL ${rol.numero}: ${rol.nombre.toUpperCase()}`, margin, currentY);
        currentY += 7;

        // Calcular avance promedio del rol
        const sumaAvanceRol = rol.actividades.reduce((s, a) => {
          const pct = (a.estado === 'Completada' || a.estado === 'COMPLETADA') ? 100 
                    : (a.entradasSeguimiento && a.entradasSeguimiento.length > 0 ? calcularPorcentajeCortes(a) : 0);
          return s + pct;
        }, 0);
        const promedioRol = rol.actividades.length > 0 ? Math.round(sumaAvanceRol / rol.actividades.length) : 0;

        sumaAvanceTotal += sumaAvanceRol;
        totalActividadesCount += rol.actividades.length;

        const actividadesData = rol.actividades.map((act, idx) => {
          const pctFinal = (act.estado === 'Completada' || act.estado === 'COMPLETADA') ? 100 
                    : (act.entradasSeguimiento && act.entradasSeguimiento.length > 0 ? calcularPorcentajeCortes(act) : 0);
          return [
            (idx + 1).toString(),
            act.nombre,
            act.responsable?.nombre || 'Sin asignar',
            act.estado === 'COMPLETADA' ? 'Completada' : 
            act.estado === 'EN_EJECUCION' ? 'En ejecución' : 'Pendiente',
            `${pctFinal}%`
          ];
        });
        
        // Agregar fila de subtotal del rol
        actividadesData.push([
          '',
          `SUBTOTAL ROL (${rol.actividades.length} actividades)`,
          '',
          'PROMEDIO:',
          `${promedioRol}%`
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['#', 'Actividad', 'Responsable', 'Estado', 'Avance']],
          body: actividadesData,
          theme: 'striped',
          headStyles: {
            fillColor: [0, 61, 165],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          styles: { fontSize: 8, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 'auto' },
            2: { cellWidth: 40 },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' }
          },
          margin: { left: margin, right: margin },
          didParseCell: function(data) {
            // Destacar la fila de subtotal
            if (data.row.index === actividadesData.length - 1) {
              data.cell.styles.fillColor = [41, 98, 255];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 8;

        if (currentY > pageHeight - 40 && rolIdx < plan.roles.length - 1) {
          doc.addPage();
          currentY = margin;
        }
      });
      
      // Total general del plan
      const promedioGeneral = totalActividadesCount > 0 ? Math.round(sumaAvanceTotal / totalActividadesCount) : 0;
      
      if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = margin;
      }
      
      // Dibujar cuadro de resumen total
      doc.setFillColor(0, 61, 165);
      doc.rect(margin, currentY, pageWidth - (margin * 2), 15, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`AVANCE TOTAL DEL PLAN: ${promedioGeneral}%`, margin + 5, currentY + 10);
      doc.text(`(${totalActividadesCount} actividades en ${plan.roles.length} roles)`, pageWidth - margin - 80, currentY + 10);
      currentY += 20;

      // Footer institucional
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        dibujarPieInstitucional(doc, i, true);
      }

      doc.save(`Plan-Anual-Auditoria-${vigencia}.pdf`);
      toast.success('PDF generado exitosamente', { description: 'Documento con formato institucional oficial ESAP' });
    } catch (error) {
      console.error('Error generando PDF:', error);
      toast.error('Error al generar PDF', { description: 'Intente nuevamente' });
    }
    setExportando(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="bg-white border-b-2 border-gray-200 px-8 py-6">
        <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {/* Izquierda: icono + título + badge de estado */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 truncate tracking-tight">Plan Anual de Auditoría {plan.vigencia}</h1>
                <span className={`px-2.5 py-0.5 rounded-full font-bold border text-xs whitespace-nowrap ${plan.estado === 'VIGENTE' ? 'bg-green-100 text-green-700 border-green-300' : plan.estado === 'APROBADO' ? 'bg-blue-100 text-blue-700 border-blue-300' : plan.estado === 'EN_REVISION' ? 'bg-orange-100 text-orange-700 border-orange-300' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                  {plan.estado === 'BORRADOR' ? 'Borrador' : plan.estado === 'EN_REVISION' ? 'En revisión' : plan.estado === 'APROBADO' ? 'Aprobado' : plan.estado === 'VIGENTE' ? 'Vigente' : 'Cerrado'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 truncate mt-0.5">Versión {plan.version} • {plan.jefeOCI.nombre}</p>
            </div>
          </div>

          {/* Derecha: selector de plan + botones de acción */}
          <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {planesDisponibles.length > 1 && onCambiarPlan && (
              <select
                value={plan.id}
                onChange={(e) => {
                  const planSeleccionado = planesDisponibles.find(p => p.id === e.target.value);
                  if (planSeleccionado) {
                    localStorage.setItem(PLAN_ANUAL_STORAGE_KEY, JSON.stringify({
                      id: planSeleccionado.id,
                      vigencia: planSeleccionado.vigencia,
                      estado: planSeleccionado.estado,
                      version: planSeleccionado.version,
                      jefeOCINombre: planSeleccionado.jefeOCI?.nombre ?? '',
                      fechaCorte: `${planSeleccionado.vigencia}-12-31`
                    }));
                  }
                  onCambiarPlan(e.target.value);
                }}
                className="px-3 py-1.5 sm:py-2 border-2 border-blue-300 rounded-lg text-sm font-medium bg-blue-50 text-blue-900 focus:outline-none focus:border-blue-500"
              >
                {planesDisponibles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.vigencia} - {p.estado} (v{p.version})
                  </option>
                ))}
              </select>
            )}

            {onCrearNuevo && (
              <button 
                onClick={onCrearNuevo}
                className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-xs sm:text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Nuevo Plan
              </button>
            )}

            <button
              type="button"
              onClick={() => setMostrarModalExportacion(true)}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg text-xs sm:text-sm whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Exportar
            </button>

            {plan.estado === 'BORRADOR' && (
              <button
                type="button"
                onClick={handleEliminarPlan}
                className="flex items-center justify-center p-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-200 shadow-sm"
                title="Eliminar permanentemente este plan en borrador"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {mostrarModalExportacion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
            onClick={() => setMostrarModalExportacion(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#2962FF] to-[#003DA5] px-6 py-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <Download className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-white">Exportar Plan Anual</h2>
                      <p className="text-sm text-blue-100">Vigencia {plan.vigencia} • {plan.id}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setMostrarModalExportacion(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    disabled={!!exportando}
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 mb-6">
                  Selecciona el formato de exportación. El documento incluirá toda la información del Plan Anual según normativa (Decreto 648/2017).
                </p>

                <div className="space-y-3">
                  <button
                    onClick={handleExportarPDF}
                    disabled={!!exportando}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#2962FF] hover:bg-blue-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-red-100 group-hover:bg-red-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        <FileText className="w-6 h-6 text-red-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-base font-bold text-gray-900 mb-1">📄 Exportar a PDF</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Documento oficial con diseño corporativo ESAP. Incluye portada, roles, actividades y firmas.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✓ Diseño corporativo</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">✓ Normativa 648/2017</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">✓ Listo para firmar</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {exportando === 'pdf' ? (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5 text-gray-400 group-hover:text-[#2962FF]" />
                        )}
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleExportarExcel}
                    disabled={!!exportando}
                    className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-green-600 hover:bg-green-50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors">
                        <FileSpreadsheet className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="text-base font-bold text-gray-900 mb-1">📊 Exportar a Excel</h3>
                        <p className="text-sm text-gray-600 mb-2">
                          Tabla estructurada editable con todas las actividades. Ideal para análisis, seguimiento y modificaciones.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">✓ Editable</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">✓ Con fórmulas</span>
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">✓ Análisis de datos</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {exportando === 'excel' ? (
                          <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5 text-gray-400 group-hover:text-green-600" />
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-1">Información incluida en ambos formatos:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• 5 Roles del Decreto 648/2017</li>
                        <li>• {plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0)} actividades programadas</li>
                        <li>• Responsables asignados y fechas</li>
                        <li>• Estado de cumplimiento y avances</li>
                        <li>• Información del Jefe OCI: {plan.jefeOCI.nombre}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de Confirmación de Eliminación */}
        {mostrarModalEliminar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm"
            onClick={() => !eliminandoPlan && setMostrarModalEliminar(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            >
              <div className="p-6 text-center pt-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  ¿Eliminar este Plan Anual?
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Estás a punto de eliminar permanentemente el Plan Anual de Auditoría <strong>{plan.vigencia}</strong>. 
                  Esta acción no tiene marcha atrás y eliminará todas sus actividades configuradas.
                </p>
                
                <div className="flex gap-3 mt-8">
                  <button
                    onClick={() => setMostrarModalEliminar(false)}
                    disabled={eliminandoPlan}
                    className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Mantener plan
                  </button>
                  <button
                    onClick={ejecutarEliminacionPlan}
                    disabled={eliminandoPlan}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {eliminandoPlan ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Sí, eliminar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase mb-1">Total</p>
            <p className="text-2xl font-bold text-blue-900">{totalActividades}</p>
            <p className="text-xs text-blue-600">Actividades</p>
          </div>
          <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-purple-600 uppercase mb-1">Asignadas</p>
            <p className="text-2xl font-bold text-purple-900">{actividadesAsignadas}</p>
            <p className="text-xs text-purple-600">de {totalActividades}</p>
          </div>
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-orange-600 uppercase mb-1">En ejecución</p>
            <p className="text-2xl font-bold text-orange-900">{actividadesEnEjecucion}</p>
            <p className="text-xs text-orange-600">Actividades</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-green-600 uppercase mb-1">Completadas</p>
            <p className="text-2xl font-bold text-green-900">{actividadesCompletadas}</p>
            <p className="text-xs text-green-600">Actividades</p>
          </div>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg p-4 flex items-center justify-center">
            <SemaforoSeguimientoPAI 
              porcentaje={avancePromedio}
              variant="circular"
              size="lg"
              showIcon={false}
            />
          </div>
        </div>

        {/* Banner informativo - Sistema en uso */}
        {plan.estado === 'VIGENTE' && (
          <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-900">
                <strong>Plan Vigente:</strong> Este es el plan actual en ejecución. 
                {onCrearNuevo && <span className="ml-1">Puedes crear un nuevo plan para la próxima vigencia usando el botón "Crear Nuevo Plan" arriba.</span>}
              </p>
            </div>
          </div>
        )}

        {/* Tabs - Filtradas según permisos */}
        <div className="flex gap-2 border-b border-gray-200">
          {[
            { id: 'gestion', label: 'Gestión y Seguimiento', icon: <TrendingUp className="w-4 h-4" />, visible: true },
            { id: 'aprobar', label: 'Aprobación', icon: <FileCheck className="w-4 h-4" />, visible: true }
          ].filter(tab => tab.visible).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSeccion(tab.id as any)}
              className={`px-5 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-all ${seccion === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        </div>{/* cierre max-w-7xl */}
      </div>

      <div className="flex-1 overflow-y-auto bg-gray-50 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            {seccion === 'gestion' && <SeccionGestionYSeguimiento key="gestion" plan={plan} planesAnteriores={planesAnteriores} onActualizar={onActualizar} onRefetchPlan={onRefetchPlan} onAbrirRol4={onAbrirRol4} auditores={auditores} cargandoAuditores={cargandoAuditores} onCambiarPlan={onCambiarPlan} />}
            {seccion === 'aprobar' && <SeccionAprobacion key="aprobar" plan={plan} onActualizar={onActualizar} onRefetchPlan={onRefetchPlan} puedeAprobarPlan={puedeAprobarPlan} puedeActivarPlan={puedeActivarPlan} puedeEditarPlan={puedeEditarPlan} auditores={auditores} />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: GESTIÓN Y SEGUIMIENTO (UNIFICADA)
// ════════════════════════════════════════════════════════════════════════════
// Esta sección combina el resumen ejecutivo con el seguimiento detallado
// permitiendo al usuario ver el estado general y hacer seguimiento sin cambiar de pestaña

function SeccionGestionYSeguimiento({ 
  plan, 
  planesAnteriores = [], 
  onActualizar, 
  onRefetchPlan,
  onAbrirRol4,
  auditores,
  cargandoAuditores = false,
  onCambiarPlan
}: { 
  plan: PlanAnual; 
  planesAnteriores?: PlanAnual[]; 
  onActualizar: (plan: PlanAnual) => void; 
  onRefetchPlan?: () => Promise<void>;
  onAbrirRol4?: () => void;
  auditores: Auditor[];
  cargandoAuditores?: boolean;
  onCambiarPlan?: (planId: string) => void;
}) {

  // Estados para el seguimiento
  const [rolExpandido, setRolExpandido] = useState<number | string | null>(null);
  const [actividadExpandida, setActividadExpandida] = useState<number | string | null>(null);
  const [modoCardExpandida, setModoCardExpandida] = useState<'seguimiento' | 'edicion'>('seguimiento');
  const [modalAdjuntos, setModalAdjuntos] = useState<{ actividadId: number | string; rolNumero: number } | null>(null);
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [mostrarSelectorApoyo, setMostrarSelectorApoyo] = useState(false);

  // Estado para formulario de nueva actividad inline
  const [mostrarFormNuevaActividad, setMostrarFormNuevaActividad] = useState<number | null>(null);
  const [nuevaActividad, setNuevaActividad] = useState<ActividadBase>({
    nombre: '',
    descripcion: '',
    fechaInicio: new Date().toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    control: 'Seguimiento trimestral',
    evaluacion: '0% avance',
    seguimiento: 'Por definir'
  });

  // Asignar responsables integrados
  const [asignandoId, setAsignandoId] = useState<string | number | null>(null);
  
  const asignarResponsableInline = async (rolNumero: number, actividadId: number | string, auditor: Auditor) => {
    setAsignandoId(actividadId);
    const actividadActual = plan.roles.find(r => r.numero === rolNumero)?.actividades.find(a => a.id === actividadId);
    const responsablesActuales = actividadActual?.responsables?.length ? actividadActual.responsables : (actividadActual?.responsable ? [actividadActual.responsable] : []);
    
    if (responsablesActuales.some((r: Auditor) => r.id === auditor.id)) {
      toast.info('Ya asignado', { description: `${auditor.nombre} ya es responsable de esta actividad` });
      setAsignandoId(null);
      return;
    }
    
    const nuevosResponsables = [...responsablesActuales, auditor];
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return { ...rol, actividades: rol.actividades.map(act => act.id === actividadId ? { ...act, responsables: nuevosResponsables, responsable: nuevosResponsables[0] } : act) };
        }
        return rol;
      })
    };
    onActualizar(planActualizado as any);
    
    try {
      const res = await actividadesApi.update(String(actividadId), { responsable: nuevosResponsables[0].nombre, responsables: nuevosResponsables });
      if (res.success) { toast.success('Responsable agregado'); onRefetchPlan?.(); } else { toast.error('Error', { description: res.error }); }
    } catch (e) { toast.error('Error al guardar en el servidor'); }
    finally { setAsignandoId(null); }
  };

  const quitarResponsableInline = async (rolNumero: number, actividadId: number | string, auditorId: string) => {
    setAsignandoId(actividadId);
    const actividadActual = plan.roles.find(r => r.numero === rolNumero)?.actividades.find(a => a.id === actividadId);
    const responsablesActuales = actividadActual?.responsables?.length ? actividadActual.responsables : (actividadActual?.responsable ? [actividadActual.responsable] : []);
    const nuevosResponsables = responsablesActuales.filter((r: Auditor) => r.id !== auditorId);
    
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return { ...rol, actividades: rol.actividades.map(act => act.id === actividadId ? { ...act, responsables: nuevosResponsables, responsable: nuevosResponsables[0] || null } : act) };
        }
        return rol;
      })
    };
    onActualizar(planActualizado as any);
    
    try {
      const res = await actividadesApi.update(String(actividadId), { responsable: nuevosResponsables[0]?.nombre || '', responsables: nuevosResponsables });
      if (res.success) { toast.success('Asignación removida'); onRefetchPlan?.(); } else { toast.error('Error', { description: res.error }); }
    } catch (e) { toast.error('Error al guardar en el servidor'); }
    finally { setAsignandoId(null); }
  };

  // ── AGREGAR ACTIVIDAD INLINE ─────────────────────────────────────────────
  const agregarActividadInline = async (rolNumero: number) => {
    if (!nuevaActividad.nombre.trim()) {
      toast.error('El nombre de la actividad es obligatorio');
      return;
    }

    try {
      const payload = {
        nombre: nuevaActividad.nombre.trim(),
        descripcion: nuevaActividad.descripcion.trim(),
        fecha_inicio: nuevaActividad.fechaInicio,
        fecha_fin: nuevaActividad.fechaFin,
        rol_numero: rolNumero,
        plan_anual_id: plan.id,
        estado: 'pendiente',
        porcentaje_avance: 0,
      };

      const res = await actividadesApi.create(payload);
      if (res.success) {
        toast.success('Actividad agregada', { description: `"${nuevaActividad.nombre}" añadida al Rol ${rolNumero}` });
        setNuevaActividad({
          nombre: '',
          descripcion: '',
          fechaInicio: new Date().toISOString().split('T')[0],
          fechaFin: new Date().toISOString().split('T')[0],
          control: 'Seguimiento trimestral',
          evaluacion: '0% avance',
          seguimiento: 'Por definir'
        });
        setMostrarFormNuevaActividad(null);
        onRefetchPlan?.();
      } else {
        toast.error('Error al crear actividad', { description: res.error || 'Inténtalo de nuevo' });
      }
    } catch (error: any) {
      console.error('[agregarActividadInline] Error:', error);
      toast.error('Error al crear actividad', { description: error?.message || 'Error de red' });
    }
  };

  // ── ENTRADAS DE SEGUIMIENTO POR CORTE ────────────────────────────────────
  const [corteConFormAbierto, setCorteConFormAbierto] = useState<string | null>(null);
  const [formEntrada, setFormEntrada] = useState<{ texto: string; tipo: 'seguimiento' | 'hallazgo' | 'cierre' }>({ texto: '', tipo: 'seguimiento' });
  const [guardandoEntrada, setGuardandoEntrada] = useState(false);
  const [futuroExpandido, setFuturoExpandido] = useState<Record<string, boolean>>({});
  const [modalCorteId, setModalCorteId] = useState<string | null>(null);

  // Modal de confirmación para desactivar/activar actividades
  const [modalConfirmacion, setModalConfirmacion] = useState<{
    visible: boolean;
    tipo: 'desactivar' | 'activar';
    rolNumero: number;
    actividadId: number | string;
    actividadNombre: string;
  } | null>(null);
  
  // ✅ NUEVO: Modal de edición de actividad (Decreto 648/2017)
  const [modalEdicion, setModalEdicion] = useState<{
    visible: boolean;
    rolNumero: number;
    actividad: Actividad;
  } | null>(null);
  const [formularioEdicion, setFormularioEdicion] = useState({
    nombre: '',
    descripcion: '',
    control: '',
    evaluacion: '',
    seguimiento: '',
    fechaInicio: '',
    fechaFin: '',
    tareas: [] as any[],
    puntosControl: [] as any[],
    frecuenciaPuntosControl: 'trimestral',
    fechaCorte: ''
  });
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [modalCortesConfig, setModalCortesConfig] = useState(false);
  
  // ✅ Modificado: roles colapsados por defecto (true)
  const [rolesColapsados, setRolesColapsados] = useState<Record<number, boolean>>(() => {
    const estado: Record<number, boolean> = {};
    if (plan?.roles) plan.roles.forEach(r => estado[r.numero] = true);
    return estado;
  });
  const [formulario, setFormulario] = useState({
    control: '',
    evaluacion: '',
    seguimiento: '',
    porcentaje: 0
  });
  
  // Hook para sincronizar evidencias con backend
  const { guardar: guardarEvidencias } = useSaveEvidencias();
  
  // Estado para indicar que se está guardando
  const [guardando, setGuardando] = useState(false);

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISOS: Sistema flexible basado en permisos para Control Interno
  // ═══════════════════════════════════════════════════════════════════════════
  const { puedeRealizar, esSuperUsuario } = useControlInternoPermissions();
  const puedeEditarPlan = puedeRealizar('plan-anual', 'edit');
  const puedeSeguimiento = puedeRealizar('plan-anual', 'follow-up');
  const puedeEliminarPlan = puedeRealizar('plan-anual', 'delete');
  const puedeAprobarPlan = puedeRealizar('plan-anual', 'approve');
  const puedeAsignarActividades = puedeRealizar('plan-anual', 'assign');
  // Permiso compuesto: editar O seguimiento para gestionar evidencias
  const puedeGestionarEvidencias = puedeEditarPlan || puedeSeguimiento;

  // ✅ Usuario para visualización condicional
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    try {
      const userDataStr = localStorage.getItem('esap_user_data');
      if (userDataStr) setCurrentUser(JSON.parse(userDataStr));
    } catch (e) {}
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVO: Estado para cumplimiento de auditorías (Rol 4)
  // ═══════════════════════════════════════════════════════════════════════════
  const [cumplimientoAuditorias, setCumplimientoAuditorias] = useState<{
    totalProgramadas: number;
    totalFinalizadas: number;
    porcentajeCumplimiento: number;
    desglosePorTipo: Record<string, { programadas: number; finalizadas: number; en_proceso: number; pendientes: number }>;
    actividadId?: string;
    cargando: boolean;
  }>({
    totalProgramadas: 0,
    totalFinalizadas: 0,
    porcentajeCumplimiento: 0,
    desglosePorTipo: {},
    cargando: true
  });

  // Vigencia con fallback (plan puede tener vigencia o año)
  const vigenciaPlan = plan.vigencia ?? (plan as { año?: number }).año ?? new Date().getFullYear();

  // Cargar datos de cumplimiento de auditorías al montar y al refrescar
  const cargarCumplimiento = async () => {
    setCumplimientoAuditorias(prev => ({ ...prev, cargando: true }));
    try {
      const resultado = await controlInternoService.getCumplimientoAuditorias(vigenciaPlan);
      setCumplimientoAuditorias({
        ...resultado,
        cargando: false
      });
    } catch (error) {
      console.error('[AUDITORÍAS] Error cargando cumplimiento:', error);
      setCumplimientoAuditorias(prev => ({
        ...prev,
        totalProgramadas: 0,
        totalFinalizadas: 0,
        porcentajeCumplimiento: 0,
        desglosePorTipo: {},
        cargando: false
      }));
    }
  };

  useEffect(() => {
    cargarCumplimiento();
  }, [vigenciaPlan]);

  // Refrescar cumplimiento y recargar plan (para sincronizar actividades con tipo_calculo=auditorias)
  const handleRefrescarCumplimiento = async () => {
    await cargarCumplimiento();
    onRefetchPlan?.();
  };

  // ✅ NUEVO: Función para toggle del colapso de un rol específico
  const toggleRolColapsado = (numeroRol: number) => {
    setRolesColapsados(prev => ({
      ...prev,
      [numeroRol]: !prev[numeroRol]
    }));
  };

  // ✅ NUEVO: Función para expandir/colapsar todos los roles
  const toggleTodosRoles = (colapsar: boolean) => {
    const nuevoEstado: Record<number, boolean> = {};
    plan.roles.forEach(rol => {
      nuevoEstado[rol.numero] = colapsar;
    });
    setRolesColapsados(nuevoEstado);
  };

  // Funciones de seguimiento
  const abrirSeguimiento = (actividad: Actividad) => {
    // DEBUG: Ver datos de la actividad incluyendo configuracionEvidencias
    console.log('[SEGUIMIENTO] Abriendo actividad:', {
      id: actividad.id,
      nombre: actividad.nombre,
      estado: actividad.estado,
      porcentajeAvance: actividad.porcentajeAvance,
      configuracionEvidencias: actividad.configuracionEvidencias,
      adjuntos: actividad.adjuntos?.length || 0,
      observaciones: contarObservaciones(actividad.observacionesCumplimiento),
      actividadCompleta: actividad
    });
    
    const porcentajeCalculado = calcularPorcentajeAutomatico(actividad);
    const controlAutomatico = actividad.frecuenciaPuntosControl 
      ? obtenerTextoPeriodicidad(actividad.frecuenciaPuntosControl)
      : actividad.control;
    
    setFormulario({
      control: controlAutomatico,
      evaluacion: actividad.evaluacion,
      seguimiento: actividad.seguimiento,
      porcentaje: porcentajeCalculado
    });
    setNuevaObservacion('');
    setMostrarSelectorApoyo(false);
    setActividadExpandida(actividad.id);
  };

  // Función para desactivar una actividad (soft delete)
  const desactivarActividad = async (rolNumero: number, actividadId: number | string) => {
    console.log('🚫 [desactivarActividad] Desactivando actividad:', { rolNumero, actividadId });
    
    try {
      const res = await actividadesApi.delete(String(actividadId));
      console.log('🚫 [desactivarActividad] Respuesta del backend:', res);

      if (res.success) {
        // Actualizar estado local - marcar como inactiva
        const planActualizado = {
          ...plan,
          roles: plan.roles.map(rol => {
            if (rol.numero === rolNumero) {
              return {
                ...rol,
                actividades: rol.actividades.map(act => 
                  act.id === actividadId ? { ...act, activo: false } : act
                )
              };
            }
            return rol;
          })
        };
        onActualizar(planActualizado);
        toast.success('Actividad desactivada', { description: 'La actividad ha sido marcada como inactiva' });
        
        // Refrescar plan completo desde el backend
        onRefetchPlan?.();
      } else {
        toast.error('Error al desactivar', { description: res.error || 'No se pudo desactivar en el servidor' });
      }
    } catch (error) {
      console.error('Error desactivando actividad:', error);
      toast.error('Error', { description: 'No se pudo desactivar la actividad' });
    }
  };

  // Función para REACTIVAR una actividad
  const reactivarActividad = async (rolNumero: number, actividadId: number | string) => {
    console.log('✅ [reactivarActividad] Reactivando actividad:', { rolNumero, actividadId });
    
    try {
      // Llamar al endpoint de actualización para cambiar activo a true
      const res = await actividadesApi.update(String(actividadId), { activo: true } as any);
      console.log('✅ [reactivarActividad] Respuesta del backend:', res);

      if (res.success) {
        // Actualizar estado local - marcar como activa
        const planActualizado = {
          ...plan,
          roles: plan.roles.map(rol => {
            if (rol.numero === rolNumero) {
              return {
                ...rol,
                actividades: rol.actividades.map(act => 
                  act.id === actividadId ? { ...act, activo: true } : act
                )
              };
            }
            return rol;
          })
        };
        onActualizar(planActualizado);
        toast.success('Actividad reactivada', { description: 'La actividad está activa nuevamente' });
        
        // Refrescar plan completo desde el backend
        onRefetchPlan?.();
      } else {
        toast.error('Error al reactivar', { description: res.error || 'No se pudo reactivar en el servidor' });
      }
    } catch (error) {
      console.error('Error reactivando actividad:', error);
      toast.error('Error', { description: 'No se pudo reactivar la actividad' });
    }
  };

  // ✅ NUEVO: Abrir edición de actividad inline
  const abrirModalEdicion = (actividad: Actividad, rolNumero: number) => {
    setFormularioEdicion({
      nombre: actividad.nombre || '',
      descripcion: actividad.descripcion || '',
      control: actividad.control || '',
      evaluacion: actividad.evaluacion || '',
      seguimiento: actividad.seguimiento || '',
      fechaInicio: actividad.fechaInicio || '',
      fechaFin: actividad.fechaFin || '',
      tareas: actividad.tareasSeguimiento || [],
      puntosControl: actividad.puntosControl || [],
      frecuenciaPuntosControl: actividad.frecuenciaPuntosControl || 'trimestral',
      fechaCorte: (actividad.puntosControl && actividad.puntosControl.length > 0) ? actividad.puntosControl[actividad.puntosControl.length - 1].fechaProgramada : (actividad.fechaFin || '')
    });
    setModalEdicion({ visible: true, rolNumero, actividad });
    setActividadExpandida(actividad.id || null);
    setModoCardExpandida('edicion');
  };

  // ✅ NUEVO: Guardar edición de actividad
  const guardarEdicionActividad = async () => {
    if (!modalEdicion) return;
    
    setGuardandoEdicion(true);
    try {
      const payload = {
        nombre: formularioEdicion.nombre,
        descripcion: formularioEdicion.descripcion,
        control: formularioEdicion.control,
        evaluacion: formularioEdicion.evaluacion,
        seguimiento: formularioEdicion.seguimiento,
        fecha_inicio: formularioEdicion.fechaInicio,
        fecha_fin: formularioEdicion.fechaFin,
        tareas_seguimiento: formularioEdicion.tareas,
        puntos_control: formularioEdicion.puntosControl,
        frecuencia_puntos_control: formularioEdicion.frecuenciaPuntosControl
      };
      
      console.log('✏️ [guardarEdicionActividad] Guardando:', payload);
      const res = await actividadesApi.update(String(modalEdicion.actividad.id), payload as any);
      
      if (res.success) {
        // Actualizar estado local
        const planActualizado = {
          ...plan,
          roles: plan.roles.map(rol => {
            if (rol.numero === modalEdicion.rolNumero) {
              return {
                ...rol,
                actividades: rol.actividades.map(act => 
                  act.id === modalEdicion.actividad.id 
                    ? { 
                        ...act, 
                        nombre: formularioEdicion.nombre,
                        descripcion: formularioEdicion.descripcion,
                        control: formularioEdicion.control,
                        evaluacion: formularioEdicion.evaluacion,
                        seguimiento: formularioEdicion.seguimiento,
                        fechaInicio: formularioEdicion.fechaInicio,
                        fechaFin: formularioEdicion.fechaFin,
                        tareasSeguimiento: formularioEdicion.tareas,
                        puntosControl: formularioEdicion.puntosControl,
                        frecuenciaPuntosControl: formularioEdicion.frecuenciaPuntosControl
                      } 
                    : act
                )
              };
            }
            return rol;
          })
        };
        onActualizar(planActualizado);
        toast.success('Actividad actualizada', { description: 'Los cambios se guardaron correctamente' });
        setModalEdicion(null);
        setModoCardExpandida('seguimiento');
        onRefetchPlan?.();
      } else {
        toast.error('Error al guardar', { description: res.error || 'No se pudieron guardar los cambios' });
      }
    } catch (error) {
      console.error('Error guardando edición:', error);
      toast.error('Error', { description: 'No se pudo guardar la edición' });
    } finally {
      setGuardandoEdicion(false);
    }
  };

  // Handler para confirmar acción desde modal
  const confirmarAccionActividad = () => {
    console.log('✅ confirmarAccionActividad llamado, modalConfirmacion:', modalConfirmacion);
    if (!modalConfirmacion) return;
    
    if (modalConfirmacion.tipo === 'desactivar') {
      desactivarActividad(modalConfirmacion.rolNumero, modalConfirmacion.actividadId);
    } else {
      reactivarActividad(modalConfirmacion.rolNumero, modalConfirmacion.actividadId);
    }
    setModalConfirmacion(null);
  };

  const agregarObservacion = (rolNumero: number, actividadId: number | string) => {
    if (!nuevaObservacion.trim()) {
      toast.error('Observación vacía', { description: 'Debes escribir una observación' });
      return;
    }

    const nuevaObs: ObservacionCumplimiento = {
      id: `obs-${Date.now()}`,
      texto: nuevaObservacion.trim(),
      fechaRegistro: new Date().toISOString(),
      registradoPor: plan.jefeOCI.nombre
    };

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: [
                    ...obsActuales,
                    nuevaObs
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setNuevaObservacion('');
    toast.success('Observación agregada', { description: 'Se registró exitosamente' });
  };

  const eliminarObservacion = (rolNumero: number, actividadId: number | string, observacionId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: obsActuales.filter((obs: ObservacionCumplimiento) => obs.id !== observacionId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Observación eliminada');
  };

  const agregarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditor: Auditor) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const apoyoExiste = (act.responsablesApoyo || []).some(r => r.id === auditor.id);
                const esPrincipal = act.responsable?.id === auditor.id;
                
                if (apoyoExiste || esPrincipal) {
                  toast.error('Responsable ya asignado', { 
                    description: esPrincipal ? 'Ya es el responsable principal' : 'Ya está en el equipo de apoyo'
                  });
                  return act;
                }
                
                return { 
                  ...act,
                  responsablesApoyo: [
                    ...(act.responsablesApoyo || []),
                    auditor
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setMostrarSelectorApoyo(false);
    toast.success('Responsable de apoyo agregado', { description: `${auditor.nombre} se agregó al equipo` });
  };

  const eliminarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditorId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  responsablesApoyo: (act.responsablesApoyo || []).filter(r => r.id !== auditorId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Responsable de apoyo eliminado');
  };

  const agregarEntrada = async (rolNumero: number, actividadId: number | string, puntoControlId: string) => {
    if (!formEntrada.texto.trim()) {
      toast.error('Observación requerida', { description: 'Escribe al menos una observación para registrar la entrada.' });
      return;
    }
    setGuardandoEntrada(true);
    try {
      const actividadActual = plan.roles
        .find(r => r.numero === rolNumero)
        ?.actividades.find(a => a.id === actividadId);

      // Usar el usuario logueado actual, no el Jefe OCI
      const nombreUsuarioActual = currentUser?.nombre || currentUser?.nombre_completo || plan.jefeOCI?.nombre || 'Usuario';
      const nuevaEntrada: EntradaSeguimiento = {
        id: crypto.randomUUID(),
        puntoControlId,
        fechaRegistro: new Date().toISOString().split('T')[0],
        registradoPor: nombreUsuarioActual,
        usuarioId: currentUser?.id || currentUser?.userId || plan.jefeOCI?.id,
        texto: formEntrada.texto.trim(),
        tipo: formEntrada.tipo,
      };

      const entradasActualizadas = [...(actividadActual?.entradasSeguimiento || []), nuevaEntrada];
      const actividadConEntradas = { ...(actividadActual || {}), entradasSeguimiento: entradasActualizadas } as Actividad;
      const nuevoPct = calcularPorcentajeCortes(actividadConEntradas);

      const nuevoEstado: EstadoActividad =
        nuevoPct === 100 ? 'COMPLETADA' :
        nuevoPct > 0 ? 'EN_EJECUCION' :
        'PENDIENTE';
      const estadoBackend =
        nuevoEstado === 'COMPLETADA' ? 'completada' :
        nuevoEstado === 'EN_EJECUCION' ? 'en-progreso' :
        'pendiente';

      const response = await actividadesApi.update(String(actividadId), {
        entradas_seguimiento: entradasActualizadas,
        porcentaje_avance: nuevoPct,
        estado: estadoBackend as any,
      });

      if (!response.success) {
        toast.error('Error al guardar', { description: response.error || 'No se pudo guardar la entrada.' });
        return;
      }

      const planActualizado = {
        ...plan,
        roles: plan.roles.map(rol => {
          if (rol.numero === rolNumero) {
            return {
              ...rol,
              actividades: rol.actividades.map(act => {
                if (act.id === actividadId) {
                  return { ...act, entradasSeguimiento: entradasActualizadas, porcentajeAvance: nuevoPct, estado: nuevoEstado };
                }
                return act;
              })
            };
          }
          return rol;
        })
      };
      onActualizar(planActualizado);
      setCorteConFormAbierto(null);
      setFormEntrada({ texto: '', tipo: 'seguimiento' });
      toast.success('Entrada registrada', { description: 'El seguimiento del corte fue guardado.' });
    } catch (e: any) {
      toast.error('Error inesperado', { description: e?.message || 'Intenta de nuevo.' });
    } finally {
      setGuardandoEntrada(false);
    }
  };

  const guardarSeguimiento = async (rolNumero: number, actividadId: number | string) => {
    const actividadActual = plan.roles
      .find(r => r.numero === rolNumero)
      ?.actividades.find(a => a.id === actividadId);

    if (
      formulario.porcentaje === 100 && 
      actividadActual?.requiereAutorizacionJefeOCI && 
      !actividadActual?.autorizadaPorJefeOCI
    ) {
      toast.error('Autorización requerida', { 
        description: 'Esta actividad requiere autorización del Jefe OCI antes de completarse al 100%' 
      });
      return;
    }

    // Si tiene cortes configurados, el % se calcula automáticamente; si no, conservar el actual
    const pctFinal = actividadActual?.puntosControl && actividadActual.puntosControl.length > 0
      ? calcularPorcentajeCortes(actividadActual)
      : actividadActual?.porcentajeAvance ?? 0;

    const nuevoEstado: EstadoActividad = 
      pctFinal === 100 ? 'COMPLETADA' :
      pctFinal > 0 ? 'EN_EJECUCION' :
      'PENDIENTE';

    // Mapear estado del frontend al formato del backend
    const estadoBackend = 
      nuevoEstado === 'COMPLETADA' ? 'completada' :
      nuevoEstado === 'EN_EJECUCION' ? 'en-progreso' :
      'pendiente';

    setGuardando(true);
    
    try {
      // Preparar payload - Backend espera estos campos exactos
      const payload = {
        estado: estadoBackend as any,
        porcentaje_avance: pctFinal,
        control: formulario.control,
        evaluacion: formulario.evaluacion,
        seguimiento: formulario.seguimiento,
        ...(actividadActual?.entradasSeguimiento ? { entradas_seguimiento: actividadActual.entradasSeguimiento } : {})
      };
      
      console.log('[GUARDAR] Payload:', payload);
      
      const response = await actividadesApi.update(String(actividadId), payload);
      
      console.log('[GUARDAR] Respuesta backend:', response);
      
      if (!response.success) {
        const errorMsg = response.error || 'No se pudo actualizar la actividad';
        toast.error('No se puede completar', { 
          description: errorMsg,
          duration: 6000 
        });
        setGuardando(false);
        return;
      }
    } catch (error: any) {
      console.error('[GUARDAR] Error al guardar en backend:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Error al guardar el seguimiento';
      toast.error('Error al guardar', { 
        description: errorMsg,
        duration: 6000 
      });
      setGuardando(false);
      return;
    }

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  control: formulario.control,
                  evaluacion: formulario.evaluacion,
                  seguimiento: formulario.seguimiento,
                  porcentajeAvance: pctFinal,
                  estado: nuevoEstado
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };
    
    onActualizar(planActualizado);
    setGuardando(false);
    toast.success('Seguimiento registrado', { description: 'Información actualizada correctamente' });
    setActividadExpandida(null);
    setNuevaObservacion('');
    setMostrarSelectorApoyo(false);
    // Recargar plan desde backend para que adjuntos y datos queden sincronizados
    try {
      await onRefetchPlan?.();
    } catch (e) {
      console.warn('[SeccionGestionYSeguimiento] Error al recargar plan tras guardar:', e);
    }
  };

  const renderBotonToggleRoles = () => {
    const todosColapsados = plan.roles.length > 0 && plan.roles.every(r => rolesColapsados[r.numero] === true);
    return (
      <button
        onClick={() => toggleTodosRoles(!todosColapsados)}
        className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-md font-semibold text-xs flex items-center gap-2 transition-all shadow-sm"
      >
        {todosColapsados ? (
          <>
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            Expandir todos los roles
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
            Colapsar todos los roles
          </>
        )}
      </button>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ══════════════════════════════════════════════════════════════════════
          PARTE 1: CONTEXTO DEL PLAN
          ══════════════════════════════════════════════════════════════════════ */}
      

      {/* Información general - RESPONSIVE GRID */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
          Información general
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-600 mb-1">Vigencia</p>
            <p className="text-2xl font-bold text-gray-900">{plan.vigencia}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Versión</p>
            <p className="text-2xl font-bold text-gray-900">V{plan.version}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Jefe responsable</p>
            <p className="font-semibold text-gray-900">{plan.jefeOCI.nombre}</p>
            <p className="text-sm text-gray-600">{plan.jefeOCI.cargo}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Fecha de creación</p>
            <p className="font-semibold text-gray-900">
              {new Date(plan.fechaCreacion).toLocaleDateString('es-CO', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Alertas y recomendaciones (Colapsable para ahorrar espacio) */}
      <details className="bg-blue-50 border border-blue-200 rounded-lg overflow-hidden group mb-6 [&_summary::-webkit-details-marker]:hidden">
        <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-blue-100/50 transition-colors select-none">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="font-semibold text-blue-900 text-sm m-0">
              {plan.estado === 'BORRADOR' ? 'Instrucciones: Modo Borrador' : 'Información y Gestión del Plan'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-[10px] font-mono text-blue-400 opacity-70">ID: {plan.id}</span>
             <svg className="w-4 h-4 text-blue-600 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </summary>
        
        <div className="px-4 pb-4 pt-2 border-t border-blue-100 bg-white/40">
          <p className="text-xs text-blue-800 mb-3 leading-relaxed">
            {plan.estado === 'BORRADOR'
              ? 'Tu plan está en Borrador. Asegúrate de desplegar los roles, asignar responsables y definir la periodicidad (fechas y cortes) antes de solicitar su aprobación para iniciar ejecución.'
              : 'Estás visualizando un plan en ejecución. Este sistema permite gestionar el plan completo, asignar responsables, hacer seguimiento y aprobar actividades.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <div className="bg-white border border-blue-200 shadow-sm rounded-md p-2 inline-flex items-start gap-1.5 flex-1 min-w-[250px]">
              <span className="text-sm leading-none">📌</span>
              <p className="text-[10px] text-blue-800 leading-tight">
                <strong>Cumplimiento Normativo:</strong> Estructura obligatoria del Decreto 648 de 2017 empleando 5 roles estratégicos fijos.
              </p>
            </div>
            <div className="bg-white border border-blue-200 shadow-sm rounded-md p-2 inline-flex items-start gap-1.5 flex-1 min-w-[250px]">
              <span className="text-sm leading-none">⚙️</span>
              <p className="text-[10px] text-blue-800 leading-tight">
                 <strong>Sistema Automático:</strong> El porcentaje de avance se calcula automáticamente conforme a las evidencias y cortes.
              </p>
            </div>
          </div>
        </div>
      </details>

      {/* Historial de Planes Anteriores */}
      {planesAnteriores.length > 0 && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Historial de Planes Anteriores
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm text-gray-500 font-medium">{planesAnteriores.length} plan(es) completado(s)</span>
              {renderBotonToggleRoles()}
            </div>
          </div>
          
          <div className="space-y-3">
            {planesAnteriores.map((planAnterior) => (
              <div 
                key={planAnterior.id}
                className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Plan Anual de Auditoría {planAnterior.vigencia}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {planAnterior.id} • Jefe OCI: {planAnterior.jefeOCI.nombre}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    planAnterior.estado === 'BORRADOR' || planAnterior.estado === 'EN_REVISION'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {planAnterior.estado}
                  </span>
                  <div className="text-right text-xs text-gray-500">
                    <p>Aprobado: {planAnterior.fechaAprobacion || 'N/A'}</p>
                    <p>{planAnterior.roles.reduce((sum, rol) => sum + rol.actividades.length, 0)} actividades</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          GESTIÓN Y SEGUIMIENTO POR ROL
          Vista unificada: estadísticas + seguimiento detallado
          ══════════════════════════════════════════════════════════════════════ */}
      
      {/* ✅ NUEVO: Botones de control global reubicados en 1 solo botón para ahorrar espacio */}
      {planesAnteriores.length === 0 && (
        <div className="flex justify-end mb-2">
          {renderBotonToggleRoles()}
        </div>
      )}

      {/* Lista de roles y actividades con seguimiento */}
      {[...plan.roles].sort((a, b) => a.numero - b.numero).map((rol) => {
        // Solo contar actividades activas (activo !== false) para estadísticas
        const actividadesActivas = rol.actividades.filter(a => a.activo !== false);

        // ✅ DEFINIR SI EL USUARIO PUEDE VER TODO EL PLAN
        const liderazgoVerTodos = puedeAprobarPlan || esSuperUsuario || puedeEditarPlan || puedeAsignarActividades;

        // ✅ FILTRAR ACTIVIDADES PARA QUE EL AUDITOR SOLO VEA LAS PROPIAS
        const actividadesVisibles = actividadesActivas.filter(actividad => {
          if (liderazgoVerTodos) return true; // Líderes o planificadores ven todo
          if (!currentUser) return false;
          
          const currentName = currentUser.nombre || currentUser.nombres || '';
          const currentId = String(currentUser.id || currentUser.idPersona || currentUser.documento || '');

          const isMainResp = String(actividad.responsable?.id) === currentId || (actividad.responsable?.nombre && currentName && actividad.responsable.nombre.includes(currentName));
          const isRespAdicional = actividad.responsables?.some(r => String(r.id) === currentId || (r.nombre && currentName && r.nombre.includes(currentName)));
          const isApoyo = actividad.responsablesApoyo?.some(r => String(r.id) === currentId || (r.nombre && currentName && r.nombre.includes(currentName)));

          return isMainResp || isRespAdicional || isApoyo;
        });

        // Si el usuario no tiene capacidad de gestión/análisis y no tiene actividades en este rol, lo ocultamos
        if (!liderazgoVerTodos && actividadesVisibles.length === 0) {
           return null;
        }

        const totalActividades = actividadesVisibles.length;
        const asignadas = actividadesVisibles.filter(a => a.responsable !== null).length;
        const completadas = actividadesVisibles.filter(a => a.estado === 'COMPLETADA').length;
        const enProgreso = actividadesVisibles.filter(a => a.estado === 'EN_EJECUCION').length;
        const avance = totalActividades > 0 
          ? Math.round(actividadesVisibles.reduce((s, a) => s + (a.porcentajeAvance || 0), 0) / totalActividades) 
          : 0;
        const estaColapsado = rolesColapsados[rol.numero] || false;
        const isExpanded = rolExpandido === rol.numero;
        
        return (
          <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 p-6">
            {/* Header del rol - Clickeable para expandir/colapsar */}
            <div 
              className="flex items-center justify-between p-6 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setRolExpandido(isExpanded ? null : rol.numero)}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ backgroundColor: rol.color + '20' }}>
                  {rol.icono}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
                  <p className="text-sm text-gray-600">
                    {rol.actividades.length} actividades{(() => {
                      const totalTareas = rol.actividades.reduce((sum: number, a: any) => sum + (a.tareasSeguimiento?.length || 0), 0);
                      return totalTareas > 0 ? ` • ${totalTareas} tareas` : '';
                    })()} • {asignadas} asignadas • {rol.actividades.length - asignadas} pendientes
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg text-sm font-semibold" style={{ 
                  backgroundColor: rol.color + '20', 
                  color: rol.color 
                }}>
                  {Math.round((asignadas / (rol.actividades.length || 1)) * 100)}% asignado
                </span>
                <motion.div
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* Lista de actividades - Expandible */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-6 pt-2 space-y-3 border-t-2 border-gray-200">
                    {rol.actividades.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No hay actividades en este rol.{plan.estado === 'BORRADOR' ? ' Haz clic en "Agregar actividad" para crear una.' : ''}
                      </div>
                    ) : (
                      rol.actividades.map((actividad, index) => (
                        <div 
                          key={`${rol.numero}-${index}-${actividad.id}`} 
                          style={{ contentVisibility: 'auto', containIntrinsicSize: '150px' }}
                          className={`p-4 border-2 rounded-lg transition-colors ${actividad.activo === false ? 'border-red-200 bg-red-50/30 opacity-60' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className={`font-semibold ${actividad.activo === false ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{actividad.nombre}</p>
                                {actividad.activo === false && (
                                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                                    Inactiva
                                  </span>
                                )}
                                {/* Badge de estado */}
                                {actividad.estado && actividad.estado !== 'PENDIENTE' && (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    actividad.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                                    actividad.estado === 'EN_EJECUCION' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {actividad.estado === 'COMPLETADA' ? 'Completada' : actividad.estado === 'EN_EJECUCION' ? 'En ejecución' : actividad.estado}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{actividad.descripcion}</p>
                              <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                                <span>📅 Inicio: {new Date(actividad.fechaInicio).toLocaleDateString('es-CO')}</span>
                                {actividad.fechaFin && (
                                  <span>📅 Fin: {new Date(actividad.fechaFin).toLocaleDateString('es-CO')}</span>
                                )}
                                {actividad.fecha_corte && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full font-medium">📅 Corte: {new Date(actividad.fecha_corte + 'T00:00:00').toLocaleDateString('es-CO')}</span>
                                )}
                                {typeof actividad.porcentajeAvance === 'number' && actividad.porcentajeAvance > 0 && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">{actividad.porcentajeAvance}% avance</span>
                                )}
                              </div>
                              {/* Indicadores de adjuntos y observaciones — SIEMPRE visibles */}
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {/* 📎 Adjuntos */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  actividad.adjuntos && actividad.adjuntos.length > 0 
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                    : 'bg-gray-50 text-gray-400 border border-dashed border-gray-300'
                                }`}>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                  {actividad.adjuntos && actividad.adjuntos.length > 0 
                                    ? `${actividad.adjuntos.length} adjunto${actividad.adjuntos.length !== 1 ? 's' : ''}` 
                                    : 'Sin adjuntos'}
                                </span>
                                {/* 💬 Observaciones */}
                                {(() => {
                                  const obs = actividad.observacionesCumplimiento;
                                  const count = Array.isArray(obs) ? obs.length : (typeof obs === 'string' && obs.trim() ? 1 : 0);
                                  return (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                      count > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-400 border border-dashed border-gray-300'
                                    }`}>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                      {count > 0 ? `${count} observación${count !== 1 ? 'es' : ''}` : 'Sin observaciones'}
                                    </span>
                                  );
                                })()}
                                {/* ✅ Tareas */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                  actividad.tareasSeguimiento && actividad.tareasSeguimiento.length > 0 
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                    : 'bg-gray-50 text-gray-400 border border-dashed border-gray-300'
                                }`}>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                  {actividad.tareasSeguimiento && actividad.tareasSeguimiento.length > 0 
                                    ? `${actividad.tareasSeguimiento.filter(t => t.completada).length}/${actividad.tareasSeguimiento.length} tareas`
                                    : 'Sin tareas'}
                                </span>
                              </div>
                            </div>
                            {/* Responsables: editable SOLO en BORRADOR */}
                            {puedeAsignarActividades && plan.estado === 'BORRADOR' ? (
                              <div className="flex flex-col gap-1.5 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
                                {((actividad.responsables?.length ? actividad.responsables : actividad.responsable ? [actividad.responsable] : []) as Auditor[]).map((resp) => (
                                  <div key={resp.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                      {resp.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap flex-1">{resp.nombre}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); quitarResponsableInline(rol.numero, actividad.id, resp.id); }}
                                      className="text-blue-400 hover:text-red-600 leading-none ml-0.5 flex-shrink-0"
                                      disabled={asignandoId === actividad.id}
                                    >✕</button>
                                  </div>
                                ))}
                                <SelectorProfesional
                                  disabled={cargandoAuditores || asignandoId === actividad.id}
                                  auditores={auditores.filter(a => !((actividad.responsables?.length ? actividad.responsables : actividad.responsable ? [actividad.responsable] : []) as Auditor[]).some(r => r.id === a.id))}
                                  onSelect={(id) => {
                                    if (!id) return;
                                    const auditor = auditores.find(a => a.id === id);
                                    if (auditor) asignarResponsableInline(rol.numero, actividad.id, auditor);
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex flex-col gap-1.5 min-w-[180px]">
                                {((actividad.responsables?.length ? actividad.responsables : actividad.responsable ? [actividad.responsable] : []) as Auditor[]).map((resp) => (
                                  <div key={resp.id} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
                                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                      {resp.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                    </div>
                                    <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{resp.nombre}</span>
                                  </div>
                                ))}
                                {((actividad.responsables?.length ? actividad.responsables : actividad.responsable ? [actividad.responsable] : []) as Auditor[]).length === 0 && (
                                  /* Fallback: mostrar responsable(s) del rol */
                                  (rol as any).responsables && (rol as any).responsables.length > 0 ? (
                                    <>
                                      {(rol as any).responsables.map((resp: Auditor) => (
                                        <div key={resp.id} className="flex items-center gap-1.5 bg-teal-50 border border-teal-200 rounded-full px-3 py-1">
                                          <div className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                            {resp.nombre.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                                          </div>
                                          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{resp.nombre}</span>
                                          <span className="text-[9px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded font-bold uppercase">Resp. del Rol</span>
                                        </div>
                                      ))}
                                    </>
                                  ) : (
                                    <span className="text-sm text-gray-400 italic">Sin asignar</span>
                                  )
                                )}
                              </div>
                            )}
                          </div>

                          {/* ══ TAREAS DE SEGUIMIENTO dentro de la actividad ══ */}
                          {actividad.tareasSeguimiento && actividad.tareasSeguimiento.length > 0 && (
                            <div className="mt-3 ml-11 border-t border-dashed border-gray-200 pt-3">
                              <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                Tareas ({actividad.tareasSeguimiento.filter(t => t.completada).length}/{actividad.tareasSeguimiento.length} completadas)
                              </p>
                              <div className="space-y-1.5">
                                {actividad.tareasSeguimiento.map((tarea) => {
                                  const fechaLimite = tarea.fechaEntrega ? new Date(tarea.fechaEntrega) : null;
                                  const hoy = new Date();
                                  const diasRestantes = fechaLimite ? Math.ceil((fechaLimite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24)) : null;
                                  const estaVencida = diasRestantes !== null && diasRestantes < 0 && !tarea.completada;
                                  const estaProxima = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 7 && !tarea.completada;
                                  const cantAdjuntos = tarea.adjuntosTarea?.length || 0;
                                  const tieneObservacion = tarea.observaciones && tarea.observaciones.trim();
                                  
                                  return (
                                    <div key={tarea.id} className={`p-3 rounded-lg border transition-colors ${
                                      tarea.completada ? 'bg-green-50/60 border-green-200' : 
                                      estaVencida ? 'bg-red-50/60 border-red-200' :
                                      estaProxima ? 'bg-amber-50/60 border-amber-200' :
                                      'bg-white border-gray-200'
                                    }`}>
                                      {/* Fila 1: Checkbox + Descripción */}
                                      <div className="flex items-start gap-2.5">
                                        <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                          tarea.completada ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'
                                        }`}>
                                          {tarea.completada && (
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                          )}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm font-medium leading-snug ${tarea.completada ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                            {tarea.descripcion}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Fila 2: Metadatos SIEMPRE visibles */}
                                      <div className="ml-7 mt-2 flex items-center gap-2 flex-wrap">
                                        {/* ⏰ Fecha límite — SIEMPRE visible */}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                                          !fechaLimite ? 'bg-gray-100 text-gray-400 border border-dashed border-gray-300' :
                                          tarea.completada ? 'bg-gray-100 text-gray-400' :
                                          estaVencida ? 'bg-red-100 text-red-700 border border-red-300' :
                                          estaProxima ? 'bg-amber-100 text-amber-700 border border-amber-300' :
                                          'bg-gray-100 text-gray-600'
                                        }`}>
                                          ⏰ {!fechaLimite ? 'Sin fecha límite' : estaVencida ? `Vencida (${Math.abs(diasRestantes!)} días)` : `Límite: ${fechaLimite.toLocaleDateString('es-CO')}`}
                                        </span>

                                        {/* 👤 Responsables — SIEMPRE visible (fallback: responsable del rol) */}
                                        {(() => {
                                          const tieneResp = tarea.responsables && tarea.responsables.length > 0;
                                          const rolResps = (rol as any).responsables as Auditor[] | undefined;
                                          const respNames = tieneResp ? tarea.responsables!.join(', ') : (rolResps && rolResps.length > 0 ? rolResps.map(r => r.nombre).join(', ') : null);
                                          const esFallback = !tieneResp && respNames;
                                          return (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                                              tieneResp ? 'bg-blue-50 text-blue-700 border border-blue-200 font-medium' :
                                              esFallback ? 'bg-teal-50 text-teal-700 border border-teal-200 font-medium' :
                                              'bg-gray-100 text-gray-400 border border-dashed border-gray-300'
                                            }`}>
                                              👤 {respNames || 'Sin responsable'}
                                              {esFallback && <span className="text-[8px] bg-teal-100 text-teal-600 px-1 rounded font-bold ml-0.5">ROL</span>}
                                            </span>
                                          );
                                        })()}

                                        {/* 📎 Adjuntos — SIEMPRE visible */}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                                          cantAdjuntos > 0 ? 'bg-purple-50 text-purple-700 border border-purple-200 font-medium' : 'bg-gray-100 text-gray-400 border border-dashed border-gray-300'
                                        }`}>
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                                          {cantAdjuntos > 0 ? `${cantAdjuntos} archivo${cantAdjuntos !== 1 ? 's' : ''}` : 'Sin adjuntos'}
                                        </span>

                                        {/* 💬 Comentario — SIEMPRE visible */}
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] ${
                                          tieneObservacion ? 'bg-amber-50 text-amber-700 border border-amber-200 font-medium' : 'bg-gray-100 text-gray-400 border border-dashed border-gray-300'
                                        }`}>
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                          {tieneObservacion ? 'Con comentario' : 'Sin comentarios'}
                                        </span>

                                        {/* ✅ Completada */}
                                        {tarea.completada && (
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-[11px] font-semibold border border-green-200">
                                            ✅ {tarea.fechaCompletado ? new Date(tarea.fechaCompletado).toLocaleDateString('es-CO') : 'Completada'}
                                          </span>
                                        )}
                                      </div>

                                      {/* Fila 3: Texto del comentario si existe */}
                                      {tieneObservacion && (
                                        <div className="ml-7 mt-2 px-3 py-2 bg-white border border-gray-200 rounded-lg">
                                          <p className="text-[11px] font-bold text-gray-500 mb-0.5 flex items-center gap-1 uppercase tracking-wider">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                            Comentario
                                          </p>
                                          <p className="text-xs text-gray-700 leading-relaxed">{tarea.observaciones}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}

                    {/* Formulario para nueva actividad — SOLO en BORRADOR */}
                    {plan.estado === 'BORRADOR' && (
                      mostrarFormNuevaActividad === rol.numero ? (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg space-y-3"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-blue-900">Nueva actividad para Rol {rol.numero}</h4>
                            <button
                              onClick={(e) => { e.stopPropagation(); setMostrarFormNuevaActividad(null); }}
                              className="text-blue-600 hover:text-blue-800"
                            >✕</button>
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Nombre de la actividad *</label>
                            <input type="text" value={nuevaActividad.nombre} onChange={(e) => setNuevaActividad({ ...nuevaActividad, nombre: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Ej: Auditoría al proceso de contratación" onClick={(e) => e.stopPropagation()} />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-1">Descripción</label>
                            <textarea value={nuevaActividad.descripcion} onChange={(e) => setNuevaActividad({ ...nuevaActividad, descripcion: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" placeholder="Descripción detallada" rows={2} onClick={(e) => e.stopPropagation()} />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-semibold text-gray-900 mb-1">Fecha inicio</label>
                              <input type="date" value={nuevaActividad.fechaInicio} onChange={(e) => setNuevaActividad({ ...nuevaActividad, fechaInicio: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" onClick={(e) => e.stopPropagation()} />
                            </div>
                            <div>
                              <label className="block text-sm font-semibold text-gray-900 mb-1">Fecha fin</label>
                              <input type="date" value={nuevaActividad.fechaFin} onChange={(e) => setNuevaActividad({ ...nuevaActividad, fechaFin: e.target.value })} className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" onClick={(e) => e.stopPropagation()} />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-2">
                            <button onClick={(e) => { e.stopPropagation(); agregarActividadInline(rol.numero); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
                              <Check className="w-4 h-4" /> Guardar actividad
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setMostrarFormNuevaActividad(null); }} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium">
                              Cancelar
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        puedeAsignarActividades && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setMostrarFormNuevaActividad(rol.numero); }}
                            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg text-gray-600 hover:text-blue-600 font-medium flex items-center justify-center gap-2 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            Agregar actividad adicional
                          </button>
                        )
                      )
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES HELPER PARA SEGUIMIENTO
// ════════════════════════════════════════════════════════════════════════════

// Función para calcular porcentaje automático basado en puntos de control
function calcularPorcentajeAutomatico(actividad: Actividad): number {
  if (!actividad.puntosControl || actividad.puntosControl.length === 0) {
    return actividad.porcentajeAvance; // Si no hay puntos, usar el valor manual existente
  }
  
  const puntosCompletados = actividad.puntosControl.filter(p => p.estado === 'completado').length;
  const totalPuntos = actividad.puntosControl.length;
  
  return Math.round((puntosCompletados / totalPuntos) * 100);
}

// Función para obtener texto de periodicidad desde frecuencia configurada
function obtenerTextoPeriodicidad(frecuencia?: FrecuenciaPuntoControl): string {
  if (!frecuencia) return '';
  
  const mapeo: Record<FrecuenciaPuntoControl, string> = {
    'semanal': 'Seguimiento semanal',
    'mensual': 'Seguimiento mensual',
    'bimensual': 'Seguimiento bimensual',
    'trimestral': 'Seguimiento trimestral',
    'semestral': 'Seguimiento semestral',
    'anual': 'Seguimiento anual',
    'personalizada': 'Seguimiento personalizado'
  };
  
  return mapeo[frecuencia] || '';
}

// ════════════════════════════════════════════════════════════════════════════
// [DEPRECATED - ELIMINADA] SECCIÓN 3: SEGUIMIENTO Y CONTROL
// Esta sección fue unificada con la Sección de Resumen en "SeccionGestionYSeguimiento"
// ════════════════════════════════════════════════════════════════════════════

function __DEPRECATED__SeccionSeguimiento({ plan, onActualizar, onAbrirRol4, auditores = [] }: { plan: PlanAnual; onActualizar: (plan: PlanAnual) => void; onAbrirRol4?: () => void; auditores?: Auditor[] }) {
  const [actividadExpandida, setActividadExpandida] = useState<number | string | null>(null);
  const [modalAdjuntos, setModalAdjuntos] = useState<{ actividadId: number | string; rolNumero: number } | null>(null);
  const [nuevaObservacion, setNuevaObservacion] = useState('');
  const [mostrarSelectorApoyo, setMostrarSelectorApoyo] = useState(false);
  const [formulario, setFormulario] = useState({
    control: '',
    evaluacion: '',
    seguimiento: '',
    porcentaje: 0
  });

  const abrirSeguimiento = (actividad: Actividad) => {
    // Calcular porcentaje automático si tiene puntos de control
    const porcentajeCalculado = calcularPorcentajeAutomatico(actividad);
    
    // Obtener periodicidad automática si tiene frecuencia configurada
    const controlAutomatico = actividad.frecuenciaPuntosControl 
      ? obtenerTextoPeriodicidad(actividad.frecuenciaPuntosControl)
      : actividad.control;
    
    setFormulario({
      control: controlAutomatico,
      evaluacion: actividad.evaluacion,
      seguimiento: actividad.seguimiento,
      porcentaje: porcentajeCalculado
    });
    setNuevaObservacion(''); // Limpiar el campo de nueva observación
    setMostrarSelectorApoyo(false); // Cerrar selector de apoyo
    setActividadExpandida(actividad.id);
  };

  // Función para desactivar una actividad (soft delete)
  const desactivarActividad = async (rolNumero: number, actividadId: number | string) => {
    console.log('🚫 [desactivarActividad] Desactivando actividad:', { rolNumero, actividadId });
    
    try {
      const res = await actividadesApi.delete(String(actividadId));
      console.log('🚫 [desactivarActividad] Respuesta del backend:', res);

      if (res.success) {
        // Actualizar estado local - marcar como inactiva
        const planActualizado = {
          ...plan,
          roles: plan.roles.map(rol => {
            if (rol.numero === rolNumero) {
              return {
                ...rol,
                actividades: rol.actividades.map(act => 
                  act.id === actividadId ? { ...act, activo: false } : act
                )
              };
            }
            return rol;
          })
        };
        onActualizar(planActualizado);
        toast.success('Actividad desactivada', { description: 'La actividad ha sido marcada como inactiva' });
      } else {
        toast.error('Error al desactivar', { description: res.error || 'No se pudo desactivar en el servidor' });
      }
    } catch (error) {
      console.error('Error desactivando actividad:', error);
      toast.error('Error', { description: 'No se pudo desactivar la actividad' });
    }
  };

  const agregarObservacion = (rolNumero: number, actividadId: number | string) => {
    if (!nuevaObservacion.trim()) {
      toast.error('Observación vacía', { description: 'Debes escribir una observación' });
      return;
    }

    const nuevaObs: ObservacionCumplimiento = {
      id: `obs-${Date.now()}`,
      texto: nuevaObservacion.trim(),
      fechaRegistro: new Date().toISOString(),
      registradoPor: plan.jefeOCI.nombre
    };

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: [
                    ...obsActuales,
                    nuevaObs
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setNuevaObservacion('');
    toast.success('Observación agregada', { description: 'Se registró exitosamente' });
  };

  const eliminarObservacion = (rolNumero: number, actividadId: number | string, observacionId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const obsActuales = Array.isArray(act.observacionesCumplimiento) 
                  ? act.observacionesCumplimiento 
                  : [];
                return { 
                  ...act,
                  observacionesCumplimiento: obsActuales.filter((obs: ObservacionCumplimiento) => obs.id !== observacionId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Observación eliminada');
  };

  const agregarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditor: Auditor) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                const apoyoExiste = (act.responsablesApoyo || []).some(r => r.id === auditor.id);
                const esPrincipal = act.responsable?.id === auditor.id;
                
                if (apoyoExiste || esPrincipal) {
                  toast.error('Responsable ya asignado', { 
                    description: esPrincipal ? 'Ya es el responsable principal' : 'Ya está en el equipo de apoyo'
                  });
                  return act;
                }
                
                return { 
                  ...act,
                  responsablesApoyo: [
                    ...(act.responsablesApoyo || []),
                    auditor
                  ]
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    setMostrarSelectorApoyo(false);
    toast.success('Responsable de apoyo agregado', { description: `${auditor.nombre} se agregó al equipo` });
  };

  const eliminarResponsableApoyo = (rolNumero: number, actividadId: number | string, auditorId: string) => {
    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  responsablesApoyo: (act.responsablesApoyo || []).filter(r => r.id !== auditorId)
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };

    onActualizar(planActualizado);
    toast.success('Responsable de apoyo eliminado');
  };

  const guardarSeguimiento = async (rolNumero: number, actividadId: number | string) => {
    // Validar si la actividad requiere autorización y está al 100%
    const actividadActual = plan.roles
      .find(r => r.numero === rolNumero)
      ?.actividades.find(a => a.id === actividadId);

    if (
      formulario.porcentaje === 100 && 
      actividadActual?.requiereAutorizacionJefeOCI && 
      !actividadActual?.autorizadaPorJefeOCI
    ) {
      toast.error('Autorización requerida', { 
        description: 'Esta actividad requiere autorización del Jefe OCI antes de completarse al 100%' 
      });
      return;
    }

    const nuevoEstado: EstadoActividad = 
      formulario.porcentaje === 100 ? 'COMPLETADA' :
      formulario.porcentaje > 0 ? 'EN_EJECUCION' :
      'PENDIENTE';

    // Mapear estado del frontend al formato del backend
    const estadoBackend = 
      nuevoEstado === 'COMPLETADA' ? 'completada' :
      nuevoEstado === 'EN_EJECUCION' ? 'en-progreso' :
      'pendiente';

    setGuardando(true);
    
    try {
      // Preparar payload - Backend espera estos campos exactos
      const payload = {
        estado: estadoBackend as any,
        porcentaje_avance: formulario.porcentaje,
        control: formulario.control,
        evaluacion: formulario.evaluacion,
        seguimiento: formulario.seguimiento
      };
      
      console.log('[GUARDAR] Payload:', payload);
      const response = await actividadesApi.update(String(actividadId), payload);
      console.log('[GUARDAR] Respuesta backend:', response);
      
      if (!response.success) {
        const errorMsg = response.error || 'No se pudo actualizar la actividad';
        toast.error('No se puede completar', { 
          description: errorMsg,
          duration: 6000 
        });
        setGuardando(false);
        return;
      }
    } catch (error: any) {
      console.error('[GUARDAR] Error al guardar en backend:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Error al guardar el seguimiento';
      toast.error('Error al guardar', { 
        description: errorMsg,
        duration: 6000 
      });
      setGuardando(false);
      return;
    }

    const planActualizado = {
      ...plan,
      roles: plan.roles.map(rol => {
        if (rol.numero === rolNumero) {
          return {
            ...rol,
            actividades: rol.actividades.map(act => {
              if (act.id === actividadId) {
                return { 
                  ...act,
                  control: formulario.control,
                  evaluacion: formulario.evaluacion,
                  seguimiento: formulario.seguimiento,
                  porcentajeAvance: formulario.porcentaje,
                  estado: nuevoEstado
                };
              }
              return act;
            })
          };
        }
        return rol;
      })
    };
    onActualizar(planActualizado);
    setGuardando(false);
    toast.success('Seguimiento registrado', { description: 'Información actualizada correctamente' });
    setActividadExpandida(null);
    setNuevaObservacion('');
    setMostrarSelectorApoyo(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Info header */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Sistema de seguimiento y control</h3>
            <p className="text-sm text-blue-700 mb-2">
              Registra el <strong>control</strong> (periodicidad), la <strong>evaluación</strong> (estado), 
              y el <strong>seguimiento</strong> (acciones y evidencias) de cada actividad.
            </p>
            <p className="text-sm text-blue-700 flex items-center gap-1.5">
              <CalendarClock className="w-4 h-4" />
              <strong>Automático:</strong> El porcentaje de avance y la periodicidad se calculan automáticamente 
              en actividades con puntos de control configurados.
            </p>
          </div>
        </div>
      </div>

      {[...plan.roles].sort((a, b) => a.numero - b.numero).map((rol) => (
        <div key={rol.numero} className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b-2 border-gray-200">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ backgroundColor: rol.color + '20' }}>
              {rol.icono}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">Rol {rol.numero}: {rol.nombre}</h3>
              <p className="text-sm text-gray-600">{rol.actividades.length} actividades</p>
            </div>
            {/* Botón especial para Rol 4: Programa de Auditorías */}
            {rol.numero === 4 && onAbrirRol4 && (
              <button
                onClick={() => {
                  onAbrirRol4();
                }}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:shadow-xl text-white rounded-lg font-semibold text-sm flex items-center gap-2 transition-all"
                title="Acceder al Programa de Auditoría"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Programa Integrado
              </button>
            )}
            <SemaforoSeguimientoPAI 
              porcentaje={Math.round(rol.actividades.reduce((s, a) => s + a.porcentajeAvance, 0) / rol.actividades.length)}
              variant="circular"
              size="lg"
              showIcon={false}
            />
          </div>

          <div className="space-y-3">
            {rol.actividades.map((actividad, idx) => (
              <div 
                key={`${rol.numero}-${idx}-${actividad.id}`} 
                style={{ contentVisibility: 'auto', containIntrinsicSize: '250px' }}
                className={`border-2 rounded-lg overflow-hidden ${actividad.activo === false ? 'border-red-200 bg-red-50/30 opacity-60' : 'border-gray-200'}`}
              >
                {/* Header */}
                <div className={`p-4 ${actividad.activo === false ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="w-6 h-6 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <p className={`font-semibold ${actividad.activo === false ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{actividad.nombre}</p>
                        {actividad.activo === false && (
                          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
                            Inactiva
                          </span>
                        )}
                        {actividad.requiereAutorizacionJefeOCI && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            actividad.autorizadaPorJefeOCI
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-orange-100 text-orange-700 border border-orange-300'
                          }`}>
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            {actividad.autorizadaPorJefeOCI ? 'Autorizada Jefe OCI' : 'Requiere Autorización OCI'}
                          </span>
                        )}
                        {actividad.requiereVerificacionDirector && (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            actividad.verificadaPorDirector
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-amber-100 text-amber-700 border border-amber-300'
                          }`}>
                            <Shield className="w-3 h-3" />
                            {actividad.verificadaPorDirector ? 'Verificada Director' : 'Requiere Verificación'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="text-sm text-gray-900 flex items-center gap-1.5">
                          <span className="font-semibold text-blue-700">👤 Principal:</span>
                          <strong>{actividad.responsable?.nombre || 'Sin asignar'}</strong>
                        </p>
                        {actividad.responsablesApoyo && actividad.responsablesApoyo.length > 0 && (
                          <p className="text-sm text-gray-600 flex items-center gap-1.5">
                            <span className="font-semibold text-purple-700">🤝 Apoyo:</span>
                            <span>{actividad.responsablesApoyo.map(r => r.nombre).join(', ')}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                      actividad.estado === 'COMPLETADA' ? 'bg-green-100 text-green-700' :
                      actividad.estado === 'EN_EJECUCION' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {actividad.estado === 'COMPLETADA' ? '✓ Completada' : 
                       actividad.estado === 'EN_EJECUCION' ? '⏳ En ejecución' : '⏸ Pendiente'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <SemaforoSeguimientoPAI 
                        porcentaje={actividad.porcentajeAvance}
                        variant="bar"
                        size="md"
                        showLabel={true}
                        showIcon={true}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (actividadExpandida === actividad.id) {
                            setActividadExpandida(null);
                            setNuevaObservacion(''); // Limpiar al cerrar
                            setMostrarSelectorApoyo(false); // Cerrar selector de apoyo
                          } else {
                            abrirSeguimiento(actividad);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium"
                      >
                        {actividadExpandida === actividad.id ? '✕ Cerrar' : '📝 Seguimiento'}
                      </button>
                      {/* Botón Desactivar - siempre visible si activo no es false */}
                      <button
                        onClick={() => {
                          if (actividad.activo === false) {
                            toast.info('Esta actividad ya está inactiva');
                            return;
                          }
                          if (confirm('¿Desactivar esta actividad? Quedará marcada como inactiva y no contará en los avances.')) {
                            desactivarActividad(rol.numero, actividad.id);
                          }
                        }}
                        className={`px-3 py-2 text-sm rounded-lg font-medium border-2 flex items-center gap-1 ${
                          actividad.activo === false 
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' 
                            : 'bg-red-100 hover:bg-red-200 text-red-700 border-red-300'
                        }`}
                        title={actividad.activo === false ? 'Actividad ya inactiva' : 'Desactivar actividad'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        {actividad.activo === false ? 'Inactiva' : 'Desactivar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info actual */}
                <div className="p-4 border-t-2 border-gray-200 bg-white">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">🔍 CONTROL</p>
                      <p className="text-sm text-gray-900">{actividad.control || 'Sin definir'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">📊 EVALUACIÓN</p>
                      <p className="text-sm text-gray-900">{actividad.evaluacion || 'Sin evaluar'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-600 mb-1">✅ SEGUIMIENTO (Tareas)</p>
                      {actividad.tareasSeguimiento && actividad.tareasSeguimiento.length > 0 ? (
                        <ul className="space-y-1.5 mt-1">
                          {actividad.tareasSeguimiento.map((tarea) => (
                            <li key={tarea.id} className="flex items-start gap-2 text-sm">
                              <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center ${
                                tarea.completada ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'
                              }`}>
                                {tarea.completada && (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </span>
                              <span className={tarea.completada ? 'line-through text-gray-400' : 'text-gray-900'}>
                                {tarea.descripcion}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-900">{actividad.seguimiento || 'Sin registrar'}</p>
                      )}
                    </div>
                  </div>

                  {/* Contador de observaciones y adjuntos */}
                  <div className="flex items-center gap-3 pt-3 border-t border-gray-200">
                    {tieneObservaciones(actividad.observacionesCumplimiento) && (
                      <div className="flex items-center gap-1.5 text-blue-700 text-xs">
                        <FileText className="w-3.5 h-3.5" />
                        <span className="font-semibold">{contarObservaciones(actividad.observacionesCumplimiento)}</span>
                        <span>observación{contarObservaciones(actividad.observacionesCumplimiento) !== 1 ? 'es' : ''}</span>
                      </div>
                    )}
                    {actividad.adjuntos && actividad.adjuntos.length > 0 && (
                      <div className="flex items-center gap-1.5 text-purple-700 text-xs">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span className="font-semibold">{actividad.adjuntos.length}</span>
                        <span>adjunto{actividad.adjuntos.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {!tieneObservaciones(actividad.observacionesCumplimiento) && 
                     (!actividad.adjuntos || actividad.adjuntos.length === 0) && (
                      <span className="text-xs text-gray-400 italic">Sin evidencias registradas</span>
                    )}
                  </div>
                </div>

                {/* Formulario */}
                <AnimatePresence>
                  {actividadExpandida === actividad.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-t-2 border-blue-200">
                        <h4 className="font-bold mb-4 flex items-center gap-2">
                          <FileCheck className="w-5 h-5 text-blue-600" />
                          Registro de seguimiento
                        </h4>

                        <div className="space-y-4">
                          {/* Mensaje informativo sobre puntos de control */}
                          {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 flex items-start gap-3">
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-semibold text-green-900 text-sm mb-1">
                                  Actividad con puntos de control configurados
                                </p>
                                <p className="text-xs text-green-700">
                                  <strong>{actividad.puntosControl.filter(p => p.estado === 'completado').length}</strong> de <strong>{actividad.puntosControl.length}</strong> puntos completados • 
                                  Periodicidad: <strong>{actividad.frecuenciaPuntosControl}</strong>
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                  El porcentaje y la periodicidad se calculan automáticamente según los puntos de control
                                </p>
                              </div>
                            </div>
                          )}

                          {/* % Avance - AUTOMÁTICO si hay puntos de control */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                              Porcentaje de avance
                              {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                                  Automático
                                </span>
                              )}
                            </label>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={formulario.porcentaje}
                                onChange={(e) => setFormulario({ ...formulario, porcentaje: parseInt(e.target.value) })}
                                disabled={!!(actividad.puntosControl && actividad.puntosControl.length > 0)}
                                className="flex-1"
                              />
                              <div className={`w-20 px-4 py-2 border-2 rounded-lg text-center ${
                                actividad.puntosControl && actividad.puntosControl.length > 0 
                                  ? 'bg-green-100 border-green-300' 
                                  : 'bg-gray-100 border-gray-300'
                              }`}>
                                <span className="text-2xl font-bold">{formulario.porcentaje}</span>
                                <span className="text-sm">%</span>
                              </div>
                            </div>
                            {actividad.puntosControl && actividad.puntosControl.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2 italic">
                                Calculado automáticamente: {actividad.puntosControl.filter(p => p.estado === 'completado').length}/{actividad.puntosControl.length} puntos completados
                              </p>
                            )}
                          </div>

                          {/* Control - AUTOMÁTICO si hay frecuencia configurada */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                              🔍 Control (periodicidad)
                              {actividad.frecuenciaPuntosControl && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase">
                                  Configurado
                                </span>
                              )}
                            </label>
                            {actividad.frecuenciaPuntosControl ? (
                              <div className="w-full px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg">
                                <p className="font-bold text-blue-900">{formulario.control}</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  Definido en la configuración de puntos de control
                                </p>
                              </div>
                            ) : (
                              <select
                                value={formulario.control}
                                onChange={(e) => setFormulario({ ...formulario, control: e.target.value })}
                                className="w-full px-4 py-2 border-2 rounded-lg"
                              >
                                <option value="">Seleccionar...</option>
                                <option value="Seguimiento mensual">Mensual</option>
                                <option value="Seguimiento bimestral">Bimestral</option>
                                <option value="Seguimiento trimestral">Trimestral</option>
                                <option value="Seguimiento cuatrimestral">Cuatrimestral</option>
                                <option value="Seguimiento semestral">Semestral</option>
                                <option value="Seguimiento anual">Anual</option>
                                <option value="Según necesidad">Según necesidad</option>
                              </select>
                            )}
                          </div>

                          {/* Evaluación */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <label className="block text-sm font-semibold mb-2">📊 Evaluación</label>
                            <textarea
                              value={formulario.evaluacion}
                              onChange={(e) => setFormulario({ ...formulario, evaluacion: e.target.value })}
                              className="w-full px-4 py-3 border-2 rounded-lg"
                              placeholder="Estado actual y observaciones..."
                              rows={3}
                            />
                          </div>

                          {/* Seguimiento - Tareas interactivas */}
                          <div className="bg-white rounded-lg border-2 border-green-200 p-4">
                            <label className="text-sm font-semibold mb-3 flex items-center gap-2">
                              ✅ Tareas de seguimiento
                              <span className="text-xs text-gray-500 font-normal">({(actividad.tareasSeguimiento || []).filter(t => t.completada).length}/{(actividad.tareasSeguimiento || []).length} completadas)</span>
                            </label>

                            {/* Lista de tareas */}
                            <div className="space-y-2 mt-3">
                              {(actividad.tareasSeguimiento || []).map((tarea) => (
                                <div key={tarea.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                                  tarea.completada ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 hover:border-blue-300'
                                }`}>
                                  <button
                                    onClick={async () => {
                                      const nombreUsuario = currentUser?.nombre || currentUser?.nombre_completo || plan.jefeOCI?.nombre || 'Usuario';
                                      const nuevasTareas = (actividad.tareasSeguimiento || []).map(t =>
                                        t.id === tarea.id ? { 
                                          ...t, 
                                          completada: !t.completada, 
                                          fechaCompletada: !t.completada ? new Date().toISOString().split('T')[0] : undefined,
                                          completadaPor: !t.completada ? nombreUsuario : undefined 
                                        } : t
                                      );
                                      const nuevoRoles = plan.roles.map(r => ({
                                        ...r,
                                        actividades: r.actividades.map(a =>
                                          a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                        )
                                      }));
                                      onActualizar({ ...plan, roles: nuevoRoles });
                                      // Persistir al backend
                                      try {
                                        await actividadesApi.update(String(actividad.id), {
                                          tareas_seguimiento: nuevasTareas
                                        });
                                      } catch (e) {
                                        console.warn('[Tareas] Error al persistir:', e);
                                      }
                                    }}
                                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                      tarea.completada ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white hover:border-blue-400'
                                    }`}
                                  >
                                    {tarea.completada && (
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-sm ${tarea.completada ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                                      {tarea.descripcion}
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                      {(tarea.responsables || []).map((resp, ri) => (
                                        <div key={ri} className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 text-[10px] font-medium">
                                          <div className="w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center text-white text-[7px] font-bold flex-shrink-0">
                                            {resp.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                          </div>
                                          <span className="text-gray-700">{resp}</span>
                                          <button
                                            onClick={() => {
                                              const nuevasTareas = (actividad.tareasSeguimiento || []).map(t =>
                                                t.id === tarea.id ? { ...t, responsables: (t.responsables || []).filter((_, idx) => idx !== ri) } : t
                                              );
                                              const nuevoRoles = plan.roles.map(r => ({
                                                ...r,
                                                actividades: r.actividades.map(a =>
                                                  a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                                )
                                              }));
                                              onActualizar({ ...plan, roles: nuevoRoles });
                                            }}
                                            className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-red-100 text-gray-400 hover:text-red-600 text-[8px] transition-colors"
                                          >✕</button>
                                        </div>
                                      ))}
                                      {tarea.fechaCompletado && (
                                        <span className="text-xs text-green-600">✓ {tarea.fechaCompletado}</span>
                                      )}
                                      <select
                                        className="text-xs border-2 border-dashed border-gray-300 rounded-lg px-2 py-0.5 text-gray-500 bg-white"
                                        value=""
                                        onChange={(e) => {
                                          if (!e.target.value) return;
                                          const auditorSeleccionado = auditores.find(a => a.id === e.target.value);
                                          if (!auditorSeleccionado) return;
                                          const nuevasTareas = (actividad.tareasSeguimiento || []).map(t =>
                                            t.id === tarea.id ? { ...t, responsables: [...(t.responsables || []), auditorSeleccionado.nombre] } : t
                                          );
                                          const nuevoRoles = plan.roles.map(r => ({
                                            ...r,
                                            actividades: r.actividades.map(a =>
                                              a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                            )
                                          }));
                                          onActualizar({ ...plan, roles: nuevoRoles });
                                        }}
                                      >
                                        <option value="">+ Responsable</option>
                                        {auditores
                                          .filter(a => !(tarea.responsables || []).includes(a.nombre))
                                          .map(a => (
                                            <option key={a.id} value={a.id}>{a.nombre} - {a.cargo || 'Profesional'}</option>
                                          ))}
                                      </select>
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => {
                                      const nuevasTareas = (actividad.tareasSeguimiento || []).filter(t => t.id !== tarea.id);
                                      const nuevoRoles = plan.roles.map(r => ({
                                        ...r,
                                        actividades: r.actividades.map(a =>
                                          a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                        )
                                      }));
                                      onActualizar({ ...plan, roles: nuevoRoles });
                                    }}
                                    className="mt-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors flex-shrink-0"
                                    title="Eliminar tarea"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>

                            {/* Agregar nueva tarea */}
                            <div className="mt-3 flex gap-2">
                              <input
                                type="text"
                                data-tarea-input-dep={actividad.id}
                                placeholder="Agregar nueva tarea de seguimiento..."
                                className="flex-1 px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm focus:border-green-400 focus:outline-none"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                    const descripcion = (e.target as HTMLInputElement).value.trim();
                                    const nuevaTarea: TareaSeguimiento = {
                                      id: `tarea-${Date.now()}`,
                                      descripcion,
                                      completada: false,
                                    };
                                    const nuevasTareas = [...(actividad.tareasSeguimiento || []), nuevaTarea];
                                    const nuevoRoles = plan.roles.map(r => ({
                                      ...r,
                                      actividades: r.actividades.map(a =>
                                        a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                      )
                                    }));
                                    onActualizar({ ...plan, roles: nuevoRoles });
                                    (e.target as HTMLInputElement).value = '';
                                  }
                                }}
                              />
                              <button
                                onClick={() => {
                                  const input = document.querySelector<HTMLInputElement>(`[data-tarea-input-dep="${actividad.id}"]`);
                                  if (input && input.value.trim()) {
                                    const nuevaTarea: TareaSeguimiento = {
                                      id: `tarea-${Date.now()}`,
                                      descripcion: input.value.trim(),
                                      completada: false,
                                    };
                                    const nuevasTareas = [...(actividad.tareasSeguimiento || []), nuevaTarea];
                                    const nuevoRoles = plan.roles.map(r => ({
                                      ...r,
                                      actividades: r.actividades.map(a =>
                                        a.id === actividad.id ? { ...a, tareasSeguimiento: nuevasTareas } : a
                                      )
                                    }));
                                    onActualizar({ ...plan, roles: nuevoRoles });
                                    input.value = '';
                                  }
                                }}
                                className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" /> Agregar
                              </button>
                            </div>

                            {/* Campo de texto libre para seguimiento general */}
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <label className="text-xs text-gray-500 mb-1 block">Notas generales de seguimiento</label>
                              <textarea
                                value={formulario.seguimiento}
                                onChange={(e) => setFormulario({ ...formulario, seguimiento: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                placeholder="Notas adicionales..."
                                rows={2}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              ℹ️ Este campo es diferente de las <strong>Observaciones</strong> del botón "Gestionar evidencias" (abajo). Aquí registra las acciones concretas realizadas.
                            </p>
                          </div>

                          {/* RESPONSABLES - fila compacta */}
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <Users className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="text-[10px] font-bold text-blue-500 uppercase shrink-0">Principal:</span>
                            <span className="font-medium text-gray-800">{actividad.responsable?.nombre || 'Sin asignar'}</span>
                            {actividad.responsablesApoyo && actividad.responsablesApoyo.length > 0 && (
                              <>
                                <span className="text-gray-300">·</span>
                                <span className="text-[10px] font-bold text-purple-500 uppercase shrink-0">Apoyo:</span>
                                {actividad.responsablesApoyo.map((resp) => (
                                  <span key={resp.id} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-purple-50 border border-purple-200 rounded-full text-[10px] text-purple-800">
                                    {resp.nombre}
                                    <button onClick={() => { if (confirm(`¿Eliminar a ${resp.nombre}?`)) eliminarResponsableApoyo(rol.numero, actividad.id, resp.id); }} className="text-purple-400 hover:text-red-500 leading-none ml-0.5">✕</button>
                                  </span>
                                ))}
                              </>
                            )}
                            <button
                              onClick={() => setMostrarSelectorApoyo(!mostrarSelectorApoyo)}
                              className="px-1.5 py-0.5 bg-purple-100 hover:bg-purple-200 text-purple-700 text-[10px] rounded font-medium"
                            >+ apoyo</button>
                            {mostrarSelectorApoyo && (
                              <div className="w-full mt-1 flex flex-wrap gap-1">
                                {auditores.filter(aud => aud.id !== actividad.responsable?.id && !(actividad.responsablesApoyo || []).some(r => r.id === aud.id)).map((auditor) => (
                                  <button
                                    key={auditor.id}
                                    onClick={() => { agregarResponsableApoyo(rol.numero, actividad.id, auditor); setMostrarSelectorApoyo(false); }}
                                    className="px-2 py-0.5 bg-white hover:bg-purple-50 border border-purple-200 rounded text-[11px] text-gray-700"
                                  >{auditor.nombre}</button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Archivos Adjuntos y Observaciones */}
                          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <label className="block text-sm font-semibold flex items-center gap-2">
                                <Paperclip className="w-4 h-4 text-gray-600" />
                                Evidencias de cumplimiento
                              </label>
                              <button
                                onClick={() => setModalAdjuntos({ actividadId: actividad.id, rolNumero: rol.numero })}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium flex items-center gap-2"
                              >
                                <Upload className="w-4 h-4" />
                                Gestionar evidencias
                              </button>
                            </div>
                            
                            {/* Archivos */}
                            <div className="text-sm mb-3">
                              {actividad.adjuntos && actividad.adjuntos.length > 0 ? (
                                <div className="flex items-center gap-2 text-green-700">
                                  <FileText className="w-4 h-4" />
                                  <span className="font-semibold">{actividad.adjuntos.length} archivo(s) adjunto(s)</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-gray-500">
                                  <AlertCircle className="w-4 h-4" />
                                  Sin archivos adjuntos
                                </div>
                              )}
                            </div>

                            {/* Observaciones de Cumplimiento - SISTEMA DE MÚLTIPLES ENTRADAS */}
                            <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
                              <label className="block text-sm font-semibold mb-3 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-blue-600" />
                                📝 Observaciones de cumplimiento
                              </label>

                              {/* Historial de observaciones */}
                              {Array.isArray(actividad.observacionesCumplimiento) && tieneObservaciones(actividad.observacionesCumplimiento) && (
                                <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
                                  {actividad.observacionesCumplimiento.map((obs: ObservacionCumplimiento) => (
                                    <div key={obs.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3 relative group">
                                      <div className="flex items-start gap-2 mb-2">
                                        <div className="flex-1">
                                          <p className="text-xs font-semibold text-blue-900 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                            {obs.registradoPor}
                                          </p>
                                          <p className="text-[10px] text-blue-600">
                                            {new Date(obs.fechaRegistro).toLocaleString('es-CO', { 
                                              dateStyle: 'short', 
                                              timeStyle: 'short' 
                                            })}
                                          </p>
                                        </div>
                                        <button
                                          onClick={() => {
                                            if (confirm('¿Eliminar esta observación?')) {
                                              eliminarObservacion(rol.numero, actividad.id, obs.id);
                                            }
                                          }}
                                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-800 p-1"
                                          title="Eliminar observación"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                      <p className="text-sm text-blue-900 whitespace-pre-wrap">{obs.texto}</p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Formulario para nueva observación */}
                              <div className="flex gap-2">
                                <textarea
                                  value={nuevaObservacion}
                                  onChange={(e) => setNuevaObservacion(e.target.value)}
                                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                                  placeholder="Escribe una nueva observación..."
                                  rows={2}
                                />
                                <button
                                  onClick={() => agregarObservacion(rol.numero, actividad.id)}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium flex items-center gap-2 self-start"
                                >
                                  <Plus className="w-4 h-4" />
                                  Agregar
                                </button>
                              </div>

                              {!tieneObservaciones(actividad.observacionesCumplimiento) && (
                                <p className="text-xs text-gray-500 italic mt-2">No hay observaciones registradas</p>
                              )}
                            </div>
                          </div>

                          {/* Sistema de Autorización del Jefe OCI - CONFIGURADO EN CREACIÓN */}
                          {actividad.requiereAutorizacionJefeOCI && (
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-300 rounded-lg p-4">
                              <div className="flex items-start gap-3 mb-3">
                                <svg className="w-6 h-6 text-orange-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                                <div className="flex-1">
                                  <p className="font-semibold text-orange-900 mb-1">
                                    🔐 Requiere Autorización del Jefe OCI
                                  </p>
                                  <p className="text-xs text-orange-700">
                                    Esta actividad fue configurada en la creación del Plan para requerir autorización del Jefe de la OCI antes de completarse al 100%
                                  </p>
                                </div>
                              </div>

                              {/* Estado de Autorización */}
                              {formulario.porcentaje === 100 && (
                                <div className="mt-3 pt-3 border-t-2 border-orange-300">
                                  {actividad.autorizadaPorJefeOCI ? (
                                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                                      <div className="flex items-center gap-2 text-green-800 mb-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        <p className="font-bold">✓ Autorizada por el Jefe OCI</p>
                                      </div>
                                      <p className="text-xs text-green-700">
                                        Fecha: {actividad.fechaAutorizacion ? new Date(actividad.fechaAutorizacion).toLocaleString('es-CO') : 'N/A'}
                                      </p>
                                      {actividad.observacionesJefeOCI && (
                                        <div className="mt-2 pt-2 border-t border-green-200">
                                          <p className="text-xs font-semibold text-green-900">Observaciones del Jefe OCI:</p>
                                          <p className="text-sm text-green-800 mt-1">{actividad.observacionesJefeOCI}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                                      <p className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        ⏳ Pendiente de autorización del Jefe OCI
                                      </p>
                                      <p className="text-xs text-yellow-800 mb-3">
                                        Esta actividad alcanzará el 100% pero requiere la autorización del Jefe OCI para considerarse completada.
                                      </p>
                                      
                                      {/* Solo el Jefe OCI puede autorizar */}
                                      <div className="space-y-2">
                                        <textarea
                                          placeholder="Observaciones del Jefe OCI (opcional)..."
                                          className="w-full px-3 py-2 border-2 border-yellow-300 rounded-lg text-sm"
                                          rows={2}
                                          id={`obs-jefe-OCI-${actividad.id}`}
                                        />
                                        <button
                                          onClick={() => {
                                            const observaciones = (document.getElementById(`obs-jefe-OCI-${actividad.id}`) as HTMLTextAreaElement)?.value || '';
                                            const planActualizado = {
                                              ...plan,
                                              roles: plan.roles.map(r => {
                                                if (r.numero === rol.numero) {
                                                  return {
                                                    ...r,
                                                    actividades: r.actividades.map(act => {
                                                      if (act.id === actividad.id) {
                                                        return {
                                                          ...act,
                                                          autorizadaPorJefeOCI: true,
                                                          fechaAutorizacion: new Date().toISOString(),
                                                          observacionesJefeOCI: observaciones
                                                        };
                                                      }
                                                      return act;
                                                    })
                                                  };
                                                }
                                                return r;
                                              })
                                            };
                                            onActualizar(planActualizado);
                                            toast.success('Actividad autorizada por el Jefe OCI');
                                          }}
                                          className="w-full px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:shadow-lg text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                        >
                                          <CheckCircle2 className="w-4 h-4" />
                                          Autorizar como Jefe OCI
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Configuración de Verificación del Director */}
                          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-lg p-4">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={actividad.requiereVerificacionDirector}
                                onChange={(e) => {
                                  const planActualizado = {
                                    ...plan,
                                    roles: plan.roles.map(r => {
                                      if (r.numero === rol.numero) {
                                        return {
                                          ...r,
                                          actividades: r.actividades.map(act => {
                                            if (act.id === actividad.id) {
                                              return { ...act, requiereVerificacionDirector: e.target.checked };
                                            }
                                            return act;
                                          })
                                        };
                                      }
                                      return r;
                                    })
                                  };
                                  onActualizar(planActualizado);
                                }}
                                className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                              />
                              <div className="flex-1">
                                <p className="font-semibold text-orange-900 flex items-center gap-2">
                                  <Shield className="w-4 h-4" />
                                  Requiere verificación del Director OCI
                                </p>
                                <p className="text-xs text-orange-700 mt-1">
                                  Si se marca, esta actividad solo se considerará completada después de la verificación y aprobación del Director de la Oficina de Control Interno
                                </p>
                              </div>
                            </label>

                            {/* Estado de Verificación */}
                            {actividad.requiereVerificacionDirector && actividad.porcentajeAvance === 100 && (
                              <div className="mt-4 pt-4 border-t-2 border-amber-300">
                                {actividad.verificadaPorDirector ? (
                                  <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-green-800 mb-2">
                                      <CheckCircle2 className="w-5 h-5" />
                                      <p className="font-bold">✓ Verificada por el Director OCI</p>
                                    </div>
                                    <p className="text-xs text-green-700">
                                      Fecha: {actividad.fechaVerificacion ? new Date(actividad.fechaVerificacion).toLocaleString('es-CO') : 'N/A'}
                                    </p>
                                    {actividad.observacionesDirector && (
                                      <div className="mt-2 pt-2 border-t border-green-200">
                                        <p className="text-xs font-semibold text-green-900">Observaciones del Director:</p>
                                        <p className="text-sm text-green-800 mt-1">{actividad.observacionesDirector}</p>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-3">
                                    <p className="text-sm font-bold text-yellow-900 mb-2 flex items-center gap-2">
                                      <AlertCircle className="w-4 h-4" />
                                      ⏳ Pendiente de verificación del Director
                                    </p>
                                    <p className="text-xs text-yellow-800 mb-3">
                                      Esta actividad ha sido completada pero requiere la verificación y aprobación del Director de Control Interno para ser considerada finalizada.
                                    </p>
                                    
                                    {/* Solo el Director puede verificar - simulación de permisos */}
                                    <div className="space-y-2">
                                      <textarea
                                        placeholder="Observaciones del Director (opcional)..."
                                        className="w-full px-3 py-2 border-2 border-yellow-300 rounded-lg text-sm"
                                        rows={2}
                                        id={`obs-director-${actividad.id}`}
                                      />
                                      <button
                                        onClick={() => {
                                          const observaciones = (document.getElementById(`obs-director-${actividad.id}`) as HTMLTextAreaElement)?.value || '';
                                          const planActualizado = {
                                            ...plan,
                                            roles: plan.roles.map(r => {
                                              if (r.numero === rol.numero) {
                                                return {
                                                  ...r,
                                                  actividades: r.actividades.map(act => {
                                                    if (act.id === actividad.id) {
                                                      return {
                                                        ...act,
                                                        verificadaPorDirector: true,
                                                        fechaVerificacion: new Date().toISOString(),
                                                        observacionesDirector: observaciones
                                                      };
                                                    }
                                                    return act;
                                                  })
                                                };
                                              }
                                              return r;
                                            })
                                          };
                                          onActualizar(planActualizado);
                                          toast.success('Actividad verificada por el Director');
                                        }}
                                        className="w-full px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:shadow-lg text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                                      >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Verificar como Director OCI
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Botones */}
                          <div className="flex gap-3">
                            <button
                              onClick={() => guardarSeguimiento(rol.numero, actividad.id)}
                              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
                            >
                              <Check className="w-5 h-5" />
                              Guardar
                            </button>
                            <button
                              onClick={() => {
                                setActividadExpandida(null);
                                setNuevaObservacion('');
                                setMostrarSelectorApoyo(false);
                              }}
                              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ))}
      {/* Modal de Adjuntos */}
      {modalAdjuntos && (
        <ModalGestionAdjuntos
          actividad={plan.roles
            .find(r => r.numero === modalAdjuntos.rolNumero)
            ?.actividades.find(a => a.id === modalAdjuntos.actividadId)!}
          autorNombre={currentUser?.nombre || currentUser?.nombre_completo || plan.jefeOCI?.nombre || 'Usuario'}
          onCerrar={() => setModalAdjuntos(null)}
          onActualizar={(adjuntos, observaciones) => {
            const planActualizado = {
              ...plan,
              roles: plan.roles.map(rol => {
                if (rol.numero === modalAdjuntos.rolNumero) {
                  return {
                    ...rol,
                    actividades: rol.actividades.map(act => {
                      if (act.id === modalAdjuntos.actividadId) {
                        return { ...act, adjuntos, observacionesCumplimiento: observaciones };
                      }
                      return act;
                    })
                  };
                }
                return rol;
              })
            };
            onActualizar(planActualizado);
            toast.success('Evidencias y observaciones actualizadas correctamente');
          }}
        />
      )}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: APROBACIÓN (antes Sección 4)
// ════════════════════════════════════════════════════════════════════════════

const ESTADO_PLAN_A_BACKEND: Record<EstadoPlan, string> = {
  BORRADOR: 'borrador',
  EN_REVISION: 'en-revision',
  APROBADO: 'aprobado',
  VIGENTE: 'en-ejecucion',
  CERRADO: 'completado',
  DEVUELTO: 'borrador', // Backend doesn't have devuelto yet, fallback to borrador
};

function SeccionAprobacion({ plan, onActualizar, onRefetchPlan, puedeAprobarPlan = false, puedeActivarPlan = false, puedeEditarPlan = false, auditores = [] }: { plan: PlanAnual; onActualizar: (plan: PlanAnual) => void; onRefetchPlan?: () => void; puedeAprobarPlan?: boolean; puedeActivarPlan?: boolean; puedeEditarPlan?: boolean; auditores?: Auditor[] }) {
  const [guardando, setGuardando] = useState(false);
  const currentUser = (() => {
    try {
      const userDataStr = localStorage.getItem('esap_user_data');
      return userDataStr ? JSON.parse(userDataStr) : null;
    } catch(e) { return null; }
  })();

  const [modalObservacion, setModalObservacion] = useState<{ isOpen: boolean, auditorId: string | null, texto: string }>({ isOpen: false, auditorId: null, texto: '' });
  const [modalSubsanar, setModalSubsanar] = useState({ isOpen: false, texto: '' });

  const [modalOTPConfig, setModalOTPConfig] = useState<{
    isOpen: boolean;
    accion: 'enviar_comite' | 'aprobar_auditor' | null;
    auditorId: string | null;
    userName: string;
    userEmail: string;
    detalle: string;
  }>({
    isOpen: false,
    accion: null,
    auditorId: null,
    userName: '',
    userEmail: '',
    detalle: '',
  });

  const [isEditingCommittee, setIsEditingCommittee] = useState(false);
  const [comiteDraft, setComiteDraft] = useState<Auditor[]>(plan.equipoAprobacion || []);
  const [ordenDraft, setOrdenDraft] = useState<'secuencial' | 'paralelo'>(plan.ordenAprobacion || 'secuencial');
  const [isTraceExpanded, setIsTraceExpanded] = useState(true);

  // Aplicar el comité real o usar vacío
  const equipo = plan.equipoAprobacion || [];
  
  const historial = (plan.equipoAprobacion || []).map(a => ({
    ...a,
    auditorId: a.id || a.auditorId,
    auditorNombre: a.nombre || a.auditorNombre,
    estado: (a.estado as any) || 'PENDIENTE'
  }));

  const fueDevuelto = plan.estado === 'DEVUELTO' || historial.some(h => h.estado === 'OBSERVADA');

  const cambiarEstadoGeneral = async (nuevoEstado: EstadoPlan, historialPersonalizado?: any[]) => {
    const arrHistorial = historialPersonalizado || plan.historialAprobaciones || historial;
    const planActualizado = {
      ...plan,
      estado: nuevoEstado,
      historialAprobaciones: arrHistorial,
      fechaAprobacion: nuevoEstado === 'APROBADO' ? new Date().toISOString() : plan.fechaAprobacion
    };
    onActualizar(planActualizado);
    setGuardando(true);
    try {
      const estadoBackend = ESTADO_PLAN_A_BACKEND[nuevoEstado];
      const payload: any = { 
        estado: estadoBackend as any,
        equipo_aprobacion: arrHistorial
      };
      
      const res = await planAnualApi.update(plan.id, payload);
      if (res.success) {
        toast.success('Cambio Registrado', { description: `Trazabilidad guardada en la base de datos.` });
        onRefetchPlan?.();
      } else {
        toast.error('Error al guardar', { description: res.error });
        onRefetchPlan?.();
      }
    } catch (e: any) {
      console.error("Excepción en cambiarEstadoGeneral:", e);
      let msg = 'No se pudo guardar el estado en el servidor. ';
      if (e?.response?.data?.message) {
        msg += typeof e.response.data.message === 'string' 
          ? e.response.data.message 
          : JSON.stringify(e.response.data.message);
      } else if (e?.message) {
        msg += e.message;
      }
      
      const status = e?.response?.status;
      if (status === 403) {
        msg = `Operación denegada (403 Forbidden). Por favor repórtele al administrador del sistema que verifique sus permisos (ej. CIP.PLAN_ANUAL_APPROVE).`;
      }

      toast.error('Operación Fallida', { description: msg, duration: 10000 });
      onRefetchPlan?.();
    } finally {
      setGuardando(false);
    }
  };

  const handleAprobarAuditor = (auditorId: string, nombre: string, email?: string) => {
    const sessionUser = JSON.parse(localStorage.getItem('esap_user_data') || '{}');
    setModalOTPConfig({
      isOpen: true,
      accion: 'aprobar_auditor',
      auditorId,
      userName: sessionUser.nombre || nombre,
      userEmail: sessionUser.email || email || '',
      detalle: 'Aprobación de Miembro de Comité PAI',
    });
  };

  const handleEnviarComiteOTP = () => {
    if (fueDevuelto) {
      setModalSubsanar({ isOpen: true, texto: '' });
    } else {
      const sessionUser = JSON.parse(localStorage.getItem('esap_user_data') || '{}');
      setModalOTPConfig({
        isOpen: true,
        accion: 'enviar_comite',
        auditorId: null,
        userName: sessionUser.nombre || plan.responsable || 'Responsable del Plan',
        userEmail: sessionUser.email || '', 
        detalle: 'Envío del Proyecto al Comité de Aprobación',
      });
    }
  };

  const procesarAccionOTP = (metadata: FirmaElectronicaMetadata) => {
    if (modalOTPConfig.accion === 'aprobar_auditor' && modalOTPConfig.auditorId) {
      ejecutarAprobacionReal(modalOTPConfig.auditorId, metadata);
    } else if (modalOTPConfig.accion === 'enviar_comite') {
      cambiarEstadoGeneral('EN_REVISION');
    }
  };

  const handleConfirmarSubsanacion = () => {
    if (!modalSubsanar.texto.trim()) return;
    
    // Convertir de OBSERVADA a PENDIENTE, guardando el comentario de subsanación
    const nuevoHistorial = historial.map(h => 
      h.estado === 'OBSERVADA' 
        ? { ...h, estado: 'PENDIENTE' as const, respuestaSubsanacion: modalSubsanar.texto, fechaRespuesta: new Date().toISOString() } 
        : h
    );
    
    setModalSubsanar({ isOpen: false, texto: '' });
    toast.success('Subsanación enviada exitosamente', { description: 'El plan regresó a fase de revisión de firmas.' });
    
    // Al re-enviarlo por subsanación no requiere firma OTP, va directo a revisión
    cambiarEstadoGeneral('EN_REVISION', nuevoHistorial);
  };

  const ejecutarAprobacionReal = (auditorId: string, metadata: FirmaElectronicaMetadata) => {
    const nuevoHistorial = historial.map(h => 
      h.auditorId === auditorId ? { 
        ...h, 
        estado: 'APROBADA' as const, 
        fecha: metadata.fechaFirma,
        firmaElectronica: metadata
      } : h
    );
    
    if (nuevoHistorial.every(h => h.estado === 'APROBADA')) {
      cambiarEstadoGeneral('APROBADO', nuevoHistorial);
    } else {
      // Guardar trazabilidad intermedia sin cambiar el estado general (sigue EN_REVISION)
      cambiarEstadoGeneral('EN_REVISION', nuevoHistorial);
    }
  };

  const handleRechazarObservacion = () => {
    if (!modalObservacion.auditorId || !modalObservacion.texto.trim()) return;
    
    const nuevoHistorial = historial.map(h => 
      h.auditorId === modalObservacion.auditorId 
        ? { ...h, estado: 'OBSERVADA' as const, observacion: modalObservacion.texto, fecha: new Date().toISOString() } 
        : h
    );
    
    setModalObservacion({ isOpen: false, auditorId: null, texto: '' });
    toast.error('Plan devuelto con observaciones', { description: 'El plan regresó a fase de ajustes.' });
    
    // Almacenar forzosamente la observación en el payload del equipo
    cambiarEstadoGeneral('DEVUELTO', nuevoHistorial);
  };

  const exportarLogCSV = () => {
    try {
      const escapeCSV = (str?: string) => {
        if (!str) return '""';
        return `"${str.replace(/"/g, '""')}"`;
      };

      const cabeceras = [
        'Fase',
        'Nombre del Actor',
        'Rol',
        'Estado',
        'Fecha de Accion',
        'Observacion',
        'Respuesta de Subsanacion',
        'ID Firma Electronica',
        'IP Origen'
      ].join(';');

      const fase1 = [
        '"Fase 1: Creación y Formulación Inicial"',
        escapeCSV(plan.jefeOCI?.nombre || 'Administrador OCI'),
        '"Autor del Plan"',
        '"COMPLETADO"',
        escapeCSV(plan.fechaCreacion ? new Date(plan.fechaCreacion).toLocaleString('es-CO') : ''),
        '""',
        '""',
        '""',
        '""'
      ].join(';');

      const filasAprobadores = equipo.map(aprobador => {
        const track = historial.find(h => h.auditorId === aprobador.id) || { estado: 'PENDIENTE' } as any;
        return [
          '"Fase 2: Aprobación PAI"',
          escapeCSV(aprobador.nombre),
          escapeCSV(aprobador.cargo || 'Comité'),
          escapeCSV(track.estado),
          escapeCSV(track.fecha ? new Date(track.fecha).toLocaleString('es-CO') : ''),
          escapeCSV(track.observacion),
          escapeCSV(track.respuestaSubsanacion),
          escapeCSV(track.firmaElectronica?.hash || track.firmaElectronica?.id),
          escapeCSV(track.firmaElectronica?.ip)
        ].join(';');
      });

      const fase3 = [
        '"Fase 3: Activación Oficial"',
        '"Sistema"',
        '"Plataforma"',
        `"${plan.estado === 'VIGENTE' ? 'VIGENTE' : 'PENDIENTE'}"`,
        escapeCSV(plan.fechaAprobacion ? new Date(plan.fechaAprobacion).toLocaleString('es-CO') : ''),
        '""',
        '""',
        '""',
        '""'
      ].join(';');

      const csvContent = ['sep=;', cabeceras, fase1, ...filasAprobadores, fase3].join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Trazabilidad_PAI_${plan.vigencia || new Date().getFullYear()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('Log de aprobación exportado correctamente');
    } catch (e) {
      toast.error('Error al exportar el log CSV');
      console.error(e);
    }
  };

  const totalActividades = plan.roles.reduce((sum, rol) => sum + rol.actividades.length, 0);
  const actividadesAsignadas = plan.roles.reduce((sum, rol) => sum + rol.actividades.filter(a => a.responsable !== null).length, 0);
  const porcentajeAsignacion = totalActividades ? Math.round((actividadesAsignadas / totalActividades) * 100) : 0;

  const puedeEnviarRevision = porcentajeAsignacion === 100 && equipo.length > 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6 relative">
      
      {/* Estado general y timeline */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-sm relative z-0">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-blue-600" />
            Trazabilidad de Aprobación
          </h2>
          <button 
            type="button"
            onClick={exportarLogCSV}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200 hover:border-emerald-300 rounded-xl transition-all font-semibold shadow-sm w-fit active:scale-95"
            title="Descargar Logs completos en formato .CSV"
          >
            <Download className="w-4 h-4" />
            Descargar Logs (CSV)
          </button>
        </div>

        {/* Cintas de estado general */}
        <div className="mb-8 flex gap-4 text-sm font-semibold text-center border-b border-gray-100 pb-6 overflow-x-auto">
          <div className={`px-4 py-2 rounded-lg flex-1 whitespace-nowrap ${plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO' ? 'bg-orange-100 text-orange-700 border-2 border-orange-300' : 'bg-gray-50 text-gray-400'}`}>
            1. Formulación 
            {plan.estado === 'DEVUELTO' && <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs">DEVUELTO</span>}
          </div>
          <div className={`px-4 py-2 rounded-lg flex-1 whitespace-nowrap ${plan.estado === 'EN_REVISION' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-50 text-gray-400'}`}>
            2. Comité PAI (En Revisión)
          </div>
          <div className={`px-4 py-2 rounded-lg flex-1 whitespace-nowrap ${plan.estado === 'APROBADO' || plan.estado === 'VIGENTE' ? 'bg-green-100 text-green-700 border-2 border-green-300' : 'bg-gray-50 text-gray-400'}`}>
            3. Autorizado / Vigente
          </div>
        </div>

        {/* Cartas de estado simples */}
        {plan.estado === 'BORRADOR' && !fueDevuelto && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3 mb-6 shadow-sm">
            <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-orange-900 mb-1">Plan en fase de preparación</p>
              <p className="text-sm text-orange-800">
                Asegúrate de configurar todas las actividades y asignar todos los responsables antes de enviar el plan al comité de aprobación PAI.
              </p>
            </div>
          </div>
        )}

        {(plan.estado === 'DEVUELTO' || fueDevuelto) && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 mb-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500"></div>
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-1">
                <p className="font-bold text-red-900">Plan Devuelto por Observaciones al Comité</p>
                <div className="inline-flex items-center gap-1.5 bg-red-600 text-white text-[10px] uppercase font-black px-2 py-0.5 rounded-full shadow-sm w-max">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Turno Actual: Jefe / Configuración OCI
                </div>
              </div>
              <p className="text-sm text-red-800 leading-relaxed">
                El comité ha revisado el plan y registrado observaciones. En este estado, <strong>solo el usuario responsable del plan o el Jefe OCI</strong> puede realizar las modificaciones pertinentes, contestar (subsanar) los comentarios de los evaluadores y re-enviar el plan al Comité para retomar el flujo de aprobación.
              </p>
            </div>
          </div>
        )}

        {/* Comité UI */}
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-3 border-b pb-2 border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              Comité Aprobador PAI ({equipo.length})
            </h3>
            {(plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO') && puedeEditarPlan && !isEditingCommittee && (
              <button 
                onClick={() => {
                  setComiteDraft(plan.equipoAprobacion || []);
                  setOrdenDraft(plan.ordenAprobacion || 'secuencial');
                  setIsEditingCommittee(true);
                }}
                className="text-blue-600 text-sm font-bold hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
              >
                <Settings className="w-4 h-4" /> Editar Comité
              </button>
            )}
          </div>

          {isEditingCommittee ? (
            <div className="bg-blue-50/50 p-5 rounded-xl border-2 border-blue-100 border-dashed animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-gray-900">Configuración del Comité</h4>
                  <p className="text-xs text-gray-500">Añade o remueve miembros y establece el orden de flujo.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                  <button onClick={() => setOrdenDraft('secuencial')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${ordenDraft === 'secuencial' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Secuencial</button>
                  <button onClick={() => setOrdenDraft('paralelo')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${ordenDraft === 'paralelo' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}>Paralelo</button>
                </div>
              </div>

              {/* Autocomplete para añadir (simplificado) */}
              <div className="mb-4">
                <SelectorProfesional
                  auditores={auditores.filter((a: any) => {
                    const esAprobador = /aprobador/i.test(a.cargo || '');
                    const yaSeleccionado = comiteDraft.find(c => String(c.id) === String(a.id));
                    return esAprobador && !yaSeleccionado;
                  })}
                  onSelect={(id) => {
                    if (!id || comiteDraft.length >= 5) return;
                    const auditor = auditores.find(a => String(a.id) === String(id));
                    if (auditor) setComiteDraft([...comiteDraft, auditor]);
                  }}
                  placeholder={comiteDraft.length >= 5 ? "Límite de 5 miembros alcanzado" : "+ Agregar Aprobador PAI..."}
                  disabled={comiteDraft.length >= 5}
                />
              </div>

              {/* Lista Draft */}
              <div className="space-y-2 mb-6">
                {comiteDraft.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 italic py-4">No hay miembros seleccionados</p>
                ) : (
                  comiteDraft.map((miembro: any, index: number) => {
                    const getInitials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                    return (
                      <div key={miembro.id} className="relative flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-xl shadow-sm z-10 group">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${ordenDraft === 'secuencial' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                          {ordenDraft === 'secuencial' ? index + 1 : '•'}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-[10px] font-black shrink-0">
                          {getInitials(miembro.nombre)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{miembro.nombre}</p>
                          <p className="text-[10px] text-gray-400 truncate">{miembro.email || 'aprobador@esap.edu.co'}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 bg-orange-100 text-orange-700 mr-2">
                          {miembro.cargo || 'Funcionario'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setComiteDraft(comiteDraft.filter(c => c.id !== miembro.id))}
                          className="w-7 h-7 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex items-center gap-3 justify-end pt-4 border-t border-blue-100">
                <button onClick={() => setIsEditingCommittee(false)} className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-bold transition-colors">
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (comiteDraft.length === 0) {
                      toast.error('Debe seleccionar al menos un aprobador');
                      return;
                    }

                    // ⚡ NUEVO: Persistencia REAL en Base de Datos
                    const isSavingId = toast.loading('Guardando en base de datos...');
                    try {
                      const res = await planAnualApi.update(plan.id, { 
                        equipo_aprobacion: comiteDraft, 
                        orden_aprobacion: ordenDraft 
                      });
                      
                      toast.dismiss(isSavingId);
                      
                      if (res.success) {
                        onActualizar({ ...plan, equipoAprobacion: comiteDraft, ordenAprobacion: ordenDraft });
                        setIsEditingCommittee(false);
                        toast.success('Comité actualizado de forma permanente');
                      } else {
                        throw new Error(res.error || 'Error del backend al guardar el comité');
                      }
                    } catch (e: any) {
                      toast.dismiss(isSavingId);
                      toast.error(e.message || 'Error al persistir cambios en el comité');
                      console.error('Error actualizando comité:', e);
                    }
                  }} 
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Guardar Cambios
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {equipo.length === 0 ? (
                <div className="col-span-full p-8 text-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500 font-medium mb-4">No se ha designado un comité aprobador para este plan.</p>
                  {(plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO') && (
                    <button 
                      onClick={() => { setComiteDraft([]); setOrdenDraft('secuencial'); setIsEditingCommittee(true); }}
                      className="px-5 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold rounded-lg transition-colors border border-blue-200"
                    >
                      + Configurar Comité PAI
                    </button>
                  )}
                </div>
              ) : (
                equipo.map((aprobador, idx) => {
                  const track = historial.find(h => h.auditorId === aprobador.id) || { estado: 'PENDIENTE', auditorNombre: aprobador.nombre };
                  const isPendiente = track.estado === 'PENDIENTE';
                  const isAprobado = track.estado === 'APROBADA';
                  const isObservado = track.estado === 'OBSERVADA';
                  const isSecuencial = plan.ordenAprobacion === 'secuencial';
                  
                  // Calcular si el usuario está bloqueado por el flujo secuencial
                  let isWaitingTurn = false;
                  if (plan.ordenAprobacion === 'secuencial') {
                    const firstPendingIdx = equipo.findIndex(a => {
                      const t = historial.find(hi => hi.auditorId === a.id);
                      return !t || t.estado === 'PENDIENTE';
                    });
                    if (firstPendingIdx !== -1 && idx > firstPendingIdx) isWaitingTurn = true;
                  }
                  
                  const getInitials = (name: string) => name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

                  const isActiveTurn = !isWaitingTurn && isPendiente && plan.estado === 'EN_REVISION';

                  return (
                    <div key={aprobador.id} className={`p-4 border-2 rounded-xl flex flex-col gap-3 relative transition-all duration-500 ${
                      isAprobado ? 'border-green-200 bg-green-50' : 
                      isObservado ? 'border-red-200 bg-red-50' : 
                      isActiveTurn ? 'border-blue-400 bg-blue-50/60 shadow-lg shadow-blue-100/60 scale-[1.02] z-10' :
                      'border-gray-200 bg-gray-50/40 opacity-70 grayscale-[15%]'
                    }`}>
                      
                      {isActiveTurn && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-3 text-center rounded-full shadow border border-blue-400 z-20 flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <div className="w-1 h-1 rounded-full bg-white animate-pulse" />
                          Turno Actual
                        </div>
                      )}

                      {isObservado && plan.estado === 'DEVUELTO' && (
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white text-[9px] font-black uppercase tracking-wider py-0.5 px-3 text-center rounded-full shadow border border-red-400 z-20 flex items-center justify-center gap-1.5 whitespace-nowrap">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          Requiere Subsanación
                        </div>
                      )}

                      <div className={`flex items-center justify-between ${(isActiveTurn || (isObservado && plan.estado === 'DEVUELTO')) ? 'mt-1' : ''}`}>
                        <div className="flex items-center gap-3 relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-sm shrink-0 ${
                            isAprobado ? 'bg-green-600 text-white' : 
                            isObservado ? 'bg-red-600 text-white' : 
                            isActiveTurn ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md' :
                            'bg-gray-400 text-white opacity-80'
                          }`}>
                            {isAprobado ? <Check className="w-4 h-4"/> : isObservado ? <X className="w-4 h-4"/> : (isSecuencial ? idx + 1 : '•')}
                          </div>
                          
                          {track.firmaElectronica && (
                            <div className="absolute -top-2 -right-2 text-yellow-500 bg-white rounded-full p-0.5 shadow-sm" title="Firmado Electrónicamente">
                              <Shield className="w-4 h-4 fill-yellow-100" />
                            </div>
                          )}

                          <div className={`w-9 h-9 rounded-full bg-white border ${isActiveTurn ? 'border-blue-300 text-blue-600' : 'border-gray-200 text-gray-500'} flex items-center justify-center text-[11px] font-black shrink-0 shadow-sm`}>
                            {getInitials(aprobador.nombre)}
                          </div>

                          <div className="min-w-0 pr-2">
                            <p className={`font-bold text-sm truncate ${isActiveTurn ? 'text-blue-950' : 'text-gray-900'}`}>{aprobador.nombre}</p>
                            <p className="text-[11px] text-gray-500 truncate">{aprobador.email || 'aprobador@esap.edu.co'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`px-2 py-0.5 text-[10px] uppercase font-bold rounded-full border ${
                            isAprobado ? 'bg-green-100 text-green-800 border-green-200' :
                            isObservado ? 'bg-red-100 text-red-800 border-red-200' :
                            isActiveTurn ? 'bg-blue-600 text-white border-blue-700 shadow-md' :
                            'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {isWaitingTurn ? 'ESPERANDO TURNO' : track.estado}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${isActiveTurn ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-700'}`}>
                            {aprobador.cargo || 'Aprobador PAI'}
                          </span>
                        </div>
                      </div>

                      {track?.observacion && (
                        <div className="mt-1 p-3 bg-white border border-red-100 rounded-lg shadow-sm text-sm text-red-900">
                          <span className="font-semibold block mb-1">Observación ({track.fecha ? new Date(track.fecha).toLocaleDateString() : ''}):</span>
                          {track.observacion}
                        </div>
                      )}

                      {track.respuestaSubsanacion && (
                        <div className="mt-1 p-3 bg-white border border-green-100 rounded-lg shadow-sm text-sm text-green-900">
                          <span className="font-semibold block mb-1">Respuesta de Subsanación ({track.fechaRespuesta ? new Date(track.fechaRespuesta).toLocaleDateString() : ''}):</span>
                          {track.respuestaSubsanacion}
                        </div>
                      )}

                      {/* Acciones del Aprobador */}
                      {plan.estado === 'EN_REVISION' && isPendiente && (
                        !isWaitingTurn ? (
                          (currentUser && (currentUser.email || currentUser.person?.email || currentUser.usuario?.email)?.trim().toLowerCase() === aprobador.email?.trim().toLowerCase()) ? (
                            <div className="flex gap-2 mt-2 pt-3 border-t border-gray-200">
                              <button onClick={() => handleAprobarAuditor(aprobador.id, aprobador.nombre, aprobador.email)} className="flex-1 bg-white hover:bg-green-50 text-green-700 border border-green-200 text-sm font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm">
                                <Shield className="w-4 h-4"/> Aprobar (Firma)
                              </button>
                              <button onClick={() => setModalObservacion({ isOpen: true, auditorId: aprobador.id, texto: '' })} className="flex-1 bg-white hover:bg-red-50 text-red-700 border border-red-200 text-sm font-medium py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-sm">
                                <X className="w-4 h-4"/> Observar
                              </button>
                            </div>
                          ) : (
                            <div className="mt-2 pt-3 border-t border-gray-200 text-center">
                              <div className="bg-gray-50 text-gray-500 text-[11px] font-semibold py-2 px-3 rounded-lg flex items-center justify-center border border-gray-200">
                                <Shield className="w-3 h-3 mr-2 opacity-60 text-blue-500"/> 
                                {track?.respuestaSubsanacion 
                                  ? `El usuario se encuentra verificando la respuesta de subsanación...` 
                                  : `Esperando revisión de este usuario...`}
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="mt-2 pt-3 border-t border-gray-200">
                            <div className="bg-gray-100 text-gray-500 text-[11px] font-semibold py-2 px-3 rounded-lg flex items-center gap-2 justify-center italic border border-gray-200/60">
                              <Loader2 className="w-3 h-3 animate-spin"/> Esperando turno previo...
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Checklist de validación (Solo modo borrador/devuelto) */}
      {(plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO') && puedeEditarPlan && (
        <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Validación para envío a comité</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-gray-700">5 roles obligatorios del Decreto 648/2017</span>
            </div>
            <div className="flex items-center gap-3">
              {porcentajeAsignacion === 100 ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-orange-600" />}
              <span className="text-gray-700">Responsables asignados: <strong>{actividadesAsignadas}/{totalActividades}</strong> ({porcentajeAsignacion}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Botoneras Generales */}
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 relative z-0">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones de Flujo</h2>
        
        <div className="space-y-3 relative z-0">
          {(plan.estado === 'BORRADOR' || plan.estado === 'DEVUELTO') && puedeEditarPlan && (
            <button onClick={handleEnviarComiteOTP} disabled={!puedeEnviarRevision || guardando} className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
              {guardando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              {fueDevuelto ? 'Subsanar y Re-enviar a Comité de Aprobación (Firma)' : 'Enviar a Comité de Aprobación (Firma)'}
            </button>
          )}

          {plan.estado === 'APROBADO' && puedeActivarPlan && (
            <button onClick={() => cambiarEstadoGeneral('VIGENTE')} disabled={guardando} className="w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 shadow-md">
              <CheckCircle2 className="w-5 h-5" />
              Activar Plan (Hacer Vigente)
            </button>
          )}
          
          {plan.estado === 'APROBADO' && !puedeActivarPlan && (
            <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-3 text-green-800">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">Plan Aprobado</p>
                <p className="text-sm">El comité ha autorizado este plan. Esperando Activación por el Jefe OCI.</p>
              </div>
            </div>
          )}

          {plan.estado === 'VIGENTE' && (
            <div className="bg-white border text-left border-gray-200 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm">
              <button 
                onClick={() => setIsTraceExpanded(!isTraceExpanded)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800 text-sm">Trazabilidad Final de Activación</h3>
                    <p className="text-xs text-gray-500">Histórico del flujo de aprobación PAI</p>
                  </div>
                </div>
                <div className={`w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 transition-transform duration-300 shrink-0 ${isTraceExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>
              
              <AnimatePresence>
                {isTraceExpanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-100 bg-white overflow-hidden"
                  >
                    <div className="px-4 md:px-8 py-8 bg-gray-50/50 rounded-b-2xl">
                      <div className="relative border-l-2 border-indigo-200 ml-4 flex flex-col gap-10">
                        
                        {/* Paso 1: Creación */}
                        <div className="relative pl-8">
                          <div className="absolute -left-[13px] top-0 w-6 h-6 rounded-full bg-white border-4 border-indigo-300 shadow-sm flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          </div>
                          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow relative">
                            <div className="absolute w-3 h-3 bg-white border-l border-t border-gray-200 rotate-[-45deg] -left-[6px] top-3"></div>
                            <h4 className="font-bold text-gray-900 text-sm flex justify-between items-center">
                              Creación y Formulación Inicial
                              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">Fase 1</span>
                            </h4>
                            <div className="mt-2 text-xs text-gray-600 flex items-center gap-2">
                              <div className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex justify-center items-center font-bold text-[10px]">
                                {plan.jefeOCI?.nombre ? plan.jefeOCI.nombre.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'AD'}
                              </div>
                              <span className="font-medium text-gray-800">{plan.jefeOCI?.nombre || 'Administrador OCI'}</span>
                              <span className="mx-1 text-gray-300">|</span>
                              <span className="text-gray-500">Autor del Plan</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Paso 2: Aprobaciones Comité */}
                        {equipo.map((aprobador, idx) => {
                          const track = historial.find(h => h.auditorId === aprobador.id) || { estado: 'PENDIENTE' } as any;
                          const isAprobado = track.estado === 'APROBADA';
                          const isObservado = track.estado === 'OBSERVADA';
                          const isPendiente = track.estado === 'PENDIENTE';
                          
                          const dotColor = isAprobado ? 'border-green-400 bg-green-500' : isObservado ? 'border-red-400 bg-red-500' : 'border-blue-300 bg-white';
                          const innerDot = isPendiente ? 'bg-blue-400' : '';
                          
                          return (
                            <div key={`trace-${aprobador.id}`} className="relative pl-8">
                              <div className={`absolute -left-[13px] top-2 w-6 h-6 rounded-full border-4 ${dotColor} shadow-md flex items-center justify-center z-10`}>
                                {isAprobado && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                {isObservado && <X className="w-3 h-3 text-white" strokeWidth={3} />}
                                {isPendiente && <div className={`w-2 h-2 rounded-full ${innerDot}`} />}
                              </div>
                              <div className={`p-5 rounded-2xl border-2 transition-all shadow-sm ${
                                isAprobado ? 'bg-white border-green-100 hover:border-green-300' : 
                                isObservado ? 'bg-red-50/30 border-red-100 hover:border-red-300' : 
                                'bg-white border-gray-100 hover:border-blue-100'
                              } relative`}>
                                <div className={`absolute w-3 h-3 rotate-[-45deg] -left-[7px] top-3 ${
                                  isAprobado ? 'bg-white border-l-2 border-t-2 border-green-100' : 
                                  isObservado ? 'bg-red-50/30 border-l-2 border-t-2 border-red-100' : 
                                  'bg-white border-l-2 border-t-2 border-gray-100'
                                }`}></div>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-gray-100/60">
                                  <div>
                                    <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                                      Aprobación PAI: {aprobador.nombre}
                                      {track.firmaElectronica && (
                                        <div className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded shadow-sm" title="Firma Electrónica Válida">
                                          <Shield className="w-3 h-3" /> F.E.
                                        </div>
                                      )}
                                    </h4>
                                    <p className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">{aprobador.cargo || 'Comité'}</span>
                                      <span className="text-gray-300">•</span>
                                      <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-gray-400" />
                                        {track.fecha ? new Date(track.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : 'Esperando revisión...'}
                                      </span>
                                    </p>
                                  </div>
                                  <div className="shrink-0">
                                    <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-lg border ${
                                      isAprobado ? 'bg-green-100 text-green-800 border-green-200' :
                                      isObservado ? 'bg-red-100 text-red-800 border-red-200' :
                                      'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}>
                                      {track.estado}
                                    </span>
                                  </div>
                                </div>

                                {/* Observations & Answers */}
                                {track.observacion && (
                                  <div className="mt-3 bg-red-50/50 rounded-xl p-4 border border-red-100 shadow-inner">
                                    <h5 className="text-[11px] font-bold text-red-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                      <AlertCircle className="w-3.5 h-3.5" /> Observación Realizada
                                    </h5>
                                    <p className="text-sm text-red-900 leading-relaxed italic border-l-2 border-red-300 pl-3">
                                      "{track.observacion}"
                                    </p>
                                  </div>
                                )}

                                {track.respuestaSubsanacion && (
                                  <div className="mt-3 bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 shadow-inner relative">
                                    <div className="absolute -top-3 left-8 text-emerald-300">
                                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 10 20 15 15 20"></polyline><path d="M4 4v7a4 4 0 0 0 4 4h12"></path></svg>
                                    </div>
                                    <h5 className="text-[11px] font-bold text-emerald-800 uppercase tracking-widest mb-1.5 flex items-center gap-1.5 mt-1">
                                      <FileCheck className="w-3.5 h-3.5" /> Respuesta a Observación
                                      {track.fechaRespuesta && <span className="text-[9px] text-emerald-600 font-normal ml-auto bg-emerald-100 px-2 py-0.5 rounded-full">{new Date(track.fechaRespuesta).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                                    </h5>
                                    <p className="text-sm text-emerald-900 leading-relaxed border-l-2 border-emerald-300 pl-3 bg-white p-2 border rounded shadow-sm">
                                      {track.respuestaSubsanacion}
                                    </p>
                                  </div>
                                )}

                                {/* Detalles de la firma */}
                                {track.firmaElectronica && (
                                  <div className="mt-4 pt-3 border-t border-dashed border-gray-200">
                                    <div className="flex bg-gray-50 rounded-lg p-2.5 items-center justify-between border border-gray-100">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-blue-100 rounded text-blue-700 flex items-center justify-center">
                                          <FileText className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-bold text-gray-700 uppercase">Detalle de Firma</p>
                                          <p className="text-[10px] text-gray-500 font-mono tracking-tighter">ID: {track.firmaElectronica.hash || track.firmaElectronica.id || 'N/A'}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[9px] text-gray-400 uppercase font-bold">Dirección IP / Origen</p>
                                        <p className="text-[10px] font-mono text-gray-600">{track.firmaElectronica.ip || 'Intranet (Local)'}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Paso 3: Activación Oficial */}
                        <div className="relative pl-8">
                          <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-green-500 ring-4 ring-green-100 shadow-lg flex items-center justify-center z-10">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                          <div className="bg-gradient-to-br from-green-50 to-emerald-100/50 p-5 rounded-2xl border-2 border-green-200 shadow-md relative overflow-hidden">
                            <div className="absolute w-4 h-4 rotate-[-45deg] -left-[9px] top-2 bg-green-50 border-l-2 border-t-2 border-green-200"></div>
                            
                            <div className="relative z-10">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-extrabold text-green-900 text-base">Activación Oficial</h4>
                                  <p className="text-xs text-green-700 font-medium mt-1">El PAI se encuentra 100% aprobado y en fase de ejecución</p>
                                </div>
                                <Shield className="w-8 h-8 text-green-500/30" />
                              </div>
                              <div className="inline-flex flex-wrap items-stretch mt-4 bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden group">
                                <div className="px-3 py-2 bg-green-50/50 flex items-center border-r border-green-100">
                                  <CalendarClock className="w-4 h-4 text-green-600" />
                                  <span className="text-[12px] text-green-800 font-bold uppercase tracking-wider ml-2">
                                    {plan.fechaAprobacion 
                                      ? new Date(plan.fechaAprobacion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) 
                                      : 'Confirmado'}
                                  </span>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); exportarCertificadoAprobacionPDF(plan, equipo, historial); }}
                                  className="px-4 py-2 flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white transition-colors focus:outline-none"
                                  title="Generar Certificado Digital PDF"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span className="text-[11px] font-bold uppercase tracking-wider">Certificado PDF</span>
                                </button>
                              </div>
                            </div>
                            
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-green-500/10 rounded-full blur-2xl"></div>
                          </div>
                        </div>
                        
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal / Dialogo de Observación (Render Flotante Top-Level Z-Index) */}
      <AnimatePresence>
        {modalObservacion.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border-2 border-red-100"
            >
              <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2 text-red-700">
                <AlertCircle className="w-5 h-5"/> Registrar Observación
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                El plan será devuelto al estado inicial (DEVUELTO) para que el responsable lo corrija y lo vuelva a enviar.
              </p>
              <textarea
                className="w-full h-32 p-3 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none resize-none text-sm transition-all"
                placeholder="Detalle exactamente los ajustes requeridos..."
                value={modalObservacion.texto}
                onChange={(e) => setModalObservacion(prev => ({ ...prev, texto: e.target.value }))}
                autoFocus
              />
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  onClick={() => setModalObservacion({ isOpen: false, auditorId: null, texto: '' })} 
                  className="px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!modalObservacion.texto.trim()} 
                  onClick={handleRechazarObservacion} 
                  className="px-5 py-2.5 font-medium bg-red-600 text-white hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  Confirmar y Devolver
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {modalSubsanar.isOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-green-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Ajustes Realizados y Subsanación</h3>
                  <p className="text-sm text-gray-500">Comunique los ajustes a los miembros del comité</p>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">
                Dado que el plan ya fue firmado por usted y las firmas previas aún son vinculantes, su re-envío de ajustes omitirá una doble validación de OTP y pasará de inmediato a la fase de revisión.
              </p>
              <textarea
                className="w-full h-32 p-3 border-2 border-gray-200 rounded-xl focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none resize-none text-sm transition-all"
                placeholder="Detalle exactamente los ajustes que ha realizado en respuesta a las observaciones planteadas..."
                value={modalSubsanar.texto}
                onChange={(e) => setModalSubsanar(prev => ({ ...prev, texto: e.target.value }))}
                autoFocus
              />
              <div className="flex gap-3 justify-end mt-6">
                <button 
                  onClick={() => setModalSubsanar({ isOpen: false, texto: '' })} 
                  className="px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                >
                  Cancelar
                </button>
                <button 
                  disabled={!modalSubsanar.texto.trim()} 
                  onClick={handleConfirmarSubsanacion} 
                  className="px-5 py-2.5 font-medium bg-green-600 text-white hover:bg-green-700 rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                >
                  Confirmar y Re-enviar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ModalFirmaOTP
        isOpen={modalOTPConfig.isOpen}
        onClose={() => setModalOTPConfig(prev => ({ ...prev, isOpen: false }))}
        onSuccess={procesarAccionOTP}
        userName={modalOTPConfig.userName}
        userEmail={modalOTPConfig.userEmail}
        accionDetalle={modalOTPConfig.detalle}
      />
    </motion.div>
  );
}
