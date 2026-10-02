import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAlcance } from '../auth/alcance';
import { useResponsables } from '../auth/responsables';
import { contratacionService } from '../services/contratacionService';
import { ElementoPorRevisar, ProcesoResumen } from '../types';
import { situacionDelResumen } from '../components/procesos/pasosDelResumen';
import { clasificarMiTrabajo, MiTrabajo } from '../components/trabajo/miTrabajo';
import { usePlazos } from './usePlazos';

export interface EstadoMiTrabajo {
  trabajo: MiTrabajo;
  porRevisar: ElementoPorRevisar[];
  plazos: ReturnType<typeof usePlazos>;
  cargando: boolean;
  error: string | null;
  /** Lo que reclama una acción de quien mira: el número del menú. */
  pendientes: number;
  recargar: () => void;
}

/**
 * Todo lo que alimenta «Mi trabajo», leído una vez para el menú y la bandeja.
 *
 * Lo monta el módulo y no la bandeja porque el contador del menú tiene que
 * estar al día aunque la bandeja no esté abierta.
 */
export function useMiTrabajo(recargarToken?: unknown): EstadoMiTrabajo {
  const [procesos, setProcesos] = useState<ProcesoResumen[]>([]);
  const [porRevisar, setPorRevisar] = useState<ElementoPorRevisar[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vuelta, setVuelta] = useState(0);
  const responsables = useResponsables();
  const { puede, cargado } = useAlcance();
  const plazos = usePlazos(vuelta);

  const recargar = useCallback(() => setVuelta((v) => v + 1), []);

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    Promise.all([
      Promise.resolve().then(() => contratacionService.listarProcesos()),
      // Sin la bandeja de revisión se sigue con el resto: es otra consulta.
      Promise.resolve()
        .then(() => contratacionService.porRevisar())
        .catch(() => [] as ElementoPorRevisar[]),
    ])
      .then(([lista, revisar]) => {
        if (!vigente) return;
        setProcesos(lista ?? []);
        setPorRevisar(revisar ?? []);
        setError(null);
      })
      .catch((e: any) => vigente && setError(e?.message ?? 'No se pudo cargar tu trabajo'))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [vuelta, recargarToken]);

  const trabajo = useMemo(
    () =>
      clasificarMiTrabajo(
        procesos.map((proceso) => ({
          proceso,
          situacion: situacionDelResumen(proceso, responsables, cargado ? puede : undefined),
        })),
      ),
    [procesos, responsables, cargado, puede],
  );

  return {
    trabajo,
    porRevisar,
    plazos,
    cargando,
    error,
    pendientes: trabajo.porHacer.length + trabajo.porAsignar.length + porRevisar.length,
    recargar,
  };
}
