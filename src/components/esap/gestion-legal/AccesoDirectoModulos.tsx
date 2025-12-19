/**
 * ============================================
 * ACCESO DIRECTO A MÓDULOS SIGL
 * ============================================
 * 
 * Componente de ejemplo que muestra cómo acceder directamente
 * a un módulo específico sin pasar por el selector.
 * 
 * ÚSALO ASÍ DESDE TU SIDEBAR O ROUTER:
 * 
 * <KanbanSIGL moduloInicial="mod-01" /> 
 * // Abre directo Defensa Judicial
 * 
 * <KanbanSIGL moduloInicial="mod-02" /> 
 * // Abre directo Órganos de Control
 * 
 * <KanbanSIGL /> 
 * // Sin moduloInicial = muestra selector
 */

import { KanbanSIGL, MODULOS_SIGL } from './index';

// ============================================
// COMPONENTES DE ACCESO DIRECTO
// ============================================

export function DefensaJudicial() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.DEFENSA_JUDICIAL} />;
}

export function OrganosControl() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.ORGANOS_CONTROL} />;
}

export function AsesoriaJuridica() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.ASESORIA_JURIDICA} />;
}

export function JuzgamientoDisciplinario() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.JUZGAMIENTO_DISCIPLINARIO} />;
}

export function ProcesosCoactivos() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.PROCESOS_COACTIVOS} />;
}

export function BuzonNotificaciones() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.BUZON_NOTIFICACIONES} />;
}

export function BuzonOficinaJuridica() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.BUZON_OFICINA_JURIDICA} />;
}

export function PlanAccion() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.PLAN_ACCION} />;
}

export function Riesgos() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.RIESGOS} />;
}

export function PlanesMejoramiento() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.PLANES_MEJORAMIENTO} />;
}

export function TerminosInformes() {
  return <KanbanSIGL moduloInicial={MODULOS_SIGL.TERMINOS_INFORMES} />;
}

// ============================================
// EJEMPLO DE CONFIGURACIÓN PARA SIDEBAR
// ============================================

export const SIDEBAR_CONFIG_SIGL = [
  {
    id: 'defensa-judicial',
    label: 'Defensa Judicial',
    component: DefensaJudicial,
    moduloId: MODULOS_SIGL.DEFENSA_JUDICIAL,
  },
  {
    id: 'organos-control',
    label: 'Órganos de Control',
    component: OrganosControl,
    moduloId: MODULOS_SIGL.ORGANOS_CONTROL,
  },
  {
    id: 'asesoria-juridica',
    label: 'Asesoría Jurídica',
    component: AsesoriaJuridica,
    moduloId: MODULOS_SIGL.ASESORIA_JURIDICA,
  },
  {
    id: 'juzgamiento-disciplinario',
    label: 'Juzgamiento Disciplinario',
    component: JuzgamientoDisciplinario,
    moduloId: MODULOS_SIGL.JUZGAMIENTO_DISCIPLINARIO,
  },
  {
    id: 'procesos-coactivos',
    label: 'Procesos Coactivos',
    component: ProcesosCoactivos,
    moduloId: MODULOS_SIGL.PROCESOS_COACTIVOS,
  },
  {
    id: 'buzon-notificaciones',
    label: 'Buzón de Notificaciones',
    component: BuzonNotificaciones,
    moduloId: MODULOS_SIGL.BUZON_NOTIFICACIONES,
  },
  {
    id: 'buzon-oficina-juridica',
    label: 'Buzón Oficina Jurídica',
    component: BuzonOficinaJuridica,
    moduloId: MODULOS_SIGL.BUZON_OFICINA_JURIDICA,
  },
  {
    id: 'plan-accion',
    label: 'Plan de Acción',
    component: PlanAccion,
    moduloId: MODULOS_SIGL.PLAN_ACCION,
  },
  {
    id: 'riesgos',
    label: 'Riesgos',
    component: Riesgos,
    moduloId: MODULOS_SIGL.RIESGOS,
  },
  {
    id: 'planes-mejoramiento',
    label: 'Planes de Mejoramiento',
    component: PlanesMejoramiento,
    moduloId: MODULOS_SIGL.PLANES_MEJORAMIENTO,
  },
  {
    id: 'terminos-informes',
    label: 'Términos para Informes',
    component: TerminosInformes,
    moduloId: MODULOS_SIGL.TERMINOS_INFORMES,
  },
];
