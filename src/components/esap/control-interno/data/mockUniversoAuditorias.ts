/**
 * MOCK DATA - UNIVERSO DE AUDITORÍAS
 * Datos de ejemplo de procesos auditables para importar al Programa Anual
 */

export interface ProcesoUniverso {
  id: string;
  codigo: string;
  nombre: string;
  tipoProceso: 'Misional' | 'Apoyo' | 'Estratégico' | 'Evaluación';
  tipoSede: 'Sede Principal' | 'Territorial';
  territorial?: string;
  nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRÍTICO';
  añoPriorizacion: string;
  descripcion?: string;
  responsable?: string;
  yaEnPrograma?: boolean;
}

export const MOCK_UNIVERSO_AUDITORIAS: ProcesoUniverso[] = [
  // ========== PROCESOS CRÍTICOS ==========
  {
    id: 'univ-001',
    codigo: 'UNIV-2024-001',
    nombre: 'Gestión Financiera y Presupuestal',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'CRÍTICO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Gestión de recursos financieros, ejecución presupuestal y tesorería',
    responsable: 'Dirección Administrativa y Financiera',
    yaEnPrograma: true // Ya importado
  },
  {
    id: 'univ-002',
    codigo: 'UNIV-2024-002',
    nombre: 'Gestión Contractual',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'CRÍTICO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Procesos de contratación, supervisión e interventoría',
    responsable: 'Oficina Asesora Jurídica',
    yaEnPrograma: true // Ya importado
  },
  {
    id: 'univ-003',
    codigo: 'UNIV-2024-003',
    nombre: 'Gestión de Tecnologías de la Información',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'CRÍTICO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Infraestructura tecnológica, seguridad informática y desarrollo de sistemas',
    responsable: 'Oficina de Tecnologías de la Información'
  },
  {
    id: 'univ-004',
    codigo: 'UNIV-2024-004',
    nombre: 'Gestión de Talento Humano',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'CRÍTICO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Selección, vinculación, capacitación y evaluación de personal',
    responsable: 'Dirección de Talento Humano'
  },

  // ========== PROCESOS DE ALTO RIESGO ==========
  {
    id: 'univ-005',
    codigo: 'UNIV-2024-005',
    nombre: 'Gestión Académica',
    tipoProceso: 'Misional',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Diseño curricular, programas académicos y evaluación docente',
    responsable: 'Vicerrectoría Académica'
  },
  {
    id: 'univ-006',
    codigo: 'UNIV-2024-006',
    nombre: 'Gestión de Investigación',
    tipoProceso: 'Misional',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Proyectos de investigación, publicaciones y financiación',
    responsable: 'Centro de Investigaciones'
  },
  {
    id: 'univ-007',
    codigo: 'UNIV-2024-007',
    nombre: 'Gestión de Bienestar Universitario',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 2',
    descripcion: 'Programas de bienestar, salud y deportes para la comunidad universitaria',
    responsable: 'Oficina de Bienestar'
  },
  {
    id: 'univ-008',
    codigo: 'UNIV-2024-008',
    nombre: 'Gestión de Biblioteca y Recursos Educativos',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 2',
    descripcion: 'Administración de biblioteca, recursos digitales y repositorios',
    responsable: 'Sistema de Bibliotecas'
  },

  // ========== TERRITORIALES - CRÍTICO/ALTO ==========
  {
    id: 'univ-009',
    codigo: 'UNIV-2024-009',
    nombre: 'Territorial Antioquia',
    tipoProceso: 'Misional',
    tipoSede: 'Territorial',
    territorial: 'Antioquia',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Operación académica y administrativa de la territorial de Antioquia',
    responsable: 'Director Territorial Antioquia',
    yaEnPrograma: true // Ya importado
  },
  {
    id: 'univ-010',
    codigo: 'UNIV-2024-010',
    nombre: 'Territorial Cundinamarca',
    tipoProceso: 'Misional',
    tipoSede: 'Territorial',
    territorial: 'Cundinamarca',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Operación académica y administrativa de la territorial de Cundinamarca',
    responsable: 'Director Territorial Cundinamarca'
  },
  {
    id: 'univ-011',
    codigo: 'UNIV-2024-011',
    nombre: 'Territorial Valle del Cauca',
    tipoProceso: 'Misional',
    tipoSede: 'Territorial',
    territorial: 'Valle del Cauca',
    nivelRiesgo: 'MEDIO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Operación académica y administrativa de la territorial del Valle',
    responsable: 'Director Territorial Valle'
  },
  {
    id: 'univ-012',
    codigo: 'UNIV-2024-012',
    nombre: 'Territorial Santander',
    tipoProceso: 'Misional',
    tipoSede: 'Territorial',
    territorial: 'Santander',
    nivelRiesgo: 'MEDIO',
    añoPriorizacion: 'Año 2',
    descripcion: 'Operación académica y administrativa de la territorial de Santander',
    responsable: 'Director Territorial Santander'
  },

  // ========== PROCESOS MEDIOS ==========
  {
    id: 'univ-013',
    codigo: 'UNIV-2024-013',
    nombre: 'Gestión de Comunicaciones',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'MEDIO',
    añoPriorizacion: 'Año 2',
    descripcion: 'Comunicación interna, externa y gestión de medios',
    responsable: 'Oficina de Comunicaciones'
  },
  {
    id: 'univ-014',
    codigo: 'UNIV-2024-014',
    nombre: 'Gestión Documental',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'MEDIO',
    añoPriorizacion: 'Año 2',
    descripcion: 'Archivo, gestión documental y protección de datos',
    responsable: 'Oficina de Gestión Documental'
  },
  {
    id: 'univ-015',
    codigo: 'UNIV-2024-015',
    nombre: 'Gestión de Extensión y Proyección Social',
    tipoProceso: 'Misional',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'MEDIO',
    añoPriorizacion: 'Año 2',
    descripcion: 'Programas de extensión, educación continua y proyección social',
    responsable: 'Dirección de Extensión'
  },
  {
    id: 'univ-016',
    codigo: 'UNIV-2024-016',
    nombre: 'Gestión de Admisiones y Registro',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'MEDIO',
    añoPriorizacion: 'Año 2',
    descripcion: 'Procesos de admisión, matrícula y registro académico',
    responsable: 'Oficina de Admisiones'
  },

  // ========== PROCESOS BAJOS ==========
  {
    id: 'univ-017',
    codigo: 'UNIV-2024-017',
    nombre: 'Gestión de Servicios Generales',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'BAJO',
    añoPriorizacion: 'Año 3',
    descripcion: 'Mantenimiento, aseo, vigilancia y servicios generales',
    responsable: 'Coordinación de Servicios Generales'
  },
  {
    id: 'univ-018',
    codigo: 'UNIV-2024-018',
    nombre: 'Gestión de Almacén e Inventarios',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'BAJO',
    añoPriorizacion: 'Año 3',
    descripcion: 'Control de inventarios, almacenamiento y distribución',
    responsable: 'Coordinación de Almacén'
  },
  {
    id: 'univ-019',
    codigo: 'UNIV-2024-019',
    nombre: 'Gestión de Egresados',
    tipoProceso: 'Misional',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'BAJO',
    añoPriorizacion: 'Año 3',
    descripcion: 'Seguimiento a egresados y bolsa de empleo',
    responsable: 'Oficina de Egresados'
  },
  {
    id: 'univ-020',
    codigo: 'UNIV-2024-020',
    nombre: 'Gestión de Internacionalización',
    tipoProceso: 'Estratégico',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'BAJO',
    añoPriorizacion: 'Año 3',
    descripcion: 'Convenios internacionales, movilidad y cooperación',
    responsable: 'Oficina de Relaciones Internacionales'
  },

  // ========== MÁS TERRITORIALES ==========
  {
    id: 'univ-021',
    codigo: 'UNIV-2024-021',
    nombre: 'Territorial Bolívar',
    tipoProceso: 'Misional',
    tipoSede: 'Territorial',
    territorial: 'Bolívar',
    nivelRiesgo: 'MEDIO',
    añoPriorizacion: 'Año 2',
    descripcion: 'Operación académica y administrativa de la territorial de Bolívar',
    responsable: 'Director Territorial Bolívar'
  },
  {
    id: 'univ-022',
    codigo: 'UNIV-2024-022',
    nombre: 'Territorial Nariño',
    tipoProceso: 'Misional',
    tipoSede: 'Territorial',
    territorial: 'Nariño',
    nivelRiesgo: 'BAJO',
    añoPriorizacion: 'Año 3',
    descripcion: 'Operación académica y administrativa de la territorial de Nariño',
    responsable: 'Director Territorial Nariño'
  },
  {
    id: 'univ-023',
    codigo: 'UNIV-2024-023',
    nombre: 'Territorial Tolima',
    tipoProceso: 'Misional',
    tipoSede: 'Territorial',
    territorial: 'Tolima',
    nivelRiesgo: 'BAJO',
    añoPriorizacion: 'Año 3',
    descripcion: 'Operación académica y administrativa de la territorial del Tolima',
    responsable: 'Director Territorial Tolima'
  },

  // ========== PROCESOS ESTRATÉGICOS ==========
  {
    id: 'univ-024',
    codigo: 'UNIV-2024-024',
    nombre: 'Planeación Estratégica Institucional',
    tipoProceso: 'Estratégico',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Formulación, seguimiento y evaluación del plan estratégico',
    responsable: 'Oficina Asesora de Planeación'
  },
  {
    id: 'univ-025',
    codigo: 'UNIV-2024-025',
    nombre: 'Gestión de Calidad y Acreditación',
    tipoProceso: 'Estratégico',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Sistema de gestión de calidad y procesos de acreditación',
    responsable: 'Oficina de Autoevaluación y Acreditación'
  },

  // ========== PROCESOS DE EVALUACIÓN ==========
  {
    id: 'univ-026',
    codigo: 'UNIV-2024-026',
    nombre: 'Control Interno Disciplinario',
    tipoProceso: 'Evaluación',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Investigaciones disciplinarias y procesos sancionatorios',
    responsable: 'Oficina de Control Interno Disciplinario'
  },
  {
    id: 'univ-027',
    codigo: 'UNIV-2024-027',
    nombre: 'Gestión Jurídica',
    tipoProceso: 'Apoyo',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'ALTO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Asesoría jurídica, defensa judicial y conceptos legales',
    responsable: 'Oficina Asesora Jurídica'
  },
  {
    id: 'univ-028',
    codigo: 'UNIV-2024-028',
    nombre: 'Gestión de Riesgos Institucionales',
    tipoProceso: 'Estratégico',
    tipoSede: 'Sede Principal',
    nivelRiesgo: 'CRÍTICO',
    añoPriorizacion: 'Año 1',
    descripcion: 'Identificación, valoración y tratamiento de riesgos',
    responsable: 'Oficina Asesora de Planeación'
  }
];

// Estadísticas del universo
export const getEstadisticasUniverso = () => {
  const stats = {
    total: MOCK_UNIVERSO_AUDITORIAS.length,
    porRiesgo: {
      CRÍTICO: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.nivelRiesgo === 'CRÍTICO').length,
      ALTO: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.nivelRiesgo === 'ALTO').length,
      MEDIO: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.nivelRiesgo === 'MEDIO').length,
      BAJO: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.nivelRiesgo === 'BAJO').length,
    },
    porTipo: {
      Misional: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.tipoProceso === 'Misional').length,
      Apoyo: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.tipoProceso === 'Apoyo').length,
      Estratégico: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.tipoProceso === 'Estratégico').length,
      Evaluación: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.tipoProceso === 'Evaluación').length,
    },
    porSede: {
      'Sede Principal': MOCK_UNIVERSO_AUDITORIAS.filter(p => p.tipoSede === 'Sede Principal').length,
      Territorial: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.tipoSede === 'Territorial').length,
    },
    yaEnPrograma: MOCK_UNIVERSO_AUDITORIAS.filter(p => p.yaEnPrograma).length,
    disponibles: MOCK_UNIVERSO_AUDITORIAS.filter(p => !p.yaEnPrograma).length,
  };

  return stats;
};
