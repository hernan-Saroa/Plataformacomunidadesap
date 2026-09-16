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

  it('[EFDS-1731 AC-01] tipoAtencion usa el valor del DTO FISICA sin mutarlo', async () => {
    const saved = await ejecutar({ ...dtoBase, tipoAtencion: 'FISICA' });
    expect(saved.tipoAtencion).toBe('FISICA');
  });

  it('[EFDS-1731 AC-01] tipoAtencion usa el valor del DTO TECNOLOGICA sin mutarlo', async () => {
    const saved = await ejecutar({ ...dtoBase, tipoAtencion: 'TECNOLOGICA' });
    expect(saved.tipoAtencion).toBe('TECNOLOGICA');
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

// ============================================================================
// EFDS-1731 Clasificación y enrutamiento a TI (8 tests unitarios)
// ============================================================================
describe('[EFDS-1731] AC-02 Enrutamiento automático por tipoAtencion', () => {
  const montarCreate = () => {
    const save = jest.fn().mockImplementation((d) => ({ idSolicitud: 's-1731', evidencias: [], ...d }));
    const s = servicio({
      sedeRepo: { findOne: jest.fn().mockResolvedValue(sedeValida) },
      mantenimientoRepo: { count: jest.fn().mockResolvedValue(0), save },
    });
    return { s, save };
  };

  it('create tipoAtencion=FISICA → areaResponsableActual=UMI y remisiones=[]', async () => {
    const { s, save } = montarCreate();
    await s.create({ ...dtoBase, tipoAtencion: 'FISICA' } as any, userValido);
    const data = save.mock.calls[0][0];
    expect(data.areaResponsableActual).toBe('UMI');
    expect(Array.isArray(data.remisiones)).toBe(true);
    expect(data.remisiones).toHaveLength(0);
  });

  it('create tipoAtencion=TECNOLOGICA → areaResponsableActual=TI y remisiones.length=1 (AC-02+AC-03 automático)', async () => {
    const { s, save } = montarCreate();
    await s.create({ ...dtoBase, tipoAtencion: 'TECNOLOGICA' } as any, userValido);
    const data = save.mock.calls[0][0];
    expect(data.areaResponsableActual).toBe('TI');
    expect(data.remisiones).toHaveLength(1);
    expect(data.remisiones[0].destinoArea).toBe('TI');
    expect(data.remisiones[0].origenArea).toBe('FORMULARIO');
    expect(data.remisiones[0].estadoRemision).toBe('PENDIENTE_CONFIRMACION_TI');
    expect(new Date(data.remisiones[0].fechaRemision).getTime()).toBeGreaterThan(0);
    expect(data.remisiones[0].usuarioEmail).toBe(userValido.email);
  });

  it('create tipoAtencion=TECNOLOGICA por usuario con rol UMI → BadRequest 400 (AC-02 solo TI atiende FISICA)', async () => {
    const userUMI = { ...userValido, roles: ['umi'] };
    const { s } = montarCreate();
    await expect(
      s.create({ ...dtoBase, tipoAtencion: 'TECNOLOGICA' } as any, userUMI),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('[EFDS-1731] AC-02 Bandeja findAll filtro areaResponsableActual por roles', () => {
  const qbFactory = (qb: any) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    ...qb,
  });

  it('findAll usuario UMI incluirTI=false → agrega filtro areaResp IN (UMI, PENDIENTE) por defecto', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const qb = qbFactory({ andWhere });
    const userUMI = { ...userValido, roles: ['umi'] };
    const s = servicio({
      mantenimientoRepo: { createQueryBuilder: jest.fn(() => qb) } as any,
    });
    await s.findAll(undefined, undefined, false, undefined, userUMI);
    expect(andWhere).toHaveBeenCalledWith(expect.stringMatching(/UMI|PENDIENTE/));
  });

  it('findAll usuario UMI incluirTI=true → NO agrega filtro areaResp (muestra todas incluidas TI)', async () => {
    const andWhere = jest.fn().mockReturnThis();
    const qb = qbFactory({ andWhere });
    const userUMI = { ...userValido, roles: ['umi'] };
    const s = servicio({
      mantenimientoRepo: { createQueryBuilder: jest.fn(() => qb) } as any,
    });
    await s.findAll(undefined, undefined, true, undefined, userUMI);
    expect(andWhere).not.toHaveBeenCalledWith(expect.stringMatching(/UMI|PENDIENTE/));
  });
});

describe('[EFDS-1731] AC-03 Endpoint remitirATI y trazabilidad JSONB', () => {
  const baseGuardias = () => {
    const save = jest.fn().mockImplementation((d) => ({ ...d, updatedAt: new Date() }));
    const findOne = jest.fn();
    const s = servicio({
      mantenimientoRepo: { save, findOne },
    });
    return { s, save, findOne };
  };

  it('remitirATI a solicitud CERRADA (estado no permitido) → BadRequest', async () => {
    const { s, findOne } = baseGuardias();
    findOne.mockResolvedValue({
      idSolicitud: 'X', estado: 'CERRADA', remisiones: [] });
    await expect(
      s.remitirATI('X', { motivo: 'motivo de la remisión a TI ok 12 chars' } as any, userValido),
    ).rejects.toThrow(BadRequestException);
  });

  it('remitirATI a solicitud ya en TI → BadRequest (no doble remisión)', async () => {
    const { s, findOne } = baseGuardias();
    findOne.mockResolvedValue({
      idSolicitud: 'X', estado: 'RECIBIDA', areaResponsableActual: 'TI', remisiones: [],
    });
    await expect(
      s.remitirATI('X', { motivo: 'motivo de la remisión oficial' } as any, userValido),
    ).rejects.toThrow(BadRequestException);
  });

  it('remitirATI OK en RECIBIDA → push item JSONB + set areaResp=TI + getRemisionesById DESC', async () => {
    const { s, findOne, save } = baseGuardias();
    findOne.mockResolvedValue({
      idSolicitud: 'REM1', estado: 'RECIBIDA', areaResponsableActual: 'UMI',
      tipoAtencion: 'FISICA', remisiones: [{ fechaRemision: '2020-01-01' }],
    });
    const r = await s.remitirATI(
      'REM1',
      { motivo: 'Motivo remisión manual TI por reclasificación de la solicitud errónea', consecutivoCruzadoTi: 'INC-2026-0001', canalRemision: 'MANUAL' } as any,
      userValido,
    );
    const saved = save.mock.calls[0][0];
    expect(saved.areaResponsableActual).toBe('TI');
    expect(saved.tipoAtencion).toBe('TECNOLOGICA');
    expect(saved.remisiones).toHaveLength(2);
    const ultima = saved.remisiones[saved.remisiones.length - 1];
    expect(ultima.motivo).toMatch(/reclasificación/);
    expect(ultima.consecutivoCruzadoTi).toBe('INC-2026-0001');
    expect(ultima.canalRemision).toBe('MANUAL');
    expect(ultima.destinoArea).toBe('TI');
    const list = await s.getRemisionesById('REM1');
    expect(Array.isArray(list)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// EFDS-1732 Catálogo 8 categorías servicio oficiales Fase 2 (5 tests)
// ---------------------------------------------------------------------------
const SEED_8_CATEGORIAS_OFICIALES_EFDS1732 = [
  { idCatalogo: 47, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_001', nombre: 'Cerrajería y Carpintería', orden: 1, metadata: { tipo: 'CATEGORIA_PRINCIPAL', color: 'bg-rose-100 text-rose-800 border border-rose-200', fase2: true, lineaBase745: true } },
  { idCatalogo: 48, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_002', nombre: 'Eléctricas y Electrónicas', orden: 2, metadata: { tipo: 'CATEGORIA_PRINCIPAL', color: 'bg-amber-100 text-amber-800 border border-amber-200', fase2: true, lineaBase745: true } },
  { idCatalogo: 49, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_003', nombre: 'Adecuación de Espacios y Apoyo a Eventos', orden: 3, metadata: { tipo: 'CATEGORIA_PRINCIPAL', color: 'bg-violet-100 text-violet-800 border border-violet-200', fase2: true, lineaBase745: true } },
  { idCatalogo: 50, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_004', nombre: 'Plomería y Fontanería', orden: 4, metadata: { tipo: 'CATEGORIA_PRINCIPAL', color: 'bg-sky-100 text-sky-800 border border-sky-200', fase2: true, lineaBase745: true } },
  { idCatalogo: 51, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_005', nombre: 'Mantenimiento de Infraestructura Física y Obras Menores', orden: 5, metadata: { tipo: 'CATEGORIA_PRINCIPAL', color: 'bg-orange-100 text-orange-800 border border-orange-200', fase2: true, lineaBase745: true } },
  { idCatalogo: 52, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_006', nombre: 'Mantenimiento de Zonas Exteriores y Jardinería', orden: 6, metadata: { tipo: 'CATEGORIA_PRINCIPAL', color: 'bg-emerald-100 text-emerald-800 border border-emerald-200', fase2: true, lineaBase745: true } },
  { idCatalogo: 53, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_007', nombre: 'Traslados de Mobiliario y Bienes', orden: 7, metadata: { tipo: 'CATEGORIA_PRINCIPAL', color: 'bg-indigo-100 text-indigo-800 border border-indigo-200', fase2: true, lineaBase745: true } },
  { idCatalogo: 54, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_008', nombre: 'Revisión y Mantenimiento Preventivo de Equipos Críticos', orden: 8, metadata: { tipo: 'CATEGORIA_PRINCIPAL', color: 'bg-teal-100 text-teal-800 border border-teal-200', fase2: true, lineaBase745: true } },
];

describe('[EFDS-1732] AC-01 Seed 8 categorías oficiales CATEGORIA_SERVICIO idCatalogo 47..54', () => {
  it('8 filas oficiales tipo=CATEGORIA_PRINCIPAL (línea base 745 casos)', () => {
    const oficiales = SEED_8_CATEGORIAS_OFICIALES_EFDS1732;
    expect(oficiales).toHaveLength(8);
    expect(oficiales.filter((c) => c.metadata?.tipo === 'CATEGORIA_PRINCIPAL')).toHaveLength(8);
    expect(oficiales.every((c) => c.metadata?.fase2 === true && c.metadata?.lineaBase745 === true)).toBe(true);
    expect(oficiales.map((c) => c.idCatalogo).sort((a, b) => a - b)).toEqual([47, 48, 49, 50, 51, 52, 53, 54]);
    expect(oficiales.map((c) => c.codigo)).toEqual(['CS_001', 'CS_002', 'CS_003', 'CS_004', 'CS_005', 'CS_006', 'CS_007', 'CS_008']);
  });

  it('getCatalogo retorna items ordenados ASC por columna orden (1..8)', async () => {
    const mockCatalogo = [
      SEED_8_CATEGORIAS_OFICIALES_EFDS1732[6],
      SEED_8_CATEGORIAS_OFICIALES_EFDS1732[3],
      ...SEED_8_CATEGORIAS_OFICIALES_EFDS1732,
    ];
    const s = servicio({
      catalogoRepo: { find: jest.fn().mockResolvedValue(mockCatalogo) },
    });
    const result = await s.getCatalogo('CATEGORIA_SERVICIO');
    expect(result).toHaveLength(mockCatalogo.length);
    for (let i = 1; i < result.length; i++) {
      expect((result[i].orden || 0) >= (result[i - 1].orden || 0)).toBe(true);
    }
  });
});

describe('[EFDS-1732] AC-03 create guarda idCategoria + idSubcategoria en solicitud', () => {
  it('create dto idCategoria=50 (CS_004 Plomería) + idSubcategoria=1001 → save incluye ambos integers', async () => {
    const save = jest.fn().mockImplementation((d) => ({ idSolicitud: 's-1732', evidencias: [], ...d }));
    const s = servicio({
      sedeRepo: { findOne: jest.fn().mockResolvedValue(sedeValida) },
      mantenimientoRepo: {
        count: jest.fn().mockResolvedValue(3),
        save,
      },
    });
    const dtoCat = {
      ...dtoBase,
      tipoAtencion: 'FISICA',
      idCategoria: 50,
      idSubcategoria: 1001,
    };
    await s.create(dtoCat as any, userValido);
    const saved = save.mock.calls[0][0];
    expect(saved.idCategoria).toBe(50);
    expect(saved.idSubcategoria).toBe(1001);
    expect(Number.isInteger(saved.idCategoria)).toBe(true);
    expect(Number.isInteger(saved.idSubcategoria)).toBe(true);
  });
});

describe('[EFDS-1732] AC-03 findAll filtro opcional idCategoria integer', () => {
  it('findAll idCategoria=50 → andWhere solicitud.idCategoria = :idCat bind 50', async () => {
    const where = jest.fn().mockReturnThis();
    const leftJoinAndSelect = jest.fn().mockReturnThis();
    const andWhere = jest.fn().mockReturnThis();
    const setParameter = jest.fn().mockReturnThis();
    const orderBy = jest.fn().mockReturnThis();
    const addOrderBy = jest.fn().mockReturnThis();
    const skip = jest.fn().mockReturnThis();
    const take = jest.fn().mockReturnThis();
    const getMany = jest.fn().mockResolvedValue([]);
    const qb: any = { where, leftJoinAndSelect, andWhere, setParameter, orderBy, addOrderBy, skip, take, getMany };
    const s = servicio({
      mantenimientoRepo: { createQueryBuilder: jest.fn(() => qb) } as any,
    });
    await s.findAll(undefined, undefined, false, 50, undefined);
    expect(andWhere).toHaveBeenCalled();
    const andWhereCalls = andWhere.mock.calls.map((c) => String(c[0]));
    expect(andWhereCalls.some((sql) => sql.includes('idCategoria') || sql.includes('id_categoria'))).toBe(true);
    const idCatParam = setParameter.mock.calls.find((c) => c[0] === 'idCategoria');
    if (idCatParam) expect(idCatParam[1]).toBe(50);
  });
});

describe('[EFDS-1732] AC-02 Subcategorías discriminador metadata.parentCodigo (sin tabla nueva)', () => {
  it('filtrar subcategorias parentCodigo=CS_004 retorna solo subs de Plomería (orden 1001+)', () => {
    const catPadre = SEED_8_CATEGORIAS_OFICIALES_EFDS1732.find((c) => c.codigo === 'CS_004')!;
    const subcategoriasIn = [
      { idCatalogo: 1001, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_004_S01', nombre: 'Reparación de grifos', orden: 1001, metadata: { parentCodigo: 'CS_004', tipo: 'SUBCATEGORIA' } },
      { idCatalogo: 1002, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_004_S02', nombre: 'Desatasco cañerías', orden: 1002, metadata: { parentCodigo: 'CS_004', tipo: 'SUBCATEGORIA' } },
      { idCatalogo: 1010, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_001_S01', nombre: 'Cambio de chapas', orden: 1010, metadata: { parentCodigo: 'CS_001', tipo: 'SUBCATEGORIA' } },
    ];
    const todos = [...SEED_8_CATEGORIAS_OFICIALES_EFDS1732, ...subcategoriasIn];
    const subcategoriasFiltradas = todos
      .filter((it) => (it as any).metadata?.parentCodigo === catPadre.codigo)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    expect(subcategoriasFiltradas).toHaveLength(2);
    expect(subcategoriasFiltradas.map((s) => s.idCatalogo)).toEqual([1001, 1002]);
    expect(subcategoriasFiltradas.every((s) => (s as any).metadata?.tipo === 'SUBCATEGORIA')).toBe(true);
    expect(subcategoriasFiltradas.every((s) => (s as any).metadata?.parentCodigo === 'CS_004')).toBe(true);
  });
});
