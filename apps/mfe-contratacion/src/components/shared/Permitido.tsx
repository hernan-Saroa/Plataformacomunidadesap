import React from 'react';

import { tienePermiso } from '../../auth/permisos';
import { SinPermiso } from './PiezasPanel';

interface Props {
  /** Código del permiso que habilita la acción. */
  permiso: string;
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
 * Muestra la acción solo a quien puede ejecutarla (EFDS-1183).
 *
 * Los paneles ofrecían todos sus botones a todo el mundo: quien solo consulta
 * veía «Cargar documento» o «Aprobar», los pulsaba y recibía un 403 que no
 * puede interpretar. La consecuencia no es solo el error, es que concluye que
 * la plataforma está rota.
 *
 * Esconder no es la protección —el guard del servicio sigue negando lo que
 * corresponda— es no pintar puertas falsas. Por eso ante la duda no se
 * esconde: `tienePermiso` responde que sí cuando la sesión no está o llega
 * incompleta, y una pantalla vacía sin explicación sería peor que un botón de
 * más.
 */
export function Permitido({ permiso, quien, children }: Props) {
  if (tienePermiso(permiso)) return <>{children}</>;
  return quien ? <SinPermiso quien={quien} /> : null;
}
