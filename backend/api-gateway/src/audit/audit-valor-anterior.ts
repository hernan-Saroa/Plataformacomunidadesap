/**
 * Auditoría del "antes y después" para servicios que, al actualizar, devuelven en el cuerpo de
 * la respuesta el valor que había antes (`previousValue`) junto al nuevo (`value`). Es el caso
 * de las configuraciones de Gestión Legal (PUT /configurations/:key), por ejemplo los Entes de
 * Control de Planes de Mejoramiento (EFDS-2417).
 *
 * El audit-service calcula el diff campo a campo entre `previousData` y `newData`; sin
 * `previousData` solo registraba el valor nuevo. Aquí se arman ambos. Si la respuesta no trae
 * `previousValue`, devuelve undefined y el interceptor se comporta como siempre.
 */
export interface DatosAntesYDespues {
  previousData: Record<string, unknown>;
  newData: Record<string, unknown>;
}

export function datosAntesYDespues(method: string, responseBody: unknown): DatosAntesYDespues | undefined {
  if (method !== 'PUT' && method !== 'PATCH') return undefined;
  if (!responseBody || typeof responseBody !== 'object' || Array.isArray(responseBody)) return undefined;
  const cuerpo = responseBody as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(cuerpo, 'previousValue')) return undefined;
  if (!Object.prototype.hasOwnProperty.call(cuerpo, 'value')) return undefined;
  return {
    previousData: { value: cuerpo.previousValue },
    newData: { value: cuerpo.value },
  };
}
