import { BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { INTERNAL_TOKEN_HEADER, InternalServiceGuard } from './internal-service.guard';
import { InternalRundService } from './internal-rund.service';

const contexto = (headers: Record<string, string> = {}) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as any;

describe('InternalServiceGuard', () => {
  const entorno = { ...process.env };
  afterEach(() => { process.env = { ...entorno }; });

  it('acepta el token de servicio configurado', () => {
    process.env.INTERNAL_SERVICE_TOKEN = 'secreto-de-prueba';
    expect(new InternalServiceGuard().canActivate(contexto({ [INTERNAL_TOKEN_HEADER]: 'secreto-de-prueba' }))).toBe(true);
  });

  it.each([
    ['sin cabecera', {}],
    ['token distinto', { [INTERNAL_TOKEN_HEADER]: 'otro' }],
    ['token vacío', { [INTERNAL_TOKEN_HEADER]: '' }],
    ['un JWT de usuario no sirve como credencial', { authorization: 'Bearer abc' }],
  ])('rechaza %s', (_caso, headers) => {
    process.env.INTERNAL_SERVICE_TOKEN = 'secreto-de-prueba';
    expect(() => new InternalServiceGuard().canActivate(contexto(headers as any))).toThrow(UnauthorizedException);
  });

  it('en producción exige que el token esté configurado', () => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
    process.env.NODE_ENV = 'production';
    expect(() => new InternalServiceGuard().canActivate(contexto({ [INTERNAL_TOKEN_HEADER]: 'x' }))).toThrow(/INTERNAL_SERVICE_TOKEN/);
  });
});

describe('InternalRundService', () => {
  const validacion = { getRundDocente: jest.fn().mockResolvedValue({ docenteId: 'd1', completitud: 0, validaciones: [] }) };
  const crear = (respuesta: any = []) => {
    const query = jest.fn().mockResolvedValue(respuesta);
    return { service: new InternalRundService({ query } as any, validacion as any), query };
  };

  it('devuelve el perfil del docente por documento leyendo del esquema rund', async () => {
    const { service, query } = crear([{ idDocente: 'd1', documento: '123' }]);
    await expect(service.docentePorDocumento(' 123 ')).resolves.toEqual({ idDocente: 'd1', documento: '123' });
    expect(query.mock.calls[0][0]).toContain('FROM rund."Docente"');
    expect(query.mock.calls[0][0]).not.toContain('academic_work_plan."Docente"');
    expect(query.mock.calls[0][1]).toEqual(['123']);
  });

  it('404 si el documento no existe y 400 si viene vacío', async () => {
    await expect(crear([]).service.docentePorDocumento('999')).rejects.toBeInstanceOf(NotFoundException);
    await expect(crear().service.docentePorDocumento('  ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lista los soportes por persona desde rund', async () => {
    const { service, query } = crear([{ id: 's1' }]);
    await expect(service.soportesPorPersona('p1')).resolves.toEqual([{ id: 's1' }]);
    expect(query.mock.calls[0][0]).toContain('rund."RundSoporteCampo"');
    expect(query.mock.calls[0][1]).toEqual(['p1']);
  });

  it('registra el acceso a documentos en la bitácora de rund y valida los datos', async () => {
    const { service, query } = crear();
    await service.registrarAccesoDocumento({ actorId: 'u1', roles: ['SUPER_ADMIN'], endpoint: 'X', recursoId: 'r', resultado: 'COMPLETO' });
    expect(query.mock.calls[0][0]).toContain('rund."RundAccesoDatosLog"');
    await expect(service.registrarAccesoDocumento({ actorId: '', roles: [], endpoint: 'X', recursoId: 'r', resultado: 'COMPLETO' }))
      .rejects.toBeInstanceOf(BadRequestException);
  });

  it('reconoce un original RUND solo si hay un soporte o un acceso registrado', async () => {
    await expect(crear([{ id: '1' }]).service.esOriginalRund('/u', 'h', ['E'])).resolves.toEqual({ esOriginalRund: true });
    await expect(crear([]).service.esOriginalRund('/u', 'h', ['E'])).resolves.toEqual({ esOriginalRund: false });
  });

  it('arma las estadísticas del backoffice y tolera consultas que fallan', async () => {
    const query = jest.fn()
      .mockResolvedValueOnce([{ total: 277, sinCetap: 270 }])
      .mockRejectedValue(new Error('tabla ausente'));
    const stats = await new InternalRundService({ query } as any, validacion as any).estadisticasBackoffice();
    expect(stats).toMatchObject({ totalDocentes: 277, docentesSinCetap: 270, porVinculacion: [], coberturaTerritorial: [] });
  });

  it('pagina los docentes para sincronizar con cursor sobre el id y limita el tamaño', async () => {
    const filas = Array.from({ length: 3 }, (_v, i) => ({ fila: { id: `d${i}` } }));
    const { service, query } = crear(filas);
    // limite 2 -> se piden 3 filas para saber si hay más: hay página siguiente.
    await expect(service.docentesParaSincronizar(null, 2)).resolves.toEqual({ items: [{ id: 'd0' }, { id: 'd1' }], nextCursor: 'd1' });
    expect(query.mock.calls[0][1]).toEqual([null, 3]);
    // la última página no trae cursor
    await expect(crear([{ fila: { id: 'd9' } }]).service.docentesParaSincronizar('d8', 10)).resolves.toEqual({ items: [{ id: 'd9' }], nextCursor: null });
    // un límite absurdo se acota
    const grande = crear([]);
    await grande.service.docentesParaSincronizar(null, 100000);
    expect(grande.query.mock.calls[0][1]).toEqual([null, 501]);
  });

  it('resuelve un docente por id propio o por persona, y 404/400 en los casos límite', async () => {
    const { service, query } = crear([{ fila: { id: 'd1', personaId: 'p1' } }]);
    await expect(service.docentePorClave('p1', '2026-2')).resolves.toEqual({ id: 'd1', personaId: 'p1' });
    expect(query.mock.calls[0][0]).toContain('rund."Docente"');
    expect(query.mock.calls[0][1]).toEqual(['p1', '2026-2']);
    await expect(crear([]).service.docentePorClave('nada')).rejects.toBeInstanceOf(NotFoundException);
    await expect(crear().service.docentePorClave('  ')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('entrega la validación documental del servicio de RUND', async () => {
    await expect(crear().service.validacionDocumental('d1')).resolves.toMatchObject({ docenteId: 'd1' });
    expect(validacion.getRundDocente).toHaveBeenCalledWith('d1');
  });

  it('serializa la fila en Postgres (to_jsonb) para que las fechas sin zona horaria no se desplacen', async () => {
    const { service, query } = crear([{ fila: { id: 'd1', createdAt: '2026-10-13T20:30:53.822' } }]);
    await service.docentesParaSincronizar(null, 10);
    await service.docentePorClave('d1');
    for (const [sql] of query.mock.calls) expect(String(sql)).toContain('to_jsonb(d)');
  });
});
