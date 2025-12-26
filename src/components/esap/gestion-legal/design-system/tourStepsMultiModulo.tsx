/**
 * Tour Guiado Multi-Módulo - SIGL v5.0
 * Recorre los 11 módulos de gestión legal
 * Navegación automática entre módulos
 */

import { 
  Sparkles, Target, Mail, Scale, Gavel, 
  FileQuestion, Clock, Shield, Briefcase,
  TrendingUp, AlertTriangle, CheckCircle,
  Users, Search, Settings, BarChart3,
  FileText, Home, Lightbulb, Inbox,
  Building2, DollarSign, ClipboardCheck,
  CalendarClock, LayoutDashboard
} from 'lucide-react';
import type { TourStep } from './GuidedTour';

/**
 * Tour Completo del SIGL v5.0
 * Navega automáticamente entre los 11 módulos
 */
export const siglFullTourSteps: TourStep[] = [
  // ========================================
  // PASO 1: BIENVENIDA
  // ========================================
  {
    id: 'welcome',
    target: 'body',
    title: '🎉 ¡Bienvenido al Tour Completo del SIGL v5.0!',
    description: 'Recorreremos los 11 módulos del sistema',
    content: '¡Hola! 👋 En los próximos minutos voy a mostrarte TODOS los módulos del Sistema Integral de Gestión Legal de ESAP. El tour navegará automáticamente entre módulos para que veas cómo funciona cada uno. ⏱️ Duración: 8-10 minutos. Puedes pausar o saltar en cualquier momento. ¡Empecemos! 🚀',
    placement: 'center',
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    type: 'premium',
    showSkip: true,
  },

  // ========================================
  // MÓDULO 1: DASHBOARD EJECUTIVO
  // ========================================
  {
    id: 'dashboard-intro',
    target: '[data-tour="module-header"]',
    title: '📊 Dashboard Ejecutivo SIGL',
    description: 'Tu centro de control principal',
    content: '📊 Este es el DASHBOARD EJECUTIVO - tu punto de partida diario. Desde aquí tienes: ✅ Métricas consolidadas en tiempo real | ✅ Alertas críticas prioritarias | ✅ Acceso rápido a los 11 módulos | ✅ Expedientes urgentes destacados. Es tu cockpit para gestionar toda el área jurídica desde un solo lugar.',
    placement: 'bottom',
    navigateTo: 'dashboard',
    icon: <LayoutDashboard className="w-5 h-5 text-blue-600" />,
    type: 'info',
  },

  // ========================================
  // MÓDULO 2: DEFENSA JUDICIAL
  // ========================================
  {
    id: 'defensa-intro',
    target: '[data-tour="module-header"]',
    title: '⚖️ Módulo 1: Defensa Judicial',
    description: 'Gestión de demandas contra ESAP',
    content: '⚖️ DEFENSA JUDICIAL gestiona TODOS los procesos judiciales donde ESAP es demandada. 📋 4 ETAPAS: Notificada → Contestación → Probatoria → Alegatos. Cada expediente tiene: radicado, demandante, juzgado, cuantía, términos con semáforo y el bloque azul de ÚLTIMA ACTUACIÓN. 🚦 Control automático de términos para evitar vencimientos.',
    placement: 'bottom',
    navigateTo: 'defensa-judicial',
    navigationDelay: 800,
    icon: <Scale className="w-5 h-5 text-green-600" />,
    type: 'info',
  },

  {
    id: 'defensa-kanban',
    target: '[data-tour="kanban-board"]',
    title: '📋 Tablero Kanban - Defensa Judicial',
    description: 'Vista visual del flujo procesal',
    content: '📋 El TABLERO KANBAN organiza los expedientes por etapa procesal. 🔄 FUNCIONA ASÍ: Arrastra las tarjetas entre columnas para actualizar el estado del expediente. Cada columna representa una etapa: Notificada (recién ingresada) → Contestación (preparando respuesta) → Probatoria (recopilando evidencia) → Alegatos (fase final antes de sentencia). ✅ Vista clara del flujo de trabajo.',
    placement: 'top',
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    type: 'success',
  },

  {
    id: 'defensa-card',
    target: '[data-tour="expediente-card"]',
    title: '📄 Tarjeta de Expediente - Información Completa',
    description: 'Todo lo que necesitas saber en un vistazo',
    content: '📄 Cada TARJETA DE EXPEDIENTE muestra información crítica: 🔹 Radicado y demandante | 🔹 Juzgado y cuantía | 🔹 Profesional asignado | 🔹 Semáforo de términos (🟢 verde: en término, 🟡 amarillo: próximo a vencer, 🔴 rojo: crítico) | 🔹 Documentos adjuntos | 🔹 BLOQUE AZUL: Última actuación destacada (lo más reciente e importante). Click para ver detalles completos.',
    placement: 'right',
    icon: <FileText className="w-5 h-5 text-blue-600" />,
    type: 'premium',
  },

  // ========================================
  // MÓDULO 3: JUZGAMIENTO DISCIPLINARIO
  // ========================================
  {
    id: 'juzgamiento-intro',
    target: '[data-tour="module-header"]',
    title: '🔨 Módulo 2: Juzgamiento Disciplinario',
    description: 'Procesos disciplinarios internos',
    content: '🔨 JUZGAMIENTO gestiona procesos disciplinarios contra funcionarios de ESAP. ⚖️ ¿Cuándo se usa? Cuando en un proceso judicial o denuncia se detecta conducta irregular de un funcionario. 📋 ETAPAS: Queja → Indagación → Apertura → Descargos → Pruebas → Fallo. ⚠️ TÉRMINOS PERENTORIOS según Ley 734/2002 (NO prorrogables). Sistema garantiza debido proceso y cumplimiento de plazos.',
    placement: 'bottom',
    navigateTo: 'juzgamiento',
    navigationDelay: 800,
    icon: <Gavel className="w-5 h-5 text-red-600" />,
    type: 'warning',
  },

  {
    id: 'juzgamiento-tabs',
    target: '[data-tour="tabs"]',
    title: '🏷️ Tabs por Etapa Procesal',
    description: 'Organización por fases del proceso',
    content: '🏷️ Los TABS organizan los expedientes según la etapa procesal: 📝 INDAGACIÓN (investigación preliminar 10 días) | 📂 PROCESO ABIERTO (cargo formal) | ⚖️ DESCARGOS (funcionario se defiende) | 🔍 PRUEBAS (testimonios, documentos) | ✅ FALLO (decisión final). Cada etapa tiene plazos específicos calculados automáticamente. El sistema alerta antes de vencimiento.',
    placement: 'bottom',
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    type: 'info',
  },

  // ========================================
  // MÓDULO 4: ASESORÍA JURÍDICA
  // ========================================
  {
    id: 'asesoria-intro',
    target: '[data-tour="module-header"]',
    title: '💼 Módulo 3: Asesoría Jurídica',
    description: 'Conceptos técnicos especializados',
    content: '💼 ASESORÍA JURÍDICA gestiona consultas técnicas de áreas internas. 📋 TIPOS: Contratación, Laboral, Administrativo, Académico, Financiero. ⏱️ SLA (Service Level Agreement): Urgente 24h | Alta 3 días | Media 5 días | Baja 10 días. 🎯 ASIGNACIÓN INTELIGENTE: El sistema asigna según especialización del abogado. Cada consulta tiene: solicitante, área, documentos soporte, prioridad y concepto jurídico.',
    placement: 'bottom',
    navigateTo: 'asesoria',
    navigationDelay: 800,
    icon: <Briefcase className="w-5 h-5 text-purple-600" />,
    type: 'info',
  },

  {
    id: 'asesoria-prioridad',
    target: '[data-tour="filtro-prioridad"]',
    title: '🎯 Filtros por Prioridad y SLA',
    description: 'Sistema de gestión por urgencia',
    content: '🎯 Los FILTROS DE PRIORIDAD te ayudan a enfocarte en lo urgente: 🔴 URGENTE (menos de 24h restantes) | 🟡 ALTA (2-3 días) | 🔵 MEDIA (3-5 días) | ⚪ BAJA (más de 5 días). El sistema calcula automáticamente el tiempo restante y cambia el color del badge según la criticidad. ✅ Así priorizas tu trabajo diario sin buscar manualmente.',
    placement: 'right',
    icon: <Target className="w-5 h-5 text-blue-600" />,
    type: 'success',
  },

  // ========================================
  // MÓDULO 5: CENTRO DE COMUNICACIONES
  // ========================================
  {
    id: 'comunicaciones-intro',
    target: '[data-tour="module-header"]',
    title: '📬 Módulo 4: Centro de Comunicaciones',
    description: '¡PUNTO DE ENTRADA del sistema!',
    content: '📬 CENTRO DE COMUNICACIONES es el BUZÓN INTELIGENTE donde INICIAN todos los flujos. 🎯 FUNCIÓN: Recibir TODAS las notificaciones judiciales, correos, oficios y comunicaciones. ✨ IA INTEGRADA: Clasifica automáticamente cada comunicación según contenido y remitente, sugiere módulo destino (Defensa, Juzgamiento, Asesoría) y extrae información clave (fechas, radicados, juzgados). Es tu asistente jurídico 24/7.',
    placement: 'bottom',
    navigateTo: 'centro-comunicaciones',
    navigationDelay: 800,
    icon: <Inbox className="w-5 h-5 text-blue-600" />,
    type: 'premium',
  },

  {
    id: 'comunicaciones-ia',
    target: '[data-tour="clasificacion-ia"]',
    title: '✨ Clasificación Automática con IA',
    description: 'Inteligencia artificial que trabaja por ti',
    content: '✨ La IA DEL CENTRO DE COMUNICACIONES es potente: 🤖 LEE PDFs y emails automáticamente | 🏛️ IDENTIFICA juzgados, fechas de vencimiento, radicados | 📊 CLASIFICA con 95% de precisión | 🎯 SUGIERE módulo destino correcto | 📧 EXTRAE información clave para auto-completar campos. Solo confirmas la clasificación y el expediente se crea automáticamente en el módulo correcto. Ahorra 80% del tiempo de registro manual.',
    placement: 'right',
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    type: 'premium',
  },

  // ========================================
  // MÓDULO 6: TÉRMINOS E INFORMES
  // ========================================
  {
    id: 'terminos-intro',
    target: '[data-tour="module-header"]',
    title: '⏰ Módulo 5: Términos e Informes',
    description: 'Control transversal de TODOS los plazos',
    content: '⏰ TÉRMINOS E INFORMES es un módulo ESPECIAL: NO recibe casos nuevos, CONSOLIDA todos los términos de TODOS los módulos. 🎯 FUNCIÓN: Torre de control de plazos. Cada vez que cualquier módulo crea un término, aparece aquí automáticamente. 🚦 SEMÁFORO UNIFICADO: 🟢 Verde (>5 días) | 🟡 Amarillo (2-5 días) | 🔴 Rojo (<2 días o vencido). Vista calendario, timeline y lista.',
    placement: 'bottom',
    navigateTo: 'terminos',
    navigationDelay: 800,
    icon: <CalendarClock className="w-5 h-5 text-indigo-600" />,
    type: 'warning',
  },

  {
    id: 'terminos-alertas',
    target: '[data-tour="alertas-automaticas"]',
    title: '🔔 Alertas Automáticas Inteligentes',
    description: 'Notificaciones preventivas y escalamiento',
    content: '🔔 SISTEMA DE ALERTAS INTELIGENTES: El sistema envía notificaciones automáticas por email/SMS: 📅 5 DÍAS ANTES: Alerta preventiva (planea tu respuesta) | ⚠️ 2 DÍAS ANTES: Alerta urgente (prioriza este caso) | 🚨 1 DÍA ANTES: Alerta crítica (máxima prioridad) | 🔴 VENCIDO: Escalamiento automático al coordinador. ✅ Nunca más se te pasa un término.',
    placement: 'right',
    icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    type: 'warning',
  },

  // ========================================
  // MÓDULO 7: ÓRGANOS DE CONTROL
  // ========================================
  {
    id: 'organos-intro',
    target: '[data-tour="module-header"]',
    title: '🏛️ Módulo 6: Órganos de Control',
    description: 'Requerimientos de entidades de vigilancia',
    content: '🏛️ ÓRGANOS DE CONTROL gestiona requerimientos de: Contraloría General, Procuraduría General, Defensoría del Pueblo, Fiscalía, Auditoría General. 📋 TIPOS: Solicitudes de información, Hallazgos, Recomendaciones, Autos. ⏱️ Términos estrictos (usualmente 10-15 días). 🎯 Trazabilidad completa de respuestas y evidencias. Criticidad alta por implicaciones institucionales.',
    placement: 'bottom',
    navigateTo: 'organos-control',
    navigationDelay: 800,
    icon: <Building2 className="w-5 h-5 text-blue-700" />,
    type: 'info',
  },

  // ========================================
  // MÓDULO 8: PROCESOS COACTIVOS
  // ========================================
  {
    id: 'coactivos-intro',
    target: '[data-tour="module-header"]',
    title: '💰 Módulo 7: Procesos Coactivos',
    description: 'Cobro judicial de obligaciones',
    content: '💰 PROCESOS COACTIVOS gestiona el cobro judicial de obligaciones a favor de ESAP. 💸 CASOS: Matrículas impagas, multas, sanciones pecuniarias, reintegros. 📋 ETAPAS: Mandamiento de Pago → Excepciones → Remate → Terminación. 🎯 Seguimiento de: deudor, cuantía, medidas cautelares, embargo, estado del proceso. Control de términos procesales y notificaciones.',
    placement: 'bottom',
    navigateTo: 'procesos-coactivos',
    navigationDelay: 800,
    icon: <DollarSign className="w-5 h-5 text-amber-600" />,
    type: 'info',
  },

  // ========================================
  // MÓDULO 9: PLAN DE ACCIÓN
  // ========================================
  {
    id: 'plan-intro',
    target: '[data-tour="module-header"]',
    title: '📋 Módulo 8: Plan de Acción',
    description: 'Cumplimiento de objetivos estratégicos',
    content: '📋 PLAN DE ACCIÓN gestiona el cumplimiento de objetivos estratégicos del área jurídica. 🎯 INDICADORES: Tiempo promedio de respuesta, % de términos cumplidos, casos ganados/perdidos, satisfacción interna. 📊 SEGUIMIENTO: Metas trimestrales, responsables, avance %, semaforización automática. 📈 Dashboard ejecutivo con KPIs en tiempo real. Integración con todos los módulos para métricas automáticas.',
    placement: 'bottom',
    navigateTo: 'plan-accion',
    navigationDelay: 800,
    icon: <Target className="w-5 h-5 text-purple-700" />,
    type: 'success',
  },

  // ========================================
  // MÓDULO 10: RIESGOS
  // ========================================
  {
    id: 'riesgos-intro',
    target: '[data-tour="module-header"]',
    title: '🛡️ Módulo 9: Gestión de Riesgos',
    description: 'Prevención y mitigación de riesgos legales',
    content: '🛡️ RIESGOS gestiona la identificación y mitigación de riesgos legales institucionales. 📊 MATRIZ DE RIESGOS: Probabilidad (Alta/Media/Baja) × Impacto (Alto/Medio/Bajo). 🎯 TIPOS: Riesgos procesales, regulatorios, contractuales, reputacionales. 📋 Controles, planes de mitigación, responsables, seguimiento. 🚨 Alertas de riesgos extremos que escalan a dirección.',
    placement: 'bottom',
    navigateTo: 'riesgos',
    navigationDelay: 800,
    icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
    type: 'warning',
  },

  // ========================================
  // MÓDULO 11: PLANES DE MEJORAMIENTO
  // ========================================
  {
    id: 'mejoramiento-intro',
    target: '[data-tour="module-header"]',
    title: '📈 Módulo 10: Planes de Mejoramiento',
    description: 'Acciones correctivas y preventivas',
    content: '📈 PLANES DE MEJORAMIENTO gestiona acciones correctivas derivadas de hallazgos de órganos de control, auditorías o revisiones internas. 📋 ORIGEN: Contraloría, Procuraduría, Auditoría Interna, MECI. 🎯 SEGUIMIENTO: Acción, responsable, plazo, evidencia de cumplimiento, estado. ✅ Trazabilidad completa desde hallazgo hasta cierre definitivo. Integración con Órganos de Control.',
    placement: 'bottom',
    navigateTo: 'planes-mejoramiento',
    navigationDelay: 800,
    icon: <ClipboardCheck className="w-5 h-5 text-teal-600" />,
    type: 'success',
  },

  // ========================================
  // INTEGRACIÓN Y FLUJO COMPLETO
  // ========================================
  {
    id: 'flujo-completo',
    target: 'body',
    title: '🔄 Flujo Integrado - Cómo se Conectan los 11 Módulos',
    description: 'El poder de la integración total',
    content: '🔄 EJEMPLO DE FLUJO REAL COMPLETO: 1️⃣ COMUNICACIONES: Llega tutela contra ESAP → 2️⃣ IA clasifica y crea expediente en DEFENSA JUDICIAL → 3️⃣ Sistema crea término automático en TÉRMINOS → 4️⃣ Abogado solicita concepto técnico en ASESORÍA → 5️⃣ Se detecta negligencia de funcionario, deriva a JUZGAMIENTO → 6️⃣ Procuraduría solicita información, va a ÓRGANOS CONTROL → 7️⃣ Se identifica riesgo repetitivo, registra en RIESGOS → 8️⃣ Contraloría emite hallazgo, crea PLAN MEJORAMIENTO → 9️⃣ Todo sincronizado sin duplicar información. ✨ ESO es el poder del SIGL v5.0.',
    placement: 'center',
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    type: 'premium',
  },

  // ========================================
  // TIPS AVANZADOS
  // ========================================
  {
    id: 'tips-avanzados',
    target: 'body',
    title: '💡 Tips de Expertos para Dominar el SIGL',
    description: 'Funciones avanzadas que multiplican tu productividad',
    content: '💡 TIPS PROFESIONALES: ✅ Tooltips informativos ℹ️ en cada módulo (flujos, términos legales, conexiones) | ✅ Ctrl+K abre búsqueda global en todos los módulos | ✅ Acciones masivas: selecciona múltiples expedientes y aplica cambios en lote | ✅ @menciones en comentarios para colaboración | ✅ ⭐ Favoritos para acceso rápido | ✅ Exportar a Excel desde cualquier listado | ✅ Dashboard personalizable con KPIs que elijas. ¡Explora y descubre más!',
    placement: 'center',
    icon: <Lightbulb className="w-5 h-5 text-amber-600" />,
    type: 'warning',
  },

  // ========================================
  // FINALIZACIÓN
  // ========================================
  {
    id: 'finalizacion',
    target: 'body',
    title: '✅ ¡Felicitaciones - Completaste el Tour de 11 Módulos!',
    description: 'Ya conoces todo el SIGL v5.0',
    content: '🎉 ¡EXCELENTE TRABAJO! Has recorrido los 11 módulos del Sistema Integral de Gestión Legal: Dashboard, Defensa Judicial, Juzgamiento, Asesoría, Comunicaciones, Términos, Órganos Control, Procesos Coactivos, Plan de Acción, Riesgos y Planes de Mejoramiento. 🚀 PRÓXIMOS PASOS: Explora cada módulo con calma | Usa tooltips ℹ️ para recordar flujos | Prueba crear expedientes de práctica | Configura tus notificaciones. 💡 Puedes reactivar este tour cuando quieras desde el botón \"Tour\" en el dashboard. ¡Éxito en tu gestión jurídica! 🎯',
    placement: 'center',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    type: 'success',
    showSkip: false,
  },
];
