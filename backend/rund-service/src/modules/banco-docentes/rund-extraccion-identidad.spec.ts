import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { EXTRACTION_FIELDS, extractionProfile } from './rund-extraccion-fields';
import { RundExtraccionService } from './rund-extraccion.service';

const personaId = '11111111-1111-4111-8111-111111111111';
const ficha = { personaId, nom_largo: ' NOMBRE FICTICIO ', num_identificacion: ' 001.23 ', tip_identificacion: 'CC',
  gen_tercero: 'F', fec_nacimiento: '1980-01-17' };

describe('Contexto OCR por API Auth', () => {
  function build(profile = { pregrado: ' Título vigente ', sexoBiologico: 'Mujer', fec_nacimiento: new Date('1980-01-17T00:00:00Z'),
    nom_largo: ficha.nom_largo, num_identificacion: ficha.num_identificacion, tip_identificacion: 'CC', gen_tercero: 'F' } as any) {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ personaId }]).mockResolvedValueOnce([profile]);
    const transaction = jest.fn(async (_isolation, work) => work({ query }));
    const identities = { fichaPorPersona: jest.fn().mockResolvedValue(ficha) } as any;
    return { db: { transaction } as any, query, transaction, identities };
  }
  it('mantiene las claves, formato, ceros, espacios recortados y datos nativos del contexto anterior', async () => {
    const { db, query, identities, transaction } = build();
    const context = await extractionProfile(db, 'perfil-textual', identities);
    expect(Object.keys(context)).toEqual(Object.keys(EXTRACTION_FIELDS));
    expect(context).toMatchObject({ nombreCompleto: 'NOMBRE FICTICIO', documentNumber: '001.23', documentType: 'CC',
      genero: 'F', fechaNacimiento: '1980-01-17', sexoBiologico: 'Mujer', pregrado: 'Título vigente', maestria: '' });
    expect(transaction).toHaveBeenCalledWith('REPEATABLE READ', expect.any(Function));
    expect(query.mock.calls[0]).toEqual(['SET TRANSACTION READ ONLY']);
    expect(identities.fichaPorPersona).toHaveBeenCalledWith(personaId);
    expect(query.mock.calls[2][1]).toEqual(['perfil-textual', ficha.nom_largo, ficha.num_identificacion, 'CC', 'F', '1980-01-17']);
    expect(query.mock.calls[2][0]).toContain('$6::date AS fec_nacimiento');
    expect(query.mock.calls.every(([sql]) => !/auth\.|academic_work_plan\.|^\s*(INSERT|UPDATE|DELETE)\b/.test(sql))).toBe(true);
  });
  it('nulos y nombres vacíos no se reemplazan con datos históricos del perfil', async () => {
    const { db, identities, query } = build({ datosCargaMasiva: { nombreCompleto: 'ANTIGUO' } });
    identities.fichaPorPersona.mockResolvedValue({ personaId, nom_largo: '', num_identificacion: null, tip_identificacion: null, gen_tercero: null, fec_nacimiento: null });
    expect(Object.values(await extractionProfile(db, 'perfil', identities)).every(value => value === '')).toBe(true);
    expect(query.mock.calls[2][1]).toEqual(['perfil', '', null, null, null, null]);
  });
  it('perfil nativo inexistente conserva 400 y no consulta Auth', async () => {
    const { db, query, identities } = build(); query.mockReset().mockResolvedValue([]);
    await expect(extractionProfile(db, 'ausente', identities)).rejects.toBeInstanceOf(BadRequestException);
    expect(identities.fichaPorPersona).not.toHaveBeenCalled();
  });
  it('persona ausente confirmada conserva el rechazo del INNER JOIN anterior', async () => {
    const { db, query, identities } = build(); identities.fichaPorPersona.mockResolvedValue(null);
    await expect(extractionProfile(db, 'perfil', identities)).rejects.toThrow('Perfil docente no encontrado.');
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('caída del propietario no devuelve contexto vacío ni consulta tablas externas', async () => {
    const { db, query, identities } = build(); identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(extractionProfile(db, 'perfil', identities)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('error nativo se propaga sin llamar al propietario', async () => {
    const { db, query, identities } = build(); query.mockReset().mockRejectedValue(new Error('BD nativa no disponible'));
    await expect(extractionProfile(db, 'perfil', identities)).rejects.toThrow('BD nativa no disponible');
    expect(identities.fichaPorPersona).not.toHaveBeenCalled();
  });
});

describe('OCR no procesa un contexto de identidad sin confirmar', () => {
  const previous = process.env.RUND_OCR_ENABLED, originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch;
    if (previous === undefined) delete process.env.RUND_OCR_ENABLED; else process.env.RUND_OCR_ENABLED = previous; });
  it.each(['missing', 'unavailable'])('estado de identidad %s no lee PDF, no llama motores ni genera sugerencias', async mode => {
    process.env.RUND_OCR_ENABLED = 'true';
    const job = { id: 'trabajo', docente_id: 'perfil', documento_id: 'documento', lease_id: 'reserva', intentos: 1 };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('SELECT * FROM reservado')) return [job];
      if (sql.includes('SELECT * FROM rund."RundDocumentoPerfil"')) return [{ estado: 'ACTIVO', tipo_soporte: 'documento_identidad' }];
      if (sql.includes('SELECT d."personaId"')) return [{ personaId }];
      return [];
    });
    const db = { query, transaction: jest.fn(async (_isolation, work) => work({ query })) };
    const identities = { fichaPorPersona: mode === 'missing' ? jest.fn().mockResolvedValue(null) : jest.fn().mockRejectedValue(new ServiceUnavailableException()) };
    const storage = { read: jest.fn() }; const fetch = jest.fn(); global.fetch = fetch;
    const service = new RundExtraccionService(db as any, storage as any, identities as any);
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
    await expect(service.tick()).resolves.toBeUndefined();
    expect(storage.read).not.toHaveBeenCalled(); expect(fetch).not.toHaveBeenCalled();
    expect(query).toHaveBeenCalledWith(expect.stringContaining("error_codigo='EXTRACCION_NO_DISPONIBLE'"), [job.id, job.lease_id]);
    expect(query.mock.calls.some(([sql]) => /INSERT INTO rund\."RundExtraccionSugerencia"|UPDATE auth\.|UPDATE rund\."Docente"/.test(sql))).toBe(false);
    await service.onModuleDestroy();
  });
  it('OCR desactivado tampoco consulta la identidad ni activa motores', async () => {
    delete process.env.RUND_OCR_ENABLED;
    const identities = { fichaPorPersona: jest.fn() }; const db = { query: jest.fn() };
    const service = new RundExtraccionService(db as any, {} as any, identities as any);
    await service.tick(); expect(db.query).not.toHaveBeenCalled(); expect(identities.fichaPorPersona).not.toHaveBeenCalled();
  });
});
