import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import { join, resolve } from 'path';
import { CarpetaDigitalController } from './carpeta-digital.controller';
import { CarpetaDigitalService } from './carpeta-digital.service';
import { DocumentTypeValidatorService } from './document-type-validator.service';

describe('Carpeta Digital: archivo persistido y confirmación HTTP', () => {
  let app: INestApplication, directory: string, cwd: jest.SpyInstance;
  const persona = randomUUID();
  const service = { getCarpetaByPersona: jest.fn(), createDocumento: jest.fn(), findTipoDocumentoById: jest.fn(), getDocumento: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [CarpetaDigitalController], providers: [
      { provide: CarpetaDigitalService, useValue: service }, { provide: DocumentTypeValidatorService, useValue: { validate: jest.fn() } },
    ] }).compile();
    app = module.createNestApplication(); await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    const parent = resolve(__dirname, '../../../../tmp'); fs.mkdirSync(parent, { recursive: true });
    directory = fs.mkdtempSync(join(parent, 'rund-carpeta-upload-'));
    cwd = jest.spyOn(process, 'cwd').mockReturnValue(directory);
    service.getCarpetaByPersona.mockResolvedValue({ persona_id: persona });
    service.createDocumento.mockImplementation(async data => ({ id: 'doc-ficticio', servicio_propietario: 'auth', persistido: true, url_archivo: data.urlArchivo }));
  });
  afterEach(() => {
    cwd.mockRestore();
    const parent = resolve(__dirname, '../../../../tmp');
    if (resolve(directory).startsWith(parent + require('path').sep)) fs.rmSync(directory, { recursive: true, force: true });
  });
  afterAll(async () => { await app.close(); });
  it('escribe bytes reales bajo la persona canónica antes de confirmar el registro', async () => {
    const bytes = Buffer.from('%PDF-1.7 ARCHIVO FICTICIO');
    const result = await request(app.getHttpServer()).post('/carpeta-digital/persona/usuario-publico/documentos/upload').attach('file', bytes, 'Archivo.pdf').expect(201);
    expect(result.body.data.persistido).toBe(true);
    const data = service.createDocumento.mock.calls[0][0]; expect(data.personaId).toBe(persona);
    const files = fs.readdirSync(join(directory, 'uploads/carpeta-digital', persona)); expect(files).toHaveLength(1);
    expect(fs.readFileSync(join(directory, 'uploads/carpeta-digital', persona, files[0]))).toEqual(bytes);
    expect(data.urlArchivo).toContain(persona); expect(data.urlArchivo).not.toContain('usuario-publico');
  });
  it('si falla guardar el registro, limpia solo el archivo nuevo y conserva los anteriores', async () => {
    const dest = join(directory, 'uploads/carpeta-digital', persona); fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(join(dest, 'anterior.pdf'), 'ANTERIOR');
    service.createDocumento.mockRejectedValueOnce(new Error('Fallo ficticio de persistencia'));
    await request(app.getHttpServer()).post(`/carpeta-digital/persona/${persona}/documentos/upload`).attach('file', Buffer.from('PDF'), 'Nuevo.pdf').expect(500);
    expect(fs.readdirSync(dest)).toEqual(['anterior.pdf']); expect(fs.readFileSync(join(dest, 'anterior.pdf'), 'utf8')).toBe('ANTERIOR');
  });
  it('no escribe archivos para identidad resuelta inválida', async () => {
    service.getCarpetaByPersona.mockResolvedValueOnce({ persona_id: '../../fuera' });
    await request(app.getHttpServer()).post('/carpeta-digital/persona/desconocido/documentos/upload').attach('file', Buffer.from('PDF'), 'Archivo.pdf').expect(400);
    expect(service.createDocumento).not.toHaveBeenCalled(); expect(fs.existsSync(join(directory, 'uploads'))).toBe(false);
  });
  it('no anuncia subida sin archivo', async () => {
    const result = await request(app.getHttpServer()).post(`/carpeta-digital/persona/${persona}/documentos/upload`).expect(201);
    expect(result.body.success).toBe(false); expect(service.createDocumento).not.toHaveBeenCalled();
  });
});

describe('identidad y actor resueltos por el servidor', () => {
  const persona = randomUUID(), userId = randomUUID(), signed = randomUUID();
  it('resuelve usuario público a persona y reutiliza su carpeta existente', async () => {
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    const carpeta = { id: randomUUID(), personaId: persona };
    const repo = { findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(carpeta), save: jest.fn() };
    const people = { findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: persona }) };
    const db = { query: jest.fn().mockResolvedValue([{ id_person: persona }]) };
    Object.assign(service, { carpetaRepo: repo, personRepo: people, dataSource: db });
    expect(await service.ensureCarpetaForPersona(userId)).toBe(carpeta);
    expect(db.query.mock.calls[0][1]).toEqual([userId]); expect(repo.save).not.toHaveBeenCalled();
  });
  it('usa el actor firmado, jamás el nombre o UUID declarado en el body', async () => {
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    const row = { id: randomUUID(), estado: 'pendiente', categoria: 'otros', validadoPor: null };
    const repo = { findOne: jest.fn().mockResolvedValue(row), save: jest.fn(async x => x) };
    const db = { query: jest.fn().mockResolvedValue([{ id_user: signed }]) };
    Object.assign(service, { documentoRepo: repo, dataSource: db });
    await service.validateDocumento(row.id, { estado: 'validado', validadoPor: 'ACTOR_INVENTADO' }, { sub: userId });
    expect(repo.save.mock.calls[0][0].validadoPor).toBe(signed); expect(db.query.mock.calls[0][1]).toEqual([userId]);
  });
  it('consulta documentos propios con propietario explícito y sin historial inventado', async () => {
    const service = Object.create(CarpetaDigitalService.prototype) as any;
    const row = { id: randomUUID(), categoria: 'otros', carpetaDigital: { personaId: persona } };
    Object.assign(service, { documentoRepo: { findOne: jest.fn().mockResolvedValue(row) } });
    expect(await service.getDocumento(row.id)).toMatchObject({ id: row.id, servicio_propietario: 'auth', persistido: true, versionado_disponible: false, version_actual: null });
  });
});
