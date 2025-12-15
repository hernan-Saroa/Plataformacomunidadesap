/**
 * RF013 - GESTIÓN DE INFORMES DE LEY
 * Integración Fase 2 COMPLETA: Generación automática, notificaciones y documentos centralizados
 * Sistema de informes normativos con recordatorios y workflow
 * Oficina de Control Interno - ESAP
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

// ============ INTEGRACIÓN FASE 2 ============
import { useIntegracionControlInterno } from '../../../hooks/useIntegracionControlInterno';
import { useControlInterno } from './ControlInternoContext';
import {
  FileText, Calendar, Bell, CheckCircle2, AlertTriangle, Clock,
  Upload, Download, Eye, Edit, Send, Shield, TrendingUp, BarChart3,
  RefreshCw, Save, X, Plus, Search, Filter, ChevronDown, ChevronUp,
  FileCheck, AlertCircle, Target, Zap, Play, Pause, Award, User,
  ClipboardList, FileSpreadsheet, PieChart, Activity, Settings,
  ExternalLink, Database, CheckSquare, MessageSquare, Flag, History
} from 'lucide-react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Card } from '../../ui/card';
import { toast } from 'sonner';

// ============ TIPOS ============

type Periodicidad = 'Mensual' | 'Bimestral' | 'Trimestral' | 'Cuatrimestral' | 'Semestral' | 'Anual';
type EstadoInforme = 'No Iniciado' | 'En Elaboración' | 'En Revisión' | 'Aprobado' | 'Enviado' | 'Vencido';
type TipoIntegracion = 'Automático' | 'Manual' | 'Híbrido' | 'Externo';

interface BaseNormativa {
  norma: string;
  articulo?: string;
  descripcion: string;
}

interface SeccionInforme {
  id: string;
  nombre: string;
  descripcion: string;
  tipoIntegracion: TipoIntegracion;
  fuenteDatos?: string;
  completado: boolean;
  observaciones?: string;
}

interface DatoManual {
  id: string;
  seccionId: string;
  campo: string;
  valor: string;
  tipo: 'texto' | 'numero' | 'fecha' | 'porcentaje' | 'tabla';
  cargadoPor: string;
  fechaCarga: string;
  validado: boolean;
}

interface AplicativoExterno {
  id: string;
  nombre: string;
  url: string;
  descripcion: string;
  credenciales: boolean;
  ultimoAcceso?: string;
}

// ============ SISTEMA PROPIO DE RECORDATORIOS ELIMINADO ============
// Los recordatorios ahora se gestionan desde NotificacionesService (RF015)
// - Recordatorios de 7 días antes: enviarRecordatorioPlazo()
// - Vencimientos críticos: enviarVencimientoCritico()
// - Configuración centralizada de canales (Email, SMS)
// - Respeta preferencias del usuario

interface WorkflowEtapa {
  etapa: 'Elaboración' | 'Revisión' | 'Aprobación';
  responsable: string;
  cargo: string;
  fechaInicio?: string;
  fechaFin?: string;
  estado: 'Pendiente' | 'En Proceso' | 'Completado';
  observaciones?: string;
}

interface CatalogoInforme {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  baseNormativa: BaseNormativa[];
  periodicidad: Periodicidad;
  diasAnticipacion: number;
  destinatario: string;
  formatoEstandar: boolean;
  
  // Integración
  tipoIntegracion: TipoIntegracion;
  aplicativosExternos?: AplicativoExterno[];
  
  // Secciones del informe
  secciones: SeccionInforme[];
  
  // Vinculación con roles
  rolPrincipal: string;
  rolesSecundarios?: string[];
  
  // Configuración
  plantillaUrl?: string;
  activo: boolean;
}

interface InformeGenerado {
  id: string;
  catalogoId: string;
  codigo: string;
  nombre: string;
  periodo: string;
  año: number;
  
  // Fechas
  fechaVencimiento: string;
  fechaInicio?: string;
  fechaElaboracion?: string;
  fechaAprobacion?: string;
  fechaEnvio?: string;
  
  // Estado
  estado: EstadoInforme;
  porcentajeCompletitud: number;
  
  // Datos
  datosAutomaticos: any;
  datosManual: DatoManual[];
  
  // Workflow
  workflow: WorkflowEtapa[];
  
  // Recordatorios
  recordatorios: Recordatorio[];
  
  // Archivos
  archivoGenerado?: string;
  archivosFirmados?: string[];
  
  // Observaciones
  observaciones: string;
  
  // Metadata
  creadoPor: string;
  ultimaActualizacion: string;
}

// ============ CATÁLOGO DE INFORMES NORMATIVOS ============

const CATALOGO_INFORMES: CatalogoInforme[] = [
  {
    id: 'inf-001',
    codigo: 'INF-PORC-CI',
    nombre: 'Informe Pormenorizado del Estado del Control Interno',
    descripcion: 'Informe cuatrimestral sobre el estado del Sistema de Control Interno',
    baseNormativa: [
      {
        norma: 'Ley 1474 de 2011',
        articulo: 'Art. 9',
        descripcion: 'Estatuto Anticorrupción - Informe Pormenorizado'
      },
      {
        norma: 'Decreto 1083 de 2015',
        articulo: 'Art. 2.2.21.6.2',
        descripcion: 'Contenido y periodicidad del informe'
      }
    ],
    periodicidad: 'Cuatrimestral',
    diasAnticipacion: 7,
    destinatario: 'Representante Legal / Máximo Directivo / Ciudadanía',
    formatoEstandar: true,
    tipoIntegracion: 'Híbrido',
    secciones: [
      {
        id: 'sec-001',
        nombre: 'Estado del Sistema de Control Interno',
        descripcion: 'Evaluación general del MECI',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'Módulo de Evaluación MECI',
        completado: false
      },
      {
        id: 'sec-002',
        nombre: 'Evaluación del Mapa de Riesgos',
        descripcion: 'Seguimiento a riesgos institucionales',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'Módulo de Riesgos',
        completado: false
      },
      {
        id: 'sec-003',
        nombre: 'Avance Planes de Mejoramiento',
        descripcion: 'Seguimiento a planes de mejoramiento',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF011 - Seguimiento Planes',
        completado: false
      },
      {
        id: 'sec-004',
        nombre: 'Denuncias y Quejas',
        descripcion: 'Trámite de denuncias recibidas',
        tipoIntegracion: 'Manual',
        completado: false
      }
    ],
    rolPrincipal: 'Enfoque a la Prevención',
    rolesSecundarios: ['Evaluación y Seguimiento', 'Apoyo y Asesoría'],
    plantillaUrl: '/templates/informe_pormenorizado.docx',
    activo: true
  },
  {
    id: 'inf-002',
    codigo: 'INF-EJEC-ANUAL',
    nombre: 'Informe Ejecutivo Anual de Control Interno',
    descripcion: 'Reporte consolidado de gestión anual de la OCI',
    baseNormativa: [
      {
        norma: 'Decreto 1499 de 2017',
        articulo: 'Art. 4',
        descripcion: 'Funciones de la Oficina de Control Interno'
      }
    ],
    periodicidad: 'Anual',
    diasAnticipacion: 7,
    destinatario: 'Alta Dirección',
    formatoEstandar: true,
    tipoIntegracion: 'Híbrido',
    secciones: [
      {
        id: 'sec-101',
        nombre: 'Auditorías Realizadas',
        descripcion: 'Consolidado de auditorías del período',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF006 - Gestión de Auditorías',
        completado: false
      },
      {
        id: 'sec-102',
        nombre: 'Hallazgos Identificados',
        descripcion: 'Resumen de hallazgos por tipo y gravedad',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF008 - Gestión de Hallazgos',
        completado: false
      },
      {
        id: 'sec-103',
        nombre: 'Planes de Mejoramiento',
        descripcion: 'Seguimiento y efectividad de planes',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF010-RF011 - Planes de Mejoramiento',
        completado: false
      }
    ],
    rolPrincipal: 'Evaluación y Seguimiento',
    rolesSecundarios: ['Enfoque a la Prevención'],
    plantillaUrl: '/templates/informe_ejecutivo_anual.docx',
    activo: true
  },
  {
    id: 'inf-003',
    codigo: 'INF-FURAG',
    nombre: 'FURAG - Formulario Único de Reportes de Avances en Gestión',
    descripcion: 'Reporte de gestión y desempeño institucional',
    baseNormativa: [
      {
        norma: 'Decreto 1082 de 2015',
        articulo: 'Art. 2.2.22.3.9',
        descripcion: 'FURAG como instrumento de medición del desempeño'
      }
    ],
    periodicidad: 'Anual',
    diasAnticipacion: 7,
    destinatario: 'Función Pública',
    formatoEstandar: false,
    tipoIntegracion: 'Externo',
    aplicativosExternos: [
      {
        id: 'app-furag',
        nombre: 'Portal FURAG - Función Pública',
        url: 'https://www.funcionpublica.gov.co/furag',
        descripcion: 'Aplicativo web para diligenciamiento del FURAG',
        credenciales: true
      }
    ],
    secciones: [
      {
        id: 'sec-201',
        nombre: 'Políticas de Gestión y Desempeño',
        descripcion: 'Evaluación de políticas institucionales',
        tipoIntegracion: 'Manual',
        completado: false
      },
      {
        id: 'sec-202',
        nombre: 'Dimensiones MIPG',
        descripcion: 'Evaluación del Modelo Integrado de Planeación y Gestión',
        tipoIntegracion: 'Manual',
        completado: false
      }
    ],
    rolPrincipal: 'Enfoque a la Prevención',
    rolesSecundarios: ['Evaluación y Seguimiento'],
    activo: true
  },
  {
    id: 'inf-004',
    codigo: 'INF-CONT-GEN',
    nombre: 'Informe a Contraloría General de la República',
    descripcion: 'Reporte de gestión fiscal y administrativa',
    baseNormativa: [
      {
        norma: 'Ley 42 de 1993',
        articulo: 'Art. 9',
        descripcion: 'Control Fiscal - Informes a Contraloría'
      }
    ],
    periodicidad: 'Trimestral',
    diasAnticipacion: 7,
    destinatario: 'Contraloría General de la República',
    formatoEstandar: false,
    tipoIntegracion: 'Externo',
    aplicativosExternos: [
      {
        id: 'app-sireci',
        nombre: 'SIRECI - Sistema de Rendición Electrónica de Cuentas',
        url: 'https://www.contraloria.gov.co/sireci',
        descripcion: 'Plataforma de rendición de cuentas fiscales',
        credenciales: true
      }
    ],
    secciones: [
      {
        id: 'sec-301',
        nombre: 'Ejecución Presupuestal',
        descripcion: 'Información de ingresos y gastos',
        tipoIntegracion: 'Externo',
        completado: false
      }
    ],
    rolPrincipal: 'Enfoque a la Prevención',
    activo: true
  },
  {
    id: 'inf-005',
    codigo: 'INF-SEG-PM',
    nombre: 'Informe de Seguimiento a Planes de Mejoramiento',
    descripcion: 'Reporte trimestral de avance de planes de mejoramiento',
    baseNormativa: [
      {
        norma: 'Decreto 1083 de 2015',
        descripcion: 'Seguimiento a planes de mejoramiento institucionales'
      }
    ],
    periodicidad: 'Trimestral',
    diasAnticipacion: 7,
    destinatario: 'Alta Dirección',
    formatoEstandar: true,
    tipoIntegracion: 'Automático',
    secciones: [
      {
        id: 'sec-401',
        nombre: 'Avance de Acciones Correctivas',
        descripcion: 'Porcentaje de cumplimiento por plan',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF011 - Seguimiento Planes',
        completado: false
      },
      {
        id: 'sec-402',
        nombre: 'Evidencias Validadas',
        descripcion: 'Estado de validación de evidencias',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF011 - Seguimiento Planes',
        completado: false
      }
    ],
    rolPrincipal: 'Evaluación y Seguimiento',
    rolesSecundarios: ['Enfoque a la Prevención'],
    plantillaUrl: '/templates/seguimiento_planes.xlsx',
    activo: true
  },
  {
    id: 'inf-006',
    codigo: 'INF-AUDIT-REAL',
    nombre: 'Informe Consolidado de Auditorías Realizadas',
    descripcion: 'Reporte semestral de auditorías ejecutadas',
    baseNormativa: [
      {
        norma: 'Decreto 1499 de 2017',
        descripcion: 'Función de auditoría interna'
      }
    ],
    periodicidad: 'Semestral',
    diasAnticipacion: 7,
    destinatario: 'Alta Dirección',
    formatoEstandar: true,
    tipoIntegracion: 'Automático',
    secciones: [
      {
        id: 'sec-501',
        nombre: 'Auditorías Programadas vs Ejecutadas',
        descripcion: 'Cumplimiento del Plan Anual de Auditorías',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF003 - Programa Anual',
        completado: false
      },
      {
        id: 'sec-502',
        nombre: 'Hallazgos por Proceso',
        descripcion: 'Consolidado de hallazgos identificados',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF008 - Gestión de Hallazgos',
        completado: false
      }
    ],
    rolPrincipal: 'Evaluación y Seguimiento',
    plantillaUrl: '/templates/auditorias_realizadas.xlsx',
    activo: true
  },
  {
    id: 'inf-007',
    codigo: 'INF-MECI',
    nombre: 'Informe de Evaluación Independiente del MECI',
    descripcion: 'Evaluación anual del Modelo Estándar de Control Interno',
    baseNormativa: [
      {
        norma: 'Decreto 1499 de 2017',
        articulo: 'Art. 3',
        descripcion: 'Evaluación independiente del sistema de control interno'
      }
    ],
    periodicidad: 'Anual',
    diasAnticipacion: 7,
    destinatario: 'Representante Legal / Función Pública',
    formatoEstandar: true,
    tipoIntegracion: 'Híbrido',
    secciones: [
      {
        id: 'sec-601',
        nombre: 'Módulo de Control Estratégico',
        descripcion: 'Evaluación del componente estratégico',
        tipoIntegracion: 'Manual',
        completado: false
      },
      {
        id: 'sec-602',
        nombre: 'Módulo de Control de Gestión',
        descripcion: 'Evaluación de la gestión operativa',
        tipoIntegracion: 'Manual',
        completado: false
      },
      {
        id: 'sec-603',
        nombre: 'Módulo de Control de Evaluación',
        descripcion: 'Evaluación de mecanismos de autoevaluación',
        tipoIntegracion: 'Manual',
        completado: false
      }
    ],
    rolPrincipal: 'Evaluación y Seguimiento',
    rolesSecundarios: ['Enfoque a la Prevención'],
    plantillaUrl: '/templates/evaluacion_meci.docx',
    activo: true
  },
  {
    id: 'inf-008',
    codigo: 'INF-AUST-GASTO',
    nombre: 'Informe de Austeridad del Gasto',
    descripcion: 'Reporte trimestral de medidas de austeridad',
    baseNormativa: [
      {
        norma: 'Decreto 1737 de 1998',
        descripcion: 'Medidas de austeridad y eficiencia del gasto público'
      }
    ],
    periodicidad: 'Trimestral',
    diasAnticipacion: 7,
    destinatario: 'Alta Dirección / Contraloría',
    formatoEstandar: true,
    tipoIntegracion: 'Híbrido',
    secciones: [
      {
        id: 'sec-701',
        nombre: 'Gastos de Funcionamiento',
        descripcion: 'Análisis de gastos de personal y generales',
        tipoIntegracion: 'Manual',
        completado: false
      },
      {
        id: 'sec-702',
        nombre: 'Cumplimiento Medidas de Austeridad',
        descripcion: 'Verificación de implementación de medidas',
        tipoIntegracion: 'Manual',
        completado: false
      }
    ],
    rolPrincipal: 'Enfoque a la Prevención',
    plantillaUrl: '/templates/austeridad_gasto.xlsx',
    activo: true
  },
  {
    id: 'inf-009',
    codigo: 'INF-REND-CTAS',
    nombre: 'Informe de Rendición de Cuentas a la Ciudadanía',
    descripcion: 'Reporte anual de gestión institucional',
    baseNormativa: [
      {
        norma: 'Ley 1474 de 2011',
        articulo: 'Art. 78',
        descripcion: 'Rendición de cuentas como estrategia de transparencia'
      },
      {
        norma: 'Documento CONPES 3654 de 2010',
        descripcion: 'Política de Rendición de Cuentas'
      }
    ],
    periodicidad: 'Anual',
    diasAnticipacion: 7,
    destinatario: 'Ciudadanía / Grupos de Interés',
    formatoEstandar: true,
    tipoIntegracion: 'Híbrido',
    secciones: [
      {
        id: 'sec-801',
        nombre: 'Logros y Resultados',
        descripcion: 'Presentación de resultados institucionales',
        tipoIntegracion: 'Manual',
        completado: false
      },
      {
        id: 'sec-802',
        nombre: 'Gestión de Control Interno',
        descripcion: 'Resultados de auditorías y seguimientos',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF006-RF008 - Auditorías y Hallazgos',
        completado: false
      }
    ],
    rolPrincipal: 'Enfoque a la Prevención',
    rolesSecundarios: ['Apoyo y Asesoría'],
    plantillaUrl: '/templates/rendicion_cuentas.pptx',
    activo: true
  },
  {
    id: 'inf-010',
    codigo: 'INF-RIESGOS',
    nombre: 'Informe de Seguimiento a Mapas de Riesgos',
    descripcion: 'Evaluación semestral del mapa de riesgos institucional',
    baseNormativa: [
      {
        norma: 'Decreto 1083 de 2015',
        descripcion: 'Política de administración del riesgo'
      }
    ],
    periodicidad: 'Semestral',
    diasAnticipacion: 7,
    destinatario: 'Alta Dirección / Comité de Riesgos',
    formatoEstandar: true,
    tipoIntegracion: 'Híbrido',
    secciones: [
      {
        id: 'sec-901',
        nombre: 'Riesgos Materializados',
        descripcion: 'Eventos de riesgo ocurridos',
        tipoIntegracion: 'Manual',
        completado: false
      },
      {
        id: 'sec-902',
        nombre: 'Efectividad de Controles',
        descripcion: 'Evaluación de controles implementados',
        tipoIntegracion: 'Manual',
        completado: false
      }
    ],
    rolPrincipal: 'Enfoque a la Prevención',
    rolesSecundarios: ['Evaluación y Seguimiento'],
    plantillaUrl: '/templates/seguimiento_riesgos.xlsx',
    activo: true
  },
  {
    id: 'inf-011',
    codigo: 'INF-CONF-INT',
    nombre: 'Informe de Conflictos de Interés',
    descripcion: 'Reporte semestral de situaciones de conflicto de interés',
    baseNormativa: [
      {
        norma: 'Ley 1474 de 2011',
        articulo: 'Art. 5',
        descripcion: 'Conflictos de interés y nepotismo'
      }
    ],
    periodicidad: 'Semestral',
    diasAnticipacion: 7,
    destinatario: 'Alta Dirección',
    formatoEstandar: true,
    tipoIntegracion: 'Manual',
    secciones: [
      {
        id: 'sec-1001',
        nombre: 'Casos Identificados',
        descripcion: 'Situaciones de conflicto reportadas',
        tipoIntegracion: 'Manual',
        completado: false
      },
      {
        id: 'sec-1002',
        nombre: 'Acciones Tomadas',
        descripcion: 'Medidas adoptadas para mitigar conflictos',
        tipoIntegracion: 'Manual',
        completado: false
      }
    ],
    rolPrincipal: 'Enfoque a la Prevención',
    plantillaUrl: '/templates/conflictos_interes.docx',
    activo: true
  },
  {
    id: 'inf-012',
    codigo: 'INF-ANTIC-CORR',
    nombre: 'Informe de Cumplimiento Normatividad Anticorrupción',
    descripcion: 'Reporte anual de implementación de políticas anticorrupción',
    baseNormativa: [
      {
        norma: 'Ley 1474 de 2011',
        descripcion: 'Estatuto Anticorrupción'
      },
      {
        norma: 'Ley 1712 de 2014',
        descripcion: 'Transparencia y Acceso a la Información'
      }
    ],
    periodicidad: 'Anual',
    diasAnticipacion: 7,
    destinatario: 'Alta Dirección / Secretaría de Transparencia',
    formatoEstandar: true,
    tipoIntegracion: 'Híbrido',
    secciones: [
      {
        id: 'sec-1101',
        nombre: 'Plan Anticorrupción',
        descripcion: 'Seguimiento a plan anticorrupción y atención al ciudadano',
        tipoIntegracion: 'Manual',
        completado: false
      },
      {
        id: 'sec-1102',
        nombre: 'Denuncias Anticorrupción',
        descripcion: 'Casos reportados y gestionados',
        tipoIntegracion: 'Manual',
        completado: false
      }
    ],
    rolPrincipal: 'Enfoque a la Prevención',
    rolesSecundarios: ['Apoyo y Asesoría'],
    plantillaUrl: '/templates/cumplimiento_anticorrupcion.docx',
    activo: true
  },
  {
    id: 'inf-013',
    codigo: 'INF-DENUNCIAS',
    nombre: 'Informe de Seguimiento a Denuncias y PQR',
    descripcion: 'Reporte trimestral de trámite de denuncias y quejas',
    baseNormativa: [
      {
        norma: 'Ley 1474 de 2011',
        articulo: 'Art. 73',
        descripcion: 'Mecanismos de denuncia ciudadana'
      }
    ],
    periodicidad: 'Trimestral',
    diasAnticipacion: 7,
    destinatario: 'Alta Dirección',
    formatoEstandar: true,
    tipoIntegracion: 'Manual',
    secciones: [
      {
        id: 'sec-1201',
        nombre: 'Denuncias Recibidas',
        descripcion: 'Casos recibidos por canal y tipo',
        tipoIntegracion: 'Manual',
        completado: false
      },
      {
        id: 'sec-1202',
        nombre: 'Trámite y Respuesta',
        descripcion: 'Estado de las denuncias y tiempo de respuesta',
        tipoIntegracion: 'Manual',
        completado: false
      }
    ],
    rolPrincipal: 'Enfoque a la Prevención',
    rolesSecundarios: ['Apoyo y Asesoría'],
    plantillaUrl: '/templates/denuncias_pqr.xlsx',
    activo: true
  },
  {
    id: 'inf-014',
    codigo: 'INF-EVAL-DESEMP',
    nombre: 'Informe de Evaluación de Políticas de Gestión y Desempeño',
    descripcion: 'Evaluación anual del Modelo Integrado de Planeación y Gestión - MIPG',
    baseNormativa: [
      {
        norma: 'Decreto 1499 de 2017',
        descripcion: 'Evaluación del MIPG'
      }
    ],
    periodicidad: 'Anual',
    diasAnticipacion: 7,
    destinatario: 'Alta Dirección / Función Pública',
    formatoEstandar: true,
    tipoIntegracion: 'Híbrido',
    secciones: [
      {
        id: 'sec-1301',
        nombre: '7 Dimensiones del MIPG',
        descripcion: 'Evaluación de dimensiones de política',
        tipoIntegracion: 'Manual',
        completado: false
      }
    ],
    rolPrincipal: 'Evaluación y Seguimiento',
    rolesSecundarios: ['Enfoque a la Prevención'],
    plantillaUrl: '/templates/evaluacion_mipg.xlsx',
    activo: true
  },
  {
    id: 'inf-015',
    codigo: 'INF-GEST-ANUAL',
    nombre: 'Informe de Gestión Anual OCI',
    descripcion: 'Reporte integral de actividades de la OCI',
    baseNormativa: [
      {
        norma: 'Decreto 1499 de 2017',
        descripcion: 'Funciones de la Oficina de Control Interno'
      }
    ],
    periodicidad: 'Anual',
    diasAnticipacion: 7,
    destinatario: 'Máximo Directivo',
    formatoEstandar: true,
    tipoIntegracion: 'Híbrido',
    secciones: [
      {
        id: 'sec-1401',
        nombre: 'Actividades Realizadas',
        descripcion: 'Consolidado de actividades por rol',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'Todos los módulos',
        completado: false
      },
      {
        id: 'sec-1402',
        nombre: 'Indicadores de Gestión',
        descripcion: 'Cumplimiento de indicadores OCI',
        tipoIntegracion: 'Automático',
        completado: false
      }
    ],
    rolPrincipal: 'Evaluación y Seguimiento',
    rolesSecundarios: ['Enfoque a la Prevención', 'Apoyo y Asesoría', 'Relación con Entes Externos'],
    plantillaUrl: '/templates/gestion_anual_oci.docx',
    activo: true
  },
  {
    id: 'inf-016',
    codigo: 'INF-IND-MENSUAL',
    nombre: 'Informe de Indicadores Mensuales OCI',
    descripcion: 'Dashboard mensual de indicadores de gestión',
    baseNormativa: [
      {
        norma: 'Guía de Administración del Riesgo y Diseño de Controles',
        descripcion: 'Seguimiento mensual a indicadores'
      }
    ],
    periodicidad: 'Mensual',
    diasAnticipacion: 7,
    destinatario: 'Jefe OCI / Equipo OCI',
    formatoEstandar: true,
    tipoIntegracion: 'Automático',
    secciones: [
      {
        id: 'sec-1501',
        nombre: 'Cumplimiento Plan Anual',
        descripcion: 'Avance del plan anual de auditorías',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF003 - Programa Anual',
        completado: false
      },
      {
        id: 'sec-1502',
        nombre: 'Estado Planes de Mejoramiento',
        descripcion: 'Seguimiento mensual a planes',
        tipoIntegracion: 'Automático',
        fuenteDatos: 'RF011 - Seguimiento Planes',
        completado: false
      }
    ],
    rolPrincipal: 'Evaluación y Seguimiento',
    plantillaUrl: '/templates/indicadores_mensuales.xlsx',
    activo: true
  }
];

// ============ DATOS MOCK ============

const MOCK_INFORMES_GENERADOS: InformeGenerado[] = [
  {
    id: 'gen-001',
    catalogoId: 'inf-001',
    codigo: 'INF-PORC-CI-2025-Q1',
    nombre: 'Informe Pormenorizado del Estado del Control Interno - Q1 2025',
    periodo: 'Cuatrimestre I',
    año: 2025,
    fechaVencimiento: '2025-05-15',
    fechaInicio: '2025-04-01',
    fechaElaboracion: '2025-05-10',
    estado: 'En Revisión',
    porcentajeCompletitud: 85,
    datosAutomaticos: {
      estadoMECI: { calificacion: 87, nivel: 'Satisfactorio' },
      planesMejoramiento: { total: 4, cumplidos: 1, enProceso: 2, vencidos: 1 }
    },
    datosManual: [
      {
        id: 'dm-001',
        seccionId: 'sec-004',
        campo: 'Total Denuncias Recibidas',
        valor: '12',
        tipo: 'numero',
        cargadoPor: 'Ana García Torres',
        fechaCarga: '2025-05-05',
        validado: true
      },
      {
        id: 'dm-002',
        seccionId: 'sec-004',
        campo: 'Denuncias En Trámite',
        valor: '3',
        tipo: 'numero',
        cargadoPor: 'Ana García Torres',
        fechaCarga: '2025-05-05',
        validado: true
      }
    ],
    workflow: [
      {
        etapa: 'Elaboración',
        responsable: 'Pedro Gómez Ruiz',
        cargo: 'Profesional Universitario OCI',
        fechaInicio: '2025-04-01',
        fechaFin: '2025-05-08',
        estado: 'Completado',
        observaciones: 'Informe elaborado con datos consolidados'
      },
      {
        etapa: 'Revisión',
        responsable: 'Ana García Torres',
        cargo: 'Auditora Senior OCI',
        fechaInicio: '2025-05-09',
        estado: 'En Proceso',
        observaciones: 'En proceso de revisión técnica'
      },
      {
        etapa: 'Aprobación',
        responsable: 'Carlos Martínez López',
        cargo: 'Jefe Oficina Control Interno',
        estado: 'Pendiente'
      }
    ],
    recordatorios: [
      {
        id: 'rec-001',
        informeId: 'gen-001',
        codigoInforme: 'INF-PORC-CI-2025-Q1',
        diasAnticipacion: 7,
        fechaVencimiento: '2025-05-15',
        fechaRecordatorio: '2025-05-08',
        enviado: true,
        destinatarios: ['pedro.gomez@esap.edu.co', 'ana.garcia@esap.edu.co'],
        mensaje: 'Recordatorio: El Informe Pormenorizado Q1 2025 vence en 7 días (15/05/2025)'
      }
    ],
    archivoGenerado: '/informes/2025/INF-PORC-CI-2025-Q1.pdf',
    observaciones: 'Pendiente firma del Jefe OCI para envío',
    creadoPor: 'Pedro Gómez Ruiz',
    ultimaActualizacion: '2025-05-10'
  },
  {
    id: 'gen-002',
    catalogoId: 'inf-005',
    codigo: 'INF-SEG-PM-2025-Q1',
    nombre: 'Informe de Seguimiento a Planes de Mejoramiento - Q1 2025',
    periodo: 'Trimestre I',
    año: 2025,
    fechaVencimiento: '2025-04-30',
    fechaInicio: '2025-03-25',
    fechaElaboracion: '2025-04-25',
    fechaAprobacion: '2025-04-28',
    fechaEnvio: '2025-04-29',
    estado: 'Enviado',
    porcentajeCompletitud: 100,
    datosAutomaticos: {
      planesActivos: 4,
      accionesTotales: 15,
      accionesCumplidas: 5,
      porcentajeAvanceGlobal: 60
    },
    datosManual: [],
    workflow: [
      {
        etapa: 'Elaboración',
        responsable: 'Laura Martínez Silva',
        cargo: 'Profesional Universitario OCI',
        fechaInicio: '2025-03-25',
        fechaFin: '2025-04-24',
        estado: 'Completado'
      },
      {
        etapa: 'Revisión',
        responsable: 'Ana García Torres',
        cargo: 'Auditora Senior OCI',
        fechaInicio: '2025-04-25',
        fechaFin: '2025-04-27',
        estado: 'Completado'
      },
      {
        etapa: 'Aprobación',
        responsable: 'Carlos Martínez López',
        cargo: 'Jefe Oficina Control Interno',
        fechaInicio: '2025-04-27',
        fechaFin: '2025-04-28',
        estado: 'Completado',
        observaciones: 'Aprobado para envío a Alta Dirección'
      }
    ],
    recordatorios: [
      {
        id: 'rec-002',
        informeId: 'gen-002',
        codigoInforme: 'INF-SEG-PM-2025-Q1',
        diasAnticipacion: 7,
        fechaVencimiento: '2025-04-30',
        fechaRecordatorio: '2025-04-23',
        enviado: true,
        destinatarios: ['laura.martinez@esap.edu.co'],
        mensaje: 'Recordatorio: El Informe de Seguimiento a Planes Q1 2025 vence en 7 días'
      }
    ],
    archivoGenerado: '/informes/2025/INF-SEG-PM-2025-Q1.xlsx',
    archivosFirmados: ['/informes/2025/INF-SEG-PM-2025-Q1-FIRMADO.pdf'],
    observaciones: 'Informe enviado exitosamente a Alta Dirección',
    creadoPor: 'Laura Martínez Silva',
    ultimaActualizacion: '2025-04-29'
  },
  {
    id: 'gen-003',
    catalogoId: 'inf-016',
    codigo: 'INF-IND-MENSUAL-2025-04',
    nombre: 'Informe de Indicadores Mensuales OCI - Abril 2025',
    periodo: 'Abril',
    año: 2025,
    fechaVencimiento: '2025-05-05',
    estado: 'Vencido',
    porcentajeCompletitud: 40,
    datosAutomaticos: {
      cumplimientoPlanAnual: 35,
      auditoriasProgramadas: 12,
      auditoriasRealizadas: 4
    },
    datosManual: [],
    workflow: [
      {
        etapa: 'Elaboración',
        responsable: 'Pedro Gómez Ruiz',
        cargo: 'Profesional Universitario OCI',
        fechaInicio: '2025-04-28',
        estado: 'En Proceso',
        observaciones: 'Pendiente consolidar datos finales'
      },
      {
        etapa: 'Revisión',
        responsable: 'Carlos Martínez López',
        cargo: 'Jefe Oficina Control Interno',
        estado: 'Pendiente'
      },
      {
        etapa: 'Aprobación',
        responsable: 'Carlos Martínez López',
        cargo: 'Jefe Oficina Control Interno',
        estado: 'Pendiente'
      }
    ],
    recordatorios: [
      {
        id: 'rec-003',
        informeId: 'gen-003',
        codigoInforme: 'INF-IND-MENSUAL-2025-04',
        diasAnticipacion: 7,
        fechaVencimiento: '2025-05-05',
        fechaRecordatorio: '2025-04-28',
        enviado: true,
        destinatarios: ['pedro.gomez@esap.edu.co'],
        mensaje: 'Recordatorio: El Informe Mensual de Indicadores Abril 2025 vence en 7 días'
      }
    ],
    observaciones: 'VENCIDO - Requiere justificación del retraso',
    creadoPor: 'Pedro Gómez Ruiz',
    ultimaActualizacion: '2025-05-03'
  }
];

// ============ COMPONENTE PRINCIPAL ============

export function GestionInformesLey() {
  const [vistaActual, setVistaActual] = useState<'catalogo' | 'generados' | 'detalle'>('generados');
  const [informeSeleccionado, setInformeSeleccionado] = useState<InformeGenerado | null>(null);
  const [catalogoSeleccionado, setCatalogoSeleccionado] = useState<CatalogoInforme | null>(null);
  
  // ============ INTEGRACIÓN FASE 2 ============
  const { auditoria, guardarDocumento, notificarCambio } = useIntegracionControlInterno();
  const controlContext = useControlInterno();
  
  // Informes generados
  const [informesGenerados, setInformesGenerados] = useState<InformeGenerado[]>(MOCK_INFORMES_GENERADOS);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState('Todos');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroRol, setFiltroRol] = useState('Todos');
  
  // Modales
  const [modalNuevoInforme, setModalNuevoInforme] = useState(false);
  const [modalCargarDatos, setModalCargarDatos] = useState(false);
  const [modalWorkflow, setModalWorkflow] = useState(false);

  // Estadísticas
  const stats = {
    totalInformes: informesGenerados.length,
    enElaboracion: informesGenerados.filter(i => i.estado === 'En Elaboración').length,
    enRevision: informesGenerados.filter(i => i.estado === 'En Revisión').length,
    vencidos: informesGenerados.filter(i => i.estado === 'Vencido').length,
    proxVencer: informesGenerados.filter(i => {
      const dias = Math.ceil((new Date(i.fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return dias > 0 && dias <= 7;
    }).length
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Gestión de Informes de Ley
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            RF012 - Catálogo normativo, recordatorios automáticos y workflow
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setVistaActual('generados')}
            variant={vistaActual === 'generados' ? 'default' : 'outline'}
            size="sm"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Informes Generados
          </Button>
          <Button
            onClick={() => setVistaActual('catalogo')}
            variant={vistaActual === 'catalogo' ? 'default' : 'outline'}
            size="sm"
          >
            <Database className="w-4 h-4 mr-2" />
            Catálogo
          </Button>
          <Button
            onClick={() => setModalNuevoInforme(true)}
            size="sm"
            style={{ background: '#10B981' }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Generar Informe
          </Button>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#3B82F6' }}>
          <p className="text-xs text-gray-600">Total Informes</p>
          <p className="text-2xl font-black text-gray-900">{stats.totalInformes}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#F59E0B' }}>
          <p className="text-xs text-gray-600">En Elaboración</p>
          <p className="text-2xl font-black text-amber-600">{stats.enElaboracion}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#8B5CF6' }}>
          <p className="text-xs text-gray-600">En Revisión</p>
          <p className="text-2xl font-black text-purple-600">{stats.enRevision}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#EF4444' }}>
          <p className="text-xs text-gray-600">Vencidos</p>
          <p className="text-2xl font-black text-red-600">{stats.vencidos}</p>
        </Card>
        <Card className="p-3 border-l-4" style={{ borderLeftColor: '#F97316' }}>
          <p className="text-xs text-gray-600">Próximos a Vencer</p>
          <p className="text-2xl font-black text-orange-600">{stats.proxVencer}</p>
        </Card>
      </div>

      {/* VISTAS */}
      <AnimatePresence mode="wait">
        {vistaActual === 'generados' && (
          <VistainformesGenerados
            key="generados"
            informes={informesGenerados}
            onVerDetalle={(informe) => {
              setInformeSeleccionado(informe);
              setVistaActual('detalle');
            }}
          />
        )}

        {vistaActual === 'catalogo' && (
          <VistaCatalogoInformes
            key="catalogo"
            catalogo={CATALOGO_INFORMES}
            onGenerarInforme={(cat) => {
              setCatalogoSeleccionado(cat);
              setModalNuevoInforme(true);
            }}
          />
        )}

        {vistaActual === 'detalle' && informeSeleccionado && (
          <VistaDetalleInforme
            key="detalle"
            informe={informeSeleccionado}
            catalogo={CATALOGO_INFORMES.find(c => c.id === informeSeleccionado.catalogoId)!}
            onVolver={() => setVistaActual('generados')}
            onCargarDatos={() => setModalCargarDatos(true)}
            onGestionarWorkflow={() => setModalWorkflow(true)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============ VISTA: INFORMES GENERADOS ============

function VistainformesGenerados({ informes, onVerDetalle }: any) {
  const [expandido, setExpandido] = useState<string | null>(null);

  const getEstadoColor = (estado: EstadoInforme) => {
    switch (estado) {
      case 'No Iniciado': return '#6B7280';
      case 'En Elaboración': return '#F59E0B';
      case 'En Revisión': return '#8B5CF6';
      case 'Aprobado': return '#10B981';
      case 'Enviado': return '#3B82F6';
      case 'Vencido': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const diasRestantes = (fechaVencimiento: string) => {
    return Math.ceil((new Date(fechaVencimiento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {informes.map((informe: InformeGenerado) => {
        const dias = diasRestantes(informe.fechaVencimiento);
        const alertaVencimiento = dias <= 7 && dias > 0;
        const vencido = dias < 0;

        return (
          <Card key={informe.id} className="overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border-b">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <Badge className="font-black" style={{ background: '#6B7280', color: '#FFF' }}>
                      {informe.codigo}
                    </Badge>
                    <Badge style={{ background: getEstadoColor(informe.estado), color: '#FFF' }}>
                      {informe.estado}
                    </Badge>
                    {(alertaVencimiento || vencido) && (
                      <Badge style={{ background: vencido ? '#EF4444' : '#F97316', color: '#FFF' }}>
                        <Bell className="w-3 h-3 mr-1" />
                        {vencido ? `Vencido hace ${Math.abs(dias)} días` : `Vence en ${dias} días`}
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-black text-gray-900 mb-1">{informe.nombre}</h3>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Vence: {informe.fechaVencimiento}
                    </span>
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {informe.porcentajeCompletitud}% completo
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setExpandido(expandido === informe.id ? null : informe.id)}
                    variant="outline"
                    size="sm"
                  >
                    {expandido === informe.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Barra de Progreso */}
              <div className="mt-3">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${informe.porcentajeCompletitud}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full rounded-full"
                    style={{ background: informe.porcentajeCompletitud === 100 ? '#10B981' : '#3B82F6' }}
                  />
                </div>
              </div>
            </div>

            {/* Contenido Expandible */}
            <AnimatePresence>
              {expandido === informe.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    {/* Workflow */}
                    <div>
                      <p className="text-xs font-bold text-gray-900 uppercase mb-2">Workflow</p>
                      <div className="flex gap-2">
                        {informe.workflow.map((etapa: WorkflowEtapa, idx: number) => (
                          <div key={idx} className="flex-1 p-2 rounded-lg text-center" style={{
                            background: etapa.estado === 'Completado' ? '#D1FAE5' :
                                       etapa.estado === 'En Proceso' ? '#FEF3C7' : '#F3F4F6'
                          }}>
                            <p className="text-xs font-bold" style={{
                              color: etapa.estado === 'Completado' ? '#065F46' :
                                    etapa.estado === 'En Proceso' ? '#92400E' : '#6B7280'
                            }}>
                              {etapa.etapa}
                            </p>
                            <p className="text-xs" style={{
                              color: etapa.estado === 'Completado' ? '#059669' :
                                    etapa.estado === 'En Proceso' ? '#D97706' : '#9CA3AF'
                            }}>
                              {etapa.responsable}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t">
                      <Button onClick={() => onVerDetalle(informe)} variant="outline" size="sm">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalle
                      </Button>
                      {informe.archivoGenerado && (
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </Button>
                      )}
                      {(informe.estado === 'En Elaboración' || informe.estado === 'En Revisión') && (
                        <Button size="sm" style={{ background: '#3B82F6' }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Continuar Elaboración
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}

      {informes.length === 0 && (
        <Card className="p-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No hay informes generados</p>
        </Card>
      )}
    </motion.div>
  );
}

// ============ VISTA: CATÁLOGO DE INFORMES (continuará en siguiente mensaje por límite de tokens) ============

function VistaCatalogoInformes({ catalogo, onGenerarInforme }: any) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroPeriodicidad, setFiltroPeriodicidad] = useState('Todos');
  const [expandido, setExpandido] = useState<string | null>(null);

  const informesFiltrados = catalogo.filter((inf: CatalogoInforme) => {
    const coincideBusqueda = inf.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
                             inf.codigo.toLowerCase().includes(busqueda.toLowerCase());
    const coincidePeriodicidad = filtroPeriodicidad === 'Todos' || inf.periodicidad === filtroPeriodicidad;
    return coincideBusqueda && coincidePeriodicidad && inf.activo;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Filtros */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o código..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <select
            value={filtroPeriodicidad}
            onChange={(e) => setFiltroPeriodicidad(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Todos">Todas las periodicidades</option>
            <option value="Mensual">Mensual</option>
            <option value="Bimestral">Bimestral</option>
            <option value="Trimestral">Trimestral</option>
            <option value="Cuatrimestral">Cuatrimestral</option>
            <option value="Semestral">Semestral</option>
            <option value="Anual">Anual</option>
          </select>
        </div>
      </Card>

      {/* Lista de Informes */}
      <div className="space-y-3">
        {informesFiltrados.map((informe: CatalogoInforme) => (
          <Card key={informe.id} className="overflow-hidden">
            <div className="p-4" style={{ background: '#F9FAFB' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="font-black" style={{ background: '#3B82F6', color: '#FFF' }}>
                      {informe.codigo}
                    </Badge>
                    <Badge variant="outline">{informe.periodicidad}</Badge>
                    <Badge style={{ background: '#10B981', color: '#FFF' }}>
                      {informe.rolPrincipal}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1">{informe.nombre}</h3>
                  <p className="text-sm text-gray-600 mb-2">{informe.descripcion}</p>
                  
                  {/* Base Normativa */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Shield className="w-3 h-3" />
                    {informe.baseNormativa.map((bn, idx) => (
                      <span key={idx}>
                        {bn.norma} {bn.articulo && `- ${bn.articulo}`}
                        {idx < informe.baseNormativa.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setExpandido(expandido === informe.id ? null : informe.id)}
                    variant="outline"
                    size="sm"
                  >
                    {expandido === informe.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={() => onGenerarInforme(informe)}
                    size="sm"
                    style={{ background: '#10B981' }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Detalles Expandibles */}
            <AnimatePresence>
              {expandido === informe.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t overflow-hidden"
                >
                  <div className="p-4 space-y-3">
                    {/* Secciones del Informe */}
                    <div>
                      <p className="text-xs font-bold text-gray-900 uppercase mb-2">
                        Secciones del Informe ({informe.secciones.length})
                      </p>
                      <div className="space-y-2">
                        {informe.secciones.map((seccion: SeccionInforme) => (
                          <div key={seccion.id} className="p-2 rounded-lg" style={{ background: '#F3F4F6' }}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-bold text-gray-900">{seccion.nombre}</p>
                                <p className="text-xs text-gray-600">{seccion.descripcion}</p>
                              </div>
                              <Badge variant="outline">{seccion.tipoIntegracion}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Aplicativos Externos */}
                    {informe.aplicativosExternos && informe.aplicativosExternos.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-gray-900 uppercase mb-2">
                          Aplicativos Externos
                        </p>
                        {informe.aplicativosExternos.map((app: AplicativoExterno) => (
                          <div key={app.id} className="p-2 rounded-lg" style={{ background: '#DBEAFE' }}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-bold text-blue-900">{app.nombre}</p>
                                <p className="text-xs text-blue-700">{app.descripcion}</p>
                              </div>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        ))}
      </div>

      <div className="p-4 rounded-lg text-center" style={{ background: '#F3F4F6' }}>
        <p className="text-sm text-gray-600">
          Total de informes en catálogo: <strong>{catalogo.filter((c: CatalogoInforme) => c.activo).length}</strong>
        </p>
      </div>
    </motion.div>
  );
}

// ============ VISTA: DETALLE DE INFORME (placeholder) ============

function VistaDetalleInforme({ informe, catalogo, onVolver, onCargarDatos, onGestionarWorkflow }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <Card className="p-6">
        <Button onClick={onVolver} variant="ghost" size="sm" className="mb-4">
          <ChevronDown className="w-4 h-4 mr-2 rotate-90" />
          Volver a la lista
        </Button>

        <h2 className="text-2xl font-black text-gray-900 mb-4">{informe.nombre}</h2>
        
        <div className="flex gap-3">
          <Button onClick={onCargarDatos} variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Cargar Datos Manuales
          </Button>
          <Button onClick={onGestionarWorkflow} style={{ background: '#3B82F6' }}>
            <CheckSquare className="w-4 h-4 mr-2" />
            Gestionar Workflow
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Generar Formato
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

function Modal({ titulo, children, onCerrar }: { titulo: string; children: React.ReactNode; onCerrar: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onCerrar}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">{titulo}</h3>
            <button
              onClick={onCerrar}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>
        <div className="p-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}