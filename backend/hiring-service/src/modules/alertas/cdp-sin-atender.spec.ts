import {
  TOLERANCIA_CDP_SIN_ATENDER,
  TOLERANCIA_SIN_ABOGADO,
  diasParaVencer,
  estadoAlerta,
} from './alertas.service';

/**
 * La alerta de solicitud de CDP sin atender.
 *
 * La solicitud entra a una bandeja compartida de la Dirección Financiera, y lo
 * que esta alerta vigila es que no se quede ahí: sin CDP expedido el proceso no
 * puede abrirse, así que una solicitud detenida frena la etapa 5 entera.
 *
 * Se modela sobre la misma escala que el resto —una fecha límite y los días que
 * faltan— para no inventar una segunda forma de ordenar lo urgente, con una
 * tolerancia propia contada desde que se solicitó.
 */
describe('alerta de solicitud de CDP sin atender', () => {
  /** La fecha en que se agota la tolerancia, contada desde que se solicitó. */
  const limite = (desde: string) => {
    const d = new Date(`${desde}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + TOLERANCIA_CDP_SIN_ATENDER);
    return d.toISOString().slice(0, 10);
  };

  const comoQueda = (desde: string, hoy: string) => {
    const dias = diasParaVencer(limite(desde), hoy);
    return estadoAlerta(dias, TOLERANCIA_CDP_SIN_ATENDER);
  };

  it('el día que se solicita ya se avisa, pero no como detenida', () => {
    // Avisa desde el primer día —es lo que saca la solicitud de la bandeja—,
    // y `sinAvisarYa` impide que ese mismo aviso se repita a diario.
    expect(comoQueda('2026-09-09', '2026-09-09')).toBe('POR_VENCER');
  });

  it('dentro de la tolerancia sigue siendo un aviso, no una alarma', () => {
    expect(comoQueda('2026-09-09', '2026-09-11')).toBe('POR_VENCER');
  });

  it('pasada la tolerancia queda vencida', () => {
    // Cuatro días sin que nadie la resuelva no es una advertencia temprana: es
    // un proceso que no puede abrirse.
    expect(comoQueda('2026-09-09', '2026-09-13')).toBe('VENCIDO');
  });

  it('la tolerancia es de días, no de semanas', () => {
    // Los treinta de los vencimientos anticipan una fecha que aún no llegó;
    // esto cuenta un trámite que ya está parado.
    expect(TOLERANCIA_CDP_SIN_ATENDER).toBeLessThanOrEqual(5);
    expect(TOLERANCIA_CDP_SIN_ATENDER).toBeGreaterThan(0);
  });

  it('da más margen que el reparto del abogado, porque es otra dirección', () => {
    // Quien tomó el proceso lo tiene delante; la Financiera recibe la solicitud
    // en una bandeja que no está mirando. Si algún día se igualan, la alerta
    // empezará a sonar antes de que la Dirección Financiera haya podido verla.
    expect(TOLERANCIA_CDP_SIN_ATENDER).toBeGreaterThan(TOLERANCIA_SIN_ABOGADO);
  });
});
