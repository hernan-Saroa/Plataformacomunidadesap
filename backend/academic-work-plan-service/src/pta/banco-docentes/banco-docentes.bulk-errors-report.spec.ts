import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BancoDocentesService, normalizeBancoDocentePayload, validateBulkDocumentFormat } from './banco-docentes.service';
import { bulkRegistrationTrace } from './rund-registration-history';
import { protectRundBulkResponse } from './banco-docentes-sensitive-data';

// HU 1355 — migración masiva desde el Excel maestro: cédula inválida y log de errores descargable.
const payloadWith = (doc: string, type?: string) =>
  normalizeBancoDocentePayload({ DOCUMENTO_IDENTIDAD: doc, ...(type ? { TIPO_DOCUMENTO: type } : {}) });

function motivoDe(fn: () => void) {
  try { fn(); } catch (error: any) {
    expect(error).toBeInstanceOf(BadRequestException);
    return error.getResponse();
  }
  return null;
}

describe('HU 1355 - formato de la cédula en la carga masiva', () => {
  it.each(['1020304050', '12345', '12345678901234567890'])('acepta la cédula %s', (doc) => {
    expect(motivoDe(() => validateBulkDocumentFormat(payloadWith(doc)))).toBeNull();
  });

  it('los puntos se ignoran: 1.020.304 es la cédula 1020304', () => {
    const payload = payloadWith('1.020.304');
    expect(payload.documentNumber).toBe('1020304');
    expect(motivoDe(() => validateBulkDocumentFormat(payload))).toBeNull();
  });

  it.each([
    ['1234', 'menos de 5 caracteres'],
    ['123456789012345678901', 'más de 20 caracteres'],
    ['ABC12345', 'letras en una cédula'],
    ['1020 304050', 'espacio intermedio'],
    ['1020-304050', 'guion'],
  ])('rechaza %s (%s) con columna, dato errado y valor esperado', (doc) => {
    const response = motivoDe(() => validateBulkDocumentFormat(payloadWith(doc)));
    expect(response).toEqual(expect.objectContaining({
      columna: 'DOCUMENTO_IDENTIDAD', datoErrado: doc.replace(/\./g, ''), valorEsperado: expect.any(String), message: expect.any(String),
    }));
  });

  it('el pasaporte sí admite letras y números, pero no símbolos', () => {
    expect(motivoDe(() => validateBulkDocumentFormat(payloadWith('AB123456', 'PA')))).toBeNull();
    expect(motivoDe(() => validateBulkDocumentFormat(payloadWith('AB-123456', 'PA')))).not.toBeNull();
  });
});

describe('HU 1355 - la fila inválida se rechaza y el resto sigue', () => {
  it('reporta la fila con cédula inválida como error y procesa las demás', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([]),
      transaction: jest.fn(async (callback: any) => callback({ query: jest.fn().mockResolvedValue([]) })),
    };
    const service = Object.create(BancoDocentesService.prototype) as BancoDocentesService;
    (service as any).dataSource = dataSource;
    jest.spyOn(service, 'upsertDocente').mockImplementation(async (row: any) => {
      validateBulkDocumentFormat(normalizeBancoDocentePayload(row));
      return { action: 'insert', docenteId: 'a', sourceRowNumber: row.__sourceRowNumber, fullName: 'Docente' } as any;
    });

    const result = await service.bulkUpsert([
      { DOCUMENTO_IDENTIDAD: '1020304050', __sourceRowNumber: 2 },
      { DOCUMENTO_IDENTIDAD: '12', __sourceRowNumber: 3 },
      { DOCUMENTO_IDENTIDAD: '1.020.304.051', __sourceRowNumber: 4 },
    ], { dryRun: true, periodoCarga: '2026-2' });

    expect(result.created).toBe(2);
    expect(result.errors).toBe(1);
    expect(result.errorDetails[0]).toEqual(expect.objectContaining({
      fila: 3, columna: 'DOCUMENTO_IDENTIDAD', datoErrado: '12', blocking: true,
    }));
  });
});

describe('HU 1355 - log de errores persistido en la trazabilidad', () => {
  const rows = [
    { DOCUMENTO_IDENTIDAD: '1020304050', NOMBRE_COMPLETO: 'Ana Pérez', __sourceRowNumber: 2, PERIODO_CARGA: '2026-2' },
    { DOCUMENTO_IDENTIDAD: '12', NOMBRE_COMPLETO: 'Luis Gómez', __sourceRowNumber: 3, PERIODO_CARGA: '2026-2' },
  ];
  const errors = [{
    fila: 3, row: 3, columna: 'DOCUMENTO_IDENTIDAD', datoErrado: '12', valorEsperado: 'Entre 5 y 20 caracteres',
    mensaje: 'La cédula debe tener entre 5 y 20 caracteres.', data: rows[1],
  }];

  it('guarda fila, cédula, nombre, columna, dato errado, valor esperado y motivo', () => {
    const trace: any = bulkRegistrationTrace(rows, [{ sourceRowNumber: 2, action: 'insert' }], errors);
    expect(trace.errores).toEqual([expect.objectContaining({
      fila: 3, documentoIdentidad: '12', nombre: 'Luis Gómez', columna: 'DOCUMENTO_IDENTIDAD',
      datoErrado: '12', valorEsperado: 'Entre 5 y 20 caracteres', mensaje: 'La cédula debe tener entre 5 y 20 caracteres.',
    })]);
    expect(trace.registros.find((r: any) => r.fila === 3).resultado).toBe('NO_CARGADO');
  });

  it('no guarda `errores` mientras la carga está en proceso (sin resultados todavía)', () => {
    expect((bulkRegistrationTrace(rows) as any).errores).toBeUndefined();
  });

  it('los registros del detalle no incluyen el dato errado (lo ven roles de solo lectura)', () => {
    const trace: any = bulkRegistrationTrace(rows, [], errors);
    expect(JSON.stringify(trace.registros)).not.toContain('datoErrado');
  });
});

describe('HU 1355 - endpoint de lectura del log', () => {
  const build = (queryResult: any[]) => {
    const service = Object.create(BancoDocentesService.prototype) as BancoDocentesService;
    (service as any).dataSource = { query: jest.fn().mockResolvedValue(queryResult) };
    return service;
  };

  it('rechaza un identificador que no es UUID sin consultar la base', async () => {
    const service = build([]);
    await expect(service.getBulkErrors('x')).rejects.toThrow(BadRequestException);
    expect((service as any).dataSource.query).not.toHaveBeenCalled();
  });

  it('404 si la carga no existe', async () => {
    await expect(build([]).getBulkErrors('11111111-1111-4111-8111-111111111111')).rejects.toThrow(NotFoundException);
  });

  it('devuelve null para una carga anterior que no guardó el detalle', async () => {
    expect(await build([{ errores: null }]).getBulkErrors('11111111-1111-4111-8111-111111111111')).toBeNull();
  });

  it('devuelve el arreglo guardado', async () => {
    expect(await build([{ errores: [{ fila: 3 }] }]).getBulkErrors('11111111-1111-4111-8111-111111111111')).toEqual([{ fila: 3 }]);
  });

  it('sin acceso completo enmascara la cédula; con acceso completo la entrega tal cual', () => {
    const detalle = { errorDetails: [{ fila: 3, documentoIdentidad: '1020304050', columna: 'DOCUMENTO_IDENTIDAD', datoErrado: '1020304050', mensaje: 'x 1020304050' }] };
    const parcial: any = protectRundBulkResponse(detalle, false);
    expect(JSON.stringify(parcial)).not.toContain('1020304050');
    const completo: any = protectRundBulkResponse(detalle, true);
    expect(completo.errorDetails[0].documentoIdentidad).toBe('1020304050');
  });
});

describe('HU 1355 - la validación está conectada en upsertDocente (sin mockearlo)', () => {
  // Fila oficial completa: pasa validatePayload y solo deja de pasar si la cédula es inválida.
  const fila = (doc: string) => ({
    DOCUMENTO_IDENTIDAD: doc, TIPO_DOCUMENTO: 'CC', NOMBRE_COMPLETO: 'QA-E2E CABLEADO', GENERO: 'Masculino', SEXO_BIOLOGICO: 'Hombre',
    FECHA_NACIMIENTO: '17/01/1966', CORREO_INSTITUCIONAL: 'qa.e2e.cableado@esap.edu.co', TELEFONO: '3105550100', VINCULACION: 'Ocasional',
    REGIMEN_NORMATIVO: 'Circular Dispositiva 003/2025', HORAS_PTA: '800', TERRITORIAL: 'META', DEDICACION: 'Tiempo Completo',
    DEDICACION_HORAS_SEMANA: '40', CATEGORIA_ESCALAFON: 'Asociado', INICIO_VINCULACION: '20/01/2025', ESTADO_DOCENTE: 'Activo',
    ACTO_ADMINISTRATIVO: 'Resolución DT-11-002 de 2025', NIVEL_FORMACION: 'Maestría', TITULO_PREGRADO: 'Administrador Publico',
    NUCLEO_TEMATICO: 'Labores de docencia', PERFIL_ACADEMICO: 'Administrador Publico', PERIODO_CARGA: '2026-2',
  });
  const SENTINELA = 'LLEGO_A_LA_BASE_DE_DATOS';
  const build = () => {
    const service = Object.create(BancoDocentesService.prototype) as BancoDocentesService;
    // Todo lo que está después de las validaciones toca la base: si se llega aquí, las validaciones pasaron.
    (service as any).getTerritoriales = jest.fn().mockRejectedValue(new Error(SENTINELA));
    return service;
  };

  it.each(['ABC12345', '1234', '99013550X', '123 456 78'])('en la carga masiva rechaza la cédula %s antes de tocar la base', async (doc) => {
    await expect(build().upsertDocente(fila(doc), { bulkImport: true })).rejects.toMatchObject({
      response: expect.objectContaining({ columna: 'DOCUMENTO_IDENTIDAD' }),
    });
  });

  it('en la carga masiva una cédula válida (con puntos) pasa las validaciones y sigue su camino', async () => {
    await expect(build().upsertDocente(fila('990.135.502'), { bulkImport: true })).rejects.toThrow(SENTINELA);
  });

  it('fuera de la carga masiva el formato NO se exige (el alcance es solo el masivo): llega a la base', async () => {
    await expect(build().upsertDocente(fila('ABC12345'), {})).rejects.toThrow(SENTINELA);
  });
});
