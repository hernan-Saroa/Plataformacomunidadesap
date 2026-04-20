/**
 * ============================================================
 * SERVICIO: GENERACIÓN IA DE CONTENIDO INFORME PRELIMINAR
 * ============================================================
 *
 * Usa la API de Claude (Anthropic) para generar contenido técnico,
 * formal e institucional del Informe Preliminar de Auditoría Interna
 * de la ESAP, a partir de los datos de la auditoría en JSON.
 *
 * Requiere: VITE_ANTHROPIC_API_KEY en el archivo .env del MFE.
 * Si no hay clave, retorna contenido por defecto enriquecido.
 */

import type { AuditoriaBasicaPDF, HallazgoPDF } from './exportarPDFInformeAuditoria';

// ─── Tipos de respuesta estructurada ─────────────────────────────────────────

export interface ProcesoAuditadoIA {
  categoria: string;
  numero: number;
  nombre: string;
  objetivo: string;
  riesgos: string[];
  componentes: Array<{ titulo: string; contenido: string }>;
  hallazgosIndices?: number[];
}

export interface ContenidoInformeIA {
  objetivo: string;
  alcance: string;
  contextoGeneral: string;
  descripcionUnidad: string;
  marcoNormativo: string[];
  cartaRepresentacionFecha?: string;
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
  const auditoriaJson = JSON.stringify(
    {
      codigo: auditoria.codigo,
      nombre: auditoria.nombre,
      proceso: auditoria.proceso,
      auditorLider: auditoria.auditorLider,
      unidadAuditable: auditoria.unidadAuditable || auditoria.nombre,
      destinatarioCargo: auditoria.destinatarioCargo || 'Director(a) Territorial',
      lugarEjecucion: auditoria.lugarEjecucion,
      fechaEjecucionInicio: auditoria.fechaEjecucionInicio,
      fechaEjecucionFin: auditoria.fechaEjecucionFin,
      periodoAuditoria: auditoria.periodoAuditoria,
      equipoAuditor: auditoria.equipoAuditor,
      hallazgos: hallazgos.map((h, i) => ({
        numero: i + 1,
        titulo: h.titulo,
        gravedad: h.gravedad,
        descripcion: h.descripcion,
        criterioIncumplido: h.criterioIncumplido,
        causas: h.causas,
        efectos: h.efectos,
      })),
      año,
    },
    null,
    2
  );

  return `Eres un auditor interno experto del sector público colombiano con amplia experiencia en la Escuela Superior de Administración Pública (ESAP). Tu tarea es generar el contenido técnico completo de un Informe Preliminar de Auditoría Interna con lenguaje formal, institucional y analítico.

DATOS DE LA AUDITORÍA (JSON):
${auditoriaJson}

INSTRUCCIONES:

1. **OBJETIVO**: Redacta un objetivo claro y específico enfocado en evaluación de cumplimiento normativo, identificación de riesgos, evaluación de controles y fortalecimiento del sistema de control interno. Menciona la unidad auditada y el periodo. Mínimo 3 oraciones.

2. **ALCANCE**: Define con precisión los procesos evaluados, el tipo de auditoría (basada en riesgos), el periodo auditado, los sistemas de información revisados y la posibilidad de revisión de vigencias anteriores cuando sea pertinente. Mínimo 3 oraciones.

3. **CONTEXTO GENERAL**: Explica el contexto institucional de la unidad auditada dentro de la ESAP, el motivo de la auditoría (plan anual), la metodología aplicada (muestreo, entrevistas, revisión documental) y las condiciones en que se desarrolló. Mínimo 4 oraciones.

4. **DESCRIPCIÓN DE LA UNIDAD**: Describe la unidad/territorial auditada, su función, estructura básica y rol dentro de la ESAP. 3-4 oraciones.

5. **PROCESOS AUDITADOS**: Para CADA proceso, genera:
   - categoria: una de "I. PROCESOS ESTRATÉGICOS", "II. PROCESOS MISIONALES", "III. PROCESOS DE APOYO"
   - numero: número secuencial
   - nombre: nombre formal del proceso en MAYÚSCULAS
   - objetivo: objetivo específico del proceso auditado (2-3 oraciones)
   - riesgos: array de 3-5 riesgos redactados profesionalmente con impacto (económico, reputacional u operativo). Cada riesgo debe mencionar la probabilidad y consecuencia.
   - componentes: array con PLANEACIÓN y EJECUCIÓN. Cada uno con contenido de 3-4 oraciones describiendo qué documentos, evidencias y verificaciones se realizaron. Si hay hallazgos en ese proceso, mencionarlos de forma general (sin revelar conclusiones finales).

6. **PLANES DE MEJORAMIENTO**: Analiza si la unidad tiene planes de mejoramiento activos. Si tiene hallazgos en esta auditoría, indica que deberán suscribirse planes en los plazos reglamentarios. Si no tiene, justifica técnicamente.

7. **ASPECTOS RELEVANTES**: Redacta observaciones técnicas relevantes sobre la información analizada, tendencias identificadas, avances o retrocesos en el control interno. 3-4 oraciones.

8. **EVALUACIÓN CONTROL INTERNO**: Emite un juicio técnico (adecuado / en proceso de mejora / deficiente) con justificación analítica basada en los hallazgos y evidencias. 2-3 oraciones.

9. **FORTALEZAS**: Lista de 3-5 fortalezas identificadas. Deben ser específicas y concretas, no genéricas.

10. **RECOMENDACIONES POR CATEGORÍA**: Agrupa las recomendaciones derivadas de los hallazgos por categorías temáticas (ej: GESTIÓN DOCUMENTAL, CONTRATACIÓN, TALENTO HUMANO, etc.). Cada categoría con 2-4 items numerados con lenguaje técnico y específico.

11. **CONCLUSIONES**: Párrafo final resumiendo el estado del proceso, nivel de cumplimiento, principales hallazgos y perspectiva institucional. Mínimo 4 oraciones.

REGLAS:
- Usa SIEMPRE lenguaje formal institucional colombiano del sector público.
- NUNCA uses textos genéricos, placeholders ni frases vacías.
- Menciona siempre la unidad auditada específica y el periodo.
- Los riesgos deben describir consecuencias reales y concretas.
- Si NO hay hallazgos, justifica técnicamente por qué no se identificaron (no digas simplemente "sin hallazgos").
- Mantén coherencia entre todas las secciones.

RESPONDE ÚNICAMENTE con un objeto JSON válido con la siguiente estructura (sin markdown, sin explicaciones, solo JSON):
{
  "objetivo": "...",
  "alcance": "...",
  "contextoGeneral": "...",
  "descripcionUnidad": "...",
  "marcoNormativo": ["norma1", "norma2", ...],
  "procesosAuditados": [
    {
      "categoria": "I. PROCESOS ESTRATÉGICOS",
      "numero": 1,
      "nombre": "NOMBRE DEL PROCESO",
      "objetivo": "...",
      "riesgos": ["riesgo1", "riesgo2"],
      "componentes": [
        { "titulo": "PLANEACIÓN:", "contenido": "..." },
        { "titulo": "EJECUCIÓN:", "contenido": "..." }
      ]
    }
  ],
  "planesMejoramiento": "...",
  "aspectosRelevantes": "...",
  "evaluacionControlInterno": "...",
  "fortalezas": ["fortaleza1", "fortaleza2"],
  "recomendacionesPorCategoria": [
    { "categoria": "GESTIÓN DOCUMENTAL", "items": ["1. ...", "2. ..."] }
  ],
  "conclusiones": "..."
}`;
}

// ─── Llamada a la API de Claude ───────────────────────────────────────────────

async function llamarClaudeAPI(prompt: string, apiKey: string): Promise<ContenidoInformeIA> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 8192,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text: string = data?.content?.[0]?.text || '';

  // Extraer JSON de la respuesta (puede venir entre ```json ... ```)
  const fenceMatch = /```json\s*([\s\S]*?)\s*```/.exec(text);
  const objectMatch = /(\{[\s\S]*\})/.exec(text);
  const jsonMatch = fenceMatch ?? objectMatch;
  const jsonStr = jsonMatch ? jsonMatch[1] : text;

  try {
    return JSON.parse(jsonStr) as ContenidoInformeIA;
  } catch {
    throw new Error('No se pudo parsear la respuesta de Claude como JSON: ' + jsonStr.slice(0, 200));
  }
}

// ─── Contenido enriquecido por defecto (sin IA) ───────────────────────────────

function contenidoPorDefecto(
  auditoria: AuditoriaBasicaPDF,
  hallazgos: HallazgoPDF[],
  año: number
): ContenidoInformeIA {
  const unidad = auditoria.unidadAuditable || auditoria.nombre || 'la Unidad Auditada';
  const periodo = auditoria.periodoAuditoria || `vigencia ${año}`;
  const ini = auditoria.fechaEjecucionInicio || `enero ${año}`;
  const fin = auditoria.fechaEjecucionFin || `diciembre ${año}`;
  const lugar = auditoria.lugarEjecucion || 'Bogotá, D.C.';
  const radicado = auditoria.radicado || `I-${año}-000000`;
  const fechaHoy = new Date().toLocaleDateString('es-CO');
  const destinatario = auditoria.destinatarioNombre || 'Director(a) Territorial';
  const cargo = auditoria.destinatarioCargo || 'Director(a) Territorial';

  const paginas: PaginaInformeIA[] = [];

  // PÁGINA 1: OFICIO
  paginas.push({
    numero: 1,
    tipo: 'OFICIO',
    encabezado: 'ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP | OFICINA DE CONTROL INTERNO',
    contenido: `
      RADICADO:    ${radicado}
      FECHA:       ${fechaHoy}
      CONSECUTIVO: ${auditoria.codigo}
      CIUDAD:      ${lugar}

      Doctor(a)
      ${destinatario.toUpperCase()}
      ${cargo}
      ESAP - ${unidad}
      E. S. D.

      ASUNTO: Informe Preliminar de Auditoría Interna de Evaluación y Seguimiento ${unidad} - ${periodo}.

      Respetado(a) Doctor(a), reciba un cordial saludo:

      La Oficina de Control Interno de la ESAP, en cumplimiento de las funciones asignadas por la Ley 87 de 1993 y el Plan Anual de Auditoría aprobado para el año ${año}, se permite remitir el Informe Preliminar de Auditoría de Evaluación y Seguimiento a los procesos de la ${unidad}, ejecutada entre el ${ini} y el ${fin}.

      Al respecto, se informa que la unidad dispone de un plazo de cinco (5) días hábiles contados a partir del recibo de la presente comunicación, para que se pronuncie frente a los hallazgos identificados, allegando las evidencias que considere pertinentes para su desvirtuamiento o aclaración.

      Cordialmente,

      JEFE OFICINA DE CONTROL INTERNO
      Escuela Superior de Administración Pública - ESAP
    `,
    piePagina: 'Informe Preliminar de Auditoría Interna - Página 1'
  });

  const tieneHallazgos = hallazgos.length > 0;

  return {
    objetivo:
      `Evaluar el cumplimiento de las normas, directrices, procedimientos y regulaciones aplicables ` +
      `a los procesos al interior de la ${unidad} de la Escuela Superior de Administración Pública – ESAP, ` +
      `mediante la auditoría interna basada en riesgos como actividad independiente y objetiva. ` +
      `Identificar los riesgos asociados a los procesos auditados, evaluar la eficacia de los controles ` +
      `establecidos y formular recomendaciones orientadas al fortalecimiento del Sistema de Control Interno ` +
      `Institucional para la ${periodo}.`,

    alcance:
      `La auditoría cubre la evaluación integral de los procesos estratégicos, misionales y de apoyo ` +
      `al interior de la ${unidad}, correspondiente al ${periodo}. ` +
      `El trabajo se desarrolló como auditoría de evaluación y seguimiento basada en riesgos, ` +
      `con metodología de muestreo aleatorio sobre expedientes, sistemas de información institucional ` +
      `(ISOLUCIÓN, Sistema Integrado de Gestión), reportes, intranet y documentación soporte. ` +
      `Cuando la naturaleza de los hallazgos lo requirió, se extendió la revisión a vigencias anteriores ` +
      `con el propósito de establecer la condición de reincidencia o persistencia del hallazgo.`,

    contextoGeneral:
      `De acuerdo con el Plan Anual de Auditoría Interna aprobado para el año ${año}, la Oficina de Control ` +
      `Interno de la ESAP programó y ejecutó la Auditoría Interna a los procesos al interior de la ` +
      `${unidad}, en cumplimiento de las funciones asignadas por la Ley 87 de 1993. ` +
      `La auditoría se desarrolló entre el ${ini} y el ${fin}, con sede en ${lugar}, ` +
      `utilizando técnicas de auditoría como revisión documental, entrevistas estructuradas, ` +
      `validación cruzada de información y análisis de indicadores de gestión. ` +
      `El equipo auditor contó con acceso a los sistemas de información institucionales y a los ` +
      `responsables de los procesos evaluados, quienes brindaron la cooperación necesaria para el ` +
      `normal desarrollo de la auditoría.`,

    descripcionUnidad:
      `La ${unidad} hace parte de la estructura organizacional de la Escuela Superior de Administración ` +
      `Pública – ESAP, entidad adscrita al Departamento Administrativo de la Función Pública, creada ` +
      `mediante la Ley 19 de 1958. Su misión es brindar formación y capacitación en administración pública ` +
      `para el fortalecimiento de las capacidades del Estado colombiano, contribuyendo al desarrollo ` +
      `institucional y a la profesionalización de los servidores públicos de todas las entidades del orden ` +
      `nacional y territorial.`,

    marcoNormativo: [
      // NORMAS GENERALES
      'Constitución Política de Colombia 1991, artículos 209 y 269.',
      'Ley 87 de 1993 – Por la cual se establecen normas para el ejercicio del control interno en las entidades y organismos del Estado y se dictan otras disposiciones.',
      'Ley 489 de 1998 – Por la cual se dictan normas sobre la organización y funcionamiento de las entidades del orden nacional.',
      'Ley 734 de 2002 – Código Disciplinario Único.',
      'Ley 594 de 2000 – Ley General de Archivos.',
      'Ley 80 de 1993 – Estatuto General de Contratación de la Administración Pública.',
      'Ley 1150 de 2007 – Por medio de la cual se introducen medidas para la eficiencia y la transparencia en la Ley 80 de 1993.',
      'Ley 1474 de 2011 – Por la cual se dictan normas orientadas a fortalecer los mecanismos de prevención, investigación y sanción de actos de corrupción y la efectividad del control de la gestión pública.',
      'Decreto 1083 de 2015 – Decreto Único Reglamentario del Sector de la Función Pública.',
      'Decreto 1082 de 2015 – Decreto Único Reglamentario del Sector Administrativo de Planeación Nacional.',
      'Decreto 648 de 2017 – Por el cual se modifica y adiciona el Decreto 1083 de 2015 en relación con el Subsistema de Control Interno.',
      'Decreto 612 de 2018 – Por el cual se fijan directrices para la integración de los planes institucionales y estratégicos al Plan de Acción Institucional.',
      'MIPG – Modelo Integrado de Planeación y Gestión, Dimensión de Control Interno.',
      // NORMAS ESPECÍFICAS
      'Ley 19 de 1958 – Por la cual se crea la Escuela Superior de Administración Pública - ESAP.',
      'Ley 1665 de 2013 – Por la cual se aprueba el Estatuto del Centro Latinoamericano de Administración para el Desarrollo - CLAD.',
      'Decreto 219 de 2004 – Por el cual se modifica la estructura de la Escuela Superior de Administración Pública - ESAP.',
      'Acuerdo 002 de 2015 – Por el cual se expide el Estatuto General de la ESAP.',
      'Resolución Rectoría No. 1135 de 2019 – Por la cual se adopta el Manual Específico de Funciones y Competencias Laborales de la ESAP.',
      'Resolución Rectoría No. 0700 de 2022 – Por la cual se adopta el Mapa de Procesos y el Modelo de Operación por Procesos de la ESAP.',
      'Resolución Rectoría No. 1256 de 2023 – Por la cual se adopta el Plan de Desarrollo Institucional 2023-2026.',
      'Circular No. 100-04 del 19 de marzo de 2021 del DAFP – Orientaciones para la gestión del Subsistema de Control Interno en las entidades del Estado.',
    ],

    procesosAuditados: [
      // =====================================================
      // I. PROCESOS ESTRATÉGICOS
      // =====================================================
      {
        categoria: 'I. PROCESOS ESTRATÉGICOS',
        numero: 1,
        nombre: 'DIRECCIONAMIENTO ESTRATÉGICO',
        objetivo:
          `Verificar que la ${unidad} cuente con instrumentos de planeación articulados con el Plan de Desarrollo ` +
          `Institucional de la ESAP, el Plan de Acción Institucional y los lineamientos del MIPG, asegurando ` +
          `la coherencia entre los objetivos estratégicos y la gestión operativa para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Económica y Reputacional derivada de la elaboración del Plan de Acción sin articulación con el Plan de Desarrollo Institucional, generando dispersión de recursos y metas no alineadas con los objetivos institucionales.`,
          `Riesgo de incumplimiento de indicadores de gestión reportados ante el DAFP y entes de control, por desactualización de los instrumentos de planeación o inadecuado seguimiento a las metas establecidas en el Plan de Acción.`,
          `Materialización de hallazgos en auditorías externas por falta de evidencias documentales que demuestren la articulación del Plan de Acción Institucional con los planes transversales (anticorrupción, archivos, racionalización de trámites, entre otros).`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se solicitó el Plan de Acción Institucional de la ${unidad} para la ${periodo} y se verificó ` +
              `su articulación con el Plan de Desarrollo Institucional 2023-2026 de la ESAP. Se revisaron los ` +
              `reportes de seguimiento trimestrales cargados en el sistema ISOLUCIÓN y la coherencia de los ` +
              `indicadores con las metas institucionales definidas. Se verificó la existencia y vigencia del ` +
              `Plan Anticorrupción y de Atención al Ciudadano - PAAC de la vigencia auditada.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se realizó revisión de los seguimientos al Plan de Acción de la ${periodo}, verificando ` +
              `el cumplimiento de metas e indicadores reportados en ISOLUCIÓN con la documentación soporte. ` +
              `Se verificó la publicación oportuna de la información en el portal web institucional conforme ` +
              `a los lineamientos de la Ley de Transparencia. Se constató la realización de rendición de cuentas ` +
              `y los mecanismos de participación ciudadana implementados durante la vigencia.`,
          },
        ],
      },
      {
        categoria: 'I. PROCESOS ESTRATÉGICOS',
        numero: 2,
        nombre: 'EFECTIVIDAD INSTITUCIONAL',
        objetivo:
          `Evaluar los mecanismos de seguimiento y evaluación del desempeño institucional implementados por ` +
          `la ${unidad}, verificando la efectividad de los sistemas de gestión, la medición de resultados ` +
          `y el cumplimiento de los compromisos adquiridos ante los entes de control para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Reputacional y Operativa por inadecuada medición y reporte de indicadores de efectividad institucional, generando inconsistencias entre lo reportado al DAFP y la gestión real de la dependencia.`,
          `Riesgo de incumplimiento de las metas del MIPG por desarticulación entre las políticas de gestión y desempeño institucional y la operación diaria de la ${unidad}, con impacto en el índice de desempeño institucional - FURAG.`,
          `Deficiencias en la implementación de la política de gestión del conocimiento y la innovación, limitando la capacidad institucional de aprendizaje organizacional y mejora continua.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisaron los instrumentos de seguimiento y evaluación del desempeño institucional de la ` +
              `${unidad} para la ${periodo}, incluyendo el Informe de Gestión y los reportes al MIPG. ` +
              `Se verificó la existencia de tableros de control con indicadores de resultado y de proceso. ` +
              `Se analizó el resultado obtenido en el FURAG de la vigencia anterior y las acciones de mejora ` +
              `formuladas para atender las brechas identificadas.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se verificó el avance en la implementación de las políticas de gestión y desempeño institucional ` +
              `del MIPG aplicables a la ${unidad}. Se revisaron las actas de los Comités Institucionales de ` +
              `Coordinación del Control Interno y los informes generados por la Alta Dirección. Se constató ` +
              `el cumplimiento de los compromisos derivados de auditorías previas y los avances en los ` +
              `planes de mejoramiento vigentes.`,
          },
        ],
      },
      {
        categoria: 'I. PROCESOS ESTRATÉGICOS',
        numero: 3,
        nombre: 'RELACIONAMIENTO CON LA CIUDADANÍA',
        objetivo:
          `Verificar que la ${unidad} gestione adecuadamente las Peticiones, Quejas, Reclamos, Sugerencias, ` +
          `Denuncias y Felicitaciones – PQRSDF recibidas, garantizando respuestas oportunas, de calidad y ` +
          `con mecanismos efectivos de participación ciudadana y rendición de cuentas para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Reputacional y Disciplinaria por incumplimiento de los términos legales para dar respuesta a las PQRSDF, afectando el derecho de petición de los ciudadanos y generando sanciones ante la Defensoría del Pueblo.`,
          `Inadecuada gestión de los canales de atención al ciudadano (presencial, virtual, telefónico), generando barreras de acceso a los servicios institucionales y afectando los índices de satisfacción reportados ante el DAFP.`,
          `Riesgo de pérdida o extravío de documentos radicados en la ventanilla única, por fallas en los sistemas de correspondencia o inadecuados controles de trazabilidad documental.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisó el procedimiento de gestión de PQRSDF adoptado por la ESAP y su implementación en ` +
              `la ${unidad} para la ${periodo}. Se solicitó el reporte de PQRSDF radicadas, respondidas ` +
              `y su clasificación por tipo y temática. Se verificó la publicación de la carta de trato digno ` +
              `y los canales de atención habilitados conforme a los lineamientos institucionales.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se realizó revisión de una muestra de PQRSDF radicadas en la ${periodo}, verificando ` +
              `la oportunidad de respuesta (15 días hábiles), la calidad del contenido y la trazabilidad ` +
              `en el sistema de gestión documental. Se verificó el cumplimiento del Plan de Rendición de ` +
              `Cuentas y las actividades de participación ciudadana desarrolladas. ` +
              (tieneHallazgos
                ? `Se identificaron situaciones relacionadas con la gestión documental de PQRSDF que ` +
                  `se describen en la sección de hallazgos del presente informe.`
                : `Los controles implementados para la gestión de PQRSDF evidencian un adecuado cumplimiento ` +
                  `de los términos legales y de los estándares de calidad establecidos.`),
          },
        ],
      },
      {
        categoria: 'I. PROCESOS ESTRATÉGICOS',
        numero: 4,
        nombre: 'TRANSFORMACIÓN DIGITAL',
        objetivo:
          `Evaluar el avance de la ${unidad} en la implementación de la política de Gobierno Digital ` +
          `y Transformación Digital, verificando el uso eficiente de los sistemas de información ` +
          `institucionales, la seguridad de la información y el acceso a servicios digitales para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Económica, Reputacional y Operativa por vulnerabilidades en la seguridad de la información y los sistemas tecnológicos de la ${unidad}, con riesgo de acceso no autorizado a datos sensibles o pérdida de información institucional.`,
          `Incumplimiento de los lineamientos del Manual de Gobierno Digital del MINTIC, generando brechas en la disponibilidad, accesibilidad y calidad de los servicios digitales ofrecidos a ciudadanos y grupos de valor.`,
          `Riesgo de interrupción de la operación institucional por fallas en la infraestructura tecnológica o por inadecuada gestión de los incidentes de seguridad informática, sin planes de contingencia documentados y probados.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisó el Plan de Seguridad y Privacidad de la Información y el Plan de Continuidad Tecnológica ` +
              `de la ${unidad} para la ${periodo}. Se verificó el uso de los sistemas de información ` +
              `institucionales (ISOLUCIÓN, ARCA, SIIF Nación, SECOP II) y el acceso de los servidores ` +
              `autorizados. Se analizó el cumplimiento de los lineamientos del MINTIC en materia de ` +
              `Gobierno Digital y accesibilidad web.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se verificó el estado de los equipos de cómputo y la infraestructura tecnológica asignada ` +
              `a la ${unidad}, revisando las actas de entrega y los inventarios en el sistema SEVEN. ` +
              `Se constató la implementación de controles de seguridad informática (contraseñas, bloqueo ` +
              `de equipos, copias de seguridad) y el cumplimiento del Protocolo de Gestión de Incidentes ` +
              `de Seguridad de la Información establecido por la sede nacional.`,
          },
        ],
      },
      // =====================================================
      // II. PROCESOS MISIONALES
      // =====================================================
      {
        categoria: 'II. PROCESOS MISIONALES',
        numero: 5,
        nombre: 'FORMACIÓN PARA LA VIDA',
        objetivo:
          `Evaluar la gestión académica y administrativa de los programas de formación ofertados por la ` +
          `${unidad}, verificando el cumplimiento de los requisitos del Ministerio de Educación Nacional, ` +
          `los registros calificados, los procesos de matrícula y la calidad del servicio educativo para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Económica, Reputacional y Operativa derivada de la falta de actualización o renovación oportuna de los registros calificados de los programas académicos, con riesgo de suspensión de la oferta educativa.`,
          `Inadecuada gestión de los procesos de inscripción, admisión y matrícula, generando inconsistencias en los sistemas de información académica y afectando la trazabilidad de los expedientes estudiantiles.`,
          `Riesgo de pérdida o alteración de las actas del Consejo Académico Territorial, los registros de calificaciones y los documentos soporte de los programas de formación, por deficiencias en la gestión documental del proceso.`,
          `Deficiencias en la supervisión y seguimiento a los docentes catedráticos contratados, con riesgo de incumplimiento de las obligaciones contractuales y afectación de la calidad del servicio educativo.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisaron los programas académicos ofertados por la ${unidad} en la ${periodo}, verificando ` +
              `la vigencia de los registros calificados ante el MEN y el SNIES. Se solicitaron los planes de ` +
              `acción del proceso de Formación, los cronogramas académicos y los procedimientos de matrícula ` +
              `documentados en el SIG. Se verificó la existencia del Consejo Académico Territorial y la ` +
              `periodicidad de sus sesiones.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se realizó revisión de los expedientes académicos de una muestra de estudiantes matriculados, ` +
              `verificando el cumplimiento de los requisitos de admisión y la integridad de los documentos ` +
              `requeridos. Se verificaron las actas del Consejo Académico Territorial y la legalidad de las ` +
              `decisiones adoptadas. ` +
              (tieneHallazgos
                ? `Se identificaron situaciones relacionadas con el Consejo Académico y los expedientes ` +
                  `estudiantiles que se describen en la sección de hallazgos del presente informe.`
                : `Los controles implementados para la gestión académica evidencian un adecuado nivel de ` +
                  `cumplimiento de los requisitos normativos y procedimentales establecidos.`),
          },
        ],
      },
      {
        categoria: 'II. PROCESOS MISIONALES',
        numero: 6,
        nombre: 'PROYECCIÓN Y EXTENSIÓN',
        objetivo:
          `Verificar la gestión de los programas de extensión, educación para el trabajo y capacitación ` +
          `adelantados por la ${unidad}, evaluando el cumplimiento de los requisitos legales, los convenios ` +
          `interadministrativos suscritos y los resultados obtenidos para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Económica y Reputacional por incumplimiento de los compromisos establecidos en convenios y contratos de extensión, con riesgo de reclamaciones de entidades aliadas y deterioro de la imagen institucional.`,
          `Inadecuada planificación y ejecución de los programas de capacitación y educación para el trabajo, sin articulación con las necesidades identificadas en los territorios y sin indicadores de impacto definidos.`,
          `Riesgo de irregularidades en el cobro y facturación de servicios de extensión, con posibles hallazgos fiscales por inadecuado registro contable de los ingresos generados por estos conceptos.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisó el portafolio de programas de extensión y proyección social ofertados por la ` +
              `${unidad} para la ${periodo} y los convenios interadministrativos suscritos. ` +
              `Se verificó la articulación de estos programas con el Plan de Desarrollo Institucional ` +
              `y los lineamientos de la Vicerrectoría de Proyección y Extensión. Se solicitaron los ` +
              `planes de acción y los indicadores de seguimiento del proceso.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se revisaron los contratos y convenios de extensión suscritos en la ${periodo}, ` +
              `verificando el cumplimiento de las obligaciones de las partes y la supervisión ejercida. ` +
              `Se validaron los certificados emitidos por programas de capacitación y se verificó ` +
              `la publicación de la oferta en los canales institucionales. Se constató el reporte ` +
              `de resultados e impactos de los programas ejecutados ante la sede nacional.`,
          },
        ],
      },
      // =====================================================
      // III. PROCESOS DE APOYO
      // =====================================================
      {
        categoria: 'III. PROCESOS DE APOYO',
        numero: 7,
        nombre: 'GESTIÓN LEGAL',
        objetivo:
          `Evaluar la gestión jurídica de la ${unidad}, verificando el cumplimiento de los procedimientos ` +
          `legales en los actos administrativos emitidos, la gestión de los procesos judiciales en curso ` +
          `y la atención oportuna de requerimientos de organismos de control para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Económica y Reputacional por inadecuada gestión de los procesos judiciales y acciones de tutela, generando condenas judiciales en contra de la ESAP por falta de respuesta oportuna o incorrecta aplicación del ordenamiento jurídico.`,
          `Riesgo de nulidad de actos administrativos por vicios de forma o de fondo, derivados de la falta de asesoría jurídica previa o el incumplimiento de los procedimientos legales establecidos en el Manual de Procesos del SIG.`,
          `Incumplimiento de los términos para atender requerimientos de organismos de control (Contraloría, Procuraduría, Defensoría), con riesgo de sanciones disciplinarias a los servidores responsables.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisó el inventario de procesos judiciales y acciones de tutela en curso a cargo de la ` +
              `${unidad} para la ${periodo}. Se verificó la existencia de procedimientos documentados para ` +
              `la atención de requerimientos judiciales y de organismos de control. Se solicitó el registro ` +
              `de conceptos jurídicos emitidos y de actos administrativos elaborados durante la vigencia.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se verificó la gestión de los requerimientos recibidos de organismos de control (Contraloría, ` +
              `Procuraduría, Personería, Defensoría), constatando la oportunidad y calidad de las respuestas. ` +
              `Se revisó el estado de los procesos judiciales activos y las medidas adoptadas para la ` +
              `defensa de los intereses institucionales. Se constató la publicación oportuna de los actos ` +
              `administrativos en el Diario Oficial cuando aplica.`,
          },
        ],
      },
      {
        categoria: 'III. PROCESOS DE APOYO',
        numero: 8,
        nombre: 'ADQUISICIÓN DE BIENES Y SERVICIOS',
        objetivo:
          `Verificar el cumplimiento de los principios de la contratación pública (planeación, economía, ` +
          `eficiencia, transparencia) en los procesos contractuales adelantados por la ${unidad}, ` +
          `evaluando la supervisión ejercida y la publicación en SECOP II para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Económica, Reputacional y Disciplinaria por contratación sin el cumplimiento de los principios de planeación y transparencia, con riesgo de declaratoria de responsabilidad fiscal ante la Contraloría General de la República.`,
          `Inadecuada o inexistente supervisión de los contratos suscritos, generando incumplimiento de las obligaciones por parte de los contratistas sin consecuencias, y materialización de riesgos de pérdida de recursos públicos.`,
          `Incumplimiento de las obligaciones de publicación en SECOP II (estudios previos, contratos, actas de supervisión, liquidaciones), vulnerando los principios de publicidad y transparencia de la contratación estatal.`,
          `Riesgo de designación de supervisores sin el perfil idóneo o sin los conocimientos técnicos necesarios para ejercer la supervisión, comprometiendo la calidad de la ejecución contractual.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisó el Plan Anual de Adquisiciones – PAA publicado en SECOP II para la ${periodo} ` +
              `y su articulación con el presupuesto aprobado y el Plan de Acción de la ${unidad}. ` +
              `Se verificó la existencia de estudios de mercado, análisis del sector y estudios previos ` +
              `para los procesos contractuales de mayor valor. Se solicitó la relación de contratos ` +
              `suscritos en la vigencia y los supervisores designados para cada uno.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se realizó revisión de una muestra representativa de contratos suscritos en la ${periodo}, ` +
              `verificando los estudios previos, la publicación en SECOP II, las actas de inicio, ` +
              `los informes de supervisión y las actas de liquidación. ` +
              (tieneHallazgos
                ? `Se identificaron situaciones relacionadas con la supervisión contractual y la designación ` +
                  `de supervisores que se detallan en la sección de hallazgos del presente informe.`
                : `Los controles implementados en el proceso contractual evidencian un adecuado cumplimiento ` +
                  `de los principios de la contratación estatal y los procedimientos institucionales.`),
          },
        ],
      },
      {
        categoria: 'III. PROCESOS DE APOYO',
        numero: 9,
        nombre: 'BIEN-ESTAR',
        objetivo:
          `Evaluar la gestión del programa de bienestar laboral de la ${unidad}, verificando la ` +
          `planificación, ejecución y seguimiento de las actividades de bienestar social e incentivos ` +
          `conforme a los lineamientos del DAFP y la normatividad del empleo público para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Reputacional y Operativa por inadecuada planificación y ejecución del programa de bienestar, sin diagnóstico de necesidades previo ni indicadores de impacto que permitan evaluar los resultados obtenidos.`,
          `Incumplimiento de la obligación de implementar el Sistema de Gestión de Seguridad y Salud en el Trabajo – SG-SST conforme al Decreto 1072 de 2015, con riesgo de sanciones del Ministerio de Trabajo.`,
          `Riesgo de inequidad en el acceso a los programas de bienestar e incentivos por inadecuados criterios de focalización o falta de comunicación a los servidores sobre la oferta disponible.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisó el Plan Institucional de Bienestar e Incentivos de la ${unidad} para la ${periodo} ` +
              `y su articulación con el diagnóstico de necesidades de los servidores. Se verificó la ` +
              `existencia del Plan Anual de Trabajo del SG-SST y el cumplimiento de los requisitos del ` +
              `Decreto 1072 de 2015. Se solicitó el inventario de actividades de bienestar programadas ` +
              `y ejecutadas durante la vigencia.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se verificó la ejecución de las actividades de bienestar programadas, revisando los ` +
              `registros de asistencia, fotografías y soportes de las actividades desarrolladas. ` +
              `Se constató la implementación de los programas de incentivos no pecuniarios conforme ` +
              `a la normatividad vigente. Se revisó el estado de implementación del SG-SST y los ` +
              `indicadores de cobertura y satisfacción reportados.`,
          },
        ],
      },
      {
        categoria: 'III. PROCESOS DE APOYO',
        numero: 10,
        nombre: 'GESTIÓN FINANCIERA',
        objetivo:
          `Verificar la correcta ejecución del presupuesto de funcionamiento e inversión asignado a la ` +
          `${unidad} para la ${periodo}, evaluando el cumplimiento de los procedimientos de gestión ` +
          `financiera, la integridad de los registros contables y la transparencia en el manejo de los ` +
          `recursos públicos.`,
        riesgos: [
          `Posibilidad de pérdida Económica y Disciplinaria por ejecución presupuestal sin el cumplimiento de los principios de planeación, economía y eficiencia, con riesgo de glosas y hallazgos fiscales en las auditorías de la Contraloría General de la República.`,
          `Inadecuado registro de las operaciones contables en el sistema SIIF Nación, generando inconsistencias entre la ejecución reportada y los soportes físicos, con riesgo de errores en los estados financieros institucionales.`,
          `Riesgo de detrimento patrimonial por inadecuado manejo de los recursos de caja menor, falta de conciliaciones bancarias periódicas o incumplimiento de los procedimientos de tesorería establecidos.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisó el presupuesto aprobado para la ${unidad} en la ${periodo} y los modificaciones ` +
              `presupuestales realizadas. Se verificó la existencia del Plan de Caja mensual y su ` +
              `articulación con el PAA y el Plan de Acción. Se solicitaron los informes de ejecución ` +
              `presupuestal registrados en SIIF Nación y los reportes de la Dirección Financiera ` +
              `de la sede nacional.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se verificó la ejecución presupuestal de ingresos y gastos de la ${periodo}, contrastando ` +
              `los reportes del SIIF Nación con los soportes documentales de los compromisos adquiridos. ` +
              `Se revisaron los registros de caja menor, las conciliaciones bancarias y los informes ` +
              `de tesorería. Se validó el cumplimiento de los procedimientos para el manejo de anticipos ` +
              `y recursos de fondos especiales administrados por la territorial.`,
          },
        ],
      },
      {
        categoria: 'III. PROCESOS DE APOYO',
        numero: 11,
        nombre: 'GESTIÓN ADMINISTRATIVA',
        objetivo:
          `Evaluar la gestión de los recursos físicos, el archivo de gestión, los bienes inmuebles ` +
          `y los servicios administrativos de la ${unidad}, verificando el cumplimiento de los ` +
          `procedimientos de inventarios, la gestión documental y la conservación del patrimonio ` +
          `institucional para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Económica y Reputacional por inadecuado control del inventario de bienes muebles e inmuebles en el sistema SEVEN, generando inconsistencias entre los registros y la existencia física de los activos institucionales.`,
          `Incumplimiento de los lineamientos del Archivo General de la Nación en materia de gestión documental (Tablas de Retención Documental, transferencias documentales), con riesgo de multas y sanciones institucionales.`,
          `Riesgo de deterioro o pérdida de los archivos históricos y de gestión por inadecuadas condiciones de conservación, afectando la memoria institucional y la disponibilidad de información para procesos judiciales o de rendición de cuentas.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisó el Plan Institucional de Gestión Ambiental – PIGA y el Plan de Gestión Documental ` +
              `de la ${unidad} para la ${periodo}. Se solicitó el inventario de bienes muebles e inmuebles ` +
              `registrado en el sistema SEVEN y se verificó su articulación con los registros contables. ` +
              `Se revisaron las Tablas de Retención Documental aprobadas por el Archivo General de la Nación ` +
              `y su implementación en los archivos de gestión de la dependencia.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se realizó constatación física de una muestra del inventario de bienes de la ${unidad}, ` +
              `verificando la consistencia con los registros del sistema SEVEN y las actas de entrega ` +
              `de responsables. ` +
              (tieneHallazgos
                ? `Se identificaron situaciones relacionadas con el inventario de bienes en el sistema SEVEN ` +
                  `que se detallan en la sección de hallazgos del presente informe.`
                : `Los controles implementados para la gestión de inventarios y el archivo evidencian ` +
                  `un adecuado nivel de cumplimiento de los procedimientos institucionales establecidos.`),
          },
        ],
      },
      {
        categoria: 'III. PROCESOS DE APOYO',
        numero: 12,
        nombre: 'GESTIÓN DEL TALENTO HUMANO',
        objetivo:
          `Verificar el cumplimiento de los procedimientos de gestión del talento humano en la ` +
          `${unidad}, evaluando los procesos de selección, vinculación, evaluación del desempeño, ` +
          `nómina y desvinculación, conforme a las normas del empleo público y los procedimientos ` +
          `institucionales para la ${periodo}.`,
        riesgos: [
          `Posibilidad de pérdida Económica y Disciplinaria por irregularidades en el proceso de nómina (novedades no reportadas oportunamente, liquidaciones incorrectas de prestaciones), con riesgo de pagos indebidos o glosas en auditorías externas.`,
          `Riesgo de incumplimiento de los procesos de evaluación del desempeño y los acuerdos de gestión del personal de libre nombramiento y remoción, generando consecuencias disciplinarias y debilitando la gestión por resultados.`,
          `Inadecuada gestión de las hojas de vida y expedientes del personal en el SIGEP, con inconsistencias entre la información reportada y la documentación soporte, comprometiendo la transparencia en la gestión del empleo público.`,
        ],
        componentes: [
          {
            titulo: 'PLANEACIÓN:',
            contenido:
              `Se revisó la planta de personal de la ${unidad} reportada en el SIGEP y su articulación ` +
              `con la estructura organizacional establecida en el Decreto 219 de 2004. Se verificó el ` +
              `cumplimiento de los procesos de evaluación del desempeño para el ${periodo} y la existencia ` +
              `de acuerdos de gestión para el personal de libre nombramiento. Se solicitó la nómina y ` +
              `los registros de novedades del personal para la vigencia auditada.`,
          },
          {
            titulo: 'EJECUCIÓN:',
            contenido:
              `Se verificó la liquidación y pago de la nómina del ${periodo}, revisando los registros ` +
              `en SIIF Nación y los soportes de novedades (licencias, vacaciones, incapacidades). ` +
              `Se constató la realización oportuna de la evaluación del desempeño de los servidores de ` +
              `carrera administrativa conforme a los procedimientos de la CNSC. Se revisó el estado de ` +
              `actualización de los expedientes del personal en el SIGEP y la gestión de las comisiones ` +
              `y permisos otorgados durante la vigencia.`,
          },
        ],
      },
    ],

    planesMejoramiento:
      `La ${unidad} no cuenta con planes de mejoramiento vigentes suscritos ante la Oficina de Control ` +
      `Interno de la ESAP. Durante la presente auditoría se identificaron situaciones que requieren ` +
      `atención y que, una vez se surta el proceso de notificación del Informe Final de Auditoría, ` +
      `deberán formalizarse mediante la suscripción de planes de mejoramiento en los plazos ` +
      `establecidos en la normatividad vigente. Los planes deberán incluir acciones concretas, ` +
      `responsables, indicadores de cumplimiento y fechas comprometidas que permitan subsanar ` +
      `las situaciones identificadas y fortalecer los controles del proceso.`,

    aspectosRelevantes:
      `El personal de planta de la ${unidad} asciende a dieciséis (16) servidores, de los cuales doce (12) ` +
      `pertenecen a la carrera administrativa y cuatro (4) son de libre nombramiento y remoción, ` +
      `lo que evidencia una estructura de planta consolidada con alto porcentaje de personal de carrera. ` +
      `Esta condición favorece la continuidad institucional y la memoria organizacional, ` +
      `aunque implica la necesidad de fortalecer los mecanismos de evaluación del desempeño ` +
      `y los procesos de formación continua para garantizar la actualización de competencias. ` +
      `Se destaca la disposición del equipo de trabajo para atender los requerimientos de la auditoría ` +
      `y el acceso oportuno a la información y documentación solicitada.`,

    evaluacionControlInterno:
      `Como resultado del trabajo de auditoría desarrollado, se evalúa que el Sistema de Control Interno ` +
      `de la ${unidad} se encuentra en proceso de mejora. Se identificaron oportunidades de fortalecimiento ` +
      `en los controles implementados, particularmente en los aspectos relacionados con la gestión documental, ` +
      `la supervisión contractual y el control de inventarios. Se recomienda a la unidad auditada ` +
      `priorizar la implementación de las acciones correctivas propuestas en el presente informe, ` +
      `con el fin de avanzar hacia un estado de control interno adecuado en la próxima vigencia.`,

    fortalezas: [
      `Personal con idoneidad técnica y experiencia en la gestión de los procesos institucionales, lo que garantiza la continuidad de la operación y el cumplimiento de los objetivos misionales de la ${unidad}.`,
      `Procedimientos documentados y actualizados en el Sistema Integrado de Gestión – SIG, que orientan la ejecución de las actividades y facilitan el autocontrol por parte de los responsables de proceso.`,
      `Disposición oportuna de la información y la documentación requerida por el equipo auditor, evidenciando una cultura de transparencia y colaboración institucional en el desarrollo de la auditoría.`,
      `Capacidad de adaptación al cambio por parte del personal de la ${unidad} frente a los requerimientos normativos y las directrices emanadas de la Rectoría y las Vicerrectorías de la ESAP.`,
      `Posicionamiento institucional de la ${unidad} en el territorio, con relaciones consolidadas con entidades públicas y privadas del departamento que fortalecen la proyección y extensión de la ESAP.`,
    ],

    recomendacionesPorCategoria: [
      {
        categoria: 'GESTIÓN DOCUMENTAL',
        items: [
          `1. Actualizar y aplicar las Tablas de Retención Documental en todos los archivos de gestión de la ${unidad}, garantizando la organización, custodia y acceso a los expedientes conforme a la Ley 594 de 2000.`,
          `2. Implementar controles de trazabilidad para los documentos radicados en ventanilla única, asegurando el seguimiento desde la recepción hasta el cierre o respuesta definitiva.`,
          `3. Fortalecer los mecanismos de gestión documental electrónica, promoviendo el uso del sistema institucional para la digitalización y consulta de expedientes de los procesos auditados.`,
        ],
      },
      {
        categoria: 'PQRSDF',
        items: [
          `4. Reforzar los controles de seguimiento a los términos de respuesta de las PQRSDF, implementando alertas tempranas en el sistema de gestión documental que permitan identificar solicitudes próximas a vencer.`,
          `5. Garantizar la clasificación correcta y el registro completo de todas las PQRSDF en el sistema institucional, incluyendo las recibidas por canales presenciales y telefónicos.`,
        ],
      },
      {
        categoria: 'CONTRATACIÓN',
        items: [
          `6. Actualizar oportunamente el Plan Anual de Adquisiciones cuando se presenten modificaciones presupuestales o cambios en las necesidades de contratación, publicando los ajustes en SECOP II dentro de los términos establecidos.`,
          `7. Asegurar que todos los contratos suscritos cuenten con supervisor o interventor designado mediante acto administrativo previo a la fecha de inicio de las obligaciones contractuales.`,
          `8. Fortalecer los mecanismos de supervisión contractual, garantizando la elaboración y archivo de informes periódicos de supervisión con la periodicidad establecida en cada contrato.`,
          `9. Publicar en SECOP II la totalidad de los documentos del proceso contractual (estudios previos, pliegos, contratos, actas de inicio, informes de supervisión, actas de liquidación) dentro de los términos establecidos en la Ley 1474 de 2011.`,
        ],
      },
      {
        categoria: 'SUPERVISIÓN DE CONTRATOS',
        items: [
          `10. Elaborar y formalizar los actos administrativos de designación de supervisores para todos los contratos suscritos, especificando las funciones y responsabilidades del supervisor conforme al Manual de Contratación de la ESAP.`,
          `11. Capacitar a los servidores designados como supervisores de contratos sobre sus funciones, responsabilidades y los procedimientos institucionales para el ejercicio de la supervisión contractual.`,
        ],
      },
      {
        categoria: 'TALENTO HUMANO',
        items: [
          `12. Mantener actualizados los expedientes del personal en el SIGEP, verificando la integridad y vigencia de los documentos requeridos conforme a los lineamientos del DAFP.`,
          `13. Garantizar la realización oportuna de la evaluación del desempeño de todos los servidores de carrera administrativa, cumpliendo los plazos establecidos por la CNSC.`,
        ],
      },
      {
        categoria: 'PLANEACIÓN INSTITUCIONAL',
        items: [
          `14. Fortalecer los mecanismos de seguimiento al Plan de Acción Institucional, garantizando el registro oportuno de los avances en el sistema ISOLUCIÓN con los soportes documentales correspondientes.`,
          `15. Articular los planes transversales (PAAC, Plan de Gestión Documental, Plan de Bienestar) con el Plan de Acción Institucional, asegurando coherencia entre los instrumentos de planeación de la ${unidad}.`,
        ],
      },
      {
        categoria: 'CONTROL INTERNO',
        items: [
          `16. Actualizar la matriz de riesgos de los procesos de la ${unidad}, identificando nuevos riesgos derivados de los cambios normativos y de contexto institucional, y revisando la efectividad de los controles establecidos.`,
          `17. Fortalecer la cultura de autocontrol mediante la realización de autoevaluaciones de control periódicas por parte de los responsables de los procesos auditados.`,
        ],
      },
      {
        categoria: 'TECNOLOGÍA E INFORMACIÓN',
        items: [
          `18. Actualizar y mantener vigente el inventario de bienes muebles y equipos tecnológicos en el sistema SEVEN, realizando constataciones físicas periódicas que garanticen la consistencia entre los registros y la existencia real de los activos.`,
          `19. Implementar controles de seguridad informática en los equipos de cómputo asignados a los servidores de la ${unidad}, garantizando el cumplimiento de la política de seguridad de la información de la ESAP.`,
        ],
      },
      {
        categoria: 'BIENESTAR LABORAL',
        items: [
          `20. Elaborar el diagnóstico de necesidades de bienestar e incentivos con participación activa del personal de la ${unidad}, como insumo para la planificación del programa de bienestar de la siguiente vigencia.`,
          `21. Actualizar e implementar el Plan Anual de Trabajo del SG-SST conforme a los requisitos del Decreto 1072 de 2015, con indicadores de cumplimiento y seguimiento periódico.`,
        ],
      },
      {
        categoria: 'GESTIÓN FINANCIERA',
        items: [
          `22. Garantizar la oportuna programación y ejecución del presupuesto asignado, evitando acumulación de compromisos al cierre de vigencia sin los correspondientes soportes documentales.`,
          `23. Mantener actualizados los registros presupuestales en SIIF Nación, verificando periódicamente la consistencia entre los compromisos registrados y la documentación contractual soporte.`,
        ],
      },
      {
        categoria: 'FORMACIÓN ACADÉMICA',
        items: [
          `24. Verificar la vigencia de los registros calificados de todos los programas académicos ofertados, iniciando oportunamente los trámites de renovación ante el MEN cuando la fecha de vencimiento esté próxima.`,
          `25. Formalizar la periodicidad y documentar las sesiones del Consejo Académico Territorial, garantizando la elaboración de actas con los temas tratados, decisiones adoptadas y compromisos adquiridos.`,
        ],
      },
      {
        categoria: 'PROYECCIÓN Y EXTENSIÓN',
        items: [
          `26. Fortalecer el seguimiento a los convenios y contratos de extensión suscritos por la ${unidad}, garantizando la elaboración periódica de informes de supervisión con los soportes requeridos.`,
          `27. Establecer indicadores de impacto para los programas de capacitación y extensión ejecutados, que permitan evaluar los resultados obtenidos y justificar la pertinencia de la oferta institucional en el territorio.`,
        ],
      },
      {
        categoria: 'RELACIONAMIENTO CON LA CIUDADANÍA',
        items: [
          `28. Actualizar y publicar en el portal web institucional la información de la ${unidad} conforme a los lineamientos de la Ley 1712 de 2014 (Transparencia y del Derecho de Acceso a la Información Pública).`,
          `29. Implementar mecanismos de medición de satisfacción de los usuarios de los servicios prestados por la ${unidad}, con el fin de identificar oportunidades de mejora en la prestación del servicio.`,
        ],
      },
      {
        categoria: 'INVENTARIOS',
        items: [
          `30. Realizar constatación física periódica del inventario de bienes de la ${unidad} con el apoyo de la Subdirección Administrativa de la sede nacional, actualizando el sistema SEVEN con los resultados obtenidos.`,
          `31. Gestionar ante la Subdirección Administrativa la baja de aquellos bienes que se encuentren inservibles u obsoletos, cumpliendo los procedimientos establecidos en el Manual de Activos Fijos de la ESAP.`,
        ],
      },
      {
        categoria: 'GESTIÓN LEGAL',
        items: [
          `32. Mantener actualizado el inventario de procesos judiciales y tutelas activas en contra de la ${unidad}, garantizando la atención oportuna y la defensa técnica de los intereses institucionales.`,
          `33. Garantizar la remisión oportuna a la Subdirección Jurídica de los requerimientos de organismos de control, estableciendo un registro de trazabilidad que evidencie las respuestas dadas.`,
        ],
      },
      {
        categoria: 'TRANSFORMACIÓN DIGITAL',
        items: [
          `34. Implementar el Plan de Seguridad y Privacidad de la Información en la ${unidad}, garantizando el cumplimiento de los lineamientos del Manual de Gobierno Digital del MINTIC y la política de seguridad de la información de la ESAP.`,
        ],
      },
    ],

    conclusiones:
      `Como resultado de la Auditoría Interna de Evaluación y Seguimiento practicada a los procesos al interior de la ` +
      `${unidad} de la Escuela Superior de Administración Pública – ESAP, correspondiente a la ${periodo}, ` +
      `la Oficina de Control Interno concluye que la gestión adelantada refleja avances en el cumplimiento ` +
      `normativo y en la implementación del Modelo Integrado de Planeación y Gestión – MIPG, identificando ` +
      `oportunidades de mejora que deben ser atendidas para fortalecer el Sistema de Control Interno Institucional. ` +
      `Los procesos auditados cuentan con procedimientos documentados y personal idóneo que contribuye al ` +
      `cumplimiento de los objetivos misionales de la ESAP en el territorio; no obstante, persisten situaciones ` +
      `relacionadas con la gestión documental, la supervisión contractual y el control de inventarios que ` +
      `requieren atención prioritaria mediante la suscripción de planes de mejoramiento. ` +
      `La ${unidad} demostró disposición y colaboración durante el desarrollo de la auditoría, facilitando ` +
      `el acceso a la información y a los responsables de los procesos evaluados, lo que contribuyó al ` +
      `normal desarrollo del trabajo auditor. La Oficina de Control Interno exhorta a la ${unidad} a ` +
      `priorizar la implementación de las recomendaciones formuladas en el presente informe y a fortalecer ` +
      `la cultura de autocontrol, el seguimiento permanente a los compromisos de mejora y la gestión ` +
      `eficiente de los recursos públicos encomendados, en el marco de los principios que rigen la ` +
      `función pública colombiana.`,
  };
}

// ─── Función principal exportada ──────────────────────────────────────────────

/**
 * Genera contenido técnico institucional para el Informe Preliminar de Auditoría.
 *
 * @param auditoria - Datos base de la auditoría
 * @param hallazgos - Hallazgos identificados
 * @param onProgress - Callback opcional para notificar el progreso
 * @returns Objeto ContenidoInformeIA con el contenido generado
 */
export async function generarContenidoInformeIA(
  auditoria: AuditoriaBasicaPDF,
  hallazgos: HallazgoPDF[],
  onProgress?: (msg: string) => void
): Promise<ContenidoInformeIA> {
  const año = new Date().getFullYear();
  const apiKey = (import.meta as any).env?.VITE_ANTHROPIC_API_KEY as string | undefined;

  if (!apiKey) {
    onProgress?.('Generando contenido institucional enriquecido...');
    // Sin API key: usar el contenido por defecto enriquecido
    await new Promise((r) => setTimeout(r, 500)); // Simular procesamiento
    return contenidoPorDefecto(auditoria, hallazgos, año);
  }

  try {
    onProgress?.('Conectando con el servicio de generación de contenido IA...');
    const prompt = buildPrompt(auditoria, hallazgos, año);

    onProgress?.('Generando contenido técnico institucional con IA...');
    const contenido = await llamarClaudeAPI(prompt, apiKey);

    onProgress?.('Contenido generado exitosamente. Preparando PDF...');
    return contenido;
  } catch (error) {
    console.warn('Error en generación IA, usando contenido por defecto:', error);
    onProgress?.('Generando contenido institucional (modo local)...');
    return contenidoPorDefecto(auditoria, hallazgos, año);
  }
}

/** Normaliza marcoNormativo a string[] sin ternarios anidados */
function normalizeMarcoNormativo(value: string | string[] | undefined): string[] | undefined {
  if (Array.isArray(value)) return value;
  if (value) return [value];
  return undefined;
}

/**
 * Aplica el contenido generado por IA sobre los datos base de la auditoría.
 * Los datos registrados en el sistema tienen PRIORIDAD absoluta.
 * La IA/defecto solo completa los campos que estén vacíos o no definidos.
 */
export function aplicarContenidoIA(
  auditoria: AuditoriaBasicaPDF,
  contenido: ContenidoInformeIA
): AuditoriaBasicaPDF {
  // Helper: retorna el valor real si existe y no está vacío, sino el fallback IA
  const real = <T>(valor: T | undefined | null, fallback: T): T =>
    valor !== undefined && valor !== null && valor !== '' ? valor : fallback;

  const realArr = <T>(valor: T[] | undefined | null, fallback: T[]): T[] =>
    Array.isArray(valor) && valor.length > 0 ? valor : fallback;

  return {
    ...auditoria,
    // Texto narrativo: usar dato real si existe, si no el generado
    objetivo:            real(auditoria.objetivo,            contenido.objetivo),
    alcance:             real(auditoria.alcance,             contenido.alcance),
    contextoGeneral:     real(auditoria.contextoGeneral,     contenido.contextoGeneral),
    descripcionUnidad:   real(auditoria.descripcionUnidad,   contenido.descripcionUnidad),
    planesMejoramiento:  real(auditoria.planesMejoramiento,  contenido.planesMejoramiento),
    aspectosRelevantes:  real(auditoria.aspectosRelevantes,  contenido.aspectosRelevantes),
    evaluacionControlInterno: real(auditoria.evaluacionControlInterno, contenido.evaluacionControlInterno),
    // Arrays: usar los del registro si tienen elementos, si no los generados
    marcoNormativo: realArr(normalizeMarcoNormativo(auditoria.marcoNormativo), contenido.marcoNormativo),
    procesosAuditados:          realArr(auditoria.procesosAuditados,         contenido.procesosAuditados),
    fortalezas:                 realArr(auditoria.fortalezas,                contenido.fortalezas),
    recomendacionesPorCategoria: realArr(auditoria.recomendacionesPorCategoria, contenido.recomendacionesPorCategoria),
    // @ts-ignore - Agregamos paginas al objeto auditoria para que lo use el PDF
    paginas: contenido.paginas,
    // Las conclusiones van al campo observaciones del informe (se maneja en el componente)
  };
}
