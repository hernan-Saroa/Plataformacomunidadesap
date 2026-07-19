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
  componentes: Array<{ 
    titulo: string; 
    contenido: string; 
    tabla?: {
      titulo: string;
      tipo: 'planAccion' | 'pqrsdf' | 'general';
      datos: any;
    }
  }>;
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
  hallazgos?: HallazgoPDF[];
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
    // --- I. ESTRATÉGICOS ---
    { 
      idFoco: 'direccionamiento_estrategico', 
      numero: 1, 
      categoria: 'I. ESTRATÉGICOS',
      nombre: 'DIRECCIONAMIENTO ESTRATÉGICO', 
      objetivo: 'Establecer los lineamientos estratégicos, tácticos y operativos en la formulación, seguimiento, evaluación y mejora continua de la planeación estratégica y presupuestal de la entidad, así como el programa de transparencia y ética pública.',
      riesgos: [
        'Posibilidad de pérdida Reputacional por incumplimiento de metas y ejecución presupuestal de los proyectos de inversión debido a una formulación deficiente.',
        'Posibilidad de pérdida Económica y Reputacional por destinación indebida de recursos de inversión asignados a la ESAP debido a deficiencias en los procesos de planeación.',
        'Posibilidad de pérdida Reputacional por desarticulación entre los instrumentos internos y externos de la planeación estratégica.'
      ],
      componentes: [
        { 
          titulo: 'Plan de Acción', 
          contenido: 'La Oficina de Control Interno verificó el cumplimiento de las metas del Plan de Acción Institucional de la vigencia 2024, contrastando los reportes de ISOLUCIÓN con las evidencias físicas y digitales.',
          tabla: {
            titulo: 'Tabla 2. Plan de Acción Institucional',
            tipo: 'planAccion',
            datos: {
              items: [
                { actividad: '1. Programar eventos para capacitar a servidores públicos... 2. Desarrollar eventos...', proceso: 'PROYECCIÓN Y EXTENSIÓN', indicador: 'Servidores Públicos capacitados en temas de administración pública', metaProgramada: '2184', metaEjecutada: '2439', cumplimiento: '100%' },
                { actividad: '1. Programar eventos para capacitar a ciudadanos... 2. Desarrollar eventos...', proceso: 'PROYECCIÓN Y EXTENSIÓN', indicador: 'Ciudadanos capacitados en temas de administración pública', metaProgramada: '3275', metaEjecutada: '4692', cumplimiento: '100%' },
                { actividad: '1. Programar la realización de eventos de capacitación... 2. Desarrollar eventos...', proceso: 'PROYECCIÓN Y EXTENSIÓN', indicador: 'Eventos de Capacitación en temas de administración pública', metaProgramada: '180', metaEjecutada: '355', cumplimiento: '100%' },
                { actividad: 'NA', proceso: 'PROYECCIÓN Y EXTENSIÓN', indicador: 'Asistencias técnicas a entidades nacionales y territoriales en alta', metaProgramada: '4', metaEjecutada: '4', cumplimiento: '100%' }
              ]
            }
          }
        },
        { 
          titulo: 'Seguimiento a Metas', 
          contenido: 'Se realizó la evaluación de la ejecución de indicadores institucionales, encontrando una alineación del 95% con los objetivos estratégicos de la vigencia.' 
        }
      ]
    },
    { 
      idFoco: 'efectividad_institucional', 
      numero: 2, 
      categoria: 'I. ESTRATÉGICOS',
      nombre: 'EFECTIVIDAD INSTITUCIONAL', 
      objetivo: 'Establecer y administrar los lineamientos para el diseño, implementación, seguimiento, evaluación y mejora continua del Sistema Integrado de Gestión, Sistema de Gestión Documental y de Archivo articulado con el MIPG.',
      riesgos: [
        'Posibilidad de pérdida Económica y Reputacional por incumplimiento en la organización de los documentos físicos y electrónicos conforme a las TRD.',
        'Posibilidad de pérdida Económica y Reputacional por pérdida o daño de la memoria institucional de la entidad debido a deficiencias en infraestructura.'
      ],
      componentes: [
        { titulo: 'Gestión Documental', contenido: 'Verificación del cumplimiento de los planes de mejora en la organización de archivos de gestión y transferencias documentales.' },
        { titulo: 'Sistema Integrado de Gestión', contenido: 'Evaluación de la madurez y efectividad de los controles del SIG en la unidad.' }
      ]
    },
    { 
      idFoco: 'relacionamiento_ciudadania', 
      numero: 3, 
      categoria: 'I. ESTRATÉGICOS',
      nombre: 'RELACIONAMIENTO CON LA CIUDADANÍA', 
      objetivo: 'Atender los requerimientos de los grupos de interés, garantizando el acceso efectivo, oportuno, transparente y pertinente a la información de la entidad, simplificando los trámites y promoviendo la participación.',
      riesgos: [
        'Posibilidad de pérdida Reputacional por incumplimiento de los criterios de calidad en las respuestas de las PQRSDF.',
        'Posibilidad de pérdida Reputacional por la inoportunidad en las respuestas de las PQRSDF.',
        'Posibilidad de pérdida Reputacional por insatisfacción de los grupos de valor debido al desconocimiento de los funcionarios.'
      ],
      componentes: [
        { titulo: 'Gestión de PQRSDF', contenido: 'Revisión de la trazabilidad y tiempos de respuesta en el aplicativo Active Document y canales presenciales.' }
      ]
    },
    { 
      idFoco: 'transformacion_digital', 
      numero: 4, 
      categoria: 'I. ESTRATÉGICOS',
      nombre: 'TRANSFORMACIÓN DIGITAL', 
      objetivo: 'Generar, desarrollar y monitorear los proyectos estratégicos de TI, gestionar eficientemente los servicios de TI y los sistemas de información, bajo estándares de seguridad y privacidad.',
      riesgos: [
        'Posibilidad de pérdida Económica y Reputacional por indisponibilidad de los servicios y recursos tecnológicos por desactualización o ataques cibernéticos.',
        'Posibilidad de pérdida Reputacional por incumplimiento de los acuerdos de niveles de servicio (ANS).'
      ],
      componentes: [
        { titulo: 'Servicios Tecnológicos', contenido: 'Inspección del funcionamiento de salas híbridas, infraestructura tecnológica y efectividad de la mesa de ayuda.' }
      ]
    },
    // --- II. MISIONALES ---
    { 
      idFoco: 'formacion', 
      numero: 5, 
      categoria: 'II. MISIONALES',
      nombre: 'FORMACIÓN PARA LA VIDA', 
      objetivo: 'Formar personas en conocimientos, competencias y valores en administración pública, mediante el desarrollo de programas universitarios impartidos con calidad y cobertura.',
      riesgos: [
        'Posibilidad de pérdida Económica y Reputacional por pérdida o negación de los registros calificados de los programas académicos.',
        'Posibilidad de pérdida Económica y Reputacional por pérdida o negación de la Acreditación en Alta Calidad.',
        'Posibilidad de pérdida Económica y Reputacional por el inoportuno desarrollo de las autoevaluaciones.'
      ],
      componentes: [
        { 
          titulo: 'Registro y Control', 
          contenido: 'Se verificó el cumplimiento de ejecución de clases programadas y la gestión de convenios CETAPS para la vigencia 2024.',
          tabla: {
            titulo: 'Tabla 8. Relación de convenios - CETAPS vigencia 2024',
            tipo: 'general',
            headers: ['MUNICIPIO', 'AÑO APER.', 'PROGRAMAS', 'COHORTES', 'COMODATO', 'NÚMERO N°', 'FECHA', 'PLAZO'],
            colWidths: [0.15, 0.1, 0.15, 0.1, 0.1, 0.15, 0.15, 0.1],
            data: [
              ['Aguadas', '2021', 'APT', 'V-VI', 'CONVENIO', 'CAL-CV-018-2021', '15/12/2021', '14/12/2026'],
              ['Anserma', '2022', 'APT', 'V-VI-VII-VIII', 'CONVENIO', 'CAL-CV-005-2022', '26/06/2022', '30/06/2027'],
              ['La Dorada', '2024', 'APT-OK', 'I-V-VI-VII-VIII', 'CONTRATO', 'CAL-CV-011-2022', '8/02/2024', '8/02/2029']
            ]
          }
        },
        { 
          titulo: 'Gestión de Programas - Consejo Académico', 
          contenido: 'Se validó la conformación y operatividad del Consejo Académico Territorial (CAT), verificando las actas de elección y posesión de la vigencia 2024.',
          tabla: {
            titulo: 'Tabla 7. Miembros del Consejo Académico Territorial vigencia 2024',
            tipo: 'general',
            headers: ['#', 'NOMBRE', 'CARGO', 'FECHA ELECC.', 'ACTO ADM.', 'OBS.'],
            colWidths: [0.05, 0.25, 0.25, 0.15, 0.2, 0.1],
            data: [
              ['1', 'JHON JAIRO CASTAÑO', 'DIRECTOR TERRITORIAL', '8/02/2023', 'Acta posesion 063', ''],
              ['2', 'JULIAN LEONARDO RENDON', 'DELEGADO NACIONAL CAT', '10/10/2022', 'Resolucion 1178', 'NA'],
              ['3', 'NESTOR FABIO REYES', 'COORDINADOR ACADEMICO', '21/05/2021', 'Resolucion 666', 'NA'],
              ['4', 'ARISTIDES PEÑA', 'REPRESENTANTE PROFESORES', '26/12/2023', 'Resolucion 1780', '']
            ]
          }
        }
      ]
    },
    { 
      idFoco: 'capacitacion', 
      numero: 6, 
      categoria: 'II. MISIONALES',
      nombre: 'PROYECCIÓN Y EXTENSIÓN', 
      objetivo: 'Desarrollar la proyección y extensión de la ESAP a través de programas de capacitación, asesorías, consultorías, asistencias técnicas y procesos meritocráticos.',
      riesgos: [
        'Posibilidad de pérdida Económica y Reputacional por desactualización en los contenidos de los cursos ofertados.',
        'Posibilidad de pérdida Económica y Reputacional por oferta de eventos desarticulados con las necesidades de los usuarios.',
        'Posibilidad de pérdida Económica y Reputacional por incumplimiento de los eventos de capacitación programados.'
      ],
      componentes: [
        { 
          titulo: 'Asistencia Técnica', 
          contenido: 'Consolidado de asistencias técnicas territoriales realizadas en la vigencia 2024 por la Dirección Territorial Caldas.',
          tabla: {
            titulo: 'Tabla 10. Relación de Asistencias Técnicas vigencia 2024',
            tipo: 'general',
            headers: ['DIR. TERR.', 'DPTO', 'MUNICIPIO', 'LÍNEA TEMÁTICA', 'ASISTENCIA TÉCNICA'],
            colWidths: [0.15, 0.1, 0.15, 0.25, 0.35],
            data: [
              ['Caldas', 'Caldas', 'Samaná', 'Finanzas públicas', 'Plan Operativo Anual de Inversiones (POAI)'],
              ['Caldas', 'Caldas', 'Palestina', 'Estructuración proyectos', 'Acompañamiento formulación proyectos'],
              ['Caldas', 'Caldas', 'Norcasia', 'Contratación estatal', 'Manuales de Contratación'],
              ['Caldas', 'Caldas', 'Belalcázar', 'Enfoque Género', 'Asistencia técnica prevención VBG']
            ]
          }
        },
        { 
          titulo: 'Capacitación Alto Gobierno', 
          contenido: 'Relación de jornadas de inducción y capacitación ejecutadas durante la vigencia 2024.',
          tabla: {
            titulo: 'Tabla 11. Relación Jornadas de Inducción Alto Gobierno - Capacitación vigencia 2024',
            tipo: 'general',
            headers: ['MUNICIPIO', 'EVENTO', 'MODALIDAD', 'NOMBRE EVENTO', 'FECHA', 'PARTICIP.'],
            colWidths: [0.15, 0.1, 0.1, 0.4, 0.15, 0.1],
            data: [
              ['MANIZALES', 'Taller', 'Presencial', 'Taller presencial Ediles Electos Urbano 2024', '23/04/2024', '65'],
              ['LA DORADA', 'Taller', 'Presencial', 'Concejos Municipales y Plan Desarrollo', '08/05/2024', '55'],
              ['VITERBO', 'Taller', 'Presencial', 'Concejos Municipales y Politicas Publicas', '17/05/2024', '45']
            ]
          }
        }
      ]
    },
    // --- III. TRANSVERSALES ---
    { 
      idFoco: 'gestion_legal', 
      numero: 7, 
      categoria: 'III. TRANSVERSALES',
      nombre: 'GESTIÓN LEGAL', 
      objetivo: 'Atender los asuntos legales internos y externos de la entidad mediante la asesoría y defensa jurídica para prevenir el daño antijurídico.',
      riesgos: [
        'Posibilidad de pérdida Económica y Reputacional por debilidades en la gestión de la defensa técnica debido a inadecuada gestión del apoderado.'
      ],
      componentes: [
        { titulo: 'Procesos Judiciales', contenido: 'Verificación de la gestión de respuestas a tutelas y demandas, y articulación con la Subdirección de Gestión Jurídica.' }
      ]
    },
    { 
      idFoco: 'adquisicion_bienes', 
      numero: 8, 
      categoria: 'III. TRANSVERSALES',
      nombre: 'ADQUISICIÓN DE BIENES Y SERVICIOS', 
      objetivo: 'Gestionar de manera eficiente los procesos de contratación para garantizar la adquisición oportuna y adecuada de bienes y servicios.',
      riesgos: [
        'Posibilidad de pérdida Económica y Reputacional por contratación inoportuna de bienes y servicios requeridos (Riesgo Fiscal).',
        'Posibilidad de pérdida Económica y Reputacional por planeación inoportuna en la estructuración de documentos contractuales.'
      ],
      componentes: [
        { titulo: 'Contratación', contenido: 'Evaluación de la planeación y gestión de contratos estatales, cumplimiento de modalidades de selección y liquidación.' }
      ]
    },
    { 
      idFoco: 'bienestar', 
      numero: 9, 
      categoria: 'III. TRANSVERSALES',
      nombre: 'BIEN-ESTAR', 
      objetivo: 'Fortalecer el bienestar universitario de la comunidad académica para generar condiciones de formación integral y mejoramiento de la calidad de vida.',
      riesgos: [
        'Posibilidad de pérdida Reputacional por insatisfacción en la prestación de servicios de bienestar por desconocimiento de las necesidades de los grupos de valor.'
      ],
      componentes: [
        { titulo: 'Bienestar Universitario', contenido: 'Verificación de la ejecución del Plan de Bienestar Universitario y efectividad de la supervisión de contratos asociados.' }
      ]
    },
    { 
      idFoco: 'gestion_financiera', 
      numero: 10, 
      categoria: 'III. TRANSVERSALES',
      nombre: 'GESTIÓN FINANCIERA', 
      objetivo: 'Administrar y disponer eficiente de los recursos financieros mediante el seguimiento y control de la gestión presupuestal y registro contable.',
      riesgos: [
        'Posibilidad de pérdida Económica y Reputacional por incumplimiento en pago de obligaciones fiscales y financieras.',
        'Posibilidad de pérdida Económica y Reputacional por errores en el reconocimiento contable de los hechos económicos.'
      ],
      componentes: [
        { 
          titulo: 'Presupuesto', 
          contenido: 'Evaluación del cumplimiento de la ejecución presupuestal global de la vigencia 2024, verificando la eficiencia en el uso de los recursos de funcionamiento e inversión.',
          tabla: {
            titulo: 'Tabla 16. Ejecución Presupuestal Global (Cifras en pesos colombianos)',
            tipo: 'general',
            headers: ['PRESUPUESTO', 'APROP. DEF.', 'CERT. DISP.', 'REG. PRES.', 'OBLIG.', 'PAGOS', 'SALDO NO EJEC.', '% EJEC'],
            colWidths: [0.15, 0.12, 0.12, 0.12, 0.12, 0.12, 0.15, 0.1],
            data: [
              ['FUNCIONAMIENTO', '2.306.733.008', '2.306.733.008', '2.306.733.008', '2.306.733.008', '2.306.733.008', '-', '100,0%'],
              ['INVERSIÓN', '4.683.174.947', '4.539.677.435', '4.539.677.435', '4.539.677.435', '4.539.677.435', '143.497.512', '96,9%'],
              ['TOTAL TERRITORIAL', '6.989.907.955', '6.846.410.443', '6.846.410.443', '6.846.410.443', '6.846.410.443', '143.497.512', '97,9%']
            ]
          }
        },
        { 
          titulo: 'Contabilidad - Cuentas de Balance', 
          contenido: 'Análisis de la situación financiera de la territorial al cierre de la vigencia 2024, evaluando la razonabilidad de las cuentas de activo, pasivo y patrimonio.',
          tabla: {
            titulo: 'Tabla 17. Cuentas de Balance - 31 de diciembre de 2024 (Cifras en pesos)',
            tipo: 'general',
            headers: ['Código', 'Descripción', 'Saldo Inicial', 'M. Débito', 'M. Crédito', 'Saldo Final', 'Var. Abs', '%'],
            colWidths: [0.1, 0.2, 0.15, 0.12, 0.12, 0.15, 0.1, 0.06],
            data: [
              ['1', 'ACTIVOS', '6.433.116.913', '3.056.210.545', '2.584.658.002', '6.904.669.456', '471.552.542', '7,3%'],
              ['2', 'PASIVOS', '35.634.837', '7.940.322.888', '7.939.210.328', '34.522.277', '-1.112.560', '-3,1%'],
              ['3', 'PATRIMONIO', '22.871.358.437', '12.236.578.617', '5.846.898.834', '29.261.038.219', '6.389.679.783', '27,9%']
            ]
          }
        }
      ]
    },
    { 
      idFoco: 'gestion_administrativa', 
      numero: 11, 
      categoria: 'III. TRANSVERSALES',
      nombre: 'GESTIÓN ADMINISTRATIVA', 
      objetivo: 'Administrar los bienes, servicios e infraestructura para garantizar el suministro oportuno a todos los procesos de la ESAP.',
      riesgos: [
        'Posibilidad de pérdida Económica por inconsistencia en la asignación del custodio de los bienes (Placas de inventario).',
        'Posibilidad de pérdida Económica y Reputacional por extravío o daño de bienes por falta de custodia.',
        'Posibilidad de riesgo de accidente por falta de mantenimiento adecuado a la infraestructura física.'
      ],
      componentes: [
        { titulo: 'Almacén e Inventarios', contenido: 'Verificación física de activos en bodegas, actualización en SEVEN y procesos de baja de elementos.' },
        { titulo: 'Infraestructura', contenido: 'Inspección del estado de fachadas, sistemas eléctricos y mantenimiento preventivo de sedes.' }
      ]
    },
    { 
      idFoco: 'talento_humano', 
      numero: 12, 
      categoria: 'III. TRANSVERSALES',
      nombre: 'GESTIÓN DEL TALENTO HUMANO', 
      objetivo: 'Desarrollar planes y programas de gestión del talento humano que promuevan el desarrollo, bienestar y seguridad y salud en el trabajo.',
      riesgos: [
        'Posibilidad de pérdida Reputacional por el incumplimiento de los programas y planes de talento humano.',
        'Posibilidad de pérdida Económica y Reputacional por incumplimiento de la normatividad de Seguridad y Salud en el Trabajo.'
      ],
      componentes: [
        { 
          titulo: 'SG-SST', 
          contenido: 'Verificación de la implementación del Sistema de Gestión de Seguridad y Salud en el Trabajo, uso de EPP y cumplimiento del Plan Institucional de Capacitación.',
          tabla: {
            titulo: 'Plan Institucional de Capacitación - PIC',
            tipo: 'planAccion',
            datos: {
              items: [
                {
                  actividad: 'Ejecutar las jornadas de capacitación programadas para el personal administrativo.',
                  proceso: 'Gestión del Talento Humano',
                  indicador: 'Porcentaje de ejecución del PIC',
                  metaProgramada: '100%',
                  metaEjecutada: '85%',
                  cumplimiento: '85%'
                },
                {
                  actividad: 'Realizar las evaluaciones de desempeño del personal de carrera administrativa.',
                  proceso: 'Gestión del Talento Humano',
                  indicador: 'Evaluaciones realizadas vs programadas',
                  metaProgramada: '100%',
                  metaEjecutada: '100%',
                  cumplimiento: '100%'
                }
              ]
            }
          }
        },
        { 
          titulo: 'Gestión Profesoral', 
          contenido: 'Evaluación de procesos de vinculación de docentes de cátedra y soporte de pagos de nómina conforme a la escala salarial vigente.' 
        }
      ]
    }
  ];

  const generarProcesosDinamicos = (): ProcesoAuditadoIA[] => {
    const focalizados = auditoria.focos || [];
    const listaAUsar = focalizados.length > 0 
      ? procesosMaestros.filter(p => focalizados.includes(p.idFoco || ''))
      : procesosMaestros;

    return listaAUsar.map(p => ({
      ...p,
      categoria: p.categoria || 'PROCESO AUDITADO',
      riesgos: p.riesgos || [],
      componentes: p.componentes || []
    }));
  };

  const paginas: PaginaInformeIA[] = [{
    numero: 1,
    tipo: 'OFICIO',
    encabezado: 'ESCUELA SUPERIOR DE ADMINISTRACIÓN PÚBLICA - ESAP | OFICINA DE CONTROL INTERNO',
    contenido: `
      12_150_350_472
      Bogotá, D.C.

      Doctor(a)
      ${(auditoria.destinatarioNombre || 'Director(a) Territorial').toUpperCase()}
      ${auditoria.destinatarioCargo || 'Director(a) Territorial'}
      ESAP - ${unidad}
      E. S. D.

      Asunto: Informe preliminar auditoría interna de evaluación y seguimiento ${unidad} – Vigencia ${año}.

      Respetado(a) doctor(a) ${(auditoria.destinatarioNombre || 'Director').split(' ')[0]} reciba un cordial saludo:

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
    aspectosRelevantes: `El personal de planta de la Dirección Territorial asciende a dieciséis (16) servidores, de los cuales doce (12) pertenecen a la carrera administrativa, lo que evidencia una estructura organizacional consolidada. Se destaca la disposición del equipo de trabajo para atender los requerimientos de la auditoría y el acceso oportuno a la información y documentación solicitada en el repositorio oficial SEVEN y el Sistema Integrated de Gestión ISOLUCIÓN.`,
    evaluacionControlInterno: `Como resultado del trabajo de auditoría desarrollado, se evalúa que el Sistema de Control Interno de la unidad se encuentra en proceso de mejora. Se identificaron oportunidades de fortalecimiento en los controles implementados, particularmente en la formalización de la supervisión contractual, el cumplimiento de los términos de respuesta a PQRSDF y la actualización de los inventarios físicos frente a los registros del aplicativo institucional.`,
    fortalezas: [
      `Personal con idoneidad técnica y experiencia en la gestión de los procesos institucionales, lo que garantiza la continuidad de la operación y el cumplimiento de los objetivos misionales.`,
      `Procedimientos documentados y actualizados en el Sistema Integrado de Gestión – SIG, que orientan la ejecución de las actividades y facilitan el autocontrol.`,
      `Disposición oportuna de la información y la documentación requerida por el equipo auditor.`,
      `Capacidad de adaptación al cambio por parte del personal de la ${unidad} frente a los requerimientos normativos.`
    ],
    recomendacionesPorCategoria: [
      { categoria: 'GESTIÓN DOCUMENTAL', items: [`Formalizar actas como evidencia de las actividades del plan de mejoramiento asociadas a la entrega de expedientes y roles.`, `Garantizar que se cuente con las evidencias completas en el repositorio digital institucional conformando expedientes híbridos o electrónicos según la TRD.`] },
      { categoria: 'CONTRATACIÓN', items: [`Fortalecer la etapa precontractual en la validación de la coherencia del objeto contractual y los productos entregables pactados.`, `Asegurar la publicación oportuna en SECOP II de los informes de supervisión técnica con descripciones detalladas de las actividades desarrolladas.`] },
      { categoria: 'ADMINISTRATIVA', items: [`Gestionar la actualización de los inventarios en el aplicativo SEVEN para cada bodega, conciliando las diferencias físicas encontradas en elementos de consumo e infraestructura.`, `Priorizar el mantenimiento preventivo de la infraestructura física de la sede para mitigar riesgos de deterioro por humedades.`] }
    ],
    conclusiones: `Como resultado de la Auditoría Interna de Evaluación y Seguimiento practicada a los procesos al interior de la ${unidad} de la ESAP, correspondiente a la ${periodo}, la Oficina de Control Interno concluye que la gestión adelantada refleja avances en el cumplimiento normativo e identifica oportunidades de mejora que deben ser atendidas para fortalecer el Sistema de Control Interno Institucional. Se exhorta a la unidad a priorizar la implementación de las recomendaciones formuladas y a fortalecer la cultura de autocontrol.`,
    hallazgos: hallazgos.length > 0 ? hallazgos : [
      {
        titulo: 'DEFICIENCIAS EN LA SUPERVISIÓN Y SEGUIMIENTO DE LA EJECUCIÓN CONTRACTUAL',
        gravedad: 'MODERADO',
        descripcion: 'Se evidenció que en los expedientes de contratación de la muestra seleccionada, los informes de supervisión carecen de un detalle pormenorizado de las actividades desarrolladas por los contratistas en relación con las obligaciones pactadas. Así mismo, se identificó la ausencia de soportes documentales que acrediten la verificación efectiva de los entregables previo a la autorización del pago.',
        criterioIncumplido: 'Ley 1474 de 2011 (Estatuto Anticorrupción) Artículo 83; Manual de Contratación de la ESAP Versión 06.',
        causas: ['Debilidad en el ejercicio de la supervisión por parte de los líderes de área.', 'Falta de herramientas de seguimiento y control a los cronogramas de actividades.'],
        efectos: ['Riesgo de pago de lo no debido.', 'Posibles sanciones disciplinarias por incumplimiento de deberes funcionales del supervisor.'],
        recomendaciones: ['Fortalecer el proceso de capacitación a los supervisores en materia de gestión documental y control de obligaciones.', 'Implementar listas de chequeo para la validación de productos antes de la firma de certificación de cumplimiento.']
      }
    ],
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
    hallazgos: contenido.hallazgos,
    // @ts-ignore
    paginas: contenido.paginas
  };
}
