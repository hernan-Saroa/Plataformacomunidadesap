/**
 * ============================================
 * INFORMES DE LEY OFICIALES - OCIG
 * ============================================
 * 
 * Cronograma completo de informes obligatorios
 * de la Oficina de Control Interno según normativa
 * 
 * FUENTE: RolesOCI_Estructurado.md - Hoja "Informes OCI"
 * ÚLTIMA ACTUALIZACIÓN: 31 Enero 2026
 */

export interface InformeDeLey {
  id: number;
  nombre: string;
  normas: string[];
  periodicidad: 'Mensual' | 'Trimestral' | 'Cuatrimestral' | 'Semestral' | 'Anual' | 'Eventual';
  destinatario: string;
  observaciones: string;
  fechasEntrega?: string[];
}

/**
 * ============================================
 * CATÁLOGO COMPLETO DE INFORMES DE LEY
 * ============================================
 */
export const INFORMES_DE_LEY_OFICIALES: InformeDeLey[] = [
  {
    id: 1,
    nombre: 'Informe de evaluación independiente del estado del Sistema de Control Interno',
    normas: [
      'Ley 1474 de 2011 art. 9 modificado por el Decreto 2106 de 2019. Artículo 156',
      'Circular Externa No. 100 – 006 de 2019 de Función Pública'
    ],
    periodicidad: 'Semestral',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'El jefe de la Unidad de la Oficina de Control Interno deberá publicar cada seis (6) meses, en el sitio web de la entidad, un informe de evaluación independiente del estado del Sistema de Control Interno. Existe formato excel emitido por el DAFP. Los informes deben ser publicados en la página web de la ESAP, se envían al director Nacional con copia a los procesos responsables.',
    fechasEntrega: ['30 de junio', '31 de diciembre']
  },
  {
    id: 2,
    nombre: 'Medición Estado de Avance del Modelo Estándar de Control Interno MECI',
    normas: [
      'Resolución No. 142 de marzo 8 de 2006 del DAFP',
      'Decreto 1083 de 2015 Capítulo 3, artículo 2.2.23.3'
    ],
    periodicidad: 'Anual',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Los jefes de control interno realizarán la medición de la efectividad del Modelo. Para cada vigencia el DAFP emitirá una Circular con los lineamientos para su evaluación de forma articulada con el MIPG, el cual se presentará de forma virtual mediante el aplicativo FURAG (Formulario único de reporte de Avance a la Gestión).',
    fechasEntrega: ['Según cronograma DAFP']
  },
  {
    id: 3,
    nombre: 'Informe de evaluación a la Gestión Institucional (Evaluación por dependencias)',
    normas: [
      'Ley 909 de septiembre 23 de 2004. Art. 39',
      'Circular 04 de septiembre 27 de 2005 del Consejo Asesor del Gobierno Nacional en Materia de Control Interno',
      'Acuerdo 6176 de 2018 de la Comisión Nacional del Servicio Civil'
    ],
    periodicidad: 'Anual',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Este informe se constituye en un insumo para la evaluación de los acuerdos de gestión (Gerentes Públicos) donde aplique. La CNSC establece que se debe dar a conocer a los evaluadores el resultado de la Evaluación de Gestión por Áreas o Dependencias del año inmediatamente anterior.',
    fechasEntrega: ['30 de enero (siguiente vigencia)']
  },
  {
    id: 4,
    nombre: 'Gestión oficina de control interno',
    normas: [
      'Ley 87 de 1993',
      'Guía rol de las unidades u oficinas de control interno'
    ],
    periodicidad: 'Anual',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Corresponde al seguimiento a la gestión de la Oficina de Control Interno de la vigencia anterior. Presentar la gestión realizada por la OCI a los grupos de valor o partes interesadas.',
    fechasEntrega: ['Febrero (vigencia siguiente)']
  },
  {
    id: 5,
    nombre: 'Seguimiento funciones del comité de conciliaciones',
    normas: [
      'Ley 678 de agosto 3 de 2001',
      'Decreto 1716 de mayo 14 de 2009',
      'Decreto 1069 de 2015',
      'Ley 2220 de 2022'
    ],
    periodicidad: 'Anual',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Decreto 1069 de 2015 Art. 2.2.4.3.1.2.12. La Oficina de Control Interno debe verificar el cumplimiento de las obligaciones relacionadas con la acción de repetición. Los Comités de Conciliación deberán realizar los estudios pertinentes para determinar la procedencia de la acción de repetición.',
    fechasEntrega: ['Diciembre']
  },
  {
    id: 6,
    nombre: 'Seguimiento al programa de transparencia y ética pública',
    normas: [
      'Ley 1474 de 2011 artículo 73 modificado por el artículo 31 de la Ley 2195 de 2022'
    ],
    periodicidad: 'Cuatrimestral',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'La Oficina de Control Interno realizará seguimiento tres (3) veces al año. El plan y sus seguimientos deben ser publicados en la página web de la entidad.',
    fechasEntrega: [
      'Primeros 10 días hábiles de mayo (corte 30 abril)',
      'Primeros 10 días hábiles de septiembre (corte 31 agosto)',
      'Primeros 10 días hábiles de enero (corte 31 diciembre)'
    ]
  },
  {
    id: 7,
    nombre: 'Informe de austeridad en el gasto',
    normas: [
      'Decreto 1068 de 2015 Art. 2.8.4.1.2',
      'Decreto No. 371 del 8 de abril de 2021'
    ],
    periodicidad: 'Trimestral',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Verificación del cumplimiento de las disposiciones de austeridad. No se envía a ninguna instancia pero la Contraloría General de la República podrá solicitarlo en sus visitas a las entidades.',
    fechasEntrega: ['Marzo', 'Junio', 'Septiembre', 'Diciembre']
  },
  {
    id: 8,
    nombre: 'Informe sobre la atención prestada por la entidad, por parte de las Oficinas de Quejas, Sugerencias y Reclamos',
    normas: [
      'Constitución Política, artículo 23',
      'Ley 1474 de 2011 art. 76'
    ],
    periodicidad: 'Semestral',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Art. 76 Ley 1474 de 2011: La oficina de control interno deberá vigilar que la atención se preste de acuerdo con las normas legales vigentes y rendirá a la administración de la entidad un informe semestral sobre el particular.',
    fechasEntrega: ['Junio', 'Diciembre']
  },
  {
    id: 9,
    nombre: 'Seguimiento al índice de transparencia y acceso a la información Pública ITA (Ley 1712 de 2014, Resolución 1519 de 2021)',
    normas: [
      'Ley 1712 de 2014',
      'Resolución 1519 de 2021',
      'Guía rol de las unidades u oficinas de control interno, auditoría interna o quien haga sus veces'
    ],
    periodicidad: 'Trimestral',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Los informes se publican en la página web de la entidad, se envía al Director Nacional, con copia a los responsables de las acciones, seguimiento semestral en concordancia con la resolución 324 del 08 de abril de 2022.',
    fechasEntrega: ['Marzo', 'Junio', 'Septiembre', 'Diciembre']
  },
  {
    id: 10,
    nombre: 'Seguimiento al fortalecimiento de la meritocracia en el Estado Colombiano',
    normas: [
      'Ley 909 de 2004',
      'Decreto 1083 de 2015 2.2.17.1 y posteriores',
      'Circular 017 de noviembre de 2017 de la Procuraduría General de la Nación',
      'Ley 2013 de 2019'
    ],
    periodicidad: 'Eventual',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Los jefes de control interno deben realizar un seguimiento permanente para que la entidad cumpla con las obligaciones derivadas del decreto. Ejercer control y seguimiento al cumplimiento: i) Obligaciones relacionadas con la actualización del OPEC; ii) Obligaciones relacionadas con la actualización del SIGEP, Plan Anual de Vacantes y la Declaración de Bienes y Rentas.',
    fechasEntrega: ['En caso de evidenciarse']
  },
  {
    id: 11,
    nombre: 'Seguimiento al mapa de Riesgos Institucional (Gestión y SGI)',
    normas: [
      'Política de administración de riesgos, resolución 246 del 01 de marzo de 2023',
      'Decreto 1083 de 2015 ARTÍCULO 2.2.21.1.6 Funciones del Comité Institucional de Coordinación de Control Interno literal G'
    ],
    periodicidad: 'Cuatrimestral',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Línea Estratégica - Comité Institucional de Coordinación de Control Interno. Evaluar la eficacia de la política frente a la gestión del riesgo institucional. Monitorear los riesgos críticos identificados (aquellos definidos en los niveles de severidad Alto y Extremo). Analizar los riesgos, vulnerabilidades, amenazas y escenarios de pérdida de continuidad de negocio institucionales.',
    fechasEntrega: ['Abril', 'Agosto', 'Diciembre']
  },
  {
    id: 12,
    nombre: 'Medición del Desempeño Institucional',
    normas: [
      'Decreto 1083 de 2015, Artículo 2.2.22.3.10'
    ],
    periodicidad: 'Anual',
    destinatario: 'DAFP',
    observaciones: 'Conforme al cronograma establecido por el Departamento Administrativo de la Función Pública para cada vigencia. Medir anualmente la gestión y el desempeño de las entidades públicas en el marco de los criterios y estructura temática, tanto de MIPG como de MECI. La recolección de información necesaria para dicha medición se hará a través del Formulario Único de Reporte y Avance de Gestión (FURAG).',
    fechasEntrega: ['Según cronograma DAFP']
  },
  {
    id: 13,
    nombre: 'Informe sobre posibles actos de corrupción',
    normas: [
      'Ley 1474 de 2011 art. 9 (Segundo Inciso modificado por el art. 231 del Decreto 19 de 2012)',
      'Decreto 338 de 2019 Artículo 1, parágrafo 1'
    ],
    periodicidad: 'Eventual',
    destinatario: 'Entes de control respectivos',
    observaciones: 'Solamente en caso de evidenciarse deberá ser diligenciado el formato determinado para tales fines incluido en la Directiva Presidencial 01 de 2015.',
    fechasEntrega: ['En caso de evidenciarse']
  },
  {
    id: 14,
    nombre: 'Planes de mejoramiento interno Oficina de Control Interno',
    normas: [
      'Guía rol de las unidades u oficinas de control interno, auditoría interna o quien haga sus veces'
    ],
    periodicidad: 'Trimestral',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Seguimiento interno a las acciones de mejora de la propia Oficina de Control Interno derivadas de autoevaluaciones o hallazgos internos.',
    fechasEntrega: ['Marzo', 'Junio', 'Septiembre', 'Diciembre']
  },
  {
    id: 15,
    nombre: 'Informe ejecutivo de auditorías realizadas',
    normas: [
      'Ley 87 de 1993',
      'Decreto 648 de 2017'
    ],
    periodicidad: 'Cuatrimestral',
    destinatario: 'Representante legal de la entidad',
    observaciones: 'Informe ejecutivo consolidado de las auditorías realizadas en el período, incluyendo hallazgos principales, observaciones y recomendaciones. Se socializa en el Comité Institucional de Coordinación de Control Interno.',
    fechasEntrega: ['Abril', 'Agosto', 'Diciembre']
  }
];

/**
 * ============================================
 * FUNCIONES AUXILIARES
 * ============================================
 */

/**
 * Obtener informes por periodicidad
 */
export function obtenerInformesPorPeriodicidad(periodicidad: InformeDeLey['periodicidad']): InformeDeLey[] {
  return INFORMES_DE_LEY_OFICIALES.filter(informe => informe.periodicidad === periodicidad);
}

/**
 * Obtener informes del mes actual
 */
export function obtenerInformesDelMes(mes: number): InformeDeLey[] {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const nombreMes = meses[mes - 1];
  
  return INFORMES_DE_LEY_OFICIALES.filter(informe => 
    informe.fechasEntrega?.some(fecha => fecha.toLowerCase().includes(nombreMes.toLowerCase()))
  );
}

/**
 * Calcular próximos informes (próximos 30 días)
 */
export function obtenerProximosInformes(): InformeDeLey[] {
  const hoy = new Date();
  const mesActual = hoy.getMonth() + 1;
  const mesSiguiente = mesActual === 12 ? 1 : mesActual + 1;
  
  const informesMesActual = obtenerInformesDelMes(mesActual);
  const informesMesSiguiente = obtenerInformesDelMes(mesSiguiente);
  
  return [...informesMesActual, ...informesMesSiguiente];
}

/**
 * Estadísticas de informes
 */
export function obtenerEstadisticasInformes() {
  return {
    total: INFORMES_DE_LEY_OFICIALES.length,
    porPeriodicidad: {
      mensual: obtenerInformesPorPeriodicidad('Mensual').length,
      trimestral: obtenerInformesPorPeriodicidad('Trimestral').length,
      cuatrimestral: obtenerInformesPorPeriodicidad('Cuatrimestral').length,
      semestral: obtenerInformesPorPeriodicidad('Semestral').length,
      anual: obtenerInformesPorPeriodicidad('Anual').length,
      eventual: obtenerInformesPorPeriodicidad('Eventual').length
    }
  };
}

/**
 * Buscar informe por nombre
 */
export function buscarInformePorNombre(termino: string): InformeDeLey[] {
  const terminoLower = termino.toLowerCase();
  return INFORMES_DE_LEY_OFICIALES.filter(informe => 
    informe.nombre.toLowerCase().includes(terminoLower) ||
    informe.observaciones.toLowerCase().includes(terminoLower)
  );
}
