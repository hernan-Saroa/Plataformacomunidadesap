import { PtaService } from './pta.service';

/**
 * EFDS-1535: el aprobador territorial no lograba completar la aprobación.
 *
 * assertAlcanceTerritorial cruzaba la territorial del usuario
 * (auth.personas.id_seccional) contra la de la asignatura (territorial_id) con un
 * Set.has() sobre la cadena cruda. Esas dos representaciones no siempre coinciden
 * (espaciado, tipo, o incluso el nombre en vez del id), asi que un aprobador
 * legitimo podia no cruzar con NINGUN par y recibir un 403.
 */
describe('PtaService - alcance territorial tolerante (EFDS-1535)', () => {
  const CHOCO = '900020';

  const montarServicio = (
    pares: Array<{ territorialId: string; nivel: string }>,
    nombresPorId: Record<string, string> = {},
  ) => {
    const service = Object.create(PtaService.prototype) as any;
    service.getTerritorialNivelPairsDelComponente = jest.fn().mockResolvedValue(pares);
    service.resolveNombrePorSeccionalId = jest.fn().mockResolvedValue(
      new Map(Object.entries(nombresPorId)),
    );
    service.resolveNombresSeccionales = jest.fn().mockResolvedValue(['Chocó']);
    return service;
  };

  const auth = (territorialIds: string[]) => ({
    isSuperUser: false,
    territorialIds,
    allowedNivelesTerritorialAprobar: ['pregrado'],
    allowedNivelesTerritorialRevisar: ['pregrado'],
  }) as any;

  const llamar = (service: any, authUser: any) => service.assertAlcanceTerritorial(
    'academica_territorial',
    { id: 'pta-1' } as any,
    authUser,
    'aprobar',
  );

  it('reconoce la territorial propia aunque el id llegue con espacios', async () => {
    const service = montarServicio([{ territorialId: CHOCO, nivel: 'pregrado' }]);

    const res = await llamar(service, auth([` ${CHOCO} `]));

    expect(res.propios).toHaveLength(1);
    expect(res.propios[0]).toMatchObject({ territorialId: CHOCO, nivel: 'pregrado' });
  });

  // Caso real: la persona tiene registrada la seccional por nombre y la asignatura
  // por id (o al reves). Antes no cruzaban y la aprobacion quedaba bloqueada.
  it('reconoce la territorial propia cuando una parte viene por nombre', async () => {
    const service = montarServicio(
      [{ territorialId: CHOCO, nivel: 'pregrado' }],
      { [CHOCO]: 'CHOCÓ' },
    );

    const res = await llamar(service, auth(['choco']));

    expect(res.propios).toHaveLength(1);
  });

  it('sigue rechazando una territorial ajena', async () => {
    const service = montarServicio(
      [{ territorialId: CHOCO, nivel: 'pregrado' }],
      { [CHOCO]: 'CHOCÓ' },
    );

    await expect(llamar(service, auth(['900014']))).rejects.toThrow(/su propia territorial/i);
  });

  it('permite cualquier territorial si Personas no especifica una asignación', async () => {
    const service = montarServicio([{ territorialId: CHOCO, nivel: 'pregrado' }]);

    expect((await llamar(service, auth([]))).propios).toEqual([{ territorialId: CHOCO, nivel: 'pregrado' }]);
  });

  it('sigue rechazando el nivel no autorizado', async () => {
    const service = montarServicio([{ territorialId: CHOCO, nivel: 'posgrado' }]);

    await expect(llamar(service, auth([CHOCO]))).rejects.toThrow(/su propia territorial y nivel/i);
  });

  it('un permiso Global no permite aprobar Tolima si Personas asigna Meta', async () => {
    const service = montarServicio([{ territorialId: 'Tolima', nivel: 'pregrado' }]);
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({ id: 'pta-1' }) };
    const actor = {
      ...auth(['Meta']),
      userId: 'aprobador-meta',
      allowedComponents: ['academica_territorial'],
      territorialDecisionGrants: {
        aprobar: [{ nivel: 'pregrado', territorial: 'todas' }],
        revisar: [],
      },
    };
    await expect(service.aprobarComponente('pta-1', {
      componente: 'academica_territorial', estado: 'aprobado', territorialId: 'Tolima',
    }, actor)).rejects.toThrow(/territorial/i);
    expect(service.ptaRepo.findOne).toHaveBeenCalledTimes(1);
  });

  it('también bloquea decisiones de Docencia por nivel cuando la actividad declara otra territorial', async () => {
    const service = montarServicio([]);
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({
      id: 'pta-1', datosEstructurados: { asignaturas: [{ territorial_id: 'Tolima' }] },
    }) };
    service.clasificarAsignaturasDocencia = jest.fn().mockResolvedValue({
      academica_pregrado: [{ territorial_id: 'Tolima' }],
      academica_posgrado: [], academica_territorial: [],
    });
    const actor = { ...auth(['Meta']), userId: 'aprobador-meta', allowedComponents: ['academica_pregrado'] };
    await expect(service.aprobarComponente('pta-1', {
      componente: 'academica_pregrado', estado: 'aprobado',
    }, actor)).rejects.toThrow(/alcance territorial/i);
  });

  it.each(['Aprobado', 'APROBADO', ' aprobado '])('la ruta heredada de estado no acepta aprobar un PTA ajeno con estado %j', async estado => {
    const service = montarServicio([{ territorialId: 'Tolima', nivel: 'pregrado' }]);
    service.ptaRepo = { findOne: jest.fn().mockResolvedValue({
      id: 'pta-1', estado: 'Pendiente Jefatura', datosEstructurados: {},
    }) };
    service.solicitudRepo = { findOne: jest.fn().mockResolvedValue(null) };
    const actor = {
      ...auth(['Meta']), userId: 'aprobador-meta', approvesAll: true,
      territorialDecisionGrants: {
        aprobar: [{ nivel: 'pregrado', territorial: 'todas' }], revisar: [],
      },
    };
    await expect(service.updatePTAStatus('pta-1', { estado }, actor))
      .rejects.toThrow(/territorial/i);
  });
});
