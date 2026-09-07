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

  /**
   * Guarda el borrador, y si choca por versión lo reintenta una vez.
   *
   * El conflicto casi siempre es contra un cambio propio —adjuntar un
   * documento, otra pestaña abierta—, y pedir recargar costaría lo que el
   * usuario acaba de escribir. Si el segundo intento vuelve a chocar, propaga:
   * ahí sí hay alguien más editando.
   */
  const guardarReintentando = useCallback(
    async (version: number): Promise<number> => {
      try {
        const res = await contratacionService.guardarBorrador(
          procesoId!,
          estado.valores,
          version,
        );
        return res.version;
      } catch (err: any) {
        if (!(err instanceof ConflictoError)) throw err;

        const actual = await contratacionService.obtenerEstudioPrevio(procesoId!);
        const res = await contratacionService.guardarBorrador(
          procesoId!,
          estado.valores,
          actual.version,
        );
        return res.version;
      }
    },
    [procesoId, estado.valores],
  );

  const guardar = useCallback(async () => {
    if (!procesoId || !estado.datos) return;
    setEstado((e) => ({ ...e, guardando: true, mensaje: null }));
    try {
      const version = await guardarReintentando(estado.datos.version);
      setEstado((e) => ({
        ...e,
        guardando: false,
        datos: e.datos ? { ...e.datos, version } : e.datos,
        mensaje: { tipo: 'ok', texto: 'Borrador guardado' },
      }));
    } catch (err: any) {
      setEstado((e) => ({
        ...e,
        guardando: false,
        mensaje: {
          tipo: 'error',
          texto:
            err instanceof ConflictoError
              ? `${err.message} Copia lo que escribiste antes de recargar.`
              : err.message,
        },
      }));
    }
  }, [procesoId, estado.datos, guardarReintentando]);

  /** Guarda y envía. El 422 se traduce en la lista de faltantes marcada en pantalla. */
  const enviar = useCallback(async () => {
    if (!procesoId || !estado.datos) return;
    setEstado((e) => ({ ...e, enviando: true, mensaje: null, faltantes: [], documentoFaltante: false }));
    try {
      await guardarReintentando(estado.datos.version);
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
  }, [procesoId, estado.datos, cargar, guardarReintentando]);

  const irACampo = useCallback((codigo: string) => {
    const contenedor = document.querySelector(`[data-campo="${codigo}"]`);
    contenedor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (contenedor?.querySelector('input, textarea, select') as HTMLElement | null)?.focus();
  }, []);

  return { ...estado, cargar, cambiar, guardar, enviar, irACampo };
}
