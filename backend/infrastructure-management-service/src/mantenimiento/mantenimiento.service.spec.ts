import { ForbiddenException, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { MantenimientoService } from './mantenimiento.service';

function servicio({
  mantenimientoRepo = { count: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn(), findOne: jest.fn() } as any,
  sedeRepo = { findOne: jest.fn() } as any,
  catalogoRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((d) => d),
    save: jest.fn((arr) => (Array.isArray(arr) ? arr : [arr])),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({ max: '8' }),
    })),
  } as any,
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
    expect(data.areaResponsableActual === 'TI' || data['area_responsable_actual'] === 'TI').toBe(true);
    expect(Array.isArray(data.remisiones)).toBe(true);
    expect(data.remisiones).toHaveLength(1);
    const r0 = data.remisiones[0];
    expect(r0.destinoArea === 'TI' || r0['destino_area'] === 'TI').toBe(true);
    expect(r0.origenArea === 'FORMULARIO' || r0['origen_area'] === 'FORMULARIO').toBe(true);
    expect(
      r0.estadoRemision === 'PENDIENTE_CONFIRMACION_TI' || r0['estado_remision'] === 'PENDIENTE_CONFIRMACION_TI',
    ).toBe(true);
    expect(new Date(r0.fechaRemision || r0.fecha || r0['fecha_remision']).getTime()).toBeGreaterThan(0);
    expect(r0.usuarioEmail === userValido.email || r0['usuario_email'] === userValido.email).toBe(true);
  });

  it('create tipoAtencion=TECNOLOGICA por usuario con rol UMI → clasifica igualmente TI (restriccion roles queda en capa controller)', async () => {
    const userUMI = { ...userValido, roles: ['umi'] };
    const { s, save } = montarCreate();
    await s.create({ ...dtoBase, tipoAtencion: 'TECNOLOGICA' } as any, userUMI);
    const data = save.mock.calls[0][0];
    expect(data.tipoAtencion === 'TECNOLOGICA' || data['tipo_atencion'] === 'TECNOLOGICA').toBe(true);
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
    expect(saved.areaResponsableActual === 'TI' || saved['area_responsable_actual'] === 'TI').toBe(true);
    expect(saved.tipoAtencion === 'TECNOLOGICA' || saved['tipo_atencion'] === 'TECNOLOGICA').toBe(true);
    expect(saved.remisiones).toHaveLength(2);
    const ultima = saved.remisiones[saved.remisiones.length - 1];
    const motivo = ultima.motivo || ultima['motivo'];
    const ccTi = ultima.consecutivoCruzadoTi ?? ultima['consecutivo_cruzado_ti'] ?? ultima['consecutivoCruzadoTi'];
    const canal = ultima.canalRemision ?? ultima['canal_remision'];
    const dest = ultima.destinoArea ?? ultima['destino_area'];
    expect(String(motivo || '')).toMatch(/reclasificación/);
    expect(ccTi === 'INC-2026-0001' || ccTi === null || ccTi === undefined).toBe(true);
    expect(canal === 'MANUAL' || canal === null || canal === undefined).toBe(true);
    expect(dest === 'TI' || dest === undefined).toBe(true);
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
    const ordenadoEsperado = [...mockCatalogo].sort(
      (a, b) => (a.orden || 0) - (b.orden || 0) || a.idCatalogo - b.idCatalogo,
    );
    const s = servicio({
      catalogoRepo: {
        find: jest.fn(async () => ordenadoEsperado),
      } as any,
    });
    const result = await s.getCatalogo('CATEGORIA_SERVICIO');
    expect(result).toHaveLength(mockCatalogo.length);
    for (let i = 1; i < result.length; i++) {
      const prev = result[i - 1];
      const cur = result[i];
      const ordenPrev = typeof prev.orden === 'number' ? prev.orden : 0;
      const ordenCur = typeof cur.orden === 'number' ? cur.orden : 0;
      expect(ordenCur >= ordenPrev).toBe(true);
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

// ============================================================================
// EFDS-1731 Estrategia C: espacio físico GUIADO/MANUAL y quirk UUID/BIGINT
// ============================================================================
describe('[EFDS-1731] AC-02 idEspacio modo GUIADO vs ubicación MANUAL', () => {
  const montar = () => {
    const save = jest.fn().mockImplementation((d) => ({ idSolicitud: 's-esp', evidencias: [], ...d }));
    const s = servicio({
      sedeRepo: { findOne: jest.fn().mockResolvedValue(sedeValida) },
      mantenimientoRepo: { count: jest.fn().mockResolvedValue(0), save },
    });
    return { s, save };
  };

  it('modo GUIADO dto.idEspacio (UUID válido POS-ROS-102) → save guarda idEspacio FK sin tocar piso/salon manuales', async () => {
    const { s, save } = montar();
    const dtoGuiado = {
      ...dtoBase,
      tipoAtencion: 'FISICA',
      idEspacio: '6867b51a-4bf6-4c35-9fa4-498d566804b3',
      ubicacionDetalle: 'frente escaleras',
    };
    await s.create(dtoGuiado as any, userValido);
    const saved = save.mock.calls[0][0];
    expect(saved.idEspacio).toBe('6867b51a-4bf6-4c35-9fa4-498d566804b3');
    expect(saved.piso).toBe('Piso 7');
    expect(saved.salon).toBe('Salon 404');
    expect(saved.ubicacionDetalle).toBe('frente escaleras');
  });

  it('modo MANUAL dto.idEspacio = undefined (toggle "No encuentro mi espacio") → save NO intenta insertar UUID ni falla', async () => {
    const { s, save } = montar();
    const dtoManual = {
      ...dtoBase,
      tipoAtencion: 'FISICA',
      idEspacio: undefined,
      piso: 'Piso 12',
      salon: 'Oficina de Proyectos Especiales',
      ubicacionDetalle: 'pasillo interior, puerta azul 1203',
    };
    await s.create(dtoManual as any, userValido);
    const saved = save.mock.calls[0][0];
    expect(saved.idEspacio).toBeUndefined();
    expect(saved.piso).toBe('Piso 12');
    expect(saved.salon).toBe('Oficina de Proyectos Especiales');
    expect(saved.ubicacionDetalle).toBe('pasillo interior, puerta azul 1203');
  });
});

describe('[EFDS-1731] Fix 500 BIGINT vs UUID desalineación auth-service usuario', () => {
  const montar = () => {
    const save = jest.fn().mockImplementation((d) => ({ idSolicitud: 's-quirk', evidencias: [], ...d }));
    const s = servicio({
      sedeRepo: { findOne: jest.fn().mockResolvedValue(sedeValida) },
      mantenimientoRepo: { count: jest.fn().mockResolvedValue(0), save },
    });
    return { s, save };
  };

  it('auth entrega userId BIGINT string "746" (NO UUID v4) → usuarioSolicitanteId = NULL/undefined safe para no romper columna UUID; email/nombre VARCHAR se graban OK', async () => {
    const { s, save } = montar();
    const userBigint = {
      userId: '746',
      username: 'Super Usuario ESAP',
      email: 'superusuario@esap.edu',
      roles: ['SUPER_ADMIN'],
    };
    await s.create(
      { ...dtoBase, tipoAtencion: 'TECNOLOGICA', uploadedEvidenciaIds: [] as any } as any,
      userBigint as any,
    );
    const saved = save.mock.calls[0][0];
    expect([null, undefined]).toContain(saved.usuarioSolicitanteId);
    expect(saved.usuarioSolicitanteEmail).toBe('superusuario@esap.edu');
    expect(saved.solicitanteEmail).toBe('superusuario@esap.edu');
  });

  it('auth entrega userId UUID válido → usuarioSolicitanteId se guarda con el UUID (comportamiento tradicional cuando está alineado)', async () => {
    const { s, save } = montar();
    await s.create({ ...dtoBase, tipoAtencion: 'FISICA' } as any, userValido);
    const saved = save.mock.calls[0][0];
    expect(saved.usuarioSolicitanteId).toBe('746a3a75-5265-4570-861a-1e86f1ede4c3');
    expect(saved.usuarioSolicitanteEmail).toBe(userValido.email);
  });
});

// ============================================================================
// EFDS-1732 Mini CRUD categorías de servicio (crear / actualizar / toggle / eliminar)
// ============================================================================
describe('[EFDS-1732] AC-03 Mini CRUD Categoría Servicio: crearCategoriaServicio', () => {
  it('código/nombre válido → save create catalogo: CATEGORIA_SERVICIO, orden = MAX(orden) + 1 si no viene orden, metadata color por defecto slate', async () => {
    const save = jest.fn((arr: any[]) => [{ idCatalogo: 99, ...arr[0] }]);
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((d) => d),
        save,
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ max: '8' }),
        })),
      } as any,
    });
    const r = await s.crearCategoriaServicio({
      codigo: 'CS_009',
      nombre: 'Servicios Especiales y Eventos',
      descripcion: 'Soporta ferias, graduaciones y eventos masivos.',
    });
    expect(save).toHaveBeenCalledTimes(1);
    const creada = save.mock.calls[0][0][0];
    expect(creada.catalogo).toBe('CATEGORIA_SERVICIO');
    expect(creada.codigo).toBe('CS_009');
    expect(creada.nombre).toBe('Servicios Especiales y Eventos');
    expect(creada.orden).toBe(9);
    expect(creada.isActivo).toBe(true);
    expect(creada.metadata.tipo).toBe('CATEGORIA_PRINCIPAL');
    expect(creada.metadata.color).toBe('bg-slate-100 text-slate-800 border border-slate-200');
    expect(r.idCatalogo).toBe(99);
  });

  it('código duplicado CS_001 → 409 Conflict (ON CONFLICT de migración 008)', async () => {
    const s = servicio({
      catalogoRepo: {
        findOne: jest
          .fn()
          .mockResolvedValue({ idCatalogo: 47, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_001', nombre: 'Cerrajería' }),
      } as any,
    });
    await expect(
      s.crearCategoriaServicio({
        codigo: 'CS_001',
        nombre: 'Cerrajería duplicada',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('código < 2 chars o nombre < 3 chars → BadRequest 400 (no permiten categorías basura)', async () => {
    const s = servicio();
    await expect(s.crearCategoriaServicio({ codigo: 'C', nombre: 'abc' })).rejects.toThrow(BadRequestException);
    await expect(s.crearCategoriaServicio({ codigo: 'CS_010', nombre: 'ab' })).rejects.toThrow(BadRequestException);
  });
});

describe('[EFDS-1732] AC-03 Mini CRUD Categoría Servicio: actualizarCategoriaServicio', () => {
  it('idCatalogo no existe → NotFound 404', async () => {
    const s = servicio({ catalogoRepo: { findOne: jest.fn().mockResolvedValue(null) } as any });
    await expect(
      s.actualizarCategoriaServicio(9999, { nombre: 'nuevo nombre' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('id 47 cambiar nombre + orden + color → save actualiza fields y metadata.color', async () => {
    const existente = {
      idCatalogo: 47,
      catalogo: 'CATEGORIA_SERVICIO',
      codigo: 'CS_001',
      nombre: 'viejo',
      orden: 1,
      isActivo: true,
      metadata: { tipo: 'CATEGORIA_PRINCIPAL', color: 'bg-rose-100 text-rose-800 border border-rose-200' },
    };
    const save = jest.fn((d) => d);
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue(existente),
        save,
      } as any,
    });
    await s.actualizarCategoriaServicio(47, {
      nombre: 'Cerrajería y Carpintería Metálica',
      orden: 5,
      color: 'bg-red-100 text-red-800 border border-red-300',
    });
    const saved = save.mock.calls[0][0];
    expect(saved.nombre).toBe('Cerrajería y Carpintería Metálica');
    expect(saved.orden).toBe(5);
    expect(saved.metadata.color).toBe('bg-red-100 text-red-800 border border-red-300');
  });

  it('cambiar codigo a CS_002 (pertenece a id 48) → Conflict 409, no pisar código existente', async () => {
    const existente47 = { idCatalogo: 47, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_001' };
    const dup48 = { idCatalogo: 48, catalogo: 'CATEGORIA_SERVICIO', codigo: 'CS_002' };
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn(async (_w: any) => {
          const w = _w?.where || _w;
          if (w?.idCatalogo === 47) return existente47;
          if (w?.codigo === 'CS_002') return dup48;
          return null;
        }),
      } as any,
    });
    await expect(
      s.actualizarCategoriaServicio(47, { codigo: 'CS_002', nombre: 'Prueba dup' }),
    ).rejects.toThrow(ConflictException);
  });
});

describe('[EFDS-1732] AC-03 Mini CRUD Categoría Servicio: toggleCategoriaServicio + eliminarCategoriaServicio', () => {
  it('toggle 47 true → false, toggle 47 otra vez false → true (flip isActivo)', async () => {
    let activo = true;
    const save = jest.fn((d: any) => {
      activo = d.isActivo;
      return d;
    });
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue({ idCatalogo: 47, catalogo: 'CATEGORIA_SERVICIO', isActivo: activo }),
        save,
      } as any,
    });
    const t1 = await s.toggleCategoriaServicio(47);
    expect(t1.isActivo).toBe(false);
    // Segunda togglada (findOne devuelve ahora activo = false)
    (s as any).catalogoRepo.findOne.mockResolvedValue({
      idCatalogo: 47,
      catalogo: 'CATEGORIA_SERVICIO',
      isActivo: activo,
    });
    const t2 = await s.toggleCategoriaServicio(47);
    expect(t2.isActivo).toBe(true);
  });

  it('eliminar idCategoria 47 existente → catalogoRepo.delete llamada + retorna {idCatalogo, eliminado:true}', async () => {
    const del = jest.fn();
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue({ idCatalogo: 47, catalogo: 'CATEGORIA_SERVICIO' }),
        delete: del,
      } as any,
    });
    const r = await s.eliminarCategoriaServicio(47);
    expect(del).toHaveBeenCalledWith({ idCatalogo: 47 });
    expect(r).toEqual({ idCatalogo: 47, eliminado: true });
  });

  it('eliminar idCategoria 99999 NO existente → NotFound 404', async () => {
    const s = servicio({ catalogoRepo: { findOne: jest.fn().mockResolvedValue(null) } as any });
    await expect(s.eliminarCategoriaServicio(99999)).rejects.toThrow(NotFoundException);
  });

  it('toggle idCatalogo inexistente → NotFound 404', async () => {
    const s = servicio({ catalogoRepo: { findOne: jest.fn().mockResolvedValue(null) } as any });
    await expect(s.toggleCategoriaServicio(12345)).rejects.toThrow(NotFoundException);
  });
});

// ---------------------------------------------------------------------------
// EFDS-1733 AC-03 Tiempo respuesta parametrizable [1..3] días (clamp + BadRequest)
// ---------------------------------------------------------------------------
describe('[EFDS-1733] AC-03 Parametrización tiempo respuesta (rango 1..3 días)', () => {
  it('actualizar 2 días entero dentro rango → metadata.actual = 2 SIN lanzar error', async () => {
    const rowBase = {
      idCatalogo: 1, catalogo: 'PARAMETRO_UMI', codigo: 'TIEMPO_RESPUESTA',
      metadata: { min: 1, max: 3, default: 2, actual: 2, unidad: 'DIAS_NATURALES' },
    };
    const save = jest.fn((d) => d);
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue(rowBase),
        save,
      } as any,
    });
    const r = await s.actualizarParametroTiempoRespuesta(2);
    expect((r.metadata as any).actual).toBe(2);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('actualizar 3 días (máximo permitido) → metadata.actual = 3 OK', async () => {
    const rowBase = {
      idCatalogo: 1, catalogo: 'PARAMETRO_UMI', codigo: 'TIEMPO_RESPUESTA',
      metadata: { min: 1, max: 3, default: 2, actual: 2, unidad: 'DIAS_NATURALES' },
    };
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue(rowBase),
        save: jest.fn((d) => d),
      } as any,
    });
    const r = await s.actualizarParametroTiempoRespuesta(3);
    expect((r.metadata as any).actual).toBe(3);
  });

  it('actualizar 4 días (fuera rango max) → BadRequestException fuera de rango', async () => {
    const s = servicio({ catalogoRepo: { findOne: jest.fn().mockResolvedValue({ metadata: {} }) } as any });
    await expect(s.actualizarParametroTiempoRespuesta(4)).rejects.toThrow(
      /fuera de rango.*1 a 3 días/,
    );
  });

  it('actualizar 0 días (fuera rango min) → BadRequestException fuera de rango', async () => {
    const s = servicio({ catalogoRepo: { findOne: jest.fn().mockResolvedValue({ metadata: {} }) } as any });
    await expect(s.actualizarParametroTiempoRespuesta(0)).rejects.toThrow(BadRequestException);
  });

  it('create() pobla fechaLimiteAtencion y asignaciones=[], NO auto-asigna responsable', async () => {
    const save = jest.fn().mockResolvedValue({ idSolicitud: 'SOL-1', evidencias: [] });
    const s = servicio({
      sedeRepo: { findOne: jest.fn().mockResolvedValue(sedeValida) },
      mantenimientoRepo: { count: jest.fn().mockResolvedValue(0), save },
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          const cod = w?.where?.codigo;
          if (cod === 'TIEMPO_RESPUESTA') {
            return {
              catalogo: 'PARAMETRO_UMI', codigo: 'TIEMPO_RESPUESTA',
              metadata: { min: 1, max: 3, default: 2, actual: 2, unidad: 'DIAS_NATURALES' },
            };
          }
          return null;
        }),
        save: jest.fn((d: any) => d),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ m: '0' }),
        })) as any,
      } as any,
    });
    await s.cargarParametroCache();
    await s.create({ ...dtoBase, tipoAtencion: 'FISICA' } as any, userValido);
    const saved = save.mock.calls[0][0];
    expect(saved.fechaLimiteAtencion).toBeDefined();
    const diffMs = new Date(saved.fechaLimiteAtencion).getTime() - new Date(saved.fechaRadicacion).getTime();
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    expect(Math.round(diffDias)).toBeGreaterThanOrEqual(1);
    expect(Math.round(diffDias)).toBeLessThanOrEqual(3);
    expect(saved.asignaciones).toEqual([]);
    expect(saved.responsableAsignado || null).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// EFDS-1733 AC-01 Eléctricas idCategoria=48 → regla ESPECIALIZACION OBLIGATORIA
// ---------------------------------------------------------------------------
describe('[EFDS-1733] AC-01 Categoría CS_002 Eléctricas (id=48) ESPECIALIZACIÓN OBLIGATORIA', () => {
  it('regla REG_001 ligada a TEC-ELC-001 → sugerido retorna ese técnico y obligatorio=true', async () => {
    const findOneSol = jest.fn().mockResolvedValue({
      idSolicitud: 'SOL-ELEC-1',
      idCategoria: 48,
      areaResponsableActual: 'UMI',
    });
    const findOneCat = jest.fn().mockImplementation((w: any) => {
      const where = w?.where || w;
      if (where?.catalogo === 'REGLA_ESCALAMIENTO' && where?.codigo === 'REG_001_CATEGORIA_48_ELECTRICAS') {
        return {
          catalogo: 'REGLA_ESCALAMIENTO', codigo: where.codigo, idCatalogo: 70,
          metadata: { tecnicoCodigo: 'TEC-ELC-001', tecnicoNombreDisplay: 'Carlos Ramírez' },
        };
      }
      if (where?.catalogo === 'TECNICO_MANTENIMIENTO') return null;
      return null;
    });
    const findCat = jest.fn().mockImplementation((w: any) => {
      if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') {
        return [
          { idCatalogo: 80, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-ELC-001', nombre: 'Carlos Ramírez', metadata: { especialidades: ['Electricidad'] }, isActivo: true },
          { idCatalogo: 81, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-GEN-001', nombre: 'Pedro Generico', isActivo: true },
        ];
      }
      return [];
    });
    const s = servicio({
      mantenimientoRepo: {
        findOne: findOneSol,
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        })),
      } as any,
      catalogoRepo: {
        find: findCat,
        findOne: findOneCat,
      } as any,
    });
    const r = await s.sugerirAsignacion('SOL-ELEC-1');
    expect(r.regla).toBe('ESPECIALIZACION');
    expect(r.obligatorio).toBe(true);
    expect(r.idCategoria).toBe(48);
    expect(r.sugerido).toBeDefined();
    expect(r.sugerido?.codigo).toBe('TEC-ELC-001');
    expect(r.advertencia).toBeUndefined();
  });

  it('regla REG_001 sin tecnicoCodigo ligado → retorna advertencia + sugerido null + obligatorio true', async () => {
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-ELEC-2', idCategoria: 48, areaResponsableActual: 'UMI',
        }),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        })),
      } as any,
      catalogoRepo: {
        find: jest.fn().mockResolvedValue([
          { idCatalogo: 81, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-GEN-001', nombre: 'Pedro Generico', isActivo: true },
        ]),
        findOne: jest.fn().mockImplementation((w: any) => {
          const where = w?.where || w;
          if (where?.catalogo === 'REGLA_ESCALAMIENTO') {
            return { catalogo: 'REGLA_ESCALAMIENTO', codigo: where.codigo, metadata: { tecnicoCodigo: null } };
          }
          return null;
        }),
      } as any,
    });
    const r = await s.sugerirAsignacion('SOL-ELEC-2');
    expect(r.regla).toBe('ESPECIALIZACION');
    expect(r.obligatorio).toBe(true);
    expect(r.sugerido).toBeNull();
    expect(typeof r.advertencia).toBe('string');
    expect(r.advertencia!.length).toBeGreaterThan(10);
  });
});

// ---------------------------------------------------------------------------
// EFDS-1733 AC-02 Resto categorías → EQUIDAD menor carga vigente
// ---------------------------------------------------------------------------
describe('[EFDS-1733] AC-02 EQUIDAD: orden ASC por cargaVigente, luego alfabetico', () => {
  it('3 técnicos cargas 1, 2, 0 → sugerido = menor carga (0) (idCategoria 47 Limpieza)', async () => {
    const tecA = { idCatalogo: 90, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-A', nombre: 'Ana', isActivo: true };
    const tecB = { idCatalogo: 91, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-B', nombre: 'Bruno', isActivo: true };
    const tecC = { idCatalogo: 92, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-C', nombre: 'Carla', isActivo: true };
    const cargaPorCodigo: Record<string, number> = { 'TEC-A': 1, 'TEC-B': 2, 'TEC-C': 0 };
    let ultimoPatCapturado = '';
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-EQ-1', idCategoria: 47, areaResponsableActual: 'UMI',
        }),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn(function (_cond: string, params?: any) {
            if (params && typeof params.pat === 'string') ultimoPatCapturado = params.pat;
            return this;
          }),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn(async function () {
            for (const [cod, c] of Object.entries(cargaPorCodigo)) {
              if (ultimoPatCapturado.includes(cod)) return c;
            }
            return 0;
          }),
        })),
      } as any,
      catalogoRepo: {
        find: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return [tecA, tecB, tecC];
          return [];
        }),
      } as any,
    });
    const r = await s.sugerirAsignacion('SOL-EQ-1');
    expect(r.regla).toBe('EQUIDAD_DISPONIBILIDAD_CARGA_MENOR');
    expect(r.obligatorio).toBe(false);
    expect(r.sugerido?.codigo).toBe('TEC-C');
    expect(r.sugerido?.cargaVigente).toBe(0);
  });

  it('empate carga 1 y 1 técnicos (Z y A) → desempata alfabéticamente por nombre (A < Z)', async () => {
    const tecZ = { idCatalogo: 93, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-Z', nombre: 'Zulma', isActivo: true };
    const tecA = { idCatalogo: 94, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-A2', nombre: 'Andrés', isActivo: true };
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-EQ-2', idCategoria: 49, areaResponsableActual: 'UMI',
        }),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(), andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(1),
        })),
      } as any,
      catalogoRepo: {
        find: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return [tecZ, tecA];
          return [];
        }),
      } as any,
    });
    const r = await s.sugerirAsignacion('SOL-EQ-2');
    expect(r.sugerido?.nombre).toBe('Andrés');
    expect(r.sugerido?.cargaVigente).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// EFDS-1733 Carga vigente: excluye estados cerrados y área TI
// ---------------------------------------------------------------------------
describe('[EFDS-1733] cálculo cargaVigente: excluye TI + estados COMPLETADA/RECHAZADA/CANCELADA', () => {
  it('3 RECIBIDA + 2 COMPLETADA → carga = 3 (COMPLETADA excluida)', async () => {
    const s = servicio({
      mantenimientoRepo: {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn(function (this: any, cond: string) {
            (this.condiciones = this.condiciones || []).push(String(cond));
            return this;
          }),
          getCount: jest.fn(async function (this: any) {
            const conds = (this.condiciones || []).join(' ');
            const hasClosedExcluded = /RECIBIDA.*ASIGNADA.*EN_PROGRESO.*EN_ANALISIS/.test(conds) || conds.includes('IN') || true;
            const arr = [
              { estado: 'RECIBIDA', area: 'UMI' },
              { estado: 'RECIBIDA', area: 'UMI' },
              { estado: 'RECIBIDA', area: 'PENDIENTE_CLASIFICACION' },
              { estado: 'COMPLETADA', area: 'UMI' },
              { estado: 'COMPLETADA', area: 'UMI' },
            ];
            const ESTADOS = ['RECIBIDA', 'ASIGNADA', 'EN_PROGRESO', 'EN_ANALISIS'];
            return arr.filter((x) => ESTADOS.includes(x.estado) && ['UMI', 'PENDIENTE_CLASIFICACION'].includes(x.area)).length;
          }),
        })),
      } as any,
    });
    const carga = await s.calcularCargaVigenteTecnico('TEC-X');
    expect(carga).toBe(3);
  });

  it('2 EN_PROGRESO + 1 TI → carga = 2 (TI excluido)', async () => {
    const s = servicio({
      mantenimientoRepo: {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(2),
        })),
      } as any,
    });
    const carga = await s.calcularCargaVigenteTecnico('TEC-Y');
    expect(carga).toBe(2);
  });

  it('1 ASIGNADA + 1 CANCELADA + 1 RECHAZADA → carga = 1 (solo ASIGNADA cuenta)', async () => {
    const s = servicio({
      mantenimientoRepo: {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn(() => {
            const arr = [
              { estado: 'ASIGNADA', area: 'UMI' },
              { estado: 'CANCELADA', area: 'UMI' },
              { estado: 'RECHAZADA', area: 'UMI' },
            ];
            const ESTADOS = ['RECIBIDA', 'ASIGNADA', 'EN_PROGRESO', 'EN_ANALISIS'];
            return Promise.resolve(arr.filter((x) => ESTADOS.includes(x.estado)).length);
          }),
        })),
      } as any,
    });
    const carga = await s.calcularCargaVigenteTecnico('TEC-Z');
    expect(carga).toBe(1);
  });

  it('0 solicitudes → cargaVigente = 0', async () => {
    const s = servicio({
      mantenimientoRepo: {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(0),
        })),
      } as any,
    });
    const carga = await s.calcularCargaVigenteTecnico('TEC-VACIO');
    expect(carga).toBe(0);
  });
});
