import { useEffect, useRef, useState } from 'react';

import { contratacionService } from '../services/contratacionService';
import { SugerenciaModalidad } from '../types';

/** Se espera a que el usuario deje de teclear antes de consultar. */
const ESPERA_MS = 400;

/**
 * Modalidad que corresponde a la cuantía que se está digitando.
 *
 * La regla vive en el backend: aquí solo se consulta. Duplicarla en el cliente
 * abriría la puerta a que la pantalla y la API discrepen tras un despliegue.
 */
export function useSugerenciaModalidad(valorEstimado: number | null) {
  const [sugerencia, setSugerencia] = useState<SugerenciaModalidad | null>(null);
  const [consultando, setConsultando] = useState(false);

  // Identifica la consulta en curso: si el usuario sigue escribiendo, la
  // respuesta que llegue tarde no debe pisar a una más reciente.
  const ultima = useRef(0);

  useEffect(() => {
    if (valorEstimado === null) {
      setSugerencia(null);
      setConsultando(false);
      return;
    }

    const control = new AbortController();
    const turno = ++ultima.current;
    setConsultando(true);

    const temporizador = setTimeout(() => {
      contratacionService
        .sugerenciaModalidad(valorEstimado, control.signal)
        .then((r) => {
          if (turno === ultima.current) setSugerencia(r);
        })
        .catch(() => {
          // Que falle la sugerencia no puede impedir crear el proceso: es una
          // ayuda. Se limpia y el backend sigue validando al guardar.
          if (turno === ultima.current) setSugerencia(null);
        })
        .finally(() => {
          if (turno === ultima.current) setConsultando(false);
        });
    }, ESPERA_MS);

    return () => {
      clearTimeout(temporizador);
      control.abort();
    };
  }, [valorEstimado]);

  return { sugerencia, consultando };
}
