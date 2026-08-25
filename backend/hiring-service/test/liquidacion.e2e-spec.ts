import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { PagosService } from '../src/modules/pagos/pagos.service';
import { InformeFinalService } from '../src/modules/informe-final/informe-final.service';
import { LiquidacionService } from '../src/modules/liquidacion/liquidacion.service';
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
 * HU EFDS-1172 · Elaborar el acta de liquidación (actividad 10.2).
 *
 * Va sobre un contrato con informe final, así que el camino arrastra las etapas
 * 8, 9 y la 10.1. Lo que aquí importa y no se ve en una unitaria son **las dos
 * ventanas de plazo**: que la potestad unilateral no exista antes de tiempo y
 * que la consulta lo diga.
 *
 * El plazo se mueve cambiando la fecha de inicio del contrato, que es de donde
 * sale la terminación. Esperar cuatro meses no es opción.
 */
describe('HU EFDS-1172 · acta de liquidación del contrato (10.2)', () => {
  let app: INestApplication;
  let pagos: PagosService;
  let informeFinal: InformeFinalService;
  let liquidacion: LiquidacionService;
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
  const OBJETO = 'Liquidacion para pruebas';

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

  /** Consecutivo propio de la corrida: contrato y póliza son únicos en la base. */
  let vuelta = 0;

  /** Todo el camino hasta dejar el contrato legalizado y con supervisor. */
  const hastaContratoLegalizado = async () => {
    const n = ++vuelta;
    const documento = `9006666${String(n).padStart(2, '0')}-6`;

    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: VALOR_CONTRATO },
      gestor,
    );

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: VALOR_CONTRATO }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: `CDP-2026-172-${n}`, valor: VALOR_CONTRATO, fechaExpedicion: hoy() },
      financiero,
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-172-${n}`, resolucionFecha: hoy() },
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
        numeroActo: `RES-ADJ-2026-172-${n}`,
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
        numero: `CTO-2026-172-${n}`,
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
        numeroPoliza: `POL-172-${n}`,
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

  // ------------------------------------------------------------- criterio --

  describe('Criterio 1 · con informe final se registra el balance y el paz y salvo', () => {
    it('liquida de común acuerdo y congela el balance', async () => {
      const proceso = await conInformeFinal();
      await pagar(proceso.id, 30_000_000);

      const estado = await liquidar(proceso.id, {
        pazYSalvo: true,
        observaciones: 'El contratista no presentó salvedades.',
      }, archivo('paz-y-salvo.pdf'));

      expect(estado.acta).not.toBeNull();
      expect((estado.acta as any).tipo).toBe('BILATERAL');
      expect((estado.acta as any).pazYSalvo).toBe(true);
      expect((estado.acta as any).pazYSalvoDocumento).not.toBeNull();
      expect((estado.acta as any).balance.valorPagado).toBe(30_000_000);
      expect((estado.acta as any).balance.saldo).toBe(VALOR_CONTRATO - 30_000_000);
    });

    it('no liquida un contrato sin informe final', async () => {
      const proceso = await contratoEnEjecucion();

      await expect(liquidar(proceso.id)).rejects.toThrow(/no tiene informe final/i);
    });

    it('no acepta el paz y salvo sin su soporte', async () => {
      const proceso = await conInformeFinal();

      // La base tiene la misma restricción; aquí se atrapa antes para poder
      // explicarlo en vez de devolver un error de llave.
      await expect(liquidar(proceso.id, { pazYSalvo: true })).rejects.toThrow(
        /adjunta el soporte del paz y salvo/i,
      );
    });

    it('no deja dos actas vigentes', async () => {
      const proceso = await conInformeFinal();
      await liquidar(proceso.id);

      await expect(liquidar(proceso.id)).rejects.toThrow(/ya está liquidado/i);
    });
  });

  describe('Criterio 2 · las dos ventanas del plazo legal', () => {
    it('dentro de los cuatro meses solo procede la bilateral', async () => {
      // Terminó hace veinte días: el acuerdo sigue corriendo.
      const proceso = await conInformeFinal(200);

      const estado = await liquidacion.estado(proceso.id, gestor);
      expect(estado.alerta!.momento).toBe('BILATERAL');
      expect(estado.puedeLiquidarBilateral).toBe(true);
      expect(estado.puedeLiquidarUnilateral).toBe(false);
      expect(estado.motivoNoUnilateral).toMatch(/se habilita cuando venza el plazo/i);

      // Y el servicio la rechaza, no solo la pantalla: la potestad no existe.
      await expect(liquidar(proceso.id, { tipo: 'UNILATERAL' })).rejects.toThrow(
        /solo procede cuando ese plazo vence/i,
      );
    });

    it('vencidos los cuatro meses habilita la unilateral y lo dice', async () => {
      // Terminó hace ciento cuarenta días: pasó el acuerdo, corre la potestad.
      const proceso = await conInformeFinal(320);

      const estado = await liquidacion.estado(proceso.id, gestor);
      expect(estado.alerta!.momento).toBe('UNILATERAL');
      expect(estado.puedeLiquidarUnilateral).toBe(true);
      expect(estado.alerta!.mensaje).toMatch(/venció el plazo del acuerdo/i);

      const liquidado = await liquidar(proceso.id, { tipo: 'UNILATERAL' });
      expect((liquidado.acta as any).tipo).toBe('UNILATERAL');
      expect((liquidado.acta as any).momentoDelPlazo).toBe('UNILATERAL');
    });

    it('pasados los seis meses avisa que el término venció', async () => {
      // Terminó hace doscientos veinte días: se agotó la potestad de liquidar
      // de plano.
      const proceso = await conInformeFinal(400);

      const estado = await liquidacion.estado(proceso.id, gestor);
      expect(estado.alerta!.momento).toBe('VENCIDO');
      expect(estado.alerta!.dias).toBeLessThan(0);
      expect(estado.alerta!.mensaje).toMatch(/juez/i);
    });

    it('la bilateral tardía se admite y queda marcada como tal', async () => {
      const proceso = await conInformeFinal(400);

      // Las partes pueden seguir poniéndose de acuerdo: negarles la pantalla
      // las obligaría a liquidar por fuera del expediente.
      const estado = await liquidar(proceso.id);

      expect((estado.acta as any).tipo).toBe('BILATERAL');
      expect((estado.acta as any).momentoDelPlazo).toBe('VENCIDO');
    });

    it('guarda la ventana con la que se liquidó, no solo el momento', async () => {
      const proceso = await conInformeFinal(320);
      const estado = await liquidar(proceso.id, { tipo: 'UNILATERAL' });

      const acta = estado.acta as any;
      // Los tres son fechas y no días: si mañana cambia la norma, el acta sigue
      // explicando por qué se liquidó cuando se liquidó.
      expect(acta.fechaTerminacion).toBe(haceDias(320 - 180));
      expect(acta.bilateralHasta).not.toBeNull();
      expect(acta.unilateralHasta).not.toBeNull();
      expect(acta.bilateralHasta < acta.unilateralHasta).toBe(true);
    });
  });

  describe('Criterio 3 · anular deja rehacerla', () => {
    it('el acta anulada queda con su motivo y se puede liquidar otra vez', async () => {
      const proceso = await conInformeFinal();
      await liquidar(proceso.id);

      const anulada = await liquidacion.anular(
        proceso.id,
        { motivo: 'El balance financiero quedó con una cifra equivocada' },
        gestor,
      );

      expect(anulada.acta).toBeNull();
      expect(anulada.historial).toHaveLength(1);
      expect((anulada.historial[0] as any).motivoAnulacion).toMatch(/cifra equivocada/i);

      const nueva = await liquidar(proceso.id);
      expect(nueva.acta).not.toBeNull();
      expect(nueva.historial).toHaveLength(1);
    });
  });

  describe('El riel y el expediente', () => {
    it('marca la 10.2 cumplida y la devuelve en curso al anular', async () => {
      const proceso = await conInformeFinal();
      await liquidar(proceso.id);

      const estadoDe = async () => {
        const [fila] = await dataSource.query(
          `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '10.2'`,
          [proceso.id],
        );
        return fila?.estado;
      };

      expect(await estadoDe()).toBe('APROBADO');

      await liquidacion.anular(
        proceso.id,
        { motivo: 'El balance financiero quedó con una cifra equivocada' },
        gestor,
      );
      expect(await estadoDe()).toBe('BORRADOR');
    });

    it('archiva el acta en el expediente bajo su numeral', async () => {
      const proceso = await conInformeFinal();
      await liquidar(proceso.id, { pazYSalvo: true }, archivo('paz-y-salvo.pdf'));

      const docs = await dataSource.query(
        `SELECT d.nombre FROM hiring.documentos d
           JOIN hiring.expedientes e ON e.id = d.expediente_id
          WHERE e.proceso_id = $1 AND d.numeral = '10.2' ORDER BY d.nombre`,
        [proceso.id],
      );

      // El acta y el paz y salvo: dos documentos distintos del expediente.
      expect(docs).toHaveLength(2);
      expect(docs.map((d: any) => d.nombre).join(' ')).toMatch(/acta de liquidación/i);
      expect(docs.map((d: any) => d.nombre).join(' ')).toMatch(/paz y salvo/i);
    });

    it('deja en la traza que se liquidó fuera de término', async () => {
      const proceso = await conInformeFinal(400);
      await liquidar(proceso.id);

      const [traza] = await dataSource.query(
        `SELECT accion, detalle FROM hiring.trazabilidad
          WHERE proceso_id = $1 AND entidad = 'acta_liquidacion' ORDER BY id DESC LIMIT 1`,
        [proceso.id],
      );

      expect(traza.accion).toBe('CERRAR');
      expect(traza.detalle.actividad).toBe('10.2');
      // Que se liquidó tarde no se queda solo en el acta.
      expect(traza.detalle.momentoDelPlazo).toBe('VENCIDO');
    });
  });
});
