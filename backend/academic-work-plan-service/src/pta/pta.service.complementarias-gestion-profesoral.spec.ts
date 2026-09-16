import { PtaService } from './pta.service';

/**
 * EFDS-1353 dejó 'gestion_profesoral' como TIPO DE APROBACIÓN POR DEFECTO de toda
 * actividad complementaria del catálogo, pero su componente
 * ('complementarias_gestion_profesoral') no quedó declarado en la lista que
 * gobierna el flujo de revisión/aprobación por componente. Consecuencia: el PTA
 * más común —complementarias tomadas del catálogo, sin nivel ni Decanatura— se
 * quedaba trabado en "En revisión" porque nunca se materializaba su fila de
 * revisión, y revisar o aprobar ese componente fallaba con
 * "Componente PTA no soportado" incluso para un superadmin.
 */
describe('PtaService - Complementarias de Gestión Profesoral en el flujo de revisión', () => {
  const COMPLEMENTARIA_GP = { actividad_id: 'ACT_GP', horas: 43, seccion: 'complementarias_docencia' };

  function createService(complementarias: any[] = [COMPLEMENTARIA_GP]) {
    const service = Object.create(PtaService.prototype) as any;
    service.ptaRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 'pta-1',
        datosEstructurados: { complementarias },
      }),
    };
    service.ptaComponentReviewRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn((row: any) => ({ ...row })),
      save: jest.fn(async (rows: any) => rows),
    };
    // El catálogo no declara ámbito: normalizeTipoAprobacionComplementaria lo
    // resuelve como 'gestion_profesoral' (default).
    service.getCatalogoActividadesComplementarias = jest.fn().mockResolvedValue([{ id: 'ACT_GP' }]);
    service.getCatalogoActividadesAcademicoAdmin = jest.fn().mockResolvedValue([]);
    service.getExtMultiplicadores = jest.fn().mockResolvedValue({ capacitacion: 2 });
    return service;
  }

  it('materializa la fila de revisión del componente de Gestión Profesoral', async () => {
    const service = createService();

    const filas = await service.getComponentesRevision('pta-1');

    expect(filas).toEqual(expect.arrayContaining([
      expect.objectContaining({
        componente: 'complementarias_gestion_profesoral',
        subseccion: 'docencia',
        estado: 'pendiente',
      }),
    ]));
    // El catch-all no tiene contenido: no debe generar una revisión fantasma.
    expect(filas.some((f: any) => f.componente === 'complementarias')).toBe(false);
  });

  it('separa la subsección académico-administrativa dentro del mismo ámbito', async () => {
    const service = createService([
      COMPLEMENTARIA_GP,
      { actividad_id: 'ACT_GP', horas: 10, seccion: 'academico_administrativas' },
    ]);

    const filas = await service.getComponentesRevision('pta-1');
    const delAmbito = filas
      .filter((f: any) => f.componente === 'complementarias_gestion_profesoral')
      .map((f: any) => f.subseccion)
      .sort();

    expect(delAmbito).toEqual(['academico_administrativas', 'docencia']);
  });

  // Cierre del flujo: con la fila de revisión ya materializada, marcarla como
  // revisada debe levantar el candado estructural que impide aprobar. Antes no
  // había forma de llegar aquí: la fila no existía y la llamada ni siquiera
  // pasaba la validación de componente.
  it('marcar la revisión como revisada levanta el candado de aprobación', async () => {
    const service = createService();
    const reviews: any[] = [];
    service.ptaComponentReviewRepo = {
      find: jest.fn(async ({ where }: any) => reviews.filter(r =>
        r.componente === where.componente && (!where.subseccion || r.subseccion === where.subseccion))),
      findOne: jest.fn(async ({ where }: any) => reviews.find(r =>
        r.componente === where.componente && r.subseccion === where.subseccion) || null),
      create: jest.fn((row: any) => ({ ...row })),
      save: jest.fn(async (row: any) => {
        const filas = Array.isArray(row) ? row : [row];
        for (const f of filas) {
          const previa = reviews.find(r => r.componente === f.componente && r.subseccion === f.subseccion);
          if (previa) Object.assign(previa, f); else reviews.push(f);
        }
        return row;
      }),
    };
    service.ptaComponentApprovalRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((row: any) => ({ ...row })),
      save: jest.fn(async (row: any) => row),
    };
    service.ptaRepo.findOne = jest.fn().mockResolvedValue({
      id: 'pta-1', estado: 'Pendiente Jefatura', version: 1,
      datosEstructurados: { complementarias: [COMPLEMENTARIA_GP] },
    });
    service.historialRepo = { create: jest.fn((row: any) => row), save: jest.fn(async (row: any) => row) };
    service.logEvento = jest.fn().mockResolvedValue(undefined);
    service.logger = { warn: jest.fn(), log: jest.fn(), error: jest.fn(), debug: jest.fn() };
    service.notificaciones = { notificarDecisionComponente: jest.fn(), notificarCambioEstado: jest.fn() };

    const auth: any = {
      userId: 'u-super', name: 'Super Admin', roles: ['SUPER_ADMIN'], isSuperUser: true,
      approvesAll: true, reviewsAll: true, permissions: new Set<string>(),
      allowedComponents: ['complementarias_gestion_profesoral'], allowedReviewSubsecciones: [],
    };
    const revisionPendiente = /tiene revisión\(es\) pendiente\(s\)/;
    const mensajeDeError = async (fn: () => Promise<unknown>): Promise<string> => {
      try { await fn(); return ''; } catch (err: any) { return String(err?.message || err); }
    };

    // Materializa la fila (lo que hace el detalle al abrirse) y confirma que el
    // candado de revisión está activo.
    await service.getComponentesRevision('pta-1');
    const bloqueado = await mensajeDeError(() => service.aprobarComponente('pta-1', {
      componente: 'complementarias_gestion_profesoral', estado: 'aprobado',
    }, auth));
    expect(bloqueado).toMatch(revisionPendiente);

    await service.revisarComponente('pta-1', {
      componente: 'complementarias_gestion_profesoral', subseccion: 'docencia', estado: 'revisado',
    }, auth);
    expect(reviews.find(r => r.componente === 'complementarias_gestion_profesoral')?.estado).toBe('revisado');

    // Y con la revisión resuelta, la aprobación se completa de punta a punta.
    const resultado = await service.aprobarComponente('pta-1', {
      componente: 'complementarias_gestion_profesoral', estado: 'aprobado',
    }, auth);
    expect(resultado.approval).toEqual(expect.objectContaining({
      componente: 'complementarias_gestion_profesoral',
      estado: 'aprobado',
      aprobadorNombre: 'Super Admin',
    }));
  });

  it('acepta revisar y aprobar el componente de Gestión Profesoral', async () => {
    const service = createService();

    // Solo interesa que la validación de componente ya no lo rechace: la llamada
    // se deja fallar en el siguiente control (sin `auth`) para no montar aquí
    // todo el flujo de decisión.
    const mensajeDeError = async (fn: () => Promise<unknown>): Promise<string> => {
      try {
        await fn();
        return '';
      } catch (err: any) {
        return String(err?.message || err);
      }
    };

    const revision = await mensajeDeError(() => service.revisarComponente('pta-1', {
      componente: 'complementarias_gestion_profesoral', subseccion: 'docencia', estado: 'revisado',
    }));
    expect(revision).not.toMatch(/Componente PTA no soportado/);
    expect(revision).toMatch(/No autenticado/);

    const aprobacion = await mensajeDeError(() => service.aprobarComponente('pta-1', {
      componente: 'complementarias_gestion_profesoral', estado: 'aprobado',
    }));
    expect(aprobacion).not.toMatch(/Componente PTA no soportado/);
    expect(aprobacion).toMatch(/No autenticado/);
  });
});
