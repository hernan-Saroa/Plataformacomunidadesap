import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { MipymeService } from '../src/modules/mipyme/mipyme.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * Regresión de la actividad 5.4 (EFDS-1151).
 *
 * La entidad LimitacionMipyme declara `smmlv_aplicado` desde EFDS-1390, pero la
 * migración que crea la columna puede no haberse aplicado en un entorno
 * concreto. Cuando eso pasa, abrir la actividad revienta con un
 * QueryFailedError, y el fallo no aparece en ninguna prueba: las demás no leen
 * esa tabla.
 *
 * Esta prueba la lee. Si al esquema le falta una columna que la entidad espera,
 * falla aquí en vez de en la pantalla del gestor.
 */
describe('Actividad 5.4 · el estado de MIPYME se puede consultar', () => {
  let app: INestApplication;
  let mipyme: MipymeService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'MIPYME estado para pruebas';

  const gestor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000001',
    userName: 'prueba.gestor',
    roles: ['GESTOR_CONTRATACION'],
    puedeEditar: true,
  };

  const crear = (modalidad: string) =>
    procesos.crearProceso({ objeto: OBJETO, modalidad, valorEstimado: 1_000_000 }, gestor);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    mipyme = app.get(MipymeService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  it('responde en una modalidad que admite la limitación', async () => {
    const proceso = await crear('MINIMA_CUANTIA');

    // La consulta a limitaciones_mipyme es la que fallaba: sin la columna
    // smmlv_aplicado, esto lanza QueryFailedError antes de devolver nada.
    const estado = await mipyme.estado(proceso.id);

    expect(estado.aplica).toBe(true);
    expect(estado.decision).toBeNull();
  });

  it('responde en una modalidad excluida', async () => {
    const proceso = await crear('CONTRATACION_DIRECTA');
    const estado = await mipyme.estado(proceso.id);

    expect(estado.aplica).toBe(false);
  });

  it('la tabla tiene las columnas que la entidad declara', async () => {
    // Comprobación directa del esquema: es lo que separa "la actividad abre"
    // de "la actividad abre porque este proceso todavía no tiene decisión".
    const columnas = await dataSource.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'hiring' AND table_name = 'limitaciones_mipyme'`,
    );
    const nombres = columnas.map((c: any) => c.column_name);

    for (const esperada of [
      'smmlv_aplicado',
      'tope_valor_aplicado',
      'unidad_tope_aplicada',
      'minimo_manifestaciones',
      'condiciones_cumplidas',
    ]) {
      expect(nombres).toContain(esperada);
    }
  });
});
