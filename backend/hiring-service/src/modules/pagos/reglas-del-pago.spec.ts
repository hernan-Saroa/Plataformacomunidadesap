import { EstadoContrato } from '../../entities/contrato.entity';
import { admitePagos, cobradoCabeEnElContrato, excedeElContrato } from './pagos.service';

/**
 * Las dos reglas puras de la actividad 9.4 (EFDS-1170).
 *
 * Se prueban aparte y sin base de datos porque son las que deciden si un
 * contrato puede cobrar y si lo cobrado se pasó del valor. La segunda no falla
 * cuando se equivoca: deja pasar en silencio un cobro que excede el contrato.
 */
describe('admitePagos · qué contrato puede recibir cuentas de cobro', () => {
  it('solo el que está en ejecución', () => {
    expect(admitePagos('EJECUCION')).toBe(true);
  });

  it('no basta con estar legalizado: falta el acta de inicio', () => {
    // Es toda la dependencia con EFDS-1167: antes del acta el contrato no ha
    // empezado a correr, así que no hay prestación que cobrar.
    expect(admitePagos('LEGALIZADO')).toBe(false);
  });

  it('rechaza todo lo anterior a la legalización', () => {
    const previos: EstadoContrato[] = ['GENERADO', 'ACEPTADO', 'RECHAZADO', 'PERFECCIONADO'];
    expect(previos.map(admitePagos)).toEqual([false, false, false, false]);
  });

  it('el contrato detenido no cobra, el terminado sí', () => {
    // Mientras está suspendido no hay prestación que cobrar; el que se terminó
    // antes de tiempo sí ejecutó, y eso se paga y se salda en la liquidación.
    expect(admitePagos('SUSPENDIDO')).toBe(false);
    expect(admitePagos('TERMINADO')).toBe(true);
  });
});

describe('cobradoCabeEnElContrato · el aviso por exceso', () => {
  it('no dice nada mientras lo cobrado quepa', () => {
    expect(cobradoCabeEnElContrato(30_000_000, 80_000_000)).toEqual({
      cabe: true,
      advertencia: null,
    });
  });

  it('tampoco cuando lo cobrado agota el contrato exacto', () => {
    // El último pago de un contrato lo deja en cero, y eso es lo normal, no un
    // exceso: avisar ahí volvería ruido el aviso.
    expect(cobradoCabeEnElContrato(80_000_000, 80_000_000).cabe).toBe(true);
  });

  it('avisa y dice de cuánto es el exceso cuando se pasa', () => {
    const resultado = cobradoCabeEnElContrato(85_000_000, 80_000_000);

    expect(resultado.cabe).toBe(false);
    // La cifra va en el mensaje: «se pasó» sin decir de cuánto obliga a sacar
    // la cuenta a mano, que es justo lo que estaba mal.
    expect(resultado.advertencia).toContain('5.000.000');
    expect(resultado.advertencia).toMatch(/adición/i);
  });
});

/**
 * Un contrato de $37 M terminó con $60 M pagados: el aviso no frenaba nada.
 * Radicar, avalar y tramitar se bloquean cuando el pago pasa el contrato.
 */
describe('excedeElContrato · el pago que no cabe se bloquea', () => {
  it('deja pasar lo que cabe, incluido el último peso', () => {
    expect(excedeElContrato(30_000_000, 7_248_000, 37_248_000)).toBeNull();
  });

  it('bloquea el pago que, con lo ya comprometido, pasa el contrato', () => {
    expect(excedeElContrato(30_000_000, 10_000_000, 37_248_000)).toMatch(/tramita primero una adición/);
  });

  it('bloquea un solo pago por encima del contrato', () => {
    expect(excedeElContrato(0, 60_000_000, 37_248_000)).toMatch(/supera el valor del contrato/);
  });
});
