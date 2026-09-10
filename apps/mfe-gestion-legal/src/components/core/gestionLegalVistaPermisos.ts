/**
 * Control de acceso al menú del SIGL (Gestión Legal), parametrizado por permisos.
 *
 * Extraído de GestionLegalFull.tsx para que sea testeable de forma aislada, sin
 * arrastrar el árbol completo de componentes de los 12 submódulos.
 *
 * Cada submódulo del menú tiene un permiso dedicado y exclusivo de visibilidad
 * `gestion-legal.<submodulo>.ver` ("Ver Módulo <Nombre>"), ver
 * `db/migrations/432_add_ver_modulo_permissions_gestion_legal.sql`. Un rol que
 * combine uno o varios de estos permisos obtiene acceso únicamente a esos
 * submódulos. El histórico `gestion-legal.<submodulo>.manage` se sigue
 * aceptando como puerta de acceso alterna, para no romper los roles ya
 * existentes que lo usan (JEFE/SECRETARIADO/MONITOREO/RESUELVE_GESTION_LEGAL,
 * ver RolesContext.md).
 */

import { authService } from '../../services/api/authService';
import { Permissions } from '@esap-mfe/shared-types/permissions';

export type VistaDisponible =
  | 'defensa-judicial'
  | 'juzgamiento'
  | 'asesoria'
  | 'centro-comunicaciones'
  | 'terminos'
  | 'organos-control'
  | 'procesos-coactivos'
  | 'expedientes'
  | 'plan-accion'
  | 'riesgos'
  | 'planes-mejoramiento'
  | 'configuraciones';

/**
 * Lee `?modulo=<vista>` del querystring para posicionar la vista inicial cuando
 * el módulo se abre desde una notificación. Acepta los códigos que emite el
 * backend (`legal-notifications.service.ts`: defensa-judicial, juzgamiento, asesoria,
 * organos-control, procesos-coactivos) y cualquier otro valor de `VistaDisponible`.
 */
export const VISTAS_VALIDAS: VistaDisponible[] = [
  'defensa-judicial',
  'juzgamiento',
  'asesoria',
  'centro-comunicaciones',
  'terminos',
  'organos-control',
  'procesos-coactivos',
  'expedientes',
  'plan-accion',
  'riesgos',
  'planes-mejoramiento',
  'configuraciones',
];

/**
 * Permisos que habilitan cada submódulo del menú. Cada entrada acepta el permiso
 * `*.ver` (acceso exclusivo de solo consulta al submódulo, parametrizable por rol)
 * o el histórico `*.manage` (para no romper los roles ya existentes que lo usan
 * como puerta de acceso: JEFE/SECRETARIADO/MONITOREO/RESUELVE_GESTION_LEGAL).
 */
export const VISTA_PERMISOS: Record<VistaDisponible, Permissions[]> = {
  'defensa-judicial': [Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_MANAGE, Permissions.GESTION_LEGAL_DEFENSA_JUDICIAL_VER],
  'juzgamiento': [Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_MANAGE, Permissions.GESTION_LEGAL_JUZGAMIENTO_DISCIPLINARIO_VER],
  'asesoria': [Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_MANAGE, Permissions.GESTION_LEGAL_ASESORIA_JURIDICA_VER],
  'centro-comunicaciones': [Permissions.GESTION_LEGAL_COMUNICACIONES_MANAGE, Permissions.GESTION_LEGAL_COMUNICACIONES_VER],
  'terminos': [Permissions.GESTION_LEGAL_TERMINOS_MANAGE, Permissions.GESTION_LEGAL_TERMINOS_VER],
  'organos-control': [Permissions.GESTION_LEGAL_ORGANOS_CONTROL_MANAGE, Permissions.GESTION_LEGAL_ORGANOS_CONTROL_VER],
  'procesos-coactivos': [Permissions.GESTION_LEGAL_PROCESOS_COACTIVOS_MANAGE, Permissions.GESTION_LEGAL_PROCESOS_COACTIVOS_VER],
  'expedientes': [Permissions.GESTION_LEGAL_EXPEDIENTES_ELECTRONICOS_MANAGE, Permissions.GESTION_LEGAL_EXPEDIENTES_ELECTRONICOS_VER],
  'plan-accion': [Permissions.GESTION_LEGAL_PLAN_ACCION_MANAGE, Permissions.GESTION_LEGAL_PLAN_ACCION_VER],
  'riesgos': [Permissions.GESTION_LEGAL_RIESGOS_MANAGE, Permissions.GESTION_LEGAL_RIESGOS_VER],
  'planes-mejoramiento': [Permissions.GESTION_LEGAL_PLANES_MEJORAMIENTO_MANAGE, Permissions.GESTION_LEGAL_PLANES_MEJORAMIENTO_VER],
  'configuraciones': [Permissions.GESTION_LEGAL_CONFIGURACIONES_MANAGE, Permissions.GESTION_LEGAL_CONFIGURACIONES_VER],
};

export function puedeVerVista(vista: VistaDisponible): boolean {
  return authService.hasAnyPermission(VISTA_PERMISOS[vista]);
}

/** Primer submódulo del menú al que el usuario tiene acceso, según sus permisos. */
export function getPrimeraVistaPermitida(): VistaDisponible {
  return VISTAS_VALIDAS.find(puedeVerVista) ?? 'defensa-judicial';
}

export function getVistaInicialDesdeQuery(): VistaDisponible {
  if (typeof window === 'undefined') return 'defensa-judicial';
  const moduloParam = new URLSearchParams(window.location.search).get('modulo');
  if (moduloParam && VISTAS_VALIDAS.includes(moduloParam as VistaDisponible)) {
    const vista = moduloParam as VistaDisponible;
    // Si el usuario no tiene permiso para la vista solicitada por query param,
    // se ignora y se cae al primer submódulo que sí tenga habilitado.
    return puedeVerVista(vista) ? vista : getPrimeraVistaPermitida();
  }
  return getPrimeraVistaPermitida();
}
