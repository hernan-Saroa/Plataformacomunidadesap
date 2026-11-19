import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ParteFallidaError,
  contratacionService,
  subirParte,
} from '../../services/contratacionService';

/**
 * Sube un archivo grande por partes, con su avance (BUG-004 de QA, 14/11).
 *
 * Empieza en cuanto se elige el archivo: mientras sube, quien registra sigue
 * llenando el formulario, y al darle «Registrar» ya solo viaja el id de la
 * carga. Cada parte se reintenta sola si la red falla; si aun así no pasa, la
 * carga queda en «falló» y se retoma desde la parte que faltaba, sin volver a
 * subir lo que ya llegó.
 */

export type EstadoCarga = 'inactiva' | 'subiendo' | 'verificando' | 'lista' | 'fallo';

export interface Carga {
  estado: EstadoCarga;
  archivo: File | null;
  /** Bytes que ya llegaron al servidor. */
  enviados: number;
  /** De 0 a 100. */
  porcentaje: number;
  /** Segundos que faltan, estimados con la velocidad de lo que va; `null` mientras no hay con qué. */
  segundosRestantes: number | null;
  cargaId: string | null;
  error: string | null;
  /** Documentos que trae el .zip, cuando el servidor ya lo revisó. */
  archivosEnZip: number | null;
}

const INICIAL: Carga = {
  estado: 'inactiva',
  archivo: null,
  enviados: 0,
  porcentaje: 0,
  segundosRestantes: null,
  cargaId: null,
  error: null,
  archivosEnZip: null,
};

/** Intentos por parte, con espera creciente entre uno y otro. */
export const INTENTOS_POR_PARTE = 4;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function useCargaPorPartes(procesoId: string, numeral: string, { pausaEntreIntentos = 1000 } = {}) {
  const [carga, setCarga] = useState<Carga>(INICIAL);
  const control = useRef<AbortController | null>(null);
  /** Lo que ya se sabe de la carga en curso, para retomarla sin repetir partes. */
  const enCurso = useRef<{ id: string; partes: number; tamanoParte: number; siguiente: number } | null>(null);

  const subir = useCallback(
    async (archivo: File, retomar = false) => {
      control.current?.abort();
      const abortar = new AbortController();
      control.current = abortar;

      if (!retomar) enCurso.current = null;
      setCarga((c) => ({
        ...INICIAL,
        estado: 'subiendo',
        archivo,
        enviados: retomar ? c.enviados : 0,
        porcentaje: retomar ? c.porcentaje : 0,
      }));

      try {
        if (!enCurso.current) {
          const inicio = await contratacionService.iniciarCarga(procesoId, numeral, archivo);
          enCurso.current = { ...inicio, siguiente: 0 };
        }
        const plan = enCurso.current;
        const arranque = Date.now();
        const yaEnviado = plan.siguiente * plan.tamanoParte;

        for (let n = plan.siguiente; n < plan.partes; n++) {
          const desde = n * plan.tamanoParte;
          const trozo = archivo.slice(desde, Math.min(desde + plan.tamanoParte, archivo.size));

          for (let intento = 1; ; intento++) {
            try {
              await subirParte(
                contratacionService.rutaDeParte(procesoId, numeral, plan.id, n),
                trozo,
                (bytes) => {
                  const enviados = Math.min(desde + bytes, archivo.size);
                  const segundos = (Date.now() - arranque) / 1000;
                  const velocidad = segundos > 1 ? (enviados - yaEnviado) / segundos : 0;
                  setCarga((c) => ({
                    ...c,
                    enviados,
                    porcentaje: Math.min(99, Math.floor((enviados / archivo.size) * 100)),
                    segundosRestantes: velocidad > 0 ? Math.ceil((archivo.size - enviados) / velocidad) : null,
                  }));
                },
                abortar.signal,
              );
              break;
            } catch (err) {
              const reintentable = err instanceof ParteFallidaError && err.reintentable;
              if (!reintentable || intento >= INTENTOS_POR_PARTE) throw err;
              await espera(pausaEntreIntentos * 2 ** (intento - 1));
              if (abortar.signal.aborted) throw new DOMException('Carga cancelada', 'AbortError');
            }
          }
          plan.siguiente = n + 1;
        }

        // Al servidor le toca unir, calcular el hash y revisar el .zip: con
        // 200 MB tarda unos segundos, y la barra lo dice en vez de quedarse en 99 %.
        setCarga((c) => ({ ...c, estado: 'verificando', porcentaje: 99, segundosRestantes: null }));
        const lista = await contratacionService.completarCarga(procesoId, numeral, plan.id);
        if (abortar.signal.aborted) return;
        setCarga((c) => ({
          ...c,
          estado: 'lista',
          enviados: archivo.size,
          porcentaje: 100,
          cargaId: lista.id,
          archivosEnZip: lista.archivos,
        }));
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        // Si lo rechazó la revisión del .zip, retomar no sirve: hay que elegir otro.
        const definitivo = !(err instanceof ParteFallidaError) && !/Faltan \d+ de/.test(err?.message ?? '');
        if (definitivo) enCurso.current = null;
        setCarga((c) => ({
          ...c,
          estado: 'fallo',
          segundosRestantes: null,
          error: err?.message ?? 'No se pudo subir el archivo',
        }));
      }
    },
    [procesoId, numeral, pausaEntreIntentos],
  );

  /** Retoma desde la parte que faltaba; si la carga ya no sirve, empieza de nuevo. */
  const reintentar = useCallback(() => {
    if (carga.archivo) subir(carga.archivo, !!enCurso.current);
  }, [carga.archivo, subir]);

  /** Deja todo como al principio y le avisa al servidor para que borre lo que llegó. */
  const descartar = useCallback(() => {
    control.current?.abort();
    const id = enCurso.current?.id ?? carga.cargaId;
    enCurso.current = null;
    setCarga(INICIAL);
    if (id) contratacionService.cancelarCarga(procesoId, numeral, id).catch(() => undefined);
  }, [carga.cargaId, procesoId, numeral]);

  /** La carga ya se usó: se olvida sin borrarla, porque ahora es del expediente. */
  const olvidar = useCallback(() => {
    control.current?.abort();
    enCurso.current = null;
    setCarga(INICIAL);
  }, []);

  // Al salir de la pantalla se corta lo que esté subiendo.
  useEffect(() => () => control.current?.abort(), []);

  return { carga, subir, reintentar, descartar, olvidar };
}
