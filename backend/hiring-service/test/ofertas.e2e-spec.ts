import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { OfertasService } from '../src/modules/ofertas/ofertas.service';
import { AperturaService } from '../src/modules/apertura/apertura.service';
import { CdpService } from '../src/modules/cdp/cdp.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * HU EFDS-1155 · Recepción de ofertas (actividad 6.1).
 *
 * Lo que hay que comprobar contra la base es la relación entre el plazo y lo
 * que se registra: el vencimiento se fija al abrir el proceso, y de él depende
 * si una oferta entra a la lista o queda fuera de término. Eso no se ve en una
 * prueba unitaria del servicio, porque el plazo sale del parámetro de la
 * modalidad y del calendario de días hábiles.
 */
describe('HU EFDS-1155 · recepción de ofertas (actividad 6.1)', () => {
  let app: INestApplication;
  let ofertas: OfertasService;
  let apertura: AperturaService;
  let cdp: CdpService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'Recepción de ofertas para pruebas';

  const gestor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000001',
    userName: 'prueba.gestor',
    roles: ['GESTOR_CONTRATACION'],
    puedeEditar: true,
  };

  const financiero: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000002',
    userName: 'prueba.financiero',
    roles: ['ESTRUCTURADOR_FINANCIERO'],
    puedeEditar: false,
  };

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });

  const archivo = (nombre: string, mimetype = 'application/pdf') => ({
    filename: `${nombre}-en-disco`,
    originalname: nombre,
    mimetype,
    size: 1024,
  });

  /** Hace horas, en ISO con zona: sirve como radicación ya ocurrida. */
  const haceHoras = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();

  /**
   * Mínima cuantía por defecto: tiene plazo de ofertas parametrizado (1 día
   * hábil) y no exige audiencia de riesgos, así que la prueba mide la recepción
   * y no acaba comprobando de refilón el requisito de otra historia.
   */
  const crear = (modalidad = 'MINIMA_CUANTIA') =>
    procesos.crearProceso({ objeto: OBJETO, modalidad, valorEstimado: 1_000_000 }, gestor);

  /** Lleva el proceso hasta abierto, que es cuando arranca el plazo de ofertas. */
  const abrir = async (procesoId: string) => {
    await cdp.solicitar(procesoId, { rubro: 'A-02-02', valor: 1_000_000 }, gestor);
    await cdp.verificar(procesoId, financiero);
    await cdp.expedir(
      procesoId,
      { numero: 'CDP-2026-155', valor: 1_000_000, fechaExpedicion: hoy() },
      financiero,
    );

    return apertura.registrar(
      procesoId,
      { resolucionNumero: 'RES-2026-155', resolucionFecha: hoy() },
      archivo('resolucion.pdf'),
      'a'.repeat(64),
      archivo('pliego-definitivo.pdf'),
      'b'.repeat(64),
      archivo('captura-secop.png', 'image/png'),
      'e'.repeat(64),
      gestor,
    );
  };

  const registrar = (
    procesoId: string,
    identificacion: string,
    nombre = 'Constructora de prueba SAS',
    fechaRadicacion = haceHoras(1),
  ) =>
    ofertas.registrar(
      procesoId,
      { nombre, identificacion, fechaRadicacion },
      archivo('oferta.pdf'),
      'o'.repeat(64),
      gestor,
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    ofertas = app.get(OfertasService);
    apertura = app.get(AperturaService);
    cdp = app.get(CdpService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // De la hoja a la raíz: los oferentes referencian documentos del expediente
    // y el borrado en cascada del proceso no garantiza el orden entre unos y
    // otros.
    const deProceso = `proceso_id IN (SELECT id FROM hiring.procesos WHERE objeto = $1)`;
    await dataSource.query(
      `DELETE FROM hiring.oferentes WHERE recepcion_id IN (SELECT id FROM hiring.recepciones_ofertas WHERE ${deProceso})`,
      [OBJETO],
    );
    await dataSource.query(`DELETE FROM hiring.recepciones_ofertas WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.cdp WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------- el plazo --

  describe('El plazo se fija al abrir el proceso', () => {
    it('deja la recepción abierta con el vencimiento calculado desde la resolución', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      const estado = await ofertas.estado(proceso.id);

      expect(estado.aplica).toBe(true);
      expect(estado.abierto).toBe(true);
      expect(estado.recepcion).not.toBeNull();
      expect(estado.recepcion!.estado).toBe('ABIERTA');
      // Mínima cuantía: un día hábil después de la resolución, no el mismo día.
      expect(estado.recepcion!.plazoDiasHabiles).toBe(1);
      expect(estado.recepcion!.vencimientoDia > hoy()).toBe(true);
      expect(estado.puedeRegistrar).toBe(true);
    });

    it('advierte que el plazo de la modalidad todavía no está confirmado', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      const estado = await ofertas.estado(proceso.id);

      // Los plazos entraron como supuesto del equipo: la pantalla tiene que
      // poder decirlo en vez de presentarlos como término legal.
      expect(estado.plazoParametrizado).toBe(true);
      expect(estado.plazoConfirmado).toBe(false);
    });

    it('permite corregir el vencimiento a la hora que fija el cronograma', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      const alasDiez = `${hoy()}T10:00:00-05:00`;
      const estado = await ofertas.fijarPlazo(proceso.id, { vencimiento: alasDiez }, gestor);

      expect(new Date(estado.recepcion!.vencimiento).toISOString()).toBe(
        new Date(alasDiez).toISOString(),
      );
      // Deja de derivarse del parámetro: a partir de aquí manda la fecha fijada.
      expect(estado.recepcion!.plazoDiasHabiles).toBeNull();
    });

    it('no deja fijar el plazo antes de que el proceso se abra', async () => {
      const proceso = await crear();

      await expect(
        ofertas.fijarPlazo(proceso.id, { vencimiento: `${hoy()}T10:00:00-05:00` }, gestor),
      ).rejects.toThrow(/no se ha abierto/i);
    });
  });

  // -------------------------------------------------------- los oferentes --

  describe('Registro de las ofertas recibidas', () => {
    it('numera las ofertas por orden de llegada y guarda su soporte', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      await registrar(proceso.id, '900123456-1', 'Primera Oferente SAS');
      const estado = await registrar(proceso.id, '900654321-2', 'Segunda Oferente SAS');

      expect(estado.oferentes).toHaveLength(2);
      expect(estado.oferentes.map((o) => o.numero)).toEqual([1, 2]);
      expect(estado.oferentes[0].nombre).toBe('Primera Oferente SAS');
      expect(estado.oferentes[0].soporte).not.toBeNull();
    });

    it('rechaza la oferta radicada después del vencimiento', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      // El plazo se corrige a hace tres horas: ya venció, pero la radicación
      // que se intenta sigue siendo un hecho pasado y no una fecha futura.
      await ofertas.fijarPlazo(proceso.id, { vencimiento: haceHoras(3) }, gestor);

      await expect(registrar(proceso.id, '900999999-9', 'Tardía SAS', haceHoras(1))).rejects.toThrow(
        /fuera de plazo/i,
      );
    });

    it('rechaza la radicación futura', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      const dentroDeUnaHora = new Date(Date.now() + 3_600_000).toISOString();

      await expect(
        registrar(proceso.id, '900111111-1', 'Adelantada SAS', dentroDeUnaHora),
      ).rejects.toThrow(/futura/i);
    });

    it('no admite dos veces al mismo oferente', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      await registrar(proceso.id, '900222222-2');

      await expect(registrar(proceso.id, '900222222-2')).rejects.toThrow(/ya está registrado/i);
    });

    it('permite retirar una oferta registrada por error y volver a numerar desde ahí', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      const conUna = await registrar(proceso.id, '900333333-3');
      const retirada = await ofertas.retirar(proceso.id, conUna.oferentes[0].id, gestor);
      expect(retirada.oferentes).toHaveLength(0);

      // El consecutivo se reutiliza: hasta el cierre la lista es provisional y
      // ese número no se ha citado en ningún acta. Después del cierre no se
      // retira nada, así que los números publicados ya no se mueven.
      const conOtra = await registrar(proceso.id, '900444444-4');
      expect(conOtra.oferentes[0].numero).toBe(1);
    });
  });

  // -------------------------------------------------------- criterio 1 y 2 --

  describe('Cierre de la recepción y publicación de la lista', () => {
    /** Deja el proceso abierto y con el plazo ya vencido, listo para cerrar. */
    const abrirYVencer = async () => {
      const proceso = await crear();
      await abrir(proceso.id);
      await ofertas.fijarPlazo(proceso.id, { vencimiento: haceHoras(3) }, gestor);
      return proceso;
    };

    it('vencido el plazo, el cierre publica la lista de oferentes', async () => {
      const proceso = await abrirYVencer();
      await registrar(proceso.id, '900555555-5', 'Oferente En Plazo SAS', haceHoras(4));

      const estado = await ofertas.cerrar(proceso.id, gestor);

      expect(estado.recepcion!.estado).toBe('CERRADA');
      expect(estado.recepcion!.cerradaAt).not.toBeNull();
      expect(estado.recepcion!.cerradaPor).toBe('prueba.gestor');
      expect(estado.listaPublicada).toBe(true);
      expect(estado.oferentes).toHaveLength(1);
    });

    it('da la actividad 6.1 por cumplida al cerrar', async () => {
      const proceso = await abrirYVencer();
      await ofertas.cerrar(proceso.id, gestor);

      const [fila] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '6.1'`,
        [proceso.id],
      );

      expect(fila.estado).toBe('APROBADO');
    });

    it('rechaza el cierre mientras el plazo siga vigente', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      // Recién abierto, el plazo de mínima cuantía todavía corre.
      await expect(ofertas.cerrar(proceso.id, gestor)).rejects.toThrow(/sigue vigente/i);

      const estado = await ofertas.estado(proceso.id);
      expect(estado.puedeCerrar).toBe(false);
      expect(estado.recepcion!.estado).toBe('ABIERTA');
    });

    it('cerrar dos veces no altera la lista ni la fecha del cierre', async () => {
      const proceso = await abrirYVencer();
      await registrar(proceso.id, '900666666-6', 'Única SAS', haceHoras(4));

      const primero = await ofertas.cerrar(proceso.id, gestor);
      const segundo = await ofertas.cerrar(proceso.id, gestor);

      expect(segundo.recepcion!.cerradaAt).toEqual(primero.recepcion!.cerradaAt);
      expect(segundo.oferentes).toHaveLength(1);
    });

    it('cierra también una recepción sin ofertas', async () => {
      const proceso = await abrirYVencer();

      const estado = await ofertas.cerrar(proceso.id, gestor);

      // Que no llegara ninguna oferta es el hecho que hay que registrar;
      // declarar desierto el proceso es otra historia.
      expect(estado.listaPublicada).toBe(true);
      expect(estado.oferentes).toHaveLength(0);
    });

    it('con la lista publicada no admite nuevas ofertas ni retiros', async () => {
      const proceso = await abrirYVencer();
      const conUna = await registrar(proceso.id, '900777777-7', 'Primera SAS', haceHoras(4));
      const oferenteId = conUna.oferentes[0].id;

      await ofertas.cerrar(proceso.id, gestor);

      await expect(
        registrar(proceso.id, '900888888-8', 'Tardía SAS', haceHoras(4)),
      ).rejects.toThrow(/ya se cerró/i);
      await expect(ofertas.retirar(proceso.id, oferenteId, gestor)).rejects.toThrow(/ya se cerró/i);
    });

    it('no deja mover el plazo de una recepción cerrada', async () => {
      const proceso = await abrirYVencer();
      await ofertas.cerrar(proceso.id, gestor);

      await expect(
        ofertas.fijarPlazo(proceso.id, { vencimiento: `${hoy()}T23:00:00-05:00` }, gestor),
      ).rejects.toThrow(/ya se cerró/i);
    });
  });

  // ------------------------------------------------------- aplicabilidad --

  describe('Modalidades sin recepción de ofertas', () => {
    it('no aplica en contratación directa', async () => {
      const proceso = await crear('CONTRATACION_DIRECTA');

      const estado = await ofertas.estado(proceso.id);

      expect(estado.aplica).toBe(false);
      expect(estado.motivoNoAplica).toMatch(/sin convocatoria/i);
      expect(estado.puedeRegistrar).toBe(false);
    });
  });
});
