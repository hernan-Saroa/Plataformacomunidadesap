/**
 * Gestión de Auditorías - Tablero Kanban OCIG
 * Versión: 4.0 | Drag & Drop, Filtros, Vista Kanban/Lista, Semáforos
 */

import { useState, useEffect, useRef } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid, List, Plus, MoreVertical, Calendar, User, Clock,
  AlertCircle, CheckCircle, FileText, Eye, MessageSquare, History,
  Filter, Search, ChevronDown, TrendingUp, Target, Shield,
  Download, Columns3, ClipboardCheck, CheckSquare,
  Maximize2, Minimize2, RefreshCw, UserPlus, Send, FileDown, Archive, Trash2, Edit,
  ChevronsDown, ChevronsUp, Move, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Card } from '../../ui/card';
import { Avatar, AvatarFallback } from '../../ui/avatar';
import { toast } from 'sonner';

// ✅ Servicios de exportación
import { exportarAuditoriaPDF, type AuditoriaPDFData } from './services/exportarAuditoriaPDF';
import { exportarAuditoriasExcel } from './services/exportarAuditoriasExcel';

// ✅ Importar modales desde carpeta modales/
import { 
  ModalDetalleAuditoria,
  ModalHistorial,
  ModalNotas,
  ModalAsignarAuditor,
  ModalAprobarAuditoria,
  ModalCambiarEstado,
  ModalFormularioAuditoria,
  ModalFinalizarAuditoria,
  type Auditoria as AuditoriaModal
} from './modales';

import { FormularioAuditoriaUnificado, type AuditoriaUnificadaFormData } from './FormularioAuditoriaUnificado';
import { InicioAuditoriaWizardWorldClass } from './InicioAuditoriaWizardWorldClass';
import { ExpedienteAuditoriaCompleto } from './ExpedienteAuditoriaCompleto';
import { LoadingSpinner, CardLoading } from '../../ui/loading-spinner';
import { SkeletonAuditoriaCard, SkeletonKanbanColumn } from '../../ui/skeleton';
import { EmptyState } from '../../ui/empty-state';
import type { AuditoriaFormData } from '../../../utils/validation';
import { TooltipGuia } from './TooltipGuia';
import { TOOLTIPS_CONTROL_INTERNO } from './tooltips-config';

// ✅ FASE 1 DÍA 2: Componentes responsive
import { useResponsive } from '@/hooks/useResponsive';

// Integración con Planes de Mejoramiento
import { useIntegracionAuditoriaPlanes, type AuditoriaParaPlan, type HallazgoAuditoria } from './IntegracionAuditoriasPlanesContext';

// ✅ Servicio para crear planes de mejoramiento
import controlInternoService from '../../../services/api/controlInternoService';

// ✅ INTEGRACIÓN: Contextos de Hallazgos y Tareas
import { useHallazgos } from './HallazgosContext';
import { useTareas } from './TareasContext';

// ✅ INTEGRACIÓN: Hook para cargar auditorías y auditores del backend
import { useAuditoriasKanban, type AuditoriaKanban, type AuditorDisponible } from './services/useAuditoriasKanban';

// ✅ PERMISOS: Hook de control de acceso
import { useControlInternoPermissions } from './hooks/useControlInternoPermissions';

// ============ TIPOS ============

type EstadoAuditoria =
  | 'Plan Anual'
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
  // ✅ CRONOGRAMA DE 3 ETAPAS
  // Etapa 1: Planeación
  fechaInicio: string;           // = fechaInicioPlaneacion
  fechaFinPlaneacion?: string;   // Fin de Planeación
  // Etapa 2: Ejecución
  fechaInicioEjecucion?: string; // Inicio de Ejecución
  fechaFinEjecucion?: string;    // Fin de Ejecución
  // Etapa 3: Comunicación
  fechaInicioComunicacion?: string; // Inicio de Comunicación
  fechaFin: string;              // = fechaFinComunicacion (fin de auditoría)
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
  documentoCierre?: any; // Campo JSONB del backend — necesario para el Expediente
  
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
  
  // Criterios de auditoría
  criterios?: { id: string; criterio: string }[];
  
  // ID del auditor líder asignado
  auditorLiderId?: string | number;
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
    id: 'Plan Anual',
    titulo: 'Plan Anual',
    count: 0,
    icono: <Calendar className="w-4 h-4" style={{ color: '#003DA5' }} />,
    diasEstimados: 15
  },
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
  // ✅ PERMISOS - Control de visibilidad de acciones
  puedeEditar?: boolean;
  puedeEliminar?: boolean;
  puedeAprobar?: boolean;
  puedeArchivar?: boolean;
  puedeAsignar?: boolean;
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
  contarTareasPendientes,
  puedeEditar = true,
  puedeEliminar = true,
  puedeAprobar = true,
  puedeArchivar = true,
  puedeAsignar = true
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

          <div className="p-2 md:p-2.5">
            <div className="flex items-start justify-between mb-1.5 md:mb-2">
              <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
                <div 
                  className="p-1 md:p-1.5 rounded-md md:rounded-lg flex-shrink-0"
                  style={{ background: '#E0EDFF' }}
                >
                  <ClipboardCheck className="w-3 h-3 md:w-3.5 md:h-3.5" style={{ color: '#003DA5' }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-[10px] md:text-xs truncate leading-tight" style={{ color: '#003DA5' }}>
                    {auditoria.codigo}
                  </h4>
                </div>
              </div>
              <div 
                className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full flex-shrink-0"
                style={{ background: semaforo.color }}
                title={semaforo.label}
              />
            </div>

            <p className="font-bold text-[11px] md:text-xs text-gray-900 line-clamp-2 mb-1.5 md:mb-2 leading-tight">
              {auditoria.titulo}
            </p>

            <div className="flex flex-wrap items-center gap-1 md:gap-1.5 mb-1.5 md:mb-2">
              <Badge 
                className={`text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 font-semibold ${
                  auditoria.riesgo === 'Alto' ? 'bg-red-100 text-red-800 border-red-200' :
                  auditoria.riesgo === 'Medio' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                  'bg-green-100 text-green-800 border-green-200'
                }`}
              >
                {auditoria.riesgo}
              </Badge>
              {auditoria.prioridad && (
                <Badge 
                  className={`text-[9px] md:text-[10px] px-1 md:px-1.5 py-0.5 font-semibold ${
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

            <div className="flex items-center justify-between text-[9px] md:text-[10px] text-gray-500 mb-1.5 md:mb-2">
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

        <div className="p-2 md:p-2.5 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-1.5">
            <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
              <div 
                className="p-1 md:p-1.5 rounded-md md:rounded-lg flex-shrink-0"
                style={{ background: '#E0EDFF' }}
              >
                <ClipboardCheck className="w-3 h-3 md:w-4 md:h-4" style={{ color: '#003DA5' }} />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-[11px] md:text-sm truncate leading-tight" style={{ color: '#003DA5' }}>
                  {auditoria.codigo}
                </h4>
                <p className="text-[10px] md:text-xs text-gray-600 truncate leading-tight">
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
                <Minimize2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-600" />
              </button>
            )}
          </div>

          {/* Título de la Auditoría */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-[10px] md:text-xs text-gray-500 mb-0.5">📋 Auditoría:</p>
            <p className="font-bold text-[11px] md:text-sm text-gray-900 line-clamp-2 leading-tight">
              {auditoria.titulo}
            </p>
          </div>

          {/* Auditor Líder */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-[10px] md:text-xs text-gray-500 mb-0.5">👨‍💼 Auditor Líder:</p>
            <p className="font-bold text-[11px] md:text-sm text-gray-900 line-clamp-1 leading-tight">
              {auditoria.auditorLider.nombre}
            </p>
            <p className="text-[10px] md:text-xs text-gray-600 leading-tight">
              {auditoria.auditorLider.tipoIdentificacion} {auditoria.auditorLider.numeroIdentificacion}
            </p>
          </div>

          {/* Auditor Asignado */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Avatar className="w-5 h-5 md:w-6 md:h-6 flex-shrink-0">
                <AvatarFallback 
                  className="text-[10px] md:text-xs"
                  style={{ background: '#E0EDFF', color: '#003DA5' }}
                >
                  {auditoria.auditorAsignado.iniciales}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] md:text-xs text-gray-500">👤 Auditor Asignado:</p>
                <p className="font-bold text-[11px] md:text-sm text-gray-900 line-clamp-1 leading-tight">
                  {auditoria.auditorAsignado.nombre}
                </p>
                <p className="text-[10px] md:text-xs text-gray-600 leading-tight">
                  {auditoria.auditorAsignado.tipoIdentificacion} {auditoria.auditorAsignado.numeroIdentificacion}
                </p>
              </div>
            </div>
          </div>

          {/* Calificación del Riesgo */}
          <div className="mb-1.5 pb-1.5 border-b border-gray-200">
            <p className="text-[10px] md:text-xs text-gray-500 mb-1">⚠️ Calificación del Riesgo:</p>
            <Badge 
              className={`text-[10px] md:text-xs font-semibold ${
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
              <p className="text-[10px] md:text-xs text-gray-500">🏷️ Tipo:</p>
              <Badge 
                className={`text-[10px] md:text-xs font-semibold ${
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
              <p className="text-[10px] md:text-xs text-gray-500">⚡ Prioridad:</p>
              <Badge 
                className={`text-[10px] md:text-xs font-semibold ${
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
                {auditoria.equipoAuditores.slice(0, 3).map((auditor, index) => {
                  // Manejar tanto string como objeto
                  const nombreAuditor = typeof auditor === 'string' ? auditor : (auditor.nombre || `Auditor ${auditor.personaId || index + 1}`);
                  const partes = nombreAuditor.split(' ');
                  return (
                    <span 
                      key={index}
                      className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200"
                    >
                      {partes[0]} {partes[1]?.[0] ? partes[1][0] + '.' : ''}
                    </span>
                  );
                })}
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

          {/* 📊 MÉTRICAS - RESPONSIVE */}
          <div className="grid grid-cols-3 gap-1 sm:gap-1.5 mb-1.5">
            <div className="text-center p-1 sm:p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[10px] sm:text-xs font-bold text-gray-700">{auditoria.documentos}</p>
              <p className="text-[9px] sm:text-xs text-gray-500 truncate">Docs</p>
            </div>
            <div className="text-center p-1 sm:p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[10px] sm:text-xs font-bold text-gray-700">{auditoria.informes}</p>
              <p className="text-[9px] sm:text-xs text-gray-500 truncate">Inform.</p>
            </div>
            <div className="text-center p-1 sm:p-1.5 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-[10px] sm:text-xs font-bold text-gray-700">
                {auditoria.porcentajeTiempo}%
              </p>
              <p className="text-[9px] sm:text-xs text-gray-500 truncate">Tiempo</p>
            </div>
          </div>

          {/* Acciones de Gestión */}
          <div className="pt-2 border-t border-gray-200 mt-2">
            {/* 🎯 ACCIONES PRINCIPALES - RESPONSIVE */}
            <div className={`grid ${puedeEditar ? 'grid-cols-2' : 'grid-cols-1'} gap-1 sm:gap-1.5 mb-2`}>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onVerDetalle(auditoria);
                }}
                size="sm"
                className="text-[10px] sm:text-xs font-bold truncate px-2 py-1 sm:px-3 sm:py-2"
                style={{ background: '#FF6B2C', color: '#FFFFFF' }}
              >
                <Eye className="w-3 h-3 mr-0.5 sm:mr-1 flex-shrink-0" />
                <span className="truncate">Ver</span>
              </Button>
              {puedeEditar && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditar(auditoria);
                }}
                size="sm"
                variant="outline"
                className="text-[10px] sm:text-xs font-bold truncate px-2 py-1 sm:px-3 sm:py-2"
                disabled={auditoria.estado === 'Finalizada'}
              >
                <Edit className="w-3 h-3 mr-0.5 sm:mr-1 flex-shrink-0" />
                <span className="truncate">Editar</span>
              </Button>
              )}
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
              {puedeAsignar && (
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
              )}

              {/* Enviar a aprobación - SOLO en Comunicación y Seguimiento */}
              {puedeAprobar && (
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
                    ? 'Aceptar hallazgos identificados' 
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
                }`}>Aceptar</span>
              </button>
              )}

              {/* Exportar - SOLO disponible desde Ejecución en adelante */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (auditoria.estado !== 'Planeación' && auditoria.estado !== 'Plan Anual') {
                    onExportar(auditoria);
                  }
                }}
                disabled={auditoria.estado === 'Planeación' || auditoria.estado === 'Plan Anual'}
                className={`flex flex-col items-center gap-0.5 p-1 rounded transition-colors flex-1 ${
                  auditoria.estado !== 'Planeación' && auditoria.estado !== 'Plan Anual'
                    ? 'hover:bg-white cursor-pointer' 
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={
                  auditoria.estado !== 'Planeación' && auditoria.estado !== 'Plan Anual'
                    ? 'Exportar informe PDF' 
                    : 'Solo disponible desde Ejecución'
                }
              >
                <FileDown className={`w-3.5 h-3.5 ${
                  auditoria.estado !== 'Planeación' && auditoria.estado !== 'Plan Anual' ? 'text-blue-600' : 'text-gray-400'
                }`} />
                <span className={`text-[9px] font-medium ${
                  auditoria.estado !== 'Planeación' && auditoria.estado !== 'Plan Anual' ? 'text-blue-600' : 'text-gray-400'
                }`}>Export</span>
              </button>

              {/* Archivar - SOLO en Finalizada */}
              {puedeArchivar && (
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
              )}

              {/* Eliminar - SOLO en Planeación (no iniciada) */}
              {puedeEliminar && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (auditoria.estado === 'Planeación' || auditoria.estado === 'Plan Anual') {
                    onEliminar(auditoria);
                  }
                }}
                disabled={auditoria.estado !== 'Planeación' && auditoria.estado !== 'Plan Anual'}
                className={`flex flex-col items-center gap-0.5 p-1 rounded transition-colors flex-1 ${
                  auditoria.estado === 'Planeación' || auditoria.estado === 'Plan Anual'
                    ? 'hover:bg-white cursor-pointer' 
                    : 'opacity-40 cursor-not-allowed'
                }`}
                title={
                  auditoria.estado === 'Planeación' || auditoria.estado === 'Plan Anual'
                    ? 'Eliminar auditoría en etapa inicial'
                    : 'Solo se puede eliminar en Planeación'
                }
              >
                <Trash2 className={`w-3.5 h-3.5 ${
                  auditoria.estado === 'Planeación' || auditoria.estado === 'Plan Anual' ? 'text-red-600' : 'text-gray-400'
                }`} />
                <span className={`text-[9px] font-medium ${
                  auditoria.estado === 'Planeación' || auditoria.estado === 'Plan Anual' ? 'text-red-600' : 'text-gray-400'
                }`}>Elim</span>
              </button>
              )}
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
  // 🚀 NUEVO: Modo de vista
  modoVista?: 'ajustado' | 'confortable';
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
  contarTareasPendientes,
  modoVista = 'ajustado'
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
        className="w-full md:w-20 flex-shrink-0 md:h-full"
        initial={{ opacity: 0.5, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0.5, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <Card 
          className={`h-full border-2 transition-all cursor-pointer group relative overflow-hidden ${
            isOver ? 'shadow-xl border-[#F57C00] bg-gradient-to-b from-orange-50 to-orange-100' : 'hover:shadow-lg hover:border-[#2962FF] bg-gradient-to-b from-gray-50 to-white'
          }`}
          style={{ 
            borderColor: isOver ? '#F57C00' : '#E5E7EB'
          }}
          onClick={onToggleColapso}
        >
          <div className="flex flex-col items-center py-4 px-2 gap-3 h-full">
            {/* Indicador de drag over */}
            {isOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 border-2 border-[#F57C00] border-dashed rounded-lg pointer-events-none z-10"
              />
            )}
            
            {/* Botón expandir con animación */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 rounded-lg bg-gradient-to-br from-[#2962FF] to-[#003DA5] group-hover:from-[#F57C00] group-hover:to-[#E65100] transition-all duration-300 shadow-md"
              title={`Expandir ${columna.titulo}`}
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </motion.button>

            {/* Icono de etapa con gradiente */}
            <div className="p-3 rounded-xl bg-gradient-to-br from-white to-gray-100 border-2 border-gray-200 group-hover:border-[#2962FF] transition-all duration-300 shadow-sm">
              <div className="w-6 h-6 text-[#2962FF] group-hover:text-[#F57C00] transition-colors">
                {columna.icono}
              </div>
            </div>

            {/* Indicadores de semáforo compactos - Solo si hay auditorías */}
            {auditorias.length > 0 && (
              <div className="flex flex-col gap-2 py-3">
                {auditoriasRojas > 0 && (
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="flex flex-col items-center gap-1 bg-red-50 px-2 py-1.5 rounded-lg border border-red-200 shadow-sm" 
                    title={`${auditoriasRojas} vencidos`}
                  >
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-md animate-pulse" />
                    <span className="text-xs font-black text-red-700">{auditoriasRojas}</span>
                  </motion.div>
                )}
                {auditoriasAmarillas > 0 && (
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="flex flex-col items-center gap-1 bg-amber-50 px-2 py-1.5 rounded-lg border border-amber-200 shadow-sm" 
                    title={`${auditoriasAmarillas} próximos a vencer`}
                  >
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 shadow-md" />
                    <span className="text-xs font-black text-amber-700">{auditoriasAmarillas}</span>
                  </motion.div>
                )}
                {auditoriasVerdes > 0 && (
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    className="flex flex-col items-center gap-1 bg-green-50 px-2 py-1.5 rounded-lg border border-green-200 shadow-sm" 
                    title={`${auditoriasVerdes} en término`}
                  >
                    <div className="w-3 h-3 rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-md" />
                    <span className="text-xs font-black text-green-700">{auditoriasVerdes}</span>
                  </motion.div>
                )}
              </div>
            )}

            {/* Nombre vertical con gradiente */}
            <div className="flex-1 flex items-center justify-center py-6">
              <h3 
                className="font-black text-sm tracking-wider bg-gradient-to-b from-[#2962FF] to-[#003DA5] bg-clip-text text-transparent group-hover:from-[#F57C00] group-hover:to-[#E65100] transition-all duration-300 whitespace-nowrap"
                style={{ 
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed'
                }}
              >
                {columna.titulo}
              </h3>
            </div>

            {/* Badge contador total mejorado */}
            <Badge
              className="font-black text-sm px-2.5 py-1 bg-gradient-to-br from-[#F57C00] to-[#E65100] border-2 border-orange-300 text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300"
            >
              {auditorias.length}
            </Badge>
          </div>
        </Card>
      </motion.div>
    );
  }

  // Versión expandida normal
  // ✅ SOLUCIÓN CORRECTA V5: FLEXBOX PROPORCIONAL
  // Cada columna ocupa ~20% del espacio disponible (flex-1 con 5 columnas)
  // Se adapta PROPORCIONALMENTE al ancho de la pantalla
  
  return (
    <div 
      className="bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg border border-gray-200 md:border-2 mb-3 md:mb-0 flex flex-col w-full md:flex-1 md:min-w-[200px] md:max-w-[400px]"
      style={{
        height: 'calc(100vh - 280px)',
        maxHeight: 'calc(100vh - 280px)'
      }}
    >
      {/* 🎨 HEADER COLUMNA - RESPONSIVE OPTIMIZADO */}
      <div className="p-2 md:p-3 lg:p-4 border-b border-gray-200 md:border-b-2 bg-gradient-to-r from-gray-50 to-gray-100 z-10 rounded-t-lg md:rounded-t-xl flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5 md:mb-2">
          {/* Título + Ícono */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-1 min-w-0">
            <div className="p-1 md:p-1.5 lg:p-2 rounded-md md:rounded-lg bg-white border md:border-2 border-gray-200 flex-shrink-0">
              <div className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6">
                {columna.icono}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-black text-[11px] md:text-xs lg:text-sm xl:text-base text-gray-800 truncate leading-tight">
                {columna.titulo}
              </h3>
              {columna.diasEstimados && (
                <p className="hidden md:flex text-[10px] lg:text-xs text-gray-500 items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5 lg:w-3 lg:h-3 flex-shrink-0" />
                  <span className="truncate">{columna.diasEstimados} días</span>
                </p>
              )}
            </div>
          </div>

          {/* Badge + Botón Colapsar */}
          <div className="flex items-center gap-1 md:gap-1.5 lg:gap-2 flex-shrink-0">
            <Badge className="font-semibold text-[10px] md:text-xs lg:text-sm px-1.5 md:px-2 py-0.5 md:py-1 bg-white border md:border-2 border-gray-200 text-gray-700">
              {auditorias.length}
            </Badge>
            
            {onToggleColapso && (
              <button
                onClick={onToggleColapso}
                className="p-1 sm:p-1.5 rounded-lg hover:bg-white hover:shadow-md transition-all duration-200 group"
                title={colapsada ? `Expandir ${columna.titulo}` : `Colapsar ${columna.titulo}`}
              >
                {colapsada ? (
                  <Maximize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 group-hover:text-[#2962FF] transition-colors" />
                ) : (
                  <Minimize2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-600 group-hover:text-[#F57C00] transition-colors" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 📋 LISTA DE TARJETAS - SCROLL VERTICAL UNIFICADO */}
      <div
        ref={drop}
        className={`flex-1 p-3 sm:p-4 space-y-2 sm:space-y-3 overflow-y-auto rounded-b-xl ${isOver ? 'bg-blue-50' : 'bg-white'}`}
        style={{ 
          minHeight: '180px',
          scrollbarWidth: 'thin',
          scrollbarColor: '#F97316 #F9FAFB'
        }}
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
  const { contarTareas, contarTareasPendientes, contarTareasCompletadas, verificarFaseCompleta, contarTareasPendientesPorFase, cargarTareas } = useTareas();
  
  // ✅ PERMISOS: Control de acceso flexible
  const { puedeRealizar } = useControlInternoPermissions();
  const puedeEditarAuditoria = puedeRealizar('auditorias', 'edit');
  const puedeEliminarAuditoria = puedeRealizar('auditorias', 'delete');
  const puedeAprobarAuditoria = puedeRealizar('auditorias', 'approve');
  const puedeAsignarAuditoria = puedeRealizar('auditorias', 'assign') || puedeRealizar('auditorias', 'edit');
  const puedeArchivarAuditoria = puedeRealizar('auditorias', 'edit');
  
  // ✅ HOOK BACKEND: Cargar auditorías y auditores desde el backend
  const {
    auditorias: auditoriasBackend,
    auditores: auditoresBackend,
    loading: cargandoBackend,
    error: errorBackend,
    refetch: recargarAuditorias,
    crearAuditoria: crearAuditoriaBackend,
    actualizarAuditoria: actualizarAuditoriaBackend,
    eliminarAuditoria: eliminarAuditoriaBackend,
    cambiarFase: cambiarFaseBackend,
    // ✅ NUEVOS: Métodos para notas, historial y aprobación
    getNotas: getNotasBackend,
    agregarNota: agregarNotaBackend,
    getHistorial: getHistorialBackend,
    aprobarAuditoria: aprobarAuditoriaBackend,
    rechazarAuditoria: rechazarAuditoriaBackend,
    getHallazgos,
    // ✅ FINALIZACIÓN: Método para finalizar auditoría con documento
    finalizarAuditoria: finalizarAuditoriaBackend
  } = useAuditoriasKanban();

  // Estado local para auditorías (sincronizado con backend)
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
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
  const [modalFinalizarOpen, setModalFinalizarOpen] = useState(false);
  const [auditoriaParaFinalizar, setAuditoriaParaFinalizar] = useState<Auditoria | null>(null);
  const [tipoAccionConfirmacion, setTipoAccionConfirmacion] = useState<'archivar' | 'eliminar'>('archivar');
  const [columnasColapsadas, setColumnasColapsadas] = useState<Set<string>>(new Set());
  const [tarjetasColapsadas, setTarjetasColapsadas] = useState<Set<string>>(new Set()); // NUEVO: Estado para tarjetas colapsadas
  const [showScrollIndicator, setShowScrollIndicator] = useState(false); // NUEVO: Indicador de scroll
  const scrollContainerRef = useRef<HTMLDivElement>(null); // REF para detectar scroll
  
  // 🚀 NUEVO: Estados para UX de Clase Mundial
  const [modoVista, setModoVista] = useState<'ajustado' | 'confortable'>('ajustado'); // Vista ajustada vs scroll
  const [columnaActiva, setColumnaActiva] = useState(0); // Para navegación por columnas
  const [mostrarMinimapa, setMostrarMinimapa] = useState(false); // Minimapa del tablero

  // ✅ NUEVO: Integración con Context - Recibir auditorías del Programa Anual
  const { 
    auditoriasProgramadas, 
    limpiarAuditoriasProgramadas,
    agregarAuditoriaConHallazgos,
    seleccionarAuditoria
  } = useIntegracionAuditoriaPlanes();

  // ✅ SINCRONIZAR: Auditorías del backend con estado local
  useEffect(() => {
    console.log('🔄 [SYNC] Hook disparado:', { 
      auditoriasBackend: auditoriasBackend?.length, 
      cargandoBackend,
      primerAuditoria: auditoriasBackend?.[0]
    });
    
    // Solo sincronizar cuando terminó de cargar y hay datos
    if (!cargandoBackend && auditoriasBackend && auditoriasBackend.length > 0) {
      // Transformar auditorías del backend al formato local
      const auditoriasTransformadas: Auditoria[] = auditoriasBackend.map(aud => ({
        id: aud.id,
        codigo: aud.codigo,
        titulo: aud.titulo,
        descripcion: aud.descripcion,
        estado: aud.estado,
        riesgo: aud.riesgo,
        semaforo: aud.semaforo,
        territorial: aud.territorial,
        auditorLider: aud.auditorLider,
        auditorAsignado: aud.auditorAsignado,
        auditorLiderId: aud.auditorLiderId, // ✅ Preservar ID del auditor líder
        fechaInicio: aud.fechaInicio,
        fechaFinPlaneacion: aud.fechaFinPlaneacion, // ✅ Fecha fin de Planeación / Inicio Ejecución
        fechaFinEjecucion: aud.fechaFinEjecucion, // ✅ Fecha fin de Ejecución / Inicio Comunicación
        fechaFin: aud.fechaFin,
        progreso: aud.progreso,
        hallazgos: aud.hallazgos,
        diasRestantes: aud.diasRestantes,
        porcentajeTiempo: aud.porcentajeTiempo,
        ultimaActuacion: aud.ultimaActuacion,
        objetivos: aud.objetivos,
        calificacionRiesgo: aud.calificacionRiesgo,
        documentos: aud.documentos,
        informes: aud.informes,
        tareas: aud.tareas,
        tipo: aud.tipo,
        prioridad: aud.prioridad,
        areaObjetivo: aud.areaObjetivo,
        permiteCambiarObjetivos: aud.permiteCambiarObjetivos,
        equipoAuditores: aud.equipoAuditores,
        criterios: aud.criterios, // ✅ Incluir criterios del backend
        territorialInfo: aud.territorialInfo,
        especial: aud.especial,
        actividadesCompletas: aud.actividadesCompletas,
        actividadesPendientes: aud.actividadesPendientes,
        documentoCierre: aud.documentoCierre,
      } as Auditoria));
      setAuditorias(auditoriasTransformadas);
      console.log(`✅ [GestionAuditorias] ${auditoriasTransformadas.length} auditorías sincronizadas desde backend`);
      
      // ✅ CARGAR TAREAS: Cargar tareas para cada auditoría desde el backend
      auditoriasTransformadas.forEach(aud => {
        cargarTareas(aud.id);
      });
    }
    // No cargar MOCK automáticamente - el usuario decide en desarrollo
  }, [auditoriasBackend, cargandoBackend, cargarTareas]);

  // ✅ NUEVO: Effect para detectar scroll horizontal disponible
  useEffect(() => {
    const checkScroll = () => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const hasScroll = container.scrollWidth > container.clientWidth;
        setShowScrollIndicator(hasScroll);
        
        // 🔥 DEBUGGING COMPLETO - Siempre mostrar en pantallas medianas
        if (window.innerWidth >= 768 && window.innerWidth <= 1440) {
          const innerDiv = container.querySelector('div');
          const columns = container.querySelectorAll('.bg-white.rounded-xl');
          
          console.log('🔍 DIAGNÓSTICO SCROLL HORIZONTAL:', {
            pantalla: {
              ancho: window.innerWidth,
              alto: window.innerHeight
            },
            contenedor: {
              scrollWidth: container.scrollWidth,
              clientWidth: container.clientWidth,
              diferencia: container.scrollWidth - container.clientWidth,
              tieneScroll: hasScroll,
              overflowX: getComputedStyle(container).overflowX
            },
            divInterno: innerDiv ? {
              flexWrap: getComputedStyle(innerDiv).flexWrap,
              display: getComputedStyle(innerDiv).display,
              minWidth: getComputedStyle(innerDiv).minWidth
            } : 'NO ENCONTRADO',
            columnas: {
              total: columns.length,
              anchos: Array.from(columns).map(col => getComputedStyle(col).width),
              flexShrink: Array.from(columns).map(col => getComputedStyle(col).flexShrink)
            },
            modoVista: modoVista
          });
        }
      }
    };
    
    checkScroll();
    // Verificar después de delays para asegurar render completo
    setTimeout(checkScroll, 100);
    setTimeout(checkScroll, 300);
    setTimeout(checkScroll, 500);
    
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [auditorias, vistaActiva, modoVista, columnasColapsadas]);

  // 🚀 NUEVO: Effect para detectar columna activa en scroll
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current || modoVista !== 'confortable') return;
      
      const container = scrollContainerRef.current;
      const columnWidth = container.scrollWidth / COLUMNAS_KANBAN.length;
      const currentIndex = Math.round(container.scrollLeft / columnWidth);
      
      setColumnaActiva(currentIndex);
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [modoVista]);

  // 🚀 NUEVO: Effect para forzar recálculo después de cambiar modo vista
  useEffect(() => {
    const forceReflow = () => {
      if (scrollContainerRef.current) {
        // Forzar reflow del navegador
        scrollContainerRef.current.style.display = 'none';
        scrollContainerRef.current.offsetHeight; // Trigger reflow
        scrollContainerRef.current.style.display = '';
        
        console.log('🔄 Recálculo forzado después de cambio de modo:', {
          modo: modoVista,
          scrollWidth: scrollContainerRef.current.scrollWidth,
          clientWidth: scrollContainerRef.current.clientWidth
        });
      }
    };

    // Delay para asegurar que el DOM se haya actualizado
    setTimeout(forceReflow, 50);
  }, [modoVista]);

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
          estado: 'Plan Anual', // ← Comienzan en Plan Anual
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
          description: `Las auditorías están listas en la columna "Plan Anual" y puedes comenzar a trabajarlas.`,
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
    if (auditoria.estado === 'Plan Anual') {
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

  const handleAprobado = async (auditoria: Auditoria, comentarios: string) => {
    console.log('Aprobando:', auditoria, comentarios);
    // ✅ Usar función del backend
    const exito = await aprobarAuditoriaBackend(auditoria.id, comentarios);
    if (exito) {
      setModalAprobacionOpen(false);
      setAuditoriaSeleccionada(null);
    }
  };

  const handleRechazado = async (auditoria: Auditoria, justificacion: string) => {
    console.log('Rechazando:', auditoria, justificacion);
    // ✅ Usar función del backend
    const exito = await rechazarAuditoriaBackend(auditoria.id, justificacion);
    if (exito) {
      setModalAprobacionOpen(false);
      setAuditoriaSeleccionada(null);
    }
  };

  const handleFinalizar = async (archivo: File, comentarios: string) => {
    if (!auditoriaParaFinalizar) return;

    try {
      console.log('[handleFinalizar] Finalizando auditoría:', auditoriaParaFinalizar.id);
      console.log('[handleFinalizar] Archivo:', archivo.name, archivo.size);
      console.log('[handleFinalizar] Comentarios:', comentarios);

      // Obtener datos del usuario logueado
      const usuarioStr = localStorage.getItem('usuario');
      const usuario = usuarioStr ? JSON.parse(usuarioStr) : null;
      const finalizadaPor = usuario?.nombre || 'Usuario';
      const finalizadaPorId = usuario?.id || 1;

      // ✅ Llamar al backend con documento de cierre
      const exito = await finalizarAuditoriaBackend(
        auditoriaParaFinalizar.id,
        archivo,
        comentarios,
        finalizadaPor,
        finalizadaPorId
      );

      if (exito) {
        // Actualizar el estado local
        setAuditorias(prev =>
          prev.map(aud =>
            aud.id === auditoriaParaFinalizar.id
              ? { ...aud, estado: 'Finalizada' }
              : aud
          )
        );

        toast.success('✅ Auditoría Finalizada', {
          description: `Documento "${archivo.name}" adjuntado correctamente`
        });

        setModalFinalizarOpen(false);
        setAuditoriaParaFinalizar(null);
      } else {
        throw new Error('No se pudo finalizar la auditoría');
      }
    } catch (error: any) {
      console.error('[handleFinalizar] Error:', error);
      toast.error('Error al finalizar', {
        description: error.message || 'No se pudo procesar la finalización de la auditoría'
      });
    }
  };

  const handleModificacion = (auditoria: Auditoria, observaciones: string) => {
    console.log('Modificación:', auditoria, observaciones);
    // TODO: Implementar cuando se necesite
  };

  const handleCrearAuditoria = async (data: AuditoriaUnificadaFormData) => {
    try {
      // 🔍 DEBUG: Log de fechas recibidas
      console.log('═══════════════════════════════════════════════════════════════');
      console.log('📥 handleCrearAuditoria - DATOS RECIBIDOS:');
      console.log('   fechaInicioPlaneacion:', data.fechaInicioPlaneacion);
      console.log('   fechaFinPlaneacion:', data.fechaFinPlaneacion);
      console.log('   fechaInicioEjecucion:', data.fechaInicioEjecucion);
      console.log('   fechaFinEjecucion:', data.fechaFinEjecucion);
      console.log('   fechaInicioComunicacion:', data.fechaInicioComunicacion);
      console.log('   fechaFinComunicacion:', data.fechaFinComunicacion);
      console.log('═══════════════════════════════════════════════════════════════');
      
      // Auto-calcular fechas de inicio de etapas si no están definidas
      // Etapa 2: fechaInicioEjecucion = día siguiente a fechaFinPlaneacion
      // Etapa 3: fechaInicioComunicacion = día siguiente a fechaFinEjecucion
      const fechaInicioEjecucionCalculada = data.fechaInicioEjecucion || data.fechaFinPlaneacion;
      const fechaInicioComunicacionCalculada = data.fechaInicioComunicacion || data.fechaFinEjecucion;
      
      // 🔍 DEBUG: Log de valores calculados
      console.log('📊 VALORES CALCULADOS:');
      console.log('   fechaInicioEjecucionCalculada:', fechaInicioEjecucionCalculada);
      console.log('   fechaInicioComunicacionCalculada:', fechaInicioComunicacionCalculada);
      
      // Preparar datos para el backend
      const datosBackend = {
        nombre: data.titulo,
        descripcion: data.descripcion || '',
        tipo: data.tipoAuditoria || 'Regular',
        territorial: data.territorial || 'Nacional',
        sede: data.territorial || 'Nacional',
        responsable: 'aud-001', // TODO: Obtener del usuario logueado
        fechaInicio: data.fechaInicio || data.fechaInicioPlaneacion,
        fechaFin: data.fechaFin || data.fechaFinComunicacion,
        areaObjetivo: data.areaObjetivo || 'Control Interno',
        procesoAuditado: data.procesoAuditado || 'General',
        calificacionRiesgo: data.nivelRiesgo || 'Medio',
        alcance: data.alcance || data.descripcion || '',
        objetivos: data.objetivos || [],
        criteriosAuditoria: data.criteriosAuditoria || [], // El backend usa criteriosAuditoria
        equipoAuditores: data.equipoAuditores || [],
        // ✅ Incluir TODAS las fechas del cronograma de 3 etapas
        // Etapa 1: Planeación
        ...(data.fechaFinPlaneacion && { fechaFinPlaneacion: data.fechaFinPlaneacion }),
        // Etapa 2: Ejecución
        ...(fechaInicioEjecucionCalculada && { fechaInicioEjecucion: fechaInicioEjecucionCalculada }),
        ...(data.fechaFinEjecucion && { fechaFinEjecucion: data.fechaFinEjecucion }),
        // Etapa 3: Comunicación
        ...(fechaInicioComunicacionCalculada && { fechaInicioComunicacion: fechaInicioComunicacionCalculada }),
        // ✅ Estado inicial del Kanban - todas las auditorías nuevas inician en "Plan Anual"
        estadoKanban: 'Plan Anual',
      };
      
      const nuevaAuditoriaId = await crearAuditoriaBackend(datosBackend);
      
      if (nuevaAuditoriaId) {
        toast.success('✅ Auditoría creada exitosamente', {
          description: `"${data.titulo}" registrada correctamente`
        });
        
        // Recargar auditorías desde el backend
        await recargarAuditorias();
        
        setModalFormularioOpen(false);
      } else {
        toast.error('Error al crear auditoría', {
          description: 'Hubo un problema al guardar en el servidor'
        });
      }
    } catch (error) {
      console.error('[handleCrearAuditoria] Error:', error);
      toast.error('Error al crear auditoría', {
        description: 'Error de conexión con el servidor'
      });
    }
  };

  const handleEditarAuditoria = (auditoria: Auditoria) => {
    setAuditoriaParaEditar(auditoria);
    setModalEdicionOpen(true);
  };

  const handleActualizarAuditoria = async (data: AuditoriaFormData) => {
    if (!auditoriaParaEditar) return;
    
    console.log('Actualizar auditoría:', auditoriaParaEditar.id, data);
    
    // Auto-calcular fechas de inicio de etapas si no están definidas
    const fechaFinPlaneacion = (data as any).fechaFinPlaneacion;
    const fechaFinEjecucion = (data as any).fechaFinEjecucion;
    const fechaInicioEjecucionCalculada = (data as any).fechaInicioEjecucion || fechaFinPlaneacion;
    const fechaInicioComunicacionCalculada = (data as any).fechaInicioComunicacion || fechaFinEjecucion;
    
    // ✅ Enviar actualización al backend con TODAS las fechas del cronograma
    const datosBackend = {
      nombre: data.titulo,
      descripcion: data.descripcion,
      territorial: data.territorial,
      sede: data.territorial, // Sincronizar sede con territorial
      calificacionRiesgo: data.riesgo,
      // Etapa 1: Planeación
      fechaInicio: data.fechaInicio,
      fechaFinPlaneacion: fechaFinPlaneacion || undefined,
      // Etapa 2: Ejecución
      fechaInicioEjecucion: fechaInicioEjecucionCalculada || undefined,
      fechaFinEjecucion: fechaFinEjecucion || undefined,
      // Etapa 3: Comunicación
      fechaInicioComunicacion: fechaInicioComunicacionCalculada || undefined,
      fechaFin: data.fechaFin,
      alcance: data.descripcion, // Usar descripción como alcance si no hay campo separado
      // Incluir objetivos y criterios como arrays de strings
      objetivos: (data.objetivos || []).map((obj: any) => 
        typeof obj === 'string' ? obj : obj.descripcion
      ),
      criterios: (data.criterios || []).map((crit: any) => 
        typeof crit === 'string' ? crit : (crit.criterio || crit.descripcion)
      ),
    };

    const exito = await actualizarAuditoriaBackend(auditoriaParaEditar.id, datosBackend);
    
    if (exito) {
      // Actualizar en el estado local también para UI inmediata
      setAuditorias(prev =>
        prev.map(aud =>
          aud.id === auditoriaParaEditar.id
            ? {
                ...aud,
                titulo: data.titulo,
                descripcion: data.descripcion,
                territorial: data.territorial,
                riesgo: data.riesgo as RiesgoAuditoria,
                // Etapa 1: Planeación
                fechaInicio: data.fechaInicio,
                fechaFinPlaneacion: (data as any).fechaFinPlaneacion,
                // Etapa 2: Ejecución
                fechaInicioEjecucion: (data as any).fechaInicioEjecucion,
                fechaFinEjecucion: (data as any).fechaFinEjecucion,
                // Etapa 3: Comunicación
                fechaInicioComunicacion: (data as any).fechaInicioComunicacion,
                fechaFin: data.fechaFin,
                objetivos: (data.objetivos || []).map((obj: any, i: number) => ({
                  id: obj.id || `obj-${i}`,
                  descripcion: typeof obj === 'string' ? obj : (obj.descripcion || '')
                })),
                criterios: (data.criterios || []).map((crit: any, i: number) => ({
                  id: crit.id || `crit-${i}`,
                  criterio: typeof crit === 'string' ? crit : (crit.criterio || crit.descripcion || '')
                }))
              }
            : aud
        )
      );
      
      // Solo cerrar el modal si fue exitoso
      setModalEdicionOpen(false);
      setAuditoriaParaEditar(null);
    }
    // Si hay error, el toast lo muestra el hook y el modal permanece abierto
  };

  const handleDrop = async (item: Auditoria, nuevoEstado: EstadoAuditoria) => {
    if (item.estado === nuevoEstado) return;

    // 🎯 FINALIZACIÓN: Abrir modal para solicitar documento de cierre obligatorio
    if (nuevoEstado === 'Finalizada') {
      setAuditoriaParaFinalizar(item);
      setModalFinalizarOpen(true);
      return;
    }

    const estadoAnterior = item.estado;

    // ============ VALIDACIÓN DOCUMENTOS PLANEACIÓN (BLOQUEA AL ARRASTRAR) ============
    if (estadoAnterior === 'Planeación' && nuevoEstado === 'Ejecución') {
      try {
        const [todos, docs] = await Promise.all([
          controlInternoService.getDocumentos({ etapa: 'planeacion' }),
          controlInternoService.getDocumentosByEtapa(item.id, 'planeacion'),
        ]);
        const plantillas = (todos || []).filter((d: any) => !d.auditoriaId);
        const requeridos = Math.max(plantillas.length, 1);
        const total = (docs || []).filter((d: any) => d.auditoriaId === item.id).length;
        if (total < requeridos) {
          toast.error('Documentos incompletos', {
            description: `Debe subir ${requeridos} documento(s) en Planeación antes de avanzar a Ejecución. Tiene ${total}.`,
            duration: 5000,
          });
          return;
        }
      } catch {
        toast.error('No se pudo validar los documentos');
        return;
      }
    }
    const usuario = 'Usuario Actual'; // En producción vendría del contexto de autenticación
    
    // ============ VALIDACIÓN DE CHECKLIST (ADVERTENCIA, NO BLOQUEA) ============
    const estadoAFase: Record<EstadoAuditoria, 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento' | null> = {
      'Plan Anual': null,
      'Planeación': 'Planeación',
      'Ejecución': 'Ejecución',
      'Comunicación': 'Comunicación',
      'Seguimiento': 'Seguimiento',
      'Finalizada': 'Seguimiento'
    };

    const faseActual = estadoAFase[estadoAnterior];
    
    // Mostrar advertencia si hay tareas pendientes (pero NO bloquear)
    if (faseActual && faseActual !== estadoAFase[nuevoEstado]) {
      const tareasPendientes = contarTareasPendientesPorFase(item.id, faseActual);
      
      if (tareasPendientes > 0) {
        console.log(`⚠️ [handleDrop] ${tareasPendientes} tareas pendientes en fase ${faseActual}, continuando de todos modos`);
      }
    }
    
    // ✅ NUEVO: Mapear estado Kanban a fase del backend
    const faseBackend = mapearEstadoAFaseBackend(nuevoEstado);
    
    console.log(`[handleDrop] Cambiando ${item.codigo} de ${estadoAnterior} a ${nuevoEstado} (fase backend: ${faseBackend})`);
    
    // ✅ NUEVO: Llamar al backend para cambiar la fase
    const exito = await cambiarFaseBackend(item.id, faseBackend);
    
    if (exito) {
      // Actualizar UI local
      setAuditorias(prev =>
        prev.map(aud =>
          aud.id === item.id
            ? { 
                ...aud, 
                estado: nuevoEstado,
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
      
      console.log('📋 Trazabilidad - Movimiento de tarjeta:', eventoTrazabilidad);

      toast.success(`✅ ${item.codigo} movido a ${nuevoEstado}`, {
        description: `Estado actualizado en el servidor`
      });
    } else {
      toast.error(`❌ Error al mover ${item.codigo}`, {
        description: `No se pudo actualizar el estado en el servidor`
      });
    }
  };

  // ============ HANDLERS INDIVIDUALES PARA ACCIONES DE TARJETA ============

  // Cambiar estado individual - abre modal de cambio de estado
  const handleCambiarEstado = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalCambiarEstadoOpen(true);
  };

  // ✅ MEJORADO: Ahora envía el estado Kanban directamente al backend
  // El backend soporta todos los estados: 'Plan Anual', 'Planeación', 'Ejecución', 'Comunicación', 'Seguimiento', 'Finalizada'
  const mapearEstadoAFaseBackend = (estado: string): string => {
    // Ahora enviamos el estado Kanban directamente, el backend lo normaliza
    return estado;
  };

  // Guardar cambio de estado con comentario - ✅ CONECTADO AL BACKEND
  const handleGuardarCambioEstado = async (auditoriaId: string, nuevoEstado: EstadoAuditoria, comentario: string) => {
    const auditoriaActual = auditorias.find(a => a.id === auditoriaId);
    if (!auditoriaActual) return;

    // 🎯 FINALIZACIÓN: Abrir modal para solicitar documento de cierre obligatorio
    if (nuevoEstado === 'Finalizada') {
      setModalCambiarEstadoOpen(false);
      setAuditoriaSeleccionada(null);
      setAuditoriaParaFinalizar(auditoriaActual);
      setModalFinalizarOpen(true);
      return;
    }

    const estadoAnterior = auditoriaActual.estado;

    // ============ VALIDACIÓN DOCUMENTOS PLANEACIÓN (BLOQUEA) ============
    // Requeridos = cantidad de plantillas en biblioteca (una subida por plantilla)
    if (estadoAnterior === 'Planeación' && nuevoEstado === 'Ejecución') {
      try {
        const [todos, docs] = await Promise.all([
          controlInternoService.getDocumentos({ etapa: 'planeacion' }),
          controlInternoService.getDocumentosByEtapa(auditoriaId, 'planeacion'),
        ]);
        const plantillas = (todos || []).filter((d: any) => !d.auditoriaId);
        const requeridos = Math.max(plantillas.length, 1);
        const total = (docs || []).filter((d: any) => d.auditoriaId === auditoriaId).length;
        if (total < requeridos) {
          toast.error('Documentos incompletos', {
            description: `Debe subir ${requeridos} documento(s) en Planeación (uno por cada plantilla) para avanzar a Ejecución. Tiene ${total}.`,
            duration: 5000,
          });
          return;
        }
      } catch {
        toast.error('No se pudo validar los documentos');
        return;
      }
    }

    // ============ VALIDACIÓN DE CHECKLIST (ADVERTENCIA, NO BLOQUEA) ============
    const estadoAFase: Record<EstadoAuditoria, 'Planeación' | 'Ejecución' | 'Comunicación' | 'Seguimiento' | null> = {
      'Plan Anual': null,
      'Planeación': 'Planeación',
      'Ejecución': 'Ejecución',
      'Comunicación': 'Comunicación',
      'Seguimiento': 'Seguimiento',
      'Finalizada': 'Seguimiento'
    };

    const faseActual = estadoAFase[estadoAnterior];
    
    // Mostrar advertencia si hay tareas pendientes (pero NO bloquear)
    if (faseActual && faseActual !== estadoAFase[nuevoEstado]) {
      const tareasPendientes = contarTareasPendientesPorFase(auditoriaId, faseActual);
      
      if (tareasPendientes > 0) {
        console.log(`⚠️ [handleGuardarCambioEstado] ${tareasPendientes} tareas pendientes en fase ${faseActual}, continuando de todos modos`);
      }
    }

    // ✅ Si la validación pasa, enviar cambio al backend
    const faseBackend = mapearEstadoAFaseBackend(nuevoEstado);
    const exito = await cambiarFaseBackend(auditoriaId, faseBackend);

    if (exito) {
      // Actualizar estado local
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
        usuario: 'Usuario Actual',
        fecha: new Date(),
        auditoriaId: auditoriaId,
        estadoAnterior: estadoAnterior,
        estadoNuevo: nuevoEstado
      };

      console.log('📋 Trazabilidad - Cambio manual de estado:', eventoTrazabilidad);
    }

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
  const handleExportar = async (auditoria: Auditoria) => {
    try {
      toast.info(`Generando PDF de ${auditoria.codigo}...`, {
        description: 'El documento se descargará en unos segundos',
        duration: 3000
      });

      // ✅ Extraer nombre del auditor líder (puede ser objeto, string ID, o string nombre)
      let nombreAuditorLider = 'No asignado';
      let cargoAuditorLider = '';
      if (auditoria.auditorLider) {
        if (typeof auditoria.auditorLider === 'object' && auditoria.auditorLider.nombre) {
          nombreAuditorLider = auditoria.auditorLider.nombre;
          cargoAuditorLider = auditoria.auditorLider.cargo || '';
        } else if (typeof auditoria.auditorLider === 'string') {
          // Verificar si es un ID y buscar en la lista de auditores
          const auditorEncontrado = auditoresBackend?.find(a => 
            String(a.id) === auditoria.auditorLider || 
            a.nombre === auditoria.auditorLider
          );
          if (auditorEncontrado) {
            nombreAuditorLider = auditorEncontrado.nombre;
            cargoAuditorLider = auditorEncontrado.cargo || '';
          } else {
            nombreAuditorLider = auditoria.auditorLider;
          }
        }
      }
      // También verificar si existe auditorLiderId y buscar por ese campo
      if (nombreAuditorLider === 'No asignado' && (auditoria as any).auditorLiderId) {
        const auditorPorId = auditoresBackend?.find(a => 
          String(a.id) === String((auditoria as any).auditorLiderId)
        );
        if (auditorPorId) {
          nombreAuditorLider = auditorPorId.nombre;
          cargoAuditorLider = auditorPorId.cargo || '';
        }
      }

      // ✅ Extraer equipo auditores (puede ser array de strings o de objetos)
      let equipoFormateado: Array<{ nombre: string; rol?: string }> = [];
      if (auditoria.equipoAuditores && Array.isArray(auditoria.equipoAuditores)) {
        equipoFormateado = auditoria.equipoAuditores.map((auditor: any) => {
          if (typeof auditor === 'string') {
            // Buscar en la lista de auditores si es un ID
            const auditorEncontrado = auditoresBackend?.find(a => 
              String(a.id) === auditor || a.nombre === auditor
            );
            return { 
              nombre: auditorEncontrado?.nombre || auditor, 
              rol: auditorEncontrado?.cargo || 'Auditor' 
            };
          } else if (typeof auditor === 'object' && auditor !== null) {
            return { 
              nombre: auditor.nombre || auditor.name || auditor.id || 'Auditor', 
              rol: auditor.rol || auditor.cargo || 'Auditor' 
            };
          }
          return { nombre: 'Auditor', rol: 'Auditor' };
        });
      }

      // Preparar datos para el PDF (las fechas se pasan tal cual, el servicio las parsea)
      const datosAuditoria: AuditoriaPDFData = {
        id: auditoria.id,
        codigo: auditoria.codigo,
        nombre: auditoria.titulo,
        tipo: auditoria.tipo,
        estado: auditoria.estado,
        areaObjetivo: auditoria.areaObjetivo,
        procesoAuditado: auditoria.titulo,
        auditorLider: {
          nombre: nombreAuditorLider,
          cargo: cargoAuditorLider,
        },
        equipoAuditores: equipoFormateado,
        fechaInicio: auditoria.fechaInicio || '',
        fechaFin: auditoria.fechaFin || '',
        progreso: auditoria.progreso,
        hallazgos: auditoria.hallazgos,
      };

      console.log('📄 Datos para PDF:', datosAuditoria);

      // Generar PDF
      const resultado = await exportarAuditoriaPDF(datosAuditoria);

      if (resultado.exito) {
        toast.success(`${auditoria.codigo} exportado`, {
          description: resultado.nombreArchivo
        });
      } else {
        throw new Error(resultado.error);
      }
    } catch (error: any) {
      console.error('Error al exportar auditoría:', error);
      toast.error('Error al exportar', {
        description: error.message || 'No se pudo generar el PDF'
      });
    }
  };

  // ✅ EXPORTAR TODAS LAS AUDITORÍAS A EXCEL (con logo ESAP)
  const handleExportarTodo = async () => {
    try {
      toast.info('Generando reporte de auditorías...', { duration: 2000 });

      // Filtrar auditorías según filtros activos
      let auditoriasExportar = auditorias;
      if (busqueda) {
        auditoriasExportar = auditoriasExportar.filter(a => 
          a.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
          a.codigo.toLowerCase().includes(busqueda.toLowerCase())
        );
      }
      if (filtroTerritorial !== 'Todas las Territoriales') {
        auditoriasExportar = auditoriasExportar.filter(a => a.territorial === filtroTerritorial);
      }

      if (auditoriasExportar.length === 0) {
        toast.warning('No hay auditorías para exportar');
        return;
      }

      // Usar servicio de Excel con logo ESAP
      const resultado = await exportarAuditoriasExcel(auditoriasExportar);

      if (resultado.exito) {
        toast.success('Reporte exportado', {
          description: resultado.mensaje
        });
      } else {
        toast.error('Error al exportar', {
          description: resultado.error
        });
      }
    } catch (error: any) {
      console.error('Error al exportar:', error);
      toast.error('Error al exportar', {
        description: error.message || 'No se pudo generar el reporte'
      });
    }
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
  
  const handleCrearPlan = async (auditoria: Auditoria) => {
    try {
      // 1. Obtener hallazgos reales del backend si existen
      let hallazgosReales: HallazgoAuditoria[] = [];
      try {
        const hallazgosBackend = await getHallazgos(auditoria.id);
        if (hallazgosBackend && hallazgosBackend.length > 0) {
          hallazgosReales = hallazgosBackend.map((h: any) => ({
            id: h.id,
            titulo: h.titulo || h.descripcion?.substring(0, 50) || 'Sin título',
            gravedad: h.criticidad?.toUpperCase() || h.gravedad || 'MODERADO',
            descripcion: h.descripcion || '',
            causas: h.causas || [],
            efectos: h.efectos || [],
            recomendaciones: h.recomendaciones || []
          }));
        }
      } catch (err) {
        console.warn('No se pudieron cargar hallazgos del backend:', err);
      }

      // Usar solo hallazgos reales del backend (no generar ejemplos)
      const hallazgos = hallazgosReales;

      // NOTA: El plan se crea en el backend cuando el usuario confirma en el modal
      // de PlanesMejoramientoModuleRediseno, NO aquí.

      // 2. Convertir datos de auditoría del Kanban al formato AuditoriaParaPlan
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
        hallazgos: hallazgos
      };
      
      // 4. Agregar al context
      agregarAuditoriaConHallazgos(auditoriaParaPlan);
      
      // 5. Seleccionar para formulación
      seleccionarAuditoria(auditoriaParaPlan);
      
      // 6. Notificación
      toast.success(`Plan de Mejoramiento creado para ${auditoria.codigo}`, {
        description: `${hallazgos.length} hallazgos detectados. Ahora puede formular acciones correctivas.`,
        duration: 5000
      });
    } catch (err) {
      console.error('Error en handleCrearPlan:', err);
      toast.error('Error al crear plan de mejoramiento');
    }
    
    // Nota: La navegación al módulo de Planes se hace desde ControlInternoFull
    // cuando detecta que hay una auditoría seleccionada
  };
  
  // Función auxiliar: calcular fecha límite (30 días después de finalización) - ISO 8601
  const calcularFechaLimitePlan = (fechaFin: string): string => {
    const [dia, mes, anio] = fechaFin.split('/');
    const fecha = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
    fecha.setDate(fecha.getDate() + 30);
    return fecha.toISOString().split('T')[0]; // YYYY-MM-DD
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

  // 🚀 NUEVAS FUNCIONES DE NAVEGACIÓN UX CLASE MUNDIAL
  const navegarColumna = (direccion: 'prev' | 'next') => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const columnWidth = container.scrollWidth / COLUMNAS_KANBAN.length;
    const scrollAmount = direccion === 'next' ? columnWidth : -columnWidth;
    
    container.scrollBy({
      left: scrollAmount,
      behavior: 'smooth'
    });
  };

  const scrollToColumna = (index: number) => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    const columnWidth = container.scrollWidth / COLUMNAS_KANBAN.length;
    
    container.scrollTo({
      left: columnWidth * index,
      behavior: 'smooth'
    });
    
    setColumnaActiva(index);
  };

  // Navegación con teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (vistaActiva !== 'kanban' || modoVista !== 'confortable') return;
      
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navegarColumna('prev');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navegarColumna('next');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [vistaActiva, modoVista]);

  // ✅ LOADING STATE: Mostrar mientras carga del backend
  if (cargandoBackend) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        <p className="text-gray-600">Cargando auditorías...</p>
      </div>
    );
  }

  // ✅ ERROR STATE: Mostrar error si falla la carga
  if (errorBackend) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500" />
        <p className="text-gray-600">Error al cargar auditorías</p>
        <p className="text-sm text-gray-400">{errorBackend}</p>
        <Button onClick={() => recargarAuditorias()} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-3 sm:space-y-4 lg:space-y-5 w-full">
        <Card className="p-4 sm:p-5 border border-gray-200 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-3xl font-black leading-tight" style={{ color: '#F97316' }}>
                  Auditorías OCIG
                </h2>
                <p className="text-gray-600 mt-1">{auditoriasFiltradas.length} auditorías</p>
              </div>
              <TooltipGuia {...TOOLTIPS_CONTROL_INTERNO['auditorias-kanban']} />
            </div>

            <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200">
                <button
                  onClick={() => setVistaActiva('kanban')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
                    vistaActiva === 'kanban' ? 'bg-[#1e5da8] text-white shadow-sm' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  <Columns3 className="w-4 h-4" />
                  Kanban
                </button>
                <button
                  onClick={() => setVistaActiva('lista')}
                  className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
                    vistaActiva === 'lista' ? 'bg-white text-[#1e5da8] shadow-sm' : 'text-gray-600 hover:bg-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Lista
                </button>
              </div>

              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Buscar auditoría..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10 bg-gray-100 border-gray-200 focus:bg-white"
                />
              </div>

              <div className="relative min-w-[130px]">
                <select
                  value={filtroTerritorial}
                  onChange={(e) => setFiltroTerritorial(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none font-medium text-sm appearance-none bg-white cursor-pointer"
                >
                  <option value="Todas las Territoriales">Todas</option>
                  <option value="Nacional">Nacional</option>
                  <option value="Antioquia">Antioquia</option>
                  <option value="Atlántico">Atlántico</option>
                  <option value="Bogotá">Bogotá</option>
                  <option value="Valle del Cauca">Valle del Cauca</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {vistaActiva === 'kanban' && (
                <div className="flex items-center gap-1 p-1 rounded-lg bg-gray-100 border border-gray-200">
                  <button
                    onClick={() => setModoVista('ajustado')}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                      modoVista === 'ajustado' ? 'bg-white text-[#1e5da8] shadow-sm' : 'text-gray-500 hover:bg-white'
                    }`}
                  >
                    Compacto
                  </button>
                  <button
                    onClick={() => setModoVista('confortable')}
                    className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                      modoVista === 'confortable' ? 'bg-white text-[#1e5da8] shadow-sm' : 'text-gray-500 hover:bg-white'
                    }`}
                  >
                    Confortable
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>

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

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* FILTROS - MOBILE FIRST RESPONSIVE                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Card className="p-3 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* Búsqueda - SPAN 2 COLUMNAS EN DESKTOP */}
            <div className="relative md:col-span-2 lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                type="text"
                placeholder="Buscar por código o título..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10 pr-4 py-2 text-sm sm:text-base border-2 border-gray-300 focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20"
              />
            </div>

            {/* Filtro Territorial */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
              <select
                value={filtroTerritorial}
                onChange={(e) => setFiltroTerritorial(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:border-[#2962FF] focus:ring-2 focus:ring-[#2962FF]/20 outline-none font-semibold text-sm sm:text-base appearance-none bg-white cursor-pointer"
              >
                <option value="Todas las Territoriales">Todas las Territoriales</option>
                <option value="Nacional">Nacional</option>
                <option value="Antioquia">Antioquia</option>
                <option value="Atlántico">Atlántico</option>
                <option value="Bogotá">Bogotá</option>
                <option value="Valle del Cauca">Valle del Cauca</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Botón Exportar */}
            <Button 
              variant="outline" 
              className="gap-2 border-2 border-[#F57C00] text-[#F57C00] hover:bg-[#F57C00] hover:text-white font-bold transition-all"
              onClick={handleExportarTodo}
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* VISTA KANBAN - RESPONSIVE WORLD CLASS                         */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {vistaActiva === 'kanban' && (
          <>
            {/* 🎯 CONTENEDOR KANBAN - MOBILE FIRST RESPONSIVE */}
            <div className="w-full relative">
              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* INDICADORES VISUALES DE SCROLL - UX MEJORADA                   */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {showScrollIndicator && (
                <>
                  {/* Indicador superior animado - Tablets y laptops (768-1919px) */}
                  <div className="hidden md:block 2xl:hidden absolute top-2 right-4 z-30 pointer-events-none">
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#2962FF]/95 to-[#003DA5]/95 backdrop-blur-sm text-white px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-lg animate-pulse">
                      <span className="text-sm md:text-base">←</span>
                      <span className="hidden md:inline">Desliza</span>
                      <span className="md:hidden">Scroll</span>
                      <span className="text-sm md:text-base">→</span>
                    </div>
                  </div>
                  
                  {/* Sombras laterales - Indican contenido oculto */}
                  <div className="hidden md:block absolute left-0 top-0 bottom-6 w-6 md:w-8 bg-gradient-to-r from-white via-gray-100/60 to-transparent z-10 pointer-events-none" />
                  <div className="hidden md:block absolute right-0 top-0 bottom-6 w-6 md:w-8 bg-gradient-to-l from-white via-gray-100/60 to-transparent z-10 pointer-events-none" />
                  
                  {/* Indicador de posición - Minimapa visual */}
                  <div className="hidden md:flex lg:hidden absolute bottom-8 left-1/2 -translate-x-1/2 z-30 gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg border border-gray-200">
                    {[0, 1, 2, 3, 4].map((index) => (
                      <div
                        key={index}
                        className="w-1.5 h-1.5 rounded-full transition-all"
                        style={{
                          background: columnaActiva === index ? '#2962FF' : '#D1D5DB'
                        }}
                      />
                    ))}
                  </div>
                </>
              )}
              
              {/* Indicador de scroll a la derecha - Solo en desktop con modo confortable */}
              {showScrollIndicator && modoVista === 'confortable' && (
                <div className="hidden lg:block absolute right-0 top-0 bottom-6 w-24 bg-gradient-to-l from-white via-gray-50/80 to-transparent z-20 pointer-events-none">
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 animate-bounce">
                    <div className="flex items-center gap-2 bg-gradient-to-r from-[#2962FF] to-[#003DA5] text-white px-4 py-2 rounded-full text-sm font-bold shadow-2xl border-2 border-white">
                      <span className="text-lg">→</span>
                      <span>Deslizar</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div 
                ref={scrollContainerRef}
                className="overflow-x-auto overflow-y-hidden pb-3 md:pb-4 px-2 md:px-3 lg:px-6 scroll-smooth"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#2962FF #E5E7EB',
                  WebkitOverflowScrolling: 'touch',
                  ...(typeof window !== 'undefined' && window.innerWidth >= 768 
                    ? { 
                        height: window.innerHeight <= 800 
                          ? 'calc(100vh - 200px)'  // Pantallas muy pequeñas
                          : window.innerHeight <= 900 
                            ? 'calc(100vh - 220px)'  // 12" típicas
                            : window.innerHeight <= 1080
                              ? 'calc(100vh - 260px)'  // HD
                              : 'calc(100vh - 300px)'  // 4K
                      }
                    : {})
                }}
              >
                <style>{`
                  /* ══════════════════════════════════════════════════════════ */
                  /* SCROLL HORIZONTAL (Navegación entre columnas) - SIEMPRE VISIBLE */
                  /* ══════════════════════════════════════════════════════════ */
                  .overflow-x-auto {
                    overflow-x: auto !important;
                    overflow-y: hidden !important;
                    -webkit-overflow-scrolling: touch !important;
                  }
                  
                  /* CRÍTICO: En tablets/desktop NUNCA hacer wrap */
                  @media (min-width: 768px) {
                    .overflow-x-auto > div {
                      flex-wrap: nowrap !important;
                      display: flex !important;
                    }
                  }
                  
                  .overflow-x-auto::-webkit-scrollbar {
                    height: 12px;
                    display: block !important;
                  }
                  .overflow-x-auto::-webkit-scrollbar-track {
                    background: #F3F4F6;
                    border-radius: 8px;
                    margin: 0 8px;
                  }
                  .overflow-x-auto::-webkit-scrollbar-thumb {
                    background: linear-gradient(to right, #2962FF, #003DA5);
                    border-radius: 8px;
                    border: 2px solid #F3F4F6;
                  }
                  .overflow-x-auto::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to right, #003DA5, #2962FF);
                  }
                  
                  /* ══════════════════════════════════════════════════════════ */
                  /* SCROLL VERTICAL (Dentro de cada columna) - UNIFICADO */
                  /* ══════════════════════════════════════════════════════════ */
                  .overflow-y-auto::-webkit-scrollbar {
                    width: 8px;
                    display: block !important;
                  }
                  .overflow-y-auto::-webkit-scrollbar-track {
                    background: #F9FAFB;
                    border-radius: 8px;
                  }
                  .overflow-y-auto::-webkit-scrollbar-thumb {
                    background: linear-gradient(to bottom, #F97316, #F57C00);
                    border-radius: 8px;
                    border: 2px solid #F9FAFB;
                  }
                  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(to bottom, #EA580C, #F97316);
                  }
                  
                  /* Optimización responsive para diferentes pantallas */
                  @media (max-width: 640px) {
                    .overflow-x-auto::-webkit-scrollbar {
                      height: 10px;
                    }
                  }
                  
                  @media (min-width: 768px) and (max-width: 1279px) {
                    /* Tablets y pantallas 10-11 pulgadas */
                    .overflow-x-auto::-webkit-scrollbar {
                      height: 14px;
                    }
                    .overflow-x-auto::-webkit-scrollbar-track {
                      background: #E5E7EB;
                    }
                    .overflow-x-auto::-webkit-scrollbar-thumb {
                      border: 3px solid #E5E7EB;
                    }
                  }
                  
                  @media (min-width: 1280px) {
                    .overflow-x-auto::-webkit-scrollbar {
                      height: 14px;
                    }
                  }
                  
                  @media (min-width: 3840px) {
                    .overflow-x-auto::-webkit-scrollbar {
                      height: 18px;
                    }
                  }
                  
                  /* Mejorar scroll en móvil y tablets */
                  @media (max-width: 1023px) {
                    .overflow-x-auto, .overflow-y-auto {
                      -webkit-overflow-scrolling: touch;
                      scrollbar-width: thin;
                    }
                  }
                  
                  /* Prevenir colapso de columnas y mantener tamaño estable */
                  @media (min-width: 768px) {
                    .md\\:flex-1 {
                      flex-grow: 1;
                      flex-shrink: 1;
                      flex-basis: 0%;
                      min-width: 240px;
                    }
                    
                    /* Asegurar min-width en columnas Kanban */
                    .md\\:min-w-\\[240px\\] {
                      min-width: 240px !important;
                    }
                  }
                  
                  /* Asegurar que el contenedor no cambie de tamaño */
                  .space-y-3 > *, .space-y-4 > *, .space-y-5 > * {
                    flex-shrink: 0;
                  }
                  
                  /* Optimización específica para tablets portrait (700-768px) */
                  @media (min-width: 640px) and (max-width: 767px) {
                    /* Mantener layout vertical en tablets portrait */
                    .flex-col {
                      width: 100%;
                    }
                    
                    /* Reducir padding en tablets portrait */
                    .p-3, .p-4 {
                      padding: 0.75rem;
                    }
                    
                    /* Ajustar fuentes para mejor legibilidad */
                    .text-xs {
                      font-size: 0.75rem;
                    }
                  }
                  
                  /* ══════════════════════════════════════════════════════════ */
                  /* SISTEMA DE SCROLL DUAL - TABLETS Y DESKTOP (768px+) */
                  /* ══════════════════════════════════════════════════════════ */
                  @media (min-width: 768px) {
                    /* Contenedor principal: SOLO scroll horizontal */
                    .overflow-x-auto {
                      overflow-x: auto !important;
                      overflow-y: hidden !important;
                      display: flex !important;
                    }
                    
                    /* Columnas: altura adaptativa - se controla vía inline style */
                    .flex.flex-col.bg-white.rounded-xl {
                      display: flex;
                      flex-direction: column;
                    }
                    
                    /* Asegurar que el contenedor de tarjetas use flex-1 */
                    .flex-1.overflow-y-auto {
                      flex: 1;
                      overflow-y: auto !important;
                      overflow-x: hidden;
                    }
                  }
                  
                  /* ══════════════════════════════════════════════════════════ */
                  /* OPTIMIZACIONES RESPONSIVE PARA PANTALLAS PEQUEÑAS/MEDIANAS */
                  /* ══════════════════════════════════════════════════════════ */
                  
                  /* Tablet pequeña (768-1023px): Diseño compacto */
                  @media (min-width: 768px) and (max-width: 1023px) {
                    /* Espaciado reducido */
                    .space-y-3 {
                      gap: 0.5rem !important;
                    }
                    
                    .p-3 {
                      padding: 0.5rem !important;
                    }
                  }
                  
                  /* Tablet (1024-1365px): Diseño medio */
                  @media (min-width: 1024px) and (max-width: 1365px) {
                    .space-y-3 {
                      gap: 0.625rem !important;
                    }
                  }
                  
                  /* Pantallas con altura ≤ 900px: Optimizar espacio vertical */
                  @media (min-width: 768px) and (max-height: 900px) {
                    /* Reducir espaciado vertical */
                    .space-y-3 {
                      gap: 0.5rem !important;
                    }
                    
                    .space-y-4 {
                      gap: 0.625rem !important;
                    }
                    
                    /* Padding más compacto */
                    .p-3 {
                      padding: 0.625rem !important;
                    }
                    
                    .p-4 {
                      padding: 0.75rem !important;
                    }
                    
                    /* Scrollbar horizontal delgado */
                    .overflow-x-auto::-webkit-scrollbar {
                      height: 8px !important;
                    }
                    
                    /* Headers más compactos */
                    .border-b-2 {
                      padding-top: 0.5rem !important;
                      padding-bottom: 0.5rem !important;
                    }
                  }
                  
                  /* Optimización para pantallas 10-11-12 pulgadas (768-1440px) */
                  @media (min-width: 768px) and (max-width: 1440px) {
                    /* Asegurar scroll visible */
                    .overflow-x-auto {
                      padding-bottom: 1rem;
                    }
                    
                    /* 🔥 FORZAR: Columnas NO se comprimen NUNCA */
                    .bg-white.rounded-xl.shadow-lg {
                      flex-shrink: 0 !important;
                      flex-grow: 0 !important;
                    }
                  }
                  
                  /* En móvil: sin restricciones de altura */
                  @media (max-width: 767px) {
                    .overflow-x-auto, .flex-1 {
                      height: auto !important;
                      max-height: none !important;
                    }
                  }
                  
                  @keyframes fadeInOut {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.8; }
                  }
                `}</style>
                <div 
                  className={`flex pb-2 ${
                    modoVista === 'ajustado' 
                      ? 'flex-col md:flex-row gap-3 md:gap-2 lg:gap-3 md:items-stretch md:h-full w-full' 
                      : 'flex-col md:flex-row gap-3 md:gap-3 lg:gap-4 xl:gap-4 md:items-start md:h-full w-full'
                  }`}
                  style={{
                    // ✅ SOLUCIÓN V5: Contenedor fluido sin restricciones
                    // Permite que las columnas flex-1 se distribuyan proporcionalmente
                  }}
                >
                  {/* 🚀 MODO AJUSTADO: Todas las columnas visibles sin scroll | MODO CONFORTABLE: Scroll horizontal */}
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
                    modoVista={modoVista}
                  />
                );
              })}
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════ */}
              {/* CONTROLES DE NAVEGACIÓN FLOTANTES - RESPONSIVE UX             */}
              {/* ═══════════════════════════════════════════════════════════════ */}
              {showScrollIndicator && (
                <>
                  {/* Botones de navegación - Tablets (768px+) y Desktop */}
                  <motion.button
                    onClick={() => navegarColumna('prev')}
                    className="hidden md:flex absolute left-2 md:left-4 top-1/2 transform -translate-y-1/2 z-30 items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full shadow-lg hover:shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #2962FF, #003DA5)',
                      color: '#FFFFFF'
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title="Columna anterior (← Flecha izquierda)"
                  >
                    <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                  </motion.button>

                  <motion.button
                    onClick={() => navegarColumna('next')}
                    className="hidden md:flex absolute right-2 md:right-4 top-1/2 transform -translate-y-1/2 z-30 items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full shadow-lg hover:shadow-xl"
                    style={{
                      background: 'linear-gradient(135deg, #2962FF, #003DA5)',
                      color: '#FFFFFF'
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    title="Columna siguiente (→ Flecha derecha)"
                  >
                    <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                  </motion.button>

                </>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* VISTA LISTA - RESPONSIVE COMPLETA                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        {vistaActiva === 'lista' && (
          <div className="space-y-3 sm:space-y-4">
            {auditoriasFiltradas.map((auditoria) => (
              <motion.div
                key={auditoria.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all">
                  <div className="p-3 sm:p-4 lg:p-5">
                    {/* HEADER - RESPONSIVE */}
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <div className="flex-1 w-full sm:w-auto">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2 text-gray-600">
                            <FileText className="w-4 h-4 flex-shrink-0" style={{ color: '#1e5da8' }} />
                            <span className="text-xs sm:text-sm font-semibold">{auditoria.codigo}</span>
                          </div>
                          <span className="text-gray-400">•</span>
                          <span className="text-xs text-gray-500">Auditoría</span>
                          {/* Semáforo */}
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{
                              background: auditoria.semaforo === 'verde' ? '#10B981' :
                                         auditoria.semaforo === 'amarillo' ? '#F59E0B' : '#EF4444'
                            }}
                            title={`Estado: ${auditoria.semaforo}`}
                          />
                        </div>
                        <h3 className="font-bold text-sm sm:text-base lg:text-lg text-gray-900 mb-2 line-clamp-2">{auditoria.titulo}</h3>
                        {!tarjetasColapsadas.has(auditoria.id) && (
                          <>
                            <p className="text-xs sm:text-sm text-gray-600 line-clamp-2 mb-2">{auditoria.descripcion}</p>
                            {/* Fechas - STACK EN MÓVIL */}
                            <div className="flex flex-col xs:flex-row items-start xs:items-center gap-1 xs:gap-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span>Inicio: {auditoria.fechaInicio}</span>
                              </div>
                              <span className="hidden xs:inline">→</span>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span>Fin: {auditoria.fechaFin}</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {/* BOTÓN TOGGLE Y BADGE - STACK EN MÓVIL */}
                      <div className="flex sm:flex-col items-center gap-2 flex-shrink-0">
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
                            background: auditoria.estado === 'Plan Anual' ? '#EEF2FF' :
                                       auditoria.estado === 'Planeación' ? '#EFF6FF' :
                                       auditoria.estado === 'Ejecución' ? '#FEF3C7' :
                                       auditoria.estado === 'Comunicación' ? '#DBEAFE' :
                                       auditoria.estado === 'Seguimiento' ? '#E0E7FF' : '#D1FAE5',
                            color: auditoria.estado === 'Plan Anual' ? '#3730A3' :
                                   auditoria.estado === 'Planeación' ? '#1E40AF' :
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
                            {auditoria.equipoAuditores.slice(0, 3).map((auditor, idx) => {
                              // Manejar tanto string como objeto
                              const nombreAuditor = typeof auditor === 'string' ? auditor : (auditor.nombre || `A${auditor.personaId || idx + 1}`);
                              const iniciales = nombreAuditor.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                              return (
                                <div key={idx} className="px-2 py-1 rounded text-xs font-medium" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
                                  {iniciales}
                                </div>
                              );
                            })}
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
            auditoriaDataInicial={auditoriaSeleccionada}
            isOpen={modalExpedienteOpen}
            tabInicial={(() => {
              const e = (auditoriaSeleccionada?.estado || '').toLowerCase();
              if (e.includes('planeacion') || e.includes('planeación')) return 'planeacion';
              if (e.includes('ejecucion') || e.includes('ejecución')) return 'ejecucion';
              if (e.includes('comunicacion') || e.includes('comunicación')) return 'comunicacion';
              if (e.includes('seguimiento')) return 'documentacion';
              if (e.includes('finalizada')) return 'historial';
              return 'general';
            })()}
            onClose={() => {
              setModalExpedienteOpen(false);
              setAuditoriaSeleccionada(null);
            }}
          />
        )}

        {/* MODAL DE NOTAS - ✅ CONECTADO AL BACKEND */}
        {auditoriaSeleccionada && (
          <ModalNotas
            isOpen={modalNotasOpen}
            onClose={() => {
              setModalNotasOpen(false);
              setAuditoriaSeleccionada(null);
            }}
            auditoriaId={auditoriaSeleccionada.id}
            onLoadNotas={getNotasBackend}
            onGuardar={async (nota) => {
              // ✅ Guardar nota en el backend (no cierra el modal para ver la lista actualizada)
              await agregarNotaBackend(auditoriaSeleccionada.id, nota);
            }}
          />
        )}

        {/* MODAL DE HISTORIAL - ✅ CONECTADO AL BACKEND */}
        {auditoriaSeleccionada && (
          <ModalHistorial
            isOpen={modalHistorialOpen}
            onClose={() => {
              setModalHistorialOpen(false);
              setAuditoriaSeleccionada(null);
            }}
            auditoriaId={auditoriaSeleccionada.id}
            onLoadHistorial={getHistorialBackend}
          />
        )}

        {/* MODAL DE APROBACIÓN - ✅ CONECTADO AL BACKEND */}
        {auditoriaSeleccionada && (
          <ModalAprobarAuditoria
            isOpen={modalAprobacionOpen}
            onClose={() => {
              setModalAprobacionOpen(false);
              setAuditoriaSeleccionada(null);
            }}
            auditoriaId={auditoriaSeleccionada.id}
            onAprobar={async (comentarios) => {
              // ✅ Aprobar en el backend
              await handleAprobado(auditoriaSeleccionada, comentarios || '');
            }}
          />
        )}

        {/* MODAL DE FINALIZAR - ✅ CON DOCUMENTO DE CIERRE OBLIGATORIO */}
        {auditoriaParaFinalizar && (
          <ModalFinalizarAuditoria
            isOpen={modalFinalizarOpen}
            onClose={() => {
              setModalFinalizarOpen(false);
              setAuditoriaParaFinalizar(null);
            }}
            auditoriaId={auditoriaParaFinalizar.id}
            auditoriaTitulo={auditoriaParaFinalizar.titulo}
            onFinalizar={handleFinalizar}
          />
        )}

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
          <ModalFormularioAuditoria
            isOpen={modalEdicionOpen}
            onClose={() => {
              setModalEdicionOpen(false);
              setAuditoriaParaEditar(null);
            }}
            auditoria={(() => {
              return {
                id: auditoriaParaEditar.id,
                codigo: auditoriaParaEditar.codigo,
                nombre: auditoriaParaEditar.titulo,
                tipo: auditoriaParaEditar.territorial || 'SEDE',
                proceso: auditoriaParaEditar.descripcion,
                responsable: auditoriaParaEditar.auditorLider?.nombre || 'Sin asignar',
                // ✅ CRONOGRAMA 3 ETAPAS COMPLETO
                // Etapa 1: Planeación
                fechaInicio: auditoriaParaEditar.fechaInicio,
                fechaInicioPlaneacion: auditoriaParaEditar.fechaInicio, // alias
                fechaFinPlaneacion: auditoriaParaEditar.fechaFinPlaneacion,
                // Etapa 2: Ejecución
                fechaInicioEjecucion: auditoriaParaEditar.fechaInicioEjecucion,
                fechaFinEjecucion: auditoriaParaEditar.fechaFinEjecucion,
                // Etapa 3: Comunicación
                fechaInicioComunicacion: auditoriaParaEditar.fechaInicioComunicacion,
                fechaFin: auditoriaParaEditar.fechaFin,
                fechaFinComunicacion: auditoriaParaEditar.fechaFin, // alias
                estado: auditoriaParaEditar.estado,
                progreso: auditoriaParaEditar.progreso || 0,
                objetivo: auditoriaParaEditar.objetivos?.[0]?.descripcion || '',
                alcance: auditoriaParaEditar.descripcion || '',
                // Pasar arrays completos para objetivos y criterios
                objetivos: auditoriaParaEditar.objetivos || [],
                criterios: auditoriaParaEditar.criterios || []
              };
            })()}
            onSave={(data) => {
              // Convertir datos del modal al formato esperado por handleActualizarAuditoria
              const formData = {
                titulo: data.nombre,
                descripcion: data.proceso || data.alcance || '',
                territorial: data.tipo,
                riesgo: auditoriaParaEditar.riesgo || 'Medio',
                // ✅ CRONOGRAMA 3 ETAPAS COMPLETO
                // Etapa 1: Planeación - usar fechaInicioPlaneacion o fechaInicio
                fechaInicio: (data as any).fechaInicioPlaneacion || data.fechaInicio,
                fechaFinPlaneacion: data.fechaFinPlaneacion,
                // Etapa 2: Ejecución
                fechaInicioEjecucion: data.fechaInicioEjecucion,
                fechaFinEjecucion: data.fechaFinEjecucion,
                // Etapa 3: Comunicación
                fechaInicioComunicacion: data.fechaInicioComunicacion,
                fechaFin: (data as any).fechaFinComunicacion || data.fechaFin,
                // Pasar arrays completos de objetivos y criterios
                objetivos: (data as any).objetivos || [],
                criterios: (data as any).criterios || []
              };
              
              handleActualizarAuditoria(formData as any);
            }}
          />
        )}

        {/* MODAL INICIO DE AUDITORÍA - WORLD CLASS - ✅ CONECTADO AL BACKEND */}
        {modalInicioAuditoriaOpen && auditoriaSeleccionada && (
          <InicioAuditoriaWizardWorldClass
            isOpen={modalInicioAuditoriaOpen}
            auditoria={{
              id: auditoriaSeleccionada.id,
              codigo: auditoriaSeleccionada.codigo,
              titulo: auditoriaSeleccionada.titulo,
              descripcion: auditoriaSeleccionada.descripcion || 'Auditoría de Gestión Administrativa',
              territorial: auditoriaSeleccionada.territorial,
              areaAuditable: auditoriaSeleccionada.areaObjetivo || 'Control Interno',
              procesoNombre: auditoriaSeleccionada.areaObjetivo || auditoriaSeleccionada.titulo,
              responsableArea: {
                nombre: 'Responsable del Área',
                cargo: 'Director',
                email: 'responsable@esap.edu.co'
              },
              auditorLider: {
                nombre: auditoriaSeleccionada.auditorLider?.nombre || 'Sin asignar',
                cargo: auditoriaSeleccionada.auditorLider?.cargo || 'Auditor',
                email: auditoriaSeleccionada.auditorLider?.nombre?.toLowerCase().replace(' ', '.') + '@esap.edu.co' || 'auditor@esap.edu.co'
              },
              equipoAuditores: auditoriaSeleccionada.auditorAsignado ? [
                {
                  nombre: auditoriaSeleccionada.auditorAsignado?.nombre || 'Sin asignar',
                  cargo: auditoriaSeleccionada.auditorAsignado?.cargo || 'Auditor'
                }
              ] : [],
              fechaInicio: auditoriaSeleccionada.fechaInicio,
              fechaFin: auditoriaSeleccionada.fechaFin,
              objetivos: auditoriaSeleccionada.objetivos || [],
              criterios: auditoriaSeleccionada.criterios || [],
              calificacionRiesgo: auditoriaSeleccionada.calificacionRiesgo,
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
            onIniciar={async (auditoria) => {
              // ✅ Conectar con backend para cambiar fase a "en-curso"
              console.log('[onIniciar] Iniciando auditoría:', auditoria.id);
              
              const exito = await cambiarFaseBackend(auditoria.id, 'en-curso');
              
              if (exito) {
                setModalInicioAuditoriaOpen(false);
                setAuditoriaSeleccionada(null);
                toast.success('✅ Auditoría iniciada exitosamente', {
                  description: 'La auditoría ha pasado a fase de Ejecución'
                });
                // Actualizar el estado local
                setAuditorias(prev => prev.map(aud =>
                  aud.id === auditoria.id
                    ? { ...aud, estado: 'Ejecución' }
                    : aud
                ));
                // Recargar desde backend para sincronizar
                await recargarAuditorias();
              } else {
                toast.error('Error al iniciar auditoría', {
                  description: 'No se pudo actualizar el estado en el servidor'
                });
              }
            }}
          />
        )}

        {/* MODAL DE ASIGNACIÓN DE AUDITORES */}
        {auditoriaSeleccionada && (
          <ModalAsignarAuditor
            isOpen={modalAsignarAuditorOpen}
            onClose={() => {
              setModalAsignarAuditorOpen(false);
              setAuditoriaSeleccionada(null);
            }}
            auditoriaId={auditoriaSeleccionada.id}
            auditorActualId={auditoriaSeleccionada.auditorLiderId}
            onAsignar={async (auditorId) => {
              console.log('Auditor asignado:', auditorId);
              // Actualizar auditoría en el backend
              const exito = await actualizarAuditoriaBackend(auditoriaSeleccionada.id, {
                auditorLiderId: auditorId
              });
              if (exito) {
                // ✅ Actualizar también el estado local con los datos del auditor
                const auditorSeleccionado = auditoresBackend?.find(a => String(a.id) === String(auditorId));
                if (auditorSeleccionado) {
                  setAuditorias(prev => prev.map(aud => 
                    aud.id === auditoriaSeleccionada.id 
                      ? {
                          ...aud,
                          auditorLiderId: Number(auditorId), // ✅ Guardar también el ID
                          auditorLider: {
                            nombre: auditorSeleccionado.nombre,
                            cargo: auditorSeleccionado.cargo || 'Auditor',
                            iniciales: auditorSeleccionado.nombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                            tipoIdentificacion: 'CC' as const,
                            numeroIdentificacion: ''
                          }
                        } as any
                      : aud
                  ));
                }
                setModalAsignarAuditorOpen(false);
                setAuditoriaSeleccionada(null);
              }
            }}
            auditoresDisponibles={auditoresBackend}
          />
        )}

        {/* MODAL DE CAMBIO DE ESTADO */}
        {auditoriaSeleccionada && (
          <ModalCambiarEstado
            isOpen={modalCambiarEstadoOpen}
            onClose={() => {
              setModalCambiarEstadoOpen(false);
              setAuditoriaSeleccionada(null);
            }}
            auditoriaId={auditoriaSeleccionada.id}
            estadoActual={auditoriaSeleccionada.estado as any}
            onCambiar={(nuevoEstado) => {
              console.log('Estado cambiado:', nuevoEstado);
              handleGuardarCambioEstado(auditoriaSeleccionada.id, nuevoEstado as any, '');
            }}
          />
        )}

        {/* MODAL DE CONFIRMACIÓN (ARCHIVAR / ELIMINAR) */}
        {/* TODO: Crear ModalConfirmacion genérico */}
        {/*auditoriaSeleccionada && (
          <ModalConfirmacionAccionWorldClass
            isOpen={modalConfirmacionOpen}
            onClose={() => {
              setModalConfirmacionOpen(false);
              setAuditoriaSeleccionada(null);
            }}
            auditoria={auditoriaSeleccionada}
            tipoAccion={tipoAccionConfirmacion}
            onConfirmar={handleConfirmarAccion}
          />
        )*/}
      </div>
    </DndProvider>
  );
}
