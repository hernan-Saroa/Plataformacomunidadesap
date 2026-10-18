export interface ManualIdentityPreview {
  version: 1;
  compatibilidad: 'COMPATIBLE_AL_CONSULTAR';
  reserva: false;
  solicitudCreada: false;
  ejecucionAutorizada: false;
  requierePreparacion: true;
}

export const manualPreviewFailure = () => new Error('No fue posible consultar la compatibilidad de los datos.');

export function validateManualPreview(raw: unknown): ManualIdentityPreview {
  const keys = ['version', 'compatibilidad', 'reserva', 'solicitudCreada', 'ejecucionAutorizada', 'requierePreparacion'];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).length !== 6
    || Object.keys(raw).some(key => !keys.includes(key))) throw manualPreviewFailure();
  const value = raw as Record<string, unknown>;
  if (value.version !== 1 || value.compatibilidad !== 'COMPATIBLE_AL_CONSULTAR' || value.reserva !== false
    || value.solicitudCreada !== false || value.ejecucionAutorizada !== false || value.requierePreparacion !== true) throw manualPreviewFailure();
  // Devuelve un recibo nuevo, sin conservar el objeto de un transporte elegido por el llamador.
  return { version: 1, compatibilidad: 'COMPATIBLE_AL_CONSULTAR', reserva: false,
    solicitudCreada: false, ejecucionAutorizada: false, requierePreparacion: true };
}
