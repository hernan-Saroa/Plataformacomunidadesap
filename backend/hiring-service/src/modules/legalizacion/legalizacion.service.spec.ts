import {
  admiteLegalizacion,
  estaLegalizado,
  exigeArl,
  garantiasVigentes,
  pendientesDeLegalizacion,
} from './legalizacion.service';

/**
 * Criterio 1 de EFDS-1164: «dado un contrato suscrito, el contratista carga las
 * pólizas». La legalización solo trabaja sobre un contrato firmado por las dos
 * partes: asegurar una obligación que todavía no existe no cubriría nada.
 */
describe('admiteLegalizacion', () => {
  it('un contrato perfeccionado admite garantías', () => {
    expect(admiteLegalizacion('PERFECCIONADO')).toBe(true);
  });

  it('uno ya legalizado sigue admitiendo cambios', () => {
    // Rechazar una póliza aprobada o reemplazarla ocurre después de legalizar;
    // cerrar la puerta dejaría el contrato sin forma de corregir una cobertura.
    expect(admiteLegalizacion('LEGALIZADO')).toBe(true);
  });

  it('no se legaliza un contrato sin las dos firmas', () => {
    expect(admiteLegalizacion('GENERADO')).toBe(false);
    expect(admiteLegalizacion('ACEPTADO')).toBe(false);
  });

  it('tampoco uno cuya minuta fue rechazada', () => {
    expect(admiteLegalizacion('RECHAZADO')).toBe(false);
  });
});

/**
 * Criterio 2: «dado un contratista persona natural, el sistema exige el
 * registro de ARL». Se deriva del tipo de persona guardado al contratar, no de
 * una casilla: la exigencia no puede depender de que alguien la active.
 */
describe('exigeArl', () => {
  it('la exige a la persona natural', () => {
    expect(exigeArl('NATURAL')).toBe(true);
  });

  it('no la exige a la persona jurídica', () => {
    expect(exigeArl('JURIDICA')).toBe(false);
  });
});

/**
 * El contrato queda legalizado con todas las garantías aprobadas y la ARL
 * registrada cuando aplica. Lo deriva el servicio; no lo declara nadie.
 */
describe('estaLegalizado', () => {
  const base = { totalGarantias: 2, garantiasAprobadas: 2, requiereArl: false, arlRegistrada: false };

  it('con todas las pólizas aprobadas y sin ARL exigida, legalizado', () => {
    expect(estaLegalizado(base)).toBe(true);
  });

  it('sin ninguna garantía no hay legalización', () => {
    // `every` sobre lista vacía da true: sin esta guarda, un contrato sin
    // ninguna póliza se daría por legalizado. Mismo defecto que se corrigió en
    // el cierre de actividades de EFDS-1149.
    expect(
      estaLegalizado({ ...base, totalGarantias: 0, garantiasAprobadas: 0 }),
    ).toBe(false);
  });

  it('una póliza cargada sin revisar deja la legalización incompleta', () => {
    expect(estaLegalizado({ ...base, garantiasAprobadas: 1 })).toBe(false);
  });

  it('a la persona natural le falta la ARL aunque las pólizas estén aprobadas', () => {
    expect(estaLegalizado({ ...base, requiereArl: true })).toBe(false);
  });

  it('persona natural con pólizas aprobadas y ARL registrada, legalizado', () => {
    expect(estaLegalizado({ ...base, requiereArl: true, arlRegistrada: true })).toBe(true);
  });
});

/**
 * Qué falta, dicho en palabras. La pantalla muestra esta lista: un contrato «no
 * legalizado» sin explicación dejaría al gestor adivinando.
 */
describe('pendientesDeLegalizacion', () => {
  it('sin garantías pide constituirlas', () => {
    const faltan = pendientesDeLegalizacion({
      totalGarantias: 0,
      garantiasAprobadas: 0,
      requiereArl: false,
      arlRegistrada: false,
    });

    expect(faltan).toEqual(['Falta constituir las garantías del contrato']);
  });

  it('cuenta las pólizas pendientes de aprobar', () => {
    const faltan = pendientesDeLegalizacion({
      totalGarantias: 3,
      garantiasAprobadas: 1,
      requiereArl: false,
      arlRegistrada: false,
    });

    expect(faltan).toEqual(['Faltan por aprobar 2 pólizas']);
  });

  it('en singular cuando es una sola', () => {
    const faltan = pendientesDeLegalizacion({
      totalGarantias: 2,
      garantiasAprobadas: 1,
      requiereArl: false,
      arlRegistrada: false,
    });

    expect(faltan).toEqual(['Falta aprobar una póliza']);
  });

  it('suma la ARL cuando el contratista es persona natural', () => {
    const faltan = pendientesDeLegalizacion({
      totalGarantias: 1,
      garantiasAprobadas: 0,
      requiereArl: true,
      arlRegistrada: false,
    });

    expect(faltan).toHaveLength(2);
    expect(faltan[1]).toContain('ARL');
  });

  it('con todo en orden no falta nada', () => {
    const faltan = pendientesDeLegalizacion({
      totalGarantias: 1,
      garantiasAprobadas: 1,
      requiereArl: true,
      arlRegistrada: true,
    });

    expect(faltan).toEqual([]);
  });
});

/**
 * Una póliza devuelta es historia del expediente, no una obligación pendiente.
 *
 * Si contara para el total, un solo rechazo bloquearía la legalización para
 * siempre: RECHAZADA es final y la corrección llega como póliza nueva.
 */
describe('garantiasVigentes', () => {
  const cargada = { estado: 'CARGADA' };
  const aprobada = { estado: 'APROBADA' };
  const rechazada = { estado: 'RECHAZADA' };

  it('excluye las rechazadas del conteo', () => {
    expect(garantiasVigentes([aprobada, rechazada, cargada])).toEqual([aprobada, cargada]);
  });

  it('un contrato con la corregida aprobada y la vieja rechazada queda legalizado', () => {
    const vigentes = garantiasVigentes([aprobada, rechazada]);

    expect(
      estaLegalizado({
        totalGarantias: vigentes.length,
        garantiasAprobadas: vigentes.filter((g) => g.estado === 'APROBADA').length,
        requiereArl: false,
        arlRegistrada: false,
      }),
    ).toBe(true);
  });

  it('solo rechazadas equivale a no tener garantías', () => {
    const vigentes = garantiasVigentes([rechazada]);

    expect(
      estaLegalizado({
        totalGarantias: vigentes.length,
        garantiasAprobadas: 0,
        requiereArl: false,
        arlRegistrada: false,
      }),
    ).toBe(false);
  });
});
