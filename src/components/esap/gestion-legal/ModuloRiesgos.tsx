/**
 * ============================================
 * MOD-09: RIESGOS
 * ============================================
 * 
 * Matriz de riesgos jurídicos y legales institucionales
 * Identificación, evaluación, tratamiento y seguimiento de riesgos
 * 
 * FUNCIONALIDADES:
 * - Identificación de riesgos jurídicos
 * - Matriz de probabilidad e impacto
 * - Clasificación por nivel de riesgo
 * - Controles preventivos y correctivos
 * - Plan de tratamiento de riesgos
 * - Seguimiento y monitoreo
 * - Alertas y notificaciones
 * - Dashboard de gestión
 * 
 * CATEGORÍAS DE RIESGO:
 * - Contractual
 * - Judicial
 * - Disciplinario
 * - Normativo
 * - Responsabilidad fiscal
 * - Datos personales
 * - Administrativo
 * 
 * NIVELES DE RIESGO:
 * - Crítico (Probabilidad Alta + Impacto Alto)
 * - Alto (Probabilidad Alta + Impacto Medio o viceversa)
 * - Medio (Probabilidad Media + Impacto Medio)
 * - Bajo (Probabilidad Baja o Impacto Bajo)
 * 
 * ESTADOS:
 * - Identificado
 * - En análisis
 * - En tratamiento
 * - Controlado
 * - Materializado
 * 
 * Versión: 1.0.0
 * Prioridad: MEDIA
 */

import { useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  Download,
  Shield,
  TrendingUp,
  CheckCircle,
  XCircle,
  Eye,
  X,
  FileText,
  Calendar,
  Target,
  AlertCircle,
  Activity,
  Zap,
  Lock,
  Users,
  BarChart3,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

type NivelProbabilidad = 'muy_baja' | 'baja' | 'media' | 'alta' | 'muy_alta';
type NivelImpacto = 'muy_bajo' | 'bajo' | 'medio' | 'alto' | 'muy_alto';
type NivelRiesgo = 'bajo' | 'medio' | 'alto' | 'critico';

type CategoriaRiesgo = 
  | 'contractual'
  | 'judicial'
  | 'disciplinario'
  | 'normativo'
  | 'fiscal'
  | 'datos_personales'
  | 'administrativo';

type EstadoRiesgo = 
  | 'identificado'
  | 'en_analisis'
  | 'en_tratamiento'
  | 'controlado'
  | 'materializado';

type TipoControl = 'preventivo' | 'detectivo' | 'correctivo';

interface Riesgo {
  id: string;
  codigo: string;
  fechaIdentificacion: string;
  categoria: CategoriaRiesgo;
  descripcion: {
    nombre: string;
    descripcion: string;
    causas: string[];
    consecuencias: string[];
  };
  evaluacion: {
    probabilidad: NivelProbabilidad;
    impacto: NivelImpacto;
    nivelRiesgo: NivelRiesgo;
    valoracion: number; // 1-25
  };
  responsable: {
    nombre: string;
    cargo: string;
    dependencia: string;
  };
  controles: {
    tipo: TipoControl;
    descripcion: string;
    responsable: string;
    frecuencia: string;
    efectividad: number; // 0-100%
  }[];
  tratamiento: {
    estrategia: 'evitar' | 'reducir' | 'transferir' | 'aceptar';
    acciones: string[];
    responsable: string;
    fechaImplementacion: string;
    presupuesto?: number;
  };
  estado: EstadoRiesgo;
  seguimiento: {
    fecha: string;
    observaciones: string;
    responsable: string;
    nivelRiesgo: NivelRiesgo;
  }[];
  indicadores: {
    nombre: string;
    valor: string;
    meta: string;
    cumplimiento: number;
  }[];
}

// ============================================
// DATOS MOCK
// ============================================

const RIESGOS_MOCK: Riesgo[] = [
  {
    id: '1',
    codigo: 'RJ-2024-001',
    fechaIdentificacion: '2024-01-15',
    categoria: 'contractual',
    descripcion: {
      nombre: 'Incumplimiento de plazos en procesos de contratación',
      descripcion: 'Riesgo de incurrir en contratación directa por urgencia manifiesta debido a planificación deficiente.',
      causas: [
        'Falta de planeación contractual',
        'Estudios previos tardíos',
        'Demoras en aprobaciones internas',
      ],
      consecuencias: [
        'Sanciones de órganos de control',
        'Pérdida de vigencias presupuestales',
        'Afectación de imagen institucional',
        'Posibles demandas contractuales',
      ],
    },
    evaluacion: {
      probabilidad: 'alta',
      impacto: 'alto',
      nivelRiesgo: 'critico',
      valoracion: 20, // 4x5
    },
    responsable: {
      nombre: 'Carlos Méndez',
      cargo: 'Jefe de Contratación',
      dependencia: 'Dirección Administrativa',
    },
    controles: [
      {
        tipo: 'preventivo',
        descripcion: 'Plan Anual de Adquisiciones actualizado mensualmente',
        responsable: 'Jefe de Contratación',
        frecuencia: 'Mensual',
        efectividad: 70,
      },
      {
        tipo: 'detectivo',
        descripcion: 'Revisión semanal de cronogramas contractuales',
        responsable: 'Coordinador Contractual',
        frecuencia: 'Semanal',
        efectividad: 60,
      },
    ],
    tratamiento: {
      estrategia: 'reducir',
      acciones: [
        'Implementar software de seguimiento contractual',
        'Capacitar personal en planeación contractual',
        'Establecer alertas automáticas de vencimientos',
      ],
      responsable: 'Director Administrativo',
      fechaImplementacion: '2024-02-01',
      presupuesto: 15000000,
    },
    estado: 'en_tratamiento',
    seguimiento: [
      {
        fecha: '2024-12-10',
        observaciones: 'Implementado software de seguimiento. Reducción del 30% en urgencias manifiestas.',
        responsable: 'Carlos Méndez',
        nivelRiesgo: 'alto',
      },
      {
        fecha: '2024-06-15',
        observaciones: 'Personal capacitado. Mejora en planificación visible.',
        responsable: 'Carlos Méndez',
        nivelRiesgo: 'critico',
      },
    ],
    indicadores: [
      {
        nombre: 'Porcentaje de contrataciones por urgencia',
        valor: '8%',
        meta: '< 5%',
        cumplimiento: 62,
      },
      {
        nombre: 'Cumplimiento de PAA',
        valor: '85%',
        meta: '> 90%',
        cumplimiento: 94,
      },
    ],
  },
  {
    id: '2',
    codigo: 'RJ-2024-002',
    fechaIdentificacion: '2024-02-20',
    categoria: 'judicial',
    descripcion: {
      nombre: 'Pérdida de procesos judiciales por prescripción de términos',
      descripcion: 'Riesgo de perder procesos judiciales por no interponer recursos o contestar demandas dentro de términos legales.',
      causas: [
        'Ausencia de sistema de alertas jurídicas',
        'Alta rotación de abogados',
        'Deficiente registro de términos procesales',
      ],
      consecuencias: [
        'Condenas en contra de la entidad',
        'Pérdida de recursos públicos',
        'Afectación patrimonial',
        'Sanciones disciplinarias a funcionarios',
      ],
    },
    evaluacion: {
      probabilidad: 'media',
      impacto: 'muy_alto',
      nivelRiesgo: 'alto',
      valoracion: 15, // 3x5
    },
    responsable: {
      nombre: 'Luis Fernando Vargas',
      cargo: 'Jefe Oficina Jurídica',
      dependencia: 'Oficina Asesora Jurídica',
    },
    controles: [
      {
        tipo: 'preventivo',
        descripcion: 'Sistema de alertas de términos judiciales (MOD-06)',
        responsable: 'Secretaria Jurídica',
        frecuencia: 'Diaria',
        efectividad: 85,
      },
      {
        tipo: 'detectivo',
        descripcion: 'Auditoría mensual de expedientes',
        responsable: 'Abogado Senior',
        frecuencia: 'Mensual',
        efectividad: 75,
      },
    ],
    tratamiento: {
      estrategia: 'reducir',
      acciones: [
        'Implementación de MOD-06 (Buzón de Notificaciones)',
        'Contratación de software jurídico especializado',
        'Protocolos de empalme entre abogados',
      ],
      responsable: 'Asesor Jurídico',
      fechaImplementacion: '2024-03-01',
      presupuesto: 25000000,
    },
    estado: 'controlado',
    seguimiento: [
      {
        fecha: '2024-11-20',
        observaciones: 'Riesgo controlado. Sistema de alertas funcionando. Cero términos perdidos en 6 meses.',
        responsable: 'Luis Fernando Vargas',
        nivelRiesgo: 'medio',
      },
      {
        fecha: '2024-08-10',
        observaciones: 'Mejora significativa. Solo 1 término perdido en el trimestre.',
        responsable: 'Luis Fernando Vargas',
        nivelRiesgo: 'alto',
      },
    ],
    indicadores: [
      {
        nombre: 'Términos judiciales cumplidos',
        valor: '98%',
        meta: '> 95%',
        cumplimiento: 100,
      },
      {
        nombre: 'Procesos perdidos por término',
        valor: '0',
        meta: '0',
        cumplimiento: 100,
      },
    ],
  },
  {
    id: '3',
    codigo: 'RJ-2024-003',
    fechaIdentificacion: '2024-03-10',
    categoria: 'datos_personales',
    descripcion: {
      nombre: 'Vulneración de datos personales de estudiantes y funcionarios',
      descripcion: 'Riesgo de fuga o uso indebido de datos personales por falta de políticas de seguridad de la información.',
      causas: [
        'Ausencia de políticas de protección de datos',
        'Falta de capacitación en Ley 1581/2012',
        'Sistemas sin cifrado',
      ],
      consecuencias: [
        'Sanciones de Superintendencia de Industria y Comercio (hasta 2.000 SMLMV)',
        'Demandas por habeas data',
        'Afectación de imagen institucional',
        'Pérdida de confianza de usuarios',
      ],
    },
    evaluacion: {
      probabilidad: 'alta',
      impacto: 'muy_alto',
      nivelRiesgo: 'critico',
      valoracion: 20, // 4x5
    },
    responsable: {
      nombre: 'Pedro Ramírez',
      cargo: 'Coordinador TIC',
      dependencia: 'Dirección TIC',
    },
    controles: [
      {
        tipo: 'preventivo',
        descripcion: 'Políticas de seguridad de la información',
        responsable: 'Coordinador TIC',
        frecuencia: 'Permanente',
        efectividad: 80,
      },
      {
        tipo: 'preventivo',
        descripcion: 'Capacitaciones en protección de datos',
        responsable: 'Talento Humano',
        frecuencia: 'Semestral',
        efectividad: 70,
      },
      {
        tipo: 'detectivo',
        descripcion: 'Auditorías de seguridad informática',
        responsable: 'Control Interno',
        frecuencia: 'Trimestral',
        efectividad: 75,
      },
    ],
    tratamiento: {
      estrategia: 'reducir',
      acciones: [
        'Implementar cifrado de bases de datos',
        'Actualizar aviso de privacidad y política de tratamiento',
        'Capacitar 100% del personal',
        'Certificar ISO 27001',
      ],
      responsable: 'Director TIC',
      fechaImplementacion: '2024-04-01',
      presupuesto: 40000000,
    },
    estado: 'en_tratamiento',
    seguimiento: [
      {
        fecha: '2024-12-05',
        observaciones: 'Políticas implementadas. Cifrado al 70%. Capacitación al 85% del personal.',
        responsable: 'Pedro Ramírez',
        nivelRiesgo: 'alto',
      },
      {
        fecha: '2024-09-15',
        observaciones: 'Avances lentos. Requiere más presupuesto.',
        responsable: 'Pedro Ramírez',
        nivelRiesgo: 'critico',
      },
    ],
    indicadores: [
      {
        nombre: 'Sistemas con cifrado',
        valor: '70%',
        meta: '100%',
        cumplimiento: 70,
      },
      {
        nombre: 'Personal capacitado',
        valor: '85%',
        meta: '100%',
        cumplimiento: 85,
      },
    ],
  },
  {
    id: '4',
    codigo: 'RJ-2024-004',
    fechaIdentificacion: '2024-05-08',
    categoria: 'disciplinario',
    descripcion: {
      nombre: 'Nulidad de procesos disciplinarios por vicios de procedimiento',
      descripcion: 'Riesgo de anulación de procesos disciplinarios por no observar debido proceso.',
      causas: [
        'Falta de capacitación de funcionarios disciplinarios',
        'Desconocimiento de jurisprudencia',
        'Omisión de formalidades legales',
      ],
      consecuencias: [
        'Pérdida de procesos disciplinarios',
        'Reintegro de funcionarios',
        'Pagos de salarios dejados de percibir',
        'Sanciones a investigadores',
      ],
    },
    evaluacion: {
      probabilidad: 'media',
      impacto: 'alto',
      nivelRiesgo: 'alto',
      valoracion: 12, // 3x4
    },
    responsable: {
      nombre: 'Jorge Enrique Mora',
      cargo: 'Jefe Control Interno Disciplinario',
      dependencia: 'Oficina Control Interno Disciplinario',
    },
    controles: [
      {
        tipo: 'preventivo',
        descripcion: 'Capacitación continua en derecho disciplinario',
        responsable: 'Jefe CID',
        frecuencia: 'Trimestral',
        efectividad: 80,
      },
      {
        tipo: 'preventivo',
        descripcion: 'Listas de chequeo de procedimiento',
        responsable: 'Abogado Disciplinario',
        frecuencia: 'Por caso',
        efectividad: 90,
      },
    ],
    tratamiento: {
      estrategia: 'reducir',
      acciones: [
        'Implementar MOD-04 (Juzgamiento Disciplinario)',
        'Crear manual de procedimiento disciplinario',
        'Establecer revisión jurídica obligatoria',
      ],
      responsable: 'Director Jurídico',
      fechaImplementacion: '2024-06-01',
    },
    estado: 'controlado',
    seguimiento: [
      {
        fecha: '2024-11-30',
        observaciones: 'Riesgo controlado. Manual implementado. Cero nulidades en 5 meses.',
        responsable: 'Jorge Enrique Mora',
        nivelRiesgo: 'medio',
      },
    ],
    indicadores: [
      {
        nombre: 'Procesos con vicios procedimentales',
        valor: '2%',
        meta: '< 5%',
        cumplimiento: 100,
      },
      {
        nombre: 'Nulidades decretadas',
        valor: '0',
        meta: '0',
        cumplimiento: 100,
      },
    ],
  },
  {
    id: '5',
    codigo: 'RJ-2024-005',
    fechaIdentificacion: '2024-07-12',
    categoria: 'normativo',
    descripcion: {
      nombre: 'Incumplimiento de nueva normatividad aplicable',
      descripcion: 'Riesgo de incumplir nueva normatividad por falta de seguimiento regulatorio.',
      causas: [
        'No hay proceso de vigilancia normativa',
        'Falta de comunicación entre dependencias',
        'Desactualización de procedimientos',
      ],
      consecuencias: [
        'Sanciones administrativas',
        'Actos administrativos ilegales',
        'Procesos de responsabilidad fiscal',
      ],
    },
    evaluacion: {
      probabilidad: 'media',
      impacto: 'medio',
      nivelRiesgo: 'medio',
      valoracion: 9, // 3x3
    },
    responsable: {
      nombre: 'María Fernanda López',
      cargo: 'Abogada Senior',
      dependencia: 'Oficina Asesora Jurídica',
    },
    controles: [
      {
        tipo: 'preventivo',
        descripcion: 'Boletín jurídico mensual (MOD-07)',
        responsable: 'Oficina Jurídica',
        frecuencia: 'Mensual',
        efectividad: 75,
      },
      {
        tipo: 'detectivo',
        descripcion: 'Revisión trimestral de procedimientos',
        responsable: 'Control Interno',
        frecuencia: 'Trimestral',
        efectividad: 70,
      },
    ],
    tratamiento: {
      estrategia: 'reducir',
      acciones: [
        'Implementar sistema de vigilancia normativa',
        'Crear comité de actualización normativa',
        'Suscripción a servicios de alertas legales',
      ],
      responsable: 'Asesor Jurídico',
      fechaImplementacion: '2024-08-01',
      presupuesto: 8000000,
    },
    estado: 'en_tratamiento',
    seguimiento: [
      {
        fecha: '2024-12-01',
        observaciones: 'Sistema de vigilancia en implementación. Boletín funcionando.',
        responsable: 'María Fernanda López',
        nivelRiesgo: 'medio',
      },
    ],
    indicadores: [
      {
        nombre: 'Normatividad actualizada',
        valor: '80%',
        meta: '> 90%',
        cumplimiento: 89,
      },
    ],
  },
  {
    id: '6',
    codigo: 'RJ-2023-018',
    fechaIdentificacion: '2023-11-05',
    categoria: 'fiscal',
    descripcion: {
      nombre: 'Detrimento patrimonial por pago de intereses moratorios',
      descripcion: 'Riesgo de generar detrimento por pago de intereses moratorios en contratación.',
      causas: [
        'Retrasos en pagos a contratistas',
        'Deficiencias en supervisión contractual',
      ],
      consecuencias: [
        'Procesos de responsabilidad fiscal',
        'Pérdida de recursos públicos',
      ],
    },
    evaluacion: {
      probabilidad: 'baja',
      impacto: 'medio',
      nivelRiesgo: 'bajo',
      valoracion: 6, // 2x3
    },
    responsable: {
      nombre: 'Sandra Ortiz',
      cargo: 'Coordinadora Financiera',
      dependencia: 'Dirección Financiera',
    },
    controles: [
      {
        tipo: 'preventivo',
        descripcion: 'Cronograma de pagos automatizado',
        responsable: 'Tesorería',
        frecuencia: 'Diaria',
        efectividad: 95,
      },
    ],
    tratamiento: {
      estrategia: 'aceptar',
      acciones: [
        'Mantener controles actuales',
        'Monitoreo mensual',
      ],
      responsable: 'Director Financiero',
      fechaImplementacion: '2023-12-01',
    },
    estado: 'controlado',
    seguimiento: [
      {
        fecha: '2024-11-15',
        observaciones: 'Riesgo bajo control. Cero pagos de intereses moratorios en el año.',
        responsable: 'Sandra Ortiz',
        nivelRiesgo: 'bajo',
      },
    ],
    indicadores: [
      {
        nombre: 'Pagos a tiempo',
        valor: '98%',
        meta: '> 95%',
        cumplimiento: 100,
      },
    ],
  },
  {
    id: '7',
    codigo: 'RJ-2024-006',
    fechaIdentificacion: '2024-09-18',
    categoria: 'contractual',
    descripcion: {
      nombre: 'Demandas contractuales por incumplimiento de la entidad',
      descripcion: 'Riesgo de demandas por incumplimiento de obligaciones contractuales de ESAP.',
      causas: [
        'Falta de presupuesto',
        'Deficiente supervisión',
        'Cambios de alcance no formalizados',
      ],
      consecuencias: [
        'Condenas económicas',
        'Afectación presupuestal',
        'Daño reputacional',
      ],
    },
    evaluacion: {
      probabilidad: 'muy_alta',
      impacto: 'alto',
      nivelRiesgo: 'critico',
      valoracion: 20, // 5x4
    },
    responsable: {
      nombre: 'Roberto García',
      cargo: 'Director Administrativo',
      dependencia: 'Dirección Administrativa',
    },
    controles: [
      {
        tipo: 'preventivo',
        descripcion: 'Supervisión contractual estricta',
        responsable: 'Supervisores',
        frecuencia: 'Permanente',
        efectividad: 70,
      },
    ],
    tratamiento: {
      estrategia: 'reducir',
      acciones: [
        'Fortalecer equipo de supervisión',
        'Implementar sistema de seguimiento contractual',
        'Establecer comité de contratación',
      ],
      responsable: 'Director General',
      fechaImplementacion: '2024-10-01',
      presupuesto: 20000000,
    },
    estado: 'identificado',
    seguimiento: [],
    indicadores: [
      {
        nombre: 'Demandas contractuales',
        valor: '3',
        meta: '< 2',
        cumplimiento: 0,
      },
    ],
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ModuloRiesgos() {
  const [riesgos, setRiesgos] = useState<Riesgo[]>(RIESGOS_MOCK);
  const [riesgoSeleccionado, setRiesgoSeleccionado] = useState<Riesgo | null>(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Filtros
  const [busqueda, setBusqueda] = useState('');
  const [filtroNivel, setFiltroNivel] = useState<NivelRiesgo | 'todos'>('todos');
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaRiesgo | 'todas'>('todas');
  const [filtroEstado, setFiltroEstado] = useState<EstadoRiesgo | 'todos'>('todos');

  // Filtrar riesgos
  const riesgosFiltrados = riesgos.filter(r => {
    const cumpleBusqueda = busqueda === '' || 
      r.codigo.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.descripcion.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      r.responsable.nombre.toLowerCase().includes(busqueda.toLowerCase());
    
    const cumpleNivel = filtroNivel === 'todos' || r.evaluacion.nivelRiesgo === filtroNivel;
    const cumpleCategoria = filtroCategoria === 'todas' || r.categoria === filtroCategoria;
    const cumpleEstado = filtroEstado === 'todos' || r.estado === filtroEstado;
    
    return cumpleBusqueda && cumpleNivel && cumpleCategoria && cumpleEstado;
  });

  // Métricas
  const totalRiesgos = riesgos.length;
  const riesgosCriticos = riesgos.filter(r => r.evaluacion.nivelRiesgo === 'critico').length;
  const riesgosAltos = riesgos.filter(r => r.evaluacion.nivelRiesgo === 'alto').length;
  const riesgosControlados = riesgos.filter(r => r.estado === 'controlado').length;
  const efectividadControles = Math.round(
    riesgos.reduce((sum, r) => 
      sum + r.controles.reduce((s, c) => s + c.efectividad, 0) / r.controles.length
    , 0) / totalRiesgos
  );

  // Distribución por nivel
  const porNivel = {
    critico: riesgos.filter(r => r.evaluacion.nivelRiesgo === 'critico').length,
    alto: riesgos.filter(r => r.evaluacion.nivelRiesgo === 'alto').length,
    medio: riesgos.filter(r => r.evaluacion.nivelRiesgo === 'medio').length,
    bajo: riesgos.filter(r => r.evaluacion.nivelRiesgo === 'bajo').length,
  };

  const getNivelColor = (nivel: NivelRiesgo) => {
    switch (nivel) {
      case 'critico': return { bg: 'bg-red-600', text: 'text-white', label: 'CRÍTICO', border: 'border-red-600' };
      case 'alto': return { bg: 'bg-orange-500', text: 'text-white', label: 'ALTO', border: 'border-orange-500' };
      case 'medio': return { bg: 'bg-yellow-500', text: 'text-white', label: 'MEDIO', border: 'border-yellow-500' };
      case 'bajo': return { bg: 'bg-green-500', text: 'text-white', label: 'BAJO', border: 'border-green-500' };
    }
  };

  const getCategoriaLabel = (categoria: CategoriaRiesgo) => {
    switch (categoria) {
      case 'contractual': return 'Contractual';
      case 'judicial': return 'Judicial';
      case 'disciplinario': return 'Disciplinario';
      case 'normativo': return 'Normativo';
      case 'fiscal': return 'Responsabilidad Fiscal';
      case 'datos_personales': return 'Datos Personales';
      case 'administrativo': return 'Administrativo';
    }
  };

  const getEstadoColor = (estado: EstadoRiesgo) => {
    switch (estado) {
      case 'identificado': return { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Identificado' };
      case 'en_analisis': return { bg: 'bg-blue-100', text: 'text-blue-700', label: 'En Análisis' };
      case 'en_tratamiento': return { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En Tratamiento' };
      case 'controlado': return { bg: 'bg-green-100', text: 'text-green-700', label: 'Controlado' };
      case 'materializado': return { bg: 'bg-red-100', text: 'text-red-700', label: 'Materializado' };
    }
  };

  const getProbabilidadLabel = (prob: NivelProbabilidad) => {
    switch (prob) {
      case 'muy_baja': return 'Muy Baja';
      case 'baja': return 'Baja';
      case 'media': return 'Media';
      case 'alta': return 'Alta';
      case 'muy_alta': return 'Muy Alta';
    }
  };

  const getImpactoLabel = (imp: NivelImpacto) => {
    switch (imp) {
      case 'muy_bajo': return 'Muy Bajo';
      case 'bajo': return 'Bajo';
      case 'medio': return 'Medio';
      case 'alto': return 'Alto';
      case 'muy_alto': return 'Muy Alto';
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">
            MOD-09: Riesgos
          </h1>
          <p className="text-gray-600 mt-1">
            Matriz de riesgos jurídicos y legales institucionales
          </p>
        </div>
      </div>

      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <span className="text-3xl font-black text-red-600">{totalRiesgos}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Total Riesgos</p>
          <p className="text-xs text-gray-500 mt-1">En la matriz</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-red-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <span className="text-3xl font-black text-red-600">{riesgosCriticos}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Críticos</p>
          <p className="text-xs text-gray-500 mt-1">Atención inmediata</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-orange-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Zap className="w-8 h-8 text-orange-600" />
            <span className="text-3xl font-black text-orange-600">{riesgosAltos}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Altos</p>
          <p className="text-xs text-gray-500 mt-1">Requieren acción</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-green-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-black text-green-600">{riesgosControlados}</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Controlados</p>
          <p className="text-xs text-gray-500 mt-1">Bajo control</p>
        </div>

        <div className="bg-white rounded-xl p-6 border-2 border-blue-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            <span className="text-3xl font-black text-blue-600">{efectividadControles}%</span>
          </div>
          <p className="text-sm font-semibold text-gray-700">Efectividad</p>
          <p className="text-xs text-gray-500 mt-1">De controles</p>
        </div>
      </div>

      {/* DISTRIBUCIÓN POR NIVEL */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">🎯 Distribución por Nivel de Riesgo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-black text-white">{porNivel.critico}</span>
            </div>
            <div className="text-xs font-bold text-red-600">CRÍTICO</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-black text-white">{porNivel.alto}</span>
            </div>
            <div className="text-xs font-bold text-orange-600">ALTO</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-black text-white">{porNivel.medio}</span>
            </div>
            <div className="text-xs font-bold text-yellow-600">MEDIO</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl font-black text-white">{porNivel.bajo}</span>
            </div>
            <div className="text-xs font-bold text-green-600">BAJO</div>
          </div>
        </div>
      </div>

      {/* FILTROS Y BÚSQUEDA */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔍 Buscar Riesgo
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Código, nombre..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filtro por Nivel */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nivel de Riesgo
            </label>
            <select
              value={filtroNivel}
              onChange={(e) => setFiltroNivel(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="critico">Crítico</option>
              <option value="alto">Alto</option>
              <option value="medio">Medio</option>
              <option value="bajo">Bajo</option>
            </select>
          </div>

          {/* Filtro por Categoría */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="todas">Todas</option>
              <option value="contractual">Contractual</option>
              <option value="judicial">Judicial</option>
              <option value="disciplinario">Disciplinario</option>
              <option value="normativo">Normativo</option>
              <option value="fiscal">Responsabilidad Fiscal</option>
              <option value="datos_personales">Datos Personales</option>
              <option value="administrativo">Administrativo</option>
            </select>
          </div>

          {/* Filtro por Estado */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Estado
            </label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="identificado">Identificado</option>
              <option value="en_analisis">En Análisis</option>
              <option value="en_tratamiento">En Tratamiento</option>
              <option value="controlado">Controlado</option>
              <option value="materializado">Materializado</option>
            </select>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex items-center gap-3 mt-4">
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm">
            + Nuevo Riesgo
          </button>
          <button className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm flex items-center gap-2">
            <Download className="w-4 h-4" />
            Matriz de Riesgos
          </button>
          <button
            onClick={() => {
              setBusqueda('');
              setFiltroNivel('todos');
              setFiltroCategoria('todas');
              setFiltroEstado('todos');
            }}
            className="px-4 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold text-sm"
          >
            Limpiar filtros
          </button>
          <div className="ml-auto text-sm text-gray-600">
            Mostrando <strong>{riesgosFiltrados.length}</strong> de <strong>{totalRiesgos}</strong> riesgos
          </div>
        </div>
      </div>

      {/* TABLA DE RIESGOS */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Riesgo / Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Responsable
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nivel
                </th>
                <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Valoración
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
              {riesgosFiltrados.map((riesgo) => {
                const nivelColor = getNivelColor(riesgo.evaluacion.nivelRiesgo);
                const estadoColor = getEstadoColor(riesgo.estado);
                
                return (
                  <tr key={riesgo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{riesgo.codigo}</div>
                      <div className="text-xs text-gray-500">{riesgo.fechaIdentificacion}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 max-w-xs truncate">
                        {riesgo.descripcion.nombre}
                      </div>
                      <div className="text-xs text-gray-500">
                        {getCategoriaLabel(riesgo.categoria)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{riesgo.responsable.nombre}</div>
                      <div className="text-xs text-gray-500">{riesgo.responsable.dependencia}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 ${nivelColor.bg} ${nivelColor.text} text-xs font-black rounded-full`}>
                        {nivelColor.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-lg font-black text-gray-900">{riesgo.evaluacion.valoracion}</div>
                      <div className="text-xs text-gray-500">
                        P:{riesgo.evaluacion.probabilidad === 'muy_alta' ? 5 : riesgo.evaluacion.probabilidad === 'alta' ? 4 : riesgo.evaluacion.probabilidad === 'media' ? 3 : riesgo.evaluacion.probabilidad === 'baja' ? 2 : 1} × 
                        I:{riesgo.evaluacion.impacto === 'muy_alto' ? 5 : riesgo.evaluacion.impacto === 'alto' ? 4 : riesgo.evaluacion.impacto === 'medio' ? 3 : riesgo.evaluacion.impacto === 'bajo' ? 2 : 1}
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
                          setRiesgoSeleccionado(riesgo);
                          setMostrarModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 font-semibold text-sm flex items-center gap-1"
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

        {riesgosFiltrados.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-semibold">No se encontraron riesgos</p>
            <p className="text-sm text-gray-400 mt-1">Intenta ajustar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* MODAL DE DETALLE */}
      {mostrarModal && riesgoSeleccionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className={`sticky top-0 bg-gradient-to-r from-red-600 to-orange-600 text-white p-6 rounded-t-2xl border-b-4 ${getNivelColor(riesgoSeleccionado.evaluacion.nivelRiesgo).border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold">{riesgoSeleccionado.codigo}</h2>
                    <span className={`px-3 py-1 ${getNivelColor(riesgoSeleccionado.evaluacion.nivelRiesgo).bg} ${getNivelColor(riesgoSeleccionado.evaluacion.nivelRiesgo).text} text-xs font-black rounded-full`}>
                      {getNivelColor(riesgoSeleccionado.evaluacion.nivelRiesgo).label}
                    </span>
                  </div>
                  <p className="text-red-100 text-sm">{riesgoSeleccionado.descripcion.nombre}</p>
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
              {/* Evaluación del Riesgo */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-red-600" />
                  Evaluación del Riesgo
                </h3>
                <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Probabilidad</p>
                      <p className="text-2xl font-black text-red-700">
                        {getProbabilidadLabel(riesgoSeleccionado.evaluacion.probabilidad)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Impacto</p>
                      <p className="text-2xl font-black text-red-700">
                        {getImpactoLabel(riesgoSeleccionado.evaluacion.impacto)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Valoración</p>
                      <p className="text-4xl font-black text-red-700">{riesgoSeleccionado.evaluacion.valoracion}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3">📋 Descripción del Riesgo</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-900 mb-3">{riesgoSeleccionado.descripcion.descripcion}</p>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-2">⚠️ CAUSAS</p>
                      <ul className="space-y-1">
                        {riesgoSeleccionado.descripcion.causas.map((causa, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-red-600">•</span>
                            <span>{causa}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-700 mb-2">💥 CONSECUENCIAS</p>
                      <ul className="space-y-1">
                        {riesgoSeleccionado.descripcion.consecuencias.map((cons, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <span className="text-orange-600">•</span>
                            <span>{cons}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controles */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Controles Implementados
                </h3>
                <div className="space-y-3">
                  {riesgoSeleccionado.controles.map((control, idx) => (
                    <div key={idx} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 text-xs font-bold rounded ${
                              control.tipo === 'preventivo' ? 'bg-green-100 text-green-700' :
                              control.tipo === 'detectivo' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {control.tipo.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              Frecuencia: {control.frecuencia}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-900">{control.descripcion}</p>
                          <p className="text-xs text-gray-600 mt-1">Responsable: {control.responsable}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-2xl font-black text-blue-700">{control.efectividad}%</p>
                          <p className="text-xs text-gray-500">Efectividad</p>
                        </div>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${control.efectividad}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tratamiento */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  Plan de Tratamiento
                </h3>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Estrategia</p>
                      <p className="font-bold text-gray-900 uppercase">{riesgoSeleccionado.tratamiento.estrategia}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Responsable</p>
                      <p className="font-semibold text-gray-900">{riesgoSeleccionado.tratamiento.responsable}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Fecha Implementación</p>
                      <p className="font-semibold text-gray-900">{riesgoSeleccionado.tratamiento.fechaImplementacion}</p>
                    </div>
                  </div>
                  {riesgoSeleccionado.tratamiento.presupuesto && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-1">Presupuesto</p>
                      <p className="text-lg font-bold text-purple-700">
                        ${riesgoSeleccionado.tratamiento.presupuesto.toLocaleString('es-CO')}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold text-gray-700 mb-2">ACCIONES</p>
                    <ul className="space-y-1">
                      {riesgoSeleccionado.tratamiento.acciones.map((accion, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5" />
                          <span>{accion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Indicadores */}
              {riesgoSeleccionado.indicadores.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-600" />
                    Indicadores de Seguimiento
                  </h3>
                  <div className="space-y-3">
                    {riesgoSeleccionado.indicadores.map((ind, idx) => (
                      <div key={idx} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-900">{ind.nombre}</p>
                            <p className="text-xs text-gray-600">Meta: {ind.meta}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-black text-green-700">{ind.valor}</p>
                            <p className="text-xs text-gray-600">{ind.cumplimiento}% cumplimiento</p>
                          </div>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              ind.cumplimiento >= 90 ? 'bg-green-600' :
                              ind.cumplimiento >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${ind.cumplimiento}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seguimiento */}
              {riesgoSeleccionado.seguimiento.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    Historial de Seguimiento
                  </h3>
                  <div className="space-y-3">
                    {riesgoSeleccionado.seguimiento.map((seg, idx) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex-shrink-0 w-24 text-right">
                          <span className="text-xs font-semibold text-gray-500">{seg.fecha}</span>
                        </div>
                        <div className="flex-shrink-0">
                          <div className={`w-3 h-3 rounded-full mt-1 ${getNivelColor(seg.nivelRiesgo).bg}`}></div>
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 ${getNivelColor(seg.nivelRiesgo).bg} ${getNivelColor(seg.nivelRiesgo).text} text-xs font-bold rounded`}>
                              {getNivelColor(seg.nivelRiesgo).label}
                            </span>
                            <span className="text-sm font-semibold text-gray-700">{seg.responsable}</span>
                          </div>
                          <p className="text-sm text-gray-600">{seg.observaciones}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer del Modal */}
            <div className="sticky bottom-0 bg-gray-50 p-4 rounded-b-2xl flex gap-3">
              <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold">
                Actualizar Seguimiento
              </button>
              <button className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold">
                Modificar Tratamiento
              </button>
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
