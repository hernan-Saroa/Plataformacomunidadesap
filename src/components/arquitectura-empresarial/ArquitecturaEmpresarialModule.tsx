/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * MÓDULO ULTRA COMPLETO: ARQUITECTURA EMPRESARIAL MRAE MinTIC Colombia v3.0
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * CUMPLIMIENTO 100% DEL DOCUMENTO OFICIAL MINTIC
 * Documento: https://mintic.gov.co/arquitecturaempresarial/630/articles-204807_recurso_2.pdf
 * Versión: MRAE v3.0 - Mayo 2023
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * ESTRUCTURA OFICIAL DEL MRAE v3.0
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 🎯 TRES MODELOS PRINCIPALES:
 * 
 * 1️⃣ MAE - MODELO DE ARQUITECTURA EMPRESARIAL
 *    ├─ Proceso de AE (8 lineamientos)
 *    ├─ Arquitectura Institucional (4 lineamientos)
 *    ├─ Arquitectura de Información (4 lineamientos)
 *    ├─ Arquitectura de Sistemas de Información (3 lineamientos)
 *    ├─ Arquitectura de Tecnología (4 lineamientos)
 *    ├─ Arquitectura de Seguridad (4 lineamientos)
 *    └─ Uso y Apropiación de AE (2 lineamientos)
 * 
 * 2️⃣ MGGTI - MODELO DE GESTIÓN Y GOBIERNO DE TI
 *    ├─ Estrategia de TI (9 lineamientos)
 *    ├─ Gobierno de TI (10 lineamientos)
 *    ├─ Gestión de Información (8 lineamientos)
 *    ├─ Gestión de Sistemas de Información (14 lineamientos)
 *    ├─ Gestión de Servicios de TI (14 lineamientos)
 *    ├─ Gestión de Seguridad (4 lineamientos)
 *    └─ Uso y Apropiación de TI (4 lineamientos)
 * 
 * 3️⃣ MGPTI - MODELO DE GESTIÓN DE PROYECTOS DE TI
 *    ├─ Contexto Estratégico (6 lineamientos)
 *    ├─ Planeación (2 lineamientos)
 *    ├─ Ejecución y Control (4 lineamientos)
 *    └─ Cierre (2 lineamientos)
 * 
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TOTAL: 100+ LINEAMIENTOS OFICIALES MINTIC
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * 📋 12 PRINCIPIOS TRANSVERSALES DEL MRAE:
 * PRI_01 - Excelencia en los servicios
 * PRI_02 - Valor público e impacto Social
 * PRI_03 - La Tecnología como habilitador estratégico
 * PRI_04 - Información como activo estratégico
 * PRI_05 - Racionalización y reutilización
 * PRI_06 - Estandarización
 * PRI_07 - Interoperabilidad
 * PRI_08 - Seguridad Digital
 * PRI_09 - Sostenibilidad ambiental
 * PRI_10 - Neutralidad tecnológica
 * PRI_11 - Innovación pública
 * PRI_12 - Co-Creación
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Layout,
  Target,
  Database,
  Server,
  Laptop,
  Users,
  TrendingUp,
  Activity,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  BarChart3,
  Settings,
  Building2,
  Shield,
  GitBranch,
  Layers,
  Box,
  Workflow,
  MapPin,
  Filter,
  FolderKanban,
  BookOpen,
  AlertTriangle,
  Lock,
  Download,
  Upload,
  Plus,
  Search,
  X,
  Eye,
  Edit,
  Trash2,
  ChevronRight,
  Calendar,
  Tag,
  MessageSquare,
  ExternalLink,
  Zap,
  Award,
  Bell,
  RefreshCw,
  FileCheck,
  Clipboard,
  Share2,
  Grid,
  List,
  BarChart,
  PieChart,
  LineChart,
  GitMerge,
  Folder,
  File,
  Archive,
  UserCheck,
  ShieldCheck,
  CheckSquare,
  AlertOctagon,
  Info,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  PlayCircle,
  Pause,
  CircleDot
} from 'lucide-react';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner@2.0.3';
import { LINEAMIENTOS_MGGTI, getEstadisticasMGGTI, type DominioMGGTI } from '../../lib/data/lineamientos-mggti';
import { LINEAMIENTOS_MGPTI, getEstadisticasMGPTI, type DominioMGPTI } from '../../lib/data/lineamientos-mgpti';
import { MatrizCumplimientoGlobal } from './MatrizCumplimientoGlobal';
import { VistaDetalladaMGGTI } from './VistaDetalladaMGGTI';
import { VistaDetalladaMGPTI } from './VistaDetalladaMGPTI';
import { TodosLosLineamientos } from './TodosLosLineamientos';
import { GestionEvidencias } from './GestionEvidencias';
import { IntegracionPortalTransaccional } from './IntegracionPortalTransaccional';

interface ArquitecturaEmpresarialModuleProps {
  userRole?: string;
  canEdit?: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIPOS Y DEFINICIONES OFICIALES DEL MRAE v3.0
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type ModeloMRAE = 'MAE' | 'MGGTI' | 'MGPTI';
type ViewMode = 'dashboard' | 'modelo' | 'lineamientos-globales' | 'matriz-cumplimiento' | 'evidencias' | 'mis-tareas' | 'reporteria';

// Lineamientos MAE
type LineamientoMAE = 
  | 'MAE.LI.PA.01' | 'MAE.LI.PA.02' | 'MAE.LI.PA.03' | 'MAE.LI.PA.04' | 'MAE.LI.PA.05' | 'MAE.LI.PA.06' | 'MAE.LI.PA.07' | 'MAE.LI.PA.08'
  | 'MAE.LI.AIN.01' | 'MAE.LI.AIN.02' | 'MAE.LI.AIN.03' | 'MAE.LI.AIN.04'
  | 'MAE.LI.AI.01' | 'MAE.LI.AI.02' | 'MAE.LI.AI.03' | 'MAE.LI.AI.04'
  | 'MAE.LI.ASI.01' | 'MAE.LI.ASI.02' | 'MAE.LI.ASI.03'
  | 'MAE.LI.AT.01' | 'MAE.LI.AT.02' | 'MAE.LI.AT.03' | 'MAE.LI.AT.04'
  | 'MAE.LI.AS.01' | 'MAE.LI.AS.02' | 'MAE.LI.AS.03' | 'MAE.LI.AS.04'
  | 'MAE.LI.UA.01' | 'MAE.LI.UA.02';

// Dominios MAE
type DominioMAE = 
  | 'proceso-ae'
  | 'arquitectura-institucional'
  | 'arquitectura-informacion'
  | 'arquitectura-sistemas'
  | 'arquitectura-tecnologia'
  | 'arquitectura-seguridad'
  | 'uso-apropiacion-ae';

// Dominios MGGTI
type DominioMGGTI =
  | 'estrategia-ti'
  | 'gobierno-ti'
  | 'gestion-informacion'
  | 'gestion-sistemas'
  | 'gestion-servicios-ti'
  | 'gestion-seguridad'
  | 'uso-apropiacion-ti';

// Dominios MGPTI
type DominioMGPTI =
  | 'contexto-estrategico'
  | 'planeacion'
  | 'ejeccion-control'
  | 'cierre';

interface Lineamiento {
  codigo: string;
  nombre: string;
  descripcion: string;
  evidencias: string[];
  estado: 'Completo' | 'En Progreso' | 'Pendiente' | 'No Aplica';
  progreso: number;
  responsable: string;
  fechaActualizacion: string;
  prioridad: 'Crítica' | 'Alta' | 'Media' | 'Baja';
  obligatorio: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DATA: LINEAMIENTOS COMPLETOS DEL MAE (según documento oficial)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_MAE: Record<DominioMAE, Lineamiento[]> = {
  'proceso-ae': [
    {
      codigo: 'MAE.LI.PA.01',
      nombre: 'Evaluación del nivel de madurez',
      descripcion: 'Las entidades deben realizar la evaluación del nivel de madurez de las capacidades actuales con las que cuenta la entidad para realizar los ejercicios de Arquitectura Empresarial.',
      evidencias: ['Resultado de la evaluación del nivel de madurez de AE en la entidad'],
      estado: 'En Progreso',
      progreso: 70,
      responsable: 'Arquitectura Empresarial',
      fechaActualizacion: '2025-12-05',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.PA.02',
      nombre: 'Planeación de los ejercicios de AE',
      descripcion: 'Las entidades deben realizar la planeación de la Arquitectura Empresarial mediante la definición de ejercicios de arquitectura.',
      evidencias: ['Plan de desarrollo de los ejercicios de AE', 'Descripción de cada ejercicio', 'Principios de la AE'],
      estado: 'En Progreso',
      progreso: 85,
      responsable: 'Director de AE',
      fechaActualizacion: '2025-12-07',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.PA.03',
      nombre: 'Gobierno y capacidad de Arquitectura Empresarial',
      descripcion: 'Las entidades deben instaurar la capacidad para planear, desarrollar, mantener y evolucionar la Arquitectura Empresarial.',
      evidencias: ['Proceso de AE formalizado', 'Evidencia de responsables de AE', 'Creación del comité de AE'],
      estado: 'Completo',
      progreso: 100,
      responsable: 'Dirección de TI',
      fechaActualizacion: '2025-11-20',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.PA.04',
      nombre: 'Visión de la arquitectura',
      descripcion: 'Las entidades deben construir la visión de la arquitectura de cada ejercicio de Arquitectura Empresarial.',
      evidencias: ['Visión de la arquitectura'],
      estado: 'En Progreso',
      progreso: 75,
      responsable: 'Arquitectura Empresarial',
      fechaActualizacion: '2025-12-03',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.PA.05',
      nombre: 'Definición de la Arquitectura Empresarial',
      descripcion: 'Las entidades deben definir la Arquitectura Empresarial mediante la ejecución de los ejercicios de AE.',
      evidencias: ['Ejercicios de AE', 'Descripción de arquitectura por dominio', 'Hoja de Ruta de AE'],
      estado: 'En Progreso',
      progreso: 68,
      responsable: 'Equipo de AE',
      fechaActualizacion: '2025-12-06',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.PA.06',
      nombre: 'Matriz de interesados de la AE',
      descripcion: 'Las entidades deben contar con una matriz de caracterización de interesados.',
      evidencias: ['Matriz de interesados actualizada'],
      estado: 'Completo',
      progreso: 100,
      responsable: 'Gestión de Proyectos',
      fechaActualizacion: '2025-11-15',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.PA.07',
      nombre: 'Hoja de ruta de la Arquitectura Empresarial',
      descripcion: 'Las entidades deben consolidar el resultado de cada ejercicio de arquitectura empresarial en una hoja de ruta.',
      evidencias: ['Hoja de ruta de la AE'],
      estado: 'En Progreso',
      progreso: 80,
      responsable: 'Arquitectura Empresarial',
      fechaActualizacion: '2025-12-07',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.PA.08',
      nombre: 'Repositorio AE',
      descripcion: 'Las entidades deben contar con un repositorio de Arquitectura Empresarial.',
      evidencias: ['Herramienta de AE implementada', 'Repositorio con estructura de carpetas'],
      estado: 'En Progreso',
      progreso: 60,
      responsable: 'Infraestructura TI',
      fechaActualizacion: '2025-11-30',
      prioridad: 'Media',
      obligatorio: true
    }
  ],
  'arquitectura-institucional': [
    {
      codigo: 'MAE.LI.AIN.01',
      nombre: 'Estimación financiera y modelo de planeación Institucional',
      descripcion: 'Las entidades deben realizar la estimación financiera y armonizarla con el modelo financiero institucional.',
      evidencias: ['Estimación financiera de costos de implementación de hoja de ruta'],
      estado: 'En Progreso',
      progreso: 55,
      responsable: 'Planeación Financiera',
      fechaActualizacion: '2025-12-02',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AIN.02',
      nombre: 'Modelo capacidades institucionales',
      descripcion: 'Las entidades deben identificar las capacidades institucionales y mantener actualizado el mapa de capacidades.',
      evidencias: ['Mapa de capacidades institucionales'],
      estado: 'En Progreso',
      progreso: 72,
      responsable: 'Gestión Estratégica',
      fechaActualizacion: '2025-12-05',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AIN.03',
      nombre: 'Modelo operativo institucional',
      descripcion: 'Las entidades deben realizar el entendimiento preciso del Modelo operativo de la entidad.',
      evidencias: ['Modelo operativo actualizado'],
      estado: 'Completo',
      progreso: 100,
      responsable: 'Procesos',
      fechaActualizacion: '2025-10-15',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AIN.04',
      nombre: 'Modelo de servicios institucionales',
      descripcion: 'Las entidades deben identificar la situación actual de los servicios impactados por el ejercicio de AE.',
      evidencias: ['Catálogo de servicios institucionales actualizado'],
      estado: 'En Progreso',
      progreso: 78,
      responsable: 'Gestión de Servicios',
      fechaActualizacion: '2025-12-06',
      prioridad: 'Alta',
      obligatorio: true
    }
  ],
  'arquitectura-informacion': [
    {
      codigo: 'MAE.LI.AI.01',
      nombre: 'Flujos de información',
      descripcion: 'Las entidades deben definir y mantener actualizado el catálogo de flujos de información.',
      evidencias: ['Catálogo de Flujos de Información', 'Diagramas de flujos'],
      estado: 'En Progreso',
      progreso: 65,
      responsable: 'Arquitectura de Datos',
      fechaActualizacion: '2025-12-04',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AI.02',
      nombre: 'Arquitectura de Información',
      descripcion: 'Las entidades deben modelar, describir y mantener actualizada la arquitectura de información.',
      evidencias: ['Documento de arquitectura de información', 'Diagrama de componentes', 'Servicios de intercambio', 'Datos abiertos'],
      estado: 'En Progreso',
      progreso: 70,
      responsable: 'Gestión de Información',
      fechaActualizacion: '2025-12-05',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AI.03',
      nombre: 'Intercambio de Información entre entidades',
      descripcion: 'Las entidades deben identificar la información a compartir y diseñar la arquitectura de intercambio.',
      evidencias: ['Necesidades de intercambio documentadas', 'Servicios de información caracterizados'],
      estado: 'En Progreso',
      progreso: 58,
      responsable: 'Interoperabilidad',
      fechaActualizacion: '2025-11-28',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AI.04',
      nombre: 'Modelo de Información Institucional',
      descripcion: 'Las entidades deben contar con un Modelo de Información Institucional.',
      evidencias: ['Modelo de Información Institucional', 'Diagrama de integración de datos'],
      estado: 'En Progreso',
      progreso: 75,
      responsable: 'Arquitectura de Datos',
      fechaActualizacion: '2025-12-06',
      prioridad: 'Crítica',
      obligatorio: true
    }
  ],
  'arquitectura-sistemas': [
    {
      codigo: 'MAE.LI.ASI.01',
      nombre: 'Arquitecturas de referencia para soluciones',
      descripcion: 'Las entidades deben definir, evolucionar y aplicar las arquitecturas de referencia.',
      evidencias: ['Documento de Arquitectura de Referencia', 'Modelo de alto nivel de SI'],
      estado: 'En Progreso',
      progreso: 68,
      responsable: 'Arquitectura de Software',
      fechaActualizacion: '2025-12-05',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.ASI.02',
      nombre: 'Arquitecturas de solución de sistemas de información',
      descripcion: 'Las entidades deben garantizar la definición y documentación de las arquitecturas de solución.',
      evidencias: ['Arquitecturas de Solución de proyectos de SI'],
      estado: 'En Progreso',
      progreso: 72,
      responsable: 'Desarrollo',
      fechaActualizacion: '2025-12-06',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.ASI.03',
      nombre: 'Caracterización de los sistemas de información',
      descripcion: 'Las entidades deben realizar la caracterización de cada uno de sus sistemas de información.',
      evidencias: ['Caracterización de SI', 'Catálogos y matrices actualizados'],
      estado: 'En Progreso',
      progreso: 85,
      responsable: 'Gestión de Aplicaciones',
      fechaActualizacion: '2025-12-07',
      prioridad: 'Crítica',
      obligatorio: true
    }
  ],
  'arquitectura-tecnologia': [
    {
      codigo: 'MAE.LI.AT.01',
      nombre: 'Catálogo de elementos de infraestructura',
      descripcion: 'Las entidades deben contar con un catálogo actualizado de sus elementos de infraestructura tecnológica.',
      evidencias: ['Catálogo de Elementos de Infraestructura actualizado'],
      estado: 'En Progreso',
      progreso: 78,
      responsable: 'Infraestructura TI',
      fechaActualizacion: '2025-12-06',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AT.02',
      nombre: 'Plataforma de interoperabilidad del Estado',
      descripcion: 'Las entidades deben incluir elementos necesarios para realizar el intercambio de información.',
      evidencias: ['Artefactos con elementos de plataforma de interoperabilidad'],
      estado: 'En Progreso',
      progreso: 60,
      responsable: 'Interoperabilidad',
      fechaActualizacion: '2025-12-03',
      prioridad: 'Media',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AT.03',
      nombre: 'Continuidad y disponibilidad de infraestructura',
      descripcion: 'Las entidades deben identificar requerimientos de continuidad y disponibilidad.',
      evidencias: ['Diagrama de despliegue', 'Plan de continuidad actualizado', 'Mapa de capacidades de atención'],
      estado: 'En Progreso',
      progreso: 65,
      responsable: 'Continuidad del Negocio',
      fechaActualizacion: '2025-12-04',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AT.04',
      nombre: 'Arquitecturas de referencia tecnológica',
      descripcion: 'Las entidades deben definir, evolucionar o aplicar arquitecturas de referencia tecnológica.',
      evidencias: ['Arquitectura de referencia con artefactos completos'],
      estado: 'En Progreso',
      progreso: 62,
      responsable: 'Arquitectura Infraestructura',
      fechaActualizacion: '2025-12-02',
      prioridad: 'Alta',
      obligatorio: true
    }
  ],
  'arquitectura-seguridad': [
    {
      codigo: 'MAE.LI.AS.01',
      nombre: 'Catálogo de servicios de seguridad',
      descripcion: 'Las entidades deben contar con un catálogo de servicios de seguridad.',
      evidencias: ['Catálogo de servicios de seguridad actualizado'],
      estado: 'En Progreso',
      progreso: 75,
      responsable: 'CISO',
      fechaActualizacion: '2025-12-05',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AS.02',
      nombre: 'Análisis de impacto del negocio',
      descripcion: 'Las entidades deben realizar el análisis de impacto de negocio.',
      evidencias: ['Informe de análisis de impacto de negocio'],
      estado: 'En Progreso',
      progreso: 68,
      responsable: 'Continuidad del Negocio',
      fechaActualizacion: '2025-12-03',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AS.03',
      nombre: 'Arquitectura de Seguridad',
      descripcion: 'Las entidades deben definir, evolucionar y aplicar una arquitectura de seguridad.',
      evidencias: ['Arquitectura de seguridad con artefactos completos'],
      estado: 'En Progreso',
      progreso: 80,
      responsable: 'Seguridad de la Información',
      fechaActualizacion: '2025-12-06',
      prioridad: 'Crítica',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.AS.04',
      nombre: 'Ciberseguridad',
      descripcion: 'Las entidades deben diseñar los controles de seguridad informática.',
      evidencias: ['Controles de seguridad identificados e implementados'],
      estado: 'En Progreso',
      progreso: 85,
      responsable: 'SOC',
      fechaActualizacion: '2025-12-07',
      prioridad: 'Crítica',
      obligatorio: true
    }
  ],
  'uso-apropiacion-ae': [
    {
      codigo: 'MAE.LI.UA.01',
      nombre: 'Estrategia de Uso y apropiación',
      descripcion: 'Las entidades deben definir una estrategia que promueva el involucramiento de todas las partes interesadas.',
      evidencias: ['Estrategia de gestión de cambio', 'Plan de comunicaciones', 'Plan de capacitación', 'Esquema de seguimiento'],
      estado: 'En Progreso',
      progreso: 70,
      responsable: 'Gestión del Cambio',
      fechaActualizacion: '2025-12-05',
      prioridad: 'Alta',
      obligatorio: true
    },
    {
      codigo: 'MAE.LI.UA.02',
      nombre: 'Implementación de Estrategia de Uso y Apropiación',
      descripcion: 'Las entidades deben implementar, monitorear, evaluar y mejorar la Estrategia de Uso y Apropiación.',
      evidencias: ['Evidencias de ejecución de actividades', 'Medición de indicadores', 'Análisis y propuestas de mejora'],
      estado: 'En Progreso',
      progreso: 65,
      responsable: 'Gestión del Cambio',
      fechaActualizacion: '2025-12-04',
      prioridad: 'Alta',
      obligatorio: true
    }
  ]
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COMPONENTE PRINCIPAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function ArquitecturaEmpresarialModule({ 
  userRole = 'admin',
  canEdit = true 
}: ArquitecturaEmpresarialModuleProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [selectedModelo, setSelectedModelo] = useState<ModeloMRAE | null>(null);
  const [selectedDominioMAE, setSelectedDominioMAE] = useState<DominioMAE | null>(null);
  const [expandedDominio, setExpandedDominio] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Definición de los 3 MODELOS OFICIALES del MRAE v3.0
  const modelos = [
    {
      id: 'MAE' as ModeloMRAE,
      nombre: 'MAE - Modelo de Arquitectura Empresarial',
      descripcion: 'Define ejercicios de AE que facilitan transformaciones institucionales',
      icon: Layout,
      color: '#3B82F6',
      bgColor: '#EFF6FF',
      dominios: 7,
      lineamientos: 29,
      guias: 7,
      prioridad: 'Crítica'
    },
    {
      id: 'MGGTI' as ModeloMRAE,
      nombre: 'MGGTI - Modelo de Gestión y Gobierno de TI',
      descripcion: 'Orienta la gestión y gobierno de tecnologías de información',
      icon: Shield,
      color: '#9333EA',
      bgColor: '#F3E8FF',
      dominios: 7,
      lineamientos: 63,
      guias: 7,
      prioridad: 'Crítica'
    },
    {
      id: 'MGPTI' as ModeloMRAE,
      nombre: 'MGPTI - Modelo de Gestión de Proyectos de TI',
      descripcion: 'Facilita la gestión integral de proyectos con componentes de TI',
      icon: FolderKanban,
      color: '#059669',
      bgColor: '#D1FAE5',
      dominios: 4,
      lineamientos: 14,
      guias: 4,
      prioridad: 'Alta'
    }
  ];

  // Dominios del MAE (según documento oficial)
  const dominiosMAE = [
    {
      id: 'proceso-ae' as DominioMAE,
      nombre: 'Proceso de AE',
      icon: Workflow,
      descripcion: 'Proceso formalizado y sistemático de Arquitectura Empresarial',
      color: '#3B82F6',
      lineamientos: 8
    },
    {
      id: 'arquitectura-institucional' as DominioMAE,
      nombre: 'Arquitectura Institucional',
      icon: Building2,
      descripcion: 'Capacidades, procesos y servicios institucionales',
      color: '#9333EA',
      lineamientos: 4
    },
    {
      id: 'arquitectura-informacion' as DominioMAE,
      nombre: 'Arquitectura de Información',
      icon: Database,
      descripcion: 'Estructura, flujos y gestión de información',
      color: '#F59E0B',
      lineamientos: 4
    },
    {
      id: 'arquitectura-sistemas' as DominioMAE,
      nombre: 'Arquitectura de Sistemas de Información',
      icon: Server,
      descripcion: 'Aplicaciones y soluciones tecnológicas',
      color: '#059669',
      lineamientos: 3
    },
    {
      id: 'arquitectura-tecnologia' as DominioMAE,
      nombre: 'Arquitectura de Tecnología',
      icon: Laptop,
      descripcion: 'Infraestructura y servicios tecnológicos',
      color: '#06B6D4',
      lineamientos: 4
    },
    {
      id: 'arquitectura-seguridad' as DominioMAE,
      nombre: 'Arquitectura de Seguridad',
      icon: Lock,
      descripcion: 'Seguridad y protección de información',
      color: '#EF4444',
      lineamientos: 4
    },
    {
      id: 'uso-apropiacion-ae' as DominioMAE,
      nombre: 'Uso y Apropiación de AE',
      icon: Users,
      descripcion: 'Adopción y apropiación de la práctica de AE',
      color: '#EC4899',
      lineamientos: 2
    }
  ];

  // Calcular estadísticas globales
  const stats = useMemo(() => {
    const totalLineamientos = Object.values(LINEAMIENTOS_MAE).flat().length;
    const lineamientosCompletos = Object.values(LINEAMIENTOS_MAE).flat().filter(l => l.estado === 'Completo').length;
    const lineamientosEnProgreso = Object.values(LINEAMIENTOS_MAE).flat().filter(l => l.estado === 'En Progreso').length;
    const lineamientosObligatorios = Object.values(LINEAMIENTOS_MAE).flat().filter(l => l.obligatorio).length;
    const lineamientosObligatoriosCompletos = Object.values(LINEAMIENTOS_MAE).flat().filter(l => l.obligatorio && l.estado === 'Completo').length;
    
    const complianceObligatorios = lineamientosObligatorios > 0 
      ? (lineamientosObligatoriosCompletos / lineamientosObligatorios) * 100 
      : 0;

    const progresoPromedio = Object.values(LINEAMIENTOS_MAE).flat().reduce((sum, l) => sum + l.progreso, 0) / totalLineamientos;

    return {
      totalLineamientos,
      lineamientosCompletos,
      lineamientosEnProgreso,
      lineamientosObligatorios,
      lineamientosObligatoriosCompletos,
      complianceObligatorios: Math.round(complianceObligatorios),
      progresoPromedio: progresoPromedio.toFixed(1),
      dominiosMAE: dominiosMAE.length,
      totalModelos: modelos.length
    };
  }, []);

  const getEstadoBadge = (estado: string) => {
    const config: Record<string, { bg: string; text: string; icon: any }> = {
      'Completo': { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle },
      'En Progreso': { bg: '#DBEAFE', text: '#1E40AF', icon: Clock },
      'Pendiente': { bg: '#FEF3C7', text: '#92400E', icon: AlertCircle },
      'No Aplica': { bg: '#F3F4F6', text: '#6B7280', icon: X }
    };
    const style = config[estado] || config['Pendiente'];
    const Icon = style.icon;
    return (
      <Badge
        className="border-0 text-xs"
        style={{
          background: style.bg,
          color: style.text,
          fontWeight: 600
        }}
      >
        <Icon className="w-3 h-3 mr-1" />
        {estado}
      </Badge>
    );
  };

  const getPrioridadBadge = (prioridad: string) => {
    const config: Record<string, { bg: string; text: string }> = {
      'Crítica': { bg: '#FEE2E2', text: '#991B1B' },
      'Alta': { bg: '#FEF3C7', text: '#92400E' },
      'Media': { bg: '#DBEAFE', text: '#1E40AF' },
      'Baja': { bg: '#F3F4F6', text: '#6B7280' }
    };
    const style = config[prioridad] || config.Media;
    return (
      <Badge
        className="border-0 text-xs"
        style={{
          background: style.bg,
          color: style.text,
          fontWeight: 600
        }}
      >
        {prioridad}
      </Badge>
    );
  };

  // Vista del Dashboard Principal
  const DashboardView = () => (
    <div className="space-y-6">
      {/* Sección: 3 Modelos del MRAE */}
      <div>
        <h2 className="font-bold mb-4" style={{ fontSize: '20px', color: '#1F2937' }}>
          Tres Modelos del MRAE v3.0
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Marco de Referencia de Arquitectura Empresarial del Estado Colombiano - MinTIC 2023
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modelos.map((modelo) => {
            const Icon = modelo.icon;
            return (
              <motion.div
                key={modelo.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className="p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer overflow-hidden"
                  onClick={() => {
                    setSelectedModelo(modelo.id);
                    setViewMode('modelo');
                  }}
                >
                  {/* Header del modelo */}
                  <div 
                    className="p-4 -mx-5 -mt-5 mb-4"
                    style={{ background: modelo.bgColor }}
                  >
                    <div className="flex items-start justify-between">
                      <div 
                        className="p-3 rounded-xl"
                        style={{ background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                      >
                        <Icon className="w-6 h-6" style={{ color: modelo.color }} />
                      </div>
                      {getPrioridadBadge(modelo.prioridad)}
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 mb-2">
                    {modelo.nombre}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {modelo.descripcion}
                  </p>

                  {/* Métricas del modelo */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: modelo.color }}>
                        {modelo.dominios}
                      </p>
                      <p className="text-xs text-gray-600">Dominios</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: modelo.color }}>
                        {modelo.lineamientos}
                      </p>
                      <p className="text-xs text-gray-600">Lineamientos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold" style={{ color: modelo.color }}>
                        {modelo.guias}
                      </p>
                      <p className="text-xs text-gray-600">Guías</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button
                      variant="ghost"
                      className="w-full gap-2"
                      style={{ color: modelo.color }}
                    >
                      Ver detalles
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Sección: Vista detallada MAE */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold" style={{ fontSize: '18px', color: '#1F2937' }}>
              MAE - Dominios de Arquitectura Empresarial
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {stats.totalLineamientos} lineamientos distribuidos en {stats.dominiosMAE} dominios
            </p>
          </div>
          <Badge
            className="border-0"
            style={{
              background: '#D1FAE5',
              color: '#065F46',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {stats.lineamientosCompletos} Completos
          </Badge>
        </div>

        {/* Grid de dominios MAE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dominiosMAE.map((dominio) => {
            const Icon = dominio.icon;
            const lineamientos = LINEAMIENTOS_MAE[dominio.id] || [];
            const lineamientosCompletos = lineamientos.filter(l => l.estado === 'Completo').length;
            const progreso = lineamientos.length > 0 ? (lineamientosCompletos / lineamientos.length) * 100 : 0;
            const isExpanded = expandedDominio === dominio.id;

            return (
              <Card key={dominio.id} className="border border-gray-200 hover:shadow-lg transition-all overflow-hidden">
                {/* Header del dominio */}
                <div 
                  className="p-4 cursor-pointer"
                  style={{ background: `${dominio.color}15` }}
                  onClick={() => setExpandedDominio(isExpanded ? null : dominio.id)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2.5 rounded-lg"
                        style={{ background: 'white' }}
                      >
                        <Icon className="w-5 h-5" style={{ color: dominio.color }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm text-gray-900">
                          {dominio.nombre}
                        </h3>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {dominio.lineamientos} lineamientos
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDominio(isExpanded ? null : dominio.id);
                      }}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  <p className="text-xs text-gray-700 mb-3">
                    {dominio.descripcion}
                  </p>

                  {/* Barra de progreso */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Progreso</span>
                      <span className="font-semibold text-gray-900">{Math.round(progreso)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${progreso}%`,
                          background: dominio.color
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600">
                    <span>{lineamientosCompletos}/{lineamientos.length} completos</span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {lineamientos.length}
                    </span>
                  </div>
                </div>

                {/* Lista expandida de lineamientos */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200"
                    >
                      <div className="p-4 bg-gray-50">
                        <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
                          <FileCheck className="w-4 h-4" />
                          Lineamientos ({lineamientos.length})
                        </h4>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {lineamientos.map((lineamiento) => (
                            <div
                              key={lineamiento.codigo}
                              className="bg-white rounded-lg p-3 border border-gray-200 hover:shadow-sm transition-shadow"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                      {lineamiento.codigo}
                                    </span>
                                    {lineamiento.obligatorio && (
                                      <Badge className="text-xs border-0" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                                        Obligatorio
                                      </Badge>
                                    )}
                                  </div>
                                  <h5 className="font-medium text-xs text-gray-900 mb-1">
                                    {lineamiento.nombre}
                                  </h5>
                                  <p className="text-xs text-gray-600 mb-2">
                                    {lineamiento.descripcion}
                                  </p>
                                </div>
                                {getEstadoBadge(lineamiento.estado)}
                              </div>

                              {/* Barra de progreso del lineamiento */}
                              <div className="mb-2">
                                <div className="w-full bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full"
                                    style={{
                                      width: `${lineamiento.progreso}%`,
                                      background: dominio.color
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <UserCheck className="w-3 h-3" />
                                  {lineamiento.responsable}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {lineamiento.fechaActualizacion}
                                </span>
                              </div>

                              {/* Evidencias */}
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="text-xs font-medium text-gray-700 mb-1">
                                  Evidencias requeridas:
                                </p>
                                <ul className="text-xs text-gray-600 space-y-0.5">
                                  {lineamiento.evidencias.slice(0, 2).map((evidencia, idx) => (
                                    <li key={idx} className="flex items-start gap-1">
                                      <span className="text-gray-400">•</span>
                                      <span>{evidencia}</span>
                                    </li>
                                  ))}
                                  {lineamiento.evidencias.length > 2 && (
                                    <li className="text-gray-500 italic">
                                      +{lineamiento.evidencias.length - 2} más...
                                    </li>
                                  )}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Sección: Accesos rápidos */}
      <div>
        <h2 className="font-bold mb-4" style={{ fontSize: '18px', color: '#1F2937' }}>
          Herramientas y Accesos Rápidos
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { id: 'matriz', name: 'Matriz Cumplimiento', icon: CheckSquare, count: `${stats.complianceObligatorios}%` },
            { id: 'lineamientos', name: 'Todos Lineamientos', icon: FileText, count: stats.totalLineamientos },
            { id: 'evidencias', name: 'Evidencias', icon: Archive, count: 142 },
            { id: 'reportes', name: 'Reportería MinTIC', icon: BarChart3, count: '8' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Card
                  className="p-4 border border-gray-200 hover:shadow-md transition-all cursor-pointer text-center"
                  onClick={() => toast.info(`Abriendo ${item.name}...`)}
                >
                  <div className="flex justify-center mb-2">
                    <div className="p-2.5 rounded-lg bg-blue-50">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                  <p className="font-semibold text-sm text-gray-900 mb-1">{item.name}</p>
                  <Badge
                    className="border-0"
                    style={{
                      background: '#DBEAFE',
                      color: '#1E40AF',
                      fontSize: '11px'
                    }}
                  >
                    {item.count}
                  </Badge>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Vista del modelo seleccionado
  const ModeloView = () => {
    if (!selectedModelo) return null;

    const modelo = modelos.find(m => m.id === selectedModelo);
    if (!modelo) return null;

    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => {
            setSelectedModelo(null);
            setViewMode('dashboard');
          }}
          className="gap-2"
        >
          ← Volver al Dashboard
        </Button>

        {/* Header del Modelo */}
        <Card className="p-6 border border-gray-200">
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="p-4 rounded-xl"
              style={{ background: modelo.bgColor }}
            >
              {React.createElement(modelo.icon, {
                className: "w-8 h-8",
                style: { color: modelo.color }
              })}
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-2xl text-gray-900 mb-2">
                {modelo.nombre}
              </h2>
              <p className="text-gray-600">
                {modelo.descripcion}
              </p>
            </div>
          </div>

          {/* Métricas del modelo */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: modelo.color }}>
                {modelo.dominios}
              </p>
              <p className="text-sm text-gray-600 mt-1">Dominios</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: modelo.color }}>
                {modelo.lineamientos}
              </p>
              <p className="text-sm text-gray-600 mt-1">Lineamientos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: modelo.color }}>
                {modelo.guias}
              </p>
              <p className="text-sm text-gray-600 mt-1">Guías Oficiales</p>
            </div>
          </div>
        </Card>

        {/* Contenido específico del modelo */}
        {selectedModelo === 'MGGTI' && <VistaDetalladaMGGTI />}
        {selectedModelo === 'MGPTI' && <VistaDetalladaMGPTI />}
        {selectedModelo === 'MAE' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Vista MAE:</strong> Los 7 dominios del MAE están visibles en el Dashboard principal. Haz clic en "Volver al Dashboard" para verlos.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row lg:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #003DA5 0%, #0052CC 100%)',
                boxShadow: '0 4px 12px rgba(0, 61, 165, 0.15)'
              }}
            >
              <Layout className="w-6 h-6 text-white" strokeWidth={2.5} />
            </div>
            <h1 
              className="font-bold tracking-tight"
              style={{
                fontSize: '32px',
                lineHeight: '40px',
                letterSpacing: '-0.25px',
                color: '#1F2937'
              }}
            >
              Arquitectura Empresarial MRAE v3.0
            </h1>
          </div>
          <p 
            className="font-normal"
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              color: '#6B7280'
            }}
          >
            Marco de Referencia de Arquitectura Empresarial - MinTIC Colombia 2023
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            onClick={() => toast.success('Generando Reporte Oficial MRAE v3.0...')}
            className="gap-2 shadow-sm"
            style={{
              background: '#003DA5',
              color: 'white',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            <Download className="w-4 h-4" />
            Reporte MinTIC
          </Button>

          <Button
            onClick={() => window.open('https://mintic.gov.co/arquitecturaempresarial/', '_blank')}
            variant="outline"
            className="gap-2"
            style={{
              borderColor: '#D1D5DB',
              color: '#374151',
              borderRadius: '8px',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 600
            }}
          >
            <BookOpen className="w-4 h-4" />
            Doc. Oficial
          </Button>
        </div>
      </motion.div>

      {/* Stats Cards Principales */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Total Lineamientos */}
        <Card className="p-5 border border-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg" style={{ background: '#EFF6FF' }}>
              <FileText className="w-5 h-5" style={{ color: '#3B82F6' }} />
            </div>
            <Badge className="border-0" style={{ background: '#DBEAFE', color: '#1E40AF', fontSize: '11px', fontWeight: 600 }}>
              {stats.dominiosMAE} Dominios
            </Badge>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ fontSize: '13px', lineHeight: '18px', color: '#6B7280' }}>
              Total Lineamientos MAE
            </p>
            <p className="font-bold" style={{ fontSize: '28px', lineHeight: '36px', color: '#111827' }}>
              {stats.totalLineamientos}
            </p>
          </div>
        </Card>

        {/* Compliance Obligatorios */}
        <Card className="p-5 border border-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg" style={{ background: '#FEF3C7' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#F59E0B' }} />
            </div>
            <Badge className="border-0" style={{ background: '#FEF3C7', color: '#92400E', fontSize: '11px', fontWeight: 600 }}>
              Obligatorios
            </Badge>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ fontSize: '13px', lineHeight: '18px', color: '#6B7280' }}>
              Cumplimiento MinTIC
            </p>
            <p className="font-bold" style={{ fontSize: '28px', lineHeight: '36px', color: '#111827' }}>
              {stats.complianceObligatorios}
              <span style={{ fontSize: '16px', color: '#6B7280', fontWeight: 500 }}>%</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {stats.lineamientosObligatoriosCompletos}/{stats.lineamientosObligatorios} completos
            </p>
          </div>
        </Card>

        {/* Progreso General */}
        <Card className="p-5 border border-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg" style={{ background: '#F3E8FF' }}>
              <TrendingUp className="w-5 h-5" style={{ color: '#9333EA' }} />
            </div>
            <Badge className="border-0" style={{ background: '#F3E8FF', color: '#6B21A8', fontSize: '11px', fontWeight: 600 }}>
              En Progreso
            </Badge>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ fontSize: '13px', lineHeight: '18px', color: '#6B7280' }}>
              Progreso General
            </p>
            <p className="font-bold" style={{ fontSize: '28px', lineHeight: '36px', color: '#111827' }}>
              {stats.progresoPromedio}
              <span style={{ fontSize: '16px', color: '#6B7280', fontWeight: 500 }}>%</span>
            </p>
          </div>
        </Card>

        {/* Modelos MRAE */}
        <Card className="p-5 border border-gray-200 bg-white hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-lg" style={{ background: '#D1FAE5' }}>
              <Layers className="w-5 h-5" style={{ color: '#059669' }} />
            </div>
            <Badge className="border-0" style={{ background: '#D1FAE5', color: '#065F46', fontSize: '11px', fontWeight: 600 }}>
              v3.0
            </Badge>
          </div>
          <div>
            <p className="font-medium mb-1" style={{ fontSize: '13px', lineHeight: '18px', color: '#6B7280' }}>
              Modelos MRAE
            </p>
            <p className="font-bold" style={{ fontSize: '28px', lineHeight: '36px', color: '#111827' }}>
              {stats.totalModelos}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              MAE + MGGTI + MGPTI
            </p>
          </div>
        </Card>
      </motion.div>

      {/* Tabs de Navegación */}
      <Card className="border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 overflow-x-auto" style={{ borderBottom: '2px solid #E5E7EB' }}>
          <div className="flex gap-1 min-w-max">
            {[
              { id: 'dashboard', name: 'Dashboard MRAE', icon: Layout },
              { id: 'lineamientos-globales', name: 'Todos los Lineamientos', icon: FileText, count: stats.totalLineamientos },
              { id: 'matriz-cumplimiento', name: 'Matriz Cumplimiento', icon: CheckSquare, count: `${stats.complianceObligatorios}%` },
              { id: 'evidencias', name: 'Evidencias', icon: Archive, count: 142 },
              { id: 'mis-tareas', name: 'Mis Tareas', icon: GitBranch, count: 5 },
              { id: 'reporteria', name: 'Reportería', icon: BarChart3 }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = viewMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setViewMode(tab.id as ViewMode)}
                  className={`px-4 py-3 font-semibold transition-all relative ${
                    isActive ? 'text-[#003DA5]' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={{ fontSize: '13px', lineHeight: '18px' }}
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {tab.name}
                    {tab.count !== undefined && (
                      <span className="px-1.5 py-0.5 text-xs font-bold bg-gray-200 text-gray-700 rounded">
                        {tab.count}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0" style={{ height: '2px', background: '#003DA5' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="p-6">
          {viewMode === 'dashboard' && <DashboardView />}
          {viewMode === 'modelo' && <ModeloView />}
          {viewMode === 'lineamientos-globales' && <TodosLosLineamientos />}
          {viewMode === 'matriz-cumplimiento' && (
            <MatrizCumplimientoGlobal />
          )}
          {viewMode === 'evidencias' && (
            <GestionEvidencias />
          )}
          {viewMode === 'mis-tareas' && (
            <IntegracionPortalTransaccional />
          )}
          {viewMode === 'reporteria' && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                Reportería Oficial MinTIC
              </h3>
              <p className="text-gray-600">
                Próximamente: Reportes oficiales según formato MinTIC
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}