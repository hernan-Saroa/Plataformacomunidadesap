import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { PagosService } from '../src/modules/pagos/pagos.service';
import { InformeFinalService } from '../src/modules/informe-final/informe-final.service';
import { LiquidacionService } from '../src/modules/liquidacion/liquidacion.service';
import { CierreFinancieroService } from '../src/modules/cierre-financiero/cierre-financiero.service';
import { ArchivoExpedienteService } from '../src/modules/archivo-expediente/archivo-expediente.service';
import { CierreDefinitivoService } from '../src/modules/cierre-definitivo/cierre-definitivo.service';
import { DocumentosService } from '../src/modules/documentos/documentos.service';
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
 * HU EFDS-1175 · Cierre definitivo del contrato (RF-LIQ-05, RF-SIS-01).
 *
 * Lo último del proceso, así que el camino arrastra todo: etapas 8 y 9, informe
 * final, liquidación, cierre financiero y archivo del expediente.
 *
 * Lo que aquí importa y no se ve en una unitaria es **qué amparos cuentan**: los
 * de una garantía rechazada no, los de cumplimiento tampoco, y un contrato sin
 * estabilidad ni calidad se cierra de entrada. Y el ciclo de estados del
 * contrato, que es lo que RF-SIS-01 pide dejar trazable.
 *
 * La vigencia de los amparos se vence con un UPDATE, como el resto de las
 * suites hace con los plazos: esperar no es opción.
 */
describe('HU EFDS-1175 · cierre definitivo del contrato', () => {
  let app: INestApplication;
  let pagos: PagosService;
  let informeFinal: InformeFinalService;
  let liquidacion: LiquidacionService;
  let cierre: CierreFinancieroService;
  let archivo10_4: ArchivoExpedienteService;
  let cierreDefinitivo: CierreDefinitivoService;
  let documentos: DocumentosService;
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
  const OBJETO = 'Cierre definitivo para pruebas';

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
    archivo10_4 = app.get(ArchivoExpedienteService);
    cierreDefinitivo = app.get(CierreDefinitivoService);
    documentos = app.get(DocumentosService);
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

    await borrar(`DELETE FROM hiring.cierres_contrato WHERE contrato_id IN (${deContratos})`);
    await borrar(
      `DELETE FROM hiring.publicaciones_acta WHERE acta_id IN (SELECT id FROM hiring.actas_liquidacion WHERE contrato_id IN (${deContratos}))`,
    );
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
      { numero: `CDP-2026-175-${n}`, valor: VALOR_CONTRATO, fechaExpedicion: hoy() },
      financiero,
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-175-${n}`, resolucionFecha: hoy() },
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
        numeroActo: `RES-ADJ-2026-175-${n}`,
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
        numero: `CTO-2026-175-${CORRIDA}-${n}`,
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
        numeroPoliza: `POL-175-${CORRIDA}-${n}`,
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
        numero: `RP-2026-175-${CORRIDA}-${++vuelta}`,
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
  /** Un contrato liquidado y cerrado financieramente: la entrada de la 10.4. */
  const listoParaPublicar = async (pagado = 40_000_000) => {
    const proceso = await listoParaCerrar(pagado);
    await cerrarFinanciero(proceso.id);
    return proceso;
  };

  const publicarActa = (
    procesoId: string,
    datos: Record<string, unknown> = {},
    quien: HiringAccess = gestor,
  ) =>
    archivo10_4.publicar(
      procesoId,
      { destino: 'SECOP_II', fechaPublicacion: hoy(), ...datos } as any,
      archivo('evidencia-publicacion.pdf'),
      'u'.repeat(64),
      quien,
    );

  /** El Archivo de Gestión, que es quien archiva y reabre. */
  const archivista: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000009',
    userName: 'prueba.archivo',
    roles: ['ARCHIVO_GESTION_DC'],
    puedeEditar: false,
  };

  const archivarExpediente = (procesoId: string, datos: Record<string, unknown> = {}) =>
    archivo10_4.archivar(procesoId, datos as any, archivista);

  /** Todo el camino hasta el expediente archivado. */
  const listoParaArchivar = async () => {
    const proceso = await listoParaPublicar();
    await publicarActa(proceso.id);
    return proceso;
  };

  const numeroDeDocumentos = async (procesoId: string) => {
    const [fila] = await dataSource.query(
      `SELECT COUNT(*)::int AS total FROM hiring.documentos d
         JOIN hiring.expedientes e ON e.id = d.expediente_id
        WHERE e.proceso_id = $1`,
      [procesoId],
    );
    return fila.total as number;
  };

  const actividad10_4 = async (procesoId: string) => {
    const [fila] = await dataSource.query(
      `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '10.4'`,
      [procesoId],
    );
    return fila?.estado ?? null;
  };

  /**
   * Un contrato liquidado y cerrado financieramente.
   *
   * Es la entrada del cierre definitivo salvo por los amparos: la póliza que
   * `hastaContratoLegalizado` constituye lleva solo CUMPLIMIENTO, con un año de
   * vigencia, que no es de estabilidad ni de calidad.
   */
  const liquidado = listoParaPublicar;

  /** El mismo camino, con el acta publicada y el expediente ya archivado. */
  const conExpedienteArchivado = async () => {
    const proceso = await listoParaArchivar();
    await archivarExpediente(proceso.id);
    return proceso;
  };

  const contratoDe = async (procesoId: string) => {
    const [fila] = await dataSource.query(
      `SELECT id, estado FROM hiring.contratos WHERE proceso_id = $1`,
      [procesoId],
    );
    return fila as { id: string; estado: string };
  };

  /**
   * Le agrega un amparo a la póliza aprobada del contrato.
   *
   * Se inserta directo porque `cargarGarantia` crea la póliza entera y aquí lo
   * que se necesita es variar un solo amparo sobre la que ya está aprobada.
   */
  const agregarAmparo = async (procesoId: string, tipo: string, vigenciaHasta: string) => {
    const contrato = await contratoDe(procesoId);
    await dataSource.query(
      `INSERT INTO hiring.amparos (garantia_id, tipo, valor_asegurado, vigencia_desde, vigencia_hasta)
       SELECT g.id, $2, 1000000, $3, $4 FROM hiring.garantias g
        WHERE g.contrato_id = $1 AND g.estado = 'APROBADA' LIMIT 1`,
      [contrato.id, tipo, haceDias(400), vigenciaHasta],
    );
  };

  const cerrarDefinitivo = (procesoId: string, datos: Record<string, unknown> = {}) =>
    cierreDefinitivo.cerrar(
      procesoId,
      { fechaCierre: hoy(), ...datos } as any,
      null,
      null,
      gestor,
    );

  // ------------------------------------------------------------- criterio --

  describe('Criterio 1 · el cierre espera a que venzan la estabilidad y la calidad', () => {
    it('no cierra mientras un amparo de estabilidad siga vigente, y dice hasta cuándo', async () => {
      const proceso = await conExpedienteArchivado();
      await agregarAmparo(proceso.id, 'ESTABILIDAD_OBRA', enDias(400));

      await expect(cerrarDefinitivo(proceso.id)).rejects.toThrow(/ampara hasta el/i);

      const estado = await cierreDefinitivo.estado(proceso.id, gestor);
      expect(estado.puedeCerrar).toBe(false);
      expect(estado.amparos!.pendientes).toHaveLength(1);
    });

    it('cierra cuando ese amparo ya venció', async () => {
      const proceso = await conExpedienteArchivado();
      await agregarAmparo(proceso.id, 'ESTABILIDAD_OBRA', haceDias(10));

      const estado = await cerrarDefinitivo(proceso.id);

      expect(estado.cierre).not.toBeNull();
      expect((estado.cierre as any).ultimoVencimiento).toBe(haceDias(10));
      expect(estado.puedeCerrar).toBe(false);
    });

    /**
     * El caso corriente: casi ningún contrato de la entidad lleva estabilidad de
     * obra. La póliza de esta suite solo tiene cumplimiento.
     */
    it('cierra de entrada un contrato sin amparos de estabilidad ni calidad', async () => {
      const proceso = await conExpedienteArchivado();

      const estado = await cerrarDefinitivo(proceso.id);

      expect(estado.cierre).not.toBeNull();
      expect((estado.cierre as any).ultimoVencimiento).toBeNull();
      expect((estado.cierre as any).amparosVerificados).toEqual([]);
    });

    it('un amparo de cumplimiento vigente no impide cerrar', async () => {
      const proceso = await conExpedienteArchivado();
      // El de cumplimiento que ya trae la póliza vence dentro de un año y no es
      // de estabilidad ni de calidad: se agota con el contrato.
      const estado = await cerrarDefinitivo(proceso.id);

      expect(estado.cierre).not.toBeNull();
      expect(estado.amparos!.sinAmparos).toBe(true);
    });

    it('los amparos de una garantía rechazada no cuentan', async () => {
      const proceso = await conExpedienteArchivado();
      await agregarAmparo(proceso.id, 'CALIDAD_SERVICIO', enDias(500));

      const contrato = await contratoDe(proceso.id);
      await dataSource.query(
        `UPDATE hiring.garantias SET estado = 'RECHAZADA', motivo_rechazo = 'Prueba'
          WHERE contrato_id = $1 AND estado = 'APROBADA'`,
        [contrato.id],
      );

      // La cobertura que la entidad nunca aceptó no puede dejar el contrato
      // esperando.
      const estado = await cerrarDefinitivo(proceso.id);

      expect(estado.cierre).not.toBeNull();
      expect(estado.amparos!.sinAmparos).toBe(true);
    });

    it('mira también la calidad de bienes, no solo la estabilidad de obra', async () => {
      const proceso = await conExpedienteArchivado();
      await agregarAmparo(proceso.id, 'CALIDAD_BIENES', enDias(200));

      await expect(cerrarDefinitivo(proceso.id)).rejects.toThrow(/Todavía no se puede cerrar/i);
    });
  });

  describe('Criterio 2 · la cadena que exige el cierre', () => {
    it('no cierra un contrato sin liquidar', async () => {
      const proceso = await listoParaCerrar(40_000_000);
      // Con RP e informe final, pero sin acta: la 10.2 es la condición.
      await dataSource.query(
        `UPDATE hiring.actas_liquidacion SET estado = 'ANULADO', anulado_at = now(),
                motivo_anulacion = 'Prueba'
          WHERE contrato_id IN (SELECT id FROM hiring.contratos WHERE proceso_id = $1)`,
        [proceso.id],
      );

      await expect(cerrarDefinitivo(proceso.id)).rejects.toThrow(/todavía no está liquidado/i);
    });

    it('no cierra dos veces', async () => {
      const proceso = await conExpedienteArchivado();
      await cerrarDefinitivo(proceso.id);

      await expect(cerrarDefinitivo(proceso.id)).rejects.toThrow(/ya está cerrado/i);
    });

    it('no registra un cierre hacia el futuro', async () => {
      const proceso = await conExpedienteArchivado();

      await expect(cerrarDefinitivo(proceso.id, { fechaCierre: enDias(5) })).rejects.toThrow(
        /no puede ser posterior a hoy/i,
      );
    });

    /**
     * La estabilidad de obra vence años después del recibo, así que el cierre
     * llega mucho después del archivo. Encadenarlo impediría registrar un hecho
     * que ya ocurrió.
     */
    it('el expediente sin archivar advierte pero no bloquea', async () => {
      const proceso = await liquidado();

      const antes = await cierreDefinitivo.estado(proceso.id, gestor);
      expect(antes.advertencias.join(' ')).toMatch(/no está archivado/i);
      expect(antes.puedeCerrar).toBe(true);

      const estado = await cerrarDefinitivo(proceso.id);
      expect(estado.cierre).not.toBeNull();
    });

    it('el cierre financiero pendiente también advierte sin bloquear', async () => {
      const proceso = await listoParaCerrar(40_000_000);

      const antes = await cierreDefinitivo.estado(proceso.id, gestor);
      expect(antes.advertencias.join(' ')).toMatch(/cierre financiero/i);

      const estado = await cerrarDefinitivo(proceso.id);
      expect(estado.cierre).not.toBeNull();
    });
  });

  describe('Criterio 3 · el estado del contrato queda trazable (RF-SIS-01)', () => {
    it('liquidar deja el contrato en LIQUIDADO', async () => {
      const proceso = await listoParaCerrar(40_000_000);

      expect((await contratoDe(proceso.id)).estado).toBe('LIQUIDADO');
    });

    it('cerrar lo pasa a CERRADO', async () => {
      const proceso = await conExpedienteArchivado();

      await cerrarDefinitivo(proceso.id);

      expect((await contratoDe(proceso.id)).estado).toBe('CERRADO');
    });

    it('anular el acta devuelve el contrato a EJECUCION', async () => {
      const proceso = await listoParaCerrar(40_000_000);

      await liquidacion.anular(
        proceso.id,
        { motivo: 'Se rehace el acta con el balance corregido' } as any,
        gestor,
      );

      expect((await contratoDe(proceso.id)).estado).toBe('EJECUCION');
    });

    it('revertir el cierre lo devuelve a LIQUIDADO y exige motivo', async () => {
      const proceso = await conExpedienteArchivado();
      await cerrarDefinitivo(proceso.id);

      const estado = await cierreDefinitivo.revertir(
        proceso.id,
        { motivo: 'La aseguradora reporta una prórroga del amparo de estabilidad' } as any,
        gestor,
      );

      expect(estado.cierre).toBeNull();
      expect(estado.historial).toHaveLength(1);
      expect((await contratoDe(proceso.id)).estado).toBe('LIQUIDADO');
    });

    it('no revierte un contrato que no está cerrado', async () => {
      const proceso = await conExpedienteArchivado();

      await expect(
        cierreDefinitivo.revertir(
          proceso.id,
          { motivo: 'Un motivo cualquiera de más de diez caracteres' } as any,
          gestor,
        ),
      ).rejects.toThrow(/no tiene cierre definitivo vigente/i);
    });
  });

  describe('Criterio 4 · los amparos quedan congelados', () => {
    it('prorrogar la póliza después no cambia lo que el cierre dice que miró', async () => {
      const proceso = await conExpedienteArchivado();
      await agregarAmparo(proceso.id, 'ESTABILIDAD_OBRA', haceDias(10));

      const cerrado = await cerrarDefinitivo(proceso.id);
      const congelado = (cerrado.cierre as any).amparosVerificados;
      expect(congelado).toHaveLength(1);
      expect(congelado[0].vencido).toBe(true);

      const contrato = await contratoDe(proceso.id);
      await dataSource.query(
        `UPDATE hiring.amparos SET vigencia_hasta = $2
          WHERE tipo = 'ESTABILIDAD_OBRA'
            AND garantia_id IN (SELECT id FROM hiring.garantias WHERE contrato_id = $1)`,
        [contrato.id, enDias(900)],
      );

      const estado = await cierreDefinitivo.estado(proceso.id, gestor);

      // El cierre sigue diciendo lo que era cierto ese día…
      expect((estado.cierre as any).amparosVerificados[0].vencido).toBe(true);
      expect((estado.cierre as any).ultimoVencimiento).toBe(haceDias(10));
      // …aunque la póliza de hoy diga otra cosa.
      expect(estado.amparos!.pendientes).toHaveLength(1);
    });
  });
});
