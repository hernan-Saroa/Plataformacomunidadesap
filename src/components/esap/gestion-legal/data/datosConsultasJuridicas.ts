/**
 * Datos Mock - Consultas Jurídicas (MOD-03: Asesoría Jurídica)
 * 12 consultas de prueba distribuidas en 4 etapas
 * 
 * ⚖️ BASE NORMATIVA: Decreto 019 de 2012
 * Término: 30 días calendario para responder consultas internas
 */

import { ConsultaJuridica, TemaJuridico, EtapaAsesoriaJuridica } from '../core/types';

// Función para crear fecha relativa
function fechaHace(dias: number): Date {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - dias);
  return fecha;
}

export const consultasJuridicasMock: ConsultaJuridica[] = [
  // ========================================
  // ETAPA 1: RADICADA (3 consultas)
  // ========================================
  {
    id: 'CJ-2025-001',
    etapa: 'RADICADA',
    temaJuridico: 'Contractual',
    solicitante: 'Dirección Administrativa y Financiera',
    funcionarioSolicitante: 'Dra. Patricia Moreno - Jefe DAF',
    fechaRadicacion: fechaHace(2),
    diasTotales: 30,
    diasRestantes: 28,
    abogadoAsignado: 'Dr. Juan Pérez López',
    prioridad: 'MEDIA',
    consulta: '¿Es viable jurídicamente incluir cláusula de permanencia mínima de 2 años en contratos de prestación de servicios profesionales para capacitaciones financiadas por ESAP? ¿Qué consecuencias contractuales y laborales tendría?',
    normativaAplicable: [
      'Ley 80 de 1993 - Estatuto General de Contratación',
      'Decreto 1082 de 2015',
      'Concepto 2015-004 Consejo de Estado',
    ],
    documentosAdjuntos: [],
    respuesta: '',
    fechaRespuesta: undefined,
    timeline: [
      {
        id: 'TL-CJ-001',
        tipo: 'CREACIÓN',
        descripcion: 'Consulta radicada en el sistema',
        fecha: fechaHace(2),
        usuario: 'Sistema',
        icono: 'FileText',
        color: '#4CAF50',
      },
    ],
    fechaCreacion: fechaHace(2),
    fechaActualizacion: fechaHace(2),
    estado: 'ACTIVO',
  },
  {
    id: 'CJ-2025-002',
    etapa: 'RADICADA',
    temaJuridico: 'Laboral',
    solicitante: 'Gestión Humana - Sede Medellín',
    funcionarioSolicitante: 'Lic. Andrés Castro - Coordinador RRHH',
    fechaRadicacion: fechaHace(5),
    diasTotales: 30,
    diasRestantes: 25,
    abogadoAsignado: 'Dra. Ana López García',
    prioridad: 'ALTA',
    consulta: 'Funcionario con fuero sindical presentó renuncia voluntaria. ¿Se requiere autorización del juez laboral para aceptar la renuncia? ¿Qué procedimiento debe seguirse?',
    normativaAplicable: [
      'Código Sustantivo del Trabajo Art. 405-411',
      'Ley 50 de 1990',
      'Sentencia C-593/1993 Corte Constitucional',
    ],
    documentosAdjuntos: [],
    respuesta: '',
    fechaRespuesta: undefined,
    timeline: [],
    fechaCreacion: fechaHace(5),
    fechaActualizacion: fechaHace(5),
    estado: 'ACTIVO',
  },
  {
    id: 'CJ-2025-003',
    etapa: 'RADICADA',
    temaJuridico: 'Administrativo',
    solicitante: 'Dirección Territorial Bogotá',
    funcionarioSolicitante: 'Dr. Luis Gómez - Director Territorial',
    fechaRadicacion: fechaHace(1),
    diasTotales: 30,
    diasRestantes: 29,
    abogadoAsignado: 'Dr. Pedro Gómez Sánchez',
    prioridad: 'MEDIA',
    consulta: '¿Puede ESAP cobrar tarifas diferenciadas por servicios de certificación a egresados según el tiempo transcurrido desde su graduación? ¿Requiere autorización de MinEducación?',
    normativaAplicable: [
      'Ley 30 de 1992 - Educación Superior',
      'Decreto 1075 de 2015',
    ],
    documentosAdjuntos: [],
    respuesta: '',
    fechaRespuesta: undefined,
    timeline: [],
    fechaCreacion: fechaHace(1),
    fechaActualizacion: fechaHace(1),
    estado: 'ACTIVO',
  },

  // ========================================
  // ETAPA 2: ANÁLISIS (3 consultas)
  // ========================================
  {
    id: 'CJ-2024-098',
    etapa: 'ANÁLISIS',
    temaJuridico: 'Disciplinario',
    solicitante: 'Oficina de Control Interno Disciplinario',
    funcionarioSolicitante: 'Abog. Carolina Méndez - Jefe OCID',
    fechaRadicacion: fechaHace(12),
    diasTotales: 30,
    diasRestantes: 18,
    abogadoAsignado: 'Dr. Juan Pérez López',
    prioridad: 'ALTA',
    consulta: 'En proceso disciplinario iniciado en 2021 (Ley 734/2002), el investigado presentó renuncia. ¿Se debe continuar el proceso? ¿Qué efectos tiene la renuncia sobre las sanciones aplicables?',
    normativaAplicable: [
      'Ley 734 de 2002 Art. 169',
      'Ley 1952 de 2019 (régimen de transición)',
      'Concepto 2020-003 Procuraduría General',
    ],
    documentosAdjuntos: [],
    respuesta: '',
    fechaRespuesta: undefined,
    timeline: [],
    fechaCreacion: fechaHace(12),
    fechaActualizacion: fechaHace(10),
    estado: 'ACTIVO',
  },
  {
    id: 'CJ-2024-105',
    etapa: 'ANÁLISIS',
    temaJuridico: 'Propiedad Intelectual',
    solicitante: 'Vicerrectoría de Investigaciones',
    funcionarioSolicitante: 'PhD. Roberto Silva - Vicerrector',
    fechaRadicacion: fechaHace(15),
    diasTotales: 30,
    diasRestantes: 15,
    abogadoAsignado: 'Dra. Ana López García',
    prioridad: 'MEDIA',
    consulta: 'Docente desarrolló software educativo en horario laboral con recursos de ESAP. ¿A quién corresponden los derechos patrimoniales de autor? ¿Docente puede comercializar el software?',
    normativaAplicable: [
      'Ley 23 de 1982 - Derechos de Autor',
      'Decisión Andina 351 de 1993',
      'Ley 1450 de 2011 Art. 207',
    ],
    documentosAdjuntos: [],
    respuesta: '',
    fechaRespuesta: undefined,
    timeline: [],
    fechaCreacion: fechaHace(15),
    fechaActualizacion: fechaHace(14),
    estado: 'ACTIVO',
  },
  {
    id: 'CJ-2024-112',
    etapa: 'ANÁLISIS',
    temaJuridico: 'Protección de Datos',
    solicitante: 'Dirección de Tecnología',
    funcionarioSolicitante: 'Ing. María Rodríguez - Directora TI',
    fechaRadicacion: fechaHace(8),
    diasTotales: 30,
    diasRestantes: 22,
    abogadoAsignado: 'Dr. Pedro Gómez Sánchez',
    prioridad: 'ALTA',
    consulta: 'Estudiante solicita eliminación total de sus datos académicos históricos alegando derecho al olvido. ¿ESAP debe eliminar estos datos? ¿Qué información debe conservarse por obligación legal?',
    normativaAplicable: [
      'Ley 1581 de 2012 - Protección Datos Personales',
      'Decreto 1377 de 2013',
      'Sentencia T-277/2015 Corte Constitucional',
    ],
    documentosAdjuntos: [],
    respuesta: '',
    fechaRespuesta: undefined,
    timeline: [],
    fechaCreacion: fechaHace(8),
    fechaActualizacion: fechaHace(7),
    estado: 'ACTIVO',
  },

  // ========================================
  // ETAPA 3: RESPUESTA (3 consultas)
  // ========================================
  {
    id: 'CJ-2024-087',
    etapa: 'RESPUESTA',
    temaJuridico: 'Contractual',
    solicitante: 'Dirección Administrativa - Compras',
    funcionarioSolicitante: 'Cont. Jorge Pinto - Jefe Compras',
    fechaRadicacion: fechaHace(22),
    diasTotales: 30,
    diasRestantes: 8,
    abogadoAsignado: 'Dr. Juan Pérez López',
    prioridad: 'MEDIA',
    consulta: '¿Es posible adicionar contrato de suministro de papelería que ya alcanzó el 50% del valor inicial? Contrato no contempló esta posibilidad expresamente.',
    normativaAplicable: [
      'Ley 80 de 1993 Art. 40',
      'Ley 1150 de 2007',
    ],
    documentosAdjuntos: [],
    respuesta: 'CONCEPTO JURÍDICO: De conformidad con el artículo 40 de la Ley 80/1993, las entidades pueden adicionar los contratos hasta en un 50% de su valor inicial, siempre que: 1) Exista justificación técnica y presupuestal, 2) Se cuente con disponibilidad presupuestal, 3) Se suscriba antes del vencimiento del contrato. NO se requiere cláusula expresa de adición en el contrato inicial. RECOMENDACIÓN: Elaborar justificación técnica detallada y verificar CDP vigente antes de proceder con el acto administrativo de adición.',
    fechaRespuesta: fechaHace(1),
    timeline: [],
    fechaCreacion: fechaHace(22),
    fechaActualizacion: fechaHace(1),
    estado: 'ACTIVO',
  },
  {
    id: 'CJ-2024-091',
    etapa: 'RESPUESTA',
    temaJuridico: 'Laboral',
    solicitante: 'Gestión Humana - Sede Cali',
    funcionarioSolicitante: 'Dra. Sandra Castro - Jefe RRHH',
    fechaRadicacion: fechaHace(25),
    diasTotales: 30,
    diasRestantes: 5,
    abogadoAsignado: 'Dra. Ana López García',
    prioridad: 'ALTA',
    consulta: 'Funcionaria en periodo de lactancia solicita 2 horas diarias de permiso remunerado. ¿Es obligatorio concederlo? ¿Hasta qué edad del menor aplica?',
    normativaAplicable: [
      'Código Sustantivo del Trabajo Art. 238',
      'Ley 1468 de 2011',
    ],
    documentosAdjuntos: [],
    respuesta: 'CONCEPTO JURÍDICO: SÍ es obligatorio. Según Art. 238 CST modificado por Ley 1468/2011, la trabajadora en período de lactancia tiene derecho a una hora diaria de descanso remunerado durante los primeros 6 MESES de edad del menor. En el sector público, mediante Decreto 1072/2015 se amplió a DOS (2) horas diarias. El término puede extenderse si hay prescripción médica que lo justifique. RECOMENDACIÓN: Autorizar permiso por 2 horas diarias hasta los 6 meses del menor, sin descuento salarial.',
    fechaRespuesta: fechaHace(1),
    timeline: [],
    fechaCreacion: fechaHace(25),
    fechaActualizacion: fechaHace(1),
    estado: 'ACTIVO',
  },
  {
    id: 'CJ-2024-095',
    etapa: 'RESPUESTA',
    temaJuridico: 'Administrativo',
    solicitante: 'Secretaría General',
    funcionarioSolicitante: 'Abog. Felipe Vargas - Secretario General',
    fechaRadicacion: fechaHace(28),
    diasTotales: 30,
    diasRestantes: 2,
    abogadoAsignado: 'Dr. Pedro Gómez Sánchez',
    prioridad: 'ALTA',
    consulta: '¿Requiere ESAP concepto previo del MinEducación para modificar su estructura organizacional interna (creación de nueva vicerrectoría)?',
    normativaAplicable: [
      'Ley 30 de 1992 Art. 57',
      'Decreto 2127 de 2019 - ESAP',
    ],
    documentosAdjuntos: [],
    respuesta: 'CONCEPTO JURÍDICO: NO se requiere concepto previo de MinEducación para modificaciones menores de estructura interna. Sin embargo, tratándose de la CREACIÓN de una nueva VICERRECTORÍA (nivel directivo), se considera modificación sustancial de estructura que SÍ requiere: 1) Concepto favorable del Ministerio de Educación Nacional, 2) Viabilidad presupuestal del Ministerio de Hacienda, 3) Aprobación del Consejo Superior Universitario. RECOMENDACIÓN: Radicar solicitud ante MinEducación adjuntando justificación académica y estudio de viabilidad financiera.',
    fechaRespuesta: fechaHace(1),
    timeline: [],
    fechaCreacion: fechaHace(28),
    fechaActualizacion: fechaHace(1),
    estado: 'ACTIVO',
  },

  // ========================================
  // ETAPA 4: ENVIADA (3 consultas)
  // ========================================
  {
    id: 'CJ-2024-075',
    etapa: 'ENVIADA',
    temaJuridico: 'Contractual',
    solicitante: 'Dirección de Infraestructura',
    funcionarioSolicitante: 'Arq. Roberto Díaz - Director',
    fechaRadicacion: fechaHace(45),
    diasTotales: 30,
    diasRestantes: -15,
    abogadoAsignado: 'Dr. Juan Pérez López',
    prioridad: 'MEDIA',
    consulta: 'Contratista incumplió plazo de entrega de obra. ¿Se puede aplicar multa y cláusula penal simultáneamente?',
    normativaAplicable: [
      'Ley 80 de 1993 Art. 17',
      'Código Civil Art. 1592',
    ],
    documentosAdjuntos: [],
    respuesta: 'CONCEPTO JURÍDICO: NO es posible aplicar multa Y cláusula penal simultáneamente por el mismo incumplimiento. La multa tiene carácter conminatorio (presionar cumplimiento) y la cláusula penal es indemnizatoria (reparar perjuicios). Según jurisprudencia del Consejo de Estado, aplicar ambas constituye doble sanción. DECISIÓN: La entidad debe escoger UNA de las dos figuras. RECOMENDACIÓN: Si contrato está en ejecución, aplicar multas; si ya terminó plazo, aplicar cláusula penal.',
    fechaRespuesta: fechaHace(20),
    timeline: [],
    fechaCreacion: fechaHace(45),
    fechaActualizacion: fechaHace(15),
    estado: 'CERRADO',
  },
  {
    id: 'CJ-2024-068',
    etapa: 'ENVIADA',
    temaJuridico: 'Disciplinario',
    solicitante: 'Oficina de Control Interno',
    funcionarioSolicitante: 'Aud. Laura Ríos - Jefe OCI',
    fechaRadicacion: fechaHace(52),
    diasTotales: 30,
    diasRestantes: -22,
    abogadoAsignado: 'Dra. Ana López García',
    prioridad: 'MEDIA',
    consulta: '¿Auditor de control interno puede ser sujeto disciplinable por hallazgos no reportados oportunamente?',
    normativaAplicable: [
      'Ley 1952 de 2019',
      'Ley 87 de 1993',
    ],
    documentosAdjuntos: [],
    respuesta: 'CONCEPTO JURÍDICO: SÍ. El jefe de control interno es sujeto disciplinable por incumplimiento de sus funciones legales. Si omite reportar hallazgos que conozca en ejercicio de auditorías, puede configurarse la falta disciplinaria de incumplimiento de deberes (Art. 35 Ley 1952/2019). Sin embargo, debe valorarse si existió dolo o culpa grave. IMPORTANTE: Control interno NO tiene facultad sancionatoria disciplinaria, solo reporta a la OCID.',
    fechaRespuesta: fechaHace(30),
    timeline: [],
    fechaCreacion: fechaHace(52),
    fechaActualizacion: fechaHace(22),
    estado: 'CERRADO',
  },
  {
    id: 'CJ-2024-062',
    etapa: 'ENVIADA',
    temaJuridico: 'Protección de Datos',
    solicitante: 'Registro Académico',
    funcionarioSolicitante: 'Lic. Andrés Mejía - Jefe Registro',
    fechaRadicacion: fechaHace(60),
    diasTotales: 30,
    diasRestantes: -30,
    abogadoAsignado: 'Dr. Pedro Gómez Sánchez',
    prioridad: 'BAJA',
    consulta: '¿Cuánto tiempo debe ESAP conservar historias académicas de estudiantes que no terminaron sus estudios?',
    normativaAplicable: [
      'Ley 594 de 2000 - Archivo General',
      'Ley 1581 de 2012',
      'Acuerdo AGN 004 de 2019',
    ],
    documentosAdjuntos: [],
    respuesta: 'CONCEPTO JURÍDICO: Según Acuerdo 004/2019 del Archivo General de la Nación, las historias académicas tienen clasificación PERMANENTE y NO pueden eliminarse, independientemente de si el estudiante finalizó o no sus estudios. Se deben conservar en el archivo de gestión por 5 años, en archivo central por 10 años adicionales, y luego transferir al archivo histórico. RECOMENDACIÓN: Implementar tabla de retención documental conforme a normativa AGN.',
    fechaRespuesta: fechaHace(35),
    timeline: [],
    fechaCreacion: fechaHace(60),
    fechaActualizacion: fechaHace(30),
    estado: 'CERRADO',
  },
];

// Función helper para obtener consultas por etapa
export function obtenerConsultasPorEtapa(etapa: string): ConsultaJuridica[] {
  return consultasJuridicasMock.filter((cons) => cons.etapa === etapa);
}

// Función helper para obtener consulta por ID
export function obtenerConsultaPorId(id: string): ConsultaJuridica | undefined {
  return consultasJuridicasMock.find((cons) => cons.id === id);
}

// Función helper para obtener consultas por tema
export function obtenerConsultasPorTema(tema: TemaJuridico): ConsultaJuridica[] {
  return consultasJuridicasMock.filter((cons) => cons.temaJuridico === tema);
}

// Estadísticas generales
export const estadisticasAsesoriaJuridica = {
  total: consultasJuridicasMock.length,
  porEtapa: {
    RADICADA: obtenerConsultasPorEtapa('RADICADA').length,
    ANÁLISIS: obtenerConsultasPorEtapa('ANÁLISIS').length,
    RESPUESTA: obtenerConsultasPorEtapa('RESPUESTA').length,
    ENVIADA: obtenerConsultasPorEtapa('ENVIADA').length,
  },
  porTema: {
    Contractual: obtenerConsultasPorTema('Contractual').length,
    Laboral: obtenerConsultasPorTema('Laboral').length,
    Disciplinario: obtenerConsultasPorTema('Disciplinario').length,
    Administrativo: obtenerConsultasPorTema('Administrativo').length,
    'Protección de Datos': obtenerConsultasPorTema('Protección de Datos').length,
    'Propiedad Intelectual': obtenerConsultasPorTema('Propiedad Intelectual').length,
  },
  urgentes: consultasJuridicasMock.filter((c) => c.diasRestantes > 0 && c.diasRestantes < 7).length,
  vencidas: consultasJuridicasMock.filter((c) => c.diasRestantes <= 0 && c.etapa !== 'ENVIADA').length,
  activas: consultasJuridicasMock.filter((c) => c.estado === 'ACTIVO').length,
  cerradas: consultasJuridicasMock.filter((c) => c.estado === 'CERRADO').length,
  tiempoPromedioRespuesta: 25, // días (mock)
};
