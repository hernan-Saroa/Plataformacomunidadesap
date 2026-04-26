/**
 * ============================================================
 * SERVICIO: GENERACIÓN IA DE CONTENIDO INFORME PRELIMINAR
 * ============================================================
 *
 * Usa la API de Claude (Anthropic) para generar contenido técnico,
 * formal e institucional del Informe Preliminar de Auditoría Interna
 * de la ESAP, a partir de los datos de la auditoría en JSON.
 */

import type { AuditoriaBasicaPDF, HallazgoPDF } from './exportarPDFInformeAuditoria';

// ─── Tipos de respuesta estructurada ─────────────────────────────────────────

export interface PlanAccionIA {
  resumen?: string;
  observaciones?: string[];
  items: Array<{
    actividad: string;
    proceso: string;
    indicador: string;
    metaProgramada: string;
    metaEjecutada: string;
    cumplimiento: string;
  }>;
}

export interface ProcesoAuditadoIA {
  idFoco?: string;
  categoria: string;
  numero: number;
  nombre: string;
  objetivo: string;
  riesgos: string[];
  componentes: Array<{ titulo: string; contenido: string }>;
  planAccion?: PlanAccionIA;
  hallazgosIndices?: number[];
}

export interface PaginaInformeIA {
  numero: number;
  tipo: 'OFICIO' | 'PORTADA' | 'CONTENIDO' | 'FIRMAS';
  encabezado: string;
  contenido: string;
  piePagina: string;
}

export interface ContenidoInformeIA {
  objetivo: string;
  alcance: string;
  declaracion: string;
  contextoGeneral: string;
  descripcionUnidad: string;
  marcoNormativo: string[] | { generales: string[], especificas: string[] };
  procesosAuditados: ProcesoAuditadoIA[];
  planesMejoramiento: string;
  aspectosRelevantes: string;
  evaluacionControlInterno: string;
  fortalezas: string[];
  recomendacionesPorCategoria: Array<{ categoria: string; items: string[] }>;
  conclusiones: string;
  paginas?: PaginaInformeIA[];
}

// ─── Prompt institucional ─────────────────────────────────────────────────────

function buildPrompt(auditoria: AuditoriaBasicaPDF, hallazgos: HallazgoPDF[], año: number): string {
  const auditoriaJson = JSON.stringify({
    codigo: auditoria.codigo,
    nombre: auditoria.nombre,
    proceso: auditoria.proceso,
    unidadAuditable: auditoria.unidadAuditable || auditoria.nombre,
    periodoAuditoria: auditoria.periodoAuditoria,
    hallazgos: hallazgos.map((h, i) => ({ numero: i + 1, titulo: h.titulo, descripcion: h.descripcion })),
    año
  }, null, 2);

  return `Eres un auditor experto de la Oficina de Control Interno de la ESAP.
  Genera un objeto JSON profesional con el contenido para el Informe Preliminar de Auditoría de: ${auditoriaJson}.

  REGLAS:
  1. Genera contenido institucional, formal y propositivo.
  2. Incluye una lista de procesos auditados con su objetivo y hallazgos relacionados.
  3. Las fortalezas y recomendaciones deben ser coherentes con la auditoría.

  El JSON debe seguir esta estructura:
  {
    "objetivo": "...",
    "alcance": "...",
    "procesosAuditados": [
      {
        "numero": 1,
        "nombre": "...",
        "objetivo": "...",
        "hallazgosIndices": [0]
      }
    ],
    "fortalezas": ["..."],
    "recomendacionesPorCategoria": [{ "categoria": "...", "items": ["..."] }],
    "conclusiones": "..."
  }`;
}

// ─── Llamada a la API de Claude ───────────────────────────────────────────────

async function llamarClaudeAPI(prompt: string, apiKey: string): Promise<ContenidoInformeIA> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  if (!response.ok) throw new Error(`Claude API error ${response.status}`);
  const data = await response.json();
  return JSON.parse(data.content[0].text);
}

// ─── Contenido enriquecido por defecto (sin IA) ───────────────────────────────

function contenidoPorDefecto(auditoria: AuditoriaBasicaPDF, hallazgos: HallazgoPDF[], año: number): ContenidoInformeIA {
  const unidad = auditoria.unidadAuditable || auditoria.nombre || 'la Unidad Auditada';
  const periodo = auditoria.periodoAuditoria || `vigencia ${año}`;
  const ini = auditoria.fechaEjecucionInicio || `enero ${año}`;
  const fin = auditoria.fechaEjecucionFin || `diciembre ${año}`;
  const lugar = auditoria.lugarEjecucion || 'Bogotá, D.C.';

  // Lista maestra institucional
  const procesosMaestros = [
    { idFoco: 'direccionamiento_estrategico', numero: 1, nombre: 'DIRECCIONAMIENTO ESTRATÉGICO', objetivo: 'Establecer los lineamientos estratégicos, tácticos y operativos...' },
    { idFoco: 'formacion', numero: 2, nombre: 'FORMACIÓN PARA LA VIDA', objetivo: 'Formar personas en conocimientos, competencias y valores...' },
    { idFoco: 'capacitacion', numero: 3, nombre: 'PROYECCIÓN Y EXTENSIÓN', objetivo: 'Desarrollar la proyección y extensión de la ESAP...' }
  ];

  const generarProcesosDinamicos = (): ProcesoAuditadoIA[] => {
    const focalizados = auditoria.focos || [];
    if (focalizados.length > 0) {
      return procesosMaestros.filter(p => focalizados.includes(p.idFoco)).map(p => ({
        ...p,
        categoria: 'PROCESO AUDITADO',
        riesgos: [],
        componentes: []
      }));
    }
    return [{
      categoria: 'PROCESO AUDITADO',
      numero: 1,
      nombre: auditoria.proceso || 'PROCESO GENERAL',
      objetivo: 'Evaluar la gestión institucional.',
      riesgos: [],
      componentes: []
    }];
  };

  const paginas: PaginaInformeIA[] = [{
    numero: 1,
    tipo: 'OFICIO',
    encabezado: 'ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP | OFICINA DE CONTROL INTERNO',
    contenido: `
      12_150_350_472
      Bogotá, D.C.

      Doctora
      ${(auditoria.destinatarioNombre || 'Director(a) Territorial').toUpperCase()}
      ${auditoria.destinatarioCargo || 'Director(a) Territorial'}
      ESAP - ${unidad}
      E. S. D.

      Asunto: Informe preliminar auditoría interna de evaluación y seguimiento ${unidad} – Vigencia ${año}.

      Respetada Doctora ${(auditoria.destinatarioNombre || 'Director').split(' ')[0]} reciba un cordial saludo:

      La Oficina de Control Interno de la ESAP, en cumplimiento de las actividades encomendadas por la Ley 87 de 1993 y del Plan Anual de Auditoría del año ${año}, remite para su conocimiento y pronunciamiento el informe Preliminar de Auditoría de Evaluación y Seguimiento a la gestión adelantada por la ${unidad}, para el periodo comprendido entre el 1 de enero y el 31 de diciembre de ${año - 1}.

      Así mismo, la unidad tiene plazo de cinco (5) días hábiles, para que se pronuncie frente a cada uno de los hallazgos y recomendaciones incluidas en el informe preliminar, allegando los soportes y evidencias respectivos, con el objetivo que los hallazgos sean levantados o en su defecto declarada su firmeza.

      Cordialmente,

      JEFE OFICINA DE CONTROL INTERNO
      Escuela Superior de Administración Pública - ESAP
    `,
    piePagina: 'Informe Preliminar de Auditoría Interna - Página 1'
  }];

  // Extraer datos de reuniones (arrastre desde etapa de ejecución)
  const reunionApertura = auditoria.reuniones?.find(r => 
    r.tipo.toLowerCase().includes('apertura') || r.tipo.toLowerCase().includes('inicio')
  );
  const reunionCierre = auditoria.reuniones?.find(r => 
    r.tipo.toLowerCase().includes('cierre') || r.tipo.toLowerCase().includes('final')
  );

  // Helper para formatear fechas de reuniones de forma elegante y organizada
  const formatearFechaReunion = (reunion?: any, prefix: string = 'el día') => {
    if (!reunion) return '';
    const { fecha, hora } = reunion;
    let fechaTxt = fecha;
    let horaTxt = hora;

    try {
      // Intentar parsear la fecha (puede ser YYYY-MM-DD o ISO Full)
      const d = new Date(fecha);
      if (!isNaN(d.getTime())) {
        // Usar UTC para evitar saltos de día por zona horaria si viene de DB
        const day = d.getUTCDate();
        const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const month = months[d.getUTCMonth()];
        const year = d.getUTCFullYear();
        fechaTxt = `${day} de ${month} de ${year}`;

        // Si no hay hora pero el timestamp tiene hora, extraerla
        if (!horaTxt && fecha.includes('T')) {
          const h = d.getUTCHours();
          const m = d.getUTCMinutes();
          if (h !== 0 || m !== 0) {
            const ampm = h >= 12 ? 'pm' : 'am';
            const h12 = h % 12 || 12;
            horaTxt = `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
          }
        }
      }
    } catch (e) { /* Fallback al original */ }
    
    const finalHora = horaTxt ? ` a las ${horaTxt}` : '';
    return `${prefix} ${fechaTxt}${finalHora}`;
  };

  const txtReunionApertura = reunionApertura 
    ? formatearFechaReunion(reunionApertura, 'el día')
    : `el día 29 de julio de 2025 a las 11:30 am`;

  const txtReunionCierre = reunionCierre
    ? formatearFechaReunion(reunionCierre, 'el')
    : `el 01 de agosto 2025 a las 11:00 pm`;

  const modalidad = reunionCierre?.modalidad || reunionApertura?.modalidad || 'presencial';

  return {
    objetivo: `Evaluar el cumplimiento de las normas, directrices, procedimientos y regulaciones aplicables a los procesos al interior de la ${unidad} de la ESAP, mediante la auditoría interna basada en riesgos como actividad independiente y objetiva. Identificar los riesgos asociados a los procesos auditados, evaluar la eficacia de los controles establecidos y formular recomendaciones orientadas al fortalecimiento del Sistema de Control Interno Institucional para la ${periodo}.`,
    alcance: `La auditoría cubre la evaluación integral de los procesos estratégicos, misionales y de apoyo al interior de la ${unidad}, correspondiente al ${periodo}. El trabajo se desarrolló como auditoría de evaluación y seguimiento basada en riesgos, con metodología de muestreo aleatorio sobre expedientes, sistemas de información institucional (ISOLUCIÓN, Sistema Integrado de Gestión), reportes, intranet y documentación soporte.`,
    declaracion: `El equipo auditor declara que la auditoría se realizó conforme a las Normas Internacionales para el Ejercicio Profesional de la Auditoría Interna y el Código de Ética del Auditor Interno. La evaluación se basó en muestras representativas de la gestión adelantada, y la responsabilidad de la Oficina de Control Interno es expresar una opinión sobre el estado del sistema evaluado, mientras que la responsabilidad de la gestión y el control de los procesos recae sobre los líderes de la ${unidad}.`,
    contextoGeneral: `Dentro de las competencias de la Oficina de Control Interno, enmarcadas en la Ley 87 de 1993, está evaluar la eficiencia, eficacia, y economía de los controles, asesorando a la Dirección General en la continuidad del proceso administrativo, la revaluación de los planes establecidos y en la introducción de los correctivos necesarios para el cumplimiento de las metas u objetivos previstos por la entidad.\n\nEs así, que de acuerdo con el programa de auditoria anual de la vigencia ${año}, que hace parte de un componente del plan de acción de la Oficina de Control Interno, se programó, aprobó y ejecutó Auditoría Interna a los Procesos de estratégicos, misionales y de apoyo al interior de la ${unidad} de la Escuela Superior de Administración Pública – ESAP.\n\nLa verificación de los aspectos auditables se desarrolló en las fechas establecidas para la etapa de ejecución del proceso auditor, donde se realizó la reunión de inicio ${txtReunionApertura} y la reunión de cierre ${txtReunionCierre}, reunión ${modalidad} en la cual el equipo auditor dio a conocer a los responsables de los procesos las fortalezas, recomendaciones y posibles hallazgos evidenciados durante el ejercicio auditor y que se pormenorizan en el presente informe.\n\nNota: La Oficina de Control Interno está facultada para realizar recomendaciones durante las etapas de los procesos, su función es eminentemente preventiva para contrarrestar o advertir las posibles inconsistencias que pueda llegar a incurrir la entidad, sin que esta atribución implique autorizar o refrendar los procedimientos administrativos de la entidad, so pena de incurrir en coadministración.`,
    descripcionUnidad: `La ${unidad} hace parte de la estructura organizacional de la Escuela Superior de Administración Pública – ESAP, entidad adscrita al Departamento Administrativo de la Función Pública, creada mediante la Ley 19 de 1958. Su misión es brindar formación y capacitación en administración pública para el fortalecimiento de las capacidades del Estado colombiano.`,
    marcoNormativo: {
      generales: [
        'Ley 80 1993: “Por la cual se expide el Estatuto General de Contratación de la Administración Pública.”',
        'Ley 1150 2007: “Por medio de la cual se introducen medidas para la eficiencia y la transparencia en la Ley 80 de 1993 y se dictan otras disposiciones generales sobre la contratación con Recursos Públicos.”',
        'Ley 1474 2011: “Por la cual se dictan normas orientadas a fortalecer los mecanismos de prevención, investigación y sanción de actos de corrupción y la efectividad del control de la gestión pública.”',
        'Ley 1882 2018: “Por la cual se adicionan, modifican y dictan disposiciones orientadas a fortalecer la contratación pública en Colombia, la Ley de infraestructura y se dictan otras disposiciones.”',
        'Decreto 1082 2015: “Por medio del cual se expide el decreto único reglamentario del sector Administrativo de Planeación Nacional.”',
        'Decreto 1083 2015: “Incorpora las modificaciones introducidas al Decreto Único Reglamentario del Sector de Función Pública a partir de la fecha de su expedición. Última fecha de actualización: 22 de noviembre de 2018.”',
        'Decreto 1075 2015: “Por medio del cual se expide el Decreto Único Reglamentario del Sector Educación.”'
      ],
      especificas: [
        'Decreto 164 2021: “Por el cual se modifica la estructura de la Escuela Superior de Administración.”',
        'Plan Decenal de Desarrollo 2023 – 2033 de la ESAP.',
        'Resolución 143 del 21 de febrero de 2022 “Por la cual se dictan disposiciones en el manejo de inventarios de la Escuela Superior de Administración Pública y se dictan otras disposiciones”.',
        'Resolución No SC-043 de 2022, “Por medio de la cual se crea el Comité de Inventarios de bienes de propiedad de la Escuela Superior de Administración Pública (ESAP)”.',
        'CONPES 3930 DE 2018 “Declaración de importancia estratégica del proyecto construcción, adquisición, adecuación y mantenimiento de las sedes de la escuela superior de administración pública nacional”.',
        'Resolución 613 de 2021 -ESAP- “Por medio de la cual se crean grupos internos de trabajo en la Subdirección Nacional de Gestión Corporativa en la Escuela Superior de Administración Pública - ESAP” Artículo 2. Numeral 1. Literal B. Grupo de Infraestructura y Mantenimiento.',
        'Acuerdo 0003 del 06 de agosto de 2018 “Por el cual se expide el Estatuto Profesoral de la Escuela Superior de Administración Pública”.',
        'Resolución 008902 del 29 de mayo de 2023 “Por medio de la cual se renueva la acreditación de alta calidad al Programa de Administración Pública Territorial de la Escuela Superior de Administración Pública – ESAP, ofrecido bajo la modalidad a distancia en Bogotá D.C. y se renueva de oficio el registro calificado expedida por el Ministerio de Educación Nacional”.',
        'Decreto 1295 de 2010 “Por el cual se reglamenta el registro calificado de que trata la Ley 1188 de 2008 y la oferta y desarrollo de programas académicos de educación superior”.',
        'Resolución 1149 de 2022 modificada por la Resolución 1316 de 2023.',
        'Ley 30 de 1992, “Por el cual se organiza el servicio público de la Educación Superior”, capitulo III campos de acción y programas académicos, capítulo IV de las instituciones de educación superior, capítulo V de los sistemas nacionales de acreditación e información, título V bienestar universitario.”',
        'Ley 115 de 1994, “Por la cual se expide la Ley general de educación”. Art 46 modalidad de atención educativa a poblaciones, art. 88 título educativo, art. 185 estímulos especiales.”',
        'Acuerdo 010 de 2006 “Por el cual se adopta el reglamento de Investigación de la Escuela Superior de Administración Pública ESAP”.',
        'Acuerdo 002 de 2018 “Por el cual se adopta e Reglamento Único Estudiantil la Escuela Superior de Administración Pública ESAP”.',
        'Acuerdo 010 de septiembre de 2023 “Por medio del cual se fija la cobertura del cien por ciento 100% sobre el valor del derecho pecuniario de inscripción para los aspirantes a los programas de pregrado de la ESAP, para el primer y segundo periodo académico de 2024”.',
        'Manual Políticas Contables ESAP V5 Documentos de referencia: MP-A-GF-01, Código DC-AGF-20 versión 05 del 16/09/2019.',
        'Resolución No S.C. 492 del 9 de junio de 2022 “Por la cual se actualiza el Reglamento Interno de Recaudo de Cartera, así como del Cobro Persuasivo y Coactivo de la Escuela Superior de Administración Pública - ESAP y se deroga totalmente la Resolución 2125 de 2016.”',
        'Resolución SC-338 del 15 de marzo de 2023: “Por medio de la cual se adopta y reglamenta la autorización, trámite, reconocimiento y pago de comisiones de servicios (viáticos) y gastos de desplazamiento a los comisionados al interior y exterior del país, así como los auxilios económicos de desplazamiento para salidas de campo y eventos académicos nacionales e internaciones a investigadores vinculados a los proyectos de investigación de la Escuela Superior de Administración Pública ESAP.”',
        'Política y metodología para la administración del riesgo aprobada en Comité Institucional de Control Interno (29/11/2024).',
        'Mapa de Riesgos Institucional versión 1. 30/01/2024.',
        'Plan de Acción Institucional V3 - 30 - 09 - 2024.',
        'Plan Institucional de Infraestructura y Mantenimiento 2022-2025 V1 28-04-2022.'
      ]
    },
    procesosAuditados: generarProcesosDinamicos(),
    planesMejoramiento: `Teniendo en cuenta que el presente documento constituye un Informe Preliminar, no se incluyen Planes de Mejoramiento en esta etapa. Una vez se consolide el Informe Ejecutivo y se surta el proceso de comunicación definitiva, la unidad auditada deberá formalizar las acciones de mejora para subsanar los hallazgos que queden en firme.`,
    aspectosRelevantes: `El personal de planta de la ${unidad} asciende a dieciséis (16) servidores, lo que evidencia una estructura de planta consolidada con alto porcentaje de personal de carrera. Se destaca la disposición del equipo de trabajo para atender los requerimientos de la auditoría y el acceso oportuno a la información y documentación solicitada.`,
    evaluacionControlInterno: `Como resultado del trabajo de auditoría desarrollado, se evalúa que el Sistema de Control Interno de la ${unidad} se encuentra en proceso de mejora. Se identificaron oportunidades de fortalecimiento en los controles implementados, particularmente en los aspectos relacionados con la gestión documental, la supervisión contractual y el control de inventarios.`,
    fortalezas: [
      `Personal con idoneidad técnica y experiencia en la gestión de los procesos institucionales, lo que garantiza la continuidad de la operación y el cumplimiento de los objetivos misionales.`,
      `Procedimientos documentados y actualizados en el Sistema Integrado de Gestión – SIG, que orientan la ejecución de las actividades y facilitan el autocontrol.`,
      `Disposición oportuna de la información y la documentación requerida por el equipo auditor.`,
      `Capacidad de adaptación al cambio por parte del personal de la ${unidad} frente a los requerimientos normativos.`
    ],
    recomendacionesPorCategoria: [
      { categoria: 'GESTIÓN DOCUMENTAL', items: [`Actualizar y aplicar las Tablas de Retención Documental en todos los archivos de gestión de la ${unidad}.`, `Implementar controles de trazabilidad para los documentos radicados en ventanilla única.`] },
      { categoria: 'CONTRATACIÓN', items: [`Actualizar oportunamente el Plan Anual de Adquisiciones cuando se presenten modificaciones presupuestales.`, `Asegurar que todos los contratos suscritos cuenten con supervisor o interventor designado.`] },
      { categoria: 'CONTROL INTERNO', items: [`Actualizar la matriz de riesgos de los procesos de la ${unidad}, identificando nuevos riesgos derivados de los cambios normativos.`] }
    ],
    conclusiones: `Como resultado de la Auditoría Interna de Evaluación y Seguimiento practicada a los procesos al interior de la ${unidad} de la ESAP, correspondiente a la ${periodo}, la Oficina de Control Interno concluye que la gestión adelantada refleja avances en el cumplimiento normativo e identifica oportunidades de mejora que deben ser atendidas para fortalecer el Sistema de Control Interno Institucional. Se exhorta a la unidad a priorizar la implementación de las recomendaciones formuladas y a fortalecer la cultura de autocontrol.`,
    paginas
  };
}

export async function generarContenidoInformeIA(auditoria: AuditoriaBasicaPDF, hallazgos: HallazgoPDF[], onProgress?: (msg: string) => void): Promise<ContenidoInformeIA> {
  const año = new Date().getFullYear();
  const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY as string | undefined;
  if (!apiKey) return contenidoPorDefecto(auditoria, hallazgos, año);
  try {
    const prompt = buildPrompt(auditoria, hallazgos, año);
    return await llamarClaudeAPI(prompt, apiKey);
  } catch (error) {
    return contenidoPorDefecto(auditoria, hallazgos, año);
  }
}

export function aplicarContenidoIA(auditoria: AuditoriaBasicaPDF, contenido: ContenidoInformeIA): AuditoriaBasicaPDF {
  const real = <T>(v: T | undefined | null, f: T): T => (v !== undefined && v !== null && v !== '' ? v : f);
  const realArr = <T>(v: T[] | undefined | null, f: T[]): T[] => (Array.isArray(v) && v.length > 0 ? v : f);
  return {
    ...auditoria,
    objetivo: real(auditoria.objetivo, contenido.objetivo),
    alcance: real(auditoria.alcance, contenido.alcance),
    declaracion: real((auditoria as any).declaracion, contenido.declaracion),
    contextoGeneral: real(auditoria.contextoGeneral, contenido.contextoGeneral),
    descripcionUnidad: real(auditoria.descripcionUnidad, contenido.descripcionUnidad),
    planesMejoramiento: real(auditoria.planesMejoramiento, contenido.planesMejoramiento),
    aspectosRelevantes: real(auditoria.aspectosRelevantes, contenido.aspectosRelevantes),
    evaluacionControlInterno: real(auditoria.evaluacionControlInterno, contenido.evaluacionControlInterno),
    marcoNormativo: realArr(auditoria.marcoNormativo as string[], contenido.marcoNormativo),
    procesosAuditados: (contenido.procesosAuditados && contenido.procesosAuditados.length > 0) ? contenido.procesosAuditados : (auditoria.procesosAuditados || []),
    fortalezas: realArr(auditoria.fortalezas, contenido.fortalezas),
    recomendacionesPorCategoria: realArr(auditoria.recomendacionesPorCategoria, contenido.recomendacionesPorCategoria),
    // @ts-ignore
    paginas: contenido.paginas
  };
}
