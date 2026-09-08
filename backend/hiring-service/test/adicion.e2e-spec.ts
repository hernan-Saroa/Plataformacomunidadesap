import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { PagosService } from '../src/modules/pagos/pagos.service';
import { InformeFinalService } from '../src/modules/informe-final/informe-final.service';
import { LiquidacionService } from '../src/modules/liquidacion/liquidacion.service';
import { CierreFinancieroService } from '../src/modules/cierre-financiero/cierre-financiero.service';
import { ModificacionesService } from '../src/modules/modificaciones/modificaciones.service';
import { RegistroPresupuestalService } from '../src/modules/registro-presupuestal/registro-presupuestal.service';
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
 * HU EFDS-1176 · Adición en dinero del contrato (actividad 9.5).
 *
 * El camino arrastra las etapas 8 y 9 hasta dejar el contrato en ejecución con
 * su RP expedido, que es donde una adición tiene sentido.
 *
 * Lo que aquí importa y no se ve en una unitaria son **dos cosas**: que el
 * trámite exija de verdad el CDP y el RP —los dos criterios de la historia— y
 * que abrir la puerta a un segundo CDP y a un segundo RP no le cambie el
 * respaldo a las historias que ya existían.
 */
describe('HU EFDS-1176 · adición en dinero del contrato (9.5)', () => {
  let app: INestApplication;
  let pagos: PagosService;
  let informeFinal: InformeFinalService;
  let liquidacion: LiquidacionService;
  let cierre: CierreFinancieroService;
  let modificaciones: ModificacionesService;
  let rp: RegistroPresupuestalService;
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
  const OBJETO = 'Adicion en dinero para pruebas';

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
    liquidacion = app.get(LiquidacionService);
    cierre = app.get(CierreFinancieroService);
    modificaciones = app.get(ModificacionesService);
    rp = app.get(RegistroPresupuestalService);
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
      `DELETE FROM hiring.publicaciones_modificacion WHERE modificacion_id IN (SELECT id FROM hiring.modificaciones_contrato WHERE contrato_id IN (${deContratos}))`,
    );
    // El CDP y el RP de una adición se borran, no se desasignan: dejarlos con
    // `modificacion_id` nulo los convertiría en un segundo CDP del proceso y
    // chocarían contra su índice único, que es justo lo que ese índice protege.
    // Primero se suelta la llave que la modificación tiene sobre ellos.
    await borrar(
      `UPDATE hiring.modificaciones_contrato SET cdp_id = NULL, rp_id = NULL WHERE contrato_id IN (${deContratos})`,
    );
    await borrar(
      `DELETE FROM hiring.cdp WHERE modificacion_id IN (SELECT id FROM hiring.modificaciones_contrato WHERE contrato_id IN (${deContratos}))`,
    );
    await borrar(
      `DELETE FROM hiring.registros_presupuestales WHERE modificacion_id IN (SELECT id FROM hiring.modificaciones_contrato WHERE contrato_id IN (${deContratos}))`,
    );
    await borrar(`DELETE FROM hiring.modificaciones_contrato WHERE contrato_id IN (${deContratos})`);
    await borrar(`DELETE FROM hiring.cierres_financieros WHERE contrato_id IN (${deContratos})`);
    await borrar(`DELETE FROM hiring.registros_presupuestales WHERE contrato_id IN (${deContratos})`);
    await borrar(`DELETE FROM hiring.actas_liquidacion WHERE contrato_id IN (${deContratos})`);
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
    const documento = `9007777${String(n).padStart(2, '0')}-7`;

    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: VALOR_CONTRATO },
      gestor,
    );

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: VALOR_CONTRATO }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: `CDP-2026-176-${n}`, valor: VALOR_CONTRATO, fechaExpedicion: hoy() },
      financiero,
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-176-${n}`, resolucionFecha: hoy() },
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
        numeroActo: `RES-ADJ-2026-176-${n}`,
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
        numero: `CTO-2026-176-${CORRIDA}-${n}`,
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
        numeroPoliza: `POL-176-${CORRIDA}-${n}`,
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

  /**
   * Un contrato con informe final, con la ejecución empezada hace los días que
   * se le pidan.
   *
   * El plazo del contrato es de 180 días, así que la terminación —y con ella la
   * ventana de liquidación— queda en `inicio + 180`. Mover ese único número es
   * lo que permite probar las dos ventanas sin esperar cuatro meses.
   */
  const conInformeFinal = async (diasDesdeInicio = 200) => {
    const proceso = await hastaContratoLegalizado();
    const inicio = haceDias(diasDesdeInicio);

    await actaInicio.suscribir(
      proceso.id,
      { fechaReunion: inicio, fechaInicio: inicio } as any,
      archivo('acta-inicio.pdf'),
      'k'.repeat(64),
      supervisor,
    );
    await informeFinal.elaborar(
      proceso.id,
      { fechaElaboracion: hoy(), conclusion: CONCLUSION } as any,
      archivo('informe-final.pdf'),
      'w'.repeat(64),
      supervisor,
    );

    return proceso;
  };

  const liquidar = (
    procesoId: string,
    datos: Record<string, unknown> = {},
    soporte: any = null,
  ) =>
    liquidacion.liquidar(
      procesoId,
      { tipo: 'BILATERAL', fechaActa: hoy(), ...datos } as any,
      archivo('acta-liquidacion.pdf'),
      'l'.repeat(64),
      soporte,
      soporte ? 'p'.repeat(64) : null,
      gestor,
    );
  const VALOR_RP = 70_000_000;

  /**
   * Un contrato liquidado y con RP expedido, que es la condición de entrada de
   * la 10.3.
   *
   * El RP se expide por menos que el contrato a propósito: es lo corriente
   * —se compromete lo de la vigencia— y así el saldo liberado no coincide por
   * casualidad con el saldo del contrato.
   */
  /**
   * El RP sobre un contrato ya suscrito, que es donde lo sitúa la etapa 8.
   *
   * Va antes del acta de inicio a propósito: `admiteRp` solo acepta un contrato
   * PERFECCIONADO o LEGALIZADO, así que una vez que arranca la ejecución ya no
   * se puede expedir. Es el orden real —el RP es 8.3 y el acta es 9.1— pero
   * conviene tenerlo presente.
   */
  const conRpExpedido = async (procesoId: string) => {
    await rp.solicitar(procesoId, { rubro: 'A-02-02', valor: VALOR_RP }, financiero);
    await rp.verificar(procesoId, financiero);
    await rp.expedir(
      procesoId,
      {
        numero: `RP-2026-176-${CORRIDA}-${++vuelta}`,
        valor: VALOR_RP,
        fechaExpedicion: haceDias(210),
      } as any,
      null,
      null,
      financiero,
    );
  };

  /** Un contrato liquidado y con RP expedido: la entrada de la 10.3. */
  const listoParaCerrar = async (pagado = 40_000_000) => {
    const proceso = await hastaContratoLegalizado();
    await conRpExpedido(proceso.id);

    const inicio = haceDias(200);
    await actaInicio.suscribir(
      proceso.id,
      { fechaReunion: inicio, fechaInicio: inicio } as any,
      archivo('acta-inicio.pdf'),
      'k'.repeat(64),
      supervisor,
    );

    if (pagado > 0) await pagar(proceso.id, pagado);

    await informeFinal.elaborar(
      proceso.id,
      { fechaElaboracion: hoy(), conclusion: CONCLUSION } as any,
      archivo('informe-final.pdf'),
      'w'.repeat(64),
      supervisor,
    );
    await liquidar(proceso.id);

    return proceso;
  };

  const cerrarFinanciero = (procesoId: string, datos: Record<string, unknown> = {}) =>
    cierre.cerrar(
      procesoId,
      {
        referenciaPagoFinal: 'OP-2026-9001',
        fechaPagoFinal: hoy(),
        ...datos,
      } as any,
      archivo('soporte-cierre.pdf'),
      'c'.repeat(64),
      financiero,
    );

  /**
   * Un contrato en ejecución con su RP expedido, que es donde la adición tiene
   * sentido. Vale 80 millones y su RP, 70.
   */
  const enEjecucionConRp = async () => {
    const proceso = await hastaContratoLegalizado();
    await conRpExpedido(proceso.id);

    const inicio = haceDias(30);
    await actaInicio.suscribir(
      proceso.id,
      { fechaReunion: inicio, fechaInicio: inicio } as any,
      archivo('acta-inicio.pdf'),
      'k'.repeat(64),
      supervisor,
    );

    return proceso;
  };

  const JUSTIFICACION =
    'Se requiere ampliar el alcance del contrato para cubrir dos sedes adicionales.';

  const solicitarAdicion = (procesoId: string, valor: number) =>
    modificaciones.solicitarAdicion(
      procesoId,
      { valorAdicionado: valor, justificacion: JUSTIFICACION } as any,
      gestor,
    );

  const idDeLaUltima = (estado: any) =>
    estado.modificaciones[estado.modificaciones.length - 1].id as string;

  /** Todo el ciclo de la Financiera sobre el CDP o el RP de la adición. */
  const expedirRespaldo = async (
    procesoId: string,
    modificacionId: string,
    tipo: 'CDP' | 'RP',
    valor: number,
  ) => {
    await modificaciones.solicitarRespaldo(
      procesoId,
      modificacionId,
      tipo,
      { rubro: 'A-02-02' } as any,
      financiero,
    );
    await modificaciones.verificarRespaldo(procesoId, modificacionId, tipo, financiero);
    return modificaciones.expedirRespaldo(
      procesoId,
      modificacionId,
      tipo,
      {
        numero: `${tipo}-ADI-2026-${Math.floor(Math.random() * 1_000_000)}`,
        valor,
        fechaExpedicion: hoy(),
      } as any,
      financiero,
    );
  };

  const aprobar = (procesoId: string, modificacionId: string) =>
    modificaciones.aprobar(
      procesoId,
      modificacionId,
      { numero: `OTROSI-2026-${Math.floor(Math.random() * 100000)}`, fechaSuscripcion: hoy() } as any,
      archivo('otrosi.pdf'),
      'h'.repeat(64),
      gestor,
    );

  /** Una adición aprobada de punta a punta. */
  const adicionAprobada = async (procesoId: string, valor: number) => {
    const solicitada = await solicitarAdicion(procesoId, valor);
    const id = idDeLaUltima(solicitada);

    await expedirRespaldo(procesoId, id, 'CDP', valor);
    await expedirRespaldo(procesoId, id, 'RP', valor);
    await aprobar(procesoId, id);

    return id;
  };

  const valorDelContrato = async (procesoId: string) => {
    const [fila] = await dataSource.query(
      `SELECT valor FROM hiring.contratos WHERE proceso_id = $1`,
      [procesoId],
    );
    return Number(fila.valor);
  };

  // ------------------------------------------------------------- criterio --

  describe('Criterio 1 · la adición exige CDP y RP antes de aprobarse', () => {
    it('no aprueba sin ninguno de los dos, y los nombra', async () => {
      const proceso = await enEjecucionConRp();
      const solicitada = await solicitarAdicion(proceso.id, 10_000_000);
      const id = idDeLaUltima(solicitada);

      await expect(aprobar(proceso.id, id)).rejects.toThrow(/no tiene CDP expedido/i);
    });

    it('no aprueba con el CDP expedido pero sin RP', async () => {
      const proceso = await enEjecucionConRp();
      const solicitada = await solicitarAdicion(proceso.id, 10_000_000);
      const id = idDeLaUltima(solicitada);

      await expedirRespaldo(proceso.id, id, 'CDP', 10_000_000);

      await expect(aprobar(proceso.id, id)).rejects.toThrow(/no tiene RP expedido/i);
    });

    it('tampoco aprueba con el CDP apenas solicitado: expedido es expedido', async () => {
      const proceso = await enEjecucionConRp();
      const solicitada = await solicitarAdicion(proceso.id, 10_000_000);
      const id = idDeLaUltima(solicitada);

      await modificaciones.solicitarRespaldo(
        proceso.id,
        id,
        'CDP',
        { rubro: 'A-02-02' } as any,
        financiero,
      );

      await expect(aprobar(proceso.id, id)).rejects.toThrow(/no tiene CDP expedido/i);
    });

    it('con los dos expedidos aprueba y sube el valor del contrato', async () => {
      const proceso = await enEjecucionConRp();
      expect(await valorDelContrato(proceso.id)).toBe(VALOR_CONTRATO);

      await adicionAprobada(proceso.id, 10_000_000);

      expect(await valorDelContrato(proceso.id)).toBe(VALOR_CONTRATO + 10_000_000);
    });

    it('el CDP de la adición no puede saltarse la verificación', async () => {
      const proceso = await enEjecucionConRp();
      const solicitada = await solicitarAdicion(proceso.id, 10_000_000);
      const id = idDeLaUltima(solicitada);

      await modificaciones.solicitarRespaldo(
        proceso.id,
        id,
        'CDP',
        { rubro: 'A-02-02' } as any,
        financiero,
      );

      // Mismo ciclo que el CDP del proceso: solicitado no salta a expedido.
      await expect(
        modificaciones.expedirRespaldo(
          proceso.id,
          id,
          'CDP',
          { numero: 'CDP-X', valor: 10_000_000, fechaExpedicion: hoy() } as any,
          financiero,
        ),
      ).rejects.toThrow(/no puede pasar a expedido/i);
    });
  });

  describe('Criterio 2 · el tope se cuenta acumulado', () => {
    it('deja adicionar hasta la mitad del valor inicial', async () => {
      const proceso = await enEjecucionConRp();

      await adicionAprobada(proceso.id, VALOR_CONTRATO / 2);

      expect(await valorDelContrato(proceso.id)).toBe(VALOR_CONTRATO * 1.5);
    });

    it('impide pasarse del tope y dice cuánto cabía', async () => {
      const proceso = await enEjecucionConRp();

      await expect(solicitarAdicion(proceso.id, VALOR_CONTRATO)).rejects.toThrow(
        /solo caben/i,
      );
    });

    /**
     * El caso que un tope mal implementado deja pasar: la segunda cabe por sí
     * sola contra el valor vigente, pero acumulada se pasa.
     */
    it('la segunda adición se juzga contra el valor inicial, no contra el vigente', async () => {
      const proceso = await enEjecucionConRp();
      await adicionAprobada(proceso.id, 32_000_000); // 40% de 80

      // 32 millones son el 40% del inicial y menos del 40% del vigente (112),
      // pero acumulados dan 80% y el tope es 50%.
      await expect(solicitarAdicion(proceso.id, 32_000_000)).rejects.toThrow(/ya tenía/i);
    });

    it('deja pasar la segunda si cabe en lo que queda', async () => {
      const proceso = await enEjecucionConRp();
      await adicionAprobada(proceso.id, 32_000_000);

      await adicionAprobada(proceso.id, 8_000_000);

      expect(await valorDelContrato(proceso.id)).toBe(VALOR_CONTRATO + 40_000_000);
    });

    it('una adición revocada devuelve el valor y libera el margen', async () => {
      const proceso = await enEjecucionConRp();
      const id = await adicionAprobada(proceso.id, 40_000_000);

      const estado = await modificaciones.revocar(
        proceso.id,
        id,
        { motivo: 'La necesidad que la sustentaba dejó de existir' } as any,
        gestor,
      );

      expect(await valorDelContrato(proceso.id)).toBe(VALOR_CONTRATO);
      expect(estado.margen!.yaAdicionado).toBe(0);
      expect(estado.margen!.margenDisponible).toBe(VALOR_CONTRATO / 2);
    });
  });

  describe('Criterio 3 · cuándo se puede modificar', () => {
    it('no adiciona un contrato que todavía no está en ejecución', async () => {
      const proceso = await hastaContratoLegalizado();

      await expect(solicitarAdicion(proceso.id, 10_000_000)).rejects.toThrow(
        /todavía no está en ejecución/i,
      );
    });

    it('no adiciona un contrato ya liquidado', async () => {
      const proceso = await listoParaCerrar(10_000_000);

      await expect(solicitarAdicion(proceso.id, 5_000_000)).rejects.toThrow(
        /ya está liquidado/i,
      );
    });

    it('no vuelve a tramitar una modificación ya aprobada', async () => {
      const proceso = await enEjecucionConRp();
      const id = await adicionAprobada(proceso.id, 10_000_000);

      await expect(aprobar(proceso.id, id)).rejects.toThrow(/ya no se puede tramitar/i);
    });
  });

  /**
   * Lo que protege a EFDS-1148, EFDS-1163 y EFDS-1173: abrir la puerta a un
   * segundo CDP y a un segundo RP no puede cambiarle el respaldo a lo que ya
   * existía.
   */
  describe('El CDP y el RP de la adición no se confunden con los del contrato', () => {
    it('el CDP de la adición no aparece como el CDP del proceso', async () => {
      const proceso = await enEjecucionConRp();
      const solicitada = await solicitarAdicion(proceso.id, 10_000_000);
      const id = idDeLaUltima(solicitada);
      await expedirRespaldo(proceso.id, id, 'CDP', 10_000_000);

      const delProceso = await cdp.delProceso(proceso.id);

      expect(delProceso).not.toBeNull();
      expect(delProceso!.modificacionId).toBeNull();
      // El del proceso vale lo del contrato, no lo de la adición.
      expect(Number(delProceso!.valor)).toBe(VALOR_CONTRATO);
    });

    it('el RP de la adición no es el RP del contrato', async () => {
      const proceso = await enEjecucionConRp();
      await adicionAprobada(proceso.id, 10_000_000);

      const [delContrato] = await dataSource.query(
        `SELECT valor, modificacion_id FROM hiring.registros_presupuestales
          WHERE contrato_id IN (SELECT id FROM hiring.contratos WHERE proceso_id = $1)
            AND modificacion_id IS NULL`,
        [proceso.id],
      );

      expect(Number(delContrato.valor)).toBe(VALOR_RP);
      expect(delContrato.modificacion_id).toBeNull();
    });

    /**
     * Liberar solo contra el RP original dejaría comprometido el saldo del de
     * la adición: plata de la entidad amarrada a un contrato terminado.
     */
    it('el cuadre del cierre financiero suma el RP de la adición', async () => {
      const proceso = await enEjecucionConRp();
      await adicionAprobada(proceso.id, 10_000_000);
      await pagar(proceso.id, 40_000_000);

      const estado = await cierre.estado(proceso.id, financiero);

      expect(estado.cuadre!.valorRp).toBe(VALOR_RP + 10_000_000);
      expect(estado.cuadre!.valorLiberado).toBe(VALOR_RP + 10_000_000 - 40_000_000);
    });
  });

  describe('La publicación de la modificación (RF-MOD-05)', () => {
    it('no publica una modificación que todavía está en trámite', async () => {
      const proceso = await enEjecucionConRp();
      const solicitada = await solicitarAdicion(proceso.id, 10_000_000);
      const id = idDeLaUltima(solicitada);

      await expect(
        modificaciones.publicar(
          proceso.id,
          id,
          { fechaPublicacion: hoy() } as any,
          archivo('evidencia.pdf'),
          'v'.repeat(64),
          gestor,
        ),
      ).rejects.toThrow(/todavía no está aprobada/i);
    });

    it('registra la publicación de la aprobada y no la deja repetir', async () => {
      const proceso = await enEjecucionConRp();
      const id = await adicionAprobada(proceso.id, 10_000_000);

      const publicar = () =>
        modificaciones.publicar(
          proceso.id,
          id,
          { fechaPublicacion: hoy(), secopNumero: 'CO1.MOD.176' } as any,
          archivo('evidencia.pdf'),
          'v'.repeat(64),
          gestor,
        );

      const estado = await publicar();
      const modificacion = (estado.modificaciones as any[]).find((m) => m.id === id);
      expect(modificacion.publicacion.secopNumero).toBe('CO1.MOD.176');

      await expect(publicar()).rejects.toThrow(/ya se registró como publicada/i);
    });
  });

  describe('El riel del proceso', () => {
    it('la 9.5 queda aprobada cuando hay una modificación aprobada', async () => {
      const proceso = await enEjecucionConRp();
      await adicionAprobada(proceso.id, 10_000_000);

      const [fila] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '9.5'`,
        [proceso.id],
      );

      expect(fila.estado).toBe('APROBADO');
    });
  });
});
