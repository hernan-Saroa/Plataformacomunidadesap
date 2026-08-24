import { SubsanacionesService } from './subsanaciones.service';

/**
 * Lo que decide la actividad 6.5 es una sola cosa: si lo presentado llegó en
 * término (EFDS-1464).
 *
 * Se resuelve al registrar y no se recalcula al consultar, por la misma razón
 * que el vencimiento se congela: si mañana se corrige el plazo del informe, lo
 * que ya se calificó de extemporáneo no puede cambiar de estado solo.
 *
 * Y extemporáneo **no** es rechazado: es un hecho que se anota, y quien decide
 * si lo acepta es la entidad.
 */
function servicio() {
  return new SubsanacionesService({ manager: {} } as any);
}

const informe = (venceEl: string | null) => ({ venceEl }) as any;

describe('fueraDeTermino', () => {
  it('lo presentado el día del vencimiento está en término', () => {
    // El término vence al final del día: a diferencia del plazo de ofertas,
    // este se cuenta en días hábiles y no lleva hora.
    expect((servicio() as any).fueraDeTermino(informe('2026-09-15'), '2026-09-15')).toBe(false);
  });

  it('lo presentado antes está en término', () => {
    expect((servicio() as any).fueraDeTermino(informe('2026-09-15'), '2026-09-10')).toBe(false);
  });

  it('lo presentado al día siguiente es extemporáneo', () => {
    expect((servicio() as any).fueraDeTermino(informe('2026-09-15'), '2026-09-16')).toBe(true);
  });

  it('compara por fecha de calendario y no por texto suelto', () => {
    // Un mes más adelante con día menor: comparar mal daría "en término".
    expect((servicio() as any).fueraDeTermino(informe('2026-09-30'), '2026-10-01')).toBe(true);
    expect((servicio() as any).fueraDeTermino(informe('2026-10-01'), '2026-09-30')).toBe(false);
  });

  it('sin vencimiento nada es extemporáneo', () => {
    // Solo pasaría con un traslado registrado sin plazo, que hoy no se permite.
    // Ante la duda no se marca: marcar de más le quita un derecho al oferente.
    expect((servicio() as any).fueraDeTermino(informe(null), '2099-01-01')).toBe(false);
  });
});
