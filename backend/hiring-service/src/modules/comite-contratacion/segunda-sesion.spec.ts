import {
  cambiaronTrasElProyecto,
  estadoTrasLaSegundaSesion,
  limiteDelActa,
  motivoParaNoRegistrarLaSesion,
  numeralDeLaSumision,
  requisitoDeLaSegundaSesion,
} from './segunda-sesion';
import { AprobacionService } from '../aprobacion/aprobacion.service';
import { SegundaSesionService } from './segunda-sesion.service';

/**
 * Pliego definitivo y segunda sesión del Comité — actividad 5.6.1 (113).
 *
 * En licitación pública el proceso va dos veces al comité: la 3.7 y, ya con el
 * pliego definitivo, la 5.6.1. La segunda repite la cadena estructurador →
 * revisor → directora, exige el CDP y no la frena el acta.
 */
describe('requisitoDeLaSegundaSesion · lo que la apertura le pregunta a la 5.6.1', () => {
  it('donde la modalidad no la recorre, no exige nada', () => {
    expect(requisitoDeLaSegundaSesion('NO_APLICA', []).cumplido).toBe(true);
    expect(requisitoDeLaSegundaSesion(null, []).cumplido).toBe(true);
  });

  it('sin sesión, la apertura espera aunque la cadena ya haya aprobado', () => {
    const r = requisitoDeLaSegundaSesion('APROBADO', []);
    expect(r.cumplido).toBe(false);
    expect(r.motivo).toMatch(/registrar lo que decidió el comité/);
  });

  it('sin la cadena, dice que el pliego definitivo todavía no pasa por revisión', () => {
    expect(requisitoDeLaSegundaSesion('BORRADOR', []).motivo).toMatch(/abogado revisor/);
  });

  it('aprobada, con o sin condiciones, deja abrir', () => {
    expect(requisitoDeLaSegundaSesion('APROBADO', [{ decision: 'APROBADO' }]).cumplido).toBe(true);
    expect(
      requisitoDeLaSegundaSesion('APROBADO', [{ decision: 'APROBADO_CON_CONDICIONES' }]).cumplido,
    ).toBe(true);
  });

  it('manda la última sesión: una aprobación vieja no avala una observación nueva', () => {
    const r = requisitoDeLaSegundaSesion('DEVUELTO', [{ decision: 'OBSERVADO' }, { decision: 'APROBADO' }]);
    expect(r.cumplido).toBe(false);
  });
});

describe('motivoParaNoRegistrarLaSesion', () => {
  it('el comité ve lo que el revisor y la directora ya aprobaron', () => {
    expect(motivoParaNoRegistrarLaSesion('BORRADOR', null)).toMatch(/abogado revisor/);
    expect(motivoParaNoRegistrarLaSesion('EN_REVISION', null)).toMatch(/abogado revisor/);
    expect(motivoParaNoRegistrarLaSesion('APROBADO', null)).toBeNull();
  });

  it('observado y vuelto a aprobar por la cadena, se registra otra sesión', () => {
    expect(motivoParaNoRegistrarLaSesion('APROBADO', 'OBSERVADO')).toBeNull();
  });

  it('después de aprobar o rechazar no hay otra sesión', () => {
    expect(motivoParaNoRegistrarLaSesion('APROBADO', 'APROBADO')).toMatch(/apertura/);
    expect(motivoParaNoRegistrarLaSesion('NEGADO', 'RECHAZADO')).toMatch(/rechazó/);
  });
});

describe('estadoTrasLaSegundaSesion', () => {
  it('observar devuelve la 5.6.1 para que la cadena empiece otra vez', () => {
    expect(estadoTrasLaSegundaSesion('OBSERVADO')).toBe('DEVUELTO');
  });
  it('rechazar la niega; aprobar la deja aprobada', () => {
    expect(estadoTrasLaSegundaSesion('RECHAZADO')).toBe('NEGADO');
    expect(estadoTrasLaSegundaSesion('APROBADO_CON_CONDICIONES')).toBe('APROBADO');
  });
});

describe('el acta y las versiones', () => {
  it('el plazo del acta se cuenta en días calendario desde la sesión', () => {
    expect(limiteDelActa('2026-10-16', 10)).toBe('2026-10-26');
    expect(limiteDelActa('2026-12-28', 10)).toBe('2027-01-07');
  });

  it('cada sumisión tiene su actividad', () => {
    expect(numeralDeLaSumision(1)).toBe('3.7');
    expect(numeralDeLaSumision(2)).toBe('5.6.1');
  });

  it('solo es versión definitiva nueva lo cargado después de publicar el proyecto', () => {
    const publicado = '2026-10-01T15:00:00.000Z';
    expect(cambiaronTrasElProyecto('2026-10-10T10:00:00.000Z', publicado)).toBe(true);
    expect(cambiaronTrasElProyecto('2026-09-20T10:00:00.000Z', publicado)).toBe(false);
    expect(cambiaronTrasElProyecto('2026-10-10T10:00:00.000Z', null)).toBe(false);
  });
});

describe('SegundaSesionService · el CDP es condición de la cadena', () => {
  const montar = (puedeAbrirse: boolean) => {
    const aprobacion = { registrarCondicion: jest.fn() } as unknown as AprobacionService;
    const cdp = {
      estadoRespaldo: jest.fn().mockResolvedValue({
        puedeAbrirse,
        motivo: puedeAbrirse ? null : 'El proceso todavía no tiene CDP',
      }),
    };
    const servicio = new SegundaSesionService(
      {} as any,
      {} as any,
      cdp as any,
      aprobacion,
      {} as any,
      {} as any,
      {} as any,
    );
    servicio.onModuleInit();
    const [numeral, condicion] = (aprobacion.registrarCondicion as jest.Mock).mock.calls[0];
    return { numeral, condicion };
  };

  it('se registra para la 5.6.1', () => {
    expect(montar(true).numeral).toBe('5.6.1');
  });

  it('sin CDP cargado no se envía a revisión', async () => {
    const { condicion } = montar(false);
    await expect(condicion({}, 'p-1', 'ENVIAR')).rejects.toThrow(/no se envía a revisión/);
  });

  it('sin CDP cargado tampoco se aprueba', async () => {
    const { condicion } = montar(false);
    await expect(condicion({}, 'p-1', 'APROBAR')).rejects.toThrow(/no se aprueba/);
  });

  it('con el CDP cargado pasa', async () => {
    const { condicion } = montar(true);
    await expect(condicion({}, 'p-1', 'ENVIAR')).resolves.toBeUndefined();
  });
});
