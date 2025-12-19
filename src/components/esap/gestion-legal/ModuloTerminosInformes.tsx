/**
 * ============================================
 * MOD-11: TÉRMINOS PARA INFORMES
 * ============================================
 * 
 * Gestión y control de términos legales para presentación de informes
 * a órganos de control, entes reguladores y autoridades jurisdiccionales
 * 
 * FUNCIONALIDADES:
 * - Registro de términos legales
 * - Control de plazos y vencimientos
 * - Alertas automáticas
 * - Gestión de prórrogas
 * - Seguimiento de entregas
 * - Trazabilidad completa
 * - Integración con MOD-02 (Órganos de Control)
 * - Dashboard de gestión
 * 
 * TIPOS DE INFORMES:
 * - Contraloría General de la República
 * - Procuraduría General de la Nación
 * - Auditoría General de la República
 * - Superintendencias
 * - Juzgados y Tribunales
 * - Ministerio Público
 * - Congreso de la República
 * 
 * ESTADOS:
 * - Pendiente (no iniciado)
 * - En elaboración (en proceso)
 * - Revisión (en control de calidad)
 * - Entregado (finalizado)
 * - Vencido (no entregado a tiempo)
 * - Prórroga solicitada
 * - Prórroga aprobada
 * 
 * Versión: 1.0.0
 * Prioridad: MEDIA
 */

import { useState } from 'react';
import {
  Clock,
  Search,
  Filter,
  Download,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Eye,
  X,
  User,
  Send,
  AlertCircle,
  XCircle,
  PlayCircle,
  PauseCircle,
  Upload,
  Activity,
  Bell,
  Award,
  TrendingUp,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

type EstadoTermino = 
  | 'pendiente'
  | 'en_elaboracion'
  | 'revision'
  | 'entregado'
  | 'vencido'
  | 'prorroga_solicitada'
  | 'prorroga_aprobada';

type TipoInforme = 
  | 'contraloria'
  | 'procuraduria'
  | 'auditoria_general'
  | 'superintendencia'
  | 'judicial'
  | 'ministerio_publico'
  | 'congreso';

type Prioridad = 'critica' | 'alta' | 'media' | 'baja';

interface Prorroga {
  fechaSolicitud: string;
  diasSolicitados: number;
  justificacion: string;
  solicitadoPor: string;
  estado: 'solicitada' | 'aprobada' | 'rechazada';
  fechaRespuesta?: string;
  nuevaFechaLimite?: string;
  observaciones?: string;
}

interface TerminoInforme {
  id: string;
  numeroRadicado: string;
  fechaRecepcion: string;
  tipoInforme: TipoInforme;
  entidadSolicitante: {
    nombre: string;
    dependencia: string;
    contacto: string;
  };
  asunto: string;
  descripcion: string;
  termino: {
    diasLegales: number;
    fechaLimite: string;
    diasTranscurridos: number;
    diasRestantes: number;
    porcentajeTranscurrido: number;
  };
  responsable: {
    nombre: string;
    cargo: string;
    dependencia: string;
  };
  prioridad: Prioridad;
  estado: EstadoTermino;
  fechaEntrega?: string;
  observaciones: string;
  prorrogas: Prorroga[];
  seguimiento: {
    fecha: string;
    accion: string;
    responsable: string;
    observaciones: string;
  }[];
  documentos: {
    nombre: string;
    tipo: string;
    fecha: string;
  }[];
}

// ============================================
// DATOS MOCK
// ============================================

const TERMINOS_MOCK: TerminoInforme[] = [
  {
    id: '1',
    numeroRadicado: 'CGR-2024-1234',
    fechaRecepcion: '2024-12-01',
    tipoInforme: 'contraloria',
    entidadSolicitante: {
      nombre: 'Contraloría General de la República',
      dependencia: 'Dirección de Vigilancia Fiscal',
      contacto: 'vigilancia@contraloria.gov.co',
    },
    asunto: 'Informe de ejecución presupuestal vigencia 2024',
    descripcion: 'Solicitud de informe detallado sobre la ejecución presupuestal del año 2024, incluyendo desagregación por rubros, contratos ejecutados y saldos finales.',
    termino: {
      diasLegales: 10,
      fechaLimite: '2024-12-11',
      diasTranscurridos: 9,
      diasRestantes: 1,
      porcentajeTranscurrido: 90,
    },
    responsable: {
      nombre: 'Sandra Ortiz',
      cargo: 'Coordinadora Financiera',
      dependencia: 'Dirección Financiera',
    },
    prioridad: 'critica',
    estado: 'revision',
    observaciones: 'Informe en revisión final por Dirección Financiera. Próximo a entrega.',
    prorrogas: [],
    seguimiento: [
      {
        fecha: '2024-12-10',
        accion: 'Informe en revisión final',
        responsable: 'Sandra Ortiz',
        observaciones: 'Documento consolidado. Revisión por Director Financiero.',
      },
      {
        fecha: '2024-12-05',
        accion: 'Elaboración del informe',
        responsable: 'Sandra Ortiz',
        observaciones: 'Recopilación de información de subsistemas financieros.',
      },
      {
        fecha: '2024-12-01',
        accion: 'Asignación de responsable',
        responsable: 'Secretaría General',
        observaciones: 'Radicado asignado a Dirección Financiera.',
      },
    ],
    documentos: [
      {
        nombre: 'Informe_Ejecucion_Presupuestal_2024_Borrador.pdf',
        tipo: 'PDF',
        fecha: '2024-12-10',
      },
    ],
  },
  {
    id: '2',
    numeroRadicado: 'PGN-2024-5678',
    fechaRecepcion: '2024-11-15',
    tipoInforme: 'procuraduria',
    entidadSolicitante: {
      nombre: 'Procuraduría General de la Nación',
      dependencia: 'Procuraduría Delegada para la Vigilancia Administrativa',
      contacto: 'vigilancia@procuraduria.gov.co',
    },
    asunto: 'Informe sobre implementación del Código de Integridad',
    descripcion: 'Solicitud de informe de avance en la implementación del Código de Integridad institucional, incluyendo estrategias de socialización y resultados de evaluaciones.',
    termino: {
      diasLegales: 15,
      fechaLimite: '2024-11-30',
      diasTranscurridos: 15,
      diasRestantes: 0,
      porcentajeTranscurrido: 100,
    },
    responsable: {
      nombre: 'Sandra Ruiz',
      cargo: 'Jefe de Talento Humano',
      dependencia: 'Dirección de Gestión Humana',
    },
    prioridad: 'alta',
    estado: 'entregado',
    fechaEntrega: '2024-11-29',
    observaciones: 'Informe entregado oportunamente. Plazo cumplido.',
    prorrogas: [],
    seguimiento: [
      {
        fecha: '2024-11-29',
        accion: 'Informe entregado',
        responsable: 'Sandra Ruiz',
        observaciones: 'Informe radicado en Procuraduría. Oficio de entrega 2024-345.',
      },
      {
        fecha: '2024-11-25',
        accion: 'Aprobación del informe',
        responsable: 'Secretaria General',
        observaciones: 'Informe aprobado para entrega.',
      },
    ],
    documentos: [
      {
        nombre: 'Informe_Codigo_Integridad_2024.pdf',
        tipo: 'PDF',
        fecha: '2024-11-29',
      },
      {
        nombre: 'Oficio_Entrega_PGN_345.pdf',
        tipo: 'PDF',
        fecha: '2024-11-29',
      },
    ],
  },
  {
    id: '3',
    numeroRadicado: 'AGR-2024-9012',
    fechaRecepcion: '2024-12-05',
    tipoInforme: 'auditoria_general',
    entidadSolicitante: {
      nombre: 'Auditoría General de la República',
      dependencia: 'Dirección de Control Fiscal',
      contacto: 'auditoria@auditoria.gov.co',
    },
    asunto: 'Informe de seguimiento a planes de mejoramiento',
    descripcion: 'Solicitud de informe de avance en la implementación de planes de mejoramiento suscritos en vigencias anteriores.',
    termino: {
      diasLegales: 20,
      fechaLimite: '2024-12-25',
      diasTranscurridos: 12,
      diasRestantes: 8,
      porcentajeTranscurrido: 60,
    },
    responsable: {
      nombre: 'Claudia Hernández',
      cargo: 'Jefe Oficina Control Interno',
      dependencia: 'Oficina de Control Interno',
    },
    prioridad: 'alta',
    estado: 'en_elaboracion',
    observaciones: 'Informe en elaboración. Recopilando información de áreas responsables.',
    prorrogas: [],
    seguimiento: [
      {
        fecha: '2024-12-12',
        accion: 'Consolidación de información',
        responsable: 'Claudia Hernández',
        observaciones: 'Recibidas respuestas de 4 de 6 áreas.',
      },
      {
        fecha: '2024-12-05',
        accion: 'Solicitud de información a áreas',
        responsable: 'Claudia Hernández',
        observaciones: 'Circular enviada a 6 áreas responsables de planes de mejoramiento.',
      },
    ],
    documentos: [],
  },
  {
    id: '4',
    numeroRadicado: 'SIC-2024-3456',
    fechaRecepcion: '2024-11-20',
    tipoInforme: 'superintendencia',
    entidadSolicitante: {
      nombre: 'Superintendencia de Industria y Comercio',
      dependencia: 'Delegatura para la Protección de Datos Personales',
      contacto: 'protecciondatos@sic.gov.co',
    },
    asunto: 'Informe de cumplimiento de políticas de protección de datos',
    descripcion: 'Solicitud de informe sobre cumplimiento de la Ley 1581/2012 y políticas de tratamiento de datos personales.',
    termino: {
      diasLegales: 30,
      fechaLimite: '2024-12-20',
      diasTranscurridos: 20,
      diasRestantes: 3,
      porcentajeTranscurrido: 87,
    },
    responsable: {
      nombre: 'Pedro Ramírez',
      cargo: 'Coordinador TIC',
      dependencia: 'Dirección TIC',
    },
    prioridad: 'alta',
    estado: 'prorroga_aprobada',
    observaciones: 'Prórroga de 10 días aprobada. Nueva fecha límite: 30 de diciembre.',
    prorrogas: [
      {
        fechaSolicitud: '2024-12-10',
        diasSolicitados: 10,
        justificacion: 'Requerimiento de información técnica compleja de sistemas de información. Necesidad de auditoría de seguridad.',
        solicitadoPor: 'Pedro Ramírez',
        estado: 'aprobada',
        fechaRespuesta: '2024-12-11',
        nuevaFechaLimite: '2024-12-30',
        observaciones: 'Prórroga aprobada por SIC mediante oficio 2024-678.',
      },
    ],
    seguimiento: [
      {
        fecha: '2024-12-11',
        accion: 'Prórroga aprobada',
        responsable: 'Pedro Ramírez',
        observaciones: 'Recibido oficio de aprobación de prórroga. Nueva fecha: 30/12/2024.',
      },
      {
        fecha: '2024-12-10',
        accion: 'Solicitud de prórroga',
        responsable: 'Pedro Ramírez',
        observaciones: 'Enviada solicitud de prórroga por 10 días adicionales.',
      },
    ],
    documentos: [
      {
        nombre: 'Solicitud_Prorroga_SIC.pdf',
        tipo: 'PDF',
        fecha: '2024-12-10',
      },
      {
        nombre: 'Aprobacion_Prorroga_SIC_678.pdf',
        tipo: 'PDF',
        fecha: '2024-12-11',
      },
    ],
  },
  {
    id: '5',
    numeroRadicado: 'JUZ-2024-7890',
    fechaRecepcion: '2024-12-08',
    tipoInforme: 'judicial',
    entidadSolicitante: {
      nombre: 'Juzgado Segundo Administrativo de Bogotá',
      dependencia: 'Despacho Judicial',
      contacto: 'juzgado02@cendoj.ramajudicial.gov.co',
    },
    asunto: 'Informe técnico sobre proceso de selección contractual',
    descripcion: 'Solicitud de informe técnico detallado sobre proceso de selección SA-LP-001-2023 en el marco del proceso de nulidad electoral Radicado 2024-00123.',
    termino: {
      diasLegales: 5,
      fechaLimite: '2024-12-13',
      diasTranscurridos: 5,
      diasRestantes: 0,
      porcentajeTranscurrido: 100,
    },
    responsable: {
      nombre: 'Carlos Méndez',
      cargo: 'Jefe de Contratación',
      dependencia: 'Dirección Administrativa',
    },
    prioridad: 'critica',
    estado: 'vencido',
    observaciones: 'TÉRMINO VENCIDO. Requiere entrega urgente. Riesgo de desacato.',
    prorrogas: [],
    seguimiento: [
      {
        fecha: '2024-12-13',
        accion: 'Término vencido',
        responsable: 'Secretaría General',
        observaciones: 'ALERTA: Término vencido. Informe no entregado. Riesgo de sanción.',
      },
      {
        fecha: '2024-12-08',
        accion: 'Asignación de responsable',
        responsable: 'Secretaría General',
        observaciones: 'Radicado asignado a Jefe de Contratación.',
      },
    ],
    documentos: [],
  },
  {
    id: '6',
    numeroRadicado: 'CON-2024-4567',
    fechaRecepcion: '2024-12-15',
    tipoInforme: 'congreso',
    entidadSolicitante: {
      nombre: 'Comisión Tercera Cámara de Representantes',
      dependencia: 'Secretaría Técnica',
      contacto: 'comision3@camara.gov.co',
    },
    asunto: 'Informe de gestión institucional vigencia 2024',
    descripcion: 'Solicitud de informe de gestión institucional para debate de control político programado para enero de 2025.',
    termino: {
      diasLegales: 30,
      fechaLimite: '2025-01-14',
      diasTranscurridos: 2,
      diasRestantes: 28,
      porcentajeTranscurrido: 7,
    },
    responsable: {
      nombre: 'Roberto García',
      cargo: 'Director Administrativo',
      dependencia: 'Dirección Administrativa',
    },
    prioridad: 'media',
    estado: 'pendiente',
    observaciones: 'Término recién notificado. Pendiente asignación de equipo de trabajo.',
    prorrogas: [],
    seguimiento: [
      {
        fecha: '2024-12-15',
        accion: 'Radicado recibido',
        responsable: 'Secretaría General',
        observaciones: 'Radicado recibido y asignado a Director Administrativo.',
      },
    ],
    documentos: [],
  },
  {
    id: '7',
    numeroRadicado: 'CGR-2024-8901',
    fechaRecepcion: '2024-10-15',
    tipoInforme: 'contraloria',
    entidadSolicitante: {
      nombre: 'Contraloría General de la República',
      dependencia: 'Contraloría Delegada para el Sector Educación',
      contacto: 'educacion@contraloria.gov.co',
    },
    asunto: 'Informe sobre gestión de programas académicos',
    descripcion: 'Solicitud de informe sobre gestión de programas académicos en territorios, incluyendo cobertura, calidad y resultados.',
    termino: {
      diasLegales: 15,
      fechaLimite: '2024-10-30',
      diasTranscurridos: 15,
      diasRestantes: 0,
      porcentajeTranscurrido: 100,
    },
    responsable: {
      nombre: 'Diana Mora',
      cargo: 'Directora Académica',
      dependencia: 'Dirección Académica',
    },
    prioridad: 'alta',
    estado: 'entregado',
    fechaEntrega: '2024-10-29',
    observaciones: 'Informe entregado oportunamente.',
    prorrogas: [],
    seguimiento: [
      {
        fecha: '2024-10-29',
        accion: 'Informe entregado',
        responsable: 'Diana Mora',
        observaciones: 'Informe radicado exitosamente ante Contraloría.',
      },
    ],
    documentos: [
      {
        nombre: 'Informe_Gestion_Academica_2024.pdf',
        tipo: 'PDF',
        fecha: '2024-10-29',
      },
    ],
  },
  {
    id: '8',
    numeroRadicado: 'PGN-2024-2345',
    fechaRecepcion: '2024-12-12',
    tipoInforme: 'procuraduria',
    entidadSolicitante: {
      nombre: 'Procuraduría General de la Nación',
      dependencia: 'Procuraduría Delegada para la Moralidad Pública',
      contacto: 'moralidad@procuraduria.gov.co',
    },
    asunto: 'Informe de gestión del Plan Anticorrupción',
    descripcion: 'Solicitud de informe de ejecución del Plan Anticorrupción y de Atención al Ciudadano vigencia 2024.',
    termino: {
      diasLegales: 10,
      fechaLimite: '2024-12-22',
      diasTranscurridos: 5,
      diasRestantes: 5,
      porcentajeTranscurrido: 50,
    },
    responsable: {
      nombre: 'Claudia Hernández',
      cargo: 'Jefe Oficina Control Interno',
      dependencia: 'Oficina de Control Interno',
    },
    prioridad: 'alta',
    estado: 'en_elaboracion',
    observaciones: 'Informe en elaboración. Avance del 50%.',
    prorrogas: [],
    seguimiento: [
      {
        fecha: '2024-12-14',
        accion: 'Inicio de elaboración',
        responsable: 'Claudia Hernández',
        observaciones: 'Iniciada elaboración del informe. Recopilando evidencias.',
      },
    ],
    documentos: [],
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloTerminosInformes() {
  const [terminos, setTerminos] = useState<TerminoInforme[]>(TERMINOS_MOCK);
  const [terminoSeleccionado, setTerminoSeleccionado] = useState<TerminoInforme | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoTermino | 'todos'>('todos');
  const [filtroPrioridad, setFiltroPrioridad] = useState<Prioridad | 'todas'>('todas');
  const [filtroTipo, setFiltroTipo] = useState<TipoInforme | 'todos'>('todos');

  // Filtrar términos
  const terminosFiltrados = terminos.filter(t => {
    const cumpleBusqueda = busqueda === '' || 
      t.numeroRadicado.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.asunto.toLowerCase().includes(busqueda.toLowerCase()) ||
      t.responsable.nombre.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleEstado = filtroEstado === 'todos' || t.estado === filtroEstado;
    const cumplePrioridad = filtroPrioridad === 'todas' || t.prioridad === filtroPrioridad;
    const cumpleTipo = filtroTipo === 'todos' || t.tipoInforme === filtroTipo;
    
    return cumpleBusqueda && cumpleEstado && cumplePrioridad && cumpleTipo;
  });

  // Métricas
  const totalTerminos = terminos.length;
  const terminosVencidos = terminos.filter(t => t.estado === 'vencido').length;
  const terminosCriticos = terminos.filter(t => 
    t.prioridad === 'critica' && t.estado !== 'entregado' && t.estado !== 'vencido'
  ).length;
  const terminosProximosVencer = terminos.filter(t => 
    t.termino.diasRestantes <= 3 && t.termino.diasRestantes > 0 && t.estado !== 'entregado'
  ).length;
  const tasaCumplimiento = Math.round(
    (terminos.filter(t => t.estado === 'entregado' && !t.fechaEntrega).length / 
    terminos.filter(t => t.estado === 'entregado' || t.estado === 'vencido').length) * 100
  ) || 0;

  // Distribución por estado
  const porEstado = {
    pendiente: terminos.filter(t => t.estado === 'pendiente').length,
    en_elaboracion: terminos.filter(t => t.estado === 'en_elaboracion').length,
    revision: terminos.filter(t => t.estado === 'revision').length,
    entregado: terminos.filter(t => t.estado === 'entregado').length,
    vencido: terminos.filter(t => t.estado === 'vencido').length,
    prorroga: terminos.filter(t => 
      t.estado === 'prorroga_solicitada' || t.estado === 'prorroga_aprobada'
    ).length,
  };

  const getEstadoColor = (estado: EstadoTermino) => {
    switch (estado) {
      case 'pendiente': return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pendiente' };
      case 'en_elaboracion': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Elaboración' };
      case 'revision': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Revisión' };
      case 'entregado': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Entregado' };
      case 'vencido': return { bg: 'bg-red-100', text: 'text-red-700', label: 'VENCIDO' };
      case 'prorroga_solicitada': return { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Prórroga Solicitada' };
      case 'prorroga_aprobada': return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Prórroga Aprobada' };
    }
  };

  const getPrioridadColor = (prioridad: Prioridad) => {
    switch (prioridad) {
      case 'critica': return { bg: 'bg-red-600', text: 'text-white', label: 'CRÍTICA' };
      case 'alta': return { bg: 'bg-orange-500', text: 'text-white', label: 'ALTA' };
      case 'media': return { bg: 'bg-yellow-500', text: 'text-white', label: 'MEDIA' };
      case 'baja': return { bg: 'bg-green-500', text: 'text-white', label: 'BAJA' };
    }
  };

  const getTipoInformeLabel = (tipo: TipoInforme) => {
    switch (tipo) {
      case 'contraloria': return 'Contraloría';
      case 'procuraduria': return 'Procuraduría';
      case 'auditoria_general': return 'Auditoría General';
      case 'superintendencia': return 'Superintendencia';
      case 'judicial': return 'Judicial';
      case 'ministerio_publico': return 'Ministerio Público';
      case 'congreso': return 'Congreso';
    }
  };

  const getUrgenciaColor = (diasRestantes: number, estado: EstadoTermino) => {
    if (estado === 'entregado') return 'text-green-600';
    if (estado === 'vencido' || diasRestantes < 0) return 'text-red-600 font-black animate-pulse';
    if (diasRestantes <= 1) return 'text-red-600 font-bold';
    if (diasRestantes <= 3) return 'text-orange-600 font-bold';
    if (diasRestantes <= 7) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <Clock className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            MOD-11: Términos para Informes
          </h1>
          <p className="text-gray-600 mt-1">
            Gestión y control de plazos legales para entrega de informes
          </p>
        </div>
      </div>

      {/* ALERTAS CRÍTICAS */}
      {(terminosVencidos > 0 || terminosProximosVencer > 0) && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Bell className="w-8 h-8 text-red-600 animate-pulse" />
            <div className="flex-1">
              <h3 className="font-bold text-red-900">⚠️ ALERTAS DE TÉRMINOS</h3>
              <div className="flex items-center gap-4 mt-1 text-sm">
                {terminosVencidos > 0 && (
                  <span className="text-red-700 font-bold">
                    🔴 {terminosVencidos} TÉRMINO(S) VENCIDO(S)
                  </span>
                )}
                {terminosProximosVencer > 0 && (
                  <span className="text-orange-700 font-bold">
                    ⚠️ {terminosProximosVencer} TÉRMINO(S) POR VENCER (≤3 días)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <FileText className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-black text-blue-600">{totalTerminos}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Total Términos</p>
          <p className="text-xs text-gray-500 mt-1">Activos en sistema</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-3xl font-black text-red-600">{terminosVencidos}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Vencidos</p>
          <p className="text-xs text-gray-500 mt-1">Requieren acción</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-8 h-8 text-orange-600" />
            <span className="text-3xl font-black text-orange-600">{terminosCriticos}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Críticos</p>
          <p className="text-xs text-gray-500 mt-1">Prioridad máxima</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-yellow-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-yellow-600" />
            <span className="text-3xl font-black text-yellow-600">{terminosProximosVencer}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Por Vencer</p>
          <p className="text-xs text-gray-500 mt-1">≤ 3 días</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Award className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-black text-green-600">{tasaCumplimiento}%</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Cumplimiento</p>
          <p className="text-xs text-gray-500 mt-1">Entregas a tiempo</p>
        </div>
      </div>

      {/* DISTRIBUCIÓN POR ESTADO */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">📊 Distribución por Estado</h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <PauseCircle className="w-8 h-8 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-600">{porEstado.pendiente}</div>
            <div className="text-xs text-gray-600">Pendiente</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-2">
              <PlayCircle className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600">{porEstado.en_elaboracion}</div>
            <div className="text-xs text-gray-600">En Elaboración</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
              <Eye className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{porEstado.revision}</div>
            <div className="text-xs text-gray-600">Revisión</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{porEstado.entregado}</div>
            <div className="text-xs text-gray-600">Entregado</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{porEstado.vencido}</div>
            <div className="text-xs text-gray-600">Vencido</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">{porEstado.prorroga}</div>
            <div className="text-xs text-gray-600">Prórroga</div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Buscar Término
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Radicado, asunto, responsable..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_elaboracion">En Elaboración</option>
              <option value="revision">Revisión</option>
              <option value="entregado">Entregado</option>
              <option value="vencido">Vencido</option>
              <option value="prorroga_solicitada">Prórroga Solicitada</option>
              <option value="prorroga_aprobada">Prórroga Aprobada</option>
            </select>
          </div>

          {/* Filtro por Prioridad */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Prioridad
            </label>
            <select
              value={filtroPrioridad}
              onChange={(e) => setFiltroPrioridad(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todas">Todas</option>
              <option value="critica">Crítica</option>
              <option value="alta">Alta</option>
              <option value="media">Media</option>
              <option value="baja">Baja</option>
            </select>
          </div>

          {/* Filtro por Tipo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo de Informe
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="contraloria">Contraloría</option>
              <option value="procuraduria">Procuraduría</option>
              <option value="auditoria_general">Auditoría General</option>
              <option value="superintendencia">Superintendencia</option>
              <option value="judicial">Judicial</option>
              <option value="ministerio_publico">Ministerio Público</option>
              <option value="congreso">Congreso</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm">
            + Nuevo Término
          </button>
          <button className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => {
              setBusqueda('');
              setFiltroEstado('todos');
              setFiltroPrioridad('todas');
              setFiltroTipo('todos');
            }}
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
          >
            Limpiar filtros
          </button>
          <div className="ml-auto text-sm text-gray-600">
            Mostrando <strong>{terminosFiltrados.length}</strong> de <strong>{totalTerminos}</strong> términos
          </div>
        </div>
      </div>

      {/* TABLA DE TÉRMINOS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Radicado
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Asunto / Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Prioridad
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
              {terminosFiltrados.map((termino) => {
                const estadoColor = getEstadoColor(termino.estado);
                const prioridadColor = getPrioridadColor(termino.prioridad);
                const urgenciaColor = getUrgenciaColor(termino.termino.diasRestantes, termino.estado);
                
                return (
                  <tr key={termino.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{termino.numeroRadicado}</div>
                      <div className="text-xs text-gray-500">{termino.fechaRecepcion}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {termino.asunto}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTipoInformeLabel(termino.tipoInforme)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{termino.responsable.nombre}</div>
                      <div className="text-xs text-gray-500">{termino.responsable.dependencia}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 ${prioridadColor.bg} ${prioridadColor.text} text-xs font-black rounded-full`}>
                        {prioridadColor.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{termino.termino.fechaLimite}</div>
                      <div className={`text-xs ${urgenciaColor}`}>
                        {termino.estado === 'entregado'
                          ? `Entregado: ${termino.fechaEntrega}`
                          : termino.termino.diasRestantes < 0
                          ? `VENCIDO (${Math.abs(termino.termino.diasRestantes)} días)`
                          : termino.termino.diasRestantes === 0
                          ? '⚠️ VENCE HOY'
                          : `${termino.termino.diasRestantes} día(s) restante(s)`
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
                          setTerminoSeleccionado(termino);
                          setMostrarModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm flex items-center gap-1"
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

        {terminosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No se encontraron términos</p>
            <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {mostrarModal && terminoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className={`sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-2xl ${
              terminoSeleccionado.estado === 'vencido' ? 'border-b-4 border-red-600' : ''
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{terminoSeleccionado.numeroRadicado}</h2>
                    <span className={`px-3 py-1 ${getPrioridadColor(terminoSeleccionado.prioridad).bg} ${getPrioridadColor(terminoSeleccionado.prioridad).text} text-xs font-black rounded-full`}>
                      {getPrioridadColor(terminoSeleccionado.prioridad).label}
                    </span>
                  </div>
                  <p className="text-blue-100 text-sm">{terminoSeleccionado.asunto}</p>
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
              {/* Alerta de vencimiento */}
              {(terminoSeleccionado.estado === 'vencido' || terminoSeleccionado.termino.diasRestantes <= 1) && (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-8 h-8 text-red-600 animate-pulse" />
                    <div>
                      <h4 className="font-bold text-red-900">
                        {terminoSeleccionado.estado === 'vencido' ? '🔴 TÉRMINO VENCIDO' : '⚠️ TÉRMINO POR VENCER'}
                      </h4>
                      <p className="text-sm text-red-700">
                        {terminoSeleccionado.estado === 'vencido'
                          ? 'Este término ha vencido. Requiere entrega urgente para evitar sanciones.'
                          : 'Este término vence en menos de 24 horas. Acción inmediata requerida.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Información del Plazo */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Información del Plazo
                </h3>
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Días Legales</p>
                      <p className="text-2xl font-black text-blue-700">{terminoSeleccionado.termino.diasLegales}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Fecha Límite</p>
                      <p className="font-bold text-gray-900">{terminoSeleccionado.termino.fechaLimite}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Días Transcurridos</p>
                      <p className="text-2xl font-black text-gray-700">{terminoSeleccionado.termino.diasTranscurridos}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-600 mb-1">Días Restantes</p>
                      <p className={`text-3xl font-black ${getUrgenciaColor(terminoSeleccionado.termino.diasRestantes, terminoSeleccionado.estado)}`}>
                        {terminoSeleccionado.termino.diasRestantes}
                      </p>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Avance del Plazo</span>
                      <span className="text-xl font-black text-blue-700">
                        {terminoSeleccionado.termino.porcentajeTranscurrido}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full ${
                          terminoSeleccionado.termino.porcentajeTranscurrido >= 100
                            ? 'bg-red-600'
                            : terminoSeleccionado.termino.porcentajeTranscurrido >= 80
                            ? 'bg-orange-600'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${Math.min(terminoSeleccionado.termino.porcentajeTranscurrido, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Entidad Solicitante */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Entidad Solicitante
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Entidad</p>
                    <p className="font-semibold text-gray-900">{terminoSeleccionado.entidadSolicitante.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dependencia</p>
                    <p className="font-semibold text-gray-900">{terminoSeleccionado.entidadSolicitante.dependencia}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Contacto</p>
                    <p className="font-semibold text-gray-900">{terminoSeleccionado.entidadSolicitante.contacto}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-xs text-gray-500 mb-1">Descripción del Requerimiento</p>
                    <p className="text-sm text-gray-900">{terminoSeleccionado.descripcion}</p>
                  </div>
                </div>
              </div>

              {/* Responsable */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Responsable de Elaboración
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nombre</p>
                    <p className="font-semibold text-gray-900">{terminoSeleccionado.responsable.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cargo</p>
                    <p className="font-semibold text-gray-900">{terminoSeleccionado.responsable.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dependencia</p>
                    <p className="font-semibold text-gray-900">{terminoSeleccionado.responsable.dependencia}</p>
                  </div>
                </div>
              </div>

              {/* Prórrogas */}
              {terminoSeleccionado.prorrogas.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    Prórrogas ({terminoSeleccionado.prorrogas.length})
                  </h3>
                  <div className="space-y-3">
                    {terminoSeleccionado.prorrogas.map((prorroga, idx) => (
                      <div key={idx} className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs font-bold rounded ${
                                prorroga.estado === 'aprobada' ? 'bg-green-100 text-green-700' :
                                prorroga.estado === 'rechazada' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {prorroga.estado.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-600">
                                Solicitada: {prorroga.fechaSolicitud}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 mb-2">
                              <strong>Justificación:</strong> {prorroga.justificacion}
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                              <div>
                                <span className="font-semibold">Días solicitados:</span> {prorroga.diasSolicitados}
                              </div>
                              <div>
                                <span className="font-semibold">Solicitado por:</span> {prorroga.solicitadoPor}
                              </div>
                              {prorroga.nuevaFechaLimite && (
                                <>
                                  <div>
                                    <span className="font-semibold">Nueva fecha límite:</span> {prorroga.nuevaFechaLimite}
                                  </div>
                                  <div>
                                    <span className="font-semibold">Fecha respuesta:</span> {prorroga.fechaRespuesta}
                                  </div>
                                </>
                              )}
                            </div>
                            {prorroga.observaciones && (
                              <p className="text-xs text-gray-600 mt-2">
                                <strong>Observaciones:</strong> {prorroga.observaciones}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seguimiento */}
              {terminoSeleccionado.seguimiento.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Historial de Seguimiento
                  </h3>
                  <div className="space-y-3">
                    {terminoSeleccionado.seguimiento.map((seg, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-24 text-right">
                          <span className="text-xs font-semibold text-gray-500">{seg.fecha}</span>
                        </div>
                        <div className="flex-shrink-0">
                          <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm font-bold text-gray-900 mb-1">{seg.accion}</p>
                          <p className="text-sm text-gray-700 mb-1">{seg.responsable}</p>
                          <p className="text-sm text-gray-600">{seg.observaciones}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documentos */}
              {terminoSeleccionado.documentos.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Documentos ({terminoSeleccionado.documentos.length})
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      {terminoSeleccionado.documentos.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-700">{doc.nombre}</span>
                          </div>
                          <span className="text-xs text-gray-500">{doc.fecha}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Observaciones */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">📝 Observaciones</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-gray-900">{terminoSeleccionado.observaciones}</p>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl flex gap-3">
              {terminoSeleccionado.estado !== 'entregado' && terminoSeleccionado.estado !== 'vencido' && (
                <>
                  <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4" />
                    Cargar Documento
                  </button>
                  <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Marcar como Entregado
                  </button>
                  <button className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold flex items-center justify-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Solicitar Prórroga
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
