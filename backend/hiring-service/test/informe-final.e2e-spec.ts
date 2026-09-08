import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { PagosService } from '../src/modules/pagos/pagos.service';
import { InformeFinalService } from '../src/modules/informe-final/informe-final.service';
import { ActaInicioService } from '../src/modules/acta-inicio/acta-inicio.service';
import { ContratosService } from '../src/modules/contratos/contratos.service';
import { LegalizacionService } from '../src/modules/legalizacion/legalizacion.service';
import { SupervisionService } from '../src/modules/supervision/supervision.service';
import { InformeDefinitivoService } from '../src/modules/adjudicacion/informe-definitivo.service';
import { ActoAdjudicacionService } from '../src/modules/adjudicacion/acto-adjudicacion.service';
import { TrasladoService } from '../src/modules/traslado/traslado.service';
import { SubsanacionesService } from '../src/modules/traslado/subsanaciones.service';
import { EvaluacionService } from '../src/modules/evaluacion/evaluacion.service';
import { ComiteService } from '../src/modules/comite/comite.service';
import { OfertasService } from '../src/modules/ofertas/ofertas.service';
import { AperturaService } from '../src/modules/apertura/apertura.service';
import { CdpService } from '../src/modules/cdp/cdp.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * HU EFDS-1171 · Elaborar el informe final de ejecución (actividad 10.1).
 *
 * Va sobre un contrato en ejecución y con pagos tramitados, así que el camino
 * arrastra las etapas 8 y 9 completas. Lo que aquí importa y no se ve en una
 * unitaria es el **congelado del balance**: que lo que el informe declaró no
 * cambie porque después entre un pago.
 */
describe('HU EFDS-1171 · informe final de ejecución (10.1)', () => {
  let app: INestApplication;
  let pagos: PagosService;
  let informeFinal: InformeFinalService;
  let actaInicio: ActaInicioService;
  let contratos: ContratosService;
  let legalizacion: LegalizacionService;
  let supervision: SupervisionService;
  let definitivo: InformeDefinitivoService;
  let acto: ActoAdjudicacionService;
  let traslado: TrasladoService;
  let escritos: SubsanacionesService;
  let evaluacion: EvaluacionService;
  let comite: ComiteService;
  let ofertas: OfertasService;
  let apertura: AperturaService;
  let cdp: CdpService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  /** Objeto propio de esta suite: las demás corren en paralelo (EFDS-1443). */
  const OBJETO = 'Informe final para pruebas';

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
  const ordenador: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000003',
    userName: 'prueba.ordenador',
    roles: ['ORDENADOR_GASTO'],
    puedeEditar: false,
  };
  const revisor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000005',
    userName: 'prueba.revisor',
    roles: ['REVISOR_CONTRATACION'],
    puedeEditar: false,
  };
  /** El supervisor de otro contrato: tiene el rol y no debe poder avalar aquí. */
  const otroSupervisor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000008',
    userName: 'prueba.otro.supervisor',
    roles: ['SUPERVISOR_CONTRATO'],
    puedeEditar: false,
  };

  /** El supervisor designado; su cuenta se resuelve en beforeAll. */
  let supervisor: HiringAccess;
  let juridica: { acceso: HiringAccess; personaId: string };

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const haceHoras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const enDias = (d: number) => {
    const f = new Date();
    f.setUTCDate(f.getUTCDate() + d);
    return f.toISOString().slice(0, 10);
  };
  const haceDias = (d: number) => enDias(-d);

  const archivo = (nombre: string, mime = 'application/pdf') => ({
    filename: `${Date.now()}-${nombre}`,
    originalname: nombre,
    mimetype: mime,
    size: 2048,
    path: `/tmp/${nombre}`,
  });

  const VALOR_CONTRATO = 80_000_000;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    await app.init();

    pagos = app.get(PagosService);
    informeFinal = app.get(InformeFinalService);
    actaInicio = app.get(ActaInicioService);
    contratos = app.get(ContratosService);
    legalizacion = app.get(LegalizacionService);
    supervision = app.get(SupervisionService);
    definitivo = app.get(InformeDefinitivoService);
    acto = app.get(ActoAdjudicacionService);
    traslado = app.get(TrasladoService);
    escritos = app.get(SubsanacionesService);
    evaluacion = app.get(EvaluacionService);
    comite = app.get(ComiteService);
    ofertas = app.get(OfertasService);
    apertura = app.get(AperturaService);
    cdp = app.get(CdpService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);

    const [cuenta] = await dataSource.query(
      `SELECT id_user, id_person FROM auth."user" WHERE id_person IS NOT NULL ORDER BY id_user LIMIT 1`,
    );
    juridica = {
      personaId: cuenta.id_person,
      acceso: {
        userId: cuenta.id_user,
        userName: 'prueba.juridica',
        roles: ['EVALUADOR_JURIDICO'],
        puedeEditar: false,
      },
    };

    // El supervisor se designa con esta misma persona, así que su `userId` es
    // el que el servicio compara para autorizar el aval.
    supervisor = {
      userId: cuenta.id_person,
      userName: 'Supervisora del contrato',
      roles: ['SUPERVISOR_CONTRATO'],
      puedeEditar: false,
    };
  });

  afterAll(async () => {
    const deProceso = `proceso_id IN (SELECT id FROM hiring.procesos WHERE objeto = $1)`;
    const deContratos = `SELECT id FROM hiring.contratos WHERE ${deProceso}`;
    const borrar = (sql: string) => dataSource.query(sql, [OBJETO]);

    await borrar(
      `DELETE FROM hiring.entregables_informe WHERE informe_id IN (SELECT id FROM hiring.informes_finales WHERE contrato_id IN (${deContratos}))`,
    );
    await borrar(`DELETE FROM hiring.informes_finales WHERE contrato_id IN (${deContratos})`);
    await borrar(
      `DELETE FROM hiring.soportes_pago WHERE pago_id IN (SELECT id FROM hiring.pagos_contrato WHERE contrato_id IN (${deContratos}))`,
    );
    await borrar(`DELETE FROM hiring.pagos_contrato WHERE contrato_id IN (${deContratos})`);
    await borrar(`DELETE FROM hiring.actas_inicio WHERE contrato_id IN (${deContratos})`);
    await borrar(`DELETE FROM hiring.supervisiones_contrato WHERE contrato_id IN (${deContratos})`);
    await borrar(
      `DELETE FROM hiring.amparos WHERE garantia_id IN (SELECT id FROM hiring.garantias WHERE contrato_id IN (${deContratos}))`,
    );
    await borrar(`DELETE FROM hiring.garantias WHERE contrato_id IN (${deContratos})`);
    await borrar(`DELETE FROM hiring.afiliaciones_arl WHERE contrato_id IN (${deContratos})`);
    await borrar(`DELETE FROM hiring.firmas_contrato WHERE contrato_id IN (${deContratos})`);
    await borrar(`DELETE FROM hiring.contratos WHERE ${deProceso}`);

    await borrar(`DELETE FROM hiring.actos_adjudicacion WHERE ${deProceso}`);
    await borrar(`DELETE FROM hiring.informes_definitivos WHERE ${deProceso}`);
    await borrar(
      `DELETE FROM hiring.subsanaciones WHERE informe_id IN (SELECT id FROM hiring.informes_evaluacion WHERE ${deProceso})`,
    );
    await borrar(`DELETE FROM hiring.informes_evaluacion WHERE ${deProceso}`);
    await borrar(
      `DELETE FROM hiring.evidencias_evaluacion WHERE resultado_id IN (SELECT id FROM hiring.resultados_evaluacion WHERE ${deProceso})`,
    );
    await borrar(`DELETE FROM hiring.resultados_evaluacion WHERE ${deProceso}`);
    await borrar(
      `DELETE FROM hiring.miembros_comite WHERE comite_id IN (SELECT id FROM hiring.comites_evaluadores WHERE ${deProceso})`,
    );
    await borrar(`DELETE FROM hiring.comites_evaluadores WHERE ${deProceso}`);
    await borrar(
      `DELETE FROM hiring.oferentes WHERE recepcion_id IN (SELECT id FROM hiring.recepciones_ofertas WHERE ${deProceso})`,
    );
    await borrar(`DELETE FROM hiring.recepciones_ofertas WHERE ${deProceso}`);
    await borrar(`DELETE FROM hiring.cdp WHERE ${deProceso}`);
    await borrar(`DELETE FROM hiring.procesos WHERE objeto = $1`);

    await app?.close();
  });

  /**
   * Consecutivo propio de la corrida: contrato y póliza son únicos en la base.
   *
   * El token va además del contador porque el contador vuelve a empezar en cada
   * corrida y la base no: basta un proceso que quedara de una corrida anterior
   * —o de una siembra para revisar la pantalla— para que el primer contrato
   * choque contra un número que ya existe.
   */
  const CORRIDA = Math.random().toString(36).slice(2, 7);
  let vuelta = 0;

  /** Todo el camino hasta dejar el contrato legalizado y con supervisor. */
  const hastaContratoLegalizado = async () => {
    const n = ++vuelta;
    const documento = `9005555${String(n).padStart(2, '0')}-5`;

    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: VALOR_CONTRATO },
      gestor,
    );

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: VALOR_CONTRATO }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: `CDP-2026-171-${n}`, valor: VALOR_CONTRATO, fechaExpedicion: hoy() },
      financiero,
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-171-${n}`, resolucionFecha: hoy() },
      archivo('resolucion.pdf'),
      'a'.repeat(64),
      archivo('pliego.pdf'),
      'b'.repeat(64),
      archivo('captura.png', 'image/png'),
      'e'.repeat(64),
      gestor,
    );

    await ofertas.fijarPlazo(proceso.id, { vencimiento: haceHoras(3) }, gestor);
    await ofertas.registrar(
      proceso.id,
      {
        nombre: 'Servicios Integrales SAS',
        identificacion: documento,
        fechaRadicacion: haceHoras(4),
        valorOfertado: VALOR_CONTRATO,
      },
      archivo('oferta.pdf'),
      'o'.repeat(64),
      gestor,
    );
    const cierre = await ofertas.cerrar(proceso.id, gestor);

    await comite.designar(
      proceso.id,
      {
        fechaDesignacion: hoy(),
        miembros: [
          { personaId: juridica.personaId, nombre: 'Evaluadora jurídica', rol: 'JURIDICO' },
        ],
      },
      archivo('memorando.pdf'),
      'm'.repeat(64),
      ordenador,
    );

    await evaluacion.registrar(
      proceso.id,
      {
        oferenteId: cierre.oferentes[0].id,
        puntajeObtenido: 95,
        puntajeMaximo: 100,
        justificacion: 'Cumplió los requisitos habilitantes y obtuvo el mayor puntaje del comité.',
      },
      archivo('informe-comite.pdf'),
      'i'.repeat(64),
      juridica.acceso,
    );

    await traslado.generar(proceso.id, {}, archivo('preliminar.pdf'), 'p'.repeat(64), gestor);
    await traslado.trasladar(
      proceso.id,
      { medioPublicacion: 'Publicado en SECOP II y notificado por correo a los oferentes' },
      archivo('evidencia.png', 'image/png'),
      'v'.repeat(64),
      gestor,
    );
    // El término va en días hábiles: se vence a mano, como en las demás suites.
    await dataSource.query(
      `UPDATE hiring.informes_evaluacion SET vence_el = $2 WHERE proceso_id = $1 AND estado = 'TRASLADADO'`,
      [proceso.id, haceDias(1)],
    );
    await escritos.cerrar(proceso.id, {}, gestor);

    await definitivo.generar(proceso.id, archivo('definitivo.pdf'), 'd'.repeat(64), gestor);
    await definitivo.publicar(
      proceso.id,
      { medioPublicacion: 'Publicado en SECOP II para conocimiento de los oferentes' },
      archivo('pub-definitivo.png', 'image/png'),
      'w'.repeat(64),
      gestor,
    );

    await acto.adjudicar(
      proceso.id,
      {
        oferenteId: cierre.oferentes[0].id,
        numeroActo: `RES-ADJ-2026-171-${n}`,
        fechaActo: hoy(),
        valorAdjudicado: VALOR_CONTRATO,
      },
      archivo('acto.pdf'),
      'j'.repeat(64),
      ordenador,
    );

    await contratos.generar(
      proceso.id,
      {
        tipologia: 'CONSULTORIA',
        numero: `CTO-2026-171-${CORRIDA}-${n}`,
        objeto: 'Servicios profesionales de apoyo a la gestión',
        valor: VALOR_CONTRATO,
        plazoDias: 180,
        contratistaDocumento: documento,
        contratistaNombre: 'Servicios Integrales SAS',
        contratistaTipo: 'JURIDICA',
      },
      archivo('minuta.pdf'),
      'n'.repeat(64),
      gestor,
    );
    await contratos.aceptar(proceso.id, { aceptadoPor: 'Representante legal' }, gestor);
    await contratos.firmar(
      proceso.id,
      { parte: 'ORDENADOR', firmanteNombre: 'Ordenadora del gasto', fechaFirma: hoy() },
      archivo('firma-entidad.pdf'),
      'f'.repeat(64),
      ordenador,
    );
    await contratos.firmar(
      proceso.id,
      { parte: 'CONTRATISTA', firmanteNombre: 'Representante legal', fechaFirma: hoy() },
      archivo('firma-contratista.pdf'),
      'g'.repeat(64),
      gestor,
    );

    const garantia = await legalizacion.cargarGarantia(
      proceso.id,
      {
        aseguradora: 'Seguros del Estado',
        numeroPoliza: `POL-171-${CORRIDA}-${n}`,
        amparos: [
          {
            tipo: 'CUMPLIMIENTO',
            valorAsegurado: 16_000_000,
            vigenciaDesde: hoy(),
            vigenciaHasta: enDias(365),
          },
        ],
      },
      archivo('poliza.pdf'),
      'q'.repeat(64),
      gestor,
    );
    const pendiente = garantia.garantias.find((g: any) => g.estado !== 'APROBADA');
    await legalizacion.aprobarGarantia(proceso.id, pendiente.id, revisor);

    await supervision.designar(
      proceso.id,
      {
        personaId: juridica.personaId,
        nombre: supervisor.userName,
        cargo: 'Profesional especializada',
        fechaDesignacion: hoy(),
      },
      archivo('acto-supervision.pdf'),
      'z'.repeat(64),
      ordenador,
    );

    return proceso;
  };

  /** El contrato ya corriendo, que es la condición de entrada de la 9.4. */
  const contratoEnEjecucion = async (fechaInicio = haceDias(30)) => {
    const proceso = await hastaContratoLegalizado();

    await actaInicio.suscribir(
      proceso.id,
      { fechaReunion: haceDias(30), fechaInicio } as any,
      archivo('acta-inicio.pdf'),
      'k'.repeat(64),
      supervisor,
    );

    return proceso;
  };
  /** Una cuenta de cobro tramitada, que es lo que el balance suma. */
  const pagar = async (procesoId: string, valor: number) => {
    const radicado = await pagos.radicar(
      procesoId,
      {
        periodoDesde: haceDias(30),
        periodoHasta: haceDias(1),
        valor,
      } as any,
      archivo('factura.pdf'),
      'x'.repeat(64),
      archivo('informe-actividades.pdf'),
      'y'.repeat(64),
      gestor,
    );

    const pagoId = radicado.pagos[0].id;
    await pagos.avalar(procesoId, pagoId, {}, supervisor);
    await pagos.tramitar(
      procesoId,
      pagoId,
      { referenciaPago: `OP-2026-${Math.floor(Math.random() * 100000)}` },
      financiero,
    );
    return pagoId;
  };

  /** Una cuenta radicada y sin tramitar, para el aviso. */
  const dejarPendiente = async (procesoId: string, valor: number) => {
    await pagos.radicar(
      procesoId,
      { periodoDesde: haceDias(20), periodoHasta: haceDias(1), valor } as any,
      archivo('factura-pendiente.pdf'),
      'r'.repeat(64),
      archivo('informe-pendiente.pdf'),
      's'.repeat(64),
      gestor,
    );
  };

  const CONCLUSION =
    'El contrato se ejecutó conforme al alcance pactado y los entregables se recibieron a satisfacción.';

  const elaborar = (procesoId: string, datos: Record<string, unknown> = {}) =>
    informeFinal.elaborar(
      procesoId,
      { fechaElaboracion: hoy(), conclusion: CONCLUSION, ...datos } as any,
      archivo('informe-final.pdf'),
      'w'.repeat(64),
      supervisor,
    );

  // ------------------------------------------------------------- criterio --

  describe('Criterio 1 · el informe queda con su consolidado de entregables', () => {
    it('elabora el informe y lo deja en el expediente', async () => {
      const proceso = await contratoEnEjecucion();
      await pagar(proceso.id, 30_000_000);

      const estado = await elaborar(proceso.id);

      expect(estado.informe).not.toBeNull();
      expect((estado.informe as any).conclusion).toBe(CONCLUSION);
      expect((estado.informe as any).balance.valorPagado).toBe(30_000_000);
      expect((estado.informe as any).balance.saldo).toBe(VALOR_CONTRATO - 30_000_000);
      expect((estado.informe as any).balance.cuentasTramitadas).toBe(1);
      expect(estado.puedeElaborar).toBe(false);
    });

    it('consolida los entregables, entregados y no entregados', async () => {
      const proceso = await contratoEnEjecucion();
      await pagar(proceso.id, 20_000_000);
      await elaborar(proceso.id);

      await informeFinal.agregarEntregable(
        proceso.id,
        { descripcion: 'Informe técnico del primer trimestre', fechaEntrega: haceDias(20) },
        archivo('entregable-1.pdf'),
        'a'.repeat(64),
        supervisor,
      );
      // Sin fecha: es lo que se pactó y no se cumplió, y el informe final
      // también sirve para decirlo.
      const estado = await informeFinal.agregarEntregable(
        proceso.id,
        {
          descripcion: 'Manual de operación',
          observacion: 'No se recibió dentro del plazo del contrato',
        },
        null,
        null,
        supervisor,
      );

      const entregables = (estado.informe as any).entregables;
      expect(entregables).toHaveLength(2);
      expect(entregables[0].fechaEntrega).toBe(haceDias(20));
      expect(entregables[0].documento).not.toBeNull();
      expect(entregables[1].fechaEntrega).toBeNull();
      // El soporte es opcional: muchos entregables ya están en el expediente.
      expect(entregables[1].documento).toBeNull();
    });

    it('no consolida entregables sin informe elaborado', async () => {
      const proceso = await contratoEnEjecucion();

      await expect(
        informeFinal.agregarEntregable(
          proceso.id,
          { descripcion: 'Suelto' },
          null,
          null,
          supervisor,
        ),
      ).rejects.toThrow(/no tiene informe final vigente/i);
    });
  });

  describe('Criterio 2 · el balance queda congelado', () => {
    it('un pago posterior no reescribe lo que el informe declaró', async () => {
      const proceso = await contratoEnEjecucion();
      await pagar(proceso.id, 30_000_000);
      await elaborar(proceso.id);

      // Entra un pago rezagado después de firmar.
      await pagar(proceso.id, 10_000_000);
      const estado = await informeFinal.estado(proceso.id, supervisor);

      // El informe sigue diciendo lo que era cierto el día en que se firmó...
      expect((estado.informe as any).balance.valorPagado).toBe(30_000_000);
      // ...y el balance de hoy es otro, que es lo que la pantalla contrasta.
      expect(estado.balanceActual!.valorPagado).toBe(40_000_000);
    });

    it('cuenta lo tramitado y no lo cobrado', async () => {
      const proceso = await contratoEnEjecucion();
      await pagar(proceso.id, 25_000_000);
      await dejarPendiente(proceso.id, 15_000_000);

      const estado = await elaborar(proceso.id);

      // La radicada sin tramitar no es plata que salió.
      expect((estado.informe as any).balance.valorPagado).toBe(25_000_000);
      expect((estado.informe as any).balance.cuentasPendientes).toBe(1);
    });

    it('avisa de las cuentas sin tramitar sin bloquear el informe', async () => {
      const proceso = await contratoEnEjecucion();
      await dejarPendiente(proceso.id, 15_000_000);

      const antes = await informeFinal.estado(proceso.id, supervisor);
      expect(antes.advertencia).toMatch(/sin tramitar/i);

      // Y aun así se puede elaborar: cerrar con un cobro en disputa es decisión
      // de la entidad, no del sistema.
      const estado = await elaborar(proceso.id);
      expect(estado.informe).not.toBeNull();
    });
  });

  describe('Criterio 3 · lo firma quien vigiló', () => {
    it('el supervisor de otro contrato no puede elaborarlo', async () => {
      const proceso = await contratoEnEjecucion();
      await pagar(proceso.id, 10_000_000);

      await expect(
        informeFinal.elaborar(
          proceso.id,
          { fechaElaboracion: hoy(), conclusion: CONCLUSION } as any,
          archivo('informe-final.pdf'),
          'w'.repeat(64),
          otroSupervisor,
        ),
      ).rejects.toThrow(/no eres el supervisor de este contrato/i);
    });

    it('no hay informe final sobre un contrato que no arrancó', async () => {
      const proceso = await hastaContratoLegalizado();

      await expect(elaborar(proceso.id)).rejects.toThrow(/acta de inicio/i);
    });

    it('no deja dos informes vigentes', async () => {
      const proceso = await contratoEnEjecucion();
      await pagar(proceso.id, 10_000_000);
      await elaborar(proceso.id);

      await expect(elaborar(proceso.id)).rejects.toThrow(/ya tiene informe final/i);
    });
  });

  describe('Criterio 4 · anular deja rehacerlo y conserva el anterior', () => {
    it('el anulado queda con su balance y se puede elaborar otro', async () => {
      const proceso = await contratoEnEjecucion();
      await pagar(proceso.id, 30_000_000);
      await elaborar(proceso.id);

      const anulado = await informeFinal.anular(
        proceso.id,
        { motivo: 'Entró un pago rezagado y el balance quedó incompleto' },
        supervisor,
      );

      expect(anulado.informe).toBeNull();
      expect(anulado.historial).toHaveLength(1);
      // El balance viejo se conserva: explica que ahora haya otro distinto.
      expect((anulado.historial[0] as any).balance.valorPagado).toBe(30_000_000);

      await pagar(proceso.id, 10_000_000);
      const nuevo = await elaborar(proceso.id);
      expect((nuevo.informe as any).balance.valorPagado).toBe(40_000_000);
      expect(nuevo.historial).toHaveLength(1);
    });
  });

  describe('El riel y el expediente', () => {
    it('marca la 10.1 cumplida y la devuelve en curso al anular', async () => {
      const proceso = await contratoEnEjecucion();
      await pagar(proceso.id, 10_000_000);
      await elaborar(proceso.id);

      const estadoDe = async () => {
        const [fila] = await dataSource.query(
          `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '10.1'`,
          [proceso.id],
        );
        return fila?.estado;
      };

      expect(await estadoDe()).toBe('APROBADO');

      await informeFinal.anular(
        proceso.id,
        { motivo: 'Hay que rehacerlo con el consolidado completo' },
        supervisor,
      );
      expect(await estadoDe()).toBe('BORRADOR');
    });

    it('deja traza del cierre de la ejecución', async () => {
      const proceso = await contratoEnEjecucion();
      await pagar(proceso.id, 10_000_000);
      await elaborar(proceso.id);

      const [traza] = await dataSource.query(
        `SELECT accion, detalle FROM hiring.trazabilidad
          WHERE proceso_id = $1 AND entidad = 'informe_final' ORDER BY id DESC LIMIT 1`,
        [proceso.id],
      );

      expect(traza.accion).toBe('CERRAR');
      expect(traza.detalle.actividad).toBe('10.1');
      expect(Number(traza.detalle.valorPagado)).toBe(10_000_000);
    });
  });

  // --------------------------------------------------- llegada al riel --

  describe('La etapa 10 llega al riel del proceso', () => {
    it('lista la 10.1 junto a las actividades de las etapas anteriores', async () => {
      const proceso = await procesos.crearProceso(
        { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: VALOR_CONTRATO },
        gestor,
      );

      // La misma prueba que tienen las etapas 6, 7 y 9 en sus suites. Aquí la
      // etapa entró al riel en la misma subtarea que la expuso, no después.
      const actividades = await cdp.actividadesDelProceso(proceso.id);
      const numerales = actividades.map((a) => a.numeral);

      expect(numerales).toContain('10.1');
      expect(numerales).toContain('9.1');
      expect(numerales).toContain('8.1');
      expect(numerales).toContain('7.4');
      expect(numerales).toContain('3.1');
    });
  });
});
