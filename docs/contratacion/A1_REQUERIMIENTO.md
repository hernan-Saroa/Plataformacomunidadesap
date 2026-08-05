# ESAP-TD-FO-019 — Requerimiento Módulo Contratación

| Información del solicitante |
| Solicitante | Dirección de Contratación – ESAP (responsable funcional por asignar) |
| Área | Dirección de Contratación |
| Correo / Celular | Por definir por la Dirección de Contratación |

| Información de la solicitud |
| Nombre de Proyecto | Plataforma SuperAPP – Comunidad ESAP – Módulo de Gestión de Contratación (Fase 1) |
| No. del requerimiento | Por asignar (OTIC) |
| Fecha de solicitud del requerimiento | 01/07/2026 |
| Complejidad | Alta |

| Historial de cambios al documento |
| Fecha | Versión | Descripción | Autor |
| 01/07/2026 | 1 | Versión inicial del documento de requerimiento del Módulo de Gestión de Contratación de la Plataforma SuperAPP – Comunidad ESAP, elaborado con base en la Matriz de Flujo de Gestión de Contratación (20260616), validada en mesa de trabajo del 9 de junio de 2026 con la Dirección de Contratación. | Dirección de Contratación – ESAP |

| INFORMACIÓN DEL REQUERIMIENTO |

## DETALLE DEL REQUERIMIENTO

### Descripción del requerimiento

Se requiere el desarrollo del Módulo de Gestión de Contratación dentro de la Plataforma SuperAPP, que permita administrar de forma integral el ciclo de vida contractual de la Escuela Superior de Administración Pública (ESAP), desde la identificación de la necesidad hasta el cierre y archivo del expediente contractual.

El módulo debe cubrir las once (11) modalidades de contratación vigentes que son:

Licitación Pública

Selección Abreviada de Menor Cuantía

Selección Abreviada por Subasta Inversa

Enajenación de Bienes por Subasta

Selección Abreviada por TVEC

Selección Abreviada por Bolsa Mercantil

Concurso de Méritos Abierto

Concurso de Méritos con Precalificación

Mínima Cuantía

Contratación de Régimen Especial – Decreto 092 de 2017

Contratación Directa

Automatizando las diez (10) etapas:

(1) Identificación y Planeación

(2) Plan Anual de Adquisiciones

(3) Estudios Previos

(4) CDP

(5) Elaboración y Publicación del Proceso

(6) Recepción y Evaluación de Ofertas

(7) Adjudicación

(8) Perfeccionamiento y Legalización

(9) Ejecución y Supervisión del Contrato

(10) Seguimiento, Control y Liquidación

Incluyendo la gestión de modificaciones contractuales (adición, prórroga, cesión, aclaratorio, suspensión, reanudación, terminación anticipada) y el trámite de presunto incumplimiento y caducidad.

Alcance por fases: para la Fase 1 de este requerimiento se excluyen las etapas 1 (Identificación y Planeación) y 2 (Plan Anual de Adquisiciones), las cuales continuarán gestionándose y se contemplan para una fase posterior. En consecuencia, el alcance funcional de la Fase 1 inicia en la etapa 3 (Estudios Previos) y finaliza en la etapa 10 (Seguimiento, Control y Liquidación), para las once (11) modalidades de contratación.

Alcance – Fase 1:

Etapa 3. Estudios Previos.

Etapa 4. CDP.

Etapa 5. Elaboración y Publicación del Proceso.

Etapa 6. Recepción y Evaluación de Ofertas.

Etapa 7. Adjudicación.

Etapa 8. Perfeccionamiento y Legalización.

Etapa 9. Ejecución y Supervisión del Contrato.

Etapa 10. Seguimiento, Control y Liquidación.

Fuera de alcance – Fase 1:

Etapa 1. Identificación y Planeación

Etapa 2. Plan Anual de Adquisiciones – PAA (consolidación, aprobación y publicación en SECOP).

Adicionalmente, el módulo debe incorporar un Módulo de Configuración de Etapas que permita a la Dirección de Contratación —sin desarrollo adicional— las etapas, responsables, plazos, documentos, campos obligatorios, alertas y la aplicabilidad por modalidad del proceso.

Trazar del inventario documental de los expedientes electrónicos producidos alineados al proceso de gestión documental.

#### Descripción de la Matriz de Flujo de Gestión de Contratación (Anexo 1)

Este requerimiento se soporta e incorpora como Anexo 1 la matriz “ESAP MatrizFlujo GestionContratacion.xlsx”, elaborado y validado con la Dirección de Contratación en la mesa de trabajo. La matriz constituye la fuente única de verdad funcional para la construcción del módulo y debe mantenerse sincronizada con este documento: cualquier ajuste posterior a la matriz deberá reflejarse en una nueva versión de este requerimiento.

Estructura de columnas:

Etapa: agrupador de primer nivel del proceso (las 10 etapas del flujo de gestión de contratación).

Numeral: identificador jerárquico de la actividad dentro de la etapa (p. ej. 3.5, 3.5.1, 5.1-0, 6.7-1, 7.1.1).

Actividad: nombre corto de la actividad o punto de control del proceso.

Descripción: explicación funcional de la actividad y su resultado esperado.

Once (11) columnas de aplicabilidad (SI / NO): una por cada una de las modalidades de contratación listadas en la descripción del requerimiento, que indican si la actividad aplica o no para dicha modalidad.

Contenido:

63 actividades/puntos de control distribuidos en las 10 etapas del proceso, incluyendo puntos de decisión y flujos alternos propios de cada modalidad (p. ej. 3.5.1 Causal de contratación; 5.9 a 5.1-3 manifestación de interés, sorteo, publicación de manifestación de interés, audiencia de riesgos y aclaración de pliegos, adendas; 6.7-1 y 6.7-2 informe y apertura de sobre económico previos a subasta; 6.8 evento de subasta; 7.1.1 apertura de sobre económico en audiencia de adjudicación).

Bloque de Modificaciones Contractuales: ocho (8) tipos — Adición, Prórroga, Cesión, Aclaratorio, Suspensión, Reanudación y Terminación anticipada.

Bloque de Presunto Incumplimiento: incluye la Caducidad como causal contractual.

Bloque de Tipologías Contractuales: dieciséis (16) tipos de contrato/convenio — Prestación de Servicios, Suministro, Compraventa, Prestación de Servicios Profesionales y de Apoyo a la Gestión, Contrato Interadministrativo, Convenio Interadministrativo, Comodato, Mandato, Convenio Marco, Consultoría/Interventoría, Obra Pública, Concesión, Asociación Público-Privada, Arrendamiento, Convenio de Asociación (Decreto Ley 092 de 2017) y Otros tipos de contrato.

Bloque de Estadísticas: cinco (5) estados de seguimiento del contrato — Suscrito, En ejecución, Terminado, Liquidado y Cerrado — que corresponden a los estados que debe reportar el Módulo de Estadísticas y Reportes.

#### Requerimientos funcionales

RF-PLA — Planeación e identificación de necesidades

| Código | Requisito | Descripción | Prior. |
| RF-PLA-01 | Identificación de necesidades | Las áreas misionales registran bienes, servicios u obras requeridos para la vigencia. | Alta |
| RF-PLA-02 | Anexo técnico | Elaboración y carga del anexo técnico con descripción, cantidad y cronograma. | Alta |
| RF-PLA-03 | Matriz de necesidades | Registro de la línea en la matriz de necesidades (insumo maestro; integración con SAP). | Alta |
| RF-PLA-04 | Validación del alcance | Flujo de aprobación del alcance por la Alta Dirección y el Comité de Contratación antes del PAA. | Alta |
| RF-PLA-05 | Elaboración y publicación del PAA | Diligenciamiento, revisión jurídico-financiera y publicación del PAA (control de fecha límite 31 ene). | Alta |
| RF-PLA-06 | Acompañamiento jurídico temprano | Registro y gestión de solicitudes de acompañamiento jurídico desde la planeación (propuesta). | Media |

RF-EST — Estudios previos y presupuesto

| Código | Requisito | Descripción | Prior. |
| RF-EST-01 | Estudios previos | Elaboración de estudios previos con fundamento jurídico (Ley 80/1993 / Ley 1150/2007). | Alta |
| RF-EST-02 | Análisis del sector / estudio de mercado | Carga del Excel comparativo de precios y análisis de oferta y demanda. | Alta |
| RF-EST-03 | Determinación de la modalidad | Sugerencia de modalidad según cuantía/umbral; licitación pública automática si supera el umbral. | Alta |
| RF-EST-04 | Causal de contratación directa | Definición de la causal (servicios profesionales, proveedor exclusivo, etc.). | Alta |
| RF-EST-05 | Solicitud y expedición del CDP | Gestión del CDP; el sistema impide la apertura sin CDP expedido. | Alta |
| RF-EST-06 | Orden del CDP en directa | En contratación directa, exigir el CDP antes de elaborar los demás documentos. | Alta |

RF-DOC — Documentos del proceso

| Código | Requisito | Descripción | Prior. |
| RF-DOC-01 | Aviso y proyecto de pliego | Generación del aviso de convocatoria y proyecto de pliego de condiciones (licitación). | Alta |
| RF-DOC-02 | Acto Administrativo de Justificación | Generación del acto de justificación en contratación directa (en lugar de pliegos). | Alta |
| RF-DOC-03 | Clausulado / minuta | Generación de la minuta a partir de plantillas según la tipología del contrato. | Alta |
| RF-DOC-04 | Mesas de trabajo y observaciones | Gestión de mesas de trabajo y observaciones de las áreas solicitantes. | Media |
| RF-DOC-05 | Aprobación del Comité de Contratación | Observaciones de fondo o aprobaciones condicionadas; en directa solo si supera 1.000 SMMLV. | Alta |
| RF-DOC-06 | Gestión de adendas | Adendas a requisitos de fondo y a cronograma, con registro y publicación. | Media |
| RF-DOC-07 | Repositorio de minutas y modelos | Repositorio interno de minutas y modelos jurídicos para generación automática. | Media |

RF-PUB — Publicación y selección

| Código | Requisito | Descripción | Prior. |
| RF-PUB-01 | Publicación del proyecto de pliego | Publicación en SECOP II; 10 días hábiles en licitación pública. | Alta |
| RF-PUB-02 | Observaciones y MIPYME | Recepción/atención de observaciones y evaluación de limitación a MIPYME. | Media |
| RF-PUB-03 | Apertura del proceso | Resolución de apertura y pliego definitivo; requiere CDP. | Alta |
| RF-PUB-04 | Audiencia de Asignación de Riesgos | Audiencia obligatoria (licitación) y consolidación de la matriz de riesgos. | Alta |
| RF-PUB-05 | Cierre y recepción de ofertas | Cierre del proceso y publicación de la lista de oferentes. | Alta |
| RF-PUB-06 | Designación del Comité Evaluador | Designación mediante memorando del Ordenador del Gasto. | Alta |
| RF-PUB-07 | Evaluación de ofertas | Evaluación jurídica, financiera, técnica/experiencia y económica (ponderables y habilitantes). | Alta |
| RF-PUB-08 | Traslado del informe y subsanaciones | Traslado con plazos por modalidad; gestión de subsanaciones. | Alta |
| RF-PUB-09 | Respuesta a observaciones | Atención de observaciones al informe y decisión de continuar. | Media |

RF-ADJ — Adjudicación y contrato

| Código | Requisito | Descripción | Prior. |
| RF-ADJ-01 | Adjudicación | Acto/Audiencia de adjudicación; en obra pública el sobre económico se abre en la audiencia. | Alta |
| RF-ADJ-02 | Declaratoria desierta | Declaratoria desierta cuando no hay ofertas habilitadas. | Alta |
| RF-ADJ-03 | Generación del contrato | Generación del contrato electrónico (minuta) y aceptación del proponente. | Alta |

RF-LEG — Legalización

| Código | Requisito | Descripción | Prior. |
| RF-LEG-01 | Suscripción del contrato | Firma por el Ordenador del Gasto y el contratista. | Alta |
| RF-LEG-02 | Registro Presupuestal (RP) | Compromiso firme que sustituye al CDP en la etapa contractual. | Alta |
| RF-LEG-03 | Pólizas y ARL | Carga y aprobación de pólizas/garantías; ARL para personas naturales. | Alta |
| RF-LEG-04 | Designación del Supervisor | Designación formal por acto administrativo; identificación del supervisor activo. | Alta |
| RF-LEG-05 | Publicación del contrato | Publicación del contrato en SECOP II dentro de los plazos. | Media |

RF-EJE — Ejecución y supervisión

| Código | Requisito | Descripción | Prior. |
| RF-EJE-01 | Acta de inicio | Reunión de inicio y suscripción del acta de inicio. | Alta |
| RF-EJE-02 | Seguimiento de ejecución | Carga de informes, actas y soportes en el expediente; consulta de estado. | Alta |
| RF-EJE-03 | Reasignación de supervisor | Cambio de supervisor en cualquier momento (acto administrativo) con historial/traza. | Alta |
| RF-EJE-04 | Trámite de pagos (integración Click) | Factura, informe y aval del supervisor; integración con Click para evitar la carga triple (factura, seguridad social, RUT). | Alta |

RF-MOD — Modificaciones contractuales

| Código | Requisito | Descripción | Prior. |
| RF-MOD-01 | Adición (dinero) | Aumento de presupuesto; requiere nuevo CDP y RP. | Alta |
| RF-MOD-02 | Prórroga (tiempo) | Extensión de plazo con justificación técnica, sin afectar el presupuesto. | Alta |
| RF-MOD-03 | Cesión, aclaración, suspensión | Cesión, aclaración y suspensión/reanudación con acto administrativo o acta motivada. | Media |
| RF-MOD-04 | Regla del objeto | Validación de que el objeto del contrato no puede modificarse. | Alta |
| RF-MOD-05 | Registro y publicación | Registro y publicación de todas las modificaciones en SECOP II. | Alta |

RF-LIQ — Liquidación y cierre

| Código | Requisito | Descripción | Prior. |
| RF-LIQ-01 | Informe final de ejecución | Informe final del supervisor con consolidado de entregables. | Alta |
| RF-LIQ-02 | Acta de liquidación | Balance financiero y paz y salvo; plazos 4 meses (bilateral) / 2 meses adicionales (unilateral). | Alta |
| RF-LIQ-03 | Pago final y cierre financiero | Pago final y liberación del saldo no comprometido del RP. | Alta |
| RF-LIQ-04 | Publicación y archivo | Publicación del acta en SECOP II y archivo del expediente. | Alta |
| RF-LIQ-05 | Cierre definitivo | Estado LIQUIDADO tras el vencimiento de la estabilidad/calidad de las garantías. | Media |

RF-INC — Módulo de incumplimiento

| Código | Requisito | Descripción | Prior. |
| RF-INC-01 | Reporte de presunto incumplimiento | El supervisor reporta el presunto incumplimiento. | Alta |
| RF-INC-02 | Trámite sancionatorio | El área jurídica tramita resoluciones y audiencias sancionatorias. | Alta |
| RF-INC-03 | Acceso restringido | Acceso restringido al módulo por reserva legal. | Alta |

RF-SIS — Funcionalidades transversales del sistema

| Código | Requisito | Descripción | Prior. |
| RF-SIS-01 | Estados del contrato | Gestión de estados: suscrito, en ejecución, suspendido, terminado, liquidado y cerrado. | Alta |
| RF-SIS-02 | Roles y permisos | Gestión de roles (área estructuradora, abogado, supervisor, director, ordenador del gasto, etc.). | Alta |
| RF-SIS-03 | Alertas automáticas | Alertas de vencimiento de garantías y plazos legales de liquidación (bilateral/unilateral). | Alta |
| RF-SIS-04 | Expediente electrónico | Expediente único y trazable por proceso/contrato disponible para consulta y auditoría. | Alta |
| RF-SIS-05 | Tipologías de contrato | Clasificación por tipología para la generación automática de minutas. | Alta |
| RF-SIS-06 | Documentos con código único | Generación de documentos digitales con códigos únicos (sin formatos físicos) bajo el SGC. | Media |
| RF-SIS-07 | Integraciones | Integración con SECOP II, SAP (matriz de necesidades) y Click (pagos). | Alta |
| RF-SIS-08 | Consulta y auditoría | Disponibilidad del expediente para control interno y auditorías. | Alta |

#### Requerimientos No funcionales

| Código | Requisito | Descripción | Norma / Estándar |
| RNF-SEG-01 | Seguridad de la información | Cifrado, gestión de accesos y registro de eventos. | ISO 27001 · OWASP |
| RNF-SEG-02 | Protección de datos personales | Tratamiento conforme a la política de datos personales. | Ley 1581/2012 |
| RNF-SEG-03 | Reserva legal | Control de acceso reforzado para el módulo de incumplimiento. | Reserva legal |
| RNF-ACC-01 | Accesibilidad | Interfaces accesibles para personas con discapacidad. | WCAG 2.1 AA |
| RNF-INT-01 | Interoperabilidad | Servicios de integración con SECOP II, SAP y Click. | SECOP II / SAP / Click |
| RNF-AUD-01 | Trazabilidad y auditoría | Bitácora de eventos y trazabilidad de extremo a extremo. | MIPG · MECI |
| RNF-USA-01 | Usabilidad | Flujos guiados que reduzcan la carga administrativa y los reprocesos. | ISO 9241 |
| RNF-DIS-01 | Disponibilidad y desempeño | Niveles de servicio y tiempos de respuesta acordados. | Acuerdo de servicio |
| RNF-CAL-01 | Calidad de software | Pruebas y aseguramiento de calidad del producto. | ISO/IEC/IEEE 29119 · ISO 9001 |
| RNF-DOC-01 | Gestión documental | Conservación y consulta de documentos con códigos únicos. | SGC institucional |

### Objetivo del requerimiento

Contar con una herramienta tecnológica única que estandarice, controle y dé trazabilidad a las actividades del proceso de gestión contractual de la ESAP, que interacciona con SECOP, KLIC y el aplicativo de gestión documental (Active Document), reduciendo el uso de controles manuales en hojas de cálculo y minimizando el riesgo de incumplimiento de plazos legales.

Automatizar, en la Fase 1, el flujo de las 11 modalidades de contratación desde los estudios previos (etapa 3) hasta la liquidación (etapa 10).

Generar alertas de vencimiento de CDP, RP, pólizas y plazos contractuales.

Centralizar el expediente contractual electrónico con trazabilidad documental.

Producir estadísticas y reportes de gestión (contratos suscritos, en ejecución, terminados, liquidados y cerrados).

Permitir la configuración parametrizable de las etapas y modalidades de contratación del proceso, sin desarrollo adicional.

Garantizar una experiencia de usuario intuitiva, accesible y consistente con los demás módulos de la Comunidad ESAP, minimizando la curva de aprendizaje de los usuarios funcionales.

Implementación de firma electrónica

### Impacto en el negocio

Estandarización del proceso contractual.

Reducción de tiempos de trámite.

Trazabilidad completa del expediente.

Disminución del riesgo de errores manuales.

Soporte para auditorías de los entes de control.

Riesgos de no materializar el requerimiento: persistencia de controles dispersos en hojas de cálculo, mayor probabilidad de incumplimiento de plazos legales (CDP, pólizas, liquidación) y dificultad para consolidar estadísticas confiables de la gestión contractual de la Escuela.

### Áreas impactadas

Dirección de Contratación.

### Alcance esperado

Secuencia de pasos explicando el diagrama.

(Insumo – fuera de alcance Fase 1) El área solicitante identifica la necesidad y la consolida en la Matriz de Necesidades.

(Insumo – fuera de alcance Fase 1) La Dirección de Contratación elabora y consolida el Plan Anual de Adquisiciones (PAA) y lo publica en SECOP

Inicio Fase 1 → Se elaboran los estudios previos, se define la modalidad y se surte el comité de contratación cuando aplica.

Se solicita y expide el CDP a través del enlace con KLIC.

Se elaboran y publican los documentos del proceso en SECOP / TVEC y se gestionan observaciones y adendas.

Se recepcionan y evalúan las ofertas (jurídica, financiera y técnica).

Se adjudica el proceso y se perfecciona y legaliza el contrato (firma, garantías, RP, designación de supervisor).

El supervisor ejecuta y hace seguimiento al contrato, gestionando las modificaciones contractuales a que haya lugar.

Se elabora el informe final, se liquida (si aplica) y se archiva el expediente contractual, alimentando las estadísticas de gestión.

### Requisitos de usabilidad

El módulo debe cumplir con los siguientes lineamientos de usabilidad, en línea con la guía de estilo de la Comunidad ESAP, para garantizar una adopción efectiva por parte de los usuarios funcionales de la Dirección de Contratación, supervisores y demás partes interesadas:

Interfaz intuitiva y consistente con el look & feel de los demás módulos de la Plataforma SuperAPP.

Diseño responsive, con soporte para equipos de escritorio y dispositivos móviles/tabletas.

Accesibilidad conforme a los lineamientos WCAG 2.1 nivel AA (contraste, navegación por teclado, lectores de pantalla).

Navegación simplificada: no más de 3 clics para acceder a cualquier funcionalidad de una etapa desde el tablero principal.

Formularios con validaciones en línea y mensajes de error claros y orientados a la corrección (prevención de errores).

Ayudas contextuales (tooltips, textos de apoyo) en los campos que lo requieran, en especial en los de mayor complejidad normativa.

Vistas y accesos diferenciados por rol (área solicitante, Dirección de Contratación, comité, supervisor, OTIC), mostrando solo las acciones pertinentes a cada perfil.

Curva de aprendizaje reducida, apoyada en manual funcional.

Trazabilidad visible al usuario: estado actual del trámite, responsable y próximos pasos visibles en todo momento.

| REQUISITOS Y ANALISIS DEL REQUERIMIENTO (Diligenciada por OTIC) |

## DETALLE DE LA SOLUCIÓN

### Sistemas y procesos impactados

Sistemas Impactados:

Módulo de Gestión de Contratación (SuperAPP) – Comunidad ESAP.

SECOP II / TVEC.

KLIC (disponibilidad y compromiso presupuestal).

Active Document (radicación y trazabilidad documental).

Módulo de Estadísticas y Reportes.

Módulo de Configuración de Etapas.

Procesos Impactados:

Proceso de Gestión Contractual de la ESAP, etapas 3 (Estudios Previos) a 10 (Seguimiento, Control y Liquidación), para las once (11) modalidades de contratación vigentes.

Gestión de modificaciones contractuales (adición, prórroga, cesión, aclaratorio, suspensión, reanudación, terminación anticipada) y trámite de presunto incumplimiento y caducidad.

Proceso de gestión documental, mediante la trazabilidad del inventario documental de los expedientes electrónicos.

### Diagramas

#### Diagrama de proceso esperado

#### Diagrama de Arquitectura (Sistema / Subsistema)

#### Descripción del Sistema / Subsistema

| Sistema/ Subsistema | Descripción |
| Módulo de Gestión de Contratación (SuperAPP) | Subsistema principal: administra las etapas 3 a 10 y las 11 modalidades de contratación en la Fase 1, desde estudios previos hasta el cierre del expediente. |
| Interacción SECOP/ TVEC | Publicación y consulta de procesos de contratación, recepción de observaciones, adendas y resultados de evaluación. |
| Interacción KLIC | Consulta y registro de disponibilidad presupuestal (CDP), compromiso presupuestal (RP) y trámite de pagos. |
| Interacción Active Document | Radicación, consecutivos y trazabilidad documental de estudios previos y demás documentos del proceso. |
| Módulo de Necesidades y PAA | Fuera de alcance de la Fase 1. Consolidación de la Matriz de Necesidades y del Plan Anual de Adquisiciones (etapas 1 y 2); continuará gestionándose por los medios vigentes hasta una fase posterior. |
| Módulo de Estadísticas y Reportes | Corresponde al Módulo de Estadísticas y Reportes descrito en el numeral 3.1.a (Bloque de Estadísticas). |
| Módulo de Configuración de Etapas | Corresponde al Módulo de Configuración de Etapas descrito en el numeral 4.2.1. |

| 6. APROBACIONES |
| RESPONSABLE OTIC | FUNCIONARIO RESPONSABLE DEL AREA SOLICITANTE |
| Nombre: |  | Nombre: |  |
| Cargo: | Director (a) de la OTIC | Cargo: | Director(a) de Contratación |  |
| Firma: |  | Firma: |  |  |

