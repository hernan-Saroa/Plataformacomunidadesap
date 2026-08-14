import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { DocumentosService } from '../src/modules/documentos/documentos.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * HU EFDS-1149 · Generar aviso y proyecto de pliego (o acto de justificación).
 *
 * Los dos criterios de aceptación son sobre qué documentos exige el proceso
 * según su modalidad, así que las pruebas atacan eso contra la base real: el
 * catálogo vive en hiring.documentos_requeridos y una regla mal cargada no la
 * detecta ninguna prueba unitaria.
 *
 * El sistema no genera los documentos —no existen las plantillas oficiales,
 * RF-DOC-07—, los exige y los registra. Es lo que estas pruebas verifican.
 */
describe('HU EFDS-1149 · documentos del proceso (actividad 5.1)', () => {
  let app: INestApplication;
  let documentos: DocumentosService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'Documentos del proceso para pruebas';

  const gestor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000001',
    userName: 'prueba.gestor',
    roles: ['GESTOR_CONTRATACION'],
    puedeEditar: true,
  };

  /** Un archivo cargado, tal como lo entrega multer al servicio. */
  const archivo = (nombre: string) => ({
    filename: `${nombre}-en-disco.pdf`,
    originalname: nombre,
    mimetype: 'application/pdf',
    size: 1024,
  });

  const crear = (modalidad: string) =>
    procesos.crearProceso({ objeto: OBJETO, modalidad, valorEstimado: 1_000_000 }, gestor);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    documentos = app.get(DocumentosService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // Los procesos de prueba se identifican por su objeto para no borrar datos
    // reales si esto corre contra una base compartida.
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · modalidad con pliego', () => {
    it('exige el aviso de convocatoria y el proyecto de pliego', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      const estado = await documentos.estado(proceso.id);

      expect(estado.aplica).toBe(true);
      expect(estado.documentos.map((d) => d.codigo)).toEqual([
        'AVISO_CONVOCATORIA',
        'PROYECTO_PLIEGO',
      ]);
    });

    it('la actividad nace incompleta y sin iniciar', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      const estado = await documentos.estado(proceso.id);

      // El estado se consulta antes de tocar nada: saber qué se va a pedir es
      // lo que permite prepararlo.
      expect(estado.iniciada).toBe(false);
      expect(estado.completa).toBe(false);
      expect(estado.documentos.every((d) => d.cargado === null)).toBe(true);
    });

    it('registra cada documento y solo da la actividad por cumplida con los dos', async () => {
      const proceso = await crear('LICITACION_PUBLICA');

      const conAviso = await documentos.cargar(
        proceso.id,
        'AVISO_CONVOCATORIA',
        archivo('aviso.pdf'),
        'a'.repeat(64),
        gestor,
      );

      // Un documento de dos: la actividad está en curso, no cumplida.
      expect(conAviso.completa).toBe(false);
      expect(conAviso.estado).toBe('BORRADOR');
      expect(conAviso.documentos.find((d) => d.codigo === 'AVISO_CONVOCATORIA')?.cargado).not.toBe(
        null,
      );

      const conPliego = await documentos.cargar(
        proceso.id,
        'PROYECTO_PLIEGO',
        archivo('pliego.pdf'),
        'b'.repeat(64),
        gestor,
      );

      expect(conPliego.completa).toBe(true);
      expect(conPliego.estado).toBe('APROBADO');
    });

    it('no admite el mismo documento dos veces sin sustituir el anterior', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      await documentos.cargar(proceso.id, 'PROYECTO_PLIEGO', archivo('v1.pdf'), 'c'.repeat(64), gestor);

      // Sin esto, dos cargas seguidas dejarían dos documentos vigentes para el
      // mismo requisito y el expediente no diría cuál es el bueno.
      await expect(
        documentos.cargar(proceso.id, 'PROYECTO_PLIEGO', archivo('v2.pdf'), 'd'.repeat(64), gestor),
      ).rejects.toThrow(/ya está cargado/i);
    });

    it('al sustituir un documento la actividad vuelve a estar incompleta', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      await documentos.cargar(proceso.id, 'AVISO_CONVOCATORIA', archivo('a.pdf'), 'e'.repeat(64), gestor);
      const completo = await documentos.cargar(
        proceso.id,
        'PROYECTO_PLIEGO',
        archivo('p.pdf'),
        'f'.repeat(64),
        gestor,
      );
      expect(completo.completa).toBe(true);

      const cargado = completo.documentos.find((d) => d.codigo === 'PROYECTO_PLIEGO')!.cargado!;
      const tras = await documentos.anular(proceso.id, cargado.id, gestor);

      // Volver a BORRADOR es la verdad —falta un documento—, no un retroceso.
      expect(tras.completa).toBe(false);
      expect(tras.estado).toBe('BORRADOR');
      expect(tras.documentos.find((d) => d.codigo === 'PROYECTO_PLIEGO')?.cargado).toBe(null);
    });

    it('conserva el documento sustituido en el expediente', async () => {
      const proceso = await crear('LICITACION_PUBLICA');
      const uno = await documentos.cargar(
        proceso.id,
        'AVISO_CONVOCATORIA',
        archivo('primera-version.pdf'),
        '1'.repeat(64),
        gestor,
      );
      await documentos.anular(
        proceso.id,
        uno.documentos.find((d) => d.codigo === 'AVISO_CONVOCATORIA')!.cargado!.id,
        gestor,
      );

      // El expediente responde ante entes de control: que hubo una versión
      // anterior es parte de lo que prueba.
      const [{ total }] = await dataSource.query(
        `SELECT count(*)::int AS total FROM hiring.documentos_proceso
          WHERE proceso_id = $1 AND anulado_at IS NOT NULL`,
        [proceso.id],
      );
      expect(total).toBe(1);
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · contratación directa', () => {
    it('exige el acto de justificación en lugar del pliego', async () => {
      const proceso = await crear('CONTRATACION_DIRECTA');
      const estado = await documentos.estado(proceso.id);

      expect(estado.documentos.map((d) => d.codigo)).toEqual(['ACTO_JUSTIFICACION']);
      expect(estado.documentos.map((d) => d.codigo)).not.toContain('PROYECTO_PLIEGO');
    });

    it('no deja elaborar los documentos sin el CDP expedido', async () => {
      // RF-EST-06: en directa el control presupuestal se adelanta a esta
      // actividad, porque no hay apertura que sirva de control.
      const proceso = await crear('CONTRATACION_DIRECTA');

      await expect(
        documentos.cargar(
          proceso.id,
          'ACTO_JUSTIFICACION',
          archivo('acto.pdf'),
          '2'.repeat(64),
          gestor,
        ),
      ).rejects.toThrow(/CDP/i);
    });
  });

  // ------------------------------------------------- aplicabilidad general --

  it('el régimen especial 092 no elabora los documentos ordinarios', async () => {
    const proceso = await crear('REGIMEN_ESPECIAL_092');
    const estado = await documentos.estado(proceso.id);

    expect(estado.aplica).toBe(false);
    expect(estado.motivoNoAplica).toMatch(/092/);
  });

  it('rechaza un documento que no corresponde a la modalidad', async () => {
    const proceso = await crear('LICITACION_PUBLICA');

    // El acto de justificación es de directa: aceptarlo aquí metería en el
    // expediente un documento que esa modalidad no contempla.
    await expect(
      documentos.cargar(proceso.id, 'ACTO_JUSTIFICACION', archivo('x.pdf'), '3'.repeat(64), gestor),
    ).rejects.toThrow(/no corresponde a la modalidad/i);
  });
});
