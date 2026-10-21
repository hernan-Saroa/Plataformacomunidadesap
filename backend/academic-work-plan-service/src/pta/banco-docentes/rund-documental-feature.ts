import { NotFoundException } from '@nestjs/common';

/** F011/F012/F013 quedan aplazadas hasta una activación explícita por ambiente. */
export function rundDocumentalEnabled(): boolean {
  // Mismo valor exacto que los wrappers de despliegue: no activar sin sus comprobaciones.
  return process.env.RUND_DOCUMENTAL_ENABLED === 'true';
}

export function requireRundDocumental(): void {
  if (!rundDocumentalEnabled()) throw new NotFoundException('La ampliación documental no está habilitada.');
}
