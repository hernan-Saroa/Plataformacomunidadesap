import { useEffect, useState } from 'react';

import { useRevisionProgramacion } from '../services/actualizacionProgramacion';
import { getEstadoPublicacion, type EstadoPublicacion } from '../services/api/catalogoApi';

/**
 * Estado de publicación del periodo (el panel «programadas / publicadas / tomadas»).
 *
 * Se vuelve a leer del servidor cada vez que cambia el periodo O que una escritura
 * de programación se confirma (`programacion`, `publicaciones`): crear, mover o
 * borrar una franja cambia los conteos. Antes solo dependía del periodo, y tras
 * crear una franja el listado decía 1 mientras el panel seguía en 0 y el botón
 * «Publicar» deshabilitado, hasta recargar la página.
 *
 * Se descartan las respuestas de un periodo anterior o de una lectura vieja.
 */
export function useEstadoPublicacion(idPeriodo: string) {
  const revision = useRevisionProgramacion('programacion', 'publicaciones');
  const [estado, setEstado] = useState<EstadoPublicacion | null>(null);

  useEffect(() => {
    if (!idPeriodo) return;
    let vigente = true;
    getEstadoPublicacion(idPeriodo)
      .then((e) => { if (vigente) setEstado(e); })
      .catch(() => { if (vigente) setEstado(null); });
    return () => { vigente = false; };
  }, [idPeriodo, revision]);

  return [estado, setEstado] as const;
}
