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
import { TramitesLiquidacionService } from '../src/modules/tramites-liquidacion/tramites-liquidacion.service';
import { CierreDefinitivoService } from '../src/modules/cierre-definitivo/cierre-definitivo.service';
import { ArchivoExpedienteService } from '../src/modules/archivo-expediente/archivo-expediente.service';

/**
 * Trámite de liquidación y de cierre del contrato (151).
 *
 * Recorre los dos flujos de punta a punta sobre un contrato en ejecución y
 * comprueba lo que una unitaria no ve: que no se radica sin la etapa 9 (salvo
 * la 9.2 y la 9.3), que radicar abre la etapa 10, que el acta firmada deja el
 * contrato liquidado como la 10.2 de siempre, y que un PSPAG se cierra sin
 * liquidarse y aun así puede hacer el cierre financiero.
 */
describe('Trámite de liquidación y cierre (151)', () => {
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
  let tramites: TramitesLiquidacionService;
  let cierreDefinitivo: CierreDefinitivoService;
  let archivoExpediente: ArchivoExpedienteService;

  /** Objeto propio de esta suite: las demás corren en paralelo (EFDS-1443). */
  const OBJETO = 'Tramite de liquidacion y cierre para pruebas';

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
    tramites = app.get(TramitesLiquidacionService);
    cierreDefinitivo = app.get(CierreDefinitivoService);
    archivoExpediente = app.get(ArchivoExpedienteService);

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


    // El trámite apunta al acta y al cierre: se va primero.
    await borrar(`DELETE FROM hiring.tramites_liquidacion WHERE ${deProceso}`);
    await borrar(
      `DELETE FROM hiring.publicaciones_acta WHERE acta_id IN (SELECT id FROM hiring.actas_liquidacion WHERE contrato_id IN (${deContratos}))`,
    );
    await borrar(`DELETE FROM hiring.cierres_contrato WHERE contrato_id IN (${deContratos})`);
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
      { rubro: 'A-02-02', numero: `CDP-2026-151-${n}`, valor: VALOR_CONTRATO, fechaExpedicion: hoy() },
      null,
      sa(financiero),
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-151-${n}`, resolucionFecha: hoy() },
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
        numeroActo: `RES-ADJ-2026-151-${n}`,
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
        numero: `CTO-2026-151-${CORRIDA}-${n}`,
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
        numeroPoliza: `POL-151-${CORRIDA}-${n}`,
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
        numero: `RP-2026-151-${CORRIDA}-${++vuelta}`,
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
    userId: '00000000-0000-0000-0000-000000000160',
    userName: 'prueba.area.radicadora',
    roles: ['AREA_RADICADORA'],
  };
  const asignador: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000161',
    userName: 'prueba.asignador',
    roles: ['DIRECTOR_CONTRATACION'],
  };
  const jefe: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000162',
    userName: 'prueba.jefe',
    roles: ['DIRECTORA_DE_CONTRATACION'],
  };

  let n = 0;
  const subido = (fieldname: string, nombre = 'soporte.pdf') => ({
    fieldname,
    filename: `e2e-151-${Date.now()}-${++n}.pdf`,
    originalname: nombre,
    mimetype: 'application/pdf',
    size: 1024,
    hash: 'm'.repeat(64),
  });

  /** Los dos primeros que pueden revisar modificaciones: abogado y revisor. */

  /** El primero que puede ser abogado de esa clase, distinto del asignador. */
  const unAbogado = async (clase: 'LIQUIDACION' | 'CIERRE'): Promise<HiringAccess> => {
    const candidatos = await tramites.candidatos(clase);
    const c = candidatos.find((x) => x.id !== asignador.userId);
    expect(c).toBeDefined();
    return { userId: c!.id, userName: c!.nombre, roles: ['ABOGADO_REVISOR'] };
  };

  /** Un archivo por cada documento obligatorio que se pide al radicar. */
  const documentosPara = async (procesoId: string) => {
    const { requisitos } = await tramites.situacion(procesoId, sa(area));
    return requisitos.filter((r: any) => r.obligatorio).map((r: any) => subido(r.id, `${r.nombre}.pdf`));
  };

  /** Lo que la etapa 9 pide terminado para radicar: la reunión de inicio y los pagos. */
  const terminarEtapa9 = async (procesoId: string) => {
    await dataSource.query(
      `INSERT INTO hiring.proceso_actividades (proceso_id, numeral, estado)
       SELECT $1, n, 'APROBADO' FROM unnest(ARRAY['9.1', '9.4']) AS n
       ON CONFLICT (proceso_id, numeral) DO UPDATE SET estado = 'APROBADO'`,
      [procesoId],
    );
  };

  const estadoDelContrato = async (procesoId: string) => {
    const [fila] = await dataSource.query(
      `SELECT estado FROM hiring.contratos WHERE proceso_id = $1 AND estado <> 'RECHAZADO'`,
      [procesoId],
    );
    return fila.estado as string;
  };

  const evidencia = () => ({ fecha: hoy(), secopNumero: `CO1.PCCNTR.${CORRIDA}`, secopUrl: 'https://community.secop.gov.co/x' });

  describe('liquidación', () => {
    it('no se radica sin la etapa 9, y la 9.2 y la 9.3 abiertas no lo impiden', async () => {
      const proceso = await contratoEnEjecucion();
      const antes = await tramites.situacion(proceso.id, area);
      expect(antes.clase).toBe('LIQUIDACION');
      expect(antes.etapa10Abierta).toBe(false);
      expect(antes.puedeRadicar).toBe(false);
      expect(antes.faltan.join(' ')).toMatch(/9\.4/);
      expect(antes.faltan.join(' ')).not.toMatch(/9\.2|9\.3/);
      await expect(tramites.radicar(proceso.id, null, await documentosPara(proceso.id), area)).rejects.toThrow(
        /Todavía no se puede radicar/,
      );

      await terminarEtapa9(proceso.id);
      expect((await tramites.situacion(proceso.id, area)).puedeRadicar).toBe(true);
      await expect(tramites.radicar(proceso.id, null, [], area)).rejects.toThrow(/Faltan documentos/);
    });

    it('de punta a punta: revisión con devolución, visto bueno, firma y SECOP', async () => {
      const proceso = await conInformeFinal();
      await terminarEtapa9(proceso.id);
      const abogado = await unAbogado('LIQUIDACION');

      const radicada = await tramites.radicar(proceso.id, 'E2E-151 liquidación', await documentosPara(proceso.id), area);
      expect(radicada).toMatchObject({ clase: 'LIQUIDACION', estado: 'RADICADA' });
      expect(radicada.radicado).toMatch(/^LIQ-\d{4}-\d{4}$/);
      expect((await tramites.situacion(proceso.id, area)).etapa10Abierta).toBe(true);
      await expect(tramites.radicar(proceso.id, null, await documentosPara(proceso.id), area)).rejects.toThrow(
        /ya tiene un trámite/,
      );

      // Paso 2: el asignador líder elige al abogado y queda como la líder.
      await expect(tramites.asignar(radicada.id, { abogadoId: abogado.userId }, area)).rejects.toThrow(/asignador líder/);
      let t = await tramites.asignar(radicada.id, { abogadoId: abogado.userId }, asignador);
      expect(t).toMatchObject({ estado: 'EN_REVISION', liderNombre: asignador.userName });

      // Paso 3: el abogado devuelve al área; la líder no decide antes que él.
      await expect(tramites.decidir(radicada.id, { accion: 'APROBAR' }, asignador)).rejects.toThrow(/abogado asignado/);
      t = await tramites.decidir(radicada.id, { accion: 'DEVOLVER', observaciones: 'Falta el balance' }, abogado);
      expect(t.estado).toBe('DEVUELTA');

      // Paso 6: el área corrige y reenvía; la revisión empieza desde el abogado.
      t = await tramites.reenviar(radicada.id, {}, area);
      expect(t.estado).toBe('EN_REVISION');
      expect(t.rondas.filter((r: any) => r.fase === 'REVISION')).toHaveLength(2);
      await tramites.decidir(radicada.id, { accion: 'APROBAR' }, abogado);
      t = await tramites.decidir(radicada.id, { accion: 'APROBAR' }, asignador);
      expect(t.estado).toBe('ACTA');

      // Pasos 7-10: el acta va al visto bueno de la líder y la jefe.
      t = await tramites.enviarActa(radicada.id, subido('acta', 'acta-ajustada.pdf'), null, abogado);
      expect(t.estado).toBe('EN_VISTO_BUENO');
      await tramites.decidir(radicada.id, { accion: 'APROBAR' }, asignador);
      t = await tramites.decidir(radicada.id, { accion: 'APROBAR' }, jefe);
      expect(t.estado).toBe('EN_FIRMA');
      expect(await estadoDelContrato(proceso.id)).not.toBe('LIQUIDADO');

      // Paso 12: el acta firmada es la 10.2 de siempre.
      t = await tramites.perfeccionar(
        radicada.id,
        { tipo: 'BILATERAL', fechaActa: hoy(), pazYSalvo: false } as any,
        subido('acta', 'acta-firmada.pdf'),
        null,
        area,
      );
      expect(t.estado).toBe('PERFECCIONADA');
      expect(await estadoDelContrato(proceso.id)).toBe('LIQUIDADO');
      const [actividad] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '10.2'`,
        [proceso.id],
      );
      expect(actividad.estado).toBe('APROBADO');

      // Paso 13: SECOP cuenta como la publicación del acta para el archivo.
      t = await tramites.publicar(radicada.id, evidencia(), subido('file', 'secop.png'), abogado);
      expect(t.estado).toBe('PUBLICADA');
      const [publicacion] = await dataSource.query(
        `SELECT p.destino FROM hiring.publicaciones_acta p
           JOIN hiring.actas_liquidacion a ON a.id = p.acta_id
           JOIN hiring.contratos c ON c.id = a.contrato_id
          WHERE c.proceso_id = $1`,
        [proceso.id],
      );
      expect(publicacion.destino).toBe('SECOP_II');
      const archivo10 = await archivoExpediente.estado(proceso.id, sa(gestor));
      expect(archivo10.pendientesArchivo.join(' ')).not.toMatch(/no se ha publicado/);
    });

    it('con trámite, la 10.2 no se carga por el camino de antes', async () => {
      const proceso = await conInformeFinal();
      await terminarEtapa9(proceso.id);
      await tramites.radicar(proceso.id, null, await documentosPara(proceso.id), area);
      await expect(liquidar(proceso.id)).rejects.toThrow(/se sube desde el trámite/);
    });
  });

  describe('cierre de un PSPAG', () => {
    /** Un contrato de prestación de servicios con persona natural. */
    const comoPspag = async (procesoId: string) => {
      await dataSource.query(`UPDATE hiring.procesos SET causal = 'DIRECTA_SERVICIOS_PROFESIONALES' WHERE id = $1`, [procesoId]);
      await dataSource.query(
        `UPDATE hiring.contratos SET contratista_tipo = 'NATURAL' WHERE proceso_id = $1 AND estado <> 'RECHAZADO'`,
        [procesoId],
      );
    };

    it('con devoluciones del asignador y del abogado, se cierra en SECOP sin liquidar', async () => {
      const proceso = await contratoEnEjecucion();
      await comoPspag(proceso.id);
      await terminarEtapa9(proceso.id);
      const abogado = await unAbogado('CIERRE');

      const situacion = await tramites.situacion(proceso.id, area);
      expect(situacion.clase).toBe('CIERRE');
      expect(situacion.requisitos.map((r: any) => r.nombre).join(' ')).toMatch(/Memorando de solicitud de cierre/);

      const radicada = await tramites.radicar(proceso.id, null, await documentosPara(proceso.id), area);
      expect(radicada.radicado).toMatch(/^CIE-/);
      const [actividad] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '10.2'`,
        [proceso.id],
      );
      expect(actividad.estado).toBe('NO_APLICA');

      // El asignador líder devuelve antes de asignar; al reenviar vuelve a él.
      let t = await tramites.devolverAlArea(radicada.id, { observaciones: 'Falta la firma del memorando' }, asignador);
      expect(t.estado).toBe('DEVUELTA');
      t = await tramites.reenviar(radicada.id, {}, area);
      expect(t.estado).toBe('RADICADA');

      // El abogado devuelve; al reenviar va directo a él, sin repartir otra vez.
      await tramites.asignar(radicada.id, { abogadoId: abogado.userId }, asignador);
      t = await tramites.devolverAlArea(radicada.id, { observaciones: 'Adjunta el último informe' }, abogado);
      expect(t.estado).toBe('DEVUELTA');
      t = await tramites.reenviar(radicada.id, {}, area);
      expect(t).toMatchObject({ estado: 'EN_REVISION', abogadoNombre: abogado.userName });

      t = await tramites.cerrarEnSecop(radicada.id, evidencia(), subido('file', 'cierre-secop.pdf'), abogado);
      expect(t.estado).toBe('CERRADA');
      expect(await estadoDelContrato(proceso.id)).toBe('CERRADO');

      // Sin acta de liquidación, el cierre financiero y el archivo no la piden.
      const financiero10 = await cierre.estado(proceso.id, sa(gestor));
      expect(financiero10.tieneLiquidacion).toBe(true);
      const archivo10 = await archivoExpediente.estado(proceso.id, sa(gestor));
      expect(archivo10.pendientesArchivo.join(' ')).not.toMatch(/acta de liquidación/);

      // Revertir el cierre no lo deja «liquidado»: nunca lo estuvo.
      await cierreDefinitivo.revertir(proceso.id, { motivo: 'Prueba de la reversión del cierre PSPAG' } as any, sa(gestor));
      expect(await estadoDelContrato(proceso.id)).toBe('EJECUCION');
    });

    it('desistir quita el «no aplica» de la 10.2 y la etapa 10 vuelve a esperar', async () => {
      const proceso = await contratoEnEjecucion();
      await comoPspag(proceso.id);
      await terminarEtapa9(proceso.id);

      const radicada = await tramites.radicar(proceso.id, null, await documentosPara(proceso.id), area);
      expect((await tramites.situacion(proceso.id, area)).etapa10Abierta).toBe(true);
      const t = await tramites.desistir(radicada.id, { motivo: 'Hay una prórroga por tramitar' }, area);
      expect(t.estado).toBe('DESISTIDA');

      const despues = await tramites.situacion(proceso.id, area);
      expect(despues.etapa10Abierta).toBe(false);
      expect(despues.puedeRadicar).toBe(true);
      expect(despues.anteriores).toHaveLength(1);
    });
  });
});
