import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { AdendasService } from '../src/modules/adendas/adendas.service';
import { PublicacionService } from '../src/modules/publicacion/publicacion.service';
import { AperturaService } from '../src/modules/apertura/apertura.service';
import { CdpService } from '../src/modules/cdp/cdp.service';
import { OfertasService } from '../src/modules/ofertas/ofertas.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * HU EFDS-1154 · Gestionar adendas del proceso (actividad 5.13).
 *
 * El segundo criterio —que al publicar una adenda de cronograma se muevan las
 * fechas del proceso— solo se puede comprobar contra la base: lo que cambia es
 * un vencimiento guardado, y de esa fecha dependen el semáforo del plazo y el
 * control de término.
 *
 * Desde la 112 las adendas van como en la matriz: «a partir de la apertura
 * pueden generarse en cualquier momento», hasta el cierre de ofertas. Con el
 * proceso abierto, la de cronograma prorroga el cierre de ofertas. Donde la
 * modalidad no tiene apertura —mínima cuantía— basta el pliego publicado y la
 * de cronograma prorroga el plazo de observaciones, como antes.
 */
describe('HU EFDS-1154 · adendas del proceso (actividad 5.13)', () => {
  let app: INestApplication;
  let adendas: AdendasService;
  let publicacion: PublicacionService;
  let apertura: AperturaService;
  let cdp: CdpService;
  let ofertas: OfertasService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'Adendas del proceso para pruebas';

  const gestor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000001',
    userName: 'prueba.gestor',
    roles: ['GESTOR_CONTRATACION'],
  };

  const financiero: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000002',
    userName: 'prueba.financiero',
    roles: ['ESTRUCTURADOR_FINANCIERO'],
  };

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

  /** Una fecha a N días de hoy, en formato de calendario. */
  const enDias = (dias: number) =>
    new Date(Date.now() + dias * 86_400_000).toLocaleDateString('en-CA', {
      timeZone: 'America/Bogota',
    });

  const archivo = (nombre: string, mimetype = 'application/pdf') => ({
    filename: `${nombre}-en-disco`,
    originalname: nombre,
    mimetype,
    size: 1024,
  });

  const crear = (modalidad = 'LICITACION_PUBLICA') =>
    procesos.crearProceso({ objeto: OBJETO, modalidad, valorEstimado: 1_000_000 }, gestor);

  /** Publica el pliego en SECOP II, que es lo que una adenda puede modificar. */
  const publicarPliego = (procesoId: string) =>
    publicacion.registrar(
      procesoId,
      { fechaPublicacion: hoy() },
      archivo('pliego.pdf'),
      'p'.repeat(64),
      gestor,
    );

  const emitir = (
    procesoId: string,
    tipo: 'FONDO' | 'CRONOGRAMA' = 'FONDO',
    vencimientoNuevo?: string,
  ) =>
    adendas.emitir(
      procesoId,
      {
        tipo,
        objeto:
          tipo === 'FONDO'
            ? 'Se ajusta la experiencia mínima exigida a los proponentes'
            : 'Se prorroga el plazo del proceso',
        vencimientoNuevo,
      },
      archivo('adenda.pdf'),
      'a'.repeat(64),
      gestor,
    );

  const publicar = (procesoId: string, adendaId: string, fecha = hoy()) =>
    adendas.publicar(
      procesoId,
      adendaId,
      { fechaPublicacion: fecha },
      archivo('captura-secop.png', 'image/png'),
      'e'.repeat(64),
      gestor,
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    adendas = app.get(AdendasService);
    publicacion = app.get(PublicacionService);
    apertura = app.get(AperturaService);
    cdp = app.get(CdpService);
    ofertas = app.get(OfertasService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // Las adendas y las publicaciones referencian documentos del expediente, y
    // el borrado en cascada del proceso no garantiza el orden entre unas y
    // otros. Se quitan a mano, de la hoja a la raíz.
    const deProceso = `proceso_id IN (SELECT id FROM hiring.procesos WHERE objeto = $1)`;
    await dataSource.query(`DELETE FROM hiring.adendas WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.recepciones_ofertas WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.cdp WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.publicaciones_pliego WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · emitir y publicar', () => {
    it('registra la adenda con su consecutivo y la asocia al proceso', async () => {
      const proceso = await abierto();

      const estado = await emitir(proceso.id);

      expect(estado.adendas).toHaveLength(1);
      expect(estado.adendas[0].numero).toBe(1);
      expect(estado.adendas[0].estado).toBe('EMITIDA');
      expect(estado.adendas[0].tipo).toBe('FONDO');
    });

    it('numera las adendas correlativamente dentro del proceso', async () => {
      const proceso = await abierto();
      await emitir(proceso.id);
      const estado = await emitir(proceso.id);

      expect(estado.adendas.map((a) => a.numero)).toEqual([1, 2]);
    });

    it('permite publicarla con su evidencia', async () => {
      const proceso = await abierto();
      const emitida = await emitir(proceso.id);

      const estado = await publicar(proceso.id, emitida.adendas[0].id);

      expect(estado.adendas[0].estado).toBe('PUBLICADA');
      expect(estado.adendas[0].evidencia?.nombre).toBe('captura-secop.png');
      expect(estado.adendas[0].fechaPublicacion).toBe(hoy());
    });

    it('no publica dos veces la misma adenda', async () => {
      const proceso = await abierto();
      const emitida = await emitir(proceso.id);
      await publicar(proceso.id, emitida.adendas[0].id);

      await expect(publicar(proceso.id, emitida.adendas[0].id)).rejects.toThrow(/ya fue publicada/i);
    });

    it('deja anular una adenda emitida por error, pero no una publicada', async () => {
      const proceso = await abierto();
      const emitida = await emitir(proceso.id);

      const tras = await adendas.anular(
        proceso.id,
        emitida.adendas[0].id,
        { motivo: 'El documento cargado corresponde a otro proceso' },
        gestor,
      );
      expect(tras.adendas[0].estado).toBe('ANULADA');

      const otra = await emitir(proceso.id);
      const publicada = await publicar(proceso.id, otra.adendas[1].id);
      expect(publicada.adendas[1].estado).toBe('PUBLICADA');

      // Una adenda publicada ya produjo efectos frente a terceros.
      await expect(
        adendas.anular(
          proceso.id,
          otra.adendas[1].id,
          { motivo: 'Se quiere deshacer la publicación' },
          gestor,
        ),
      ).rejects.toThrow(/ya fue publicada/i);
    });

    it('no reutiliza el consecutivo de una adenda anulada', async () => {
      // Dos documentos distintos citándose como "adenda 2" sería un problema
      // de expediente, no de numeración.
      const proceso = await abierto();
      const primera = await emitir(proceso.id);
      await adendas.anular(
        proceso.id,
        primera.adendas[0].id,
        { motivo: 'Se emitió sobre el proceso equivocado' },
        gestor,
      );

      const estado = await emitir(proceso.id);
      expect(estado.adendas.map((a) => a.numero)).toEqual([1, 2]);
    });
  });

  // ------------------------------------------------ cuándo se pueden emitir --

  describe('Desde la apertura hasta el cierre de ofertas', () => {
    it('antes de la apertura no se emiten', async () => {
      // Antes de abrir lo que cambia es el proyecto de pliego, y eso entra en
      // el pliego definitivo: la adenda modifica lo que rige desde la apertura.
      const proceso = await crear();
      await publicarPliego(proceso.id);

      const estado = await adendas.estado(proceso.id);
      expect(estado.puedeEmitir).toBe(false);
      expect(estado.motivoNoPuedeEmitir).toMatch(/a partir de la apertura/i);

      await expect(emitir(proceso.id)).rejects.toThrow(/a partir de la apertura/i);
    });

    it('con el proceso abierto, sí', async () => {
      const proceso = await abierto();

      const estado = await adendas.estado(proceso.id);
      expect(estado.abierto).toBe(true);
      expect(estado.puedeEmitir).toBe(true);
      expect(estado.mueve).toBe('CIERRE_OFERTAS');
    });

    it('cerrada la recepción de ofertas, ya no', async () => {
      // Menor cuantía: no exige audiencia de riesgos para cerrar, así la prueba
      // mide las adendas y no el requisito de otra historia.
      const proceso = await abierto('ABREVIADA_MENOR_CUANTIA');
      const haceTresHoras = new Date(Date.now() - 3 * 3_600_000).toISOString();
      await ofertas.fijarPlazo(proceso.id, { vencimiento: haceTresHoras }, gestor);
      await ofertas.cerrar(proceso.id, gestor);

      await expect(emitir(proceso.id)).rejects.toThrow(/recepción de ofertas ya se cerró/i);
    });

    it('donde no hay apertura basta el pliego publicado', async () => {
      // Mínima cuantía no tiene apertura formal (matriz, 5.7) y sí adendas.
      const proceso = await crear('MINIMA_CUANTIA');
      await expect(emitir(proceso.id)).rejects.toThrow(/no hay pliego publicado/i);

      await publicarPliego(proceso.id);
      const estado = await emitir(proceso.id);
      expect(estado.adendas).toHaveLength(1);
      expect(estado.mueve).toBe('PLAZO_OBSERVACIONES');
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · la adenda de cronograma mueve las fechas', () => {
    /** El día en que cierra la recepción de ofertas, en Bogotá. */
    const cierreDe = async (procesoId: string) => {
      const [fila] = await dataSource.query(
        `SELECT to_char(vencimiento AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') AS vence,
                to_char(vencimiento AT TIME ZONE 'America/Bogota', 'HH24:MI') AS hora
           FROM hiring.recepciones_ofertas WHERE proceso_id = $1`,
        [procesoId],
      );
      return fila ?? null;
    };

    const observacionesDe = async (procesoId: string) => {
      const [fila] = await dataSource.query(
        `SELECT to_char(fecha_vencimiento, 'YYYY-MM-DD') AS vence
           FROM hiring.publicaciones_pliego
          WHERE proceso_id = $1 AND anulada_at IS NULL`,
        [procesoId],
      );
      return fila?.vence ?? null;
    };

    it('con el proceso abierto, prorroga el cierre de ofertas al publicarse', async () => {
      const proceso = await abierto();
      const original = await cierreDe(proceso.id);
      const nuevo = enDias(40);

      const emitida = await emitir(proceso.id, 'CRONOGRAMA', nuevo);
      // Emitida pero sin publicar: el plazo todavía no se mueve.
      expect((await cierreDe(proceso.id)).vence).toBe(original.vence);

      await publicar(proceso.id, emitida.adendas[0].id);
      const tras = await cierreDe(proceso.id);
      expect(tras.vence).toBe(nuevo);
      // Mueve el día, no la hora a la que cierra la recepción.
      expect(tras.hora).toBe(original.hora);
    });

    it('guarda de qué fecha a qué fecha se movió', async () => {
      const proceso = await abierto();
      const original = await cierreDe(proceso.id);

      const emitida = await emitir(proceso.id, 'CRONOGRAMA', enDias(45));
      const estado = await publicar(proceso.id, emitida.adendas[0].id);

      // Con la fecha nueva sola no habría forma de saber qué se prorrogó.
      expect(estado.adendas[0].vencimientoAnterior).toBe(original.vence);
      expect(estado.adendas[0].vencimientoNuevo).toBe(enDias(45));
    });

    it('una adenda de fondo no toca el cronograma', async () => {
      const proceso = await abierto();
      const original = await cierreDe(proceso.id);

      const emitida = await emitir(proceso.id, 'FONDO');
      await publicar(proceso.id, emitida.adendas[0].id);

      expect((await cierreDe(proceso.id)).vence).toBe(original.vence);
    });

    it('rechaza acortar el plazo hacia atrás', async () => {
      // Acortar un plazo ya anunciado recortaría el término de quien todavía
      // puede presentar su oferta.
      const proceso = await abierto();

      await expect(emitir(proceso.id, 'CRONOGRAMA', hoy())).rejects.toThrow(
        /posterior|prorroga/i,
      );
    });

    it('dos prórrogas seguidas se encadenan desde el vencimiento vigente', async () => {
      const proceso = await abierto();

      const primera = await emitir(proceso.id, 'CRONOGRAMA', enDias(40));
      await publicar(proceso.id, primera.adendas[0].id);

      const segunda = await emitir(proceso.id, 'CRONOGRAMA', enDias(50));
      const estado = await publicar(proceso.id, segunda.adendas[1].id);

      // La segunda parte de donde dejó la primera, no del plazo original.
      expect(estado.adendas[1].vencimientoAnterior).toBe(enDias(40));
      expect((await cierreDe(proceso.id)).vence).toBe(enDias(50));
    });

    it('sin apertura, prorroga el plazo de observaciones', async () => {
      const proceso = await crear('MINIMA_CUANTIA');
      await publicarPliego(proceso.id);
      const nuevo = enDias(30);

      const emitida = await emitir(proceso.id, 'CRONOGRAMA', nuevo);
      await publicar(proceso.id, emitida.adendas[0].id);

      expect(await observacionesDe(proceso.id)).toBe(nuevo);
    });
  });

  // ------------------------------------------------- aplicabilidad general --

  it('la contratación directa no admite adendas', async () => {
    const proceso = await crear('CONTRATACION_DIRECTA');
    const estado = await adendas.estado(proceso.id);

    expect(estado.aplica).toBe(false);
    expect(estado.puedeEmitir).toBe(false);
  });
});
