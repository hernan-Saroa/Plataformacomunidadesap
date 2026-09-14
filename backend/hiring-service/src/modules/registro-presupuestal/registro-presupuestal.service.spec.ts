import { admiteRp, cubreElContrato, puedeTransicionar } from './registro-presupuestal.service';
import { EstadoRp } from '../../entities/registro-presupuestal.entity';

/**
 * Criterio de EFDS-1163: «dado un contrato suscrito, cuando se gestiona el RP,
 * el sistema registra el compromiso presupuestal».
 *
 * El RP compromete recursos con alguien concreto, así que no se puede expedir
 * sobre un contrato que las partes todavía no han firmado: no habría con quién
 * comprometerlos.
 */
describe('admiteRp', () => {
  it('un contrato perfeccionado admite RP', () => {
    expect(admiteRp('PERFECCIONADO')).toBe(true);
  });

  it('uno ya legalizado también', () => {
    // Legalizado se alcanza desde perfeccionado: el contrato sigue suscrito.
    expect(admiteRp('LEGALIZADO')).toBe(true);
  });

  it('no se compromete gasto antes de las firmas', () => {
    expect(admiteRp('GENERADO')).toBe(false);
    expect(admiteRp('ACEPTADO')).toBe(false);
  });

  it('tampoco sobre una minuta rechazada', () => {
    expect(admiteRp('RECHAZADO')).toBe(false);
  });
});

/**
 * El orden del ciclo es la garantía de que un RP no se dé por expedido sin que
 * la Financiera haya verificado la disponibilidad. Mismo criterio que el CDP.
 */
describe('puedeTransicionar', () => {
  it('sigue el camino normal del ciclo', () => {
    expect(puedeTransicionar('SOLICITADO', 'VERIFICADO')).toBe(true);
    expect(puedeTransicionar('VERIFICADO', 'EXPEDIDO')).toBe(true);
  });

  it('no deja expedir sin verificar antes', () => {
    // El salto que más tienta: la Financiera ya tiene el número y quiere
    // registrarlo de una. Verificar es lo que certifica que hay recursos.
    expect(puedeTransicionar('SOLICITADO', 'EXPEDIDO')).toBe(false);
  });

  it('permite rechazar mientras no esté expedido', () => {
    expect(puedeTransicionar('SOLICITADO', 'RECHAZADO')).toBe(true);
    expect(puedeTransicionar('VERIFICADO', 'RECHAZADO')).toBe(true);
  });

  it('no rechaza lo ya expedido: eso se anula', () => {
    // Rechazar un RP expedido borraría el hecho de que se comprometió el gasto.
    expect(puedeTransicionar('EXPEDIDO', 'RECHAZADO')).toBe(false);
    expect(puedeTransicionar('EXPEDIDO', 'ANULADO')).toBe(true);
  });

  it('no revive un RP cerrado', () => {
    for (const cerrado of ['RECHAZADO', 'ANULADO'] as EstadoRp[]) {
      for (const destino of ['SOLICITADO', 'VERIFICADO', 'EXPEDIDO'] as EstadoRp[]) {
        expect(puedeTransicionar(cerrado, destino)).toBe(false);
      }
    }
  });
});

/**
 * Un RP por debajo del valor del contrato no alcanza a comprometerlo entero.
 *
 * Se advierte en vez de bloquear: un contrato puede comprometerse por partes
 * —en vigencias distintas, con adiciones— y esa decisión es de la Dirección
 * Financiera, no del sistema.
 */
describe('cubreElContrato', () => {
  it('cubre cuando iguala el valor', () => {
    expect(cubreElContrato(48000000, 48000000)).toBe(true);
  });

  it('cubre cuando lo supera', () => {
    expect(cubreElContrato(50000000, 48000000)).toBe(true);
  });

  it('no cubre cuando se queda corto', () => {
    expect(cubreElContrato(30000000, 48000000)).toBe(false);
  });

  it('un RP sin valor no cubre nada', () => {
    // Mientras está solicitado el valor puede venir nulo.
    expect(cubreElContrato(null, 48000000)).toBe(false);
  });
});
