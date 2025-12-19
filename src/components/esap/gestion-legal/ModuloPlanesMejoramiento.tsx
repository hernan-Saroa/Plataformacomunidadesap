/**
 * ============================================
 * MOD-10: PLANES DE MEJORAMIENTO
 * ============================================
 * 
 * Gestión de planes de mejoramiento institucionales derivados
 * de hallazgos de auditorías internas, externas y órganos de control
 * 
 * FUNCIONALIDADES:
 * - Registro de planes de mejoramiento
 * - Seguimiento de acciones de mejora
 * - Control de cumplimiento
 * - Gestión de evidencias
 * - Alertas de vencimientos
 * - Integración con MOD-02 (Órganos de Control)
 * - Trazabilidad completa
 * - Dashboard de gestión
 * 
 * ORÍGENES:
 * - Contraloría General de la República
 * - Procuraduría General de la Nación
 * - Auditoría General de la República
 * - Auditoría Interna
 * - Revisoría Fiscal
 * - Entes de control externo
 * 
 * ESTADOS:
 * - Suscrito (firmado pero no iniciado)
 * - En ejecución (en proceso)
 * - Cumplido (finalizado con éxito)
 * - Con retraso (vencido parcialmente)
 * - Incumplido (no ejecutado)
 * 
 * Versión: 1.0.0
 * Prioridad: BAJA
 */

import { useState } from 'react';
import {
  TrendingUp,
  Search,
  Filter,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Eye,
  X,
  Calendar,
  User,
  Target,
  Upload,
  Activity,
  AlertCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  Paperclip,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

type EstadoPlan = 'suscrito' | 'en_ejecucion' | 'cumplido' | 'con_retraso' | 'incumplido';

type OrigenPlan = 
  | 'contraloria'
  | 'procuraduria'
  | 'auditoria_general'
  | 'auditoria_interna'
  | 'revisoria_fiscal'
  | 'control_externo';

interface AccionMejora {
  id: string;
  descripcion: string;
  responsable: string;
  fechaInicio: string;
  fechaFin: string;
  estado: 'pendiente' | 'en_proceso' | 'completada' | 'vencida';
  porcentajeAvance: number;
  evidencias: {
    nombre: string;
    fecha: string;
    tipo: string;
  }[];
}

interface PlanMejoramiento {
  id: string;
  numeroPlan: string;
  fechaSuscripcion: string;
  origen: {
    tipo: OrigenPlan;
    entidad: string;
    documentoFuente: string;
    numeroHallazgo: string;
  };
  hallazgo: {
    titulo: string;
    descripcion: string;
    impacto: 'alto' | 'medio' | 'bajo';
    tipo: 'administrativo' | 'financiero' | 'operativo' | 'disciplinario';
  };
  plan: {
    objetivo: string;
    metaIndicador: string;
    responsableGeneral: string;
    cargoResponsable: string;
    dependencia: string;
  };
  plazos: {
    fechaInicio: string;
    fechaFin: string;
    diasPlazo: number;
    diasTranscurridos: number;
    diasRestantes: number;
    porcentajeAvance: number;
  };
  acciones: AccionMejora[];
  estado: EstadoPlan;
  seguimiento: {
    fecha: string;
    porcentaje: number;
    observaciones: string;
    responsable: string;
    accionesCompletadas: number;
    accionesTotales: number;
  }[];
  aprobacion: {
    aprobadoPor: string;
    cargo: string;
    fechaAprobacion: string;
  };
}

// ============================================
// DATOS MOCK
// ============================================

const PLANES_MOCK: PlanMejoramiento[] = [
  {
    id: '1',
    numeroPlan: 'PM-CGR-2024-001',
    fechaSuscripcion: '2024-03-15',
    origen: {
      tipo: 'contraloria',
      entidad: 'Contraloría General de la República',
      documentoFuente: 'Informe de Auditoría Regular CGR-2024-001',
      numeroHallazgo: 'H-2024-001',
    },
    hallazgo: {
      titulo: 'Deficiencias en el control de inventarios',
      descripcion: 'Se evidenció falta de procedimientos documentados para el control y registro de inventarios de bienes devolutivos, generando riesgo de pérdida patrimonial.',
      impacto: 'alto',
      tipo: 'administrativo',
    },
    plan: {
      objetivo: 'Implementar sistema integral de control de inventarios que garantice el 100% de trazabilidad de bienes devolutivos.',
      metaIndicador: '100% de bienes registrados y con conciliación mensual',
      responsableGeneral: 'Carlos Méndez',
      cargoResponsable: 'Jefe de Almacén',
      dependencia: 'Dirección Administrativa',
    },
    plazos: {
      fechaInicio: '2024-04-01',
      fechaFin: '2024-12-31',
      diasPlazo: 274,
      diasTranscurridos: 260,
      diasRestantes: 14,
      porcentajeAvance: 85,
    },
    acciones: [
      {
        id: 'A1',
        descripcion: 'Diseñar e implementar procedimiento documentado de control de inventarios',
        responsable: 'Carlos Méndez',
        fechaInicio: '2024-04-01',
        fechaFin: '2024-06-30',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Procedimiento_Control_Inventarios_v1.pdf', fecha: '2024-06-15', tipo: 'PDF' },
          { nombre: 'Acta_Aprobacion_Procedimiento.pdf', fecha: '2024-06-28', tipo: 'PDF' },
        ],
      },
      {
        id: 'A2',
        descripcion: 'Adquirir e implementar software de gestión de inventarios',
        responsable: 'Pedro Ramírez',
        fechaInicio: '2024-05-01',
        fechaFin: '2024-09-30',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Contrato_Software_Inventarios.pdf', fecha: '2024-07-10', tipo: 'PDF' },
          { nombre: 'Acta_Implementacion_Software.pdf', fecha: '2024-09-25', tipo: 'PDF' },
        ],
      },
      {
        id: 'A3',
        descripcion: 'Capacitar personal en uso del sistema y procedimientos',
        responsable: 'Sandra Ruiz',
        fechaInicio: '2024-10-01',
        fechaFin: '2024-11-30',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Certificados_Capacitacion.pdf', fecha: '2024-11-28', tipo: 'PDF' },
        ],
      },
      {
        id: 'A4',
        descripcion: 'Realizar inventario físico y carga al sistema',
        responsable: 'Carlos Méndez',
        fechaInicio: '2024-12-01',
        fechaFin: '2024-12-31',
        estado: 'en_proceso',
        porcentajeAvance: 70,
        evidencias: [],
      },
    ],
    estado: 'en_ejecucion',
    seguimiento: [
      {
        fecha: '2024-12-10',
        porcentaje: 85,
        observaciones: 'Inventario físico en proceso. Se ha completado el 70% de la carga de datos. Se estima cumplimiento al 31 de diciembre.',
        responsable: 'Carlos Méndez',
        accionesCompletadas: 3,
        accionesTotales: 4,
      },
      {
        fecha: '2024-09-30',
        porcentaje: 65,
        observaciones: 'Software implementado exitosamente. Iniciando capacitación de personal.',
        responsable: 'Carlos Méndez',
        accionesCompletadas: 2,
        accionesTotales: 4,
      },
      {
        fecha: '2024-06-30',
        porcentaje: 30,
        observaciones: 'Procedimiento aprobado. Proceso de adquisición de software en curso.',
        responsable: 'Carlos Méndez',
        accionesCompletadas: 1,
        accionesTotales: 4,
      },
    ],
    aprobacion: {
      aprobadoPor: 'Roberto García',
      cargo: 'Director Administrativo',
      fechaAprobacion: '2024-03-20',
    },
  },
  {
    id: '2',
    numeroPlan: 'PM-PGN-2024-002',
    fechaSuscripcion: '2024-05-20',
    origen: {
      tipo: 'procuraduria',
      entidad: 'Procuraduría General de la Nación',
      documentoFuente: 'Auto de Archivo PGN-2024-456',
      numeroHallazgo: 'PGN-H-2024-005',
    },
    hallazgo: {
      titulo: 'Bajo nivel de socialización del Código de Integridad',
      descripcion: 'Menos del 40% del personal conoce y aplica el Código de Integridad institucional.',
      impacto: 'medio',
      tipo: 'administrativo',
    },
    plan: {
      objetivo: 'Lograr que el 95% del personal conozca y aplique el Código de Integridad institucional.',
      metaIndicador: '95% de personal capacitado y evaluado',
      responsableGeneral: 'Sandra Ruiz',
      cargoResponsable: 'Jefe de Talento Humano',
      dependencia: 'Dirección de Gestión Humana',
    },
    plazos: {
      fechaInicio: '2024-06-01',
      fechaFin: '2024-12-31',
      diasPlazo: 213,
      diasTranscurridos: 199,
      diasRestantes: 14,
      porcentajeAvance: 95,
    },
    acciones: [
      {
        id: 'A1',
        descripcion: 'Diseñar material didáctico sobre Código de Integridad',
        responsable: 'Sandra Ruiz',
        fechaInicio: '2024-06-01',
        fechaFin: '2024-07-15',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Material_Didactico_Codigo_Integridad.pdf', fecha: '2024-07-10', tipo: 'PDF' },
        ],
      },
      {
        id: 'A2',
        descripcion: 'Realizar talleres presenciales en todas las sedes',
        responsable: 'Sandra Ruiz',
        fechaInicio: '2024-08-01',
        fechaFin: '2024-11-30',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Listados_Asistencia_Talleres.xlsx', fecha: '2024-11-30', tipo: 'Excel' },
        ],
      },
      {
        id: 'A3',
        descripcion: 'Evaluar conocimiento del personal capacitado',
        responsable: 'Sandra Ruiz',
        fechaInicio: '2024-12-01',
        fechaFin: '2024-12-20',
        estado: 'en_proceso',
        porcentajeAvance: 90,
        evidencias: [],
      },
    ],
    estado: 'en_ejecucion',
    seguimiento: [
      {
        fecha: '2024-12-12',
        porcentaje: 95,
        observaciones: 'Evaluación del personal en curso. 90% ya evaluado. Se proyecta cumplimiento total.',
        responsable: 'Sandra Ruiz',
        accionesCompletadas: 2,
        accionesTotales: 3,
      },
    ],
    aprobacion: {
      aprobadoPor: 'Laura Gómez',
      cargo: 'Secretaria General',
      fechaAprobacion: '2024-05-25',
    },
  },
  {
    id: '3',
    numeroPlan: 'PM-AI-2024-003',
    fechaSuscripcion: '2024-02-10',
    origen: {
      tipo: 'auditoria_interna',
      entidad: 'Oficina de Control Interno',
      documentoFuente: 'Informe Auditoría Interna 2024-Q1',
      numeroHallazgo: 'AI-2024-003',
    },
    hallazgo: {
      titulo: 'Incumplimiento de términos en derechos de petición',
      descripcion: 'El 15% de derechos de petición no son respondidos dentro del término legal de 15 días.',
      impacto: 'alto',
      tipo: 'administrativo',
    },
    plan: {
      objetivo: 'Garantizar respuesta oportuna del 100% de derechos de petición dentro del término legal.',
      metaIndicador: '100% de derechos de petición respondidos en término',
      responsableGeneral: 'Laura Gómez',
      cargoResponsable: 'Secretaria General',
      dependencia: 'Secretaría General',
    },
    plazos: {
      fechaInicio: '2024-03-01',
      fechaFin: '2024-08-31',
      diasPlazo: 183,
      diasTranscurridos: 183,
      diasRestantes: 0,
      porcentajeAvance: 100,
    },
    acciones: [
      {
        id: 'A1',
        descripcion: 'Implementar sistema de alertas automáticas',
        responsable: 'Pedro Ramírez',
        fechaInicio: '2024-03-01',
        fechaFin: '2024-05-31',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Manual_Sistema_Alertas.pdf', fecha: '2024-05-30', tipo: 'PDF' },
        ],
      },
      {
        id: 'A2',
        descripcion: 'Capacitar personal en gestión de PQRS',
        responsable: 'Laura Gómez',
        fechaInicio: '2024-04-01',
        fechaFin: '2024-06-30',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Certificado_Capacitacion_PQRS.pdf', fecha: '2024-06-25', tipo: 'PDF' },
        ],
      },
      {
        id: 'A3',
        descripcion: 'Establecer indicador de seguimiento mensual',
        responsable: 'Laura Gómez',
        fechaInicio: '2024-07-01',
        fechaFin: '2024-08-31',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Tablero_Indicadores_PQRS.xlsx', fecha: '2024-08-31', tipo: 'Excel' },
        ],
      },
    ],
    estado: 'cumplido',
    seguimiento: [
      {
        fecha: '2024-08-31',
        porcentaje: 100,
        observaciones: 'Plan de mejoramiento cumplido exitosamente. Indicador de respuesta oportuna en 98%.',
        responsable: 'Laura Gómez',
        accionesCompletadas: 3,
        accionesTotales: 3,
      },
    ],
    aprobacion: {
      aprobadoPor: 'Claudia Hernández',
      cargo: 'Jefe Oficina Control Interno',
      fechaAprobacion: '2024-02-15',
    },
  },
  {
    id: '4',
    numeroPlan: 'PM-CGR-2023-012',
    fechaSuscripcion: '2023-06-20',
    origen: {
      tipo: 'contraloria',
      entidad: 'Contraloría General de la República',
      documentoFuente: 'Informe de Auditoría CGR-2023-089',
      numeroHallazgo: 'H-2023-012',
    },
    hallazgo: {
      titulo: 'Ausencia de plan de capacitación anual',
      descripcion: 'No existe plan de capacitación institucional aprobado y ejecutado.',
      impacto: 'medio',
      tipo: 'administrativo',
    },
    plan: {
      objetivo: 'Diseñar e implementar Plan Institucional de Capacitación anual.',
      metaIndicador: 'Plan aprobado y ejecutado al 80%',
      responsableGeneral: 'Sandra Ruiz',
      cargoResponsable: 'Jefe de Talento Humano',
      dependencia: 'Dirección de Gestión Humana',
    },
    plazos: {
      fechaInicio: '2023-07-01',
      fechaFin: '2023-12-31',
      diasPlazo: 183,
      diasTranscurridos: 183,
      diasRestantes: 0,
      porcentajeAvance: 100,
    },
    acciones: [
      {
        id: 'A1',
        descripcion: 'Elaborar diagnóstico de necesidades de capacitación',
        responsable: 'Sandra Ruiz',
        fechaInicio: '2023-07-01',
        fechaFin: '2023-08-31',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Diagnostico_Necesidades_Capacitacion.pdf', fecha: '2023-08-30', tipo: 'PDF' },
        ],
      },
      {
        id: 'A2',
        descripcion: 'Diseñar Plan Institucional de Capacitación',
        responsable: 'Sandra Ruiz',
        fechaInicio: '2023-09-01',
        fechaFin: '2023-10-15',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Plan_Institucional_Capacitacion_2024.pdf', fecha: '2023-10-10', tipo: 'PDF' },
        ],
      },
      {
        id: 'A3',
        descripcion: 'Ejecutar plan de capacitación',
        responsable: 'Sandra Ruiz',
        fechaInicio: '2023-11-01',
        fechaFin: '2023-12-31',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Informe_Ejecucion_Capacitacion.pdf', fecha: '2023-12-31', tipo: 'PDF' },
        ],
      },
    ],
    estado: 'cumplido',
    seguimiento: [],
    aprobacion: {
      aprobadoPor: 'Roberto García',
      cargo: 'Director Administrativo',
      fechaAprobacion: '2023-06-25',
    },
  },
  {
    id: '5',
    numeroPlan: 'PM-RF-2024-001',
    fechaSuscripcion: '2024-08-10',
    origen: {
      tipo: 'revisoria_fiscal',
      entidad: 'Revisoría Fiscal ESAP',
      documentoFuente: 'Informe Revisoría Fiscal 2024-S1',
      numeroHallazgo: 'RF-2024-008',
    },
    hallazgo: {
      titulo: 'Debilidades en conciliación bancaria',
      descripcion: 'Conciliaciones bancarias presentan retrasos superiores a 30 días.',
      impacto: 'alto',
      tipo: 'financiero',
    },
    plan: {
      objetivo: 'Garantizar conciliaciones bancarias oportunas (máximo 5 días calendario).',
      metaIndicador: '100% de conciliaciones realizadas en menos de 5 días',
      responsableGeneral: 'Sandra Ortiz',
      cargoResponsable: 'Coordinadora Financiera',
      dependencia: 'Dirección Financiera',
    },
    plazos: {
      fechaInicio: '2024-09-01',
      fechaFin: '2024-12-31',
      diasPlazo: 121,
      diasTranscurridos: 107,
      diasRestantes: 14,
      porcentajeAvance: 60,
    },
    acciones: [
      {
        id: 'A1',
        descripcion: 'Establecer procedimiento de conciliación bancaria',
        responsable: 'Sandra Ortiz',
        fechaInicio: '2024-09-01',
        fechaFin: '2024-09-30',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Procedimiento_Conciliacion_Bancaria.pdf', fecha: '2024-09-28', tipo: 'PDF' },
        ],
      },
      {
        id: 'A2',
        descripcion: 'Asignar responsable exclusivo para conciliaciones',
        responsable: 'Sandra Ortiz',
        fechaInicio: '2024-10-01',
        fechaFin: '2024-10-15',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Resolucion_Asignacion_Funciones.pdf', fecha: '2024-10-10', tipo: 'PDF' },
        ],
      },
      {
        id: 'A3',
        descripcion: 'Implementar alertas automáticas de vencimiento',
        responsable: 'Pedro Ramírez',
        fechaInicio: '2024-11-01',
        fechaFin: '2024-12-31',
        estado: 'en_proceso',
        porcentajeAvance: 40,
        evidencias: [],
      },
    ],
    estado: 'con_retraso',
    seguimiento: [
      {
        fecha: '2024-12-10',
        porcentaje: 60,
        observaciones: 'Implementación de alertas automáticas presenta retrasos técnicos. Se requiere más tiempo.',
        responsable: 'Sandra Ortiz',
        accionesCompletadas: 2,
        accionesTotales: 3,
      },
    ],
    aprobacion: {
      aprobadoPor: 'Director Financiero',
      cargo: 'Director Financiero',
      fechaAprobacion: '2024-08-15',
    },
  },
  {
    id: '6',
    numeroPlan: 'PM-AI-2023-005',
    fechaSuscripcion: '2023-03-15',
    origen: {
      tipo: 'auditoria_interna',
      entidad: 'Oficina de Control Interno',
      documentoFuente: 'Informe Auditoría Interna 2023-Q1',
      numeroHallazgo: 'AI-2023-018',
    },
    hallazgo: {
      titulo: 'Ausencia de políticas de seguridad de la información',
      descripcion: 'No existen políticas formales de seguridad de la información.',
      impacto: 'alto',
      tipo: 'operativo',
    },
    plan: {
      objetivo: 'Diseñar e implementar políticas de seguridad de la información.',
      metaIndicador: 'Políticas aprobadas e implementadas al 100%',
      responsableGeneral: 'Pedro Ramírez',
      cargoResponsable: 'Coordinador TIC',
      dependencia: 'Dirección TIC',
    },
    plazos: {
      fechaInicio: '2023-04-01',
      fechaFin: '2023-12-31',
      diasPlazo: 274,
      diasTranscurridos: 274,
      diasRestantes: 0,
      porcentajeAvance: 70,
    },
    acciones: [
      {
        id: 'A1',
        descripcion: 'Diseñar políticas de seguridad de la información',
        responsable: 'Pedro Ramírez',
        fechaInicio: '2023-04-01',
        fechaFin: '2023-08-31',
        estado: 'completada',
        porcentajeAvance: 100,
        evidencias: [
          { nombre: 'Politicas_Seguridad_Informacion_v1.pdf', fecha: '2023-08-30', tipo: 'PDF' },
        ],
      },
      {
        id: 'A2',
        descripcion: 'Aprobar políticas por Comité Directivo',
        responsable: 'Pedro Ramírez',
        fechaInicio: '2023-09-01',
        fechaFin: '2023-10-31',
        estado: 'vencida',
        porcentajeAvance: 50,
        evidencias: [],
      },
      {
        id: 'A3',
        descripcion: 'Socializar e implementar políticas',
        responsable: 'Pedro Ramírez',
        fechaInicio: '2023-11-01',
        fechaFin: '2023-12-31',
        estado: 'vencida',
        porcentajeAvance: 40,
        evidencias: [],
      },
    ],
    estado: 'incumplido',
    seguimiento: [
      {
        fecha: '2024-01-15',
        porcentaje: 70,
        observaciones: 'Plan incumplido. Políticas diseñadas pero no aprobadas formalmente. Se requiere nueva suscripción.',
        responsable: 'Pedro Ramírez',
        accionesCompletadas: 1,
        accionesTotales: 3,
      },
    ],
    aprobacion: {
      aprobadoPor: 'Director TIC',
      cargo: 'Director TIC',
      fechaAprobacion: '2023-03-20',
    },
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloPlanesMejoramiento() {
  const [planes, setPlanes] = useState<PlanMejoramiento[]>(PLANES_MOCK);
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanMejoramiento | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPlan | 'todos'>('todos');
  const [filtroOrigen, setFiltroOrigen] = useState<OrigenPlan | 'todos'>('todos');

  // Filtrar planes
  const planesFiltrados = planes.filter(p => {
    const cumpleBusqueda = busqueda === '' || 
      p.numeroPlan.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.hallazgo.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.plan.responsableGeneral.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const cumpleOrigen = filtroOrigen === 'todos' || p.origen.tipo === filtroOrigen;
    
    return cumpleBusqueda && cumpleEstado && cumpleOrigen;
  });

  // Métricas
  const totalPlanes = planes.length;
  const planesEnEjecucion = planes.filter(p => p.estado === 'en_ejecucion').length;
  const planesCumplidos = planes.filter(p => p.estado === 'cumplido').length;
  const planesConRetraso = planes.filter(p => p.estado === 'con_retraso').length;
  const promedioAvance = Math.round(
    planes.reduce((sum, p) => sum + p.plazos.porcentajeAvance, 0) / totalPlanes
  );

  // Distribución por estado
  const porEstado = {
    suscrito: planes.filter(p => p.estado === 'suscrito').length,
    en_ejecucion: planes.filter(p => p.estado === 'en_ejecucion').length,
    cumplido: planes.filter(p => p.estado === 'cumplido').length,
    con_retraso: planes.filter(p => p.estado === 'con_retraso').length,
    incumplido: planes.filter(p => p.estado === 'incumplido').length,
  };

  const getEstadoColor = (estado: EstadoPlan) => {
    switch (estado) {
      case 'suscrito': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Suscrito' };
      case 'en_ejecucion': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Ejecución' };
      case 'cumplido': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Cumplido' };
      case 'con_retraso': return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Con Retraso' };
      case 'incumplido': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Incumplido' };
    }
  };

  const getOrigenLabel = (origen: OrigenPlan) => {
    switch (origen) {
      case 'contraloria': return 'Contraloría';
      case 'procuraduria': return 'Procuraduría';
      case 'auditoria_general': return 'Auditoría General';
      case 'auditoria_interna': return 'Auditoría Interna';
      case 'revisoria_fiscal': return 'Revisoría Fiscal';
      case 'control_externo': return 'Control Externo';
    }
  };

  const getImpactoColor = (impacto: 'alto' | 'medio' | 'bajo') => {
    switch (impacto) {
      case 'alto': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Alto' };
      case 'medio': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Medio' };
      case 'bajo': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Bajo' };
    }
  };

  const getEstadoAccion = (estado: AccionMejora['estado']) => {
    switch (estado) {
      case 'pendiente': return { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock };
      case 'en_proceso': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: PlayCircle };
      case 'completada': return { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle };
      case 'vencida': return { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle };
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center shadow-lg">
          <TrendingUp className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            MOD-10: Planes de Mejoramiento
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión y seguimiento de planes de mejoramiento institucionales
          </p>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-black text-green-600">{totalPlanes}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Total Planes</p>
          <p className="text-xs text-gray-500 mt-1">Suscritos</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-yellow-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <PlayCircle className="w-8 h-8 text-yellow-600" />
            <span className="text-3xl font-black text-yellow-600">{planesEnEjecucion}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">En Ejecución</p>
          <p className="text-xs text-gray-500 mt-1">En proceso</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-black text-green-600">{planesCumplidos}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Cumplidos</p>
          <p className="text-xs text-gray-500 mt-1">Finalizados</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
            <span className="text-3xl font-black text-orange-600">{planesConRetraso}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Con Retraso</p>
          <p className="text-xs text-gray-500 mt-1">Requieren atención</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-black text-blue-600">{promedioAvance}%</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Avance Promedio</p>
          <p className="text-xs text-gray-500 mt-1">Del sistema</p>
        </div>
      </div>

      {/* DISTRIBUCIÓN POR ESTADO */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">📊 Distribución por Estado</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{porEstado.suscrito}</div>
            <div className="text-xs text-gray-600">Suscrito</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
              <PlayCircle className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{porEstado.en_ejecucion}</div>
            <div className="text-xs text-gray-600">En Ejecución</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{porEstado.cumplido}</div>
            <div className="text-xs text-gray-600">Cumplido</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{porEstado.con_retraso}</div>
            <div className="text-xs text-gray-600">Con Retraso</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{porEstado.incumplido}</div>
            <div className="text-xs text-gray-600">Incumplido</div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Buscar Plan
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Número, hallazgo, responsable..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por Estado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="suscrito">Suscrito</option>
              <option value="en_ejecucion">En Ejecución</option>
              <option value="cumplido">Cumplido</option>
              <option value="con_retraso">Con Retraso</option>
              <option value="incumplido">Incumplido</option>
            </select>
          </div>

          {/* Filtro por Origen */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Origen
            </label>
            <select
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="contraloria">Contraloría</option>
              <option value="procuraduria">Procuraduría</option>
              <option value="auditoria_general">Auditoría General</option>
              <option value="auditoria_interna">Auditoría Interna</option>
              <option value="revisoria_fiscal">Revisoría Fiscal</option>
              <option value="control_externo">Control Externo</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm">
            + Nuevo Plan de Mejoramiento
          </button>
          <button className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => {
              setBusqueda('');
              setFiltroEstado('todos');
              setFiltroOrigen('todos');
            }}
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
          >
            Limpiar filtros
          </button>
          <div className="ml-auto text-sm text-gray-600">
            Mostrando <strong>{planesFiltrados.length}</strong> de <strong>{totalPlanes}</strong> planes
          </div>
        </div>
      </div>

      {/* TABLA DE PLANES */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Número Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Hallazgo / Origen
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Avance
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Plazo
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {planesFiltrados.map((plan) => {
                const estadoColor = getEstadoColor(plan.estado);
                
                return (
                  <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{plan.numeroPlan}</div>
                      <div className="text-xs text-gray-500">{plan.fechaSuscripcion}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {plan.hallazgo.titulo}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getOrigenLabel(plan.origen.tipo)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{plan.plan.responsableGeneral}</div>
                      <div className="text-xs text-gray-500">{plan.plan.dependencia}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                          <div
                            className={`h-2 rounded-full ${
                              plan.plazos.porcentajeAvance >= 80
                                ? 'bg-green-600'
                                : plan.plazos.porcentajeAvance >= 50
                                ? 'bg-yellow-600'
                                : 'bg-red-600'
                            }`}
                            style={{ width: `${plan.plazos.porcentajeAvance}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-bold text-gray-900">
                          {plan.plazos.porcentajeAvance}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{plan.plazos.fechaFin}</div>
                      <div className={`text-xs ${
                        plan.plazos.diasRestantes < 0
                          ? 'text-red-600 font-bold'
                          : plan.plazos.diasRestantes <= 30
                          ? 'text-orange-600'
                          : 'text-gray-500'
                      }`}>
                        {plan.plazos.diasRestantes < 0
                          ? `Vencido`
                          : `${plan.plazos.diasRestantes} días restantes`
                        }
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 ${estadoColor.bg} ${estadoColor.text} text-xs font-bold rounded-full`}>
                        {estadoColor.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setPlanSeleccionado(plan);
                          setMostrarModal(true);
                        }}
                        className="text-green-600 hover:text-green-800 font-semibold text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {planesFiltrados.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No se encontraron planes de mejoramiento</p>
            <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {mostrarModal && planSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-green-600 to-teal-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{planSeleccionado.numeroPlan}</h2>
                  <p className="text-green-100 text-sm mt-1">{planSeleccionado.hallazgo.titulo}</p>
                </div>
                <button
                  onClick={() => setMostrarModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-6">
              {/* Origen del Plan */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  Origen del Plan de Mejoramiento
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Entidad de Control</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.origen.entidad}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Documento Fuente</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.origen.documentoFuente}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Número Hallazgo</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.origen.numeroHallazgo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Impacto</p>
                    <span className={`px-2 py-1 ${getImpactoColor(planSeleccionado.hallazgo.impacto).bg} ${getImpactoColor(planSeleccionado.hallazgo.impacto).text} text-xs font-bold rounded`}>
                      {getImpactoColor(planSeleccionado.hallazgo.impacto).label}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Descripción del Hallazgo</p>
                    <p className="text-sm text-gray-900">{planSeleccionado.hallazgo.descripcion}</p>
                  </div>
                </div>
              </div>

              {/* Objetivo y Meta */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Objetivo y Meta del Plan
                </h3>
                <div className="space-y-3">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-green-700 mb-1">OBJETIVO</p>
                    <p className="text-sm text-gray-900">{planSeleccionado.plan.objetivo}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-blue-700 mb-1">META DEL INDICADOR</p>
                    <p className="text-sm text-gray-900">{planSeleccionado.plan.metaIndicador}</p>
                  </div>
                </div>
              </div>

              {/* Responsable */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-green-600" />
                  Responsable General
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nombre</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.plan.responsableGeneral}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cargo</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.plan.cargoResponsable}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dependencia</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.plan.dependencia}</p>
                  </div>
                </div>
              </div>

              {/* Avance Global */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  Avance Global del Plan
                </h3>
                <div className="bg-gradient-to-r from-green-50 to-teal-50 border border-green-200 rounded-lg p-4">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Fecha Inicio</p>
                      <p className="font-bold text-gray-900">{planSeleccionado.plazos.fechaInicio}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Fecha Fin</p>
                      <p className="font-bold text-gray-900">{planSeleccionado.plazos.fechaFin}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Días Plazo</p>
                      <p className="font-bold text-gray-900">{planSeleccionado.plazos.diasPlazo}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Días Restantes</p>
                      <p className={`font-bold text-lg ${
                        planSeleccionado.plazos.diasRestantes < 0
                          ? 'text-red-600'
                          : planSeleccionado.plazos.diasRestantes <= 30
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}>
                        {planSeleccionado.plazos.diasRestantes}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Porcentaje de Avance</span>
                      <span className="text-3xl font-black text-green-700">
                        {planSeleccionado.plazos.porcentajeAvance}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-green-600 to-teal-600 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${planSeleccionado.plazos.porcentajeAvance}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Acciones de Mejora */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Acciones de Mejora ({planSeleccionado.acciones.length})
                </h3>
                <div className="space-y-3">
                  {planSeleccionado.acciones.map((accion) => {
                    const estadoAccion = getEstadoAccion(accion.estado);
                    const IconoEstado = estadoAccion.icon;
                    
                    return (
                      <div key={accion.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-bold rounded">
                                {accion.id}
                              </span>
                              <span className={`px-2 py-1 ${estadoAccion.bg} ${estadoAccion.text} text-xs font-bold rounded flex items-center gap-1`}>
                                <IconoEstado className="w-3 h-3" />
                                {accion.estado.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">{accion.descripcion}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                              <span>Responsable: {accion.responsable}</span>
                              <span>Plazo: {accion.fechaInicio} - {accion.fechaFin}</span>
                              <span>Evidencias: {accion.evidencias.length}</span>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-2xl font-black text-green-700">{accion.porcentajeAvance}%</p>
                          </div>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2 mt-2">
                          <div
                            className={`h-2 rounded-full ${
                              accion.estado === 'completada' ? 'bg-green-600' :
                              accion.estado === 'en_proceso' ? 'bg-blue-600' :
                              accion.estado === 'vencida' ? 'bg-red-600' : 'bg-gray-400'
                            }`}
                            style={{ width: `${accion.porcentajeAvance}%` }}
                          ></div>
                        </div>
                        {accion.evidencias.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-bold text-gray-700 mb-2">Evidencias:</p>
                            <div className="space-y-1">
                              {accion.evidencias.map((ev, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Paperclip className="w-3 h-3 text-gray-400" />
                                    <span className="text-gray-700">{ev.nombre}</span>
                                  </div>
                                  <span className="text-gray-500">{ev.fecha}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Seguimiento */}
              {planSeleccionado.seguimiento.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    Historial de Seguimiento
                  </h3>
                  <div className="space-y-3">
                    {planSeleccionado.seguimiento.map((seg, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-24 text-right">
                          <span className="text-xs font-semibold text-gray-500">{seg.fecha}</span>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-green-600 rounded-full mt-2"></div>
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded">
                              {seg.porcentaje}%
                            </span>
                            <span className="text-xs text-gray-600">
                              {seg.accionesCompletadas} de {seg.accionesTotales} acciones completadas
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 font-semibold mb-1">{seg.responsable}</p>
                          <p className="text-sm text-gray-600">{seg.observaciones}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aprobación */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Aprobación del Plan
                </h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Aprobado Por</p>
                      <p className="font-semibold text-gray-900">{planSeleccionado.aprobacion.aprobadoPor}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Cargo</p>
                      <p className="font-semibold text-gray-900">{planSeleccionado.aprobacion.cargo}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Fecha Aprobación</p>
                      <p className="font-semibold text-gray-900">{planSeleccionado.aprobacion.fechaAprobacion}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl flex gap-3">
              {planSeleccionado.estado !== 'cumplido' && planSeleccionado.estado !== 'incumplido' && (
                <>
                  <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Cargar Evidencia
                  </button>
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2">
                    <Activity className="w-4 h-4" />
                    Actualizar Seguimiento
                  </button>
                </>
              )}
              <button
                onClick={() => setMostrarModal(false)}
                className="px-6 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
