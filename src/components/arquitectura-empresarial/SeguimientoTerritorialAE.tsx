/**
 * Seguimiento Territorial de Arquitectura Empresarial
 * Sistema de monitoreo de avance MRAE por estructura organizacional ESAP
 */

import React, { useState } from 'react';
import {
  MapPin,
  Building2,
  TrendingUp,
  TrendingDown,
  Target,
  Database,
  Server,
  Laptop,
  UserCheck,
  Activity,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Award,
  Zap,
  FileText,
  Eye,
  Download,
  Filter,
  Search,
  Map,
  Building,
  Home,
  Globe,
  Calendar,
  Star,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Sparkles,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';

interface NivelTerritorial {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'nacional' | 'territorial' | 'regional' | 'sede';
  nivel: number;
  territorioId?: string;
  regionId?: string;
  responsable: string;
  email: string;
  telefono: string;
  direccion: string;
  coordinador: string;
  personal: number;
  estudiantes?: number;
  fechaUltimaEvaluacion: string;
}

interface EvaluacionTerritorial {
  nivelId: string;
  dominios: {
    [key: string]: {
      nivelMadurez: number;
      porcentajeAvance: number;
      artefactosCompletados: number;
      artefactosTotales: number;
      iniciativas: number;
    };
  };
  nivelPromedioGeneral: number;
  cumplimientoMRAE: number;
  proyectosActivos: number;
  presupuestoAsignado: string;
  presupuestoEjecutado: string;
  tendencia: 'up' | 'down' | 'stable';
  variacionTrimestre: number;
}

const ESTRUCTURA_TERRITORIAL: NivelTerritorial[] = [
  // Nacional
  {
    id: 'nacional',
    codigo: 'ESAP-NAL',
    nombre: 'ESAP Nacional',
    tipo: 'nacional',
    nivel: 1,
    responsable: 'Dirección Nacional',
    email: 'dnacional@esap.edu.co',
    telefono: '+57 1 3444650',
    direccion: 'Calle 44 No. 53-37, Bogotá D.C.',
    coordinador: 'Dr. Carlos Rodríguez - Director TI Nacional',
    personal: 450,
    estudiantes: 0,
    fechaUltimaEvaluacion: '2024-12-04'
  },
  // Territoriales
  {
    id: 'territorial-1',
    codigo: 'ESAP-TER-1',
    nombre: 'Territorial Bogotá D.C. y Cundinamarca',
    tipo: 'territorial',
    nivel: 2,
    responsable: 'Director Territorial',
    email: 'tbogota@esap.edu.co',
    telefono: '+57 1 3444650 Ext. 101',
    direccion: 'Calle 44 No. 53-37, Bogotá D.C.',
    coordinador: 'Ing. María Fernández',
    personal: 120,
    estudiantes: 5600,
    fechaUltimaEvaluacion: '2024-12-03'
  },
  {
    id: 'territorial-2',
    codigo: 'ESAP-TER-2',
    nombre: 'Territorial Antioquia',
    tipo: 'territorial',
    nivel: 2,
    responsable: 'Director Territorial',
    email: 'tantioquia@esap.edu.co',
    telefono: '+57 4 2516060',
    direccion: 'Carrera 52 No. 42-73, Medellín',
    coordinador: 'Ing. Jorge Ramírez',
    personal: 85,
    estudiantes: 4200,
    fechaUltimaEvaluacion: '2024-12-01'
  },
  {
    id: 'territorial-3',
    codigo: 'ESAP-TER-3',
    nombre: 'Territorial Valle del Cauca',
    tipo: 'territorial',
    nivel: 2,
    responsable: 'Director Territorial',
    email: 'tvalle@esap.edu.co',
    telefono: '+57 2 4853030',
    direccion: 'Calle 5 No. 38-53, Cali',
    coordinador: 'Ing. Ana Martínez',
    personal: 75,
    estudiantes: 3800,
    fechaUltimaEvaluacion: '2024-11-30'
  },
  {
    id: 'territorial-4',
    codigo: 'ESAP-TER-4',
    nombre: 'Territorial Costa Atlántica',
    tipo: 'territorial',
    nivel: 2,
    responsable: 'Director Territorial',
    email: 'tcostaatlantica@esap.edu.co',
    telefono: '+57 5 3685555',
    direccion: 'Carrera 54 No. 59-102, Barranquilla',
    coordinador: 'Ing. Roberto Torres',
    personal: 70,
    estudiantes: 3500,
    fechaUltimaEvaluacion: '2024-11-28'
  },
  {
    id: 'territorial-5',
    codigo: 'ESAP-TER-5',
    nombre: 'Territorial Santanderes',
    tipo: 'territorial',
    nivel: 2,
    responsable: 'Director Territorial',
    email: 'tsantanderes@esap.edu.co',
    telefono: '+57 7 6338080',
    direccion: 'Carrera 19 No. 34-43, Bucaramanga',
    coordinador: 'Ing. Patricia López',
    personal: 60,
    estudiantes: 2900,
    fechaUltimaEvaluacion: '2024-11-27'
  },
  // Regionales (ejemplos)
  {
    id: 'regional-1-1',
    codigo: 'ESAP-REG-1-1',
    nombre: 'Regional Bogotá Centro',
    tipo: 'regional',
    nivel: 3,
    territorioId: 'territorial-1',
    responsable: 'Coordinador Regional',
    email: 'rbogotacentro@esap.edu.co',
    telefono: '+57 1 3444650 Ext. 201',
    direccion: 'Calle 44 No. 53-37, Bogotá D.C.',
    coordinador: 'Esp. Laura Gómez',
    personal: 35,
    estudiantes: 1800,
    fechaUltimaEvaluacion: '2024-12-02'
  },
  {
    id: 'regional-1-2',
    codigo: 'ESAP-REG-1-2',
    nombre: 'Regional Soacha',
    tipo: 'regional',
    nivel: 3,
    territorioId: 'territorial-1',
    responsable: 'Coordinador Regional',
    email: 'rsoacha@esap.edu.co',
    telefono: '+57 1 7200200',
    direccion: 'Calle 13 No. 5-85, Soacha',
    coordinador: 'Esp. Diego Castro',
    personal: 28,
    estudiantes: 1400,
    fechaUltimaEvaluacion: '2024-11-30'
  },
  {
    id: 'regional-2-1',
    codigo: 'ESAP-REG-2-1',
    nombre: 'Regional Medellín Norte',
    tipo: 'regional',
    nivel: 3,
    territorioId: 'territorial-2',
    responsable: 'Coordinador Regional',
    email: 'rmedellin@esap.edu.co',
    telefono: '+57 4 2516060 Ext. 101',
    direccion: 'Carrera 52 No. 42-73, Medellín',
    coordinador: 'Esp. Claudia Hernández',
    personal: 30,
    estudiantes: 1500,
    fechaUltimaEvaluacion: '2024-12-01'
  },
  // Sedes (ejemplos)
  {
    id: 'sede-1-1-1',
    codigo: 'ESAP-SED-1-1-1',
    nombre: 'Sede Chapinero',
    tipo: 'sede',
    nivel: 4,
    territorioId: 'territorial-1',
    regionId: 'regional-1-1',
    responsable: 'Jefe de Sede',
    email: 'schapinero@esap.edu.co',
    telefono: '+57 1 3444650 Ext. 301',
    direccion: 'Carrera 7 No. 55-20, Bogotá',
    coordinador: 'Lic. Sofía Vargas',
    personal: 12,
    estudiantes: 600,
    fechaUltimaEvaluacion: '2024-12-01'
  },
  {
    id: 'sede-1-1-2',
    codigo: 'ESAP-SED-1-1-2',
    nombre: 'Sede Teusaquillo',
    tipo: 'sede',
    nivel: 4,
    territorioId: 'territorial-1',
    regionId: 'regional-1-1',
    responsable: 'Jefe de Sede',
    email: 'steusaquillo@esap.edu.co',
    telefono: '+57 1 3444650 Ext. 302',
    direccion: 'Calle 37 No. 18-44, Bogotá',
    coordinador: 'Lic. Andrés Ruiz',
    personal: 10,
    estudiantes: 500,
    fechaUltimaEvaluacion: '2024-11-29'
  }
];

const EVALUACIONES_TERRITORIALES: { [key: string]: EvaluacionTerritorial } = {
  'nacional': {
    nivelId: 'nacional',
    dominios: {
      'estrategia-ti': { nivelMadurez: 4, porcentajeAvance: 80, artefactosCompletados: 10, artefactosTotales: 12, iniciativas: 8 },
      'informacion': { nivelMadurez: 3, porcentajeAvance: 65, artefactosCompletados: 8, artefactosTotales: 15, iniciativas: 5 },
      'sistemas-informacion': { nivelMadurez: 4, porcentajeAvance: 75, artefactosCompletados: 15, artefactosTotales: 18, iniciativas: 12 },
      'servicios-tecnologicos': { nivelMadurez: 4, porcentajeAvance: 88, artefactosCompletados: 12, artefactosTotales: 14, iniciativas: 6 },
      'uso-apropiacion': { nivelMadurez: 2, porcentajeAvance: 35, artefactosCompletados: 3, artefactosTotales: 10, iniciativas: 3 }
    },
    nivelPromedioGeneral: 3.4,
    cumplimientoMRAE: 70,
    proyectosActivos: 18,
    presupuestoAsignado: '$2.500M',
    presupuestoEjecutado: '$1.850M',
    tendencia: 'up',
    variacionTrimestre: 0.6
  },
  'territorial-1': {
    nivelId: 'territorial-1',
    dominios: {
      'estrategia-ti': { nivelMadurez: 4, porcentajeAvance: 85, artefactosCompletados: 9, artefactosTotales: 12, iniciativas: 6 },
      'informacion': { nivelMadurez: 3, porcentajeAvance: 70, artefactosCompletados: 7, artefactosTotales: 15, iniciativas: 4 },
      'sistemas-informacion': { nivelMadurez: 4, porcentajeAvance: 80, artefactosCompletados: 13, artefactosTotales: 18, iniciativas: 8 },
      'servicios-tecnologicos': { nivelMadurez: 4, porcentajeAvance: 90, artefactosCompletados: 11, artefactosTotales: 14, iniciativas: 5 },
      'uso-apropiacion': { nivelMadurez: 3, porcentajeAvance: 55, artefactosCompletados: 5, artefactosTotales: 10, iniciativas: 3 }
    },
    nivelPromedioGeneral: 3.6,
    cumplimientoMRAE: 75,
    proyectosActivos: 12,
    presupuestoAsignado: '$450M',
    presupuestoEjecutado: '$365M',
    tendencia: 'up',
    variacionTrimestre: 0.4
  },
  'territorial-2': {
    nivelId: 'territorial-2',
    dominios: {
      'estrategia-ti': { nivelMadurez: 3, porcentajeAvance: 70, artefactosCompletados: 8, artefactosTotales: 12, iniciativas: 5 },
      'informacion': { nivelMadurez: 3, porcentajeAvance: 60, artefactosCompletados: 6, artefactosTotales: 15, iniciativas: 3 },
      'sistemas-informacion': { nivelMadurez: 3, porcentajeAvance: 65, artefactosCompletados: 11, artefactosTotales: 18, iniciativas: 7 },
      'servicios-tecnologicos': { nivelMadurez: 4, porcentajeAvance: 75, artefactosCompletados: 10, artefactosTotales: 14, iniciativas: 4 },
      'uso-apropiacion': { nivelMadurez: 2, porcentajeAvance: 40, artefactosCompletados: 4, artefactosTotales: 10, iniciativas: 2 }
    },
    nivelPromedioGeneral: 3.0,
    cumplimientoMRAE: 62,
    proyectosActivos: 9,
    presupuestoAsignado: '$380M',
    presupuestoEjecutado: '$285M',
    tendencia: 'up',
    variacionTrimestre: 0.3
  },
  'territorial-3': {
    nivelId: 'territorial-3',
    dominios: {
      'estrategia-ti': { nivelMadurez: 3, porcentajeAvance: 65, artefactosCompletados: 7, artefactosTotales: 12, iniciativas: 4 },
      'informacion': { nivelMadurez: 2, porcentajeAvance: 50, artefactosCompletados: 5, artefactosTotales: 15, iniciativas: 3 },
      'sistemas-informacion': { nivelMadurez: 3, porcentajeAvance: 60, artefactosCompletados: 10, artefactosTotales: 18, iniciativas: 6 },
      'servicios-tecnologicos': { nivelMadurez: 3, porcentajeAvance: 70, artefactosCompletados: 9, artefactosTotales: 14, iniciativas: 4 },
      'uso-apropiacion': { nivelMadurez: 2, porcentajeAvance: 35, artefactosCompletados: 3, artefactosTotales: 10, iniciativas: 2 }
    },
    nivelPromedioGeneral: 2.6,
    cumplimientoMRAE: 56,
    proyectosActivos: 8,
    presupuestoAsignado: '$350M',
    presupuestoEjecutado: '$245M',
    tendencia: 'stable',
    variacionTrimestre: 0.0
  },
  'territorial-4': {
    nivelId: 'territorial-4',
    dominios: {
      'estrategia-ti': { nivelMadurez: 3, porcentajeAvance: 60, artefactosCompletados: 7, artefactosTotales: 12, iniciativas: 4 },
      'informacion': { nivelMadurez: 2, porcentajeAvance: 45, artefactosCompletados: 4, artefactosTotales: 15, iniciativas: 2 },
      'sistemas-informacion': { nivelMadurez: 3, porcentajeAvance: 55, artefactosCompletados: 9, artefactosTotales: 18, iniciativas: 5 },
      'servicios-tecnologicos': { nivelMadurez: 3, porcentajeAvance: 65, artefactosCompletados: 8, artefactosTotales: 14, iniciativas: 3 },
      'uso-apropiacion': { nivelMadurez: 2, porcentajeAvance: 30, artefactosCompletados: 3, artefactosTotales: 10, iniciativas: 2 }
    },
    nivelPromedioGeneral: 2.6,
    cumplimientoMRAE: 51,
    proyectosActivos: 7,
    presupuestoAsignado: '$320M',
    presupuestoEjecutado: '$210M',
    tendencia: 'up',
    variacionTrimestre: 0.2
  },
  'territorial-5': {
    nivelId: 'territorial-5',
    dominios: {
      'estrategia-ti': { nivelMadurez: 2, porcentajeAvance: 50, artefactosCompletados: 6, artefactosTotales: 12, iniciativas: 3 },
      'informacion': { nivelMadurez: 2, porcentajeAvance: 40, artefactosCompletados: 4, artefactosTotales: 15, iniciativas: 2 },
      'sistemas-informacion': { nivelMadurez: 2, porcentajeAvance: 45, artefactosCompletados: 8, artefactosTotales: 18, iniciativas: 4 },
      'servicios-tecnologicos': { nivelMadurez: 3, porcentajeAvance: 60, artefactosCompletados: 7, artefactosTotales: 14, iniciativas: 3 },
      'uso-apropiacion': { nivelMadurez: 1, porcentajeAvance: 20, artefactosCompletados: 2, artefactosTotales: 10, iniciativas: 1 }
    },
    nivelPromedioGeneral: 2.0,
    cumplimientoMRAE: 43,
    proyectosActivos: 5,
    presupuestoAsignado: '$280M',
    presupuestoEjecutado: '$165M',
    tendencia: 'stable',
    variacionTrimestre: 0.0
  },
  'regional-1-1': {
    nivelId: 'regional-1-1',
    dominios: {
      'estrategia-ti': { nivelMadurez: 4, porcentajeAvance: 88, artefactosCompletados: 9, artefactosTotales: 12, iniciativas: 5 },
      'informacion': { nivelMadurez: 3, porcentajeAvance: 75, artefactosCompletados: 8, artefactosTotales: 15, iniciativas: 4 },
      'sistemas-informacion': { nivelMadurez: 4, porcentajeAvance: 82, artefactosCompletados: 14, artefactosTotales: 18, iniciativas: 7 },
      'servicios-tecnologicos': { nivelMadurez: 4, porcentajeAvance: 92, artefactosCompletados: 12, artefactosTotales: 14, iniciativas: 5 },
      'uso-apropiacion': { nivelMadurez: 3, porcentajeAvance: 60, artefactosCompletados: 6, artefactosTotales: 10, iniciativas: 3 }
    },
    nivelPromedioGeneral: 3.6,
    cumplimientoMRAE: 79,
    proyectosActivos: 8,
    presupuestoAsignado: '$180M',
    presupuestoEjecutado: '$155M',
    tendencia: 'up',
    variacionTrimestre: 0.5
  },
  'regional-1-2': {
    nivelId: 'regional-1-2',
    dominios: {
      'estrategia-ti': { nivelMadurez: 3, porcentajeAvance: 65, artefactosCompletados: 7, artefactosTotales: 12, iniciativas: 4 },
      'informacion': { nivelMadurez: 3, porcentajeAvance: 58, artefactosCompletados: 6, artefactosTotales: 15, iniciativas: 3 },
      'sistemas-informacion': { nivelMadurez: 3, porcentajeAvance: 68, artefactosCompletados: 11, artefactosTotales: 18, iniciativas: 5 },
      'servicios-tecnologicos': { nivelMadurez: 3, porcentajeAvance: 72, artefactosCompletados: 9, artefactosTotales: 14, iniciativas: 4 },
      'uso-apropiacion': { nivelMadurez: 2, porcentajeAvance: 45, artefactosCompletados: 4, artefactosTotales: 10, iniciativas: 2 }
    },
    nivelPromedioGeneral: 2.8,
    cumplimientoMRAE: 62,
    proyectosActivos: 6,
    presupuestoAsignado: '$140M',
    presupuestoEjecutado: '$105M',
    tendencia: 'up',
    variacionTrimestre: 0.3
  },
  'regional-2-1': {
    nivelId: 'regional-2-1',
    dominios: {
      'estrategia-ti': { nivelMadurez: 3, porcentajeAvance: 72, artefactosCompletados: 8, artefactosTotales: 12, iniciativas: 5 },
      'informacion': { nivelMadurez: 3, porcentajeAvance: 62, artefactosCompletados: 6, artefactosTotales: 15, iniciativas: 3 },
      'sistemas-informacion': { nivelMadurez: 3, porcentajeAvance: 67, artefactosCompletados: 11, artefactosTotales: 18, iniciativas: 6 },
      'servicios-tecnologicos': { nivelMadurez: 4, porcentajeAvance: 78, artefactosCompletados: 10, artefactosTotales: 14, iniciativas: 4 },
      'uso-apropiacion': { nivelMadurez: 2, porcentajeAvance: 42, artefactosCompletados: 4, artefactosTotales: 10, iniciativas: 2 }
    },
    nivelPromedioGeneral: 3.0,
    cumplimientoMRAE: 64,
    proyectosActivos: 7,
    presupuestoAsignado: '$150M',
    presupuestoEjecutado: '$118M',
    tendencia: 'up',
    variacionTrimestre: 0.4
  },
  'sede-1-1-1': {
    nivelId: 'sede-1-1-1',
    dominios: {
      'estrategia-ti': { nivelMadurez: 3, porcentajeAvance: 70, artefactosCompletados: 7, artefactosTotales: 12, iniciativas: 3 },
      'informacion': { nivelMadurez: 3, porcentajeAvance: 65, artefactosCompletados: 6, artefactosTotales: 15, iniciativas: 2 },
      'sistemas-informacion': { nivelMadurez: 3, porcentajeAvance: 68, artefactosCompletados: 10, artefactosTotales: 18, iniciativas: 4 },
      'servicios-tecnologicos': { nivelMadurez: 3, porcentajeAvance: 75, artefactosCompletados: 9, artefactosTotales: 14, iniciativas: 3 },
      'uso-apropiacion': { nivelMadurez: 2, porcentajeAvance: 50, artefactosCompletados: 5, artefactosTotales: 10, iniciativas: 2 }
    },
    nivelPromedioGeneral: 2.8,
    cumplimientoMRAE: 66,
    proyectosActivos: 4,
    presupuestoAsignado: '$55M',
    presupuestoEjecutado: '$45M',
    tendencia: 'up',
    variacionTrimestre: 0.2
  },
  'sede-1-1-2': {
    nivelId: 'sede-1-1-2',
    dominios: {
      'estrategia-ti': { nivelMadurez: 2, porcentajeAvance: 55, artefactosCompletados: 6, artefactosTotales: 12, iniciativas: 2 },
      'informacion': { nivelMadurez: 2, porcentajeAvance: 48, artefactosCompletados: 5, artefactosTotales: 15, iniciativas: 2 },
      'sistemas-informacion': { nivelMadurez: 3, porcentajeAvance: 60, artefactosCompletados: 9, artefactosTotales: 18, iniciativas: 3 },
      'servicios-tecnologicos': { nivelMadurez: 3, porcentajeAvance: 65, artefactosCompletados: 8, artefactosTotales: 14, iniciativas: 2 },
      'uso-apropiacion': { nivelMadurez: 2, porcentajeAvance: 38, artefactosCompletados: 3, artefactosTotales: 10, iniciativas: 1 }
    },
    nivelPromedioGeneral: 2.4,
    cumplimientoMRAE: 53,
    proyectosActivos: 3,
    presupuestoAsignado: '$48M',
    presupuestoEjecutado: '$32M',
    tendencia: 'stable',
    variacionTrimestre: 0.0
  }
};

const DOMINIOS_MRAE = [
  { id: 'estrategia-ti', nombre: 'Estrategia TI', icon: Target, color: 'from-blue-500 to-blue-600' },
  { id: 'informacion', nombre: 'Información', icon: Database, color: 'from-purple-500 to-purple-600' },
  { id: 'sistemas-informacion', nombre: 'Sistemas de Información', icon: Server, color: 'from-green-500 to-green-600' },
  { id: 'servicios-tecnologicos', nombre: 'Servicios Tecnológicos', icon: Laptop, color: 'from-orange-500 to-orange-600' },
  { id: 'uso-apropiacion', nombre: 'Uso y Apropiación', icon: UserCheck, color: 'from-pink-500 to-pink-600' }
];

export function SeguimientoTerritorialAE() {
  const [nivelSeleccionado, setNivelSeleccionado] = useState<string>('nacional');
  const [vistaActiva, setVistaActiva] = useState<'mapa' | 'tabla' | 'comparativo'>('mapa');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['nacional']));
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [showDetalle, setShowDetalle] = useState(false);
  const [selectedNivelDetalle, setSelectedNivelDetalle] = useState<NivelTerritorial | null>(null);

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const getNivelInfo = (id: string) => {
    return ESTRUCTURA_TERRITORIAL.find(n => n.id === id);
  };

  const getEvaluacion = (id: string) => {
    return EVALUACIONES_TERRITORIALES[id];
  };

  const getHijos = (parentId: string) => {
    const parent = getNivelInfo(parentId);
    if (!parent) return [];

    if (parent.tipo === 'nacional') {
      return ESTRUCTURA_TERRITORIAL.filter(n => n.tipo === 'territorial');
    } else if (parent.tipo === 'territorial') {
      return ESTRUCTURA_TERRITORIAL.filter(n => n.territorioId === parentId && n.tipo === 'regional');
    } else if (parent.tipo === 'regional') {
      return ESTRUCTURA_TERRITORIAL.filter(n => n.regionId === parentId && n.tipo === 'sede');
    }
    return [];
  };

  const getTipoIcon = (tipo: string) => {
    const icons = {
      'nacional': Globe,
      'territorial': Building2,
      'regional': Building,
      'sede': Home
    };
    return icons[tipo] || Building2;
  };

  const getTipoColor = (tipo: string) => {
    const colors = {
      'nacional': 'from-indigo-500 to-purple-600',
      'territorial': 'from-blue-500 to-cyan-600',
      'regional': 'from-green-500 to-emerald-600',
      'sede': 'from-orange-500 to-amber-600'
    };
    return colors[tipo] || 'from-gray-500 to-gray-600';
  };

  const getNivelMadurezColor = (nivel: number) => {
    if (nivel >= 4) return 'text-green-600 bg-green-100 border-green-300';
    if (nivel >= 3) return 'text-blue-600 bg-blue-100 border-blue-300';
    if (nivel >= 2) return 'text-orange-600 bg-orange-100 border-orange-300';
    return 'text-red-600 bg-red-100 border-red-300';
  };

  const getTendenciaIcon = (tendencia: string) => {
    if (tendencia === 'up') return ArrowUp;
    if (tendencia === 'down') return ArrowDown;
    return Minus;
  };

  const getTendenciaColor = (tendencia: string) => {
    if (tendencia === 'up') return 'text-green-600 bg-green-100';
    if (tendencia === 'down') return 'text-red-600 bg-red-100';
    return 'text-gray-600 bg-gray-100';
  };

  const handleVerDetalle = (nivel: NivelTerritorial) => {
    setSelectedNivelDetalle(nivel);
    setShowDetalle(true);
  };

  const renderNivelHierarchy = (nivelId: string, depth: number = 0) => {
    const nivel = getNivelInfo(nivelId);
    const evaluacion = getEvaluacion(nivelId);
    if (!nivel || !evaluacion) return null;

    const hijos = getHijos(nivelId);
    const isExpanded = expandedNodes.has(nivelId);
    const hasChildren = hijos.length > 0;
    const TipoIcon = getTipoIcon(nivel.tipo);
    const TendenciaIcon = getTendenciaIcon(evaluacion.tendencia);

    return (
      <div key={nivelId} className="mb-2">
        <div
          className="bg-white rounded-xl border-2 border-gray-200 hover:border-[#003DA5] hover:shadow-lg transition-all cursor-pointer"
          style={{ marginLeft: `${depth * 24}px` }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                {hasChildren && (
                  <button
                    onClick={() => toggleNode(nivelId)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-600" />
                    )}
                  </button>
                )}
                
                <div className={`p-2.5 bg-gradient-to-br ${getTipoColor(nivel.tipo)} rounded-lg`}>
                  <TipoIcon className="w-5 h-5 text-white" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-gray-900">{nivel.nombre}</h4>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold">
                      {nivel.codigo}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>{nivel.personal} personal</span>
                    </div>
                    {nivel.estudiantes && nivel.estudiantes > 0 && (
                      <div className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        <span>{nivel.estudiantes.toLocaleString()} estudiantes</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{nivel.coordinador}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Nivel Promedio */}
                <div className={`px-4 py-2 border-2 rounded-lg ${getNivelMadurezColor(evaluacion.nivelPromedioGeneral)}`}>
                  <div className="text-center">
                    <div className="text-2xl font-black">{evaluacion.nivelPromedioGeneral}</div>
                    <div className="text-xs font-semibold">Nivel MRAE</div>
                  </div>
                </div>

                {/* Cumplimiento */}
                <div className="px-4 py-2 bg-purple-50 border-2 border-purple-300 rounded-lg">
                  <div className="text-center">
                    <div className="text-2xl font-black text-purple-600">{evaluacion.cumplimientoMRAE}%</div>
                    <div className="text-xs font-semibold text-purple-600">Cumplimiento</div>
                  </div>
                </div>

                {/* Tendencia */}
                <div className={`px-3 py-2 rounded-lg ${getTendenciaColor(evaluacion.tendencia)}`}>
                  <div className="flex items-center gap-1">
                    <TendenciaIcon className="w-4 h-4" />
                    <span className="text-xs font-bold">
                      {evaluacion.tendencia === 'up' ? '+' : evaluacion.tendencia === 'down' ? '-' : ''}
                      {evaluacion.variacionTrimestre.toFixed(1)}
                    </span>
                  </div>
                </div>

                {/* Proyectos */}
                <div className="text-center px-3">
                  <div className="text-lg font-black text-gray-900">{evaluacion.proyectosActivos}</div>
                  <div className="text-xs text-gray-600">Proyectos</div>
                </div>

                {/* Acciones */}
                <button
                  onClick={() => handleVerDetalle(nivel)}
                  className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <Eye className="w-5 h-5 text-blue-600" />
                </button>
              </div>
            </div>

            {/* Mini dominios */}
            <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-gray-100">
              {DOMINIOS_MRAE.map(dominio => {
                const dominioEval = evaluacion.dominios[dominio.id];
                const DominioIcon = dominio.icon;
                
                return (
                  <div key={dominio.id} className="text-center p-2 bg-gray-50 rounded-lg">
                    <DominioIcon className="w-4 h-4 mx-auto mb-1 text-gray-600" />
                    <div className={`text-lg font-black ${
                      dominioEval.nivelMadurez >= 4 ? 'text-green-600' :
                      dominioEval.nivelMadurez >= 3 ? 'text-blue-600' :
                      dominioEval.nivelMadurez >= 2 ? 'text-orange-600' :
                      'text-red-600'
                    }`}>
                      {dominioEval.nivelMadurez}
                    </div>
                    <div className="text-xs text-gray-600">{dominioEval.porcentajeAvance}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Render children */}
        {isExpanded && hasChildren && (
          <div className="mt-2">
            {hijos.map(hijo => renderNivelHierarchy(hijo.id, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Calcular estadísticas generales
  const statsGenerales = {
    totalNiveles: ESTRUCTURA_TERRITORIAL.length,
    territoriales: ESTRUCTURA_TERRITORIAL.filter(n => n.tipo === 'territorial').length,
    regionales: ESTRUCTURA_TERRITORIAL.filter(n => n.tipo === 'regional').length,
    sedes: ESTRUCTURA_TERRITORIAL.filter(n => n.tipo === 'sede').length,
    nivelPromedioNacional: 3.4,
    cumplimientoPromedio: 65,
    proyectosTotales: Object.values(EVALUACIONES_TERRITORIALES).reduce((acc, e) => acc + e.proyectosActivos, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header con Estadísticas */}
      <div className="bg-gradient-to-r from-[#003DA5] to-[#0052CC] rounded-xl p-6 text-white">
        <div className="mb-6">
          <h2 className="text-2xl font-black mb-2">Seguimiento Territorial de Arquitectura Empresarial</h2>
          <p className="text-blue-100">
            Monitoreo de avance MRAE por estructura organizacional ESAP: Nacional → Territorial → Regional → Sede
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5" />
              <span className="text-xs font-semibold">Nacional</span>
            </div>
            <div className="text-3xl font-black">1</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5" />
              <span className="text-xs font-semibold">Territoriales</span>
            </div>
            <div className="text-3xl font-black">{statsGenerales.territoriales}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Building className="w-5 h-5" />
              <span className="text-xs font-semibold">Regionales</span>
            </div>
            <div className="text-3xl font-black">{statsGenerales.regionales}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-5 h-5" />
              <span className="text-xs font-semibold">Sedes</span>
            </div>
            <div className="text-3xl font-black">{statsGenerales.sedes}</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">{statsGenerales.nivelPromedioNacional}</div>
            <div className="text-xs">Nivel Promedio</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">{statsGenerales.cumplimientoPromedio}%</div>
            <div className="text-xs">Cumplimiento</div>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-4">
            <div className="text-3xl font-black mb-1">{statsGenerales.proyectosTotales}</div>
            <div className="text-xs">Proyectos Activos</div>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o coordinador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
              />
            </div>
          </div>

          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003DA5] focus:border-transparent"
          >
            <option value="todos">Todos los Niveles</option>
            <option value="nacional">Nacional</option>
            <option value="territorial">Territoriales</option>
            <option value="regional">Regionales</option>
            <option value="sede">Sedes</option>
          </select>

          <div className="flex gap-2">
            <button
              onClick={() => setVistaActiva('mapa')}
              className={`px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                vistaActiva === 'mapa'
                  ? 'bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Map className="w-4 h-4" />
              Mapa
            </button>
            <button
              onClick={() => setVistaActiva('tabla')}
              className={`px-4 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
                vistaActiva === 'tabla'
                  ? 'bg-gradient-to-r from-[#003DA5] to-[#0052CC] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Tabla
            </button>
          </div>
        </div>
      </div>

      {/* Vista Mapa Jerárquico */}
      {vistaActiva === 'mapa' && (
        <div className="space-y-4">
          {renderNivelHierarchy('nacional', 0)}
        </div>
      )}

      {/* Vista Tabla */}
      {vistaActiva === 'tabla' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Unidad</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Tipo</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Nivel MRAE</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Cumplimiento</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Tendencia</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Proyectos</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Personal</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ESTRUCTURA_TERRITORIAL.map((nivel, index) => {
                  const evaluacion = getEvaluacion(nivel.id);
                  if (!evaluacion) return null;
                  
                  const TipoIcon = getTipoIcon(nivel.tipo);
                  const TendenciaIcon = getTendenciaIcon(evaluacion.tendencia);

                  return (
                    <motion.tr
                      key={nivel.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-bold text-gray-900">{nivel.nombre}</div>
                          <div className="text-sm text-gray-600">{nivel.codigo}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className={`p-1.5 bg-gradient-to-br ${getTipoColor(nivel.tipo)} rounded`}>
                            <TipoIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <span className="text-sm font-semibold text-gray-700 capitalize">{nivel.tipo}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1.5 rounded-lg font-black text-lg border-2 inline-block ${getNivelMadurezColor(evaluacion.nivelPromedioGeneral)}`}>
                          {evaluacion.nivelPromedioGeneral}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-black text-purple-600">{evaluacion.cumplimientoMRAE}%</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div className={`px-2 py-1 rounded ${getTendenciaColor(evaluacion.tendencia)}`}>
                            <div className="flex items-center gap-1">
                              <TendenciaIcon className="w-4 h-4" />
                              <span className="text-sm font-bold">
                                {evaluacion.tendencia === 'up' ? '+' : evaluacion.tendencia === 'down' ? '-' : ''}
                                {evaluacion.variacionTrimestre.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-lg font-black text-gray-900">{evaluacion.proyectosActivos}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm font-semibold text-gray-700">{nivel.personal}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleVerDetalle(nivel)}
                          className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-5 h-5 text-blue-600" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle */}
      <AnimatePresence>
        {showDetalle && selectedNivelDetalle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDetalle(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
            >
              {(() => {
                const nivel = selectedNivelDetalle;
                const evaluacion = getEvaluacion(nivel.id);
                if (!evaluacion) return null;

                const TipoIcon = getTipoIcon(nivel.tipo);

                return (
                  <>
                    {/* Header */}
                    <div className={`sticky top-0 bg-gradient-to-r ${getTipoColor(nivel.tipo)} text-white p-6 rounded-t-2xl z-10`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="p-3 bg-white/20 rounded-xl">
                            <TipoIcon className="w-8 h-8" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold mb-1 text-white/80 capitalize">{nivel.tipo}</div>
                            <h2 className="text-2xl font-black mb-1">{nivel.nombre}</h2>
                            <p className="text-white/90">{nivel.codigo}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowDetalle(false)}
                          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="p-6 space-y-6">
                      {/* KPIs Principales */}
                      <div className="grid grid-cols-4 gap-4">
                        <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4 text-center">
                          <div className="text-3xl font-black text-blue-600 mb-1">{evaluacion.nivelPromedioGeneral}</div>
                          <div className="text-sm font-semibold text-blue-600">Nivel Promedio MRAE</div>
                        </div>
                        <div className="bg-purple-50 border-2 border-purple-300 rounded-xl p-4 text-center">
                          <div className="text-3xl font-black text-purple-600 mb-1">{evaluacion.cumplimientoMRAE}%</div>
                          <div className="text-sm font-semibold text-purple-600">Cumplimiento MinTIC</div>
                        </div>
                        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-center">
                          <div className="text-3xl font-black text-green-600 mb-1">{evaluacion.proyectosActivos}</div>
                          <div className="text-sm font-semibold text-green-600">Proyectos Activos</div>
                        </div>
                        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4 text-center">
                          <div className="text-3xl font-black text-orange-600 mb-1">
                            {evaluacion.tendencia === 'up' ? '+' : evaluacion.tendencia === 'down' ? '-' : ''}
                            {evaluacion.variacionTrimestre.toFixed(1)}
                          </div>
                          <div className="text-sm font-semibold text-orange-600">Variación Trimestral</div>
                        </div>
                      </div>

                      {/* Información de Contacto */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h3 className="text-lg font-black text-gray-900 mb-4">Información de Contacto</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Coordinador</div>
                            <div className="font-bold text-gray-900">{nivel.coordinador}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Email</div>
                            <div className="font-bold text-gray-900">{nivel.email}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Teléfono</div>
                            <div className="font-bold text-gray-900">{nivel.telefono}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Dirección</div>
                            <div className="font-bold text-gray-900">{nivel.direccion}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Personal</div>
                            <div className="font-bold text-gray-900">{nivel.personal} personas</div>
                          </div>
                          {nivel.estudiantes && nivel.estudiantes > 0 && (
                            <div>
                              <div className="text-sm text-gray-600 mb-1">Estudiantes</div>
                              <div className="font-bold text-gray-900">{nivel.estudiantes.toLocaleString()}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Evaluación por Dominio */}
                      <div>
                        <h3 className="text-lg font-black text-gray-900 mb-4">Evaluación por Dominio MRAE</h3>
                        <div className="space-y-3">
                          {DOMINIOS_MRAE.map(dominio => {
                            const dominioEval = evaluacion.dominios[dominio.id];
                            const DominioIcon = dominio.icon;

                            return (
                              <div key={dominio.id} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 bg-gradient-to-br ${dominio.color} rounded-lg`}>
                                      <DominioIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <div className="font-bold text-gray-900">{dominio.nombre}</div>
                                      <div className="text-sm text-gray-600">
                                        {dominioEval.artefactosCompletados}/{dominioEval.artefactosTotales} artefactos • {dominioEval.iniciativas} iniciativas
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`px-4 py-2 rounded-lg border-2 ${getNivelMadurezColor(dominioEval.nivelMadurez)}`}>
                                    <div className="text-2xl font-black">{dominioEval.nivelMadurez}</div>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between text-sm mb-2">
                                  <span className="font-semibold text-gray-700">Avance</span>
                                  <span className="font-black text-gray-900">{dominioEval.porcentajeAvance}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full bg-gradient-to-r ${dominio.color} transition-all duration-500`}
                                    style={{ width: `${dominioEval.porcentajeAvance}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Presupuesto */}
                      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl p-5">
                        <h3 className="text-lg font-black text-gray-900 mb-4">Presupuesto</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Asignado</div>
                            <div className="text-2xl font-black text-emerald-600">{evaluacion.presupuestoAsignado}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600 mb-1">Ejecutado</div>
                            <div className="text-2xl font-black text-teal-600">{evaluacion.presupuestoEjecutado}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
