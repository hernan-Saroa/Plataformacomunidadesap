import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { PagosService } from '../src/modules/pagos/pagos.service';
import { InformeFinalService } from '../src/modules/informe-final/informe-final.service';
import { LiquidacionService } from '../src/modules/liquidacion/liquidacion.service';
import { CierreFinancieroService } from '../src/modules/cierre-financiero/cierre-financiero.service';
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
 * HU EFDS-1173 · Registrar el pago final y cerrar financieramente (10.3).
 *
 * Va sobre un contrato con informe final, así que el camino arrastra las etapas
 * 8, 9 y la 10.1. Lo que aquí importa y no se ve en una unitaria son **las dos
 * ventanas de plazo**: que la potestad unilateral no exista antes de tiempo y
 * que la consulta lo diga.
 *
 * El plazo se mueve cambiando la fecha de inicio del contrato, que es de donde
 * sale la terminación. Esperar cuatro meses no es opción.
 */
describe('HU EFDS-1173 · cierre financiero del contrato (10.3)', () => {
  let app: INestApplication;
  let pagos: PagosService;
  let informeFinal: InformeFinalService;
  let liquidacion: LiquidacionService;
  let cierre: CierreFinancieroService;
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
  const OBJETO = 'Cierre financiero para pruebas';

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
      { numero: `CDP-2026-173-${n}`, valor: VALOR_CONTRATO, fechaExpedicion: hoy() },
      financiero,
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-173-${n}`, resolucionFecha: hoy() },
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
        numeroActo: `RES-ADJ-2026-173-${n}`,
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
        numero: `CTO-2026-173-${CORRIDA}-${n}`,
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
        numeroPoliza: `POL-173-${CORRIDA}-${n}`,
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
        numero: `RP-2026-173-${CORRIDA}-${++vuelta}`,
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

  // ------------------------------------------------------------- criterio --

  describe('Criterio 1 · el pago final cierra y libera el saldo', () => {
    it('libera la diferencia entre el RP y lo pagado', async () => {
      const proceso = await listoParaCerrar(40_000_000);

      const estado = await cerrarFinanciero(proceso.id);

      expect(estado.cierre).not.toBeNull();
      expect((estado.cierre as any).valorRp).toBe(VALOR_RP);
      expect((estado.cierre as any).valorPagado).toBe(40_000_000);
      expect((estado.cierre as any).valorLiberado).toBe(VALOR_RP - 40_000_000);
      expect((estado.cierre as any).referenciaPagoFinal).toBe('OP-2026-9001');
      expect(estado.puedeCerrar).toBe(false);
    });

    it('cuenta lo tramitado y no lo cobrado', async () => {
      const proceso = await listoParaCerrar(40_000_000);
      // Una cuenta radicada sin tramitar no es plata que salió: no reduce el
      // saldo que vuelve al presupuesto.
      await dejarPendiente(proceso.id, 20_000_000);

      const estado = await cerrarFinanciero(proceso.id);

      expect((estado.cierre as any).valorPagado).toBe(40_000_000);
      expect((estado.cierre as any).valorLiberado).toBe(VALOR_RP - 40_000_000);
    });

    it('libera el RP entero cuando el contrato no tuvo pagos', async () => {
      const proceso = await listoParaCerrar(0);

      const estado = await cerrarFinanciero(proceso.id);

      expect((estado.cierre as any).valorLiberado).toBe(VALOR_RP);
    });
  });

  describe('Criterio 2 · la cadena que exige el cierre', () => {
    it('no cierra un contrato sin liquidar', async () => {
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

      await expect(cerrarFinanciero(proceso.id)).rejects.toThrow(/todavía no está liquidado/i);
    });

    it('no cierra sin registro presupuestal expedido', async () => {
      const proceso = await conInformeFinal();
      await liquidar(proceso.id);

      // Sin RP no hay saldo que liberar, y el mensaje apunta al numeral.
      await expect(cerrarFinanciero(proceso.id)).rejects.toThrow(/registro presupuestal/i);
    });

    it('la consulta dice cuál de las dos cosas falta', async () => {
      const proceso = await conInformeFinal();

      const sinLiquidar = await cierre.estado(proceso.id, financiero);
      expect(sinLiquidar.puedeCerrar).toBe(false);
      expect(sinLiquidar.motivoNoPuede).toMatch(/acta de liquidación/i);

      await liquidar(proceso.id);
      const sinRp = await cierre.estado(proceso.id, financiero);
      expect(sinRp.motivoNoPuede).toMatch(/registro presupuestal/i);
    });

    it('no deja dos cierres vigentes', async () => {
      const proceso = await listoParaCerrar();
      await cerrarFinanciero(proceso.id);

      await expect(cerrarFinanciero(proceso.id)).rejects.toThrow(/ya tiene cierre financiero/i);
    });
  });

  describe('Criterio 3 · el sobrepago se avisa y no bloquea', () => {
    it('avisa cuando lo pagado supera el RP y no libera nada', async () => {
      // El RP es de 70 y se pagan 75: hubo plata sin respaldo presupuestal.
      const proceso = await listoParaCerrar(75_000_000);

      const antes = await cierre.estado(proceso.id, financiero);
      expect(antes.cuadre!.sobrepago).toBe(5_000_000);
      expect(antes.cuadre!.advertencia).toMatch(/sin respaldo/i);

      // Y aun así se puede cerrar: el hallazgo se registra, no se esconde.
      const estado = await cerrarFinanciero(proceso.id);
      expect((estado.cierre as any).valorLiberado).toBe(0);
    });

    it('deja el sobrepago en la traza, no solo en la advertencia', async () => {
      const proceso = await listoParaCerrar(75_000_000);
      await cerrarFinanciero(proceso.id);

      const [traza] = await dataSource.query(
        `SELECT accion, detalle FROM hiring.trazabilidad
          WHERE proceso_id = $1 AND entidad = 'cierre_financiero' ORDER BY id DESC LIMIT 1`,
        [proceso.id],
      );

      expect(traza.accion).toBe('CERRAR');
      expect(traza.detalle.actividad).toBe('10.3');
      expect(Number(traza.detalle.sobrepago)).toBe(5_000_000);
    });
  });

  describe('Criterio 4 · el cuadre queda congelado', () => {
    it('un pago posterior no reescribe lo que se liberó', async () => {
      const proceso = await listoParaCerrar(40_000_000);
      await cerrarFinanciero(proceso.id);

      // Entra un pago rezagado después de cerrar.
      await pagar(proceso.id, 10_000_000);
      const estado = await cierre.estado(proceso.id, financiero);

      // El cierre sigue diciendo lo que se reintegró ese día...
      expect((estado.cierre as any).valorLiberado).toBe(VALOR_RP - 40_000_000);
      // ...y el cuadre de hoy ya es otro.
      expect(estado.cuadre!.valorPagado).toBe(50_000_000);
    });
  });

  describe('Criterio 5 · revertir conserva el cierre anterior', () => {
    it('el revertido queda con su motivo y se puede cerrar otra vez', async () => {
      const proceso = await listoParaCerrar(40_000_000);
      await cerrarFinanciero(proceso.id);

      const revertido = await cierre.revertir(
        proceso.id,
        { motivo: 'El pago final se registró con la referencia de otro contrato' },
        financiero,
      );

      expect(revertido.cierre).toBeNull();
      expect(revertido.historial).toHaveLength(1);
      expect((revertido.historial[0] as any).valorLiberado).toBe(VALOR_RP - 40_000_000);
      expect((revertido.historial[0] as any).motivoReversion).toMatch(/otro contrato/i);

      const nuevo = await cerrarFinanciero(proceso.id, { referenciaPagoFinal: 'OP-2026-9002' });
      expect((nuevo.cierre as any).referenciaPagoFinal).toBe('OP-2026-9002');
      expect(nuevo.historial).toHaveLength(1);
    });
  });

  describe('El riel y el expediente', () => {
    it('marca la 10.3 cumplida y la devuelve en curso al revertir', async () => {
      const proceso = await listoParaCerrar();
      await cerrarFinanciero(proceso.id);

      const estadoDe = async () => {
        const [fila] = await dataSource.query(
          `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '10.3'`,
          [proceso.id],
        );
        return fila?.estado;
      };

      expect(await estadoDe()).toBe('APROBADO');

      await cierre.revertir(
        proceso.id,
        { motivo: 'El pago final se registró con la referencia de otro contrato' },
        financiero,
      );
      expect(await estadoDe()).toBe('BORRADOR');
    });

    it('archiva el soporte del cierre en el expediente', async () => {
      const proceso = await listoParaCerrar();
      await cerrarFinanciero(proceso.id);

      const docs = await dataSource.query(
        `SELECT d.nombre FROM hiring.documentos d
           JOIN hiring.expedientes e ON e.id = d.expediente_id
          WHERE e.proceso_id = $1 AND d.numeral = '10.3'`,
        [proceso.id],
      );

      expect(docs).toHaveLength(1);
      expect(docs[0].nombre).toMatch(/cierre financiero/i);
    });
  });
});
