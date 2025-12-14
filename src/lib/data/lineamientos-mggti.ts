/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * LINEAMIENTOS COMPLETOS DEL MGGTI
 * Modelo de Gestión y Gobierno de TI - MRAE v3.0 MinTIC
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * FUENTE: Documento oficial MRAE v3.0 - Mayo 2023
 * Tablas 11-17 (páginas 72-96)
 * 
 * TOTAL: 63 LINEAMIENTOS OFICIALES
 * - Estrategia de TI: 9 lineamientos
 * - Gobierno de TI: 10 lineamientos
 * - Gestión de Información: 8 lineamientos
 * - Gestión de Sistemas de Información: 14 lineamientos
 * - Gestión de Servicios de TI: 14 lineamientos
 * - Gestión de Seguridad: 4 lineamientos
 * - Uso y Apropiación de TI: 4 lineamientos
 */

export interface LineamientoMGGTI {
  codigo: string;
  nombre: string;
  descripcion: string;
  evidencias: string[];
  estado: 'Completo' | 'En Progreso' | 'Pendiente' | 'No Aplica';
  progreso: number;
  responsable: string;
  fechaActualizacion: string;
  prioridad: 'Crítica' | 'Alta' | 'Media' | 'Baja';
  obligatorio: boolean;
}

export type DominioMGGTI =
  | 'estrategia-ti'
  | 'gobierno-ti'
  | 'gestion-informacion'
  | 'gestion-sistemas'
  | 'gestion-servicios-ti'
  | 'gestion-seguridad'
  | 'uso-apropiacion-ti';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 1: ESTRATEGIA DE TI (Tabla 11 - Página 72-75)
// 9 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_ESTRATEGIA_TI: LineamientoMGGTI[] = [
  {
    codigo: 'MGGTI.LI.ES.01',
    nombre: 'Entendimiento Estratégico de TI',
    descripcion: 'Las instituciones deben contar con una estrategia de TI que esté alineada con las estrategias sectoriales, el Plan Nacional de Desarrollo, los planes sectoriales, los planes decenales y los planes estratégicos institucionales.',
    evidencias: ['Documento de Entendimiento estratégico y Oportunidades y Necesidades de TI'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Director de TI',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ES.02',
    nombre: 'Documentación de la Estrategia de TI',
    descripcion: 'La dirección de TI debe contar con una estrategia de TI documentada en el Plan Estratégico de las Tecnologías de la Información PETI, con proyección para 4 años.',
    evidencias: ['Plan Estratégico de TI (PETI) con proyección de 4 años', 'Actualización anual del PETI'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Director de TI',
    fechaActualizacion: '2025-11-15',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ES.03',
    nombre: 'Gestión de los proyectos con componentes de TI',
    descripcion: 'La dirección de TI debe participar de forma activa en las actividades de Co-Creación, planeación y ejecución de los proyectos de la institución que incorporen componentes de TI.',
    evidencias: ['Documento de Gestión de proyectos y cocreación con otras áreas'],
    estado: 'En Progreso',
    progreso: 82,
    responsable: 'PMO TI',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ES.04',
    nombre: 'Gestión del presupuesto de TI',
    descripcion: 'La dirección de TI debe realizar de manera periódica el seguimiento y control de la ejecución del presupuesto de TI, clasificado según los dominios del MGGTI.',
    evidencias: ['Matriz o tablero de control de recursos financieros', 'Plan Anual de Adquisiciones'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Planeación Financiera TI',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ES.05',
    nombre: 'Catálogo de servicios de TI',
    descripcion: 'La dirección de TI debe diseñar y mantener actualizado el catálogo de servicios de TI con los Acuerdos de Nivel de Servicio (ANS) asociados.',
    evidencias: ['Catálogo de servicios de TI actualizado', 'ANS asociados a cada servicio'],
    estado: 'En Progreso',
    progreso: 78,
    responsable: 'Gestión de Servicios TI',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ES.06',
    nombre: 'Evaluación de la gestión de la estrategia de TI',
    descripcion: 'La dirección de TI debe realizar de manera periódica la evaluación de la Estrategia de TI, para determinar el nivel de avance en el cumplimiento de las metas definidas en el PETI.',
    evidencias: ['Documento con evaluación de Estrategia de TI', 'Acciones de mejora para implementación'],
    estado: 'En Progreso',
    progreso: 65,
    responsable: 'Director de TI',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ES.07',
    nombre: 'Tablero de indicadores de TI',
    descripcion: 'La dirección de TI debe contar con un tablero de indicadores que permita tener una visión integral de los avances y resultados en el desarrollo de la Estrategia de TI.',
    evidencias: ['Tablero con indicadores de resultados, entregables y procesos'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'Analítica TI',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ES.08',
    nombre: 'Investigación e innovación en TI',
    descripcion: 'La dirección de TI debe explorar y evaluar el uso de nuevas tecnologías en búsqueda de dar solución a las necesidades institucionales y brindar servicios de TI innovadores.',
    evidencias: ['Documento de análisis de tecnologías emergentes', 'Articulación con el PETI'],
    estado: 'En Progreso',
    progreso: 55,
    responsable: 'Innovación TI',
    fechaActualizacion: '2025-11-30',
    prioridad: 'Media',
    obligatorio: false
  },
  {
    codigo: 'MGGTI.LI.ES.09',
    nombre: 'Diseño impulsado con el usuario',
    descripcion: 'La dirección de TI debe involucrar activamente a los ciudadanos en la definición de trámites y servicios digitales, asegurando que el resultado final satisfaga las necesidades de los usuarios.',
    evidencias: ['Evidencia de actividades con ciudadanos en definición de servicios digitales'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'UX/UI TI',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Alta',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 2: GOBIERNO DE TI (Tabla 12 - Página 75-80)
// 10 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_GOBIERNO_TI: LineamientoMGGTI[] = [
  {
    codigo: 'MGGTI.LI.GO.01',
    nombre: 'Esquema de gobierno de TI',
    descripcion: 'La dirección de TI debe definir e implementar un esquema de Gobierno TI alineado con la estrategia Institucional y con el MIPG, que estructure y direccione el flujo de las decisiones de TI.',
    evidencias: ['Documento de estrategia de gobierno y gestión de TI', 'Políticas, estructura organizacional, grupos e instancias de coordinación'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Gobierno TI',
    fechaActualizacion: '2025-10-20',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GO.02',
    nombre: 'Gestión de las no conformidades',
    descripcion: 'La dirección de TI debe definir e incorporar acciones que permitan corregir, mejorar y controlar procesos de TI en la lista de no conformidades de auditorías.',
    evidencias: ['Documento de Plan de manejo de no-conformidades'],
    estado: 'En Progreso',
    progreso: 72,
    responsable: 'Calidad TI',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GO.03',
    nombre: 'Proceso de gestión de TI',
    descripcion: 'La dirección de TI debe estructurar e implementar un proceso de gestión de TI, alineado con las mejores prácticas y los lineamientos del MIPG.',
    evidencias: ['Documentación del proceso de Gestión de TI incorporado en el mapa de procesos'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Procesos TI',
    fechaActualizacion: '2025-09-15',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GO.04',
    nombre: 'Gestión de cambios',
    descripcion: 'La dirección de TI debe definir e implementar formalmente un procedimiento de control de cambios, considerando cambios normales y urgentes.',
    evidencias: ['Proceso de Gestión de Cambios documentado y formalizado'],
    estado: 'En Progreso',
    progreso: 85,
    responsable: 'Gestión de Cambios TI',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GO.05',
    nombre: 'Capacidades y recursos de TI',
    descripcion: 'La dirección de TI debe identificar, evaluar y monitorear las capacidades actuales y requeridas de TI, asegurando su implementación mediante procesos, roles y recursos adecuados.',
    evidencias: ['Inventario de los recursos disponibles en la gestión de TI'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Gestión de Recursos TI',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GO.06',
    nombre: 'Capacidades y Optimización de recursos de TI',
    descripcion: 'La dirección de TI debe definir los criterios y metodologías para las compras de bienes de servicios de tecnología, priorizando Acuerdos Marco de Precios (AMP) y adquisiciones en modalidad de servicio.',
    evidencias: ['Documento con criterios para adquisición de bienes y servicios', 'Estudios previos de adquisiciones'],
    estado: 'En Progreso',
    progreso: 65,
    responsable: 'Adquisiciones TI',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Media',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GO.07',
    nombre: 'Evaluación del desempeño de la gestión de TI',
    descripcion: 'La dirección de TI debe realizar el monitoreo y evaluación de desempeño de la gestión de TI a partir de las mediciones de los indicadores del proceso de Gestión TI.',
    evidencias: ['Mediciones de procesos e indicadores con gestión en el tiempo y acciones de mejora'],
    estado: 'En Progreso',
    progreso: 78,
    responsable: 'Control de Gestión TI',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GO.08',
    nombre: 'Mejoramiento de los procesos',
    descripcion: 'La dirección de TI debe identificar oportunidades de mejora del Macroproceso, procesos, subprocesos, procedimientos, guías y documentación de TI.',
    evidencias: ['Documentos actualizados del proceso de gestión de TI, subprocesos y procedimientos'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Mejora Continua TI',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Media',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GO.09',
    nombre: 'Gestión de Proveedores de TI',
    descripcion: 'La dirección de TI debe administrar todos los proveedores asociados con los proyectos y operación de TI mediante esquemas de supervisión, seguimiento, control y recibo a satisfacción.',
    evidencias: ['Evidencias de gestión de supervisores en procesos contractuales', 'Cumplimiento con MGGTI y MGPTI'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'Gestión Contractual TI',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GO.10',
    nombre: 'Políticas de TI',
    descripcion: 'La dirección de TI debe identificar y definir las políticas y estándares de TI alineados a las mejores prácticas, contemplando seguridad, continuidad, gestión de información, adquisición tecnológica, desarrollo de SI, y acceso a la tecnología.',
    evidencias: ['Documento de las políticas y estándares de TI'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Gobierno TI',
    fechaActualizacion: '2025-11-01',
    prioridad: 'Crítica',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 3: GESTIÓN DE INFORMACIÓN (Tabla 13 - Página 81-83)
// 8 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_GESTION_INFORMACION: LineamientoMGGTI[] = [
  {
    codigo: 'MGGTI.LI.GI.01',
    nombre: 'Gobierno de datos',
    descripcion: 'Las entidades deben definir un modelo de gobierno que gestione las políticas, responsabilidades, decisiones y métricas para ejercer autoridad sobre los datos.',
    evidencias: ['Esquema de gobierno de datos con políticas, roles, instancias, estándares, indicadores y modelo de gestión actualizado'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'Chief Data Officer',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GI.02',
    nombre: 'Gestión de la calidad de los datos',
    descripcion: 'Las entidades deben definir y desarrollar una estrategia para diagnosticar, medir, monitorear y establecer acciones para contar con información de calidad.',
    evidencias: ['Plan de calidad de los datos', 'Indicadores de calidad'],
    estado: 'En Progreso',
    progreso: 72,
    responsable: 'Calidad de Datos',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GI.03',
    nombre: 'Gestión de documentos electrónicos',
    descripcion: 'Las entidades deben establecer un programa para la gestión de documentos y expedientes electrónicos conforme a lo dispuesto por el Archivo General de la Nación.',
    evidencias: ['Sistema de gestión documental implementado', 'Modelo de requisitos para gestión de documentos electrónicos validado'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Gestión Documental',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GI.04',
    nombre: 'Marco de Referencia Geoespacial',
    descripcion: 'Las entidades deben adoptar las directrices y lineamientos del Marco de Referencia Geoespacial de la ICDE para facilitar los procesos de gestión geoespacial.',
    evidencias: ['Inventario de Datos Geoespaciales', 'Identificación de datos fundamentales según Marco de Referencia Geoespacial'],
    estado: 'Pendiente',
    progreso: 25,
    responsable: 'Gestión Geoespacial',
    fechaActualizacion: '2025-11-20',
    prioridad: 'Media',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GI.05',
    nombre: 'Publicación de los servicios de intercambio de información',
    descripcion: 'Las entidades deben exponer sus servicios de intercambio de información a través de la Plataforma de Interoperabilidad del Estado colombiano.',
    evidencias: ['Servicios de intercambio publicados en plataforma de interoperabilidad', 'Servicios con lenguaje común de intercambio'],
    estado: 'En Progreso',
    progreso: 60,
    responsable: 'Interoperabilidad',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GI.06',
    nombre: 'Acuerdos de nivel de servicio para intercambio de información',
    descripcion: 'Las entidades deben establecer Acuerdos de Nivel de Servicio (ANS) que permitan el intercambio de información de calidad entre sus dependencias o con otras instituciones.',
    evidencias: ['ANS definidos y aprobados para intercambio de información, con disponibilidad, seguridad y calidad'],
    estado: 'En Progreso',
    progreso: 55,
    responsable: 'Gestión de Servicios',
    fechaActualizacion: '2025-12-02',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GI.07',
    nombre: 'Uso del código postal colombiano',
    descripcion: 'Las entidades deben en el diseño de sus componentes de información identificar aquellos a los que se les deba aplicar el código postal.',
    evidencias: ['Sistemas de información y formatos que incorporan campos para código postal de Colombia'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'Arquitectura de Datos',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Media',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GI.08',
    nombre: 'Explotación de datos',
    descripcion: 'Las entidades deben aplicar técnicas analíticas en sus procesos de explotación de datos que les permitan soportar la toma de decisiones.',
    evidencias: ['Ejercicios de analítica descriptiva, predictiva o prospectiva', 'Tableros de control con información para toma de decisiones'],
    estado: 'En Progreso',
    progreso: 65,
    responsable: 'Analítica de Datos',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 4: GESTIÓN DE SISTEMAS DE INFORMACIÓN (Tabla 14 - Página 83-89)
// 14 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_GESTION_SISTEMAS: LineamientoMGGTI[] = [
  {
    codigo: 'MGGTI.LI.SI.01',
    nombre: 'Metodología para el desarrollo de sistemas de información',
    descripcion: 'La dirección de TI debe adoptar y personalizar una metodología alineada a las mejores prácticas para el desarrollo y mantenimiento de software.',
    evidencias: ['Documento o manual de metodología para desarrollo de software', 'Evidencia de aplicación en caso de desarrollo por terceros'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Desarrollo de Software',
    fechaActualizacion: '2025-09-01',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.02',
    nombre: 'Catálogo de Sistemas de Información',
    descripcion: 'La dirección de TI debe garantizar la construcción y gestión del catálogo de sistemas de información con caracterización de cada sistema.',
    evidencias: ['Catálogo de Sistemas de Información actualizado'],
    estado: 'En Progreso',
    progreso: 85,
    responsable: 'Gestión de Aplicaciones',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.03',
    nombre: 'Guía de estilo y usabilidad',
    descripcion: 'La dirección de TI debe definir, adoptar y/o adaptar una guía de estilo y usabilidad para la institución, incorporando lineamientos de gov.co y accesibilidad web.',
    evidencias: ['Guía de estilo y usabilidad alineada con principios de gov.co', 'Listados de chequeo de cumplimiento'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'UX/UI',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.04',
    nombre: 'Ambientes independientes en el ciclo de vida',
    descripcion: 'La dirección de TI debe implementar y mantener ambientes independientes (desarrollo, pruebas, producción) durante el ciclo de vida de los sistemas.',
    evidencias: ['Vista de separación de ambientes', 'Esquema de operación y control de cambios con protocolo de paso de versiones'],
    estado: 'Completo',
    progreso: 100,
    responsable: 'Infraestructura',
    fechaActualizacion: '2025-10-15',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.05',
    nombre: 'Análisis de requerimientos',
    descripcion: 'La dirección de TI debe incorporar actividades formales de análisis y gestión de requerimientos de software en el ciclo de vida que garanticen su trazabilidad.',
    evidencias: ['Guía o procedimiento de identificación, análisis, validación y trazabilidad de requerimientos', 'Formatos o herramientas de ciclo de vida de requerimientos'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Análisis de Requerimientos',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.06',
    nombre: 'Integración, entrega y despliegue continuo',
    descripcion: 'La dirección de TI debe implementar estrategias de integración, entrega y despliegue continuo en las actividades de desarrollo de sistemas.',
    evidencias: ['Procedimientos de integración continua', 'Evidencias de implementación: repositorio, pruebas automatizadas, DevOps'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'DevOps',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Media',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.07',
    nombre: 'Plan de pruebas',
    descripcion: 'La dirección de TI debe estructurar un plan de pruebas que cubra aspectos funcionales y no funcionales sobre nuevos desarrollos y mantenimientos evolutivos.',
    evidencias: ['Planes de pruebas funcionales y no funcionales', 'Documentos o actas de aprobación de pruebas'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'Calidad de Software',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.08',
    nombre: 'Manual del usuario, técnico y de operación',
    descripcion: 'La dirección de TI debe asegurar que todos sus sistemas de información cuenten con la documentación técnica y funcional debidamente actualizada.',
    evidencias: ['Manual de usuario con descripción, objetivo, procesos, módulos, funcionalidades y errores comunes', 'Manual técnico con errores técnicos, despliegue y configuración'],
    estado: 'En Progreso',
    progreso: 65,
    responsable: 'Documentación',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Media',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.09',
    nombre: 'Plan de mantenimiento de sistemas',
    descripcion: 'La dirección de TI debe elaborar un plan de mantenimiento anual de los sistemas de información de la Entidad.',
    evidencias: ['Plan de mantenimiento anual de SI', 'Procedimiento de gestión de cambios'],
    estado: 'En Progreso',
    progreso: 72,
    responsable: 'Mantenimiento de Software',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.10',
    nombre: 'Servicios de mantenimiento con terceras partes',
    descripcion: 'La dirección de TI debe establecer criterios de aceptación y definir ANS cuando se tenga contratado con terceros el mantenimiento de sistemas.',
    evidencias: ['ANS para mantenimiento de SI con descripción, métricas, rangos, sanciones, frecuencia y responsabilidades'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Gestión Contractual',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.11',
    nombre: 'Plan de calidad de los sistemas',
    descripcion: 'La dirección de TI debe implementar un plan de aseguramiento de la calidad con criterios de aceptación claros durante el ciclo de vida de los sistemas.',
    evidencias: ['Planes de calidad en proyectos de desarrollo validados por área de calidad'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Aseguramiento de Calidad',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.12',
    nombre: 'Requerimientos no funcionales',
    descripcion: 'La dirección de TI debe identificar los requerimientos no funcionales (atributos de calidad) aplicables para construcción o evolución de SI.',
    evidencias: ['Documento de especificación de requerimientos no funcionales (atributos de calidad)'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'Arquitectura de Software',
    fechaActualizacion: '2025-12-02',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.13',
    nombre: 'Accesibilidad',
    descripcion: 'La dirección de TI debe garantizar que los sistemas y portales web disponibles para ciudadanía cumplan con características de accesibilidad web.',
    evidencias: ['Trámites, servicios y SI que incorporan buenas prácticas de accesibilidad web'],
    estado: 'En Progreso',
    progreso: 62,
    responsable: 'Accesibilidad Web',
    fechaActualizacion: '2025-12-01',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.SI.14',
    nombre: 'Arquitectura de Software',
    descripcion: 'La dirección de TI debe definir, documentar y mantener actualizadas las arquitecturas de software de cada sistema de información.',
    evidencias: ['Documentación de Arquitectura de Software con: vista conceptual, vistas de integración, vista de operación y estructura del código'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Arquitectura de Software',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 5: GESTIÓN DE SERVICIOS DE TI (Tabla 15 - Página 89-93)
// 14 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_GESTION_SERVICIOS_TI: LineamientoMGGTI[] = [
  {
    codigo: 'MGGTI.LI.ST.01',
    nombre: 'Catálogo de servicios de Tecnología',
    descripcion: 'La dirección de TI debe contar con un catálogo actualizado de sus Servicios Tecnológicos.',
    evidencias: ['Catálogo de servicios de Tecnología'],
    estado: 'En Progreso',
    progreso: 78,
    responsable: 'Gestión de Servicios TI',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.02',
    nombre: 'Gestión de los servicios de TI',
    descripcion: 'La dirección de TI debe gestionar la operación y el soporte de los servicios tecnológicos, garantizando la estabilidad de la operación de TI.',
    evidencias: ['Proceso de Gestión de Servicios de TI definido e implementado'],
    estado: 'En Progreso',
    progreso: 82,
    responsable: 'Operaciones TI',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.03',
    nombre: 'Acceso a servicios en la Nube',
    descripcion: 'La dirección de TI debe evaluar como primera opción la posibilidad de adquirir Servicios Tecnológicos usando la Nube (pública, privada o híbrida).',
    evidencias: ['Servicios tecnológicos contratados o implementados con nube pública o privada'],
    estado: 'En Progreso',
    progreso: 55,
    responsable: 'Cloud Services',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Media',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.04',
    nombre: 'Continuidad y disponibilidad de servicios',
    descripcion: 'La dirección de TI debe garantizar la continuidad y disponibilidad de los servicios de TI, así como la capacidad de atención y resolución de incidentes.',
    evidencias: ['Plan de continuidad de TI', 'Evidencias de implementación del plan'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Continuidad del Negocio',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.05',
    nombre: 'Alta disponibilidad de servicios',
    descripcion: 'La dirección de TI debe implementar capacidades de alta disponibilidad para infraestructuras críticas y Servicios Tecnológicos.',
    evidencias: ['Infraestructuras y servicios de alta disponibilidad implementadas y probadas periódicamente'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Alta Disponibilidad',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.06',
    nombre: 'Capacidad de los Servicios tecnológicos',
    descripcion: 'La dirección de TI debe velar por la prestación de los servicios, identificando capacidades actuales y proyectando capacidades futuras requeridas.',
    evidencias: ['Análisis y planeación de capacidad de la infraestructura y los servicios'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'Planeación de Capacidad',
    fechaActualizacion: '2025-12-03',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.07',
    nombre: 'Acuerdos de Nivel de Servicios',
    descripcion: 'La dirección de TI debe velar por el cumplimiento de los ANS establecidos para los Servicios Tecnológicos.',
    evidencias: ['Contratos de servicios con ANS incluidos', 'Informe o indicadores de cumplimiento de ANS'],
    estado: 'En Progreso',
    progreso: 72,
    responsable: 'Gestión de Servicios',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.08',
    nombre: 'Soporte a los servicios de TI',
    descripcion: 'La dirección de TI debe definir e implementar el procedimiento para atender solicitudes de soporte de primer, segundo y tercer nivel a través de mesa de servicio.',
    evidencias: ['Mesa de servicio implementada', 'Procedimiento de gestión de requerimientos e incidentes'],
    estado: 'En Progreso',
    progreso: 85,
    responsable: 'Mesa de Ayuda',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.09',
    nombre: 'Planes de mantenimiento',
    descripcion: 'La dirección de TI debe implementar un plan de mantenimiento preventivo y evolutivo sobre toda la infraestructura y servicios tecnológicos.',
    evidencias: ['Plan de mantenimiento preventivo y evolutivo definido e implementado'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Mantenimiento TI',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.10',
    nombre: 'Monitoreo de la infraestructura',
    descripcion: 'La dirección de TI debe monitorear los recursos y servicios de TI y controlar el nivel de consumo de los recursos críticos compartidos.',
    evidencias: ['Procedimientos y mecanismos de monitoreo de recursos de infraestructura TI'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'Monitoreo TI',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.11',
    nombre: 'Respaldo y recuperación',
    descripcion: 'La dirección de TI debe contar con mecanismos de respaldo para servicios críticos y un proceso periódico de respaldo de configuración, servicios e información.',
    evidencias: ['Plan de respaldo y recuperación ante desastres', 'Evidencias de prueba de consistencia de respaldos'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Backup y Recuperación',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.12',
    nombre: 'Disposición de residuos tecnológicos',
    descripcion: 'La dirección de TI debe gestionar la correcta disposición de residuos tecnológicos de acuerdo con el Plan Institucional de Gestión Ambiental.',
    evidencias: ['Procedimiento de disposición de residuos tecnológicos', 'Evidencias de cumplimiento del procedimiento'],
    estado: 'En Progreso',
    progreso: 60,
    responsable: 'Gestión Ambiental',
    fechaActualizacion: '2025-12-02',
    prioridad: 'Media',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.13',
    nombre: 'Gestión de Problemas de TI',
    descripcion: 'La dirección de TI debe definir e implementar un procedimiento para gestión de incidentes, analizados periódicamente para identificar patrones como problemas.',
    evidencias: ['Procedimiento de gestión de incidentes con tratamiento de problemas definido e implementado'],
    estado: 'En Progreso',
    progreso: 78,
    responsable: 'Gestión de Problemas',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.ST.14',
    nombre: 'Implementación del protocolo IPv6',
    descripcion: 'La dirección de TI debe implementar el protocolo de Internet IPv6 según los lineamientos técnicos y normativos del MinTIC.',
    evidencias: ['Evidencias de direccionamiento IPv6 y servicios implementados en IPv6'],
    estado: 'Pendiente',
    progreso: 30,
    responsable: 'Redes',
    fechaActualizacion: '2025-11-15',
    prioridad: 'Media',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 6: GESTIÓN DE SEGURIDAD (Tabla 16 - Página 93-94)
// 4 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_GESTION_SEGURIDAD: LineamientoMGGTI[] = [
  {
    codigo: 'MGGTI.LI.GS.01',
    nombre: 'Modelo de Seguridad y Privacidad de la Información',
    descripcion: 'La dirección de TI debe definir y gestionar el Modelo de Seguridad y Privacidad de la Información (MSPI) de la Entidad.',
    evidencias: ['Evidencias de gestión e implementación del MSPI conforme a salidas y evidencias del Modelo MSPI de MinTIC'],
    estado: 'En Progreso',
    progreso: 82,
    responsable: 'CISO',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GS.02',
    nombre: 'Gestión de riesgos de seguridad',
    descripcion: 'La dirección de TI es responsable de identificar y mantener actualizados los riesgos de seguridad de cada uno de los activos de información.',
    evidencias: ['Matriz de riesgos de seguridad para activos de información', 'Plan de tratamientos de riesgos', 'Evidencias de gestión cuando se materializan'],
    estado: 'En Progreso',
    progreso: 78,
    responsable: 'Gestión de Riesgos SI',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GS.03',
    nombre: 'Gestión de controles de seguridad',
    descripcion: 'La dirección de TI debe implementar y gestionar los controles de seguridad definidos para los activos de información.',
    evidencias: ['Matriz de controles de seguridad para activos de información', 'Evidencias de implementación de controles'],
    estado: 'En Progreso',
    progreso: 85,
    responsable: 'Controles de Seguridad',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.GS.04',
    nombre: 'Monitoreo de seguridad',
    descripcion: 'La dirección de TI debe realizar monitoreo y seguimiento a nivel de seguridad mediante herramientas e indicadores gestionados en tableros de control.',
    evidencias: ['Herramientas de monitoreo de seguridad implementadas y configuradas', 'Indicadores de seguridad digital en tableros de control'],
    estado: 'En Progreso',
    progreso: 80,
    responsable: 'SOC',
    fechaActualizacion: '2025-12-07',
    prioridad: 'Crítica',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DOMINIO 7: USO Y APROPIACIÓN DE TI (Tabla 17 - Página 95-96)
// 4 lineamientos oficiales
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const LINEAMIENTOS_USO_APROPIACION_TI: LineamientoMGGTI[] = [
  {
    codigo: 'MGGTI.LI.UA.01',
    nombre: 'Estrategia de Uso y Apropiación de TI',
    descripcion: 'La dirección de TI debe definir una estrategia de Uso y Apropiación de TI.',
    evidencias: ['Estrategia de uso y apropiación de TI definida', 'Evidencias de su implementación'],
    estado: 'En Progreso',
    progreso: 70,
    responsable: 'Gestión del Cambio',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.UA.02',
    nombre: 'Gestión del cambio',
    descripcion: 'La dirección de TI es responsable de elaborar una estrategia de gestión del cambio cada vez que se despliegue o adquiera un nuevo sistema de información.',
    evidencias: ['Estrategia de gestión de cambio para cada nuevo SI involucrando grupos impactados', 'Evidencias de ejecución de la estrategia'],
    estado: 'En Progreso',
    progreso: 68,
    responsable: 'Gestión del Cambio',
    fechaActualizacion: '2025-12-04',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.UA.03',
    nombre: 'Plan de Formación',
    descripcion: 'La dirección de TI, en coordinación con talento humano, incluirá formación para el fortalecimiento de capacidades de TI en el plan institucional de capacitación.',
    evidencias: ['Plan institucional de capacitación con capacitaciones para competencias de TI', 'Evidencias de ejecución de actividades del plan'],
    estado: 'En Progreso',
    progreso: 75,
    responsable: 'Capacitación',
    fechaActualizacion: '2025-12-06',
    prioridad: 'Alta',
    obligatorio: true
  },
  {
    codigo: 'MGGTI.LI.UA.04',
    nombre: 'Evaluación del nivel de adopción de TI',
    descripcion: 'La dirección de TI debe contar con indicadores de Uso y Apropiación para evaluar el nivel de adopción de la tecnológica y la satisfacción en su uso.',
    evidencias: ['Fichas de indicadores que miden adopción y satisfacción', 'Evidencias de medición de indicadores', 'Análisis y propuestas de mejora'],
    estado: 'En Progreso',
    progreso: 65,
    responsable: 'Analítica',
    fechaActualizacion: '2025-12-05',
    prioridad: 'Alta',
    obligatorio: true
  }
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXPORTACIÓN CONSOLIDADA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const LINEAMIENTOS_MGGTI: Record<DominioMGGTI, LineamientoMGGTI[]> = {
  'estrategia-ti': LINEAMIENTOS_ESTRATEGIA_TI,
  'gobierno-ti': LINEAMIENTOS_GOBIERNO_TI,
  'gestion-informacion': LINEAMIENTOS_GESTION_INFORMACION,
  'gestion-sistemas': LINEAMIENTOS_GESTION_SISTEMAS,
  'gestion-servicios-ti': LINEAMIENTOS_GESTION_SERVICIOS_TI,
  'gestion-seguridad': LINEAMIENTOS_GESTION_SEGURIDAD,
  'uso-apropiacion-ti': LINEAMIENTOS_USO_APROPIACION_TI
};

// Función helper para obtener todos los lineamientos
export const getAllLineamientosMGGTI = (): LineamientoMGGTI[] => {
  return Object.values(LINEAMIENTOS_MGGTI).flat();
};

// Función helper para obtener estadísticas
export const getEstadisticasMGGTI = () => {
  const todos = getAllLineamientosMGGTI();
  const completos = todos.filter(l => l.estado === 'Completo').length;
  const enProgreso = todos.filter(l => l.estado === 'En Progreso').length;
  const pendientes = todos.filter(l => l.estado === 'Pendiente').length;
  const obligatorios = todos.filter(l => l.obligatorio).length;
  const obligatoriosCompletos = todos.filter(l => l.obligatorio && l.estado === 'Completo').length;
  
  const progresoPromedio = todos.reduce((sum, l) => sum + l.progreso, 0) / todos.length;
  const complianceObligatorios = obligatorios > 0 ? (obligatoriosCompletos / obligatorios) * 100 : 0;

  return {
    total: todos.length,
    completos,
    enProgreso,
    pendientes,
    obligatorios,
    obligatoriosCompletos,
    progresoPromedio: Number(progresoPromedio.toFixed(1)),
    complianceObligatorios: Math.round(complianceObligatorios)
  };
};
