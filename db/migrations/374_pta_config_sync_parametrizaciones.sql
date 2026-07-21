-- Migracion 374: Sincronizar parametrizacion de Configuracion del PTA entre ambientes.
-- Contexto: la pantalla "Plan de Trabajo Academico > Configuracion" persiste toda su
-- parametrizacion en una unica fila JSONB: academic_work_plan."ConfiguracionSistema"
-- (clave = 'pta_rules_v2', columna 'valor'). Esta migracion replica en dev/qa/pre/prod
-- exactamente la parametrizacion definida en el ambiente origen (Circular Dispositiva 003/2025).
--
-- Snapshot: 176 claves de configuracion; 50 actividades complementarias (comp_actividades_v2).
--
-- Comportamiento:
--   * REEMPLAZA todas las claves de parametrizacion por los valores del origen
--     (el origen es la fuente de verdad: terminos generales, docencia, investigacion,
--      extension y actividades complementarias).
--   * PRESERVA el historial propio de cada ambiente: config_snapshots y config_changelog
--     NO se sobrescriben (son auditoria local y no deben viajar entre ambientes).
--   * Si la fila no existe (ambiente nuevo) la crea; luego aplica la parametrizacion.
--
-- Nota: config_bloqueada quedara en 'false' (valor del origen). Si un ambiente
--       tenia la configuracion bloqueada, esta migracion la dejara en el estado del origen.
-- Idempotente: correr varias veces deja el mismo resultado.

BEGIN;

-- 1) Asegurar esquema, tabla y fila base (por si el ambiente es nuevo).
CREATE SCHEMA IF NOT EXISTS academic_work_plan;

CREATE TABLE IF NOT EXISTS academic_work_plan."ConfiguracionSistema" (
    clave text NOT NULL,
    valor jsonb NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "ConfiguracionSistema_pkey" PRIMARY KEY (clave)
);

INSERT INTO academic_work_plan."ConfiguracionSistema" (clave, valor, "updatedAt")
VALUES ('pta_rules_v2', '{}'::jsonb, CURRENT_TIMESTAMP)
ON CONFLICT (clave) DO NOTHING;

-- 2) Aplicar la parametrizacion del origen, preservando el historial local del ambiente.
--    El operador || (shallow merge) hace que las dos claves de la derecha ganen,
--    por lo que config_snapshots / config_changelog conservan lo que ya tenia el ambiente.
UPDATE academic_work_plan."ConfiguracionSistema"
SET valor = $pta$
{
  "inv_roles": [
    {
      "id": "ROL_001",
      "nombre": "INVESTIGADOR LÍDER DE PROYECTO",
      "pct_max": 50,
      "horas_max": 400
    },
    {
      "id": "ROL_002",
      "nombre": "COINVESTIGADOR",
      "pct_max": 37.5,
      "horas_max": 300
    },
    {
      "id": "ROL_003",
      "nombre": "ASISTENTE DE INVESTIGACIÓN NIVEL II",
      "pct_max": 25,
      "horas_max": 200
    }
  ],
  "max_pct_aadm": 25,
  "comp_elab_rea": 60,
  "ext_secciones": [
    {
      "key": "capacitacion",
      "color": "#059669",
      "label": "3.1.1. Dirección de Capacitación",
      "orden": 1,
      "multiplicador": 1
    },
    {
      "key": "seleccion",
      "color": "#0284C7",
      "label": "3.1.2. Dirección de Procesos de Selección",
      "orden": 2,
      "multiplicador": 1
    },
    {
      "key": "fortalecimiento",
      "color": "#7C3AED",
      "label": "3.1.3. Dirección de Fortalecimiento y Apoyo a la Gestión Estatal",
      "orden": 3,
      "multiplicador": 1
    },
    {
      "key": "alto_gobierno",
      "color": "#B45309",
      "label": "3.2. Escuela de Alto Gobierno",
      "orden": 4,
      "columnas": [
        "Rol",
        "_items_"
      ],
      "multiplicador": 1
    }
  ],
  "comp_secciones": [
    {
      "key": "complementarias_docencia",
      "color": "#D97706",
      "label": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "orden": 1,
      "columnas": [
        "_items_"
      ],
      "multiplicador": 1
    },
    {
      "key": "academico_administrativas",
      "color": "#2563EB",
      "label": "ACTIVIDADES ACADÉMICO-ADMINISTRATIVAS",
      "orden": 2,
      "columnas": [
        "_items_"
      ],
      "multiplicador": 1
    }
  ],
  "ext_actividades": {
    "seleccion": [
      {
        "id": "SEL_01",
        "items": [
          {
            "tipo": "por_unidad",
            "horas": 1,
            "nombre": "Capacitación sobre la prueba",
            "unidad": "5",
            "max_unidades": 5
          },
          {
            "tipo": "fija",
            "horas": 2,
            "nombre": "Sesiones de validación",
            "unidad": "sesión"
          }
        ],
        "nombre": "Revisión y validación de estructuras de prueba"
      },
      {
        "id": "SEL_02",
        "items": [
          {
            "tipo": "fija",
            "horas": 1,
            "nombre": "Capacitación sobre la prueba"
          },
          {
            "tipo": "por_unidad",
            "horas": 2,
            "nombre": "Sesiones de validación",
            "unidad": "sesión"
          }
        ],
        "nombre": "Definición y operacionalización de constructos"
      },
      {
        "id": "SEL_03",
        "items": [
          {
            "tipo": "fija",
            "horas": 2,
            "nombre": "Capacitación"
          },
          {
            "tipo": "por_unidad",
            "horas": 4,
            "nombre": "Construcción de casos",
            "unidad": "caso"
          },
          {
            "tipo": "por_unidad",
            "horas": 3,
            "nombre": "Sesiones de revisión de casos",
            "unidad": "caso"
          },
          {
            "tipo": "por_unidad",
            "horas": 3,
            "nombre": "Sesiones de validación de casos",
            "unidad": "caso"
          }
        ],
        "nombre": "Construcción y validación de casos"
      },
      {
        "id": "SEL_04",
        "items": [
          {
            "tipo": "fija",
            "horas": 2,
            "nombre": "Capacitación"
          },
          {
            "tipo": "por_unidad",
            "horas": 1,
            "nombre": "Sesiones de revisión",
            "unidad": "ítem"
          },
          {
            "tipo": "fija",
            "horas": 1,
            "nombre": "Nuevo ítem"
          }
        ],
        "nombre": "Validación de ítems"
      },
      {
        "id": "SEL_05",
        "items": [
          {
            "tipo": "fija",
            "horas": 1,
            "nombre": "Capacitación sobre la prueba"
          },
          {
            "tipo": "por_unidad",
            "horas": 1.5,
            "nombre": "Sesiones de revisión",
            "unidad": "semana"
          }
        ],
        "nombre": "Análisis de evidencias de validez en instrumentos de medición"
      },
      {
        "id": "SEL_06",
        "items": [
          {
            "tipo": "fija",
            "horas": 1,
            "nombre": "Capacitación sobre la prueba"
          },
          {
            "tipo": "por_unidad",
            "horas": 1.5,
            "nombre": "Sesiones de revisión",
            "unidad": "semana"
          }
        ],
        "nombre": "Grupos de discusión sobre instrumentos de medición"
      },
      {
        "id": "SEL_07",
        "items": [
          {
            "tipo": "fija",
            "horas": 2,
            "nombre": "Asistir a capacitación virtual para la Jornada"
          },
          {
            "tipo": "fija",
            "horas": 12,
            "nombre": "Asistir y fungir como Jurado (Jornada completa)"
          }
        ],
        "nombre": "Jurados — Prueba de Conocimientos (Componente escrito)"
      },
      {
        "id": "SEL_08",
        "items": [
          {
            "tipo": "fija",
            "horas": 2,
            "nombre": "Asistir a capacitación virtual para la Jornada"
          },
          {
            "tipo": "fija",
            "horas": 12,
            "nombre": "Asistir y fungir como Jurado (Jornada completa)"
          }
        ],
        "nombre": "Jurados — Prueba de Conocimientos (Pruebas de ejecución / oral)"
      },
      {
        "id": "SEL_09",
        "items": [
          {
            "tipo": "fija",
            "horas": 2,
            "nombre": "Asistir a capacitación virtual para la Jornada"
          },
          {
            "tipo": "por_unidad",
            "horas": 1.5,
            "nombre": "Revisión y validación de hojas de vida",
            "unidad": "hoja de vida"
          }
        ],
        "nombre": "Jurados — Valoración de Antecedentes"
      },
      {
        "id": "SEL_10",
        "items": [
          {
            "tipo": "fija",
            "horas": 2,
            "nombre": "Asistir a capacitación virtual para la Jornada"
          },
          {
            "tipo": "por_unidad",
            "horas": 1.5,
            "nombre": "Aplicación y registro de entrevistas",
            "unidad": "entrevista"
          }
        ],
        "nombre": "Jurados — Entrevista"
      },
      {
        "id": "SEL_11",
        "items": [
          {
            "tipo": "fija",
            "horas": 2,
            "nombre": "Asistir a capacitación virtual para la Jornada"
          },
          {
            "tipo": "por_unidad",
            "horas": 2,
            "nombre": "Revisión y respuesta a reclamaciones",
            "unidad": "reclamación"
          }
        ],
        "nombre": "Jurados — Reclamaciones / Recursos de reposición"
      }
    ],
    "capacitacion": [
      {
        "id": "ACT_1782860355782",
        "items": [
          {
            "tipo": "fija",
            "horas": 8,
            "nombre": "Horas ejecutadas"
          },
          {
            "tipo": "fija",
            "horas": 8,
            "nombre": "Horas de preparación "
          }
        ],
        "nombre": "DC - Orientación de Talleres"
      },
      {
        "id": "ACT_1782860396769",
        "items": [
          {
            "tipo": "fija",
            "horas": 32,
            "nombre": "Orientación de Seminarios"
          }
        ],
        "nombre": "DC"
      },
      {
        "id": "ACT_1782860427666",
        "items": [
          {
            "tipo": "hasta",
            "horas": 64,
            "nombre": "Orientación de Cursos"
          }
        ],
        "nombre": "DC"
      },
      {
        "id": "ACT_1782860498370",
        "items": [
          {
            "tipo": "hasta",
            "horas": 160,
            "nombre": "Orientación de Diplomados "
          }
        ],
        "nombre": "DC"
      }
    ],
    "alto_gobierno": [
      {
        "id": "ACT_1782743550354",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Coaching ",
            "parent_col_idx": 0
          }
        ],
        "nombre": "EAG",
        "columnas_meta": {
          "Rol": [
            {
              "tipo": "hasta",
              "horas": 80
            }
          ]
        },
        "columnas_valores": {
          "Rol": [
            "Coaching directivo"
          ]
        }
      },
      {
        "id": "ACT_1782743957582",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Diseñador- Formador ",
            "parent_col_idx": 0
          }
        ],
        "nombre": "EAG",
        "columnas_meta": {
          "Rol": [
            {
              "tipo": "hasta",
              "horas": 0
            }
          ]
        },
        "columnas_valores": {
          "Rol": [
            "Formación estratégica a la alta gerencia del Estado "
          ]
        }
      },
      {
        "id": "ACT_1782744078592",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Diseñador- Formador",
            "parent_col_idx": 0
          }
        ],
        "nombre": "EAG",
        "columnas_meta": {
          "Rol": [
            {
              "tipo": "intervalo",
              "horas": 200,
              "horas_min": "80"
            }
          ]
        },
        "columnas_valores": {
          "Rol": [
            "Gestión del conocimiento "
          ]
        }
      },
      {
        "id": "ACT_1782744287109",
        "items": [],
        "nombre": "Desarrollo de contenidos ",
        "columnas_meta": {
          "Rol": [
            {
              "tipo": "intervalo",
              "horas": 120,
              "horas_min": "40"
            }
          ]
        },
        "columnas_valores": {
          "Rol": [
            "Diseñador - Formador "
          ]
        }
      }
    ],
    "fortalecimiento": [
      {
        "id": "FOR_01",
        "items": [
          {
            "tipo": "hasta",
            "horas": 80,
            "nombre": "Análisis de los anexos técnicos de las líneas temáticas, que servirán de apoyo para presentar la oferta a los municipios  priorizados  por  la estrategia."
          }
        ],
        "nombre": "Retroalimentación para la definición de la línea temática para asistencia técnica a municipios PDET y de 5° y 6° categoría. ",
        "max_horas": 80
      },
      {
        "id": "FOR_02",
        "items": [
          {
            "tipo": "hasta",
            "horas": 80,
            "nombre": "Proponer/presentar una propuesta de batería de indicadores que permitan medir los resultados y el impacto de las Asistencias Técnicas Territoriales Realizadas "
          }
        ],
        "nombre": "Batería de indicadores para medir los resultados y el impacto de la Asistencia Técnica realizada en los municipios priorizados ",
        "max_horas": 80
      },
      {
        "id": "FOR_03",
        "items": [
          {
            "tipo": "hasta",
            "horas": 40,
            "nombre": "Asesoría técnica para el análisis de información primaria y preparación de instrumentos de recolección de la información en campo conforme a las metodologías definidas o acordadas por el DAFP. "
          },
          {
            "tipo": "hasta",
            "horas": 40,
            "nombre": "Asesoría técnica para la organización, disposición y presentación del plan de trabajo conforme a las metodologías definidas o acordadas por el DAFP."
          }
        ],
        "nombre": "Planeación del desarrollo del proyecto ",
        "max_horas": 40
      },
      {
        "id": "FOR_04",
        "items": [
          {
            "tipo": "hasta",
            "horas": 80,
            "nombre": "Asesoría técnica para la recolección, análisis y control de la información en campo conforme a las metodologías definidas o acordadas por el DAFP. "
          },
          {
            "tipo": "hasta",
            "horas": 80,
            "nombre": "Asesoría técnica para la recolección y análisis de información de factores externos e internos que inciden en la gestión institucional conforme a las metodologías definidas o acordadas por el DAFP. "
          },
          {
            "tipo": "hasta",
            "horas": 100,
            "nombre": "Asesoría técnica para la recolección y análisis de información asociadas a la producción institucional a través de las metodologías definidas o acordadas   por   el   DAFP, especialmente las cargas de trabajo. "
          }
        ],
        "nombre": "Análisis y diagnostico institucional ",
        "max_horas": 40
      },
      {
        "id": "FOR_09",
        "items": [
          {
            "tipo": "fija",
            "horas": 40,
            "nombre": "Asesoría técnica para la elaboración y disposición de los actos administrativos que materializan las intenciones del proyecto y acompañamiento u orientación institucional en su trámite de aprobaciones conforme a las metodologías   u   orientaciones definidas o acordadas por el DAFP"
          }
        ],
        "nombre": "Actos administrativos y acompañamiento en la cadena de tramites de aprobación. ",
        "max_horas": 40
      },
      {
        "id": "ACT_1782664825388",
        "items": [],
        "nombre": "Nueva etapa"
      },
      {
        "id": "ACT_1782741417928",
        "items": [
          {
            "tipo": "intervalo",
            "horas": 6,
            "nombre": " Documento que organiza las actividades, los objetivos, los productos y el cronograma para un período determinado, con los cuales se comprometerá el docente en relación con el desarrollo de la estrategia de investigación aplicada y gestión del conocimiento en la Subdirección Nacional de Proyección Institucional o en sus direcciones técnicas. ",
            "horas_min": 2,
            "col_valores": {
              "Subproductos y Requerimientos Técnicos": [
                "Definidos en las Circulares establecidas por la ESAP, de conformidad con lo dispuesto en el Estatuto Profesoral de la Universidad, o según los requerimientos dados por el subdirector nacional de proyección institucional o alguno de los directores técnicos. "
              ]
            }
          }
        ],
        "nombre": "Plan de Trabajo "
      },
      {
        "id": "ACT_1782709508849",
        "items": [
          {
            "tipo": "intervalo",
            "horas": 60,
            "nombre": "Un documento técnico es un informe o texto que presenta información y análisis sobre un tema específico, generalmente dirigido a un público objetivo y estratégico de la Subdirección Nacional de Proyección Institucional (SNPI) de la ESAP o de sus direcciones técnicas. Su propósito es comunicar procedimientos, resultados de investigaciones, o recomendaciones, usando un lenguaje claro y preciso. Suelen incluir gráficos, tablas, y referencias para repaldar la información presentada. ",
            "horas_min": 40,
            "col_valores": {
              "Subproductos y Requerimientos Técnicos": [
                "Los definidos en el documento: “Lineamientos para el desarrollo de eventos y documentos técnicos en la Subdirección Nacional de Proyección Institucional de la ESAP”, o según los requerimientos establecidos por el subdirector nacional de proyección institucional o alguno de los directores técnicos. "
              ]
            }
          }
        ],
        "nombre": "Documentos técnicos "
      },
      {
        "id": "ACT_1782741614188",
        "items": [
          {
            "tipo": "intervalo",
            "horas": 60,
            "nombre": "Se consideran productos resultados de actividades de generación de nuevo conocimiento aquellos aportes significativos al estado del arte de un área de conocimiento, que han sido discutidos y validados para llegar a ser incorporados a la discusión científica, al desarrollo de las actividades de investigación, al desarrollo tecnológico, y que pueden ser fuente de innovaciones. Este tipo de producto se caracteriza por involucrar mecanismos de estandarización que permiten corroborar la existencia de una evaluación que verifique la generación de nuevo conocimiento. (SNCTI) ",
            "horas_min": 40,
            "col_valores": {
              "Subproductos y Requerimientos Técnicos": [
                "Tecnología e Innovación. "
              ]
            }
          }
        ],
        "nombre": "Productos resultados de actividades de Generación de Nuevo Conocimiento "
      },
      {
        "id": "ACT_1782742081354",
        "items": [
          {
            "tipo": "intervalo",
            "horas": 60,
            "nombre": "Estos productos dan cuenta de la generación de ideas, métodos y herramientas que impactan el desarrollo económico y generan transformaciones en la sociedad. En el desarrollo de estos métodos y herramientas está implícita la investigación que genera el conocimiento enfocado en la solución de problemas sociales, técnicos y económicos. CTI) ",
            "horas_min": 40,
            "col_valores": {
              "Subproductos y Requerimientos Técnicos": [
                "El docente debe elegir subproductos establecidos en las categorías y tipificaciones, cuyas especificaciones técnicas son definidas en las convocatorias nacionales para el reconocimiento y medición de grupos de investigación, desarrollo tecnológico o de innovación y para el reconocimiento de investigadores del Sistema Nacional de Ciencia, Tecnología e Innovación. "
              ]
            }
          }
        ],
        "nombre": "Productos resultado de actividades de Desarrollo Tecnológico e Innovación "
      },
      {
        "id": "ACT_1782742155871",
        "items": [
          {
            "tipo": "intervalo",
            "horas": 60,
            "nombre": "Se consideran productos resultados de procesos de apropiación social del conocimiento, aquellos que implican que la ciudadanía intercambie saberes y conocimientos de ciencia, tecnología e innovación para abordar situaciones de interés común y proponer soluciones o mejoramientos concertados, que respondan a sus realidades. La apropiación social del conocimiento convoca la participación ciudadana de investigadores, comunidades, líderes locales, gestores de política, empresarios, entre otros, para gestionar, producir y aplicar la ciencia en su cotidianidad, y así, contribuir al mejoramiento de las condiciones de vida a partir del diálogo de saberes y la construcción colectiva del conocimi",
            "horas_min": 40,
            "col_valores": {
              "Subproductos y Requerimientos Técnicos": [
                "Se consideran productos resultados de procesos de apropiación social del conocimiento, aquellos que implican que la ciudadanía intercambie saberes y conocimientos de ciencia, tecnología e innovación para abordar situaciones de interés común y proponer soluciones o mejoramientos concertados, que respondan a sus realidades. La apropiación social del conocimiento convoca la participación ciudadana de investigadores, comunidades, líderes locales, gestores de política, empresarios, entre otros, para gestionar, producir y aplicar la ciencia en su cotidianidad, y así, contribuir al mejoramiento de las condiciones de vida a partir del diálogo de saberes y la construcción colectiva del conocimi"
              ]
            }
          }
        ],
        "nombre": "Productos resultado de actividades de Apropiación Social del Conocimiento y Divulgación Pública de la Ciencia "
      },
      {
        "id": "ACT_1782742233654",
        "items": [
          {
            "tipo": "intervalo",
            "horas": 60,
            "nombre": "Se consideran productos resultados de actividades relacionadas con la Formación del Recurso Humano para CTel (Ciencia, Tecnología e Innovación), aquellos realizados en función de asesorar y desarrollar las actividades implicadas en la elaboración de una tesis o trabajo de grado  que  otorgó  el  título  de doctor(a),magíster o profesional (respectivamente); la ejecución deproyectos de ID+I (Investigación, Desarrollo e Innovación) con formación y apoyo a programas de formación; y la gestión de proyectos de investigación que permiten la consecución de los recursos necesarios para el desarrollo de la investigación o la innovación. CTI) ",
            "horas_min": 40,
            "col_valores": {
              "Subproductos y Requerimientos Técnicos": [
                "El docente debe elegir subproductos establecidos en las categorías y tipificaciones, cuyas especificaciones técnicas son definidas en las convocatorias nacionales para el reconocimiento y medición de grupos de investigación, desarrollo tecnológico o de innovación y para el reconocimiento de investigadores del Sistema Nacional de Ciencia,  Tecnología e Innovación.  "
              ]
            }
          }
        ],
        "nombre": "Productos de actividades relacionadas con la Formación de Recurso Humano para CTeI (Ciencia, Tecnología e Innovación). "
      },
      {
        "id": "ACT_1782742387007",
        "items": [
          {
            "tipo": "hasta",
            "horas": 8,
            "nombre": "Participación del docente en espacios académicas y científicas, internas y externas, de intercambio de conocimientos, la presentación de investigaciones, la discusión de temas relevantes y la representación del grupo en la comunidad académica. La asistencia a estos eventos debe contribuir al desarrollo profesional y a la visibilidad del grupo de investigación.",
            "col_valores": {
              "Subproductos y Requerimientos Técnicos": [
                "Según directrices dadas por el subdirector nacional de proyección institucional o alguno de los directores técnicos. "
              ]
            }
          }
        ],
        "nombre": " Asistencia a eventos tipo: seminarios, foros, congresos o presentaciones en espacios académicos y/o de representación del Grupo de Investigación Aplicada "
      },
      {
        "id": "ACT_1782742495471",
        "items": [
          {
            "tipo": "hasta",
            "horas": 4,
            "nombre": "Apoyar la aplicación de los instrumentos para valorar el desempeño de los docentes del equipo de investigación aplicada (autoevaluación y coevaluación) en relación con los métodos y criterios establecidos en el marco del Sistema de Evaluación del desempeño del Profesor, SEDP. Apoyar la aplicación de instrumentos y rúbricas de evaluación para la valoración de la calidad, pertinencia y originalidad de los productos de investigación aplicada, tales como: documentos técnicos, publicaciones, proyectos, entre otros, asegurando que cumplan con los estándares académicos y objetivos del grupo. ",
            "col_valores": {
              "Subproductos y Requerimientos Técnicos": [
                "Según directrices dadas por el subdirector nacional de proyección institucional o alguno de los directores técnicos, en correspondencia con el Grupo de Desarrollo Profesoral. "
              ]
            }
          }
        ],
        "nombre": "Procesos de evaluación (a) del desempeño de los docentes del equipo de investigación aplicada y, (b) de los productos generados. "
      },
      {
        "id": "LAB_01",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Asistencia a seminarios, foros, congresos o presentaciones en espacios institucionales y académicos en representación del Laboratorio de Innovación ",
            "col_valores": {
              "Evidencia": [
                "Grabaciones, presentaciones utilizadas, certificados, listados de asistencia y/o foto "
              ]
            }
          },
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Participar como conferencista, panelista, presentador u otro en eventos  presenciales  y  virtuales nacionales o internacionales. ",
            "col_valores": {
              "Evidencia": [
                "Grabaciones, presentaciones utilizadas, certificados, listados de asistencia y/o foto "
              ]
            }
          },
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Asistencia a reuniones periódicas del equipo del Laboratorio de Innovación",
            "col_valores": {
              "Evidencia": [
                "Listados de asistencia. Informes y evidencias entregadas. "
              ]
            }
          },
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Revisión de documentos institucionales internos o externos cuando se requiera. ",
            "col_valores": {
              "Evidencia": [
                "Documento con observaciones. "
              ]
            }
          },
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Par evaluador de documentos analíticos elaborados por integrantes del Laboratorio (capítulos de libro o libros, guías operativas, entre otros) que requieran recursos de la DFAGE para su elaboración o publicación. ",
            "col_valores": {
              "Evidencia": [
                "Documento con observaciones. "
              ]
            }
          },
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Apoyar las iniciativas del Laboratorio cuando se requiera. ",
            "col_valores": {
              "Evidencia": [
                "Informe ejecutivo de apoyo. "
              ]
            }
          },
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Coordinación de las actividades del Laboratorio de Innovación. ",
            "col_valores": {
              "Evidencia": [
                "Informes mensuales sobre las actividades de planeación, seguimiento y control realizadas. "
              ]
            },
            "parent_col_idx": 1
          }
        ],
        "nombre": "Fijo",
        "max_horas": 100,
        "columnas_meta": {
          "Línea": [
            {
              "tipo": "hasta",
              "horas": 100,
              "horas_en": "linea"
            },
            {
              "tipo": "hasta",
              "horas": 120
            }
          ]
        },
        "horas_en_etapa": 0,
        "columnas_valores": {
          "Línea": [
            "Espacios de participación, representación   y apoyo  al Laboratorio. ",
            "Aspectos administrativos, organización  y/o gestión del Laboratorio de Innovación. "
          ],
          "Evidencia": []
        }
      },
      {
        "id": "ACT_1782706011527",
        "items": [
          {
            "tipo": "hasta",
            "horas": 80,
            "nombre": "Coordinación de las actividades del Laboratorio de Innovación. ",
            "col_valores": {
              "Evidencia": [
                " marco de las iniciativas del Laboratorio de Innovación. Documento  técnico académico elaborado y/u otro tipo de productos académicos."
              ]
            },
            "parent_col_idx": 0
          },
          {
            "tipo": "hasta",
            "horas": 40,
            "nombre": "Preparar y compilar documentos técnicos para su publicación en revistas especializadas o libros. ",
            "col_valores": {
              "Evidencia": [
                "Documento técnico elaborado "
              ]
            },
            "parent_col_idx": 0
          },
          {
            "tipo": "hasta",
            "horas": 80,
            "nombre": "Elaborar documentos técnicos que soporten la ejecución de actividades del Laboratorio ",
            "col_valores": {
              "Evidencia": [
                "Documento técnico elaborado. "
              ]
            },
            "parent_col_idx": 0
          },
          {
            "tipo": "hasta",
            "horas": 120,
            "nombre": "Diseñar, ejecutar y/o liderar iniciativas innovadoras (centro de datos, hackatones, programas audiovisuales, laboratorio itinerante, entre otras) en procesos y procedimientos IPP (Producto MinCiencias) para la proyección del Laboratorio en la ESAP y  en  las  entidades  públicas  y/o comunidades. ",
            "col_valores": {
              "Evidencia": [
                "Informe académico de ejecución de la iniciativa. "
              ]
            },
            "parent_col_idx": 0
          },
          {
            "tipo": "hasta",
            "horas": 40,
            "nombre": "Ejecutar trabajo de campo con actores o comunidades en el marco de las iniciativas del Laboratorio ",
            "col_valores": {
              "Evidencia": [
                "Informe ejecutivo del trabajo de campo "
              ]
            },
            "parent_col_idx": 0
          },
          {
            "tipo": "hasta",
            "horas": 20,
            "nombre": "Brindar acompañamiento y participar en la planeación de eventos de la DFAGE, institucionales y del Laboratorio ",
            "col_valores": {
              "Evidencia": [
                "Grabaciones, presentaciones utilizadas, certificados, listados de asistencia y/o fotos. "
              ]
            },
            "parent_col_idx": 0
          },
          {
            "tipo": "hasta",
            "horas": 40,
            "nombre": "Brindar acompañamiento y participar en la planeación del trabajo de campo con actores o comunidades. ",
            "col_valores": {
              "Evidencia": [
                "Grabaciones, presentaciones utilizadas, certificados, listados de asistencia y/o fotos "
              ]
            },
            "parent_col_idx": 0
          },
          {
            "tipo": "fija",
            "horas": 20,
            "nombre": "Representar a la ESAP en espacios consultivos relacionados con las labores del Laboratorio. ",
            "col_valores": {
              "Evidencia": [
                "Grabaciones, presentaciones utilizadas, certificados, listados de asistencia y/o fotos. "
              ]
            },
            "parent_col_idx": 0
          },
          {
            "tipo": "hasta",
            "horas": 20,
            "nombre": "Brindar charlas y conferencias o participar como panelista en el marco de las estrategias de formación del laboratorio. ",
            "col_valores": {
              "Evidencia": [
                "Grabaciones, presentaciones utilizadas, certificados, listados de asistencia y/o fotos. "
              ]
            },
            "parent_col_idx": 1
          },
          {
            "tipo": "hasta",
            "horas": 60,
            "nombre": "Coordinar y servir como enlace para ofertar y ejecutar iniciativas de capacitación en el marco de las temáticas del laboratorio ",
            "col_valores": {
              "Evidencia": [
                "Grabaciones, presentaciones utilizadas, certificados, listados de asistencia y/o fotos "
              ]
            },
            "parent_col_idx": 1
          },
          {
            "tipo": "hasta",
            "horas": 60,
            "nombre": "Diseño y gestión de estrategias de gestión social del conocimiento, divulgación de estudios sobre problemáticas públicas y procesos de innovación pública del Laboratorio, de actores estatales y no estatales, regionales, nacionales e internacionales. ",
            "col_valores": {
              "Evidencia": [
                "Documento de estrategia e informe de gestión. ",
                "Grabaciones, presentaciones utilizadas, certificados, listados de asistencia y/o fotos. "
              ]
            },
            "parent_col_idx": 1
          }
        ],
        "nombre": "Variable",
        "columnas_meta": {
          "Línea": [
            {
              "tipo": "hasta",
              "horas": 0,
              "horas_en": "actividad"
            },
            {
              "tipo": "hasta",
              "horas": 0,
              "horas_en": "actividad"
            }
          ]
        },
        "columnas_valores": {
          "Línea": [
            "Planear intervenciones, diseño e implementación de  Elaborar documentos técnicos   en  el marco de  las iniciativas  del Documento técnico académico elaborado y/u 80 iniciativas en el marco del Plan de acción     del Laboratorio (Ejecución, Apoyo y Asesoría) ",
            "Transversalización de la innovación en los programas académicos y de extensión de la ESAP e innovación pedagógica en administración pública (Formación) "
          ]
        }
      }
    ]
  },
  "inv_actividades": [
    {
      "id": "INV_01",
      "nombre": "Líder de Semillero de Investigación",
      "horas_max": 120
    },
    {
      "id": "INV_02",
      "nombre": "Enlace Territorial de Investigaciones",
      "horas_max": 200
    },
    {
      "id": "INV_03",
      "nombre": "Líder / Director de Grupo de Investigación",
      "horas_max": 200
    },
    {
      "id": "INV_04",
      "nombre": "Par evaluador de propuestas de proyecto — por propuesta",
      "horas_max": 20
    },
    {
      "id": "INV_05",
      "nombre": "Par evaluador de resultados / productos — por resultado",
      "horas_max": 20
    },
    {
      "id": "INV_06",
      "nombre": "Diseño de cursos de formación investigativa — por curso",
      "horas_max": 32
    },
    {
      "id": "INV_07",
      "nombre": "Capacitador de cursos de formación investigativa — por curso",
      "horas_max": 32
    },
    {
      "id": "INV_08",
      "nombre": "Producción de artículos científicos",
      "horas_max": 96
    },
    {
      "id": "INV_09",
      "nombre": "Producción de libro (mínimo 3 capítulos)",
      "horas_max": 144
    }
  ],
  "aadm_actividades": [
    {
      "id": "AA_01",
      "nombre": "Comisión de servicio — dentro del país",
      "max_horas": null,
      "consumeTotalidad": true
    },
    {
      "id": "AA_02",
      "nombre": "Comisión de servicio — fuera del país",
      "max_horas": null,
      "consumeTotalidad": true
    },
    {
      "id": "AA_03",
      "nombre": "Comisión de estudio",
      "max_horas": null,
      "consumeTotalidad": true
    },
    {
      "id": "AA_04",
      "nombre": "Año Sabático o Semestre de Perfeccionamiento",
      "max_horas": null,
      "consumeTotalidad": true
    },
    {
      "id": "AA_05",
      "nombre": "Cargo Directivo Académico-Administrativo",
      "max_horas": null,
      "consumeTotalidad": true
    },
    {
      "id": "AA_06",
      "nombre": "Misiones profesorales",
      "max_horas": 200,
      "consumeTotalidad": false
    },
    {
      "id": "AA_07",
      "nombre": "Actividades de Acreditación Institucional",
      "max_horas": 64,
      "consumeTotalidad": false
    },
    {
      "id": "AA_08",
      "nombre": "Organización Doctorado — Coordinador Comisión Doctoral (Parcial)",
      "max_horas": 200,
      "consumeTotalidad": false
    },
    {
      "id": "AA_08_EXC",
      "nombre": "Organización Doctorado — Coordinador Comisión Doctoral (Exclusiva)",
      "max_horas": null,
      "consumeTotalidad": true
    },
    {
      "id": "AA_09",
      "nombre": "Organización Doctorado — Comisionado Comité Científico",
      "max_horas": 60,
      "consumeTotalidad": false
    },
    {
      "id": "AA_10",
      "nombre": "Organización Doctorado — Evaluación aspirantes (por aspirante)",
      "max_horas": 10,
      "consumeTotalidad": false
    },
    {
      "id": "AA_11",
      "nombre": "Organización Doctorado — Ajuste Micro currículo y Alistamiento (por asignatura)",
      "max_horas": 100,
      "consumeTotalidad": false
    },
    {
      "id": "AA_12",
      "nombre": "Organización Doctorado — Gestor (Internacionalización o Extensión)",
      "max_horas": 100,
      "consumeTotalidad": false
    }
  ],
  "circular_version": "Circular Dispositiva 003/2025",
  "comp_actividades": [
    {
      "id": "COMP_13",
      "tipo": "fija",
      "nombre": "Acompañamiento a opciones de grado pregrado (monografía) ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 80
    },
    {
      "id": "COMP_14",
      "tipo": "fija",
      "nombre": "Acompañamiento a opciones de grado pregrado (práctica administrativa, proyecto aplicado y proyecto de investigación). ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 100
    },
    {
      "id": "COMP_17276040970",
      "tipo": "hasta",
      "nombre": "Acompañamiento seminario de trabajos de grado III y IV - Maestrías ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 18
    },
    {
      "id": "COMP_1782760611155",
      "tipo": "intervalo",
      "nombre": "Actualización y/o creación de unidades didácticas de asignaturas ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 120
    },
    {
      "id": "COMP_1782760694157",
      "tipo": "intervalo",
      "nombre": "Coordinación escuela doctoral ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 80
    },
    {
      "id": "COMP_1782760816184",
      "tipo": "hasta",
      "nombre": "Cursos de repetición y nivelación en especializaciones y maestrías",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 32
    },
    {
      "id": "COMP_1782760877038",
      "tipo": "hasta",
      "nombre": "Dirección de trabajos de grado – Maestrías ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 30
    },
    {
      "id": "COMP_1782760935958",
      "tipo": "hasta",
      "nombre": "Elaboración de los micro currículos ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 10
    },
    {
      "id": "COMP_1782761010204",
      "tipo": "hasta",
      "nombre": "Elaboración de Recursos Educativos Abiertos en el marco de la 9 estrategia pedagógica “Comunidades que Aprenden” del programa PREAAP. ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 60
    },
    {
      "id": "COMP_1782761072264",
      "tipo": "hasta",
      "nombre": "Elaboración, revisión, actualización y validación de preguntas estilo pruebas tipo     ECAES    para atender los procesos de selección y procesos evaluativos dentro de los diferentes programas",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 3
    },
    {
      "id": "COMP_1782761142393",
      "tipo": "hasta",
      "nombre": "Examen de habilitación o segundo calificador ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 10
    },
    {
      "id": "COMP_1782761216118",
      "tipo": "hasta",
      "nombre": "Examen de: homologación, suficiencia o supletorio ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 6
    },
    {
      "id": "COMP_1782761295947",
      "tipo": "hasta",
      "nombre": "Jurado de concurso docente no vinculado a la carrera TC/MT ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 5
    },
    {
      "id": "COMP_1782761664450",
      "tipo": "hasta",
      "nombre": "Jurado de concurso docente vinculado a la carrera",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 5
    },
    {
      "id": "COMP_1782763071430",
      "tipo": "hasta",
      "nombre": "Jurado de trabajo de grado en maestrías ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 12
    },
    {
      "id": "COMP_1782767023382",
      "tipo": "hasta",
      "nombre": "Jurado para valoración de productos académicos e investigativos",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 20
    },
    {
      "id": "COMP_1782767077896",
      "tipo": "hasta",
      "nombre": "Líder académico de campo de conocimiento de programa ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 100
    },
    {
      "id": "COMP_1782767391025",
      "tipo": "intervalo",
      "nombre": "Líder académico en programa de posgrados ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 200
    },
    {
      "id": "COMP_1782767155730",
      "tipo": "hasta",
      "nombre": "Miembro de Junta Directiva de Sindicato Docente",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 320
    },
    {
      "id": "COMP_1782767334489",
      "tipo": "hasta",
      "nombre": "Participación como expositores en eventos académicos aprobados por las decanaturas, con ponencias de carácter nacional e internacional ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 30
    },
    {
      "id": "COMP_1782768494330",
      "tipo": "hasta",
      "nombre": "Participación en cuerpos colegiados en representación docente ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 40
    },
    {
      "id": "COMP_1782767707003",
      "tipo": "hasta",
      "nombre": "Participación en escenarios académicos en representación institucional definidos por las Decanaturas / Dirección Territorial ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 5
    },
    {
      "id": "COMP_1782768723241",
      "tipo": "hasta",
      "nombre": "Participación en las actividades formativas para el desarrollo de competencias disciplinares, pedagógicas y tecnológicas, ofertadas por la ESAP en el Plan Anual de Desarrollo Profesoral ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 48
    },
    {
      "id": "COMP_1782768772256",
      "tipo": "hasta",
      "nombre": "Producción académica derivada de la actividad docente como: paper, proyecto de investigación formativa, ensayo, documentos de innovación tecnológica, pedagógica, ya avalada por pares internos y publicable ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 80
    },
    {
      "id": "COMP_1782768875232",
      "tipo": "hasta",
      "nombre": "Actividades desarrolladas en el marco del proceso de acreditación institucional. ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 800
    },
    {
      "id": "COMP_1782769361480",
      "tipo": "hasta",
      "nombre": "Desempeño de cargos de carácter Directivo AcadémicoAdministrativo asignados mediante acto administrativo.",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 800
    },
    {
      "id": "COMP_1782769551966",
      "tipo": "hasta",
      "nombre": "Comisiones de servicio dentro o fuera de la ESAP reconocidas mediante acto administrativo. ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 800
    },
    {
      "id": "COMP_1782769872584",
      "tipo": "hasta",
      "nombre": "Comisiones de estudio reconocidas mediante acto administrativo. ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 800
    },
    {
      "id": "COMP_1782769926660",
      "tipo": "hasta",
      "nombre": "Año Sabático o Semestre de Perfeccionamiento reconocidos mediante acto administrativo. ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 800
    },
    {
      "id": "COMP_1782769970876",
      "tipo": "hasta",
      "nombre": "Misiones profesorales. ",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 200
    },
    {
      "id": "COMP_1782770223512",
      "tipo": "fija",
      "nombre": "AAOD",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 200
    },
    {
      "id": "COMP_1782770314386",
      "tipo": "hasta",
      "nombre": "AAOD",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 600
    },
    {
      "id": "COMP_1782770362395",
      "tipo": "hasta",
      "nombre": "AAOD",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 10
    },
    {
      "id": "COMP_1782770401541",
      "tipo": "hasta",
      "nombre": "AAOD",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 100
    },
    {
      "id": "COMP_1782770420454",
      "tipo": "hasta",
      "nombre": "AAOD",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 100
    },
    {
      "id": "COMP_1782770452992",
      "tipo": "hasta",
      "nombre": "AAOD",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 100
    },
    {
      "id": "COMP_1782770547754",
      "tipo": "hasta",
      "nombre": "AAOD",
      "seccion": "ACTIVIDADES COMPLEMENTARIAS A LA DOCENCIA",
      "max_horas": 100
    }
  ],
  "config_bloqueada": false,
  "aadm_misiones_pct": 25,
  "comp_exam_homolog": 6,
  "comp_expo_eventos": 30,
  "docencia_base_apt": 16,
  "ext_fag_red_arq_1": 100,
  "ext_fag_red_arq_2": 40,
  "ext_lab_var_campo": 40,
  "ext_lab_var_coord": 60,
  "inv_diseno_cursos": 32,
  "max_pct_extension": 25,
  "max_pct_inv_lider": 50,
  "comp_anexo1_fuente": "Pendiente de cotejo contra Anexo 1",
  "ext_fag_red_plan_1": 40,
  "ext_fag_red_plan_2": 40,
  "ext_lab_var_elab_1": 40,
  "ext_lab_var_elab_2": 80,
  "ext_max_pct_enlace": 25,
  "fecha_fin_semestre": "",
  "horas_semanales_mt": 20,
  "horas_semanales_tc": 40,
  "inv_par_propuestas": 20,
  "inv_par_resultados": 20,
  "sla_radicacion_pta": 5,
  "aadm_misiones_horas": 200,
  "comp_actividades_v2": {
    "complementarias_docencia": [
      {
        "id": "COMP_13",
        "items": [
          {
            "tipo": "fija",
            "horas": 20,
            "nombre": "horas por estudiante o grupo, en programa de pregrado AP * "
          },
          {
            "tipo": "fija",
            "horas": 20,
            "nombre": "r estudiante o grupo, en programa de pregrado APT (10 horas para estudiantes en 9no semestre + 10 horas para estudiantes en 10mo semestre) ** "
          }
        ],
        "nombre": "Acompañamiento a opciones de grado pregrado (monografía) ",
        "max_horas": 80
      },
      {
        "id": "COMP_14",
        "items": [
          {
            "tipo": "fija",
            "horas": 20,
            "nombre": " Estudiante o grupo, en programa de pregrado AP *"
          },
          {
            "tipo": "fija",
            "horas": 16,
            "nombre": "Estudiante o grupo, en programa de pregrado APT ** "
          }
        ],
        "nombre": "Acompañamiento a opciones de grado pregrado (práctica administrativa, proyecto aplicado y proyecto de investigación). ",
        "max_horas": 100
      },
      {
        "id": "COMP_17276040970",
        "items": [
          {
            "tipo": "hasta",
            "horas": 18,
            "nombre": "Estudiante o grupo, en programa de Maestría. "
          }
        ],
        "nombre": "Acompañamiento seminario de trabajos de grado III y IV - Maestrías "
      },
      {
        "id": "COMP_1782760611155",
        "items": [
          {
            "tipo": "intervalo",
            "horas": 120,
            "nombre": "Por Unidad",
            "horas_min": 60
          }
        ],
        "nombre": "Actualización y/o creación de unidades didácticas de asignaturas "
      },
      {
        "id": "COMP_1782760694157",
        "items": [
          {
            "tipo": "intervalo",
            "horas": 80,
            "nombre": "Por Unidad",
            "horas_min": 40
          }
        ],
        "nombre": "Coordinación escuela doctoral "
      },
      {
        "id": "COMP_1782760816184",
        "items": [
          {
            "tipo": "hasta",
            "horas": 32,
            "nombre": "Por Curso"
          }
        ],
        "nombre": "Cursos de repetición y nivelación en especializaciones y maestrías"
      },
      {
        "id": "COMP_1782760877038",
        "items": [
          {
            "tipo": "hasta",
            "horas": 30,
            "nombre": " Estudiante o grupo. "
          }
        ],
        "nombre": "Dirección de trabajos de grado – Maestrías "
      },
      {
        "id": "COMP_1782760935958",
        "items": [
          {
            "tipo": "hasta",
            "horas": 10,
            "nombre": "Por micro currículo"
          }
        ],
        "nombre": "Elaboración de los micro currículos "
      },
      {
        "id": "COMP_1782761010204",
        "items": [
          {
            "tipo": "hasta",
            "horas": 60,
            "nombre": "Periodo académico o periodo intersemestral. "
          }
        ],
        "nombre": "Elaboración de Recursos Educativos Abiertos en el marco de la 9 estrategia pedagógica “Comunidades que Aprenden” del programa PREAAP. "
      },
      {
        "id": "COMP_1782761072264",
        "items": [
          {
            "tipo": "hasta",
            "horas": 3,
            "nombre": " Por pregunta "
          }
        ],
        "nombre": "Elaboración, revisión, actualización y validación de preguntas estilo pruebas tipo     ECAES    para atender los procesos de selección y procesos evaluativos dentro de los diferentes programas"
      },
      {
        "id": "COMP_1782761142393",
        "items": [
          {
            "tipo": "hasta",
            "horas": 10,
            "nombre": "Por grupo o individual. "
          }
        ],
        "nombre": "Examen de habilitación o segundo calificador "
      },
      {
        "id": "COMP_1782761216118",
        "items": [
          {
            "tipo": "hasta",
            "horas": 6,
            "nombre": "Estudiante o grupo. "
          }
        ],
        "nombre": "Examen de: homologación, suficiencia o supletorio "
      },
      {
        "id": "COMP_1782761295947",
        "items": [
          {
            "tipo": "hasta",
            "horas": 5,
            "nombre": "Por aspirante"
          }
        ],
        "nombre": "Jurado de concurso docente no vinculado a la carrera TC/MT "
      },
      {
        "id": "COMP_1782761664450",
        "items": [
          {
            "tipo": "hasta",
            "horas": 5,
            "nombre": "Por aspirante"
          }
        ],
        "nombre": "Jurado de concurso docente vinculado a la carrera"
      },
      {
        "id": "COMP_1782763071430",
        "items": [
          {
            "tipo": "hasta",
            "horas": 12,
            "nombre": "Horas"
          },
          {
            "tipo": "hasta",
            "horas": 0,
            "nombre": ""
          }
        ],
        "nombre": "Jurado de trabajo de grado en maestrías "
      },
      {
        "id": "COMP_1782767023382",
        "items": [
          {
            "tipo": "hasta",
            "horas": 20,
            "nombre": "Por producto "
          }
        ],
        "nombre": "Jurado para valoración de productos académicos e investigativos"
      },
      {
        "id": "COMP_1782767077896",
        "items": [
          {
            "tipo": "hasta",
            "horas": 100,
            "nombre": "Por  horas"
          }
        ],
        "nombre": "Líder académico de campo de conocimiento de programa "
      },
      {
        "id": "COMP_1782767391025",
        "items": [
          {
            "tipo": "intervalo",
            "horas": 200,
            "nombre": "Horas",
            "horas_min": 120
          }
        ],
        "nombre": "Líder académico en programa de posgrados "
      },
      {
        "id": "COMP_1782767155730",
        "items": [
          {
            "tipo": "hasta",
            "horas": 320,
            "nombre": "Miembro Titular (40%)"
          },
          {
            "tipo": "hasta",
            "horas": 160,
            "nombre": "Miembro Suplente (20%)"
          }
        ],
        "nombre": "Miembro de Junta Directiva de Sindicato Docente"
      },
      {
        "id": "COMP_1782767334489",
        "items": [
          {
            "tipo": "hasta",
            "horas": 30,
            "nombre": "Horas"
          }
        ],
        "nombre": "Participación como expositores en eventos académicos aprobados por las decanaturas, con ponencias de carácter nacional e internacional "
      },
      {
        "id": "COMP_1782768494330",
        "items": [
          {
            "tipo": "hasta",
            "horas": 40,
            "nombre": "Por hora"
          }
        ],
        "nombre": "Participación en cuerpos colegiados en representación docente "
      },
      {
        "id": "COMP_1782767707003",
        "items": [
          {
            "tipo": "hasta",
            "horas": 5,
            "nombre": "Por evento"
          }
        ],
        "nombre": "Participación en escenarios académicos en representación institucional definidos por las Decanaturas / Dirección Territorial "
      },
      {
        "id": "COMP_1782768723241",
        "items": [
          {
            "tipo": "hasta",
            "horas": 48,
            "nombre": "Por Semestre"
          }
        ],
        "nombre": "Participación en las actividades formativas para el desarrollo de competencias disciplinares, pedagógicas y tecnológicas, ofertadas por la ESAP en el Plan Anual de Desarrollo Profesoral "
      },
      {
        "id": "COMP_1782768772256",
        "items": [
          {
            "tipo": "hasta",
            "horas": 80,
            "nombre": "Por Horas"
          }
        ],
        "nombre": "Producción académica derivada de la actividad docente como: paper, proyecto de investigación formativa, ensayo, documentos de innovación tecnológica, pedagógica, ya avalada por pares internos y publicable "
      },
      {
        "id": "COMP_1782768875232",
        "items": [
          {
            "tipo": "hasta",
            "horas": 800,
            "nombre": "Horas"
          }
        ],
        "nombre": "Actividades desarrolladas en el marco del proceso de acreditación institucional. "
      },
      {
        "id": "COMP_1782769361480",
        "items": [
          {
            "tipo": "hasta",
            "horas": 800,
            "nombre": "  100% del PTA atendiendo lo dispuesto en el acto administrativo que asigna el cargo. "
          }
        ],
        "nombre": "Desempeño de cargos de carácter Directivo AcadémicoAdministrativo asignados mediante acto administrativo."
      },
      {
        "id": "COMP_1782769551966",
        "items": [
          {
            "tipo": "hasta",
            "horas": 800,
            "nombre": "100% del PTA atendiendo lo dispuesto en el acto administrativo que otorga la comisión. "
          }
        ],
        "nombre": "Comisiones de servicio dentro o fuera de la ESAP reconocidas mediante acto administrativo. "
      },
      {
        "id": "COMP_1782769872584",
        "items": [
          {
            "tipo": "hasta",
            "horas": 800,
            "nombre": "100% del PTA atendiendo lo dispuesto en el acto administrativo que otorga la comisión. "
          }
        ],
        "nombre": "Comisiones de estudio reconocidas mediante acto administrativo. "
      },
      {
        "id": "COMP_1782769926660",
        "items": [
          {
            "tipo": "hasta",
            "horas": 800,
            "nombre": "100% del PTA atendiendo lo dispuesto en el acto administrativo que otorga Año Sabático o Semestre de Perfeccionamiento. "
          }
        ],
        "nombre": "Año Sabático o Semestre de Perfeccionamiento reconocidos mediante acto administrativo. "
      },
      {
        "id": "COMP_1782769970876",
        "items": [
          {
            "tipo": "hasta",
            "horas": 200,
            "nombre": "Hasta 200 horas o el equivalente al 25% de su PTA. La Dirección Nacional emitirá una comunicación oficial a las Direcciones Territoriales y el Grupo de Gestión Profesoral para incluir las 200 horas correspondientes. "
          }
        ],
        "nombre": "Misiones profesorales. "
      },
      {
        "id": "COMP_1782770223512",
        "items": [
          {
            "tipo": "fija",
            "horas": 200,
            "nombre": "Coordinador Comisión Doctoral "
          }
        ],
        "nombre": "AAOD"
      },
      {
        "id": "COMP_1782770314386",
        "items": [
          {
            "tipo": "hasta",
            "horas": 600,
            "nombre": "Participación Comisionado Comité Científico Doctorado "
          }
        ],
        "nombre": "AAOD"
      },
      {
        "id": "COMP_1782770362395",
        "items": [
          {
            "tipo": "hasta",
            "horas": 10,
            "nombre": "Evaluación de Propuestas de Aspirantes al Doctorado "
          }
        ],
        "nombre": "AAOD"
      },
      {
        "id": "COMP_1782770401541",
        "items": [
          {
            "tipo": "hasta",
            "horas": 100,
            "nombre": "Ajuste de Micro currículo y Alistamiento de Asignaturas "
          }
        ],
        "nombre": "AAOD"
      },
      {
        "id": "COMP_1782770420454",
        "items": [
          {
            "tipo": "hasta",
            "horas": 100,
            "nombre": "Gestor Internacionalización "
          }
        ],
        "nombre": "AAOD"
      },
      {
        "id": "COMP_1782770452992",
        "items": [
          {
            "tipo": "hasta",
            "horas": 100,
            "nombre": "Gestor Extensión "
          }
        ],
        "nombre": "AAOD"
      },
      {
        "id": "COMP_1782770547754",
        "items": [
          {
            "tipo": "hasta",
            "horas": 100,
            "nombre": "Evaluación de Propuestas de Aspirantes al Doctorado "
          }
        ],
        "nombre": "AAOD"
      }
    ],
    "academico_administrativas": [
      {
        "id": "AA_01",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Comisión de servicio — dentro del país"
          }
        ],
        "nombre": "Comisión de servicio — dentro del país",
        "consumeTotalidad": true
      },
      {
        "id": "AA_02",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Comisión de servicio — fuera del país"
          }
        ],
        "nombre": "Comisión de servicio — fuera del país",
        "consumeTotalidad": true
      },
      {
        "id": "AA_03",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Comisión de estudio"
          }
        ],
        "nombre": "Comisión de estudio",
        "consumeTotalidad": true
      },
      {
        "id": "AA_04",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Año Sabático o Semestre de Perfeccionamiento"
          }
        ],
        "nombre": "Año Sabático o Semestre de Perfeccionamiento",
        "consumeTotalidad": true
      },
      {
        "id": "AA_05",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Cargo Directivo Académico-Administrativo"
          }
        ],
        "nombre": "Cargo Directivo Académico-Administrativo",
        "consumeTotalidad": true
      },
      {
        "id": "AA_06",
        "items": [
          {
            "tipo": "hasta",
            "horas": 200,
            "nombre": "Misiones profesorales"
          }
        ],
        "nombre": "Misiones profesorales",
        "max_horas": 200,
        "consumeTotalidad": false
      },
      {
        "id": "AA_07",
        "items": [
          {
            "tipo": "hasta",
            "horas": 64,
            "nombre": "Actividades de Acreditación Institucional"
          }
        ],
        "nombre": "Actividades de Acreditación Institucional",
        "max_horas": 64,
        "consumeTotalidad": false
      },
      {
        "id": "AA_08",
        "items": [
          {
            "tipo": "hasta",
            "horas": 200,
            "nombre": "Organización Doctorado — Coordinador Comisión Doctoral (Parcial)"
          }
        ],
        "nombre": "Organización Doctorado — Coordinador Comisión Doctoral (Parcial)",
        "max_horas": 200,
        "consumeTotalidad": false
      },
      {
        "id": "AA_08_EXC",
        "items": [
          {
            "tipo": "fija",
            "horas": 0,
            "nombre": "Organización Doctorado — Coordinador Comisión Doctoral (Exclusiva)"
          }
        ],
        "nombre": "Organización Doctorado — Coordinador Comisión Doctoral (Exclusiva)",
        "consumeTotalidad": true
      },
      {
        "id": "AA_09",
        "items": [
          {
            "tipo": "hasta",
            "horas": 60,
            "nombre": "Organización Doctorado — Comisionado Comité Científico"
          }
        ],
        "nombre": "Organización Doctorado — Comisionado Comité Científico",
        "max_horas": 60,
        "consumeTotalidad": false
      },
      {
        "id": "AA_10",
        "items": [
          {
            "tipo": "hasta",
            "horas": 10,
            "nombre": "Organización Doctorado — Evaluación aspirantes (por aspirante)"
          }
        ],
        "nombre": "Organización Doctorado — Evaluación aspirantes (por aspirante)",
        "max_horas": 10,
        "consumeTotalidad": false
      },
      {
        "id": "AA_11",
        "items": [
          {
            "tipo": "hasta",
            "horas": 100,
            "nombre": "Organización Doctorado — Ajuste Micro currículo y Alistamiento (por asignatura)"
          }
        ],
        "nombre": "Organización Doctorado — Ajuste Micro currículo y Alistamiento (por asignatura)",
        "max_horas": 100,
        "consumeTotalidad": false
      },
      {
        "id": "AA_12",
        "items": [
          {
            "tipo": "hasta",
            "horas": 100,
            "nombre": "Organización Doctorado — Gestor (Internacionalización o Extensión)"
          }
        ],
        "nombre": "Organización Doctorado — Gestor (Internacionalización o Extensión)",
        "max_horas": 100,
        "consumeTotalidad": false
      }
    ]
  },
  "comp_doc_gestor_ext": 100,
  "comp_exam_hab_grupo": 10,
  "comp_prod_academica": 80,
  "ext_cursos_ejec_max": 32,
  "ext_inv_doc_tec_max": 60,
  "ext_inv_doc_tec_min": 40,
  "ext_inv_eventos_max": 8,
  "ext_lab_var_charlas": 20,
  "ext_lab_var_disenar": 120,
  "ext_lab_var_planear": 80,
  "max_horas_inv_lider": 400,
  "max_pct_inv_fomento": 25,
  "sla_verificacion_vr": 3,
  "comp_anexo1_validado": false,
  "comp_doc_comisionado": 60,
  "comp_doc_gestor_intl": 100,
  "comp_elab_preg_ecaes": 3,
  "comp_lider_campo_con": 100,
  "comp_rep_cuerpos_col": 40,
  "ext_eag_coaching_max": 200,
  "ext_eag_coaching_min": 80,
  "ext_max_horas_enlace": 200,
  "ggp_auditoria_activa": false,
  "inv_produccion_libro": 144,
  "sla_verificacion_sna": 3,
  "aadm_acreditacion_max": 64,
  "comp_act_unidades_max": 120,
  "comp_act_unidades_min": 60,
  "comp_jurado_productos": 20,
  "comp_secciones_custom": [],
  "docencia_por_programa": {
    "57": {
      "base": 64,
      "esVariable": false,
      "multiplicador": 3
    },
    "58": {
      "base": 64,
      "esVariable": false,
      "multiplicador": 3
    },
    "59": {
      "base": 16,
      "esVariable": true,
      "multiplicador": 3
    },
    "60": {
      "base": 64,
      "esVariable": false,
      "multiplicador": 3
    },
    "61": {
      "base": 16,
      "esVariable": true,
      "multiplicador": 3
    },
    "62": {
      "base": 16,
      "esVariable": true,
      "multiplicador": 3
    },
    "63": {
      "base": 16,
      "esVariable": true,
      "multiplicador": 3
    },
    "64": {
      "base": 16,
      "esVariable": true,
      "multiplicador": 3
    },
    "65": {
      "base": 16,
      "esVariable": true,
      "multiplicador": 3
    },
    "66": {
      "base": 16,
      "esVariable": true,
      "multiplicador": 3
    },
    "67": {
      "base": 16,
      "esVariable": true,
      "multiplicador": 3
    },
    "68": {
      "base": 12,
      "esVariable": true,
      "multiplicador": 3
    },
    "69": {
      "base": 12,
      "esVariable": true,
      "multiplicador": 3
    },
    "70": {
      "base": 12,
      "esVariable": true,
      "multiplicador": 3
    }
  },
  "ext_eag_formacion_max": 200,
  "ext_eag_formacion_min": 80,
  "fecha_inicio_semestre": "",
  "max_horas_aadm_global": 200,
  "max_horas_inv_fomento": 200,
  "max_pct_inv_asistente": 25,
  "max_pct_investigacion": 50,
  "min_creditos_docencia": 3,
  "comp_acomp_pregrado_ap": 20,
  "comp_cursos_repeticion": 32,
  "comp_secciones_deleted": [
    "acompanamiento",
    "diseno",
    "coordinacion",
    "sindicatos",
    "evaluaciones"
  ],
  "comp_sindicato_titular": 320,
  "docencia_base_maestria": 12,
  "ext_fag_red_analisis_1": 80,
  "ext_fag_red_analisis_2": 80,
  "ext_fag_red_analisis_3": 100,
  "ext_lab_var_diseno_est": 60,
  "ext_sel_jurado_apt_apl": 2,
  "ext_sel_jurado_apt_vir": 2,
  "ext_sel_jurado_con_cal": 3,
  "ext_sel_revision_casos": 3,
  "ext_talleres_ejec_base": 8,
  "horas_base_carrera_003": 800,
  "horas_base_carrera_009": 720,
  "inv_capacitador_cursos": 32,
  "inv_director_grupo_pct": 25,
  "comp_doc_ajuste_microcv": 100,
  "comp_doc_coord_comision": 200,
  "comp_doc_eval_propuesta": 10,
  "comp_lider_posgrado_max": 200,
  "comp_lider_posgrado_min": 120,
  "comp_sindicato_suplente": 160,
  "ext_diplomados_ejec_max": 80,
  "ext_eag_gestion_con_max": 200,
  "ext_eag_gestion_con_min": 80,
  "ext_lab_var_acomp_campo": 40,
  "ext_lab_var_representar": 20,
  "ext_sel_item_validacion": 1,
  "ext_sel_jurado_con_asis": 2,
  "ext_sel_revision_prueba": 1,
  "inv_adjunto_obligatorio": true,
  "inv_lider_semillero_max": 120,
  "max_horas_inv_asistente": 200,
  "max_pct_complementarias": 25,
  "comp_exam_hab_individual": 3,
  "comp_rep_escenarios_acad": 5,
  "dias_cierre_concertacion": 5,
  "ext_inv_plan_trabajo_max": 6,
  "ext_inv_plan_trabajo_min": 2,
  "ext_inv_prod_des_tec_max": 60,
  "ext_inv_prod_des_tec_min": 40,
  "ext_sel_grupos_discusion": 1.5,
  "ext_seminarios_ejec_base": 16,
  "inv_director_grupo_horas": 200,
  "inv_produccion_articulos": 96,
  "comp_acomp_pregrado_apt_9": 10,
  "comp_jurado_concurso_vinc": 5,
  "docencia_base_pregrado_sc": 64,
  "ext_inv_procesos_eval_max": 4,
  "ext_lab_var_acomp_eventos": 20,
  "ext_sel_validacion_prueba": 2,
  "max_pct_inv_ext_combinado": 50,
  "semanas_periodo_academico": 20,
  "comp_acomp_pregrado_apt_10": 10,
  "comp_coord_escuela_doc_max": 80,
  "comp_coord_escuela_doc_min": 40,
  "comp_dir_trabajos_maestria": 30,
  "comp_elab_micro_curriculos": 10,
  "dias_limite_radicacion_ggp": 10,
  "docencia_base_seminario_sc": 128,
  "ext_eag_desarrollo_con_max": 120,
  "ext_eag_desarrollo_con_min": 40,
  "ext_fag_asistencia_tecnica": 80,
  "ext_inv_prod_formacion_max": 60,
  "ext_inv_prod_formacion_min": 40,
  "ext_inv_prod_nuevo_con_max": 60,
  "ext_inv_prod_nuevo_con_min": 40,
  "ext_lab_fijo_participacion": 100,
  "ext_sel_construccion_casos": 4,
  "inv_enlace_territorial_pct": 25,
  "inv_resolucion_obligatoria": true,
  "max_horas_extension_global": 200,
  "max_pct_inv_coinvestigador": 37.5,
  "requiere_aprobacion_inicio": true,
  "sla_consolidacion_nacional": 20,
  "sla_verificacion_jefaturas": 15,
  "comp_acomp_pregrado_prac_ap": 20,
  "comp_formacion_competencias": 48,
  "dias_verificacion_posterior": 15,
  "ext_fag_bateria_indicadores": 80,
  "ext_lab_fijo_administrativo": 120,
  "ext_sel_analisis_evidencias": 1.5,
  "plazo_consolidacion_semanas": 4,
  "requiere_acreditacion_final": true,
  "comp_acomp_pregrado_prac_apt": 16,
  "comp_jurado_concurso_no_vinc": 5,
  "comp_jurado_trabajo_maestria": 12,
  "ext_inv_prod_apropiacion_max": 60,
  "ext_inv_prod_apropiacion_min": 40,
  "inv_enlace_territorial_horas": 200,
  "max_horas_inv_coinvestigador": 300,
  "comp_acomp_seminario_maestria": 18,
  "docencia_base_especializacion": 16,
  "semanas_limite_aprobacion_pta": 4,
  "max_horas_investigacion_global": 400,
  "min_pct_docencia_no_vinculados": 50,
  "criterio_multiplicador_docencia": 3,
  "ext_construccion_contenidos_max": 160,
  "max_horas_complementarias_global": 200
}
$pta$::jsonb
    || jsonb_build_object(
         'config_snapshots', COALESCE(valor->'config_snapshots', '[]'::jsonb),
         'config_changelog', COALESCE(valor->'config_changelog', '[]'::jsonb)
       ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE clave = 'pta_rules_v2';

COMMIT;
