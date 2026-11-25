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
import { TramitesModificacionService } from '../src/modules/tramites-modificacion/tramites-modificacion.service';

/**
 * Módulo de Modificaciones fuera del proceso (150).
 *
 * Recorre el trámite de punta a punta sobre un contrato en ejecución —radicar,
 * asignar, las dos cadenas, minuta, firma y SECOP— y comprueba lo que una
 * unitaria no ve: que el contrato cambia solo al perfeccionarse, con varios
 * cambios en la misma minuta, y que la notificación de un contrato antiguo no
 * toca nada.
 */
describe('Trámite de modificaciones (150)', () => {
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
  let tramites: TramitesModificacionService;

  /** Objeto propio de esta suite: las demás corren en paralelo (EFDS-1443). */
  const OBJETO = 'Tramite de modificaciones para pruebas';

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
  const ordenador: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000003',
    userName: 'prueba.ordenador',
    roles: ['ORDENADOR_GASTO'],
  };
  const revisor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000005',
    userName: 'prueba.revisor',
    roles: ['REVISOR_CONTRATACION'],
  };
  /** El supervisor de otro contrato: tiene el rol y no debe poder avalar aquí. */
  const otroSupervisor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000008',
    userName: 'prueba.otro.supervisor',
    roles: ['SUPERVISOR_CONTRATO'],
  };

  /**
   * Quien registra lo del supervisor, que no entra a la aplicación (136): su
   * aval y su informe los carga el gestor de archivo y supervisión.
   */
  const archivista: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000009',
    userName: 'prueba.gestor.archivo',
    roles: ['GESTOR_DE_ARCHIVO_Y_SUPERVISION'],
  };
  let juridica: { acceso: HiringAccess; personaId: string };

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const haceHoras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  // Sobre la fecha de Bogotá, como los servicios: en UTC, de las 7 p. m. en
  // adelante «ayer» caía en hoy y los términos no se vencían.
  const enDias = (d: number) => {
    const f = new Date(`${hoy()}T12:00:00Z`);
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
    tramites = app.get(TramitesModificacionService);

    const [cuenta] = await dataSource.query(
      `SELECT id_user, id_person FROM auth."user" WHERE id_person IS NOT NULL ORDER BY id_user LIMIT 1`,
    );
    juridica = {
      personaId: cuenta.id_person,
      acceso: {
        userId: cuenta.id_user,
        userName: 'prueba.juridica',
        roles: ['EVALUADOR_JURIDICO'],
      },
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
    // Los trámites, cuando sus cambios ya no tienen CDP ni RP colgando.
    await dataSource.query(`DELETE FROM hiring.tramites_modificacion WHERE justificacion LIKE 'E2E-150%'`);
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
  /**
   * El camino hasta la ejecución se recorre como super administrador: es el de
   * la suite de la adición, y sus reglas de cada etapa no son lo que se prueba
   * aquí. El trámite de modificaciones sí va con los roles de verdad.
   */
  const sa = (acceso: HiringAccess): HiringAccess => ({ ...acceso, roles: [...acceso.roles, 'SUPER_ADMIN'] });

  const hastaContratoLegalizado = async () => {
    const n = ++vuelta;
    const documento = `9007777${String(n).padStart(2, '0')}-7`;

    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: VALOR_CONTRATO },
      sa(gestor),
    );

    await cdp.cargar(
      proceso.id,
      { rubro: 'A-02-02', numero: `CDP-2026-150-${n}`, valor: VALOR_CONTRATO, fechaExpedicion: hoy() },
      null,
      sa(financiero),
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-150-${n}`, resolucionFecha: hoy() },
      archivo('resolucion.pdf'),
      'a'.repeat(64),
      archivo('pliego.pdf'),
      'b'.repeat(64),
      archivo('captura.png', 'image/png'),
      'e'.repeat(64),
      sa(gestor),
    );

    // Correr el cierre sin adenda solo lo puede el super administrador (134).
    await ofertas.fijarPlazo(proceso.id, { vencimiento: haceHoras(3) }, { ...sa(gestor), roles: ['SUPER_ADMIN'] });
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
      sa(gestor),
    );
    const cierre = await ofertas.cerrar(proceso.id, sa(gestor));

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
      sa(ordenador),
    );

    await evaluacion.registrar(
      proceso.id,
      {},
      [{ archivo: archivo('informe-comite.pdf'), hash: 'i'.repeat(64) }],
      sa(juridica.acceso),
    );

    await traslado.generar(proceso.id, {}, archivo('preliminar.pdf'), 'p'.repeat(64), sa(gestor));
    await traslado.trasladar(
      proceso.id,
      { medioPublicacion: 'Publicado en SECOP II y notificado por correo a los oferentes' },
      archivo('evidencia.png', 'image/png'),
      'v'.repeat(64),
      sa(gestor),
    );
    // El término va en días hábiles: se vence a mano, como en las demás suites.
    await dataSource.query(
      `UPDATE hiring.informes_evaluacion SET vence_el = $2 WHERE proceso_id = $1 AND estado = 'TRASLADADO'`,
      [proceso.id, haceDias(1)],
    );
    await escritos.cerrar(proceso.id, {}, sa(gestor));

    await definitivo.generar(proceso.id, archivo('definitivo.pdf'), 'd'.repeat(64), sa(gestor), undefined, {
      oferenteId: cierre.oferentes[0].id,
    });
    await definitivo.publicar(
      proceso.id,
      { enlace: 'https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.1' },
      archivo('pub-definitivo.png', 'image/png'),
      'w'.repeat(64),
      sa(gestor),
    );

    await acto.adjudicar(
      proceso.id,
      {
        oferenteId: cierre.oferentes[0].id,
        numeroActo: `RES-ADJ-2026-150-${n}`,
        fechaActo: hoy(),
        valorAdjudicado: VALOR_CONTRATO,
      },
      archivo('acto.pdf'),
      'j'.repeat(64),
      sa(ordenador),
    );

    await contratos.generar(
      proceso.id,
      {
        tipologia: 'CONSULTORIA',
        numero: `CTO-2026-150-${CORRIDA}-${n}`,
        objeto: 'Servicios profesionales de apoyo a la gestión',
        valor: VALOR_CONTRATO,
        plazoDias: 180,
        contratistaDocumento: documento,
        contratistaNombre: 'Servicios Integrales SAS',
        contratistaTipo: 'JURIDICA',
      },
      archivo('minuta.pdf'),
      'n'.repeat(64),
      sa(gestor),
    );
    await contratos.aceptar(proceso.id, { aceptadoPor: 'Representante legal' }, sa(gestor));
    await contratos.firmar(
      proceso.id,
      { parte: 'ORDENADOR', firmanteNombre: 'Ordenadora del gasto', fechaFirma: haceDias(1000) },
      archivo('firma-entidad.pdf'),
      'f'.repeat(64),
      sa(ordenador),
    );
    await contratos.firmar(
      proceso.id,
      { parte: 'CONTRATISTA', firmanteNombre: 'Representante legal', fechaFirma: haceDias(1000) },
      archivo('firma-contratista.pdf'),
      'g'.repeat(64),
      sa(gestor),
    );

    const garantia = await legalizacion.cargarGarantia(
      proceso.id,
      {
        aseguradora: 'Seguros del Estado',
        tipoPoliza: 'CUMPLIMIENTO_ENTIDADES_ESTATALES',
        numeroPoliza: `POL-150-${CORRIDA}-${n}`,
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
      sa(gestor),
    );
    const pendiente = garantia.garantias.find((g: any) => g.estado !== 'APROBADA');
    await legalizacion.aprobarGarantia(proceso.id, pendiente.id, sa(revisor));

    await supervision.designar(
      proceso.id,
      {
        nombre: 'Supervisora del contrato',
        cargo: 'Profesional especializada',
        email: 'supervision@esap.edu.co',
        fechaDesignacion: hoy(),
      },
      archivo('acto-supervision.pdf'),
      'z'.repeat(64),
      sa(ordenador),
    );

    return proceso;
  };

  /** El contrato ya corriendo, que es la condición de entrada de la 9.4. */
  const contratoEnEjecucion = async (fechaInicio = haceDias(30)) => {
    const proceso = await hastaContratoLegalizado();
    // El RP es requisito de ejecución: sin él no arranca la reunión de inicio.
    await dataSource.query(
      `INSERT INTO hiring.registros_presupuestales
         (contrato_id, numero, valor, rubro, fecha_expedicion, estado, solicitado_por, expedido_por)
       SELECT c.id, 'RP-E2E-' || left(c.id::text, 8), c.valor, 'A-02-02', CURRENT_DATE - 900,
              'EXPEDIDO', 'e2e', 'e2e'
         FROM hiring.contratos c
        WHERE c.proceso_id = $1 AND c.estado <> 'RECHAZADO'
          AND NOT EXISTS (
            SELECT 1 FROM hiring.registros_presupuestales r
             WHERE r.contrato_id = c.id AND r.modificacion_id IS NULL
               AND r.estado NOT IN ('RECHAZADO', 'ANULADO'))`,
      [proceso.id],
    );

    await actaInicio.suscribir(
      proceso.id,
      { fechaInicio, temasTratados: 'Alcance, cronograma y entregables socializados con el contratista' },
      archivo('acta-inicio.pdf'),
      'k'.repeat(64),
      sa(archivista),
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
      sa(gestor),
    );

    const pagoId = radicado.pagos[0].id;
    await pagos.avalar(
      procesoId,
      pagoId,
      {},
      archivo('aval-supervisor.pdf'),
      'v'.repeat(64),
      sa(archivista),
    );
    await pagos.tramitar(
      procesoId,
      pagoId,
      { referenciaPago: `OP-2026-${Math.floor(Math.random() * 100000)}` },
      sa(gestor),
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
      sa(gestor),
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
    // El RP es requisito de ejecución: sin él no arranca la reunión de inicio.
    await dataSource.query(
      `INSERT INTO hiring.registros_presupuestales
         (contrato_id, numero, valor, rubro, fecha_expedicion, estado, solicitado_por, expedido_por)
       SELECT c.id, 'RP-E2E-' || left(c.id::text, 8), c.valor, 'A-02-02', CURRENT_DATE - 900,
              'EXPEDIDO', 'e2e', 'e2e'
         FROM hiring.contratos c
        WHERE c.proceso_id = $1 AND c.estado <> 'RECHAZADO'
          AND NOT EXISTS (
            SELECT 1 FROM hiring.registros_presupuestales r
             WHERE r.contrato_id = c.id AND r.modificacion_id IS NULL
               AND r.estado NOT IN ('RECHAZADO', 'ANULADO'))`,
      [proceso.id],
    );
    const inicio = haceDias(diasDesdeInicio);

    await actaInicio.suscribir(
      proceso.id,
      { fechaInicio: inicio, temasTratados: 'Alcance, cronograma y entregables socializados con el contratista' },
      archivo('acta-inicio.pdf'),
      'k'.repeat(64),
      sa(archivista),
    );
    await informeFinal.elaborar(
      proceso.id,
      { fechaElaboracion: hoy(), conclusion: CONCLUSION } as any,
      archivo('informe-final.pdf'),
      'w'.repeat(64),
      sa(archivista),
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
      sa(gestor),
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
    await rp.solicitar(procesoId, { rubro: 'A-02-02', valor: VALOR_RP }, sa(financiero));
    await rp.verificar(procesoId, sa(financiero));
    await rp.expedir(
      procesoId,
      {
        numero: `RP-2026-150-${CORRIDA}-${++vuelta}`,
        valor: VALOR_RP,
        fechaExpedicion: haceDias(210),
      } as any,
      null,
      null,
      sa(financiero),
    );
  };

  /** Un contrato liquidado y con RP expedido: la entrada de la 10.3. */
  const listoParaCerrar = async (pagado = 40_000_000) => {
    const proceso = await hastaContratoLegalizado();
    await conRpExpedido(proceso.id);

    const inicio = haceDias(200);
    await actaInicio.suscribir(
      proceso.id,
      { fechaInicio: inicio, temasTratados: 'Alcance, cronograma y entregables socializados con el contratista' },
      archivo('acta-inicio.pdf'),
      'k'.repeat(64),
      sa(archivista),
    );

    if (pagado > 0) await pagar(proceso.id, pagado);

    await informeFinal.elaborar(
      proceso.id,
      { fechaElaboracion: hoy(), conclusion: CONCLUSION } as any,
      archivo('informe-final.pdf'),
      'w'.repeat(64),
      sa(archivista),
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
      sa(financiero),
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
      { fechaInicio: inicio, temasTratados: 'Alcance, cronograma y entregables socializados con el contratista' },
      archivo('acta-inicio.pdf'),
      'k'.repeat(64),
      sa(archivista),
    );

    return proceso;
  };

  const JUSTIFICACION =
    'Se requiere ampliar el alcance del contrato para cubrir dos sedes adicionales.';

  const solicitarAdicion = (procesoId: string, valor: number) =>
    modificaciones.solicitarAdicion(
      procesoId,
      { valorAdicionado: valor, justificacion: JUSTIFICACION } as any,
      sa(gestor),
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
      sa(financiero),
    );
    await modificaciones.verificarRespaldo(procesoId, modificacionId, tipo, sa(financiero));
    return modificaciones.expedirRespaldo(
      procesoId,
      modificacionId,
      tipo,
      {
        numero: `${tipo}-ADI-2026-${Math.floor(Math.random() * 1_000_000)}`,
        valor,
        fechaExpedicion: hoy(),
      } as any,
      sa(financiero),
    );
  };

  const aprobar = (procesoId: string, modificacionId: string) =>
    modificaciones.aprobar(
      procesoId,
      modificacionId,
      { numero: `OTROSI-2026-${Math.floor(Math.random() * 100000)}`, fechaSuscripcion: hoy() } as any,
      archivo('otrosi.pdf'),
      'h'.repeat(64),
      sa(gestor),
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

  // -------------------------------------------------- el trámite (150) --

  const area: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000150',
    userName: 'prueba.area.radicadora',
    roles: ['AREA_RADICADORA'],
  };
  const asignador: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000151',
    userName: 'prueba.asignador',
    roles: ['DIRECTOR_CONTRATACION'],
  };
  const jefe: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000152',
    userName: 'prueba.jefe',
    roles: ['DIRECTORA_DE_CONTRATACION'],
  };

  let n = 0;
  const subido = (fieldname: string, nombre = 'soporte.pdf') => ({
    fieldname,
    filename: `e2e-150-${Date.now()}-${++n}.pdf`,
    originalname: nombre,
    mimetype: 'application/pdf',
    size: 1024,
    hash: 'm'.repeat(64),
  });

  /** Los dos primeros que pueden revisar modificaciones: abogado y revisor. */
  const abogadoYRevisor = async () => {
    const candidatos = await tramites.candidatos();
    expect(candidatos.length).toBeGreaterThanOrEqual(2);
    const [a, r] = candidatos;
    const como = (c: { id: string; nombre: string }): HiringAccess => ({
      userId: c.id,
      userName: c.nombre,
      roles: ['ABOGADO_REVISOR'],
    });
    return { abogado: como(a), revisor: como(r) };
  };

  /** Un archivo por cada documento obligatorio que piden estos tipos. */
  const documentosPara = async (tipos: string[]) => {
    const { requisitos } = await tramites.paraRadicar();
    return requisitos
      .filter(
        (r) =>
          r.obligatorio &&
          (r.tiposModificacion.length === 0 || r.tiposModificacion.some((t) => tipos.includes(t))),
      )
      .map((r) => subido(r.id, `${r.nombre}.pdf`));
  };

  const datosDelContrato = async (procesoId: string) => {
    const [fila] = await dataSource.query(
      `SELECT id, numero, plazo_dias FROM hiring.contratos WHERE proceso_id = $1`,
      [procesoId],
    );
    return fila as { id: string; numero: string; plazo_dias: number | null };
  };

  describe('notificación de un contrato antiguo', () => {
    it('se radica con número y documentos, y Contratación la da por recibida sin flujo', async () => {
      const radicada = await tramites.radicar(
        {
          contratoNumero: `ANTIGUO-${CORRIDA}`,
          cambios: [{ tipo: 'PRORROGA' }],
          justificacion: 'E2E-150 notificación de un contrato que no está en la plataforma',
          datosContrato: { contratista: 'Contratista antiguo' },
        } as any,
        await documentosPara(['PRORROGA']),
        area,
      );
      expect(radicada).toMatchObject({ vinculada: false, estado: 'RADICADA' });
      expect(radicada.radicado).toMatch(/^MOD-\d{4}-\d{4}$/);
      expect(radicada.cambios).toEqual([]);
      expect(radicada.acciones.asignar).toBe(false);

      await expect(
        tramites.asignar(radicada.id, { abogadoId: 'x', revisorId: 'y' }, asignador),
      ).rejects.toThrow(/notificación no se asigna/);

      const recibida = await tramites.recibir(radicada.id, { nota: 'Se tramita por fuera' }, asignador);
      expect(recibida).toMatchObject({ estado: 'RECIBIDA', notaRecibido: 'Se tramita por fuera' });
    });

    it('no radica sin los documentos obligatorios', async () => {
      await expect(
        tramites.radicar(
          {
            contratoNumero: `ANTIGUO-${CORRIDA}-2`,
            cambios: [{ tipo: 'ACLARATORIO' }],
            justificacion: 'E2E-150 sin documentos',
          } as any,
          [],
          area,
        ),
      ).rejects.toThrow(/Faltan documentos/);
    });
  });

  describe('flujo completo sobre un contrato en ejecución', () => {
    it('adición y prórroga en la misma minuta: el contrato cambia solo al perfeccionarse', async () => {
      const proceso = await enEjecucionConRp();
      const contrato = await datosDelContrato(proceso.id);
      const buscado = await tramites.buscarContrato(contrato.numero);
      expect(buscado.encontrado).toBe(true);

      const radicada = await tramites.radicar(
        {
          contratoNumero: contrato.numero,
          contratoId: contrato.id,
          cambios: [
            {
              tipo: 'ADICION',
              valorAdicionado: 10_000_000,
              cdp: {
                numero: `CDP-MOD-${CORRIDA}`,
                valor: 10_000_000,
                fechaExpedicion: hoy(),
                rubro: 'A-02-02',
              },
            },
            { tipo: 'PRORROGA', diasProrroga: 30 },
          ],
          justificacion: 'E2E-150 adición y prórroga en una sola minuta',
        } as any,
        await documentosPara(['ADICION', 'PRORROGA']),
        area,
      );
      expect(radicada.cambios).toHaveLength(2);
      expect(radicada.estado).toBe('RADICADA');

      const { abogado, revisor } = await abogadoYRevisor();
      let t = await tramites.asignar(
        radicada.id,
        { abogadoId: abogado.userId, revisorId: revisor.userId },
        asignador,
      );
      expect(t.estado).toBe('EN_REVISION');

      // El revisor no decide el escalón del abogado.
      await expect(tramites.decidir(t.id, { accion: 'APROBAR' }, revisor)).rejects.toThrow(/abogado asignado/);

      // El revisor devuelve: va al área, y al reenviar empieza otra vez desde el abogado.
      await tramites.decidir(t.id, { accion: 'APROBAR' }, abogado);
      t = await tramites.decidir(t.id, { accion: 'DEVOLVER', observaciones: 'Falta el concepto firmado' }, revisor);
      expect(t.estado).toBe('DEVUELTA');
      t = await tramites.reenviar(t.id, { observaciones: 'Corregido' }, area);
      expect(t.estado).toBe('EN_REVISION');
      expect(t.acciones.decidir).toEqual([]);
      await tramites.decidir(t.id, { accion: 'APROBAR' }, abogado);
      t = await tramites.decidir(t.id, { accion: 'APROBAR' }, revisor);
      expect(t.estado).toBe('MINUTA');

      // El visto bueno devuelve al abogado, que vuelve a mandar la minuta.
      t = await tramites.enviarMinuta(t.id, subido('file', 'minuta.docx'), null, abogado);
      expect(t.estado).toBe('EN_VISTO_BUENO');
      t = await tramites.decidir(t.id, { accion: 'DEVOLVER', observaciones: 'Ajustar la cláusula de valor' }, revisor);
      expect(t.estado).toBe('MINUTA');
      t = await tramites.enviarMinuta(t.id, subido('file', 'minuta-v2.docx'), null, abogado);
      await tramites.decidir(t.id, { accion: 'APROBAR' }, revisor);
      t = await tramites.decidir(t.id, { accion: 'APROBAR' }, jefe);
      expect(t.estado).toBe('EN_FIRMA');

      // Hasta aquí el contrato no ha cambiado.
      expect(await valorDelContrato(proceso.id)).toBe(VALOR_CONTRATO);

      await expect(
        tramites.perfeccionar(
          t.id,
          { numero: 'Modificación No. 1', fechaSuscripcion: hoy() } as any,
          subido('file'),
          area,
        ),
      ).rejects.toThrow(/RP/);

      t = await tramites.perfeccionar(
        t.id,
        {
          numero: 'Modificación No. 1',
          fechaSuscripcion: hoy(),
          rpNumero: `RP-MOD-${CORRIDA}`,
          rpFechaExpedicion: hoy(),
        },
        subido('file', 'minuta-firmada.pdf'),
        area,
      );
      expect(t.estado).toBe('PERFECCIONADA');
      expect(await valorDelContrato(proceso.id)).toBe(VALOR_CONTRATO + 10_000_000);
      const despues = await datosDelContrato(proceso.id);
      if (contrato.plazo_dias !== null) expect(despues.plazo_dias).toBe(contrato.plazo_dias + 30);
      expect(t.cambios.every((c: any) => c.estado === 'APROBADA')).toBe(true);

      t = await tramites.publicar(
        t.id,
        { fechaPublicacion: hoy(), secopNumero: 'CO1.PCCNTR.150' },
        subido('file', 'secop.png'),
        abogado,
      );
      expect(t.estado).toBe('PUBLICADA');
    });

    it('no radica en un contrato que todavía no está en ejecución', async () => {
      const proceso = await hastaContratoLegalizado();
      const contrato = await datosDelContrato(proceso.id);
      await expect(
        tramites.radicar(
          {
            contratoNumero: contrato.numero,
            contratoId: contrato.id,
            cambios: [{ tipo: 'PRORROGA', diasProrroga: 10 }],
            justificacion: 'E2E-150 contrato legalizado',
          } as any,
          await documentosPara(['PRORROGA']),
          area,
        ),
      ).rejects.toThrow(/en ejecución/);
    });

    it('la suspensión va sola, y desistir deja los cambios sin curso', async () => {
      const proceso = await contratoEnEjecucion();
      const contrato = await datosDelContrato(proceso.id);

      await expect(
        tramites.radicar(
          {
            contratoNumero: contrato.numero,
            contratoId: contrato.id,
            cambios: [
              { tipo: 'SUSPENSION', suspensionDesde: hoy() },
              { tipo: 'PRORROGA', diasProrroga: 5 },
            ],
            justificacion: 'E2E-150 combinación indebida',
          } as any,
          await documentosPara(['SUSPENSION', 'PRORROGA']),
          area,
        ),
      ).rejects.toThrow(/va sola/);

      const radicada = await tramites.radicar(
        {
          contratoNumero: contrato.numero,
          contratoId: contrato.id,
          cambios: [{ tipo: 'SUSPENSION', suspensionDesde: hoy() }],
          justificacion: 'E2E-150 suspensión que se desiste',
        } as any,
        await documentosPara(['SUSPENSION']),
        area,
      );
      const desistida = await tramites.desistir(radicada.id, { motivo: 'El área ya no la necesita' }, area);
      expect(desistida.estado).toBe('DESISTIDA');
      expect(desistida.cambios[0].estado).toBe('RECHAZADA');
    });
  });
});
