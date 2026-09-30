import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { mkdtemp, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { PendientesService } from '../legalizacion/pendientes.service';
import { PazYSalvoService } from './paz-y-salvo.service';
import { PazYSalvoPdfService } from './paz-y-salvo-pdf.service';
import { TerritorialPazYSalvoService } from './territorial.service';

config();
const dbDescribe = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;
dbDescribe('EFDS-1311 :: PostgreSQL real', () => {
  const persona = (n: number) => `13110000-0000-4000-8000-00000000900${n}`;
  const usuario = { userId: '13110000-0002-4000-8000-000000009001', username: 'Coordinadora prueba' };
  let db: DataSource;
  let pendientes: PendientesService;
  let service: PazYSalvoService;
  let otp: any;
  const documentos: string[] = [];
  const centralOriginal = process.env.PAZ_Y_SALVO_SECCIONAL_CENTRAL_ID;
  beforeAll(async () => {
    db = new DataSource({ type: 'postgres', host: process.env.DB_HOST, port: Number(process.env.DB_PORT),
      username: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME });
    await db.initialize();
    await db.query(await readFile(join(process.cwd(), 'db/dev-fixtures/fixture_paz_y_salvo_9001.sql'), 'utf8'));
    await db.query(await readFile(join(process.cwd(), 'db/dev-fixtures/fixture_paz_y_salvo_territorial.sql'), 'utf8'));
    process.env.PAZ_Y_SALVO_SECCIONAL_CENTRAL_ID = '13119001';
    process.env.TRAVEL_EXPENSES_STORAGE_PATH = join(await mkdtemp(join(tmpdir(), 'efds1311-')), 'uploads');
    pendientes = new PendientesService(db);
    otp = { solicitar: jest.fn(async () => ({ email: 'coordinadora@example.invalid' })),
      verificar: jest.fn(async (context: string) => ({ context, id: 'OTP-TEST', metodo: 'OTP_EMAIL',
        email: 'coordinadora@example.invalid', fechaFirma: new Date().toISOString() })) };
    service = new PazYSalvoService(db, pendientes, otp, new PazYSalvoPdfService(), new TerritorialPazYSalvoService());
  });
  afterAll(async () => {
    if (centralOriginal === undefined) delete process.env.PAZ_Y_SALVO_SECCIONAL_CENTRAL_ID;
    else process.env.PAZ_Y_SALVO_SECCIONAL_CENTRAL_ID = centralOriginal;
    if (!db?.isInitialized) return;
    if (documentos.length) {
      await db.query('DELETE FROM travel_expenses.paz_y_salvo_eventos WHERE paz_y_salvo_id = ANY($1::uuid[])', [documentos]);
      await db.query('DELETE FROM travel_expenses.paz_y_salvos WHERE id = ANY($1::uuid[])', [documentos]);
    }
    await db.destroy();
  });
  async function crear() { const doc = await service.solicitar(persona(1), usuario); documentos.push(doc.id); return doc; }

  it('EFDS-1311 :: AC-01 :: LEGALIZADO permite emitir solo después del OTP', async () => {
    expect(await pendientes.tieneLegalizacionesPendientes(persona(1))).toEqual({ pendiente: false, comisiones: [] });
    const doc = await crear();
    await expect(service.descargar(doc.id, usuario)).rejects.toThrow('no está firmado');
    await service.solicitarOtp(doc.id, usuario, {});
    const result = await service.firmar(doc.id, '123456', usuario, {});
    expect(result.firma?.context).toBe(`paz-y-salvo:${doc.id}:${doc.contenido_sha256}`);
    expect(result.firmado_en).toBeInstanceOf(Date);
    const pdf = await service.descargar(doc.id, usuario);
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
  it.each([2, 3])('EFDS-1311 :: AC-02 :: caso 900%i bloqueado y enumera pendientes', async n => {
    const result = await pendientes.tieneLegalizacionesPendientes(persona(n));
    expect(result.pendiente).toBe(true);
    expect(result.comisiones.map(c => c.codigo)).toContain(`COM-2026-900${n}`);
    await expect(service.solicitar(persona(n), usuario)).rejects.toMatchObject({
      response: { comisiones: expect.arrayContaining([expect.objectContaining({ codigo: `COM-2026-900${n}` })]) },
    });
  });
  it('EFDS-1311 :: AC-03 :: persiste PDF, consulta y descarga con usuario y fecha', async () => {
    const doc = await crear(); await service.firmar(doc.id, '123456', usuario, {});
    const a = await service.descargar(doc.id, usuario);
    const b = await service.descargar(doc.id, usuario);
    expect(a.equals(b)).toBe(true);
    const detalle = await service.detalle(doc.id, usuario);
    expect(detalle.eventos.map(e => e.accion)).toEqual(['SOLICITADO','FIRMA_VERIFICADA','DESCARGADO','DESCARGADO','CONSULTADO']);
    expect(detalle.eventos.every(e => e.usuario_id === usuario.userId && e.creado_en instanceof Date)).toBe(true);
  });
  it('EFDS-1311 :: AC-01 :: no firma con OTP rechazado ni con otro usuario', async () => {
    const doc = await crear();
    await expect(service.firmar(doc.id, '123456', { userId: persona(2) }, {})).rejects.toThrow();
    otp.verificar.mockRejectedValueOnce(new Error('OTP inválido'));
    await expect(service.firmar(doc.id, '000000', usuario, {})).rejects.toThrow('OTP inválido');
    expect((await service.detalle(doc.id, usuario)).firmado_en).toBeNull();
  });
  it('EFDS-1311 :: AC-02 :: revalida pendientes aparecidas después del OTP', async () => {
    const doc = await crear();
    const original = otp.verificar.getMockImplementation();
    otp.verificar.mockImplementationOnce(async (...args) => {
      await db.query("UPDATE travel_expenses.solicitudes_comision SET estado_solicitud='PAGADA' WHERE consecutivo_unico='COM-2026-9001'");
      return original(...args);
    });
    try {
      await expect(service.firmar(doc.id, '123456', usuario, {})).rejects.toThrow('pendientes');
      expect((await service.detalle(doc.id, usuario)).firmado_en).toBeNull();
    } finally {
      await db.query("UPDATE travel_expenses.solicitudes_comision SET estado_solicitud='LEGALIZADO' WHERE consecutivo_unico='COM-2026-9001'");
    }
  });
  it('EFDS-1311 :: CANARIO :: todos los comisionados pendientes quedan bloqueados', async () => {
    const personas = await db.query('SELECT DISTINCT comisionado_id FROM travel_expenses.solicitudes_comision');
    let bloqueados = 0;
    for (const p of personas) {
      if (!(await pendientes.tieneLegalizacionesPendientes(p.comisionado_id)).pendiente) continue;
      await expect(service.solicitar(p.comisionado_id, usuario)).rejects.toThrow();
      bloqueados++;
    }
    expect(bloqueados).toBeGreaterThanOrEqual(2);
  });

  const firmante = (n: number) => ({ userId: `13110000-0002-4000-8000-00000000900${n}`, username: 'Nombre manipulado por cliente' });
  it.each([[1,1],[2,4],[3,5]])('EFDS-1311 :: alcance :: firmante %i emite en su territorial para persona %i', async (f,p) => {
    const doc = await service.solicitar(persona(p), firmante(f)); documentos.push(doc.id);
    expect(doc.contenido.coordinadoraNombre).toBe(`Firmante EFDS1311 ${f}`);
    expect(doc.contenido.territorialId).toBe(String(13119000+f));
    expect(doc.contenido.cargoFirmante).toBe(f===1 ? 'Coordinadora del Grupo de Comisiones y Viáticos' : 'Coordinador Administrativo y Financiero');
    await service.firmar(doc.id,'123456',firmante(f),{});
    await expect(service.descargar(doc.id,firmante(f))).resolves.toBeInstanceOf(Buffer);
  });
  it.each([[1,4],[1,5],[2,1],[2,5],[3,1],[3,4]])('EFDS-1311 :: alcance :: firmante %i no accede a persona %i de otra territorial', async (f,p) => {
    await expect(service.consultarPersona(persona(p),firmante(f))).rejects.toThrow('territorial');
    await expect(service.solicitar(persona(p),firmante(f))).rejects.toThrow('territorial');
    const lista = await service.buscarPersonas('TEST1311900',firmante(f));
    expect(lista.some(x => x.id===persona(p))).toBe(false);
  });
  it('EFDS-1311 :: alcance :: bloquea ID directo, OTP y descarga entre territoriales', async () => {
    const doc = await crear();
    await expect(service.detalle(doc.id,firmante(2))).rejects.toThrow('territorial');
    await expect(service.solicitarOtp(doc.id,firmante(2),{})).rejects.toThrow('territorial');
    await expect(service.firmar(doc.id,'123456',firmante(2),{})).rejects.toThrow('territorial');
    await service.firmar(doc.id,'123456',usuario,{});
    await expect(service.descargar(doc.id,firmante(2))).rejects.toThrow('territorial');
  });
  it('EFDS-1311 :: alcance :: configuración ausente nunca concede acceso global', async () => {
    delete process.env.PAZ_Y_SALVO_SECCIONAL_CENTRAL_ID;
    try { await expect(service.solicitar(persona(1),usuario)).rejects.toThrow('configurar'); }
    finally { process.env.PAZ_Y_SALVO_SECCIONAL_CENTRAL_ID='13119001'; }
  });
  it('EFDS-1311 :: alcance :: revocación entre OTP y emisión impide firmar', async () => {
    const doc = await crear();
    const original = otp.verificar.getMockImplementation();
    otp.verificar.mockImplementationOnce(async (...args) => {
      await db.query('UPDATE auth.user_roles SET is_active=false WHERE id_user=$1',[usuario.userId]);
      return original(...args);
    });
    try {
      await expect(service.firmar(doc.id,'123456',usuario,{})).rejects.toThrow('rol emisor');
      const [row] = await db.query('SELECT firmado_en FROM travel_expenses.paz_y_salvos WHERE id=$1',[doc.id]);
      expect(row.firmado_en).toBeNull();
    } finally { await db.query('UPDATE auth.user_roles SET is_active=true WHERE id_user=$1',[usuario.userId]); }
  });
  it.each([1,2])('EFDS-1311 :: alcance :: rol %i usado en tipo de sede incorrecto se rechaza', async f => {
    const id = `13110000-0004-4000-8000-00000000900${f}`;
    await db.query('UPDATE auth.personas SET id_seccional=$2 WHERE id_person=$1',[id,f===1 ? 13119002 : 13119001]);
    try { await expect(service.solicitar(persona(1),firmante(f))).rejects.toThrow('rol emisor'); }
    finally { await db.query('UPDATE auth.personas SET id_seccional=$2 WHERE id_person=$1',[id,13119000+f]); }
  });
  it('EFDS-1311 :: alcance :: comisionado sin territorial o con identificación duplicada se rechaza', async () => {
    const id = '13110000-0005-4000-8000-000000009001';
    await db.query('UPDATE auth.personas SET id_seccional=NULL WHERE id_person=$1',[id]);
    try { await expect(service.solicitar(persona(1),usuario)).rejects.toThrow('territorial'); }
    finally { await db.query('UPDATE auth.personas SET id_seccional=13119001 WHERE id_person=$1',[id]); }
    const duplicado = '13110000-0006-4000-8000-000000009001';
    await db.query(`INSERT INTO auth.personas (id_person,id_tercero,num_identificacion,tip_identificacion,nom_largo,nom_tercero,gen_tercero,id_seccional)
      VALUES ($1,13119601,'TEST13119001','CC','Duplicado prueba','Prueba','F',13119001)`,[duplicado]);
    try {
      await expect(service.solicitar(persona(1),usuario)).rejects.toThrow('territorial');
      expect(await service.buscarPersonas('TEST13119001',usuario)).toEqual([]);
    } finally { await db.query('DELETE FROM auth.personas WHERE id_person=$1',[duplicado]); }
  });
  it('EFDS-1311 :: alcance :: documento sin territorial registrada no se expone por ID', async () => {
    const doc = await crear();
    await db.query("UPDATE travel_expenses.paz_y_salvos SET contenido=contenido-'territorialId' WHERE id=$1",[doc.id]);
    await expect(service.detalle(doc.id,usuario)).rejects.toThrow('territorial');
    await expect(service.solicitarOtp(doc.id,usuario,{})).rejects.toThrow('territorial');
  });
});
