import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { RiesgosService } from '../src/modules/riesgos/riesgos.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * HU EFDS-1153 · Audiencia de asignación de riesgos (actividad 5.5).
 *
 * El primer criterio es que en licitación pública el sistema exija la audiencia
 * y permita consolidar la matriz de riesgos. Se prueba contra la base porque la
 * regla de en qué modalidades es obligatoria vive en tabla, y una fila mal
 * cargada no la detecta ninguna prueba unitaria.
 */
describe('HU EFDS-1153 · audiencia de riesgos (actividad 5.5)', () => {
  let app: INestApplication;
  let riesgos: RiesgosService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'Audiencia de riesgos para pruebas';

  const gestor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000001',
    userName: 'prueba.gestor',
    roles: ['GESTOR_CONTRATACION'],
    puedeEditar: true,
  };

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

  const archivo = (nombre: string) => ({
    filename: `${nombre}-en-disco`,
    originalname: nombre,
    mimetype: 'application/pdf',
    size: 1024,
  });

  const crear = (modalidad: string) =>
    procesos.crearProceso({ objeto: OBJETO, modalidad, valorEstimado: 1_000_000 }, gestor);

  const celebrar = (procesoId: string, fecha = hoy()) =>
    riesgos.registrar(
      procesoId,
      { fechaCelebracion: fecha },
      archivo('acta.pdf'),
      'a'.repeat(64),
      archivo('matriz-riesgos.xlsx'),
      'b'.repeat(64),
      gestor,
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    riesgos = app.get(RiesgosService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · licitación pública', () => {
    it('exige la audiencia', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      const estado = await riesgos.estado(proceso.id);

      expect(estado.aplica).toBe(true);
      expect(estado.obligatoria).toBe(true);
      expect(estado.celebrada).toBe(false);
    });

    it('registra el acta y la matriz de riesgos consolidada', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      const estado = await celebrar(proceso.id);

      expect(estado.celebrada).toBe(true);
      expect(estado.audiencia?.acta?.nombre).toBe('acta.pdf');
      expect(estado.audiencia?.matriz?.nombre).toBe('matriz-riesgos.xlsx');
    });

    it('deja los dos documentos en el expediente', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      await celebrar(proceso.id);

      const documentos = await dataSource.query(
        `SELECT d.nombre FROM hiring.documentos d
           JOIN hiring.expedientes e ON e.id = d.expediente_id
          WHERE e.proceso_id = $1 AND d.numeral = '5.5'
          ORDER BY d.nombre`,
        [proceso.id],
      );

      expect(documentos.map((d: any) => d.nombre)).toEqual([
        'Acta de la audiencia de riesgos',
        'Matriz de riesgos consolidada',
      ]);
    });

    it('da la actividad por cumplida al registrarla', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      await celebrar(proceso.id);

      const [actividad] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades
          WHERE proceso_id = $1 AND numeral = '5.5'`,
        [proceso.id],
      );
      expect(actividad.estado).toBe('APROBADO');
    });

    it('no admite dos audiencias vigentes', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      await celebrar(proceso.id);

      await expect(celebrar(proceso.id)).rejects.toThrow(/ya tiene una audiencia/i);
    });

    it('rechaza una audiencia con fecha futura', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

      // Una fecha adelantada permitiría abrir el proceso apoyándose en una
      // audiencia que todavía no se celebró.
      await expect(celebrar(proceso.id, manana)).rejects.toThrow(/no puede ser posterior a hoy/i);
    });

    it('al anularla la actividad vuelve a estar pendiente', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      await celebrar(proceso.id);

      const tras = await riesgos.anular(
        proceso.id,
        { motivo: 'El acta cargada corresponde a otro proceso' },
        gestor,
      );

      expect(tras.celebrada).toBe(false);

      // La audiencia anulada no se borra: el expediente conserva que existió.
      const [{ total }] = await dataSource.query(
        `SELECT count(*)::int AS total FROM hiring.audiencias_riesgos
          WHERE proceso_id = $1 AND anulada_at IS NOT NULL`,
        [proceso.id],
      );
      expect(total).toBe(1);
    });

    it('tras anular se puede registrar otra', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      await celebrar(proceso.id);
      await riesgos.anular(proceso.id, { motivo: 'Se corrige la fecha de celebración' }, gestor);

      const estado = await celebrar(proceso.id);
      expect(estado.celebrada).toBe(true);
    });
  });

  // ------------------------------------------------- aplicabilidad general --

  describe('Aplicabilidad por modalidad', () => {
    it('la contratación directa no adelanta audiencia', async () => {
      const proceso = await crear('CONTRATACION_DIRECTA');
      const estado = await riesgos.estado(proceso.id);

      expect(estado.aplica).toBe(false);
      expect(estado.obligatoria).toBe(false);
    });

    it('rechaza registrarla donde no aplica', async () => {
      const proceso = await crear('REGIMEN_ESPECIAL_092');

      await expect(celebrar(proceso.id)).rejects.toThrow(/no adelanta audiencia/i);
    });

    it('donde aplica sin ser obligatoria, se puede celebrar pero no bloquea', async () => {
      // Mínima cuantía no está excluida y no figura como obligatoria: la
      // audiencia puede registrarse, pero el proceso no depende de ella.
      const proceso = await crear('MINIMA_CUANTIA');
      const estado = await riesgos.estado(proceso.id);

      expect(estado.aplica).toBe(true);
      expect(estado.obligatoria).toBe(false);

      const requisito = await riesgos.requisitoParaApertura(proceso.id);
      expect(requisito.cumplido).toBe(true);

      const tras = await celebrar(proceso.id);
      expect(tras.celebrada).toBe(true);
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · el requisito para avanzar', () => {
    it('sin la audiencia obligatoria el requisito no se cumple', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      const requisito = await riesgos.requisitoParaApertura(proceso.id);

      expect(requisito.cumplido).toBe(false);
      expect(requisito.motivo).toMatch(/audiencia/i);
    });

    it('con la audiencia celebrada el requisito se cumple', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      await celebrar(proceso.id);

      const requisito = await riesgos.requisitoParaApertura(proceso.id);
      expect(requisito.cumplido).toBe(true);
    });

    it('anularla vuelve a dejar el requisito sin cumplir', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      await celebrar(proceso.id);
      await riesgos.anular(proceso.id, { motivo: 'La matriz consolidada estaba incompleta' }, gestor);

      const requisito = await riesgos.requisitoParaApertura(proceso.id);
      expect(requisito.cumplido).toBe(false);
    });
  });
});
