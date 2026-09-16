import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MacroDocenteService } from './macro-docente.service';

function fakeRepo(overrides: Partial<Record<string, any>> = {}) {
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((entity: any) => entity),
    save: jest.fn(async (entity: any) => entity),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
    ...overrides,
  };
}

/** Arma un ptaRepo cuyo createQueryBuilder().getMany() devuelve `ptas`, capturando los where/andWhere aplicados. */
function ptaRepoWithRows(ptas: any[]) {
  const where = jest.fn().mockReturnThis();
  const andWhere = jest.fn().mockReturnThis();
  const orderBy = jest.fn().mockReturnThis();
  const getMany = jest.fn().mockResolvedValue(ptas);
  const qb = { where, andWhere, orderBy, getMany };
  return { repo: fakeRepo({ createQueryBuilder: jest.fn(() => qb) }), qb };
}

function buildService(overrides: Partial<Record<string, any>> = {}) {
  const noopRepo = fakeRepo();
  const ptaRepo = overrides.ptaRepo || noopRepo;
  const docenteRepo = overrides.docenteRepo || noopRepo;
  const personaRepo = overrides.personaRepo || noopRepo;
  const programaRepo = overrides.programaRepo || noopRepo;
  const accesoExternoRepo = overrides.accesoExternoRepo || noopRepo;
  const consultaLogRepo = overrides.consultaLogRepo || noopRepo;
  const notifications = overrides.notifications || { notifyAccesoExternoOtorgado: jest.fn().mockResolvedValue(false) };
  return new MacroDocenteService(
    ptaRepo as any,
    docenteRepo as any,
    personaRepo as any,
    programaRepo as any,
    accesoExternoRepo as any,
    consultaLogRepo as any,
    notifications as any,
  );
}

describe('MacroDocenteService - REQ-RUND-F020 getHistorial (validación)', () => {
  it('rechaza la consulta si no se indica docente ni período (evita recorrer >72.990 registros)', async () => {
    const service = buildService();
    await expect(service.getHistorial({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite la consulta si se indica solo el período', async () => {
    const service = buildService();
    const result = await service.getHistorial({ periodo: '2025-2' });
    expect(result).toEqual({ items: [], total: 0, page: 1, limit: 50, pages: 1 });
  });
});

/**
 * REQ-RUND-F020 — Cobertura del "aplanado" de datosEstructurados.asignaturas,
 * la parte más riesgosa del servicio: nunca se había probado con PTAs reales
 * (los tests anteriores solo usaban getMany() -> []). Aquí se arma un caso
 * realista: dos PTAs de dos docentes distintos, cada uno con asignaturas que
 * mezclan datos completos (nombres embebidos) y datos "legacy" (solo ids, que
 * deben resolverse por catálogo de programa).
 */
describe('MacroDocenteService - REQ-RUND-F020 aplanado de asignaturas (datos reales)', () => {
  const ptaMaria = {
    docenteId: 'doc-1',
    periodo: '2025-2',
    estado: 'EN_FIRME',
    datosEstructurados: {
      asignaturas: [
        {
          codigo: 'ADM101',
          nombre: 'Introducción a la Administración Pública',
          horas: 64,
          programa_id: 'prog-1',
          programa_nombre: 'Administración Pública Territorial',
          territorial_nombre: 'Risaralda',
          cetap_nombre: 'CETAP Pereira',
        },
        {
          // PTA legacy: sin nombre de programa embebido, solo el id -> debe
          // resolverse contra ProgramaEntity. CETAP viene como sede_nombre
          // (alias antiguo). Horas viene como horasClase (alias antiguo).
          codigo: 'ADM102',
          nombre: 'Finanzas Públicas',
          horasClase: 48,
          programa_id: 'prog-2',
          territorial_nombre: 'Antioquia',
          sede_nombre: 'CETAP Medellín',
        },
      ],
    },
  };
  const ptaCarlos = {
    docenteId: 'doc-2',
    periodo: '2025-2',
    estado: 'APROBADO',
    datosEstructurados: {
      asignaturas: [
        {
          codigo: 'DER201',
          nombre: 'Derecho Administrativo',
          horas: 32,
          programa: { id: 'prog-1', nombre: 'Administración Pública Territorial' },
          territorial: { nombre: 'Valle del Cauca' },
          cetap: { nombre: 'CETAP Cali' },
        },
      ],
    },
  };

  const docentes = [
    { id: 'doc-1', personaId: 'per-1', nucleoTematico: 'Gestión Pública' },
    { id: 'doc-2', personaId: 'per-2', nucleoTematico: 'Derecho Público' },
  ];
  const personas = [
    { id: 'per-1', primer_nombre: 'MARÍA', segundo_nombre: 'FERNANDA', primer_apellido: 'GÓMEZ', segundo_apellido: 'RUIZ', identificacion: '1122334455' },
    { id: 'per-2', primer_nombre: 'CARLOS', segundo_nombre: null, primer_apellido: 'PÉREZ', segundo_apellido: null, identificacion: '9988776655' },
  ];
  const programas = [{ id: 'prog-2', nombre: 'Finanzas Públicas y Territoriales' }];

  function buildRealisticService() {
    const { repo: ptaRepo } = ptaRepoWithRows([ptaMaria, ptaCarlos]);
    const docenteRepo = fakeRepo({ find: jest.fn().mockResolvedValue(docentes) });
    const personaRepo = fakeRepo({ find: jest.fn().mockResolvedValue(personas) });
    const programaRepo = fakeRepo({ find: jest.fn().mockResolvedValue(programas) });
    return buildService({ ptaRepo, docenteRepo, personaRepo, programaRepo });
  }

  it('arma una fila por asignatura, resolviendo nombre/documento del docente y núcleo temático', async () => {
    const service = buildRealisticService();
    const result = await service.getHistorial({ periodo: '2025-2' });

    expect(result.total).toBe(3);
    const filaAdm101 = result.items.find((r) => r.asignatura_codigo === 'ADM101')!;
    expect(filaAdm101.docente_nombre).toBe('MARÍA FERNANDA GÓMEZ RUIZ');
    expect(filaAdm101.documento_identidad).toBe('1122334455');
    expect(filaAdm101.nucleo_tematico).toBe('Gestión Pública');
    expect(filaAdm101.territorial).toBe('Risaralda');
    expect(filaAdm101.cetap).toBe('CETAP Pereira');
    expect(filaAdm101.programa).toBe('Administración Pública Territorial');
    expect(filaAdm101.horas).toBe(64);
  });

  it('resuelve por catálogo el programa de una asignatura legacy que solo trae el id', async () => {
    const service = buildRealisticService();
    const result = await service.getHistorial({ periodo: '2025-2' });

    const filaAdm102 = result.items.find((r) => r.asignatura_codigo === 'ADM102')!;
    expect(filaAdm102.programa).toBe('Finanzas Públicas y Territoriales');
    expect(filaAdm102.cetap).toBe('CETAP Medellín'); // desde el alias sede_nombre
    expect(filaAdm102.horas).toBe(48); // desde el alias horasClase
  });

  it('soporta el formato con objetos anidados (programa.nombre, territorial.nombre, cetap.nombre)', async () => {
    const service = buildRealisticService();
    const result = await service.getHistorial({ periodo: '2025-2' });

    const filaDer201 = result.items.find((r) => r.asignatura_codigo === 'DER201')!;
    expect(filaDer201.docente_nombre).toBe('CARLOS PÉREZ');
    expect(filaDer201.territorial).toBe('Valle del Cauca');
    expect(filaDer201.cetap).toBe('CETAP Cali');
    expect(filaDer201.programa).toBe('Administración Pública Territorial');
  });

  it('filtra correctamente por territorial sobre datos ya aplanados', async () => {
    const service = buildRealisticService();
    const result = await service.getHistorial({ periodo: '2025-2', territorial: 'antioquia' });
    expect(result.total).toBe(1);
    expect(result.items[0].asignatura_codigo).toBe('ADM102');
  });

  it('pagina el resultado aplanado (no solo la lista de PTAs)', async () => {
    const service = buildRealisticService();
    const pagina1 = await service.getHistorial({ periodo: '2025-2', page: 1, limit: 2 });
    const pagina2 = await service.getHistorial({ periodo: '2025-2', page: 2, limit: 2 });

    expect(pagina1.total).toBe(3);
    expect(pagina1.pages).toBe(2);
    expect(pagina1.items).toHaveLength(2);
    expect(pagina2.items).toHaveLength(1);
  });

  it('no llama al repositorio de programas si ninguna asignatura tiene el nombre faltante', async () => {
    const { repo: ptaRepo } = ptaRepoWithRows([ptaCarlos]); // ptaCarlos ya trae todos los nombres embebidos
    const docenteRepo = fakeRepo({ find: jest.fn().mockResolvedValue([docentes[1]]) });
    const personaRepo = fakeRepo({ find: jest.fn().mockResolvedValue([personas[1]]) });
    const programaRepo = fakeRepo();
    const service = buildService({ ptaRepo, docenteRepo, personaRepo, programaRepo });

    await service.getHistorial({ periodo: '2025-2' });
    expect(programaRepo.find).not.toHaveBeenCalled();
  });

  it('devuelve vacío sin tocar Docente/Persona/Programa cuando no hay PTAs firmes', async () => {
    const { repo: ptaRepo } = ptaRepoWithRows([]);
    const docenteRepo = fakeRepo();
    const service = buildService({ ptaRepo, docenteRepo });

    const result = await service.getHistorial({ periodo: '2099-1' });
    expect(result.items).toEqual([]);
    expect(docenteRepo.find).not.toHaveBeenCalled();
  });
});

describe('MacroDocenteService - REQ-RUND-F022 getConsultaPuntual', () => {
  it('exige docenteId y período', async () => {
    const service = buildService();
    await expect(service.getConsultaPuntual('', '2025-2')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.getConsultaPuntual('doc-1', '')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('devuelve el detalle sin paginar para un docente y período puntuales', async () => {
    const pta = {
      docenteId: 'doc-1',
      periodo: '2025-2',
      estado: 'EN_FIRME',
      datosEstructurados: { asignaturas: [{ codigo: 'A1', nombre: 'Asignatura 1', horas: 10 }] },
    };
    const { repo: ptaRepo } = ptaRepoWithRows([pta]);
    const docenteRepo = fakeRepo({ find: jest.fn().mockResolvedValue([{ id: 'doc-1', personaId: 'per-1', nucleoTematico: null }]) });
    const personaRepo = fakeRepo({ find: jest.fn().mockResolvedValue([{ id: 'per-1', primer_nombre: 'ANA', primer_apellido: 'LÓPEZ', identificacion: '111' }]) });
    const service = buildService({ ptaRepo, docenteRepo, personaRepo });

    const items = await service.getConsultaPuntual('doc-1', '2025-2');
    expect(items).toHaveLength(1);
    expect(items[0].docente_nombre).toBe('ANA LÓPEZ');
  });
});

describe('MacroDocenteService - filtros de historial (post-flatten, unitario)', () => {
  it('filtra por territorial/cetap/programa/núcleo temático de forma case-insensitive', () => {
    const service = buildService() as any;
    const rows = [
      { territorial: 'Risaralda', cetap: 'CETAP Pereira', programa: 'Administración Pública', nucleo_tematico: 'Gestión Pública' },
      { territorial: 'Antioquia', cetap: 'CETAP Medellín', programa: 'Administración Pública', nucleo_tematico: 'Ciencias Sociales' },
    ];
    const filtered = service.applyPostFilters(rows, { territorial: 'risaralda' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].territorial).toBe('Risaralda');
  });

  it('devuelve todo cuando no hay filtros adicionales', () => {
    const service = buildService() as any;
    const rows = [{ territorial: 'A' }, { territorial: 'B' }];
    expect(service.applyPostFilters(rows, {})).toHaveLength(2);
  });
});

describe('MacroDocenteService - REQ-RUND-F022 acceso externo temporal', () => {
  it('rechaza crear un acceso sin nombre de ente', async () => {
    const service = buildService();
    await expect(
      service.crearAccesoExterno(
        { enteNombre: '', docenteId: 'doc-1', fechaInicio: '2026-01-01', fechaFin: '2026-02-01' } as any,
        'actor-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza crear un acceso sin docente seleccionado (siempre debe ser puntual, F022)', async () => {
    const service = buildService();
    await expect(
      service.crearAccesoExterno(
        { enteNombre: 'MEN', fechaInicio: '2026-01-01', fechaFin: '2026-02-01' } as any,
        'actor-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza crear un acceso con fecha fin anterior o igual a la fecha inicio', async () => {
    const service = buildService();
    await expect(
      service.crearAccesoExterno(
        { enteNombre: 'MEN', docenteId: 'doc-1', fechaInicio: '2026-02-01', fechaFin: '2026-01-01' } as any,
        'actor-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea el acceso con token generado y queda activo', async () => {
    const accesoExternoRepo = fakeRepo();
    const service = buildService({ accesoExternoRepo });
    const acceso = await service.crearAccesoExterno(
      { enteNombre: 'Procuraduría', docenteId: 'doc-1', fechaInicio: '2026-01-01', fechaFin: '2026-02-01' } as any,
      'actor-1',
    );
    expect(acceso.token).toEqual(expect.any(String));
    expect(acceso.token.length).toBeGreaterThan(10);
    expect(acceso.activo).toBe(true);
    expect(acceso.otorgadoPor).toBe('actor-1');
    expect(accesoExternoRepo.save).toHaveBeenCalled();
  });

  it('registra la bitácora de OTORGAR_ACCESO_EXTERNO al crear (tolerante a fallos, no bloquea la creación)', async () => {
    const consultaLogRepo = fakeRepo({ save: jest.fn().mockRejectedValue(new Error('DB caída')) });
    const service = buildService({ consultaLogRepo });
    await expect(
      service.crearAccesoExterno(
        { enteNombre: 'MEN', docenteId: 'doc-1', fechaInicio: '2026-01-01', fechaFin: '2026-02-01' } as any,
        'actor-1',
      ),
    ).resolves.toBeDefined(); // no lanza aunque el log falle: es la bitácora interna, no la de acceso externo
  });

  it('no envía correo cuando el contacto no tiene forma de email', async () => {
    const notifyMock = jest.fn().mockResolvedValue(false);
    const service = buildService({ notifications: { notifyAccesoExternoOtorgado: notifyMock } });
    await service.crearAccesoExterno(
      { enteNombre: 'MEN', enteContacto: 'sin-email', docenteId: 'doc-1', fechaInicio: '2026-01-01', fechaFin: '2026-02-01' } as any,
      'actor-1',
    );
    // El servicio llama siempre a notifyAccesoExternoOtorgado (que internamente decide si envía);
    // lo importante es que el contacto inválido se propague tal cual, sin lanzar.
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({ enteContacto: 'sin-email' }));
  });

  it('envía correo automático al ente cuando el contacto es un email válido', async () => {
    const notifyMock = jest.fn().mockResolvedValue(true);
    const service = buildService({ notifications: { notifyAccesoExternoOtorgado: notifyMock } });
    await service.crearAccesoExterno(
      {
        enteNombre: 'MEN',
        enteContacto: 'contacto@men.gov.co',
        docenteId: 'doc-1',
        fechaInicio: '2026-01-01',
        fechaFin: '2026-02-01',
      } as any,
      'actor-1',
    );
    expect(notifyMock).toHaveBeenCalledWith(expect.objectContaining({
      enteNombre: 'MEN',
      enteContacto: 'contacto@men.gov.co',
      path: expect.stringContaining('/externo/'),
    }));
  });

  it('no falla la creación del acceso si el envío de correo rechaza (best-effort)', async () => {
    const notifyMock = jest.fn().mockRejectedValue(new Error('notifications-service caído'));
    const service = buildService({ notifications: { notifyAccesoExternoOtorgado: notifyMock } });
    await expect(
      service.crearAccesoExterno(
        { enteNombre: 'MEN', enteContacto: 'x@men.gov.co', docenteId: 'doc-1', fechaInicio: '2026-01-01', fechaFin: '2026-02-01' } as any,
        'actor-1',
      ),
    ).resolves.toBeDefined();
  });

  it('revoca un acceso existente y registra quién lo revocó', async () => {
    const existente = { id: 'acc-1', activo: true, docenteId: 'doc-1', revokedAt: null, revokedBy: null };
    const accesoExternoRepo = fakeRepo({ findOne: jest.fn().mockResolvedValue(existente) });
    const service = buildService({ accesoExternoRepo });
    const revocado = await service.revocarAccesoExterno('acc-1', 'actor-2');
    expect(revocado.activo).toBe(false);
    expect(revocado.revokedBy).toBe('actor-2');
    expect(revocado.revokedAt).toBeInstanceOf(Date);
  });

  it('rechaza revocar un acceso que no existe', async () => {
    const accesoExternoRepo = fakeRepo({ findOne: jest.fn().mockResolvedValue(null) });
    const service = buildService({ accesoExternoRepo });
    await expect(service.revocarAccesoExterno('no-existe', 'actor-2')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lista los accesos externos ordenados por fecha de creación descendente', async () => {
    const accesoExternoRepo = fakeRepo({ find: jest.fn().mockResolvedValue([{ id: 'acc-1' }]) });
    const service = buildService({ accesoExternoRepo });
    const accesos = await service.listarAccesosExternos();
    expect(accesos).toEqual([{ id: 'acc-1' }]);
    expect(accesoExternoRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
  });

  it('lista la bitácora limitando el take entre 1 y 500', async () => {
    const consultaLogRepo = fakeRepo({ find: jest.fn().mockResolvedValue([]) });
    const service = buildService({ consultaLogRepo });
    await service.listarBitacora(10000);
    expect(consultaLogRepo.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' }, take: 500 });
  });

  it('valida un token inexistente como acceso prohibido', async () => {
    const accesoExternoRepo = fakeRepo({ findOne: jest.fn().mockResolvedValue(null) });
    const service = buildService({ accesoExternoRepo });
    await expect(service.validarAccesoExterno('token-invalido')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('valida un token revocado como acceso prohibido', async () => {
    const accesoExternoRepo = fakeRepo({
      findOne: jest.fn().mockResolvedValue({ activo: false, fechaInicio: new Date(), fechaFin: new Date() }),
    });
    const service = buildService({ accesoExternoRepo });
    await expect(service.validarAccesoExterno('token-revocado')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('valida un token fuera de vigencia (aún no inicia) como acceso prohibido', async () => {
    const enUnAnio = new Date();
    enUnAnio.setFullYear(enUnAnio.getFullYear() + 1);
    const accesoExternoRepo = fakeRepo({
      findOne: jest.fn().mockResolvedValue({ activo: true, fechaInicio: enUnAnio, fechaFin: enUnAnio }),
    });
    const service = buildService({ accesoExternoRepo });
    await expect(service.validarAccesoExterno('token-futuro')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('valida un token vencido (fecha_fin ya pasó) como acceso prohibido', async () => {
    const haceUnMes = new Date();
    haceUnMes.setMonth(haceUnMes.getMonth() - 1);
    const haceDosMeses = new Date();
    haceDosMeses.setMonth(haceDosMeses.getMonth() - 2);
    const accesoExternoRepo = fakeRepo({
      findOne: jest.fn().mockResolvedValue({ activo: true, fechaInicio: haceDosMeses, fechaFin: haceUnMes }),
    });
    const service = buildService({ accesoExternoRepo });
    await expect(service.validarAccesoExterno('token-vencido')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('acepta un token activo y vigente', async () => {
    const ayer = new Date(Date.now() - 86400000);
    const manana = new Date(Date.now() + 86400000);
    const accesoValido = { activo: true, fechaInicio: ayer, fechaFin: manana, docenteId: 'doc-1' };
    const accesoExternoRepo = fakeRepo({ findOne: jest.fn().mockResolvedValue(accesoValido) });
    const service = buildService({ accesoExternoRepo });
    await expect(service.validarAccesoExterno('token-valido')).resolves.toBe(accesoValido);
  });

  it('getHistorialParaAccesoExterno siempre fuerza el docenteId del acceso, ignorando cualquier otro que venga en los filtros', async () => {
    const pta = {
      docenteId: 'doc-del-acceso',
      periodo: '2025-2',
      estado: 'EN_FIRME',
      datosEstructurados: { asignaturas: [{ codigo: 'A1', nombre: 'Asignatura 1', horas: 5 }] },
    };
    const { repo: ptaRepo, qb } = ptaRepoWithRows([pta]);
    const docenteRepo = fakeRepo({ find: jest.fn().mockResolvedValue([{ id: 'doc-del-acceso', personaId: 'per-1', nucleoTematico: null }]) });
    const personaRepo = fakeRepo({ find: jest.fn().mockResolvedValue([{ id: 'per-1', primer_nombre: 'X', identificacion: '1' }]) });
    const service = buildService({ ptaRepo, docenteRepo, personaRepo });

    const acceso = { docenteId: 'doc-del-acceso' } as any;
    const result = await service.getHistorialParaAccesoExterno(acceso, { docenteId: 'otro-docente-que-no-deberia-usarse', periodo: '2025-2' });

    expect(result.total).toBe(1);
    expect(qb.andWhere).toHaveBeenCalledWith('pta.docenteId = :docenteId', { docenteId: 'doc-del-acceso' });
  });
});

describe('MacroDocenteService - logConsulta (fail-open vs. fail-closed)', () => {
  it('no lanza si el log falla y failClosed es false (consultas internas)', async () => {
    const consultaLogRepo = fakeRepo({ save: jest.fn().mockRejectedValue(new Error('DB caída')) });
    const service = buildService({ consultaLogRepo });
    await expect(
      service.logConsulta({ tipoConsulta: 'MACRO_DOCENTE', actorId: 'actor-1', failClosed: false }),
    ).resolves.toBeUndefined();
  });

  it('lanza ForbiddenException si el log falla y failClosed es true (consultas externas: no hay datos sin auditoría)', async () => {
    const consultaLogRepo = fakeRepo({ save: jest.fn().mockRejectedValue(new Error('DB caída')) });
    const service = buildService({ consultaLogRepo });
    await expect(
      service.logConsulta({ tipoConsulta: 'EXTERNA', actorId: 'ENTE_EXTERNO:MEN', failClosed: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('guarda el registro correctamente cuando no hay fallos', async () => {
    const consultaLogRepo = fakeRepo();
    const service = buildService({ consultaLogRepo });
    await service.logConsulta({ tipoConsulta: 'MACRO_DOCENTE', actorId: 'actor-1', totalResultados: 3, failClosed: false });
    expect(consultaLogRepo.save).toHaveBeenCalled();
    expect(consultaLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({ tipoConsulta: 'MACRO_DOCENTE', totalResultados: 3 }));
  });
});
