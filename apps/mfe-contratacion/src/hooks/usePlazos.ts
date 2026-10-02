import { useEffect, useState } from 'react';

import { contratacionService } from '../services/contratacionService';
import { PlazoDeActividad } from '../types';

/**
 * Los plazos de actividades por vencer o vencidos, por proceso.
 *
 * Una sola consulta para toda la pantalla: el servicio ya devuelve solo los de
 * los procesos donde participa quien mira. Dentro de cada proceso van del más
 * apretado al más holgado, así que el primero es el que manda en el semáforo.
 *
 * Sin respuesta la pantalla sigue sin semáforo: es información de más, no algo
 * que tenga que impedir trabajar.
 */
export function usePlazos(recargarToken?: number): Map<string, PlazoDeActividad[]> {
  const [porProceso, setPorProceso] = useState<Map<string, PlazoDeActividad[]>>(new Map());

  useEffect(() => {
    let vigente = true;
    Promise.resolve()
      .then(() => contratacionService.plazos())
      .then((plazos) => {
        if (!vigente) return;
        const mapa = new Map<string, PlazoDeActividad[]>();
        for (const p of [...(plazos ?? [])].sort((a, b) => a.restantes - b.restantes)) {
          const lista = mapa.get(p.procesoId) ?? [];
          lista.push(p);
          mapa.set(p.procesoId, lista);
        }
        setPorProceso(mapa);
      })
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [recargarToken]);

  return porProceso;
}
