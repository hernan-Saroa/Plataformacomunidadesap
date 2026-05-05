/**
 * Pasos del Tour Guiado para SIGL v5.0 - OPTIMIZADO
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
 * Tour Principal del Dashboard SIGL - REDUCIDO
 */
export const siglDashboardTourSteps: TourStep[] = [
  {
    id: 'welcome',
    target: 'body',
    title: '🎉 ¡Bienvenido al SIGL v5.0!',
    description: 'Sistema Integral de Gestión Legal de ESAP',
    content: 'Te guiaré por las funcionalidades principales del sistema. Este tour toma 3-4 minutos.',
    placement: 'center',
    icon: <Sparkles className="w-5 h-5 text-purple-600" />,
    type: 'premium',
    showSkip: true,
  },
  {
    id: 'dashboard-overview',
    target: '[data-tour="dashboard-header"]',
    title: '📊 Dashboard Ejecutivo',
    description: 'Vista panorámica del área jurídica',
    content: 'Métricas consolidadas, alertas críticas y acceso rápido a los 11 módulos especializados.',
    placement: 'bottom',
    icon: <BarChart3 className="w-5 h-5 text-blue-600" />,
    type: 'info',
  },
  {
    id: 'modules-grid',
    target: '[data-tour="modules-grid"]',
    title: '🎯 11 Módulos Especializados',
    description: 'Gestión integral de operación jurídica',
    content: 'Defensa Judicial, Juzgamiento, Asesoría, Comunicaciones, Términos, Órganos Control, Procesos Coactivos y más.',
    placement: 'top',
    icon: <Target className="w-5 h-5 text-blue-600" />,
    type: 'info',
  },
  {
    id: 'completion',
    target: 'body',
    title: '✅ Tour Completo',
    description: 'Ya conoces el sistema',
    content: 'Explora los módulos y usa los tooltips (ℹ️) para más información. ¡Éxito! 🎯',
    placement: 'center',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    type: 'success',
    showSkip: false,
  },
];

/**
 * Tour Específico para Módulo de Defensa Judicial - REDUCIDO
 */
export const defensaJudicialTourSteps: TourStep[] = [
  {
    id: 'defensa-welcome',
    target: '[data-tour="module-header"]',
    title: '⚖️ Defensa Judicial',
    description: 'Gestión de demandas contra ESAP',
    content: 'Gestiona procesos judiciales en 4 etapas: Notificada, Contestación, Probatoria y Alegatos.',
    placement: 'bottom',
    icon: <Scale className="w-5 h-5 text-orange-600" />,
    type: 'info',
  },
  {
    id: 'defensa-complete',
    target: 'body',
    title: '✅ Listo',
    description: 'Dominas Defensa Judicial',
    content: 'Usa el tooltip (ℹ️) si necesitas ayuda.',
    placement: 'center',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    type: 'success',
  },
];

/**
 * Tour Específico para Centro de Comunicaciones - REDUCIDO
 */
export const comunicacionesTourSteps: TourStep[] = [
  {
    id: 'com-welcome',
    target: '[data-tour="module-header"]',
    title: '📬 Centro de Comunicaciones',
    description: 'Buzón unificado inteligente',
    content: 'Todas las notificaciones judiciales, correos y oficios llegan aquí. La IA clasifica automáticamente.',
    placement: 'bottom',
    icon: <Mail className="w-5 h-5 text-purple-600" />,
    type: 'premium',
  },
  {
    id: 'com-complete',
    target: 'body',
    title: '✅ Listo',
    description: 'Dominas el Centro de Comunicaciones',
    content: 'Aprovecha la clasificación IA y las acciones masivas.',
    placement: 'center',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
    type: 'success',
  },
];