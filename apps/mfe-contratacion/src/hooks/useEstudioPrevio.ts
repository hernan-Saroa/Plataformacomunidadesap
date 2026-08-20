import { useCallback, useEffect, useState } from 'react';
import { contratacionService } from '../services/contratacionService';
import {
  CampoFaltante,
  CamposFaltantesError,
  ConflictoError,
  EstudioPrevio,
} from '../types';

interface Estado {
  datos: EstudioPrevio | null;
  valores: Record<string, any>;
  errores: Record<string, string>;
  faltantes: CampoFaltante[];
  /** El estudio previo firmado no se ha adjuntado. */
  documentoFaltante: boolean;
  cargando: boolean;
  guardando: boolean;
  enviando: boolean;
  mensaje: { tipo: 'ok' | 'error'; texto: string } | null;
}

const INICIAL: Estado = {
  datos: null,
  valores: {},
  errores: {},
  faltantes: [],
  documentoFaltante: false,
  cargando: true,
  guardando: false,
  enviando: false,
  mensaje: null,
};

export function useEstudioPrevio(procesoId: string | null) {
  const [estado, setEstado] = useState<Estado>(INICIAL);

  const cargar = useCallback(async () => {
    if (!procesoId) return;
    setEstado((e) => ({ ...e, cargando: true, mensaje: null }));
    try {
      const datos = await contratacionService.obtenerEstudioPrevio(procesoId);
      setEstado({
        ...INICIAL,
        datos,
        valores: datos.datos ?? {},
        cargando: false,
      });
    } catch (err: any) {
      setEstado((e) => ({
        ...e,
        cargando: false,
        mensaje: { tipo: 'error', texto: err.message },
      }));
    }
  }, [procesoId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /** Al escribir en un campo marcado, su error desaparece. */
  const cambiar = useCallback((codigo: string, valor: any) => {
    setEstado((e) => {
      const errores = { ...e.errores };
      delete errores[codigo];
      return {
        ...e,
        valores: { ...e.valores, [codigo]: valor },
        errores,
        faltantes: e.faltantes.filter((f) => f.codigo !== codigo),
      };
    });
  }, []);

  const guardar = useCallback(async () => {
    if (!procesoId || !estado.datos) return;
    setEstado((e) => ({ ...e, guardando: true, mensaje: null }));
    try {
      const res = await contratacionService.guardarBorrador(
        procesoId,
        estado.valores,
        estado.datos.version,
      );
      setEstado((e) => ({
        ...e,
        guardando: false,
        datos: e.datos ? { ...e.datos, version: res.version } : e.datos,
        mensaje: { tipo: 'ok', texto: 'Borrador guardado' },
      }));
    } catch (err: any) {
      if (err instanceof ConflictoError) {
        // Pedirle al usuario que recargue le costaría lo que acaba de
        // escribir. Se relee la versión vigente y se reintenta una vez con
        // los mismos valores: el conflicto casi siempre es contra un cambio
        // propio —adjuntar un documento, otra pestaña abierta—, no contra
        // otra persona editando el mismo estudio previo.
        try {
          const actual = await contratacionService.obtenerEstudioPrevio(procesoId);
          const res = await contratacionService.guardarBorrador(
            procesoId,
            estado.valores,
            actual.version,
          );
          setEstado((e) => ({
            ...e,
            guardando: false,
            datos: e.datos ? { ...e.datos, version: res.version } : e.datos,
            mensaje: { tipo: 'ok', texto: 'Borrador guardado' },
          }));
          return;
        } catch (reintento: any) {
          // Si vuelve a chocar, alguien más está editando de verdad: ahí sí
          // recargar es lo correcto, y se avisa sin haber pisado su trabajo.
          setEstado((e) => ({
            ...e,
            guardando: false,
            mensaje: {
              tipo: 'error',
              texto: `${reintento.message} Copia lo que escribiste antes de recargar.`,
            },
          }));
          return;
        }
      }

      setEstado((e) => ({
        ...e,
        guardando: false,
        mensaje: { tipo: 'error', texto: err.message },
      }));
    }
  }, [procesoId, estado.valores, estado.datos]);

  /** Guarda y envía. El 422 se traduce en la lista de faltantes marcada en pantalla. */
  const enviar = useCallback(async () => {
    if (!procesoId || !estado.datos) return;
    setEstado((e) => ({ ...e, enviando: true, mensaje: null, faltantes: [], documentoFaltante: false }));
    try {
      await contratacionService.guardarBorrador(procesoId, estado.valores, estado.datos.version);
      await contratacionService.enviarARevision(procesoId);
      await cargar();
      setEstado((e) => ({
        ...e,
        enviando: false,
        mensaje: { tipo: 'ok', texto: 'Estudio previo enviado a revisión' },
      }));
    } catch (err: any) {
      if (err instanceof CamposFaltantesError) {
        const errores: Record<string, string> = {};
        for (const c of err.camposFaltantes) errores[c.codigo] = 'Este campo es obligatorio';
        setEstado((e) => ({
          ...e,
          enviando: false,
          errores,
          faltantes: err.camposFaltantes,
          documentoFaltante: err.documentoFaltante,
          mensaje: err.documentoFaltante && err.camposFaltantes.length === 0
            ? { tipo: 'error', texto: err.message }
            : null,
        }));
        return;
      }
      setEstado((e) => ({
        ...e,
        enviando: false,
        mensaje: { tipo: 'error', texto: err.message },
      }));
    }
  }, [procesoId, estado.valores, estado.datos, cargar]);

  const irACampo = useCallback((codigo: string) => {
    const contenedor = document.querySelector(`[data-campo="${codigo}"]`);
    contenedor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (contenedor?.querySelector('input, textarea, select') as HTMLElement | null)?.focus();
  }, []);

  return { ...estado, cargar, cambiar, guardar, enviar, irACampo };
}
