import { useEffect, useMemo, useState } from 'react';

import { useAlcance } from '../auth/alcance';
import { useResponsables } from '../auth/responsables';
import { contratacionService } from '../services/contratacionService';
import { ActividadProceso, EstadoParticipacion, EstudioPrevio } from '../types';
import { TIENEN_PANEL } from '../components/proceso/actividadesConPanel';
import {
  destinoDeLaSituacion,
  EntradaSituacion,
  pasosDelCatalogo,
  Situacion,
  situacionDelProceso,
  situacionTrasAprobar,
} from '../components/proceso/situacionDelProceso';

export interface SituacionCargada {
  cargando: boolean;
  error: string | null;
  estudio: EstudioPrevio | null;
  catalogo: ActividadProceso[];
  situacion: Situacion | null;
  /** «Pasa a: …» si se aprueba esa actividad. Nulo mientras carga. */
  pasaA: (numeral: string) => string | null;
}

/**
 * Todo lo que hace falta para saber dónde está un proceso, en un solo hook.
 *
 * `DetalleProceso` ya tiene estos datos por su cuenta; esto es para las
 * pantallas que no montan el detalle —la revisión— y necesitan decir a quién
 * le toca y a dónde pasa el proceso al aprobar.
 */
export function useSituacionDelProceso(procesoId: string, recargarToken?: number): SituacionCargada {
  const [estudio, setEstudio] = useState<EstudioPrevio | null>(null);
  const [catalogo, setCatalogo] = useState<ActividadProceso[]>([]);
  const [participacion, setParticipacion] = useState<EstadoParticipacion | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const responsables = useResponsables();
  const { puede, cargado } = useAlcance();

  useEffect(() => {
    let vigente = true;
    setError(null);
    Promise.all([
      contratacionService.obtenerEstudioPrevio(procesoId),
      contratacionService.actividades(procesoId).catch(() => [] as ActividadProceso[]),
      // Sin participación se cae a los roles: menos preciso, pero no falso.
      Promise.resolve()
        .then(() => contratacionService.participacion(procesoId))
        .catch(() => null),
    ])
      .then(([e, c, p]) => {
        if (!vigente) return;
        setEstudio(e);
        setCatalogo(c);
        setParticipacion(p);
      })
      .catch((e: any) => vigente && setError(e.message ?? 'No se pudo cargar el proceso'))
      .finally(() => vigente && setCargando(false));
    return () => {
      vigente = false;
    };
  }, [procesoId, recargarToken]);

  const entrada = useMemo<EntradaSituacion | null>(() => {
    if (!estudio) return null;
    return {
      pasos: pasosDelCatalogo(catalogo as any, estudio.estado, TIENEN_PANEL),
      participacion: participacion ?? undefined,
      radicadoPorMi: estudio.proceso.radicadoPorMi,
      responsables,
      puedo: cargado ? puede : undefined,
    };
  }, [estudio, catalogo, participacion, responsables, cargado, puede]);

  return {
    cargando,
    error,
    estudio,
    catalogo,
    situacion: entrada ? situacionDelProceso(entrada) : null,
    pasaA: (numeral: string) =>
      entrada ? destinoDeLaSituacion(situacionTrasAprobar(entrada, numeral)) : null,
  };
}
