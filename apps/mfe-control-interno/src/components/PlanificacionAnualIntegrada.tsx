/**
 * PLANIFICACIÓN ANUAL INTEGRADA
 * Módulo consolidado que integra:
 * - Plan Anual (5 Roles del Decreto 648)
 * - Universo de Auditorías
 * - Programa Anual de Auditorías
 * 
 * FLUJO: Plan → Universo → Programa
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Target, Database, CalendarDays, Users, Shield, Award,
  Briefcase, FileText, Plus, Edit, Trash2, Eye, Save,
  Download, Upload, CheckCircle, AlertCircle, Clock,
  TrendingUp, BarChart3, Filter, Search, Calendar,
  ChevronRight, ChevronDown, Hash, Building2, Flag,
  PlayCircle, PauseCircle, CheckSquare, X, Settings,
  Layers, Grid, List, Copy, RefreshCw, Send, Percent
} from 'lucide-react';
import { Card } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { toast } from 'sonner';
import { auditoriasApi } from './services/api';

// ============ TIPOS ============

type TabPrincipal = 'plan-anual' | 'universo' | 'programa';
type RolDecreto = 'jefe-oci' | 'profesional-especializado' | 'profesional-universitario' | 'tecnico' | 'auxiliar';
type PrioridadRiesgo = 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
type EstadoUniverso = 'seleccionada' | 'pendiente' | 'no-aplica';
type TrimestrePrograma = 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface ActividadRol {
  id: string;
  rolId: RolDecreto;
  codigo: string;
  nombre: string;
  descripcion: string;
  obligatoria: boolean;
  frecuencia: 'Única' | 'Mensual' | 'Trimestral' | 'Semestral' | 'Anual';
  duracionDias: number;
  mes: number;
  responsable: string;
  estado: 'completada' | 'en-progreso' | 'pendiente';
  progreso: number;
}

interface RolInfo {
  id: RolDecreto;
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  icono: string;
  responsable: string;
  actividadesAsignadas: number;
  cargaHoras: number;
}

interface AreaAuditable {
  id: string;
  codigo: string;
  nombre: string;
  dependencia: string;
  proceso: string;
  nivelRiesgo: PrioridadRiesgo;
  factoresRiesgo: string[];
  ultimaAuditoria: string | null;
  frecuenciaRecomendada: number; // años
  responsableArea: string;
  estado: EstadoUniverso;
  observaciones: string;
  puntuacionRiesgo: number; // 0-100
}

interface AuditoriaPrograma {
  id: string;
  codigo: string;
  nombre: string;
  areaAuditableId: string;
  tipo: 'Gestión' | 'Financiera' | 'Cumplimiento' | 'TI' | 'Territorial';
  alcance: string;
  objetivoGeneral: string;
  trimestre: TrimestrePrograma;
  mes: number;
  duracionDias: number;
  liderAsignado: string | null;
  equipoAsignado: string[];
  presupuesto: number;
  estado: 'programada' | 'en-ejecucion' | 'completada' | 'reprogramada';
  fechaInicio: string | null;
  fechaFin: string | null;
  prioridad: 'alta' | 'media' | 'baja';
}

// ============ DATOS - ROLES DECRETO 648 ============

const ROLES_DECRETO_648: RolInfo[] = [
  {
    id: 'jefe-oci',
    codigo: 'ROL-01',
    nombre: 'Jefe Oficina Control Interno',
    descripcion: 'Máxima autoridad de la OCI',
    color: '#DC2626',
    icono: '👑',
    responsable: 'Dra. María Fernanda Gómez',
    actividadesAsignadas: 12,
    cargaHoras: 240
  },
  {
    id: 'profesional-especializado',
    codigo: 'ROL-02',
    nombre: 'Profesional Especializado OCI',
    descripcion: 'Profesional con conocimientos especializados',
    color: '#3B82F6',
    icono: '🔍',
    responsable: 'Carlos Andrés Rodríguez',
    actividadesAsignadas: 15,
    cargaHoras: 320
  },
  {
    id: 'profesional-universitario',
    codigo: 'ROL-03',
    nombre: 'Profesional Universitario OCI',
    descripcion: 'Profesional de apoyo en auditorías',
    color: '#10B981',
    icono: '📋',
    responsable: 'Ana Patricia Martínez (+ 4 más)',
    actividadesAsignadas: 10,
    cargaHoras: 280
  },
  {
    id: 'tecnico',
    codigo: 'ROL-04',
    nombre: 'Técnico Administrativo OCI',
    descripcion: 'Apoyo técnico y administrativo',
    color: '#F59E0B',
    icono: '📝',
    responsable: 'Jorge Luis Herrera (+ 1 más)',
    actividadesAsignadas: 8,
    cargaHoras: 200
  },
  {
    id: 'auxiliar',
    codigo: 'ROL-05',
    nombre: 'Auxiliar Administrativo OCI',
    descripcion: 'Apoyo en gestión documental',
    color: '#8B5CF6',
    icono: '📁',
    responsable: 'Laura Sofía Díaz',
    actividadesAsignadas: 6,
    cargaHoras: 160
  }
];

// ============ DATOS - ACTIVIDADES POR ROL ============

const ACTIVIDADES_EJEMPLO: ActividadRol[] = [
  // Jefe OCI
  {
    id: 'act-001',
    rolId: 'jefe-oci',
    codigo: 'ACT-JO-001',
    nombre: 'Elaborar Plan Anual de Auditoría',
    descripcion: 'Definir el plan anual de auditorías considerando riesgos y recursos',
    obligatoria: true,
    frecuencia: 'Anual',
    duracionDias: 15,
    mes: 1,
    responsable: 'Dra. María Fernanda Gómez',
    estado: 'completada',
    progreso: 100
  },
  {
    id: 'act-002',
    rolId: 'jefe-oci',
    codigo: 'ACT-JO-002',
    nombre: 'Presentar Informe Anual OCI',
    descripcion: 'Informe anual de gestión de la Oficina de Control Interno',
    obligatoria: true,
    frecuencia: 'Anual',
    duracionDias: 10,
    mes: 2,
    responsable: 'Dra. María Fernanda Gómez',
    estado: 'en-progreso',
    progreso: 45
  },
  {
    id: 'act-003',
    rolId: 'jefe-oci',
    codigo: 'ACT-JO-003',
    nombre: 'Elaborar Informe Pormenorizado',
    descripcion: 'Informe pormenorizado del estado del control interno (Ley 1474)',
    obligatoria: true,
    frecuencia: 'Semestral',
    duracionDias: 8,
    mes: 7,
    responsable: 'Dra. María Fernanda Gómez',
    estado: 'pendiente',
    progreso: 0
  },
  // Profesional Especializado
  {
    id: 'act-004',
    rolId: 'profesional-especializado',
    codigo: 'ACT-PE-001',
    nombre: 'Liderar Auditorías de Alto Riesgo',
    descripcion: 'Liderar auditorías a áreas de alto riesgo institucional',
    obligatoria: true,
    frecuencia: 'Trimestral',
    duracionDias: 30,
    mes: 3,
    responsable: 'Carlos Andrés Rodríguez',
    estado: 'en-progreso',
    progreso: 60
  },
  {
    id: 'act-005',
    rolId: 'profesional-especializado',
    codigo: 'ACT-PE-002',
    nombre: 'Seguimiento a Planes de Mejoramiento',
    descripcion: 'Seguimiento trimestral a planes de mejoramiento vigentes',
    obligatoria: true,
    frecuencia: 'Trimestral',
    duracionDias: 5,
    mes: 3,
    responsable: 'Carlos Andrés Rodríguez',
    estado: 'en-progreso',
    progreso: 30
  },
  // Profesional Universitario
  {
    id: 'act-006',
    rolId: 'profesional-universitario',
    codigo: 'ACT-PU-001',
    nombre: 'Ejecutar Auditorías Asignadas',
    descripcion: 'Ejecutar auditorías programadas como miembro de equipo',
    obligatoria: true,
    frecuencia: 'Mensual',
    duracionDias: 20,
    mes: 2,
    responsable: 'Ana Patricia Martínez',
    estado: 'en-progreso',
    progreso: 55
  },
  {
    id: 'act-007',
    rolId: 'profesional-universitario',
    codigo: 'ACT-PU-002',
    nombre: 'Elaborar Papeles de Trabajo',
    descripcion: 'Documentar evidencias y hallazgos en papeles de trabajo',
    obligatoria: true,
    frecuencia: 'Mensual',
    duracionDias: 5,
    mes: 2,
    responsable: 'Ana Patricia Martínez',
    estado: 'en-progreso',
    progreso: 70
  },
  // Técnico Administrativo
  {
    id: 'act-008',
    rolId: 'tecnico',
    codigo: 'ACT-TA-001',
    nombre: 'Apoyo Logístico en Auditorías',
    descripcion: 'Coordinar aspectos logísticos de las auditorías',
    obligatoria: true,
    frecuencia: 'Mensual',
    duracionDias: 3,
    mes: 2,
    responsable: 'Jorge Luis Herrera',
    estado: 'completada',
    progreso: 100
  },
  // Auxiliar Administrativo
  {
    id: 'act-009',
    rolId: 'auxiliar',
    codigo: 'ACT-AA-001',
    nombre: 'Gestión Documental OCI',
    descripcion: 'Organizar y archivar documentos de la OCI',
    obligatoria: true,
    frecuencia: 'Mensual',
    duracionDias: 2,
    mes: 2,
    responsable: 'Laura Sofía Díaz',
    estado: 'en-progreso',
    progreso: 80
  },
  // Más actividades Jefe OCI
  {
    id: 'act-010',
    rolId: 'jefe-oci',
    codigo: 'ACT-JO-004',
    nombre: 'Comité de Coordinación de Control Interno',
    descripcion: 'Presidir reuniones del comité de control interno',
    obligatoria: true,
    frecuencia: 'Trimestral',
    duracionDias: 1,
    mes: 3,
    responsable: 'Dra. María Fernanda Gómez',
    estado: 'pendiente',
    progreso: 0
  },
  {
    id: 'act-011',
    rolId: 'jefe-oci',
    codigo: 'ACT-JO-005',
    nombre: 'Seguimiento a Entes de Control',
    descripcion: 'Atender requerimientos de Contraloría y Procuraduría',
    obligatoria: true,
    frecuencia: 'Trimestral',
    duracionDias: 3,
    mes: 4,
    responsable: 'Dra. María Fernanda Gómez',
    estado: 'pendiente',
    progreso: 0
  },
  // Más actividades Profesional Especializado
  {
    id: 'act-012',
    rolId: 'profesional-especializado',
    codigo: 'ACT-PE-003',
    nombre: 'Evaluación MIPG Anual',
    descripcion: 'Liderar evaluación anual del Modelo Integrado de Gestión',
    obligatoria: true,
    frecuencia: 'Anual',
    duracionDias: 20,
    mes: 11,
    responsable: 'Carlos Andrés Rodríguez',
    estado: 'pendiente',
    progreso: 0
  },
  {
    id: 'act-013',
    rolId: 'profesional-especializado',
    codigo: 'ACT-PE-004',
    nombre: 'Actualización de Mapas de Riesgos',
    descripcion: 'Actualizar mapas de riesgos institucionales',
    obligatoria: true,
    frecuencia: 'Semestral',
    duracionDias: 5,
    mes: 6,
    responsable: 'Carlos Andrés Rodríguez',
    estado: 'pendiente',
    progreso: 0
  },
  // Más actividades Profesional Universitario
  {
    id: 'act-014',
    rolId: 'profesional-universitario',
    codigo: 'ACT-PU-003',
    nombre: 'Verificación de Controles',
    descripcion: 'Verificar efectividad de controles en procesos auditados',
    obligatoria: true,
    frecuencia: 'Trimestral',
    duracionDias: 10,
    mes: 3,
    responsable: 'Ana Patricia Martínez',
    estado: 'pendiente',
    progreso: 0
  },
  {
    id: 'act-015',
    rolId: 'profesional-universitario',
    codigo: 'ACT-PU-004',
    nombre: 'Elaborar Informes de Auditoría',
    descripcion: 'Consolidar informes de auditoría para aprobación',
    obligatoria: true,
    frecuencia: 'Mensual',
    duracionDias: 3,
    mes: 2,
    responsable: 'Ana Patricia Martínez',
    estado: 'en-progreso',
    progreso: 40
  },
  // Más actividades Técnico
  {
    id: 'act-016',
    rolId: 'tecnico',
    codigo: 'ACT-TA-002',
    nombre: 'Actualizar Sistema de Información',
    descripcion: 'Mantener actualizado el sistema de gestión de auditorías',
    obligatoria: true,
    frecuencia: 'Mensual',
    duracionDias: 2,
    mes: 2,
    responsable: 'Jorge Luis Herrera',
    estado: 'en-progreso',
    progreso: 60
  },
  {
    id: 'act-017',
    rolId: 'tecnico',
    codigo: 'ACT-TA-003',
    nombre: 'Consolidar Estadísticas',
    descripcion: 'Elaborar estadísticas de gestión de la OCI',
    obligatoria: true,
    frecuencia: 'Trimestral',
    duracionDias: 2,
    mes: 3,
    responsable: 'Jorge Luis Herrera',
    estado: 'pendiente',
    progreso: 0
  },
  // Más actividades Auxiliar
  {
    id: 'act-018',
    rolId: 'auxiliar',
    codigo: 'ACT-AA-002',
    nombre: 'Radicación de Documentos',
    descripcion: 'Radicar y controlar documentos de entrada y salida',
    obligatoria: true,
    frecuencia: 'Mensual',
    duracionDias: 1,
    mes: 2,
    responsable: 'Laura Sofía Díaz',
    estado: 'en-progreso',
    progreso: 90
  },
  {
    id: 'act-019',
    rolId: 'auxiliar',
    codigo: 'ACT-AA-003',
    nombre: 'Archivo y Custodia',
    descripcion: 'Mantener archivo organizado según TRD',
    obligatoria: true,
    frecuencia: 'Mensual',
    duracionDias: 2,
    mes: 2,
    responsable: 'Laura Sofía Díaz',
    estado: 'completada',
    progreso: 100
  },
  {
    id: 'act-020',
    rolId: 'jefe-oci',
    codigo: 'ACT-JO-006',
    nombre: 'Capacitación Equipo OCI',
    descripcion: 'Planificar y ejecutar capacitaciones para el equipo',
    obligatoria: false,
    frecuencia: 'Semestral',
    duracionDias: 2,
    mes: 5,
    responsable: 'Dra. María Fernanda Gómez',
    estado: 'pendiente',
    progreso: 0
  }
];

// ============ DATOS - UNIVERSO DE AUDITORÍAS ============

const UNIVERSO_AUDITORIAS: AreaAuditable[] = [
  {
    id: 'area-001',
    codigo: 'UA-001',
    nombre: 'Gestión Presupuestal y Financiera',
    dependencia: 'Dirección Financiera',
    proceso: 'Gestión Financiera',
    nivelRiesgo: 'Crítico',
    factoresRiesgo: ['Alto volumen de recursos', 'Complejidad normativa', 'Impacto institucional'],
    ultimaAuditoria: '2024-06-15',
    frecuenciaRecomendada: 1,
    responsableArea: 'Director Financiero',
    estado: 'seleccionada',
    observaciones: 'Auditoría anual obligatoria',
    puntuacionRiesgo: 95
  },
  {
    id: 'area-002',
    codigo: 'UA-002',
    nombre: 'Proceso de Contratación',
    dependencia: 'Oficina Jurídica',
    proceso: 'Contratación Pública',
    nivelRiesgo: 'Alto',
    factoresRiesgo: ['Normativa compleja', 'Riesgos de corrupción', 'Transparencia'],
    ultimaAuditoria: '2024-12-01',
    frecuenciaRecomendada: 1,
    responsableArea: 'Jefe Jurídico',
    estado: 'seleccionada',
    observaciones: 'Auditoría semestral recomendada',
    puntuacionRiesgo: 88
  },
  {
    id: 'area-003',
    codigo: 'UA-003',
    nombre: 'Gestión Académica',
    dependencia: 'Dirección Académica',
    proceso: 'Procesos Misionales',
    nivelRiesgo: 'Alto',
    factoresRiesgo: ['Calidad educativa', 'Acreditación', 'Deserción estudiantil'],
    ultimaAuditoria: '2024-09-20',
    frecuenciaRecomendada: 1,
    responsableArea: 'Director Académico',
    estado: 'seleccionada',
    observaciones: 'Proceso crítico institucional',
    puntuacionRiesgo: 85
  },
  {
    id: 'area-004',
    codigo: 'UA-004',
    nombre: 'Infraestructura TI y Seguridad',
    dependencia: 'Dirección de Tecnología',
    proceso: 'Gestión de TI',
    nivelRiesgo: 'Alto',
    factoresRiesgo: ['Seguridad de datos', 'Disponibilidad sistemas', 'Cumplimiento GDPR'],
    ultimaAuditoria: '2024-03-10',
    frecuenciaRecomendada: 1,
    responsableArea: 'Director TI',
    estado: 'seleccionada',
    observaciones: 'Ciberseguridad prioritaria',
    puntuacionRiesgo: 82
  },
  {
    id: 'area-005',
    codigo: 'UA-005',
    nombre: 'Gestión de Talento Humano',
    dependencia: 'Dirección de RRHH',
    proceso: 'Gestión Humana',
    nivelRiesgo: 'Medio',
    factoresRiesgo: ['Selección', 'Bienestar', 'Capacitación'],
    ultimaAuditoria: '2024-11-01',
    frecuenciaRecomendada: 2,
    responsableArea: 'Director RRHH',
    estado: 'pendiente',
    observaciones: 'Auditoría cada 2 años',
    puntuacionRiesgo: 65
  },
  {
    id: 'area-006',
    codigo: 'UA-006',
    nombre: 'Atención al Ciudadano - PQRS',
    dependencia: 'Atención al Usuario',
    proceso: 'Servicio al Ciudadano',
    nivelRiesgo: 'Medio',
    factoresRiesgo: ['Tiempos de respuesta', 'Satisfacción', 'Normativa'],
    ultimaAuditoria: '2023-08-15',
    frecuenciaRecomendada: 2,
    responsableArea: 'Jefe Atención',
    estado: 'seleccionada',
    observaciones: 'Verificar cumplimiento Ley 1755',
    puntuacionRiesgo: 60
  },
  {
    id: 'area-007',
    codigo: 'UA-007',
    nombre: 'Gestión Documental',
    dependencia: 'Archivo General',
    proceso: 'Gestión Documental',
    nivelRiesgo: 'Medio',
    factoresRiesgo: ['Conservación', 'Digitalización', 'TRD'],
    ultimaAuditoria: '2023-05-20',
    frecuenciaRecomendada: 3,
    responsableArea: 'Jefe Archivo',
    estado: 'pendiente',
    observaciones: 'Auditoría cada 3 años',
    puntuacionRiesgo: 55
  },
  {
    id: 'area-008',
    codigo: 'UA-008',
    nombre: 'Gestión de Bienes y Servicios',
    dependencia: 'Gestión Administrativa',
    proceso: 'Servicios Generales',
    nivelRiesgo: 'Bajo',
    factoresRiesgo: ['Inventarios', 'Mantenimiento', 'Suministros'],
    ultimaAuditoria: '2022-10-10',
    frecuenciaRecomendada: 3,
    responsableArea: 'Jefe Administrativo',
    estado: 'no-aplica',
    observaciones: 'Bajo riesgo, auditar según necesidad',
    puntuacionRiesgo: 40
  },
  {
    id: 'area-009',
    codigo: 'UA-009',
    nombre: 'Comunicaciones Institucionales',
    dependencia: 'Oficina Comunicaciones',
    proceso: 'Comunicación Externa',
    nivelRiesgo: 'Bajo',
    factoresRiesgo: ['Reputación', 'Transparencia', 'Redes sociales'],
    ultimaAuditoria: null,
    frecuenciaRecomendada: 4,
    responsableArea: 'Jefe Comunicaciones',
    estado: 'no-aplica',
    observaciones: 'Primera auditoría programada para 2026',
    puntuacionRiesgo: 35
  },
  {
    id: 'area-010',
    codigo: 'UA-010',
    nombre: 'Planeación Estratégica',
    dependencia: 'Oficina Planeación',
    proceso: 'Planeación Institucional',
    nivelRiesgo: 'Medio',
    factoresRiesgo: ['Cumplimiento metas', 'Indicadores', 'Presupuesto'],
    ultimaAuditoria: '2024-01-15',
    frecuenciaRecomendada: 2,
    responsableArea: 'Jefe Planeación',
    estado: 'pendiente',
    observaciones: 'Seguimiento a PDI',
    puntuacionRiesgo: 70
  },
  {
    id: 'area-011',
    codigo: 'UA-011',
    nombre: 'Control Interno Disciplinario',
    dependencia: 'Oficina Control Disciplinario',
    proceso: 'Gestión Disciplinaria',
    nivelRiesgo: 'Alto',
    factoresRiesgo: ['Debido proceso', 'Términos legales', 'Derechos del investigado'],
    ultimaAuditoria: '2024-08-10',
    frecuenciaRecomendada: 1,
    responsableArea: 'Jefe Oficina Disciplinaria',
    estado: 'seleccionada',
    observaciones: 'Auditoría anual obligatoria',
    puntuacionRiesgo: 80
  },
  {
    id: 'area-012',
    codigo: 'UA-012',
    nombre: 'Gestión Ambiental',
    dependencia: 'Coordinación Ambiental',
    proceso: 'Sostenibilidad Ambiental',
    nivelRiesgo: 'Medio',
    factoresRiesgo: ['Cumplimiento normativo ambiental', 'Residuos', 'Huella de carbono'],
    ultimaAuditoria: '2023-04-20',
    frecuenciaRecomendada: 2,
    responsableArea: 'Coordinador Ambiental',
    estado: 'pendiente',
    observaciones: 'Verificar plan de manejo ambiental',
    puntuacionRiesgo: 58
  },
  {
    id: 'area-013',
    codigo: 'UA-013',
    nombre: 'Investigación Institucional',
    dependencia: 'Dirección de Investigación',
    proceso: 'Gestión de Investigación',
    nivelRiesgo: 'Medio',
    factoresRiesgo: ['Producción académica', 'Recursos de investigación', 'Ética investigativa'],
    ultimaAuditoria: '2024-05-15',
    frecuenciaRecomendada: 2,
    responsableArea: 'Director de Investigación',
    estado: 'seleccionada',
    observaciones: 'Evaluar cumplimiento de política investigativa',
    puntuacionRiesgo: 68
  },
  {
    id: 'area-014',
    codigo: 'UA-014',
    nombre: 'Extensión y Proyección Social',
    dependencia: 'Dirección de Extensión',
    proceso: 'Proyección Social',
    nivelRiesgo: 'Bajo',
    factoresRiesgo: ['Convenios interinstitucionales', 'Impacto social', 'Sostenibilidad proyectos'],
    ultimaAuditoria: '2023-11-05',
    frecuenciaRecomendada: 3,
    responsableArea: 'Director de Extensión',
    estado: 'no-aplica',
    observaciones: 'Auditar según disponibilidad de recursos',
    puntuacionRiesgo: 45
  },
  {
    id: 'area-015',
    codigo: 'UA-015',
    nombre: 'Internacionalización',
    dependencia: 'Oficina de Relaciones Internacionales',
    proceso: 'Cooperación Internacional',
    nivelRiesgo: 'Bajo',
    factoresRiesgo: ['Movilidad académica', 'Convenios internacionales', 'Doble titulación'],
    ultimaAuditoria: null,
    frecuenciaRecomendada: 4,
    responsableArea: 'Jefe Relaciones Internacionales',
    estado: 'no-aplica',
    observaciones: 'Primera auditoría programada para 2026',
    puntuacionRiesgo: 38
  }
];

// ============ DATOS - PROGRAMA ANUAL ============

const PROGRAMA_ANUAL_2025: AuditoriaPrograma[] = [
  {
    id: 'prog-001',
    codigo: 'AUD-2025-001',
    nombre: 'Auditoría de Gestión - Dirección Académica',
    areaAuditableId: 'area-003',
    tipo: 'Gestión',
    alcance: 'Procesos de admisión, matrícula, y seguimiento académico',
    objetivoGeneral: 'Evaluar la eficiencia y eficacia de los procesos académicos',
    trimestre: 'Q1',
    mes: 1,
    duracionDias: 30,
    liderAsignado: 'María González',
    equipoAsignado: ['Juan Pérez', 'Ana Martínez'],
    presupuesto: 15000000,
    estado: 'en-ejecucion',
    fechaInicio: '2025-01-15',
    fechaFin: '2025-02-14',
    prioridad: 'alta'
  },
  {
    id: 'prog-002',
    codigo: 'AUD-2025-002',
    nombre: 'Auditoría Financiera - Presupuesto 2024',
    areaAuditableId: 'area-001',
    tipo: 'Financiera',
    alcance: 'Ejecución presupuestal, ingresos y gastos del año 2024',
    objetivoGeneral: 'Verificar la correcta ejecución presupuestal',
    trimestre: 'Q1',
    mes: 2,
    duracionDias: 45,
    liderAsignado: 'Carlos Rodríguez',
    equipoAsignado: ['Laura Silva', 'Pedro Castro', 'Diana López'],
    presupuesto: 25000000,
    estado: 'programada',
    fechaInicio: '2025-02-01',
    fechaFin: '2025-03-17',
    prioridad: 'alta'
  },
  {
    id: 'prog-003',
    codigo: 'AUD-2025-003',
    nombre: 'Auditoría de Cumplimiento - Contratación',
    areaAuditableId: 'area-002',
    tipo: 'Cumplimiento',
    alcance: 'Procesos de contratación Q4 2024',
    objetivoGeneral: 'Verificar cumplimiento normativo en contratación',
    trimestre: 'Q2',
    mes: 4,
    duracionDias: 20,
    liderAsignado: 'Andrea Ramírez',
    equipoAsignado: ['Jorge Mendoza'],
    presupuesto: 10000000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'media'
  },
  {
    id: 'prog-004',
    codigo: 'AUD-2025-004',
    nombre: 'Auditoría de Sistemas - Infraestructura TI',
    areaAuditableId: 'area-004',
    tipo: 'TI',
    alcance: 'Seguridad, disponibilidad y respaldo de sistemas',
    objetivoGeneral: 'Evaluar controles de seguridad informática',
    trimestre: 'Q2',
    mes: 5,
    duracionDias: 25,
    liderAsignado: 'Andrés Sánchez',
    equipoAsignado: ['Natalia Ruiz', 'Miguel Torres'],
    presupuesto: 18000000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'alta'
  },
  {
    id: 'prog-005',
    codigo: 'AUD-2025-005',
    nombre: 'Auditoría de Cumplimiento - PQRS',
    areaAuditableId: 'area-006',
    tipo: 'Cumplimiento',
    alcance: 'Atención de PQRS año 2024',
    objetivoGeneral: 'Verificar cumplimiento Ley 1755 de 2015',
    trimestre: 'Q3',
    mes: 7,
    duracionDias: 15,
    liderAsignado: null,
    equipoAsignado: [],
    presupuesto: 8000000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'media'
  },
  {
    id: 'prog-006',
    codigo: 'AUD-2025-006',
    nombre: 'Auditoría de Gestión - Planeación Estratégica',
    areaAuditableId: 'area-010',
    tipo: 'Gestión',
    alcance: 'Cumplimiento PDI 2024',
    objetivoGeneral: 'Evaluar cumplimiento de metas del Plan de Desarrollo',
    trimestre: 'Q4',
    mes: 10,
    duracionDias: 20,
    liderAsignado: null,
    equipoAsignado: [],
    presupuesto: 12000000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'media'
  },
  {
    id: 'prog-007',
    codigo: 'AUD-2025-007',
    nombre: 'Auditoría de Gestión - Talento Humano',
    areaAuditableId: 'area-005',
    tipo: 'Gestión',
    alcance: 'Procesos de selección, evaluación y capacitación 2024',
    objetivoGeneral: 'Evaluar la eficiencia de la gestión del talento humano',
    trimestre: 'Q2',
    mes: 6,
    duracionDias: 22,
    liderAsignado: 'Patricia Gómez',
    equipoAsignado: ['Sofía Vargas', 'Roberto Díaz'],
    presupuesto: 14000000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'media'
  },
  {
    id: 'prog-008',
    codigo: 'AUD-2025-008',
    nombre: 'Auditoría de Cumplimiento - Control Disciplinario',
    areaAuditableId: 'area-011',
    tipo: 'Cumplimiento',
    alcance: 'Procesos disciplinarios tramitados en 2024',
    objetivoGeneral: 'Verificar cumplimiento del debido proceso disciplinario',
    trimestre: 'Q3',
    mes: 8,
    duracionDias: 25,
    liderAsignado: 'Luis Fernando Mora',
    equipoAsignado: ['Carolina Jiménez', 'Andrés Torres'],
    presupuesto: 16000000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'alta'
  },
  {
    id: 'prog-009',
    codigo: 'AUD-2025-009',
    nombre: 'Auditoría de Gestión - Investigación',
    areaAuditableId: 'area-013',
    tipo: 'Gestión',
    alcance: 'Gestión de proyectos de investigación y producción académica',
    objetivoGeneral: 'Evaluar la productividad y ética en investigación',
    trimestre: 'Q3',
    mes: 9,
    duracionDias: 18,
    liderAsignado: 'Diana Marcela Silva',
    equipoAsignado: ['Felipe Moreno'],
    presupuesto: 11000000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'media'
  },
  {
    id: 'prog-010',
    codigo: 'AUD-2025-010',
    nombre: 'Auditoría Territorial - Antioquia',
    areaAuditableId: 'area-003',
    tipo: 'Territorial',
    alcance: 'Procesos académicos y administrativos Territorial Antioquia',
    objetivoGeneral: 'Evaluar gestión integral de la territorial',
    trimestre: 'Q4',
    mes: 11,
    duracionDias: 35,
    liderAsignado: null,
    equipoAsignado: [],
    presupuesto: 22000000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'alta'
  },
  {
    id: 'prog-011',
    codigo: 'AUD-2025-011',
    nombre: 'Auditoría de Gestión Documental',
    areaAuditableId: 'area-007',
    tipo: 'Cumplimiento',
    alcance: 'Gestión de TRD, archivo y digitalización',
    objetivoGeneral: 'Verificar cumplimiento de normativa archivística',
    trimestre: 'Q4',
    mes: 12,
    duracionDias: 15,
    liderAsignado: null,
    equipoAsignado: [],
    presupuesto: 9000000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'baja'
  },
  {
    id: 'prog-012',
    codigo: 'AUD-2025-012',
    nombre: 'Auditoría de Cumplimiento - Gestión Ambiental',
    areaAuditableId: 'area-012',
    tipo: 'Cumplimiento',
    alcance: 'Plan de Manejo Ambiental y disposición de residuos',
    objetivoGeneral: 'Verificar cumplimiento normativa ambiental',
    trimestre: 'Q1',
    mes: 3,
    duracionDias: 12,
    liderAsignado: 'Claudia Rojas',
    equipoAsignado: ['Mario Bernal'],
    presupuesto: 7500000,
    estado: 'programada',
    fechaInicio: null,
    fechaFin: null,
    prioridad: 'media'
  }
];

// ============ UTILIDADES ============

const getNivelRiesgoColor = (nivel: PrioridadRiesgo) => {
  const colores = {
    'Crítico': '#DC2626',
    'Alto': '#F59E0B',
    'Medio': '#3B82F6',
    'Bajo': '#10B981'
  };
  return colores[nivel];
};

const getEstadoUniversoInfo = (estado: EstadoUniverso) => {
  const info = {
    'seleccionada': { label: 'Seleccionada', color: '#10B981', icono: <CheckCircle className="w-4 h-4" /> },
    'pendiente': { label: 'Pendiente', color: '#F59E0B', icono: <Clock className="w-4 h-4" /> },
    'no-aplica': { label: 'No Aplica', color: '#6B7280', icono: <X className="w-4 h-4" /> }
  };
  return info[estado];
};

const getTrimestreLabel = (trimestre: TrimestrePrograma) => {
  const labels = {
    'Q1': 'Q1 (Ene-Mar)',
    'Q2': 'Q2 (Abr-Jun)',
    'Q3': 'Q3 (Jul-Sep)',
    'Q4': 'Q4 (Oct-Dic)'
  };
  return labels[trimestre];
};

// ============ COMPONENTE PRINCIPAL ============

export function PlanificacionAnualIntegrada() {
  const [tabActivo, setTabActivo] = useState<TabPrincipal>('plan-anual');
  const [year] = useState(2025);

  return (
    <div className="space-y-6">
      {/* ACCIONES PRINCIPALES */}
      <div className="flex justify-end gap-2">
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
        <Button style={{ background: '#003DA5' }}>
          <Save className="w-4 h-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>

      {/* FLUJO VISUAL */}
      <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div
              className={`text-center p-4 rounded-lg transition-all cursor-pointer ${tabActivo === 'plan-anual' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              onClick={() => setTabActivo('plan-anual')}
            >
              <Target className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'plan-anual' ? 'text-white' : 'text-blue-600'}`} />
              <p className="font-bold text-sm">1. Plan Anual</p>
              <p className="text-xs opacity-80">5 Roles Decreto 648</p>
            </div>
          </div>

          <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />

          <div className="flex-1">
            <div
              className={`text-center p-4 rounded-lg transition-all cursor-pointer ${tabActivo === 'universo' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              onClick={() => setTabActivo('universo')}
            >
              <Database className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'universo' ? 'text-white' : 'text-orange-600'}`} />
              <p className="font-bold text-sm">2. Universo</p>
              <p className="text-xs opacity-80">Áreas Auditables</p>
            </div>
          </div>

          <ChevronRight className="w-6 h-6 text-gray-400 mx-2" />

          <div className="flex-1">
            <div
              className={`text-center p-4 rounded-lg transition-all cursor-pointer ${tabActivo === 'programa' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              onClick={() => setTabActivo('programa')}
            >
              <CalendarDays className={`w-8 h-8 mx-auto mb-2 ${tabActivo === 'programa' ? 'text-white' : 'text-green-600'}`} />
              <p className="font-bold text-sm">3. Programa Anual</p>
              <p className="text-xs opacity-80">Cronograma</p>
            </div>
          </div>
        </div>
      </Card>

      {/* CONTENIDO SEGÚN TAB */}
      <AnimatePresence mode="wait">
        {tabActivo === 'plan-anual' && <TabPlanAnual />}
        {tabActivo === 'universo' && <TabUniverso />}
        {tabActivo === 'programa' && <TabPrograma />}
      </AnimatePresence>
    </div>
  );
}

// ============ TAB 1: PLAN ANUAL (5 ROLES) ============

function TabPlanAnual() {
  const [rolSeleccionado, setRolSeleccionado] = useState<RolDecreto | null>(null);
  const [vistaActividades, setVistaActividades] = useState<'grid' | 'lista'>('grid');

  const actividadesRol = rolSeleccionado
    ? ACTIVIDADES_EJEMPLO.filter(a => a.rolId === rolSeleccionado)
    : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* RESUMEN DE ROLES */}
      <Card className="p-6">
        <div className="flex items-center justify-end mb-4">
          <Badge style={{ background: '#003DA5', color: 'white' }}>
            {ROLES_DECRETO_648.length} Roles
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {ROLES_DECRETO_648.map(rol => {
            const actividades = ACTIVIDADES_EJEMPLO.filter(a => a.rolId === rol.id);
            const completadas = actividades.filter(a => a.estado === 'completada').length;
            const progresoPromedio = actividades.reduce((sum, a) => sum + a.progreso, 0) / actividades.length;

            return (
              <div
                key={rol.id}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${rolSeleccionado === rol.id
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                  }`}
                onClick={() => setRolSeleccionado(rol.id)}
                style={{ borderColor: rolSeleccionado === rol.id ? rol.color : undefined }}
              >
                <div className="text-center mb-3">
                  <div className="text-4xl mb-2">{rol.icono}</div>
                  <Badge variant="outline" className="mb-2">{rol.codigo}</Badge>
                  <h4 className="font-bold text-sm text-gray-900">{rol.nombre}</h4>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Actividades:</span>
                    <span className="font-bold">{actividades.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Completadas:</span>
                    <span className="font-bold text-green-600">{completadas}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Progreso:</span>
                    <span className="font-bold">{Math.round(progresoPromedio)}%</span>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${progresoPromedio}%`,
                        background: rol.color
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* DETALLE DEL ROL SELECCIONADO */}
      {rolSeleccionado && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-black text-gray-900">
                Actividades: {ROLES_DECRETO_648.find(r => r.id === rolSeleccionado)?.nombre}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Responsable: {ROLES_DECRETO_648.find(r => r.id === rolSeleccionado)?.responsable}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={vistaActividades === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVistaActividades('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={vistaActividades === 'lista' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVistaActividades('lista')}
              >
                <List className="w-4 h-4" />
              </Button>
              <Button size="sm" style={{ background: '#003DA5' }}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Actividad
              </Button>
            </div>
          </div>

          {/* GRID DE ACTIVIDADES */}
          {vistaActividades === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {actividadesRol.map(actividad => (
                <ActividadCard key={actividad.id} actividad={actividad} />
              ))}
            </div>
          )}

          {/* LISTA DE ACTIVIDADES */}
          {vistaActividades === 'lista' && (
            <div className="space-y-3">
              {actividadesRol.map(actividad => (
                <ActividadListItem key={actividad.id} actividad={actividad} />
              ))}
            </div>
          )}
        </Card>
      )}

      {/* MENSAJE SI NO HAY ROL SELECCIONADO */}
      {!rolSeleccionado && (
        <Card className="p-12 text-center">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Selecciona un rol
          </h3>
          <p className="text-sm text-gray-600">
            Haz clic en uno de los 5 roles para ver sus actividades asignadas
          </p>
        </Card>
      )}
    </motion.div>
  );
}

function ActividadCard({ actividad }: { actividad: ActividadRol }) {
  const estadoInfo = {
    'completada': { color: '#10B981', label: 'Completada', icono: <CheckCircle className="w-4 h-4" /> },
    'en-progreso': { color: '#3B82F6', label: 'En Progreso', icono: <PlayCircle className="w-4 h-4" /> },
    'pendiente': { color: '#6B7280', label: 'Pendiente', icono: <Clock className="w-4 h-4" /> }
  };

  const info = estadoInfo[actividad.estado];

  return (
    <div className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 transition-all">
      <div className="flex items-start justify-between mb-2">
        <Badge variant="outline" className="text-xs">{actividad.codigo}</Badge>
        <div className="flex gap-1">
          <Button variant="outline" size="sm">
            <Edit className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <h4 className="font-bold text-sm text-gray-900 mb-2">{actividad.nombre}</h4>
      <p className="text-xs text-gray-600 mb-3 line-clamp-2">{actividad.descripcion}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {actividad.obligatoria && (
          <Badge variant="outline" className="text-xs" style={{ color: '#DC2626' }}>
            Obligatoria
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {actividad.frecuencia}
        </Badge>
        <Badge variant="outline" className="text-xs">
          {actividad.duracionDias} días
        </Badge>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-gray-700">Progreso</span>
          <span className="text-xs font-bold">{actividad.progreso}%</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{ width: `${actividad.progreso}%`, background: info.color }}
          />
        </div>
      </div>

      <Badge style={{ background: info.color, color: 'white' }} className="text-xs">
        {info.icono}
        <span className="ml-1">{info.label}</span>
      </Badge>
    </div>
  );
}

function ActividadListItem({ actividad }: { actividad: ActividadRol }) {
  const estadoInfo = {
    'completada': { color: '#10B981', label: 'Completada' },
    'en-progreso': { color: '#3B82F6', label: 'En Progreso' },
    'pendiente': { color: '#6B7280', label: 'Pendiente' }
  };

  const info = estadoInfo[actividad.estado];

  return (
    <div className="p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">{actividad.codigo}</Badge>
            <h4 className="font-bold text-sm">{actividad.nombre}</h4>
          </div>
          <p className="text-xs text-gray-600">{actividad.descripcion}</p>
        </div>

        <div className="w-24 text-center">
          <p className="text-xs text-gray-600 mb-1">Progreso</p>
          <p className="text-lg font-black" style={{ color: info.color }}>{actividad.progreso}%</p>
        </div>

        <div className="w-32">
          <Badge style={{ background: info.color, color: 'white' }}>
            {info.label}
          </Badge>
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
    </div>
  );
}

// ============ TAB 2: UNIVERSO DE AUDITORÍAS ============

function TabUniverso() {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRiesgo, setFiltroRiesgo] = useState<PrioridadRiesgo | 'todos'>('todos');
  const [filtroEstado, setFiltroEstado] = useState<EstadoUniverso | 'todos'>('todos');

  const areasFiltradas = UNIVERSO_AUDITORIAS.filter(area => {
    const matchBusqueda = area.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      area.dependencia.toLowerCase().includes(busqueda.toLowerCase());
    const matchRiesgo = filtroRiesgo === 'todos' || area.nivelRiesgo === filtroRiesgo;
    const matchEstado = filtroEstado === 'todos' || area.estado === filtroEstado;
    return matchBusqueda && matchRiesgo && matchEstado;
  });

  const estadisticas = {
    total: UNIVERSO_AUDITORIAS.length,
    seleccionadas: UNIVERSO_AUDITORIAS.filter(a => a.estado === 'seleccionada').length,
    critico: UNIVERSO_AUDITORIAS.filter(a => a.nivelRiesgo === 'Crítico').length,
    alto: UNIVERSO_AUDITORIAS.filter(a => a.nivelRiesgo === 'Alto').length
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
          <p className="text-sm font-bold text-gray-700 mb-1">Total Áreas</p>
          <p className="text-3xl font-black" style={{ color: '#3B82F6' }}>{estadisticas.total}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#10B981', background: '#D1FAE5' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Seleccionadas</p>
          <p className="text-3xl font-black" style={{ color: '#10B981' }}>{estadisticas.seleccionadas}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#DC2626', background: '#FEE2E2' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Riesgo Crítico</p>
          <p className="text-3xl font-black" style={{ color: '#DC2626' }}>{estadisticas.critico}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#F59E0B', background: '#FEF3C7' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Riesgo Alto</p>
          <p className="text-3xl font-black" style={{ color: '#F59E0B' }}>{estadisticas.alto}</p>
        </Card>
      </div>

      {/* FILTROS */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Search className="w-4 h-4 inline mr-1" />
              Buscar
            </label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar área auditable..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Filter className="w-4 h-4 inline mr-1" />
              Nivel de Riesgo
            </label>
            <select
              value={filtroRiesgo}
              onChange={(e) => setFiltroRiesgo(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los niveles</option>
              <option value="Crítico">Crítico</option>
              <option value="Alto">Alto</option>
              <option value="Medio">Medio</option>
              <option value="Bajo">Bajo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Flag className="w-4 h-4 inline mr-1" />
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="seleccionada">Seleccionada</option>
              <option value="pendiente">Pendiente</option>
              <option value="no-aplica">No Aplica</option>
            </select>
          </div>
        </div>
      </Card>

      {/* TABLA DE ÁREAS */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Código</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Área Auditable</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Dependencia</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Riesgo</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Puntuación</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Última Auditoría</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {areasFiltradas.map(area => {
                const estadoInfo = getEstadoUniversoInfo(area.estado);
                return (
                  <tr key={area.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge variant="outline">{area.codigo}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-sm text-gray-900">{area.nombre}</p>
                      <p className="text-xs text-gray-600">{area.proceso}</p>
                    </td>
                    <td className="px-4 py-3 text-sm">{area.dependencia}</td>
                    <td className="px-4 py-3">
                      <Badge style={{ background: getNivelRiesgoColor(area.nivelRiesgo), color: 'white' }}>
                        {area.nivelRiesgo}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full"
                            style={{
                              width: `${area.puntuacionRiesgo}%`,
                              background: getNivelRiesgoColor(area.nivelRiesgo)
                            }}
                          />
                        </div>
                        <span className="text-xs font-bold">{area.puntuacionRiesgo}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {area.ultimaAuditoria || <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge style={{ background: estadoInfo.color, color: 'white' }}>
                        {estadoInfo.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
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
    </motion.div>
  );
}

// ============ TAB 3: PROGRAMA ANUAL ============

function TabPrograma() {
  const [vistaPrograma, setVistaPrograma] = useState<'cronograma' | 'tabla'>('cronograma');
  const [auditoriasPrograma, setAuditoriasPrograma] = useState<AuditoriaPrograma[]>([]);
  const [loading, setLoading] = useState(true);
  const añoActual = new Date().getFullYear();

  // Función para mapear Auditoria (backend) a AuditoriaPrograma (frontend)
  const mapearAuditoriaACard = (aud: any): AuditoriaPrograma => {
    // Determinar trimestre basado en fecha de inicio
    let trimestre: TrimestrePrograma = 'Q1';
    let mes = 1;
    if (aud.fechaInicio) {
      const fecha = new Date(aud.fechaInicio);
      mes = fecha.getMonth() + 1;
      if (mes <= 3) trimestre = 'Q1';
      else if (mes <= 6) trimestre = 'Q2';
      else if (mes <= 9) trimestre = 'Q3';
      else trimestre = 'Q4';
    }

    // Calcular duración
    let duracionDias = 30;
    if (aud.fechaInicio && aud.fechaFin) {
      const inicio = new Date(aud.fechaInicio);
      const fin = new Date(aud.fechaFin);
      duracionDias = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Mapear estado
    let estado: AuditoriaPrograma['estado'] = 'programada';
    if (aud.estado === 'en-ejecucion' || aud.estado === 'en-planeacion') estado = 'en-ejecucion';
    else if (aud.estado === 'cerrada') estado = 'completada';
    else if (aud.estado === 'cancelada') estado = 'reprogramada';

    return {
      id: aud.id,
      codigo: aud.codigo || '',
      nombre: aud.nombre || aud.titulo || '',
      areaAuditableId: aud.procesoAuditableId || '',
      tipo: aud.tipo || 'Gestión',
      alcance: aud.alcance || '',
      objetivoGeneral: aud.objetivos || '',
      trimestre,
      mes,
      duracionDias,
      liderAsignado: aud.auditorLider || null,
      equipoAsignado: aud.equipoAuditor || [],
      presupuesto: 0, // TODO: obtener desde backend
      estado,
      fechaInicio: aud.fechaInicio || null,
      fechaFin: aud.fechaFin || null,
      prioridad: aud.prioridad === 'Alta' ? 'alta' : aud.prioridad === 'Media' ? 'media' : 'baja'
    };
  };

  // Cargar auditorías desde la BD
  useEffect(() => {
    const cargarAuditorias = async () => {
      try {
        setLoading(true);
        console.log('[ProgramaAnual] Cargando auditorías desde BD...');
        const response = await auditoriasApi.getAllKanban();

        console.log('[ProgramaAnual] Respuesta recibida:', response);

        if (response.success && response.data) {
          console.log('[ProgramaAnual] Total auditorías recibidas:', response.data.length);

          // Filtrar solo las del año actual
          const auditoriasAnoActual = response.data.filter((aud: any) => {
            if (!aud.fechaInicio) return false;
            const fechaInicio = new Date(aud.fechaInicio);
            return fechaInicio.getFullYear() === añoActual;
          });

          console.log('[ProgramaAnual] Auditorías del año actual:', auditoriasAnoActual.length);

          // Mapear a formato de card
          const auditoriasMapeadas = auditoriasAnoActual.map(mapearAuditoriaACard);
          console.log('[ProgramaAnual] Auditorías mapeadas:', auditoriasMapeadas.length);
          setAuditoriasPrograma(auditoriasMapeadas);

          if (auditoriasMapeadas.length === 0) {
            toast.info('No hay auditorías programadas para este año', {
              description: 'Las auditorías aparecerán aquí cuando se programen'
            });
          }
        } else {
          console.warn('[ProgramaAnual] No se recibieron datos válidos. Response:', response);
          setAuditoriasPrograma([]);
          toast.info('No hay auditorías en la base de datos', {
            description: 'Las auditorías aparecerán aquí cuando se creen'
          });
        }
      } catch (error) {
        console.error('[ProgramaAnual] Error al cargar auditorías:', error);
        toast.error('Error al cargar auditorías', {
          description: error instanceof Error ? error.message : 'No se pudieron obtener las auditorías del programa anual'
        });
        setAuditoriasPrograma([]);
      } finally {
        setLoading(false);
      }
    };

    cargarAuditorias();
  }, [añoActual]);

  const auditoriaPorTrimestre = useMemo(() => ({
    'Q1': auditoriasPrograma.filter(a => a.trimestre === 'Q1'),
    'Q2': auditoriasPrograma.filter(a => a.trimestre === 'Q2'),
    'Q3': auditoriasPrograma.filter(a => a.trimestre === 'Q3'),
    'Q4': auditoriasPrograma.filter(a => a.trimestre === 'Q4')
  }), [auditoriasPrograma]);

  const estadisticas = useMemo(() => ({
    total: auditoriasPrograma.length,
    programadas: auditoriasPrograma.filter(a => a.estado === 'programada').length,
    enEjecucion: auditoriasPrograma.filter(a => a.estado === 'en-ejecucion').length,
    presupuestoTotal: auditoriasPrograma.reduce((sum, a) => sum + a.presupuesto, 0)
  }), [auditoriasPrograma]);

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
          <p className="text-sm font-bold text-gray-700 mb-1">Total Auditorías</p>
          <p className="text-3xl font-black" style={{ color: '#3B82F6' }}>{estadisticas.total}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#F59E0B', background: '#FEF3C7' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Programadas</p>
          <p className="text-3xl font-black" style={{ color: '#F59E0B' }}>{estadisticas.programadas}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#10B981', background: '#D1FAE5' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">En Ejecución</p>
          <p className="text-3xl font-black" style={{ color: '#10B981' }}>{estadisticas.enEjecucion}</p>
        </Card>
        <Card className="p-4 border-2" style={{ borderColor: '#8B5CF6', background: '#F3E8FF' }}>
          <p className="text-sm font-bold text-gray-700 mb-1">Presupuesto</p>
          <p className="text-2xl font-black" style={{ color: '#8B5CF6' }}>
            ${(estadisticas.presupuestoTotal / 1000000).toFixed(1)}M
          </p>
        </Card>
      </div>

      {/* SELECTOR DE VISTA */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">Programa Anual de Auditorías 2025</h3>
          <div className="flex gap-2">
            <Button
              variant={vistaPrograma === 'cronograma' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVistaPrograma('cronograma')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Cronograma
            </Button>
            <Button
              variant={vistaPrograma === 'tabla' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setVistaPrograma('tabla')}
            >
              <List className="w-4 h-4 mr-2" />
              Tabla
            </Button>
            <Button style={{ background: '#003DA5' }}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Auditoría
            </Button>
          </div>
        </div>
      </Card>

      {/* VISTA CRONOGRAMA */}
      {vistaPrograma === 'cronograma' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as TrimestrePrograma[]).map(trimestre => (
            <Card key={trimestre} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-gray-900">{getTrimestreLabel(trimestre)}</h4>
                <Badge style={{ background: '#3B82F6', color: 'white' }}>
                  {auditoriaPorTrimestre[trimestre].length}
                </Badge>
              </div>

              <div className="space-y-3">
                {auditoriaPorTrimestre[trimestre].map(auditoria => (
                  <AuditoriaCard key={auditoria.id} auditoria={auditoria} />
                ))}

                {auditoriaPorTrimestre[trimestre].length === 0 && (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Sin auditorías programadas</p>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* VISTA TABLA */}
      {vistaPrograma === 'tabla' && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b-2">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Código</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Trimestre</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Líder</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Duración</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Presupuesto</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {auditoriasPrograma.map(auditoria => (
                  <tr key={auditoria.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Badge variant="outline">{auditoria.codigo}</Badge>
                    </td>
                    <td className="px-4 py-3 font-bold text-sm">{auditoria.nombre}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{auditoria.tipo}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm">{getTrimestreLabel(auditoria.trimestre)}</td>
                    <td className="px-4 py-3 text-sm">{auditoria.liderAsignado || 'Sin asignar'}</td>
                    <td className="px-4 py-3 text-sm">{auditoria.duracionDias || 0} días</td>
                    <td className="px-4 py-3 text-sm">
                      ${(auditoria.presupuesto / 1000000).toFixed(1)}M
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        style={{
                          background: auditoria.estado === 'en-ejecucion' ? '#10B981' : '#3B82F6',
                          color: 'white'
                        }}
                      >
                        {auditoria.estado === 'en-ejecucion' ? 'En Ejecución' : 'Programada'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm">
                          <Eye className="w-3 h-3" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3" />
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

    </motion.div>
  );
}

function AuditoriaCard({ auditoria }: { auditoria: AuditoriaPrograma }) {
  return (
    <div className="p-3 border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-all cursor-pointer">
      <Badge variant="outline" className="mb-2 text-xs">{auditoria.codigo}</Badge>
      <h5 className="font-bold text-sm text-gray-900 mb-2 line-clamp-2">
        {auditoria.nombre}
      </h5>
      <div className="space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Tipo:</span>
          <Badge variant="outline" className="text-xs">{auditoria.tipo}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Duración:</span>
          <span className="font-bold">{auditoria.duracionDias} días</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Líder:</span>
          <span className="font-bold">{auditoria.liderAsignado || 'Sin asignar'}</span>
        </div>
      </div>
      <div className="mt-2">
        <Badge
          style={{
            background: auditoria.estado === 'en-ejecucion' ? '#10B981' : '#3B82F6',
            color: 'white'
          }}
          className="text-xs w-full justify-center"
        >
          {auditoria.estado === 'en-ejecucion' ? '▶️ En Ejecución' : '📅 Programada'}
        </Badge>
      </div>
    </div>
  );
}
