import { PtaService } from './pta.service';
import { ForbiddenException } from '@nestjs/common';

// Cubre el modelo matriz (pregrado|posgrado) × territorial de Docencia
// (migraciones 397/398/399): cada combinación (territorial, nivel) debe
// revisarse/aprobarse de forma independiente. Antes de este cambio:
// - La aprobación ya soportaba partición por territorial, pero mezclaba
//   pregrado y posgrado en una sola fila (PtaTerritorialApproval sin `nivel`).
// - La revisión no soportaba ninguna partición: un revisor con alcance sobre
//   un solo par quedaba bloqueado por completo si el PTA incluía otro par que
//   no le pertenecía (ForbiddenException en revisarComponente).

const SECCIONAL_NOMBRES: Record<string, string> = {
  'ter-A': 'Antioquia',
  'ter-B': 'Bolivar',
};

function makeFakeRepo() {
  const rows: any[] = [];
  let autoId = 0;
  return {
    rows,
    find: jest.fn(async ({ where }: any) => rows.filter(r => r.ptaId === where.ptaId)),
    findOne: jest.fn(async ({ where }: any) => rows.find(r => (
      r.ptaId === where.ptaId
      && (where.territorialId === undefined || r.territorialId === where.territorialId)
      && (where.nivel === undefined || r.nivel === where.nivel)
    )) || null),
    create: jest.fn((data: any) => ({ estado: 'pendiente', ...data })),
    save: jest.fn(async (entity: any) => {
      if (Array.isArray(entity)) {
        return entity.map((e) => saveOne(e));
      }
      return saveOne(entity);
    }),
  };

  function saveOne(entity: any) {
    const existingIdx = rows.findIndex(r => (
      r.ptaId === entity.ptaId && r.territorialId === entity.territorialId && r.nivel === entity.nivel
    ));
    const saved = { id: entity.id || `row-${autoId++}`, ...entity };
    if (existingIdx >= 0) rows[existingIdx] = saved;
    else rows.push(saved);
    return saved;
  }
}

function createService() {
  const service = Object.create(PtaService.prototype) as any;
  service.programaRepo = {
    find: jest.fn().mockResolvedValue([
      { id: 'prog-pre', tipo: 'pregrado' },
      { id: 'prog-pos', tipo: 'maestria' },
    ]),
  };
  service.ptaRepo = {
    manager: {
      query: jest.fn(async (_sql: string, params: any[]) => {
        const ids: string[] = params?.[0] || [];
        return ids.map((id: string) => ({ id, nombre: SECCIONAL_NOMBRES[id] || id }));
      }),
    },
  };
  service.ptaTerritorialApprovalRepo = makeFakeRepo();
  service.ptaTerritorialReviewRepo = makeFakeRepo();
  service.historialRepo = { save: jest.fn(), create: jest.fn((x: any) => x) };
  service.logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
  return service;
}

/** PTA con 3 pares (territorial, nivel): (A,pregrado), (A,posgrado), (B,pregrado). */
function makePtaConTresPares() {
  return {
    datosEstructurados: {
      asignaturas: [
        { territorial_id: 'ter-A', programa_id: 'prog-pre' }, // A + pregrado
        { territorial_id: 'ter-A', programa_id: 'prog-pos' }, // A + posgrado
        { territorial_id: 'ter-B', programa_id: 'prog-pre' }, // B + pregrado
      ],
    },
  } as any;
}

function authCon(opts: {
  territorialIds?: string[];
  allowedNivelesTerritorialAprobar?: string[];
  allowedNivelesTerritorialRevisar?: string[];
  isSuperUser?: boolean;
}) {
  return {
    userId: 'u1',
    name: 'Revisor Uno',
    roles: ['ROL_TEST'],
    isSuperUser: !!opts.isSuperUser,
    territorialIds: opts.territorialIds || [],
    allowedNivelesTerritorialAprobar: opts.allowedNivelesTerritorialAprobar || [],
    allowedNivelesTerritorialRevisar: opts.allowedNivelesTerritorialRevisar || [],
  } as any;
}

describe('PtaService — matriz territorial × nivel de Docencia', () => {
  describe('getTerritorialNivelPairsDelComponente', () => {
    it('separa cada asignatura territorial por su propio nivel (pregrado/posgrado), sin duplicar pares', async () => {
      const service = createService();
      const pares = await service.getTerritorialNivelPairsDelComponente(makePtaConTresPares());
      expect(pares).toEqual([
        { territorialId: 'ter-A', nivel: 'pregrado' },
        { territorialId: 'ter-A', nivel: 'posgrado' },
        { territorialId: 'ter-B', nivel: 'pregrado' },
      ]);
    });
  });

  describe('assertAlcanceTerritorial', () => {
    it('devuelve null si el componente no es academica_territorial', async () => {
      const service = createService();
      const result = await service.assertAlcanceTerritorial('academica_pregrado', makePtaConTresPares(), authCon({}), 'aprobar');
      expect(result).toBeNull();
    });

    it('superusuario recibe todos los pares como propios', async () => {
      const service = createService();
      const result = await service.assertAlcanceTerritorial(
        'academica_territorial', makePtaConTresPares(), authCon({ isSuperUser: true }), 'aprobar',
      );
      expect(result.pares).toHaveLength(3);
      expect(result.propios).toHaveLength(3);
    });

    it('rechaza sin territorial asignada', async () => {
      const service = createService();
      await expect(service.assertAlcanceTerritorial(
        'academica_territorial', makePtaConTresPares(),
        authCon({ allowedNivelesTerritorialAprobar: ['pregrado'] }),
        'aprobar',
      )).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rechaza sin permiso de ningún nivel, aunque tenga la territorial', async () => {
      const service = createService();
      await expect(service.assertAlcanceTerritorial(
        'academica_territorial', makePtaConTresPares(),
        authCon({ territorialIds: ['ter-A'] }),
        'aprobar',
      )).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('un actor de (territorial A, nivel pregrado) solo recibe ESE par como propio, no (A,posgrado) ni (B,pregrado)', async () => {
      const service = createService();
      const result = await service.assertAlcanceTerritorial(
        'academica_territorial', makePtaConTresPares(),
        authCon({ territorialIds: ['ter-A'], allowedNivelesTerritorialAprobar: ['pregrado'] }),
        'aprobar',
      );
      expect(result.pares).toHaveLength(3);
      expect(result.propios).toEqual([{ territorialId: 'ter-A', nivel: 'pregrado' }]);
    });

    it('rechaza si la territorial/nivel del actor no tiene NINGUNA asignatura en este PTA', async () => {
      const service = createService();
      await expect(service.assertAlcanceTerritorial(
        'academica_territorial', makePtaConTresPares(),
        authCon({ territorialIds: ['ter-B'], allowedNivelesTerritorialAprobar: ['posgrado'] }), // B+posgrado no existe en el PTA
        'aprobar',
      )).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('aprobarComponenteTerritorialParcial', () => {
    it('aprobación parcial: un actor de (A, pregrado) solo resuelve esa fila; el resto sigue pendiente y no se consolida', async () => {
      const service = createService();
      const existingPta = { estado: 'Pendiente Jefatura', version: 1, datosEstructurados: makePtaConTresPares().datosEstructurados };
      const auth = authCon({ territorialIds: ['ter-A'], allowedNivelesTerritorialAprobar: ['pregrado'] });
      const alcance = await service.assertAlcanceTerritorial('academica_territorial', existingPta, auth, 'aprobar');

      const resultado = await service.aprobarComponenteTerritorialParcial(
        'pta-1', 'academica_territorial', existingPta, auth, 'aprobado', {}, alcance,
      );

      expect(resultado).toBeDefined(); // parcial: no debe delegar a la lógica ordinaria
      expect(resultado.approval.territorialId).toBe('ter-A');
      expect(resultado.approval.nivel).toBe('pregrado');
      expect(resultado.approval.estado).toBe('aprobado');

      const rows = service.ptaTerritorialApprovalRepo.rows;
      expect(rows.find((r: any) => r.territorialId === 'ter-A' && r.nivel === 'pregrado').estado).toBe('aprobado');
      expect(rows.find((r: any) => r.territorialId === 'ter-A' && r.nivel === 'posgrado')?.estado || 'pendiente').toBe('pendiente');
      expect(rows.find((r: any) => r.territorialId === 'ter-B' && r.nivel === 'pregrado')?.estado || 'pendiente').toBe('pendiente');
    });

    it('cuando el último par pendiente queda aprobado, se delega a la lógica ordinaria (undefined) para consolidar', async () => {
      const service = createService();
      const existingPta = { estado: 'Pendiente Jefatura', version: 1, datosEstructurados: makePtaConTresPares().datosEstructurados };

      // Superusuario aprueba los 3 pares de una vez (simula que ya estaban todos resueltos salvo uno).
      const authSuper = authCon({ isSuperUser: true });
      const alcanceSuper = await service.assertAlcanceTerritorial('academica_territorial', existingPta, authSuper, 'aprobar');
      const resultado = await service.aprobarComponenteTerritorialParcial(
        'pta-1', 'academica_territorial', existingPta, authSuper, 'aprobado', {}, alcanceSuper,
      );

      expect(resultado).toBeUndefined();
      const rows = service.ptaTerritorialApprovalRepo.rows;
      expect(rows.every((r: any) => r.estado === 'aprobado')).toBe(true);
      expect(rows).toHaveLength(3);
    });

    it('la devolución siempre se propaga (undefined) aunque haya 2+ pares, para que el componente vuelva completo al docente', async () => {
      const service = createService();
      const existingPta = { estado: 'Pendiente Jefatura', version: 1, datosEstructurados: makePtaConTresPares().datosEstructurados };
      const auth = authCon({ territorialIds: ['ter-A'], allowedNivelesTerritorialAprobar: ['pregrado'] });
      const alcance = await service.assertAlcanceTerritorial('academica_territorial', existingPta, auth, 'aprobar');

      const resultado = await service.aprobarComponenteTerritorialParcial(
        'pta-1', 'academica_territorial', existingPta, auth, 'devuelto', { comentarios: 'Faltan datos' }, alcance,
      );

      expect(resultado).toBeUndefined();
      // Igual se registra la fila del par devuelto, aunque el resultado se propague.
      const row = service.ptaTerritorialApprovalRepo.rows.find((r: any) => r.territorialId === 'ter-A' && r.nivel === 'pregrado');
      expect(row.estado).toBe('devuelto');
    });
  });

  describe('revisarComponenteTerritorialParcial (fix del bug reportado)', () => {
    it('un revisor de (A, pregrado) puede marcar SU par como revisado sin ser bloqueado por (A,posgrado) ni (B,pregrado)', async () => {
      const service = createService();
      const existingPta = { datosEstructurados: makePtaConTresPares().datosEstructurados };
      const auth = authCon({ territorialIds: ['ter-A'], allowedNivelesTerritorialRevisar: ['pregrado'] });
      const alcance = await service.assertAlcanceTerritorial('academica_territorial', existingPta, auth, 'revisar');

      // Antes de este fix, esto lanzaba ForbiddenException porque el PTA tiene
      // otros pares que el actor no cubre (propios.length < pares.length).
      const resultado = await service.revisarComponenteTerritorialParcial(
        'pta-1', 'academica_territorial', auth, 'revisado', {}, alcance,
      );

      expect(resultado).toBeDefined();
      expect(resultado.review.territorialId).toBe('ter-A');
      expect(resultado.review.nivel).toBe('pregrado');
      expect(resultado.review.estado).toBe('revisado');

      const rows = service.ptaTerritorialReviewRepo.rows;
      expect(rows.find((r: any) => r.territorialId === 'ter-A' && r.nivel === 'pregrado').estado).toBe('revisado');
      expect(rows.find((r: any) => r.territorialId === 'ter-A' && r.nivel === 'posgrado')?.estado || 'pendiente').toBe('pendiente');
      expect(rows.find((r: any) => r.territorialId === 'ter-B' && r.nivel === 'pregrado')?.estado || 'pendiente').toBe('pendiente');
    });

    it('cuando el último par pendiente queda revisado, se delega (undefined) para consolidar la fila única de PtaComponentReview', async () => {
      const service = createService();
      const existingPta = { datosEstructurados: makePtaConTresPares().datosEstructurados };
      const authSuper = authCon({ isSuperUser: true });
      const alcanceSuper = await service.assertAlcanceTerritorial('academica_territorial', existingPta, authSuper, 'revisar');

      const resultado = await service.revisarComponenteTerritorialParcial(
        'pta-1', 'academica_territorial', authSuper, 'revisado', {}, alcanceSuper,
      );

      expect(resultado).toBeUndefined();
      const rows = service.ptaTerritorialReviewRepo.rows;
      expect(rows.every((r: any) => r.estado === 'revisado')).toBe(true);
      expect(rows).toHaveLength(3);
    });

    it('no interviene en devoluciones (siempre undefined): la devolución en Revisión sigue delegando a aprobarComponente', async () => {
      const service = createService();
      const existingPta = { datosEstructurados: makePtaConTresPares().datosEstructurados };
      const auth = authCon({ territorialIds: ['ter-A'], allowedNivelesTerritorialRevisar: ['pregrado'] });
      const alcance = await service.assertAlcanceTerritorial('academica_territorial', existingPta, auth, 'revisar');

      const resultado = await service.revisarComponenteTerritorialParcial(
        'pta-1', 'academica_territorial', auth, 'devuelto', {}, alcance,
      );

      expect(resultado).toBeUndefined();
      expect(service.ptaTerritorialReviewRepo.rows).toHaveLength(0);
    });
  });
});
