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
  /**
   * Una comisión pagada, con la legalización cargada y enviada por el enlace.
   * conLiquidacion: 4 noches a 100.000 y el regreso a 50.000 (viáticos 450.000).
   * fechasReales: las del GF-FO-032; por omisión, las planeadas (14 al 18).
   */
  async function legalizacionEnviada(
    valorPagado = 1_000_000,
    opciones: { conLiquidacion?: boolean; fechasReales?: [string, string] } = {},
  ): Promise<string> {
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
    if (opciones.conLiquidacion) {
      await ds.query(
        `UPDATE travel_expenses.solicitudes_comision
            SET dias_pernoctados = 4, tarifa_dia_pernoctado = 100000, tarifa_dia_no_pernoctado = 50000,
                total_pernoctados = 400000, total_no_pernoctados = 50000
          WHERE id = $1`,
        [id],
      );
    }
    await disparador.evaluar(id);
    const [inicioReal, finReal] = opciones.fechasReales ?? ['2026-09-14', '2026-09-18'];
    await legalizaciones.registrarCumplimiento(
      id, { fechaInicioReal: inicioReal, fechaFinReal: finReal, comisionExterna: false }, enlace,
    );
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
    const [rol] = await ds.query(`SELECT 1 AS existe FROM pg_roles WHERE rolname = 'travel_expenses_pruebas'`);
    if (!rol) {
      throw new Error(
        'Falta el rol travel_expenses_pruebas: ejecute db/dev-fixtures/rol_pruebas_legalizacion.sql en la base LOCAL antes de RUN_DB_TESTS=1.',
      );
    }
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
      // Los expedientes cerrados son inmutables. La purga de pruebas solo es posible con el
      // rol dedicado travel_expenses_pruebas (migración 452), que no existe fuera de local.
      await ds.transaction(async (m) => {
        if (solicitudes.length) {
          await m.query(`SET LOCAL ROLE travel_expenses_pruebas`);
          await m.query(`SET LOCAL travel_expenses.purga_pruebas = 'on'`);
          const legs = `(SELECT id FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = ANY($1::uuid[]))`;
          await m.query(`DELETE FROM travel_expenses.legalizacion_reversiones WHERE legalizacion_id IN ${legs}`, [solicitudes]);
          await m.query(`DELETE FROM travel_expenses.legalizacion_revisiones WHERE legalizacion_id IN ${legs}`, [solicitudes]);
          // Explícito y no por cascada: la acción de la FK corre como dueño de la tabla y el
          // trigger no vería el rol de pruebas.
          await m.query(`DELETE FROM travel_expenses.legalizacion_soportes WHERE legalizacion_id IN ${legs}`, [solicitudes]);
          await m.query(`DELETE FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = ANY($1::uuid[])`, [solicitudes]);
          await m.query(`RESET ROLE`);
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

    it('rechaza una fecha de registro futura', async () => {
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
      expect(eventos[eventos.length - 1]).toMatchObject({ solicitudId: id, valorPagado: 1_000_000, valorLegalizado: 800_000, valorReintegro: 200_000, diasReales: 5 });

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

    it('la variable de purga sola no alcanza: sin el rol de pruebas la base sigue rechazando (migración 452)', async () => {
      const [leg] = await ds.query(`SELECT id FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1`, [id]);
      await expect(
        ds.transaction(async (m) => {
          await m.query(`SET LOCAL travel_expenses.purga_pruebas = 'on'`);
          await m.query(`DELETE FROM travel_expenses.legalizaciones_comision WHERE id = $1`, [leg.id]);
        }),
      ).rejects.toThrow(/inmutable/);
      const [sigue] = await ds.query(`SELECT count(*)::int AS n FROM travel_expenses.legalizaciones_comision WHERE id = $1`, [leg.id]);
      expect(sigue.n).toBe(1);
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

  describe('legalizado mayor que lo pagado: se devuelve, no se rechaza', () => {
    let id: string;
    beforeAll(async () => {
      id = await legalizacionEnviada(1_000_000);
      await aprobarTodo(id);
      await revision.exportarSiif(id, analista);
    }, 60_000);

    it('devuelve al comisionado sin registrar en SIIF ni cerrar, y deshace la aprobación', async () => {
      const antes = eventos.length;
      const r = await revision.registrarYCerrar(
        id,
        { numeroRegistroSiif: '', fechaRegistroSiif: '', valorLegalizado: 1_250_000, observaciones: 'Hay dos facturas del mismo hotel.' },
        analista,
      );
      expect(r).toMatchObject({ devuelta: true, estadoSolicitud: 'PENDIENTE_LEGALIZACION', valorPagado: 1_000_000, valorLegalizado: 1_250_000 });

      const [l] = await ds.query(
        `SELECT l.devuelta_en, l.revision_aprobada_en, l.siif_exportado_en, l.fecha_envio, l.numero_registro_siif,
                l.cerrada_en, l.observacion_devolucion, s.estado_solicitud
           FROM travel_expenses.legalizaciones_comision l JOIN travel_expenses.solicitudes_comision s ON s.id = l.solicitud_id
          WHERE l.solicitud_id = $1`,
        [id],
      );
      expect(l).toMatchObject({
        revision_aprobada_en: null, siif_exportado_en: null, fecha_envio: null, numero_registro_siif: null,
        cerrada_en: null, estado_solicitud: 'PENDIENTE_LEGALIZACION',
      });
      expect(l.devuelta_en).not.toBeNull();
      expect(l.observacion_devolucion).toContain('supera el valor pagado');
      expect(l.observacion_devolucion).toContain('Hay dos facturas del mismo hotel.');
      expect(eventos.length).toBe(antes);

      const historial = (await revision.detalle(id, analista)).historialRevision;
      expect(historial[historial.length - 1]).toMatchObject({ accion: 'DEVOLUCION' });
      const [det] = await ds.query(
        `SELECT r.detalle FROM travel_expenses.legalizacion_revisiones r
           JOIN travel_expenses.legalizaciones_comision l ON l.id = r.legalizacion_id
          WHERE l.solicitud_id = $1 AND r.accion = 'DEVOLUCION'`,
        [id],
      );
      expect(det.detalle).toMatchObject({ motivo: 'VALOR_LEGALIZADO_SUPERA_PAGADO', valorPagado: 1_000_000, valorLegalizado: 1_250_000 });

      const d = await legalizaciones.detalle(id, enlace);
      expect(d.devuelta).toBe(true);
    });

    it('el comisionado reenvía y la revisión empieza de nuevo antes de poder cerrar', async () => {
      await legalizaciones.enviar(id, enlace);
      await expect(
        revision.registrarYCerrar(id, { numeroRegistroSiif: 'LEG-SIIF-DEV', fechaRegistroSiif: '2026-09-25', valorLegalizado: 1_000_000 }, analista),
      ).rejects.toThrow(/Apruebe la revisión/);
      await revision.aprobar(id, analista);
      const r = await revision.registrarYCerrar(
        id,
        { numeroRegistroSiif: 'LEG-SIIF-DEV', fechaRegistroSiif: '2026-09-25', valorLegalizado: 1_000_000 },
        analista,
      );
      expect(r).toMatchObject({ devuelta: false, estadoSolicitud: 'LEGALIZADO', valorReintegro: 0 });
    });
  });

  describe('reversión de una revisión aprobada: la pide el analista, la aprueba otra persona, solo antes de SIIF', () => {
    // Quien aprueba: el permiso lo exige el controlador; el rol aún no está confirmado.
    const aprobador = { userId: '74747474-7474-7474-7474-747474747474', roles: [] as string[] };
    let id: string;
    const estadoLegalizacion = async () => {
      const [l] = await ds.query(
        `SELECT revision_aprobada_en, siif_exportado_en, cerrada_en FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1`,
        [id],
      );
      return l;
    };
    const pendienteDe = async () => (await revision.detalle(id, analista)).reversionPendiente;

    beforeAll(async () => {
      id = await legalizacionEnviada(900_000);
      await aprobarTodo(id);
      await revision.exportarSiif(id, analista);
    }, 60_000);

    it('exige un motivo y solo procede sobre una revisión aprobada', async () => {
      await expect(revision.solicitarReversion(id, { motivo: 'corto' }, analista)).rejects.toThrow(/mínimo 10/);
      const otra = await legalizacionEnviada();
      await expect(
        revision.solicitarReversion(otra, { motivo: 'El soporte de hotel no correspondía.' }, analista),
      ).rejects.toThrow(/no está aprobada/);
    });

    it('pendiente: no se puede registrar en SIIF ni pedir otra; la ve quien aprueba, no quien la pidió', async () => {
      const r = await revision.solicitarReversion(id, { motivo: 'Aprobé por error el formato GF-FO-032 sin firma.' }, analista);
      expect(r).toMatchObject({ estado: 'PENDIENTE', solicitadaPorId: ANALISTA });

      const d = await revision.detalle(id, analista);
      expect(d).toMatchObject({ puedeRegistrarSiif: false, puedeSolicitarReversion: false });
      expect(d.reversionPendiente?.id).toBe(r.id);
      await expect(
        revision.registrarYCerrar(id, { numeroRegistroSiif: 'LEG-REV', fechaRegistroSiif: '2026-09-25', valorLegalizado: 900_000 }, analista),
      ).rejects.toThrow(/reversión .*pendiente/);
      await expect(
        revision.solicitarReversion(id, { motivo: 'Otra solicitud para la misma legalización.' }, analista),
      ).rejects.toThrow(/Ya hay una solicitud de reversión pendiente/);

      expect((await revision.reversionesPendientes(aprobador)).map((x: any) => x.id)).toContain(r.id);
      expect((await revision.reversionesPendientes(analista)).map((x: any) => x.id)).not.toContain(r.id);
    });

    it('quien la solicitó no puede resolverla, ni en la aplicación ni en la base', async () => {
      const p = await pendienteDe();
      await expect(revision.resolverReversion(p!.id, { decision: 'APROBAR' }, analista)).rejects.toThrow(/otra persona/);
      await expect(
        ds.query(
          `UPDATE travel_expenses.legalizacion_reversiones
              SET estado = 'APROBADA', resuelta_por_id = solicitada_por_id, resuelta_en = now() WHERE id = $1`,
          [p!.id],
        ),
      ).rejects.toThrow(/personas_distintas/);
      expect((await estadoLegalizacion()).revision_aprobada_en).not.toBeNull();
    });

    it('rechazada: exige observación, la revisión sigue aprobada y la solicitud queda inmutable', async () => {
      const p = await pendienteDe();
      await expect(revision.resolverReversion(p!.id, { decision: 'RECHAZAR', observacion: 'no' }, aprobador)).rejects.toThrow(/mínimo 10/);
      const r = await revision.resolverReversion(
        p!.id, { decision: 'RECHAZAR', observacion: 'El formato sí tiene la firma en la segunda página.' }, aprobador,
      );
      expect(r.estado).toBe('RECHAZADA');
      const l = await estadoLegalizacion();
      expect(l.revision_aprobada_en).not.toBeNull();
      expect(l.siif_exportado_en).not.toBeNull();
      await expect(
        ds.query(`UPDATE travel_expenses.legalizacion_reversiones SET observacion_resolucion = 'cambio posterior' WHERE id = $1`, [p!.id]),
      ).rejects.toThrow(/ya fue resuelta/);
      await expect(revision.resolverReversion(p!.id, { decision: 'APROBAR' }, aprobador)).rejects.toThrow(/ya fue resuelta/);
    });

    it('aprobada: deshace la aprobación y la exportación a SIIF; la legalización vuelve a revisión', async () => {
      const s = await revision.solicitarReversion(id, { motivo: 'El valor del tiquete no coincide con la factura.' }, analista);
      const r = await revision.resolverReversion(s.id, { decision: 'APROBAR' }, aprobador);
      expect(r).toMatchObject({ estado: 'APROBADA', solicitudId: id });

      const l = await estadoLegalizacion();
      expect(l).toMatchObject({ revision_aprobada_en: null, siif_exportado_en: null, cerrada_en: null });
      const d = await revision.detalle(id, analista);
      expect(d).toMatchObject({ enRevision: true, puedeRevisar: true, puedeRegistrarSiif: false, reversionPendiente: null });
      const [st] = await ds.query(`SELECT estado_solicitud FROM travel_expenses.solicitudes_comision WHERE id = $1`, [id]);
      expect(st.estado_solicitud).toBe('PENDIENTE_LEGALIZACION');
      const acciones = d.historialRevision.map((h) => h.accion);
      expect(acciones).toEqual(expect.arrayContaining(['REVERSION_SOLICITADA', 'REVERSION_RECHAZADA', 'REVERSION_APROBADA']));
    });

    it('después del registro en SIIF el expediente sigue inmutable: no admite reversión', async () => {
      await revision.aprobar(id, analista);
      await revision.registrarYCerrar(id, { numeroRegistroSiif: 'LEG-SIIF-REV', fechaRegistroSiif: '2026-09-25', valorLegalizado: 900_000 }, analista);
      await expect(
        revision.solicitarReversion(id, { motivo: 'Quiero revertir después de cerrar.' }, analista),
      ).rejects.toThrow(/cerrado/);
    });
  });

  describe('viaje más corto según las fechas reales del GF-FO-032', () => {
    let id: string;
    beforeAll(async () => {
      // Planeada del 14 al 18 (4 noches); regresó el 16 (2 noches).
      id = await legalizacionEnviada(1_000_000, { conLiquidacion: true, fechasReales: ['2026-09-14', '2026-09-16'] });
      await aprobarTodo(id);
    }, 60_000);

    it('el analista ve el reintegro por viaje más corto y el tope de lo legalizable', async () => {
      const d = await revision.detalle(id, analista);
      expect(d.viajeReal).toMatchObject({
        diasReales: 3, nochesPlaneadas: 4, nochesReales: 2, viaticosPlaneados: 450_000, viaticosReales: 250_000,
        reintegroViajeCorto: 200_000,
      });
      expect(d.maximoLegalizable).toBe(800_000);
    });

    it('no deja legalizar más de lo que permiten los días realmente viajados', async () => {
      await expect(
        revision.registrarYCerrar(id, { numeroRegistroSiif: 'LEG-CORTO', fechaRegistroSiif: '2026-09-25', valorLegalizado: 900_000 }, analista),
      ).rejects.toThrow(/viaje fue más corto \(2 de 4 noches\).*no puede superar \$800\.000/);
    });

    it('cierra con el reintegro calculado, los días reales del 032 y lo informa en el evento', async () => {
      const antes = eventos.length;
      const r = await revision.registrarYCerrar(
        id,
        // diasReales digitado se ignora: salen de las fechas del 032.
        { numeroRegistroSiif: 'LEG-CORTO', fechaRegistroSiif: '2026-09-25', valorLegalizado: 800_000, diasReales: 9 },
        analista,
      );
      expect(r).toMatchObject({ devuelta: false, estadoSolicitud: 'LEGALIZADO', valorReintegro: 200_000 });
      const [l] = await ds.query(
        `SELECT dias_reales::float AS dias, reintegro_viaje_corto::float AS corto, valor_reintegro::float AS reintegro
           FROM travel_expenses.legalizaciones_comision WHERE solicitud_id = $1`,
        [id],
      );
      expect(l).toEqual({ dias: 3, corto: 200_000, reintegro: 200_000 });
      expect(eventos.length).toBe(antes + 1);
      expect(eventos[eventos.length - 1]).toMatchObject({
        solicitudId: id, valorReintegro: 200_000, reintegroViajeCorto: 200_000, diasReales: 3,
        fechaInicioReal: '2026-09-14', fechaFinReal: '2026-09-16',
      });
    });

    it('sin tarifas en la liquidación no hay tope: el analista decide, como antes', async () => {
      const otra = await legalizacionEnviada(1_000_000, { fechasReales: ['2026-09-14', '2026-09-15'] });
      const d = await revision.detalle(otra, analista);
      expect(d.viajeReal).toMatchObject({ diasReales: 2, reintegroViajeCorto: null });
      expect(d.maximoLegalizable).toBe(1_000_000);
    });
  });

  describe('viaje completo y canario', () => {
    it('sin diferencia no emite evento de reintegro', async () => {
      const id = await legalizacionEnviada(500_000);
      await aprobarTodo(id);
      const antes = eventos.length;
      const r = await revision.registrarYCerrar(id, { numeroRegistroSiif: 'LEG-SIIF-EXACTO', fechaRegistroSiif: '2026-09-25', valorLegalizado: 500_000 }, analista);
      expect(r).toMatchObject({ devuelta: false, valorReintegro: 0 });
      expect(eventos.length).toBe(antes);
    });

    it('el canario no ve inconsistencias de cierre en las solicitudes de esta suite', async () => {
      const c = await canario.verificar();
      for (const lista of Object.values(c.muestras)) {
        expect(lista.filter((x) => solicitudes.includes(x))).toEqual([]);
      }
      // Estas son invariantes de datos cerrados, que no cambian por escrituras concurrentes.
      expect(c.violaciones).toMatchObject({ reintegroInconsistente: 0, aprobadaConPendientes: 0, reintegroMenorQueViajeCorto: 0 });
      expect(c.poblacion.legalizacionesPorEstadoSolicitud.LEGALIZADO).toBeGreaterThanOrEqual(2);
    });
  });
});
