import { getApiGatewayBaseUrl } from '../../../config/environment';

/**
 * Cruces REALES de la programación viva — EFDS-2307.
 *
 * La API rechaza los cruces al guardar, así que el conteo debería ser 0. No se
 * quema el 0 en la pantalla: se pide al servidor, y si algún día no da 0 el
 * panel lo muestra. Es un contador distinto del histórico (Validación de
 * Cruces), que sigue saliendo de `getCrucesHistoricos`.
 */
export interface CruceVivo {
  tipo: 'grupo' | 'aula' | 'docente';
  dia: string;
  horaInicio: string;
  horaFin: string;
  recurso: string | null;
}

export interface ConteoCrucesVivos {
  total: number;
  grupo: number;
  aula: number;
  docente: number;
  cruces: CruceVivo[];
}

export async function getCrucesVivos(idPeriodo: string): Promise<ConteoCrucesVivos> {
  const res = await fetch(
    `${getApiGatewayBaseUrl()}/programacion-academica/api/v1/validacion/vivos?periodo=${encodeURIComponent(idPeriodo)}`,
    { method: 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'include' },
  );
  if (!res.ok) {
    let detalle = '';
    try { const cuerpo = await res.json(); detalle = cuerpo?.message || ''; } catch { /* sin cuerpo útil */ }
    throw new Error(detalle || `No se pudieron contar los cruces (error ${res.status}).`);
  }
  const cuerpo = await res.json();
  return (cuerpo?.data ?? cuerpo) as ConteoCrucesVivos;
}
