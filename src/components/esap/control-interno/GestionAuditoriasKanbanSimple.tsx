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
  Download, Columns3, ClipboardCheck, Square, CheckSquare as CheckSquareIcon,
  Maximize2, Minimize2, RefreshCw, UserPlus, Send, FileDown, Archive, Trash2
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
import { ModalFormularioAuditoria } from './ModalFormularioAuditoria';
import { InicioAuditoriaWizard } from './InicioAuditoriaWizard';
import { BarraAccionesLote } from './BarraAccionesLote';
import { ModalAsignarAuditorLote } from './ModalAsignarAuditorLote';
import { LoadingSpinner, CardLoading } from '../../ui/loading-spinner';
import { SkeletonAuditoriaCard, SkeletonKanbanColumn } from '../../ui/skeleton';
import { EmptyState } from '../../ui/empty-state';
import type { AuditoriaFormData } from '../../../utils/validation';

// ============ TIPOS ============

type EstadoAuditoria =
  | 'Planeación'
  | 'Ejecución'
  | 'Comunicación'
  | 'Seguimiento'
  | 'Finalizada';

type RiesgoAuditoria = 'Alto' | 'Medio' | 'Bajo';
type SemaforoColor = 'verde' | 'amarillo' | 'rojo';

interface Persona {
  nombre: string;
  cargo: string;
  iniciales: string;
  tipoIdentificacion: 'CC' | 'CE' | 'TI' | 'PA';
  numeroIdentificacion: string;
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
  objetivos: string[];
  calificacionRiesgo: string;
  documentos: number;
  informes: number;
  tareas: number; // Total de tareas asociadas a la auditoría
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
    objetivos: ['Evaluar cumplimiento normativo', 'Verificar documentación'],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 8,
    informes: 1,
    tareas: 6
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
    objetivos: ['Verificar ejecución presupuestal', 'Auditar procesos contables'],
    calificacionRiesgo: 'Riesgo Alto',
    documentos: 12,
    informes: 2,
    tareas: 8
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
    objetivos: ['Evaluar seguridad informática', 'Revisar backup y recuperación'],
    calificacionRiesgo: 'Riesgo Crítico',
    documentos: 6,
    informes: 1,
    tareas: 5
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
    objetivos: ['Evaluar procesos de selección', 'Verificar cumplimiento laboral'],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 15,
    informes: 3,
    tareas: 10
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
    objetivos: ['Evaluar calidad académica', 'Revisar programas vigentes'],
    calificacionRiesgo: 'Riesgo Bajo',
    documentos: 20,
    informes: 4,
    tareas: 7
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
    objetivos: ['Evaluar condiciones físicas', 'Verificar normativa de seguridad'],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 18,
    informes: 2,
    tareas: 12
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
    objetivos: ['Evaluar gestión de residuos', 'Verificar cumplimiento normativo ambiental'],
    calificacionRiesgo: 'Riesgo Bajo',
    documentos: 22,
    informes: 5,
    tareas: 4
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
    objetivos: ['Evaluar procesos de contratación', 'Verificar cumplimiento legal'],
    calificacionRiesgo: 'Riesgo Alto',
    documentos: 35,
    informes: 8,
    tareas: 15
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
    objetivos: ['Verificar implementación de acciones', 'Evaluar mejoras'],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 28,
    informes: 6,
    tareas: 9
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
    objetivos: ['Verificar mejoras implementadas', 'Evaluar satisfacción'],
    calificacionRiesgo: 'Riesgo Bajo',
    documentos: 16,
    informes: 4,
    tareas: 6
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
    objetivos: ['Evaluar SGC', 'Verificar certificación ISO'],
    calificacionRiesgo: 'Riesgo Moderado',
    documentos: 42,
    informes: 10,
    tareas: 14
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
    objetivos: ['Evaluar mapa de riesgos', 'Verificar controles'],
    calificacionRiesgo: 'Riesgo Alto',
    documentos: 38,
    informes: 9,
    tareas: 11
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
    objetivos: ['Evaluar estrategia de comunicación', 'Verificar canales'],
    calificacionRiesgo: 'Riesgo Bajo',
    documentos: 24,
    informes: 5,
    tareas: 7
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
  seleccionada: boolean;
  onToggleSeleccion: (aud: Auditoria) => void;
  modoSeleccion: boolean;
  // Nuevas acciones individuales
  onCambiarEstado: (aud: Auditoria) => void;
  onAsignarAuditor: (aud: Auditoria) => void;
  onEnviarAprobacion: (aud: Auditoria) => void;
  onExportar: (aud: Auditoria) => void;
  onArchivar: (aud: Auditoria) => void;
  onEliminar: (aud: Auditoria) => void;
}

function TarjetaAuditoria({ 
  auditoria, 
  onVerDetalle, 
  onVerNotas, 
  onVerHistorial, 
  onAprobar,
  seleccionada,
  onToggleSeleccion,
  modoSeleccion,
  onCambiarEstado,
  onAsignarAuditor,
  onEnviarAprobacion,
  onExportar,
  onArchivar,
  onEliminar
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

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: isDragging ? 0.95 : 1 }}
      className="cursor-move touch-none w-full relative"
    >
      <Card 
        className={`bg-white border-2 hover:shadow-md transition-all flex flex-col w-full ${
          seleccionada 
            ? 'border-blue-500 bg-blue-50/30' 
            : 'border-gray-200'
        }`}
        style={{
          height: '560px',
          minHeight: '560px',
          maxHeight: '560px'
        }}
      >
        {/* CHECKBOX DE SELECCIÓN */}
        {modoSeleccion && (
          <div 
            className="absolute top-3 right-3 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onToggleSeleccion(auditoria)}
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                seleccionada
                  ? 'bg-blue-600 border-blue-600'
                  : 'bg-white border-gray-300 hover:border-blue-400'
              }`}
            >
              {seleccionada && (
                <CheckSquareIcon className="w-4 h-4 text-white" />
              )}
            </motion.button>
          </div>
        )}

        {/* Barra superior azul ESAP */}
        <div 
          className="h-1 flex-shrink-0"
          style={{ background: seleccionada ? '#003DA5' : '#003DA5' }}
        />

        <div className="p-2.5 flex-1 flex flex-col overflow-y-auto min-h-0">
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
            {auditoria.hallazgos > 0 && (
              <Badge className="text-xs bg-red-50 text-red-700 border border-red-200 flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3 h-3" />
                {auditoria.hallazgos} hallazgos
              </Badge>
            )}
            {/* Badge de Tareas */}
            <Badge className="text-xs bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1 font-semibold">
              <CheckSquareIcon className="w-3 h-3" />
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
          <div className="pt-2 border-t border-gray-200 mt-auto flex-shrink-0">
            {/* Acción Principal: Ver Expediente */}
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onVerDetalle(auditoria);
              }}
              size="sm"
              className="w-full text-xs font-bold truncate mb-2"
              style={{ background: '#FF6B2C', color: '#FFFFFF' }}
            >
              <Eye className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">Expediente</span>
            </Button>

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
                className="text-xs truncate"
              >
                <History className="w-3 h-3 mr-0.5 flex-shrink-0" />
                Auditoría
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
  auditoriasSeleccionadas: Auditoria[];
  onToggleSeleccion: (aud: Auditoria) => void;
  onSeleccionarTodas: (auditorias: Auditoria[]) => void;
  colapsada?: boolean;
  onToggleColapso?: () => void;
  // Nuevas acciones individuales
  onCambiarEstado: (aud: Auditoria) => void;
  onAsignarAuditor: (aud: Auditoria) => void;
  onEnviarAprobacion: (aud: Auditoria) => void;
  onExportar: (aud: Auditoria) => void;
  onArchivar: (aud: Auditoria) => void;
  onEliminar: (aud: Auditoria) => void;
}

function ColumnaKanban({ 
  columna, 
  auditorias, 
  onVerDetalle, 
  onVerNotas, 
  onVerHistorial, 
  onDrop,
  auditoriasSeleccionadas,
  onToggleSeleccion,
  onSeleccionarTodas,
  colapsada = false,
  onToggleColapso,
  onCambiarEstado,
  onAsignarAuditor,
  onEnviarAprobacion,
  onExportar,
  onArchivar,
  onEliminar
}: ColumnaKanbanProps) {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'auditoria',
    drop: (item: Auditoria) => onDrop(item, columna.id as EstadoAuditoria),
    collect: (monitor) => ({
      isOver: !!monitor.isOver()
    })
  }));

  const todasSeleccionadas = auditorias.length > 0 && 
    auditorias.every(aud => auditoriasSeleccionadas.some(s => s.id === aud.id));

  const handleSeleccionarTodas = () => {
    if (todasSeleccionadas) {
      // Deseleccionar todas de esta columna
      const idsColumna = auditorias.map(a => a.id);
      const nuevasSeleccionadas = auditoriasSeleccionadas.filter(a => !idsColumna.includes(a.id));
      // Necesitamos pasar las auditorías a deseleccionar
      auditorias.forEach(aud => {
        if (auditoriasSeleccionadas.some(s => s.id === aud.id)) {
          onToggleSeleccion(aud);
        }
      });
    } else {
      onSeleccionarTodas(auditorias);
    }
  };

  // Contar auditorías por semáforo
  const auditoriasVerdes = auditorias.filter(a => a.semaforo === 'verde').length;
  const auditoriasAmarillas = auditorias.filter(a => a.semaforo === 'amarillo').length;
  const auditoriasRojas = auditorias.filter(a => a.semaforo === 'rojo').length;

  // Si está colapsada, renderizar versión compacta
  if (colapsada) {
    return (
      <motion.div
        ref={drop}
        className="flex-shrink-0"
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
            
            {/* Botón Seleccionar Todas */}
            {auditorias.length > 0 && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSeleccionarTodas}
                className={`p-1.5 rounded-lg border-2 transition-all ${
                  todasSeleccionadas
                    ? 'bg-blue-600 border-blue-600'
                    : 'bg-white border-gray-300 hover:border-blue-400'
                }`}
                title={todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas'}
              >
                {todasSeleccionadas ? (
                  <CheckSquareIcon className="w-4 h-4 text-white" />
                ) : (
                  <Square className="w-4 h-4 text-gray-600" />
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de Tarjetas */}
      <div
        ref={drop}
        className={`p-3 space-y-3 overflow-y-auto ${isOver ? 'bg-blue-50' : ''}`}
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        <AnimatePresence>
          {auditorias.map((auditoria) => (
            <TarjetaAuditoria
              key={auditoria.id}
              auditoria={auditoria}
              onVerDetalle={onVerDetalle}
              onVerNotas={onVerNotas}
              onVerHistorial={onVerHistorial}
              seleccionada={auditoriasSeleccionadas.some(s => s.id === auditoria.id)}
              onToggleSeleccion={onToggleSeleccion}
              modoSeleccion={auditoriasSeleccionadas.length > 0}
              onCambiarEstado={onCambiarEstado}
              onAsignarAuditor={onAsignarAuditor}
              onEnviarAprobacion={onEnviarAprobacion}
              onExportar={onExportar}
              onArchivar={onArchivar}
              onEliminar={onEliminar}
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
  const [modalAsignarAuditorLoteOpen, setModalAsignarAuditorLoteOpen] = useState(false);
  const [modalInicioAuditoriaOpen, setModalInicioAuditoriaOpen] = useState(false);
  const [auditoriasSeleccionadas, setAuditoriasSeleccionadas] = useState<Auditoria[]>([]);
  const [columnasColapsadas, setColumnasColapsadas] = useState<Set<string>>(new Set());

  // Filtrar auditorías
  const auditoriasFiltradas = auditorias.filter(aud => {
    const cumpleBusqueda = aud.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
                           aud.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const cumpleTerritorial = filtroTerritorial === 'Todas las Territoriales' || aud.territorial === filtroTerritorial;
    return cumpleBusqueda && cumpleTerritorial;
  });

  // Handlers de acciones por lote
  const handleCambiarEstadoLote = (nuevoEstado: string) => {
    setAuditorias(prev =>
      prev.map(aud =>
        auditoriasSeleccionadas.find(s => s.id === aud.id)
          ? { ...aud, estado: nuevoEstado as EstadoAuditoria }
          : aud
      )
    );
    toast.success(`${auditoriasSeleccionadas.length} auditoría(s) movida(s) a ${nuevoEstado}`);
    setAuditoriasSeleccionadas([]);
  };

  const handleAsignarAuditorLote = async (auditorId: string) => {
    // Simulación de asignación
    console.log('Asignar auditor', auditorId, 'a', auditoriasSeleccionadas.length, 'auditorías');
    // En producción haría un POST al backend
  };

  const handleEliminarLote = async () => {
    setAuditorias(prev =>
      prev.filter(aud => !auditoriasSeleccionadas.find(s => s.id === aud.id))
    );
    setAuditoriasSeleccionadas([]);
  };

  const handleExportarLote = () => {
    console.log('Exportar', auditoriasSeleccionadas.length, 'auditorías');
    toast.success(`Exportando ${auditoriasSeleccionadas.length} auditorías...`);
  };

  const handleArchivarLote = async () => {
    console.log('Archivar', auditoriasSeleccionadas.length, 'auditorías');
    toast.success(`${auditoriasSeleccionadas.length} auditoría(s) archivada(s)`);
    setAuditoriasSeleccionadas([]);
  };

  const handleEnviarAprobacionLote = () => {
    console.log('Enviar a aprobación', auditoriasSeleccionadas.length, 'auditorías');
    toast.success(`${auditoriasSeleccionadas.length} auditoría(s) enviada(s) a aprobación`);
    setAuditoriasSeleccionadas([]);
  };

  // Handlers individuales
  const handleVerDetalle = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setModalExpedienteOpen(true);
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

  const handleCrearAuditoria = (data: AuditoriaFormData) => {
    console.log('Crear auditoría:', data);
    // Aquí iría la lógica real de creación
    // Simulación: agregar a la lista de auditorías
    // En producción esto haría un POST al backend
  };

  const handleDrop = (item: Auditoria, nuevoEstado: EstadoAuditoria) => {
    if (item.estado === nuevoEstado) return;

    setAuditorias(prev =>
      prev.map(aud =>
        aud.id === item.id
          ? { ...aud, estado: nuevoEstado }
          : aud
      )
    );

    toast.success(`${item.codigo} movido a ${nuevoEstado}`);
  };

  // ============ HANDLERS INDIVIDUALES PARA ACCIONES DE TARJETA ============

  // Cambiar estado individual - avanza al siguiente estado
  const handleCambiarEstado = (auditoria: Auditoria) => {
    const estadosOrden: EstadoAuditoria[] = [
      'Planeación',
      'Ejecución',
      'Comunicación',
      'Seguimiento',
      'Finalizada'
    ];
    
    const indiceActual = estadosOrden.indexOf(auditoria.estado);
    if (indiceActual < estadosOrden.length - 1) {
      const nuevoEstado = estadosOrden[indiceActual + 1];
      setAuditorias(prev =>
        prev.map(aud =>
          aud.id === auditoria.id
            ? { ...aud, estado: nuevoEstado }
            : aud
        )
      );
      toast.success(`${auditoria.codigo} avanzó a ${nuevoEstado}`, {
        description: `Estado anterior: ${auditoria.estado}`
      });
    }
  };

  // Asignar auditor individual
  const handleAsignarAuditor = (auditoria: Auditoria) => {
    setAuditoriaSeleccionada(auditoria);
    setAuditoriasSeleccionadas([auditoria]);
    setModalAsignarAuditorLoteOpen(true);
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

  // Archivar individual
  const handleArchivar = (auditoria: Auditoria) => {
    if (window.confirm(`¿Archivar la auditoría ${auditoria.codigo}?\n\nEsta auditoría se moverá al archivo histórico.`)) {
      setAuditorias(prev => prev.filter(aud => aud.id !== auditoria.id));
      toast.success(`${auditoria.codigo} archivada`, {
        description: 'La auditoría se movió al archivo histórico'
      });
    }
  };

  // Eliminar individual
  const handleEliminar = (auditoria: Auditoria) => {
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

  // ============ FIN HANDLERS INDIVIDUALES ============

  const handleToggleSeleccion = (auditoria: Auditoria) => {
    if (auditoriasSeleccionadas.includes(auditoria)) {
      setAuditoriasSeleccionadas(prev => prev.filter(a => a.id !== auditoria.id));
    } else {
      setAuditoriasSeleccionadas(prev => [...prev, auditoria]);
    }
  };

  const handleSeleccionarTodas = (auditorias: Auditoria[]) => {
    setAuditoriasSeleccionadas(prev => [...prev, ...auditorias]);
  };

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

  // Colapsar/Expandir todas las columnas
  const toggleTodasColumnas = () => {
    if (columnasColapsadas.size > 0) {
      // Si hay columnas colapsadas, expandir todas
      setColumnasColapsadas(new Set());
      toast.success('Columnas expandidas', {
        description: 'Todas las columnas ahora están visibles'
      });
    } else {
      // Si todas están expandidas, colapsar todas
      const todasLasEtapas = COLUMNAS_KANBAN.map(e => e.id);
      setColumnasColapsadas(new Set(todasLasEtapas));
      toast.success('Columnas colapsadas', {
        description: 'Espacio optimizado en el tablero'
      });
    }
  };

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
              Tablero Kanban Operativo
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Gestión visual del flujo de auditorías
            </p>
          </div>

          {/* Botones de Vista */}
          <div className="flex items-center gap-2">
            {/* Botón Expandir/Colapsar Todo - Solo en vista Kanban */}
            {vistaActiva === 'kanban' && (
              <button
                onClick={toggleTodasColumnas}
                className="px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-semibold transition-all hover:bg-gray-100 border-2 border-gray-300 hover:border-orange-400"
                style={{ color: '#F97316' }}
                title={columnasColapsadas.size > 0 ? 'Expandir todas las columnas' : 'Colapsar todas las columnas'}
              >
                {columnasColapsadas.size > 0 ? (
                  <>
                    <Maximize2 className="w-4 h-4" />
                    Expandir
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-4 h-4" />
                    Colapsar
                  </>
                )}
              </button>
            )}

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
            <Button 
              className="gap-2" 
              style={{ background: '#F97316' }}
              onClick={() => setModalFormularioOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Nueva Auditoría
            </Button>
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
          <Button 
            className="gap-2" 
            style={{ background: '#DC2626' }}
            onClick={() => setModalFormularioOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Nueva Auditoría
          </Button>
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
                    auditoriasSeleccionadas={auditoriasSeleccionadas}
                    onToggleSeleccion={handleToggleSeleccion}
                    onSeleccionarTodas={handleSeleccionarTodas}
                    colapsada={columnasColapsadas.has(columna.id)}
                    onToggleColapso={() => toggleColumnaColapsada(columna.id)}
                    onCambiarEstado={handleCambiarEstado}
                    onAsignarAuditor={handleAsignarAuditor}
                    onEnviarAprobacion={handleEnviarAprobacion}
                    onExportar={handleExportar}
                    onArchivar={handleArchivar}
                    onEliminar={handleEliminar}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* VISTA LISTA */}
        {vistaActiva === 'lista' && (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Título</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Progreso</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditoriasFiltradas.map((auditoria) => (
                    <tr key={auditoria.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Badge variant="outline">{auditoria.codigo}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-gray-900">{auditoria.titulo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{auditoria.estado}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full bg-blue-500"
                              style={{ width: `${auditoria.progreso}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{auditoria.progreso}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleVerDetalle(auditoria)}>
                            <Eye className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* MODAL DE EXPEDIENTE */}
        <ModalExpedienteAuditoria
          auditoria={auditoriaSeleccionada}
          open={modalExpedienteOpen}
          onClose={() => {
            setModalExpedienteOpen(false);
            setAuditoriaSeleccionada(null);
          }}
        />

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

        {/* MODAL DE FORMULARIO */}
        <ModalFormularioAuditoria
          open={modalFormularioOpen}
          onClose={() => {
            setModalFormularioOpen(false);
            setAuditoriaSeleccionada(null);
          }}
          onSubmit={handleCrearAuditoria}
          mode="create"
        />

        {/* MODAL DE ASIGNAR AUDITOR LOTE */}
        <ModalAsignarAuditorLote
          open={modalAsignarAuditorLoteOpen}
          onClose={() => {
            setModalAsignarAuditorLoteOpen(false);
            setAuditoriasSeleccionadas([]);
          }}
          auditorias={auditoriasSeleccionadas.map(aud => ({
            id: aud.id,
            codigo: aud.codigo,
            titulo: aud.titulo,
            auditorActual: aud.auditorAsignado.nombre
          }))}
          onAsignar={handleAsignarAuditorLote}
        />

        {/* BARRA DE ACCIONES LOTE */}
        <BarraAccionesLote
          cantidadSeleccionados={auditoriasSeleccionadas.length}
          onCancelarSeleccion={() => setAuditoriasSeleccionadas([])}
          onCambiarEstado={handleCambiarEstadoLote}
          onAsignarAuditor={() => setModalAsignarAuditorLoteOpen(true)}
          onEliminar={handleEliminarLote}
          onExportar={handleExportarLote}
          onArchivar={handleArchivarLote}
          onEnviarAprobacion={handleEnviarAprobacionLote}
        />

        {/* MODAL INICIO DE AUDITORÍA - RF004 */}
        {modalInicioAuditoriaOpen && (
          <InicioAuditoriaWizard
            onClose={() => setModalInicioAuditoriaOpen(false)}
            onComplete={(auditoriaId) => {
              setModalInicioAuditoriaOpen(false);
              toast.success('Auditoría iniciada exitosamente');
            }}
          />
        )}
      </div>
    </DndProvider>
  );
}