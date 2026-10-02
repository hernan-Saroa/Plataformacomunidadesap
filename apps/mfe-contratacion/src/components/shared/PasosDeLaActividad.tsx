import React from 'react';
import { Check } from 'lucide-react';

/**
 * En qué punto está cada paso, visto por quien mira.
 *
 * - `hecho`: ya pasó, y se dice quién lo hizo.
 * - `te-toca`: es de quien mira, y ahí están los botones.
 * - `le-toca`: es de otra persona o de otra área, y se dice de quién.
 * - `espera`: no puede empezar hasta que termine el anterior.
 * - `despues`: sigue en otra actividad; se nombra para que se sepa a dónde va.
 */
export type EstadoDelPaso = 'hecho' | 'te-toca' | 'le-toca' | 'espera' | 'despues';

export interface PasoDeLaActividad {
  titulo: string;
  estado: EstadoDelPaso;
  /** Quién lo hizo, a quién le toca o qué falta, en una línea. */
  detalle?: React.ReactNode;
  /** Otra etiqueta en vez de la del estado, p. ej. «Sigue en 3.4». */
  etiqueta?: string;
  /** Los botones o el formulario del paso; solo se pintan si hay. */
  children?: React.ReactNode;
}

const ETIQUETA: Record<EstadoDelPaso, string> = {
  hecho: 'Hecho',
  'te-toca': 'Te toca',
  'le-toca': 'Pendiente',
  espera: 'En espera',
  despues: 'Después',
};

/**
 * Una actividad dicha como la lista corta de pasos que la componen.
 *
 * Hacerse cargo de un proceso en la 3.3 o de la solicitud de CDP en la 4.1 no
 * es un acto suelto: es el primero de una cadena —tomarlo, repartirlo, que lo
 * revisen— y la pantalla anterior mostraba cada pieza como un aviso aparte.
 * Quien entraba veía un «Todavía no lo lleva nadie» y un botón, pero no qué
 * venía después ni en cuál de los pasos estaba. Numerados, con quién hizo cada
 * uno y a quién le toca el siguiente, se lee de un vistazo.
 */
export function PasosDeLaActividad({ pasos }: { pasos: PasoDeLaActividad[] }) {
  return (
    <ol className="pasos-actividad">
      {pasos.map((paso, i) => (
        <li key={paso.titulo} className={`paso-actividad paso-actividad--${paso.estado}`}>
          <span className="paso-actividad-marca" aria-hidden="true">
            {paso.estado === 'hecho' ? <Check className="w-3 h-3" strokeWidth={3} /> : i + 1}
          </span>
          <div className="paso-actividad-cuerpo">
            <div className="paso-actividad-cabeza">
              <p className="paso-actividad-titulo">{paso.titulo}</p>
              <span className="paso-actividad-estado">{paso.etiqueta ?? ETIQUETA[paso.estado]}</span>
            </div>
            {paso.detalle && <p className="paso-actividad-detalle">{paso.detalle}</p>}
            {paso.children && <div className="paso-actividad-acciones">{paso.children}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
