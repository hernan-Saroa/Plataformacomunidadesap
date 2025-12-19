/**
 * ============================================
 * MOD-08: PLAN DE ACCIÓN
 * ============================================
 * 
 * Gestión de planes de acción derivados de hallazgos, recomendaciones
 * y oportunidades de mejora identificadas por órganos de control,
 * auditorías internas y procesos de mejora continua
 * 
 * FUNCIONALIDADES:
 * - Registro de planes de acción
 * - Seguimiento de ejecución
 * - Control de cumplimiento
 * - Gestión de evidencias
 * - Alertas de vencimientos
 * - Trazabilidad completa
 * - Dashboard de gestión
 * 
 * ORÍGENES DEL PLAN:
 * - Hallazgo de órganos de control (Contraloría, Procuraduría)
 * - Auditoría interna
 * - Recomendación externa
 * - Mejora continua
 * - Proceso disciplinario
 * - Proceso judicial
 * 
 * ESTADOS:
 * - En diseño (planificación)
 * - Aprobado (listo para ejecutar)
 * - En ejecución (en proceso)
 * - Completado (finalizado con éxito)
 * - Vencido (no cumplido a tiempo)
 * 
 * Versión: 1.0.0
 * Prioridad: MEDIA
 */

import { useState } from 'react';
import {
  Target,
  Search,
  Filter,
  Download,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  User,
  Calendar,
  FileText,
  Eye,
  X,
  Upload,
  CheckSquare,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  XCircle,
  Edit,
  Paperclip,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

type EstadoPlan = 'en_diseño' | 'aprobado' | 'en_ejecucion' | 'completado' | 'vencido';

type OrigenPlan = 
  | 'organo_control'
  | 'auditoria_interna'
  | 'recomendacion_externa'
  | 'mejora_continua'
  | 'proceso_disciplinario'
  | 'proceso_judicial';

type TipoAccion = 
  | 'correctiva'
  | 'preventiva'
  | 'mejora';

interface PlanAccion {
  id: string;
  numeroPlan: string;
  fechaCreacion: string;
  origen: {
    tipo: OrigenPlan;
    documentoFuente: string;
    hallazgo: string;
    numeroHallazgo: string;
  };
  descripcion: {
    titulo: string;
    descripcionProblema: string;
    accionPropuesta: string;
    resultadoEsperado: string;
    tipoAccion: TipoAccion;
  };
  responsable: {
    nombre: string;
    cargo: string;
    dependencia: string;
    email: string;
  };
  plazos: {
    fechaInicio: string;
    fechaFin: string;
    diasPlazo: number;
    diasTranscurridos: number;
    diasRestantes: number;
    porcentajeAvance: number;
  };
  estado: EstadoPlan;
  seguimiento: {
    fecha: string;
    porcentaje: number;
    observaciones: string;
    responsable: string;
  }[];
  evidencias: {
    id: string;
    nombre: string;
    tipo: string;
    fecha: string;
    responsable: string;
  }[];
  aprobacion: {
    aprobadoPor: string;
    fechaAprobacion: string;
    observaciones: string;
  } | null;
}

// ============================================
// DATOS MOCK
// ============================================

const PLANES_MOCK: PlanAccion[] = [
  {
    id: '1',
    numeroPlan: 'PA-2024-001',
    fechaCreacion: '2024-11-15',
    origen: {
      tipo: 'organo_control',
      documentoFuente: 'Informe CGR-2024-145',
      hallazgo: 'Deficiencias en el control de inventarios de bienes devolutivos',
      numeroHallazgo: 'H-001',
    },
    descripcion: {
      titulo: 'Implementación de sistema de control de inventarios',
      descripcionProblema: 'La Contraloría identificó ausencia de procedimientos documentados para el control de inventarios, lo que genera riesgo de pérdida de bienes institucionales.',
      accionPropuesta: 'Diseñar e implementar un sistema de control de inventarios con software especializado, procedimientos documentados y personal capacitado.',
      resultadoEsperado: 'Control efectivo del 100% de bienes devolutivos con registro digital actualizado y conciliaciones mensuales.',
      tipoAccion: 'correctiva',
    },
    responsable: {
      nombre: 'Carlos Méndez',
      cargo: 'Jefe de Almacén',
      dependencia: 'Dirección Administrativa',
      email: 'cmendez@esap.edu.co',
    },
    plazos: {
      fechaInicio: '2024-11-20',
      fechaFin: '2025-02-28',
      diasPlazo: 100,
      diasTranscurridos: 27,
      diasRestantes: 73,
      porcentajeAvance: 35,
    },
    estado: 'en_ejecucion',
    seguimiento: [
      {
        fecha: '2024-12-15',
        porcentaje: 35,
        observaciones: 'Completada la fase de diseño del procedimiento. Iniciando proceso de adquisición del software.',
        responsable: 'Carlos Méndez',
      },
      {
        fecha: '2024-12-01',
        porcentaje: 20,
        observaciones: 'Revisión de procedimientos existentes y benchmarking con otras instituciones.',
        responsable: 'Carlos Méndez',
      },
      {
        fecha: '2024-11-20',
        porcentaje: 10,
        observaciones: 'Inicio del plan de acción. Conformado equipo de trabajo.',
        responsable: 'Carlos Méndez',
      },
    ],
    evidencias: [
      {
        id: 'EV-001',
        nombre: 'Procedimiento_Control_Inventarios_v1.pdf',
        tipo: 'PDF',
        fecha: '2024-12-10',
        responsable: 'Carlos Méndez',
      },
      {
        id: 'EV-002',
        nombre: 'Acta_Conformacion_Equipo.pdf',
        tipo: 'PDF',
        fecha: '2024-11-20',
        responsable: 'Carlos Méndez',
      },
    ],
    aprobacion: {
      aprobadoPor: 'Director Administrativo',
      fechaAprobacion: '2024-11-18',
      observaciones: 'Aprobado. Priorizar la adquisición del software.',
    },
  },
  {
    id: '2',
    numeroPlan: 'PA-2024-002',
    fechaCreacion: '2024-10-05',
    origen: {
      tipo: 'auditoria_interna',
      documentoFuente: 'Informe Auditoría Interna 2024-Q3',
      hallazgo: 'Incumplimiento de términos en respuestas a derechos de petición',
      numeroHallazgo: 'AI-2024-003',
    },
    descripcion: {
      titulo: 'Optimización del proceso de atención de derechos de petición',
      descripcionProblema: 'Se identificó que el 15% de derechos de petición no son respondidos dentro del término legal de 15 días.',
      accionPropuesta: 'Implementar sistema de alertas automáticas, capacitar personal y establecer responsable de seguimiento diario.',
      resultadoEsperado: 'Respuesta oportuna del 100% de derechos de petición dentro del término legal.',
      tipoAccion: 'correctiva',
    },
    responsable: {
      nombre: 'Laura Gómez',
      cargo: 'Secretaria General',
      dependencia: 'Secretaría General',
      email: 'lgomez@esap.edu.co',
    },
    plazos: {
      fechaInicio: '2024-10-10',
      fechaFin: '2024-12-31',
      diasPlazo: 82,
      diasTranscurridos: 68,
      diasRestantes: 14,
      porcentajeAvance: 90,
    },
    estado: 'en_ejecucion',
    seguimiento: [
      {
        fecha: '2024-12-12',
        porcentaje: 90,
        observaciones: 'Sistema de alertas implementado y funcionando. Personal capacitado. En fase de prueba.',
        responsable: 'Laura Gómez',
      },
      {
        fecha: '2024-11-15',
        porcentaje: 60,
        observaciones: 'Completada capacitación de personal. Sistema de alertas en desarrollo.',
        responsable: 'Laura Gómez',
      },
      {
        fecha: '2024-10-25',
        porcentaje: 30,
        observaciones: 'Diseñado el flujo del proceso. Iniciando capacitaciones.',
        responsable: 'Laura Gómez',
      },
    ],
    evidencias: [
      {
        id: 'EV-003',
        nombre: 'Certificado_Capacitacion_Personal.pdf',
        tipo: 'PDF',
        fecha: '2024-11-15',
        responsable: 'Laura Gómez',
      },
      {
        id: 'EV-004',
        nombre: 'Manual_Sistema_Alertas.pdf',
        tipo: 'PDF',
        fecha: '2024-12-01',
        responsable: 'Laura Gómez',
      },
    ],
    aprobacion: {
      aprobadoPor: 'Jefe Oficina Control Interno',
      fechaAprobacion: '2024-10-08',
      observaciones: 'Aprobado. Crítico por vencimiento de plazos.',
    },
  },
  {
    id: '3',
    numeroPlan: 'PA-2024-003',
    fechaCreacion: '2024-12-01',
    origen: {
      tipo: 'mejora_continua',
      documentoFuente: 'Iniciativa Mejora Continua 2024-12',
      hallazgo: 'Oportunidad de mejora en comunicación interna',
      numeroHallazgo: 'MC-2024-005',
    },
    descripcion: {
      titulo: 'Implementación de boletín jurídico mensual',
      descripcionProblema: 'Las dependencias no tienen conocimiento oportuno de cambios normativos relevantes para sus funciones.',
      accionPropuesta: 'Crear boletín jurídico mensual con análisis de normativa relevante para distribución a todas las dependencias.',
      resultadoEsperado: 'Personal informado de cambios normativos con boletín mensual de mínimo 80% de lectura.',
      tipoAccion: 'mejora',
    },
    responsable: {
      nombre: 'María Fernanda López',
      cargo: 'Abogada Senior',
      dependencia: 'Oficina Asesora Jurídica',
      email: 'mflopez@esap.edu.co',
    },
    plazos: {
      fechaInicio: '2024-12-15',
      fechaFin: '2025-03-31',
      diasPlazo: 106,
      diasTranscurridos: 2,
      diasRestantes: 104,
      porcentajeAvance: 5,
    },
    estado: 'aprobado',
    seguimiento: [
      {
        fecha: '2024-12-10',
        porcentaje: 5,
        observaciones: 'Plan aprobado. Pendiente inicio de ejecución.',
        responsable: 'María Fernanda López',
      },
    ],
    evidencias: [],
    aprobacion: {
      aprobadoPor: 'Asesor Jurídico',
      fechaAprobacion: '2024-12-05',
      observaciones: 'Aprobado. Excelente iniciativa de mejora.',
    },
  },
  {
    id: '4',
    numeroPlan: 'PA-2024-004',
    fechaCreacion: '2024-09-20',
    origen: {
      tipo: 'organo_control',
      documentoFuente: 'Auto PGN-2024-567',
      hallazgo: 'Falta de socialización del Código de Integridad',
      numeroHallazgo: 'PGN-H-045',
    },
    descripcion: {
      titulo: 'Campaña de socialización del Código de Integridad',
      descripcionProblema: 'Procuraduría identificó que menos del 40% del personal conoce el Código de Integridad institucional.',
      accionPropuesta: 'Desarrollar campaña de socialización con talleres presenciales, material digital y evaluación de conocimiento.',
      resultadoEsperado: 'Mínimo 90% del personal capacitado y evaluado en Código de Integridad.',
      tipoAccion: 'preventiva',
    },
    responsable: {
      nombre: 'Sandra Ruiz',
      cargo: 'Jefe Talento Humano',
      dependencia: 'Dirección de Gestión Humana',
      email: 'sruiz@esap.edu.co',
    },
    plazos: {
      fechaInicio: '2024-10-01',
      fechaFin: '2024-12-20',
      diasPlazo: 80,
      diasTranscurridos: 77,
      diasRestantes: 3,
      porcentajeAvance: 95,
    },
    estado: 'en_ejecucion',
    seguimiento: [
      {
        fecha: '2024-12-15',
        porcentaje: 95,
        observaciones: 'Completados todos los talleres. 87% del personal ya evaluado. Pendiente evaluación de rezagados.',
        responsable: 'Sandra Ruiz',
      },
      {
        fecha: '2024-11-20',
        porcentaje: 70,
        observaciones: 'Realizados talleres en sedes regionales. 65% del personal capacitado.',
        responsable: 'Sandra Ruiz',
      },
      {
        fecha: '2024-10-15',
        porcentaje: 30,
        observaciones: 'Iniciados talleres en sede central. Material didáctico distribuido.',
        responsable: 'Sandra Ruiz',
      },
    ],
    evidencias: [
      {
        id: 'EV-005',
        nombre: 'Listados_Asistencia_Talleres.xlsx',
        tipo: 'Excel',
        fecha: '2024-12-10',
        responsable: 'Sandra Ruiz',
      },
      {
        id: 'EV-006',
        nombre: 'Resultados_Evaluaciones.pdf',
        tipo: 'PDF',
        fecha: '2024-12-12',
        responsable: 'Sandra Ruiz',
      },
      {
        id: 'EV-007',
        nombre: 'Material_Didactico_Codigo_Integridad.pdf',
        tipo: 'PDF',
        fecha: '2024-10-01',
        responsable: 'Sandra Ruiz',
      },
    ],
    aprobacion: {
      aprobadoPor: 'Director General',
      fechaAprobacion: '2024-09-25',
      observaciones: 'Aprobado con prioridad alta.',
    },
  },
  {
    id: '5',
    numeroPlan: 'PA-2024-005',
    fechaCreacion: '2024-11-30',
    origen: {
      tipo: 'recomendacion_externa',
      documentoFuente: 'Informe Consultoría Externa 2024',
      hallazgo: 'Ausencia de plan de continuidad del negocio',
      numeroHallazgo: 'CE-2024-012',
    },
    descripcion: {
      titulo: 'Elaboración de Plan de Continuidad del Negocio',
      descripcionProblema: 'La institución no cuenta con un plan documentado para garantizar la continuidad de operaciones ante eventos disruptivos.',
      accionPropuesta: 'Diseñar e implementar Plan de Continuidad del Negocio (BCP) con análisis de impacto, estrategias de recuperación y pruebas periódicas.',
      resultadoEsperado: 'Plan de Continuidad aprobado, socializado y probado exitosamente.',
      tipoAccion: 'preventiva',
    },
    responsable: {
      nombre: 'Roberto García',
      cargo: 'Coordinador de Planeación',
      dependencia: 'Oficina de Planeación',
      email: 'rgarcia@esap.edu.co',
    },
    plazos: {
      fechaInicio: '2025-01-15',
      fechaFin: '2025-06-30',
      diasPlazo: 166,
      diasTranscurridos: 0,
      diasRestantes: 166,
      porcentajeAvance: 0,
    },
    estado: 'en_diseño',
    seguimiento: [
      {
        fecha: '2024-12-05',
        porcentaje: 0,
        observaciones: 'Plan en fase de diseño. Conformando equipo de trabajo.',
        responsable: 'Roberto García',
      },
    ],
    evidencias: [],
    aprobacion: null,
  },
  {
    id: '6',
    numeroPlan: 'PA-2023-089',
    fechaCreacion: '2023-11-10',
    origen: {
      tipo: 'auditoria_interna',
      documentoFuente: 'Auditoría Interna 2023-Q4',
      hallazgo: 'Debilidades en archivo de gestión documental',
      numeroHallazgo: 'AI-2023-015',
    },
    descripcion: {
      titulo: 'Reorganización de archivo de gestión',
      descripcionProblema: 'Archivo de gestión no cumple con lineamientos del Archivo General de la Nación.',
      accionPropuesta: 'Reorganizar archivo aplicando Tablas de Retención Documental actualizadas.',
      resultadoEsperado: 'Archivo de gestión organizado conforme a normativa AGN.',
      tipoAccion: 'correctiva',
    },
    responsable: {
      nombre: 'Claudia Hernández',
      cargo: 'Responsable de Archivo',
      dependencia: 'Secretaría General',
      email: 'chernandez@esap.edu.co',
    },
    plazos: {
      fechaInicio: '2023-12-01',
      fechaFin: '2024-03-31',
      diasPlazo: 121,
      diasTranscurridos: 121,
      diasRestantes: 0,
      porcentajeAvance: 100,
    },
    estado: 'completado',
    seguimiento: [
      {
        fecha: '2024-03-28',
        porcentaje: 100,
        observaciones: 'Plan completado exitosamente. Archivo organizado y validado por auditoría.',
        responsable: 'Claudia Hernández',
      },
      {
        fecha: '2024-02-15',
        porcentaje: 75,
        observaciones: 'Reorganización en curso. 75% del archivo ya clasificado.',
        responsable: 'Claudia Hernández',
      },
      {
        fecha: '2024-01-10',
        porcentaje: 40,
        observaciones: 'Iniciada reorganización física del archivo.',
        responsable: 'Claudia Hernández',
      },
    ],
    evidencias: [
      {
        id: 'EV-008',
        nombre: 'Acta_Validacion_Auditoria_Interna.pdf',
        tipo: 'PDF',
        fecha: '2024-03-28',
        responsable: 'Claudia Hernández',
      },
      {
        id: 'EV-009',
        nombre: 'Informe_Reorganizacion_Archivo.pdf',
        tipo: 'PDF',
        fecha: '2024-03-25',
        responsable: 'Claudia Hernández',
      },
    ],
    aprobacion: {
      aprobadoPor: 'Secretaria General',
      fechaAprobacion: '2023-11-15',
      observaciones: 'Aprobado.',
    },
  },
  {
    id: '7',
    numeroPlan: 'PA-2024-006',
    fechaCreacion: '2024-08-15',
    origen: {
      tipo: 'organo_control',
      documentoFuente: 'Concepto CGR-2024-234',
      hallazgo: 'Ausencia de políticas de seguridad de la información',
      numeroHallazgo: 'CGR-SI-001',
    },
    descripcion: {
      titulo: 'Implementación de políticas de seguridad de la información',
      descripcionProblema: 'No existen políticas formales de seguridad de la información alineadas con normas ISO 27001.',
      accionPropuesta: 'Diseñar, aprobar e implementar conjunto de políticas de seguridad de la información.',
      resultadoEsperado: 'Políticas de seguridad aprobadas, socializadas e implementadas.',
      tipoAccion: 'preventiva',
    },
    responsable: {
      nombre: 'Pedro Ramírez',
      cargo: 'Coordinador TIC',
      dependencia: 'Dirección TIC',
      email: 'pramirez@esap.edu.co',
    },
    plazos: {
      fechaInicio: '2024-09-01',
      fechaFin: '2024-11-30',
      diasPlazo: 90,
      diasTranscurridos: 107,
      diasRestantes: -17,
      porcentajeAvance: 80,
    },
    estado: 'vencido',
    seguimiento: [
      {
        fecha: '2024-12-10',
        porcentaje: 80,
        observaciones: 'Políticas diseñadas y socializadas. Pendiente aprobación formal por Comité Directivo.',
        responsable: 'Pedro Ramírez',
      },
      {
        fecha: '2024-10-15',
        porcentaje: 60,
        observaciones: 'Políticas en revisión por dependencias. Ajustes en curso.',
        responsable: 'Pedro Ramírez',
      },
      {
        fecha: '2024-09-15',
        porcentaje: 30,
        observaciones: 'Borrador de políticas elaborado. Iniciando consulta interna.',
        responsable: 'Pedro Ramírez',
      },
    ],
    evidencias: [
      {
        id: 'EV-010',
        nombre: 'Politicas_Seguridad_Informacion_v2.pdf',
        tipo: 'PDF',
        fecha: '2024-11-20',
        responsable: 'Pedro Ramírez',
      },
    ],
    aprobacion: {
      aprobadoPor: 'Director TIC',
      fechaAprobacion: '2024-08-20',
      observaciones: 'Aprobado con plazo estricto.',
    },
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloPlanAccion() {
  const [planes, setPlanes] = useState<PlanAccion[]>(PLANES_MOCK);
  const [planSeleccionado, setPlanSeleccionado] = useState<PlanAccion | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoPlan | 'todos'>('todos');
  const [filtroOrigen, setFiltroOrigen] = useState<OrigenPlan | 'todos'>('todos');

  // Filtrar planes
  const planesFiltrados = planes.filter(p => {
    const cumpleBusqueda = busqueda === '' || 
      p.numeroPlan.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.descripcion.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.responsable.nombre.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    const cumpleOrigen = filtroOrigen === 'todos' || p.origen.tipo === filtroOrigen;
    
    return cumpleBusqueda && cumpleEstado && cumpleOrigen;
  });

  // Métricas
  const totalPlanes = planes.length;
  const planesEnEjecucion = planes.filter(p => p.estado === 'en_ejecucion').length;
  const planesVencidos = planes.filter(p => p.estado === 'vencido').length;
  const planesCompletados = planes.filter(p => p.estado === 'completado').length;
  const promedioAvance = Math.round(
    planes.reduce((sum, p) => sum + p.plazos.porcentajeAvance, 0) / totalPlanes
  );

  // Distribución por estado
  const porEstado = {
    en_diseño: planes.filter(p => p.estado === 'en_diseño').length,
    aprobado: planes.filter(p => p.estado === 'aprobado').length,
    en_ejecucion: planes.filter(p => p.estado === 'en_ejecucion').length,
    completado: planes.filter(p => p.estado === 'completado').length,
    vencido: planes.filter(p => p.estado === 'vencido').length,
  };

  const getEstadoColor = (estado: EstadoPlan) => {
    switch (estado) {
      case 'en_diseño': return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'En Diseño' };
      case 'aprobado': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Aprobado' };
      case 'en_ejecucion': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Ejecución' };
      case 'completado': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Completado' };
      case 'vencido': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Vencido' };
    }
  };

  const getOrigenLabel = (origen: OrigenPlan) => {
    switch (origen) {
      case 'organo_control': return 'Órgano de Control';
      case 'auditoria_interna': return 'Auditoría Interna';
      case 'recomendacion_externa': return 'Recomendación Externa';
      case 'mejora_continua': return 'Mejora Continua';
      case 'proceso_disciplinario': return 'Proceso Disciplinario';
      case 'proceso_judicial': return 'Proceso Judicial';
    }
  };

  const getTipoAccionColor = (tipo: TipoAccion) => {
    switch (tipo) {
      case 'correctiva': return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Correctiva' };
      case 'preventiva': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Preventiva' };
      case 'mejora': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Mejora' };
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
          <Target className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            MOD-08: Plan de Acción
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión y seguimiento de planes de acción institucionales
          </p>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-purple-600" />
            <span className="text-3xl font-black text-purple-600">{totalPlanes}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Total Planes</p>
          <p className="text-xs text-gray-500 mt-1">Activos en el sistema</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-yellow-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <PlayCircle className="w-8 h-8 text-yellow-600" />
            <span className="text-3xl font-black text-yellow-600">{planesEnEjecucion}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">En Ejecución</p>
          <p className="text-xs text-gray-500 mt-1">En proceso activo</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-3xl font-black text-red-600">{planesVencidos}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Vencidos</p>
          <p className="text-xs text-gray-500 mt-1">Requieren atención</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-black text-green-600">{planesCompletados}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Completados</p>
          <p className="text-xs text-gray-500 mt-1">Finalizados con éxito</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-black text-blue-600">{promedioAvance}%</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Avance Promedio</p>
          <p className="text-xs text-gray-500 mt-1">Global del sistema</p>
        </div>
      </div>

      {/* DISTRIBUCIÓN POR ESTADO */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">📊 Distribución por Estado</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <Edit className="w-8 h-8 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-600">{porEstado.en_diseño}</div>
            <div className="text-xs text-gray-600">En Diseño</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <CheckSquare className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{porEstado.aprobado}</div>
            <div className="text-xs text-gray-600">Aprobado</div>
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
            <div className="text-2xl font-bold text-green-600">{porEstado.completado}</div>
            <div className="text-xs text-gray-600">Completado</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{porEstado.vencido}</div>
            <div className="text-xs text-gray-600">Vencido</div>
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
                placeholder="Número, título, responsable..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="en_diseño">En Diseño</option>
              <option value="aprobado">Aprobado</option>
              <option value="en_ejecucion">En Ejecución</option>
              <option value="completado">Completado</option>
              <option value="vencido">Vencido</option>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="organo_control">Órgano de Control</option>
              <option value="auditoria_interna">Auditoría Interna</option>
              <option value="recomendacion_externa">Recomendación Externa</option>
              <option value="mejora_continua">Mejora Continua</option>
              <option value="proceso_disciplinario">Proceso Disciplinario</option>
              <option value="proceso_judicial">Proceso Judicial</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold text-sm">
            + Nuevo Plan de Acción
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
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Título / Origen
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
                      <div className="text-xs text-gray-500">{plan.fechaCreacion}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {plan.descripcion.titulo}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getOrigenLabel(plan.origen.tipo)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{plan.responsable.nombre}</div>
                      <div className="text-xs text-gray-500">{plan.responsable.dependencia}</div>
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
                          : plan.plazos.diasRestantes <= 15
                          ? 'text-orange-600'
                          : 'text-gray-500'
                      }`}>
                        {plan.plazos.diasRestantes < 0
                          ? `Vencido hace ${Math.abs(plan.plazos.diasRestantes)} días`
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
                        className="text-purple-600 hover:text-purple-800 font-semibold text-sm flex items-center gap-1"
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
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No se encontraron planes de acción</p>
            <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {mostrarModal && planSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{planSeleccionado.numeroPlan}</h2>
                  <p className="text-purple-100 text-sm mt-1">{planSeleccionado.descripcion.titulo}</p>
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
                  <FileText className="w-5 h-5 text-purple-600" />
                  Origen del Plan de Acción
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Tipo de Origen</p>
                    <p className="font-semibold text-gray-900">
                      {getOrigenLabel(planSeleccionado.origen.tipo)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Documento Fuente</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.origen.documentoFuente}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Hallazgo ({planSeleccionado.origen.numeroHallazgo})</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.origen.hallazgo}</p>
                  </div>
                </div>
              </div>

              {/* Descripción del Plan */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">📋 Descripción del Plan</h3>
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-red-700 mb-1">PROBLEMA</p>
                    <p className="text-sm text-gray-900">{planSeleccionado.descripcion.descripcionProblema}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-blue-700 mb-1">ACCIÓN PROPUESTA</p>
                    <p className="text-sm text-gray-900">{planSeleccionado.descripcion.accionPropuesta}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-xs font-bold text-green-700 mb-1">RESULTADO ESPERADO</p>
                    <p className="text-sm text-gray-900">{planSeleccionado.descripcion.resultadoEsperado}</p>
                  </div>
                  <div>
                    <span className={`px-3 py-1 ${getTipoAccionColor(planSeleccionado.descripcion.tipoAccion).bg} ${getTipoAccionColor(planSeleccionado.descripcion.tipoAccion).text} text-xs font-bold rounded-full`}>
                      Acción {getTipoAccionColor(planSeleccionado.descripcion.tipoAccion).label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Responsable */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-600" />
                  Responsable
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nombre</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.responsable.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cargo</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.responsable.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dependencia</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.responsable.dependencia}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{planSeleccionado.responsable.email}</p>
                  </div>
                </div>
              </div>

              {/* Avance y Plazos */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Avance y Plazos
                </h3>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
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
                          : planSeleccionado.plazos.diasRestantes <= 15
                          ? 'text-orange-600'
                          : 'text-green-600'
                      }`}>
                        {planSeleccionado.plazos.diasRestantes}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Avance Global</span>
                      <span className="text-2xl font-black text-purple-700">
                        {planSeleccionado.plazos.porcentajeAvance}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-4">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-4 rounded-full transition-all duration-500"
                        style={{ width: `${planSeleccionado.plazos.porcentajeAvance}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Seguimiento */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Historial de Seguimiento
                </h3>
                <div className="space-y-3">
                  {planSeleccionado.seguimiento.map((seg, idx) => (
                    <div key={idx} className="flex gap-3">
                      <div className="flex-shrink-0 w-24 text-right">
                        <span className="text-xs font-semibold text-gray-500">{seg.fecha}</span>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="w-2 h-2 bg-purple-600 rounded-full mt-2"></div>
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                            {seg.porcentaje}%
                          </span>
                          <span className="text-sm font-semibold text-gray-700">{seg.responsable}</span>
                        </div>
                        <p className="text-sm text-gray-600">{seg.observaciones}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evidencias */}
              {planSeleccionado.evidencias.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Paperclip className="w-5 h-5 text-purple-600" />
                    Evidencias ({planSeleccionado.evidencias.length})
                  </h3>
                  <div className="space-y-2">
                    {planSeleccionado.evidencias.map((ev) => (
                      <div key={ev.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-5 h-5 text-gray-400" />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{ev.nombre}</p>
                            <p className="text-xs text-gray-500">
                              {ev.tipo} • {ev.fecha} • {ev.responsable}
                            </p>
                          </div>
                        </div>
                        <button className="text-purple-600 hover:text-purple-800 font-semibold text-xs">
                          Descargar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Aprobación */}
              {planSeleccionado.aprobacion && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Aprobación
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Aprobado Por</p>
                        <p className="font-semibold text-gray-900">{planSeleccionado.aprobacion.aprobadoPor}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Fecha Aprobación</p>
                        <p className="font-semibold text-gray-900">{planSeleccionado.aprobacion.fechaAprobacion}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Observaciones</p>
                      <p className="text-sm text-gray-900">{planSeleccionado.aprobacion.observaciones}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl flex gap-3">
              {planSeleccionado.estado !== 'completado' && planSeleccionado.estado !== 'vencido' && (
                <>
                  <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Cargar Evidencia
                  </button>
                  <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Actualizar Avance
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
