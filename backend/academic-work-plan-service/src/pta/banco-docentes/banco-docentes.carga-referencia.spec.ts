import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { BancoDocentesController } from './banco-docentes.controller';
import { RUND_COLUMNAS_CARGA } from './rund-carga-original';
import { normalizeBancoDocentePayload, normalizePhoneForAuth, resolveTerritorial } from './banco-docentes.service';

/**
 * Formato de referencia de la carga masiva RUND (Plantillas/…CargaDocentes_RUND_2025-1_FINAL.xlsx):
 * hoja CARGA_DOCENTES, fila 1 título con el período, fila 2 encabezados (38 columnas) y un docente por fila desde la 3.
 * El archivo se lee tal cual desde Plantillas/ y entra por el mismo endpoint de carga masiva.
 */
const REFERENCIA = resolve(__dirname, '../../../../../Plantillas/05062026 - CargaDocentes_RUND_2025-1_FINAL.xlsx');
const describeConArchivo = existsSync(REFERENCIA) ? describe : describe.skip;

const TERRITORIALES = [
  'Sede Central', 'Antioquia', 'Atlántico', 'Bolívar', 'Boyacá', 'Caldas', 'Cauca', 'Chocó', 'Cundinamarca', 'Huila',
  'Meta', 'Nariño', 'Norte de Santander', 'Risaralda', 'Santander', 'Tolima', 'Valle',
].map((nombre, i) => ({ id: String(i + 1), nombre } as any));

describeConArchivo('Carga masiva RUND embebida en PTA — archivo de referencia CargaDocentes_RUND_2025-1', () => {
  const buffer = existsSync(REFERENCIA) ? readFileSync(REFERENCIA) : Buffer.alloc(0);
  let capturedRows: any[] = [];
  let capturedOptions: any = null;
  let respuesta: any;

  beforeAll(async () => {
    const service: any = {
      bulkUpsert: jest.fn(async (rows: any[], options: any) => {
        capturedRows = rows;
        capturedOptions = options;
        return { total: rows.length, created: rows.length, updated: 0, unchanged: 0, errors: 0, results: [], errorDetails: [] };
      }),
      logSensitiveResourceAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = Object.create(BancoDocentesController.prototype) as BancoDocentesController;
    (controller as any).service = service;
    respuesta = await controller.bulkUpload(
      { originalname: 'CargaDocentes_RUND_2025-1_FINAL.xlsx', mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer } as any,
      {},
      { user: { userId: 'ggp-1' }, headers: {} },
      'true',
    );
  });

  it('recibe el archivo: 263 docentes, encabezados en la fila 2 y período tomado del título', () => {
    expect(respuesta.success).toBe(true);
    expect(capturedRows).toHaveLength(263);
    expect(capturedOptions.periodoCarga).toBe('2025-1');
    expect(capturedRows[0].__sourceRowNumber).toBe(3);
    expect(capturedRows[262].__sourceRowNumber).toBe(265);
  });

  it('entrega las 38 columnas del contrato por cada fila', () => {
    const columnas = Object.keys(capturedRows[0]).filter((k) => !k.startsWith('__'));
    expect(columnas).toEqual(expect.arrayContaining([...RUND_COLUMNAS_CARGA]));
  });

  it('normaliza las 263 filas con los campos obligatorios completos', () => {
    const faltantes: string[] = [];
    for (const row of capturedRows) {
      const p = normalizeBancoDocentePayload({ ...row, PERIODO_CARGA: capturedOptions.periodoCarga });
      for (const key of ['documentNumber', 'documentType', 'fullName', 'genero', 'fechaNacimiento', 'correoInstitucional', 'tipoVinculacion',
        'territorialNombre', 'dedicacion', 'escalafon', 'fechaInicioVinculacion', 'actoAdministrativoVinculacion', 'nivelFormacion',
        'pregrado', 'nucleoTematico', 'perfilAcademico', 'periodoCarga']) {
        if ((p as any)[key] === null || (p as any)[key] === undefined || String((p as any)[key]).trim() === '') faltantes.push(`fila ${row.__sourceRowNumber}: ${key}`);
      }
    }
    expect(faltantes).toEqual([]);
  });

  it('respeta los valores del archivo: régimen, horas, vinculación y situación', () => {
    const porDocumento = new Map(capturedRows.map((r) => [String(r.DOCUMENTO_IDENTIDAD), r]));
    const norm = (doc: string) => normalizeBancoDocentePayload({ ...porDocumento.get(doc), PERIODO_CARGA: '2025-1' });

    const carrera1 = norm('19195704');
    expect(carrera1.tipoVinculacion).toBe('CARRERA1');
    expect(carrera1.regimenNormativo).toBe('Acuerdo 009/2004');
    expect(carrera1.horasAsignables).toBe(720);

    const prueba = norm('91350046');
    expect(prueba.regimenNormativo).toBe('Circular Dispositiva 003/2025');
    expect(prueba.horasAsignables).toBe(800);
    expect(prueba.situacionCategoria).toBe('En Periodo de Prueba');
  });

  it('FIN_VINCULACION "Indefinido" no es fecha: queda sin fecha de fin (104 filas)', () => {
    const indefinidas = capturedRows.filter((r) => String(r.FIN_VINCULACION).trim() === 'Indefinido');
    expect(indefinidas).toHaveLength(104);
    for (const row of indefinidas) {
      expect(normalizeBancoDocentePayload({ ...row, PERIODO_CARGA: '2025-1' }).fechaFinVinculacion).toBeNull();
    }
  });

  it('TIPO_DOCUMENTO "POR VERIFICAR" se resuelve sin quedar con ese texto', () => {
    const porVerificar = capturedRows.filter((r) => r.TIPO_DOCUMENTO === 'POR VERIFICAR');
    expect(porVerificar).toHaveLength(2);
    for (const row of porVerificar) {
      const payload = normalizeBancoDocentePayload({ ...row, PERIODO_CARGA: '2025-1' });
      expect(payload.documentType).not.toBe('POR VERIFICAR');
      expect(payload.documentType).not.toBe('POR VE');
    }
  });

  it('dos correos en una celda: se conserva el primero', () => {
    const fila = capturedRows.find((r) => String(r.DOCUMENTO_IDENTIDAD) === '37291100')!;
    expect(normalizeBancoDocentePayload({ ...fila, PERIODO_CARGA: '2025-1' }).correoInstitucional).toBe('alix.hurtado@esap.edu.co');
  });

  it('todos los teléfonos del archivo se normalizan sin rechazar la fila', () => {
    const invalidos = capturedRows.filter((r) => r.TELEFONO)
      .filter((r) => { try { normalizePhoneForAuth(r.TELEFONO, true); return false; } catch { return true; } })
      .map((r) => `${r.__sourceRowNumber}: ${r.TELEFONO}`);
    expect(invalidos).toEqual([]);
  });

  it('cada TERRITORIAL del archivo resuelve a una territorial del catálogo', () => {
    const sinResolver = [...new Set(capturedRows.map((r) => String(r.TERRITORIAL)))]
      .filter((t) => normalizeBancoDocentePayload({ TERRITORIAL: t }).territorialNombre === null)
      .concat([...new Set(capturedRows.map((r) => String(r.TERRITORIAL)))].filter((t) => !resolveTerritorial(TERRITORIALES, t)));
    expect(sinResolver).toEqual([]);
  });
});
