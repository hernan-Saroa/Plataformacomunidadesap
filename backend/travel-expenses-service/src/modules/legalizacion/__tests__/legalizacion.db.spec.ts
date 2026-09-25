/**
 * EFDS-1309 — Pruebas contra base real (PostgreSQL local).
 *
 * Se ejecutan solo con RUN_DB_TESTS=1 y un .env que apunte a una base local
 * migrada hasta la 450. Crean sus propias solicitudes (COM-TEST-1309-*) y las
 * borran al terminar; los archivos van a un directorio temporal, no a uploads/.
 *
 *   RUN_DB_TESTS=1 npx jest src/modules/legalizacion/__tests__/legalizacion.db.spec.ts
 */
import { config as cargarEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { mkdtempSync, readdirSync, readFileSync, rmSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createHash, randomUUID } from 'crypto';
import { AnalistaEntity } from '../../../entities/analista.entity';
import { ComisionadoEntity } from '../../../entities/comisionado.entity';
import { SolicitudComisionEntity } from '../../../entities/solicitud-comision.entity';
import { DocumentoSoporteEntity } from '../../../entities/documento-soporte.entity';
import { UsuarioEntity } from '../../../entities/usuario.entity';
import { CampoFormularioEntity } from '../../../entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from '../../../entities/config/config-tipo-comisionado.entity';
import { TipoDocumentoSoporteEntity } from '../../../entities/config/tipo-documento-soporte.entity';
import { ConfigTipoComisionadoDocumentoEntity } from '../../../entities/config/config-tipo-comisionado-documento.entity';
import { SolicitudHistorialEstadoEntity } from '../../../entities/solicitud-historial-estado.entity';
import { FestivoColombiaEntity } from '../../../entities/festivo-colombia.entity';
import { AuthSystemSettingEntity } from '../../../entities/auth-system-setting.entity';
import { LEGALIZACION_ENTITIES } from '../legalizacion.module';
import { LegalizacionDisparadorService } from '../legalizacion-disparador.service';
import { LegalizacionService } from '../legalizacion.service';
import { LegalizacionCanarioService } from '../legalizacion-canario.service';
import { LegalizacionVencimientosService } from '../legalizacion-vencimientos.service';
import { fechaColombia } from '../plazo-legalizacion.util';

cargarEnv();
const describirConBase = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

const ENLACE = '77777777-7777-7777-7777-777777777777';
const OTRO = '88888888-8888-8888-8888-888888888888';
/** Comisionado FUNCIONARIO sembrado por seed-comisionados.sql. */
const COMISIONADO = '6d0d525f-de3b-49a8-970f-7ee048b8604b';

const PDF = (texto: string) => Buffer.from(`%PDF-1.4\n% ${texto}\n1 0 obj << >> endobj\n%%EOF\n`, 'latin1');

describirConBase('EFDS-1309 — legalización contra base real', () => {
  let ds: DataSource;
  let disparador: LegalizacionDisparadorService;
  let service: LegalizacionService;
  let canario: LegalizacionCanarioService;
  let almacenamiento: string;
  const solicitudes: string[] = [];

  async function crearSolicitud(estado: string, fechaFin = '2026-10-02'): Promise<string> {
    const id = randomUUID();
    await ds.query(
      `INSERT INTO travel_expenses.solicitudes_comision
         (id, consecutivo_unico, comisionado_id, destino_ciudad, destino_departamento,
          fecha_inicio, fecha_fin, objeto_comision, prioridad, rubro_presupuestal,
          estado_solicitud, creado_por_usuario_id, modalidad_pago)
       VALUES ($1, $2, $3, 'Medellín', 'Antioquia', '2026-09-28', $4,
               'Prueba automatizada EFDS-1309', 'MEDIA', 'Rubro prueba', $5, $6, 'AVANCE')`,
      [id, `COM-TEST-1309-${id.slice(0, 8)}`, COMISIONADO, fechaFin, estado, ENLACE],
    );
    solicitudes.push(id);
    return id;
  }

  const enlace = { userId: ENLACE, roles: ['ENLACE_DEPENDENCIA'] };
  const otro = { userId: OTRO, roles: ['ENLACE_DEPENDENCIA'] };

  beforeAll(async () => {
    almacenamiento = mkdtempSync(join(tmpdir(), 'efds1309-'));
    process.env.TRAVEL_EXPENSES_STORAGE_PATH = almacenamiento;

    ds = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      schema: 'travel_expenses',
      entities: [
        AnalistaEntity, ComisionadoEntity, SolicitudComisionEntity, DocumentoSoporteEntity, UsuarioEntity,
        CampoFormularioEntity, ConfigTipoComisionadoEntity, TipoDocumentoSoporteEntity,
        ConfigTipoComisionadoDocumentoEntity, SolicitudHistorialEstadoEntity, FestivoColombiaEntity,
        AuthSystemSettingEntity, ...LEGALIZACION_ENTITIES,
      ],
      synchronize: false,
      extra: { max: 5 },
    });
    await ds.initialize();

    for (const [id, username] of [[ENLACE, 'test.enlace.efds1309'], [OTRO, 'test.otro.efds1309']]) {
      await ds.query(
        `INSERT INTO auth."user" (id_user, username, password_hash, is_active)
         VALUES ($1, $2, 'TEST_NO_LOGIN', true) ON CONFLICT (id_user) DO NOTHING`,
        [id, username],
      );
    }

    disparador = new LegalizacionDisparadorService(ds);
    service = new LegalizacionService(ds);
    canario = new LegalizacionCanarioService(ds);
  }, 30_000);

  afterAll(async () => {
    if (ds?.isInitialized) {
      if (solicitudes.length) {
        await ds.query(
          `DELETE FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = ANY($1::uuid[])`,
          [solicitudes],
        );
        await ds.query(
          `DELETE FROM travel_expenses.solicitudes_historial_estados WHERE solicitud_id = ANY($1::uuid[])`,
          [solicitudes],
        );
        await ds.query(`DELETE FROM travel_expenses.solicitudes_comision WHERE id = ANY($1::uuid[])`, [solicitudes]);
      }
      await ds.query(`DELETE FROM auth."user" WHERE id_user = ANY($1::uuid[])`, [[ENLACE, OTRO]]);
      await ds.destroy();
    }
    if (almacenamiento) rmSync(almacenamiento, { recursive: true, force: true });
  }, 30_000);

  describe('disparador y transición PAGADA → PENDIENTE_LEGALIZACION', () => {
    let id: string;

    // La base es compartida (otra suite en paralelo, EFDS-1311): se afirma sobre
    // la solicitud propia en las muestras del canario, no sobre diferencias de totales.
    it('el canario detecta una PAGADA sin legalización y deja de verla al abrirla', async () => {
      id = await crearSolicitud('PAGADA');

      const conHueco = await canario.verificar();
      expect(conHueco.muestras.sinLegalizacion).toContain(id);
      expect(conHueco.ok).toBe(false);

      const r = await disparador.evaluar(id);
      expect(r).toMatchObject({ accion: 'ABIERTA', transicionada: true });

      const despues = await canario.verificar();
      expect(despues.muestras.sinLegalizacion).not.toContain(id);
      expect(despues.muestras.pagadaConLegalizacion).not.toContain(id);
    });

    it('deja la solicitud en PENDIENTE_LEGALIZACION con su historial y un plazo de 5 días hábiles desde el fin', async () => {
      const [sol] = await ds.query(
        `SELECT estado_solicitud FROM travel_expenses.solicitudes_comision WHERE id = $1`,
        [id],
      );
      expect(sol.estado_solicitud).toBe('PENDIENTE_LEGALIZACION');

      const hist = await ds.query(
        `SELECT estado_anterior, estado_nuevo, comentarios FROM travel_expenses.solicitudes_historial_estados
          WHERE solicitud_id = $1 ORDER BY creado_en`,
        [id],
      );
      expect(hist).toHaveLength(1);
      expect(hist[0]).toMatchObject({ estado_anterior: 'PAGADA', estado_nuevo: 'PENDIENTE_LEGALIZACION' });
      expect(hist[0].comentarios).toContain('EFDS-1309');

      const [leg] = await ds.query(
        `SELECT fecha_limite, plazo_dias_habiles, hora_corte, estado_disparador,
                pg_typeof(fecha_limite)::text AS tipo
           FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1`,
        [id],
      );
      expect(leg.tipo).toBe('timestamp with time zone');
      expect(leg).toMatchObject({ plazo_dias_habiles: 5, hora_corte: '16:30', estado_disparador: 'PAGADA' });
      // Fin viernes 2 de octubre → 5, 6, 7, 8, 9 de octubre a las 16:30 de Colombia.
      expect(new Date(leg.fecha_limite).toISOString()).toBe('2026-10-09T21:30:00.000Z');
    });

    it('evaluar dos veces no duplica la legalización ni el historial', async () => {
      const r = await disparador.evaluar(id);
      expect(r).toMatchObject({ accion: 'YA_EXISTE', transicionada: false });
      const [{ n }] = await ds.query(
        `SELECT count(*)::int AS n FROM travel_expenses.solicitudes_historial_estados WHERE solicitud_id = $1`,
        [id],
      );
      expect(n).toBe(1);
    });

    it('no abre nada antes del disparador configurado', async () => {
      const obligada = await crearSolicitud('OBLIGADA');
      expect(await disparador.evaluar(obligada)).toMatchObject({ accion: 'NO_APLICA', transicionada: false });
    });

    it('espera el commit de quien emitió el evento (el emit ocurre dentro de su transacción)', async () => {
      const sid = await crearSolicitud('OBLIGADA');
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      await qr.query(
        `UPDATE travel_expenses.solicitudes_comision SET estado_solicitud = 'PAGADA' WHERE id = $1`,
        [sid],
      );

      let resuelta = false;
      const evaluacion = disparador.evaluar(sid).then((r) => {
        resuelta = true;
        return r;
      });
      await new Promise((ok) => setTimeout(ok, 500));
      expect(resuelta).toBe(false); // bloqueada por FOR UPDATE

      await qr.commitTransaction();
      await qr.release();
      expect(await evaluacion).toMatchObject({ accion: 'ABIERTA', transicionada: true });
    });

    it('si la transacción que emitió el evento se revierte, no abre nada', async () => {
      const sid = await crearSolicitud('OBLIGADA');
      const qr = ds.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      await qr.query(
        `UPDATE travel_expenses.solicitudes_comision SET estado_solicitud = 'PAGADA' WHERE id = $1`,
        [sid],
      );
      const evaluacion = disparador.evaluar(sid);
      await new Promise((ok) => setTimeout(ok, 300));
      await qr.rollbackTransaction();
      await qr.release();

      expect(await evaluacion).toMatchObject({ accion: 'NO_APLICA' });
      const [{ n }] = await ds.query(
        `SELECT count(*)::int AS n FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1`,
        [sid],
      );
      expect(n).toBe(0);
    });

    it('el barrido abre las que el evento no alcanzó', async () => {
      const perdida = await crearSolicitud('PAGADA');
      await disparador.barrer({ soloSolicitudes: [perdida] });
      const [sol] = await ds.query(
        `SELECT estado_solicitud FROM travel_expenses.solicitudes_comision WHERE id = $1`,
        [perdida],
      );
      expect(sol.estado_solicitud).toBe('PENDIENTE_LEGALIZACION');
    });
  });

  describe('avisos de vencimiento', () => {
    it('marca "por vencer" y "vencida" una sola vez cada una', async () => {
      const sid = await crearSolicitud('PAGADA');
      await disparador.evaluar(sid);
      const [leg] = await ds.query(
        `SELECT fecha_limite FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1`,
        [sid],
      );
      const limite = new Date(leg.fecha_limite).getTime();
      const vencimientos = new LegalizacionVencimientosService(ds);
      const marcas = async () =>
        (
          await ds.query(
            `SELECT notificado_por_vencer_en, notificado_vencido_en
               FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1`,
            [sid],
          )
        )[0];

      // El mismo día del vencimiento, antes del corte: por vencer.
      await vencimientos.avisar(new Date(limite - 60 * 60 * 1000), { soloSolicitudes: [sid] });
      const tras1 = await marcas();
      expect(tras1.notificado_por_vencer_en).not.toBeNull();
      expect(tras1.notificado_vencido_en).toBeNull();

      await vencimientos.avisar(new Date(limite - 30 * 60 * 1000), { soloSolicitudes: [sid] });
      expect((await marcas()).notificado_por_vencer_en).toEqual(tras1.notificado_por_vencer_en);

      // Pasado el corte: vencida, una vez.
      await vencimientos.avisar(new Date(limite + 60 * 60 * 1000), { soloSolicitudes: [sid] });
      const tras3 = await marcas();
      expect(tras3.notificado_vencido_en).not.toBeNull();
      await vencimientos.avisar(new Date(limite + 2 * 60 * 60 * 1000), { soloSolicitudes: [sid] });
      expect((await marcas()).notificado_vencido_en).toEqual(tras3.notificado_vencido_en);
    });
  });

  describe('checklist, carga de soportes y envío', () => {
    let id: string;

    beforeAll(async () => {
      id = await crearSolicitud('PAGADA');
      await disparador.evaluar(id);
    });

    it('sin transporte aéreo, el checklist de FUNCIONARIO tiene 4 soportes (sin pasabordos)', async () => {
      const d = await service.detalle(id, enlace);
      expect(d.checklist.items.map((i) => i.codigo)).toEqual([
        'LEG_GF_FO_031',
        'LEG_GF_FO_032',
        'LEG_CERT_PERMANENCIA',
        'LEG_AGENDA_CUMPLIDA',
      ]);
      expect(d.checklist.completo).toBe(false);
      expect(d.puedeEditar).toBe(true);
    });

    it('con tiquetes, exige también los pasabordos', async () => {
      await ds.query(`UPDATE travel_expenses.solicitudes_comision SET requiere_tiquetes = true WHERE id = $1`, [id]);
      const d = await service.detalle(id, enlace);
      expect(d.checklist.items.map((i) => i.codigo)).toContain('LEG_PASABORDOS');
      await ds.query(`UPDATE travel_expenses.solicitudes_comision SET requiere_tiquetes = false WHERE id = $1`, [id]);
    });

    it('rechaza un archivo que no es PDF por contenido y no deja nada en disco', async () => {
      const d = await service.detalle(id, enlace);
      const tipo = d.checklist.items[0].tipoDocumentoSoporteId;
      await expect(
        service.subirSoporte(
          id,
          tipo,
          { buffer: Buffer.from('MZ ejecutable renombrado'), originalname: 'formato031.pdf' },
          enlace,
        ),
      ).rejects.toThrow(/no es un PDF válido/);
      const dir = join(almacenamiento, id, 'legalizacion');
      expect(existsSync(dir) ? readdirSync(dir) : []).toHaveLength(0);
    });

    it('otro usuario no puede cargar ni consultar la legalización', async () => {
      const d = await service.detalle(id, enlace);
      const tipo = d.checklist.items[0].tipoDocumentoSoporteId;
      await expect(
        service.subirSoporte(id, tipo, { buffer: PDF('x'), originalname: 'x.pdf' }, otro),
      ).rejects.toThrow(/Solo el comisionado o el enlace/);
      await expect(service.detalle(id, otro)).rejects.toThrow(/No tiene acceso/);
    });

    it('no se puede enviar con soportes obligatorios faltantes', async () => {
      await expect(service.enviar(id, enlace)).rejects.toThrow(/Faltan soportes obligatorios/);
    });

    it('carga los 4 soportes, guarda el hash y envía a revisión', async () => {
      const d = await service.detalle(id, enlace);
      const cargados: Array<{ id: string }> = [];
      for (const item of d.checklist.items) {
        cargados.push(
          await service.subirSoporte(
            id,
            item.tipoDocumentoSoporteId,
            { buffer: PDF(item.codigo), originalname: `${item.codigo}.pdf` },
            enlace,
          ),
        );
      }
      expect(cargados).toHaveLength(4);

      // El archivo en disco es exactamente lo que se subió.
      const { rutaAbsoluta } = await service.archivoSoporte(id, cargados[0].id, enlace);
      expect(rutaAbsoluta.startsWith(almacenamiento)).toBe(true);
      const [fila] = await ds.query(`SELECT sha256 FROM travel_expenses.legalizacion_soportes WHERE id = $1`, [
        cargados[0].id,
      ]);
      expect(createHash('sha256').update(readFileSync(rutaAbsoluta)).digest('hex')).toBe(fila.sha256);

      const envio = await service.enviar(id, enlace);
      expect(envio.totalSoportes).toBe(4);

      const despues = await service.detalle(id, enlace);
      expect(despues.semaforo).toBe('ENVIADA');
      expect(despues.puedeEditar).toBe(false);
      expect(fechaColombia(new Date(despues.fechaEnvio!))).toBe(fechaColombia(new Date()));
    });

    it('después del envío no se pueden agregar ni quitar soportes', async () => {
      const d = await service.detalle(id, enlace);
      const item = d.checklist.items[0];
      await expect(
        service.subirSoporte(id, item.tipoDocumentoSoporteId, { buffer: PDF('tarde'), originalname: 't.pdf' }, enlace),
      ).rejects.toThrow(/ya fue enviada/);
      await expect(service.eliminarSoporte(id, item.soportes[0].id, enlace)).rejects.toThrow(/ya fue enviada/);
    });

    it('el canario no ve legalizaciones enviadas incompletas', async () => {
      expect((await canario.verificar()).violaciones.enviadaIncompleta).toBe(0);
    });

    it('la lista del enlace incluye su legalización', async () => {
      const mias = await service.listarMias(enlace);
      expect(mias.map((m) => m.solicitudId)).toContain(id);
      expect(await service.listarMias(otro)).toEqual([]);
    });
  });
});
