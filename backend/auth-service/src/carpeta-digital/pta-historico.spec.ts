import express from 'express';
import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ServiceUnavailableException } from '@nestjs/common';
import { PtaHistoricoClient } from './pta-historico.client';
import { CarpetaDigitalService } from './carpeta-digital.service';
import { rundFolderStaticAccess } from './rund-document-access';

const persona = '11111111-1111-4111-8111-111111111111';
const soporte = '33333333-3333-4333-8333-333333333333';
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
const ok = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

beforeEach(() => { process.env.INTERNAL_SERVICE_TOKEN = 'token-ficticio'; process.env.PTA_HISTORICO_API_ENABLED = 'true'; });
afterEach(() => { global.fetch = originalFetch; process.env = { ...originalEnv }; });

describe('Cliente de la API histórica de PTA', () => {
  it('está apagado salvo PTA_HISTORICO_API_ENABLED=true', () => {
    process.env.PTA_HISTORICO_API_ENABLED = 'false';
    expect(new PtaHistoricoClient().enabled).toBe(false);
    process.env.PTA_HISTORICO_API_ENABLED = 'true';
    expect(new PtaHistoricoClient().enabled).toBe(true);
  });

  it('consulta con token interno, sin redirecciones y confirma el conteo', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok({ success: true, data: { items: [{ id: 's1', persona_id: persona }], total: 1 } })) as any;
    await expect(new PtaHistoricoClient().soportesPorPersonas([persona])).resolves.toEqual([{ id: 's1', persona_id: persona }]);
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/internal/rund/v1/carpeta-historica/soportes');
    expect(init.headers['x-internal-service-token']).toBe('token-ficticio');
    expect(init.redirect).toBe('error');
    expect(JSON.parse(init.body)).toEqual({ personaIds: [persona] });
  });

  it('divide las personas en lotes de 500 y no consulta con una lista vacía', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok({ items: [], total: 0 })) as any;
    const client = new PtaHistoricoClient();
    await expect(client.soportesPorPersonas([])).resolves.toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
    const ids = Array.from({ length: 501 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`);
    await client.soportesPorPersonas(ids);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['respuesta HTTP no exitosa', ok({}, 500)],
    ['envoltura fallida', ok({ success: false, data: { items: [], total: 0 } })],
    ['total inconsistente', ok({ items: [{ id: 'a', persona_id: persona }], total: 2 })],
    ['fila sin identidad', ok({ items: [{ id: 'a' }], total: 1 })],
  ])('%s no se interpreta como ausencia', async (_name, response) => {
    global.fetch = jest.fn().mockResolvedValue(response) as any;
    await expect(new PtaHistoricoClient().soportesPorPersonas([persona])).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('una caída de red o la falta de token producen 503', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('red')) as any;
    await expect(new PtaHistoricoClient().perfilesPorPersona(persona)).rejects.toBeInstanceOf(ServiceUnavailableException);
    delete process.env.INTERNAL_SERVICE_TOKEN; delete process.env.PTA_INTERNAL_SERVICE_TOKEN;
    await expect(new PtaHistoricoClient().perfilesPorPersona(persona)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('perfiles rechaza una lista de más de 200 y un ID que no es UUID', async () => {
    global.fetch = jest.fn().mockResolvedValue(ok({ items: Array(201).fill({ id: 'p' }), total: 201 })) as any;
    await expect(new PtaHistoricoClient().perfilesPorPersona(persona)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(new PtaHistoricoClient().perfilesPorPersona('no-uuid')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('persona de soporte distingue ausencia confirmada (404) de un fallo', async () => {
    const client = new PtaHistoricoClient();
    global.fetch = jest.fn().mockResolvedValue(ok({ personaId: persona })) as any;
    await expect(client.personaDeSoporte(soporte)).resolves.toBe(persona);
    global.fetch = jest.fn().mockResolvedValue(ok({}, 404)) as any;
    await expect(client.personaDeSoporte(soporte)).resolves.toBeNull();
    global.fetch = jest.fn().mockResolvedValue(ok({}, 500)) as any;
    await expect(client.personaDeSoporte(soporte)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('original y acceso exigen confirmación explícita del propietario', async () => {
    const client = new PtaHistoricoClient();
    global.fetch = jest.fn().mockResolvedValue(ok({})) as any;
    await expect(client.esOriginalHistorico('/u', 'r', ['E'])).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(client.registrarAcceso({ actorId: 'a', roles: [], endpoint: 'E', recursoId: 'r', campos: [], resultado: 'COMPLETO' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    global.fetch = jest.fn().mockResolvedValue(ok({ esOriginalHistorico: true })) as any;
    await expect(client.esOriginalHistorico('/u', 'r', ['E'])).resolves.toBe(true);
    global.fetch = jest.fn().mockResolvedValue(ok({ registrado: true })) as any;
    await expect(client.registrarAcceso({ actorId: 'a', roles: [], endpoint: 'E', recursoId: 'r', campos: [], resultado: 'COMPLETO' })).resolves.toBeUndefined();
  });
});

describe('Carpeta Digital con la API histórica de PTA habilitada: sin SQL cruzado', () => {
  const carpeta = { id: 'c1', personaId: persona };
  const build = (pta: any, db: any = { query: jest.fn() }) => {
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    Object.assign(service, {
      dataSource: db, ptaHistorico: pta, rundCarpetaClient: { enabled: false },
      documentoRepo: { find: jest.fn().mockResolvedValue([]) },
      ensureCarpetaForPersona: jest.fn().mockResolvedValue(carpeta),
    });
    return { service, db };
  };

  it('perfiles históricos salen de la API y no del esquema de PTA', async () => {
    const pta = { enabled: true, perfilesPorPersona: jest.fn().mockResolvedValue([{ id: 'p1', periodo_carga: '2026-1', estado: 'ACTIVO' }]), registrarAcceso: jest.fn().mockResolvedValue(undefined) };
    const { service, db } = build(pta);
    const result = await service.getRundProfiles(persona, { sub: 'ggp', roles: ['GESTION_PROFESORAL'] });
    expect(result.perfiles).toEqual([expect.objectContaining({ id: 'p1', propietario: 'pta', periodo_carga: '2026-1' })]);
    expect(db.query).not.toHaveBeenCalled();
    expect(pta.registrarAcceso).toHaveBeenCalledTimes(1);
  });

  it('el listado incorpora los soportes históricos de la API y registra la bitácora en PTA por API', async () => {
    const pta = { enabled: true, registrarAcceso: jest.fn().mockResolvedValue(undefined),
      soportesPorPersonas: jest.fn().mockResolvedValue([{ id: 'sop1', persona_id: persona, docente_id: 'd1', tipo_soporte: 'CEDULA', nombre_archivo: 'cedula.pdf', estado: 'APROBADO' }]) };
    const { service, db } = build(pta);
    const docs = await service.listDocumentosByPersona(persona, { sub: 'ggp', roles: ['GESTION_PROFESORAL'] });
    expect(docs).toEqual([expect.objectContaining({ id: 'rund:sop1', servicio_propietario: 'pta' })]);
    expect(pta.soportesPorPersonas).toHaveBeenCalledWith([persona]);
    expect(db.query).not.toHaveBeenCalled();
    expect(pta.registrarAcceso).toHaveBeenCalled();
  });

  it('si PTA no responde, el listado falla en lugar de omitir sus soportes', async () => {
    const pta = { enabled: true, soportesPorPersonas: jest.fn().mockRejectedValue(new ServiceUnavailableException()), registrarAcceso: jest.fn() };
    const { service } = build(pta);
    await expect(service.listDocumentosByPersona(persona)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('un soporte histórico se resuelve por la API y una ausencia confirmada es 404', async () => {
    const pta = { enabled: true, personaDeSoporte: jest.fn().mockResolvedValue(null) };
    const { service, db } = build(pta);
    await expect(service.getDocumento(`rund:${soporte}`)).rejects.toMatchObject({ status: 404 });
    expect(pta.personaDeSoporte).toHaveBeenCalledWith(soporte);
    expect(db.query).not.toHaveBeenCalled();
  });

  it('el conteo agregado usa un solo lote de la API y ninguna consulta SQL a PTA', async () => {
    const pta = { enabled: true, registrarAcceso: jest.fn().mockResolvedValue(undefined),
      soportesPorPersonas: jest.fn().mockResolvedValue([{ id: 's1', persona_id: persona, estado: 'APROBADO' }]) };
    const manager = { getRepository: () => ({ find: jest.fn().mockResolvedValue([]) }), query: jest.fn() };
    const { service } = build(pta, { transaction: async (_level: string, cb: any) => cb(manager) });
    service.rundCarpetaClient = { enabled: true, stats: jest.fn().mockResolvedValue(new Map([[persona, { persona_id: persona, total_documentos: 0, documentos_completos: 0, documentos_pendientes: 0, documentos_rechazados: 0, documentos_vencidos: 0 }]])) };
    const stats = await service.aggregateStats([carpeta]);
    expect(pta.soportesPorPersonas).toHaveBeenCalledWith([persona]);
    expect(manager.query).not.toHaveBeenCalled();
    expect(stats.get(persona).estadisticas_por_propietario.pta.total_documentos).toBe(1);
  });
});

describe('Acceso estático a originales con la API histórica de PTA', () => {
  const jwt = new JwtService({ secret: 'pta-historico-test' });
  const path = '/uploads/carpeta-digital/persona/historico.pdf';
  const app = (db: any, pta: any, rund?: any) => {
    const server = express(); server.use(rundFolderStaticAccess(db, jwt, rund, pta));
    server.get('/uploads/{*path}', (_req, res) => res.send('original sensible'));
    return server;
  };
  const ggp = `Bearer ${jwt.sign({ sub: 'ggp', roles: ['GESTION_PROFESORAL'] })}`;

  it('protege un original histórico confirmado por PTA y registra el acceso por API', async () => {
    const db = { query: jest.fn().mockResolvedValue([]) };
    const pta = { enabled: true, esOriginalHistorico: jest.fn().mockResolvedValue(true), registrarAcceso: jest.fn().mockResolvedValue(undefined) };
    const server = app(db, pta, { esOriginalRund: jest.fn().mockResolvedValue(false), registrarAcceso: jest.fn() });
    await request(server).get(path).expect(401);
    await request(server).get(path).set('Authorization', ggp).expect(200, 'original sensible');
    expect(db.query.mock.calls.every(([sql]: [string]) => !sql.includes('academic_work_plan'))).toBe(true);
  });

  it('un adjunto general sigue accesible tras la confirmación negativa de PTA y RUND', async () => {
    const db = { query: jest.fn().mockResolvedValue([]) };
    const pta = { enabled: true, esOriginalHistorico: jest.fn().mockResolvedValue(false), registrarAcceso: jest.fn() };
    const rund = { esOriginalRund: jest.fn().mockResolvedValue(false), registrarAcceso: jest.fn() };
    await request(app(db, pta, rund)).get(path).expect(200, 'original sensible');
    expect(pta.esOriginalHistorico).toHaveBeenCalledTimes(1);
    expect(rund.esOriginalRund).toHaveBeenCalledTimes(1);
  });

  it('si PTA no responde no entrega el archivo', async () => {
    const db = { query: jest.fn().mockResolvedValue([]) };
    const pta = { enabled: true, esOriginalHistorico: jest.fn().mockRejectedValue(new ServiceUnavailableException()), registrarAcceso: jest.fn() };
    const result = await request(app(db, pta)).get(path).expect(503);
    expect(result.text).not.toContain('original sensible');
  });

  it('con la API apagada conserva la consulta SQL de transición', async () => {
    const db = { query: jest.fn(async (sql: string) => sql.includes('to_regclass') ? [{ soportes: true, accesos: false }] : sql.includes('RundSoporteCampo') ? [{ id: 's1' }] : []) };
    const pta = { enabled: false, esOriginalHistorico: jest.fn(), registrarAcceso: jest.fn() };
    const rund = { esOriginalRund: jest.fn(), registrarAcceso: jest.fn().mockResolvedValue(undefined) };
    await request(app(db, pta, rund)).get(path).expect(401);
    expect(pta.esOriginalHistorico).not.toHaveBeenCalled();
  });
});
