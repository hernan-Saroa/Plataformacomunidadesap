import { SetMetadata } from '@nestjs/common';

export const PERMISOS_KEY = 'permisos';

/** Permisos (auth.permission.code) que habilitan el endpoint; basta con tener uno. */
export const RequierePermisos = (...permisos: string[]) =>
  SetMetadata(PERMISOS_KEY, permisos);
