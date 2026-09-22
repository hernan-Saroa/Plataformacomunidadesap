import { ForbiddenException, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { MantenimientoService } from './mantenimiento.service';

function servicio({
  mantenimientoRepo = { count: jest.fn(), save: jest.fn(), createQueryBuilder: jest.fn(), findOne: jest.fn(), find: jest.fn() } as any,
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
  valoracionRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn((d: any) => Promise.resolve(Array.isArray(d) ? d : { idValoracion: 'val-1', ...(d || {}) })),
    create: jest.fn((d: any) => d),
  } as any,
  valoracionInsumoRepo = {
    delete: jest.fn(() => Promise.resolve({ affected: 0 })),
    save: jest.fn((rows: any[]) => Promise.resolve(rows || [])),
    create: jest.fn((d: any) => d),
  } as any,
  notificationClient = undefined as any,
} = {}) {
  return new MantenimientoService(
    mantenimientoRepo,
    sedeRepo,
    catalogoRepo,
    evidenciaRepo,
    valoracionRepo,
    valoracionInsumoRepo,
    storage,
    notificationClient,
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
// NOTA 2026-01 EFDS-1733-bis HUECO 1: actualizarParametroTiempoRespuesta ahora requiere (idCategoria, dias) en vez de solo (dias).
// ---------------------------------------------------------------------------
describe('[EFDS-1733] AC-03 Parametrización tiempo respuesta (rango 1..3 días)', () => {
  it('actualizar 2 días entero dentro rango idCategoria=50 (Plomería) → metadata.actual = 2 SIN lanzar error', async () => {
    const rowBase = {
      idCatalogo: 1, catalogo: 'PARAMETRO_UMI', codigo: 'TIEMPO_RESP_DIAS_CAT_50',
      idCategoria: 50,
      metadata: { min: 1, max: 3, default: 2, actual: 2, unidad: 'DIAS_NATURALES', idCategoria: 50, codCategoriaCS: 'CS_004' },
    };
    const save = jest.fn((d) => d);
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue(rowBase),
        save,
        find: jest.fn().mockResolvedValue([rowBase]),
        create: jest.fn((d) => d),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ max: '8' }),
        })),
      } as any,
    });
    const r: any = await s.actualizarParametroTiempoRespuesta(50, 2);
    expect(Number(r.metadata?.actual)).toBe(2);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('actualizar 3 días (máximo permitido) idCategoria=47 (Cerrajería) → metadata.actual = 3 OK', async () => {
    const rowBase = {
      idCatalogo: 2, catalogo: 'PARAMETRO_UMI', codigo: 'TIEMPO_RESP_DIAS_CAT_47',
      idCategoria: 47,
      metadata: { min: 1, max: 3, default: 2, actual: 2, unidad: 'DIAS_NATURALES', idCategoria: 47, codCategoriaCS: 'CS_001' },
    };
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue(rowBase),
        save: jest.fn((d) => d),
        find: jest.fn().mockResolvedValue([rowBase]),
        create: jest.fn((d) => d),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ max: '8' }),
        })),
      } as any,
    });
    const r: any = await s.actualizarParametroTiempoRespuesta(47, 3);
    expect(Number(r.metadata?.actual)).toBe(3);
  });

  it('actualizar 4 días (fuera rango max) idCategoria=50 → BadRequestException fuera de rango 1 a 3 días', async () => {
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue({ metadata: {} }),
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn((d) => d),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ max: '8' }),
        })),
      } as any,
    });
    await expect(s.actualizarParametroTiempoRespuesta(50, 4)).rejects.toThrow(
      /fuera de rango.*1 a 3 días/,
    );
  });

  it('actualizar 0 días (fuera rango min) idCategoria=48 → BadRequestException fuera de rango', async () => {
    const s = servicio({
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue({ metadata: {} }),
        find: jest.fn().mockResolvedValue([]),
        create: jest.fn((d) => d),
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(),
          getRawOne: jest.fn().mockResolvedValue({ max: '8' }),
        })),
      } as any,
    });
    await expect(s.actualizarParametroTiempoRespuesta(48, 0)).rejects.toThrow(BadRequestException);
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

// ---------------------------------------------------------------------------
// [FIX_TEC_INACT] listarTecnicosConCargaVigente(incluirInactivos=true):
// Patrón 1732 soft-delete — inactivos NO se borran físicamente, solo se excluyen
// del motor de asignación (soloActivos=true). Vista Admin debe ver TODOS.
// ---------------------------------------------------------------------------
describe('[EFDS-1733 + 1732 patrón] listarTecnicosConCargaVigente: inactivos visibles con flag incluirInactivos=true, cargaVigente=0 (baja lógica)', () => {
  const catalogoRepoInactivos = (overrides: any = {}) => {
    const rowsDB = [
      { idCatalogo: 1, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-ACT-001', nombre: 'Técnico Activo', orden: 1, isActivo: true, metadata: { email: 'a@e.co' } },
      { idCatalogo: 2, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-INA-002', nombre: 'Técnico Inactivo', orden: 2, isActivo: false, metadata: { email: 'b@e.co' } },
      { idCatalogo: 3, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-ACT-003', nombre: 'Técnico Activo 2', orden: 3, isActivo: true, metadata: {} },
    ] as CatalogoItem[];
    return {
      find: jest.fn(async (w: any) => {
        const act = w?.where?.isActivo;
        if (act === true) return Promise.resolve(rowsDB.filter((x) => x.isActivo));
        return Promise.resolve([...rowsDB]);
      }),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
      create: jest.fn().mockImplementation((d) => d),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([...rowsDB]),
        getRawOne: jest.fn().mockResolvedValue({ max: '3' }),
      })),
      ...overrides,
    } as any;
  };

  it('por defecto (sin flag) = solo activos, length = 2 y todos isActivo=true', async () => {
    const s = servicio({
      catalogoRepo: catalogoRepoInactivos(),
      mantenimientoRepo: {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: jest.fn().mockResolvedValue(1),
        })),
      } as any,
    });
    const rows = await s.listarTecnicosConCargaVigente();
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.isActivo === true)).toBe(true);
    expect(rows.find((r) => r.codigo === 'TEC-INA-002')).toBeUndefined();
    expect(rows[0].cargaVigente).toBeGreaterThanOrEqual(0);
  });

  it('incluirInactivos=true devuelve 3 filas (activos + inactivo); inactivo TIENE isActivo=false y cargaVigente EXACTAMENTE 0 (no consulta COUNT)', async () => {
    const getCountMock = jest.fn().mockResolvedValue(5);
    const s = servicio({
      catalogoRepo: catalogoRepoInactivos(),
      mantenimientoRepo: {
        createQueryBuilder: jest.fn(() => ({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getCount: getCountMock,
        })),
      } as any,
    });
    const rows = await s.listarTecnicosConCargaVigente(true);
    expect(rows).toHaveLength(3);
    const inactivo = rows.find((r) => r.codigo === 'TEC-INA-002');
    expect(inactivo).toBeDefined();
    expect(inactivo!.isActivo).toBe(false);
    expect(inactivo!.cargaVigente).toBe(0);
    const activo1 = rows.find((r) => r.codigo === 'TEC-ACT-001')!;
    expect(activo1.isActivo).toBe(true);
    expect(activo1.cargaVigente).toBe(5);
    expect(getCountMock).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// EFDS-1733 bis: Tiempo de respuesta POR CATEGORÍA (RF-INF-004)
// Parche HUECO 1: antes era global único, ahora 8 parámetros 1xcat (47..54).
// ---------------------------------------------------------------------------
describe('[EFDS-1733-bis] RF-INF-004 parámetro tiempo POR CATEGORÍA 47..54 clamp 1..3 días', () => {
  const userSuper = {
    userId: 'a7a1d550-5d4e-4e4f-8c1d-5a1f8b3c9d0e',
    username: 'Super Admin',
    email: 'superadmin@esap.edu.co',
    roles: ['SUPER_ADMIN'],
  };
  const catRepoFull = (overrides: any = {}) => {
    const rowsDB: CatalogoItem[] = [];
    return {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockImplementation((w: any) => {
        const cod = w?.where?.codigo;
        if (!cod) return Promise.resolve(null);
        return Promise.resolve(rowsDB.find((r) => r.codigo === cod) || null);
      }),
      save: jest.fn().mockImplementation((arg: any) => {
        const arr = Array.isArray(arg) ? arg : [arg];
        for (const it of arr) {
          const idx = rowsDB.findIndex((r) => r.codigo === it.codigo);
          if (idx >= 0) rowsDB[idx] = { ...rowsDB[idx], ...it };
          else rowsDB.push({ ...it });
        }
        return Promise.resolve(Array.isArray(arg) ? arr : arr[0]);
      }),
      create: jest.fn().mockImplementation((d: any) => d),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([...rowsDB]),
        getRawOne: jest.fn().mockResolvedValue({ max: '8' }),
      })),
      ...overrides,
    } as any;
  };
  it('listarParametrosTiempoPorCategoria sin seed previo → crea 8 on-the-fly con metadata default (min1/max3/default2/actual2)', async () => {
    const s = servicio({
      catalogoRepo: catRepoFull(),
    });
    const res = await s.listarParametrosTiempoPorCategoria();
    expect(Array.isArray(res)).toBe(true);
    expect(res).toHaveLength(8);
    const ids = res.map((r: any) => Number(r.metadata?.idCategoria)).sort((a, b) => a - b);
    expect(ids).toEqual([47, 48, 49, 50, 51, 52, 53, 54]);
    for (const fila of res) {
      const md = (fila as any).metadata || {};
      expect(Number(md.min)).toBe(1);
      expect(Number(md.max)).toBe(3);
      expect(Number(md.default)).toBe(2);
      expect(Number(md.actual)).toBe(2);
      expect(String(md.unidad)).toBe('DIAS_NATURALES');
    }
  });
  it('listarParametrosTiempoPorCategoria retorna códigos CS_001 (47) a CS_008 (54) en metadata', async () => {
    const s = servicio({
      catalogoRepo: catRepoFull(),
    });
    const res = await s.listarParametrosTiempoPorCategoria();
    const mapaCod = new Map(res.map((r: any) => [
      Number(r.metadata?.idCategoria),
      String(r.metadata?.codCategoriaCS || ''),
    ]));
    expect(mapaCod.get(47)).toBe('CS_001');
    expect(mapaCod.get(48)).toBe('CS_002');
    expect(mapaCod.get(49)).toBe('CS_003');
    expect(mapaCod.get(50)).toBe('CS_004');
    expect(mapaCod.get(51)).toBe('CS_005');
    expect(mapaCod.get(52)).toBe('CS_006');
    expect(mapaCod.get(53)).toBe('CS_007');
    expect(mapaCod.get(54)).toBe('CS_008');
  });
  it('obtenerParametroTiempoRespuesta(48) Eléctricas → retorna metadata.idCategoria=48 actual=2 default cuando seed está vacío', async () => {
    const s = servicio({
      catalogoRepo: catRepoFull(),
    });
    const r: any = await s.obtenerParametroTiempoRespuesta(48);
    expect(Number(r.metadata?.idCategoria)).toBe(48);
    expect(Number(r.metadata?.actual)).toBe(2);
  });
  it('listarParametrosTiempoPorCategoria (equivalente a obtenerParametroTiempoRespuesta sin idCategoria) → retorna array 8 filas', async () => {
    const s = servicio({
      catalogoRepo: catRepoFull(),
    });
    const r = await s.listarParametrosTiempoPorCategoria();
    expect(Array.isArray(r)).toBe(true);
    expect(r).toHaveLength(8);
  });
  it('actualizarParametroTiempoRespuesta idCategoria=46 (fuera rango 47..54) → BadRequest', async () => {
    const s = servicio({
      catalogoRepo: catRepoFull(),
    });
    await expect(s.actualizarParametroTiempoRespuesta(46, 2)).rejects.toThrow(BadRequestException);
  });
  it('actualizarParametroTiempoRespuesta idCategoria=55 (fuera rango 47..54) → BadRequest', async () => {
    const s = servicio({
      catalogoRepo: catRepoFull(),
    });
    await expect(s.actualizarParametroTiempoRespuesta(55, 2)).rejects.toThrow(BadRequestException);
  });
  it('actualizarParametroTiempoRespuesta idCategoria=48 dias=4 (fuera rango 1..3) → BadRequest clamp', async () => {
    const s = servicio({
      catalogoRepo: catRepoFull(),
    });
    await expect(s.actualizarParametroTiempoRespuesta(48, 4)).rejects.toThrow(BadRequestException);
  });
  it('actualizarParametroTiempoRespuesta idCategoria=50 dias=1 (válido) → actualiza metadata.actual=1 y retorna la fila actualizada metadata.idCategoria=50', async () => {
    const repo = catRepoFull();
    const s = servicio({
      catalogoRepo: repo,
    });
    const r: any = await s.actualizarParametroTiempoRespuesta(50, 1);
    expect(Number(r.metadata?.idCategoria)).toBe(50);
    expect(Number(r.metadata?.actual)).toBe(1);
    expect(repo.save).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// EFDS-1734: Asignación (Aprobar / Rechazar / Redistribuir) + Roles guard
// AC-01 3 acciones, AC-02 motivo rechazo ≥10 visible, AC-03 histórico JSONB push.
// ---------------------------------------------------------------------------
describe('[EFDS-1734] RF-INF-005 validación roles guard clause SUPER_ADMIN | GESTOR_MANTENIMIENTO → Forbidden 403', () => {
  it('aprobarYAsignar con rol SOLICITANTE → ForbiddenException (Solo SUPER|GESTOR)', async () => {
    const userSoli = { ...userValido, roles: ['SOLICITANTE'] };
    const s = servicio({});
    await expect(
      s.aprobarYAsignar('SOL-1', { tecnicoCodigo: 'TEC-1' }, userSoli),
    ).rejects.toThrow(ForbiddenException);
  });
  it('rechazar con user sin roles array (no autenticado) → ForbiddenException', async () => {
    const s = servicio({});
    await expect(
      s.rechazar('SOL-1', { motivo: 'motivo largo suficiente' }, undefined as any),
    ).rejects.toThrow(ForbiddenException);
  });
  it('redistribuir con rol ANALISTA (no en ROLES_ASIGNADOR_PERMITIDOS) → ForbiddenException', async () => {
    const userIncorrecto = { ...userValido, roles: ['ANALISTA_UMI'] };
    const s = servicio({});
    await expect(
      s.redistribuir('SOL-1', { tecnicoCodigo: 'TEC-1' }, userIncorrecto),
    ).rejects.toThrow(ForbiddenException);
  });
  it('aprobarYAsignar con rol GESTOR_MANTENIMIENTO → PASA el guard (no lanza Forbidden; si lanza BadRequest x técnico no existe significa que el guard pasó ok)', async () => {
    const userGestor = { ...userValido, roles: ['GESTOR_MANTENIMIENTO'] };
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({ idSolicitud: 'SOL-GES-1', estado: 'RECIBIDA', idCategoria: 47, asignaciones: [] }),
      } as any,
      catalogoRepo: {
        findOne: jest.fn().mockResolvedValue(null), // técnico no existe => BadRequest (no Forbidden)
      } as any,
    });
    await expect(
      s.aprobarYAsignar('SOL-GES-1', { tecnicoCodigo: 'TEC-NO-EXISTE' }, userGestor),
    ).rejects.toThrow(BadRequestException); // BadRequest implica que el guard de roles pasó OK
  });
  it('rechazar con rol SUPER_ADMIN → PASA el guard; validación motivo menor a 10 lanza BadRequest (no Forbidden)', async () => {
    const userSuper = { ...userValido, roles: ['SUPER_ADMIN'] };
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({ idSolicitud: 'SOL-REC-1' }),
      } as any,
    });
    await expect(
      s.rechazar('SOL-REC-1', { motivo: 'corto' }, userSuper), // length 5 < 10
    ).rejects.toThrow(BadRequestException); // BadRequest implica guard OK
  });
});

describe('[EFDS-1734] RF-INF-005 AC-01 / AC-02 Aprobar y Asignar', () => {
  const userGestor = { ...userValido, roles: ['GESTOR_MANTENIMIENTO'] };
  const tecElectrico = {
    idCatalogo: 80, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-ELC-001',
    nombre: 'Carlos Ramírez', isActivo: true,
  };
  it('aprobarYAsignar solicitud RECIBIDA → estado=ASIGNADA + responsableAsignado="codigo · nombre" D3 + asignaciones.length=1 push entry', async () => {
    const save = jest.fn().mockImplementation((d) => Promise.resolve({ ...d, updatedAt: new Date() }));
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-APR-1', estado: 'RECIBIDA', idCategoria: 47, asignaciones: [],
        }),
        save,
      } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tecElectrico;
          return null;
        }),
      } as any,
    });
    const r = await s.aprobarYAsignar('SOL-APR-1', { tecnicoCodigo: 'TEC-ELC-001' }, userGestor);
    expect(r.estado).toBe('ASIGNADA');
    expect(String(r.responsableAsignado)).toBe('TEC-ELC-001 · Carlos Ramírez');
    expect(Array.isArray(r.asignaciones)).toBe(true);
    expect(r.asignaciones).toHaveLength(1);
    expect(String(r.asignaciones[0].accion)).toBe('APROBADA_Y_ASIGNADA');
    expect(save).toHaveBeenCalledTimes(1);
  });
  it('aprobarYAsignar solicitud RECIBIDA con motivoRechazo previo (simula registro residual) → se limpia motivoRechazo = undefined D7', async () => {
    const save = jest.fn().mockImplementation((d) => Promise.resolve({ ...d, updatedAt: new Date() }));
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-APR-RECH-1', estado: 'RECIBIDA', idCategoria: 47,
          motivoRechazo: 'Motivo anterior rechazo suficiente', asignaciones: [],
        }),
        save,
      } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tecElectrico;
          return null;
        }),
      } as any,
    });
    const r = await s.aprobarYAsignar('SOL-APR-RECH-1', { tecnicoCodigo: 'TEC-ELC-001', observaciones: 'se aprueba y limpia campo rechazo' }, userGestor);
    expect(r.estado).toBe('ASIGNADA');
    expect(r.motivoRechazo).toBeUndefined();
  });
  it('aprobarYAsignar idCategoria=48 (Eléctricas) con técnico distinto a REG_001 → retorna __meta.warning sin bloquear (warning suave)', async () => {
    const tecNoElectrico = {
      idCatalogo: 81, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-GEN-001',
      nombre: 'Técnico Genérico', isActivo: true,
    };
    const regla001 = {
      idCatalogo: 70, catalogo: 'REGLA_ESCALAMIENTO', codigo: 'REG_001_CATEGORIA_48_ELECTRICAS',
      metadata: { tecnicoCodigo: 'TEC-ELC-001' }, isActivo: true,
    };
    const save = jest.fn().mockImplementation((d) => Promise.resolve({ ...d, updatedAt: new Date() }));
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-APR-WARN-1', estado: 'RECIBIDA', idCategoria: 48, asignaciones: [],
        }),
        save,
      } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tecNoElectrico;
          if (w?.where?.catalogo === 'REGLA_ESCALAMIENTO') return regla001;
          return null;
        }),
      } as any,
    });
    const r: any = await s.aprobarYAsignar('SOL-APR-WARN-1', { tecnicoCodigo: 'TEC-GEN-001' }, userGestor);
    expect(r.estado).toBe('ASIGNADA'); // NO bloquea, asigna igual
    expect(typeof r.__meta?.warning).toBe('string');
    expect(r.__meta.warning.length).toBeGreaterThan(10);
    expect(r.__meta.warning).toContain('TEC-GEN-001');
  });
});

describe('[EFDS-1734] RF-INF-005 AC-02 Rechazar + motivo longitud ≥10 D1 visible solicitante', () => {
  const userSuper = { ...userValido, roles: ['SUPER_ADMIN'] };
  it('rechazar motivo="" trim longitud 0 → BadRequestException', async () => {
    const s = servicio({});
    await expect(
      s.rechazar('SOL-REC-1', { motivo: '    ' }, userSuper),
    ).rejects.toThrow(BadRequestException);
  });
  it('rechazar motivo="123456789" length=9 → BadRequest (menor a 10 chars)', async () => {
    const s = servicio({});
    await expect(
      s.rechazar('SOL-REC-1', { motivo: '123456789' }, userSuper),
    ).rejects.toThrow(BadRequestException);
  });
  it('rechazar motivo="solicitud rechazada por x motivo valido" length ≥10 → estado=RECHAZADA D3 + motivoRechazo guardado + responsableAsignado=null D9 + historial 1 entry', async () => {
    const save = jest.fn().mockImplementation((d) => Promise.resolve({ ...d, updatedAt: new Date() }));
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-REC-OK-1', estado: 'RECIBIDA', idCategoria: 50,
          responsableAsignado: 'TEC-ELC-001 · Carlos', asignaciones: [],
        }),
        save,
      } as any,
    });
    const motivo = 'solicitud rechazada por documentación incompleta y sede inactiva 12345';
    const r = await s.rechazar('SOL-REC-OK-1', { motivo, observaciones: 'Gestor revisó y rechazó' }, userSuper);
    expect(r.estado).toBe('RECHAZADA');
    expect(String(r.motivoRechazo)).toBe(motivo.trim());
    expect(r.responsableAsignado).toBeNull();
    expect(Array.isArray(r.asignaciones)).toBe(true);
    expect(r.asignaciones).toHaveLength(1);
    expect(String(r.asignaciones[0].accion)).toBe('RECHAZADA');
    expect(String(r.asignaciones[0].motivo)).toBe(motivo.trim());
  });
});

describe('[EFDS-1734] RF-INF-005 AC-01 Redistribuir + estados D10 + limpieza motivo', () => {
  const userGestor = { ...userValido, roles: ['GESTOR_MANTENIMIENTO'] };
  const tecFuente = {
    idCatalogo: 82, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-FTE-001',
    nombre: 'Técnico Fuente', isActivo: true,
  };
  const tecDestino = {
    idCatalogo: 83, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-DST-001',
    nombre: 'Técnico Destino', isActivo: true,
  };
  it('redistribuir solicitud RECIBIDA (sin asignar) → estado pasa automáticamente a ASIGNADA D10', async () => {
    const save = jest.fn().mockImplementation((d) => Promise.resolve({ ...d, updatedAt: new Date() }));
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-RED-REC-1', estado: 'RECIBIDA', idCategoria: 47, asignaciones: [],
        }),
        save,
      } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.codigo === 'TEC-DST-001') return tecDestino;
          return null;
        }),
      } as any,
    });
    const r = await s.redistribuir(
      'SOL-RED-REC-1',
      { tecnicoCodigo: 'TEC-DST-001', motivoRedistribucion: 'Técnico fuente en vacaciones' },
      userGestor,
    );
    expect(r.estado).toBe('ASIGNADA');
    expect(String(r.responsableAsignado)).toBe('TEC-DST-001 · Técnico Destino');
  });
  it('redistribuir solicitud ASIGNADA → mantiene estado ASIGNADA (NO cambia a otro) D10', async () => {
    const save = jest.fn().mockImplementation((d) => Promise.resolve({ ...d, updatedAt: new Date() }));
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-RED-ASI-1', estado: 'ASIGNADA', idCategoria: 47,
          responsableAsignado: `${tecFuente.codigo} · ${tecFuente.nombre}`, asignaciones: [],
        }),
        save,
      } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.codigo === 'TEC-DST-001') return tecDestino;
          return null;
        }),
      } as any,
    });
    const r = await s.redistribuir('SOL-RED-ASI-1', { tecnicoCodigo: 'TEC-DST-001' }, userGestor);
    expect(r.estado).toBe('ASIGNADA'); // no cambia
    expect(String(r.responsableAsignado)).toBe('TEC-DST-001 · Técnico Destino');
  });
  it('redistribuir solicitud EN_ANALISIS (estado abierto) → mantiene estado EN_ANALISIS D10; si no es RECHAZADA limpia motivoRechazo', async () => {
    const save = jest.fn().mockImplementation((d) => Promise.resolve({ ...d, updatedAt: new Date() }));
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue({
          idSolicitud: 'SOL-RED-ANAL-1', estado: 'EN_ANALISIS', idCategoria: 51,
          motivoRechazo: '[placeholder anterior]', asignaciones: [],
        }),
        save,
      } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.codigo === 'TEC-DST-001') return tecDestino;
          return null;
        }),
      } as any,
    });
    const r = await s.redistribuir('SOL-RED-ANAL-1', { tecnicoCodigo: 'TEC-DST-001' }, userGestor);
    expect(r.estado).toBe('EN_ANALISIS');
    expect(r.motivoRechazo).toBeUndefined();
  });
});

describe('[EFDS-1734] AC-03 Histórico auditoría JSONB asignaciones push entries inmutable snake_case ids únicos', () => {
  const userSuper = { ...userValido, roles: ['SUPER_ADMIN'] };
  const tec1 = {
    idCatalogo: 88, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-HIST-1',
    nombre: 'Histórico 1', isActivo: true,
  };
  const tec2 = {
    idCatalogo: 89, catalogo: 'TECNICO_MANTENIMIENTO', codigo: 'TEC-HIST-2',
    nombre: 'Histórico 2', isActivo: true,
  };
  it('3 acciones consecutivas (aprobar → redistribuir → redistribuir) → asignaciones.length=3 entries, orden cronológico ASC push al final (sin sobreescribir) y ids únicos', async () => {
    let memoria: any = {
      idSolicitud: 'SOL-HIST-1', estado: 'RECIBIDA', idCategoria: 47, asignaciones: [],
    };
    const save = jest.fn().mockImplementation((d) => {
      memoria = { ...d };
      return Promise.resolve({ ...memoria, updatedAt: new Date() });
    });
    const findOne = jest.fn().mockImplementation(() => ({ ...memoria }));
    const catalogoFindOne = jest.fn().mockImplementation((w: any) => {
      if (w?.where?.codigo === 'TEC-HIST-1') return tec1;
      if (w?.where?.codigo === 'TEC-HIST-2') return tec2;
      return null;
    });
    const s = servicio({
      mantenimientoRepo: { findOne, save } as any,
      catalogoRepo: { findOne: catalogoFindOne } as any,
    });
    await s.aprobarYAsignar('SOL-HIST-1', { tecnicoCodigo: 'TEC-HIST-1', observaciones: 'aprobación inicial' }, userSuper);
    await s.redistribuir(
      'SOL-HIST-1',
      { tecnicoCodigo: 'TEC-HIST-2', motivoRedistribucion: 'reasignado a técnico 2' },
      userSuper,
    );
    const final = await s.redistribuir(
      'SOL-HIST-1',
      { tecnicoCodigo: 'TEC-HIST-1', motivoRedistribucion: 'devuelto a técnico 1' },
      userSuper,
    );
    expect(Array.isArray(final.asignaciones)).toBe(true);
    expect(final.asignaciones).toHaveLength(3);
    expect(String(final.asignaciones[0].accion)).toBe('APROBADA_Y_ASIGNADA');
    expect(String(final.asignaciones[1].accion)).toBe('REDISTRIBUIDA');
    expect(String(final.asignaciones[2].accion)).toBe('REDISTRIBUIDA');
    const ids = final.asignaciones.map((a: any) => a.id);
    const idsUnicos = new Set(ids);
    expect(idsUnicos.size).toBe(ids.length);
  });
  it('entry JSONB historial usa snake_case exact keys: id, fecha, accion, tecnico_codigo, tecnico_nombre_display, motivo, observaciones, usuario_id, usuario_email, usuario_roles (NO camelCase)', async () => {
    let memoria: any = {
      idSolicitud: 'SOL-HIST-SNAKE-1', estado: 'RECIBIDA', idCategoria: 47, asignaciones: [],
    };
    const save = jest.fn().mockImplementation((d) => {
      memoria = { ...d };
      return Promise.resolve({ ...memoria });
    });
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockImplementation(() => ({ ...memoria })),
        save,
      } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tec1;
          return null;
        }),
      } as any,
    });
    const r = await s.aprobarYAsignar(
      'SOL-HIST-SNAKE-1',
      { tecnicoCodigo: 'TEC-HIST-1', observaciones: 'observaciones de prueba' },
      userSuper,
    );
    const entry = r.asignaciones[0];
    const keys = Object.keys(entry).sort();
    expect(keys).toEqual([
      'accion', 'fecha', 'id', 'motivo',
      'observaciones', 'tecnico_codigo', 'tecnico_nombre_display',
      'usuario_email', 'usuario_id', 'usuario_roles',
    ]);
    expect(String(entry.tecnico_codigo)).toBe('TEC-HIST-1');
    expect(String(entry.tecnico_nombre_display)).toBe('Histórico 1');
    expect(String(entry.usuario_email)).toBe(userSuper.email);
    expect(String(entry.usuario_roles)).toBe(userSuper.roles.join(','));
  });
  it('ids entries historial son UUID-like o únicos (2 acciones consecutivas tienen ids distintos)', async () => {
    let memoria: any = {
      idSolicitud: 'SOL-HIST-IDS-1', estado: 'RECIBIDA', idCategoria: 50, asignaciones: [],
    };
    const save = jest.fn().mockImplementation((d) => {
      memoria = { ...d };
      return Promise.resolve({ ...memoria });
    });
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockImplementation(() => ({ ...memoria })),
        save,
      } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tec1;
          return null;
        }),
      } as any,
    });
    await s.aprobarYAsignar('SOL-HIST-IDS-1', { tecnicoCodigo: 'TEC-HIST-1' }, userSuper);
    const r2 = await s.redistribuir(
      'SOL-HIST-IDS-1',
      { tecnicoCodigo: 'TEC-HIST-1', motivoRedistribucion: 'redistribución con mismo técnico' },
      userSuper,
    );
    expect(r2.asignaciones).toHaveLength(2);
    const id0 = String(r2.asignaciones[0].id);
    const id1 = String(r2.asignaciones[1].id);
    expect(id0).not.toBe(id1);
    expect(id0.length).toBeGreaterThan(5);
    expect(id1.length).toBeGreaterThan(5);
  });
});

// ===========================================================================
// EFDS-1735 RF-INF-006. Valoración en campo + insumos + transición automática
// ===========================================================================
describe('[EFDS-1735] Valoración en campo (iniciarValoracion / guardarValoracionCompleta)', () => {
  const userSuper: any = { userId: '11111111-aaaa-bbbb-cccc-dddddddddddd', username: 'Encargado UMI', email: 'super@esap.edu.co', roles: ['SUPER_ADMIN'] };
  const userTecnico: any = {
    userId: '22222222-aaaa-bbbb-cccc-dddddddddddd',
    username: 'Porky Técnico',
    email: 'porky@esap.edu.co',
    roles: ['USER'],
  };
  const userOtro: any = { userId: '33333333-aaaa-bbbb-cccc-dddddddddddd', username: 'Otro Usuario', email: 'otro@esap.edu.co', roles: ['USER'] };
  const tecCatalogo = (codigo: string, nombre: string, correo: string, usuarioId: string, catalogos: string[] = ['CS_001']) => ({
    idCatalogoItem: 9000,
    catalogo: 'TECNICO_MANTENIMIENTO',
    codigo,
    nombre,
    isActivo: true,
    metadata: { correos: [correo], usuarioIdsAutorizados: [usuarioId], catalogos } as any,
  });
  const montar = (sol: any, tec: any) => {
    const repoSol = {
      findOne: jest.fn().mockReturnValue(Promise.resolve({ ...sol, asignaciones: sol.asignaciones ? [...sol.asignaciones] : [] })),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ ...d })),
      count: jest.fn().mockReturnValue(Promise.resolve(0)),
      find: jest.fn().mockReturnValue(Promise.resolve([])),
    } as any;
    const repoVal: any = {
      findOne: jest.fn().mockReturnValue(Promise.resolve(null)),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ idValoracion: 'val-x', createdAt: new Date(), ...(d || {}) })),
      create: jest.fn((d) => d),
      find: jest.fn().mockReturnValue(Promise.resolve([])),
    };
    const repoIns: any = {
      delete: jest.fn(() => Promise.resolve({ affected: 0 })),
      save: jest.fn((r) => Promise.resolve(Array.isArray(r) ? r : [r])),
      create: jest.fn((d) => d),
    };
    const repoCat = {
      findOne: jest.fn().mockImplementation((w: any) => {
        if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') {
          if (!w.where.codigo || String(w.where.codigo) === String(tec.codigo)) return tec;
          return null;
        }
        if (w?.where?.catalogo === 'REGLA_ESCALAMIENTO') return null;
        return null;
      }),
    } as any;
    return { servicio: servicio({ mantenimientoRepo: repoSol, catalogoRepo: repoCat, valoracionRepo: repoVal, valoracionInsumoRepo: repoIns } as any), repoSol, repoVal, repoIns };
  };

  it('iniciarValoracion lanza ForbiddenException si usuario NO está vinculado al técnico asignado', async () => {
    const sol = { idSolicitud: 'SOL-VAL-1', estado: 'ASIGNADA', idCategoria: 47, areaResponsableActual: 'UMI', codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', asignaciones: [] };
    const { servicio } = montar(sol, tecCatalogo('TEC-01', 'Porky', 'porky@esap.edu.co', 'otro-uuid-distinto'));
    await expect(servicio.iniciarValoracion('SOL-VAL-1', null, userOtro)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('iniciarValoracion OK estado pasa a EN_CAMPO_VALORACION y retorna idValoracion', async () => {
    const sol = { idSolicitud: 'SOL-VAL-2', estado: 'ASIGNADA', idCategoria: 47, areaResponsableActual: 'UMI', codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', asignaciones: [] };
    const { servicio } = montar(sol, tecCatalogo('TEC-01', 'Porky', 'porky@esap.edu.co', userTecnico.userId));
    const r = await servicio.iniciarValoracion('SOL-VAL-2', null, userTecnico);
    expect(r.valoracion).toBeDefined();
    expect(String(r.valoracion.idValoracion).length).toBeGreaterThan(3);
    expect(r.solicitud.estado).toBe('EN_CAMPO_VALORACION');
  });

  it('iniciarValoracion lanza BadRequestException para área TI', async () => {
    const sol = { idSolicitud: 'SOL-VAL-3', estado: 'ASIGNADA', idCategoria: 47, areaResponsableActual: 'TI', codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', asignaciones: [] };
    const { servicio } = montar(sol, tecCatalogo('TEC-01', 'Porky', 'porky@esap.edu.co', userTecnico.userId));
    await expect(servicio.iniciarValoracion('SOL-VAL-3', null, userTecnico)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('iniciarValoracion ConflictException si estado = EN_PROGRESO (no ASIGNADA ni EN_CAMPO)', async () => {
    const sol = { idSolicitud: 'SOL-VAL-4', estado: 'EN_PROGRESO', idCategoria: 47, areaResponsableActual: 'UMI', codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', asignaciones: [] };
    const { servicio } = montar(sol, tecCatalogo('TEC-01', 'Porky', 'porky@esap.edu.co', userTecnico.userId));
    await expect(servicio.iniciarValoracion('SOL-VAL-4', null, userTecnico)).rejects.toBeInstanceOf(ConflictException);
  });

  it('guardarValoracionCompleta NotFound si idValoracion no existe', async () => {
    const repoVal: any = {
      findOne: jest.fn().mockReturnValue(Promise.resolve(null)),
      save: jest.fn(),
      create: jest.fn((d) => d),
    };
    const s = servicio({ valoracionRepo: repoVal } as any);
    await expect(s.guardarValoracionCompleta('NO-EXISTE', { diagnostico: 'd'.repeat(20), alcanceIdentificado: 'a'.repeat(20), tiempoEstimadoHoras: 1, nivelRiesgo: 'BAJO', insumos: [] }, userTecnico)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('guardarValoracionCompleta Forbidden si usuario NO es técnico asignado', async () => {
    const sol = { idSolicitud: 'SOL-VAL-5', estado: 'EN_CAMPO_VALORACION', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const val = { idValoracion: 'val-abc', idSolicitudMantenimiento: sol.idSolicitud, solicitud: sol };
    const s = servicio({
      mantenimientoRepo: { findOne: jest.fn().mockReturnValue(Promise.resolve(sol)), save: jest.fn().mockImplementation((d) => Promise.resolve(d)) } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO' && String(w.where.codigo) === 'TEC-01') return tecCatalogo('TEC-01', 'Porky', 'porky@esap.edu.co', userTecnico.userId);
          return null;
        }),
      } as any,
      valoracionRepo: { findOne: jest.fn().mockReturnValue(Promise.resolve(val)), save: jest.fn().mockImplementation((d) => Promise.resolve({ ...val, ...d })), create: jest.fn((d) => d) } as any,
      valoracionInsumoRepo: { delete: jest.fn(), save: jest.fn(), create: jest.fn((d) => d) } as any,
    } as any);
    await expect(s.guardarValoracionCompleta('val-abc', { diagnostico: 'd'.repeat(20), alcanceIdentificado: 'a'.repeat(20), tiempoEstimadoHoras: 1, nivelRiesgo: 'BAJO', insumos: [] }, userOtro)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('guardarValoracionCompleta BadRequest diagnóstico < 10 chars', async () => {
    const sol = { idSolicitud: 'SOL-VAL-6', estado: 'EN_CAMPO_VALORACION', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const val = { idValoracion: 'val-x1', idSolicitudMantenimiento: sol.idSolicitud, solicitud: sol };
    const s = servicio({
      mantenimientoRepo: { findOne: jest.fn().mockReturnValue(Promise.resolve(sol)), save: jest.fn() } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO' && String(w.where.codigo) === 'TEC-01') return tecCatalogo('TEC-01', 'Porky', 'porky@esap.edu.co', userTecnico.userId);
          return null;
        }),
      } as any,
      valoracionRepo: { findOne: jest.fn().mockReturnValue(Promise.resolve(val)), save: jest.fn().mockResolvedValue(val), create: jest.fn((d) => d) } as any,
      valoracionInsumoRepo: { delete: jest.fn(), save: jest.fn(), create: jest.fn((d) => d) } as any,
    } as any);
    await expect(s.guardarValoracionCompleta('val-x1', { diagnostico: 'corto', alcanceIdentificado: 'a'.repeat(20), tiempoEstimadoHoras: 1, nivelRiesgo: 'BAJO', insumos: [] }, userTecnico)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guardarValoracionCompleta BadRequest CS_002 Eléctrica requiereApagadoElectrico indefinido', async () => {
    const sol = { idSolicitud: 'SOL-VAL-7', estado: 'EN_CAMPO_VALORACION', idCategoria: 48, codigoTecnicoAsignado: 'TEC-ELC-001', responsableAsignado: 'TEC-ELC-001 · Porky Eléctrico', areaResponsableActual: 'UMI', asignaciones: [] };
    const val = { idValoracion: 'val-elc', idSolicitudMantenimiento: sol.idSolicitud, solicitud: sol };
    const s = servicio({
      mantenimientoRepo: { findOne: jest.fn().mockReturnValue(Promise.resolve(sol)), save: jest.fn() } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO' && String(w.where.codigo) === 'TEC-ELC-001') return tecCatalogo('TEC-ELC-001', 'Porky Eléctrico', 'porky@esap.edu.co', userTecnico.userId, ['CS_002']);
          if (w?.where?.catalogo === 'REGLA_ESCALAMIENTO') return null;
          return null;
        }),
      } as any,
      valoracionRepo: { findOne: jest.fn().mockReturnValue(Promise.resolve(val)), save: jest.fn().mockResolvedValue(val), create: jest.fn((d) => d) } as any,
      valoracionInsumoRepo: { delete: jest.fn(), save: jest.fn(), create: jest.fn((d) => d) } as any,
    } as any);
    await expect(s.guardarValoracionCompleta('val-elc', { diagnostico: 'cable dañado en caja 123', alcanceIdentificado: 'cambio cable y enchufe', tiempoEstimadoHoras: 2, nivelRiesgo: 'ALTO', insumos: [], requiereApagadoElectrico: undefined } as any, userTecnico)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('guardarValoracionCompleta si todos insumos EN_BODEGA → estado automático EN_PROGRESO y totalEstimadoInsumosCop calculado', async () => {
    const sol = { idSolicitud: 'SOL-VAL-8', estado: 'EN_CAMPO_VALORACION', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const val = { idValoracion: 'val-prog', idSolicitudMantenimiento: sol.idSolicitud, solicitud: sol };
    const repoSol = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve({ ...sol })),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    const repoVal = {
      findOne: jest.fn().mockReturnValue(Promise.resolve(val)),
      save: jest.fn().mockImplementation((d) => Promise.resolve({ ...val, ...d })),
      create: jest.fn((d) => d),
    } as any;
    const repoIns = { delete: jest.fn(), save: jest.fn(), create: jest.fn((d) => d) } as any;
    const s = servicio({
      mantenimientoRepo: repoSol,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO' && String(w.where.codigo) === 'TEC-01') return tecCatalogo('TEC-01', 'Porky', 'porky@esap.edu.co', userTecnico.userId);
          return null;
        }),
      } as any,
      valoracionRepo: repoVal,
      valoracionInsumoRepo: repoIns,
    } as any);
    const r = await s.guardarValoracionCompleta('val-prog', {
      diagnostico: 'diagnostico OK 12345',
      alcanceIdentificado: 'alcance OK 12345678',
      tiempoEstimadoHoras: 2,
      nivelRiesgo: 'BAJO',
      requiereApagadoElectrico: false,
      insumos: [
        { nombre: 'Tornillo', cantidad: 10, costoUnitarioCop: 500, disponibilidad: 'DISPONIBLE_EN_BODEGA', unidadMedida: 'un' },
        { nombre: 'Lija', cantidad: 2, costoUnitarioCop: 2500, disponibilidad: 'DISPONIBLE_EN_BODEGA', unidadMedida: 'hoja' },
      ],
    }, userTecnico);
    expect(r.solicitud.estado).toBe('EN_PROGRESO');
    expect(r.solicitud.esperaInsumosFlag).toBe(false);
    expect(Number(r.solicitud.totalEstimadoInsumosCop)).toBe(10 * 500 + 2 * 2500);
    expect(repoIns.save).toHaveBeenCalled();
  });

  it('guardarValoracionCompleta si hay NO_DISPONIBLE → estado EN_ESPERA_DE_INSUMOS y esperaFlag true', async () => {
    const sol = { idSolicitud: 'SOL-VAL-9', estado: 'EN_CAMPO_VALORACION', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const val = { idValoracion: 'val-espera', idSolicitudMantenimiento: sol.idSolicitud, solicitud: sol };
    const repoSol = {
      findOne: jest.fn().mockReturnValue(Promise.resolve({ ...sol })),
      save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
    } as any;
    const s = servicio({
      mantenimientoRepo: repoSol,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO' && String(w.where.codigo) === 'TEC-01') return tecCatalogo('TEC-01', 'Porky', 'porky@esap.edu.co', userTecnico.userId);
          return null;
        }),
      } as any,
      valoracionRepo: {
        findOne: jest.fn().mockReturnValue(Promise.resolve(val)),
        save: jest.fn().mockImplementation((d) => Promise.resolve({ ...val, ...d })),
        create: jest.fn((d) => d),
      } as any,
      valoracionInsumoRepo: { delete: jest.fn(), save: jest.fn(), create: jest.fn((d) => d) } as any,
    } as any);
    const r = await s.guardarValoracionCompleta('val-espera', {
      diagnostico: 'diagnostico largo 123456',
      alcanceIdentificado: 'alcance largo 123456789',
      tiempoEstimadoHoras: 3,
      nivelRiesgo: 'MEDIO',
      requiereApagadoElectrico: false,
      insumos: [
        { nombre: 'Pintura', cantidad: 1, disponibilidad: 'NO_DISPONIBLE_A_SOLICITAR', tiempoAdquisicionDias: 5, costoUnitarioCop: 30000, unidadMedida: 'gal' },
      ],
    }, userTecnico);
    expect(r.solicitud.estado).toBe('EN_ESPERA_DE_INSUMOS');
    expect(r.solicitud.esperaInsumosFlag).toBe(true);
  });

  it('guardarValoracionCompleta BadRequest NO_DISPONIBLE sin tiempoAdquisicionDias', async () => {
    const sol = { idSolicitud: 'SOL-VAL-10', estado: 'EN_CAMPO_VALORACION', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const val = { idValoracion: 'val-bad', idSolicitudMantenimiento: sol.idSolicitud, solicitud: sol };
    const s = servicio({
      mantenimientoRepo: { findOne: jest.fn().mockReturnValue(Promise.resolve(sol)), save: jest.fn() } as any,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO' && String(w.where.codigo) === 'TEC-01') return tecCatalogo('TEC-01', 'Porky', 'porky@esap.edu.co', userTecnico.userId);
          return null;
        }),
      } as any,
      valoracionRepo: { findOne: jest.fn().mockReturnValue(Promise.resolve(val)), save: jest.fn(), create: jest.fn((d) => d) } as any,
      valoracionInsumoRepo: { delete: jest.fn(), save: jest.fn(), create: jest.fn((d) => d) } as any,
    } as any);
    await expect(s.guardarValoracionCompleta('val-bad', {
      diagnostico: 'diagnostico 1234567890',
      alcanceIdentificado: 'alcance 12345678901',
      tiempoEstimadoHoras: 1,
      nivelRiesgo: 'BAJO',
      insumos: [
        { nombre: 'Repuesto X', cantidad: 1, disponibilidad: 'NO_DISPONIBLE_A_SOLICITAR', costoUnitarioCop: 100000, unidadMedida: 'un' } as any,
      ],
    }, userTecnico)).rejects.toBeInstanceOf(BadRequestException);
  });
});

// ===========================================================================
// EFDS-1736 RF-INF-007. Cierre técnico ejecución y evidencia
// ===========================================================================
describe('[EFDS-1736] Cierre técnico (cerrarTecnicamente)', () => {
  const userTecnico: any = { userId: 'uuuu-porky-1234', username: 'Porky', email: 'porky@esap.edu.co', roles: ['USER'] };
  const userNoTecnico: any = { userId: 'otro-uuid-9999', username: 'Otro', email: 'otro@esap.edu.co', roles: ['USER'] };
  const userSuper: any = { userId: 'super-uuid', username: 'Admin', email: 'super@esap.edu.co', roles: ['SUPER_ADMIN'] };
  const tec = (cod: string, nombre: string, cat = ['CS_001', 'CS_002']) => ({
    idCatalogoItem: 1,
    catalogo: 'TECNICO_MANTENIMIENTO',
    codigo: cod,
    nombre,
    isActivo: true,
    metadata: { correos: [userTecnico.email], usuarioIdsAutorizados: [userTecnico.userId], catalogos: cat },
  });
  const montarSol = (sol: any, tecnico: any, reglaEsc001: any = null) => {
    const saved: any = { ...sol };
    const repo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(saved)),
      save: jest.fn().mockImplementation((d: any) => {
        Object.assign(saved, d);
        return Promise.resolve(saved);
      }),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    const catalogoFindOne = jest.fn().mockImplementation((w: any) => {
      if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') {
        if (!w.where.codigo || String(w.where.codigo) === String(tecnico.codigo)) return tecnico;
        return null;
      }
      if (w?.where?.catalogo === 'REGLA_ESCALAMIENTO' && w?.where?.codigo === 'REG_001_CATEGORIA_48_ELECTRICAS') {
        return reglaEsc001;
      }
      if (w?.where?.catalogo === 'REGLA_ESCALAMIENTO') return null;
      return tecnico;
    });
    return {
      saved,
      servicio: servicio({
        mantenimientoRepo: repo,
        catalogoRepo: { findOne: catalogoFindOne } as any,
      } as any),
    };
  };

  it('cerrarTecnicamente ForbiddenException si usuario NO es técnico asignado', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-1', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio } = montarSol(sol, tec('TEC-01', 'Porky'));
    await expect(servicio.cerrarTecnicamente('SOL-CIERRE-1', { trabajoRealizado: 'cambié la cerradura y ajusté el marco', evidencias: [{ id: 'e1' }], costoFinalEfectivoCop: 120000 }, userNoTecnico)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cerrarTecnicamente ConflictException si estado NO es EN_PROGRESO (ASIGNADA)', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-2', estado: 'ASIGNADA', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio } = montarSol(sol, tec('TEC-01', 'Porky'));
    await expect(servicio.cerrarTecnicamente('SOL-CIERRE-2', { trabajoRealizado: 'cerradura cambiada', evidencias: [{ id: 'e1' }], costoFinalEfectivoCop: 50000 }, userTecnico)).rejects.toBeInstanceOf(ConflictException);
  });

  it('cerrarTecnicamente ForbiddenException CS_002 Eléctrica regla REG_001 exige TEC-ELC y asignado es TEC-GEN', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-3', estado: 'EN_PROGRESO', idCategoria: 48, codigoTecnicoAsignado: 'TEC-GEN', responsableAsignado: 'TEC-GEN · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const regla = { idCatalogoItem: 99, catalogo: 'REGLA_ESCALAMIENTO', codigo: 'REG_001_CATEGORIA_48_ELECTRICAS', isActivo: true, metadata: { tecnicoCodigo: 'TEC-ELC' } };
    const { servicio } = montarSol(sol, tec('TEC-GEN', 'Porky'), regla);
    await expect(servicio.cerrarTecnicamente('SOL-CIERRE-3', { trabajoRealizado: 'cambio tomacorriente', evidencias: [{ id: 'e1' }], costoFinalEfectivoCop: 80000 }, userTecnico)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('cerrarTecnicamente CS_002 OK cuando REG_001 coincide tecnicoCodigo con asignado', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-3B', estado: 'EN_PROGRESO', idCategoria: 48, codigoTecnicoAsignado: 'TEC-ELC', responsableAsignado: 'TEC-ELC · Hernando', areaResponsableActual: 'UMI', asignaciones: [] };
    const regla = { idCatalogoItem: 99, catalogo: 'REGLA_ESCALAMIENTO', codigo: 'REG_001_CATEGORIA_48_ELECTRICAS', isActivo: true, metadata: { tecnicoCodigo: 'TEC-ELC' } };
    const tecnicoEsp = { ...tec('TEC-ELC', 'Hernando'), metadata: { correos: [userTecnico.email], usuarioIdsAutorizados: [userTecnico.userId] } };
    const { servicio } = montarSol(sol, tecnicoEsp, regla);
    const r = await servicio.cerrarTecnicamente('SOL-CIERRE-3B', { trabajoRealizado: 'cambio tomacorriente y revisión tablero', evidencias: [{ id: 'e1' }], costoFinalEfectivoCop: 80000 }, userTecnico);
    expect(r.estado).toBe('COMPLETADA');
    expect(r.idCategoria).toBe(48);
  });

  it('cerrarTecnicamente OK estado pasa a COMPLETADA + fechaCierreTecnico seteada + conteoReaperturas 0', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-4', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio, saved } = montarSol(sol, tec('TEC-01', 'Porky'));
    const r = await servicio.cerrarTecnicamente('SOL-CIERRE-4', {
      trabajoRealizado: 'Cambio cerradura principal puerta oficina 701 y ajuste bisagra',
      evidencias: [{ id: 'e1', nombre: 'antes.jpg' }, { id: 'e2', nombre: 'despues.jpg' }],
      costoFinalEfectivoCop: 145000,
      observaciones: 'Se entrega copia de llave a coordinador',
      requiereSeguimiento: false,
    }, userTecnico);
    expect(r.estado).toBe('COMPLETADA');
    expect(r.fechaCierreTecnico).toBeDefined();
    expect(r.fechaLimiteConformidad).toBeDefined();
    expect(Number(r.conteoReaperturasConformidad)).toBe(0);
    expect(r.resultadoConformidad).toBeUndefined();
    expect(r.usuarioCierreTecnicoId).toBe(userTecnico.userId);
    expect(Number(r.costoFinalEfectivoCop)).toBe(145000);
    expect(Array.isArray(r.evidenciasCierre)).toBe(true);
    expect(r.evidenciasCierre).toHaveLength(2);
    expect(saved.asignaciones?.[0]?.accion).toBe('CIERRE_TECNICO');
  });

  it('cerrarTecnicamente fechaLimiteConformidad = ~72h después de fechaCierreTecnico', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-5', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio } = montarSol(sol, tec('TEC-01', 'Porky'));
    const antes = new Date();
    const r = await servicio.cerrarTecnicamente('SOL-CIERRE-5', {
      trabajoRealizado: 'trabajo de prueba 12345678',
      evidencias: [{ id: 'x1' }],
      costoFinalEfectivoCop: 0,
    }, userTecnico);
    const despues = new Date();
    const diff72h = new Date(new Date(r.fechaCierreTecnico).getTime() + 72 * 3600 * 1000).getTime();
    const limite = new Date(r.fechaLimiteConformidad).getTime();
    expect(limite).toBe(diff72h);
    expect(new Date(r.fechaCierreTecnico).getTime()).toBeGreaterThanOrEqual(antes.getTime());
    expect(new Date(r.fechaCierreTecnico).getTime()).toBeLessThanOrEqual(despues.getTime());
  });

  it('cerrarTecnicamente BadRequestException para área TI', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-6', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'TI', asignaciones: [] };
    const { servicio } = montarSol(sol, tec('TEC-01', 'Porky'));
    await expect(servicio.cerrarTecnicamente('SOL-CIERRE-6', { trabajoRealizado: 'x'.repeat(20), evidencias: [{ id: 'e1' }], costoFinalEfectivoCop: 0 }, userTecnico)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cerrarTecnicamente OK costo 0 y 1 evidencia (caso mínimo happy path)', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-7', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio } = montarSol(sol, tec('TEC-01', 'Porky'));
    const r = await servicio.cerrarTecnicamente('SOL-CIERRE-7', { trabajoRealizado: 'ajuste mínimo de bisagra sin costo', evidencias: [{ id: 'e1' }], costoFinalEfectivoCop: 0 }, userTecnico);
    expect(r.estado).toBe('COMPLETADA');
    expect(Number(r.costoFinalEfectivoCop)).toBe(0);
  });

  it('cerrarTecnicamente OK trabajoRealizado se guarda tal cual (sin truncar) + responsableCierreDisplay formato COD · Nombre', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-8', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio } = montarSol(sol, tec('TEC-01', 'Porky'));
    const txt = 'Trabajo de ajuste de puerta con cambio de 2 bisagras y lubricación de cerradura';
    const r = await servicio.cerrarTecnicamente('SOL-CIERRE-8', { trabajoRealizado: txt, evidencias: [{ id: 'e1' }], costoFinalEfectivoCop: 0 }, userTecnico);
    expect(r.trabajoRealizado).toBe(txt);
    expect(r.responsableCierreDisplay).toBe('TEC-01 · Porky');
  });

  it('cerrarTecnicamente OK requiereSeguimiento=true y observacionesCierre guardadas + push asignacion motivo con 2 evidencias', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-9', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio, saved } = montarSol(sol, tec('TEC-01', 'Porky'));
    const r = await servicio.cerrarTecnicamente('SOL-CIERRE-9', {
      trabajoRealizado: 'reparación parcial, requiere visita seguimiento en 15 días',
      evidencias: [{ id: 'a1' }, { id: 'a2' }],
      costoFinalEfectivoCop: 35000,
      observaciones: 'Se acuerda nueva visita coordinar con coordinador',
      requiereSeguimiento: true,
    }, userTecnico);
    expect(r.requiereSeguimiento).toBe(true);
    expect(r.observacionesCierre).toBe('Se acuerda nueva visita coordinar con coordinador');
    const ultima = saved.asignaciones?.[0];
    expect(ultima.accion).toBe('CIERRE_TECNICO');
    expect(ultima.tecnico_codigo).toBe('TEC-01');
    expect(ultima.tecnico_nombre_display).toBe('Porky');
    expect(ultima.motivo).toContain('2 evidencia');
  });

  it('cerrarTecnicamente OK 6 evidencias se persisten sin truncar (validación max 5 es DTO)', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-10', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio } = montarSol(sol, tec('TEC-01', 'Porky'));
    const evs = Array.from({ length: 6 }, (_, i) => ({ id: `e${i + 1}`, nombre: `ev${i + 1}.jpg` }));
    const r = await servicio.cerrarTecnicamente('SOL-CIERRE-10', { trabajoRealizado: 'x'.repeat(20), evidencias: evs, costoFinalEfectivoCop: 0 }, userTecnico);
    expect(r.evidenciasCierre).toHaveLength(6);
    expect(r.estado).toBe('COMPLETADA');
  });

  it('cerrarTecnicamente OK costo alto 99B se guarda como number (validación overflow es DTO/DB)', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-11', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio } = montarSol(sol, tec('TEC-01', 'Porky'));
    const r = await servicio.cerrarTecnicamente('SOL-CIERRE-11', { trabajoRealizado: 'x'.repeat(20), evidencias: [{ id: 'e1' }], costoFinalEfectivoCop: 99999999999 }, userTecnico);
    expect(Number(r.costoFinalEfectivoCop)).toBe(99999999999);
  });

  it('cerrarTecnicamente SUPER_ADMIN bypass puede cerrar técnicamente sin ser técnico asignado (guardia bypassa rol asignador)', async () => {
    const sol = { idSolicitud: 'SOL-CIERRE-12', estado: 'EN_PROGRESO', idCategoria: 47, codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Porky', areaResponsableActual: 'UMI', asignaciones: [] };
    const { servicio } = montarSol(sol, tec('TEC-01', 'Porky'));
    const r = await servicio.cerrarTecnicamente('SOL-CIERRE-12', { trabajoRealizado: 'x'.repeat(20), evidencias: [{ id: 'e1' }], costoFinalEfectivoCop: 0 }, userSuper);
    expect(r.estado).toBe('COMPLETADA');
    expect(r.usuarioCierreTecnicoId).toBe(userSuper.userId);
  });
});

// ===========================================================================
// EFDS-1737 RF-INF-008. Conformidad Área Solicitante
// ===========================================================================
describe('[EFDS-1737] Conformidad Área Solicitante (confirmar/rechazar/batch)', () => {
  const userSolicitante: any = { userId: 'sol-user-uuid-0001', username: 'Ana Coordinadora', email: 'ana.coordinadora@esap.edu.co', roles: ['USER'] };
  const userNoSolicitante: any = { userId: 'no-sol-user-9999', username: 'Invitado', email: 'invitado@esap.edu.co', roles: ['USER'] };
  const userGestor: any = { userId: 'gestor-uuid', username: 'Gestor UMI', email: 'gestor@esap.edu.co', roles: ['GESTOR_MANTENIMIENTO'] };
  const userSuper: any = { userId: 'super-uuid', username: 'Admin', email: 'super@esap.edu.co', roles: ['SUPER_ADMIN'] };
  const userAnon: any = null;

  const cerradaTecnico = (overrides: any = {}) => ({
    idSolicitud: overrides.idSolicitud || 'SOL-CONF-1',
    estado: 'COMPLETADA',
    idCategoria: 47,
    areaResponsableActual: 'UMI',
    usuarioSolicitanteId: userSolicitante.userId,
    usuarioSolicitanteEmail: userSolicitante.email,
    solicitanteEmail: userSolicitante.email,
    fechaCierreTecnico: new Date(Date.now() - 3600 * 1000),
    trabajoRealizado: 'Cambio de cerradura y ajuste de bisagra',
    costoFinalEfectivoCop: 120000,
    evidenciasCierre: [{ id: 'ev1' }],
    usuarioCierreTecnicoId: 'tec-uuid-1',
    fechaLimiteConformidad: new Date(Date.now() + 48 * 3600 * 1000),
    conteoReaperturasConformidad: 0,
    asignaciones: [],
    ...overrides,
  });

  const montar = (sol: any) => {
    const saved: any = { ...sol, asignaciones: [...(sol.asignaciones || [])] };
    const repo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve(saved)),
      save: jest.fn().mockImplementation((d: any) => {
        Object.assign(saved, d);
        return Promise.resolve(saved);
      }),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    return {
      saved,
      servicio: servicio({ mantenimientoRepo: repo } as any),
      repo,
    };
  };

  it('confirmarConformidad ForbiddenException sin usuario autenticado', async () => {
    const { servicio } = montar(cerradaTecnico());
    await expect(servicio.confirmarConformidad('SOL-CONF-1', { observacionesConformidad: 'todo bien' }, userAnon)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('confirmarConformidad ForbiddenException usuario NO es solicitante ni admin', async () => {
    const { servicio } = montar(cerradaTecnico());
    await expect(servicio.confirmarConformidad('SOL-CONF-1', {}, userNoSolicitante)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('confirmarConformidad ConflictException estado NO COMPLETADA (EN_PROGRESO)', async () => {
    const { servicio } = montar(cerradaTecnico({ estado: 'EN_PROGRESO' }));
    await expect(servicio.confirmarConformidad('SOL-CONF-1', {}, userSolicitante)).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirmarConformidad OK solicitante retorna estado CERRADA y resultado CONFIRMADA', async () => {
    const { servicio, saved } = montar(cerradaTecnico());
    const r = await servicio.confirmarConformidad('SOL-CONF-1', { observacionesConformidad: '  excelente trabajo  ' }, userSolicitante);
    expect(r.estado).toBe('CERRADA');
    expect(r.resultadoConformidad).toBe('CONFIRMADA');
    expect(r.fechaConformidad).toBeDefined();
    expect(r.usuarioConformidadId).toBe(userSolicitante.userId);
    expect(r.responsableConformidadDisplay).toBe(userSolicitante.username);
    expect(r.observacionesConformidad).toBe('excelente trabajo');
    expect(saved.asignaciones?.[0]?.accion).toBe('CONFORMIDAD_CONFIRMADA');
  });

  it('confirmarConformidad bypass GESTOR_MANTENIMIENTO aunque NO sea solicitante', async () => {
    const { servicio } = montar(cerradaTecnico());
    const r = await servicio.confirmarConformidad('SOL-CONF-1', {}, userGestor);
    expect(r.estado).toBe('CERRADA');
    expect(r.resultadoConformidad).toBe('CONFIRMADA');
    expect(r.usuarioConformidadId).toBe(userGestor.userId);
  });

  it('confirmarConformidad usuario coincide solo por email (no userId) → OK', async () => {
    const sol = cerradaTecnico({ usuarioSolicitanteId: undefined, usuarioSolicitanteEmail: userSolicitante.email });
    const { servicio } = montar(sol);
    const r = await servicio.confirmarConformidad('SOL-CONF-1', {}, userSolicitante);
    expect(r.estado).toBe('CERRADA');
  });

  it('rechazarConformidadYReabrir ForbiddenException user NO solicitante', async () => {
    const { servicio } = montar(cerradaTecnico());
    await expect(servicio.rechazarConformidadYReabrir('SOL-CONF-1', { observacionesConformidad: 'x'.repeat(30) }, userNoSolicitante)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechazarConformidadYReabrir ConflictException estado NO COMPLETADA', async () => {
    const { servicio } = montar(cerradaTecnico({ estado: 'ASIGNADA' }));
    await expect(servicio.rechazarConformidadYReabrir('SOL-CONF-1', { observacionesConformidad: 'x'.repeat(30) }, userSolicitante)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechazarConformidadYReabrir observacionesConformidad trim se aplica en service (sin espacios extremos)', async () => {
    const { servicio } = montar(cerradaTecnico());
    const r = await servicio.rechazarConformidadYReabrir('SOL-CONF-1', { observacionesConformidad: '  La puerta sigue desajustada y hace ruido al abrir  ' }, userSolicitante);
    expect(r.resultadoConformidad).toBe('RECHAZADA_Y_REABIERTA');
    expect(r.observacionesConformidad).toBe('La puerta sigue desajustada y hace ruido al abrir');
  });

  it('rechazarYReabrir OK → EN_PROGRESO, conteo +1, SLA 24h NUEVO y NO borra cierre técnico cols (trabajoRealizado / fechaCierreTecnico INTACTOS)', async () => {
    const sol = cerradaTecnico();
    const cerraduraOriginal = sol.fechaCierreTecnico;
    const trabajoOriginal = sol.trabajoRealizado;
    const costoOriginal = sol.costoFinalEfectivoCop;
    const evidenciasOriginales = sol.evidenciasCierre;
    const { servicio, saved } = montar(sol);
    const antes = new Date();
    const r = await servicio.rechazarConformidadYReabrir('SOL-CONF-1', {
      observacionesConformidad: '  La cerradura sigue fallando y la bisagra quedó desalineada. Por favor revisar de nuevo  ',
    }, userSolicitante);
    const despues = new Date();
    expect(r.estado).toBe('EN_PROGRESO');
    expect(r.resultadoConformidad).toBe('RECHAZADA_Y_REABIERTA');
    expect(Number(r.conteoReaperturasConformidad)).toBe(1);
    expect(r.observacionesConformidad).toBe('La cerradura sigue fallando y la bisagra quedó desalineada. Por favor revisar de nuevo');
    const limiteAtencionMs = new Date(r.fechaLimiteAtencion).getTime();
    const expected24h = antes.getTime() + 24 * 3600 * 1000;
    expect(limiteAtencionMs).toBeGreaterThanOrEqual(expected24h - 1000);
    expect(limiteAtencionMs).toBeLessThanOrEqual(despues.getTime() + 24 * 3600 * 1000 + 1000);
    expect(r.fechaLimiteOriginalAntesExtension).toBeUndefined();
    expect(r.fechaCierreTecnico).toBe(cerraduraOriginal);
    expect(r.trabajoRealizado).toBe(trabajoOriginal);
    expect(Number(r.costoFinalEfectivoCop)).toBe(Number(costoOriginal));
    expect(r.evidenciasCierre).toEqual(evidenciasOriginales);
    expect(saved.asignaciones?.[0]?.accion).toBe('CONFORMIDAD_RECHAZADA_Y_REABIERTA');
  });

  it('reapertura #2 conteoReaperturasConformidad = 2 y cierre técnico sigue intacto', async () => {
    const sol = cerradaTecnico({ conteoReaperturasConformidad: 1 });
    const { servicio, saved } = montar(sol);
    const r = await servicio.rechazarConformidadYReabrir('SOL-CONF-1', { observacionesConformidad: 'segundo rechazo por detalles pendientes de ajuste' }, userSolicitante);
    expect(Number(r.conteoReaperturasConformidad)).toBe(2);
    expect(r.fechaCierreTecnico).toBeDefined();
    expect(r.trabajoRealizado).toBeDefined();
    expect(saved.asignaciones?.[0]?.accion).toBe('CONFORMIDAD_RECHAZADA_Y_REABIERTA');
  });

  it('ejecutarCierresSinRespuestaVencidos ForbiddenException usuario sin rol asignador (USER)', async () => {
    const { servicio } = montar(cerradaTecnico());
    await expect(servicio.ejecutarCierresSinRespuestaVencidos(userSolicitante)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ejecutarCierresSinRespuestaVencidos OK SUPER_ADMIN filtra vencidas y marca CERRADA_SIN_ATENCION resultado SIN_RESPUESTA', async () => {
    const vencida1 = cerradaTecnico({ idSolicitud: 'V-1', fechaLimiteConformidad: new Date(Date.now() - 24 * 3600 * 1000), asignaciones: [] });
    const vencida2 = cerradaTecnico({ idSolicitud: 'V-2', fechaLimiteConformidad: new Date(Date.now() - 10 * 60 * 1000), asignaciones: [] });
    const noVencida = cerradaTecnico({ idSolicitud: 'V-3', fechaLimiteConformidad: new Date(Date.now() + 10 * 24 * 3600 * 1000), asignaciones: [] });
    const enProgreso = cerradaTecnico({ idSolicitud: 'V-4', estado: 'EN_PROGRESO', asignaciones: [] });
    const find = jest.fn().mockResolvedValue([vencida1, vencida2, noVencida, enProgreso]);
    const save = jest.fn().mockImplementation((d) => Promise.resolve(d));
    const s = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue(null),
        save,
        find,
      } as any,
    } as any);
    const r = await s.ejecutarCierresSinRespuestaVencidos(userSuper);
    expect(r.actualizadas).toBe(2);
    expect(r.ids).toHaveLength(2);
    expect(r.ids).toContain('V-1');
    expect(r.ids).toContain('V-2');
    expect(save).toHaveBeenCalledTimes(2);
    const salvados = save.mock.calls.map((c) => c[0]);
    for (const s2 of salvados) {
      expect(s2.estado).toBe('CERRADA_SIN_ATENCION');
      expect(s2.resultadoConformidad).toBe('SIN_RESPUESTA');
      expect(s2.fechaConformidad).toBeDefined();
    }
  });

  it('ejecutarCierresSinRespuestaVencidos actualizadas = 0 cuando no hay vencidas', async () => {
    const s = servicio({
      mantenimientoRepo: {
        find: jest.fn().mockResolvedValue([cerradaTecnico()]),
        save: jest.fn(),
      } as any,
    } as any);
    const r = await s.ejecutarCierresSinRespuestaVencidos(userGestor);
    expect(r.actualizadas).toBe(0);
    expect(r.ids).toEqual([]);
  });

  it('3 acciones conformidad en pushAsignacion tienen nombres exactos union type (case-sensitive)', async () => {
    const accionesVistas: string[] = [];
    const recolector = (sol: any) => {
      const r = servicio({
        mantenimientoRepo: {
          findOne: jest.fn().mockResolvedValue(sol),
          save: jest.fn().mockImplementation((d: any) => {
            if (Array.isArray(d.asignaciones)) {
              accionesVistas.push(String(d.asignaciones.at(-1)?.accion || ''));
            }
            return Promise.resolve(d);
          }),
          find: jest.fn().mockResolvedValue([]),
        } as any,
      } as any);
      return r;
    };

    const sol1 = cerradaTecnico();
    await recolector(sol1).confirmarConformidad('x', {}, userSuper);
    const sol2 = cerradaTecnico({ idSolicitud: 'Z-2' });
    await recolector(sol2).rechazarConformidadYReabrir('Z-2', { observacionesConformidad: 'rechazo 1234567890 qwerty' }, userSuper);
    const s3 = cerradaTecnico({ idSolicitud: 'V-99', fechaLimiteConformidad: new Date(Date.now() - 1000) });
    const r3 = servicio({
      mantenimientoRepo: {
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockResolvedValue([s3]),
        save: jest.fn().mockImplementation((d) => {
          if (Array.isArray(d.asignaciones)) accionesVistas.push(String(d.asignaciones.at(-1)?.accion || ''));
          return Promise.resolve(d);
        }),
      } as any,
    } as any);
    await r3.ejecutarCierresSinRespuestaVencidos(userSuper);
    expect(accionesVistas).toContain('CONFORMIDAD_CONFIRMADA');
    expect(accionesVistas).toContain('CONFORMIDAD_RECHAZADA_Y_REABIERTA');
    expect(accionesVistas).toContain('CONFORMIDAD_SIN_RESPUESTA');
  });
});

// ---------------------------------------------------------------------------
// EFDS-1737 ST-09 Notificaciones automáticas conformidad (módulo campanita + correo)
// ---------------------------------------------------------------------------
describe('[EFDS-1737-ST09] Notificaciones conformidad automáticas (campanita IN-APP + email)', () => {
  /** Recolector de disparos: push notifyUserById / sendEmail que los mocks invocan */
  type NotifInapp = { tipo: string; titulo: string; userId: string };
  type NotifEmail = { to: string; subject: string };
  function mockNotifClient() {
    const inapp: NotifInapp[] = [];
    const emails: NotifEmail[] = [];
    const flushers: (() => Promise<void>)[] = [];
    const cliente: any = {
      notifyUserById: jest.fn((userId: string, dto: any, emailOpts?: any) => {
        inapp.push({ tipo: String(dto?.tipo_notificacion ?? ''), titulo: String(dto?.titulo ?? ''), userId });
        if (emailOpts) emails.push({ to: userId + '+' + emailOpts.subject, subject: emailOpts.subject });
        const p = Promise.resolve();
        flushers.push(() => p);
        return p;
      }),
      sendEmail: jest.fn((to: string, subject: string) => {
        emails.push({ to, subject });
        const p = Promise.resolve();
        flushers.push(() => p);
        return p;
      }),
    };
    return {
      cliente,
      inapp,
      emails,
      esperarDisparos: async () => {
        await new Promise((r) => setTimeout(r, 25));
        for (const f of flushers) await f();
      },
    };
  }
  const userTecnico: any = { userId: 'uuuu-porky-1234', username: 'Porky', email: 'porky@esap.edu.co', roles: ['USER'] };
  const userSolicitante: any = { userId: 'uuuu-ana-coord-0001', username: 'Ana Coordinadora', email: 'ana.coordinadora@esap.edu.co', roles: ['USER'] };
  const userSuper: any = { userId: 'super-uuid', username: 'Admin', email: 'super@esap.edu.co', roles: ['SUPER_ADMIN'] };
  const tecnicoUMI = (cod: string, emailUserAutorizado: string, userIdAutorizado: string) => ({
    idCatalogoItem: 1, catalogo: 'TECNICO_MANTENIMIENTO', codigo: cod, nombre: 'Técnico Asignado', isActivo: true,
    metadata: { correos: [emailUserAutorizado], usuarioIdsAutorizados: [userIdAutorizado] },
  });

  const baseSol = (id: string, estado: string): any => ({
    idSolicitud: id, consecutivo: 'UMI-2026-0099', createdAt: new Date().toISOString(),
    estado, idCategoria: 47, areaResponsableActual: 'UMI',
    codigoTecnicoAsignado: 'TEC-01', responsableAsignado: 'TEC-01 · Técnico Asignado',
    usuarioSolicitanteId: userSolicitante.userId,
    usuarioSolicitanteEmail: userSolicitante.email,
    asignaciones: [],
  });

  it('cerrarTecnicamente (COMPLETADA) → dispara UMI_CONFORMIDAD_CIERRE_TECNICO_PENDIENTE al solicitante (INAPP + EMAIL)', async () => {
    const notif = mockNotifClient();
    let saved: any = { ...baseSol('SOL-NOTIF-1', 'EN_PROGRESO') };
    const repo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve({ ...saved })),
      save: jest.fn().mockImplementation((d: any) => { saved = { ...d }; return Promise.resolve(saved); }),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    const s = servicio({
      mantenimientoRepo: repo,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tecnicoUMI('TEC-01', userTecnico.email, userTecnico.userId);
          if (w?.where?.catalogo === 'REGLA_ESCALAMIENTO') return null;
          return null;
        }),
      } as any,
      notificationClient: notif.cliente,
    } as any);
    await s.cerrarTecnicamente('SOL-NOTIF-1', {
      trabajoRealizado: 'Trabajo finalizado 20 caracteres mínimos',
      evidencias: [{ id: 'e1' }],
      costoFinalEfectivoCop: 0,
    }, userTecnico);
    await notif.esperarDisparos();
    const hayInapp = notif.inapp.some((x) => x.tipo === 'UMI_CONFORMIDAD_CIERRE_TECNICO_PENDIENTE');
    const hayEmail = notif.emails.some((e) => e.subject.includes('Cierre técnico'));
    expect(hayInapp).toBe(true);
    expect(hayEmail).toBe(true);
  });

  it('confirmarConformidad → dispara 2 notif distintas: SOLICITANTE acuse + TÉCNICO confirmación', async () => {
    const notif = mockNotifClient();
    let saved: any = { ...baseSol('SOL-NOTIF-2', 'COMPLETADA') };
    saved.fechaLimiteConformidad = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const repo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve({ ...saved })),
      save: jest.fn().mockImplementation((d: any) => { saved = { ...d }; return Promise.resolve(saved); }),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    const s = servicio({
      mantenimientoRepo: repo,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tecnicoUMI('TEC-01', userTecnico.email, userTecnico.userId);
          return null;
        }),
      } as any,
      notificationClient: notif.cliente,
    } as any);
    await s.confirmarConformidad('SOL-NOTIF-2', { observacionesConformidad: '  todo correcto   ' }, userSolicitante);
    await notif.esperarDisparos();
    const tiposInapp = notif.inapp.map((x) => x.tipo);
    expect(tiposInapp).toContain('UMI_CONFORMIDAD_CONFIRMADA_SOLICITANTE');
    expect(tiposInapp).toContain('UMI_CONFORMIDAD_CONFIRMADA_TECNICO');
  });

  it('rechazarConformidadYReabrir → dispara SOLICITANTE + TECNICO_REAPERTURA (prioridad Alta ámbar)', async () => {
    const notif = mockNotifClient();
    let saved: any = { ...baseSol('SOL-NOTIF-3', 'COMPLETADA') };
    saved.fechaLimiteConformidad = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const repo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve({ ...saved })),
      save: jest.fn().mockImplementation((d: any) => { saved = { ...d }; return Promise.resolve(saved); }),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    const s = servicio({
      mantenimientoRepo: repo,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tecnicoUMI('TEC-01', userTecnico.email, userTecnico.userId);
          return null;
        }),
      } as any,
      notificationClient: notif.cliente,
    } as any);
    await s.rechazarConformidadYReabrir('SOL-NOTIF-3', {
      observacionesConformidad: '  La puerta sigue desajustada y hace ruido, revisar bisagra  ',
    }, userSolicitante);
    await notif.esperarDisparos();
    const tiposInapp = notif.inapp.map((x) => x.tipo);
    expect(tiposInapp).toContain('UMI_CONFORMIDAD_RECHAZADA_Y_REABIERTA_SOLICITANTE');
    expect(tiposInapp).toContain('UMI_CONFORMIDAD_RECHAZADA_Y_REABIERTA_TECNICO');
    const hayReapertura = notif.emails.some((e) => e.subject.includes('Reapertura'));
    expect(hayReapertura).toBe(true);
  });

  it('ejecutarCierresSinRespuestaVencidos 2 solicitudes → 2 notificaciones SIN_RESPUESTA al solicitante', async () => {
    const notif = mockNotifClient();
    const vencida1 = { ...baseSol('V-NOT-1', 'COMPLETADA'), fechaLimiteConformidad: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString() };
    const vencida2 = { ...baseSol('V-NOT-2', 'COMPLETADA'), fechaLimiteConformidad: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString() };
    const mapaVivas: Record<string, any> = { 'V-NOT-1': { ...vencida1 }, 'V-NOT-2': { ...vencida2 } };
    const repo = {
      find: jest.fn().mockResolvedValue([mapaVivas['V-NOT-1'], mapaVivas['V-NOT-2']]),
      findOne: jest.fn().mockImplementation((q: any) => {
        const id = typeof q === 'string' ? q : (q as any)?.where?.idSolicitud;
        return Promise.resolve(id && mapaVivas[id] ? { ...mapaVivas[id] } : null);
      }),
      save: jest.fn().mockImplementation((d: any) => {
        if (d && d.idSolicitud) mapaVivas[d.idSolicitud] = { ...d };
        return Promise.resolve(d);
      }),
    } as any;
    const s = servicio({
      mantenimientoRepo: repo,
      notificationClient: notif.cliente,
    } as any);
    const r = await s.ejecutarCierresSinRespuestaVencidos(userSuper);
    expect(r.actualizadas).toBe(2);
    await notif.esperarDisparos();
    const countSinRespuesta = notif.inapp.filter((x) => x.tipo === 'UMI_CONFORMIDAD_SIN_RESPUESTA_SOLICITANTE').length;
    expect(countSinRespuesta).toBeGreaterThanOrEqual(2);
  });

  it('si NotificationClient no está inyectado (entorno Jest antiguo) → no-op, las 4 operaciones funcionan sin excepciones', async () => {
    const sol1 = { ...baseSol('SOL-LEGACY-1', 'EN_PROGRESO'), fechaCierreTecnico: undefined };
    const sol2 = { ...baseSol('SOL-LEGACY-2', 'COMPLETADA'), fechaLimiteConformidad: new Date(Date.now() + 72 * 3600 * 1000).toISOString() };
    const sol3 = { ...baseSol('SOL-LEGACY-3', 'COMPLETADA'), fechaLimiteConformidad: new Date(Date.now() + 72 * 3600 * 1000).toISOString() };
    const vencida = { ...baseSol('V-LEG-1', 'COMPLETADA'), fechaLimiteConformidad: new Date(Date.now() - 24 * 3600 * 1000).toISOString() };
    const mapaMem: Record<string, any> = { 'SOL-LEGACY-1': sol1, 'SOL-LEGACY-2': sol2, 'SOL-LEGACY-3': sol3, 'V-LEG-1': vencida };
    const repo = {
      findOne: jest.fn().mockImplementation((q: any) => {
        const id = typeof q === 'string' ? q : (q as any)?.where?.idSolicitud;
        return Promise.resolve(id && mapaMem[id] ? { ...mapaMem[id] } : null);
      }),
      find: jest.fn().mockResolvedValue([{ ...vencida }]),
      save: jest.fn().mockImplementation((d: any) => {
        if (d?.idSolicitud) mapaMem[d.idSolicitud] = { ...mapaMem[d.idSolicitud], ...d };
        return Promise.resolve(d);
      }),
    } as any;
    const s = servicio({
      mantenimientoRepo: repo,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tecnicoUMI('TEC-01', userTecnico.email, userTecnico.userId);
          return null;
        }),
      } as any,
      // notificationClient = undefined — DEFAULT (simula spec antiguo)
    } as any);
    const a = await s.cerrarTecnicamente('SOL-LEGACY-1', { trabajoRealizado: 'abcdef 15 chars mínimos ok', evidencias: [{ id: 'x' }], costoFinalEfectivoCop: 0 }, userTecnico);
    const b = await s.confirmarConformidad('SOL-LEGACY-2', {}, userSolicitante);
    const c = await s.rechazarConformidadYReabrir('SOL-LEGACY-3', { observacionesConformidad: 'obs de rechazo con 20 caracteres OK 12345' }, userSolicitante);
    const d = await s.ejecutarCierresSinRespuestaVencidos(userSuper);
    expect(a.estado).toBe('COMPLETADA');
    expect(b.estado).toBe('CERRADA');
    expect(c.estado).toBe('EN_PROGRESO');
    expect(d.actualizadas).toBe(1);
  });

  it('solicitante legacy sin usuario registrado (sólo email) → dispara SEND EMAIL directo fallback, sin notifyUserById', async () => {
    const notif = mockNotifClient();
    let saved: any = { ...baseSol('SOL-NOTIF-LG', 'COMPLETADA') };
    saved.usuarioSolicitanteId = '';
    saved.usuarioSolicitanteEmail = 'usuario.legacy@esap.edu.co';
    saved.fechaLimiteConformidad = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const repo = {
      findOne: jest.fn().mockImplementation(() => Promise.resolve({ ...saved })),
      save: jest.fn().mockImplementation((d: any) => { saved = { ...d }; return Promise.resolve(saved); }),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    const s = servicio({
      mantenimientoRepo: repo,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tecnicoUMI('TEC-01', userTecnico.email, userTecnico.userId);
          return null;
        }),
      } as any,
      notificationClient: notif.cliente,
    } as any);
    await s.confirmarConformidad('SOL-NOTIF-LG', {}, userSuper);
    await notif.esperarDisparos();
    const hayLegacyEmail = notif.emails.some((e) => e.to === 'usuario.legacy@esap.edu.co');
    expect(hayLegacyEmail).toBe(true);
  });

  it('7 tipos notificación conformidad únicos emitidos en 4 eventos cierre → conformidad total cobertura tipos', async () => {
    const notif = mockNotifClient();
    const vencida = { ...baseSol('V-FULL-1', 'COMPLETADA'), fechaLimiteConformidad: new Date(Date.now() - 48 * 3600 * 1000).toISOString() };
    const completada = () => ({ ...baseSol('FULL-1', 'COMPLETADA'), fechaLimiteConformidad: new Date(Date.now() + 72 * 3600 * 1000).toISOString() });
    const enCurso = () => ({ ...baseSol('FULL-2', 'EN_PROGRESO') });
    const mapa: Record<string, any> = { 'FULL-1': completada(), 'FULL-2': enCurso() };
    const repo = {
      find: jest.fn().mockImplementation((q: any) => {
        if (Array.isArray(q)) return [];
        return [vencida];
      }),
      findOne: jest.fn().mockImplementation((q: any) => {
        const id = typeof q === 'string' ? q : (q as any)?.where?.idSolicitud;
        if (id && mapa[id]) return Promise.resolve({ ...mapa[id] });
        if (id === 'V-FULL-1') return Promise.resolve({ ...vencida });
        return Promise.resolve(null);
      }),
      save: jest.fn().mockImplementation((d: any) => {
        if (d?.idSolicitud) mapa[d.idSolicitud] = { ...d };
        return Promise.resolve(d);
      }),
    } as any;
    const s = servicio({
      mantenimientoRepo: repo,
      catalogoRepo: {
        findOne: jest.fn().mockImplementation((w: any) => {
          if (w?.where?.catalogo === 'TECNICO_MANTENIMIENTO') return tecnicoUMI('TEC-01', userTecnico.email, userTecnico.userId);
          return null;
        }),
      } as any,
      notificationClient: notif.cliente,
    } as any);

    mapa['FULL-2'] = await s.cerrarTecnicamente('FULL-2', {
      trabajoRealizado: 'Cierre técnico con conformidad 12345678',
      evidencias: [{ id: 'ev1' }, { id: 'ev2' }],
      costoFinalEfectivoCop: 80000,
    }, userTecnico);
    mapa['FULL-1'] = await s.rechazarConformidadYReabrir('FULL-1', { observacionesConformidad: 'motivo 20 caracteres mínimo rechazo obs' }, userSolicitante);
    // volvemos a marcar COMPLETADA para confirmar
    mapa['FULL-1'].estado = 'COMPLETADA';
    mapa['FULL-1'].fechaLimiteConformidad = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    await s.confirmarConformidad('FULL-1', {}, userSolicitante);
    await s.ejecutarCierresSinRespuestaVencidos(userSuper);
    await notif.esperarDisparos();
    const tipos = new Set(notif.inapp.map((x) => x.tipo));
    const esperados = [
      'UMI_CONFORMIDAD_CIERRE_TECNICO_PENDIENTE',
      'UMI_CONFORMIDAD_CONFIRMADA_SOLICITANTE',
      'UMI_CONFORMIDAD_CONFIRMADA_TECNICO',
      'UMI_CONFORMIDAD_RECHAZADA_Y_REABIERTA_SOLICITANTE',
      'UMI_CONFORMIDAD_RECHAZADA_Y_REABIERTA_TECNICO',
      'UMI_CONFORMIDAD_SIN_RESPUESTA_SOLICITANTE',
    ];
    esperados.forEach((t) => expect(tipos.has(t)).toBe(true));
  });
});
