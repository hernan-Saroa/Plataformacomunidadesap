/**
 * ============================================
 * GESTIÓN DE AUDITORÍAS - TABLERO KANBAN OPERATIVO
 * ============================================
 * 
 * VERSIÓN: 3.0 - DISEÑO IDÉNTICO A CONTROL INTERNO DISCIPLINARIO
 * ÚLTIMA ACTUALIZACIÓN: 20 Diciembre 2025 - 16:30
 * 
 * DISEÑO 100% UNIFORME con Control Interno Disciplinario
 * 
 * ============================================
 * 📊 DATOS DE PRUEBA INCLUIDOS (13 AUDITORÍAS)
 * ============================================
 * 
 * PLANEACIÓN (3 auditorías):
 * - AUD-2025-001: Gestión Administrativa Antioquia
 * - AUD-2025-002: Gestión Financiera Bogotá  
 * - AUD-2025-003: Sistemas TI Nacional
 * 
 * EJECUCIÓN (3 auditorías):
 * - AUD-2025-004: Recursos Humanos Valle
 * - AUD-2025-005: Gestión Académica Atlántico
 * - AUD-2025-006: Infraestructura Santander
 * 
 * COMUNICACIÓN (2 auditorías):
 * - AUD-2025-007: Gestión Ambiental Cundinamarca
 * - AUD-2025-008: Procesos Contractuales Nariño
 * 
 * SEGUIMIENTO (2 auditorías):
 * - AUD-2024-015: Gestión Documental Tolima
 * - AUD-2024-016: Servicio Ciudadano Boyacá
 * 
 * FINALIZADA (3 auditorías):
 * - AUD-2024-012: Sistema Gestión Calidad Caldas
 * - AUD-2024-013: Gestión Riesgos Risaralda
 * - AUD-2024-014: Comunicación Institucional Quindío
 * 
 * ✅ Funcionalidades:
 * - Drag & Drop entre estados
 * - Filtros por territorial y búsqueda
 * - Vista Kanban y Lista
 * - Semáforos de alerta (verde/amarillo/rojo)
 * - Información completa de auditores
 * - Métricas de documentos e informes
 */

import { useState, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid, List, Plus, MoreVertical, Calendar, User, Clock,
  AlertCircle, CheckCircle, FileText, Eye, MessageSquare, History,
  Filter, Search, ChevronDown, TrendingUp, Target, Shield,
  Download, Columns3, ClipboardCheck, CheckSquare,
  Maximize2, Minimize2, RefreshCw, UserPlus, Send, FileDown, Archive, Trash2, Edit,
  ChevronsDown, ChevronsUp
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Card } from '../../ui/card';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner@2.0.3';
import { ModalExpedienteAuditoria } from './ModalExpedienteAuditoria';
import { ModalNotasAuditoria } from './ModalNotasAuditoria';
import { ModalHistorialAuditoria } from './ModalHistorialAuditoria';
import { ModalAprobacionAuditoria } from './ModalAprobacionAuditoria';
import { FormularioAuditoriaUnificado, type AuditoriaUnificadaFormData } from './FormularioAuditoriaUnificado';
import { ModalAsignarAuditorWorldClass } from './ModalAsignarAuditorWorldClass';
import { ModalCambiarEstadoAuditoria } from './ModalCambiarEstadoAuditoria';
import { ModalConfirmacionAccion } from './ModalConfirmacionAccion';
import { ModalFormularioAuditoriaWorldClass } from './ModalFormularioAuditoriaWorldClass';
import { InicioAuditoriaWizardWorldClass } from './InicioAuditoriaWizardWorldClass';
import { ExpedienteAuditoriaCompleto } from './ExpedienteAuditoriaCompleto';
import { LoadingSpinner, CardLoading } from '../../ui/loading-spinner';
import { SkeletonAuditoriaCard, SkeletonKanbanColumn } from '../../ui/skeleton';
import { EmptyState } from '../../ui/empty-state';
import type { AuditoriaFormData } from '../../../utils/validation';
import { TooltipGuia } from './TooltipGuia';
import { TOOLTIPS_CONTROL_INTERNO } from './tooltips-config';

// Integración con Planes de Mejoramiento
import { useIntegracionAuditoriaPlanes, type AuditoriaParaPlan, type HallazgoAuditoria } from './IntegracionAuditoriasPlanesContext';

// ✅ INTEGRACIÓN: Contextos de Hallazgos y Tareas
import { useHallazgos } from './HallazgosContext';
import { useTareas } from './TareasContext';

// ============ TIPOS ============

type EstadoAuditoria =
  | 'Planeación'
  | 'Ejecución'
  | 'Comunicación'
  | 'Seguimiento'
  | 'Finalizada';

type RiesgoAuditoria = 'Alto' | 'Medio' | 'Bajo';
type SemaforoColor = 'verde' | 'amarillo' | 'rojo';
type TipoAuditoria = 'regular' | 'territorial' | 'especial';
type Prioridad = 'crítica' | 'alta' | 'media' | 'baja';

interface Persona {
  nombre: string;
  cargo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
}

interface ObjetivoAuditoria {
  id: string;
  descripcion: string;
}

interface Auditoria {
  id: string;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoAuditoria;
  riesgo: RiesgoAuditoria;
  semaforo: SemaforoColor;
  territorial: string;
  auditorLider: Persona;
  auditorAsignado: Persona;
  fechaInicio: string;
  fechaFin: string;
  progreso: number;
  hallazgos: number;
  diasRestantes: number;
  porcentajeTiempo: number;
  ultimaActuacion: string;
  objetivos: ObjetivoAuditoria[];
  calificacionRiesgo: string;
  documentos: number;
  informes: number;
  tareas: number;
  
  // Nuevos campos del formulario unificado
  tipo: TipoAuditoria;
  prioridad: Prioridad;
  areaObjetivo: string;
  permiteCambiarObjetivos: boolean;
  equipoAuditores: string[];
  
  // Información territorial (si aplica)
  territorialInfo?: {
    nombre: string;
    ciudad: string;
    departamento: string;
  };
  
  // Información especial (si aplica)
  especial?: {
    tipoMotivo: string;
    solicitante: string;
    justificacion: string;
  };
  
  // ✅ INTEGRACIÓN: Validación de actividades del proceso de auditoría
  actividadesCompletas?: boolean; // ¿Completó las 3 actividades de la fase actual?
  actividadesPendientes?: number; // Número de actividades pendientes (0-3)
}

// ============ DATOS DE PRUEBA ============

const AUDITORIAS_MOCK: Auditoria[] = [
  // PLANEACIÓN (3)
  {
    id: 'aud-001',
    codigo: 'AUD-2025-001',
    titulo: 'Auditoría de Gestión Administrativa Territorial Antioquia',
    descripcion: 'Evaluación integral de procesos administrativos',
    estado: 'Planeación',
    riesgo: 'Medio',
    semaforo: 'verde',
    territorial: 'Antioquia',
    auditorLider: {
      nombre: 'Juan Pérez Gómez',
      cargo: 'Auditor Senior',
      iniciales: 'JP',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80123456'
    },
    auditorAsignado: {
      nombre: 'Ana María López Silva',
      cargo: 'Auditor Junior',
      iniciales: 'AL',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52987654'
    },
    fechaInicio: '01/02/2025',
    fechaFin: '28/02/2025',
    progreso: 15,
    hallazgos: 0,
    diasRestantes: 25,
    porcentajeTiempo: 15,
    ultimaActuacion: 'Planeación de alcance y definición de objetivos',
    objetivos: [
      { id: 'obj-1', descripcion: 'Evaluar cumplimiento normativo' },
      { id: 'obj-2', descripcion: 'Verificar documentación administrativa' }
    ],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 8,
    informes: 1,
    tareas: 6,
    tipo: 'territorial',
    prioridad: 'media',
    areaObjetivo: 'Gestión Administrativa',
    permiteCambiarObjetivos: true,
    equipoAuditores: ['María González', 'Pedro Ruiz', 'Luis Pérez'],
    territorialInfo: {
      nombre: 'Antioquia - Medellín',
      ciudad: 'Medellín',
      departamento: 'Antioquia'
    },
    actividadesCompletas: false, // ⚠️ Actividades incompletas
    actividadesPendientes: 2 // Faltan 2 actividades
  },
  {
    id: 'aud-002',
    codigo: 'AUD-2025-002',
    titulo: 'Auditoría de Gestión Financiera y Presupuestal',
    descripcion: 'Revisión de ejecución presupuestal',
    estado: 'Planeación',
    riesgo: 'Alto',
    semaforo: 'amarillo',
    territorial: 'Bogotá',
    auditorLider: {
      nombre: 'Roberto Torres Sánchez',
      cargo: 'Auditor Líder',
      iniciales: 'RT',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '79456789'
    },
    auditorAsignado: {
      nombre: 'Diana Patricia López Vargas',
      cargo: 'Auditor Senior',
      iniciales: 'DL',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52123456'
    },
    fechaInicio: '05/02/2025',
    fechaFin: '05/03/2025',
    progreso: 20,
    hallazgos: 0,
    diasRestantes: 30,
    porcentajeTiempo: 20,
    ultimaActuacion: 'Definición de objetivos y alcance de auditoría',
    objetivos: [
      { id: 'obj-3', descripcion: 'Verificar ejecución presupuestal' },
      { id: 'obj-4', descripcion: 'Auditar procesos contables' }
    ],
    calificacionRiesgo: 'Riesgo Alto',
    documentos: 12,
    informes: 2,
    tareas: 8,
    tipo: 'especial',
    prioridad: 'crítica',
    areaObjetivo: 'Área Financiera',
    permiteCambiarObjetivos: false,
    equipoAuditores: ['Ana López', 'Sandra Morales', 'Jorge Ramírez', 'Diana Rojas'],
    especial: {
      tipoMotivo: 'Solicitud ente de control',
      solicitante: 'Contraloría General de la República',
      justificacion: 'Revisión urgente solicitada por hallazgos previos en ejecución presupuestal'
    },
    actividadesCompletas: true, // ✅ Todas las actividades completadas
    actividadesPendientes: 0
  },
  {
    id: 'aud-003',
    codigo: 'AUD-2025-003',
    titulo: 'Auditoría de Sistemas de Información y Seguridad TI',
    descripcion: 'Evaluación de seguridad informática',
    estado: 'Planeación',
    riesgo: 'Alto',
    semaforo: 'verde',
    territorial: 'Nacional',
    auditorLider: {
      nombre: 'Sandra Montero Ruiz',
      cargo: 'Auditor Especialista TI',
      iniciales: 'SM',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52345678'
    },
    auditorAsignado: {
      nombre: 'Mario Bernal Castro',
      cargo: 'Auditor TI',
      iniciales: 'MB',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80987654'
    },
    fechaInicio: '10/02/2025',
    fechaFin: '10/03/2025',
    progreso: 10,
    hallazgos: 0,
    diasRestantes: 35,
    porcentajeTiempo: 10,
    ultimaActuacion: 'Planificación inicial y conformación de equipo',
    objetivos: [
      { id: 'obj-5', descripcion: 'Evaluar seguridad informática' },
      { id: 'obj-6', descripcion: 'Revisar backup y recuperación' },
      { id: 'obj-7', descripcion: 'Verificar políticas de acceso' }
    ],
    calificacionRiesgo: 'Riesgo Crítico',
    documentos: 6,
    informes: 1,
    tareas: 5,
    tipo: 'regular',
    prioridad: 'alta',
    areaObjetivo: 'Tecnología e Informática',
    permiteCambiarObjetivos: true,
    equipoAuditores: ['Fabián Ortiz', 'Laura Castillo', 'Hernán Castro']
  },

  // EJECUCIÓN (3)
  {
    id: 'aud-004',
    codigo: 'AUD-2025-004',
    titulo: 'Auditoría de Recursos Humanos y Gestión del Talento',
    descripcion: 'Revisión de procesos de contratación',
    estado: 'Ejecución',
    riesgo: 'Medio',
    semaforo: 'amarillo',
    territorial: 'Valle del Cauca',
    auditorLider: {
      nombre: 'Carlos Ramírez Díaz',
      cargo: 'Auditor Senior',
      iniciales: 'CR',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '94123456'
    },
    auditorAsignado: {
      nombre: 'Patricia Gómez Silva',
      cargo: 'Auditor',
      iniciales: 'PG',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '66987654'
    },
    fechaInicio: '15/01/2025',
    fechaFin: '15/02/2025',
    progreso: 45,
    hallazgos: 3,
    diasRestantes: 15,
    porcentajeTiempo: 45,
    ultimaActuacion: 'Trabajo de campo y recolección de evidencias',
    objetivos: [
      { id: 'obj-8', descripcion: 'Evaluar procesos de selección' },
      { id: 'obj-9', descripcion: 'Verificar cumplimiento laboral' }
    ],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 15,
    informes: 3,
    tareas: 10,
    tipo: 'regular',
    prioridad: 'media',
    areaObjetivo: 'Recursos Humanos',
    permiteCambiarObjetivos: true,
    equipoAuditores: ['Juliana Reyes', 'Oscar Medina', 'Carolina Díaz']
  },
  {
    id: 'aud-005',
    codigo: 'AUD-2025-005',
    titulo: 'Auditoría de Gestión Académica y Calidad Educativa',
    descripcion: 'Evaluación de procesos académicos',
    estado: 'Ejecución',
    riesgo: 'Bajo',
    semaforo: 'verde',
    territorial: 'Atlántico',
    auditorLider: {
      nombre: 'Diana López Vargas',
      cargo: 'Auditor Senior',
      iniciales: 'DL',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '72123456'
    },
    auditorAsignado: {
      nombre: 'Roberto Torres Méndez',
      cargo: 'Auditor',
      iniciales: 'RT',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '1098765432'
    },
    fechaInicio: '10/01/2025',
    fechaFin: '10/02/2025',
    progreso: 60,
    hallazgos: 2,
    diasRestantes: 10,
    porcentajeTiempo: 60,
    ultimaActuacion: 'Recolección de evidencias y análisis de documentos',
    objetivos: [
      { id: 'obj-10', descripcion: 'Evaluar calidad académica' },
      { id: 'obj-11', descripcion: 'Revisar programas vigentes' }
    ],
    calificacionRiesgo: 'Riesgo Bajo',
    documentos: 20,
    informes: 4,
    tareas: 7,
    tipo: 'regular',
    prioridad: 'media',
    areaObjetivo: 'Gestión Académica',
    permiteCambiarObjetivos: true,
    equipoAuditores: ['Felipe Torres', 'Paula Castro']
  },
  {
    id: 'aud-006',
    codigo: 'AUD-2025-006',
    titulo: 'Auditoría de Infraestructura y Seguridad Física',
    descripcion: 'Inspección de instalaciones físicas',
    estado: 'Ejecución',
    riesgo: 'Medio',
    semaforo: 'rojo',
    territorial: 'Santander',
    auditorLider: {
      nombre: 'Mario Bernal Castro',
      cargo: 'Auditor Líder',
      iniciales: 'MB',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '91234567'
    },
    auditorAsignado: {
      nombre: 'Sandra Montero Ruiz',
      cargo: 'Auditor',
      iniciales: 'SM',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '63456789'
    },
    fechaInicio: '20/01/2025',
    fechaFin: '20/02/2025',
    progreso: 35,
    hallazgos: 5,
    diasRestantes: 5,
    porcentajeTiempo: 75,
    ultimaActuacion: 'Inspección de campo y evaluación de riesgos',
    objetivos: [
      { id: 'obj-12', descripcion: 'Evaluar condiciones físicas' },
      { id: 'obj-13', descripcion: 'Verificar normativa de seguridad' }
    ],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 18,
    informes: 2,
    tareas: 12,
    tipo: 'regular',
    prioridad: 'alta',
    areaObjetivo: 'Servicios Generales',
    permiteCambiarObjetivos: true,
    equipoAuditores: ['Diego Ramírez', 'María González']
  },

  // COMUNICACIÓN (2)
  {
    id: 'aud-007',
    codigo: 'AUD-2025-007',
    titulo: 'Auditoría de Gestión Ambiental y Sostenibilidad',
    descripcion: 'Evaluación de políticas ambientales',
    estado: 'Comunicación',
    riesgo: 'Bajo',
    semaforo: 'verde',
    territorial: 'Cundinamarca',
    auditorLider: {
      nombre: 'Patricia Gómez Silva',
      cargo: 'Auditor Senior',
      iniciales: 'PG',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52987456'
    },
    auditorAsignado: {
      nombre: 'Luis Vargas Moreno',
      cargo: 'Auditor',
      iniciales: 'LV',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80456789'
    },
    fechaInicio: '15/12/2024',
    fechaFin: '15/01/2025',
    progreso: 85,
    hallazgos: 1,
    diasRestantes: 5,
    porcentajeTiempo: 85,
    ultimaActuacion: 'Elaboración de informe final',
    objetivos: [
      { id: 'obj-14', descripcion: 'Evaluar gestión de residuos' },
      { id: 'obj-15', descripcion: 'Verificar cumplimiento normativo ambiental' }
    ],
    calificacionRiesgo: 'Riesgo Bajo',
    documentos: 22,
    informes: 5,
    tareas: 4,
    tipo: 'regular',
    prioridad: 'media',
    areaObjetivo: 'Servicios Generales',
    permiteCambiarObjetivos: true,
    equipoAuditores: ['Pedro Ruiz', 'Sandra Morales', 'Claudia Martínez']
  },
  {
    id: 'aud-008',
    codigo: 'AUD-2025-008',
    titulo: 'Auditoría de Procesos Contractuales y Adquisiciones',
    descripcion: 'Revisión de procesos de contratación',
    estado: 'Comunicación',
    riesgo: 'Alto',
    semaforo: 'amarillo',
    territorial: 'Nariño',
    auditorLider: {
      nombre: 'Claudia Rojas Martínez',
      cargo: 'Auditor Líder',
      iniciales: 'CR',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '37123456'
    },
    auditorAsignado: {
      nombre: 'Mario Bernal Castro',
      cargo: 'Auditor Senior',
      iniciales: 'MB',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '79987654'
    },
    fechaInicio: '10/12/2024',
    fechaFin: '10/01/2025',
    progreso: 90,
    hallazgos: 7,
    diasRestantes: 3,
    porcentajeTiempo: 90,
    ultimaActuacion: 'Informe preliminar y comunicación de hallazgos',
    objetivos: [
      { id: 'obj-16', descripcion: 'Evaluar procesos de contratación' },
      { id: 'obj-17', descripcion: 'Verificar cumplimiento legal' }
    ],
    calificacionRiesgo: 'Riesgo Alto',
    documentos: 35,
    informes: 8,
    tareas: 15,
    tipo: 'regular',
    prioridad: 'alta',
    areaObjetivo: 'Contratación',
    permiteCambiarObjetivos: false,
    equipoAuditores: ['Jorge Ramírez', 'Diana Rojas', 'Fabián Ortiz', 'Laura Castillo']
  },

  // SEGUIMIENTO (2)
  {
    id: 'aud-009',
    codigo: 'AUD-2024-015',
    titulo: 'Auditoría de Gestión Documental y Archivo',
    descripcion: 'Seguimiento a hallazgos de gestión documental',
    estado: 'Seguimiento',
    riesgo: 'Medio',
    semaforo: 'verde',
    territorial: 'Tolima',
    auditorLider: {
      nombre: 'Ana Martínez Díaz',
      cargo: 'Auditor Senior',
      iniciales: 'AM',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '46123456'
    },
    auditorAsignado: {
      nombre: 'Carlos Pérez Gómez',
      cargo: 'Auditor',
      iniciales: 'CP',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '80765432'
    },
    fechaInicio: '01/11/2024',
    fechaFin: '01/02/2025',
    progreso: 70,
    hallazgos: 4,
    diasRestantes: 12,
    porcentajeTiempo: 70,
    ultimaActuacion: 'Verificación de implementación de acciones',
    objetivos: [
      { id: 'obj-18', descripcion: 'Verificar implementación de acciones' },
      { id: 'obj-19', descripcion: 'Evaluar mejoras' }
    ],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 28,
    informes: 6,
    tareas: 9,
    tipo: 'regular',
    prioridad: 'media',
    areaObjetivo: 'Gestión Documental',
    permiteCambiarObjetivos: true,
    equipoAuditores: ['Hernán Castro', 'Juliana Reyes']
  },
  {
    id: 'aud-010',
    codigo: 'AUD-2024-016',
    titulo: 'Auditoría de Servicio al Ciudadano y Atención',
    descripcion: 'Seguimiento a mejoras en atención al usuario',
    estado: 'Seguimiento',
    riesgo: 'Bajo',
    semaforo: 'verde',
    territorial: 'Boyacá',
    auditorLider: {
      nombre: 'Luis Vargas Moreno',
      cargo: 'Auditor',
      iniciales: 'LV',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '74123456'
    },
    auditorAsignado: {
      nombre: 'Patricia Gómez Silva',
      cargo: 'Auditor',
      iniciales: 'PG',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52345678'
    },
    fechaInicio: '15/11/2024',
    fechaFin: '15/02/2025',
    progreso: 80,
    hallazgos: 2,
    diasRestantes: 18,
    porcentajeTiempo: 80,
    ultimaActuacion: 'Evaluación de mejoras implementadas',
    objetivos: [
      { id: 'obj-20', descripcion: 'Verificar mejoras implementadas' },
      { id: 'obj-21', descripcion: 'Evaluar satisfacción del usuario' }
    ],
    calificacionRiesgo: 'Riesgo Bajo',
    documentos: 16,
    informes: 4,
    tareas: 6,
    tipo: 'regular',
    prioridad: 'baja',
    areaObjetivo: 'Atención al Ciudadano',
    permiteCambiarObjetivos: true,
    equipoAuditores: ['Oscar Medina', 'Carolina Díaz']
  },

  // FINALIZADAS (3)
  {
    id: 'aud-011',
    codigo: 'AUD-2024-012',
    titulo: 'Auditoría de Sistema de Gestión de Calidad',
    descripcion: 'Evaluación del SGC institucional',
    estado: 'Finalizada',
    riesgo: 'Medio',
    semaforo: 'verde',
    territorial: 'Caldas',
    auditorLider: {
      nombre: 'Roberto Torres Sánchez',
      cargo: 'Auditor Líder',
      iniciales: 'RT',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '75123456'
    },
    auditorAsignado: {
      nombre: 'Diana López Vargas',
      cargo: 'Auditor Senior',
      iniciales: 'DL',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52987654'
    },
    fechaInicio: '01/11/2024',
    fechaFin: '31/12/2024',
    progreso: 100,
    hallazgos: 6,
    diasRestantes: 0,
    porcentajeTiempo: 100,
    ultimaActuacion: 'Informe final aprobado y cerrado',
    objetivos: [
      { id: 'obj-22', descripcion: 'Evaluar SGC' },
      { id: 'obj-23', descripcion: 'Verificar certificación ISO' }
    ],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 42,
    informes: 10,
    tareas: 14,
    tipo: 'regular',
    prioridad: 'media',
    areaObjetivo: 'Planeación Estratégica',
    permiteCambiarObjetivos: false,
    equipoAuditores: ['Felipe Torres', 'Paula Castro', 'Diego Ramírez']
  },
  {
    id: 'aud-012',
    codigo: 'AUD-2024-013',
    titulo: 'Auditoría de Sistema de Gestión de Riesgos',
    descripcion: 'Evaluación del sistema de riesgos',
    estado: 'Finalizada',
    riesgo: 'Alto',
    semaforo: 'verde',
    territorial: 'Risaralda',
    auditorLider: {
      nombre: 'Sandra Montero Ruiz',
      cargo: 'Auditor Especialista',
      iniciales: 'SM',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '42123456'
    },
    auditorAsignado: {
      nombre: 'Mario Bernal Castro',
      cargo: 'Auditor Senior',
      iniciales: 'MB',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '79345678'
    },
    fechaInicio: '15/10/2024',
    fechaFin: '15/12/2024',
    progreso: 100,
    hallazgos: 8,
    diasRestantes: 0,
    porcentajeTiempo: 100,
    ultimaActuacion: 'Informe final entregado y auditoría cerrada',
    objetivos: [
      { id: 'obj-24', descripcion: 'Evaluar mapa de riesgos' },
      { id: 'obj-25', descripcion: 'Verificar controles' }
    ],
    calificacionRiesgo: 'Riesgo Alto',
    documentos: 38,
    informes: 9,
    tareas: 11,
    tipo: 'regular',
    prioridad: 'alta',
    areaObjetivo: 'Planeación Estratégica',
    permiteCambiarObjetivos: false,
    equipoAuditores: ['María González', 'Pedro Ruiz', 'Ana López', 'Luis Pérez']
  },
  {
    id: 'aud-013',
    codigo: 'AUD-2024-014',
    titulo: 'Auditoría de Comunicación Institucional',
    descripcion: 'Evaluación de estrategia de comunicación',
    estado: 'Finalizada',
    riesgo: 'Bajo',
    semaforo: 'verde',
    territorial: 'Quindío',
    auditorLider: {
      nombre: 'Diana López Vargas',
      cargo: 'Auditor Senior',
      iniciales: 'DL',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '52456789'
    },
    auditorAsignado: {
      nombre: 'Ana Martínez Díaz',
      cargo: 'Auditor',
      iniciales: 'AM',
      tipoIdentificacion: 'CC',
      numeroIdentificacion: '46987654'
    },
    fechaInicio: '01/11/2024',
    fechaFin: '20/12/2024',
    progreso: 100,
    hallazgos: 3,
    diasRestantes: 0,
    porcentajeTiempo: 100,
    ultimaActuacion: 'Auditoría cerrada exitosamente',
    objetivos: [
      { id: 'obj-26', descripcion: 'Evaluar estrategia de comunicación' },
      { id: 'obj-27', descripcion: 'Verificar canales de comunicación' }
    ],
    calificacionRiesgo: 'Riesgo Bajo',
    documentos: 24,
    informes: 5,
    tareas: 7,
    tipo: 'regular',
    prioridad: 'baja',
    areaObjetivo: 'Atención al Ciudadano',
    permiteCambiarObjetivos: true,
    equipoAuditores: ['Sandra Morales', 'Claudia Martínez']
  }
];

// ============ CONFIGURACIÓN DE COLUMNAS ============

const COLUMNAS_KANBAN = [
  {
    id: 'Planeación',
    titulo: 'Planeación',
    count: 3,
    icono: <ClipboardCheck className="w-4 h-4" style={{ color: '#003DA5' }} />,
    diasEstimados: 30
  },
  {
    id: 'Ejecución',
    titulo: 'Ejecución',
    count: 3,
    icono: <Target className="w-4 h-4" style={{ color: '#003DA5' }} />,
    diasEstimados: 60
  },
  {
    id: 'Comunicación',
    titulo: 'Comunicación',
    count: 2,
    icono: <MessageSquare className="w-4 h-4" style={{ color: '#003DA5' }} />,
    diasEstimados: 15
  },
  {
    id: 'Seguimiento',
    titulo: 'Seguimiento',
    count: 2,
    icono: <History className="w-4 h-4" style={{ color: '#003DA5' }} />,
    diasEstimados: 30
  },
  {
    id: 'Finalizada',
    titulo: 'Finalizada',
    count: 3,
    icono: <CheckCircle className="w-4 h-4" style={{ color: '#003DA5' }} />,
    diasEstimados: 0
  }
];

// ============ COMPONENTE DE TARJETA ============

interface TarjetaAuditoriaProps {
  auditoria: Auditoria;
  onVerDetalle: (aud: Auditoria) => void;
  onVerNotas: (aud: Auditoria) => void;
  onVerHistorial: (aud: Auditoria) => void;
  onAprobar?: (aud: Auditoria) => void;
  // Acciones individuales
  onCambiarEstado: (aud: Auditoria) => void;
  onAsignarAuditor: (aud: Auditoria) => void;
  onEnviarAprobacion: (aud: Auditoria) => void;
  onExportar: (aud: Auditoria) => void;
  onArchivar: (aud: Auditoria) => void;
  onEliminar: (aud: Auditoria) => void;
  onEditar: (aud: Auditoria) => void;
  onCrearPlan?: (aud: Auditoria) => void; // ← NUEVO: Crear Plan de Mejoramiento
  colapsada?: boolean; // NUEVO: Estado de colapso
  onToggleColapso?: (id: string) => void; // NUEVO: Toggle colapso
  // ✅ Funciones de conteo dinámico
  contarHallazgos: (auditoriaId: string) => number;
  contarHallazgosCriticos: (auditoriaId: string) => number;
  contarTareasPendientes: (auditoriaId: string) => number;
}

function TarjetaAuditoria({ 
  auditoria, 
  onVerDetalle, 
  onVerNotas, 
  onVerHistorial, 
  onAprobar,
  onCambiarEstado,
  onAsignarAuditor,
  onEnviarAprobacion,
  onExportar,
  onArchivar,
  onEliminar,
  onEditar,
  onCrearPlan,
  colapsada = false,
  onToggleColapso,
  contarHallazgos,
  contarHallazgosCriticos,
  contarTareasPendientes
}: TarjetaAuditoriaProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'auditoria',
    item: auditoria,
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging()
    })
  }));

  const semaforoIndicator = {
    verde: { color: '#10B981', label: 'En término' },
    amarillo: { color: '#F59E0B', label: 'Próximo a vencer' },
    rojo: { color: '#DC2626', label: 'Vencido' }
  };

  const semaforo = semaforoIndicator[auditoria.semaforo];

  // VERSIÓN COLAPSADA
  if (colapsada) {
    return (
      <motion.div
        ref={drag}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
        className="cursor-move touch-none w-full relative"
      >
        <Card className="bg-white border-2 hover:shadow-md transition-all flex flex-col w-full border-gray-200">
          <div 
            className="h-1 flex-shrink-0"
            style={{ background: '#003DA5' }}
          />

          <div className="p-2.5">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div 
                  className="p-1.5 rounded-lg flex-shrink-0"
                  style={{ background: '#E0EDFF' }}
                >
                  <ClipboardCheck className="w-3.5 h-3.5" style={{ color: '#003DA5' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs truncate" style={{ color: '#003DA5' }}>
                    {auditoria.codigo}
                  </h4>
                </div>
              </div>
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: semaforo.color }}
                title={semaforo.label}
              />
            </div>

            <p className="font-bold text-xs text-gray-900 line-clamp-2 mb-2 leading-tight">
              {auditoria.titulo}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <Badge 
                className={`text-[10px] px-1.5 py-0.5 font-semibold ${
                  auditoria.riesgo === 'Alto' ? 'bg-red-100 text-red-800 border-red-200' :
                  auditoria.riesgo === 'Medio' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-green-100 text-green-800 border-green-200'
                }`}
              >
                {auditoria.riesgo}
              </Badge>
              {auditoria.prioridad && (
                <Badge 
                  className={`text-[10px] px-1.5 py-0.5 font-semibold ${
                    auditoria.prioridad === 'crítica' ? 'bg-red-100 text-red-800 border-red-200' :
                    auditoria.prioridad === 'alta' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                    auditoria.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                    'bg-gray-100 text-gray-800 border-gray-200'
                  }`}
                >
                  {auditoria.prioridad.charAt(0).toUpperCase() + auditoria.prioridad.slice(1)}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
              <span className="truncate">{auditoria.auditorLider.iniciales}</span>
              <span>{contarHallazgos(auditoria.id)} hallazgos</span>
            </div>

            <div className="flex justify-center pt-2 border-t border-gray-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleColapso?.(auditoria.id);
                }}
                className="text-xs text-gray-600 hover:text-blue-600 flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-gray-50"
                title="Expandir tarjeta"
              >
                <Maximize2 className="w-3 h-3" />
                <span>Expandir</span>
              </button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  // VERSIÓN EXPANDIDA NORMAL
  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move touch-none w-full relative"
    >
      <Card 
        className="bg-white border-2 hover:shadow-md transition-all flex flex-col w-full border-gray-200"
      >
        {/* Barra superior azul ESAP */}
        <div 
          className="h-1 flex-shrink-0"
          style={{ background: '#003DA5' }}
        />

        <div className="p-2.5 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div 
                className="p-1.5 rounded-lg flex-shrink-0"
                style={{ background: '#E0EDFF' }}
              >
                <ClipboardCheck className="w-4 h-4" style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm truncate" style={{ color: '#003DA5' }}>
                  {auditoria.codigo}
                </h4>
                <p className="text-xs text-gray-600 truncate">
                  Auditoría
                </p>
              </div>
            </div>
            {/* BOTÓN COLAPSAR */}
            {onToggleColapso && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleColapso(auditoria.id);
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
                title="Colapsar tarjeta"
              >
                <Minimize2 className="w-3.5 h-3.5 text-gray-600" />
              </button>
            )}
          </div>

          {/* Título de la Auditoría */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">📋 Auditoría:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-2 leading-tight">
              {auditoria.titulo}
            </p>
          </div>

          {/* Auditor Líder */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">👨‍💼 Auditor Líder:</p>
            <p className="font-bold text-sm text-gray-900 line-clamp-1">
              {auditoria.auditorLider.nombre}
            </p>
            <p className="text-xs text-gray-600">
              {auditoria.auditorLider.tipoIdentificacion} {auditoria.auditorLider.numeroIdentificacion}
            </p>
          </div>

          {/* Auditor Asignado */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarFallback 
                  className="text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {auditoria.auditorAsignado.iniciales}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">👤 Auditor Asignado:</p>
                <p className="font-bold text-sm text-gray-900 line-clamp-1">
                  {auditoria.auditorAsignado.nombre}
                </p>
                <p className="text-xs text-gray-600">
                  {auditoria.auditorAsignado.tipoIdentificacion} {auditoria.auditorAsignado.numeroIdentificacion}
                </p>
              </div>
            </div>
          </div>

          {/* Calificación del Riesgo */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-1">⚠️ Calificación del Riesgo:</p>
            <Badge 
              className={`text-xs font-semibold ${
                auditoria.riesgo === 'Alto' ? 'bg-red-100 text-red-800 border-red-200' :
                auditoria.riesgo === 'Medio' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                'bg-green-100 text-green-800 border-green-200'
              }`}
            >
              {auditoria.calificacionRiesgo}
            </Badge>
          </div>

          {/* Tipo de Auditoría y Prioridad */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center justify-between gap-2 mb-1">
              <p className="text-xs text-gray-500">🏷️ Tipo:</p>
              <Badge 
                className={`text-xs font-semibold ${
                  auditoria.tipo === 'regular' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                  auditoria.tipo === 'territorial' ? 'bg-green-100 text-green-800 border-green-200' :
                  'bg-red-100 text-red-800 border-red-200'
                }`}
              >
                {auditoria.tipo === 'regular' ? 'Regular' :
                 auditoria.tipo === 'territorial' ? 'Territorial' : 'Especial'}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-gray-500">⚡ Prioridad:</p>
              <Badge 
                className={`text-xs font-semibold ${
                  auditoria.prioridad === 'crítica' ? 'bg-red-100 text-red-800 border-red-200' :
                  auditoria.prioridad === 'alta' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                  auditoria.prioridad === 'media' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-gray-100 text-gray-800 border-gray-200'
                }`}
              >
                {auditoria.prioridad.charAt(0).toUpperCase() + auditoria.prioridad.slice(1)}
              </Badge>
            </div>
          </div>

          {/* Información Territorial (si aplica) */}
          {auditoria.territorialInfo && (
            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-1">📍 Territorial:</p>
              <div className="bg-green-50 border border-green-200 rounded p-1.5">
                <p className="text-xs font-bold text-green-900">{auditoria.territorialInfo.ciudad}</p>
                <p className="text-xs text-green-700">{auditoria.territorialInfo.departamento}</p>
              </div>
            </div>
          )}

          {/* Información Especial (si aplica) */}
          {auditoria.especial && (
            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <p className="text-xs text-gray-500 mb-1">⚠️ Auditoría Especial:</p>
              <div className="bg-red-50 border border-red-200 rounded p-1.5 space-y-1">
                <div>
                  <p className="text-xs font-bold text-red-900">{auditoria.especial.tipoMotivo}</p>
                  <p className="text-xs text-red-700">Solicitante: {auditoria.especial.solicitante}</p>
                </div>
              </div>
            </div>
          )}

          {/* Objetivos de la Auditoría */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">🎯 Objetivos:</p>
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                {auditoria.objetivos.length}
              </span>
            </div>
            <div className="space-y-1">
              {auditoria.objetivos.slice(0, 2).map((objetivo, index) => (
                <div key={objetivo.id} className="flex items-start gap-1.5">
                  <span className="text-xs font-bold text-blue-600 flex-shrink-0">{index + 1}.</span>
                  <p className="text-xs text-gray-700 line-clamp-1">{objetivo.descripcion}</p>
                </div>
              ))}
              {auditoria.objetivos.length > 2 && (
                <p className="text-xs text-gray-500 italic">+{auditoria.objetivos.length - 2} más...</p>
              )}
            </div>
            {auditoria.permiteCambiarObjetivos && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Objetivos modificables
              </p>
            )}
          </div>

          {/* Equipo Auditor */}
          {auditoria.equipoAuditores && auditoria.equipoAuditores.length > 0 && (
            <div className="mb-1.5 pb-1.5 border-b border-gray-200">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-gray-500">👥 Equipo Auditor:</p>
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold">
                  {auditoria.equipoAuditores.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {auditoria.equipoAuditores.slice(0, 3).map((auditor, index) => (
                  <span 
                    key={index}
                    className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200"
                  >
                    {auditor.split(' ')[0]} {auditor.split(' ')[1]?.[0]}.
                  </span>
                ))}
                {auditoria.equipoAuditores.length > 3 && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-semibold">
                    +{auditoria.equipoAuditores.length - 3}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Área Objetivo */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-0.5">🏢 Área Objetivo:</p>
            <p className="text-xs font-bold text-gray-900">{auditoria.areaObjetivo}</p>
          </div>

          {/* Última Actuación */}
          <div className="mb-1.5">
            <p className="text-xs text-gray-500 mb-0.5">📌 Última actuación:</p>
            <p className="text-xs text-gray-700 line-clamp-2">{auditoria.ultimaActuacion}</p>
          </div>

          {/* Badges y Semáforo */}
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <Badge 
              className="text-xs flex items-center gap-1 font-semibold bg-gray-50 border border-gray-200"
              style={{ color: semaforo.color }}
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ background: semaforo.color }}
              />
              {auditoria.diasRestantes} días
            </Badge>
            {contarHallazgos(auditoria.id) > 0 && (
              <Badge className="text-xs bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3 h-3" />
                {contarHallazgos(auditoria.id)} hallazgos
                {contarHallazgosCriticos(auditoria.id) > 0 && (
                  <span className="ml-1 text-red-900 font-bold">
                    ({contarHallazgosCriticos(auditoria.id)} críticos)
                  </span>
                )}
              </Badge>
            )}
            {/* ⚠️ ALERTA: Actividades/Tareas Pendientes */}
            {contarTareasPendientes(auditoria.id) > 0 && (
              <Badge 
                onClick={(e) => {
                  e.stopPropagation();
                  onVerDetalle(auditoria);
                }}
                className="text-xs bg-amber-100 text-amber-800 border-2 border-amber-400 flex items-center gap-1 font-bold animate-pulse cursor-pointer hover:bg-amber-200 transition-colors"
                title="Click para ver y completar actividades"
              >
                <AlertCircle className="w-3 h-3" />
                {contarTareasPendientes(auditoria.id)} tarea{contarTareasPendientes(auditoria.id) !== 1 ? 's' : ''} pendiente{contarTareasPendientes(auditoria.id) !== 1 ? 's' : ''}
              </Badge>
            )}
            {/* Badge de Tareas */}
            <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 font-semibold">
              <CheckSquare className="w-3 h-3" />
              {auditoria.tareas} tareas
            </Badge>
          </div>

          {/* Métricas */}
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">{auditoria.documentos}</p>
              <p className="text-xs text-gray-500">Docs</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">{auditoria.informes}</p>
              <p className="text-xs text-gray-500">Inform.</p>
            </div>
            <div className="text-center p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xs font-bold text-gray-700">
                {auditoria.porcentajeTiempo}%
              </p>
              <p className="text-xs text-gray-500">Tiempo</p>
            </div>
          </div>

          {/* Acciones de Gestión */}
          <div className="pt-2 border-t border-gray-200 mt-2">
            {/* Acciones Principales */}
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onVerDetalle(auditoria);
                }}
                size="sm"
                className="text-xs font-bold truncate"
                style={{ background: '#FF6B2C', color: '#FFFFFF' }}
              >
                <Eye className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">Ver</span>
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditar(auditoria);
                }}
                size="sm"
                variant="outline"
                className="text-xs font-bold truncate"
                disabled={auditoria.estado === 'Finalizada'}
              >
                <Edit className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">Editar</span>
              </Button>
            </div>

            {/* NUEVO: Botón Crear Plan de Mejoramiento - SOLO si está Finalizada con hallazgos */}
            {auditoria.estado === 'Finalizada' && auditoria.hallazgos > 0 && onCrearPlan && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onCrearPlan(auditoria);
                }}
                size="sm"
                className="text-xs font-bold w-full mb-2"
                style={{ background: '#DC2626', color: '#FFFFFF' }}
              >
                <Target className="w-3 h-3 mr-1 flex-shrink-0" />
                <span className="truncate">Crear Plan de Mejoramiento</span>
              </Button>
            )}

            {/* Menú de Acciones Horizontales - CONDICIONAL SEGÚN ESTADO */}
            <div className="flex items-center justify-between gap-1 bg-gray-50 p-1.5 rounded-lg border border-gray-200">
              {/* Cambiar estado - DESHABILITADO en Finalizada */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (auditoria.estado !== 'Finalizada') {
                    onCambiarEstado(auditoria);
                  }
                }}
                disabled={auditoria.estado === 'Finalizada'}
                className={`flex flex-col items-center gap-0.5 p-1 rounded transition-colors flex-1 ${
                  auditoria.estado === 'Finalizada' 
                    ? 'opacity-40 cursor-not-allowed' 
                    : 'hover:bg-white cursor-pointer'
                }`}
                title={
                  auditoria.estado === 'Finalizada' 
                    ? 'No se puede cambiar (Finalizada)' 
                    : `Avanzar de ${auditoria.estado}`
                }
              >
                <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-[9px] text-gray-600 font-medium">Estado</span>
              </button>

              {/* Asignar auditor - SIEMPRE DISPONIBLE excepto Finalizada */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (auditoria.estado !== 'Finalizada') {
                    onAsignarAuditor(auditoria);
                  }
                }}
                disabled={auditoria.estado === 'Finalizada'}
                className={`flex flex-col items-center gap-0.5 p-1 rounded transition-colors flex-1 ${
                  auditoria.estado === 'Finalizada' 
                    ? 'opacity-40 cursor-not-allowed' 
                    : 'hover:bg-white cursor-pointer'
                }`}
                title={
                  auditoria.estado === 'Finalizada' 
                    ? 'No se puede modificar (Finalizada)' 
                    : 'Asignar o reasignar auditor'
                }
              >
                <UserPlus className="w-3.5 h-3.5 text-gray-600" />
                <span className="text-[9px] text-gray-600 font-medium">Auditor</span>
              </button>

              {/* Enviar a aprobación - SOLO en Comunicación y Seguimiento */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (auditoria.estado === 'Comunicación' || auditoria.estado === 'Seguimiento') {
                    onEnviarAprobacion(auditoria);
                  }
                }}
                disabled={auditoria.estado !== 'Comunicación' && auditoria.estado !== 'Seguimiento'}
                className={`flex flex-col items-center gap-0.5 p-1 rounded transition-colors flex-1 ${
                  auditoria.estado === 'Comunicación' || auditoria.estado === 'Seguimiento'
                    ? 'hover:bg-white cursor-pointer' 
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={
                  auditoria.estado === 'Comunicación' || auditoria.estado === 'Seguimiento'
                    ? 'Enviar informe a aprobación' 
                    : 'Solo disponible en Comunicación/Seguimiento'
                }
              >
                <Send className={`w-3.5 h-3.5 ${
                  auditoria.estado === 'Comunicación' || auditoria.estado === 'Seguimiento'
                    ? 'text-green-600' 
                    : 'text-gray-400'
                }`} />
                <span className={`text-[9px] font-medium ${
                  auditoria.estado === 'Comunicación' || auditoria.estado === 'Seguimiento'
                    ? 'text-green-600' 
                    : 'text-gray-400'
                }`}>Aprobar</span>
              </button>

              {/* Exportar - SOLO disponible desde Ejecución en adelante */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (auditoria.estado !== 'Planeación') {
                    onExportar(auditoria);
                  }
                }}
                disabled={auditoria.estado === 'Planeación'}
                className={`flex flex-col items-center gap-0.5 p-1 rounded transition-colors flex-1 ${
                  auditoria.estado !== 'Planeación' 
                    ? 'hover:bg-white cursor-pointer' 
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={
                  auditoria.estado !== 'Planeación' 
                    ? 'Exportar informe PDF' 
                    : 'Solo disponible desde Ejecución'
                }
              >
                <FileDown className={`w-3.5 h-3.5 ${
                  auditoria.estado !== 'Planeación' ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className={`text-[9px] font-medium ${
                  auditoria.estado !== 'Planeación' ? 'text-blue-600' : 'text-gray-400'
                }`}>Export</span>
              </button>

              {/* Archivar - SOLO en Finalizada */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (auditoria.estado === 'Finalizada') {
                    onArchivar(auditoria);
                  }
                }}
                disabled={auditoria.estado !== 'Finalizada'}
                className={`flex flex-col items-center gap-0.5 p-1 rounded transition-colors flex-1 ${
                  auditoria.estado === 'Finalizada' 
                    ? 'hover:bg-white cursor-pointer' 
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={
                  auditoria.estado === 'Finalizada' 
                    ? 'Archivar auditoría finalizada' 
                    : 'Solo disponible cuando esté Finalizada'
                }
              >
                <Archive className={`w-3.5 h-3.5 ${
                  auditoria.estado === 'Finalizada' ? 'text-orange-600' : 'text-gray-400'
                }`} />
                <span className={`text-[9px] font-medium ${
                  auditoria.estado === 'Finalizada' ? 'text-orange-600' : 'text-gray-400'
                }`}>Archiv</span>
              </button>

              {/* Eliminar - SOLO en Planeación (no iniciada) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (auditoria.estado === 'Planeación') {
                    onEliminar(auditoria);
                  }
                }}
                disabled={auditoria.estado !== 'Planeación'}
                className={`flex flex-col items-center gap-0.5 p-1 rounded transition-colors flex-1 ${
                  auditoria.estado === 'Planeación' 
                    ? 'hover:bg-white cursor-pointer' 
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={
                  auditoria.estado === 'Planeación' 
                    ? 'Eliminar auditoría en planeación' 
                    : 'Solo se puede eliminar en Planeación'
                }
              >
                <Trash2 className={`w-3.5 h-3.5 ${
                  auditoria.estado === 'Planeación' ? 'text-red-600' : 'text-gray-400'
                }`} />
                <span className={`text-[9px] font-medium ${
                  auditoria.estado === 'Planeación' ? 'text-red-600' : 'text-gray-400'
                }`}>Elim</span>
              </button>
            </div>

            {/* Botones Notas y Auditoría */}
            <div className="grid grid-cols-2 gap-1 mt-1.5">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onVerNotas(auditoria);
                }}
                size="sm"
                variant="outline"
                className="text-xs truncate"
              >
                <MessageSquare className="w-3 h-3 mr-0.5 flex-shrink-0" />
                Notas
              </Button>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onVerHistorial(auditoria);
                }}
                size="sm"
                variant="outline"
                className="text-xs truncate italic"
              >
                <History className="w-3 h-3 mr-0.5 flex-shrink-0" />
                Trazabilidad
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

// ============ COMPONENTE DE COLUMNA ============

interface ColumnaKanbanProps {
  columna: typeof COLUMNAS_KANBAN[0];
  auditorias: Auditoria[];
  onVerDetalle: (aud: Auditoria) => void;
  onVerNotas: (aud: Auditoria) => void;
  onVerHistorial: (aud: Auditoria) => void;
  onDrop: (item: Auditoria, nuevoEstado: EstadoAuditoria) => void;
  colapsada?: boolean;
  onToggleColapso?: () => void;
  // Acciones individuales
  onCambiarEstado: (aud: Auditoria) => void;
  onAsignarAuditor: (aud: Auditoria) => void;
  onEnviarAprobacion: (aud: Auditoria) => void;
  onExportar: (aud: Auditoria) => void;
  onArchivar: (aud: Auditoria) => void;
  onEliminar: (aud: Auditoria) => void;
  onEditar: (aud: Auditoria) => void;
  onCrearPlan?: (aud: Auditoria) => void; // ← NUEVO
  tarjetasColapsadas?: Set<string>; // ← NUEVO: Set de IDs de tarjetas colapsadas
  onToggleColapsoTarjeta?: (id: string) => void; // ← NUEVO: Toggle para tarjetas individuales
  // ✅ Funciones de conteo dinámico
  contarHallazgos: (auditoriaId: string) => number;
  contarHallazgosCriticos: (auditoriaId: string) => number;
  contarTareasPendientes: (auditoriaId: string) => number;
}

function ColumnaKanban({ 
  columna, 
  auditorias, 
  onVerDetalle, 
  onVerNotas, 
  onVerHistorial, 
  onDrop,
  colapsada = false,
  onToggleColapso,
  onCambiarEstado,
  onAsignarAuditor,
  onEnviarAprobacion,
  onExportar,
  onArchivar,
  onEliminar,
  onEditar,
  onCrearPlan,
  tarjetasColapsadas,
  onToggleColapsoTarjeta,
  contarHallazgos,
  contarHallazgosCriticos,
  contarTareasPendientes
}: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'auditoria',
    drop: (item: Auditoria) => onDrop(item, columna.id as EstadoAuditoria),
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
  }));

  // Contar auditorías por semáforo
  const auditoriasVerdes = auditorias.filter(a => a.semaforo === 'verde').length;
  const auditoriasAmarillas = auditorias.filter(a => a.semaforo === 'amarillo').length;
  const auditoriasRojas = auditorias.filter(a => a.semaforo === 'rojo').length;

  // Si está colapsada, renderizar versión compacta
  if (colapsada) {
    return (
      <motion.div
        ref={drop}
        className="flex-shrink-0 h-full"
        initial={{ width: 64 }}
        animate={{ width: 64 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <Card 
          className={`h-full border transition-all cursor-pointer group ${
            isOver ? 'shadow-lg border-orange-500 bg-orange-50' : 'hover:shadow-md hover:border-orange-300'
          }`}
          style={{ 
            borderColor: isOver ? '#F97316' : '#E5E7EB', 
            background: isOver ? '#FFF7ED' : '#FFFFFF' 
          }}
          onClick={onToggleColapso}
        >
          <div className="flex flex-col items-center py-4 px-2 gap-3">
            {/* Indicador de drag over */}
            {isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 border-2 border-orange-500 border-dashed rounded-lg pointer-events-none"
              />
            )}
            
            {/* Botón expandir */}
            <button
              className="p-2 rounded-lg bg-gray-50 group-hover:bg-orange-50 transition-colors"
              title={`Expandir ${columna.titulo}`}
            >
              <Maximize2 className="w-4 h-4 text-gray-600 group-hover:text-orange-600" />
            </button>

            {/* Icono de etapa */}
            <div className="p-2 rounded-lg bg-gray-50 border border-gray-200 group-hover:border-orange-200">
              {columna.icono}
            </div>

            {/* Indicadores de semáforo - Solo si hay auditorías */}
            {auditorias.length > 0 && (
              <div className="flex flex-col gap-1 py-2">
                {auditoriasRojas > 0 && (
                  <div className="flex items-center gap-1" title={`${auditoriasRojas} vencidos`}>
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-xs font-bold text-red-600">{auditoriasRojas}</span>
                  </div>
                )}
                {auditoriasAmarillas > 0 && (
                  <div className="flex items-center gap-1" title={`${auditoriasAmarillas} próximos a vencer`}>
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-amber-600">{auditoriasAmarillas}</span>
                  </div>
                )}
                {auditoriasVerdes > 0 && (
                  <div className="flex items-center gap-1" title={`${auditoriasVerdes} en término`}>
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-bold text-green-600">{auditoriasVerdes}</span>
                  </div>
                )}
              </div>
            )}

            {/* Nombre vertical */}
            <div className="flex-1 flex items-center justify-center py-4">
              <h3 
                className="font-black text-xs text-gray-800 whitespace-nowrap"
                style={{ 
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed'
                }}
              >
                {columna.titulo}
              </h3>
            </div>

            {/* Badge contador total */}
            <Badge
              className="font-semibold text-xs px-1.5 py-0.5 bg-orange-50 border border-orange-200 text-orange-700 group-hover:bg-orange-100"
            >
              {auditorias.length}
            </Badge>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Versión expandida normal
  return (
    <div className="flex-shrink-0" style={{ width: '320px' }}>
      {/* Header Columna - ESTILO DISCIPLINARIO EXACTO */}
      <div className="p-4 border-b bg-gray-50 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="p-2 rounded-lg bg-white border border-gray-200">
              {columna.icono}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-sm text-gray-800">
                {columna.titulo}
              </h3>
              {columna.diasEstimados && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {columna.diasEstimados} días
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="font-semibold text-sm px-2 py-1 bg-white border border-gray-200 text-gray-700">
              {auditorias.length}
            </Badge>
            
            {/* Botón Colapsar/Expandir Columna */}
            {onToggleColapso && (
              <button
                onClick={onToggleColapso}
                className="p-1.5 rounded-lg hover:bg-white transition-colors"
                title={`Colapsar ${columna.titulo}`}
              >
                <Minimize2 className="w-3.5 h-3.5 text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Tarjetas */}
      <div
        ref={drop}
        className={`p-3 space-y-3 overflow-y-auto ${isOver ? 'bg-blue-50' : ''}`}
        style={{ minHeight: 'calc(100vh - 280px)' }}
      >
        <AnimatePresence>
          {auditorias.map((auditoria) => (
            <TarjetaAuditoria
              key={auditoria.id}
              auditoria={auditoria}
              colapsada={tarjetasColapsadas?.has(auditoria.id)}
              onToggleColapso={onToggleColapsoTarjeta}
              onVerDetalle={onVerDetalle}
              onVerNotas={onVerNotas}
              onVerHistorial={onVerHistorial}
              onCambiarEstado={onCambiarEstado}
              onAsignarAuditor={onAsignarAuditor}
              onEnviarAprobacion={onEnviarAprobacion}
              onExportar={onExportar}
              onArchivar={onArchivar}
              onEliminar={onEliminar}
              onEditar={onEditar}
              onCrearPlan={onCrearPlan}
              contarHallazgos={contarHallazgos}
              contarHallazgosCriticos={contarHallazgosCriticos}
              contarTareasPendientes={contarTareasPendientes}
            />
          ))}
        </AnimatePresence>

        {auditorias.length === 0 && (
          <Card className="p-6 border-dashed border-2 border-gray-200">
            <p className="text-sm text-gray-400 text-center">
              No hay auditorías en esta etapa
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============ COMPONENTE PRINCIPAL ============

export function GestionAuditoriasKanbanSimple() {
  // ✅ CONTEXTOS GLOBALES
  const { contarHallazgos, contarHallazgosCriticos } = useHallazgos();
  const { contarTareas, contarTareasPendientes, contarTareasCompletadas } = useTareas();
  
  const [auditorias, setAuditorias] = useState<Auditoria[]>(AUDITORIAS_MOCK);
  const [vistaActiva, setVistaActiva] = useState<'kanban' | 'lista'>('kanban');
  const [filtroTerritorial, setFiltroTerritorial] = useState<string>('Todas las Territoriales');
  const [busqueda, setBusqueda] = useState('');
  const [auditoriaSeleccionada, setAuditoriaSeleccionada] = useState<Auditoria | null>(null);
  const [modalExpedienteOpen, setModalExpedienteOpen] = useState(false);
  const [modalNotasOpen, setModalNotasOpen] = useState(false);
  const [modalHistorialOpen, setModalHistorialOpen] = useState(false);
  const [modalAprobacionOpen, setModalAprobacionOpen] = useState(false);
  const [modalFormularioOpen, setModalFormularioOpen] = useState(false);
  const [modalInicioAuditoriaOpen, setModalInicioAuditoriaOpen] = useState(false);
  const [modalEdicionOpen, setModalEdicionOpen] = useState(false);
  const [auditoriaParaEditar, setAuditoriaParaEditar] = useState<Auditoria | null>(null);
  const [modalAsignarAuditorOpen, setModalAsignarAuditorOpen] = useState(false);
  const [modalCambiarEstadoOpen, setModalCambiarEstadoOpen] = useState(false);
  const [modalConfirmacionOpen, setModalConfirmacionOpen] = useState(false);
  const [tipoAccionConfirmacion, setTipoAccionConfirmacion] = useState<'archivar' | 'eliminar'>('archivar');
  const [columnasColapsadas, setColumnasColapsadas] = useState<Set<string>>(new Set());
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<Set<string>>(new Set()); // NUEVO: Estado para tarjetas colapsadas

  // ✅ NUEVO: Integración con Context - Recibir auditorías del Programa Anual
  const { 
    auditoriasProgramadas, 
    limpiarAuditoriasProgramadas,
    agregarAuditoriaConHallazgos,
    seleccionarAuditoria
  } = useIntegracionAuditoriaPlanes();

  // ✅ NUEVO: Effect para procesar auditorías programadas desde Planeación
  useEffect(() => {
    if (auditoriasProgramadas.length > 0) {
      console.log('🎯 Kanban: Recibidas', auditoriasProgramadas.length, 'auditorías del Programa Anual');
      
      // Convertir a formato del Kanban
      const nuevasAuditorias: Auditoria[] = auditoriasProgramadas.map((audProg, index) => {
        const fechaInicio = new Date(audProg.fechaInicio);
        const fechaFin = new Date(audProg.fechaFin);
        
        return {
          id: `aud-prog-${Date.now()}-${index}`,
          codigo: audProg.codigo,
          titulo: audProg.titulo,
          descripcion: audProg.descripcion,
          estado: 'Planeación', // ← Comienzan en Planeación
          riesgo: 'Medio',
          semaforo: 'verde',
          territorial: audProg.territorial,
          auditorLider: {
            nombre: audProg.auditorLider.nombre,
            cargo: audProg.auditorLider.cargo,
            iniciales: audProg.auditorLider.iniciales,
            tipoIdentificacion: 'CC',
            numeroIdentificacion: '000000000'
          },
          auditorAsignado: {
            nombre: 'Por asignar',
            cargo: 'Auditor',
            iniciales: 'PA',
            tipoIdentificacion: 'CC',
            numeroIdentificacion: '000000000'
          },
          fechaInicio: fechaInicio.toLocaleDateString('es-CO'),
          fechaFin: fechaFin.toLocaleDateString('es-CO'),
          progreso: 0,
          hallazgos: 0,
          diasRestantes: calcularDiasRestantes(audProg.fechaFin),
          porcentajeTiempo: 0,
          ultimaActuacion: new Date().toISOString(),
          objetivos: [
            {
              id: 'obj-1',
              descripcion: `Auditar ${audProg.areaObjetivo}`
            }
          ],
          calificacionRiesgo: 'Medio',
          documentos: 0,
          informes: 0,
          tareas: 0,
          tipo: audProg.tipo,
          prioridad: audProg.prioridad,
          areaObjetivo: audProg.areaObjetivo,
          permiteCambiarObjetivos: true,
          equipoAuditores: [],
          actividadesCompletas: false,
          actividadesPendientes: 3
        };
      });

      // Agregar al estado del Kanban (al inicio para que sean más visibles)
      setAuditorias(prev => [...nuevasAuditorias, ...prev]);

      // Limpiar del context
      limpiarAuditoriasProgramadas();

      // Notificación
      toast.success(
        `✅ ${nuevasAuditorias.length} auditoría${nuevasAuditorias.length > 1 ? 's' : ''} agregada${nuevasAuditorias.length > 1 ? 's' : ''} al Kanban`,
        {
          description: `Las auditorías están listas en la columna "Planeación" y puedes comenzar a trabajar en ellas.`,
          duration: 7000
        }
      );
    }
  }, [auditoriasProgramadas, limpiarAuditoriasProgramadas]);

  // Helper para calcular días restantes
  const calcularDiasRestantes = (fechaFin: string): number => {
    const hoy = new Date();
    const fin = new Date(fechaFin);
    const diff = fin.getTime() - hoy.getTime();
    const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return dias > 0 ? dias : 0;
  };

  // Toggle colapso de tarjeta individual
  const toggleTarjetaColapsada = (id: string) => {
    setTarjetasColapsadas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Filtrar auditorías
  const auditoriasFiltradas = auditorias.filter(aud => {
    const cumpleBusqueda = aud.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                           aud.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleTerritorial = filtroTerritorial === 'Todas las Territoriales' || aud.territorial === filtroTerritorial;
    return cumpleBusqueda && cumpleTerritorial;
  });

  // Colapsar todas las tarjetas
  const colapsarTodasTarjetas = () => {
    const todosLosIds = new Set(auditoriasFiltradas.map(aud => aud.id));
    setTarjetasColapsadas(todosLosIds);
  };

  // Expandir todas las tarjetas
  const expandirTodasTarjetas = () => {
    setTarjetasColapsadas(new Set());
  };

  // Handlers de acciones por lote
  // Handlers individuales
  const handleVerDetalle = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    
    // Si la auditoría está en Planeación, abrimos el wizard de inicio (RF004)
    // De lo contrario, abrimos el expediente completo
    if (auditoria.estado === 'Planeación') {
      setModalInicioAuditoriaOpen(true);
    } else {
      setModalExpedienteOpen(true);
    }
  };

  const handleVerNotas = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalNotasOpen(true);
  };

  const handleVerHistorial = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalHistorialOpen(true);
  };

  const handleAprobar = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalAprobacionOpen(true);
  };

  const handleAprobado = (auditoria: Auditoria, comentarios: string) => {
    console.log('Aprobado:', auditoria, comentarios);
    // Aquí iría la lógica real de aprobación
  };

  const handleRechazado = (auditoria: Auditoria, justificacion: string) => {
    console.log('Rechazado:', auditoria, justificacion);
    // Aquí iría la lógica real de rechazo
  };

  const handleModificacion = (auditoria: Auditoria, observaciones: string) => {
    console.log('Modificación:', auditoria, observaciones);
    // Aquí iría la lógica real de solicitud de modificación
  };

  const handleCrearAuditoria = async (data: AuditoriaUnificadaFormData) => {
    console.log('Crear auditoría OCIG:', data);
    
    // Simulación de delay (para testing de estados de carga)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Aquí iría la lógica real de creación
    // Simulación: agregar a la lista de auditorías
    // En producción esto haría un POST al backend
    
    toast.success('✅ Auditoría OCIG creada exitosamente', {
      description: `"${data.titulo}" con ${data.hallazgos.length} hallazgos registrados`
    });
    
    setModalFormularioOpen(false);
  };

  const handleEditarAuditoria = (auditoria: Auditoria) => {
    setAuditoriaParaEditar(auditoria);
    setModalEdicionOpen(true);
  };

  const handleActualizarAuditoria = async (data: AuditoriaFormData) => {
    if (!auditoriaParaEditar) return;
    
    console.log('Actualizar auditoría:', auditoriaParaEditar.id, data);
    
    // Simulación de delay (para testing de estados de carga)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Actualizar en el estado
    setAuditorias(prev =>
      prev.map(aud =>
        aud.id === auditoriaParaEditar.id
          ? {
              ...aud,
              titulo: data.titulo,
              descripcion: data.descripcion,
              territorial: data.territorial,
              riesgo: data.riesgo as RiesgoAuditoria,
              fechaInicio: data.fechaInicio,
              fechaFin: data.fechaFin,
              objetivos: data.objetivos || []
            }
          : aud
      )
    );
    
    toast.success('Auditoría actualizada correctamente', {
      description: `"${data.titulo}" ha sido modificada exitosamente`
    });
    
    setModalEdicionOpen(false);
    setAuditoriaParaEditar(null);
  };

  const handleDrop = (item: Auditoria, nuevoEstado: EstadoAuditoria) => {
    if (item.estado === nuevoEstado) return;

    const estadoAnterior = item.estado;
    const usuario = 'Usuario Actual'; // En producción vendría del contexto de autenticación
    
    setAuditorias(prev =>
      prev.map(aud =>
        aud.id === item.id
          ? { 
              ...aud, 
              estado: nuevoEstado,
              // Agregar evento de trazabilidad al historial
              ultimaModificacion: new Date()
            }
          : aud
      )
    );

    // Registrar en trazabilidad/historial
    const eventoTrazabilidad = {
      id: `evt-${Date.now()}`,
      tipo: 'cambio-estado' as const,
      titulo: `Cambio de estado: ${estadoAnterior} → ${nuevoEstado}`,
      descripcion: `La auditoría fue movida de "${estadoAnterior}" a "${nuevoEstado}" mediante arrastrar y soltar`,
      usuario: usuario,
      fecha: new Date(),
      auditoriaId: item.id,
      estadoAnterior: estadoAnterior,
      estadoNuevo: nuevoEstado
    };
    
    // En producción, esto se guardaría en el backend
    console.log('📋 Trazabilidad - Movimiento de tarjeta:', eventoTrazabilidad);

    toast.success(`${item.codigo} movido a ${nuevoEstado}`, {
      description: `Cambio registrado en trazabilidad`
    });
  };

  // ============ HANDLERS INDIVIDUALES PARA ACCIONES DE TARJETA ============

  // Cambiar estado individual - abre modal de cambio de estado
  const handleCambiarEstado = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalCambiarEstadoOpen(true);
  };

  // Guardar cambio de estado con comentario
  const handleGuardarCambioEstado = (auditoriaId: string, nuevoEstado: EstadoAuditoria, comentario: string) => {
    const auditoriaActual = auditorias.find(a => a.id === auditoriaId);
    if (!auditoriaActual) return;

    const estadoAnterior = auditoriaActual.estado;

    setAuditorias(prev =>
      prev.map(aud =>
        aud.id === auditoriaId
          ? { ...aud, estado: nuevoEstado }
          : aud
      )
    );

    // Registrar en trazabilidad
    const eventoTrazabilidad = {
      id: `evt-${Date.now()}`,
      tipo: 'cambio-estado-manual' as const,
      titulo: `Cambio de estado: ${estadoAnterior} → ${nuevoEstado}`,
      descripcion: comentario,
      usuario: 'Usuario Actual', // En producción vendría del contexto
      fecha: new Date(),
      auditoriaId: auditoriaId,
      estadoAnterior: estadoAnterior,
      estadoNuevo: nuevoEstado
    };

    console.log('📋 Trazabilidad - Cambio manual de estado:', eventoTrazabilidad);

    toast.success(`${auditoriaActual.codigo} cambió a ${nuevoEstado}`, {
      description: `Estado anterior: ${estadoAnterior}`,
      duration: 4000
    });

    setModalCambiarEstadoOpen(false);
    setAuditoriaSeleccionada(null);
  };

  // Asignar auditor individual
  const handleAsignarAuditor = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalAsignarAuditorOpen(true);
  };

  // Guardar asignación de auditores
  const handleGuardarAsignacionAuditores = (auditoriaId: string, auditorLider: Persona, auditorAsignado: Persona) => {
    setAuditorias(prev =>
      prev.map(aud =>
        aud.id === auditoriaId
          ? {
              ...aud,
              auditorLider: auditorLider,
              auditorAsignado: auditorAsignado
            }
          : aud
      )
    );

    const auditoria = auditorias.find(a => a.id === auditoriaId);
    toast.success('Auditores asignados correctamente', {
      description: `${auditoria?.codigo} - Líder: ${auditorLider.nombre}, Asignado: ${auditorAsignado.nombre}`
    });

    setModalAsignarAuditorOpen(false);
    setAuditoriaSeleccionada(null);
  };

  // Enviar a aprobación individual
  const handleEnviarAprobacion = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalAprobacionOpen(true);
  };

  // Exportar individual
  const handleExportar = (auditoria: Auditoria) => {
    // Simular exportación a PDF
    toast.success(`Exportando ${auditoria.codigo}...`, {
      description: 'Generando informe PDF completo',
      duration: 3000
    });
    
    // En producción, esto haría una llamada al backend para generar el PDF
    setTimeout(() => {
      toast.success(`${auditoria.codigo} exportado`, {
        description: 'El archivo PDF está listo para descargar'
      });
      
      // Simular descarga
      const blob = new Blob(['Informe de Auditoría'], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${auditoria.codigo}_Informe.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    }, 2000);
  };

  // Archivar individual - ACTUALIZADO
  const handleArchivar = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setTipoAccionConfirmacion('archivar');
    setModalConfirmacionOpen(true);
  };

  // Eliminar individual - ACTUALIZADO
  const handleEliminar = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setTipoAccionConfirmacion('eliminar');
    setModalConfirmacionOpen(true);
  };

  // ============ INTEGRACIÓN: CREAR PLAN DE MEJORAMIENTO ============
  
  const handleCrearPlan = (auditoria: Auditoria) => {
    // 1. Convertir datos de auditoría del Kanban al formato AuditoriaParaPlan
    const auditoriaParaPlan: AuditoriaParaPlan = {
      id: auditoria.id,
      codigo: auditoria.codigo,
      nombre: auditoria.titulo,
      areaResponsable: auditoria.areaObjetivo,
      responsable: auditoria.auditorLider.nombre,
      cargo: auditoria.auditorLider.cargo,
      fechaFinalizacion: auditoria.fechaFin,
      estadoPlan: 'SIN_PLAN',
      fechaLimitePlan: calcularFechaLimitePlan(auditoria.fechaFin), // 30 días después
      plazoFormulacion: 30,
      hallazgos: generarHallazgosEjemplo(auditoria.hallazgos, auditoria.codigo)
    };
    
    // 2. Agregar al context
    agregarAuditoriaConHallazgos(auditoriaParaPlan);
    
    // 3. Seleccionar para formulación
    seleccionarAuditoria(auditoriaParaPlan);
    
    // 4. Notificación
    toast.success(`Plan de Mejoramiento creado para ${auditoria.codigo}`, {
      description: `${auditoria.hallazgos} hallazgos detectados. Ahora puede formular acciones correctivas.`,
      duration: 5000
    });
    
    // Nota: La navegación al módulo de Planes se hace desde ControlInternoFull
    // cuando detecta que hay una auditoría seleccionada
  };
  
  // Función auxiliar: calcular fecha límite (30 días después de finalización)
  const calcularFechaLimitePlan = (fechaFin: string): string => {
    const [dia, mes, anio] = fechaFin.split('/');
    const fecha = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    fecha.setDate(fecha.getDate() + 30);
    return `${String(fecha.getDate()).padStart(2, '0')}/${String(fecha.getMonth() + 1).padStart(2, '0')}/${fecha.getFullYear()}`;
  };
  
  // Función auxiliar: generar hallazgos de ejemplo basados en el número
  const generarHallazgosEjemplo = (numeroHallazgos: number, codigoAuditoria: string): HallazgoAuditoria[] => {
    const hallazgos: HallazgoAuditoria[] = [];
    
    for (let i = 1; i <= numeroHallazgos; i++) {
      hallazgos.push({
        id: `h-${codigoAuditoria}-${i}`,
        titulo: `Hallazgo ${i} - ${codigoAuditoria}`,
        gravedad: i === 1 ? 'GRAVE' : i === 2 ? 'MODERADO' : 'LEVE',
        descripcion: `Hallazgo identificado durante la auditoría ${codigoAuditoria}. Requiere acción correctiva.`,
        causas: [
          'Falta de procedimiento documentado',
          'Desconocimiento de la normativa vigente',
          'Recursos insuficientes asignados'
        ],
        efectos: [
          'Incumplimiento normativo potencial',
          'Riesgo de observaciones en auditoría externa',
          'Debilidad en control interno'
        ],
        recomendaciones: [
          'Documentar procedimiento formal',
          'Capacitar personal involucrado',
          'Asignar recursos adecuados'
        ]
      });
    }
    
    return hallazgos;
  };

  // VERSIÓN ANTIGUA - COMENTADA
  /*
  const handleArchivarOld = (auditoria: Auditoria) => {
    if (window.confirm(`¿Archivar la auditoría ${auditoria.codigo}?\n\nEsta auditoría se moverá al archivo histórico.`)) {
      setAuditorias(prev => prev.filter(aud => aud.id !== auditoria.id));
      toast.success(`${auditoria.codigo} archivada`, {
        description: 'La auditoría se movió al archivo histórico'
      });
    }
  };

  const handleEliminarOld = (auditoria: Auditoria) => {
    if (window.confirm(
      `¿ELIMINAR la auditoría ${auditoria.codigo}?\n\n` +
      `Título: ${auditoria.titulo}\n` +
      `Estado: ${auditoria.estado}\n\n` +
      `⚠️ ADVERTENCIA: Esta acción no se puede deshacer.`
    )) {
      setAuditorias(prev => prev.filter(aud => aud.id !== auditoria.id));
      toast.success(`${auditoria.codigo} eliminada`, {
        description: 'La auditoría ha sido eliminada permanentemente',
        duration: 4000
      });
    }
  };
  */

  // Confirmar acción (archivar o eliminar) - NUEVO
  const handleConfirmarAccion = (auditoriaId: string, comentario?: string) => {
    const auditoria = auditorias.find(a => a.id === auditoriaId);
    if (!auditoria) return;

    if (tipoAccionConfirmacion === 'archivar') {
      setAuditorias(prev => prev.filter(aud => aud.id !== auditoriaId));
      
      toast.success(`${auditoria.codigo} archivada`, {
        description: 'La auditoría se movió al archivo histórico',
        duration: 4000
      });

      console.log('📦 Auditoría archivada:', {
        auditoria: auditoria,
        comentario: comentario,
        fecha: new Date(),
        usuario: 'Usuario Actual'
      });
    } else if (tipoAccionConfirmacion === 'eliminar') {
      setAuditorias(prev => prev.filter(aud => aud.id !== auditoriaId));
      
      toast.success(`${auditoria.codigo} eliminada permanentemente`, {
        description: 'La auditoría y todos sus datos han sido eliminados',
        duration: 5000
      });

      console.log('🗑️ Auditoría eliminada:', {
        auditoria: auditoria,
        comentario: comentario,
        fecha: new Date(),
        usuario: 'Usuario Actual'
      });
    }

    setModalConfirmacionOpen(false);
    setAuditoriaSeleccionada(null);
  };

  // ============ FIN HANDLERS INDIVIDUALES ============

  // Toggle colapsar/expandir columna
  const toggleColumnaColapsada = (nombreEtapa: string) => {
    setColumnasColapsadas(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nombreEtapa)) {
        newSet.delete(nombreEtapa);
      } else {
        newSet.add(nombreEtapa);
      }
      return newSet;
    });
  };

  // FUNCIÓN REMOVIDA: toggleTodasColumnas (botón eliminado del UI)
  // Las columnas se pueden colapsar individualmente desde sus headers

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* HEADER: Título + Navegación + Controles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <h2 
              className="font-black leading-tight text-2xl"
              style={{ color: '#F97316' }}
            >
              Tablero Auditorías
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Gestión visual del flujo de auditorías
            </p>
          </div>

          {/* Botones de Vista + Tooltip */}
          <div className="flex items-center gap-2">
            <TooltipGuia {...TOOLTIPS_CONTROL_INTERNO['auditorias-kanban']} />
          </div>
        </div>

        {/* Segunda fila de controles */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* BOTONES COLAPSAR/EXPANDIR TODAS LAS TARJETAS */}
          <div className="flex items-center gap-2">
            <button
              onClick={colapsarTodasTarjetas}
              className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all hover:bg-blue-50 border-2 border-blue-300 hover:border-blue-500"
              style={{ color: '#1e5da8' }}
              title="Colapsar todas las tarjetas"
            >
              <ChevronsDown className="w-4 h-4" />
              <span className="hidden sm:inline">Colapsar Todas</span>
            </button>
            <button
              onClick={expandirTodasTarjetas}
              className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all hover:bg-green-50 border-2 border-green-300 hover:border-green-500"
              style={{ color: '#059669' }}
              title="Expandir todas las tarjetas"
            >
              <ChevronsUp className="w-4 h-4" />
              <span className="hidden sm:inline">Expandir Todas</span>
            </button>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6' }}>
            <button
              onClick={() => setVistaActiva('kanban')}
              className="px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all"
              style={{
                background: vistaActiva === 'kanban' ? '#FFFFFF' : 'transparent',
                color: vistaActiva === 'kanban' ? '#F97316' : '#6B7280',
                boxShadow: vistaActiva === 'kanban' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              <Columns3 className="w-4 h-4" />
              Kanban
            </button>
            <button
              onClick={() => setVistaActiva('lista')}
              className="px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all"
              style={{
                background: vistaActiva === 'lista' ? '#FFFFFF' : 'transparent',
                color: vistaActiva === 'lista' ? '#F97316' : '#6B7280',
                boxShadow: vistaActiva === 'lista' ? '0 1px 2px rgba(0, 0, 0, 0.05)' : 'none'
              }}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
          </div>
        </div>

        {/* ACCIONES PRINCIPALES */}
        <div className="flex flex-wrap items-center justify-end gap-2" style={{ display: 'none' }}>
          <Button
            variant={vistaActiva === 'kanban' ? 'default' : 'outline'}
            onClick={() => setVistaActiva('kanban')}
            className="gap-2"
          >
            <Columns3 className="w-4 h-4" />
            Kanban
          </Button>
          <Button
            variant={vistaActiva === 'lista' ? 'default' : 'outline'}
            onClick={() => setVistaActiva('lista')}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            Lista
          </Button>
          {/* Botón "Nueva Auditoría" eliminado según requerimiento */}
        </div>

        {/* FILTROS */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por código o título..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={filtroTerritorial}
              onChange={(e) => setFiltroTerritorial(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="Todas las Territoriales">Todas las Territoriales</option>
              <option value="Nacional">Nacional</option>
              <option value="Antioquia">Antioquia</option>
              <option value="Atlántico">Atlántico</option>
              <option value="Bogotá">Bogotá</option>
              <option value="Valle del Cauca">Valle del Cauca</option>
            </select>

            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </Card>

        {/* VISTA KANBAN */}
        {vistaActiva === 'kanban' && (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-max">
              {COLUMNAS_KANBAN.map((columna) => {
                const auditoriasColumna = auditoriasFiltradas.filter(
                  (aud) => aud.estado === columna.id
                );

                return (
                  <ColumnaKanban
                    key={columna.id}
                    columna={columna}
                    auditorias={auditoriasColumna}
                    onVerDetalle={handleVerDetalle}
                    onVerNotas={handleVerNotas}
                    onVerHistorial={handleVerHistorial}
                    onDrop={handleDrop}
                    colapsada={columnasColapsadas.has(columna.id)}
                    onToggleColapso={() => toggleColumnaColapsada(columna.id)}
                    onCambiarEstado={handleCambiarEstado}
                    onAsignarAuditor={handleAsignarAuditor}
                    onEnviarAprobacion={handleEnviarAprobacion}
                    onExportar={handleExportar}
                    onArchivar={handleArchivar}
                    onEliminar={handleEliminar}
                    onCrearPlan={handleCrearPlan}
                    onEditar={handleEditarAuditoria}
                    tarjetasColapsadas={tarjetasColapsadas}
                    onToggleColapsoTarjeta={toggleTarjetaColapsada}
                    contarHallazgos={contarHallazgos}
                    contarHallazgosCriticos={contarHallazgosCriticos}
                    contarTareasPendientes={contarTareasPendientes}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* VISTA LISTA */}
        {vistaActiva === 'lista' && (
          <div className="space-y-3">
            {auditoriasFiltradas.map((auditoria) => (
              <motion.div
                key={auditoria.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-5">
                    {/* HEADER */}
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FileText className="w-4 h-4" style={{ color: '#1e5da8' }} />
                            <span className="text-sm font-semibold">{auditoria.codigo}</span>
                          </div>
                          <span className="text-gray-400">•</span>
                          <span className="text-xs text-gray-500">Auditoría</span>
                          {/* Semáforo */}
                          <div 
                            className="w-3 h-3 rounded-full ml-2"
                            style={{
                              background: auditoria.semaforo === 'verde' ? '#10B981' :
                                         auditoria.semaforo === 'amarillo' ? '#F59E0B' : '#EF4444'
                            }}
                            title={`Estado: ${auditoria.semaforo}`}
                          />
                        </div>
                        <h3 className="font-bold text-gray-900 mb-2">{auditoria.titulo}</h3>
                        {!tarjetasColapsadas.has(auditoria.id) && (
                          <>
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{auditoria.descripcion}</p>
                            {/* Fechas */}
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Inicio: {auditoria.fechaInicio}</span>
                              </div>
                              <span>→</span>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>Fin: {auditoria.fechaFin}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* BOTÓN TOGGLE Y BADGE */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTarjetaColapsada(auditoria.id);
                          }}
                          className="p-2 rounded hover:bg-gray-100 transition-colors"
                          title={tarjetasColapsadas.has(auditoria.id) ? "Expandir" : "Colapsar"}
                        >
                          {tarjetasColapsadas.has(auditoria.id) ? (
                            <Maximize2 className="w-4 h-4 text-gray-600" />
                          ) : (
                            <Minimize2 className="w-4 h-4 text-gray-600" />
                          )}
                        </button>
                        
                        <Badge 
                          style={{
                            background: auditoria.estado === 'Planeación' ? '#EFF6FF' :
                                       auditoria.estado === 'Ejecución' ? '#FEF3C7' :
                                       auditoria.estado === 'Comunicación' ? '#DBEAFE' :
                                       auditoria.estado === 'Seguimiento' ? '#E0E7FF' : '#D1FAE5',
                            color: auditoria.estado === 'Planeación' ? '#1E40AF' :
                                   auditoria.estado === 'Ejecución' ? '#B45309' :
                                   auditoria.estado === 'Comunicación' ? '#1E3A8A' :
                                   auditoria.estado === 'Seguimiento' ? '#3730A3' : '#065F46',
                            border: 'none'
                          }}
                        >
                          {auditoria.estado}
                        </Badge>
                      </div>
                    </div>

                    {/* CONTENIDO COMPLETO - SOLO SI NO ESTÁ COLAPSADA */}
                    {!tarjetasColapsadas.has(auditoria.id) && (
                      <>
                        {/* AUDITORES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Auditor Líder:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white" style={{ background: '#1e5da8' }}>
                            {auditoria.auditorLider.iniciales}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{auditoria.auditorLider.nombre}</p>
                            <p className="text-xs text-gray-500">{auditoria.auditorLider.tipoIdentificacion} {auditoria.auditorLider.numeroIdentificacion}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Auditor Asignado:</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white" style={{ background: '#2a6dbd' }}>
                            {auditoria.auditorAsignado.iniciales}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{auditoria.auditorAsignado.nombre}</p>
                            <p className="text-xs text-gray-500">{auditoria.auditorAsignado.tipoIdentificacion} {auditoria.auditorAsignado.numeroIdentificacion}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIESGO, TIPO, PRIORIDAD Y TERRITORIAL */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <AlertCircle className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Calificación del Riesgo:</span>
                        </div>
                        <Badge style={{
                          background: auditoria.riesgo === 'Alto' ? '#FEE2E2' : auditoria.riesgo === 'Medio' ? '#FEF3C7' : '#DCFCE7',
                          color: auditoria.riesgo === 'Alto' ? '#991B1B' : auditoria.riesgo === 'Medio' ? '#92400E' : '#166534',
                          border: 'none'
                        }} className="text-xs">
                          {auditoria.calificacionRiesgo || `Riesgo ${auditoria.riesgo}`}
                        </Badge>
                      </div>
                      
                      {auditoria.tipo && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">Tipo:</span>
                          </div>
                          <Badge style={{
                            background: auditoria.tipo === 'territorial' ? '#D1FAE5' :
                                       auditoria.tipo === 'especial' ? '#FEE2E2' : '#E0E7FF',
                            color: auditoria.tipo === 'territorial' ? '#065F46' :
                                   auditoria.tipo === 'especial' ? '#991B1B' : '#3730A3',
                            border: 'none'
                          }} className="text-xs capitalize">
                            {auditoria.tipo === 'territorial' ? 'Territorial' :
                             auditoria.tipo === 'especial' ? 'Especial' : 'Regular'}
                          </Badge>
                        </div>
                      )}
                      
                      {auditoria.prioridad && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <AlertCircle className="w-4 h-4 text-gray-500" />
                            <span className="text-xs text-gray-500">Prioridad:</span>
                          </div>
                          <Badge style={{
                            background: auditoria.prioridad === 'crítica' ? '#FEE2E2' :
                                       auditoria.prioridad === 'alta' ? '#FED7AA' :
                                       auditoria.prioridad === 'media' ? '#FEF3C7' : '#DBEAFE',
                            color: auditoria.prioridad === 'crítica' ? '#991B1B' :
                                   auditoria.prioridad === 'alta' ? '#9A3412' :
                                   auditoria.prioridad === 'media' ? '#92400E' : '#1E40AF',
                            border: 'none'
                          }} className="text-xs capitalize">
                            {auditoria.prioridad}
                          </Badge>
                        </div>
                      )}
                      
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Territorial:</span>
                        </div>
                        <div className="px-3 py-1.5 rounded-md text-sm font-semibold inline-block" style={{ background: '#D1FAE5', color: '#065F46' }}>
                          {auditoria.territorial}
                        </div>
                      </div>
                    </div>

                    {/* ÁREA OBJETIVO (si existe) */}
                    {auditoria.areaObjetivo && (
                      <div className="mb-4 pb-4 border-b border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Área Objetivo:</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{auditoria.areaObjetivo}</p>
                      </div>
                    )}

                    {/* OBJETIVOS Y EQUIPO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Objetivos:</span>
                          <Badge variant="outline" className="text-xs">
                            {auditoria.objetivos?.length || 0}
                          </Badge>
                        </div>
                        {auditoria.objetivos && auditoria.objetivos.length > 0 ? (
                          <ul className="space-y-1">
                            {auditoria.objetivos.slice(0, 2).map((objetivo, idx) => (
                              <li key={objetivo.id} className="flex items-start gap-2 text-xs text-gray-600">
                                <span className="text-blue-600 mt-0.5">{idx + 1}.</span>
                                <span className="line-clamp-1">{objetivo.descripcion}</span>
                              </li>
                            ))}
                            {auditoria.objetivos.length > 2 && (
                              <li className="text-xs text-gray-500 italic">
                                +{auditoria.objetivos.length - 2} más...
                              </li>
                            )}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Sin objetivos definidos</p>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Equipo Auditor:</span>
                          <Badge variant="outline" className="text-xs">
                            {auditoria.equipoAuditores?.length || 0}
                          </Badge>
                        </div>
                        {auditoria.equipoAuditores && auditoria.equipoAuditores.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {auditoria.equipoAuditores.slice(0, 3).map((auditor, idx) => (
                              <div key={idx} className="px-2 py-1 rounded text-xs font-medium" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
                                {auditor.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>
                            ))}
                            {auditoria.equipoAuditores.length > 3 && (
                              <div className="px-2 py-1 rounded text-xs font-medium" style={{ background: '#F3F4F6', color: '#6B7280' }}>
                                +{auditoria.equipoAuditores.length - 3}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 italic">Sin equipo asignado</p>
                        )}
                      </div>
                    </div>

                    {/* ÚLTIMA ACTUACIÓN */}
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <span className="text-xs text-gray-500">Última actuación:</span>
                      </div>
                      <p className="text-sm text-gray-700 ml-6">{auditoria.ultimaActuacion}</p>
                    </div>

                    {/* ⚠️ ALERTA: Tareas Pendientes (VISTA LISTA) */}
                    {contarTareasPendientes(auditoria.id) > 0 && (
                      <div className="mb-4 bg-amber-50 border-2 border-amber-400 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
                          <div className="flex-1">
                            <div className="flex items-start justify-between gap-4 mb-2">
                              <div className="flex-1">
                                <p className="text-sm text-amber-900 mb-1">
                                  <strong>⚠️ Tareas pendientes de la fase "{auditoria.estado}"</strong>
                                </p>
                                <p className="text-xs text-amber-700 mb-2">
                                  Faltan <strong>{contarTareasPendientes(auditoria.id)} tareas</strong> por completar antes de avanzar al siguiente estado
                                </p>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="flex-1 bg-amber-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                      className="h-full bg-amber-600 rounded-full transition-all"
                                      style={{ width: `${((contarTareas(auditoria.id) - contarTareasPendientes(auditoria.id)) / Math.max(contarTareas(auditoria.id), 1)) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-amber-800 font-semibold whitespace-nowrap">
                                    {contarTareasCompletadas(auditoria.id)}/{contarTareas(auditoria.id)} completadas
                                  </span>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setAuditoriaSeleccionada(auditoria);
                                  setModalExpedienteOpen(true);
                                }}
                                className="flex-shrink-0 gap-2 bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                <Target className="w-4 h-4" />
                                Ver Actividades
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* MÉTRICAS */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                      <div className="text-center p-3 rounded-lg" style={{ background: '#EFF6FF' }}>
                        <Clock className="w-4 h-4 mx-auto mb-1" style={{ color: '#1e5da8' }} />
                        <p className="text-xs text-gray-600 mb-1">Días</p>
                        <p className="font-bold" style={{ color: '#1e5da8' }}>{auditoria.diasRestantes || 0}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: '#F0FDF4' }}>
                        <CheckSquare className="w-4 h-4 mx-auto mb-1 text-green-600" />
                        <p className="text-xs text-gray-600 mb-1">Tareas</p>
                        <p className="font-bold text-green-700">{contarTareas(auditoria.id)}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: '#FEF3C7' }}>
                        <FileText className="w-4 h-4 mx-auto mb-1 text-yellow-600" />
                        <p className="text-xs text-gray-600 mb-1">Docs</p>
                        <p className="font-bold text-yellow-700">{auditoria.documentos || 0}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: '#E0E7FF' }}>
                        <FileText className="w-4 h-4 mx-auto mb-1 text-indigo-600" />
                        <p className="text-xs text-gray-600 mb-1">Inform.</p>
                        <p className="font-bold text-indigo-700">{auditoria.informes || 0}</p>
                      </div>
                      <div className="text-center p-3 rounded-lg" style={{ background: '#FEE2E2' }}>
                        <TrendingUp className="w-4 h-4 mx-auto mb-1 text-red-600" />
                        <p className="text-xs text-gray-600 mb-1">Tiempo</p>
                        <p className="font-bold text-red-700">{auditoria.porcentajeTiempo || 0}%</p>
                      </div>
                    </div>

                    {/* PROGRESO */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-600">Progreso</span>
                        <span className="text-xs font-semibold">{auditoria.progreso}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full" style={{ 
                          width: `${auditoria.progreso}%`,
                          background: auditoria.progreso < 30 ? '#DC2626' : auditoria.progreso < 70 ? '#F59E0B' : '#10B981'
                        }} />
                      </div>
                    </div>

                    {/* ACCIONES */}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="gap-2 flex-1 sm:flex-none" style={{ background: '#F97316' }} onClick={() => handleVerDetalle(auditoria)}>
                        <Eye className="w-4 h-4" />
                        Ver Expediente
                      </Button>
                      <Button 
                        size="sm" 
                        className="gap-2 flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white" 
                        onClick={() => {
                          setAuditoriaSeleccionada(auditoria);
                          setModalExpedienteOpen(true);
                        }}
                        title="Ver actividades del proceso de auditoría"
                      >
                        <Target className="w-4 h-4" />
                        Proceso de Auditoría
                      </Button>
                      
                      {/* NUEVO: Botón Crear Plan de Mejoramiento - SOLO si está Finalizada con hallazgos */}
                      {auditoria.estado === 'Finalizada' && auditoria.hallazgos > 0 && (
                        <Button 
                          size="sm" 
                          className="gap-2 flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white" 
                          onClick={() => handleCrearPlan(auditoria)}
                          title="Crear Plan de Mejoramiento para los hallazgos identificados"
                        >
                          <Target className="w-4 h-4" />
                          Crear Plan de Mejoramiento
                        </Button>
                      )}
                      
                      <Button size="sm" variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => handleEditarAuditoria(auditoria)}>
                        <Edit className="w-4 h-4" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => handleCambiarEstado(auditoria)} title="Cambiar estado">
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => { setAuditoriaSeleccionada(auditoria); setModalNotasOpen(true); }} title="Notas">
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => handleVerHistorial(auditoria)} title="Historial">
                        <History className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => { setAuditoriaSeleccionada(auditoria); setModalInicioAuditoriaOpen(true); }} title="Iniciar Auditoría">
                        <Clock className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2" onClick={() => handleAsignarAuditor(auditoria)} title="Asignar Auditor">
                        <UserPlus className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" className="gap-2 text-red-600 hover:text-red-700" onClick={() => handleEliminar(auditoria)} title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                      </>
                    )}
                  </div>
                </Card>
              </motion.div>
            ))}
            
            {/* ESTADO VACÍO */}
            {auditoriasFiltradas.length === 0 && (
              <Card className="p-12">
                <EmptyState
                  icon={List}
                  title="No hay auditorías"
                  description="No se encontraron auditorías que coincidan con los filtros aplicados."
                  actionLabel="Crear auditoría"
                  onAction={() => setModalFormularioOpen(true)}
                />
              </Card>
            )}
          </div>
        )}

        {/* MODAL DE EXPEDIENTE COMPLETO */}
        {modalExpedienteOpen && (
          <ExpedienteAuditoriaCompleto
            auditoriaId={auditoriaSeleccionada?.id}
            isOpen={modalExpedienteOpen}
            onClose={() => {
              setModalExpedienteOpen(false);
              setAuditoriaSeleccionada(null);
            }}
          />
        )}

        {/* MODAL DE NOTAS */}
        <ModalNotasAuditoria
          auditoria={auditoriaSeleccionada}
          open={modalNotasOpen}
          onClose={() => {
            setModalNotasOpen(false);
            setAuditoriaSeleccionada(null);
          }}
        />

        {/* MODAL DE HISTORIAL */}
        <ModalHistorialAuditoria
          auditoria={auditoriaSeleccionada}
          open={modalHistorialOpen}
          onClose={() => {
            setModalHistorialOpen(false);
            setAuditoriaSeleccionada(null);
          }}
        />

        {/* MODAL DE APROBACIÓN */}
        <ModalAprobacionAuditoria
          auditoria={auditoriaSeleccionada}
          open={modalAprobacionOpen}
          onClose={() => {
            setModalAprobacionOpen(false);
            setAuditoriaSeleccionada(null);
          }}
          onAprobado={handleAprobado}
          onRechazado={handleRechazado}
          onModificacion={handleModificacion}
        />

        {/* MODAL DE FORMULARIO UNIFICADO - CREAR */}
        <FormularioAuditoriaUnificado
          open={modalFormularioOpen}
          onClose={() => {
            setModalFormularioOpen(false);
            setAuditoriaSeleccionada(null);
          }}
          onSubmit={handleCrearAuditoria}
          mode="create"
        />

        {/* MODAL DE FORMULARIO - EDITAR - WORLD CLASS */}
        {auditoriaParaEditar && (
          <ModalFormularioAuditoriaWorldClass
            open={modalEdicionOpen}
            onClose={() => {
              setModalEdicionOpen(false);
              setAuditoriaParaEditar(null);
            }}
            onSubmit={handleActualizarAuditoria}
            mode="edit"
            initialData={{
              codigo: auditoriaParaEditar.codigo,
              titulo: auditoriaParaEditar.titulo,
              descripcion: auditoriaParaEditar.descripcion,
              territorial: auditoriaParaEditar.territorial,
              riesgo: auditoriaParaEditar.riesgo,
              fechaInicio: auditoriaParaEditar.fechaInicio,
              fechaFin: auditoriaParaEditar.fechaFin,
              objetivos: auditoriaParaEditar.objetivos.map(obj => obj.descripcion),
              auditorLider: auditoriaParaEditar.auditorLider.nombre,
              auditorAsignado: auditoriaParaEditar.auditorAsignado.nombre,
              alcance: ''
            }}
          />
        )}

        {/* MODAL INICIO DE AUDITORÍA - WORLD CLASS */}
        {modalInicioAuditoriaOpen && auditoriaSeleccionada && (
          <InicioAuditoriaWizardWorldClass
            isOpen={modalInicioAuditoriaOpen}
            auditoria={{
              id: auditoriaSeleccionada.id,
              codigo: auditoriaSeleccionada.codigo,
              titulo: auditoriaSeleccionada.titulo,
              descripcion: auditoriaSeleccionada.descripcion || 'Auditoría de Gestión Administrativa',
              territorial: auditoriaSeleccionada.territorial,
              areaAuditable: 'SEDE-001',
              procesoNombre: auditoriaSeleccionada.titulo,
              responsableArea: {
                nombre: 'Dr. Carlos Andrés Pérez',
                cargo: 'Director Administrativo y Financiero',
                email: 'carlos.perez@esap.edu.co'
              },
              auditorLider: {
                nombre: auditoriaSeleccionada.auditorLider.nombre,
                cargo: auditoriaSeleccionada.auditorLider.cargo,
                email: auditoriaSeleccionada.auditorLider.nombre.toLowerCase().replace(' ', '.') + '@esap.edu.co'
              },
              equipoAuditores: [
                {
                  nombre: auditoriaSeleccionada.auditorAsignado.nombre,
                  cargo: auditoriaSeleccionada.auditorAsignado.cargo
                }
              ],
              fechaInicio: auditoriaSeleccionada.fechaInicio,
              duracionDias: {
                planeacion: 7,
                ejecucion: 20,
                comunicacion: 12
              }
            }}
            onClose={() => {
              setModalInicioAuditoriaOpen(false);
              setAuditoriaSeleccionada(null);
            }}
            onIniciar={(auditoria) => {
              setModalInicioAuditoriaOpen(false);
              setAuditoriaSeleccionada(null);
              toast.success('Auditoría iniciada exitosamente');
              // Actualizar el estado de la auditoría a Ejecución
              setAuditorias(prev => prev.map(aud =>
                aud.id === auditoria.id
                  ? { ...aud, estado: 'Ejecución' }
                  : aud
              ));
            }}
          />
        )}

        {/* MODAL DE ASIGNACIÓN DE AUDITORES */}
        <ModalAsignarAuditorWorldClass
          isOpen={modalAsignarAuditorOpen}
          onClose={() => {
            setModalAsignarAuditorOpen(false);
            setAuditoriaSeleccionada(null);
          }}
          auditoria={auditoriaSeleccionada}
          onAsignar={handleGuardarAsignacionAuditores}
        />

        {/* MODAL DE CAMBIO DE ESTADO */}
        <ModalCambiarEstadoAuditoria
          isOpen={modalCambiarEstadoOpen}
          onClose={() => {
            setModalCambiarEstadoOpen(false);
            setAuditoriaSeleccionada(null);
          }}
          auditoria={auditoriaSeleccionada}
          onCambiarEstado={handleGuardarCambioEstado}
        />

        {/* MODAL DE CONFIRMACIÓN (ARCHIVAR / ELIMINAR) */}
        <ModalConfirmacionAccion
          isOpen={modalConfirmacionOpen}
          onClose={() => {
            setModalConfirmacionOpen(false);
            setAuditoriaSeleccionada(null);
          }}
          auditoria={auditoriaSeleccionada}
          tipoAccion={tipoAccionConfirmacion}
          onConfirmar={handleConfirmarAccion}
        />
      </div>
    </DndProvider>
  );
}