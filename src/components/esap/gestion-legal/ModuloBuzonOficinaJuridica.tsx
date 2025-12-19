/**
 * ============================================
 * MOD-07: BUZÓN DE OFICINA JURÍDICA
 * ============================================
 * 
 * Sistema de comunicaciones interno de la Oficina Jurídica
 * Canal de consultas rápidas con escalación a asesorías formales
 * 
 * FUNCIONALIDADES:
 * - Buzón de entrada de consultas jurídicas
 * - Chat interno con funcionarios
 * - Consultas rápidas (respuesta inmediata)
 * - Escalación a asesoría formal (MOD-03)
 * - Categorización de temas jurídicos
 * - Historial de conversaciones
 * - Respuestas predefinidas (FAQ)
 * - Control de tiempos de respuesta
 * 
 * TIPOS DE CONSULTA:
 * - Consulta rápida (respuesta < 1 día)
 * - Asesoría simple (respuesta < 5 días)
 * - Asesoría formal (escala a MOD-03, 30 días)
 * 
 * TEMAS:
 * - Contratación
 * - Laboral
 * - Disciplinario
 * - Presupuestal
 * - Académico
 * - Administrativo
 * - Otros
 * 
 * Versión: 1.0.0
 * Prioridad: MEDIA
 */

import { useState } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Download,
  Send,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  FileText,
  ArrowUpRight,
  Eye,
  X,
  Mail,
  Calendar,
  TrendingUp,
  Zap,
  MessageCircle,
  Archive,
  Bell,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

type EstadoConsulta = 'nueva' | 'en_revision' | 'respondida' | 'escalada' | 'archivo';

type TipoConsulta = 'rapida' | 'simple' | 'formal';

type TemaConsulta = 
  | 'contratacion'
  | 'laboral'
  | 'disciplinario'
  | 'presupuestal'
  | 'academico'
  | 'administrativo'
  | 'otros';

type PrioridadConsulta = 'alta' | 'media' | 'baja';

interface ConsultaJuridica {
  id: string;
  numeroConsulta: string;
  fechaRecepcion: string;
  horaRecepcion: string;
  solicitante: {
    nombre: string;
    cargo: string;
    dependencia: string;
    email: string;
    telefono: string;
  };
  consulta: {
    asunto: string;
    descripcion: string;
    tema: TemaConsulta;
    tipo: TipoConsulta;
    prioridad: PrioridadConsulta;
    archivosAdjuntos: number;
  };
  estado: EstadoConsulta;
  tiempos: {
    tiempoRespuesta: number; // en horas
    fechaLimite: string;
    horasRestantes: number;
  };
  asignacion: {
    abogado: string;
    fechaAsignacion: string;
  } | null;
  respuesta: {
    fecha: string;
    abogado: string;
    contenido: string;
  } | null;
  escalacion: {
    fecha: string;
    numeroAsesoria: string;
    modulo: string;
    motivo: string;
  } | null;
  mensajes: {
    fecha: string;
    hora: string;
    autor: string;
    rol: 'solicitante' | 'abogado' | 'sistema';
    mensaje: string;
  }[];
}

// ============================================
// DATOS MOCK
// ============================================

const CONSULTAS_MOCK: ConsultaJuridica[] = [
  {
    id: '1',
    numeroConsulta: 'BOJ-2024-001',
    fechaRecepcion: '2024-12-17',
    horaRecepcion: '08:30',
    solicitante: {
      nombre: 'Carlos Mendoza',
      cargo: 'Coordinador de Contratación',
      dependencia: 'Dirección Administrativa',
      email: 'cmendoza@esap.edu.co',
      telefono: '3001234567',
    },
    consulta: {
      asunto: 'Consulta sobre modificación de contrato de prestación de servicios',
      descripcion: 'Requiero asesoría sobre la viabilidad jurídica de modificar el objeto contractual de un contrato vigente sin realizar adición presupuestal.',
      tema: 'contratacion',
      tipo: 'rapida',
      prioridad: 'alta',
      archivosAdjuntos: 2,
    },
    estado: 'nueva',
    tiempos: {
      tiempoRespuesta: 24,
      fechaLimite: '2024-12-18',
      horasRestantes: 15,
    },
    asignacion: null,
    respuesta: null,
    escalacion: null,
    mensajes: [
      {
        fecha: '2024-12-17',
        hora: '08:30',
        autor: 'Carlos Mendoza',
        rol: 'solicitante',
        mensaje: 'Buenos días. Necesito orientación urgente sobre una modificación contractual. El contrato es 2024-456 con Servicios XYZ.',
      },
    ],
  },
  {
    id: '2',
    numeroConsulta: 'BOJ-2024-002',
    fechaRecepcion: '2024-12-16',
    horaRecepcion: '14:20',
    solicitante: {
      nombre: 'Ana Patricia Sánchez',
      cargo: 'Jefe de Talento Humano',
      dependencia: 'Dirección de Gestión Humana',
      email: 'apsanchez@esap.edu.co',
      telefono: '3109876543',
    },
    consulta: {
      asunto: 'Interpretación de norma sobre licencias remuneradas',
      descripcion: 'Un funcionario solicita licencia de paternidad pero tiene contrato de prestación de servicios. ¿Aplica la Ley 1822/2017?',
      tema: 'laboral',
      tipo: 'rapida',
      prioridad: 'media',
      archivosAdjuntos: 1,
    },
    estado: 'respondida',
    tiempos: {
      tiempoRespuesta: 24,
      fechaLimite: '2024-12-17',
      horasRestantes: 0,
    },
    asignacion: {
      abogado: 'Dr. Luis Fernando Vargas',
      fechaAsignacion: '2024-12-16',
    },
    respuesta: {
      fecha: '2024-12-16',
      abogado: 'Dr. Luis Fernando Vargas',
      contenido: 'La licencia de paternidad es un derecho exclusivo de trabajadores con vinculación laboral según Ley 1822/2017. Los contratistas por prestación de servicios no tienen derecho a licencias remuneradas. Sin embargo, pueden suspender el contrato de mutuo acuerdo.',
    },
    escalacion: null,
    mensajes: [
      {
        fecha: '2024-12-16',
        hora: '14:20',
        autor: 'Ana Patricia Sánchez',
        rol: 'solicitante',
        mensaje: 'Tengo duda sobre licencia de paternidad para contratistas.',
      },
      {
        fecha: '2024-12-16',
        hora: '15:45',
        autor: 'Dr. Luis Fernando Vargas',
        rol: 'abogado',
        mensaje: 'Revisado el caso. La Ley 1822/2017 aplica solo para trabajadores con relación laboral, no para contratistas.',
      },
      {
        fecha: '2024-12-16',
        hora: '16:10',
        autor: 'Ana Patricia Sánchez',
        rol: 'solicitante',
        mensaje: '¡Perfecto! Muchas gracias por la claridad.',
      },
    ],
  },
  {
    id: '3',
    numeroConsulta: 'BOJ-2024-003',
    fechaRecepcion: '2024-12-15',
    horaRecepcion: '10:15',
    solicitante: {
      nombre: 'Roberto García',
      cargo: 'Coordinador Académico',
      dependencia: 'Vicerrectoría Académica',
      email: 'rgarcia@esap.edu.co',
      telefono: '3157654321',
    },
    consulta: {
      asunto: 'Validez de certificados emitidos sin registro calificado',
      descripcion: 'Requiero concepto formal sobre la validez jurídica de certificados emitidos en programas cuyo registro calificado venció hace 3 meses. Caso complejo que requiere análisis exhaustivo.',
      tema: 'academico',
      tipo: 'formal',
      prioridad: 'alta',
      archivosAdjuntos: 8,
    },
    estado: 'escalada',
    tiempos: {
      tiempoRespuesta: 120,
      fechaLimite: '2024-12-20',
      horasRestantes: 72,
    },
    asignacion: {
      abogado: 'Dra. María Fernanda López',
      fechaAsignacion: '2024-12-15',
    },
    respuesta: null,
    escalacion: {
      fecha: '2024-12-15',
      numeroAsesoria: 'ASES-2024-089',
      modulo: 'MOD-03',
      motivo: 'Requiere concepto formal por complejidad y afectación a derechos de estudiantes',
    },
    mensajes: [
      {
        fecha: '2024-12-15',
        hora: '10:15',
        autor: 'Roberto García',
        rol: 'solicitante',
        mensaje: 'Necesito concepto urgente sobre validez de certificados. Es un tema delicado.',
      },
      {
        fecha: '2024-12-15',
        hora: '11:30',
        autor: 'Dra. María Fernanda López',
        rol: 'abogado',
        mensaje: 'Roberto, este caso requiere asesoría formal. Voy a escalarlo a MOD-03 para emitir concepto oficial.',
      },
      {
        fecha: '2024-12-15',
        hora: '11:31',
        autor: 'Sistema',
        rol: 'sistema',
        mensaje: '✅ Consulta escalada a Asesoría Formal MOD-03 con número ASES-2024-089',
      },
    ],
  },
  {
    id: '4',
    numeroConsulta: 'BOJ-2024-004',
    fechaRecepcion: '2024-12-14',
    horaRecepcion: '16:40',
    solicitante: {
      nombre: 'Sandra Ortiz',
      cargo: 'Coordinadora Financiera',
      dependencia: 'Dirección Financiera',
      email: 'sortiz@esap.edu.co',
      telefono: '3201234567',
    },
    consulta: {
      asunto: 'Ejecución presupuestal en último trimestre',
      descripcion: '¿Podemos comprometer presupuesto de vigencia 2024 después del 15 de diciembre?',
      tema: 'presupuestal',
      tipo: 'rapida',
      prioridad: 'alta',
      archivosAdjuntos: 0,
    },
    estado: 'en_revision',
    tiempos: {
      tiempoRespuesta: 24,
      fechaLimite: '2024-12-15',
      horasRestantes: 0,
    },
    asignacion: {
      abogado: 'Dr. Carlos Andrés Martínez',
      fechaAsignacion: '2024-12-14',
    },
    respuesta: null,
    escalacion: null,
    mensajes: [
      {
        fecha: '2024-12-14',
        hora: '16:40',
        autor: 'Sandra Ortiz',
        rol: 'solicitante',
        mensaje: 'Urgente: ¿podemos comprometer presupuesto después del 15 de diciembre?',
      },
      {
        fecha: '2024-12-14',
        hora: '17:15',
        autor: 'Dr. Carlos Andrés Martínez',
        rol: 'abogado',
        mensaje: 'Sandra, estoy revisando el Decreto 1068/2015 y circulares del MinHacienda. Te respondo mañana en la mañana.',
      },
    ],
  },
  {
    id: '5',
    numeroConsulta: 'BOJ-2024-005',
    fechaRecepcion: '2024-12-13',
    horaRecepcion: '09:00',
    solicitante: {
      nombre: 'Miguel Ángel Torres',
      cargo: 'Director Regional',
      dependencia: 'Dirección Territorial Antioquia',
      email: 'matorres@esap.edu.co',
      telefono: '3159876543',
    },
    consulta: {
      asunto: 'Proceso disciplinario - Competencia funcional',
      descripcion: 'Un funcionario cometió falta en horario laboral pero en actividad no oficial. ¿Hay competencia disciplinaria?',
      tema: 'disciplinario',
      tipo: 'simple',
      prioridad: 'media',
      archivosAdjuntos: 3,
    },
    estado: 'respondida',
    tiempos: {
      tiempoRespuesta: 120,
      fechaLimite: '2024-12-18',
      horasRestantes: 24,
    },
    asignacion: {
      abogado: 'Dr. Jorge Enrique Mora',
      fechaAsignacion: '2024-12-13',
    },
    respuesta: {
      fecha: '2024-12-14',
      abogado: 'Dr. Jorge Enrique Mora',
      contenido: 'Según Ley 734/2002, Art. 53, existe competencia disciplinaria cuando la conducta afecta el servicio o la imagen institucional, independiente de si la actividad era oficial. Recomiendo apertura de indagación preliminar.',
    },
    escalacion: null,
    mensajes: [
      {
        fecha: '2024-12-13',
        hora: '09:00',
        autor: 'Miguel Ángel Torres',
        rol: 'solicitante',
        mensaje: 'Necesito orientación sobre competencia en un caso disciplinario complejo.',
      },
      {
        fecha: '2024-12-13',
        hora: '11:00',
        autor: 'Dr. Jorge Enrique Mora',
        rol: 'abogado',
        mensaje: 'Miguel, envíame los hechos específicos para darte una respuesta precisa.',
      },
      {
        fecha: '2024-12-13',
        hora: '11:30',
        autor: 'Miguel Ángel Torres',
        rol: 'solicitante',
        mensaje: 'Adjunto informe detallado de los hechos.',
      },
      {
        fecha: '2024-12-14',
        hora: '10:00',
        autor: 'Dr. Jorge Enrique Mora',
        rol: 'abogado',
        mensaje: 'Revisado el caso. Sí hay competencia disciplinaria. Ver respuesta formal.',
      },
    ],
  },
  {
    id: '6',
    numeroConsulta: 'BOJ-2024-006',
    fechaRecepcion: '2024-12-12',
    horaRecepcion: '13:45',
    solicitante: {
      nombre: 'Laura Gómez',
      cargo: 'Secretaria General',
      dependencia: 'Secretaría General',
      email: 'lgomez@esap.edu.co',
      telefono: '3001239876',
    },
    consulta: {
      asunto: 'Publicación de actos administrativos en página web',
      descripcion: '¿Es obligatorio publicar todas las resoluciones en la web institucional?',
      tema: 'administrativo',
      tipo: 'rapida',
      prioridad: 'baja',
      archivosAdjuntos: 0,
    },
    estado: 'respondida',
    tiempos: {
      tiempoRespuesta: 24,
      fechaLimite: '2024-12-13',
      horasRestantes: 0,
    },
    asignacion: {
      abogado: 'Dr. Luis Fernando Vargas',
      fechaAsignacion: '2024-12-12',
    },
    respuesta: {
      fecha: '2024-12-12',
      abogado: 'Dr. Luis Fernando Vargas',
      contenido: 'Ley 1712/2014 de Transparencia obliga publicar actos de carácter general. Los de contenido particular solo si afectan derechos de terceros. Recomiendo matriz de clasificación.',
    },
    escalacion: null,
    mensajes: [
      {
        fecha: '2024-12-12',
        hora: '13:45',
        autor: 'Laura Gómez',
        rol: 'solicitante',
        mensaje: 'Consulta rápida: ¿todas las resoluciones van a la web?',
      },
      {
        fecha: '2024-12-12',
        hora: '15:20',
        autor: 'Dr. Luis Fernando Vargas',
        rol: 'abogado',
        mensaje: 'Laura, depende del tipo de acto. Solo los de carácter general son obligatorios.',
      },
    ],
  },
  {
    id: '7',
    numeroConsulta: 'BOJ-2024-007',
    fechaRecepcion: '2024-12-11',
    horaRecepcion: '11:00',
    solicitante: {
      nombre: 'Pedro Ramírez',
      cargo: 'Coordinador de Sistemas',
      dependencia: 'Dirección TIC',
      email: 'pramirez@esap.edu.co',
      telefono: '3157891234',
    },
    consulta: {
      asunto: 'Protección de datos personales - Implementación RGPD',
      descripcion: 'Necesitamos concepto formal sobre tratamiento de datos de estudiantes en nueva plataforma educativa. Requiere análisis de Ley 1581/2012 y normativa internacional.',
      tema: 'administrativo',
      tipo: 'formal',
      prioridad: 'alta',
      archivosAdjuntos: 5,
    },
    estado: 'escalada',
    tiempos: {
      tiempoRespuesta: 120,
      fechaLimite: '2024-12-16',
      horasRestantes: 0,
    },
    asignacion: {
      abogado: 'Dra. Sandra Patricia Ruiz',
      fechaAsignacion: '2024-12-11',
    },
    respuesta: null,
    escalacion: {
      fecha: '2024-12-11',
      numeroAsesoria: 'ASES-2024-091',
      modulo: 'MOD-03',
      motivo: 'Requiere concepto formal por complejidad técnica y legal sobre tratamiento de datos',
    },
    mensajes: [
      {
        fecha: '2024-12-11',
        hora: '11:00',
        autor: 'Pedro Ramírez',
        rol: 'solicitante',
        mensaje: 'Necesitamos concepto sobre protección de datos para nueva plataforma.',
      },
      {
        fecha: '2024-12-11',
        hora: '14:00',
        autor: 'Dra. Sandra Patricia Ruiz',
        rol: 'abogado',
        mensaje: 'Pedro, este tema requiere concepto formal. Lo escalo a MOD-03.',
      },
      {
        fecha: '2024-12-11',
        hora: '14:01',
        autor: 'Sistema',
        rol: 'sistema',
        mensaje: '✅ Consulta escalada a Asesoría Formal MOD-03 con número ASES-2024-091',
      },
    ],
  },
  {
    id: '8',
    numeroConsulta: 'BOJ-2024-008',
    fechaRecepcion: '2024-12-10',
    horaRecepcion: '08:15',
    solicitante: {
      nombre: 'Claudia Hernández',
      cargo: 'Jefe de Control Interno',
      dependencia: 'Oficina de Control Interno',
      email: 'chernandez@esap.edu.co',
      telefono: '3209871234',
    },
    consulta: {
      asunto: 'Conflicto de intereses en evaluación de contratos',
      descripcion: 'Un funcionario debe evaluar contrato donde su cónyuge es contratista. ¿Hay impedimento?',
      tema: 'administrativo',
      tipo: 'rapida',
      prioridad: 'alta',
      archivosAdjuntos: 1,
    },
    estado: 'archivo',
    tiempos: {
      tiempoRespuesta: 24,
      fechaLimite: '2024-12-11',
      horasRestantes: 0,
    },
    asignacion: {
      abogado: 'Dr. Carlos Andrés Martínez',
      fechaAsignacion: '2024-12-10',
    },
    respuesta: {
      fecha: '2024-12-10',
      abogado: 'Dr. Carlos Andrés Martínez',
      contenido: 'Existe conflicto de intereses según Ley 1474/2011 Art. 84. El funcionario debe declararse impedido y solicitar reasignación de la tarea a otro servidor.',
    },
    escalacion: null,
    mensajes: [
      {
        fecha: '2024-12-10',
        hora: '08:15',
        autor: 'Claudia Hernández',
        rol: 'solicitante',
        mensaje: 'Urgente: posible conflicto de intereses en evaluación contractual.',
      },
      {
        fecha: '2024-12-10',
        hora: '09:30',
        autor: 'Dr. Carlos Andrés Martínez',
        rol: 'abogado',
        mensaje: 'Claudia, hay conflicto de intereses claro. El funcionario debe declararse impedido.',
      },
      {
        fecha: '2024-12-10',
        hora: '10:00',
        autor: 'Claudia Hernández',
        rol: 'solicitante',
        mensaje: 'Perfecto, procederemos con la declaratoria de impedimento.',
      },
    ],
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloBuzonOficinaJuridica() {
  const [consultas, setConsultas] = useState<ConsultaJuridica[]>(CONSULTAS_MOCK);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState<ConsultaJuridica | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoConsulta | 'todas'>('todas');
  const [filtroTipo, setFiltroTipo] = useState<TipoConsulta | 'todos'>('todos');
  const [filtroTema, setFiltroTema] = useState<TemaConsulta | 'todos'>('todos');

  // Filtrar consultas
  const consultasFiltradas = consultas.filter(c => {
    const cumpleBusqueda = busqueda === '' || 
      c.numeroConsulta.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.solicitante.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.consulta.asunto.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleEstado = filtroEstado === 'todas' || c.estado === filtroEstado;
    const cumpleTipo = filtroTipo === 'todos' || c.consulta.tipo === filtroTipo;
    const cumpleTema = filtroTema === 'todos' || c.consulta.tema === filtroTema;
    
    return cumpleBusqueda && cumpleEstado && cumpleTipo && cumpleTema;
  });

  // Métricas
  const totalConsultas = consultas.length;
  const consultasNuevas = consultas.filter(c => c.estado === 'nueva').length;
  const consultasUrgentes = consultas.filter(c => 
    c.consulta.prioridad === 'alta' && c.estado !== 'respondida' && c.estado !== 'archivo'
  ).length;
  const consultasEscaladas = consultas.filter(c => c.estado === 'escalada').length;
  const tiempoPromedioRespuesta = 18; // horas (mock)

  // Distribución por estado
  const porEstado = {
    nueva: consultas.filter(c => c.estado === 'nueva').length,
    en_revision: consultas.filter(c => c.estado === 'en_revision').length,
    respondida: consultas.filter(c => c.estado === 'respondida').length,
    escalada: consultas.filter(c => c.estado === 'escalada').length,
    archivo: consultas.filter(c => c.estado === 'archivo').length,
  };

  const getEstadoColor = (estado: EstadoConsulta) => {
    switch (estado) {
      case 'nueva': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Nueva' };
      case 'en_revision': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Revisión' };
      case 'respondida': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Respondida' };
      case 'escalada': return { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Escalada' };
      case 'archivo': return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Archivo' };
    }
  };

  const getTipoColor = (tipo: TipoConsulta) => {
    switch (tipo) {
      case 'rapida': return { bg: 'bg-green-100', text: 'text-green-700', icon: '⚡', label: 'Rápida' };
      case 'simple': return { bg: 'bg-blue-100', text: 'text-blue-700', icon: '📋', label: 'Simple' };
      case 'formal': return { bg: 'bg-purple-100', text: 'text-purple-700', icon: '📄', label: 'Formal' };
    }
  };

  const getTemaLabel = (tema: TemaConsulta) => {
    switch (tema) {
      case 'contratacion': return 'Contratación';
      case 'laboral': return 'Laboral';
      case 'disciplinario': return 'Disciplinario';
      case 'presupuestal': return 'Presupuestal';
      case 'academico': return 'Académico';
      case 'administrativo': return 'Administrativo';
      case 'otros': return 'Otros';
    }
  };

  const getPrioridadColor = (prioridad: PrioridadConsulta) => {
    switch (prioridad) {
      case 'alta': return { bg: 'bg-red-100', text: 'text-red-700', icon: '🔴' };
      case 'media': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: '🟡' };
      case 'baja': return { bg: 'bg-green-100', text: 'text-green-700', icon: '🟢' };
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            MOD-07: Buzón de Oficina Jurídica
          </h1>
          <p className="text-gray-600 mt-1">
            Sistema de comunicaciones y escalación a asesorías formales
          </p>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <MessageCircle className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-black text-blue-600">{totalConsultas}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Total Consultas</p>
          <p className="text-xs text-gray-500 mt-1">Último mes</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Bell className="w-8 h-8 text-red-600" />
            <span className="text-3xl font-black text-red-600">{consultasNuevas}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Sin Asignar</p>
          <p className="text-xs text-gray-500 mt-1">Requieren atención</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
            <span className="text-3xl font-black text-orange-600">{consultasUrgentes}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Urgentes</p>
          <p className="text-xs text-gray-500 mt-1">Prioridad alta</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-purple-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <ArrowUpRight className="w-8 h-8 text-purple-600" />
            <span className="text-3xl font-black text-purple-600">{consultasEscaladas}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Escaladas</p>
          <p className="text-xs text-gray-500 mt-1">A MOD-03</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-green-600" />
            <span className="text-2xl font-black text-green-600">{tiempoPromedioRespuesta}h</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Tiempo Promedio</p>
          <p className="text-xs text-gray-500 mt-1">De respuesta</p>
        </div>
      </div>

      {/* DISTRIBUCIÓN POR ESTADO */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">📊 Distribución por Estado</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
              <Bell className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600">{porEstado.nueva}</div>
            <div className="text-xs text-gray-600">Nueva</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-2">
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-yellow-600">{porEstado.en_revision}</div>
            <div className="text-xs text-gray-600">En Revisión</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-green-600">{porEstado.respondida}</div>
            <div className="text-xs text-gray-600">Respondida</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-2">
              <ArrowUpRight className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600">{porEstado.escalada}</div>
            <div className="text-xs text-gray-600">Escalada</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
              <Archive className="w-8 h-8 text-gray-600" />
            </div>
            <div className="text-2xl font-bold text-gray-600">{porEstado.archivo}</div>
            <div className="text-xs text-gray-600">Archivo</div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Número, solicitante..."
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
              <option value="todas">Todos</option>
              <option value="nueva">Nueva</option>
              <option value="en_revision">En Revisión</option>
              <option value="respondida">Respondida</option>
              <option value="escalada">Escalada</option>
              <option value="archivo">Archivo</option>
            </select>
          </div>

          {/* Filtro por Tipo */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tipo
            </label>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="rapida">⚡ Rápida</option>
              <option value="simple">📋 Simple</option>
              <option value="formal">📄 Formal</option>
            </select>
          </div>

          {/* Filtro por Tema */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tema
            </label>
            <select
              value={filtroTema}
              onChange={(e) => setFiltroTema(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="contratacion">Contratación</option>
              <option value="laboral">Laboral</option>
              <option value="disciplinario">Disciplinario</option>
              <option value="presupuestal">Presupuestal</option>
              <option value="academico">Académico</option>
              <option value="administrativo">Administrativo</option>
              <option value="otros">Otros</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm">
            + Nueva Consulta
          </button>
          <button className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={() => {
              setBusqueda('');
              setFiltroEstado('todas');
              setFiltroTipo('todos');
              setFiltroTema('todos');
            }}
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
          >
            Limpiar filtros
          </button>
          <div className="ml-auto text-sm text-gray-600">
            Mostrando <strong>{consultasFiltradas.length}</strong> de <strong>{totalConsultas}</strong> consultas
          </div>
        </div>
      </div>

      {/* TABLA DE CONSULTAS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Número
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Solicitante
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Asunto
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Prioridad
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Asignado
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {consultasFiltradas.map((consulta) => {
                const estadoColor = getEstadoColor(consulta.estado);
                const tipoColor = getTipoColor(consulta.consulta.tipo);
                const prioridadColor = getPrioridadColor(consulta.consulta.prioridad);
                
                return (
                  <tr key={consulta.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{consulta.numeroConsulta}</div>
                      <div className="text-xs text-gray-500">
                        {consulta.fechaRecepcion} {consulta.horaRecepcion}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{consulta.solicitante.nombre}</div>
                      <div className="text-xs text-gray-500">{consulta.solicitante.dependencia}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {consulta.consulta.asunto}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getTemaLabel(consulta.consulta.tema)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 ${tipoColor.bg} ${tipoColor.text} text-xs font-bold rounded`}>
                        {tipoColor.icon} {tipoColor.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 ${prioridadColor.bg} ${prioridadColor.text} text-xs font-bold rounded`}>
                        {prioridadColor.icon}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 ${estadoColor.bg} ${estadoColor.text} text-xs font-bold rounded-full`}>
                        {estadoColor.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {consulta.asignacion ? (
                        <div className="text-sm text-gray-900">{consulta.asignacion.abogado}</div>
                      ) : (
                        <span className="text-xs text-gray-400">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setConsultaSeleccionada(consulta);
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

        {consultasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No se encontraron consultas</p>
            <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {mostrarModal && consultaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{consultaSeleccionada.numeroConsulta}</h2>
                  <p className="text-blue-100 text-sm mt-1">
                    {consultaSeleccionada.consulta.asunto}
                  </p>
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
              {/* Información del Solicitante */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Información del Solicitante
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Nombre</p>
                    <p className="font-semibold text-gray-900">{consultaSeleccionada.solicitante.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Cargo</p>
                    <p className="font-semibold text-gray-900">{consultaSeleccionada.solicitante.cargo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Dependencia</p>
                    <p className="font-semibold text-gray-900">{consultaSeleccionada.solicitante.dependencia}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="font-semibold text-gray-900">{consultaSeleccionada.solicitante.email}</p>
                  </div>
                </div>
              </div>

              {/* Detalle de la Consulta */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Detalle de la Consulta
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-4">{consultaSeleccionada.consulta.descripcion}</p>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tema</p>
                      <p className="font-semibold text-gray-900">
                        {getTemaLabel(consultaSeleccionada.consulta.tema)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Tipo</p>
                      <p className="font-semibold text-gray-900">
                        {getTipoColor(consultaSeleccionada.consulta.tipo).label}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Prioridad</p>
                      <p className="font-semibold text-gray-900">
                        {consultaSeleccionada.consulta.prioridad.toUpperCase()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Archivos</p>
                      <p className="font-semibold text-gray-900">
                        {consultaSeleccionada.consulta.archivosAdjuntos}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Respuesta (si existe) */}
              {consultaSeleccionada.respuesta && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Respuesta Oficial
                  </h3>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">
                        {consultaSeleccionada.respuesta.abogado}
                      </span>
                      <span className="text-xs text-gray-500">{consultaSeleccionada.respuesta.fecha}</span>
                    </div>
                    <p className="text-sm text-gray-900">{consultaSeleccionada.respuesta.contenido}</p>
                  </div>
                </div>
              )}

              {/* Escalación (si existe) */}
              {consultaSeleccionada.escalacion && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <ArrowUpRight className="w-5 h-5 text-purple-600" />
                    Escalación a Asesoría Formal
                  </h3>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Número Asesoría</p>
                        <p className="font-bold text-purple-700">{consultaSeleccionada.escalacion.numeroAsesoria}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Módulo</p>
                        <p className="font-semibold text-gray-900">{consultaSeleccionada.escalacion.modulo}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Fecha</p>
                        <p className="font-semibold text-gray-900">{consultaSeleccionada.escalacion.fecha}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Motivo de Escalación</p>
                      <p className="text-sm text-gray-900">{consultaSeleccionada.escalacion.motivo}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat/Mensajes */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-blue-600" />
                  Historial de Conversación
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 max-h-96 overflow-y-auto">
                  {consultaSeleccionada.mensajes.map((mensaje, idx) => (
                    <div
                      key={idx}
                      className={`flex ${mensaje.rol === 'solicitante' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-md rounded-lg p-3 ${
                          mensaje.rol === 'solicitante'
                            ? 'bg-white border border-gray-200'
                            : mensaje.rol === 'abogado'
                            ? 'bg-blue-100 border border-blue-200'
                            : 'bg-purple-100 border border-purple-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-gray-700">{mensaje.autor}</span>
                          <span className="text-xs text-gray-500">
                            {mensaje.fecha} {mensaje.hora}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900">{mensaje.mensaje}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Información de Tiempos */}
              {consultaSeleccionada.tiempos.tiempoRespuesta > 0 && (
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Tiempo Respuesta</p>
                    <p className="font-bold text-gray-900">{consultaSeleccionada.tiempos.tiempoRespuesta}h</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Fecha Límite</p>
                    <p className="font-semibold text-gray-900">{consultaSeleccionada.tiempos.fechaLimite}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500 mb-1">Horas Restantes</p>
                    <p className={`font-bold text-lg ${
                      consultaSeleccionada.tiempos.horasRestantes <= 5 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {consultaSeleccionada.tiempos.horasRestantes}h
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl flex gap-3">
              {consultaSeleccionada.estado === 'nueva' && (
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                  Asignar Abogado
                </button>
              )}
              {(consultaSeleccionada.estado === 'nueva' || consultaSeleccionada.estado === 'en_revision') && (
                <>
                  <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Responder
                  </button>
                  <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold flex items-center justify-center gap-2">
                    <ArrowUpRight className="w-4 h-4" />
                    Escalar a MOD-03
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
