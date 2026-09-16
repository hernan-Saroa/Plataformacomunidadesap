import React from 'react';
import { ClipboardCheck } from 'lucide-react';

/**
 * La decisión escondida, reducida a un botón flotante.
 *
 * Cuando el aprobador cierra la tarjeta de decisión, la actividad sigue
 * esperando su respuesta: dejarla desaparecer sin rastro convertiría el gesto
 * de apartarla en una forma de olvidarla. La burbuja es lo que queda —basta
 * para saber que hay algo pendiente y para volver de un clic— sin ocupar la
 * columna mientras el gestor trabaja en otra cosa.
 *
 * Va anclada a la ventana y no a la rejilla: si se fuera con el desplazamiento
 * dejaría de cumplir su única función, que es estar siempre a mano.
 */
export function BurbujaDecision({
  numeral,
  faltanDocumentos = 0,
  onAbrir,
}: {
  numeral: string;
  /** Formatos sin cargar; cambia el color del punto, no el mensaje. */
  faltanDocumentos?: number;
  onAbrir: () => void;
}) {
  const pendiente = faltanDocumentos > 0;

  return (
    <div className="burbuja-decision">
      <button
        type="button"
        onClick={onAbrir}
        title={`Actividad ${numeral} · pendiente de tu decisión`}
        aria-label={`Ver tu decisión sobre la actividad ${numeral}`}
        className="burbuja-boton"
      >
        <ClipboardCheck className="burbuja-icono" aria-hidden="true" />

        {/*
          El texto solo al pasar por encima: en reposo es un círculo limpio que
          no tapa la pantalla, y al acercarse dice de qué se trata sin tener que
          pulsarlo para averiguarlo.

          El despliegue se hace desde `layout.css` y no con utilidades de ancho
          arbitrario: el CSS de Tailwind se compila escaneando solo el shell, y
          una clase que únicamente aparece aquí se descarta sin avisar.
        */}
        <span className="burbuja-texto">
          <span className="burbuja-texto-interior">Tu decisión · {numeral}</span>
        </span>

        {/*
          El punto de aviso. Ámbar cuando faltan formatos y blanco cuando está
          todo listo: el color adelanta si se puede aprobar ya o si primero hay
          que resolver algo, antes de abrir la tarjeta.
        */}
        <span
          className={`burbuja-punto ${pendiente ? 'es-pendiente' : 'es-lista'}`}
          aria-hidden="true"
        >
          <span className="burbuja-pulso" />
        </span>
      </button>
    </div>
  );
}
