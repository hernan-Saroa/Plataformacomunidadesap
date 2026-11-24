/**
 * RUND-013 — Ancho realmente visible de un detalle que vive dentro de una
 * tabla con `min-width` y scroll horizontal.
 *
 * La celda de la fila expandida mide como mínimo lo que mide la tabla (900 px),
 * así que una rejilla `auto-fit` dentro de ella nunca se apila en pantallas
 * angostas. Este hook localiza el contenedor con scroll horizontal más cercano
 * y devuelve su ancho visible, para limitar el contenido a ese ancho y fijarlo
 * al borde izquierdo (`position: sticky`). Sin contenedor con scroll devuelve
 * `undefined` y el contenido conserva su ancho natural.
 */
import { useEffect, useState, type RefObject } from 'react';

const DESPLAZABLE = /(auto|scroll)/;

/** Primer ancestro con desbordamiento horizontal propio, o `null`. */
export function buscarContenedorDesplazable(inicio: HTMLElement | null): HTMLElement | null {
  let actual = inicio?.parentElement ?? null;
  while (actual && actual !== document.body) {
    if (DESPLAZABLE.test(window.getComputedStyle(actual).overflowX)) return actual;
    actual = actual.parentElement;
  }
  return null;
}

export function useAnchoVisible(ref: RefObject<HTMLElement | null>, montado = true): number | undefined {
  const [ancho, setAncho] = useState<number | undefined>(undefined);

  useEffect(() => {
    const contenedor = buscarContenedorDesplazable(ref.current);
    if (!contenedor) {
      setAncho(undefined);
      return undefined;
    }
    const medir = () => setAncho(contenedor.clientWidth > 0 ? contenedor.clientWidth : undefined);
    medir();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', medir);
      return () => window.removeEventListener('resize', medir);
    }
    const observador = new ResizeObserver(medir);
    observador.observe(contenedor);
    return () => observador.disconnect();
  }, [ref, montado]);

  return ancho;
}
