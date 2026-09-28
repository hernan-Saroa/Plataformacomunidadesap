import React from 'react';

import { useAlcance } from '../../auth/alcance';
import { AccionAlcance } from '../../types';
import { SinPermiso } from './PiezasPanel';

interface Props {
  /** Lo que habilita la acción: ver, editar, aprobar o decidir. */
  accion: AccionAlcance;
  /**
   * Dónde: el punto ('4.2'), la etapa ('E10'), el trámite ('INC.1') o nada,
   * si basta con tener la acción en alguna parte.
   */
  punto?: string;
  /**
   * Quién sí la ejecuta, con el nombre que usa el área.
   *
   * Con esto la ausencia se explica —«Este paso lo realiza la Dirección de
   * Contratación»— en vez de dejar un hueco. Sin esto, la acción desaparece
   * en silencio, que es lo correcto donde la pantalla ya dice quién actúa.
   */
  quien?: string;
  children: React.ReactNode;
}

/**
 * Muestra la acción solo a quien puede ejecutarla (EFDS-1183, migración 083).
 *
 * Los paneles ofrecían todos sus botones a todo el mundo: quien solo consulta
 * veía «Cargar documento» o «Aprobar», los pulsaba y recibía un 403 que no
 * puede interpretar. La consecuencia no es solo el error, es que concluye que
 * la plataforma está rota.
 *
 * Se pregunta por la acción en el punto —«¿edita la 5.6?»— y no por un
 * permiso general, que es lo que evalúa el guard del servicio. Esconder no es
 * la protección: ante la duda no se esconde, y el guard sigue negando.
 */
export function Permitido({ accion, punto, quien, children }: Props) {
  const { puede } = useAlcance();
  if (puede(accion, punto)) return <>{children}</>;
  return quien ? <SinPermiso quien={quien} /> : null;
}
