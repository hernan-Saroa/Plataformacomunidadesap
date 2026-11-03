import { TOLERANCIA_SIN_RESPONSABLE, diasParaVencer, estadoAlerta, puestosQueHacenAlgo } from './alertas.service';

/**
 * La alerta de proceso con un puesto obligatorio vacío (EFDS-1183, 109).
 *
 * No debería pasar, pero dejar un puesto sin nadie es una situación real, y
 * también lo es tomar el proceso y olvidarse de asignarlo. Mientras dure, lo
 * que ese puesto hace no lo puede hacer nadie: el proceso está parado.
 *
 * Se modela sobre la misma escala que los vencimientos —una fecha límite y los
 * días que faltan— para no inventar una segunda forma de ordenar lo urgente,
 * pero con una tolerancia propia: dos días, no treinta.
 */
describe('alerta de proceso con un puesto vacío', () => {
  /** La fecha en que se agota la tolerancia, contada desde que quedó parado. */
  const limite = (desde: string) => {
    const d = new Date(`${desde}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + TOLERANCIA_SIN_RESPONSABLE);
    return d.toISOString().slice(0, 10);
  };

  const comoQueda = (desde: string, hoy: string) => {
    const dias = diasParaVencer(limite(desde), hoy);
    return estadoAlerta(dias, TOLERANCIA_SIN_RESPONSABLE);
  };

  it('el día que se recibe no alerta: es el hueco normal antes de asignar', () => {
    expect(comoQueda('2026-09-09', '2026-09-09')).toBe('POR_VENCER');
  });

  it('pasada la tolerancia queda vencida', () => {
    // Tres días sin quien lo revise no es una advertencia temprana, es trabajo
    // detenido.
    expect(comoQueda('2026-09-09', '2026-09-12')).toBe('VENCIDO');
  });

  it('la tolerancia es de días, no de semanas', () => {
    // Los treinta de los vencimientos anticipan una fecha que aún no llegó;
    // esto cuenta un proceso que ya está parado. Si alguien sube este número a
    // la escala de las pólizas, la alerta deja de servir para lo que es.
    expect(TOLERANCIA_SIN_RESPONSABLE).toBeLessThanOrEqual(3);
    expect(TOLERANCIA_SIN_RESPONSABLE).toBeGreaterThan(0);
  });
});

describe('el puesto vacío solo alerta donde hace algo', () => {
  const uso = (puestoId: string) => ({
    puestoId,
    numeral: '3.6',
    nombreActividad: 'Causal',
    modalidad: null,
    como: 'HACE' as const,
    accion: 'editar' as const,
  });

  it('en una modalidad donde el puesto no hace nada, no alerta', async () => {
    const filas = [
      { proceso_id: 'a', modalidad: 'MINIMA_CUANTIA', version: 'v-1', puesto_id: 'p-abogado' },
      { proceso_id: 'b', modalidad: 'LICITACION_PUBLICA', version: 'v-1', puesto_id: 'p-abogado' },
    ];
    const usosDe = jest.fn(async (modalidad: string | null) => (modalidad === 'MINIMA_CUANTIA' ? [uso('p-abogado')] : []));

    const quedan = await puestosQueHacenAlgo(filas, usosDe);

    expect(quedan.map((f) => f.proceso_id)).toEqual(['a']);
  });

  it('pregunta una vez por modalidad y versión, no por proceso', async () => {
    const filas = ['a', 'b', 'c'].map((id) => ({ proceso_id: id, modalidad: 'MINIMA_CUANTIA', version: 'v-1', puesto_id: 'p-abogado' }));
    const usosDe = jest.fn(async () => [uso('p-abogado')]);

    expect(await puestosQueHacenAlgo(filas, usosDe)).toHaveLength(3);
    expect(usosDe).toHaveBeenCalledTimes(1);
  });
});
