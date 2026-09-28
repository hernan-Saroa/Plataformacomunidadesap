import { authService } from '../../../../services/api/authService';

/**
 * Quién puede firmar/aprobar en una etapa NO se decide con roles quemados en el código:
 * sale de la configuración del módulo (Configuraciones SIGL → Estados → Aprobación),
 * donde el administrador define por etapa si se requiere aprobación y de qué rol o usuario.
 *
 * Este módulo centraliza esa lectura para que Defensa Judicial, Juzgamiento Disciplinario
 * y Asesoría Jurídica apliquen exactamente la misma regla (antes cada pantalla la resolvía
 * por su cuenta y algunas ni siquiera la consultaban, así que el rol Resuelve veía el botón
 * de firmar en etapas cuyo aprobador configurado era el Jefe).
 */
export interface EtapaAprobacionConfig {
  id?: string;
  nombre?: string;
  aprobacionTipo?: 'ninguno' | 'rol' | 'usuario';
  aprobacionRol?: string;
  aprobacionUsuario?: string;
}

const normalizar = (valor?: string): string =>
  (valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();

/**
 * Ubica la etapa configurada que corresponde a la etapa actual del expediente/proceso.
 * La etapa puede venir guardada como id ("fallo-primera-instancia") o como nombre legible.
 */
export function buscarEtapaConfigurada<T extends EtapaAprobacionConfig>(
  etapasConfiguradas: T[] | undefined | null,
  etapaActual?: string
): T | undefined {
  const objetivo = normalizar(etapaActual);
  if (!objetivo) return undefined;
  return (etapasConfiguradas || []).find(
    (etapa) => normalizar(etapa?.id) === objetivo || normalizar(etapa?.nombre) === objetivo
  );
}

/** La etapa exige firma/aprobación sólo si el administrador configuró un aprobador. */
export function etapaRequiereAprobacion(etapa?: EtapaAprobacionConfig): boolean {
  return !!(etapa && etapa.aprobacionTipo && etapa.aprobacionTipo !== 'ninguno');
}

/**
 * ¿El usuario actual es el aprobador configurado para esta etapa?
 * Los super administradores siempre pueden, como en el resto de la plataforma.
 */
export function usuarioPuedeAprobarEtapa(etapa?: EtapaAprobacionConfig): boolean {
  if (!etapaRequiereAprobacion(etapa) || !etapa) return false;
  if (authService.isSuperAdmin()) return true;

  if (etapa.aprobacionTipo === 'rol' && etapa.aprobacionRol) {
    return authService.hasRole(etapa.aprobacionRol);
  }

  if (etapa.aprobacionTipo === 'usuario' && etapa.aprobacionUsuario) {
    const currentUser = authService.getCurrentUser() as any;
    if (!currentUser) return false;
    const currentUserId =
      currentUser.id ||
      currentUser.id_user ||
      currentUser.user?.id ||
      currentUser.user?.id_user ||
      currentUser.person?.id;
    return String(currentUserId) === String(etapa.aprobacionUsuario);
  }

  return false;
}

/**
 * Regla única para habilitar la firma de documentos en una etapa: debe haber aprobador
 * configurado y el usuario actual debe serlo.
 *
 * Si la etapa no tiene aprobación parametrizada, esa etapa no exige firma y el botón no se
 * muestra a nadie: la firma se habilita parametrizando la etapa, nunca por código.
 */
export function usuarioPuedeFirmarEnEtapa(etapa?: EtapaAprobacionConfig): boolean {
  return etapaRequiereAprobacion(etapa) && usuarioPuedeAprobarEtapa(etapa);
}
