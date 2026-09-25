/**
 * EFDS-1310 — Revisión, registro en SIIF y cierre, contra base real.
 *
 *   RUN_DB_TESTS=1 npx jest src/modules/legalizacion/__tests__/legalizacion-revision.db.spec.ts
 *
 * Crea sus propias solicitudes (COM-TEST-1310-*) y las purga al terminar. No
 * toca COM-2026-0001 ni los datos de EFDS-1311 (COM-2026-900x).
 */
import { config as cargarEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
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
import { ESTADOS_SOLO_LECTURA, EstadoSolicitud } from '../../../entities/estado-solicitud.enum';
import { LEGALIZACION_ENTITIES } from '../legalizacion.module';
import { LegalizacionDisparadorService } from '../legalizacion-disparador.service';
import { LegalizacionService } from '../legalizacion.service';
import { LegalizacionCanarioService } from '../legalizacion-canario.service';
import { EVENTO_REINTEGRO, EventoReintegro, LegalizacionRevisionService } from '../legalizacion-revision.service';

cargarEnv();
const describirConBase = process.env.RUN_DB_TESTS === '1' ? describe : describe.skip;

const ENLACE = '71717171-7171-7171-7171-717171717171';
const ANALISTA = '72727272-7272-7272-7272-727272727272';
const OTRO_ANALISTA = '73737373-7373-7373-7373-737373737373';
const COMISIONADO = '6d0d525f-de3b-49a8-970f-7ee048b8604b'; // FUNCIONARIO sembrado

const PDF = (t: string) => Buffer.from(`%PDF-1.4\n% ${t}\n%%EOF\n`, 'latin1');
const enlace = { userId: ENLACE, roles: ['ENLACE_DEPENDENCIA'] };
const analista = { userId: ANALISTA, roles: ['ANALISTA'] };
const otroAnalista = { userId: OTRO_ANALISTA, roles: ['ANALISTA'] };

describirConBase('EFDS-1310 — revisión y cierre de la legalización (base real)', () => {
  let ds: DataSource;
  let almacenamiento: string;
  let disparador: LegalizacionDisparadorService;
  let legalizaciones: LegalizacionService;
  let revision: LegalizacionRevisionService;
  let canario: LegalizacionCanarioService;
  const eventos: EventoReintegro[] = [];
  const solicitudes: string[] = [];

  /** Una comisión pagada, con la legalización cargada y enviada por el enlace. */
  async function legalizacionEnviada(valorPagado = 1_000_000): Promise<string> {
    const id = randomUUID();
    await ds.query(
      `INSERT INTO travel_expenses.solicitudes_comision
         (id, consecutivo_unico, comisionado_id, destino_ciudad, destino_departamento, fecha_inicio, fecha_fin,
          objeto_comision, prioridad, rubro_presupuestal, estado_solicitud, creado_por_usuario_id,
          analista_asignado_id, modalidad_pago, valor_pagado, fecha_pago, numero_obligacion, codigo_rp, dias_comision)
       VALUES ($1, $2, $3, 'Popayán', 'Cauca', '2026-09-14', '2026-09-18', 'Prueba automatizada EFDS-1310',
               'MEDIA', 'Rubro prueba', 'PAGADA', $4, $5, 'AVANCE', $6, '2026-09-20', 'OBL-T-1310', '2026-09-10_RP_1310', 5)`,
      [id, `COM-TEST-1310-${id.slice(0, 8)}`, COMISIONADO, ENLACE, ANALISTA, valorPagado],
    );
    solicitudes.push(id);
    await disparador.evaluar(id);
    const d = await legalizaciones.detalle(id, enlace);
    for (const item of d.checklist.items) {
      await legalizaciones.subirSoporte(id, item.tipoDocumentoSoporteId, { buffer: PDF(item.codigo), originalname: `${item.codigo}.pdf` }, enlace);
    }
    await legalizaciones.enviar(id, enlace);
    return id;
  }

  const soportesDe = async (id: string) =>
    (await revision.detalle(id, analista)).checklist.items.flatMap((i) => i.soportes);

  async function aprobarTodo(id: string) {
    for (const s of await soportesDe(id)) {
      if (s.revision === null) await revision.revisarSoporte(id, s.id, { decision: 'APROBADO' }, analista);
    }
    await revision.aprobar(id, analista);
  }

  beforeAll(async () => {
    almacenamiento = mkdtempSync(join(tmpdir(), 'efds1310-'));
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
    for (const [uid, username] of [[ENLACE, 'test.enlace.efds1310'], [ANALISTA, 'test.analista.efds1310'], [OTRO_ANALISTA, 'test.otro.efds1310']]) {
      await ds.query(
        `INSERT INTO auth."user" (id_user, username, password_hash, is_active)
         VALUES ($1, $2, 'TEST_NO_LOGIN', true) ON CONFLICT (id_user) DO NOTHING`,
        [uid, username],
      );
    }
    const emisor = new EventEmitter2();
    emisor.on(EVENTO_REINTEGRO, (e: EventoReintegro) => eventos.push(e));
    disparador = new LegalizacionDisparadorService(ds);
    legalizaciones = new LegalizacionService(ds);
    revision = new LegalizacionRevisionService(ds, legalizaciones, undefined, emisor);
    canario = new LegalizacionCanarioService(ds);
  }, 60_000);

  afterAll(async () => {
    if (ds?.isInitialized) {
      // Los expedientes cerrados son inmutables: la purga de pruebas se declara explícitamente.
      await ds.transaction(async (m) => {
        await m.query(`SET LOCAL travel_expenses.purga_pruebas = 'on'`);
        if (solicitudes.length) {
          await m.query(
            `DELETE FROM travel_expenses.legalizacion_revisiones WHERE legalizacion_id IN
               (SELECT id FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = ANY($1::uuid[]))`,
            [solicitudes],
          );
          await m.query(`DELETE FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = ANY($1::uuid[])`, [solicitudes]);
          await m.query(`DELETE FROM travel_expenses.solicitudes_historial_estados WHERE solicitud_id = ANY($1::uuid[])`, [solicitudes]);
          await m.query(`DELETE FROM travel_expenses.solicitudes_comision WHERE id = ANY($1::uuid[])`, [solicitudes]);
        }
        await m.query(`DELETE FROM auth."user" WHERE id_user = ANY($1::uuid[])`, [[ENLACE, ANALISTA, OTRO_ANALISTA]]);
      });
      await ds.destroy();
    }
    if (almacenamiento) rmSync(almacenamiento, { recursive: true, force: true });
  }, 60_000);

  describe('bandeja y acceso', () => {
    let id: string;
    beforeAll(async () => {
      id = await legalizacionEnviada();
    }, 60_000);

    it('el analista asignado la ve en "por revisar"; otro analista no', async () => {
      expect((await revision.bandeja(analista, 'POR_REVISAR')).map((b: any) => b.solicitudId)).toContain(id);
      expect((await revision.bandeja(otroAnalista, 'POR_REVISAR')).map((b: any) => b.solicitudId)).not.toContain(id);
    });

    it('solo el analista asignado revisa; el enlace que radicó, no (segregación de funciones)', async () => {
      await expect(revision.detalle(id, otroAnalista)).rejects.toThrow(/analista asignado/);
      await expect(revision.detalle(id, enlace)).rejects.toThrow(/analista asignado/);
    });

    it('no aprueba con soportes sin revisar', async () => {
      await expect(revision.aprobar(id, analista)).rejects.toThrow(/sin revisar/);
    });

    it('rechazar un soporte exige observación', async () => {
      const [s] = await soportesDe(id);
      await expect(revision.revisarSoporte(id, s.id, { decision: 'RECHAZADO' }, analista)).rejects.toThrow(/motivo/);
      await expect(revision.revisarSoporte(id, s.id, { decision: 'RECHAZADO', observacion: 'corto' }, analista)).rejects.toThrow(/motivo/);
    });
  });

  describe('devolución (C-2: sin estado nuevo) y reenvío', () => {
    let id: string;
    let rechazadoTipo: string;
    beforeAll(async () => {
      id = await legalizacionEnviada();
    }, 60_000);

    it('con un soporte rechazado no se puede aprobar', async () => {
      const [primero, ...resto] = await soportesDe(id);
      await revision.revisarSoporte(id, primero.id, { decision: 'RECHAZADO', observacion: 'El formato no está firmado por el jefe inmediato.' }, analista);
      for (const s of resto) await revision.revisarSoporte(id, s.id, { decision: 'APROBADO' }, analista);
      // Un rechazado no cuenta como cumplido: el checklist deja de estar completo.
      await expect(revision.aprobar(id, analista)).rejects.toThrow(/no está completo/);
    });

    it('devolver exige observación', async () => {
      await expect(revision.devolver(id, { observacion: 'no' }, analista)).rejects.toThrow(/observación/);
    });

    it('devuelve al comisionado y la comisión sigue en PENDIENTE_LEGALIZACION', async () => {
      await revision.devolver(id, { observacion: 'Reemplace el formato GF-FO-031: falta la firma del jefe inmediato.' }, analista);
      const [s] = await ds.query(`SELECT estado_solicitud FROM travel_expenses.solicitudes_comision WHERE id = $1`, [id]);
      expect(s.estado_solicitud).toBe(EstadoSolicitud.PENDIENTE_LEGALIZACION);

      const d = await legalizaciones.detalle(id, enlace);
      expect(d.devuelta).toBe(true);
      expect(d.numeroDevoluciones).toBe(1);
      expect(d.observacionDevolucion).toContain('firma del jefe');
      expect(d.puedeEditar).toBe(true);
      // El rechazado no cuenta: el checklist queda incompleto hasta reemplazarlo.
      const rechazado = d.checklist.items.find((i) => i.soportes.some((x) => x.revision === 'RECHAZADO'))!;
      rechazadoTipo = rechazado.tipoDocumentoSoporteId;
      expect(rechazado.cumplido).toBe(false);
      await expect(legalizaciones.enviar(id, enlace)).rejects.toThrow(/Faltan soportes obligatorios/);

      expect((await revision.bandeja(analista, 'DEVUELTAS')).map((b: any) => b.solicitudId)).toContain(id);
      expect((await revision.bandeja(analista, 'POR_REVISAR')).map((b: any) => b.solicitudId)).not.toContain(id);
    });

    it('el comisionado reemplaza el rechazado, reenvía, y el analista aprueba', async () => {
      const d = await legalizaciones.detalle(id, enlace);
      const rechazado = d.checklist.items.find((i) => i.tipoDocumentoSoporteId === rechazadoTipo)!;
      await legalizaciones.eliminarSoporte(id, rechazado.soportes[0].id, enlace);
      await legalizaciones.subirSoporte(id, rechazadoTipo, { buffer: PDF('firmado'), originalname: 'formato031-firmado.pdf' }, enlace);
      await legalizaciones.enviar(id, enlace);

      const pendientes = (await soportesDe(id)).filter((s) => s.revision === null);
      expect(pendientes).toHaveLength(1); // solo el nuevo; los aprobados siguen aprobados
      await aprobarTodo(id);
      const det = await revision.detalle(id, analista);
      expect(det.puedeRegistrarSiif).toBe(true);
    });
  });

  describe('registro en SIIF, LEGALIZADO y cierre inmutable', () => {
    let id: string;
    beforeAll(async () => {
      id = await legalizacionEnviada(1_000_000);
    }, 60_000);

    it('no registra en SIIF sin revisión aprobada', async () => {
      await expect(
        revision.registrarYCerrar(id, { numeroRegistroSiif: 'LEG-1', fechaRegistroSiif: '2026-09-25', valorLegalizado: 1 }, analista),
      ).rejects.toThrow(/Apruebe la revisión/);
    });

    it('el CSV para SIIF sale sin tildes ni punto y coma dentro de los campos', async () => {
      await aprobarTodo(id);
      const { contenido, nombreArchivo } = await revision.exportarSiif(id, analista);
      expect(nombreArchivo).toMatch(/^SIIF_LEGALIZACION_COM-TEST-1310-/);
      const [cabecera, fila] = contenido.replace(/^﻿/, '').trim().split('\r\n');
      expect(cabecera.split(';')).toHaveLength(13);
      expect(fila.split(';')).toHaveLength(13);
      expect(fila).not.toMatch(/[áéíóúñÁÉÍÓÚÑ]/);
      expect(fila).toContain('OBL-T-1310');
    });

    it('rechaza un valor legalizado mayor que el pagado y una fecha futura', async () => {
      await expect(
        revision.registrarYCerrar(id, { numeroRegistroSiif: 'LEG-1', fechaRegistroSiif: '2026-09-25', valorLegalizado: 1_000_001 }, analista),
      ).rejects.toThrow(/no puede superar el pagado/);
      await expect(
        revision.registrarYCerrar(id, { numeroRegistroSiif: 'LEG-1', fechaRegistroSiif: '2099-01-01', valorLegalizado: 1 }, analista),
      ).rejects.toThrow(/posterior a hoy/);
    });

    it('viaje menor: registra, pasa a LEGALIZADO, cierra y emite el evento de reintegro', async () => {
      const antes = eventos.length;
      const r = await revision.registrarYCerrar(
        id,
        { numeroRegistroSiif: 'LEG-SIIF-2026-000123', fechaRegistroSiif: '2026-09-25', valorLegalizado: 800_000, diasReales: 4 },
        analista,
      );
      expect(r).toMatchObject({ estadoSolicitud: 'LEGALIZADO', valorReintegro: 200_000 });

      const [s] = await ds.query(`SELECT estado_solicitud FROM travel_expenses.solicitudes_comision WHERE id = $1`, [id]);
      expect(s.estado_solicitud).toBe('LEGALIZADO');
      const hist = await ds.query(
        `SELECT estado_anterior, estado_nuevo FROM travel_expenses.solicitudes_historial_estados
          WHERE solicitud_id = $1 AND estado_nuevo = 'LEGALIZADO'`,
        [id],
      );
      expect(hist).toEqual([{ estado_anterior: 'PENDIENTE_LEGALIZACION', estado_nuevo: 'LEGALIZADO' }]);

      expect(eventos.length).toBe(antes + 1);
      expect(eventos[eventos.length - 1]).toMatchObject({ solicitudId: id, valorPagado: 1_000_000, valorLegalizado: 800_000, valorReintegro: 200_000, diasReales: 4 });

      const acciones = (await revision.detalle(id, analista)).historialRevision.map((h) => h.accion);
      expect(acciones).toEqual(expect.arrayContaining(['SOPORTE_APROBADO', 'APROBACION', 'EXPORTACION_SIIF', 'REGISTRO_SIIF_Y_CIERRE']));
    });

    it('cerrada: la aplicación rechaza cualquier cambio', async () => {
      const d = await legalizaciones.detalle(id, enlace);
      const item = d.checklist.items[0];
      await expect(
        legalizaciones.subirSoporte(id, item.tipoDocumentoSoporteId, { buffer: PDF('tarde'), originalname: 't.pdf' }, enlace),
      ).rejects.toThrow();
      await expect(legalizaciones.eliminarSoporte(id, item.soportes[0].id, enlace)).rejects.toThrow();
      await expect(revision.revisarSoporte(id, item.soportes[0].id, { decision: 'APROBADO' }, analista)).rejects.toThrow(/cerrado/);
      await expect(revision.devolver(id, { observacion: 'Intento de devolver un expediente cerrado.' }, analista)).rejects.toThrow(/cerrado/);
      await expect(
        revision.registrarYCerrar(id, { numeroRegistroSiif: 'OTRO', fechaRegistroSiif: '2026-09-25', valorLegalizado: 1 }, analista),
      ).rejects.toThrow(/cerrado/);
    });

    it('cerrada: la base de datos rechaza modificarla aunque se salte la aplicación', async () => {
      const [leg] = await ds.query(`SELECT id FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1`, [id]);
      const [sop] = await ds.query(`SELECT id, tipo_documento_soporte_id FROM travel_expenses.legalizacion_soportes WHERE legalizacion_id = $1 LIMIT 1`, [leg.id]);

      await expect(ds.query(`UPDATE travel_expenses.legalizaciones_comision SET valor_legalizado = 0 WHERE id = $1`, [leg.id])).rejects.toThrow(/inmutable/);
      await expect(ds.query(`DELETE FROM travel_expenses.legalizaciones_comision WHERE id = $1`, [leg.id])).rejects.toThrow(/inmutable/);
      await expect(ds.query(`UPDATE travel_expenses.legalizacion_soportes SET revision = 'RECHAZADO', observacion_revision = 'x' WHERE id = $1`, [sop.id])).rejects.toThrow(/inmutables/);
      await expect(ds.query(`DELETE FROM travel_expenses.legalizacion_soportes WHERE id = $1`, [sop.id])).rejects.toThrow(/inmutables/);
      await expect(
        ds.query(
          `INSERT INTO travel_expenses.legalizacion_soportes
             (legalizacion_id, tipo_documento_soporte_id, nombre_archivo_original, ruta_relativa, tamano_bytes, sha256, cargado_por_id)
           VALUES ($1, $2, 'colado.pdf', 'x/colado.pdf', 10, repeat('0', 64), $3)`,
          [leg.id, sop.tipo_documento_soporte_id, ENLACE],
        ),
      ).rejects.toThrow(/inmutables/);
      await expect(ds.query(`UPDATE travel_expenses.legalizacion_revisiones SET observacion = 'editado' WHERE legalizacion_id = $1`, [leg.id])).rejects.toThrow(/solo inserción/);
      await expect(ds.query(`DELETE FROM travel_expenses.legalizacion_revisiones WHERE legalizacion_id = $1`, [leg.id])).rejects.toThrow(/solo inserción/);

      const [despues] = await ds.query(`SELECT valor_legalizado::float AS v FROM travel_expenses.legalizaciones_comision WHERE id = $1`, [leg.id]);
      expect(despues.v).toBe(800_000);
    });

    it('la solicitud LEGALIZADO queda en solo lectura para el flujo de viáticos', () => {
      // La fila de solicitudes_comision es de la Etapa 1-8: su protección es de aplicación.
      expect(ESTADOS_SOLO_LECTURA.has(EstadoSolicitud.LEGALIZADO)).toBe(true);
    });

    it('aparece en "cerradas" y ya no en "por revisar"', async () => {
      expect((await revision.bandeja(analista, 'CERRADAS')).map((b: any) => b.solicitudId)).toContain(id);
      expect((await revision.bandeja(analista, 'POR_REVISAR')).map((b: any) => b.solicitudId)).not.toContain(id);
    });
  });

  describe('viaje completo y canario', () => {
    it('sin diferencia no emite evento de reintegro', async () => {
      const id = await legalizacionEnviada(500_000);
      await aprobarTodo(id);
      const antes = eventos.length;
      const r = await revision.registrarYCerrar(id, { numeroRegistroSiif: 'LEG-SIIF-EXACTO', fechaRegistroSiif: '2026-09-25', valorLegalizado: 500_000 }, analista);
      expect(r.valorReintegro).toBe(0);
      expect(eventos.length).toBe(antes);
    });

    it('el canario no ve inconsistencias de cierre en las solicitudes de esta suite', async () => {
      const c = await canario.verificar();
      for (const lista of Object.values(c.muestras)) {
        expect(lista.filter((x) => solicitudes.includes(x))).toEqual([]);
      }
      // Estas son invariantes de datos cerrados, que no cambian por escrituras concurrentes.
      expect(c.violaciones).toMatchObject({ reintegroInconsistente: 0, aprobadaConPendientes: 0 });
      expect(c.poblacion.legalizacionesPorEstadoSolicitud.LEGALIZADO).toBeGreaterThanOrEqual(2);
    });
  });
});
