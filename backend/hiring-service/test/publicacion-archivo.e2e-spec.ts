import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { PagosService } from '../src/modules/pagos/pagos.service';
import { InformeFinalService } from '../src/modules/informe-final/informe-final.service';
import { LiquidacionService } from '../src/modules/liquidacion/liquidacion.service';
import { CierreFinancieroService } from '../src/modules/cierre-financiero/cierre-financiero.service';
import { ArchivoExpedienteService } from '../src/modules/archivo-expediente/archivo-expediente.service';
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
 * HU EFDS-1174 · Publicar el acta y archivar el expediente (10.4).
 *
 * La última actividad del proceso, así que el camino arrastra todo lo anterior:
 * las etapas 8 y 9, el informe final, la liquidación y el cierre financiero.
 *
 * Lo que aquí importa y no se ve en una unitaria es **la custodia**: que un
 * expediente archivado deje de recibir y de perder documentos, que reabrirlo lo
 * permita otra vez, y que el índice congelado siga diciendo qué había el día del
 * archivo aunque después se le agregue algo.
 */
describe('HU EFDS-1174 · publicación del acta y archivo del expediente (10.4)', () => {
  let app: INestApplication;
  let pagos: PagosService;
  let informeFinal: InformeFinalService;
  let liquidacion: LiquidacionService;
  let cierre: CierreFinancieroService;
  let archivo10_4: ArchivoExpedienteService;
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
  const OBJETO = 'Publicacion y archivo para pruebas';

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
      { numero: `CDP-2026-174-${n}`, valor: VALOR_CONTRATO, fechaExpedicion: hoy() },
      financiero,
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-174-${n}`, resolucionFecha: hoy() },
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
        numeroActo: `RES-ADJ-2026-174-${n}`,
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
        numero: `CTO-2026-174-${CORRIDA}-${n}`,
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
        numeroPoliza: `POL-174-${CORRIDA}-${n}`,
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
        numero: `RP-2026-174-${CORRIDA}-${++vuelta}`,
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

  // ------------------------------------------------------------- criterio --

  describe('Criterio 1 · la publicación del acta', () => {
    it('registra la publicación con su evidencia y su control de plazo', async () => {
      const proceso = await listoParaPublicar();

      const estado = await publicarActa(proceso.id, { secopNumero: 'CO1.PCCNTR.174' });

      expect(estado.publicaciones).toHaveLength(1);
      const [publicacion] = estado.publicaciones as any[];
      expect(publicacion.destino).toBe('SECOP_II');
      expect(publicacion.secopNumero).toBe('CO1.PCCNTR.174');
      // El plazo se congela con el vigente ese día.
      expect(publicacion.plazoDiasHabiles).toBeGreaterThan(0);
      expect(publicacion.fechaLimite).not.toBeNull();
      expect(publicacion.aTiempo).toBe(true);
      // Publicada en SECOP II, solo falta la web de la ESAP.
      expect(estado.pendientesPublicacion).toEqual(['WEB_ESAP']);
    });

    it('no registra dos veces el mismo destino', async () => {
      const proceso = await listoParaPublicar();
      await publicarActa(proceso.id);

      await expect(publicarActa(proceso.id)).rejects.toThrow(/ya se registró como publicada/i);
    });

    it('admite los dos destinos, que son dos hechos distintos', async () => {
      const proceso = await listoParaPublicar();
      await publicarActa(proceso.id);

      const estado = await publicarActa(proceso.id, { destino: 'WEB_ESAP' });

      expect(estado.publicaciones).toHaveLength(2);
      expect(estado.pendientesPublicacion).toEqual([]);
    });

    it('no publica un acta que no existe, y lo dice', async () => {
      // Cerrado financieramente no: sin liquidar no hay acta que publicar.
      const proceso = await conInformeFinal();

      await expect(publicarActa(proceso.id)).rejects.toThrow(/acta de liquidación vigente/i);
    });

    it('no registra una publicación hacia el futuro', async () => {
      const proceso = await listoParaPublicar();

      await expect(publicarActa(proceso.id, { fechaPublicacion: enDias(3) })).rejects.toThrow(
        /no puede ser posterior a hoy/i,
      );
    });

    it('marca fuera de plazo la publicación tardía en vez de rechazarla', async () => {
      const proceso = await listoParaPublicar();
      await publicarActa(proceso.id);

      // El plazo corre desde la fecha del acta y se cuenta en días hábiles:
      // se vence a mano, como en el resto de las suites.
      await dataSource.query(
        `UPDATE hiring.publicaciones_acta SET fecha_limite = $2
          WHERE acta_id IN (SELECT id FROM hiring.actas_liquidacion
                             WHERE contrato_id IN (SELECT id FROM hiring.contratos WHERE proceso_id = $1))`,
        [proceso.id, haceDias(5)],
      );

      const estado = await archivo10_4.estado(proceso.id, gestor);

      expect((estado.publicaciones as any[])[0].aTiempo).toBe(false);
    });
  });

  describe('Criterio 2 · lo que el archivo exige', () => {
    it('no archiva mientras el acta no se haya publicado en SECOP II', async () => {
      const proceso = await listoParaPublicar();

      await expect(archivarExpediente(proceso.id)).rejects.toThrow(/no se ha publicado en SECOP II/i);
    });

    it('la publicación en la web de la ESAP no reemplaza a la de SECOP II', async () => {
      const proceso = await listoParaPublicar();
      await publicarActa(proceso.id, { destino: 'WEB_ESAP' });

      await expect(archivarExpediente(proceso.id)).rejects.toThrow(/no se ha publicado en SECOP II/i);
    });

    /**
     * La historia solo pide «contrato liquidado». Exigir el cierre es criterio
     * del equipo: archivar con el saldo del RP sin liberar deja plata amarrada a
     * un contrato que ya nadie va a mirar.
     */
    it('no archiva un contrato sin cierre financiero', async () => {
      const proceso = await listoParaCerrar();
      await publicarActa(proceso.id);

      await expect(archivarExpediente(proceso.id)).rejects.toThrow(/cierre financiero vigente/i);
    });

    it('no archiva un contrato sin liquidar, y pide primero el acta', async () => {
      const proceso = await conInformeFinal();

      await expect(archivarExpediente(proceso.id)).rejects.toThrow(/acta de liquidación vigente/i);
    });

    it('archiva cuando el acta está publicada y el contrato cerrado', async () => {
      const proceso = await listoParaArchivar();

      const estado = await archivarExpediente(proceso.id, {
        radicadoActiveDocument: 'AD-2026-000174',
      });

      expect(estado.expediente!.estado).toBe('ARCHIVADO');
      expect(estado.expediente!.archivadoAt).not.toBeNull();
      expect(estado.expediente!.archivadoPor).toBe('prueba.archivo');
      expect(estado.expediente!.radicadoActiveDocument).toBe('AD-2026-000174');
      expect(estado.puedeArchivar).toBe(false);
    });

    it('no archiva dos veces', async () => {
      const proceso = await listoParaArchivar();
      await archivarExpediente(proceso.id);

      await expect(archivarExpediente(proceso.id)).rejects.toThrow(/ya está archivado/i);
    });
  });

  describe('Criterio 3 · el índice queda congelado', () => {
    it('cuenta los documentos del expediente y guarda su hash', async () => {
      const proceso = await listoParaArchivar();
      const total = await numeroDeDocumentos(proceso.id);

      const estado = await archivarExpediente(proceso.id);

      const indice = estado.expediente!.indiceDocumental!;
      expect(indice.totalDocumentos).toBe(total);
      expect(indice.documentos).toHaveLength(total);
      // El hash es lo que permite notar un documento sustituido: mismo nombre,
      // otro contenido.
      expect(indice.documentos.every((d: any) => d.hashSha256?.length === 64)).toBe(true);
    });

    /**
     * El punto de todo el diseño: si el índice se calculara al consultar, diría
     * siempre que el expediente está en orden.
     */
    it('sigue diciendo qué había el día del archivo aunque después se agregue un documento', async () => {
      const proceso = await listoParaArchivar();
      const archivado = await archivarExpediente(proceso.id);
      const congelado = archivado.expediente!.indiceDocumental!.totalDocumentos;

      await archivo10_4.reabrir(
        proceso.id,
        { motivo: 'Faltó incorporar el acta de recibo final al expediente' } as any,
        archivista,
      );
      await documentos.cargar(
        proceso.id,
        'AVISO_CONVOCATORIA',
        archivo('tardio.pdf'),
        '1'.repeat(64),
        gestor,
      );

      const estado = await archivo10_4.estado(proceso.id, gestor);

      expect(estado.expediente!.indiceDocumental!.totalDocumentos).toBe(congelado);
      expect(await numeroDeDocumentos(proceso.id)).toBe(congelado + 1);
    });

    it('se recalcula al volver a archivar', async () => {
      const proceso = await listoParaArchivar();
      const primero = await archivarExpediente(proceso.id);
      const antes = primero.expediente!.indiceDocumental!.totalDocumentos;

      await archivo10_4.reabrir(
        proceso.id,
        { motivo: 'Se incorpora el soporte que faltaba antes de cerrar' } as any,
        archivista,
      );
      await documentos.cargar(
        proceso.id,
        'AVISO_CONVOCATORIA',
        archivo('faltante.pdf'),
        '2'.repeat(64),
        gestor,
      );

      const estado = await archivarExpediente(proceso.id);

      expect(estado.expediente!.indiceDocumental!.totalDocumentos).toBe(antes + 1);
    });
  });

  describe('Criterio 4 · la custodia del expediente archivado', () => {
    it('no admite documentos nuevos', async () => {
      const proceso = await listoParaArchivar();
      await archivarExpediente(proceso.id);

      await expect(
        documentos.cargar(
          proceso.id,
          'AVISO_CONVOCATORIA',
          archivo('colado.pdf'),
          '3'.repeat(64),
          gestor,
        ),
      ).rejects.toThrow(/expediente está archivado/i);
    });

    it('tampoco deja anular los que ya tiene: la custodia vale en los dos sentidos', async () => {
      const proceso = await listoParaPublicar();
      const cargado = await documentos.cargar(
        proceso.id,
        'AVISO_CONVOCATORIA',
        archivo('previo.pdf'),
        '4'.repeat(64),
        gestor,
      );
      const documentoProcesoId = (cargado.documentos as any[]).find(
        (d) => d.codigo === 'AVISO_CONVOCATORIA',
      ).cargado.id;

      await publicarActa(proceso.id);
      await archivarExpediente(proceso.id);

      await expect(documentos.anular(proceso.id, documentoProcesoId, gestor)).rejects.toThrow(
        /expediente está archivado/i,
      );
    });

    it('reabierto, vuelve a admitir documentos', async () => {
      const proceso = await listoParaArchivar();
      await archivarExpediente(proceso.id);

      const estado = await archivo10_4.reabrir(
        proceso.id,
        { motivo: 'La auditoría pidió incorporar un soporte adicional' } as any,
        archivista,
      );

      expect(estado.expediente!.estado).toBe('ABIERTO');
      expect(estado.expediente!.motivoReapertura).toMatch(/auditoría/i);
      await expect(
        documentos.cargar(
          proceso.id,
          'AVISO_CONVOCATORIA',
          archivo('adicional.pdf'),
          '5'.repeat(64),
          gestor,
        ),
      ).resolves.toBeDefined();
    });

    it('no reabre un expediente que no está archivado', async () => {
      const proceso = await listoParaArchivar();

      await expect(
        archivo10_4.reabrir(
          proceso.id,
          { motivo: 'Un motivo cualquiera de más de diez caracteres' } as any,
          archivista,
        ),
      ).rejects.toThrow(/no está archivado/i);
    });
  });

  describe('El riel del proceso', () => {
    it('deja aprobada la 10.4 al archivar y la devuelve a borrador al reabrir', async () => {
      const proceso = await listoParaArchivar();

      // La fila existe desde que nace el proceso (EFDS-1187), así que lo que
      // se comprueba es que publicar no la aprueba: publicar es el trámite, y
      // lo que cierra el proceso es el archivo.
      expect(await actividad10_4(proceso.id)).not.toBe('APROBADO');

      await archivarExpediente(proceso.id);
      expect(await actividad10_4(proceso.id)).toBe('APROBADO');

      await archivo10_4.reabrir(
        proceso.id,
        { motivo: 'Mientras el expediente esté abierto la actividad sigue en curso' } as any,
        archivista,
      );
      expect(await actividad10_4(proceso.id)).toBe('BORRADOR');
    });

    it('la evidencia de la publicación queda en el expediente', async () => {
      const proceso = await listoParaPublicar();
      const antes = await numeroDeDocumentos(proceso.id);

      await publicarActa(proceso.id);

      expect(await numeroDeDocumentos(proceso.id)).toBe(antes + 1);
    });
  });
});
