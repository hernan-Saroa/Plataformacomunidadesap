// Mapa de Procesos ESAP, versión 5. Los nombres se contrastaron con el
// inventario de documentos de Isolución publicado en el Repositorio CDIM.
// https://repositoriocdim.esap.edu.co/server/api/core/bitstreams/5a5f1302-2917-49ad-8cc0-481ceb26f115/content
export const chatbotProcesses = [
  {
    id: 'adquisicion',
    name: 'Adquisición de Bienes y Servicios',
    questions: [
      '¿Dónde consulto el Manual de Contratación de la ESAP?',
      '¿Cómo inicio una solicitud de contratación en la plataforma?',
    ],
  },
  {
    id: 'bienestar',
    name: 'Bien-Estar',
    questions: [
      '¿Qué servicios de Bienestar ofrece la ESAP?',
      '¿Dónde consulto las actividades y convocatorias de Bienestar de la ESAP?',
    ],
  },
  {
    id: 'comunicacion',
    name: 'Comunicación y Posicionamiento',
    questions: [
      '¿Dónde consulto los canales oficiales de comunicación de la ESAP?',
      '¿Dónde encuentro los lineamientos de identidad visual de la ESAP?',
    ],
  },
  {
    id: 'direccionamiento',
    name: 'Direccionamiento Estratégico',
    questions: [
      '¿Dónde consulto el Plan Estratégico Institucional de la ESAP?',
      '¿Dónde encuentro el Plan de Acción Institucional y sus indicadores de seguimiento?',
    ],
  },
  {
    id: 'efectividad',
    name: 'Efectividad Institucional',
    questions: [
      '¿Dónde consulto el mapa de procesos y los documentos del Sistema Integrado de Gestión?',
      '¿Dónde consulto las tablas de retención documental de la ESAP?',
    ],
  },
  {
    id: 'evaluacion',
    name: 'Evaluación, Control y Mejora',
    questions: [
      '¿Dónde consulto el Plan Anual de Auditoría de la ESAP?',
      '¿Cómo se registran los hallazgos y se hace seguimiento a las acciones de mejora?',
    ],
  },
  {
    id: 'formacion',
    name: 'Formación para la Vida',
    questions: [
      '¿Dónde consulto y diligencio mi Plan de Trabajo Académico docente?',
      '¿Cómo reviso las franjas horarias y la asignación de aulas?',
      '¿Dónde puedo verificar un título académico de la ESAP?',
    ],
  },
  {
    id: 'administrativa',
    name: 'Gestión Administrativa',
    questions: [
      '¿Cómo solicito mantenimiento para una sede de la ESAP?',
      '¿Dónde consulto el procedimiento de almacén e inventarios de la ESAP?',
    ],
  },
  {
    id: 'talento',
    name: 'Gestión del Talento Humano',
    questions: [
      '¿Cómo solicito un certificado laboral?',
      '¿Dónde consulto el procedimiento para solicitar vacaciones o licencias?',
    ],
  },
  {
    id: 'financiera',
    name: 'Gestión Financiera',
    questions: [
      '¿Cómo solicito y legalizo viáticos para una comisión de servicios?',
      '¿Dónde consulto los lineamientos de ejecución presupuestal de la ESAP?',
    ],
  },
  {
    id: 'global',
    name: 'Gestión Global',
    questions: [
      '¿Dónde consulto las convocatorias de movilidad académica internacional de la ESAP?',
      '¿Dónde encuentro los lineamientos de cooperación internacional de la ESAP?',
    ],
  },
  {
    id: 'legal',
    name: 'Gestión Legal',
    questions: [
      '¿Dónde consulto el normograma y los actos administrativos de la ESAP?',
      '¿Dónde se radica una solicitud de concepto jurídico en la ESAP?',
    ],
  },
  {
    id: 'investigacion',
    name: 'Investigación e Innovación',
    questions: [
      '¿Dónde consulto las convocatorias de investigación de la ESAP?',
      '¿Cómo participo en un semillero de investigación de la ESAP?',
    ],
  },
  {
    id: 'proyeccion',
    name: 'Proyección y Extensión',
    questions: [
      '¿Dónde consulto la oferta de cursos de capacitación de la ESAP?',
      '¿Cómo solicita una entidad territorial asistencia técnica de la ESAP?',
    ],
  },
  {
    id: 'recursos',
    name: 'Recursos de Aprendizaje',
    questions: [
      '¿Cómo consulto el catálogo de la biblioteca y el repositorio de la ESAP?',
      '¿Dónde encuentro ayuda para acceder al Campus Virtual de la ESAP?',
    ],
  },
  {
    id: 'ciudadania',
    name: 'Relacionamiento con la Ciudadanía',
    questions: [
      '¿Cómo radico una PQRSD ante la ESAP?',
      '¿Dónde consulto los canales y horarios de atención de la ESAP?',
    ],
  },
  {
    id: 'digital',
    name: 'Transformación Digital',
    questions: [
      '¿Dónde solicito soporte tecnológico para la plataforma ESAP?',
      '¿Cómo recupero el acceso a mi cuenta en la plataforma?',
    ],
  },
] as const;

export type ChatbotProcessId = (typeof chatbotProcesses)[number]['id'];
