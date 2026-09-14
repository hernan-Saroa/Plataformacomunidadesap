import { SetMetadata } from '@nestjs/common';

export const PERMISOS_KEY = 'permisos';

/**
 * Restringe un endpoint a quien tenga alguno de los permisos indicados.
 *
 * Se prefiere a `@Roles` porque los roles los crea el administrador desde la
 * plataforma: son datos, no código. Un endpoint que nombra `DIRECTOR_
 * CONTRATACION` deja de funcionar el día que alguien renombra ese rol o crea
 * otro equivalente, mientras que el permiso `contratacion.garantia.aprobar`
 * sigue significando lo mismo y el administrador decide quién lo tiene.
 *
 * Se evalúa con PermisosGuard, que corre después del JwtAuthGuard global.
 */
export const Permisos = (...permisos: string[]) => SetMetadata(PERMISOS_KEY, permisos);
