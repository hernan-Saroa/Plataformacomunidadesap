import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { AperturaService } from '../src/modules/apertura/apertura.service';
import { CdpService } from '../src/modules/cdp/cdp.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * HU EFDS-1152 · Registrar apertura del proceso y publicar pliego definitivo.
 *
 * Los dos criterios son sobre la misma frontera: con CDP expedido y pliego
 * definitivo el proceso se abre y queda registrado con qué acto; sin CDP no se
 * abre (RF-EST-05). Se prueban contra la base porque lo que hay que verificar
 * es que el expediente conserve la resolución, no que una función devuelva true.
 */
describe('HU EFDS-1152 · apertura del proceso (actividad 5.7)', () => {
  let app: INestApplication;
  let apertura: AperturaService;
  let cdp: CdpService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'Apertura del proceso para pruebas';

  const gestor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000001',
    userName: 'prueba.gestor',
    roles: ['GESTOR_CONTRATACION'],
    puedeEditar: true,
  };

  const financiero: HiringAccess = {
    ...gestor,
    userName: 'prueba.financiero',
    roles: ['ESTRUCTURADOR_FINANCIERO'],
  };

  const archivo = (nombre: string) => ({
    filename: `${nombre}-en-disco.pdf`,
    originalname: nombre,
    mimetype: 'application/pdf',
    size: 2048,
  });

  const datos = {
    resolucionNumero: '0451 de 2026',
    resolucionFecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }),
  };

  const crear = (modalidad = 'LICITACION_PUBLICA') =>
    procesos.crearProceso({ objeto: OBJETO, modalidad, valorEstimado: 1_000_000 }, gestor);

  /** Lleva el CDP hasta expedido, que es lo que la apertura exige. */
  const expedirCdp = async (procesoId: string) => {
    await cdp.solicitar(procesoId, { rubro: 'A-02-02', valor: 1_000_000 }, gestor);
    await cdp.verificar(procesoId, financiero);
    await cdp.expedir(
      procesoId,
      { numero: 'CDP-2026-001', valor: 1_000_000, fechaExpedicion: datos.resolucionFecha },
      financiero,
    );
  };

  const abrir = (procesoId: string) =>
    apertura.registrar(
      procesoId,
      datos,
      archivo('resolucion.pdf'),
      'a'.repeat(64),
      archivo('pliego-definitivo.pdf'),
      'b'.repeat(64),
      gestor,
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    apertura = app.get(AperturaService);
    cdp = app.get(CdpService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // El CDP referencia el proceso sin borrado en cascada, así que hay que
    // quitarlo primero: la FK impediría borrar los procesos de prueba.
    await dataSource.query(
      `DELETE FROM hiring.cdp WHERE proceso_id IN (SELECT id FROM hiring.procesos WHERE objeto = $1)`,
      [OBJETO],
    );
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · con CDP expedido y pliego definitivo', () => {
    it('abre el proceso y guarda la resolución en el expediente', async () => {
      const proceso = await crear();
      await expedirCdp(proceso.id);

      const estado = await abrir(proceso.id);

      expect(estado.abierta).toBe(true);
      expect(estado.apertura?.resolucionNumero).toBe(datos.resolucionNumero);
      expect(estado.apertura?.resolucionFecha).toBe(datos.resolucionFecha);
    });

    it('mueve el proceso a la etapa de apertura y da la actividad por cumplida', async () => {
      const proceso = await crear();
      await expedirCdp(proceso.id);
      await abrir(proceso.id);

      const [fila] = await dataSource.query(`SELECT etapa FROM hiring.procesos WHERE id = $1`, [
        proceso.id,
      ]);
      expect(fila.etapa).toBe(5);

      const [actividad] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '5.7'`,
        [proceso.id],
      );
      expect(actividad.estado).toBe('APROBADO');
    });

    it('registra los dos documentos: la resolución y el pliego definitivo', async () => {
      const proceso = await crear();
      await expedirCdp(proceso.id);
      await abrir(proceso.id);

      const documentos = await dataSource.query(
        `SELECT d.nombre FROM hiring.documentos d
           JOIN hiring.expedientes e ON e.id = d.expediente_id
          WHERE e.proceso_id = $1 AND d.numeral = '5.7'
          ORDER BY d.nombre`,
        [proceso.id],
      );

      expect(documentos.map((d: any) => d.nombre)).toEqual([
        'Pliego definitivo',
        'Resolución de apertura',
      ]);
    });

    it('no deja abrir dos veces el mismo proceso', async () => {
      const proceso = await crear();
      await expedirCdp(proceso.id);
      await abrir(proceso.id);

      // Dos resoluciones distintas dando inicio al mismo proceso no puede ser.
      await expect(abrir(proceso.id)).rejects.toThrow(/ya fue abierto/i);
    });

    it('rechaza una resolución con fecha futura', async () => {
      const proceso = await crear();
      await expedirCdp(proceso.id);

      const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

      // La fecha del acto manda los términos siguientes: adelantarla movería
      // vencimientos que todavía no han empezado a contar.
      await expect(
        apertura.registrar(
          proceso.id,
          { ...datos, resolucionFecha: manana },
          archivo('r.pdf'),
          'c'.repeat(64),
          archivo('p.pdf'),
          'd'.repeat(64),
          gestor,
        ),
      ).rejects.toThrow(/no puede ser posterior a hoy/i);
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · sin CDP', () => {
    it('impide la apertura y lo dice en el estado', async () => {
      const proceso = await crear();
      const estado = await apertura.estado(proceso.id);

      expect(estado.requisitos.cdp.cumplido).toBe(false);
      expect(estado.puedeAbrir).toBe(false);
    });

    it('rechaza el registro aunque traiga la resolución y el pliego', async () => {
      // RF-EST-05. Los documentos completos no sustituyen al respaldo
      // presupuestal: sin CDP el proceso no puede abrirse.
      const proceso = await crear();

      await expect(abrir(proceso.id)).rejects.toThrow(/CDP/i);
    });

    it('no deja rastro de una apertura que no prosperó', async () => {
      const proceso = await crear();
      await expect(abrir(proceso.id)).rejects.toThrow();

      // La resolución y el cambio de etapa van en la misma transacción: si el
      // CDP la frena, no puede quedar media apertura registrada.
      const [{ total }] = await dataSource.query(
        `SELECT count(*)::int AS total FROM hiring.aperturas_proceso WHERE proceso_id = $1`,
        [proceso.id],
      );
      expect(total).toBe(0);

      const [fila] = await dataSource.query(`SELECT etapa FROM hiring.procesos WHERE id = $1`, [
        proceso.id,
      ]);
      expect(fila.etapa).toBe(3);
    });
  });

  // ------------------------------------------------- aplicabilidad general --

  it('la contratación directa no adelanta la apertura', async () => {
    const proceso = await crear('CONTRATACION_DIRECTA');
    const estado = await apertura.estado(proceso.id);

    expect(estado.aplica).toBe(false);
    expect(estado.puedeAbrir).toBe(false);
  });
});
