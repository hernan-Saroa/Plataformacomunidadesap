/**
 * Pasos del Tour Guiado para SIGL v5.0
 * Experiencia de onboarding educativa paso a paso
 */

import { 
  Sparkles, Target, Mail, Scale, Gavel, 
  MessageSquare, Clock, Shield, Briefcase,
  TrendingUp, AlertTriangle, CheckCircle,
  Users, Search, Settings, BarChart3,
  FileText, Home, Lightbulb
} from 'lucide-react';
import type { TourStep } from './GuidedTour';

/**
 * Tour Principal del Dashboard SIGL
 */
export const siglDashboardTourSteps: TourStep[] = [
  // 1. Bienvenida
  {
    id: 'welcome',
    target: 'body',
    title: '🎉 ¡Bienvenido al SIGL v5.0!',
    description: 'Sistema Integral de Gestión Legal de ESAP',
    content: '¡Hola! 👋 Soy tu guía virtual y te voy a mostrar paso a paso cómo usar el sistema más avanzado de gestión jurídica de ESAP. En los próximos minutos aprenderás: ✅ Cómo fluyen los casos entre módulos | ✅ Dónde encontrar cada funcionalidad | ✅ Cómo interpretar las métricas y alertas | ✅ Tips profesionales para ser más productivo. Este tour toma solo 3-4 minutos. ¡Empecemos! 🚀',
    placement: 'center',
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    type: 'premium',
    showSkip: true,
  },

  // 2. Dashboard Ejecutivo
  {
    id: 'dashboard-overview',
    target: '[data-tour="dashboard-header"]',
    title: '📊 Dashboard Ejecutivo - Tu Centro de Control',
    description: 'Vista panorámica de toda el área jurídica',
    content: 'Este dashboard es tu punto de partida diario. Aquí verás: 📈 Métricas consolidadas en tiempo real de TODOS los módulos | 🚨 Alertas críticas que requieren atención inmediata | 📋 Expedientes urgentes priorizados automáticamente | 🎯 Acceso rápido a los 11 módulos especializados. Es como el cockpit de un avión: toda la información importante en un solo lugar. Usarás esta vista cada mañana para priorizar tu trabajo del día.',
    placement: 'bottom',
    icon: <BarChart3 className="w-5 h-5 text-blue-600" />,
    type: 'info',
  },

  // 3. Métricas Principales
  {
    id: 'dashboard-metrics',
    target: '[data-tour="dashboard-metrics"]',
    title: '📈 Métricas Consolidadas - Números que Importan',
    description: 'KPIs clave para tomar decisiones',
    content: 'Estas son las métricas más importantes del área jurídica: 📊 TOTAL EXPEDIENTES: Suma de todos los casos activos en todos los módulos | ⚠️ TÉRMINOS CRÍTICOS: Casos con menos de 5 días para vencer (requieren acción urgente) | 📝 CONSULTAS PENDIENTES: Conceptos jurídicos sin responder | 🏛️ REQUERIMIENTOS ÓRGANOS: Solicitudes de Contraloría, Procuraduría, etc. | ✅ CUMPLIMIENTO PLAN: % de ejecución del plan de acción. Estas métricas se actualizan en tiempo real cada vez que hay cambios en los módulos.',
    placement: 'bottom',
    icon: <TrendingUp className="w-5 h-5 text-green-600" />,
    type: 'success',
  },

  // 4. Alertas Críticas
  {
    id: 'dashboard-alerts',
    target: '[data-tour="dashboard-alerts"]',
    title: '🚨 Alertas Críticas - Atención Inmediata',
    description: 'El sistema prioriza automáticamente lo urgente',
    content: 'Aquí el sistema te muestra las situaciones más críticas que no puedes ignorar: 🔴 TÉRMINOS A VENCER: Expedientes con menos de 3 días (pueden generar vencimiento) | 📅 AUDIENCIAS PRÓXIMAS: Tienes 72 horas para preparar alegatos y documentos | ⚠️ RIESGOS EXTREMOS: Situaciones que pueden escalar a crisis institucional | 🚨 VENCIMIENTOS: Términos que ya pasaron (requieren acción correctiva inmediata). La inteligencia del sistema analiza todos los datos y te presenta solo lo que realmente necesita tu atención HOY. No más búsqueda manual de prioridades.',
    placement: 'bottom',
    icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    type: 'warning',
  },

  // 5. Módulos Disponibles
  {
    id: 'modules-grid',
    target: '[data-tour="modules-grid"]',
    title: '🎯 11 Módulos Especializados - Gestión Integral',
    description: 'Cada módulo es experto en su área',
    content: 'El SIGL v5.0 está organizado en 11 módulos profesionales que cubren TODA la operación jurídica de ESAP: ⚖️ DEFENSA JUDICIAL (demandas contra ESAP) | 🔨 JUZGAMIENTO (procesos disciplinarios) | 💼 ASESORÍA JURÍDICA (conceptos técnicos) | 📬 CENTRO COMUNICACIONES (punto de entrada) | ⏰ TÉRMINOS E INFORMES (control de plazos) | 🏛️ ÓRGANOS DE CONTROL (Contraloría, Procuraduría) | 💰 PROCESOS COACTIVOS (cobro de obligaciones) | 📋 PLAN DE ACCIÓN (cumplimiento estratégico) | 🛡️ RIESGOS (gestión preventiva) | 📈 PLANES MEJORAMIENTO (acciones correctivas) | ⚙️ CONFIGURACIONES (administración). Cada módulo tiene su propio tablero Kanban, métricas especializadas y flujo de trabajo optimizado.',
    placement: 'top',
    icon: <Target className="w-5 h-5 text-blue-600" />,
    type: 'info',
  },

  // 6. Centro de Comunicaciones (Entrada)
  {
    id: 'module-comunicaciones',
    target: '[data-tour="module-comunicaciones"]',
    title: '📬 Centro de Comunicaciones - ¡AQUÍ EMPIEZA TODO!',
    description: 'El buzón inteligente que recibe TODAS las notificaciones',
    content: '🎯 Este es el módulo más importante: AQUÍ INICIAN TODOS LOS FLUJOS. Funciona así: 1️⃣ LLEGAN notificaciones judiciales, correos electrónicos, oficios, comunicaciones | 2️⃣ LA IA CLASIFICA automáticamente cada comunicación según contenido y remitente | 3️⃣ SUGIERE EL MÓDULO destino (Defensa, Juzgamiento, Asesoría, etc.) | 4️⃣ EL USUARIO CONFIRMA y el caso se crea automáticamente en el módulo correcto. ✨ La IA puede leer PDFs, emails, identificar juzgados, extraer fechas de vencimiento y clasificar con 95% de precisión. Es como tener un asistente jurídico 24/7 revisando tu correo.',
    placement: 'right',
    icon: <Mail className="w-5 h-5 text-purple-600" />,
    type: 'premium',
  },

  // 7. Defensa Judicial (Principal)
  {
    id: 'module-defensa',
    target: '[data-tour="module-defensa"]',
    title: '⚖️ Defensa Judicial - Cuando Demandan a ESAP',
    description: 'Gestión completa de procesos judiciales contra la institución',
    content: '⚖️ Este módulo gestiona TODOS los procesos judiciales donde ESAP es demandada (laborales, nulidades, contractuales, tutelas, etc.). Tiene 4 ETAPAS procesales: 1️⃣ NOTIFICADA: Demanda recibida, tienes 10-20 días para contestar | 2️⃣ CONTESTACIÓN: Preparar y radicar respuesta, excepciones y pruebas | 3️⃣ PROBATORIA: Recopilar evidencias, testimonios, documentos | 4️⃣ ALEGATOS: Redactar alegatos de conclusión antes de sentencia. 🚦 SEMÁFORO DE TÉRMINOS: Verde (más de 5 días), Amarillo (2-5 días), Rojo (menos de 2 días o vencido). Cada expediente tiene: radicado, demandante, juzgado, cuantía, apoderado asignado, documentos adjuntos y el BLOQUE AZUL de última actuación destacada.',
    placement: 'right',
    icon: <Scale className="w-5 h-5 text-orange-600" />,
    type: 'info',
  },

  // 8. Juzgamiento Disciplinario
  {
    id: 'module-juzgamiento',
    target: '[data-tour="module-juzgamiento"]',
    title: '🔨 Juzgamiento Disciplinario - Procesos Internos',
    description: 'Cuando funcionarios de ESAP están involucrados',
    content: '🔨 Este módulo gestiona procesos disciplinarios INTERNOS contra funcionarios de ESAP. ¿Cuándo se usa? Cuando en un caso judicial o denuncia se detecta una posible conducta irregular de un funcionario (ejemplo: negligencia, incumplimiento de deberes, mal manejo de recursos). 📋 FLUJO: 1️⃣ QUEJA/DENUNCIA (ciudadano o derivación interna) | 2️⃣ INDAGACIÓN PRELIMINAR (10 días para investigar) | 3️⃣ APERTURA PROCESO (si hay mérito) | 4️⃣ DESCARGOS (funcionario se defiende) | 5️⃣ PRUEBAS (testigos, documentos) | 6️⃣ FALLO (sanción, exoneración o archivo). ⚠️ IMPORTANTE: Términos PERENTORIOS (NO son prorrogables) según Ley 734 de 2002. El sistema calcula automáticamente cada plazo y alerta 5 días antes. Garantiza debido proceso.',
    placement: 'right',
    icon: <Gavel className="w-5 h-5 text-red-600" />,
    type: 'warning',
  },

  // 9. Asesoría Jurídica
  {
    id: 'module-asesoria',
    target: '[data-tour="module-asesoria"]',
    title: '💼 Asesoría Jurídica - Conceptos Técnicos',
    description: 'Soporte jurídico para áreas internas',
    content: '💼 Este módulo gestiona CONSULTAS JURÍDICAS de las áreas internas de ESAP (no son demandas, son conceptos técnicos). Tipos de consulta: 📄 CONTRATACIÓN (¿puedo contratar directamente?, ¿qué régimen aplica?) | 👥 LABORAL (despidos, licencias, novedades) | 📋 ADMINISTRATIVO (competencias, procedimientos) | 🎓 ACADÉMICO (reglamentos, matrículas, grados) | 💰 FINANCIERO (presupuesto, ejecución). ⏱️ SLA (Service Level Agreement) por prioridad: URGENTE (respuesta en 24 horas máximo) | ALTA (3 días) | MEDIA (5 días) | BAJA (10 días). 🎯 ASIGNACIÓN INTELIGENTE: El sistema asigna automáticamente según especialización del abogado (ejemplo: consultas contractuales van a expertos en contratación). Cada consulta tiene: solicitante, área, tema, documentos soporte, estado y concepto jurídico.',
    placement: 'right',
    icon: <Briefcase className="w-5 h-5 text-blue-600" />,
    type: 'info',
  },

  // 10. Términos e Informes (Transversal)
  {
    id: 'module-terminos',
    target: '[data-tour="module-terminos"]',
    title: '⏰ Términos e Informes - Control Transversal Total',
    description: 'Todos los plazos de todos los módulos en un solo lugar',
    content: '⏰ Este módulo es ESPECIAL: NO recibe casos nuevos, sino que CONSOLIDA todos los términos activos de TODOS los módulos. Es tu torre de control de plazos. Funciona así: 🔄 INTEGRACIÓN AUTOMÁTICA: Cada vez que un módulo (Defensa, Juzgamiento, Asesoría, etc.) crea un término, aparece aquí automáticamente | 🚦 SEMÁFORO UNIFICADO: 🟢 VERDE (más de 5 días restantes, en término normal) | 🟡 AMARILLO (2-5 días, próximo a vencer, planear acción) | 🔴 ROJO (menos de 2 días o vencido, acción URGENTE). 🔔 ALERTAS INTELIGENTES: El sistema envía notificaciones por email/SMS automáticamente: • 5 días antes: alerta preventiva | • 2 días antes: alerta urgente | • 1 día antes: alerta crítica | • Vencido: escalamiento al coordinador. Vista calendario, timeline y lista para gestionar todos los plazos desde un solo lugar.',
    placement: 'right',
    icon: <Clock className="w-5 h-5 text-amber-600" />,
    type: 'warning',
  },

  // 11. Flujo Integrado
  {
    id: 'integrated-flow',
    target: '[data-tour="modules-grid"]',
    title: '🔄 Flujo Integrado - Así se Conecta Todo',
    description: 'Los módulos NO trabajan aislados, se sincronizan',
    content: '🔄 Ejemplo de FLUJO COMPLETO real: 1️⃣ CENTRO COMUNICACIONES: Llega notificación judicial de tutela contra ESAP (email del juzgado) | 2️⃣ IA CLASIFICA: Detecta que es notificación judicial y sugiere módulo "Defensa Judicial" | 3️⃣ DEFENSA JUDICIAL: Se crea expediente, calcula término de contestación (10 días) | 4️⃣ TÉRMINOS: El término aparece automáticamente en semáforo amarillo (quedan 4 días) | 5️⃣ ASESORÍA: El abogado de defensa solicita concepto técnico sobre el tema de la tutela | 6️⃣ JUZGAMIENTO: Si la tutela revela negligencia de un funcionario, se deriva proceso disciplinario | 7️⃣ ÓRGANOS CONTROL: La Procuraduría solicita información sobre la tutela (10 días para responder) | 8️⃣ PLAN DE ACCIÓN: Se incluye acción preventiva para evitar futuras tutelas similares. TODO sincronizado automáticamente sin duplicar información.',
    placement: 'top',
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    type: 'premium',
  },

  // 12. Búsqueda Global
  {
    id: 'global-search',
    target: '[data-tour="search-bar"]',
    title: '🔍 Búsqueda Global - Encuentra Cualquier Cosa al Instante',
    description: 'Buscador inteligente en todos los módulos simultáneamente',
    content: '🔍 Este buscador es POTENTE. Busca en TODOS los módulos a la vez y encuentra: 📄 EXPEDIENTES (por radicado, demandante, número de proceso) | 👥 PERSONAS (demandantes, funcionarios involucrados, apoderados) | 📋 DOCUMENTOS (contestaciones, oficios, conceptos por contenido) | 🏛️ JUZGADOS (todos los expedientes de un juzgado específico) | 📅 FECHAS (expedientes con vencimiento en rango específico) | 🏷️ TÉRMINOS JURÍDICOS (busca "prescripción", "caducidad", etc.). ✨ FUNCIONES AVANZADAS: • Filtros por módulo, estado, prioridad, fecha | • Búsqueda por rangos de fechas | • Exportar resultados a Excel | • Guardar búsquedas frecuentes. 💡 TIP: Usa atajo de teclado Ctrl+K (Cmd+K en Mac) para abrir el buscador rápidamente desde cualquier pantalla.',
    placement: 'bottom',
    icon: <Search className="w-5 h-5 text-blue-600" />,
    type: 'info',
  },

  // 13. Perfil y Notificaciones
  {
    id: 'user-profile',
    target: '[data-tour="user-profile"]',
    title: '👤 Perfil de Usuario - Tu Espacio Personal',
    description: 'Gestiona notificaciones, preferencias y sesión',
    content: '👤 Desde aquí accedes a: 🔔 NOTIFICACIONES: Bandeja con alertas de términos, asignaciones, comentarios en expedientes que sigues | ⚙️ CONFIGURACIÓN PERSONAL: Firma digital, datos de contacto, foto de perfil | 📊 MI ACTIVIDAD: Historial de expedientes consultados, documentos descargados, acciones realizadas (para auditoría) | 🔐 SEGURIDAD: Cambiar contraseña, activar autenticación de dos factores (2FA), ver sesiones activas | 🚪 CERRAR SESIÓN SEGURO: Siempre cierra sesión al terminar tu jornada. 💡 TIP: Configura tus notificaciones según prioridad. Si solo quieres recibir alertas de términos críticos (menos de 2 días), puedes filtrar las notificaciones para no saturar tu bandeja de correo.',
    placement: 'bottom',
    icon: <Users className="w-5 h-5 text-blue-600" />,
    type: 'info',
  },

  // 14. Configuraciones
  {
    id: 'configuraciones',
    target: '[data-tour="module-configuraciones"]',
    title: '⚙️ Configuraciones - Administración del Sistema',
    description: 'Solo para usuarios con rol de Administrador',
    content: '⚙️ Este módulo es solo para ADMINISTRADORES. Desde aquí se gestiona: 👥 USUARIOS Y ROLES: Crear usuarios, asignar permisos, definir quién puede ver qué módulos | 📋 CATÁLOGOS: Juzgados, tipos de proceso, áreas jurídicas, motivos de archivo, estados | 📄 PLANTILLAS DE DOCUMENTOS: Contestaciones, oficios, conceptos jurídicos (con variables dinámicas) | 🏢 ESTRUCTURA TERRITORIAL: Configurar territoriales, departamentos, municipios | 🎯 FLUJOS DE TRABAJO: Personalizar etapas de cada módulo según necesidad de ESAP | 📧 NOTIFICACIONES: Configurar qué eventos envían email/SMS y a quién | 📊 REPORTES EJECUTIVOS: Diseñar dashboards personalizados para la dirección. ⚠️ IMPORTANTE: Los cambios en configuraciones afectan a TODOS los usuarios. Siempre probar en ambiente de desarrollo antes de aplicar en producción.',
    placement: 'left',
    icon: <Settings className="w-5 h-5 text-gray-600" />,
    type: 'info',
  },

  // 15. Tips Avanzados
  {
    id: 'advanced-tips',
    target: 'body',
    title: '💡 Tips de Expertos - Sácale el Máximo Provecho',
    description: 'Funciones avanzadas que te harán más productivo',
    content: '💡 TIPS PROFESIONALES que debes conocer: ✅ TOOLTIPS INFORMATIVOS: Cada módulo tiene un ícono ℹ️ en el header. Click ahí para ver guía completa del flujo, términos legales y conexiones con otros módulos | ✅ ATAJOS DE TECLADO: Ctrl+K (buscador global), Ctrl+N (nuevo expediente), Ctrl+E (exportar), Ctrl+F (filtros avanzados) | ✅ ACCIONES MASIVAS: Selecciona múltiples expedientes y aplica acción a todos (archivar, cambiar estado, asignar responsable) | ✅ COMENTARIOS COLABORATIVOS: En cada expediente puedes @mencionar colegas para solicitar apoyo | ✅ FAVORITOS: Marca expedientes frecuentes con ⭐ para acceso rápido | ✅ MODO OSCURO: Disponible en Configuración Personal (reduce fatiga visual) | ✅ EXPORTAR A EXCEL: Todos los listados tienen botón de exportación para análisis en Excel.',
    placement: 'center',
    icon: <Lightbulb className="w-5 h-5 text-amber-600" />,
    type: 'warning',
  },

  // 16. Finalización
  {
    id: 'completion',
    target: 'body',
    title: '✅ ¡Felicitaciones - Ya Dominas el SIGL v5.0!',
    description: 'Has completado el tour guiado completo',
    content: '🎉 ¡EXCELENTE! Ahora conoces: ✅ Cómo fluyen los casos entre los 11 módulos | ✅ Dónde encontrar cada funcionalidad | ✅ Cómo interpretar métricas y alertas | ✅ Tips avanzados de productividad. 🚀 PRÓXIMOS PASOS: 1️⃣ Explora el módulo Centro de Comunicaciones (tu punto de inicio diario) | 2️⃣ Revisa los tooltips informativos (ℹ️) en cada módulo | 3️⃣ Prueba crear un expediente de prueba para familiarizarte con el flujo | 4️⃣ Configura tus notificaciones personales. 💡 ¿NECESITAS VOLVER A VER EL TOUR? Puedes reactivarlo en cualquier momento desde el botón flotante \"Tour\" en la esquina inferior derecha del dashboard. ¡Éxito en tu gestión jurídica! 🎯',
    placement: 'center',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    type: 'success',
    showSkip: false,
  },
];

/**
 * Tour Específico para Módulo de Defensa Judicial
 */
export const defensaJudicialTourSteps: TourStep[] = [
  {
    id: 'defensa-welcome',
    target: '[data-tour="module-header"]',
    title: '⚖️ Defensa Judicial',
    description: 'Gestión de demandas contra ESAP',
    content: 'Este módulo gestiona todos los procesos judiciales activos. Vamos a explorar sus funcionalidades clave.',
    placement: 'bottom',
    icon: <Scale className="w-5 h-5 text-orange-600" />,
    type: 'info',
  },
  {
    id: 'defensa-kanban',
    target: '[data-tour="kanban-board"]',
    title: '📋 Tablero Kanban',
    description: 'Vista visual del proceso',
    content: '4 columnas representan las etapas procesales: Notificada, Contestación, Probatoria y Alegatos. Arrastra las tarjetas para actualizar el estado.',
    placement: 'top',
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    type: 'info',
  },
  {
    id: 'defensa-card',
    target: '[data-tour="expediente-card"]',
    title: '📄 Tarjeta de Expediente',
    description: 'Información completa en un vistazo',
    content: 'Cada tarjeta muestra: radicado, demandante, profesional asignado, semáforo de términos, documentos y el bloque azul de ÚLTIMA ACTUACIÓN destacada.',
    placement: 'right',
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    type: 'premium',
  },
  {
    id: 'defensa-complete',
    target: 'body',
    title: '✅ Tour Completo',
    description: '¡Ahora dominas Defensa Judicial!',
    content: 'Explora el resto de funcionalidades por tu cuenta. Usa el tooltip informativo (ℹ️) si necesitas ayuda.',
    placement: 'center',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    type: 'success',
  },
];

/**
 * Tour Específico para Centro de Comunicaciones
 */
export const comunicacionesTourSteps: TourStep[] = [
  {
    id: 'com-welcome',
    target: '[data-tour="module-header"]',
    title: '📬 Centro de Comunicaciones',
    description: 'Buzón unificado inteligente',
    content: 'Aquí INICIA todo. Todas las notificaciones judiciales, correos y oficios llegan a este módulo.',
    placement: 'bottom',
    icon: <Mail className="w-5 h-5 text-purple-600" />,
    type: 'premium',
  },
  {
    id: 'com-tabs',
    target: '[data-tour="tabs"]',
    title: '🏷️ 5 Tabs Inteligentes',
    description: 'Clasificación automática',
    content: 'Judiciales (notificaciones de juzgados), Correos (emails con IA), Oficios (comunicaciones internas), Urgentes (prioritarios) y Archivadas. La IA clasifica automáticamente.',
    placement: 'bottom',
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    type: 'premium',
  },
  {
    id: 'com-complete',
    target: 'body',
    title: '✅ ¡Dominas el Centro de Comunicaciones!',
    description: 'Listo para gestionar tus comunicaciones',
    content: 'Este módulo es la puerta de entrada al SIGL. Aprovecha la clasificación IA y las acciones masivas.',
    placement: 'center',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    type: 'success',
  },
];