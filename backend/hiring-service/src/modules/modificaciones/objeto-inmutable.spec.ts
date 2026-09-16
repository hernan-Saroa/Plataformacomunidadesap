import { ExecutionContext } from '@nestjs/common';

import { intentoDeModificarObjeto, objetoCambio } from './objeto-inmutable';
import { ObjetoInmutableGuard } from './objeto-inmutable.guard';

/**
 * La regla del objeto — RF-MOD-04 (EFDS-1179).
 *
 * Se prueba sin base de datos y sin Nest porque es una regla de integridad: no
 * falla ruidosamente cuando se equivoca. Dejar pasar un objeto nuevo no rompe
 * nada hoy; rompe el expediente el día en que alguien pregunte qué se contrató.
 */
describe('intentoDeModificarObjeto · lo que no puede entrar en un trámite', () => {
  it('deja pasar una solicitud normal', () => {
    expect(
      intentoDeModificarObjeto({
        diasProrroga: 30,
        justificacion: 'La entrega se retrasó por el invierno en la zona de obra.',
      }),
    ).toBeNull();
  });

  it('impide el objeto e informa la restricción, que es lo que pide la historia', () => {
    const motivo = intentoDeModificarObjeto({
      justificacion: 'Se precisa el alcance del contrato.',
      objeto: 'Otra cosa distinta de la que se contrató',
    });

    expect(motivo).toMatch(/no se modifica/i);
    expect(motivo).toMatch(/RF-MOD-04/);
    // Nombra el campo: un rechazo sin decir cuál deja al gestor probando otra vez.
    expect(motivo).toMatch(/objeto/);
  });

  it('reconoce los nombres con los que llegaría disfrazado', () => {
    for (const campo of ['objetoNuevo', 'nuevoObjeto', 'objetoContrato', 'objetoDelContrato']) {
      expect(intentoDeModificarObjeto({ [campo]: 'Otro objeto' })).toMatch(/RF-MOD-04/);
    }
  });

  it('no distingue mayúsculas: OBJETO es lo mismo que objeto', () => {
    expect(intentoDeModificarObjeto({ OBJETO: 'Otro objeto' })).toMatch(/RF-MOD-04/);
  });

  it('no confunde un campo que solo nombra la palabra', () => {
    // Rechazar una justificación por hablar del objeto sería peor que el
    // problema: es texto legítimo y es de lo que se justifica una modificación.
    expect(
      intentoDeModificarObjeto({
        justificacion: 'Se aclara el objeto del contrato sin cambiarlo.',
        objetoDelActo: 'Aclarar la cláusula tercera',
      }),
    ).toBeNull();
  });

  it('un campo vacío no es un intento de cambiar nada', () => {
    expect(intentoDeModificarObjeto({ objeto: '' })).toBeNull();
    expect(intentoDeModificarObjeto({ objeto: '   ' })).toBeNull();
    expect(intentoDeModificarObjeto({ objeto: null })).toBeNull();
  });

  it('no se cae con un cuerpo que no es un objeto', () => {
    expect(intentoDeModificarObjeto(null)).toBeNull();
    expect(intentoDeModificarObjeto(undefined)).toBeNull();
    expect(intentoDeModificarObjeto('objeto')).toBeNull();
    expect(intentoDeModificarObjeto(['objeto'])).toBeNull();
  });
});

describe('objetoCambio · la foto contra el contrato de hoy', () => {
  it('no dice nada mientras el objeto sea el mismo', () => {
    expect(objetoCambio('Servicios profesionales de apoyo', 'Servicios profesionales de apoyo')).toBe(
      false,
    );
  });

  it('detecta hasta el cambio de una palabra', () => {
    expect(objetoCambio('Servicios profesionales de apoyo', 'Servicios profesionales de obra')).toBe(
      true,
    );
  });

  it('una coma de más también es un cambio', () => {
    // Se comparan tal cual, sin normalizar: «cambiarle una coma» al objeto es
    // exactamente lo que esta regla existe para no dejar pasar inadvertido.
    expect(objetoCambio('Suministro de equipos', 'Suministro de equipos,')).toBe(true);
  });

  it('lo que nunca se congeló no afirma diferencia', () => {
    // Las modificaciones anteriores a EFDS-1179 no guardaron foto; sin ella no
    // hay nada que comparar y no se puede acusar un cambio que no consta.
    expect(objetoCambio(null, 'Suministro de equipos')).toBe(false);
  });
});

describe('ObjetoInmutableGuard · dónde se aplica la regla', () => {
  const contextoCon = (body: unknown) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ body }) }) }) as ExecutionContext;

  const guard = new ObjetoInmutableGuard();

  it('deja pasar el trámite normal', () => {
    expect(guard.canActivate(contextoCon({ justificacion: 'Se prorroga por lluvias.' }))).toBe(true);
  });

  it('rechaza con la restricción, en vez de descartar el campo en silencio', () => {
    // Es toda la razón de que esto sea un guard y no un DTO: con
    // `whitelist: true` la validación borraría el campo y devolvería 201, y el
    // gestor se quedaría creyendo que cambió el objeto.
    expect(() => guard.canActivate(contextoCon({ objeto: 'Otra cosa' }))).toThrow(
      /no se modifica/i,
    );
  });

  it('no se cae cuando la petición no trae cuerpo', () => {
    expect(guard.canActivate(contextoCon(undefined))).toBe(true);
  });
});
