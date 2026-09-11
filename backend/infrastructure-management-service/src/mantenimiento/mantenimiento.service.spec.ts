import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { MantenimientoService } from './mantenimiento.service';

function servicio({
  mantenimientoRepo = { count: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn(), findOne: jest.fn() } as any,
  sedeRepo = { findOne: jest.fn() } as any,
  catalogoRepo = { find: jest.fn() } as any,
  evidenciaRepo = { findBy: jest.fn(), save: jest.fn(), create: jest.fn(), find: jest.fn() } as any,
  storage = { subirArchivo: jest.fn(), regenerarUrlPresigned: jest.fn() } as any,
} = {}) {
  return new MantenimientoService(
    mantenimientoRepo,
    sedeRepo,
    catalogoRepo,
    evidenciaRepo,
    storage,
  );
}

const sedeValida = {
  idSede: 'sede-central-uuid',
  nombre: 'Sede Central - Bogotá D.C.',
  isActivo: true,
  alcanceUmi: true,
};

const userValido = {
  userId: '746a3a75-5265-4570-861a-1e86f1ede4c3',
  username: 'Super Usuario',
  email: 'superuser@esap.edu.co',
  roles: ['admin'],
};

const dtoBase = {
  idSede: sedeValida.idSede,
  nombreAreaSolicitante: 'Coordinación',
  piso: 'Piso 7',
  salon: 'Salon 404',
  tipoMantenimiento: 'CORRECTIVO',
  descripcion: 'Lorem ipsum dolor sit amet consectetur adipiscing elit 1219',
  prioridad: 'ALTA',
  uploadedEvidenciaIds: [] as string[],
} as const;

// ---------------------------------------------------------------------------
// Reglas de autenticación y usuario
// ---------------------------------------------------------------------------
describe('create requiere usuario autenticado', () => {
  it('lanza Forbidden cuando el JWT no trae userId', async () => {
    const s = servicio();
    await expect(s.create(dtoBase as any, undefined as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lanza Forbidden con objeto user vacío', async () => {
    const s = servicio();
    await expect(s.create(dtoBase as any, {} as any)).rejects.toThrow(
      /Usuario autenticado requerido/,
    );
  });
});

// ---------------------------------------------------------------------------
// Reglas de sede
// ---------------------------------------------------------------------------
describe('validación sede create', () => {
  it('rechaza sedes que no existen con BadRequest', async () => {
    const s = servicio({ sedeRepo: { findOne: jest.fn().mockResolvedValue(null) } });
    await expect(s.create(dtoBase as any, userValido)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rechaza sedes inactivas (Gherkin AC-04 sede inactiva BadRequest)', async () => {
    const s = servicio({
      sedeRepo: {
        findOne: jest.fn().mockResolvedValue({ ...sedeValida, isActivo: false }),
      },
    });
    await expect(s.create(dtoBase as any, userValido)).rejects.toThrow(
      /está inactiva y no permite radicación/,
    );
  });

  it('acepta sedes activas y consulta el repo de sede por el ID del dto', async () => {
    const findOne = jest.fn().mockResolvedValue(sedeValida);
    const s = servicio({
      sedeRepo: { findOne },
      mantenimientoRepo: { count: jest.fn().mockResolvedValue(0), save: jest.fn().mockResolvedValue({ idSolicitud: 's1' }) },
    });
    await s.create(dtoBase as any, userValido);
    expect(findOne).toHaveBeenCalledWith({ where: { idSede: dtoBase.idSede } });
  });
});

// ---------------------------------------------------------------------------
// Consecutivo MNT-AAAA-NNNN
// ---------------------------------------------------------------------------
describe('consecutivo MNT-AAAA-NNNN por año natural', () => {
  const sBase = (countAnio: number) =>
    servicio({
      sedeRepo: { findOne: jest.fn().mockResolvedValue(sedeValida) },
      mantenimientoRepo: {
        count: jest.fn().mockResolvedValue(countAnio),
        save: jest.fn().mockResolvedValue({ idSolicitud: 's1', evidencias: [] }),
      },
    });

  it('empieza en MNT-2026-0001 cuando es la primera solicitud del año', async () => {
    const s = sBase(0);
    const guardar = (s as any).mantenimientoRepo.save;
    await s.create(dtoBase as any, userValido);
    const data = guardar.mock.calls[0][0];
    expect(data.consecutivo).toBe(`MNT-${new Date().getFullYear()}-0001`);
  });

  it('siguiente consecutivo suma 1 sin importar años anteriores', async () => {
    const s = sBase(5);
    const guardar = (s as any).mantenimientoRepo.save;
    await s.create(dtoBase as any, userValido);
    expect(guardar.mock.calls[0][0].consecutivo).toBe(
      `MNT-${new Date().getFullYear()}-0006`,
    );
  });
});

// ---------------------------------------------------------------------------
// Valores fijos que NO deben venir del DTO (no confiar en client input)
// ---------------------------------------------------------------------------
describe('create inicializa reglas propias del backend', () => {
  const ejecutar = async (dto: any) => {
    const save = jest.fn().mockResolvedValue({ idSolicitud: 's1', evidencias: [] });
    const s = servicio({
      sedeRepo: { findOne: jest.fn().mockResolvedValue(sedeValida) },
      mantenimientoRepo: { count: jest.fn().mockResolvedValue(2), save },
    });
    await s.create(dto, userValido);
    return save.mock.calls[0][0];
  };

  it('estado inicial siempre RECIBIDA sin importar lo que venga en el dto', async () => {
    const saved = await ejecutar({ ...dtoBase, estado: 'CERRADA' });
    expect(saved.estado).toBe('RECIBIDA');
  });

  it('prioridad vacía cae en MEDIA por defecto', async () => {
    const { prioridad } = await ejecutar({ ...dtoBase, prioridad: undefined });
    expect(prioridad).toBe('MEDIA');
  });

  it('tipo de atención es FÍSICA en esta primera HU, ignorando el dto', async () => {
    const saved = await ejecutar({ ...dtoBase, tipoAtencion: 'REMOTA' });
    expect(saved.tipoAtencion).toBe('FISICA');
  });

  it('fecha de radicación y usuario vienen del backend, no del dto', async () => {
    const saved = await ejecutar({
      ...dtoBase,
      fechaRadicacion: '2020-01-01',
      usuarioSolicitanteId: 'usuario-hack-front',
      usuarioSolicitanteEmail: 'malo@externo.co',
    });
    expect(saved.usuarioSolicitanteId).toBe(userValido.userId);
    expect(saved.usuarioSolicitanteEmail).toBe(userValido.email);
    expect(new Date(saved.fechaRadicacion).getTime()).toBeGreaterThan(
      Date.now() - 60_000,
    );
  });
});

// ---------------------------------------------------------------------------
// Ligar uploadedEvidenciaIds (2 pasos upload → radicación)
// ---------------------------------------------------------------------------
describe('create liga uploadedEvidenciaIds a la nueva solicitud', () => {
  it('con 2 ids huérfanas: guarda las 2 evidencias con el idSolicitud nuevo', async () => {
    const saveMantenimiento = jest
      .fn()
      .mockResolvedValue({ idSolicitud: 'SOL-1' });
    const findByEvidencia = jest.fn().mockResolvedValue([
      { idEvidencia: 'E1', nombreOriginal: 'a.png' },
      { idEvidencia: 'E2', nombreOriginal: 'b.pdf' },
    ]);
    const saveEvidencias = jest
      .fn()
      .mockImplementation((arr: any[]) => arr);
    const s = servicio({
      sedeRepo: { findOne: jest.fn().mockResolvedValue(sedeValida) },
      mantenimientoRepo: {
        count: jest.fn().mockResolvedValue(0),
        save: saveMantenimiento,
      },
      evidenciaRepo: {
        findBy: findByEvidencia,
        save: saveEvidencias,
      } as any,
    });

    await s.create(
      { ...dtoBase, uploadedEvidenciaIds: ['E1', 'E2'] } as any,
      userValido,
    );

    expect(findByEvidencia).toHaveBeenCalledWith({ idEvidencia: expect.any(Object) });
    expect(saveEvidencias).toHaveBeenCalledTimes(1);
    const guardadas = saveEvidencias.mock.calls[0][0];
    expect(guardadas.map((e: any) => e.idSolicitud)).toEqual(['SOL-1', 'SOL-1']);
    expect(guardadas.map((e: any) => e.orden)).toEqual([1, 2]);
  });

  it('con uploadedEvidenciaIds = undefined / [] no toca el repo de evidencias', async () => {
    const saveEvidencias = jest.fn();
    const s = servicio({
      sedeRepo: { findOne: jest.fn().mockResolvedValue(sedeValida) },
      mantenimientoRepo: {
        count: jest.fn().mockResolvedValue(0),
        save: jest.fn().mockResolvedValue({ idSolicitud: 'SOL-1' }),
      },
      evidenciaRepo: { save: saveEvidencias, findBy: jest.fn(), find: jest.fn() } as any,
    });
    const r1 = await s.create({ ...dtoBase, uploadedEvidenciaIds: undefined } as any, userValido);
    expect(saveEvidencias).not.toHaveBeenCalled();
    expect(r1.evidencias).toEqual([]);
    const r2 = await s.create({ ...dtoBase, uploadedEvidenciaIds: [] } as any, userValido);
    expect(r2.evidencias).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findByUsuario Mis Solicitudes
// ---------------------------------------------------------------------------
describe('findByUsuario filtrado Mis Solicitudes', () => {
  it('retorna array vacío cuando userId es undefined (Gherkin AC-05 sin auth)', () => {
    const s = servicio();
    expect(s.findByUsuario(undefined)).resolves.toEqual([]);
  });

  it('pasa el userId al repo cuando viene definido', async () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ idSolicitud: 's1' }]),
    };
    const mantenimientoRepo = { createQueryBuilder: jest.fn(() => qb) };
    const s = servicio({ mantenimientoRepo: mantenimientoRepo as any });
    const resultado = await s.findByUsuario(userValido.userId);
    expect(qb.where).toHaveBeenCalledWith(
      'solicitud.usuarioSolicitanteId = :usuarioId',
      { usuarioId: userValido.userId },
    );
    expect(resultado).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Evidencias regenerar presigned < 48h o NULL
// ---------------------------------------------------------------------------
describe('getEvidenciasBySolicitud regenera presigned cuando vence pronto o es null', () => {
  const ahora = new Date();
  const dentroDe = (horas: number) =>
    new Date(ahora.getTime() + horas * 60 * 60 * 1000);

  const montarFilas = (filas: any[]) =>
    servicio({
      evidenciaRepo: {
        find: jest.fn().mockResolvedValue(filas),
        save: jest.fn().mockImplementation((arr) => arr),
      } as any,
      storage: {
        regenerarUrlPresigned: jest.fn().mockResolvedValue({
          urlPresigned: 'https://new-signed',
          vencimientoPresigned: dentroDe(24 * 7),
        }),
      } as any,
    });

  it('regenera cuando urlPresigned es null (row nueva o UPDATE manual)', async () => {
    const s = montarFilas([
      { idEvidencia: 'E1', rutaObjeto: 'a/b/c.png', bucket: 'b', urlPresigned: null },
    ]);
    await s.getEvidenciasBySolicitud('S1');
    expect((s as any).storage.regenerarUrlPresigned).toHaveBeenCalledTimes(1);
  });

  it('regenera cuando vence en menos de 48h (umbral por defecto)', async () => {
    const s = montarFilas([
      {
        idEvidencia: 'E2',
        rutaObjeto: 'a/b.pdf',
        bucket: 'b',
        urlPresigned: 'https://old',
        vencimientoPresigned: dentroDe(20),
      },
    ]);
    await s.getEvidenciasBySolicitud('S1');
    expect((s as any).storage.regenerarUrlPresigned).toHaveBeenCalledTimes(1);
  });

  it('NO regenera cuando la URL tiene más de 10 días de vida', async () => {
    const s = montarFilas([
      {
        idEvidencia: 'E3',
        rutaObjeto: 'a/c.jpg',
        bucket: 'b',
        urlPresigned: 'https://good',
        vencimientoPresigned: dentroDe(24 * 10),
      },
    ]);
    await s.getEvidenciasBySolicitud('S1');
    expect((s as any).storage.regenerarUrlPresigned).not.toHaveBeenCalled();
  });

  it('captura fallos de MinIO y retorna las filas sin romper (fallback urlPublica)', async () => {
    const storage = {
      regenerarUrlPresigned: jest
        .fn()
        .mockRejectedValue(new Error('MinIO timeout')),
    };
    const s = servicio({
      evidenciaRepo: {
        find: jest.fn().mockResolvedValue([
          { idEvidencia: 'E4', urlPresigned: null, urlPublica: 'http://fallback' },
        ]),
        save: jest.fn(),
      } as any,
      storage: storage as any,
    });
    const r = await s.getEvidenciasBySolicitud('S1');
    expect(r).toHaveLength(1);
    expect(r[0].urlPublica).toBe('http://fallback');
  });
});
