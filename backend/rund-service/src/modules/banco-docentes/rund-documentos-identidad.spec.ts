import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RundDocumentosService } from './rund-documentos.service';
import { assertRundEvidenceData } from './rund-evidence-data';

const personaId = '11111111-1111-4111-8111-111111111111';
describe('Identidad propietaria del expediente documental', () => {
  function build() {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([{ personaId }])
      .mockResolvedValueOnce([{ id: 'RUND-TEXTUAL', document_number: '001.23' }]);
    const transaction = jest.fn(async (_isolation, run) => run({ query }));
    const identities = { coincidenciasUnicidad: jest.fn().mockResolvedValue([{ personaId, documento: '001.23', nombre: 'Nombre' }]) };
    const storage = { store: jest.fn() };
    const service = new RundDocumentosService({ transaction } as any, storage as any, identities as any);
    return { service, query, transaction, identities, storage };
  }
  it('resuelve los tres criterios con un snapshot nativo de solo lectura y una proyección Auth', async () => {
    const { service, query, transaction, identities } = build();
    await expect((service as any).requireDocente('RUND-TEXTUAL')).resolves.toEqual({ id: 'RUND-TEXTUAL', document_number: '001.23' });
    expect(transaction).toHaveBeenCalledWith('REPEATABLE READ', expect.any(Function));
    expect(query.mock.calls[0]).toEqual(['SET TRANSACTION READ ONLY']);
    expect(identities.coincidenciasUnicidad).toHaveBeenCalledWith('RUND-TEXTUAL', [personaId]);
    const sql = query.mock.calls[2][0];
    expect(sql).toContain('d.id::text=$1 OR d."personaId"::text=$1 OR p.documento=$1');
    expect(sql).toContain('ORDER BY d."updatedAt" DESC NULLS LAST LIMIT 1');
    expect(sql).not.toMatch(/UPPER|BTRIM|regexp_replace/);
    expect(query.mock.calls.every(([sql]) => !/auth\.|academic_work_plan\.|INSERT|UPDATE|DELETE/.test(sql))).toBe(true);
  });
  it('ausencia confirmada conserva 404 después de consultar las coincidencias', async () => {
    const { service, query, identities } = build();
    query.mockReset().mockResolvedValue([]); identities.coincidenciasUnicidad.mockResolvedValue([]);
    await expect((service as any).requireDocente('ausente')).rejects.toBeInstanceOf(NotFoundException);
    expect(identities.coincidenciasUnicidad).toHaveBeenCalledWith('ausente', []);
  });
  it('fallo de Auth detiene el ensamblado antes de seleccionar un perfil sin identidad', async () => {
    const { service, query, identities, storage } = build();
    identities.coincidenciasUnicidad.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.list('RUND-TEXTUAL')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).toHaveBeenCalledTimes(2); expect(storage.store).not.toHaveBeenCalled();
  });
  it('error SQL nativo no se transforma en ausencia ni requiere llamar Auth', async () => {
    const { service, query, identities } = build(); query.mockReset().mockRejectedValue(new Error('fuente nativa'));
    await expect((service as any).requireDocente('id')).rejects.toThrow('fuente nativa');
    expect(identities.coincidenciasUnicidad).not.toHaveBeenCalled();
  });
});

describe('Evidencias con identidad Auth y datos nativos vigentes', () => {
  const ficha = { num_identificacion: '00123', nom_largo: 'NOMBRE', gen_tercero: 'X', fec_nacimiento: '1980-01-17' };
  function build(profile: any = { personaId }) {
    const query = { query: jest.fn().mockImplementation(async () => profile ? [{ ...profile }] : []) };
    const identities = { fichaPorPersona: jest.fn().mockResolvedValue(ficha) } as any;
    return { query, identities };
  }
  it.each(['DOCUMENTO_IDENTIDAD', 'NOMBRE_COMPLETO', 'GENERO', 'SEXO_BIOLOGICO', 'FECHA_NACIMIENTO'])(
    'identidad de la fila %s proviene de Auth', async campo => {
      const { query, identities } = build();
      await expect(assertRundEvidenceData(query, 'perfil', identities, 'documento_identidad', campo)).resolves.toBeUndefined();
      expect(identities.fichaPorPersona).toHaveBeenCalledWith(personaId);
      expect(query.query).toHaveBeenCalledWith('SELECT d.* FROM rund."Docente" d WHERE d.id::text = $1', ['perfil']);
    });
  it.each(['num_identificacion', 'nom_largo', 'gen_tercero', 'fec_nacimiento'])(
    'no acepta %s de una copia nativa o datosCargaMasiva cuando Auth confirma ausencia', async field => {
      const { query, identities } = build({ personaId, [field]: 'VALOR ANTIGUO', datosCargaMasiva: ficha });
      identities.fichaPorPersona.mockResolvedValue(null);
      await expect(assertRundEvidenceData(query, 'perfil', identities, 'documento_identidad')).rejects.toBeInstanceOf(BadRequestException);
    });
  it('sexo biológico nativo sigue habilitando su fila si la persona está ausente en Auth', async () => {
    const { query, identities } = build({ personaId, sexoBiologico: 'Femenino' }); identities.fichaPorPersona.mockResolvedValue(null);
    await expect(assertRundEvidenceData(query, 'perfil', identities, 'documento_identidad', 'SEXO_BIOLOGICO')).resolves.toBeUndefined();
    await expect(assertRundEvidenceData(query, 'perfil', identities, 'documento_identidad', 'DOCUMENTO_IDENTIDAD')).rejects.toBeInstanceOf(BadRequestException);
  });
  it('fallo del propietario no equivale a dato vacío y no escribe', async () => {
    const { query, identities } = build(); identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(assertRundEvidenceData(query, 'perfil', identities, 'pasaporte')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query.query).toHaveBeenCalledTimes(1);
  });
  it.each([['acta_grado_maestria', { maestria: 'Título vigente' }], ['resolucion_puntaje_salarial', { puntajeSalarial: 0 }],
    ['contrato', { fechaInicioVinculacion: '2026-01-01' }]])('la fila nativa %s no requiere identidad remota', async (type, values) => {
    const { query, identities } = build({ personaId, ...values }); identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(assertRundEvidenceData(query, 'perfil', identities, type)).resolves.toBeUndefined();
    expect(identities.fichaPorPersona).not.toHaveBeenCalled();
  });
  it('perfil inexistente rechaza el soporte sin consultar identidad', async () => {
    const { query, identities } = build(null);
    await expect(assertRundEvidenceData(query, 'perfil', identities, 'documento_identidad')).rejects.toBeInstanceOf(BadRequestException);
    expect(identities.fichaPorPersona).not.toHaveBeenCalled();
  });
  it('fila o soporte desconocido se rechaza antes de consultar datos', async () => {
    const { query, identities } = build();
    for (const [type, campo] of [['inventado', undefined], ['documento_identidad', 'inventado']]) {
      await expect(assertRundEvidenceData(query, 'perfil', identities, type, campo)).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(query.query).not.toHaveBeenCalled(); expect(identities.fichaPorPersona).not.toHaveBeenCalled();
  });
});

describe('Revalidación documental y rollback ante fallos de identidad', () => {
  function build() {
    const profile = { id: 'perfil', personaId };
    const current = { id: 'anterior', tipo_soporte: 'documento_identidad', categoria_codigo: 'IDENTIDAD', version: 1 };
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('RundDocumentoCategoria')) return [{ codigo: 'IDENTIDAD', mime_permitidos: ['application/pdf'], tamano_maximo_bytes: 1024 }];
      if (sql.includes('SELECT d.*')) return [{ ...profile }];
      if (sql.includes('FROM rund."RundDocumentoPerfil"') && sql.includes('WHERE id =')) return [current];
      return [];
    });
    const runner = { isTransactionActive: true, query: jest.fn(async (sql: string) => sql.includes('"Docente"') ? [{ ...profile }] : []),
      connect: jest.fn(), startTransaction: jest.fn(), commitTransaction: jest.fn(), rollbackTransaction: jest.fn(), release: jest.fn() };
    const createQueryRunner = jest.fn(() => runner);
    const storage = { store: jest.fn().mockResolvedValue({ provider: 'LOCAL', storagePath: 'temporal.pdf' }), remove: jest.fn().mockResolvedValue(undefined) };
    const identities = { fichaPorPersona: jest.fn().mockResolvedValue({ num_identificacion: '00123' }) } as any;
    const service = new RundDocumentosService({ query, createQueryRunner } as any, storage as any, identities);
    jest.spyOn(service as any, 'requireDocente').mockResolvedValue({ ...profile, document_number: '00123' });
    const file = { originalname: 'prueba.pdf', mimetype: 'application/pdf', size: 10, buffer: Buffer.from('%PDF-1.7\n') } as any;
    const data = { categoria: 'IDENTIDAD', tipoSoporte: 'documento_identidad', campo: 'DOCUMENTO_IDENTIDAD' };
    return { service, identities, storage, runner, createQueryRunner, query, file, data };
  }
  it('Auth falla antes de almacenar el PDF o abrir transacción de escritura', async () => {
    const { service, identities, storage, createQueryRunner, file, data } = build();
    identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.create('perfil', data, file, 'actor')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(storage.store).not.toHaveBeenCalled(); expect(createQueryRunner).not.toHaveBeenCalled();
  });
  it.each([null, 'unavailable'])('identidad cambia/falla en la revalidación %s: rollback sin dejar un PDF almacenado', async failure => {
    const { service, identities, storage, runner, file, data } = build();
    if (failure === null) identities.fichaPorPersona.mockResolvedValueOnce({ num_identificacion: '00123' }).mockResolvedValueOnce(null);
    else identities.fichaPorPersona.mockResolvedValueOnce({ num_identificacion: '00123' }).mockRejectedValueOnce(new ServiceUnavailableException());
    await expect(service.create('perfil', data, file, 'actor')).rejects.toBeInstanceOf(failure === null ? BadRequestException : ServiceUnavailableException);
    expect(identities.fichaPorPersona).toHaveBeenCalledTimes(2);
    expect(runner.rollbackTransaction).toHaveBeenCalled(); expect(runner.release).toHaveBeenCalled();
    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.query.mock.calls.some(([sql]) => /^\s*(INSERT|UPDATE|DELETE)\b/.test(sql))).toBe(false);
    // La revalidación ocurre bajo bloqueo y antes de escribir el archivo: no queda un PDF huérfano que retirar.
    expect(storage.store).not.toHaveBeenCalled(); expect(storage.remove).not.toHaveBeenCalled();
  });
  it('dato nativo eliminado después del preflight se vuelve a validar dentro del bloqueo', async () => {
    const { service, identities, storage, runner, query, file } = build();
    const original = query.getMockImplementation()!;
    query.mockImplementation(async sql => sql.includes('SELECT d.*') ? [{ id: 'perfil', personaId, pregrado: 'Título' }] : original(sql));
    await expect(service.create('perfil', { categoria: 'TITULOS', bloque: 'FORMACION', tipoSoporte: 'diploma_pregrado' }, file, 'actor')).rejects.toBeInstanceOf(BadRequestException);
    expect(identities.fichaPorPersona).not.toHaveBeenCalled();
    expect(runner.rollbackTransaction).toHaveBeenCalled(); expect(storage.store).not.toHaveBeenCalled(); expect(storage.remove).not.toHaveBeenCalled();
  });
  it('reemplazo con Auth caído conserva la versión anterior y no almacena una nueva', async () => {
    const { service, identities, storage, runner, file } = build(); identities.fichaPorPersona.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.replace('perfil', 'anterior', file, 'actor', undefined, undefined, 'DOCUMENTO_IDENTIDAD')).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(storage.store).not.toHaveBeenCalled(); expect(storage.remove).not.toHaveBeenCalled();
    expect(runner.rollbackTransaction).toHaveBeenCalled(); expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.query.mock.calls.some(([sql]) => /^\s*(INSERT|UPDATE|DELETE)\b/.test(sql))).toBe(false);
  });
});
