/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CONFIGURACIÓN DE TOOLTIPS - MÓDULO CONTROL INTERNO
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Centraliza todos los tooltips de ayuda para cada módulo del sistema
 * de Control Interno de Gestión.
 * 
 * VERSIÓN: 1.0
 * FECHA: 4 Enero 2026
 */

export interface TooltipConfig {
  titulo: string;
  descripcion: string;
  pasos?: string[];
  tips?: string[];
  video?: string;
}

export const TOOLTIPS_CONTROL_INTERNO: Record<string, TooltipConfig> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // AUDITORÍAS OCIG (KANBAN)
  // ═══════════════════════════════════════════════════════════════════════════
  'auditorias-kanban': {
    titulo: 'Auditorías OCIG - Tablero Kanban',
    descripcion: 'Centro de comando para gestionar el ciclo completo de auditorías',
    pasos: [
      'Visualiza las auditorías organizadas por estado (Planificación, Ejecución, Informe, Cerrada)',
      'Arrastra tarjetas entre columnas para cambiar el estado de las auditorías',
      'Haz clic en una tarjeta para ver el expediente completo con toda la documentación',
      'Usa los filtros superiores para encontrar auditorías específicas por tipo, sede o auditor',
      'Crea nuevas auditorías desde el botón "Nueva Auditoría" en la esquina superior'
    ],
    tips: [
      'El semáforo de colores indica el estado de cumplimiento: Verde (En tiempo), Amarillo (Próximo a vencer), Rojo (Vencida)',
      'Puedes asignar auditores masivamente seleccionando múltiples tarjetas',
      'El badge de hallazgos indica cuántos hallazgos no conformes se detectaron',
      'Usa la vista de estadísticas para ver métricas consolidadas de todas las auditorías'
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANEACIÓN OCIG
  // ═══════════════════════════════════════════════════════════════════════════
  'planeacion-anual': {
    titulo: 'Plan Anual de Auditorías',
    descripcion: 'Planifica todas las auditorías del año basándote en riesgos y normativa',
    pasos: [
      'Revisa el calendario anual con todas las auditorías programadas',
      'Define el alcance, objetivos y cronograma de cada auditoría',
      'Asigna recursos (auditores, tiempo, presupuesto) a cada actividad',
      'Aprueba el plan antes de iniciar la ejecución de auditorías',
      'Exporta el plan en PDF para presentación ante la alta dirección'
    ],
    tips: [
      'El plan anual debe cubrir al menos el 80% del universo auditable',
      'Prioriza auditorías según la matriz de riesgos institucional',
      'Considera periodos de alta carga académica al programar auditorías',
      'Deja tiempo de holgura entre auditorías para imprevistos'
    ]
  },

  'universo-auditable': {
    titulo: 'Universo Auditable',
    descripcion: 'Catálogo completo de procesos, sedes y dependencias auditables',
    pasos: [
      'Consulta el listado de todos los procesos y áreas sujetas a auditoría',
      'Clasifica cada elemento por nivel de riesgo (Alto, Medio, Bajo)',
      'Marca la frecuencia de auditoría recomendada para cada proceso',
      'Actualiza el universo cuando se creen nuevos procesos o sedes',
      'Exporta el universo para análisis de cobertura'
    ],
    tips: [
      'Procesos de alto riesgo deben auditarse al menos 2 veces al año',
      'Incluye tanto procesos misionales como de apoyo',
      'Revisa y actualiza el universo al inicio de cada año',
      'Considera auditorías especiales por denuncias o solicitudes externas'
    ]
  },

  'programa-anual': {
    titulo: 'Programa Anual de Auditorías',
    descripcion: 'Cronograma detallado de ejecución de auditorías con fechas y responsables',
    pasos: [
      'Visualiza el cronograma de auditorías mes a mes',
      'Asigna fechas específicas de inicio y fin para cada auditoría',
      'Define el equipo auditor responsable de cada actividad',
      'Establece hitos y entregas intermedias',
      'Monitorea el cumplimiento del cronograma en tiempo real'
    ],
    tips: [
      'Distribuye auditorías equitativamente a lo largo del año',
      'Evita programar auditorías simultáneas que requieran los mismos auditores',
      'Programa reuniones de apertura y cierre con al menos 2 semanas de anticipación',
      'Deja buffer de tiempo para retrasos o hallazgos complejos'
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANES DE MEJORAMIENTO
  // ═══════════════════════════════════════════════════════════════════════════
  'formulacion-planes': {
    titulo: 'Formulación de Planes de Mejoramiento',
    descripcion: 'Crea planes de acción para corregir hallazgos detectados en auditorías',
    pasos: [
      'Selecciona los hallazgos que requieren plan de mejoramiento',
      'Define acciones correctivas específicas y medibles',
      'Asigna responsables y fechas de cumplimiento para cada acción',
      'Establece indicadores de seguimiento y metas',
      'Envía el plan a aprobación del jefe de la dependencia auditada'
    ],
    tips: [
      'Cada acción debe ser SMART: Específica, Medible, Alcanzable, Relevante y con Tiempo definido',
      'Involucra a los responsables del proceso en la formulación del plan',
      'Prioriza acciones que ataquen la causa raíz del hallazgo',
      'Documenta claramente los recursos necesarios (presupuesto, personal, tecnología)'
    ]
  },

  'seguimiento-planes': {
    titulo: 'Seguimiento a Planes de Mejoramiento',
    descripcion: 'Monitorea el cumplimiento de los planes de acción y cierra hallazgos',
    pasos: [
      'Revisa el estado de avance de cada plan de mejoramiento',
      'Solicita evidencias de cumplimiento a los responsables',
      'Verifica que las acciones se ejecutaron correctamente',
      'Evalúa la efectividad de las acciones implementadas',
      'Cierra el plan cuando todas las acciones se hayan completado satisfactoriamente'
    ],
    tips: [
      'Establece reuniones de seguimiento mensuales con los responsables',
      'Usa el semáforo para identificar planes en riesgo de incumplimiento',
      'Solicita evidencias objetivas (fotos, documentos, registros)',
      'Si un plan se retrasa, solicita reformulación con nuevas fechas'
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INFORMES DE LEY
  // ═══════════════════════════════════════════════════════════════════════════
  'informes-ejecutivo': {
    titulo: 'Informe Ejecutivo Anual',
    descripcion: 'Informe de gestión anual de la Oficina de Control Interno',
    pasos: [
      'Recopila datos de todas las auditorías realizadas en el año',
      'Consolida hallazgos, planes de mejoramiento y resultados',
      'Elabora análisis de tendencias y recomendaciones estratégicas',
      'Genera gráficos y tablas para facilitar la comprensión',
      'Envía el informe a la alta dirección y entidades de control'
    ],
    tips: [
      'El informe debe presentarse antes del 31 de enero del año siguiente',
      'Incluye casos de éxito y buenas prácticas identificadas',
      'Destaca el valor agregado de la auditoría al cumplimiento de objetivos',
      'Anexa las respuestas de los auditados a los hallazgos'
    ]
  },

  'informes-pormenorizado': {
    titulo: 'Informe Pormenorizado',
    descripcion: 'Informe cuatrimestral detallado del estado del control interno',
    pasos: [
      'Consolida actividades del cuatrimestre (enero-abril, mayo-agosto, septiembre-diciembre)',
      'Evalúa la eficacia del Sistema de Control Interno institucional',
      'Reporta avances en planes de mejoramiento',
      'Identifica riesgos emergentes y recomendaciones',
      'Publica en el portal web antes del día 15 del mes siguiente al cuatrimestre'
    ],
    tips: [
      'Este informe es obligatorio según el Decreto 648 de 2017',
      'Debe ser de acceso público en la página web institucional',
      'Incluye sección de seguimiento a observaciones de entes de control',
      'Vincula hallazgos con el mapa de riesgos institucional'
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPEDIENTES
  // ═══════════════════════════════════════════════════════════════════════════
  'expedientes-auditoria': {
    titulo: 'Expedientes de Auditoría',
    descripcion: 'Archivo digital completo de cada auditoría con toda su documentación',
    pasos: [
      'Accede al expediente de cualquier auditoría desde el tablero Kanban',
      'Consulta todos los documentos organizados por carpetas (Plan, Ejecución, Informe)',
      'Carga nuevos documentos arrastrándolos o desde el botón de subir archivo',
      'Descarga el expediente completo en ZIP para archivo permanente',
      'Busca documentos específicos usando el buscador interno del expediente'
    ],
    tips: [
      'Cada documento cargado queda con trazabilidad (quién, cuándo, qué)',
      'Los expedientes se conservan por mínimo 5 años según normativa',
      'Puedes organizar documentos en subcarpetas personalizadas',
      'El sistema genera automáticamente algunos documentos (actas, informes)'
    ]
  },

  'busqueda-expedientes': {
    titulo: 'Búsqueda Avanzada de Expedientes',
    descripcion: 'Encuentra expedientes usando múltiples criterios de búsqueda',
    pasos: [
      'Define criterios de búsqueda (año, tipo de auditoría, sede, auditor)',
      'Aplica filtros combinados para afinar resultados',
      'Ordena resultados por fecha, estado o prioridad',
      'Accede directamente al expediente desde los resultados',
      'Exporta el listado de resultados en Excel'
    ],
    tips: [
      'Usa comillas para buscar frases exactas en los documentos',
      'Puedes buscar dentro del contenido de los archivos PDF',
      'Los filtros se pueden guardar para búsquedas recurrentes',
      'La búsqueda incluye también hallazgos y planes de mejoramiento'
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLES Y PERMISOS
  // ═══════════════════════════════════════════════════════════════════════════
  'equipo-control-interno': {
    titulo: 'Equipo de Control Interno',
    descripcion: 'Gestiona el personal asignado al módulo y sus permisos específicos',
    pasos: [
      'Consulta el listado de personas asignadas al equipo de Control Interno',
      'Asigna nuevas personas desde el módulo de Gestión de Personas',
      'Define el rol de cada persona (Jefe, Auditor, Auxiliar, Consulta)',
      'Personaliza permisos específicos según las responsabilidades',
      'Remueve personas del equipo cuando ya no sean necesarias'
    ],
    tips: [
      'Los roles se crean desde Gestión de Personas → Roles y Permisos',
      'Aquí solo se asignan personas existentes con roles de Control Interno',
      'El Jefe de Control Interno tiene todos los permisos por defecto',
      'Puedes ver el detalle completo de cada persona incluyendo su último acceso'
    ]
  },

  'matriz-permisos': {
    titulo: 'Matriz de Permisos por Rol',
    descripcion: 'Visualiza qué puede hacer cada rol en el módulo de Control Interno',
    pasos: [
      'Consulta la matriz que muestra permisos por rol y módulo',
      'Identifica qué acciones puede realizar cada rol',
      'Compara permisos entre diferentes roles',
      'Usa esta matriz como referencia para asignaciones',
      'Exporta la matriz para documentación de seguridad'
    ],
    tips: [
      'Los permisos se clasifican en: Leer, Crear, Editar, Eliminar, Aprobar, Full',
      'El código de colores facilita identificar el nivel de acceso',
      'Esta matriz es de solo lectura, los cambios se hacen en Gestión de Personas',
      'La matriz muestra los 80 permisos granulares del módulo'
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIGURACIONES
  // ═══════════════════════════════════════════════════════════════════════════
  'config-tipos-auditoria': {
    titulo: 'Tipos de Auditoría',
    descripcion: 'Administra los tipos de auditoría disponibles en el sistema',
    pasos: [
      'Consulta los tipos de auditoría predefinidos (Gestión, Cumplimiento, Desempeño, etc.)',
      'Crea nuevos tipos personalizados según necesidades institucionales',
      'Asocia listas de chequeo específicas a cada tipo',
      'Define la normativa aplicable a cada tipo de auditoría',
      'Activa o desactiva tipos según sea necesario'
    ],
    tips: [
      'Los tipos predefinidos están basados en la Guía de Auditoría del DAFP',
      'Puedes personalizar el color y el icono de cada tipo',
      'Asocia plantillas de informe específicas a cada tipo',
      'Los tipos inactivos no aparecen al crear nuevas auditorías'
    ]
  },

  'config-notificaciones': {
    titulo: 'Notificaciones y Alertas',
    descripcion: 'Configura alertas automáticas para eventos importantes del módulo',
    pasos: [
      'Define qué eventos deben generar notificaciones (vencimientos, aprobaciones, etc.)',
      'Configura los destinatarios de cada tipo de notificación',
      'Establece el tiempo de anticipación para alertas de vencimiento',
      'Personaliza los mensajes y plantillas de correo',
      'Activa o desactiva notificaciones según necesidad'
    ],
    tips: [
      'Las notificaciones se envían por correo electrónico y en el sistema',
      'Configura recordatorios escalonados (7 días, 3 días, 1 día antes)',
      'Los jefes de dependencia reciben notificaciones de hallazgos automáticamente',
      'Puedes silenciar notificaciones temporalmente sin desactivarlas'
    ]
  },

  'config-kanban': {
    titulo: 'Configuración del Tablero Kanban',
    descripcion: 'Personaliza las columnas y flujo de trabajo del tablero de auditorías',
    pasos: [
      'Define las etapas del ciclo de vida de las auditorías',
      'Establece reglas de transición entre estados',
      'Configura campos obligatorios para cada cambio de estado',
      'Personaliza colores y etiquetas de las tarjetas',
      'Define qué información se muestra en cada tarjeta'
    ],
    tips: [
      'Las columnas predeterminadas son: Planificación, Ejecución, Informe, Cerrada',
      'Puedes agregar estados intermedios si tu proceso lo requiere',
      'Las reglas de transición ayudan a garantizar que se complete información',
      'Los cambios en el Kanban no afectan auditorías ya creadas'
    ]
  }
};
