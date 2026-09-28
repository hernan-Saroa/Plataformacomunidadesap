import { useState, useEffect } from 'react';
import { obtenerFestivosAuth, obtenerFestivosEnMemoria } from '../utils/diasHabilesUtils';

/**
 * Hook de React para cargar y suscribirse a los días festivos oficiales de Auth.
 */
export function useFestivos(year?: number) {
  const [festivos, setFestivos] = useState<Set<string>>(() => obtenerFestivosEnMemoria());
  const [cargando, setCargando] = useState<boolean>(false);

  useEffect(() => {
    let activo = true;
    setCargando(true);

    obtenerFestivosAuth(year)
      .then((res) => {
        if (activo) {
          setFestivos(res);
        }
      })
      .catch((err) => {
        console.warn('[useFestivos] Error cargando festivos:', err);
      })
      .finally(() => {
        if (activo) {
          setCargando(false);
        }
      });

    return () => {
      activo = false;
    };
  }, [year]);

  return { festivos, cargando };
}

export default useFestivos;
