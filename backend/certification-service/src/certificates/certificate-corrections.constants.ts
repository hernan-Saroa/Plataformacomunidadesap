/**
 * Permiso que habilita gestionar (revisar, editar, aprobar o rechazar) las
 * solicitudes de corrección de certificados laborales.
 *
 * Se centraliza aquí porque define dos cosas que deben ir siempre de la mano:
 * quién puede entrar a la bandeja de correcciones y quién recibe el aviso por
 * correo cuando el ciudadano radica una solicitud nueva desde el portal.
 */
export const MANAGE_CORRECTIONS_PERMISSION =
  'certificados-laborales.correction.manage';
