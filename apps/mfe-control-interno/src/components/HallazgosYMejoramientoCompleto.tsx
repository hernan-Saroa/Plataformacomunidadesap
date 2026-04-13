/**
 * HALLAZGOS Y MEJORAMIENTO COMPLETO
 * Módulo consolidado que integra:
 * - Gestión de Hallazgos
 * - Planes de Mejoramiento
 * - Seguimiento de Planes
 * 
 * FLUJO: Hallazgo → Plan → Seguimiento → Cierre
 * 
 * ⭐ NUEVO: Integración de componentes críticos
 * - Semáforo Automático (verde/amarillo/rojo)
 * - Sistema de Gestión de Evidencias
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import {
  AlertTriangle, ListChecks, Activity, Plus, Search, Filter,
  Eye, Edit, Trash2, Save, X, Clock, CheckCircle, XCircle,
  FileText, Users, Calendar, TrendingUp, AlertCircle, Flag,
  Target, ChevronRight, Hash, Building2, User, Send, Download,
  Upload, BarChart3, Percent, PlayCircle, PauseCircle, Settings,
  ThumbsUp, ThumbsDown, MessageSquare, Paperclip, ChevronDown,
  Shield, Scale, Award, Layers, Grid, List as ListIcon, 
  RefreshCw, ExternalLink, Copy, Archive
} from 'lucide-react';
import { Card } from '@esap-mfe/shared-ui/card';
import { Badge } from '@esap-mfe/shared-ui/badge';
import { Button } from '@esap-mfe/shared-ui/button';
import { toast } from 'sonner';

// ⭐ IMPORTAR COMPONENTES CRÍTICOS
import { SemaforoAutomatico, SemaforoCompacto } from './SemaforoAutomatico';
import { SistemaEvidencias } from './SistemaEvidencias';
import type { Evidencia } from './SistemaEvidencias';

// ============ TIPOS ============

type TabPrincipal = 'hallazgos' | 'planes' | 'seguimiento';
type EstadoHallazgo = 'detectado' | 'validado' | 'en-plan' | 'en-seguimiento' | 'cerrado';
type TipoHallazgo = 'observacion' | 'no-conformidad-menor' | 'no-conformidad-mayor' | 'riesgo-alto';
type NivelRiesgo = 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
type EstadoPlan = 'en-formulacion' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado' | 'vencido';
type EstadoAccion = 'pendiente' | 'en-progreso' | 'completada' | 'vencida';
type VistaHallazgos = 'kanban' | 'tabla';

interface Hallazgo {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  tipo: TipoHallazgo;
  nivelRiesgo: NivelRiesgo;
  estado: EstadoHallazgo;
  auditoriaAsociada: string;
  codigoAuditoria: string;
  areaAfectada: string;
  procesoAfectado: string;
  fechaDeteccion: string;
  auditorResponsable: string;
  responsableArea: string;
  causaRaiz: string;
  efecto: string;
  criterioIncumplido: string;
  evidencias: string[];
  planAsociado: string | null;
  diasTranscurridos: number;
  prioridad: 'alta' | 'media' | 'baja';
}

interface PlanMejoramiento {
  id: string;
  codigo: string;
  hallazgoId: string;
  titulo: string;
  objetivoGeneral: string;
  estado: EstadoPlan;
  responsablePlan: string;
  aprobadorPlan: string;
  fechaFormulacion: string;
  fechaAprobacion: string | null;
  fechaInicioEjecucion: string | null;
  fechaFinProgramada: string;
  progreso: number; // 0-100
  accionesProgramadas: number;
  accionesCompletadas: number;
  presupuesto: number;
  observaciones: string;
  alertas: string[];
}

interface AccionMejoramiento {
  id: string;
  planId: string;
  codigo: string;
  descripcion: string;
  tipoAccion: 'preventiva' | 'correctiva' | 'mejora';
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: EstadoAccion;
  progreso: number;
  recursos: string;
  verificacionCumplimiento: string;
  evidencias: string[];
  observaciones: string;
}

interface ColumnaKanbanHallazgo {
  id: EstadoHallazgo;
  titulo: string;
  color: string;
  icono: JSX.Element;
  descripcion: string;
}

// ============ DATOS - HALLAZGOS ============

const HALLAZGOS_EJEMPLO: Hallazgo[] = [
  {
    id: 'hall-001',
    codigo: 'HALL-2025-001',
    titulo: 'Incumplimiento en tiempos de respuesta de PQRS',
    descripcion: 'Se identificaron 15 PQRS con respuesta fuera del término legal establecido en la Ley 1755 de 2015',
    tipo: 'no-conformidad-mayor',
    nivelRiesgo: 'Alto',
    estado: 'en-seguimiento',
    auditoriaAsociada: 'Auditoría de Cumplimiento - PQRS',
    codigoAuditoria: 'AUD-2024-015',
    areaAfectada: 'Atención al Ciudadano',
    procesoAfectado: 'Gestión de PQRS',
    fechaDeteccion: '2024-12-15',
    auditorResponsable: 'Andrea Ramírez',
    responsableArea: 'Jefe Atención al Ciudadano',
    causaRaiz: 'Falta de personal dedicado y sistema de alertas ineficiente',
    efecto: 'Incumplimiento normativo y posibles sanciones',
    criterioIncumplido: 'Ley 1755 de 2015 - Art. 14 (15 días)',
    evidencias: ['Reporte PQRS Q4 2024', 'Capturas sistema', 'Acta de auditoría'],
    planAsociado: 'PLAN-2025-001',
    diasTranscurridos: 31,
    prioridad: 'alta'
  },
  {
    id: 'hall-002',
    codigo: 'HALL-2025-002',
    titulo: 'Deficiencias en controles de seguridad de bases de datos',
    descripcion: 'Ausencia de autenticación de doble factor en accesos a bases de datos críticas',
    tipo: 'riesgo-alto',
    nivelRiesgo: 'Crítico',
    estado: 'en-plan',
    auditoriaAsociada: 'Auditoría de Sistemas - Infraestructura TI',
    codigoAuditoria: 'AUD-2025-004',
    areaAfectada: 'Dirección de Tecnología',
    procesoAfectado: 'Seguridad de la Información',
    fechaDeteccion: '2025-01-10',
    auditorResponsable: 'Andrés Sánchez',
    responsableArea: 'Director de TI',
    causaRaiz: 'Falta de actualización de políticas de seguridad',
    efecto: 'Alto riesgo de acceso no autorizado a información sensible',
    criterioIncumplido: 'ISO 27001 - Control A.9.4.2',
    evidencias: ['Informe de vulnerabilidades', 'Logs de acceso'],
    planAsociado: null,
    diasTranscurridos: 6,
    prioridad: 'alta'
  },
  {
    id: 'hall-003',
    codigo: 'HALL-2025-003',
    titulo: 'Inconsistencias en la ejecución presupuestal Q4',
    descripcion: 'Diferencias entre el sistema financiero y los reportes de ejecución del 4to trimestre 2024',
    tipo: 'no-conformidad-menor',
    nivelRiesgo: 'Medio',
    estado: 'validado',
    auditoriaAsociada: 'Auditoría Financiera - Presupuesto 2024',
    codigoAuditoria: 'AUD-2025-002',
    areaAfectada: 'Dirección Financiera',
    procesoAfectado: 'Gestión Presupuestal',
    fechaDeteccion: '2025-01-18',
    auditorResponsable: 'Carlos Rodríguez',
    responsableArea: 'Director Financiero',
    causaRaiz: 'Error en conciliación de cuentas',
    efecto: 'Información financiera inexacta para toma de decisiones',
    criterioIncumplido: 'Manual de procedimientos financieros - Sección 5.3',
    evidencias: ['Estados financieros', 'Reportes SIIF'],
    planAsociado: null,
    diasTranscurridos: 3,
    prioridad: 'media'
  },
  {
    id: 'hall-004',
    codigo: 'HALL-2024-023',
    titulo: 'Falta de actualización en inventario de activos',
    descripcion: 'El inventario de activos no ha sido actualizado en los últimos 18 meses',
    tipo: 'observacion',
    nivelRiesgo: 'Bajo',
    estado: 'cerrado',
    auditoriaAsociada: 'Auditoría de Gestión - Bienes',
    codigoAuditoria: 'AUD-2024-010',
    areaAfectada: 'Gestión Administrativa',
    procesoAfectado: 'Control de Inventarios',
    fechaDeteccion: '2024-10-05',
    auditorResponsable: 'Patricia Morales',
    responsableArea: 'Jefe Administrativo',
    causaRaiz: 'Falta de personal para inventario físico',
    efecto: 'Información desactualizada de activos institucionales',
    criterioIncumplido: 'Procedimiento de inventarios - Frecuencia semestral',
    evidencias: ['Último inventario (Abr 2023)'],
    planAsociado: 'PLAN-2024-015',
    diasTranscurridos: 103,
    prioridad: 'baja'
  },
  {
    id: 'hall-005',
    codigo: 'HALL-2025-004',
    titulo: 'Procesos de contratación sin documentación completa',
    descripcion: 'Se encontraron 3 procesos de contratación directa sin la justificación técnica requerida',
    tipo: 'no-conformidad-mayor',
    nivelRiesgo: 'Alto',
    estado: 'detectado',
    auditoriaAsociada: 'Auditoría de Cumplimiento - Contratación',
    codigoAuditoria: 'AUD-2024-018',
    areaAfectada: 'Oficina Jurídica',
    procesoAfectado: 'Contratación Pública',
    fechaDeteccion: '2025-01-20',
    auditorResponsable: 'Andrea Ramírez',
    responsableArea: 'Jefe Jurídico',
    causaRaiz: 'Desconocimiento de requisitos documentales actualizados',
    efecto: 'Riesgo de nulidad de contratos y responsabilidad fiscal',
    criterioIncumplido: 'Ley 80 de 1993 y Decreto 1082 de 2015',
    evidencias: ['Expedientes contractuales', 'Análisis de cumplimiento'],
    planAsociado: null,
    diasTranscurridos: 1,
    prioridad: 'alta'
  },
  {
    id: 'hall-006',
    codigo: 'HALL-2024-019',
    titulo: 'Ausencia de Tablas de Retención Documental actualizadas',
    descripcion: 'Las TRD de 5 dependencias no han sido actualizadas en los últimos 3 años',
    tipo: 'no-conformidad-menor',
    nivelRiesgo: 'Medio',
    estado: 'cerrado',
    auditoriaAsociada: 'Auditoría de Gestión Documental',
    codigoAuditoria: 'AUD-2024-011',
    areaAfectada: 'Archivo General',
    procesoAfectado: 'Gestión Documental',
    fechaDeteccion: '2024-11-20',
    auditorResponsable: 'Luis Fernando Mora',
    responsableArea: 'Jefe Archivo',
    causaRaiz: 'Falta de actualización normativa y cambios organizacionales',
    efecto: 'Riesgo de pérdida de documentos y desorganización archivística',
    criterioIncumplido: 'Acuerdo AGN 004 de 2013',
    evidencias: ['TRD desactualizadas', 'Acta de verificación'],
    planAsociado: 'PLAN-2024-018',
    diasTranscurridos: 62,
    prioridad: 'media'
  },
  {
    id: 'hall-007',
    codigo: 'HALL-2025-005',
    titulo: 'Deficiencias en el proceso de selección docente',
    descripcion: 'Falta de evidencia de evaluaciones técnicas en 2 procesos de selección',
    tipo: 'observacion',
    nivelRiesgo: 'Bajo',
    estado: 'validado',
    auditoriaAsociada: 'Auditoría de Gestión - Talento Humano',
    codigoAuditoria: 'AUD-2025-007',
    areaAfectada: 'Dirección de RRHH',
    procesoAfectado: 'Selección de Personal',
    fechaDeteccion: '2025-01-12',
    auditorResponsable: 'Patricia Gómez',
    responsableArea: 'Director RRHH',
    causaRaiz: 'Falta de registro documental del proceso',
    efecto: 'Falta de trazabilidad en procesos de selección',
    criterioIncumplido: 'Procedimiento de selección PR-RH-001',
    evidencias: ['Expedientes de convocatoria'],
    planAsociado: null,
    diasTranscurridos: 9,
    prioridad: 'baja'
  },
  {
    id: 'hall-008',
    codigo: 'HALL-2025-006',
    titulo: 'Falta de seguimiento a indicadores de gestión académica',
    descripcion: 'El 40% de los indicadores del proceso académico no tienen seguimiento trimestral',
    tipo: 'no-conformidad-menor',
    nivelRiesgo: 'Medio',
    estado: 'en-plan',
    auditoriaAsociada: 'Auditoría de Gestión - Dirección Académica',
    codigoAuditoria: 'AUD-2025-001',
    areaAfectada: 'Dirección Académica',
    procesoAfectado: 'Gestión Académica',
    fechaDeteccion: '2025-01-15',
    auditorResponsable: 'María González',
    responsableArea: 'Director Académico',
    causaRaiz: 'Sistema de información académica no genera reportes automáticos',
    efecto: 'Imposibilidad de tomar decisiones basadas en datos',
    criterioIncumplido: 'Plan Estratégico - Indicadores de gestión',
    evidencias: ['Actas de comité académico', 'Tablero de indicadores incompleto'],
    planAsociado: 'PLAN-2025-003',
    diasTranscurridos: 6,
    prioridad: 'media'
  },
  {
    id: 'hall-009',
    codigo: 'HALL-2024-028',
    titulo: 'Accesos no autorizados al sistema financiero',
    descripcion: 'Se detectaron 8 usuarios inactivos con permisos vigentes en el sistema financiero',
    tipo: 'riesgo-alto',
    nivelRiesgo: 'Alto',
    estado: 'en-seguimiento',
    auditoriaAsociada: 'Auditoría Financiera - Presupuesto 2024',
    codigoAuditoria: 'AUD-2025-002',
    areaAfectada: 'Dirección Financiera',
    procesoAfectado: 'Seguridad de Sistemas Financieros',
    fechaDeteccion: '2024-12-10',
    auditorResponsable: 'Carlos Rodríguez',
    responsableArea: 'Director Financiero',
    causaRaiz: 'Falta de protocolo de desactivación de usuarios',
    efecto: 'Alto riesgo de fraude o manipulación de información financiera',
    criterioIncumplido: 'Política de Seguridad de la Información',
    evidencias: ['Reporte de usuarios activos', 'Logs del sistema'],
    planAsociado: 'PLAN-2024-020',
    diasTranscurridos: 42,
    prioridad: 'alta'
  },
  {
    id: 'hall-010',
    codigo: 'HALL-2025-007',
    titulo: 'Incumplimiento en capacitación obligatoria de servidores',
    descripcion: 'El 30% de los servidores públicos no completaron las capacitaciones obligatorias de 2024',
    tipo: 'no-conformidad-menor',
    nivelRiesgo: 'Medio',
    estado: 'detectado',
    auditoriaAsociada: 'Auditoría de Gestión - Talento Humano',
    codigoAuditoria: 'AUD-2025-007',
    areaAfectada: 'Dirección de RRHH',
    procesoAfectado: 'Capacitación y Bienestar',
    fechaDeteccion: '2025-01-18',
    auditorResponsable: 'Patricia Gómez',
    responsableArea: 'Director RRHH',
    causaRaiz: 'Falta de seguimiento y control de asistencia',
    efecto: 'Incumplimiento del plan institucional de capacitación',
    criterioIncumplido: 'Plan Institucional de Capacitación 2024',
    evidencias: ['Reporte de asistencia', 'Matriz de capacitación'],
    planAsociado: null,
    diasTranscurridos: 3,
    prioridad: 'media'
  },
  {
    id: 'hall-011',
    codigo: 'HALL-2024-031',
    titulo: 'Demoras en publicación de información en web institucional',
    descripcion: 'Información de la Ley de Transparencia con más de 30 días de retraso',
    tipo: 'observacion',
    nivelRiesgo: 'Bajo',
    estado: 'cerrado',
    auditoriaAsociada: 'Auditoría de Transparencia y Acceso a la Información',
    codigoAuditoria: 'AUD-2024-019',
    areaAfectada: 'Oficina Comunicaciones',
    procesoAfectado: 'Publicación Web',
    fechaDeteccion: '2024-11-15',
    auditorResponsable: 'Luis Fernando Mora',
    responsableArea: 'Jefe Comunicaciones',
    causaRaiz: 'Falta de responsable directo para actualización web',
    efecto: 'Posibles sanciones por incumplimiento de Ley 1712',
    criterioIncumplido: 'Ley 1712 de 2014 - Transparencia',
    evidencias: ['Análisis de sitio web', 'Fechas de publicación'],
    planAsociado: 'PLAN-2024-022',
    diasTranscurridos: 67,
    prioridad: 'baja'
  },
  {
    id: 'hall-012',
    codigo: 'HALL-2025-008',
    titulo: 'Ausencia de respaldos periódicos del sistema académico',
    descripcion: 'No se ha realizado respaldo completo del sistema académico en los últimos 60 días',
    tipo: 'riesgo-alto',
    nivelRiesgo: 'Crítico',
    estado: 'detectado',
    auditoriaAsociada: 'Auditoría de Sistemas - Infraestructura TI',
    codigoAuditoria: 'AUD-2025-004',
    areaAfectada: 'Dirección de Tecnología',
    procesoAfectado: 'Respaldo y Recuperación de Datos',
    fechaDeteccion: '2025-01-14',
    auditorResponsable: 'Andrés Sánchez',
    responsableArea: 'Director TI',
    causaRaiz: 'Falla en sistema automatizado de respaldo',
    efecto: 'Alto riesgo de pérdida total de información académica',
    criterioIncumplido: 'Política de Backup - Frecuencia semanal',
    evidencias: ['Logs de respaldo', 'Informe técnico de TI'],
    planAsociado: null,
    diasTranscurridos: 7,
    prioridad: 'alta'
  },
  {
    id: 'hall-013',
    codigo: 'HALL-2024-025',
    titulo: 'Falta de segregación de funciones en procesos de compra',
    descripcion: 'El mismo funcionario autoriza y ejecuta procesos de compra menores',
    tipo: 'no-conformidad-mayor',
    nivelRiesgo: 'Alto',
    estado: 'en-seguimiento',
    auditoriaAsociada: 'Auditoría de Cumplimiento - Contratación',
    codigoAuditoria: 'AUD-2024-018',
    areaAfectada: 'Gestión Administrativa',
    procesoAfectado: 'Compras Menores',
    fechaDeteccion: '2024-12-05',
    auditorResponsable: 'Andrea Ramírez',
    responsableArea: 'Jefe Administrativo',
    causaRaiz: 'Falta de personal y ausencia de procedimiento documentado',
    efecto: 'Alto riesgo de fraude o irregularidades en compras',
    criterioIncumplido: 'Principio de control interno - Segregación de funciones',
    evidencias: ['Análisis de procesos de compra', 'Matriz de autorizaciones'],
    planAsociado: 'PLAN-2024-021',
    diasTranscurridos: 47,
    prioridad: 'alta'
  },
  {
    id: 'hall-014',
    codigo: 'HALL-2025-009',
    titulo: 'Evaluación de desempeño docente fuera de plazo',
    descripcion: 'El 25% de las evaluaciones de desempeño docente no se realizaron en el periodo establecido',
    tipo: 'observacion',
    nivelRiesgo: 'Bajo',
    estado: 'validado',
    auditoriaAsociada: 'Auditoría de Gestión - Dirección Académica',
    codigoAuditoria: 'AUD-2025-001',
    areaAfectada: 'Dirección Académica',
    procesoAfectado: 'Evaluación Docente',
    fechaDeteccion: '2025-01-16',
    auditorResponsable: 'María González',
    responsableArea: 'Director Académico',
    causaRaiz: 'Resistencia de algunos docentes y sistema manual',
    efecto: 'Imposibilidad de tomar decisiones sobre mejora docente',
    criterioIncumplido: 'Reglamento de evaluación docente',
    evidencias: ['Reporte de evaluaciones', 'Actas de comité'],
    planAsociado: null,
    diasTranscurridos: 5,
    prioridad: 'baja'
  },
  {
    id: 'hall-015',
    codigo: 'HALL-2024-030',
    titulo: 'Falta de actualización del mapa de riesgos institucional',
    descripcion: 'El mapa de riesgos no ha sido actualizado desde enero de 2024',
    tipo: 'no-conformidad-menor',
    nivelRiesgo: 'Medio',
    estado: 'en-plan',
    auditoriaAsociada: 'Auditoría de Sistema de Gestión de Calidad',
    codigoAuditoria: 'AUD-2024-012',
    areaAfectada: 'Oficina Planeación',
    procesoAfectado: 'Gestión de Riesgos',
    fechaDeteccion: '2024-12-18',
    auditorResponsable: 'Roberto Torres',
    responsableArea: 'Jefe Planeación',
    causaRaiz: 'Cambios organizacionales no incorporados al mapa',
    efecto: 'Gestión de riesgos basada en información desactualizada',
    criterioIncumplido: 'Política de Gestión de Riesgos - Actualización trimestral',
    evidencias: ['Mapa de riesgos desactualizado', 'Acta de comité'],
    planAsociado: 'PLAN-2025-004',
    diasTranscurridos: 34,
    prioridad: 'media'
  }
];

// ============ DATOS - PLANES DE MEJORAMIENTO ============

const PLANES_MEJORAMIENTO: PlanMejoramiento[] = [
  {
    id: 'plan-001',
    codigo: 'PLAN-2025-001',
    hallazgoId: 'hall-001',
    titulo: 'Plan de Mejoramiento - Gestión de PQRS',
    objetivoGeneral: 'Garantizar la respuesta oportuna de PQRS en los términos legales establecidos',
    estado: 'en-ejecucion',
    responsablePlan: 'Jefe Atención al Ciudadano',
    aprobadorPlan: 'Jefe OCI',
    fechaFormulacion: '2025-01-05',
    fechaAprobacion: '2025-01-10',
    fechaInicioEjecucion: '2025-01-12',
    fechaFinProgramada: '2025-03-31',
    progreso: 45,
    accionesProgramadas: 4,
    accionesCompletadas: 1,
    presupuesto: 8500000,
    observaciones: 'Se requiere aprobación de contratación de 1 persona adicional',
    alertas: ['Acción 2 próxima a vencer']
  },
  {
    id: 'plan-002',
    codigo: 'PLAN-2024-015',
    hallazgoId: 'hall-004',
    titulo: 'Plan de Mejoramiento - Inventario de Activos',
    objetivoGeneral: 'Actualizar y mantener al día el inventario de activos institucionales',
    estado: 'completado',
    responsablePlan: 'Jefe Administrativo',
    aprobadorPlan: 'Jefe OCI',
    fechaFormulacion: '2024-10-15',
    fechaAprobacion: '2024-10-20',
    fechaInicioEjecucion: '2024-10-22',
    fechaFinProgramada: '2024-12-31',
    progreso: 100,
    accionesProgramadas: 3,
    accionesCompletadas: 3,
    presupuesto: 5000000,
    observaciones: 'Plan completado exitosamente',
    alertas: []
  },
  {
    id: 'plan-003',
    codigo: 'PLAN-2025-002',
    hallazgoId: 'hall-002',
    titulo: 'Plan de Mejoramiento - Seguridad de Bases de Datos',
    objetivoGeneral: 'Implementar autenticación de doble factor en todos los accesos a bases de datos críticas',
    estado: 'en-revision',
    responsablePlan: 'Director de TI',
    aprobadorPlan: 'Jefe OCI',
    fechaFormulacion: '2025-01-18',
    fechaAprobacion: null,
    fechaInicioEjecucion: null,
    fechaFinProgramada: '2025-04-30',
    progreso: 0,
    accionesProgramadas: 5,
    accionesCompletadas: 0,
    presupuesto: 25000000,
    observaciones: 'En revisión por Jefe OCI',
    alertas: ['Pendiente de aprobación']
  },
  {
    id: 'plan-004',
    codigo: 'PLAN-2025-003',
    hallazgoId: 'hall-008',
    titulo: 'Plan de Mejoramiento - Indicadores de Gestión Académica',
    objetivoGeneral: 'Implementar sistema de seguimiento automático de indicadores académicos',
    estado: 'en-formulacion',
    responsablePlan: 'Director Académico',
    aprobadorPlan: 'Jefe OCI',
    fechaFormulacion: '2025-01-19',
    fechaAprobacion: null,
    fechaInicioEjecucion: null,
    fechaFinProgramada: '2025-06-30',
    progreso: 20,
    accionesProgramadas: 4,
    accionesCompletadas: 0,
    presupuesto: 12000000,
    observaciones: 'En proceso de formulación',
    alertas: []
  },
  {
    id: 'plan-005',
    codigo: 'PLAN-2024-020',
    hallazgoId: 'hall-009',
    titulo: 'Plan de Mejoramiento - Accesos Sistema Financiero',
    objetivoGeneral: 'Implementar protocolo de gestión de usuarios y accesos a sistemas financieros',
    estado: 'en-ejecucion',
    responsablePlan: 'Director Financiero',
    aprobadorPlan: 'Jefe OCI',
    fechaFormulacion: '2024-12-18',
    fechaAprobacion: '2024-12-22',
    fechaInicioEjecucion: '2025-01-02',
    fechaFinProgramada: '2025-02-28',
    progreso: 70,
    accionesProgramadas: 3,
    accionesCompletadas: 2,
    presupuesto: 3000000,
    observaciones: 'En ejecución, buen avance',
    alertas: []
  },
  {
    id: 'plan-006',
    codigo: 'PLAN-2024-018',
    hallazgoId: 'hall-006',
    titulo: 'Plan de Mejoramiento - Actualización TRD',
    objetivoGeneral: 'Actualizar Tablas de Retención Documental de todas las dependencias',
    estado: 'completado',
    responsablePlan: 'Jefe Archivo',
    aprobadorPlan: 'Jefe OCI',
    fechaFormulacion: '2024-12-01',
    fechaAprobacion: '2024-12-05',
    fechaInicioEjecucion: '2024-12-08',
    fechaFinProgramada: '2025-01-15',
    progreso: 100,
    accionesProgramadas: 6,
    accionesCompletadas: 6,
    presupuesto: 4500000,
    observaciones: 'Plan finalizado exitosamente',
    alertas: []
  },
  {
    id: 'plan-007',
    codigo: 'PLAN-2024-021',
    hallazgoId: 'hall-013',
    titulo: 'Plan de Mejoramiento - Segregación de Funciones en Compras',
    objetivoGeneral: 'Implementar segregación de funciones en procesos de compra',
    estado: 'en-ejecucion',
    responsablePlan: 'Jefe Administrativo',
    aprobadorPlan: 'Jefe OCI',
    fechaFormulacion: '2024-12-12',
    fechaAprobacion: '2024-12-18',
    fechaInicioEjecucion: '2025-01-03',
    fechaFinProgramada: '2025-03-31',
    progreso: 55,
    accionesProgramadas: 5,
    accionesCompletadas: 2,
    presupuesto: 6000000,
    observaciones: 'Avance satisfactorio',
    alertas: ['Acción 3 en ejecución']
  },
  {
    id: 'plan-008',
    codigo: 'PLAN-2024-022',
    hallazgoId: 'hall-011',
    titulo: 'Plan de Mejoramiento - Publicación Web Transparencia',
    objetivoGeneral: 'Garantizar actualización oportuna de información en portal web',
    estado: 'completado',
    responsablePlan: 'Jefe Comunicaciones',
    aprobadorPlan: 'Jefe OCI',
    fechaFormulacion: '2024-11-22',
    fechaAprobacion: '2024-11-28',
    fechaInicioEjecucion: '2024-12-01',
    fechaFinProgramada: '2024-12-31',
    progreso: 100,
    accionesProgramadas: 3,
    accionesCompletadas: 3,
    presupuesto: 2500000,
    observaciones: 'Plan cerrado exitosamente',
    alertas: []
  },
  {
    id: 'plan-009',
    codigo: 'PLAN-2025-004',
    hallazgoId: 'hall-015',
    titulo: 'Plan de Mejoramiento - Actualización Mapa de Riesgos',
    objetivoGeneral: 'Actualizar y mantener vigente el mapa de riesgos institucional',
    estado: 'aprobado',
    responsablePlan: 'Jefe Planeación',
    aprobadorPlan: 'Jefe OCI',
    fechaFormulacion: '2025-01-08',
    fechaAprobacion: '2025-01-15',
    fechaInicioEjecucion: '2025-01-20',
    fechaFinProgramada: '2025-04-30',
    progreso: 10,
    accionesProgramadas: 4,
    accionesCompletadas: 0,
    presupuesto: 5000000,
    observaciones: 'Aprobado, iniciando ejecución',
    alertas: []
  }
];

// ============ DATOS - ACCIONES DE MEJORAMIENTO ============

const ACCIONES_MEJORAMIENTO: AccionMejoramiento[] = [
  {
    id: 'accion-001',
    planId: 'plan-001',
    codigo: 'ACC-001-01',
    descripcion: 'Contratar 1 profesional adicional para gestión de PQRS',
    tipoAccion: 'correctiva',
    responsable: 'Director RRHH',
    fechaInicio: '2025-01-12',
    fechaFin: '2025-02-15',
    estado: 'completada',
    progreso: 100,
    recursos: 'Presupuesto para contratación',
    verificacionCumplimiento: 'Contrato firmado',
    evidencias: ['Contrato', 'Resolución de nombramiento'],
    observaciones: 'Contratación completada el 2025-02-10'
  },
  {
    id: 'accion-002',
    planId: 'plan-001',
    codigo: 'ACC-001-02',
    descripcion: 'Implementar sistema de alertas automáticas para PQRS próximas a vencer',
    tipoAccion: 'preventiva',
    responsable: 'Director de TI',
    fechaInicio: '2025-01-15',
    fechaFin: '2025-02-28',
    estado: 'en-progreso',
    progreso: 60,
    recursos: 'Desarrollo interno',
    verificacionCumplimiento: 'Sistema en producción',
    evidencias: [],
    observaciones: 'Desarrollo al 60%, pruebas en marcha'
  },
  {
    id: 'accion-003',
    planId: 'plan-001',
    codigo: 'ACC-001-03',
    descripcion: 'Capacitar al equipo en atención de PQRS y normativa vigente',
    tipoAccion: 'preventiva',
    responsable: 'Jefe Atención',
    fechaInicio: '2025-02-01',
    fechaFin: '2025-02-28',
    estado: 'pendiente',
    progreso: 0,
    recursos: 'Capacitador externo',
    verificacionCumplimiento: 'Certificados de capacitación',
    evidencias: [],
    observaciones: 'Programada para febrero'
  },
  {
    id: 'accion-004',
    planId: 'plan-001',
    codigo: 'ACC-001-04',
    descripcion: 'Actualizar manual de procedimientos de PQRS',
    tipoAccion: 'mejora',
    responsable: 'Jefe Atención',
    fechaInicio: '2025-03-01',
    fechaFin: '2025-03-31',
    estado: 'pendiente',
    progreso: 0,
    recursos: 'Interno',
    verificacionCumplimiento: 'Manual aprobado',
    evidencias: [],
    observaciones: 'Pendiente de inicio'
  }
];

// ============ COLUMNAS KANBAN HALLAZGOS ============

const COLUMNAS_KANBAN_HALLAZGOS: ColumnaKanbanHallazgo[] = [
  {
    id: 'detectado',
    titulo: 'Detectado',
    color: '#DC2626',
    icono: <AlertTriangle className="w-5 h-5" />,
    descripcion: 'Hallazgos recién identificados'
  },
  {
    id: 'validado',
    titulo: 'Validado',
    color: '#F59E0B',
    icono: <Flag className="w-5 h-5" />,
    descripcion: 'Validados por responsable de área'
  },
  {
    id: 'en-plan',
    titulo: 'En Planificación',
    color: '#3B82F6',
    icono: <FileText className="w-5 h-5" />,
    descripcion: 'Formulando plan de mejoramiento'
  },
  {
    id: 'en-seguimiento',
    titulo: 'En Seguimiento',
    color: '#8B5CF6',
    icono: <Activity className="w-5 h-5" />,
    descripcion: 'Plan en ejecución'
  },
  {
    id: 'cerrado',
    titulo: 'Cerrado',
    color: '#10B981',
    icono: <CheckCircle className="w-5 h-5" />,
    descripcion: 'Hallazgo solucionado'
  }
];

// ============ UTILIDADES ============

const getTipoHallazgoInfo = (tipo: TipoHallazgo) => {
  const info = {
    'observacion': { label: 'Observación', color: '#3B82F6', icono: '👁️' },
    'no-conformidad-menor': { label: 'NC Menor', color: '#F59E0B', icono: '⚠️' },
    'no-conformidad-mayor': { label: 'NC Mayor', color: '#DC2626', icono: '❌' },
    'riesgo-alto': { label: 'Riesgo Alto', color: '#7C2D12', icono: '🔥' }
  };
  return info[tipo];
};

const getNivelRiesgoColor = (nivel: NivelRiesgo) => {
  const colores = {
    'Crítico': '#DC2626',
    'Alto': '#F59E0B',
    'Medio': '#3B82F6',
    'Bajo': '#10B981'
  };
  return colores[nivel];
};

const getEstadoPlanInfo = (estado: EstadoPlan) => {
  const info = {
    'en-formulacion': { label: 'En Formulación', color: '#6B7280', icono: <Edit className="w-4 h-4" /> },
    'en-revision': { label: 'En Revisión', color: '#F59E0B', icono: <Eye className="w-4 h-4" /> },
    'aprobado': { label: 'Aprobado', color: '#10B981', icono: <CheckCircle className="w-4 h-4" /> },
    'en-ejecucion': { label: 'En Ejecución', color: '#3B82F6', icono: <PlayCircle className="w-4 h-4" /> },
    'completado': { label: 'Completado', color: '#10B981', icono: <Award className="w-4 h-4" /> },
    'vencido': { label: 'Vencido', color: '#DC2626', icono: <XCircle className="w-4 h-4" /> }
  };
  return info[estado];
};

const getEstadoAccionColor = (estado: EstadoAccion) => {
  const colores = {
    'pendiente': '#6B7280',
    'en-progreso': '#3B82F6',
    'completada': '#10B981',
    'vencida': '#DC2626'
  };
  return colores[estado];
};

// ============ COMPONENTE PRINCIPAL ============

export function HallazgosYMejoramientoCompleto() {
  const [tabActivo, setTabActivo] = useState<TabPrincipal>('hallazgos');

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* ACCIÓN PRINCIPAL */}
        <div className="flex justify-end">
          <Button style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Hallazgo
          </Button>
        </div>

        {/* FLUJO VISUAL */}
        <Card className="p-6 bg-gradient-to-r from-orange-50 to-purple-50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div
                className={`text-center p-4 rounded-lg transition-all cursor-pointer ${
                  tabActivo === 'hallazgos' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setTabActivo('hallazgos')}
              >
                <AlertTriangle className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'hallazgos' ? 'text-white' : 'text-orange-600'}`} />
                <p className="font-bold text-sm">1. Hallazgos</p>
                <p className="text-xs opacity-80">Identificación</p>
              </div>
            </div>

            <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />

            <div className="flex-1">
              <div
                className={`text-center p-4 rounded-lg transition-all cursor-pointer ${
                  tabActivo === 'planes' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setTabActivo('planes')}
              >
                <ListChecks className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'planes' ? 'text-white' : 'text-blue-600'}`} />
                <p className="font-bold text-sm">2. Planes</p>
                <p className="text-xs opacity-80">Mejoramiento</p>
              </div>
            </div>

            <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />

            <div className="flex-1">
              <div
                className={`text-center p-4 rounded-lg transition-all cursor-pointer ${
                  tabActivo === 'seguimiento' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
                onClick={() => setTabActivo('seguimiento')}
              >
                <Activity className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'seguimiento' ? 'text-white' : 'text-green-600'}`} />
                <p className="font-bold text-sm">3. Seguimiento</p>
                <p className="text-xs opacity-80">Monitoreo</p>
              </div>
            </div>
          </div>
        </Card>

        {/* CONTENIDO SEGÚN TAB */}
        <AnimatePresence mode="wait">
          {tabActivo === 'hallazgos' && <TabHallazgos />}
          {tabActivo === 'planes' && <TabPlanes />}
          {tabActivo === 'seguimiento' && <TabSeguimiento />}
        </AnimatePresence>
      </div>
    </DndProvider>
  );
}

// ============ TAB 1: HALLAZGOS ============

function TabHallazgos() {
  const [vista, setVista] = useState<VistaHallazgos>('kanban');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<TipoHallazgo | 'todos'>('todos');
  const [hallazgos, setHallazgos] = useState(HALLAZGOS_EJEMPLO);
  const [hallazgoSeleccionado, setHallazgoSeleccionado] = useState<Hallazgo | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  const hallazgosFiltrados = hallazgos.filter(h => {
    const matchBusqueda = h.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                          h.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = filtroTipo === 'todos' || h.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  const moverHallazgo = (hallazgoId: string, nuevoEstado: EstadoHallazgo) => {
    setHallazgos(prev => prev.map(h =>
      h.id === hallazgoId ? { ...h, estado: nuevoEstado } : h
    ));
    toast.success('Hallazgo movido exitosamente');
  };

  const estadisticas = {
    total: hallazgosFiltrados.length,
    detectados: hallazgosFiltrados.filter(h => h.estado === 'detectado').length,
    enSeguimiento: hallazgosFiltrados.filter(h => h.estado === 'en-seguimiento').length,
    cerrados: hallazgosFiltrados.filter(h => h.estado === 'cerrado').length
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2" style={{ borderColor: '#F97316', background: '#FFF7ED' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Total Hallazgos</p>
          <p className="text-3xl font-black" style={{ color: '#F97316' }}>{estadisticas.total}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#DC2626', background: '#FEE2E2' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Detectados</p>
          <p className="text-3xl font-black" style={{ color: '#DC2626' }}>{estadisticas.detectados}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#8B5CF6', background: '#F3E8FF' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">En Seguimiento</p>
          <p className="text-3xl font-black" style={{ color: '#8B5CF6' }}>{estadisticas.enSeguimiento}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#10B981', background: '#D1FAE5' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Cerrados</p>
          <p className="text-3xl font-black" style={{ color: '#10B981' }}>{estadisticas.cerrados}</p>
        </Card>
      </div>

      {/* BARRA DE HERRAMIENTAS */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar hallazgo
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Tipo de hallazgo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="todos">Todos los tipos</option>
              <option value="observacion">Observación</option>
              <option value="no-conformidad-menor">NC Menor</option>
              <option value="no-conformidad-mayor">NC Mayor</option>
              <option value="riesgo-alto">Riesgo Alto</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Vista</label>
            <div className="flex gap-2">
              <Button
                variant={vista === 'kanban' ? 'default' : 'outline'}
                onClick={() => setVista('kanban')}
                className="flex-1"
              >
                <Grid className="w-4 h-4 mr-2" />
                Kanban
              </Button>
              <Button
                variant={vista === 'tabla' ? 'default' : 'outline'}
                onClick={() => setVista('tabla')}
                className="flex-1"
              >
                <ListIcon className="w-4 h-4 mr-2" />
                Tabla
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* VISTA KANBAN */}
      {vista === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {COLUMNAS_KANBAN_HALLAZGOS.map(columna => {
            const hallazgosColumna = hallazgosFiltrados.filter(h => h.estado === columna.id);
            return (
              <ColumnaKanbanHallazgo
                key={columna.id}
                columna={columna}
                hallazgos={hallazgosColumna}
                onDrop={(hallazgoId) => moverHallazgo(hallazgoId, columna.id)}
                onAbrirDetalle={(hallazgo) => {
                  setHallazgoSeleccionado(hallazgo);
                  setMostrarDetalle(true);
                }}
              />
            );
          })}
        </div>
      )}

      {/* VISTA TABLA */}
      {vista === 'tabla' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Riesgo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Área</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Días</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {hallazgosFiltrados.map(hallazgo => {
                  const tipoInfo = getTipoHallazgoInfo(hallazgo.tipo);
                  const estadoInfo = COLUMNAS_KANBAN_HALLAZGOS.find(c => c.id === hallazgo.estado);
                  return (
                    <tr key={hallazgo.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{hallazgo.codigo}</Badge>
                      </td>
                      <td className="px-4 py-3 font-bold text-sm">{hallazgo.titulo}</td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: tipoInfo.color, color: 'white' }}>
                          {tipoInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: getNivelRiesgoColor(hallazgo.nivelRiesgo), color: 'white' }}>
                          {hallazgo.nivelRiesgo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge style={{ background: estadoInfo?.color, color: 'white' }}>
                          {estadoInfo?.titulo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">{hallazgo.areaAfectada}</td>
                      <td className="px-4 py-3 text-sm">{hallazgo.diasTranscurridos} días</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setHallazgoSeleccionado(hallazgo);
                              setMostrarDetalle(true);
                            }}
                          >
                            <Eye className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL DETALLE */}
      <AnimatePresence>
        {mostrarDetalle && hallazgoSeleccionado && (
          <ModalDetalleHallazgo
            hallazgo={hallazgoSeleccionado}
            onCerrar={() => setMostrarDetalle(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============ COLUMNA KANBAN HALLAZGOS ============

function ColumnaKanbanHallazgo({ columna, hallazgos, onDrop, onAbrirDetalle }: any) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'HALLAZGO',
    drop: (item: { id: string }) => onDrop(item.id),
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  }));

  return (
    <div
      ref={drop}
      className={`rounded-xl border-2 transition-all ${
        isOver ? 'border-orange-500 bg-orange-50' : 'border-gray-200 bg-gray-50'
      }`}
      style={{ minHeight: '600px' }}
    >
      <div className="p-4 border-b-2" style={{ borderColor: columna.color, background: columna.color + '15' }}>
        <div className="flex items-center gap-2 mb-1">
          <div style={{ color: columna.color }}>{columna.icono}</div>
          <h3 className="font-black text-gray-900">{columna.titulo}</h3>
          <Badge style={{ background: columna.color, color: 'white' }}>
            {hallazgos.length}
          </Badge>
        </div>
        <p className="text-xs text-gray-600">{columna.descripcion}</p>
      </div>

      <div className="p-3 space-y-3">
        {hallazgos.map((hallazgo: Hallazgo) => (
          <CardHallazgo
            key={hallazgo.id}
            hallazgo={hallazgo}
            onAbrirDetalle={onAbrirDetalle}
          />
        ))}

        {hallazgos.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">No hay hallazgos</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ CARD HALLAZGO ============

function CardHallazgo({ hallazgo, onAbrirDetalle }: any) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'HALLAZGO',
    item: { id: hallazgo.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  const tipoInfo = getTipoHallazgoInfo(hallazgo.tipo);

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      whileHover={{ y: -2 }}
      className="bg-white p-3 rounded-lg border-2 border-gray-200 cursor-move hover:border-orange-300 transition-all"
      onClick={() => onAbrirDetalle(hallazgo)}
    >
      <div className="flex items-start justify-between mb-2">
        <Badge variant="outline" className="text-xs">{hallazgo.codigo}</Badge>
        <div className="text-xl">{tipoInfo.icono}</div>
      </div>

      <h4 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2">
        {hallazgo.titulo}
      </h4>

      <div className="flex flex-wrap gap-1 mb-2">
        <Badge style={{ background: tipoInfo.color, color: 'white' }} className="text-xs">
          {tipoInfo.label}
        </Badge>
        <Badge style={{ background: getNivelRiesgoColor(hallazgo.nivelRiesgo), color: 'white' }} className="text-xs">
          {hallazgo.nivelRiesgo}
        </Badge>
      </div>

      <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
        <Building2 className="w-3 h-3" />
        {hallazgo.areaAfectada}
      </p>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {hallazgo.diasTranscurridos} días
        </span>
        {hallazgo.planAsociado && (
          <Badge variant="outline" className="text-xs">
            Con plan
          </Badge>
        )}
      </div>
    </motion.div>
  );
}

// ============ TAB 2: PLANES DE MEJORAMIENTO ============

function TabPlanes() {
  const [planes, setPlanes] = useState(PLANES_MEJORAMIENTO);

  const estadisticas = {
    total: planes.length,
    enEjecucion: planes.filter(p => p.estado === 'en-ejecucion').length,
    completados: planes.filter(p => p.estado === 'completado').length,
    presupuestoTotal: planes.reduce((sum, p) => sum + p.presupuesto, 0)
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-2" style={{ borderColor: '#3B82F6', background: '#EFF6FF' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Total Planes</p>
          <p className="text-3xl font-black" style={{ color: '#3B82F6' }}>{estadisticas.total}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#F59E0B', background: '#FEF3C7' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">En Ejecución</p>
          <p className="text-3xl font-black" style={{ color: '#F59E0B' }}>{estadisticas.enEjecucion}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#10B981', background: '#D1FAE5' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Completados</p>
          <p className="text-3xl font-black" style={{ color: '#10B981' }}>{estadisticas.completados}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#8B5CF6', background: '#F3E8FF' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Presupuesto</p>
          <p className="text-2xl font-black" style={{ color: '#8B5CF6' }}>
            ${(estadisticas.presupuestoTotal / 1000000).toFixed(1)}M
          </p>
        </Card>
      </div>

      {/* LISTA DE PLANES */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-gray-900">Planes de Mejoramiento</h3>
          <Button style={{ background: '#003DA5' }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Plan
          </Button>
        </div>

        <div className="space-y-4">
          {planes.map(plan => (
            <CardPlan key={plan.id} plan={plan} />
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

function CardPlan({ plan }: { plan: PlanMejoramiento }) {
  const estadoInfo = getEstadoPlanInfo(plan.estado);
  const hallazgo = HALLAZGOS_EJEMPLO.find(h => h.id === plan.hallazgoId);

  return (
    <div className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{plan.codigo}</Badge>
            <Badge style={{ background: estadoInfo.color, color: 'white' }}>
              {estadoInfo.icono}
              <span className="ml-1">{estadoInfo.label}</span>
            </Badge>
            {plan.alertas.length > 0 && (
              <Badge style={{ background: '#EF4444', color: 'white' }}>
                {plan.alertas.length} alertas
              </Badge>
            )}
          </div>
          <h4 className="font-bold text-gray-900 mb-1">{plan.titulo}</h4>
          <p className="text-sm text-gray-600 mb-2">{plan.objetivoGeneral}</p>
          {hallazgo && (
            <p className="text-xs text-gray-500">
              Hallazgo asociado: {hallazgo.codigo} - {hallazgo.titulo}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm">
            <Eye className="w-3 h-3" />
          </Button>
          <Button variant="outline" size="sm">
            <Edit className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500">Responsable</p>
          <p className="text-sm font-bold">{plan.responsablePlan}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Fecha Límite</p>
          <p className="text-sm font-bold">{plan.fechaFinProgramada}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Acciones</p>
          <p className="text-sm font-bold">
            {plan.accionesCompletadas}/{plan.accionesProgramadas}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Presupuesto</p>
          <p className="text-sm font-bold">${(plan.presupuesto / 1000000).toFixed(1)}M</p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-gray-700">Progreso</span>
          <span className="text-sm font-black">{plan.progreso}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${plan.progreso}%`,
              background: plan.progreso === 100 ? '#10B981' : '#3B82F6'
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ============ TAB 3: SEGUIMIENTO ⭐ CON SEMÁFORO Y EVIDENCIAS ============

function TabSeguimiento() {
  const [planSeleccionado, setPlanSeleccionado] = useState<string | null>(PLANES_MEJORAMIENTO[0]?.id || null);
  const [accionExpandida, setAccionExpandida] = useState<string | null>(null);
  
  const plan = PLANES_MEJORAMIENTO.find(p => p.id === planSeleccionado);
  const acciones = ACCIONES_MEJORAMIENTO.filter(a => a.planId === planSeleccionado);

  // ⭐ Preparar datos para el semáforo automático
  const planParaSemaforo = plan ? {
    id: plan.id,
    codigo: plan.codigo,
    titulo: plan.titulo,
    acciones: acciones.map(a => ({
      id: a.id,
      descripcion: a.descripcion,
      estado: a.estado,
      fechaFin: a.fechaFin,
      progreso: a.progreso
    })),
    fechaFinProgramada: plan.fechaFinProgramada
  } : null;

  const handleNotificarJefeOCI = (mensaje: string) => {
    toast.error(mensaje, {
      duration: 10000
    });
    console.log('Notificación al Jefe OCI:', mensaje);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* SELECTOR DE PLAN */}
      <Card className="p-4">
        <label className="block text-sm font-bold text-gray-700 mb-2">
          Seleccionar Plan de Mejoramiento
        </label>
        <select
          value={planSeleccionado || ''}
          onChange={(e) => setPlanSeleccionado(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {PLANES_MEJORAMIENTO.map(p => (
            <option key={p.id} value={p.id}>
              {p.codigo} - {p.titulo}
            </option>
          ))}
        </select>
      </Card>

      {plan && planParaSemaforo && (
        <>
          {/* ⭐ SEMÁFORO AUTOMÁTICO - NUEVO COMPONENTE CRÍTICO */}
          <SemaforoAutomatico
            plan={planParaSemaforo}
            mostrarDetalles={true}
            onAlertaGenerada={(alerta) => {
              console.log('Alerta generada:', alerta);
            }}
            onNotificarJefeOCI={handleNotificarJefeOCI}
          />

          {/* ACCIONES DE MEJORAMIENTO */}
          <Card className="p-6">
            <h3 className="text-lg font-black text-gray-900 mb-4">
              Acciones de Mejoramiento ({acciones.length})
            </h3>

            <div className="space-y-3">
              {acciones.map(accion => (
                <CardAccionMejorada
                  key={accion.id}
                  accion={accion}
                  expandida={accionExpandida === accion.id}
                  onToggleExpandir={() => setAccionExpandida(
                    accionExpandida === accion.id ? null : accion.id
                  )}
                />
              ))}
            </div>
          </Card>
        </>
      )}
    </motion.div>
  );
}

// ⭐ CARD DE ACCIÓN MEJORADA CON SISTEMA DE EVIDENCIAS
function CardAccionMejorada({ 
  accion, 
  expandida, 
  onToggleExpandir 
}: { 
  accion: AccionMejoramiento; 
  expandida: boolean;
  onToggleExpandir: () => void;
}) {
  const [evidencias, setEvidencias] = useState<Evidencia[]>([]);

  const tipoColor = {
    'preventiva': '#3B82F6',
    'correctiva': '#F59E0B',
    'mejora': '#10B981'
  };

  const handleEvidenciasCargadas = (evidenciasActualizadas: Evidencia[]) => {
    setEvidencias(evidenciasActualizadas);
    toast.success('Evidencias actualizadas');
  };

  const handleValidacionCompleta = (evidenciaId: string, validada: boolean, observaciones: string) => {
    console.log('Evidencia validada:', { evidenciaId, validada, observaciones });
    if (validada) {
      toast.success('Evidencia validada exitosamente');
    } else {
      toast.error('Evidencia rechazada');
    }
  };

  return (
    <div
      className="border-2 rounded-xl overflow-hidden"
      style={{
        borderColor: getEstadoAccionColor(accion.estado),
      }}
    >
      {/* HEADER DE LA ACCIÓN - SIEMPRE VISIBLE */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        style={{
          background: getEstadoAccionColor(accion.estado) + '10'
        }}
        onClick={onToggleExpandir}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{accion.codigo}</Badge>
              <Badge style={{ background: tipoColor[accion.tipoAccion], color: 'white' }}>
                {accion.tipoAccion.toUpperCase()}
              </Badge>
              <Badge style={{ background: getEstadoAccionColor(accion.estado), color: 'white' }}>
                {accion.estado.toUpperCase()}
              </Badge>
              {evidencias.length > 0 && (
                <Badge variant="outline">
                  <Paperclip className="w-3 h-3 mr-1" />
                  {evidencias.length} evidencias
                </Badge>
              )}
            </div>
            <p className="font-bold text-gray-900 mb-2">{accion.descripcion}</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
              <div>
                <p className="text-gray-600">Responsable:</p>
                <p className="font-bold">{accion.responsable}</p>
              </div>
              <div>
                <p className="text-gray-600">Fecha límite:</p>
                <p className="font-bold">{accion.fechaFin}</p>
              </div>
              <div>
                <p className="text-gray-600">Progreso:</p>
                <p className="font-bold">{accion.progreso}%</p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={(e) => {
            e.stopPropagation();
            onToggleExpandir();
          }}>
            {expandida ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* BARRA DE PROGRESO */}
        <div className="mt-3 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${accion.progreso}%`,
              background: getEstadoAccionColor(accion.estado)
            }}
          />
        </div>
      </div>

      {/* CONTENIDO EXPANDIDO - CON SISTEMA DE EVIDENCIAS */}
      <AnimatePresence>
        {expandida && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white border-t-2" style={{ borderColor: getEstadoAccionColor(accion.estado) }}>
              {/* INFORMACIÓN DETALLADA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-bold text-gray-600">Tipo de Acción</label>
                  <p className="text-sm text-gray-900">{accion.tipoAccion}</p>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600">Recursos</label>
                  <p className="text-sm text-gray-900">{accion.recursos}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600">Verificación de Cumplimiento</label>
                  <p className="text-sm text-gray-900">{accion.verificacionCumplimiento}</p>
                </div>
                {accion.observaciones && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-gray-600">Observaciones</label>
                    <p className="text-sm text-gray-900 bg-yellow-50 p-2 rounded border border-yellow-200">
                      {accion.observaciones}
                    </p>
                  </div>
                )}
              </div>

              {/* ⭐ SISTEMA DE EVIDENCIAS - NUEVO COMPONENTE CRÍTICO */}
              <div className="mt-4">
                <SistemaEvidencias
                  accionId={accion.id}
                  accionDescripcion={accion.descripcion}
                  evidenciasExistentes={evidencias}
                  modoValidacion={false}
                  onEvidenciasCargadas={handleEvidenciasCargadas}
                  onValidacionCompleta={handleValidacionCompleta}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CardAccion({ accion }: { accion: AccionMejoramiento }) {
  const tipoColor = {
    'preventiva': '#3B82F6',
    'correctiva': '#F59E0B',
    'mejora': '#10B981'
  };

  return (
    <div
      className="p-4 border-2 rounded-xl"
      style={{
        borderColor: getEstadoAccionColor(accion.estado),
        background: getEstadoAccionColor(accion.estado) + '10'
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{accion.codigo}</Badge>
            <Badge style={{ background: tipoColor[accion.tipoAccion], color: 'white' }}>
              {accion.tipoAccion.toUpperCase()}
            </Badge>
            <Badge style={{ background: getEstadoAccionColor(accion.estado), color: 'white' }}>
              {accion.estado.toUpperCase()}
            </Badge>
          </div>
          <p className="font-bold text-gray-900 mb-2">{accion.descripcion}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-gray-600">Responsable:</p>
              <p className="font-bold">{accion.responsable}</p>
            </div>
            <div>
              <p className="text-gray-600">Fecha límite:</p>
              <p className="font-bold">{accion.fechaFin}</p>
            </div>
            <div>
              <p className="text-gray-600">Progreso:</p>
              <p className="font-bold">{accion.progreso}%</p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Eye className="w-3 h-3" />
        </Button>
      </div>

      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${accion.progreso}%`,
            background: getEstadoAccionColor(accion.estado)
          }}
        />
      </div>
    </div>
  );
}

// ============ MODAL DETALLE HALLAZGO ============

function ModalDetalleHallazgo({ hallazgo, onCerrar }: { hallazgo: Hallazgo, onCerrar: () => void }) {
  const tipoInfo = getTipoHallazgoInfo(hallazgo.tipo);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b bg-gradient-to-r from-orange-50 to-red-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline">{hallazgo.codigo}</Badge>
                <Badge style={{ background: tipoInfo.color, color: 'white' }}>
                  {tipoInfo.label}
                </Badge>
                <Badge style={{ background: getNivelRiesgoColor(hallazgo.nivelRiesgo), color: 'white' }}>
                  {hallazgo.nivelRiesgo}
                </Badge>
              </div>
              <h2 className="text-xl font-black text-gray-900">{hallazgo.titulo}</h2>
            </div>
            <Button variant="outline" size="sm" onClick={onCerrar}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <InfoFieldHallazgo label="Descripción" value={hallazgo.descripcion} />
            <InfoFieldHallazgo label="Auditoría Asociada" value={`${hallazgo.codigoAuditoria} - ${hallazgo.auditoriaAsociada}`} />
            <InfoFieldHallazgo label="Área Afectada" value={hallazgo.areaAfectada} />
            <InfoFieldHallazgo label="Proceso Afectado" value={hallazgo.procesoAfectado} />
            <InfoFieldHallazgo label="Causa Raíz" value={hallazgo.causaRaiz} />
            <InfoFieldHallazgo label="Efecto" value={hallazgo.efecto} />
            <InfoFieldHallazgo label="Criterio Incumplido" value={hallazgo.criterioIncumplido} />
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Evidencias</label>
              <div className="flex flex-wrap gap-2">
                {hallazgo.evidencias.map((ev, idx) => (
                  <Badge key={idx} variant="outline">
                    <Paperclip className="w-3 h-3 mr-1" />
                    {ev}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-2">
          <Button variant="outline" onClick={onCerrar}>Cerrar</Button>
          <Button style={{ background: '#003DA5' }}>
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function InfoFieldHallazgo({ label, value }: { label: string, value: string }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-1">{label}</label>
      <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded border">{value}</p>
    </div>
  );
}