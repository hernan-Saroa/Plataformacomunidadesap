import { PtaService } from './pta.service';

/**
 * Docencia Territorial: cada combinación (territorial, nivel) es una unidad
 * independiente — un PTA con N territoriales puede tener hasta 2N. Aprobar una
 * no puede bloquear ni resolver las demás.
 *
 * Regresión concreta reportada: con Risaralda y Chocó en el mismo PTA, aprobar
 * la segunda devolvía 400 "Chocó ya fue(ron) aprobada(s). No se puede volver a
 * aprobar." porque el frontend pedía "decide sobre TODOS mis pares" en vez de
 * indicar el par concreto.
 */
describe('PtaService - pares (territorial, nivel) independientes', () => {
  const PTA_ID = 'pta-1';
  const RISARALDA = '900017';
  const CHOCO = '900020';

  const authAprobador = {
    userId: 'user-1',
    name: 'Aprobador',
    email: 'aprobador@esap.edu.co',
    roles: ['JEFATURA_TERRITORIAL'],
    isSuperUser: false,
    approvesAll: false,
    permissions: new Set<string>(),
    allowedComponents: [],
    approvalLevels: [1],
    territorialIds: [RISARALDA, CHOCO],
  } as any;

  // Estado en memoria de PtaTerritorialApproval para el PTA.
  const montarServicio = (filas: any[]) => {
    const service = Object.create(PtaService.prototype) as any;
    service.ensureTerritorialApprovalRows = jest.fn().mockResolvedValue(filas);
    service.ptaTerritorialApprovalRepo = {
      create: jest.fn((v: any) => v),
      save: jest.fn((v: any) => Promise.resolve(v)),
    };
    service.resolveNombresSeccionales = jest.fn().mockResolvedValue(['Chocó']);
    service.historialRepo = {
      create: jest.fn((v: any) => v),
      save: jest.fn((v: any) => Promise.resolve(v)),
    };
    service.logEvento = jest.fn().mockResolvedValue(undefined);
    service.logger = { log: jest.fn(), warn: jest.fn() };
    return service;
  };

  const alcance = {
    pares: [
      { territorialId: RISARALDA, nivel: 'pregrado' },
      { territorialId: CHOCO, nivel: 'pregrado' },
    ],
    propios: [
      { territorialId: RISARALDA, nivel: 'pregrado' },
      { territorialId: CHOCO, nivel: 'pregrado' },
    ],
  } as any;

  it('aprueba solo el par indicado y deja los demás intactos', async () => {
    const filas = [
      { territorialId: RISARALDA, nivel: 'pregrado', estado: 'pendiente' },
      { territorialId: CHOCO, nivel: 'pregrado', estado: 'pendiente' },
    ];
    const service = montarServicio(filas);

    await service.aprobarComponenteTerritorialParcial(
      PTA_ID,
      'academica_territorial',
      { id: PTA_ID } as any,
      authAprobador,
      'aprobado',
      { territorialId: CHOCO, nivel: 'pregrado' },
      alcance,
    );

    const guardadas = service.ptaTerritorialApprovalRepo.save.mock.calls.map((c: any[]) => c[0]);
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0]).toMatchObject({ territorialId: CHOCO, nivel: 'pregrado', estado: 'aprobado' });
    // Risaralda no se tocó.
    expect(guardadas.some((g: any) => g.territorialId === RISARALDA)).toBe(false);
  });

  it('aprobar el par que falta no falla porque el otro ya esté aprobado', async () => {
    const filas = [
      { territorialId: CHOCO, nivel: 'pregrado', estado: 'aprobado' },
      { territorialId: RISARALDA, nivel: 'pregrado', estado: 'pendiente' },
    ];
    const service = montarServicio(filas);

    await expect(service.aprobarComponenteTerritorialParcial(
      PTA_ID,
      'academica_territorial',
      { id: PTA_ID } as any,
      authAprobador,
      'aprobado',
      { territorialId: RISARALDA, nivel: 'pregrado' },
      alcance,
    )).resolves.toBeUndefined(); // todas aprobadas -> consolida

    const guardadas = service.ptaTerritorialApprovalRepo.save.mock.calls.map((c: any[]) => c[0]);
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0]).toMatchObject({ territorialId: RISARALDA, estado: 'aprobado' });
  });

  it('rechaza reintentar el mismo par ya aprobado', async () => {
    const filas = [
      { territorialId: CHOCO, nivel: 'pregrado', estado: 'aprobado' },
      { territorialId: RISARALDA, nivel: 'pregrado', estado: 'pendiente' },
    ];
    const service = montarServicio(filas);

    await expect(service.aprobarComponenteTerritorialParcial(
      PTA_ID,
      'academica_territorial',
      { id: PTA_ID } as any,
      authAprobador,
      'aprobado',
      { territorialId: CHOCO, nivel: 'pregrado' },
      alcance,
    )).rejects.toThrow(/ya fue\(ron\) aprobada\(s\)/i);
  });

  it('pregrado y posgrado de la MISMA territorial son unidades distintas', async () => {
    const filas = [
      { territorialId: CHOCO, nivel: 'pregrado', estado: 'aprobado' },
      { territorialId: CHOCO, nivel: 'posgrado', estado: 'pendiente' },
    ];
    const service = montarServicio(filas);
    const alcanceMismoTerritorio = {
      pares: [
        { territorialId: CHOCO, nivel: 'pregrado' },
        { territorialId: CHOCO, nivel: 'posgrado' },
      ],
      propios: [
        { territorialId: CHOCO, nivel: 'pregrado' },
        { territorialId: CHOCO, nivel: 'posgrado' },
      ],
    } as any;

    await service.aprobarComponenteTerritorialParcial(
      PTA_ID,
      'academica_territorial',
      { id: PTA_ID } as any,
      authAprobador,
      'aprobado',
      { territorialId: CHOCO, nivel: 'posgrado' },
      alcanceMismoTerritorio,
    );

    const guardadas = service.ptaTerritorialApprovalRepo.save.mock.calls.map((c: any[]) => c[0]);
    expect(guardadas).toHaveLength(1);
    expect(guardadas[0]).toMatchObject({ nivel: 'posgrado', estado: 'aprobado' });
  });
});
